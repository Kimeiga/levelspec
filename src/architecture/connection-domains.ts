import type { Manifold } from "manifold-3d";
import type { CompiledLevel, FloorPatch, V2, V3 } from "../vector/types.ts";
import { aborted } from "../vector/types.ts";
import { StandingSupports } from "../vector/connection-clearance.ts";
import { area, cross, sub } from "../vector/geometry.ts";
import { PhysicalRouteWork } from "../vector/physical-work.ts";
import type { SolidSession } from "./geometry.ts";

/**
 * Partitions flat declared movement domains by exact closed-solid sections through
 * standing-body interiors. Unmodeled/nonflat areas stay connected optimistically.
 * These sections are query evidence only; source, collision and navigation are untouched.
 */
export function connectionDomains(
  level: CompiledLevel,
  guides: Iterable<FloorPatch>,
  solids: Manifold[],
  session: SolidSession,
  signal?: AbortSignal,
  maximumWork = 8_000_000,
): NonNullable<CompiledLevel["connectionDomains"]> {
  if (!level.document.routes.some(route => route.minRoutes > 1)) return [];
  const player = level.document.player;
  if (player.step < 0 || player.step >= player.height) return [];
  const work = new PhysicalRouteWork(maximumWork, signal);
  const supports = new StandingSupports(level, () => work.spend());
  const areas = new Map<string, FloorPatch[]>();
  for (const floor of guides) {
    const id = floor.area ?? floor.region, values = areas.get(id) ?? [];
    values.push(floor); areas.set(id, values);
  }
  const result: NonNullable<CompiledLevel["connectionDomains"]> = [];
  for (const [id, floors] of areas) {
    aborted(signal);
    const elevation = floors[0].points[0]?.[2];
    if (elevation === undefined || floors.some(floor => floor.points.some(point => Math.abs(point[2] - elevation) > 1e-6))) continue;
    const bodyPlane = supports.plane(elevation);
    if (bodyPlane === undefined) continue;
    work.spend(floors.reduce((sum, floor) => sum + floor.triangles.length, 0));
    const polygons = floors.flatMap(floor => floor.triangles.map(triangle => {
      const points = triangle.map(index => floor.points[index]);
      return (area(points) < 0 ? points.toReversed() : points).map(point => [point[0], point[1]] as V2);
    }));
    const domain = session.section(new session.kernel.CrossSection(polygons, "Positive"));
    const allGuides = [...areas.values()].flat().filter(floor => floor.points.every(point => Math.abs(point[2] - elevation) < 1e-5));
    const authored = session.section(new session.kernel.CrossSection(allGuides.flatMap(floor => floor.triangles.map(triangle => {
      work.spend();
      const points = triangle.map(index => floor.points[index]);
      return (area(points) < 0 ? points.toReversed() : points).map(point => [point[0], point[1]] as V2);
    })), "Positive"));
    const mesh = level.physicalMesh ?? level.mesh;
    const support: V2[][] = [];
    let outsideElevation = false;
    for (let triangle = 0; triangle < mesh.surfaces.length; triangle++) {
      work.spend();
      if (level.surfaces[mesh.surfaces[triangle]].collidable === false) continue;
      const points = mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index => mesh.positions.slice(index * 3, index * 3 + 3) as V3);
      if (cross(sub(points[1], points[0]), sub(points[2], points[0]))[2] <= 1e-9) continue;
      if (points.some(point => Math.abs(point[2] - elevation) > 1e-5)) {
        if (Math.min(...points.map(point => point[2])) <= elevation + player.step + 1e-5) outsideElevation = true;
        continue;
      }
      support.push(points.map(point => [point[0], point[1]] as V2));
    }
    if (outsideElevation) continue;
    const actual = session.section(new session.kernel.CrossSection(support, "Positive"));
    // Undeclared same-height supports can bypass source-domain cuts outside any guide.
    if (session.section(actual.subtract(authored)).area() > 1e-6) continue;
    const height = bodyPlane;
    const sections = solids.map(solid => {
      work.spend(solid.numTri());
      return session.section(solid.slice(height));
    });
    const obstruction = session.section(session.kernel.CrossSection.union(sections));
    const free = session.section(domain.subtract(obstruction));
    const components = free.decompose().map(section => {
      session.section(section);
      const loops = section.toPolygons();
      work.spend(loops.reduce((sum, loop) => sum + loop.length, 0));
      return loops.map(loop => loop.map(point => [point[0], point[1], elevation] as V3));
    });
    result.push({ area: id, elevation, height: player.height, step: player.step, components });
  }
  return result;
}
