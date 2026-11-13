import { Ray, Vector3 } from "three";
import { cross, dot, sub } from "./geometry.ts";
import { PhysicalGeometryIndex, spatialBounds } from "./spatial-geometry.ts";
import type { CompiledLevel, V3 } from "./types.ts";

/**
 * Reusable upward-support evidence for one immutable physical level. Global height
 * bounds ignore XY reachability conservatively; mouth queries then bound possible
 * feet locally. A shared body plane exists only when that vertical range is short.
 */
export class StandingSupports {
  private readonly supports: { min: number; max: number; bounds: ReturnType<typeof spatialBounds> }[] = [];
  private readonly reachableHeights = new Map<number, number>();
  private readonly level: CompiledLevel;
  private readonly spend: () => void;

  /** Extracts and orders upward physical faces once, sharing the caller's work limit. */
  constructor(level: CompiledLevel, spend: () => void) {
    this.level = level;
    this.spend = spend;
    const mesh = level.physicalMesh ?? level.mesh;
    for (let triangle = 0; triangle < mesh.surfaces.length; triangle++) {
      spend();
      if (level.surfaces[mesh.surfaces[triangle]].collidable === false) continue;
      const points = mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index => mesh.positions.slice(index * 3, index * 3 + 3) as V3);
      if (cross(sub(points[1], points[0]), sub(points[2], points[0]))[2] <= 1e-9) continue;
      const bounds = spatialBounds(points);
      this.supports.push({ min: bounds.min[2], max: bounds.max[2], bounds });
    }
    this.supports.sort((a, b) => { spend(); return a.min - b.min; });
  }

  /** Returns the most optimistic reachable support height, including remote steps and slopes. */
  private highestFeet(elevation: number): number {
    const cached = this.reachableHeights.get(elevation);
    if (cached !== undefined) return cached;
    let highest = elevation;
    for (const support of this.supports) {
      this.spend();
      if (support.min > highest + this.level.document.player.step + 1e-5) break;
      highest = Math.max(highest, support.max);
    }
    this.reachableHeights.set(elevation, highest);
    return highest;
  }

  /** Returns a shared standing-body plane, or no proof when vertical bypasses remain possible. */
  plane(elevation: number, mouth?: V3[]): number | undefined {
    const player = this.level.document.player;
    if (player.step < 0 || player.step >= player.height) return;
    const highest = this.highestFeet(elevation);
    const bounds = mouth ? spatialBounds(mouth) : undefined;
    let lowestFeet = elevation, localHighestFeet = elevation;
    for (const support of this.supports) {
      this.spend();
      if (support.min > highest + 1e-5) break;
      if (bounds && [0, 1].some(axis => support.bounds.min[axis] > bounds.max[axis] + 1e-5 || support.bounds.max[axis] < bounds.min[axis] - 1e-5)) continue;
      lowestFeet = Math.min(lowestFeet, support.min);
      localHighestFeet = Math.max(localHighestFeet, Math.min(support.max, highest));
    }
    if (localHighestFeet >= lowestFeet + player.height - 1e-5) return;
    return (localHighestFeet + lowestFeet + player.height) / 2;
  }
}

/**
 * Proves that an entire mouth segment lies inside closed collision at one body-interior
 * height. All triangle boundary intersections partition the segment before occupancy
 * checks; fixed samples alone never establish complete obstruction. Coplanar boundary
 * ambiguity returns no proof. The caller chooses a height shared by supported bodies.
 */
export function blockedMouthSegment(index: PhysicalGeometryIndex, a: V3, b: V3): string[] | undefined {
  const vector = sub(b, a), length = Math.hypot(...vector);
  if (length < 1e-7) return undefined;
  const origin = new Vector3(...a), ray = new Ray(origin, new Vector3(...vector).normalize());
  const cuts = [0, 1];
  for (const face of index.faces(spatialBounds([a, b]))) {
    if (!index.isClosed(face.solid)) continue;
    if (Math.abs(dot(face.normal, vector)) < 1e-9 && Math.abs(dot(face.normal, sub(a, face.points[0]))) < 1e-6)
      return undefined;
    const vertices = face.points.map(point => new Vector3(...point));
    const hit = ray.intersectTriangle(vertices[0], vertices[1], vertices[2], false, new Vector3());
    if (!hit) continue;
    const fraction = hit.distanceTo(origin) / length;
    if (fraction > 0 && fraction < 1) cuts.push(fraction);
  }
  cuts.sort((first, second) => first - second);
  const blockers = new Set<string>();
  for (let i = 1; i < cuts.length; i++) {
    if (cuts[i] - cuts[i - 1] < 1e-10) continue;
    const station = (cuts[i] + cuts[i - 1]) / 2;
    const point = a.map((value, axis) => value + vector[axis] * station) as V3;
    const occupants = index.occupants(point);
    if (!occupants.length) return undefined;
    occupants.forEach(object => blockers.add(object));
  }
  return blockers.size ? [...blockers].sort() : undefined;
}
