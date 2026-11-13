/**
 * Fraction of a periodic solid interval covered by a footprint centered at position.
 * All dimensions use meters; period and footprint are positive, and halfGap is in [0, period / 2].
 */
export function tileCoverage(position: number, period: number, halfGap: number, footprint: number): number {
  const radius = footprint / 2;
  const solid = (at: number) => {
    const cycle = Math.floor(at / period), local = at - cycle * period;
    return cycle * (period - 2 * halfGap) + Math.max(0, Math.min(period - 2 * halfGap, local - halfGap));
  };
  return Math.max(0, Math.min(1, (solid(position + radius) - solid(position - radius)) / footprint));
}
