import type { CompiledLevel, Diagnostic, Surface, V3 } from "./types.ts";
import { aborted } from "./types.ts";
import { cross, dot, norm, sub, triangleIntersection } from "./geometry.ts";
import { ClipContext, polygonArea } from "./clipping.ts";

// Authoring is millimeter-quantized; this smaller tolerance absorbs CSG float32 noise.
const PLANE_EPS = 0.0001;
const AREA_EPS = 0.000001;
type Bounds = { min: V3; max: V3 };
type Face = {
  index: number;
  points: V3[];
  normal: V3;
  surface: Surface;
  bounds: Bounds;
};
type Node = { bounds: Bounds; faces?: Face[]; children?: Node[] };
type Plane = {
  origin: V3;
  normal: V3;
  axis: number;
  axes: number[];
  polygons: V3[][];
  index: PatchIndex;
};
type Contact = { objects: string[]; layers: Set<string>; planes: Plane[] };

/** Bounds arbitrary world-space vertices without changing their coordinates. */
function boundsOf(points: V3[]): Bounds {
  const min: V3 = [Infinity, Infinity, Infinity],
    max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points)
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], p[axis]);
      max[axis] = Math.max(max[axis], p[axis]);
    }
  return { min, max };
}

/** Builds a bounded spatial index; large triangles require no grid-cell expansion. */
function indexFaces(faces: Face[]): Node {
  const bounds = boundsOf(
    faces.flatMap((face) => [face.bounds.min, face.bounds.max]),
  );
  if (faces.length <= 8) return { bounds, faces };
  const extent = bounds.max.map((value, axis) => value - bounds.min[axis]);
  const axis = extent.indexOf(Math.max(...extent));
  const sorted = [...faces].sort(
    (a, b) =>
      a.bounds.min[axis] +
      a.bounds.max[axis] -
      (b.bounds.min[axis] + b.bounds.max[axis]),
  );
  const middle = Math.floor(sorted.length / 2);
  return {
    bounds,
    children: [
      indexFaces(sorted.slice(0, middle)),
      indexFaces(sorted.slice(middle)),
    ],
  };
}

/** Includes tolerance only in the broad phase; positive-area clipping remains authoritative. */
function intersects(a: Bounds, b: Bounds): boolean {
  return [0, 1, 2].every(
    (axis) =>
      a.min[axis] <= b.max[axis] + PLANE_EPS &&
      b.min[axis] <= a.max[axis] + PLANE_EPS,
  );
}

type Patch = { polygon: V3[]; bounds: Bounds };
type PatchNode = { bounds: Bounds; patches?: Patch[]; children?: PatchNode[] };

/** Builds a balanced planar patch tree, independent of insertion direction or patch size. */
function indexPatches(patches: Patch[]): PatchNode {
  const bounds = boundsOf(
    patches.flatMap((patch) => [patch.bounds.min, patch.bounds.max]),
  );
  if (patches.length <= 8) return { bounds, patches };
  const axis =
    bounds.max[0] - bounds.min[0] >= bounds.max[1] - bounds.min[1] ? 0 : 1;
  const sorted = [...patches].sort(
    (a, b) =>
      a.bounds.min[axis] +
      a.bounds.max[axis] -
      b.bounds.min[axis] -
      b.bounds.max[axis],
  );
  const middle = Math.floor(sorted.length / 2);
  return {
    bounds,
    children: [
      indexPatches(sorted.slice(0, middle)),
      indexPatches(sorted.slice(middle)),
    ],
  };
}

/** Queries only prior patches intersecting the original incoming polygon bounds. */
function* queryPatches(node: PatchNode, bounds: Bounds): Generator<V3[]> {
  if (!intersects(node.bounds, bounds)) return;
  if (node.patches) {
    for (const patch of node.patches)
      if (intersects(patch.bounds, bounds)) yield patch.polygon;
  } else for (const child of node.children!) yield* queryPatches(child, bounds);
}

/**
 * Incremental spatial index using logarithmic balanced-tree buckets. Binary merges
 * amortize rebuilds and avoid a degenerate tree when patches arrive in sorted order.
 */
class PatchIndex {
  private buckets: ({ patches: Patch[]; tree: PatchNode } | undefined)[] = [];

  /** Adds an owned union fragment after clipping; no polygon coordinates are changed. */
  add(polygon: V3[]): void {
    let patches: Patch[] = [{ polygon, bounds: boundsOf(polygon) }];
    let level = 0;
    while (this.buckets[level]) {
      patches = [...this.buckets[level]!.patches, ...patches];
      this.buckets[level] = undefined;
      level++;
    }
    this.buckets[level] = { patches, tree: indexPatches(patches) };
  }

  /** Visits spatial candidates without scanning the complete accumulated plane. */
  *query(polygon: V3[]): Generator<V3[]> {
    const bounds = boundsOf(polygon);
    for (const bucket of this.buckets)
      if (bucket) yield* queryPatches(bucket.tree, bounds);
  }
}

/** Queries only overlapping leaf bounds, yielding each unordered triangle pair once. */
function* candidates(node: Node, face: Face): Generator<Face> {
  if (!intersects(node.bounds, face.bounds)) return;
  if (node.faces) {
    for (const other of node.faces)
      if (other.index > face.index && intersects(other.bounds, face.bounds))
        yield other;
  } else for (const child of node.children!) yield* candidates(child, face);
}

/** Drops the dominant normal axis, with a local origin to preserve large-coordinate precision. */
function project(p: V3, plane: Plane): V3 {
  return [
    p[plane.axes[0]] - plane.origin[plane.axes[0]],
    p[plane.axes[1]] - plane.origin[plane.axes[1]],
    0,
  ];
}

/** Reconstructs a projected overlap on its original world-space plane. */
function unproject(p: V3, plane: Plane): V3 {
  const world = [...plane.origin] as V3;
  world[plane.axes[0]] += p[0];
  world[plane.axes[1]] += p[1];
  world[plane.axis] -=
    (plane.normal[plane.axes[0]] * p[0] + plane.normal[plane.axes[1]] * p[1]) /
    plane.normal[plane.axis];
  return world;
}

/** Rejects numerical edge slivers using their footprint width, not triangle tessellation. */
function meaningful(polygon: V3[], plane: Plane): boolean {
  if (polygon.length < 3) return false;
  const area = polygonArea(polygon);
  const perimeter = polygon.reduce(
    (sum, p, i) =>
      sum +
      Math.hypot(
        p[0] - polygon[(i + 1) % polygon.length][0],
        p[1] - polygon[(i + 1) % polygon.length][1],
      ),
    0,
  );
  return (
    area / Math.abs(plane.normal[plane.axis]) > AREA_EPS &&
    (2 * area) / perimeter > PLANE_EPS
  );
}

/**
 * Audits positive-area, same-facing coincidence among all visible mesh triangles,
 * including duplicate triangles within one authored object. Opposing supports,
 * transverse intersections, and line/point contacts remain valid. Overlap patches
 * are unioned per source pair and oriented plane so duplicate copies do not inflate
 * measured area. No source, render, collision, or navigation geometry is changed.
 */
export function auditSurfaceContacts(
  level: CompiledLevel,
  severity: "warning" | "error" = "error",
  signal?: AbortSignal,
): Diagnostic[] {
  const faces: Face[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    aborted(signal);
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (surface.visible === false) continue;
    const points = level.mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map(
        (index) => level.mesh.positions.slice(index * 3, index * 3 + 3) as V3,
      );
    const raw = cross(sub(points[1], points[0]), sub(points[2], points[0]));
    if (Math.hypot(...raw) < 1e-12) continue;
    faces.push({
      index: t,
      points,
      normal: norm(raw),
      surface,
      bounds: boundsOf(points),
    });
  }
  if (!faces.length) return [];
  const index = indexFaces(faces),
    contacts = new Map<string, Contact>(),
    context = new ClipContext({ signal });
  for (const face of faces) {
    aborted(signal);
    for (const other of candidates(index, face)) {
      aborted(signal);
      if (dot(face.normal, other.normal) < 1 - 1e-7) continue;
      if (
        face.points.some(
          (p) =>
            Math.abs(dot(sub(p, other.points[0]), other.normal)) > PLANE_EPS,
        )
      )
        continue;
      const objects = [
          ...new Set([face.surface.object, other.surface.object]),
        ].sort(),
        key = objects.join("\0");
      let contact = contacts.get(key);
      const existing = contact?.planes.find(
        (plane) =>
          dot(plane.normal, face.normal) >= 1 - 1e-7 &&
          Math.abs(dot(sub(face.points[0], plane.origin), plane.normal)) <=
            PLANE_EPS,
      );
      const axis = face.normal
        .map(Math.abs)
        .indexOf(Math.max(...face.normal.map(Math.abs)));
      const plane: Plane = existing ?? {
        origin: face.points[0],
        normal: face.normal,
        axis,
        axes: [0, 1, 2].filter((value) => value !== axis),
        polygons: [],
        index: new PatchIndex(),
      };
      const polygon = triangleIntersection(
        face.points.map((p) => project(p, plane)),
        other.points.map((p) => project(p, plane)),
      ).map(([x, y]): V3 => [x, y, 0]);
      if (!meaningful(polygon, plane)) continue;
      if (!contact) {
        contact = { objects, layers: new Set(), planes: [] };
        contacts.set(key, contact);
      }
      contact.layers.add(face.surface.layer);
      contact.layers.add(other.surface.layer);
      if (!existing) contact.planes.push(plane);
      context.begin(objects.join(" and "));
      let fresh = [polygon];
      for (const prior of plane.index.query(polygon)) {
        aborted(signal);
        fresh = context.subtractMany(fresh, prior);
        if (!fresh.length) break;
      }
      for (const piece of fresh) {
        context.allocate(piece.length);
        plane.polygons.push(piece);
        plane.index.add(piece);
      }
    }
  }
  const sources = new Map(
    [
      ...level.document.layers.flatMap((layer) => [
        ...layer.edges,
        ...layer.regions,
      ]),
      ...level.document.seams,
      ...level.document.covers,
      ...(level.document.props ?? []),
      ...(level.document.assets ?? []),
    ].map((object) => [object.id, object]),
  );
  const props = new Map(
    (level.document.props ?? []).map((prop) => [prop.id, prop]),
  );
  return [...contacts.values()]
    .sort((a, b) => a.objects.join("|").localeCompare(b.objects.join("|")))
    .map((contact) => {
      let area = 0,
        largestArea = -Infinity,
        position: V3 = [0, 0, 0],
        direction: V3 = [0, 0, 1];
      const patches: V3[][] = [];
      for (const plane of contact.planes)
        for (const polygon of plane.polygons) {
          const patchArea =
            polygonArea(polygon) / Math.abs(plane.normal[plane.axis]);
          area += patchArea;
          const patch = polygon.map((p) => unproject(p, plane));
          patches.push(patch);
          if (patchArea > largestArea) {
            largestArea = patchArea;
            direction = plane.normal;
            position = [0, 1, 2].map((axis) =>
              patch.reduce((sum, p) => sum + p[axis] / patch.length, 0),
            ) as V3;
          }
        }
      const objects = contact.objects;
      const relatedIds = [
        ...new Set([
          ...objects,
          ...objects.flatMap((id) => {
            const prop = props.get(id);
            return prop?.shape === "asset" &&
              prop.asset &&
              sources.has(prop.asset)
              ? [prop.asset]
              : [];
          }),
        ]),
      ];
      const relatedSources = relatedIds.map((object) => ({
        object,
        source: sources.get(object)?.source,
      }));
      return {
        severity,
        code: "SURFACE_COPLANAR",
        objects,
        source: relatedSources.map((location) => location.source).find(Boolean),
        relatedSources,
        message: `${objects.length === 1 ? `Object ${objects[0]} contains overlapping copies of` : `Objects ${objects.join(" and ")} have overlapping`} same-facing surfaces (about ${area.toFixed(4)} m² near ${position.map((value) => value.toFixed(3)).join(", ")}). Separate or remove the duplicate surfaces to prevent Z-fighting.`,
        review: {
          id: `SURFACE_COPLANAR:${objects.join("|")}`,
          layers: [...contact.layers].filter(Boolean).sort(),
          bounds: boundsOf(patches.flat()),
          position,
          direction,
          patches,
        },
      };
    });
}
