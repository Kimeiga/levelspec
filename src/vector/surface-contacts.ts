import type { CompiledLevel, Diagnostic, Surface, V3 } from "./types.ts";
import { aborted } from "./types.ts";
import { cross, dot, norm, sub, triangleIntersection } from "./geometry.ts";

// Detect construction coincidence, not a camera-dependent depth-buffer budget.
// Authoring is millimetre-quantized; this smaller tolerance absorbs CSG float32 noise.
const PLANE_EPS = 0.0001;
const AREA_EPS = 0.000001;
type Face = { points: V3[]; normal: V3; surface: Surface; bounds: number[] };

/** Audit actual exposed mesh faces while leaving structural meshes separate.
 * Opposing faces at slab supports, buried bottom caps, and line/point contacts
 * are valid construction contacts, not competing render surfaces. */
export function auditSurfaceContacts(
  level: CompiledLevel,
  severity: "warning" | "error" = "warning",
  signal?: AbortSignal,
): Diagnostic[] {
  const walls: Face[] = [],
    floors: Face[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (!["wall", "floor", "stairs"].includes(surface.kind)) continue;
    const points = level.mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3) as V3);
    const raw = cross(sub(points[1], points[0]), sub(points[2], points[0]));
    if (Math.hypot(...raw) < 1e-12) continue;
    const normal = norm(raw);
    if (normal[2] < -1e-6) continue;
    const bounds = [0, 1, 2]
      .map((axis) => Math.min(...points.map((p) => p[axis])))
      .concat([0, 1, 2].map((axis) => Math.max(...points.map((p) => p[axis]))));
    (surface.kind === "wall" ? walls : floors).push({
      points,
      normal,
      surface,
      bounds,
    });
  }
  floors.sort((a, b) => a.bounds[0] - b.bounds[0]);
  const objects = new Map(
    [
      ...level.document.layers.flatMap((l) => [...l.edges, ...l.regions]),
      ...level.document.seams,
    ].map((o) => [o.id, o]),
  );
  const edges = new Map(
    level.document.layers.flatMap((l) => l.edges).map((e) => [e.id, e]),
  );
  const hits = new Map<
    string,
    { wall: Surface; floor: Surface; area: number; at: V3; cap: boolean }
  >();
  for (const wall of walls) {
    aborted(signal);
    for (const floor of floors) {
      if (floor.bounds[0] > wall.bounds[3] + PLANE_EPS) break;
      if (
        [0, 1, 2].some(
          (i) =>
            floor.bounds[i + 3] < wall.bounds[i] - PLANE_EPS ||
            floor.bounds[i] > wall.bounds[i + 3] + PLANE_EPS,
        )
      )
        continue;
      // Same-facing duplicates fight for the same visible side. Opposing caps
      // supporting a slab are deliberately excluded, even when exactly coplanar.
      if (dot(wall.normal, floor.normal) < 1 - 1e-7) continue;
      if (
        wall.points.some(
          (p) =>
            Math.abs(dot(sub(p, floor.points[0]), floor.normal)) > PLANE_EPS,
        )
      )
        continue;
      const axis = wall.normal
        .map(Math.abs)
        .indexOf(Math.max(...wall.normal.map(Math.abs)));
      const axes = [0, 1, 2].filter((i) => i !== axis);
      const project = (p: V3): V3 => [p[axes[0]], p[axes[1]], 0];
      const polygon = triangleIntersection(
        wall.points.map(project),
        floor.points.map(project),
      );
      if (polygon.length < 3) continue;
      // Shift the area calculation to a local origin for large world coordinates.
      const origin = polygon[0];
      const area =
        Math.abs(
          polygon.reduce((sum, p, i) => {
            const q = polygon[(i + 1) % polygon.length];
            return (
              sum +
              (p[0] - origin[0]) * (q[1] - origin[1]) -
              (q[0] - origin[0]) * (p[1] - origin[1])
            );
          }, 0),
        ) /
        2 /
        Math.abs(wall.normal[axis]);
      if (area <= AREA_EPS) continue;
      const perimeter = polygon.reduce((sum, p, i) => {
        const q = polygon[(i + 1) % polygon.length];
        return sum + Math.hypot(q[0] - p[0], q[1] - p[1]);
      }, 0);
      // Float32 CSG can turn a shared edge into a micrometre-wide sliver.
      // Reject sub-tolerance footprints rather than warning on valid joins.
      if ((2 * area * Math.abs(wall.normal[axis])) / perimeter <= PLANE_EPS)
        continue;
      const at: V3 = [0, 0, 0];
      at[axes[0]] = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
      at[axes[1]] = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
      at[axis] =
        (dot(wall.normal, wall.points[0]) -
          wall.normal[axes[0]] * at[axes[0]] -
          wall.normal[axes[1]] * at[axes[1]]) /
        wall.normal[axis];
      const key = [wall.surface.object, floor.surface.object].join("\0");
      const prior = hits.get(key);
      const cap = wall.normal[2] > 0.5;
      if (prior) {
        prior.area += area;
        if (cap && !prior.cap) prior.at = at;
        prior.cap ||= cap;
      } else
        hits.set(key, {
          wall: wall.surface,
          floor: floor.surface,
          area,
          at,
          cap,
        });
    }
  }
  return [...hits.values()].map(({ wall, floor, area, at, cap }) => {
    const edge = edges.get(wall.object),
      thickness = edge?.thickness ?? level.document.wallThickness;
    return {
      severity,
      code: "WALL_FLOOR_COPLANAR",
      objects: [wall.object, floor.object],
      source:
        objects.get(wall.object)?.source ?? objects.get(floor.object)?.source,
      message: `Wall ${wall.object} and floor ${floor.object} have overlapping, same-facing ${cap ? "cap/floor" : "side"} surfaces (about ${area.toFixed(4)} m² near ${at.map((v) => v.toFixed(3)).join(", ")}), which can Z-fight. ${cap ? "Raise the wall above the floor, end it at the slab underside, or move the floor boundary to the wall face." : "Move the floor boundary to meet the wall face without overlapping its exposed side."} Walls are centered on their source edges; this wall's nominal face offset is ${(thickness / 2).toFixed(3)} m (half its thickness).`,
    };
  });
}
