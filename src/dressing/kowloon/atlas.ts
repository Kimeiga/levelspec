/** The cloth and air conditioner atlases each hold 8 by 4 cells, numbered row by row from the top left. */
const COLUMNS = 8;
const ROWS = 4;
/** Samples keep this fraction of a cell away from its border so neighbors never bleed in. */
const INSET = 0.014;

/**
 * Maps a point of a prop atlas cell to texture coordinates. `s` and `t` are
 * measured right and down from the cell's top left in 0..1; points within
 * INSET of the border sample the texel line just inside it.
 */
export function atlasPoint(cell: number, s: number, t: number): number[] {
  /** Keeps a cell fraction clear of the border. */
  const inside = (value: number) => Math.min(1 - INSET, Math.max(INSET, value));
  return [((cell % COLUMNS) + inside(s)) / COLUMNS, 1 - (Math.floor(cell / COLUMNS) + inside(t)) / ROWS];
}
