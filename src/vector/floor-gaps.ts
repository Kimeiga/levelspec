import type {
  CompiledLevel,
  Diagnostic,
  Edge,
  FloorPatch,
  Region,
  V3,
} from "./types.ts";
import { aborted } from "./types.ts";
import { area, orient } from "./geometry.ts";

const XY_EPS = 1e-5;
const HEIGHT_EPS = 0.001 + 1e-6;
type Line = { z0: number; dz: number };
type Piece = Line & {
  start: number;
  end: number;
  mesh?: string;
  sign?: number;
};
type Boundary = {
  a: V3;
  b: V3;
  side: number;
  edge: Edge;
  region: Region;
  floor: FloorPatch;
};
type Face = {
  points: [V3, V3, V3];
  mesh: string;
  sign: number;
  bounds: number[];
};
const zAt = (line: Line, t: number) => line.z0 + line.dz * t;

/** Intersect an XY line with a projected triangle and retain its exact height plane. */
function slice(a: V3, b: V3, p: [V3, V3, V3]): Piece | undefined {
  const den = orient(...p);
  if (Math.abs(den) < 1e-10) return;
  const sign = Math.sign(den);
  let start = 0,
    end = 1;
  for (let i = 0; i < 3; i++) {
    const u = p[i],
      v = p[(i + 1) % 3];
    const f0 = sign * orient(u, v, a),
      f1 = sign * orient(u, v, b);
    const tolerance = XY_EPS * Math.hypot(v[0] - u[0], v[1] - u[1]);
    if (Math.abs(f1 - f0) < 1e-12) {
      if (f0 < -tolerance) return;
    } else {
      const t = (-tolerance - f0) / (f1 - f0);
      if (f1 > f0) start = Math.max(start, t);
      else end = Math.min(end, t);
    }
  }
  if (end - start < 1e-9) return;
  const height = (q: V3) =>
    (orient(q, p[1], p[2]) * p[0][2] +
      orient(p[0], q, p[2]) * p[1][2] +
      orient(p[0], p[1], q) * p[2][2]) /
    den;
  const z0 = height(a);
  return { start, end, z0, dz: height(b) - z0 };
}

/** Opposite filled sides distinguish adjacent floors from stacked perimeters. */
function overlap(a: Boundary, b: Boundary): [V3, V3] | undefined {
  const dx = a.b[0] - a.a[0],
    dy = a.b[1] - a.a[1],
    len = Math.hypot(dx, dy);
  const ux = dx / len,
    uy = dy / len;
  const vx = b.b[0] - b.a[0],
    vy = b.b[1] - b.a[1];
  if ((ux * vx + uy * vy) * a.side * b.side >= 0) return;
  if (
    Math.abs(orient(a.a, a.b, b.a)) / len > XY_EPS ||
    Math.abs(orient(a.a, a.b, b.b)) / len > XY_EPS
  )
    return;
  const t0 = (b.a[0] - a.a[0]) * ux + (b.a[1] - a.a[1]) * uy;
  const t1 = (b.b[0] - a.a[0]) * ux + (b.b[1] - a.a[1]) * uy;
  const low = Math.max(0, Math.min(t0, t1)),
    high = Math.min(len, Math.max(t0, t1));
  if (high - low <= 0.001) return;
  return [
    [a.a[0] + low * ux, a.a[1] + low * uy, 0],
    [a.a[0] + high * ux, a.a[1] + high * uy, 0],
  ];
}

function topSlices(floor: FloorPatch, a: V3, b: V3) {
  return floor.triangles.flatMap((tri) => {
    const result = slice(a, b, tri.map((i) => floor.points[i]) as [V3, V3, V3]);
    return result ? [result] : [];
  });
}

function wallSpans(pieces: Piece[], t: number): [number, number][] {
  const byMesh = new Map<string, { z: number; sign: number }[]>();
  for (const p of pieces) {
    const hits = byMesh.get(p.mesh!) ?? [];
    hits.push({ z: zAt(p, t), sign: p.sign! });
    byMesh.set(p.mesh!, hits);
  }
  const spans: [number, number][] = [];
  for (const hits of byMesh.values()) {
    hits.sort((a, b) => a.z - b.z);
    let start: number | undefined, top: number | undefined;
    for (let i = 0; i < hits.length; ) {
      const z = hits[i].z,
        signs = new Set<number>();
      while (i < hits.length && hits[i].z - z < XY_EPS)
        signs.add(hits[i++].sign);
      // Duplicate triangle-edge hits count once. Touching caps cancel. A ray
      // along a wall junction may touch several entry caps but fewer exit caps;
      // group consecutive entries/exits instead of leaving a winding count open.
      // A new entry after an exit starts a separate span, preserving vertical gaps.
      if (signs.size === 2) continue;
      if (signs.has(-1)) {
        if (start !== undefined && top !== undefined) {
          spans.push([start, top]);
          start = undefined;
          top = undefined;
        }
        start ??= z;
      } else if (start !== undefined) top = z;
    }
    if (start !== undefined && top !== undefined) spans.push([start, top]);
  }
  return spans.sort((a, b) => a[0] - b[0]);
}

function openHeight(low: number, high: number, spans: [number, number][]) {
  let cursor = low,
    largest = 0;
  for (const [a, b] of spans) {
    if (a >= high) break;
    if (a > cursor) largest = Math.max(largest, a - cursor);
    cursor = Math.max(cursor, b);
  }
  return Math.max(largest, high - cursor);
}

/** Warn about exposed vertical gaps, using final static wall geometry rather
 * than trusting that a wall/seam declaration actually fills the required span.
 * All triangle crossings and linear height-order changes partition the boundary;
 * this is an interval audit, not a fixed-distance sampling grid. */
export function auditFloorGaps(
  level: CompiledLevel,
  severity: "warning" | "error" = "warning",
  signal?: AbortSignal,
): Diagnostic[] {
  const d = level.document,
    boundaries: Boundary[] = [];
  for (const layer of d.layers) {
    const edges = new Map(layer.edges.map((e) => [e.id, e]));
    for (const region of layer.regions) {
      const floor = level.floors.find((f) => f.region === region.id)!;
      [region.boundary, ...region.holes].forEach((refs, loop) => {
        const side = Math.sign(area(floor.loops[loop])) * (loop ? -1 : 1);
        for (const ref of refs) {
          const edge = edges.get(ref.replace(/^-/, ""))!;
          const path = ref.startsWith("-")
            ? [...level.curves[edge.id]].reverse()
            : level.curves[edge.id];
          for (let i = 1; i < path.length; i++)
            boundaries.push({
              a: path[i - 1],
              b: path[i],
              side,
              edge,
              region,
              floor,
            });
        }
      });
    }
  }
  const faces: Face[] = [];
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surface = level.surfaces[level.mesh.surfaces[t]];
    if (surface.kind !== "wall" || surface.dynamic) continue;
    const points = level.mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map((v) => level.mesh.positions.slice(v * 3, v * 3 + 3) as V3) as [
      V3,
      V3,
      V3,
    ];
    const projected = orient(...points);
    if (Math.abs(projected) < 1e-10) continue;
    faces.push({
      points,
      mesh: surface.mesh,
      sign: Math.sign(projected),
      bounds: [
        Math.min(...points.map((p) => p[0])),
        Math.min(...points.map((p) => p[1])),
        Math.max(...points.map((p) => p[0])),
        Math.max(...points.map((p) => p[1])),
      ],
    });
  }
  const found = new Map<
    string,
    { a: Boundary; b: Boundary; length: number; height: number; at: V3 }
  >();
  for (let i = 0; i < boundaries.length; i++) {
    aborted(signal);
    const a = boundaries[i];
    for (const b of boundaries.slice(i + 1)) {
      if (a.region.id === b.region.id) continue;
      const segment = overlap(a, b);
      if (!segment) continue;
      const [p, q] = segment,
        length = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const topsA = topSlices(a.floor, p, q),
        topsB = topSlices(b.floor, p, q);
      const bottom = (s: Piece, r: Region): Piece =>
        r.fill === "stairs"
          ? {
              ...s,
              z0:
                level.curves[r.lower!][0][2] -
                (r.thickness ?? d.floorThickness),
              dz: 0,
            }
          : { ...s, z0: s.z0 - (r.thickness ?? d.floorThickness) };
      const bottomsA = topsA.map((s) => bottom(s, a.region)),
        bottomsB = topsB.map((s) => bottom(s, b.region));
      // A lower surface that continues beneath the other region is an underpass
      // mouth, not a missing riser. Keep that test independent of layer names.
      const continuations = level.floors
        .filter((f) => f !== a.floor && f !== b.floor)
        .flatMap((f) =>
          f.triangles.flatMap((tri) => {
            const points = tri.map((i) => f.points[i]) as [V3, V3, V3];
            const piece = slice(p, q, points);
            if (!piece) return [];
            const sides = points.map((v) => orient(p, q, v) / length);
            const region = d.layers
              .flatMap((l) => l.regions)
              .find((r) => r.id === f.region)!;
            return [
              {
                ...piece,
                base: bottom(piece, region),
                positive: Math.max(...sides) > XY_EPS,
                negative: Math.min(...sides) < -XY_EPS,
              },
            ];
          }),
        );
      const wall = faces.flatMap((face) => {
        if (
          face.bounds[0] > Math.max(p[0], q[0]) + XY_EPS ||
          face.bounds[2] < Math.min(p[0], q[0]) - XY_EPS ||
          face.bounds[1] > Math.max(p[1], q[1]) + XY_EPS ||
          face.bounds[3] < Math.min(p[1], q[1]) - XY_EPS
        )
          return [];
        const piece = slice(p, q, face.points);
        return piece ? [{ ...piece, mesh: face.mesh, sign: face.sign }] : [];
      });
      const all = [
        ...topsA,
        ...topsB,
        ...bottomsA,
        ...bottomsB,
        ...wall,
        ...continuations,
        ...continuations.map((c) => c.base),
      ];
      const cuts = [
        ...new Set([0, 1, ...all.flatMap((s) => [s.start, s.end])]),
      ].sort((a, b) => a - b);
      let missingLength = 0,
        maxHeight = 0,
        at = p;
      for (let c = 1; c < cuts.length; c++) {
        const lo = cuts[c - 1],
          hi = cuts[c],
          mid = (lo + hi) / 2;
        const active = (s: Piece) => s.start <= mid && s.end >= mid;
        const A = topsA.filter(active),
          B = topsB.filter(active);
        if (!A.length || !B.length) continue;
        const W = wall.filter(active),
          lines = all.filter(active),
          subcuts = [lo, hi];
        for (let u = 0; u < lines.length; u++)
          for (let v = u + 1; v < lines.length; v++) {
            const dz = lines[u].dz - lines[v].dz;
            if (Math.abs(dz) < 1e-12) continue;
            for (const epsilon of [0, -HEIGHT_EPS, HEIGHT_EPS]) {
              const t = (lines[v].z0 - lines[u].z0 + epsilon) / dz;
              if (t > lo && t < hi) subcuts.push(t);
            }
          }
        subcuts.sort((a, b) => a - b);
        for (let k = 1; k < subcuts.length; k++) {
          const t = (subcuts[k - 1] + subcuts[k]) / 2;
          const highest = (s: Piece[]) =>
            s.reduce((a, b) => (zAt(a, t) > zAt(b, t) ? a : b));
          const ta = highest(A),
            tb = highest(B),
            za = zAt(ta, t),
            zb = zAt(tb, t);
          const low = Math.min(za, zb),
            high = zAt(
              za > zb ? bottom(ta, a.region) : bottom(tb, b.region),
              t,
            );
          if (high - low <= HEIGHT_EPS) continue;
          const towardUpper = za < zb ? -a.side : a.side;
          const lowBase = zAt(
            za < zb ? bottom(ta, a.region) : bottom(tb, b.region),
            t,
          );
          if (
            continuations.some(
              (s) =>
                s.start <= t &&
                s.end >= t &&
                Math.max(zAt(s.base, t), lowBase) <=
                  Math.min(zAt(s, t), low) + HEIGHT_EPS &&
                (towardUpper > 0 ? s.positive : s.negative),
            )
          )
            continue;
          const gap = openHeight(low, high, wallSpans(W, t));
          if (gap <= HEIGHT_EPS) continue;
          missingLength += (subcuts[k] - subcuts[k - 1]) * length;
          if (gap > maxHeight) {
            maxHeight = gap;
            at = [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]), low];
          }
        }
      }
      if (missingLength <= 0.001) continue;
      const key = [a.region.id, a.edge.id, b.region.id, b.edge.id].join("\0");
      const prev = found.get(key);
      found.set(key, {
        a,
        b,
        length: missingLength + (prev?.length ?? 0),
        height: Math.max(maxHeight, prev?.height ?? 0),
        at: (prev?.height ?? 0) > maxHeight ? prev!.at : at,
      });
    }
  }
  return [...found.values()].map(({ a, b, length, height, at }) => ({
    severity,
    code: "FLOOR_EDGE_GAP",
    objects: [a.region.id, b.region.id, a.edge.id, b.edge.id],
    source:
      a.edge.source ?? a.region.source ?? b.edge.source ?? b.region.source,
    message: `Adjacent floors ${a.region.id} (${a.edge.id}) and ${b.region.id} (${b.edge.id}) leave an unsealed vertical gap along ${length.toFixed(3)} m of boundary (about ${height.toFixed(3)} m high near ${at[0].toFixed(3)}, ${at[1].toFixed(3)}). Add an elevation seam or a wall spanning the lower floor to the upper slab underside; a wall above the gap does not seal it.`,
  }));
}
