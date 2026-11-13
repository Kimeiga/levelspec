import {
  area,
  intersection,
  pathLength,
  cross,
  sub,
  dot,
} from "../vector/geometry.ts";
import { aborted, type V3 } from "../vector/types.ts";
import type { AssetGeometry } from "../vector/props.ts";
import { surfaceSolid, transform, type ResolvedProfile } from "./geometry.ts";
import type { ArchitectureResolution, ResolvedElement } from "./resolve.ts";
import type { Flight } from "./types.ts";

/** Native flight construction retains authored side direction and separate physical pieces. */
export interface ResolvedFlight {
  rails: [V3[], V3[]];
  floor: ResolvedProfile;
  guide: ResolvedProfile;
  solids: AssetGeometry[];
  segments: {
    left: [V3, V3];
    right: [V3, V3];
    guideLeft: [V3, V3];
    guideRight: [V3, V3];
  }[];
}

/** Returns normalized plan stations without changing authored height samples. */
function stations(path: V3[]): number[] {
  const length = pathLength(path);
  if (length <= 1e-8)
    throw new Error("Flight rails require nonzero plan length.");
  let distance = 0;
  return path.map((point, i) => {
    if (i)
      distance += Math.hypot(
        point[0] - path[i - 1][0],
        point[1] - path[i - 1][1],
      );
    return distance / length;
  });
}

/** Finds the first station at or above a value in logarithmic time. */
function stationIndex(values: number[], value: number): number {
  let low = 0,
    high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (values[middle] < value - 1e-10) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Samples a rail using its shared longitudinal parameter without rescanning the path. */
function sampleRail(rail: V3[], fractions: number[], u: number): V3 {
  const i = stationIndex(fractions, u);
  if (i <= 0 || i === rail.length)
    return [...rail[i === rail.length ? i - 1 : 0]];
  const fraction = (u - fractions[i - 1]) / (fractions[i] - fractions[i - 1]);
  return rail[i - 1].map((n, axis) => n + fraction * (rail[i][axis] - n)) as V3;
}

/** Creates a bounded evaluator for ordered distance/elevation profiles, including vertical steps. */
export function profileSampler(
  profile: V3[],
): (station: number, side: "before" | "after") => number {
  const coordinates = profile.map((p) => p[0]);
  return (station, side) => {
    const i = stationIndex(coordinates, station);
    if (i < profile.length && Math.abs(profile[i][0] - station) < 1e-8) {
      if (side === "before") return profile[i][1];
      let low = i,
        high = profile.length;
      while (low + 1 < high) {
        const middle = (low + high) >>> 1;
        if (Math.abs(profile[middle][0] - station) < 1e-8) low = middle;
        else high = middle;
      }
      return profile[low][1];
    }
    if (i <= 0 || i >= profile.length)
      throw new Error(
        "Longitudinal profile does not cover this flight station.",
      );
    const a = profile[i - 1],
      b = profile[i];
    return a[1] + ((b[1] - a[1]) * (station - a[0])) / (b[0] - a[0]);
  };
}

/** Creates directed rails and keeps width offsets in the local authored frame. */
function flightRails(
  flight: Flight,
  resolution: ArchitectureResolution,
  triangleBudget: number,
  signal?: AbortSignal,
): { rails: [V3[], V3[]]; fractions: [number[], number[]]; length: number } {
  const get = (id: string) => {
    const points = resolution.paths.get(id);
    if (!points) throw new Error(`Unknown flight path ${id}.`);
    if (points.length * 24 > triangleBudget)
      throw new Error("Flight station budget exceeded before allocation.");
    aborted(signal);
    return points;
  };
  if (
    flight.left &&
    flight.right &&
    !flight.path &&
    flight.width === undefined &&
    !flight.widthProfile
  ) {
    const left = get(flight.left),
      right = get(flight.right);
    return {
      rails: [left, right],
      fractions: [stations(left), stations(right)],
      length: (pathLength(left) + pathLength(right)) / 2,
    };
  }
  if (
    !flight.path ||
    flight.left ||
    flight.right ||
    (flight.width === undefined) === !flight.widthProfile
  )
    throw new Error(
      "Choose center path with width or width-profile, or two explicit rails.",
    );
  const path = get(flight.path),
    length = pathLength(path),
    fractions = stations(path);
  const widths = flight.widthProfile ? get(flight.widthProfile) : undefined;
  if (
    widths &&
    (Math.abs(widths[0][0]) > 1e-8 ||
      Math.abs(widths.at(-1)![0] - length) > 1e-7 ||
      widths.some((p, i) => p[1] <= 0 || (i > 0 && p[0] <= widths[i - 1][0])))
  )
    throw new Error(
      "Width profile must cover the flight with increasing distance and positive widths.",
    );
  const widthAt = widths ? profileSampler(widths) : undefined;
  const left: V3[] = [],
    right: V3[] = [];
  let cuts = [
    ...new Set([
      ...fractions.map((u) => u * length),
      ...(widths?.map((p) => p[0]) ?? []),
    ]),
  ].sort((a, b) => a - b);
  if (cuts.length * 24 > triangleBudget)
    throw new Error("Flight station budget exceeded before allocation.");
  for (const distance of cuts) {
    aborted(signal);
    const point = sampleRail(path, fractions, distance / length),
      index = stationIndex(fractions, distance / length);
    const i = Math.max(1, index),
      j = Math.min(path.length - 1, index + 1);
    const normal = (a: V3, b: V3): V3 => {
      const run = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (run <= 1e-8)
        throw new Error(
          "Flight path contains a vertical or zero-length segment.",
        );
      return [-(b[1] - a[1]) / run, (b[0] - a[0]) / run, 0];
    };
    const before = normal(path[i - 1], path[i]),
      atCorner =
        index > 0 &&
        index < path.length - 1 &&
        Math.abs(fractions[index] * length - distance) < 1e-8;
    const after = atCorner ? normal(path[j - 1], path[j]) : before;
    const denominator = 1 + before[0] * after[0] + before[1] * after[1];
    if (denominator < 0.1)
      throw new Error(
        "Flight path reverses or turns too sharply for offset rails.",
      );
    const width = widthAt ? widthAt(distance, "after") : flight.width!;
    if (!Number.isFinite(width) || width <= 0)
      throw new Error("Flight width must be finite and positive.");
    const offset = before.map(
      (n, axis) => (((n + after[axis]) / denominator) * width) / 2,
    );
    left.push(point.map((n, axis) => n + offset[axis]) as V3);
    right.push(point.map((n, axis) => n - offset[axis]) as V3);
  }
  return {
    rails: [left, right],
    fractions: [cuts.map((s) => s / length), cuts.map((s) => s / length)],
    length,
  };
}

/** Builds native treads and independent undersides locally, then applies one full placement. */
export function resolveFlight(
  node: ResolvedElement,
  flight: Flight,
  resolution: ArchitectureResolution,
  triangleBudget: number,
  signal?: AbortSignal,
): ResolvedFlight {
  const resolved = flightRails(flight, resolution, triangleBudget, signal),
    [left, right] = resolved.rails,
    [ls, rs] = resolved.fractions;
  const matrix = node.matrix,
    isStair = flight.kind === "stairs";
  if (
    isStair &&
    (Math.abs(matrix.elements[2]) > 1e-8 ||
      Math.abs(matrix.elements[6]) > 1e-8 ||
      matrix.elements[10] <= 0)
  )
    throw new Error(
      "Stair placement must preserve horizontal tread planes and upward local Z.",
    );
  const start = left[0][2],
    end = left.at(-1)![2],
    rise = Math.abs(end - start);
  if (
    Math.abs(right[0][2] - start) > 1e-7 ||
    Math.abs(right.at(-1)![2] - end) > 1e-7
  )
    throw new Error("Flight rails must share landing elevations.");
  if (!Number.isFinite(flight.thickness) || flight.thickness <= 0)
    throw new Error("Flight thickness must be positive.");
  if (
    !isStair &&
    (flight.count !== undefined || flight.maximumRiser !== undefined)
  )
    throw new Error("Ramp does not accept stair count or maximum-riser.");
  if (flight.count !== undefined && flight.maximumRiser !== undefined)
    throw new Error("Choose an exact stair count or maximum-riser, not both.");
  const maximum = flight.maximumRiser ?? 0.18;
  if (isStair && (!Number.isFinite(maximum) || maximum <= 0 || rise <= 1e-8))
    throw new Error("Stairs require nonzero rise and positive maximum-riser.");
  const count = isStair
    ? (flight.count ?? Math.ceil((rise * matrix.elements[10]) / maximum - 1e-9))
    : 1;
  if (!Number.isInteger(count) || count < 1 || count > 10000)
    throw new Error("Stair count must be an integer between one and 10000.");
  if (
    isStair &&
    flight.underside === "stepped" &&
    flight.thickness <= rise / count + 1e-8
  )
    throw new Error(
      "Stepped thickness must exceed the equalized riser to retain positive overlap.",
    );
  const centerLength = resolved.length;
  const underside = flight.undersideProfile
    ? resolution.paths.get(flight.undersideProfile)
    : undefined;
  if ((flight.underside === "custom") !== !!flight.undersideProfile)
    throw new Error(
      "Custom underside requires its own complete longitudinal profile.",
    );
  if (
    flight.underside === "custom" &&
    (!underside ||
      Math.abs(underside[0][0]) > 1e-8 ||
      Math.abs(underside.at(-1)![0] - centerLength) > 1e-7 ||
      underside.some((p, i) => i > 0 && p[0] < underside[i - 1][0]))
  )
    throw new Error(
      "Underside profile must cover the complete flight in ordered stations.",
    );
  const undersideAt = underside ? profileSampler(underside) : undefined;
  let cuts = [
    ...new Set([
      ...ls,
      ...rs,
      ...Array.from({ length: count + 1 }, (_, i) => i / count),
      ...(underside?.map((p) => p[0] / centerLength) ?? []),
    ]),
  ]
    .sort((a, b) => a - b)
    .filter((u, i, all) => !i || u - all[i - 1] > 1e-10);
  if (!isStair) {
    const refined = [cuts[0]];
    for (let i = 1; i < cuts.length; i++) {
      const u = cuts[i - 1],
        v = cuts[i];
      const corners = [
        sampleRail(left, ls, u),
        sampleRail(right, rs, u),
        sampleRail(right, rs, v),
        sampleRail(left, ls, v),
      ];
      const normal = cross(
        sub(corners[1], corners[0]),
        sub(corners[2], corners[0]),
      );
      const planar =
        Math.abs(dot(normal, sub(corners[3], corners[0]))) <=
        1e-10 * Math.max(1, Math.hypot(...normal));
      const elevations = corners.map((point) => point[2]);
      // A triangle can interpolate anywhere within its cross-section elevations.
      // Bound that vertical range independently of the rails' plan approximation.
      const subdivisions = planar
        ? 1
        : Math.max(
            1,
            Math.ceil(
              (Math.max(...elevations) - Math.min(...elevations)) /
                resolution.document.curveTolerance,
            ),
          );
      if ((refined.length + subdivisions) * 24 > triangleBudget)
        throw new Error("Flight triangle budget exceeded before allocation.");
      for (let j = 1; j <= subdivisions; j++)
        refined.push(u + ((v - u) * j) / subdivisions);
    }
    cuts = refined;
  }
  if ((cuts.length - 1) * 24 > triangleBudget)
    throw new Error("Flight triangle budget exceeded before allocation.");
  const loop = [...left, ...right.toReversed()];
  let checks = 0;
  for (let i = 0; i < loop.length; i++)
    for (let j = i + 1; j < loop.length; j++) {
      aborted(signal);
      if (++checks > triangleBudget * 8)
        throw new Error("Flight intersection budget exceeded.");
      if (
        intersection(
          loop[i],
          loop[(i + 1) % loop.length],
          loop[j],
          loop[(j + 1) % loop.length],
        )
      )
        throw new Error("Flight rails cross or overlap.");
    }
  const guide: ResolvedProfile = {
    points: [],
    triangles: [],
    loops: [loop.map((p) => transform(p, matrix))],
  };
  const floor: ResolvedProfile = {
      points: [],
      triangles: [],
      loops: [loop.map((p) => transform(p, matrix))],
    },
    solids: AssetGeometry[] = [];
  const segments: ResolvedFlight["segments"] = [];
  let totalArea = 0;
  for (let i = 1; i < cuts.length; i++) {
    aborted(signal);
    const u = cuts[i - 1],
      v = cuts[i],
      l0 = sampleRail(left, ls, u),
      r0 = sampleRail(right, rs, u),
      l1 = sampleRail(left, ls, v),
      r1 = sampleRail(right, rs, v);
    const step = Math.min(count - 1, Math.floor(((u + v) / 2) * count));
    const height =
      end > start
        ? start + ((step + 1) * rise) / count
        : start - (step * rise) / count;
    let points: V3[] = [l0, r0, r1, l1].map((p) => [
      p[0],
      p[1],
      isStair ? height : p[2],
    ]);
    if (area(points) < 0) points = points.toReversed();
    const positive = (a: V3, b: V3, c: V3) =>
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 1e-12;
    const choices: [number, number, number][][] = [
      [
        [0, 1, 2],
        [0, 2, 3],
      ],
      [
        [0, 1, 3],
        [1, 2, 3],
      ],
    ];
    const triangles = choices.find((triangles) =>
      triangles.every((t) =>
        positive(points[t[0]], points[t[1]], points[t[2]]),
      ),
    );
    if (!triangles)
      throw new Error("Flight cross-sections fold or have zero width.");
    totalArea += area(points);
    const profile: ResolvedProfile = { points, triangles, loops: [points] };
    const geometry = surfaceSolid(profile, (p) => {
      const atEnd =
        Math.hypot(p[0] - l1[0], p[1] - l1[1]) < 1e-7 ||
        Math.hypot(p[0] - r1[0], p[1] - r1[1]) < 1e-7;
      const fraction = atEnd ? v : u;
      let z = p[2] - flight.thickness;
      if (isStair && flight.underside === "filled")
        z = Math.min(start, end) - flight.thickness;
      if (isStair && flight.underside === "sloped")
        z =
          [l0, r0, l1, r1].find(
            (q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-7,
          )![2] - flight.thickness;
      if (undersideAt)
        z = undersideAt(fraction * centerLength, atEnd ? "before" : "after");
      if (z >= p[2] - 1e-8)
        throw new Error(
          `Underside intersects a walking top at station ${(fraction * centerLength).toFixed(3)} m.`,
        );
      return [p[0], p[1], z];
    });
    geometry.positions = geometry.positions.map((p) => transform(p, matrix));
    if (matrix.determinant() < 0)
      geometry.triangles = geometry.triangles.map(([a, b, c]) => [c, b, a]);
    solids.push(geometry);
    const placed = (p: V3): V3 =>
      transform([p[0], p[1], isStair ? height : p[2]], matrix);
    segments.push({
      left: [placed(l0), placed(l1)],
      right: [placed(r0), placed(r1)],
      guideLeft: [transform(l0, matrix), transform(l1, matrix)],
      guideRight: [transform(r0, matrix), transform(r1, matrix)],
    });
    let guidePoints = [l0, r0, r1, l1];
    if (area(guidePoints) < 0) guidePoints = guidePoints.toReversed();
    const guideBase = guide.points.length;
    guide.points.push(...guidePoints.map((p) => transform(p, matrix)));
    guide.triangles.push(
      ...triangles.map(([a, b, c]): [number, number, number] =>
        matrix.determinant() < 0
          ? [guideBase + c, guideBase + b, guideBase + a]
          : [guideBase + a, guideBase + b, guideBase + c],
      ),
    );
    const base = floor.points.length;
    floor.points.push(...points.map((p) => transform(p, matrix)));
    floor.triangles.push(
      ...triangles.map(([a, b, c]): [number, number, number] =>
        matrix.determinant() < 0
          ? [base + c, base + b, base + a]
          : [base + a, base + b, base + c],
      ),
    );
  }
  if (
    Math.abs(totalArea - Math.abs(area(loop))) >
    Math.max(1e-6, totalArea * 1e-8)
  )
    throw new Error(
      "Flight sections overlap or fail to cover their footprint.",
    );
  return {
    rails: [
      left.map((p) => transform(p, matrix)),
      right.map((p) => transform(p, matrix)),
    ],
    floor,
    guide,
    solids,
    segments,
  };
}
