import { heightAt } from "../vector/geometry.ts";
import type { FloorPatch, V3 } from "../vector/types.ts";
import { triangleNormal } from "./geometry.ts";
import type { ArchitectureResolution } from "./resolve.ts";
import type { CompiledArchitecture } from "./types.ts";

/** Authored support guides constrain which surviving physical faces can be walked. */
export interface WalkingSources {
  kinds: ReadonlyMap<string, "floor" | "stairs" | "ramp" | "water">;
  areas: ReadonlyMap<string, string | undefined>;
  guides: ReadonlyMap<string, FloorPatch>;
  openTerrains: ReadonlySet<string>;
}

/**
 * Derives Z-up walking tops from final physical faces, excluding cut-away or
 * nonplayable support. Open terrain keeps its authored physical triangulation.
 * Open terrain patches reuse source arrays; other patches own collected faces
 * and retain read-only guide loops.
 */
export function walkingFloors(
  level: CompiledArchitecture,
  resolution: ArchitectureResolution,
  sources: WalkingSources,
): FloorPatch[] {
  const {
    kinds: floorKinds,
    areas: floorAreas,
    guides: floorSource,
    openTerrains,
  } = sources;
  const finalFloors = new Map<string, FloorPatch>();
  for (const id of openTerrains) {
    const node = resolution.nodes.get(id)!,
      patch = floorSource.get(id)!;
    if (
      node.element.kind === "terrain" &&
      node.element.collidable !== false &&
      node.element.orientation !== "down"
    )
      finalFloors.set(id, {
        ...patch,
        navigationRequired: node.element.playable,
      });
  }
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]],
      fill = floorKinds.get(surface.object);
    if (openTerrains.has(surface.object)) continue;
    if (!fill || fill === "water" || surface.collidable === false) continue;
    const node = resolution.nodes.get(surface.object)!;
    if (
      (node.element.kind === "roof" || node.element.kind === "canopy") &&
      !node.element.playable
    )
      continue;
    const points = level.mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as V3);
    if (triangleNormal(points)[2] <= 1e-7) continue;
    if (fill === "stairs" && triangleNormal(points)[2] < 1 - 1e-6) continue;
    const guide = floorSource.get(surface.object);
    const center = [0, 1, 2].map((axis) =>
      points.reduce((sum, point) => sum + point[axis] / 3, 0),
    ) as V3;
    if (guide) {
      const z = heightAt(guide, center[0], center[1]);
      if (z === undefined || Math.abs(z - center[2]) > 0.0001) continue;
    }
    const patch = finalFloors.get(surface.object) ?? {
      region: surface.object,
      layer: surface.layer,
      area: floorAreas.get(surface.object),
      points: [],
      triangles: [],
      loops: floorSource.get(surface.object)?.loops ?? [],
    };
    if (node.element.kind === "terrain")
      patch.navigationRequired = node.element.playable;
    const base = patch.points.length;
    patch.points.push(...points);
    patch.triangles.push([base, base + 1, base + 2]);
    finalFloors.set(surface.object, patch);
  }
  return [...finalFloors.values()];
}
