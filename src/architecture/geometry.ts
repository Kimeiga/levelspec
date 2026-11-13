import cdt2d from "cdt2d";
import Module, { type Manifold, type CrossSection, type ManifoldToplevel, type Mat4 } from "manifold-3d";
import { Matrix4, Euler, Quaternion, Vector3 } from "three";
import { area, cross, dot, inside, intersection, lerp, norm, orient, pathLength, sub } from "../vector/geometry.ts";
import type { ArchitecturePath, ArchitectureProfile, Placement, ProfileLoop, V3 } from "./types.ts";
import type { AssetGeometry } from "../vector/props.ts";

let kernel: Promise<ManifoldToplevel> | undefined;
/** Initializes the installed solid kernel once; each compilation owns its allocations. */
export function solidKernel(): Promise<ManifoldToplevel> {
  return kernel ??= Module().then(module => { module.setup(); return module; });
}

/** Copies already-normalized source coordinates; derived intersections are never requantized. */
export function authored(point: V3): V3 { return [...point]; }

/** Constructs a local affine placement in the domain coordinate system. */
export function placement(value: Placement): Matrix4 {
  const position = authored(value.position ?? [0, 0, 0]), rotation = value.rotation ?? [0, 0, 0], scale = value.scale ?? [1, 1, 1];
  if ([...rotation, ...scale].some(n => !Number.isFinite(n)) || scale.some(n => n === 0)) throw new Error("Placement requires finite rotations and nonzero finite scale.");
  const quaternion = new Quaternion().setFromEuler(new Euler(...rotation.map(n => n * Math.PI / 180) as [number, number, number], "ZYX"));
  return new Matrix4().compose(new Vector3(...position), quaternion, new Vector3(...scale));
}

/** Applies an already-resolved affine transform without requantizing its result. */
export function transform(point: V3, matrix: Matrix4): V3 { return new Vector3(...point).applyMatrix4(matrix).toArray() as V3; }

/** Adapts column-major Three.js matrices to the kernel's affine transform contract. */
export function kernelMatrix(matrix: Matrix4): Mat4 { return matrix.elements as Mat4; }

/** Adaptive de Casteljau subdivision bounds the chord deviation in three dimensions. */
function bezier(points: V3[], tolerance: number, output: V3[], limit: number, depth = 0): void {
  const a = points[0], b = points.at(-1)!, chord = sub(b, a), length = Math.hypot(...chord);
  const flatness = Math.max(...points.slice(1, -1).map(point => length > 1e-12 ? Math.hypot(...cross(sub(point, a), chord)) / length : Math.hypot(...sub(point, a))));
  if (flatness <= tolerance) { output.push(b); if (output.length > limit) throw new Error("Curve segment budget exceeded."); return; }
  if (depth >= 20) throw new Error("Curve subdivision depth exceeded.");
  const left = [a], right = [b];
  let row = points;
  while (row.length > 1) { row = row.slice(1).map((point, i) => lerp(row[i], point, .5)); left.push(row[0]); right.unshift(row.at(-1)!); }
  bezier(left, tolerance, output, limit, depth + 1); bezier(right, tolerance, output, limit, depth + 1);
}

/** Resolves analytic source curves to bounded polylines; authored arclength elevations remain independent. */
export function samplePath(path: ArchitecturePath, tolerance: number, limit: number): V3[] {
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new Error("Curve tolerance must be finite and positive.");
  const points = path.points.map(authored);
  if (path.elevation) for (const point of points) point[2] = 0;
  for (const segment of path.segments) {
    if (segment.kind === "arc") {
      const [rx, ry] = segment.radii, center = authored(segment.center);
      if (rx <= 0 || ry <= 0 || ![segment.start, segment.sweep, segment.rotation].every(Number.isFinite) || segment.sweep === 0) throw new Error("Arc radii must be positive and sweep must be finite and nonzero.");
      const radians = Math.PI / 180, maximumAngle = 2 * Math.acos(Math.max(-1, 1 - tolerance / Math.max(rx, ry)));
      const count = Math.max(1, Math.ceil(Math.abs(segment.sweep) * radians / Math.min(Math.PI / 4, maximumAngle)));
      if (points.length + count + 1 > limit) throw new Error("Curve segment budget exceeded.");
      for (let i = 0; i <= count; i++) {
        const angle = (segment.start + segment.sweep * i / count) * radians, rotation = segment.rotation * radians;
        const x = rx * Math.cos(angle), y = ry * Math.sin(angle);
        const p: V3 = [center[0] + x * Math.cos(rotation) - y * Math.sin(rotation), center[1] + x * Math.sin(rotation) + y * Math.cos(rotation), center[2]];
        if (i === 0 && points.length && Math.hypot(...sub(points.at(-1)!, p)) > tolerance) throw new Error("Arc start does not meet the preceding path segment.");
        if (i || !points.length) points.push(p);
      }
    } else {
      if (!points.length) throw new Error("A line or curve requires an initial path point.");
      const end = authored(segment.to); if (path.elevation) end[2] = 0;
      if (segment.kind === "line") points.push(end);
      else {
        const controls = segment.controls.map(authored); if (path.elevation) for (const point of controls) point[2] = 0;
        bezier([points.at(-1)!, ...controls, end], tolerance, points, limit);
      }
    }
  }
  const spatialLength = points.slice(1).reduce((length, point, i) => length + Math.hypot(...sub(point, points[i])), 0);
  if (points.length < 2 || points.length > limit || spatialLength <= 1e-9) throw new Error("A path needs nonzero length within the curve segment budget.");
  if (path.elevation) {
    const [start, end] = path.elevation, total = pathLength(points);
    if (total <= 1e-9) throw new Error("A distance-elevation path requires nonzero plan length.");
    let distance = 0;
    for (let i = 0; i < points.length; i++) {
      if (i) distance += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      points[i][2] = start + distance / total * (end - start);
    }
  }
  if (path.closed && Math.hypot(...sub(points[0], points.at(-1)!)) > 1e-9) points.push([...points[0]]);
  return points;
}

export interface ResolvedProfile {
  points: V3[];
  triangles: [number, number, number][];
  loops: V3[][];
}

/** Resolves loop paths in authored direction, rejecting gaps instead of silently closing them. */
function resolveLoop(loop: ProfileLoop, paths: Map<string, V3[]>): V3[] {
  if (loop.points) return loop.points.map(authored);
  const result: V3[] = [];
  for (const reference of loop.paths ?? []) {
    const reversed = reference.startsWith("-"), id = reversed ? reference.slice(1) : reference;
    const path = paths.get(id);
    if (!path) throw new Error(`Unknown profile path ${id}.`);
    const points = reversed ? [...path].reverse() : path;
    if (result.length && Math.hypot(...sub(result.at(-1)!, points[0])) > 1e-7) throw new Error(`Broken profile seam before ${id}.`);
    result.push(...(result.length ? points.slice(1) : points));
  }
  if (loop.paths?.length && result.length && Math.hypot(...sub(result[0], result.at(-1)!)) > 1e-7) throw new Error("Profile path loop is not closed.");
  return result;
}

/** Constrained triangulation keeps holes, explicit elevations, and authored breaklines. */
export function resolveProfile(profile: ArchitectureProfile, paths: Map<string, V3[]>, maximumVertices = 4096): ResolvedProfile {
  const count = [profile.outer, ...profile.holes].reduce((sum, loop) => sum + (loop.points?.length ?? loop.paths?.reduce((total, id) => total + (paths.get(id.replace(/^-/, ""))?.length ?? 0), 0) ?? 0), 0)
    + profile.interior.length + profile.breaklines.reduce((sum, line) => sum + line.length, 0);
  if (count > maximumVertices) throw new Error("Profile vertex budget exceeded before triangulation.");
  const loops = [profile.outer, ...profile.holes].map(loop => {
    const points = resolveLoop(loop, paths);
    if (points.length > 1 && Math.hypot(...sub(points[0], points.at(-1)!)) < 1e-9) points.pop();
    if (points.length < 3 || Math.abs(area(points)) < 1e-12) throw new Error("Profile loops need at least three points and nonzero plan area.");
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++)
      if (intersection(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length])) throw new Error("Profile boundary self-intersects.");
    return points;
  });
  for (let i = 1; i < loops.length; i++) {
    if (!inside(loops[i][0], loops[0])) throw new Error("Profile hole is outside its outer boundary.");
    for (let j = 0; j < i; j++) {
      if (j > 0 && (inside(loops[i][0], loops[j]) || inside(loops[j][0], loops[i]))) throw new Error("Profile holes overlap or nest.");
      for (let a = 0; a < loops[i].length; a++) for (let b = 0; b < loops[j].length; b++)
        if (intersection(loops[i][a], loops[i][(a + 1) % loops[i].length], loops[j][b], loops[j][(b + 1) % loops[j].length])) throw new Error("Profile loops intersect.");
    }
  }
  const points: V3[] = [], edges: [number, number][] = [], lookup = new Map<string, number>();
  const add = (point: V3) => {
    const key = `${point[0]},${point[1]}`, existing = lookup.get(key);
    if (existing !== undefined) { if (Math.abs(points[existing][2] - point[2]) > 1e-7) throw new Error("Profile has multiple heights at one plan coordinate."); return existing; }
    const id = points.length; points.push(point); lookup.set(key, id); return id;
  };
  for (const loop of loops) { const ids = loop.map(add); ids.forEach((id, i) => edges.push([id, ids[(i + 1) % ids.length]])); }
  for (const point of profile.interior.map(authored)) {
    if (!inside(point, loops[0]) || loops.slice(1).some(loop => inside(point, loop))) throw new Error("Interior point is outside its profile.");
    add(point);
  }
  for (const line of profile.breaklines) { const ids = line.map(point => add(authored(point))); for (let i = 1; i < ids.length; i++) edges.push([ids[i - 1], ids[i]]); }
  const split: [number, number][] = [];
  for (const [a, b] of edges) {
    const A = points[a], B = points[b], dx = B[0] - A[0], dy = B[1] - A[1], length = dx * dx + dy * dy;
    if (length < 1e-20) throw new Error("Zero-length profile constraint.");
    const ids = points.map((p, id) => ({ id, t: ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / length }))
      .filter(({ id, t }) => t >= -1e-9 && t <= 1 + 1e-9 && Math.abs(orient(A, B, points[id])) < 1e-7).sort((a, b) => a.t - b.t);
    for (let i = 1; i < ids.length; i++) split.push([ids[i - 1].id, ids[i].id]);
  }
  for (let i = 0; i < split.length; i++) for (let j = i + 1; j < split.length; j++)
    if (intersection(points[split[i][0]], points[split[i][1]], points[split[j][0]], points[split[j][1]])) throw new Error("Profile constraints cross without an authored junction.");
  const unique = [...new Map(split.map(edge => [[...edge].sort((a, b) => a - b).join(","), edge])).values()];
  const triangles = cdt2d(points.map(p => p.slice(0, 2)), unique, { exterior: true, interior: true }).filter(tri => {
    const center = [0, 1].map(axis => (points[tri[0]][axis] + points[tri[1]][axis] + points[tri[2]][axis]) / 3);
    return inside(center, loops[0]) && !loops.slice(1).some(loop => inside(center, loop));
  }).map(tri => (orient(points[tri[0]], points[tri[1]], points[tri[2]]) > 0 ? tri : [tri[0], tri[2], tri[1]]) as [number, number, number]);
  if (!triangles.length) throw new Error("Profile triangulation is empty.");
  return { points, triangles, loops };
}

/** Closes a triangulated height surface to explicit bottom coordinates without changing its top. */
export function surfaceSolid(profile: ResolvedProfile, bottom: (point: V3) => V3): AssetGeometry {
  const positions = [...profile.points, ...profile.points.map(bottom)], n = profile.points.length;
  const triangles: [number, number, number][] = [...profile.triangles, ...profile.triangles.map(([a, b, c]): [number, number, number] => [c + n, b + n, a + n])];
  const boundaries = new Map<string, [number, number]>();
  for (const triangle of profile.triangles) for (let i = 0; i < 3; i++) {
    const a = triangle[i], b = triangle[(i + 1) % 3], key = [a, b].sort((a, b) => a - b).join(",");
    if (boundaries.has(key)) boundaries.delete(key); else boundaries.set(key, [a, b]);
  }
  for (const [a, b] of boundaries.values()) triangles.push([a, a + n, b + n], [a, b + n, b]);
  return { positions, triangles };
}

/** Builds a section-to-section solid with matching profile vertices. */
export function loft(sections: V3[][], caps: [number, number, number][]): AssetGeometry {
  if (sections.length < 2 || sections.some(section => section.length !== sections[0].length)) throw new Error("A loft needs matching nonempty sections.");
  const count = sections[0].length, positions = sections.flat(), triangles: [number, number, number][] = [];
  for (const [a, b, c] of caps) triangles.push([c, b, a], [a + positions.length - count, b + positions.length - count, c + positions.length - count]);
  const boundaries = new Map<string, [number, number]>();
  for (const triangle of caps) for (let i = 0; i < 3; i++) {
    const a = triangle[i], b = triangle[(i + 1) % 3], key = [a, b].sort((a, b) => a - b).join(",");
    if (boundaries.has(key)) boundaries.delete(key); else boundaries.set(key, [a, b]);
  }
  for (let s = 1; s < sections.length; s++) for (const [i, j] of boundaries.values()) {
    const a = (s - 1) * count + i, b = (s - 1) * count + j, c = s * count + j, d = s * count + i;
    triangles.push([a, b, c], [a, c, d]);
  }
  return { positions, triangles };
}

/** Owns every native allocation, including intermediate CSG results, until compilation ends. */
export class SolidSession {
  private readonly allocations = new Set<Manifold>();
  private readonly sections = new Set<CrossSection>();
  readonly kernel: ManifoldToplevel;
  constructor(kernel: ManifoldToplevel) { this.kernel = kernel; }
  /** Registers an owned 2D section, including offset construction intermediates. */
  section(section: CrossSection): CrossSection { this.sections.add(section); return section; }
  /** Registers an owned kernel result and checks deferred geometry errors. */
  keep(solid: Manifold): Manifold {
    this.allocations.add(solid);
    if (solid.status() !== "NoError") throw new Error(`Invalid closed solid operand: ${solid.status()}.`);
    return solid;
  }
  /** Builds a checked native solid from explicit physical facets. */
  mesh(geometry: AssetGeometry, original: number): Manifold {
    const raw = new this.kernel.Mesh({ numProp: 3, vertProperties: Float32Array.from(geometry.positions.flat()), triVerts: Uint32Array.from(geometry.triangles.flat()),
      runIndex: Uint32Array.from([0, geometry.triangles.length * 3]), runOriginalID: Uint32Array.from([original]) });
    raw.merge();
    for (let i = 0; i < (raw.mergeFromVert?.length ?? 0); i++) {
      const a = raw.mergeFromVert[i] * raw.numProp, b = raw.mergeToVert[i] * raw.numProp;
      if ([0, 1, 2].some(axis => raw.vertProperties[a + axis] !== raw.vertProperties[b + axis])) throw new Error("Native operand requires a nonzero vertex repair; author the intended closed geometry explicitly.");
    }
    return this.keep(new this.kernel.Manifold(raw));
  }
  /** Assigns one original contributor to generated primitive faces. */
  own(solid: Manifold, original: number): Manifold {
    const mesh = solid.getMesh();
    return this.mesh({ positions: Array.from({ length: mesh.vertProperties.length / mesh.numProp }, (_, i) => Array.from(mesh.vertProperties.slice(i * mesh.numProp, i * mesh.numProp + 3)) as V3),
      triangles: Array.from({ length: mesh.triVerts.length / 3 }, (_, i) => Array.from(mesh.triVerts.slice(i * 3, i * 3 + 3)) as [number, number, number]) }, original);
  }
  /** Releases success, failure, and cancellation allocations exactly once. */
  dispose(): void { for (const solid of [...this.allocations].reverse()) solid.delete(); this.allocations.clear(); for (const section of [...this.sections].reverse()) section.delete(); this.sections.clear(); }
}

/** Returns the oriented unit normal of a nondegenerate physical triangle. */
export function triangleNormal(points: V3[]): V3 { return norm(cross(sub(points[1], points[0]), sub(points[2], points[0]))); }

/** Computes a stable local basis perpendicular to a path tangent. */
export function pathBasis(tangent: V3, previous?: V3): [V3, V3] {
  const direction = norm(tangent);
  let x = previous ? sub(previous, direction.map(n => n * dot(previous, direction)) as V3) : cross([0, 0, 1], direction);
  if (Math.hypot(...x) < 1e-8) x = cross([0, 1, 0], direction);
  x = norm(x);
  return [x, norm(cross(direction, x))];
}
