import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { ExportSolid, Surface, V3 } from "../../vector/types.ts";
import { cross, sub, dot, norm } from "../../vector/geometry.ts";
export interface BrushPlane {
  points: [V3, V3, V3];
  normal: V3;
  distance: number;
}
export interface Brush {
  planes: BrushPlane[];
  surface: Surface;
  volume: number;
}
const TOLERANCE = 0.0001;
export function solidManifold(K: ManifoldToplevel, solid: ExportSolid) {
  const mesh = new K.Mesh({
    numProp: 3,
    vertProperties: new Float32Array(solid.positions.flat()),
    triVerts: new Uint32Array(solid.triangles.flat()),
    tolerance: 0.000001,
  });
  mesh.merge();
  let result: Manifold;
  try {
    result = new K.Manifold(mesh);
  } catch (error) {
    throw new Error(
      `${solid.surface.object}: invalid export solid (${(error as Error).message}).`,
      { cause: error },
    );
  }
  if (result.status() !== "NoError") {
    const status = result.status();
    result.delete();
    throw new Error(
      `${solid.surface.object}: invalid export solid (${status}).`,
    );
  }
  return result;
}
function planesFor(solid: Manifold) {
  const mesh = solid.getMesh(),
    vertices: V3[] = [];
  for (let v = 0; v < mesh.vertProperties.length; v += mesh.numProp)
    vertices.push(Array.from(mesh.vertProperties.slice(v, v + 3)) as V3);
  const planes: BrushPlane[] = [];
  for (let t = 0; t < mesh.triVerts.length; t += 3) {
    const points = [0, 1, 2].map((i) => vertices[mesh.triVerts[t + i]]) as [
      V3,
      V3,
      V3,
    ];
    const raw = cross(sub(points[1], points[0]), sub(points[2], points[0]));
    if (Math.hypot(...raw) < 1e-10) continue;
    const normal = norm(raw),
      distance = dot(normal, points[0]);
    if (
      !planes.some(
        (p) =>
          dot(p.normal, normal) > 1 - 1e-10 &&
          Math.abs(p.distance - distance) < TOLERANCE,
      )
    )
      planes.push({ points, normal, distance });
  }
  return { planes, vertices };
}
/** Exact plane cuts, never an approximate convex hull around a concave solid. */
export function convexBrushes(
  K: ManifoldToplevel,
  input: ExportSolid,
  signal?: AbortSignal,
  maxPieces = 4096,
): Brush[] {
  const source = solidManifold(K, input),
    owned: Manifold[] = [source],
    leaves: Manifold[] = [],
    brushes: Brush[] = [];
  try {
    const queue = source.decompose();
    owned.push(...queue);
    let splits = 0;
    while (queue.length) {
      signal?.throwIfAborted();
      if (++splits > maxPieces * 2 || queue.length + leaves.length > maxPieces)
        throw new Error(
          `${input.surface.object}: convex decomposition exceeds ${maxPieces} pieces.`,
        );
      const part = queue.pop()!,
        volume = part.volume();
      if (volume < -1e-12)
        throw new Error(
          `${input.surface.object}: inverted export brush (${volume}).`,
        );
      if (volume <= 1e-12) continue;
      const { planes, vertices } = planesFor(part);
      const candidates = planes
        .map((p) => ({
          plane: p,
          violation: Math.max(
            ...vertices.map((v) => dot(p.normal, v) - p.distance),
          ),
        }))
        .filter((p) => p.violation > TOLERANCE)
        .sort((a, b) => b.violation - a.violation);
      if (!candidates.length) {
        leaves.push(part);
        brushes.push({ planes, surface: input.surface, volume });
        continue;
      }
      let children: Manifold[] | undefined;
      // Prefer an exact tetrahedral fan for star-shaped cells, before touching
      // boundary planes. This preserves the chosen diagonals of warped caps.
      const center = vertices.reduce(
        (p, v) => p.map((x, i) => x + v[i] / vertices.length) as V3,
        [0, 0, 0] as V3,
      );
      if (planes.every((p) => dot(p.normal, center) - p.distance <= 1e-7)) {
        const raw = part.getMesh();
        children = [];
        for (let t = 0; t < raw.triVerts.length; t += 3) {
          const points = [0, 1, 2].map((i) => vertices[raw.triVerts[t + i]]);
          const volume6 = dot(
            cross(sub(points[1], points[0]), sub(points[2], points[0])),
            sub(points[0], center),
          );
          if (volume6 <= 1e-11) continue;
          const tetra = solidManifold(K, {
            positions: [...points, center],
            triangles: [
              [0, 1, 2],
              [0, 3, 1],
              [1, 3, 2],
              [2, 3, 0],
            ],
            surface: input.surface,
          });
          owned.push(tetra);
          children.push(tetra);
        }
      } else
        for (const { plane } of candidates) {
          const rawHalves = part.splitByPlane(plane.normal, plane.distance);
          owned.push(...rawHalves);
          const halves = rawHalves.map((c) => c.setTolerance(0.000001));
          owned.push(...halves);
          if (
            Math.abs(halves.reduce((sum, c) => sum + c.volume(), 0) - volume) <
              Math.max(1e-7, volume * 1e-6) &&
            halves.every(
              (c) =>
                !c.isEmpty() &&
                c.volume() > 1e-12 &&
                c.volume() < volume - 1e-12,
            )
          ) {
            children = halves;
            break;
          }
        }
      if (!children?.length)
        throw new Error(
          `${input.surface.object}: convex split made no progress.`,
        );
      for (const child of children) {
        const pieces = child.decompose();
        owned.push(...pieces);
        queue.push(...pieces);
      }
    }
    const union = K.Manifold.union(leaves);
    owned.push(union);
    const missing = source.subtract(union),
      extra = union.subtract(source);
    owned.push(missing, extra);
    const error = Math.abs(missing.volume()) + Math.abs(extra.volume());
    const tolerance = Math.max(1e-7, Math.abs(source.volume()) * 1e-6);
    if (
      error > tolerance ||
      Math.abs(brushes.reduce((v, b) => v + b.volume, 0) - source.volume()) >
        tolerance
    )
      throw new Error(
        `${input.surface.object}: brush decomposition changed volume by ${error} m³.`,
      );
    return brushes;
  } finally {
    for (const solid of owned.reverse()) solid.delete();
  }
}
export const brushMath = { cross, sub, dot, norm };
