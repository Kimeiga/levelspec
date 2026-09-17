import cdt2d from "cdt2d";
import type { V2, V3, Edge, Layer, Region, FloorPatch } from "./types.ts";
export const EPS = 1e-7;
export const sub = (a: V3, b: V3): V3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = (a: V3): V3 => {
  const n = Math.hypot(...a) || 1;
  return a.map((v) => v / n) as V3;
};
export const lerp = (a: V3, b: V3, t: number): V3 =>
  a.map((v, i) => v + (b[i] - v) * t) as V3;
export const area = (p: V3[]) =>
  p.reduce((s, a, i) => {
    const b = p[(i + 1) % p.length];
    return s + a[0] * b[1] - b[0] * a[1];
  }, 0) / 2;
export const orient = (a: number[], b: number[], c: number[]) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
export function inside(p: number[], loop: number[][]): boolean {
  let yes = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const a = loop[i],
      b = loop[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      yes = !yes;
  }
  return yes;
}
export function intersection(
  a: number[],
  b: number[],
  c: number[],
  d: number[],
): boolean {
  return (
    orient(a, b, c) * orient(a, b, d) < -EPS * EPS &&
    orient(c, d, a) * orient(c, d, b) < -EPS * EPS
  );
}
function pointLine(p: V3, a: V3, b: V3) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    l = dx * dx + dy * dy,
    t = l
      ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l))
      : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
export function tessellate(edge: Edge, layer: Layer, tolerance: number): V3[] {
  const av = layer.vertices.find((v) => v.id === edge.from),
    bv = layer.vertices.find((v) => v.id === edge.to);
  if (!av || !bv)
    throw new Error(`Edge ${edge.id} references a missing vertex.`);
  const a: V3 = [av.x, av.y, av.z],
    b: V3 = [bv.x, bv.y, bv.z];
  if (!edge.control?.length) return [a, b];
  const points: V3[] = [
      a,
      ...edge.control.map((c) => [c[0], c[1], 0] as V3),
      b,
    ],
    out: V3[] = [a];
  function split(p: V3[], depth: number) {
    const flat = Math.max(
      ...p.slice(1, -1).map((c) => pointLine(c, p[0], p.at(-1)!)),
    );
    if (flat <= tolerance) {
      out.push(p.at(-1)!);
      return;
    }
    if (depth >= 20)
      throw new Error(`Curve ${edge.id} exceeds subdivision limits.`);
    const left = [p[0]],
      right = [p.at(-1)!];
    let row = p;
    while (row.length > 1) {
      row = row.slice(1).map((v, i) => lerp(row[i], v, 0.5));
      left.push(row[0]);
      right.unshift(row.at(-1)!);
    }
    split(left, depth + 1);
    split(right, depth + 1);
  }
  split(points, 0);
  const lengths = [0];
  for (let i = 1; i < out.length; i++)
    lengths.push(
      lengths[i - 1] +
        Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]),
    );
  if (lengths.at(-1)! < EPS) throw new Error(`Zero-length curve ${edge.id}.`);
  return out.map((v, i) => [
    v[0],
    v[1],
    a[2] + ((b[2] - a[2]) * lengths[i]) / lengths.at(-1)!,
  ]);
}
export function edgeLoop(
  refs: string[],
  layer: Layer,
  curves: Record<string, V3[]>,
): V3[] {
  if (refs.length < 2)
    throw new Error("A region loop needs at least two edges.");
  const points: V3[] = [];
  let first = "",
    last = "";
  for (const ref of refs) {
    const reverse = ref.startsWith("-"),
      id = reverse ? ref.slice(1) : ref,
      e = layer.edges.find((e) => e.id === id);
    if (!e || !curves[id]) throw new Error(`Unknown boundary edge ${id}.`);
    const start = reverse ? e.to : e.from,
      end = reverse ? e.from : e.to;
    if (last && start !== last)
      throw new Error(
        `Loop is disconnected at ${id}; use a shared vertex or reverse the edge.`,
      );
    if (!first) first = start;
    last = end;
    const p = reverse ? [...curves[id]].reverse() : curves[id];
    points.push(...p.slice(0, -1));
  }
  if (last !== first) throw new Error("Region boundary is not closed.");
  if (points.length < 3 || Math.abs(area(points)) < EPS)
    throw new Error("Region has zero projected area.");
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      if (
        intersection(
          points[i],
          points[(i + 1) % points.length],
          points[j],
          points[(j + 1) % points.length],
        )
      )
        throw new Error("Region boundary self-intersects.");
  return points;
}
export function triangulate(
  region: Region,
  layer: Layer,
  curves: Record<string, V3[]>,
): FloorPatch {
  const loops = [region.boundary, ...region.holes].map((refs) =>
    edgeLoop(refs, layer, curves),
  );
  for (let i = 1; i < loops.length; i++) {
    if (!inside(loops[i][0], loops[0]))
      throw new Error("Hole is outside its region.");
    for (let j = 1; j < i; j++)
      if (inside(loops[i][0], loops[j]) || inside(loops[j][0], loops[i]))
        throw new Error("Holes overlap or nest.");
  }
  const points: V3[] = [],
    edges: number[][] = [],
    lookup = new Map<string, number>();
  const add = (p: V3) => {
    const k = `${p[0]},${p[1]}`;
    if (lookup.has(k)) {
      const index = lookup.get(k)!;
      if (Math.abs(points[index][2] - p[2]) > EPS)
        throw new Error(
          "A floor has multiple heights at the same XY position.",
        );
      return index;
    }
    const index = points.length;
    lookup.set(k, index);
    points.push(p);
    return index;
  };
  for (const loop of loops) {
    const ids = loop.map(add);
    ids.forEach((id, i) => edges.push([id, ids[(i + 1) % ids.length]]));
  }
  const byId = new Map(layer.vertices.map((v) => [v.id, v]));
  const vertex = (id: string) => {
    const v = byId.get(id);
    if (!v) throw new Error(`Unknown interior vertex ${id}.`);
    return add([v.x, v.y, v.z]);
  };
  for (const id of region.interior) {
    const i = vertex(id);
    if (
      !inside(points[i], loops[0]) ||
      loops.slice(1).some((h) => inside(points[i], h))
    )
      throw new Error(`Interior vertex ${id} is outside the floor.`);
  }
  for (const [a, b] of region.creases) edges.push([vertex(a), vertex(b)]);
  // Split constraints at existing vertices, preserving heights; never manufacture a junction.
  const splitEdges: number[][] = [];
  for (const [a, b] of edges) {
    const A = points[a],
      B = points[b],
      len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (len < EPS) throw new Error("Zero-length constraint.");
    const ids = points
      .map((p, i) => ({
        i,
        t:
          ((p[0] - A[0]) * (B[0] - A[0]) + (p[1] - A[1]) * (B[1] - A[1])) /
          (len * len),
      }))
      .filter(
        ({ i, t }) =>
          t >= -EPS && t <= 1 + EPS && Math.abs(orient(A, B, points[i])) < EPS,
      )
      .sort((a, b) => a.t - b.t);
    for (let i = 1; i < ids.length; i++)
      splitEdges.push([ids[i - 1].i, ids[i].i]);
  }
  for (let i = 0; i < splitEdges.length; i++)
    for (let j = i + 1; j < splitEdges.length; j++) {
      const [a, b] = splitEdges[i],
        [c, d] = splitEdges[j];
      if (intersection(points[a], points[b], points[c], points[d]))
        throw new Error("Constraints cross without an explicit junction.");
    }
  const unique = [
    ...new Map(
      splitEdges.map((e) => [[...e].sort((a, b) => a - b).join(","), e]),
    ).values(),
  ];
  const all = cdt2d(
    points.map((p) => p.slice(0, 2)),
    unique,
    { exterior: true, interior: true },
  ) as number[][];
  const triangles = all
    .filter((t) => {
      const p = [0, 1].map(
        (i) => (points[t[0]][i] + points[t[1]][i] + points[t[2]][i]) / 3,
      );
      return inside(p, loops[0]) && !loops.slice(1).some((h) => inside(p, h));
    })
    .map((t) =>
      orient(points[t[0]], points[t[1]], points[t[2]]) > 0
        ? t
        : [t[0], t[2], t[1]],
    );
  if (!triangles.length) throw new Error("Floor triangulation is empty.");
  return {
    region: region.id,
    area: region.area,
    layer: layer.id,
    points,
    triangles,
    loops,
  };
}
/** Positive-area intersection, used before CSG can conceal source overlaps. */
export function triangleOverlap(a: V3[], b: V3[]): number {
  return polygonArea(triangleIntersection(a, b));
}

function polygonArea(p: V2[]): number {
  return p.length < 3
    ? 0
    : Math.abs(
        p.reduce((s, a, i) => {
          const b = p[(i + 1) % p.length];
          return s + a[0] * b[1] - b[0] * a[1];
        }, 0) / 2,
      );
}

/** Convex XY intersection; retained vertices permit local height-span tests. */
export function triangleIntersection(a: V3[], b: V3[]): V2[] {
  if (
    Math.abs(orient(b[0], b[1], b[2])) < 1e-20 ||
    Math.abs(orient(a[0], a[1], a[2])) < 1e-20
  )
    return [];
  let p = a.map((x) => x.slice(0, 2) as V2);
  if (orient(b[0], b[1], b[2]) < 0) b = [b[0], b[2], b[1]];
  for (let i = 0; i < 3; i++) {
    const A = b[i],
      B = b[(i + 1) % 3],
      out: V2[] = [];
    for (let j = 0; j < p.length; j++) {
      const u = p[j],
        v = p[(j + 1) % p.length],
        du = orient(A, B, u),
        dv = orient(A, B, v);
      if (du >= 0) out.push(u);
      if (du >= 0 !== dv >= 0) {
        const t = du / (du - dv);
        out.push([u[0] + t * (v[0] - u[0]), u[1] + t * (v[1] - u[1])]);
      }
    }
    p = out;
  }
  return p;
}

/** Overlap of vertical solids below two triangles, evaluated over the actual
 * intersection polygon rather than their unrelated global Z ranges. */
export function floorVolumeOverlap(
  a: V3[],
  b: V3[],
  A: { thickness: number; base?: number },
  B: { thickness: number; base?: number },
): number {
  let polygon = triangleIntersection(a, b);
  const z = (t: V3[], p: V2) => {
    const denominator = orient(t[0], t[1], t[2]);
    return (
      (orient(p, t[1], t[2]) * t[0][2] +
        orient(t[0], p, t[2]) * t[1][2] +
        orient(t[0], t[1], p) * t[2][2]) /
      denominator
    );
  };
  // Clip by both affine inequalities; testing polygon vertices alone misses
  // crossing ramps whose solids intersect only inside the polygon.
  for (const gap of [
    (p: V2) => z(a, p) - (B.base ?? z(b, p) - B.thickness) - EPS,
    (p: V2) => z(b, p) - (A.base ?? z(a, p) - A.thickness) - EPS,
  ]) {
    const out: V2[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i],
        b = polygon[(i + 1) % polygon.length],
        da = gap(a),
        db = gap(b);
      if (da >= 0) out.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    polygon = out;
  }
  return polygonArea(polygon);
}
export function heightAt(
  f: FloorPatch,
  x: number,
  y: number,
): number | undefined {
  for (const t of f.triangles) {
    const [a, b, c] = t.map((i) => f.points[i]),
      d = orient(a, b, c),
      u = orient([x, y], b, c) / d,
      v = orient(a, [x, y], c) / d,
      w = 1 - u - v;
    if (u >= -EPS && v >= -EPS && w >= -EPS)
      return u * a[2] + v * b[2] + w * c[2];
  }
}
export function pathLength(p: V3[]) {
  return p
    .slice(1)
    .reduce((s, b, i) => s + Math.hypot(b[0] - p[i][0], b[1] - p[i][1]), 0);
}
export function pathAt(p: V3[], s: number): V3 {
  for (let i = 1; i < p.length; i++) {
    const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (s <= d) return lerp(p[i - 1], p[i], Math.max(0, s / d));
    s -= d;
  }
  return p.at(-1)!;
}
export async function hash(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(value));
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
