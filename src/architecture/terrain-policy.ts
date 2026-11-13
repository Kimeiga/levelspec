import type { Diagnostic, MeshData, Surface, V3 } from "../vector/types.ts";
import { aborted } from "../vector/types.ts";
import {
  cross,
  dot,
  norm,
  sub,
  triangleIntersection,
} from "../vector/geometry.ts";
import { auditSurfaceContacts } from "../vector/surface-contacts.ts";
import {
  PhysicalGeometryIndex,
  clipToPrism,
  spatialArea,
  spatialBounds,
  spatialIntersects,
  type SpatialBounds,
  type SpatialPlane,
} from "../vector/spatial-geometry.ts";
import { transform } from "./geometry.ts";
import type { ArchitectureResolution } from "./resolve.ts";
import type { CompiledArchitecture } from "./types.ts";

interface Face {
  index: number;
  points: V3[];
  normal: V3;
  surface: Surface;
  bounds: SpatialBounds;
  solid: string;
}
interface Tree {
  bounds: SpatialBounds;
  faces?: Face[];
  children?: Tree[];
}
const nearPlane = 0.0001,
  confirmedPlane = 1e-9,
  minimumArea = 1e-6;

/** Builds one bounded local face index, never a whole-world triangle-object graph. */
function tree(faces: Face[], spend: () => void): Tree {
  for (const _face of faces) spend();
  const bounds = spatialBounds(
    faces.flatMap((face) => [face.bounds.min, face.bounds.max]),
  );
  if (faces.length <= 8) return { bounds, faces };
  const sizes = bounds.max.map((n, i) => n - bounds.min[i]),
    axis = sizes.indexOf(Math.max(...sizes));
  const sorted = [...faces].sort((a, b) => {
      spend();
      return (
        a.bounds.min[axis] +
        a.bounds.max[axis] -
        b.bounds.min[axis] -
        b.bounds.max[axis]
      );
    }),
    middle = sorted.length >>> 1;
  return {
    bounds,
    children: [
      tree(sorted.slice(0, middle), spend),
      tree(sorted.slice(middle), spend),
    ],
  };
}
/** Queries local candidates while charging even skipped broad-phase bounds. */
function* candidates(
  node: Tree,
  bounds: SpatialBounds,
  spend: () => void,
): Generator<Face> {
  spend();
  if (!spatialIntersects(node.bounds, bounds, nearPlane)) return;
  if (node.faces) {
    for (const face of node.faces) {
      spend();
      if (spatialIntersects(face.bounds, bounds, nearPlane)) yield face;
    }
  } else
    for (const child of node.children ?? [])
      yield* candidates(child, bounds, spend);
}

/** Removes only confirmed buried diagnostic fragments, preserving holes and CSG cavities. */
function exposed(
  polygon: V3[],
  normal: V3,
  ignore: Set<string>,
  index: PhysicalGeometryIndex,
  spend: () => void,
): V3[][] {
  let pieces = [polygon];
  const planes: SpatialPlane[] = [];
  for (const face of index.faces(spatialBounds(polygon), true)) {
    spend();
    if (!face.solid || ignore.has(face.solid) || !index.isClosed(face.solid))
      continue;
    const plane = {
      normal: face.normal,
      offset: dot(face.normal, face.points[0]),
    };
    if (
      planes.some((p) => {
        spend();
        const direction = dot(p.normal, plane.normal);
        return (
          Math.abs(Math.abs(direction) - 1) < 1e-12 &&
          Math.abs(p.offset - (direction >= 0 ? plane.offset : -plane.offset)) <
            confirmedPlane
        );
      })
    )
      continue;
    planes.push(plane);
  }
  for (const plane of planes) {
    const next: V3[][] = [];
    for (const piece of pieces) {
      spend();
      const distances = piece.map((p) => dot(plane.normal, p) - plane.offset),
        error =
          Number.EPSILON * 128 * Math.max(1, ...piece.flat().map(Math.abs));
      if (Math.min(...distances) >= -error || Math.max(...distances) <= error) {
        next.push(piece);
        continue;
      }
      for (const side of [
        plane,
        { normal: plane.normal.map((n) => -n) as V3, offset: -plane.offset },
      ]) {
        const fragment = clipToPrism(piece, [side]);
        if (spatialArea(fragment) > 1e-12) next.push(fragment);
      }
    }
    pieces = next;
    if (pieces.length > 4096)
      throw new Error("Terrain exposure fragment budget exceeded.");
  }
  return pieces.filter((piece) => {
    spend();
    const center = piece[0].map((_, axis) =>
      piece.reduce((sum, p) => sum + p[axis] / piece.length, 0),
    ) as V3;
    const before = center.map((n, axis) => n - normal[axis] * 1e-6) as V3,
      after = center.map((n, axis) => n + normal[axis] * 1e-6) as V3;
    return !(index.contains(before, ignore) && index.contains(after, ignore));
  });
}

/** Projects and lifts a positive-area near-coplanar intersection without changing physical geometry. */
function overlap(a: Face, b: Face): V3[] {
  const axis = a.normal
      .map(Math.abs)
      .indexOf(Math.max(...a.normal.map(Math.abs))),
    axes = [0, 1, 2].filter((i) => i !== axis);
  const project = (p: V3): V3 => [p[axes[0]], p[axes[1]], 0];
  const polygon = triangleIntersection(
      a.points.map(project),
      b.points.map(project),
    ),
    offset = dot(a.normal, a.points[0]);
  return polygon.map((p) => {
    const point: V3 = [0, 0, 0];
    point[axes[0]] = p[0];
    point[axes[1]] = p[1];
    point[axis] =
      (offset - a.normal[axes[0]] * p[0] - a.normal[axes[1]] * p[1]) /
      a.normal[axis];
    return point;
  });
}

/**
 * Keeps architectural contact policy separate from terrain rendering defects.
 * Structured terrain interiors are known conforming; only cross-piece candidates
 * and authored explicit patches need overlap work. Open surfaces are never sealed.
 */
export function auditTerrainPolicy(
  level: CompiledArchitecture,
  resolution: ArchitectureResolution,
  severity: "warning" | "error",
  maximumQueries: number,
  signal?: AbortSignal,
): Diagnostic[] {
  const terrain = new Set(
    [...resolution.nodes.values()]
      .filter((n) => n.element.kind === "terrain")
      .map((n) => n.id),
  );
  if (!terrain.size) return auditSurfaceContacts(level, severity, signal);
  const mesh = level.mesh,
    architecture: MeshData = { ...mesh, indices: [], surfaces: [] };
  for (let t = 0; t < mesh.surfaces.length; t++)
    if (level.surfaces[mesh.surfaces[t]].domain !== "terrain") {
      architecture.indices.push(...mesh.indices.slice(t * 3, t * 3 + 3));
      architecture.surfaces.push(mesh.surfaces[t]);
    }
  const diagnostics = auditSurfaceContacts(
    { ...level, mesh: architecture },
    severity,
    signal,
  );
  const index = new PhysicalGeometryIndex(
    level,
    signal,
    maximumQueries,
    "render",
  );
  let work = 0;
  const spend = () => {
    if ((++work & 1023) === 0) aborted(signal);
    if (work > maximumQueries)
      throw new Error("Terrain exposure query budget exceeded.");
  };
  const conforming = new Set(
    [...terrain].filter((id) => {
      const e = resolution.nodes.get(id)!.element;
      return (
        e.kind === "terrain" &&
        (e.profile !== undefined ||
          e.columns !== undefined ||
          e.heightmap !== undefined ||
          e.base !== undefined)
      );
    }),
  );
  const chunks = index.regions().map((chunk) => {
    const objects = new Set<string>(),
      terrains = new Set<string>();
    for (let t = chunk.start; t < chunk.start + chunk.count; t++) {
      spend();
      const surface = level.surfaces[mesh.surfaces[t]];
      objects.add(surface.object);
      if (terrain.has(surface.object)) terrains.add(surface.object);
    }
    return { ...chunk, objects, terrains };
  });
  const load = (chunk: (typeof chunks)[number]): Face[] => {
    const faces: Face[] = [];
    for (let t = chunk.start; t < chunk.start + chunk.count; t++) {
      spend();
      const surface = level.surfaces[mesh.surfaces[t]];
      if (surface.visible === false || surface.domain === "visualization")
        continue;
      const points = mesh.indices
          .slice(t * 3, t * 3 + 3)
          .map((i) => mesh.positions.slice(i * 3, i * 3 + 3) as V3),
        normal = norm(
          cross(sub(points[1], points[0]), sub(points[2], points[0])),
        );
      faces.push({
        index: t,
        points,
        normal,
        surface,
        bounds: spatialBounds(points),
        solid: mesh.solidIds?.[t] ?? "",
      });
    }
    return faces;
  };
  const reported = new Map<string, Diagnostic>();
  for (let i = 0; i < chunks.length; i++)
    for (let j = i; j < chunks.length; j++) {
      spend();
      const a = chunks[i],
        b = chunks[j];
      if (!a.terrains.size && !b.terrains.size) continue;
      if (!spatialIntersects(a.bounds, b.bounds, nearPlane)) continue;
      if (
        a.objects.size === 1 &&
        b.objects.size === 1 &&
        [...a.objects][0] === [...b.objects][0] &&
        conforming.has([...a.objects][0])
      )
        continue;
      let hasPair = false,
        allReported = true;
      pairScan: for (const x of a.objects)
        for (const y of b.objects) {
          spend();
          if (!terrain.has(x) && !terrain.has(y)) continue;
          hasPair = true;
          const key = [...new Set([x, y])].sort().join("|") + ":confirmed";
          if (!reported.has(key)) {
            allReported = false;
            break pairScan;
          }
        }
      if (hasPair && allReported) continue;
      const left = load(a),
        right = i === j ? left : load(b);
      if (!left.length || !right.length) continue;
      const lookup = tree(right, spend);
      for (const face of left)
        for (const other of candidates(lookup, face.bounds, spend)) {
          spend();
          if (face.index >= other.index && i === j) continue;
          if (face.index === other.index) continue;
          if (
            !terrain.has(face.surface.object) &&
            !terrain.has(other.surface.object)
          )
            continue;
          if (
            face.surface.object === other.surface.object &&
            conforming.has(face.surface.object)
          )
            continue;
          if (Math.abs(dot(face.normal, other.normal)) < 1 - 1e-7) continue;
          const deviation = Math.max(
            ...face.points.map((p) =>
              Math.abs(dot(other.normal, sub(p, other.points[0]))),
            ),
            ...other.points.map((p) =>
              Math.abs(dot(face.normal, sub(p, face.points[0]))),
            ),
          );
          if (deviation > nearPlane) continue;
          const polygon = overlap(face, other);
          if (spatialArea(polygon) <= minimumArea) continue;
          const ignore = new Set([face.solid, other.solid].filter(Boolean)),
            patches = exposed(polygon, face.normal, ignore, index, spend),
            area = patches.reduce((sum, p) => sum + spatialArea(p), 0);
          if (area <= minimumArea) continue;
          const objects = [
              ...new Set([face.surface.object, other.surface.object]),
            ].sort(),
            confirmed = deviation <= confirmedPlane,
            key = objects.join("|") + (confirmed ? ":confirmed" : ":near");
          const bounds = spatialBounds(patches.flat()),
            position = bounds.min.map(
              (n, axis) => (n + bounds.max[axis]) / 2,
            ) as V3;
          if (!reported.has(key))
            reported.set(key, {
              severity: confirmed ? severity : "warning",
              code: confirmed ? "TERRAIN_COPLANAR" : "TERRAIN_NEAR_COPLANAR",
              objects,
              source: resolution.nodes.get(objects[0])?.element.source,
              message: confirmed
                ? "Exposed terrain faces overlap and can cause z-fighting."
                : "Terrain faces are near-coplanar; rendering overlap is uncertain.",
              review: {
                id: `terrain:${key}`,
                layers: [...new Set([face.surface.layer, other.surface.layer])],
                bounds,
                position,
                direction: face.normal,
                patches,
              },
            });
        }
    }
  diagnostics.push(...reported.values());
  for (const id of terrain) {
    const node = resolution.nodes.get(id)!,
      e = node.element;
    if (
      e.kind !== "terrain" ||
      e.profile ||
      e.heightmap ||
      e.columns !== undefined ||
      e.base !== undefined ||
      !["up", "down"].includes(e.orientation)
    )
      continue;
    const inverse = node.matrix.clone().invert();
    for (const face of index.faces(
      spatialBounds(e.points.map((p) => transform(p, node.matrix))),
      true,
    )) {
      if (face.surface.object !== id) continue;
      const local = face.points.map((p) => transform(p, inverse)),
        normal = cross(sub(local[1], local[0]), sub(local[2], local[0]));
      const handedness = Math.sign(node.matrix.determinant());
      if (normal[2] * handedness * (e.orientation === "up" ? 1 : -1) > 1e-12) continue;
      if (
        exposed(face.points, face.normal, new Set([face.solid]), index, spend)
          .length
      ) {
        diagnostics.push({
          severity: "error",
          code: "TERRAIN_WINDING",
          objects: [id],
          source: e.source,
          message:
            "Exposed terrain winding contradicts its declared orientation.",
        });
        break;
      }
    }
  }
  return diagnostics;
}
