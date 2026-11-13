/**
 * Clips a convex polygon to the side where `level` is not negative. Vertices
 * are attribute vectors (position, color or anything else that varies
 * linearly); every attribute is interpolated where an edge crosses zero, so
 * the two halves of a surface split by one field share their cut vertices.
 * The input is not modified and its vertices are reused, not copied.
 */
export function clipByLevel(
  polygon: number[][],
  level: (vertex: number[]) => number,
): number[][] {
  const kept: number[][] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i],
      b = polygon[(i + 1) % polygon.length];
    const la = level(a),
      lb = level(b);
    if (la >= 0) kept.push(a);
    if (la >= 0 !== lb >= 0) {
      const t = la / (la - lb);
      kept.push(a.map((value, k) => value + t * (b[k] - value)));
    }
  }
  return kept.length >= 3 ? kept : [];
}

/** Positions closer together than this are one position, meters: no cut leaves a thinner strip. */
const CLOSEST_CUTS = 1e-3;

/**
 * Returns sorted cut positions from `lo` to `hi` that pass through the marks
 * inside the interval and divide each stretch between marks evenly. `step`
 * gives the largest spacing allowed in a stretch and is asked once per
 * stretch, at its middle. Marks keep material boundaries exact; the step
 * bounds how coarsely a field is sampled. A mark within a millimeter of an
 * end or of the mark before it is dropped, so no two positions are closer
 * than that.
 */
export function cutPositions(
  lo: number,
  hi: number,
  marks: number[],
  step: (position: number) => number,
): number[] {
  const fixed = [lo];
  for (const mark of [...marks].sort((a, b) => a - b))
    if (mark - fixed.at(-1)! >= CLOSEST_CUTS && hi - mark >= CLOSEST_CUTS)
      fixed.push(mark);
  fixed.push(hi);
  const result = [lo];
  for (let i = 1; i < fixed.length; i++) {
    const from = fixed[i - 1],
      span = fixed[i] - from;
    const pieces = Math.max(1, Math.ceil(span / step(from + span / 2) - 1e-9));
    for (let piece = 1; piece < pieces; piece++)
      result.push(from + (span * piece) / pieces);
    result.push(fixed[i]);
  }
  return result;
}
