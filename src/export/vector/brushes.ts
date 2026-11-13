import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { ExportSolid, Surface, V3 } from "../../vector/types.ts";
import { cross, sub, dot, norm } from "../../vector/geometry.ts";
export interface BrushPlane {
  points: [V3, V3, V3];
  normal: V3;
  distance: number;
  surface?: Surface;
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
type Work = { spend: () => void };

/** Extracts supporting planes and referenced vertices under the export work budget. */
function planesFor(solid: Manifold, work: Work) {
  const mesh = solid.getMesh(),
    pointsByIndex: V3[] = [];
  for (let v = 0; v < mesh.vertProperties.length; v += mesh.numProp)
    pointsByIndex.push(Array.from(mesh.vertProperties.slice(v, v + 3)) as V3);
  const planes: BrushPlane[] = [];
  for (let t = 0; t < mesh.triVerts.length; t += 3) {
    work.spend();
    const points = [0, 1, 2].map(
      (i) => pointsByIndex[mesh.triVerts[t + i]],
    ) as [V3, V3, V3];
    const raw = cross(sub(points[1], points[0]), sub(points[2], points[0]));
    if (Math.hypot(...raw) < 1e-10) continue;
    const normal = norm(raw),
      distance = dot(normal, points[0]);
    if (
      !planes.some((p) => {
        work.spend();
        return (
          dot(p.normal, normal) > 1 - 1e-10 &&
          Math.abs(p.distance - distance) < TOLERANCE
        );
      })
    )
      planes.push({ points, normal, distance });
  }
  const vertices = [...new Set(Array.from(mesh.triVerts))].map(
    (i) => pointsByIndex[i],
  );
  return { planes, vertices, pointsByIndex };
}
/** Clips exposed source faces to each convex plane without painting internal cuts. */
function assignMaterials(
  brush: Brush,
  vertices: V3[],
  input: ExportSolid,
  work: Work,
): BrushPlane | undefined {
  for (const plane of brush.planes) {
    work.spend();
    const matches = new Map<string, Surface>();
    const exposedPolygons: V3[][] = [];
    for (const face of input.materialFaces ?? []) {
      work.spend();
      const normal = norm(
        cross(
          sub(face.points[1], face.points[0]),
          sub(face.points[2], face.points[0]),
        ),
      );
      if (
        dot(normal, plane.normal) < 1 - 1e-7 ||
        face.points.some(
          (p) => Math.abs(dot(plane.normal, p) - plane.distance) > TOLERANCE,
        )
      )
        continue;
      let polygon = face.points;
      for (const boundary of brush.planes) {
        work.spend();
        const clipped: V3[] = [];
        for (let i = 0; i < polygon.length; i++) {
          work.spend();
          const a = polygon[i],
            b = polygon[(i + 1) % polygon.length];
          const da = dot(boundary.normal, a) - boundary.distance,
            db = dot(boundary.normal, b) - boundary.distance;
          if (da <= 1e-8) clipped.push(a);
          if ((da < 0 && db > 0) || (da > 0 && db < 0))
            clipped.push(
              a.map((n, axis) => n + (da / (da - db)) * (b[axis] - n)) as V3,
            );
        }
        polygon = clipped;
        if (polygon.length < 3) break;
      }
      let twiceArea = 0;
      for (let i = 1; i + 1 < polygon.length; i++)
        twiceArea += Math.hypot(
          ...cross(
            sub(polygon[i], polygon[0]),
            sub(polygon[i + 1], polygon[0]),
          ),
        );
      const perimeter = polygon.reduce(
        (sum, p, i) =>
          sum + Math.hypot(...sub(p, polygon[(i + 1) % polygon.length])),
        0,
      );
      // Float32 clipping leaves submicrometer boundary strips. Their inradius
      // is below the retained-solid precision and cannot own a separate face.
      if (twiceArea > Math.max(1e-10, perimeter * 1e-6)) {
        matches.set(face.surface.material, face.surface);
        exposedPolygons.push(polygon);
      }
    }
    if (matches.size > 1) {
      for (const polygon of exposedPolygons)
        for (let i = 0; i < polygon.length; i++) {
          work.spend();
          const a = polygon[i],
            b = polygon[(i + 1) % polygon.length];
          const edge = sub(b, a);
          if (Math.hypot(...edge) < 1e-7) continue;
          const normal = norm(cross(edge, plane.normal)),
            distance = dot(normal, a);
          const offsets = vertices.map((v) => {
            work.spend();
            return dot(normal, v) - distance;
          });
          if (Math.min(...offsets) < -1e-7 && Math.max(...offsets) > 1e-7)
            return {
              normal,
              distance,
              points: [a, b, a.map((n, axis) => n + plane.normal[axis]) as V3],
            };
        }
      throw new Error(
        `${input.surface.object}: conflicting BSP face materials cannot be separated within export precision.`,
      );
    }
    plane.surface = matches.values().next().value;
  }
}

/** Exact plane cuts, never an approximate convex hull around a concave solid. */
export function convexBrushes(
  K: ManifoldToplevel,
  input: ExportSolid,
  signal?: AbortSignal,
  maxPieces = 4096,
  maximumWork = 8_000_000,
): Brush[] {
  if (
    !Number.isSafeInteger(maxPieces) ||
    maxPieces < 1 ||
    !Number.isSafeInteger(maximumWork) ||
    maximumWork < 1
  )
    throw new Error("Invalid BSP decomposition budget.");
  let spent = 0;
  const work = {
    spend: () => {
      if ((++spent & 1023) === 0) signal?.throwIfAborted();
      if (spent > maximumWork)
        throw new Error(
          `${input.surface.object}: BSP decomposition work budget exceeded.`,
        );
    },
  };
  signal?.throwIfAborted();
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
      const { planes, vertices, pointsByIndex } = planesFor(part, work);
      const candidates = planes
        .map((p) => ({
          plane: p,
          violation: vertices.reduce((largest, v) => {
            work.spend();
            return Math.max(largest, dot(p.normal, v) - p.distance);
          }, -Infinity),
        }))
        .filter((p) => p.violation > TOLERANCE)
        .sort((a, b) => b.violation - a.violation);
      if (!candidates.length) {
        const brush = { planes, surface: input.surface, volume };
        const partition = assignMaterials(brush, vertices, input, work);
        if (!partition) {
          leaves.push(part);
          brushes.push(brush);
          continue;
        }
        const halves = part.splitByPlane(partition.normal, partition.distance);
        owned.push(...halves);
        if (halves.some((child) => child.volume() <= 1e-12))
          throw new Error(
            `${input.surface.object}: material partition made no occupied-volume progress.`,
          );
        queue.push(...halves);
        continue;
      }
      let children: Manifold[] | undefined;
      // Prefer an exact tetrahedral fan for star-shaped cells, before touching
      // boundary planes. This preserves the chosen diagonals of warped caps.
      const center = vertices.reduce(
        (p, v) => p.map((x, i) => x + v[i] / vertices.length) as V3,
        [0, 0, 0] as V3,
      );
      if (
        planes.every((p) => {
          work.spend();
          return dot(p.normal, center) - p.distance <= 1e-7;
        })
      ) {
        const raw = part.getMesh();
        const tetrahedra: V3[][] = [];
        for (let t = 0; t < raw.triVerts.length; t += 3) {
          work.spend();
          const points = [0, 1, 2].map(
            (i) => pointsByIndex[raw.triVerts[t + i]],
          );
          const volume6 = dot(
            cross(sub(points[1], points[0]), sub(points[2], points[0])),
            sub(points[0], center),
          );
          if (volume6 <= 1e-11) continue;
          if (tetrahedra.length + queue.length + leaves.length >= maxPieces)
            throw new Error(
              `${input.surface.object}: convex decomposition exceeds ${maxPieces} pieces.`,
            );
          tetrahedra.push(points);
        }
        children = [];
        for (const points of tetrahedra) {
          work.spend();
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
        for (const plane of [
          ...candidates.map(({ plane }) => plane),
          ...planes,
        ]) {
          work.spend();
          const rawHalves = part.splitByPlane(plane.normal, plane.distance);
          owned.push(...rawHalves);
          const halves = rawHalves.map((c) => c.setTolerance(0.000001));
          owned.push(...halves);
          const volumeTolerance = Math.max(1e-7, volume * 1e-6);
          const positive = halves.filter((child) => child.volume() > 1e-12);
          const conservesVolume =
            Math.abs(
              halves.reduce((sum, child) => sum + child.volume(), 0) - volume,
            ) < volumeTolerance;
          const dividesVolume =
            positive.length === 2 &&
            positive.every((child) => child.volume() < volume - 1e-12);
          // Exact cuts can detach zero-volume sheets left by coincident CSG faces.
          // Admit that cleanup only when occupied volume and mesh progress agree.
          const removesResidue =
            positive.length === 1 &&
            Math.abs(positive[0].volume() - volume) < volumeTolerance &&
            positive[0].numTri() < part.numTri();
          if (conservesVolume && (dividesVolume || removesResidue)) {
            children = positive;
            break;
          }
        }
      if (!children?.length) {
        throw new Error(
          `${input.surface.object}: convex split made no progress (volume ${volume}, ${vertices.length} vertices, maximum plane violation ${candidates[0]?.violation}).`,
        );
      }
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
