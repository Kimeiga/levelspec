import type { CompiledArchitecture, V3 } from "../architecture/types.ts";

import { aborted } from "../vector/types.ts";

export type Seam = [V3, V3];

/** Finite contacts retain both their weathering receivers and the actual wall/floor relationship. */
export interface ContactSeams {
  byObject: Map<string, Seam[]>;
  wallsByFloor: Map<string, Map<string, Seam[]>>;
}

/** Distance to a finite contact segment in world meters. */
export function seamDistance(point: V3, [a, b]: Seam): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const length = dx * dx + dy * dy + dz * dz;
  const projection = dx * (point[0] - a[0]) + dy * (point[1] - a[1]) + dz * (point[2] - a[2]);
  const t = Math.max(0, Math.min(1, projection / length));
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy, point[2] - a[2] - t * dz);
}

/** Clips a horizontal segment to a floor triangle, retaining actual doorway gaps. */
function clip(a: V3, b: V3, floor: V3[]): Seam | undefined {
  let low = 0,
    high = 1;
  const cross = (p: V3, q: V3, r: V3) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const sign = Math.sign(cross(floor[0], floor[1], floor[2]));
  for (let i = 0; i < 3; i++) {
    const p = floor[i],
      q = floor[(i + 1) % 3];
    const start = sign * cross(p, q, a),
      end = sign * cross(p, q, b);
    if (start < -1e-6 && end < -1e-6) return;
    if (start < 0 && end > start) low = Math.max(low, -start / (end - start));
    if (end < 0 && start > end) high = Math.min(high, start / (start - end));
  }
  if (high - low < 1e-6) return;
  return [low, high].map(
    (t) => a.map((v, i) => v + t * (b[i] - v)) as V3,
  ) as Seam;
}

/** Finds horizontal exposed floor/wall contacts with a bounded triangle-plane intersection. */
export function contactSeams(
  level: CompiledArchitecture,
  signal?: AbortSignal,
): ContactSeams {
  const mesh = level.physicalMesh ?? level.mesh;
  const floors: { points: V3[]; object: string }[] = [],
    walls: { points: V3[]; object: string }[] = [];
  for (let t = 0; t < mesh.surfaces.length; t++) {
    const surface = level.surfaces[mesh.surfaces[t]];
    if (surface.collidable === false || surface.visible === false) continue;
    const points = mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map((i) => mesh.positions.slice(i * 3, i * 3 + 3) as V3);
    const normalZ = mesh.normals[mesh.indices[t * 3] * 3 + 2];
    if (
      ["floor", "stairs"].includes(surface.kind) &&
      normalZ > 0.99999 &&
      points.every((p) => Math.abs(p[2] - points[0][2]) < 1e-6)
    )
      floors.push({ points, object: surface.object });
    if (surface.kind === "wall" && Math.abs(normalZ) < 1e-6)
      walls.push({ points, object: surface.object });
  }
  const result = new Map<string, Seam[]>();
  const wallsByFloor = new Map<string, Map<string, Seam[]>>();
  let work = 0;
  for (const wall of walls)
    for (const floor of floors) {
      aborted(signal);
      if (++work > 2000000)
        throw new Error("Dressing contact budget exceeded.");
      const z = floor.points[0][2];
      const points: V3[] = [];
      for (let i = 0; i < 3; i++) {
        const a = wall.points[i],
          b = wall.points[(i + 1) % 3];
        if (Math.abs(a[2] - z) < 1e-6) points.push(a);
        if ((a[2] - z) * (b[2] - z) < 0) {
          const t = (z - a[2]) / (b[2] - a[2]);
          points.push(a.map((v, j) => v + t * (b[j] - v)) as V3);
        }
      }
      const unique = points.filter(
        (p, i) =>
          points.findIndex(
            (q) => Math.hypot(...p.map((v, j) => v - q[j])) < 1e-6,
          ) === i,
      );
      if (unique.length !== 2) continue;
      const seam = clip(unique[0], unique[1], floor.points);
      if (!seam || Math.hypot(...seam[0].map((v, i) => v - seam[1][i])) < 1e-5)
        continue;
      const contacts =
        wallsByFloor.get(floor.object) ?? new Map<string, Seam[]>();
      const wallContacts = contacts.get(wall.object) ?? [];
      wallContacts.push(seam);
      contacts.set(wall.object, wallContacts);
      wallsByFloor.set(floor.object, contacts);
      for (const object of [wall.object, floor.object]) {
        const seams = result.get(object) ?? [];
        seams.push(seam);
        result.set(object, seams);
      }
    }
  return { byObject: result, wallsByFloor };
}
