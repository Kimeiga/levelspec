import type { FloorPatch, Layer, Region, V2, V3 } from "./types.ts";
import { area, edgeLoop, EPS, orient, pathAt, pathLength } from "./geometry.ts";

export interface Flight {
  /** Actual walkable triangles: horizontal tread tops for stairs. */
  floor: FloorPatch;
  /** Continuous guide surface, also used to construct a flat ceiling. */
  guide: FloorPatch;
  /** Continuous intrinsic development of the ramp strip, in metres. */
  materialUVs: V2[];
  solid: { points: V3[]; triangles: number[][] };
  /** Smooth centerline, independent of the number of treads. */
  path: V3[];
}

/** Build a ruled strip between two explicit boundary rails. No raster outline
 * or straight line between the landings can substitute for the authored strip. */
export function buildFlight(
  region: Region,
  layer: Layer,
  curves: Record<string, V3[]>,
  thickness: number,
): Flight {
  if (region.holes.length || region.interior.length || region.creases.length)
    throw new Error(
      "Flights cannot contain holes, interior height vertices or creases; use separate landing regions.",
    );
  if (!region.lower || !region.upper || region.lower === region.upper)
    throw new Error(
      "Flights require distinct lower and upper boundary edge IDs.",
    );
  const loop = edgeLoop(region.boundary, layer, curves);
  const ids = region.boundary.map((ref) => ref.replace(/^-/, ""));
  for (const id of [region.lower, region.upper])
    if (ids.filter((value) => value === id).length !== 1)
      throw new Error(
        `Landing ${id} must occur exactly once in the flight boundary.`,
      );
  const low = curves[region.lower],
    high = curves[region.upper];
  for (const [name, points] of [
    ["Lower", low],
    ["Upper", high],
  ] as const) {
    const a = points[0],
      b = points.at(-1)!;
    if (
      pathLength(points) <= EPS ||
      points.some(
        (p) => Math.abs(p[2] - a[2]) > EPS || Math.abs(orient(a, b, p)) > EPS,
      )
    )
      throw new Error(`${name} landing must be a straight, horizontal edge.`);
  }
  const bottom = low[0][2],
    rise = high[0][2] - bottom;
  if (rise <= EPS)
    throw new Error("Upper landing must be above the lower landing.");
  const maximumRise = region.rise ?? 0.18;
  if (!Number.isFinite(maximumRise) || maximumRise <= 0)
    throw new Error("Maximum riser height must be positive.");
  const steps =
    region.fill === "stairs" ? Math.ceil(rise / maximumRise - 1e-9) : 1;
  if (steps < 1 || steps > 10000)
    throw new Error("A flight must contain between one and 10000 steps.");
  const oriented = (ref: string) =>
    ref.startsWith("-") ? [...curves[ref.slice(1)]].reverse() : curves[ref];
  const between = (start: number, end: number) => {
    const points: V3[] = [];
    for (
      let i = (start + 1) % ids.length;
      i !== end;
      i = (i + 1) % ids.length
    ) {
      const p = oriented(region.boundary[i]);
      points.push(...(points.length ? p.slice(1) : p));
    }
    if (points.length < 2 || pathLength(points) <= EPS)
      throw new Error(
        "Landings must be separated by two nonzero boundary rails.",
      );
    return points;
  };
  let left = between(ids.indexOf(region.lower), ids.indexOf(region.upper));
  let right = between(
    ids.indexOf(region.upper),
    ids.indexOf(region.lower),
  ).reverse();
  const fractions = (rail: V3[]) => {
    const length = pathLength(rail),
      result = [0];
    let s = 0;
    for (let i = 1; i < rail.length; i++) {
      s += Math.hypot(rail[i][0] - rail[i - 1][0], rail[i][1] - rail[i - 1][1]);
      const u = s / length;
      if (Math.abs(rail[i][2] - (bottom + u * rise)) > 0.001 + EPS)
        throw new Error(
          "Rail vertex heights must follow normalized rail distance between the landings (within 1 mm).",
        );
      result.push(u);
    }
    return result;
  };
  const unique = (values: number[]) =>
    values
      .sort((a, b) => a - b)
      .filter((u, i, all) => i === 0 || u - all[i - 1] > 1e-10);
  const smoothStations = unique([...fractions(left), ...fractions(right)]);
  const section = (u: number): [V3, V3] =>
    [left, right].map((rail) => {
      const p = pathAt(rail, u * pathLength(rail));
      return [p[0], p[1], bottom + u * rise] as V3;
    }) as [V3, V3];
  const [a, b] = section(0),
    [c, d] = section(smoothStations[1]);
  if (area([a, b, d, c]) < 0) [left, right] = [right, left];
  const stations = unique([
    ...smoothStations,
    ...(region.fill === "stairs"
      ? Array.from({ length: steps + 1 }, (_, i) => i / steps)
      : []),
  ]);
  const top = meshBuilder(),
    guide = meshBuilder(),
    solid = meshBuilder();
  let projectedArea = 0;
  let previous: [V3, V3] | undefined;
  for (let i = 1; i < stations.length; i++) {
    const u = stations[i - 1],
      v = stations[i];
    const [A, B] = section(u),
      [D, C] = section(v);
    if (
      Math.hypot(A[0] - B[0], A[1] - B[1]) <= EPS ||
      Math.hypot(C[0] - D[0], C[1] - D[1]) <= EPS
    )
      throw new Error("Flight rails meet at a zero-width cross-section.");
    const planar = [A, B, C, D];
    const diagonal = quadTriangles(planar);
    if (!diagonal)
      throw new Error(
        "Flight rails fold or cross; split the turn or change its boundary rails.",
      );
    projectedArea += area(planar);
    guide.face(planar, diagonal);
    const z =
      region.fill === "stairs"
        ? bottom +
          ((Math.min(steps - 1, Math.floor(((u + v) / 2) * steps)) + 1) *
            rise) /
            steps
        : undefined;
    const roof = planar.map((p) => [p[0], p[1], z ?? p[2]] as V3);
    const base = planar.map(
      (p) =>
        [
          p[0],
          p[1],
          (region.fill === "stairs" ? bottom : p[2]) - thickness,
        ] as V3,
    );
    top.face(roof, diagonal);
    solid.face(roof, diagonal);
    solid.face(
      base,
      diagonal.map((t) => [...t].reverse()),
    );
    // The two outer rails. Internal sections add faces only at actual risers.
    const riser = previous && Math.abs(previous[0][2] - roof[0][2]) > EPS;
    solid.polygon([
      roof[3],
      base[3],
      base[0],
      ...(riser ? [previous![0]] : []),
      roof[0],
    ]);
    solid.polygon([
      roof[1],
      ...(riser ? [previous![1]] : []),
      base[1],
      base[2],
      roof[2],
    ]);
    if (i === 1) solid.quad([roof[0], base[0], base[1], roof[1]]);
    else if (riser) solid.quad([roof[0], previous![0], previous![1], roof[1]]);
    if (i === stations.length - 1)
      solid.quad([roof[2], base[2], base[3], roof[3]]);
    previous = [roof[3], roof[2]];
  }
  if (
    Math.abs(projectedArea - Math.abs(area(loop))) >
    Math.max(1e-6, Math.abs(area(loop)) * 1e-8)
  )
    throw new Error(
      "Flight sections do not cover the boundary exactly; rails overlap or fold.",
    );
  const patch = (m: ReturnType<typeof meshBuilder>): FloorPatch => ({
    region: region.id,
    area: region.area,
    layer: layer.id,
    points: m.points,
    triangles: m.triangles,
    loops: [loop],
  });
  return {
    floor: patch(top),
    guide: patch(guide),
    materialUVs:
      region.fill === "ramp" ? unfoldStrip(guide.points, guide.triangles) : [],
    solid,
    path: smoothStations.map((u) => {
      const [a, b] = section(u);
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2]];
    }),
  };
}

/** Barycentric transfer from the authored strip to final CSG triangle corners.
 * Identical mesh positions always receive identical UVs across face boundaries. */
export function flightMaterialUV(flight: Flight, point: V3): V2 | undefined {
  for (const triangle of flight.guide.triangles) {
    const [a, b, c] = triangle.map((i) => flight.guide.points[i]);
    const den = orient(a, b, c);
    const u = orient(point, b, c) / den,
      v = orient(a, point, c) / den,
      w = 1 - u - v;
    if (Math.min(u, v, w) < -1e-4) continue;
    return [0, 1].map(
      (axis) =>
        u * flight.materialUVs[triangle[0]][axis] +
        v * flight.materialUVs[triangle[1]][axis] +
        w * flight.materialUVs[triangle[2]][axis],
    ) as V2;
  }
}

/** A two-rail strip has no interior vertices: its triangle adjacency is a tree.
 * Develop one triangle at a time across shared edges without any scale change.
 * Unlike independent plane projections this preserves checker phase, and unlike
 * a polar parameterization it preserves every triangle's intrinsic edge lengths. */
function unfoldStrip(points: V3[], triangles: number[][]): V2[] {
  const result: V2[] = new Array(points.length);
  const edges = new Map<string, number[]>();
  triangles.forEach((tri, t) =>
    tri.forEach((a, i) => {
      const b = tri[(i + 1) % 3],
        key = [a, b].sort((a, b) => a - b).join(",");
      edges.set(key, [...(edges.get(key) ?? []), t]);
    }),
  );
  const distance = (a: number, b: number) =>
    Math.hypot(...points[a].map((v, i) => v - points[b][i]));
  const first = triangles[0];
  result[first[0]] = [0, 0];
  result[first[1]] = [distance(first[0], first[1]), 0];
  const queue = [0],
    seen = new Set([0]);
  for (let next = 0; next < queue.length; next++) {
    const t = queue[next],
      tri = triangles[t];
    for (let i = 0; i < 3; i++) {
      const a = tri[i],
        b = tri[(i + 1) % 3],
        c = tri[(i + 2) % 3];
      if (!result[a] || !result[b] || result[c]) continue;
      const A = result[a],
        B = result[b],
        length = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const ac = distance(a, c),
        bc = distance(b, c);
      const along = (ac * ac - bc * bc + length * length) / (2 * length);
      const altitude = Math.sqrt(Math.max(0, ac * ac - along * along));
      const dx = (B[0] - A[0]) / length,
        dy = (B[1] - A[1]) / length;
      result[c] = [
        A[0] + dx * along - dy * altitude,
        A[1] + dy * along + dx * altitude,
      ];
      break;
    }
    if (tri.some((i) => !result[i]))
      throw new Error("Ramp UV strip has disconnected triangle topology.");
    for (let i = 0; i < 3; i++)
      for (const neighbor of edges.get(
        [tri[i], tri[(i + 1) % 3]].sort((a, b) => a - b).join(","),
      ) ?? []) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          queue.push(neighbor);
        }
      }
  }
  if (seen.size !== triangles.length)
    throw new Error("Ramp UV strip is disconnected.");
  return result;
}

function quadTriangles(p: V3[]): number[][] | undefined {
  for (const tris of [
    [
      [0, 1, 2],
      [0, 2, 3],
    ],
    [
      [0, 1, 3],
      [1, 2, 3],
    ],
  ])
    if (tris.every(([a, b, c]) => orient(p[a], p[b], p[c]) > 1e-12))
      return tris;
}

function meshBuilder() {
  const points: V3[] = [],
    triangles: number[][] = [],
    ids = new Map<string, number>();
  const vertex = (p: V3) => {
    const key = p.join(",");
    let id = ids.get(key);
    if (id === undefined) {
      id = points.length;
      ids.set(key, id);
      points.push(p);
    }
    return id;
  };
  const face = (p: V3[], tris: number[][]) => {
    const index = p.map(vertex);
    triangles.push(...tris.map((t) => t.map((i) => index[i])));
  };
  const polygon = (p: V3[]) => {
    // A center fan preserves collinear boundary stations at stair risers.
    const center = p.reduce(
      (s, v) => s.map((a, i) => a + v[i] / p.length) as V3,
      [0, 0, 0] as V3,
    );
    face(
      [...p, center],
      p.map((_, i) => [i, (i + 1) % p.length, p.length]),
    );
  };
  return {
    points,
    triangles,
    face,
    polygon,
    quad: (p: V3[]) =>
      face(p, [
        [0, 1, 2],
        [0, 2, 3],
      ]),
  };
}
