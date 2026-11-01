/** Intent-level architectural helpers. They emit ordinary SVGX topology, not opaque meshes. */
import type { V2, V3, Edge, Opening, Region } from "./types.ts";
import { coordinateKey } from "./precision.ts";
import type { AuthoringGroup } from "./authoring.ts";

export interface WallOptions {
  from: V3;
  to: V3;
  height: number;
  material: string;
  thickness?: number;
}

function positive(label: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be finite and positive.`);
}
function sourceId(group: AuthoringGroup, id: string) {
  if (!/^[A-Za-z_][\w.:/-]*$/.test(id)) throw new Error(`Invalid architectural id ${id}.`);
  return `${group.id}/${id}`;
}

/**
 * Creates a real collidable wall or turns an already-authored open floor boundary
 * into one. Referencing the existing edge preserves shared topology.
 */
export function addWall(group: AuthoringGroup, id: string, options: WallOptions): Edge {
  positive("Wall height", options.height);
  if (options.thickness !== undefined) positive("Wall thickness", options.thickness);
  if (!options.material) throw new Error("A wall requires a material.");
  const full = sourceId(group, id);
  if (group.layer.edges.some(e => e.id === full) ||
      group.layer.vertices.some(v => v.id === full) ||
      group.layer.regions.some(r => r.id === full))
    throw new Error(`Duplicate architectural object ${full}.`);
  const a = group.world(options.from), b = group.world(options.to);
  if (Math.abs(a[2] - b[2]) > 1e-6)
    throw new Error("An opening-bearing wall needs a horizontal base; split sloped walls.");
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01)
    throw new Error("A wall must span at least 1 cm horizontally.");
  const vertex = (position: V3, suffix: string) => {
    const key = coordinateKey(position);
    const existing = group.layer.vertices.find(v => coordinateKey([v.x, v.y, v.z]) === key);
    if (existing) return existing.id;
    const name = `${full}/${suffix}`;
    group.layer.vertices.push({ id: name, x: position[0], y: position[1], z: position[2] });
    return name;
  };
  const from = vertex(a, "a"), to = vertex(b, "b");
  const edge = group.layer.edges.find(e =>
    (e.from === from && e.to === to) || (e.from === to && e.to === from));
  if (edge) {
    if (edge.kind !== "open") throw new Error(`Edge ${edge.id} is already a wall.`);
    edge.kind = "wall";
    edge.height = options.height;
    edge.material = options.material;
    edge.thickness = options.thickness;
    return edge;
  }
  const created: Edge = { id: full, from, to, kind: "wall",
    height: options.height, material: options.material,
    thickness: options.thickness, openings: [] };
  group.layer.edges.push(created);
  return created;
}

export interface CircularOpeningOptions {
  /** Distance along the wall, from its from-vertex, in metres. */
  centerAlong: number;
  /** Height above the wall's horizontal base, in metres. */
  centerHeight: number;
  radius: number;
  segments?: number;
}

/**
 * Approximate a circular aperture with adjoining cutouts in an actual wall.
 * Each slice is wholly inside the circle, so a wall never loses material
 * outside the specified radius. This is geometry/collision, not a dark decal.
 */
function checkOpeningConflicts(wall: Edge, slices: Opening[]) {
  for (const slice of slices)
    if (wall.openings.some(other =>
      slice.start < other.end - 1e-6 && slice.end > other.start + 1e-6))
      throw new Error("Circular opening overlaps another opening in the wall.");
}

export function addCircularOpening(
  group: AuthoringGroup, wall: Edge, id: string, options: CircularOpeningOptions,
): Opening[] {
  const full = sourceId(group, id);
  if (!group.layer.edges.includes(wall) || wall.kind === "open")
    throw new Error("Circular openings require a wall belonging to this group.");
  positive("Opening radius", options.radius);
  const steps = options.segments ?? 48;
  if (!Number.isInteger(steps) || steps < 8 || steps > 128)
    throw new Error("Opening segments must be between 8 and 128.");
  const a = group.layer.vertices.find(v => v.id === wall.from);
  const b = group.layer.vertices.find(v => v.id === wall.to);
  if (!a || !b || !Number.isFinite(wall.height))
    throw new Error("Circular openings need a finite-height wall with valid vertices.");
  const length = Math.hypot(a.x - b.x, a.y - b.y);
  const { radius, centerAlong, centerHeight } = options;
  if (![centerAlong, centerHeight].every(Number.isFinite) ||
      centerAlong - radius < 0 || centerAlong + radius > length ||
      centerHeight - radius < 0 || centerHeight + radius > wall.height!)
    throw new Error("Circular opening must lie completely inside the wall.");
  if (wall.openings.some(o => o.id === full || o.id.startsWith(full + "/")))
    throw new Error(`Duplicate circular opening ${full}.`);
  const result: Opening[] = [];
  for (let i = 0; i < steps; i++) {
    const start = centerAlong - radius + 2 * radius * i / steps;
    const end = centerAlong - radius + 2 * radius * (i + 1) / steps;
    // Inscribed vertical strip; midpoint alone would cut outside the circle.
    const furthest = Math.max(Math.abs(start - centerAlong), Math.abs(end - centerAlong));
    const half = Math.sqrt(Math.max(0, radius * radius - furthest * furthest));
    if (half < 0.001) continue;
    const opening: Opening = {
      id: `${full}/slice${i}`, kind: "window",
      start, end, sill: centerHeight - half, head: centerHeight + half,
    };
    result.push(opening);
  }
  checkOpeningConflicts(wall, result);
  wall.openings.push(...result);
  return result;
}

export interface StoreyOptions {
  /** Plan vertices in counterclockwise order; concave footprints are supported. */
  footprint: V2[];
  z: number;
  height: number;
  material: string;
  wallThickness?: number;
  floorThickness?: number;
}

/** An actual enterable floor and perimeter walls, not a filled building box. */
export function addStoreyShell(group: AuthoringGroup, id: string, options: StoreyOptions) {
  positive("Storey height", options.height);
  if (options.footprint.length < 3 || options.footprint.some(p => p.length !== 2 || !p.every(Number.isFinite)))
    throw new Error("Storey footprint needs at least three finite XY points.");
  if (!Number.isFinite(options.z)) throw new Error("Storey base must be finite.");
  const floor = group.polygon(`${id}/floor`,
    options.footprint.map(p => [p[0], p[1], options.z] as V3),
    { material: options.material, thickness: options.floorThickness ?? 0.2 });
  const walls = floor.boundary.map(edgeRef => {
    const edgeId = edgeRef.replace(/^-/, "");
    const edge = group.layer.edges.find(e => e.id === edgeId);
    if (!edge || edge.kind !== "open")
      throw new Error(`Storey wall boundary ${edgeId} is already occupied.`);
    edge.kind = "wall";
    edge.height = options.height;
    edge.material = options.material;
    edge.thickness = options.wallThickness;
    return edge;
  });
  return { floor, walls };
}

export interface StairFlightOptions {
  lower: [V3, V3];
  upper: [V3, V3];
  material: string;
  thickness?: number;
  rise?: number;
}
/** One independently positioned playable stair flight between two level edges. */
export function addStairFlight(group: AuthoringGroup, id: string, options: StairFlightOptions): Region {
  const [a, b] = options.lower, [c, d] = options.upper;
  if (Math.abs(a[2] - b[2]) > 1e-6 || Math.abs(c[2] - d[2]) > 1e-6 || c[2] <= a[2])
    throw new Error("A stair flight needs level landing edges and a positive climb.");
  return group.polygon(id, [a, b, d, c], {
    fill: "stairs", material: options.material, thickness: options.thickness ?? 0.15,
    rise: options.rise ?? 0.18, underside: "sloped",
  });
}
