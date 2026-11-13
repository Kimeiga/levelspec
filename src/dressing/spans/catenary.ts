import type { V3 } from "../../architecture/types.ts";

/**
 * Samples a uniform line hanging under its own weight between two supports.
 * The line is `1 + slack` times as long as the straight chord, so 0 keeps it
 * taut and 0.03 is a visibly sagging cable. Points are world meters with Z up,
 * evenly spaced in plan from `from` to `to` inclusive. A taut line, and one
 * rising more than twenty times its plan length, is returned straight.
 */
export function hangingCurve(
  from: V3,
  to: V3,
  slack: number,
  segments: number,
): V3[] {
  const run = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const rise = to[2] - from[2];
  const length = Math.hypot(run, rise) * (1 + Math.max(0, slack));
  // The catenary z = k·cosh((x − low) / k) + base satisfies sinh(u)/u = ratio, u = run / 2k.
  const ratio = run > 1e-6 ? Math.sqrt(length * length - rise * rise) / run : 1;
  // A near-vertical line has no meaningful sag, and its catenary overflows the solver.
  const straight = ratio - 1 < 1e-9 || run < 0.05 * Math.abs(rise);
  let scale = 0,
    low = 0,
    base = 0;
  if (!straight) {
    // Newton's method from above the root of a convex function converges monotonically.
    let u = Math.sqrt(6 * (ratio - 1));
    for (let i = 0; i < 12; i++)
      u -= (Math.sinh(u) - ratio * u) / (Math.cosh(u) - ratio);
    scale = run / (2 * u);
    low = run / 2 - scale * Math.atanh(rise / length);
    base = from[2] - scale * Math.cosh(low / scale);
  }
  const points: V3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push([
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      straight
        ? from[2] + rise * t
        : scale * Math.cosh((run * t - low) / scale) + base,
    ]);
  }
  // The closed form drifts by rounding at the far support; both ends are exact supports.
  points[0] = [...from];
  points[segments] = [...to];
  return points;
}
