import { cross, hash, inside, sub } from "../vector/geometry.ts";
import { diagnosticSource } from "../vector/diagnostics.ts";
import { PhysicalGeometryIndex, spatialBounds } from "../vector/spatial-geometry.ts";
import { PhysicalRouteWork } from "../vector/physical-work.ts";
import { aborted, type Suggestion, type V3 } from "../vector/types.ts";
import type { ArchitectureResolution } from "./resolve.ts";
import type { CompiledArchitecture } from "./types.ts";

type Roof = { id: string; points: V3[]; triangles: V3[][]; edges: [V3, V3][]; top: number; bottom: number };

/** Stable geometric keys absorb native float noise without hiding millimeter edits. */
function key(point: V3): string {
  return point.map(value => Math.round(value * 100000)).join(",");
}

/** Retains exposed flat roof tops and their boundary edges after native composition. */
function roofGeometry(level: CompiledArchitecture, resolution: ArchitectureResolution): Roof[] {
  const roofs = new Map<string, V3[][]>();
  const points = new Map<string, V3[]>();
  for (let triangle = 0; triangle < level.mesh.surfaces.length; triangle++) {
    const surface = level.surfaces[level.mesh.surfaces[triangle]];
    if (surface.visible === false || resolution.nodes.get(surface.object)?.element.kind !== "roof") continue;
    const vertices = level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index => level.mesh.positions.slice(index * 3, index * 3 + 3) as V3);
    const all = points.get(surface.object) ?? [];
    all.push(...vertices); points.set(surface.object, all);
    const normal = cross(sub(vertices[1], vertices[0]), sub(vertices[2], vertices[0]));
    if (normal[2] <= 0 || Math.hypot(normal[0], normal[1]) > normal[2] * 1e-5) continue;
    const tops = roofs.get(surface.object) ?? [];
    tops.push(vertices); roofs.set(surface.object, tops);
  }
  return [...roofs].flatMap(([id, triangles]) => {
    const all = points.get(id)!, bounds = spatialBounds(all);
    if (triangles.some(triangle => triangle.some(point => Math.abs(point[2] - bounds.max[2]) > 1e-5))) return [];
    const edges = new Map<string, { count: number; edge: [V3, V3] }>();
    for (const triangle of triangles) for (let i = 0; i < 3; i++) {
      const edge: [V3, V3] = [triangle[i], triangle[(i + 1) % 3]];
      const id = edge.map(key).sort().join("|");
      const record = edges.get(id) ?? { count: 0, edge };
      record.count++; edges.set(id, record);
    }
    return [{ id, points: all, triangles, edges: [...edges.values()].filter(edge => edge.count === 1).map(edge => edge.edge), top: bounds.max[2], bottom: bounds.min[2] }];
  });
}

/** Finds a shared plan span only for oppositely oriented boundary edges. */
function adjoining(a: [V3, V3], b: [V3, V3]): [V3, V3] | undefined {
  const dx = a[1][0] - a[0][0], dy = a[1][1] - a[0][1], length = Math.hypot(dx, dy);
  if (length < 1 || dx * (b[1][0] - b[0][0]) + dy * (b[1][1] - b[0][1]) >= 0) return;
  if (b.some(point => Math.abs(dx * (point[1] - a[0][1]) - dy * (point[0] - a[0][0])) / length > 0.02)) return;
  const stations = b.map(point => ((point[0] - a[0][0]) * dx + (point[1] - a[0][1]) * dy) / length);
  const start = Math.max(0, Math.min(...stations)), end = Math.min(length, Math.max(...stations));
  if (end - start < 1) return;
  return [start, end].map(station => [a[0][0] + dx * station / length, a[0][1] + dy * station / length, a[0][2]] as V3) as [V3, V3];
}

/**
 * Flags suspicious exposed roof steps and wall overshoots. These are heuristics,
 * not enclosure assertions: findings never change geometry or fail validation.
 */
export async function auditEnvelopeSuggestions(level: CompiledArchitecture, resolution: ArchitectureResolution, signal?: AbortSignal): Promise<Suggestion[]> {
  const roofs = roofGeometry(level, resolution);
  if (!roofs.length) return [];
  const index = new PhysicalGeometryIndex(level, signal, 8_000_000, "render");
  const work = new PhysicalRouteWork(8_000_000, signal);
  const findings: Suggestion[] = [];
  /** Binds a review decision to local exposed geometry and current source identities. */
  async function emit(code: Suggestion["code"], objects: string[], points: V3[], message: string, length: number, offset: number) {
    aborted(signal);
    const bounds = spatialBounds(points), id = `${code}:${objects.join("|")}`;
    const nearby = [...index.faces({ min: bounds.min.map(value => value - 0.3) as V3, max: bounds.max.map(value => value + 0.3) as V3 })];
    const fingerprint = await hash({ code, geometry: nearby.map(face => face.points.map(key).sort().join("|")).sort(), points: points.map(key).sort() });
    const suppression = level.document.reviewSuppressions?.find(suppression => suppression.suggestion === id);
    findings.push({
      id, code, objects, message, bounds,
      sources: objects.map(object => ({ object, source: diagnosticSource(level, object) })),
      layers: [...new Set(level.surfaces.filter(surface => objects.includes(surface.object)).map(surface => surface.layer))],
      position: bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2) as V3,
      direction: [1, -1, 0.5], evidence: { length, offset }, fingerprint,
      state: suppression?.fingerprint === fingerprint ? "suppressed" : "active",
      ...(suppression ? { suppression: { reason: suppression.reason, stale: suppression.fingerprint !== fingerprint } } : {}),
    });
  }
  for (let i = 0; i < roofs.length; i++) for (const other of roofs.slice(i + 1)) {
    work.spend();
    const [low, high] = roofs[i].top < other.top ? [roofs[i], other] : [other, roofs[i]];
    const gap = high.bottom - low.top;
    if (gap < 0.5) continue;
    const open: V3[] = [];
    let length = 0;
    for (const a of low.edges) for (const b of high.edges) {
      work.spend();
      const shared = adjoining(a, b);
      if (!shared) continue;
      const span = Math.hypot(...sub(shared[1], shared[0]));
      let uncovered = false;
      for (const station of [0.2, 0.5, 0.8]) for (const height of [0.2, 0.5, 0.8]) {
        const point = shared[0].map((value, axis) => value + station * (shared[1][axis] - value)) as V3;
        point[2] = low.top + gap * height;
        if (!index.contains(point)) { uncovered = true; open.push(point); }
      }
      if (uncovered) length += span;
    }
    if (open.length) await emit("ROOF_STEP_OPEN", [low.id, high.id], open,
      `${low.id} and ${high.id} adjoin across a ${gap.toFixed(2)} m roof step with exposed samples in the vertical gap. Review whether a wall, clerestory, or intentional open terrace belongs here.`, length, gap);
  }
  const wallPoints = new Map<string, V3[]>();
  for (let triangle = 0; triangle < level.mesh.surfaces.length; triangle++) {
    work.spend();
    const surface = level.surfaces[level.mesh.surfaces[triangle]];
    if (surface.visible === false || resolution.nodes.get(surface.object)?.element.kind !== "wall") continue;
    const points = wallPoints.get(surface.object) ?? [];
    points.push(...level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index => level.mesh.positions.slice(index * 3, index * 3 + 3) as V3));
    wallPoints.set(surface.object, points);
  }
  for (const node of resolution.nodes.values()) {
    if (node.element.kind !== "wall") continue;
    const points = wallPoints.get(node.id) ?? [];
    if (!points.length) continue;
    const bounds = spatialBounds(points);
    const center = bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2) as V3;
    const covering = roofs.filter(roof => roof.triangles.some(triangle => inside(center, triangle)));
    const roof = covering.sort((a, b) => b.top - a.top)[0];
    if (!roof || bounds.min[2] >= roof.top || bounds.max[2] - roof.top <= 1.5) continue;
    const above = points.filter(point => point[2] > roof.top);
    above.push([center[0], center[1], roof.top]);
    await emit("WALL_ABOVE_ROOF", [node.id, roof.id], above,
      `${node.id} extends ${(bounds.max[2] - roof.top).toFixed(2)} m above roof ${roof.id}. Review the wall height or use a top-floor anchor if this is an unintended wall remnant.`, Math.hypot(bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1]), bounds.max[2] - roof.top);
  }
  return findings;
}
