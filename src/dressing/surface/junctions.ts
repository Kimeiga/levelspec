import type { V3 } from "../../architecture/types.ts";
import type { MeshData } from "../../vector/types.ts";
import { aborted } from "../../vector/types.ts";
import type { SurfaceChart } from "./types.ts";
import { Quaternion, ShapeUtils, Vector2, Vector3 } from "three";

type UV = [number, number];

/** One conformed receiver triangle in world meters; its arrays remain unchanged until finish completes. */
export interface SurfaceJunctionFace {
  base: V3[];
  positions: V3[];
  uv: UV[];
  colors: V3[];
  surface: number;
  solidId: string;
  /** Source object identity, used when an intentionally open receiver has no solid ID. */
  host: string;
  /** Source plan for diagnostics; absent on unchanged neighboring faces. */
  chart?: SurfaceChart;
}

interface Edge {
  face: SurfaceJunctionFace;
  normal: V3;
  start: number;
  first: number;
  last: number;
}

interface Span {
  face: SurfaceJunctionFace;
  normal: V3;
  base: [V3, V3];
  positions: [V3, V3];
  uv: [UV, UV];
  colors: [V3, V3];
}

interface CapEdge {
  first: number;
  last: number;
  uv: [UV, UV];
  color: V3;
  face: SurfaceJunctionFace;
  normal: V3;
}

interface Corner {
  points: V3[];
  edges: Map<string, CapEdge | null>;
  ambiguous: boolean;
}

const subtract = (a: V3, b: V3): V3 => a.map((value, axis) => value - b[axis]) as V3;
const dot = (a: V3, b: V3): number => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (value: V3): V3 => { const length = Math.hypot(...value); return value.map(component => component / length) as V3; };
const mix = <T extends number[]>(a: T, b: T, t: number): T => a.map((value, axis) => value + (b[axis] - value) * t) as T;

/** Aligns either directed edge with the first owner's start/end ordering. */
function span(edge: Edge, reverse = false): Span {
  const indices = reverse ? [(edge.start + 1) % 3, edge.start] : [edge.start, (edge.start + 1) % 3];
  return { face: edge.face, normal: edge.normal,
    base: indices.map(index => edge.face.base[index]) as [V3, V3],
    positions: indices.map(index => edge.face.positions[index]) as [V3, V3],
    uv: indices.map(index => edge.face.uv[index]) as [UV, UV],
    colors: indices.map(index => edge.face.colors[index]) as [V3, V3] };
}

/** Restricts a straight displaced edge without resampling the source recipe. */
function portion(edge: Span, start: number, end: number): Span {
  return { ...edge,
    base: [mix(...edge.base, start), mix(...edge.base, end)],
    positions: [mix(...edge.positions, start), mix(...edge.positions, end)],
    uv: [mix(...edge.uv, start), mix(...edge.uv, end)],
    colors: [mix(...edge.colors, start), mix(...edge.colors, end)] };
}

/** Folds the owner's affine source UV field across a rim while preserving its meter scale and shear. */
function foldedUV(owner: Span, opposite: Span): [UV, UV] {
  const delta = subtract(owner.base[1], owner.base[0]), length = Math.hypot(...delta);
  const along = unit(delta), across = cross(owner.normal, along);
  const slope = owner.uv[1].map((value, axis) => (value - owner.uv[0][axis]) / length) as UV;
  const third = owner.face.base.map((point, index) => ({ index, offset: subtract(point, owner.base[0]) }))
    .reduce((best, candidate) => Math.abs(dot(candidate.offset, across)) > Math.abs(dot(best.offset, across)) ? candidate : best);
  const distance = dot(third.offset, across), station = dot(third.offset, along);
  const perpendicular = owner.face.uv[third.index].map((value, axis) =>
    (value - owner.uv[0][axis] - slope[axis] * station) / distance) as UV;
  return owner.uv.map((uv, index) => {
    const depth = Math.hypot(...subtract(opposite.positions[index], owner.positions[index]));
    return uv.map((value, axis) => value - perpendicular[axis] * Math.sign(distance) * depth) as UV;
  }) as [UV, UV];
}

/** Tests whether an unchanged adjoining cap already covers the entire proposed rim triangle. */
function coveredByFace(points: V3[], face: SurfaceJunctionFace, tolerance: number): boolean {
  const [origin, second, third] = face.positions;
  const a = subtract(second, origin), b = subtract(third, origin), normal = unit(cross(a, b));
  const aa = dot(a, a), ab = dot(a, b), bb = dot(b, b), denominator = aa * bb - ab * ab;
  if (denominator <= 0) return false;
  return points.every(point => {
    const offset = subtract(point, origin);
    if (Math.abs(dot(offset, normal)) > tolerance) return false;
    const pa = dot(offset, a), pb = dot(offset, b);
    const u = (pa * bb - pb * ab) / denominator, v = (pb * aa - pa * ab) / denominator;
    const barycentricTolerance = tolerance / Math.max(tolerance, Math.min(Math.hypot(...a), Math.hypot(...b)));
    return u >= -barycentricTolerance && v >= -barycentricTolerance && u + v <= 1 + barycentricTolerance;
  });
}

/**
 * Closes only paired, oppositely directed source edges. Matching is limited to
 * numerical roundoff within one solid/source object; nearby objects and open
 * silhouettes are never welded. A third owner invalidates an ambiguous join.
 */
export class SurfaceJunctions {
  private readonly tolerance: number;
  private readonly points = new Map<string, { point: V3; id: number }[]>();
  private pointCount = 0;
  private readonly edges = new Map<string, Edge | [Edge, Edge] | null>();
  private readonly corners = new Map<string, Corner>();
  private readonly openCorners = new Set<string>();
  private readonly maximumTriangles: number;
  private readonly signal?: AbortSignal;

  constructor(input: MeshData, maximumTriangles: number, signal?: AbortSignal) {
    let scale = 1;
    for (const value of input.positions) scale = Math.max(scale, Math.abs(value));
    this.tolerance = Number.EPSILON * scale * 64;
    this.maximumTriangles = maximumTriangles;
    this.signal = signal;
  }

  /** Canonicalizes arithmetic copies of a point without merging distinct geometric features. */
  private pointId(point: V3): number {
    const cell = point.map(value => Math.floor(value / this.tolerance));
    const key = cell.join("/"), bucket = this.points.get(key) ?? [];
    const existing = bucket.find(candidate => Math.hypot(...subtract(point, candidate.point)) <= this.tolerance);
    if (existing) return existing.id;
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (x === 0 && y === 0 && z === 0) continue;
      const nearby = this.points.get(`${cell[0] + x}/${cell[1] + y}/${cell[2] + z}`);
      const found = nearby?.find(candidate => Math.hypot(...subtract(point, candidate.point)) <= this.tolerance);
      if (found) return found.id;
    }
    const id = this.pointCount++;
    bucket.push({ point, id }); this.points.set(key, bucket);
    return id;
  }

  private owner(face: SurfaceJunctionFace): string {
    return face.solidId ? `solid:${face.solidId}` : `object:${face.host}`;
  }

  /** Registers final triangles, including unchanged neighbors conformed only for adjacency bookkeeping. */
  add(face: SurfaceJunctionFace): void {
    const direction = cross(subtract(face.base[1], face.base[0]), subtract(face.base[2], face.base[0]));
    if (Math.hypot(...direction) < 1e-13) return;
    const normal = unit(direction), ids = face.base.map(point => this.pointId(point));
    const owner = this.owner(face);
    for (let start = 0; start < 3; start++) {
      const first = ids[start], last = ids[(start + 1) % 3];
      if (first === last) continue;
      const key = `${owner}/${Math.min(first, last)}/${Math.max(first, last)}`;
      const previous = this.edges.get(key), edge = { face, normal, start, first, last };
      if (previous === undefined) { this.edges.set(key, edge); continue; }
      if (previous === null || Array.isArray(previous) || previous.first !== last || previous.last !== first) {
        this.openCorners.add(`${owner}/${first}`); this.openCorners.add(`${owner}/${last}`);
        this.edges.set(key, null); continue;
      }
      const a = span(previous), b = span(edge, true);
      const closed = a.positions.every((point, index) => Math.hypot(...subtract(point, b.positions[index])) <= this.tolerance);
      this.edges.set(key, closed ? null : [previous, edge]);
    }
  }

  /** Collects the opposite boundary winding of an emitted strip at one source vertex. */
  private corner(base: V3, positions: [V3, V3], uv: [UV, UV], owner: Span, color: V3): void {
    if (Math.hypot(...subtract(...positions)) <= this.tolerance) return;
    const identity = this.owner(owner.face);
    const key = `${identity}/${this.pointId(base)}`;
    if (this.openCorners.has(key)) return;
    let corner = this.corners.get(key);
    if (!corner) {
      corner = { points: [], edges: new Map(), ambiguous: false };
      this.corners.set(key, corner);
    }
    const ids = positions.map(point => {
      const existing = corner.points.findIndex(candidate => Math.hypot(...subtract(candidate, point)) <= this.tolerance);
      if (existing >= 0) return existing;
      corner.points.push(point);
      return corner.points.length - 1;
    });
    const [first, last] = ids;
    const edgeKey = `${Math.min(first, last)}/${Math.max(first, last)}`;
    const previous = corner.edges.get(edgeKey);
    if (previous === undefined) {
      corner.edges.set(edgeKey, { first, last, uv, color, face: owner.face, normal: owner.normal });
    } else {
      if (previous === null || previous.first !== last || previous.last !== first) corner.ambiguous = true;
      corner.edges.set(edgeKey, null);
    }
  }

  /** Preserves the source meter metric on each cap facet; a nonplanar cap may have UV seams between facets. */
  private capUV(point: V3, anchor: V3, edge: CapEdge, normal: V3): UV {
    const [origin, second, third] = edge.face.base;
    const a = subtract(second, origin), b = subtract(third, origin);
    const length = Math.hypot(...a), along = unit(a), across = cross(edge.normal, along);
    const station = dot(b, along), distance = dot(b, across);
    const rotation = new Quaternion().setFromUnitVectors(new Vector3(...normal), new Vector3(...edge.normal));
    const delta = new Vector3(...subtract(point, anchor)).applyQuaternion(rotation).toArray() as V3;
    return edge.uv[0].map((value, axis) => {
      const slope = (edge.face.uv[1][axis] - edge.face.uv[0][axis]) / length;
      const perpendicular = (edge.face.uv[2][axis] - edge.face.uv[0][axis] - slope * station) / distance;
      return value + dot(delta, along) * slope + dot(delta, across) * perpendicular;
    }) as UV;
  }

  /** Fills only closed, unambiguous boundary loops left by already emitted edge strips. */
  private cap(output: MeshData, corner: Corner, inspect?: (face: SurfaceJunctionFace) => void): void {
    if (corner.ambiguous) return;
    const edges = [...corner.edges.values()].filter((edge): edge is CapEdge => edge !== null);
    if (edges.length < 3) return;
    const outgoing = new Map<number, CapEdge>(), incoming = new Set<number>();
    for (const edge of edges) {
      if (outgoing.has(edge.first) || incoming.has(edge.last)) return;
      outgoing.set(edge.first, edge); incoming.add(edge.last);
    }
    if ([...outgoing.keys()].some(id => !incoming.has(id))) return;
    while (outgoing.size) {
      const first = outgoing.values().next().value!;
      const loop: CapEdge[] = [];
      let edge = first;
      do {
        loop.push(edge); outgoing.delete(edge.first);
        if (edge.last === first.first) break;
        edge = outgoing.get(edge.last)!;
      } while (edge);
      if (loop.length < 3 || loop[loop.length - 1].last !== first.first) continue;
      const points = loop.map(edge => corner.points[edge.first]);
      const origin = points[0];
      const area = points.reduce((sum, point, index) => {
        const value = cross(subtract(point, origin), subtract(points[(index + 1) % points.length], origin));
        return sum.map((component, axis) => component + value[axis]) as V3;
      }, [0, 0, 0] as V3);
      if (Math.hypot(...area) <= 1e-13) continue;
      const normal = unit(area);
      const axis = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
      const coordinates = [0, 1, 2].filter(index => index !== axis);
      const contour = points.map(point => new Vector2(point[coordinates[0]], point[coordinates[1]]));
      const triangles = ShapeUtils.triangulateShape(contour, []);
      const owner = loop.reduce((best, candidate) => dot(candidate.normal, normal) > dot(best.normal, normal) ? candidate : best);
      const anchor = corner.points[owner.first];
      inspect?.(owner.face);
      for (let indices of triangles) {
        let triangle = indices.map(index => points[index]);
        let direction = cross(subtract(triangle[1], triangle[0]), subtract(triangle[2], triangle[0]));
        if (Math.hypot(...direction) <= 1e-13) continue;
        if (dot(direction, normal) < 0) {
          indices = [indices[0], indices[2], indices[1]];
          triangle = indices.map(index => points[index]);
          direction = direction.map(value => -value) as V3;
        }
        if (loop.some(edge => coveredByFace(triangle, edge.face, this.tolerance))) continue;
        if (output.surfaces.length >= this.maximumTriangles) throw new Error("Surface appearance triangle budget exceeded.");
        const faceNormal = unit(direction);
        for (const point of triangle) {
          output.indices.push(output.positions.length / 3);
          output.positions.push(...point); output.normals.push(...faceNormal);
          output.uv.push(...this.capUV(point, anchor, owner, faceNormal)); output.colors!.push(...owner.color);
        }
        output.surfaces.push(owner.face.surface); output.solidIds!.push(owner.face.solidId);
      }
    }
  }

  /** Emits one outward, textured strip; already covered caps and internal convex-recess wedges are omitted. */
  private bridge(output: MeshData, a: Span, b: Span): void {
    const alignment = dot(a.normal, b.normal);
    // Uneven ground can have different source normals while both finishes rise along the same axis.
    const parallelDisplacement = a.face.chart && b.face.chart
      && dot(a.face.chart.frame.normal, b.face.chart.frame.normal) > 1 - 1e-12;
    if (alignment < -0.999999) return;
    const height = (edge: Span) => edge.positions.reduce((sum, point, index) => sum + dot(subtract(point, edge.base[index]), edge.normal), 0);
    const owner = height(a) <= height(b) ? a : b, other = owner === a ? b : a;
    const folded = foldedUV(owner, other);
    const aUV = owner === a ? a.uv : folded, bUV = owner === b ? b.uv : folded;
    const positions = [a.positions[0], b.positions[0], b.positions[1], a.positions[1]];
    const uv = [aUV[0], bUV[0], bUV[1], aUV[1]];
    const colors = [owner.colors[0], owner.colors[0], owner.colors[1], owner.colors[1]];
    for (const indices of [[0, 1, 2], [0, 2, 3]]) {
      const points = indices.map(index => positions[index]);
      const direction = cross(subtract(points[1], points[0]), subtract(points[2], points[0]));
      if (Math.hypot(...direction) <= 1e-13) continue;
      const normal = unit(direction);
      if (!parallelDisplacement && alignment < 0.999999
        && Math.max(dot(normal, a.normal), dot(normal, b.normal)) <= 1e-10) continue;
      if (coveredByFace(points, a.face, this.tolerance) || coveredByFace(points, b.face, this.tolerance)) continue;
      if (output.surfaces.length >= this.maximumTriangles) throw new Error("Surface appearance triangle budget exceeded.");
      for (const index of indices) {
        output.indices.push(output.positions.length / 3);
        output.positions.push(...positions[index]); output.normals.push(...normal);
        output.uv.push(...uv[index]); output.colors!.push(...colors[index]);
      }
      output.surfaces.push(owner.face.surface); output.solidIds!.push(owner.face.solidId);
      if (indices[1] === 1) {
        this.corner(a.base[0], [b.positions[0], a.positions[0]], [bUV[0], aUV[0]], owner, owner.colors[0]);
      } else {
        this.corner(a.base[1], [a.positions[1], b.positions[1]], [aUV[1], bUV[1]], owner, owner.colors[1]);
      }
    }
  }

  /** Appends gap closures to a detached mesh with color/solid arrays, honoring cancellation and the same triangle budget. */
  async finish(output: MeshData, inspect?: (face: SurfaceJunctionFace) => void): Promise<void> {
    let count = 0;
    for (const entry of this.edges.values()) {
      if (++count % 4096 === 0) { await new Promise<void>(resolve => setTimeout(resolve, 0)); aborted(this.signal); }
      if (entry === null || Array.isArray(entry)) continue;
      const owner = this.owner(entry.face);
      this.openCorners.add(`${owner}/${entry.first}`); this.openCorners.add(`${owner}/${entry.last}`);
    }
    for (const entry of this.edges.values()) {
      if (++count % 4096 === 0) { await new Promise<void>(resolve => setTimeout(resolve, 0)); aborted(this.signal); }
      if (!Array.isArray(entry)) continue;
      inspect?.(entry[0].face.chart ? entry[0].face : entry[1].face);
      const a = span(entry[0]), b = span(entry[1], true);
      const difference = a.positions.map((point, index) => dot(subtract(point, b.positions[index]), a.normal));
      if (dot(a.normal, b.normal) > 0.999999 && difference[0] * difference[1] < 0) {
        const crossing = difference[0] / (difference[0] - difference[1]);
        this.bridge(output, portion(a, 0, crossing), portion(b, 0, crossing));
        this.bridge(output, portion(a, crossing, 1), portion(b, crossing, 1));
      } else this.bridge(output, a, b);
    }
    for (const corner of this.corners.values()) {
      if (++count % 4096 === 0) { await new Promise<void>(resolve => setTimeout(resolve, 0)); aborted(this.signal); }
      this.cap(output, corner, inspect);
    }
    this.edges.clear(); this.points.clear(); this.corners.clear(); this.openCorners.clear();
    aborted(this.signal);
  }
}
