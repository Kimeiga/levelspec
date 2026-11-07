/** Parses the optional horizontal navigation grid size exposed by review tools, in meters. */
export function parseNavigationCell(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const cell = Number(value);
  if (!value.trim() || !Number.isFinite(cell) || cell < 0.025 || cell > 0.5) {
    throw new Error("nav-cell must be a number from 0.025 to 0.5 meters.");
  }
  return cell;
}
