/** Authored linear dimensions use a millimetre lattice; derived mesh values do not. */
export const COORDINATE_STEP = 0.001;
/** Reject nonfinite or unsupported coordinate magnitudes without reducing precision. */
export function validateCoordinate(value: number): void {
  if (!Number.isFinite(value))
    throw new RangeError("Coordinates must be finite.");
  if (Math.abs(value) * 1000 > Number.MAX_SAFE_INTEGER - 1)
    throw new RangeError("Coordinate exceeds the safe millimetre range.");
}
export function millimetres(value: number): number {
  validateCoordinate(value);
  const scaled = Math.abs(value) * 1000;
  // Symmetric half-away-from-zero, including decimal ties represented just below .5.
  const units = Math.floor(scaled + 0.5 + Number.EPSILON * Math.max(1, scaled));
  return units === 0 ? 0 : Math.sign(value) * units;
}
export const snapCoordinate = (value: number) => millimetres(value) / 1000;
export const coordinateKey = (point: readonly number[]) =>
  point.map(millimetres).join(",");
export const sameCoordinate = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length &&
  a.every((v, i) => millimetres(v) === millimetres(b[i]));
