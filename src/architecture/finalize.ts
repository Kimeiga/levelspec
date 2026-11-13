import { refreshSuggestionDiagnostics, spatialDiagnostic } from "../vector/diagnostics.ts";
import { spatialBounds } from "../vector/spatial-geometry.ts";
import type { V3 } from "../vector/types.ts";
import { collisionMesh } from "../vector/collision.ts";
import { auditFloorGaps } from "../vector/floor-gaps.ts";
import { hash } from "../vector/geometry.ts";
import { auditSuggestions } from "../vector/suggestions.ts";
import { aborted } from "../vector/types.ts";
import { generateUVs } from "../vector/uv.ts";
import { bakeNavmesh, validateForRuntime } from "../vector/validate.ts";
import { auditEnvelopeSuggestions } from "./envelope-suggestions.ts";
import { auditTerrainPolicy } from "./terrain-policy.ts";
import type { ArchitectureResolution } from "./resolve.ts";
import type { ArchitectureCompileOptions, CompiledArchitecture } from "./types.ts";

/**
 * Audits and publishes completed geometry before optional navigation and UV work.
 * Mutates the compiled level, preserving separate physical/render identities and
 * delivering onGeometry before navigation. The caller owns native allocations
 * and converts failures to source-linked diagnostics; this stage does not catch them.
 */
export async function finalizeArchitecture(
  level: CompiledArchitecture,
  resolution: ArchitectureResolution,
  options: ArchitectureCompileOptions,
  spatialQueries: number,
): Promise<void> {
  const diagnostics = level.diagnostics;
  if (options.floorGaps !== false) {
    const terrain = new Set(
      [...resolution.nodes.values()]
        .filter((node) => node.element.kind === "terrain")
        .map((node) => node.id),
    );
    const floors = new Set(level.floors.map((floor) => floor.region));
    const architectural = {
      ...level,
      floors: level.floors.filter((floor) => !terrain.has(floor.region)),
      document: {
        ...level.document,
        layers: level.document.layers.map((layer) => ({
          ...layer,
          regions: layer.regions.filter(
            (region) => floors.has(region.id) && !terrain.has(region.id),
          ),
        })),
      },
    };
    diagnostics.push(
      ...auditFloorGaps(
        architectural,
        options.floorGaps ?? "warning",
        options.signal,
      ),
    );
  }
  const physical = collisionMesh(level, true);
  const solidGroups = new Map<string, number>();
  const solidIds = physical.solidIds?.map((id) => {
    if (!id) return -1;
    if (!solidGroups.has(id)) solidGroups.set(id, solidGroups.size);
    return solidGroups.get(id)!;
  });
  const surfaceGroups = new Map<string, number>(),
    physicalSurfaces: unknown[] = [];
  const surfaceIds = physical.surfaces.map((index) => {
    const surface = level.surfaces[index],
      record = [
        surface.object,
        surface.role,
        surface.mesh,
        surface.dynamic,
        surface.closed,
      ],
      key = JSON.stringify(record);
    if (!surfaceGroups.has(key)) {
      surfaceGroups.set(key, surfaceGroups.size);
      physicalSurfaces.push(record);
    }
    return surfaceGroups.get(key)!;
  });
  level.physicalHash = await hash({
    positions: physical.positions,
    indices: physical.indices,
    solidIds,
    surfaces: physicalSurfaces,
    surfaceIds,
  });
  level.renderHash = await hash({
    mesh: level.mesh,
    materials: level.document.materials,
    surfaceAppearance: level.surfaceAppearance,
  });
  level.geometryHash = level.physicalHash;
  if (options.surfaceContacts !== false) {
    const physicalSurfaces = level.surfaces.map((surface) =>
      surface.role === "visual-mesh"
        ? { ...surface, visible: false }
        : surface,
    );
    diagnostics.push(
      ...auditTerrainPolicy(
        { ...level, surfaces: physicalSurfaces },
        resolution,
        options.surfaceContacts ?? "error",
        spatialQueries,
        options.signal,
      ),
    );
  }
  level.stats = {
    ...level.stats,
    meshes: level.parts.length,
    triangles: level.mesh.indices.length / 3,
    vertices: level.mesh.positions.length / 3,
    regions: level.floors.length,
    architecturalObjects: resolution.nodes.size,
  };
  if (!diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    level.suggestions = await auditSuggestions(level, options.signal);
    try {
      level.suggestions.push(...await auditEnvelopeSuggestions(level, resolution, options.signal));
    } catch (error) {
      if (!(error instanceof Error) || !["Physical route work budget exceeded.", "Aggregate physical query work budget exceeded."].includes(error.message)) throw error;
      const objects = [...resolution.nodes.values()].filter(node => node.element.kind === "roof" || node.element.kind === "wall").map(node => node.id);
      const bounds = spatialBounds(level.mesh.indices.map(index => level.mesh.positions.slice(index * 3, index * 3 + 3) as V3));
      diagnostics.push(spatialDiagnostic(level, "ARCHITECTURE_REVIEW_INCOMPLETE",
        "The bounded roof and wall review could not finish. Inspect architectural enclosure manually or review a smaller assembly.",
        objects, [bounds.min, bounds.max], "warning"));
    }
    level.suggestions.sort((a, b) => a.id.localeCompare(b.id));
  }
  refreshSuggestionDiagnostics(level);
  options.onGeometry?.(level);
  if (
    !diagnostics.some((diagnostic) => diagnostic.severity === "error") &&
    options.navigation !== false
  ) {
    options.onProgress?.("Navigation");
    aborted(options.signal);
    const navigation =
      typeof options.navigation === "object" ? options.navigation : {};
    await bakeNavmesh(level, { ...navigation, signal: options.signal });
    await validateForRuntime(level, {
      ...navigation,
      signal: options.signal,
    });
  }
  if (
    options.uvs &&
    !diagnostics.some((diagnostic) => diagnostic.severity === "error")
  )
    await generateUVs(level, { ...options.uv, signal: options.signal });
}
