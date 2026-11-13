import type { CompiledArchitecture, V3 } from "../../architecture/types.ts";
import { Rng } from "../../generate/rng.ts";
import type { Obstructions, WalkingSurfaces } from "./scene.ts";

/** Faces within this angle of one another, as a cosine, share a wall direction (0.35°). */
const SAME_DIRECTION = Math.cos((0.35 * Math.PI) / 180);
/** Parallel faces within this distance share a wall plane, meters. */
const SAME_PLANE = 0.004;
/** Coverage lookup cell on a wall plane, meters. */
const CELL = 1;
/** Half extents of the solid wall a bracket rack needs, meters along and up the wall. */
const RACK_HALF_WIDTH = 0.11;
const RACK_HALF_HEIGHT = 0.32;
/** Utility brackets are fixed at least this far above a walking surface, meters. */
const LOWEST_BRACKET = 2.5;

/** An axis-aligned rectangle on a wall plane: `u` along the wall, `z` world height, meters. */
export interface WallRect {
  u0: number;
  u1: number;
  z0: number;
  z1: number;
}

/** A dressing host whose finished geometry may carry span anchors. */
export interface SpanHost {
  /** Resolved AML element ID. */
  id: string;
  layer: string;
  /** The recipe's own wall finish, which the host's span parts are also drawn with. */
  wall: string;
  /** Every material the host's generated solid wall may be drawn in: `wall` and the substrate palette. */
  walls: string[];
  /** Materials of the host's generated window glass. */
  glazing: string[];
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Returns the area of a convex polygon after clipping it to a rectangle. */
function clippedArea(polygon: number[][], rect: WallRect): number {
  let clipped = polygon;
  for (const [axis, bound, sign] of [
    [0, rect.u0, 1],
    [0, rect.u1, -1],
    [1, rect.z0, 1],
    [1, rect.z1, -1],
  ]) {
    const kept: number[][] = [];
    for (let i = 0; i < clipped.length; i++) {
      const a = clipped[i],
        b = clipped[(i + 1) % clipped.length];
      const da = sign * (a[axis] - bound),
        db = sign * (b[axis] - bound);
      if (da >= 0) kept.push(a);
      if (da >= 0 !== db >= 0)
        kept.push(a.map((value, k) => value + (da / (da - db)) * (b[k] - value)));
    }
    clipped = kept;
  }
  let twice = 0;
  for (let i = 1; i + 1 < clipped.length; i++)
    twice += Math.abs(
      (clipped[i][0] - clipped[0][0]) * (clipped[i + 1][1] - clipped[0][1]) -
        (clipped[i][1] - clipped[0][1]) * (clipped[i + 1][0] - clipped[0][0]),
    );
  return twice / 2;
}

/**
 * One exposed vertical plane of a host, assembled from its finished solid
 * wall triangles. Plane coordinates are `u` along the wall, increasing to the
 * right as seen from outside, and world height `z`; the normal points outward.
 */
export class AnchorPlane {
  readonly host: SpanHost;
  /** Horizontal unit vectors. */
  readonly normal: V3;
  readonly tangent: V3;
  /** Signed distance of the plane from the world origin along `normal`, meters. */
  readonly offset: number;
  /** Bounds of the solid wall on this plane. */
  readonly bounds: WallRect;
  /** Glazed openings behind this plane, projected onto it. */
  readonly windows: WallRect[] = [];
  private readonly cells = new Map<number, number[][][]>();

  /** `faces` are world-space triangles lying on the plane; they are only read. */
  constructor(host: SpanHost, normal: V3, offset: number, faces: V3[][]) {
    this.host = host;
    this.normal = normal;
    this.tangent = [normal[1], -normal[0], 0];
    this.offset = offset;
    const local = faces.map((face) =>
      face.map((point) => [dot(point, this.tangent), point[2]]),
    );
    const us = local.flat().map((p) => p[0]),
      zs = local.flat().map((p) => p[1]);
    this.bounds = {
      u0: us.reduce((a, b) => Math.min(a, b)),
      u1: us.reduce((a, b) => Math.max(a, b)),
      z0: zs.reduce((a, b) => Math.min(a, b)),
      z1: zs.reduce((a, b) => Math.max(a, b)),
    };
    for (const polygon of local)
      for (const key of this.keys({
        u0: Math.min(...polygon.map((p) => p[0])),
        u1: Math.max(...polygon.map((p) => p[0])),
        z0: Math.min(...polygon.map((p) => p[1])),
        z1: Math.max(...polygon.map((p) => p[1])),
      })) {
        const cell = this.cells.get(key);
        if (cell) cell.push(polygon);
        else this.cells.set(key, [polygon]);
      }
  }

  /** Lists the coverage cells a rectangle overlaps. */
  private keys(rect: WallRect): number[] {
    const keys: number[] = [];
    const column = (u: number) => Math.floor((u - this.bounds.u0) / CELL),
      row = (z: number) => Math.floor((z - this.bounds.z0) / CELL);
    for (let i = column(rect.u0); i <= column(rect.u1); i++)
      for (let j = row(rect.z0); j <= row(rect.z1); j++) keys.push(i * 8192 + j);
    return keys;
  }

  /**
   * True when solid wall lies behind the whole rectangle. Half a percent of
   * the area may be missing, which absorbs the rounding of generated vertices
   * but not a window, a doorway or the edge of the wall.
   */
  covers(rect: WallRect): boolean {
    const { bounds } = this;
    if (rect.u0 < bounds.u0 || rect.u1 > bounds.u1 || rect.z0 < bounds.z0 || rect.z1 > bounds.z1)
      return false;
    const seen = new Set<number[][]>();
    let area = 0;
    for (const key of this.keys(rect))
      for (const polygon of this.cells.get(key) ?? []) {
        if (seen.has(polygon)) continue;
        seen.add(polygon);
        area += clippedArea(polygon, rect);
      }
    return area >= (rect.u1 - rect.u0) * (rect.z1 - rect.z0) * 0.995;
  }

  /** Returns the world position at plane coordinates (`u`, `z`), `out` meters in front of the wall. */
  point(u: number, z: number, out = 0): V3 {
    const along = this.offset + out;
    return [
      this.tangent[0] * u + this.normal[0] * along,
      this.tangent[1] * u + this.normal[1] * along,
      z,
    ];
  }
}

/** A place on a wall where a span may be fixed. */
export interface Anchor {
  plane: AnchorPlane;
  /** Plane coordinates of the fixing, meters. */
  u: number;
  z: number;
  /** World position on the wall surface. */
  position: V3;
  /** Meters above the walking surface in front of the wall, or above the wall's foot where there is none. */
  height: number;
  /** Set for fixings beside a window, where a household can reach a line. */
  window?: WallRect;
}

interface Facet {
  points: V3[];
  /** Horizontal unit normal. */
  normal: V3;
  area: number;
}

/**
 * Reads one triangle of the render mesh as a vertical facet, or returns
 * undefined when it leans, is degenerate or smaller than a square centimeter.
 */
function verticalFacet(level: CompiledArchitecture, t: number): Facet | undefined {
  const { mesh } = level;
  const points = [0, 1, 2].map((corner) => {
    const index = mesh.indices[t * 3 + corner] * 3;
    return mesh.positions.slice(index, index + 3) as V3;
  });
  const [a, b, c] = points;
  const e1 = b.map((value, k) => value - a[k]),
    e2 = c.map((value, k) => value - a[k]);
  const normal: V3 = [
    e1[1] * e2[2] - e1[2] * e2[1],
    e1[2] * e2[0] - e1[0] * e2[2],
    e1[0] * e2[1] - e1[1] * e2[0],
  ];
  const length = Math.hypot(...normal);
  if (length < 2e-4 || Math.abs(normal[2]) > length * 0.02) return undefined;
  const horizontal = Math.hypot(normal[0], normal[1]);
  // Stored vertex normals are authoritative where a mesh winds a face the other way.
  const stored = mesh.indices[t * 3] * 3;
  const flip =
    normal[0] * mesh.normals[stored] + normal[1] * mesh.normals[stored + 1] < 0 ? -1 : 1;
  return {
    points,
    normal: [(normal[0] / horizontal) * flip, (normal[1] / horizontal) * flip, 0],
    area: length / 2,
  };
}

/**
 * Groups facets into planes. Large facets are placed first so that their
 * precise normals name each wall direction; small facets with rounding noise
 * then join the direction they belong to instead of fragmenting it.
 */
function groupPlanes(facets: Facet[]): { normal: V3; offset: number; facets: Facet[] }[] {
  const directions: { normal: V3; facets: Facet[] }[] = [];
  for (const facet of [...facets].sort((a, b) => b.area - a.area)) {
    let direction = directions.find((d) => dot(d.normal, facet.normal) > SAME_DIRECTION);
    if (!direction) {
      direction = { normal: facet.normal, facets: [] };
      directions.push(direction);
    }
    direction.facets.push(facet);
  }
  const planes: { normal: V3; offset: number; facets: Facet[] }[] = [];
  for (const { normal, facets: members } of directions) {
    const placed = members
      .map((facet) => ({ facet, offset: dot(normal, facet.points[0]) }))
      .sort((a, b) => a.offset - b.offset);
    let run: typeof placed = [];
    const close = () => {
      if (run.length)
        planes.push({
          normal,
          offset: run[Math.floor(run.length / 2)].offset,
          facets: run.map((entry) => entry.facet),
        });
      run = [];
    };
    for (const entry of placed) {
      if (run.length && entry.offset - run[run.length - 1].offset > SAME_PLANE) close();
      run.push(entry);
    }
    close();
  }
  return planes;
}

/**
 * Returns the wall plane a pane belongs to: the nearest parallel plane that
 * the pane sits in or up to 0.7 m behind, as in a reveal, and whose bounds
 * contain the pane's center. Undefined for glazing behind no wall face.
 */
function wallInFront(planes: AnchorPlane[], normal: V3, offset: number, pane: V3[]): AnchorPlane | undefined {
  const center = [0, 1, 2].map((axis) => (pane[0][axis] + pane[1][axis] + pane[2][axis]) / 3) as V3;
  let nearest: AnchorPlane | undefined;
  for (const plane of planes) {
    const behind = plane.offset - offset;
    if (dot(plane.normal, normal) < 0.999 || behind < -0.05 || behind > 0.7) continue;
    const u = dot(center, plane.tangent);
    const { bounds } = plane;
    if (u < bounds.u0 || u > bounds.u1 || center[2] < bounds.z0 || center[2] > bounds.z1) continue;
    if (!nearest || plane.offset < nearest.offset) nearest = plane;
  }
  return nearest;
}

/** Merges rectangles that overlap or lie within `gap` meters of one another. */
function mergeRects(rects: WallRect[], gap: number): WallRect[] {
  const merged: WallRect[] = [];
  for (const rect of rects) {
    let grown = { ...rect };
    for (let i = merged.length - 1; i >= 0; i--) {
      const other = merged[i];
      const apart =
        other.u0 > grown.u1 + gap || other.u1 < grown.u0 - gap ||
        other.z0 > grown.z1 + gap || other.z1 < grown.z0 - gap;
      if (apart) continue;
      grown = {
        u0: Math.min(grown.u0, other.u0),
        u1: Math.max(grown.u1, other.u1),
        z0: Math.min(grown.z0, other.z0),
        z1: Math.max(grown.z1, other.z1),
      };
      merged.splice(i, 1);
      i = merged.length;
    }
    merged.push(grown);
  }
  return merged;
}

/**
 * Finds the exposed wall planes of every host in the level's finished render
 * mesh. A host owns its authored faces and the generated parts drawn in its
 * wall material; its glazing marks windows on the plane in front of it.
 * Planes too small to carry a bracket are dropped. The result is ordered by
 * host and position, independent of recipe order.
 */
export function anchorPlanes(level: CompiledArchitecture, hosts: SpanHost[]): AnchorPlane[] {
  const byId = new Map(hosts.map((host) => [host.id, host]));
  const walls = new Map<SpanHost, Facet[]>(),
    panes = new Map<SpanHost, Facet[]>();
  const roles = level.surfaces.map((surface) => {
    if (surface.visible === false || surface.dynamic) return undefined;
    const own = byId.get(surface.object);
    if (own) return { host: own, into: walls };
    const host = byId.get(level.provenance[surface.object]?.host ?? "");
    if (!host) return undefined;
    if (host.walls.includes(surface.material)) return { host, into: walls };
    // Windows are drawn into `openings`; glossy props elsewhere share their finish but are no windows.
    if (host.glazing.includes(surface.material) && surface.object.endsWith("/$dressing/openings")) return { host, into: panes };
    return undefined;
  });
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const role = roles[level.mesh.surfaces[t]];
    if (!role) continue;
    const facet = verticalFacet(level, t);
    if (!facet) continue;
    const list = role.into.get(role.host);
    if (list) list.push(facet);
    else role.into.set(role.host, [facet]);
  }
  const planes: AnchorPlane[] = [];
  for (const host of [...hosts].sort((a, b) => a.id.localeCompare(b.id))) {
    const own: AnchorPlane[] = [];
    for (const group of groupPlanes(walls.get(host) ?? [])) {
      const plane = new AnchorPlane(host, group.normal, group.offset, group.facets.map((f) => f.points));
      const width = plane.bounds.u1 - plane.bounds.u0,
        height = plane.bounds.z1 - plane.bounds.z0;
      const area = group.facets.reduce((sum, facet) => sum + facet.area, 0);
      // Coplanar trim scattered over a facade has wide bounds but almost no wall in them.
      if (width < 0.8 || height < 1.6 || area < Math.max(1.2, width * height * 0.15)) continue;
      own.push(plane);
    }
    const openings = new Map<AnchorPlane, WallRect[]>();
    for (const glazed of groupPlanes(panes.get(host) ?? []))
      for (const facet of glazed.facets) {
        const plane = wallInFront(own, glazed.normal, glazed.offset, facet.points);
        if (!plane) continue;
        const us = facet.points.map((p) => dot(p, plane.tangent)),
          zs = facet.points.map((p) => p[2]);
        const rect = { u0: Math.min(...us), u1: Math.max(...us), z0: Math.min(...zs), z1: Math.max(...zs) };
        const list = openings.get(plane);
        if (list) list.push(rect);
        else openings.set(plane, [rect]);
      }
    for (const [plane, rects] of openings)
      plane.windows.push(
        ...mergeRects(rects, 0.15).filter(
          (rect) => rect.u1 - rect.u0 > 0.4 && rect.z1 - rect.z0 > 0.5 && rect.z1 - rect.z0 < 2.8,
        ),
      );
    planes.push(...own);
  }
  return planes.sort(
    (a, b) =>
      a.host.id.localeCompare(b.host.id) ||
      a.normal[0] - b.normal[0] ||
      a.normal[1] - b.normal[1] ||
      a.offset - b.offset,
  );
}

/** Scene queries a candidate fixing must pass. */
export interface Surroundings {
  obstructions: Obstructions;
  floors: WalkingSurfaces;
}

/**
 * Builds an anchor at plane coordinates when a part of the given half extents
 * would sit on solid wall with open air in front of it; undefined otherwise.
 */
function anchorAt(
  plane: AnchorPlane,
  u: number,
  z: number,
  halfWidth: number,
  halfHeight: number,
  surroundings: Surroundings,
): Anchor | undefined {
  if (!plane.covers({ u0: u - halfWidth, u1: u + halfWidth, z0: z - halfHeight, z1: z + halfHeight }))
    return undefined;
  if (surroundings.obstructions.blocked(plane.point(u, z, 0.03), plane.point(u, z, 0.45)))
    return undefined;
  const floor = surroundings.floors.below(plane.point(u, z, 0.4));
  // Where no walking surface lies in front, the foot of the wall stands in for one.
  const height = z - (floor ?? plane.bounds.z0);
  if (height < LOWEST_BRACKET) return undefined;
  return { plane, u, z, position: plane.point(u, z), height };
}

/**
 * Proposes utility fixings over a plane: a jittered grid about 1.5 m by 1.15 m
 * with one more row just under the top edge, where roof-to-roof lines start.
 * Every anchor has solid wall for a full bracket rack and open air in front.
 */
export function utilityAnchors(plane: AnchorPlane, seed: string, surroundings: Surroundings): Anchor[] {
  const rng = new Rng(`${seed}/utility`);
  const { bounds } = plane;
  const anchors: Anchor[] = [];
  const columns = Math.max(1, Math.round((bounds.u1 - bounds.u0 - 0.6) / 1.5));
  const pitch = (bounds.u1 - bounds.u0 - 0.6) / columns;
  const top = bounds.z1 - RACK_HALF_HEIGHT - 0.04;
  const rows: number[] = [];
  for (let z = bounds.z0 + 0.6; z < top - 0.7; z += 1.15) rows.push(z);
  for (let column = 0; column < columns; column++) {
    const center = bounds.u0 + 0.3 + (column + 0.5) * pitch;
    for (const row of rows) {
      const u = center + rng.float(-0.3, 0.3) * pitch,
        z = row + rng.float(-0.4, 0.4);
      const anchor = anchorAt(plane, u, z, RACK_HALF_WIDTH, RACK_HALF_HEIGHT, surroundings);
      if (anchor) anchors.push(anchor);
    }
    const edge = anchorAt(plane, center + rng.float(-0.3, 0.3) * pitch, top, RACK_HALF_WIDTH, RACK_HALF_HEIGHT, surroundings);
    if (edge) anchors.push(edge);
  }
  return anchors;
}

/**
 * Proposes clothesline fixings beside every window of a plane, at a height a
 * person leaning out can reach. At most one side of a window is used, chosen
 * by the seed, so two lines never start at the same window.
 */
export function windowAnchors(plane: AnchorPlane, seed: string, surroundings: Surroundings): Anchor[] {
  const rng = new Rng(`${seed}/windows`);
  const anchors: Anchor[] = [];
  const ordered = [...plane.windows].sort((a, b) => a.z0 - b.z0 || a.u0 - b.u0);
  for (const window of ordered) {
    const z = window.z0 + (window.z1 - window.z0) * rng.float(0.6, 0.85);
    const side = rng.bool() ? 1 : -1;
    // Frames and reveals take up to a few decimeters beside the glass; the nearest solid wall wins.
    const reaches = [0.16, 0.28, 0.42].flatMap((gap) => [side, -side].map((s) => (s > 0 ? window.u1 + gap : window.u0 - gap)));
    for (const u of reaches) {
      const anchor = anchorAt(plane, u, z, 0.06, 0.2, surroundings);
      if (!anchor) continue;
      anchors.push({ ...anchor, window });
      break;
    }
  }
  return anchors;
}
