import type { SpatialVolume, V2, V3, Diagnostic } from "../vector/types.ts";
import { aborted } from "../vector/types.ts";
import { cross, dot, norm, sub } from "../vector/geometry.ts";
import {
  PhysicalGeometryIndex,
  clipToPrism,
  prismPlanes,
  spatialArea,
  spatialBounds,
} from "../vector/spatial-geometry.ts";
import { transform, type SolidSession } from "./geometry.ts";
import type { ArchitectureResolution, ResolvedElement } from "./resolve.ts";
import type { CompiledArchitecture, MetadataVolume } from "./types.ts";

/** Resolves metadata only; no volume contributes a render or collision shell. */
export function resolveSpatialVolume(
  node: ResolvedElement,
  resolution: ArchitectureResolution,
): SpatialVolume {
  const element = node.element as MetadataVolume;
  if (!Number.isFinite(element.height) || element.height <= 0)
    resolution.fail(node.id, "Spatial volumes require positive finite height.");
  if (
    element.kind === "volume" &&
    !["spawn", "objective", "trigger", "out-of-bounds"].includes(
      element.role ?? "",
    )
  )
    resolution.fail(
      node.id,
      "Gameplay volumes require spawn, objective, trigger, or out-of-bounds role.",
    );
  if (element.requireSupport && element.kind !== "clearance")
    resolution.fail(node.id, "require-support is a clearance assertion.");
  const local = resolution.profiles.get(element.profile);
  if (!local)
    resolution.fail(node.id, `Unknown volume profile ${element.profile}.`);
  if (local.points.some((p) => Math.abs(p[2] - local.points[0][2]) > 1e-7))
    resolution.fail(
      node.id,
      "Spatial volume base profiles must be planar in their local XY frame.",
    );
  const profile = resolution.profile(
    node,
    element.profile,
    resolution.elevation(element.elevation),
  );
  const origin = transform([0, 0, 0], node.matrix),
    extrusion = sub(transform([0, 0, element.height], node.matrix), origin);
  const bounds = spatialBounds([
    ...profile.points,
    ...profile.points.map((p) => p.map((n, axis) => n + extrusion[axis]) as V3),
  ]);
  if (
    [...bounds.min, ...bounds.max].some(
      (n) => !Number.isFinite(n) || Math.abs(n) > 1e7,
    )
  )
    resolution.fail(
      node.id,
      "Spatial volume exceeds finite world-coordinate bounds.",
    );
  return {
    id: node.id,
    kind: element.kind,
    role: element.role,
    movement: element.movement ?? "land",
    points: profile.points,
    triangles: profile.triangles,
    loops: profile.loops,
    extrusion,
    height: Math.hypot(...extrusion),
    requireSupport: element.requireSupport,
    properties: element.properties,
    source: element.source,
    bounds,
  };
}

/** Tests exact final support by area, including profile holes; touching surfaces are not intrusions. */
function supported(
  volume: SpatialVolume,
  index: PhysicalGeometryIndex,
  session: SolidSession,
): boolean {
  const triangle = volume.triangles[0].map((i) => volume.points[i]),
    normal = norm(
      cross(sub(triangle[1], triangle[0]), sub(triangle[2], triangle[0])),
    );
  const axis = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),
    axes = [0, 1, 2].filter((i) => i !== axis);
  const project = (points: V3[]): V2[] => {
    const result = points.map((p) => [p[axes[0]], p[axes[1]]] as V2);
    const area = result.reduce(
      (sum, p, i) =>
        sum +
        p[0] * result[(i + 1) % result.length][1] -
        p[1] * result[(i + 1) % result.length][0],
      0,
    );
    return area >= 0 ? result : result.toReversed();
  };
  const footprint = session.section(
    new session.kernel.CrossSection(
      volume.triangles.map((t) => project(t.map((i) => volume.points[i]))),
    ),
  );
  const supporting: V2[][] = [];
  for (const face of index.faces(volume.bounds)) {
    if (
      face.normal[2] <= 1e-7 ||
      Math.abs(dot(face.normal, normal)) < 1 - 1e-7 ||
      face.points.some((p) => Math.abs(dot(normal, sub(p, triangle[0]))) > 1e-6)
    )
      continue;
    supporting.push(project(face.points));
  }
  if (!supporting.length) return false;
  const support = session.section(new session.kernel.CrossSection(supporting));
  const uncovered = session.section(footprint.subtract(support));
  return uncovered.area() <= 1e-8;
}

/** Checks declared clearance against native physical faces and closed-solid interiors. */
export function auditSpatialVolumes(
  level: CompiledArchitecture,
  session: SolidSession,
  signal?: AbortSignal,
  maximumQueries = 8_000_000,
): Diagnostic[] {
  const clearances = (level.spatialVolumes ?? []).filter(
    (v) => v.kind === "clearance",
  );
  if (!clearances.length) return [];
  const diagnostics: Diagnostic[] = [];
  let index: PhysicalGeometryIndex;
  try {
    index = new PhysicalGeometryIndex(level, signal, maximumQueries);
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    return [
      {
        severity: "error",
        code: "AML_COMPLEXITY",
        objects: clearances.map((v) => v.id),
        source: clearances[0].source,
        message: (error as Error).message,
      },
    ];
  }
  for (const volume of clearances) {
    aborted(signal);
    try {
      const contributors = new Set<string>();
      for (const triangle of volume.triangles) {
        const base = triangle.map((i) => volume.points[i]),
          planes = prismPlanes(base, volume.extrusion),
          bounds = spatialBounds([
            ...base,
            ...base.map(
              (p) => p.map((n, axis) => n + volume.extrusion[axis]) as V3,
            ),
          ]);
        for (const face of index.faces(bounds))
          if (spatialArea(clipToPrism(face.points, planes, 1e-6)) > 1e-10)
            contributors.add(face.surface.object);
        const center = base[0].map(
          (_, axis) =>
            base.reduce((sum, p) => sum + p[axis] / 3, 0) +
            volume.extrusion[axis] / 2,
        ) as V3;
        if (!contributors.size)
          for (const object of index.occupants(center))
            contributors.add(object);
      }
      if (contributors.size)
        diagnostics.push({
          severity: "error",
          code: "AML_CLEARANCE",
          objects: [volume.id, ...contributors],
          source: volume.source,
          message: "Declared clearance intersects actual collision geometry.",
        });
      if (volume.requireSupport && !supported(volume, index, session))
        diagnostics.push({
          severity: "error",
          code: "AML_CLEARANCE_SUPPORT",
          objects: [volume.id],
          source: volume.source,
          message:
            "Declared clearance base lacks complete native physical support.",
        });
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      diagnostics.push({
        severity: "error",
        code: "AML_COMPLEXITY",
        objects: [volume.id],
        source: volume.source,
        message: (error as Error).message,
      });
      break;
    }
  }
  return diagnostics;
}
