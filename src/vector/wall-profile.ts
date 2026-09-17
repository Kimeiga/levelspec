import type { Edge, FloorPatch, LevelDocument, V3 } from "./types.ts";
import { EPS, heightAt, orient, pathAt, pathLength } from "./geometry.ts";

/** Continue the supporting floor plane across a wall's thickness. The source
 * path remains the height/UV guide; only the solid's contact foot is fitted.
 * Extrapolation outside a boundary is necessary because walls straddle it. */
export function wallFootHeight(
  floor: FloorPatch,
  center: V3,
  point: V3,
): number | undefined {
  const anchored = heightAt(floor, center[0], center[1]);
  if (anchored === undefined || Math.abs(anchored - center[2]) > 0.001 + EPS)
    return;
  const inside = heightAt(floor, point[0], point[1]);
  if (inside !== undefined) return inside;
  for (const triangle of floor.triangles) {
    const [a, b, c] = triangle.map((i) => floor.points[i]);
    const denominator = orient(a, b, c);
    if (Math.abs(denominator) < EPS) continue;
    const weights = (p: V3) => [
      orient(p, b, c) / denominator,
      orient(a, p, c) / denominator,
      orient(a, b, p) / denominator,
    ];
    if (weights(center).some((weight) => weight < -EPS)) continue;
    const [u, v, w] = weights(point);
    return u * a[2] + v * b[2] + w * c[2];
  }
}

/** Resolve floor-relative wall heights without changing floor boundary vertices. */
export function resolveWallProfile(
  edge: Edge,
  path: V3[],
  floors: FloorPatch[],
  document: LevelDocument,
): { path: V3[]; top?: V3[] } | undefined {
  if (!edge.baseFloor && !edge.topFloor && !edge.spanFloors) return;
  if (edge.kind === "open")
    throw new Error("Floor anchors apply to walls, not open edges.");
  if (edge.topFloor && !edge.spanFloors)
    throw new Error('top-floor requires span-floors="true".');
  if (edge.spanFloors && edge.height !== undefined)
    throw new Error(
      "Choose span-floors or a fixed height; do not specify both.",
    );
  const regions = new Map(
    document.layers.flatMap((l) => l.regions).map((r) => [r.id, r]),
  );
  const candidates = floors.filter((f) =>
    ["floor", "ramp"].includes(regions.get(f.region)?.fill ?? ""),
  );
  const named = (id: string | undefined) => {
    if (!id) return;
    const f = candidates.find((f) => f.region === id);
    if (!f)
      throw new Error(
        `Unknown floor region ${id}; anchors require a floor fill.`,
      );
    return f;
  };
  let base = named(edge.baseFloor),
    top = named(edge.topFloor);
  // Split at every crossed triangle/boundary, including holes. Sampling just the
  // endpoints would miss an unsupported middle or a change in a creased ramp.
  const distances = [0];
  let length = 0;
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1],
      b = path[k],
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      n = Math.hypot(dx, dy);
    for (const f of candidates)
      for (const tri of f.triangles)
        for (let j = 0; j < 3; j++) {
          const c = f.points[tri[j]],
            d = f.points[tri[(j + 1) % 3]];
          const ex = d[0] - c[0],
            ey = d[1] - c[1],
            det = dx * ey - dy * ex;
          if (Math.abs(det) > EPS) {
            const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / det;
            const u = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / det;
            if (t > EPS && t < 1 - EPS && u >= -EPS && u <= 1 + EPS)
              distances.push(length + t * n);
          } else if (Math.abs((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) < EPS) {
            for (const p of [c, d]) {
              const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (n * n);
              if (t > EPS && t < 1 - EPS) distances.push(length + t * n);
            }
          }
        }
    length += n;
    distances.push(length);
  }
  distances.sort((a, b) => a - b);
  const stations = distances.filter((s, i) => !i || s - distances[i - 1] > EPS);
  if (stations.length < 2 || pathLength(path) < EPS)
    throw new Error("Wall path has no length.");
  const seed = pathAt(path, (stations[0] + stations[1]) / 2);
  const hits = candidates
    .map((f) => ({ f, z: heightAt(f, seed[0], seed[1]) }))
    .filter((h) => h.z !== undefined)
    .sort((a, b) => a.z! - b.z!);
  if (edge.spanFloors) {
    if (!base && !top) {
      if (hits.length !== 2)
        throw new Error(
          "span-floors needs exactly two overlapping floors; specify base-floor and top-floor when ambiguous.",
        );
      [base, top] = hits.map((h) => h.f);
    } else if (!base) {
      const z = heightAt(top!, seed[0], seed[1]);
      const below = hits.filter((h) => h.z! < (z ?? -Infinity) - EPS);
      if (below.length !== 1)
        throw new Error(
          "Cannot select a unique lower floor; specify base-floor.",
        );
      base = below[0].f;
    } else if (!top) {
      const z = heightAt(base, seed[0], seed[1]);
      const above = hits.filter((h) => h.z! > (z ?? Infinity) + EPS);
      if (above.length !== 1)
        throw new Error(
          "Cannot select a unique upper floor; specify top-floor.",
        );
      top = above[0].f;
    }
  }
  if (!base)
    throw new Error("A fixed-height anchored wall requires base-floor.");
  const sample = (s: number): [V3, V3?] => {
    const p = pathAt(path, s),
      lower = heightAt(base!, p[0], p[1]);
    if (lower === undefined)
      throw new Error(
        `Wall leaves base-floor ${base!.region}. Split the edge at the floor boundary.`,
      );
    const bottom: V3 = [p[0], p[1], lower];
    if (!top) return [bottom];
    const upper = heightAt(top, p[0], p[1]);
    if (upper === undefined)
      throw new Error(
        `Wall leaves top-floor ${top.region}. Split the edge at the floor boundary.`,
      );
    const underside =
      upper - (regions.get(top.region)!.thickness ?? document.floorThickness);
    if (underside <= lower + EPS)
      throw new Error(
        "The upper floor underside must be above the base floor along the entire wall.",
      );
    return [bottom, [p[0], p[1], underside]];
  };
  // Midpoints ensure an edge across a courtyard hole cannot bridge missing support.
  for (let i = 1; i < stations.length; i++) {
    const s = (stations[i - 1] + stations[i]) / 2;
    sample(s);
    if (edge.spanFloors && (!edge.baseFloor || !edge.topFloor)) {
      const p = pathAt(path, s),
        low = heightAt(base, p[0], p[1])!,
        high = heightAt(top!, p[0], p[1])!;
      const overlaps = candidates
        .map((f) => ({ f, z: heightAt(f, p[0], p[1]) }))
        .filter((h) => h.z !== undefined);
      const ambiguous =
        !edge.baseFloor && !edge.topFloor
          ? overlaps.length !== 2
          : !edge.topFloor
            ? overlaps.filter((h) => h.z! > low + EPS).length !== 1
            : overlaps.filter((h) => h.z! < high - EPS).length !== 1;
      if (ambiguous)
        throw new Error(
          "Floor selection becomes ambiguous along the wall; specify base-floor and top-floor.",
        );
    }
  }
  const values = stations.map(sample);
  return {
    path: values.map((v) => v[0]),
    top: top ? values.map((v) => v[1]!) : undefined,
  };
}
