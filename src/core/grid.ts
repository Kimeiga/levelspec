/**
 * Integer-grid helpers.
 *
 * Everything upstream of geometry happens on an exact integer lattice, so
 * "almost but not exactly the same wall" is not representable.
 */

import type { Cell, Rect } from './types.ts';

export const key = (x: number, y: number): string => `${x},${y}`;
export const unkey = (k: string): Cell => {
  const i = k.indexOf(',');
  return [Number(k.slice(0, i)), Number(k.slice(i + 1))];
};

export function* rectCells(rect: Rect): Generator<Cell> {
  const [x, y, w, d] = rect;
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) yield [x + i, y + j];
}

export function rectContains(rect: Rect, x: number, y: number): boolean {
  return x >= rect[0] && x < rect[0] + rect[2] && y >= rect[1] && y < rect[1] + rect[3];
}

export class CellSet {
  private s = new Set<string>();

  add(x: number, y: number): void {
    this.s.add(key(x, y));
  }
  addRect(rect: Rect): void {
    for (const [x, y] of rectCells(rect)) this.add(x, y);
  }
  delete(x: number, y: number): void {
    this.s.delete(key(x, y));
  }
  deleteRect(rect: Rect): void {
    for (const [x, y] of rectCells(rect)) this.delete(x, y);
  }
  has(x: number, y: number): boolean {
    return this.s.has(key(x, y));
  }
  get size(): number {
    return this.s.size;
  }
  *cells(): Generator<Cell> {
    for (const k of this.s) yield unkey(k);
  }
  keys(): Iterable<string> {
    return this.s;
  }
  clone(): CellSet {
    const c = new CellSet();
    for (const k of this.s) c.s.add(k);
    return c;
  }
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(cells: Iterable<string>): Bounds {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const k of cells) {
    const [x, y] = unkey(k);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: -1, maxY: -1 };
  return { minX, minY, maxX, maxY };
}

/**
 * Greedy maximal-rectangle decomposition of a cell set.
 *
 * A floor slab emitted as one box per cell would produce thousands of
 * coincident internal faces. Decomposing first is what makes the compiled
 * output free of the duplicate-surface class of error.
 */
export function decomposeToRects(cells: Iterable<string>): Rect[] {
  const remaining = new Set(cells);
  if (remaining.size === 0) return [];
  const b = boundsOf(remaining);
  const rects: Rect[] = [];

  for (let y = b.minY; y <= b.maxY; y++) {
    for (let x = b.minX; x <= b.maxX; x++) {
      if (!remaining.has(key(x, y))) continue;
      // Extend right as far as possible.
      let w = 1;
      while (remaining.has(key(x + w, y))) w++;
      // Extend down while the full row segment is available.
      let d = 1;
      outer: while (true) {
        for (let i = 0; i < w; i++) {
          if (!remaining.has(key(x + i, y + d))) break outer;
        }
        d++;
      }
      for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) remaining.delete(key(x + i, y + j));
      rects.push([x, y, w, d]);
    }
  }
  return rects;
}

/** 4-connected components of a cell set. */
export function components(cells: Iterable<string>): string[][] {
  const remaining = new Set(cells);
  const out: string[][] = [];
  while (remaining.size) {
    const seed = remaining.values().next().value as string;
    const stack = [seed];
    remaining.delete(seed);
    const comp: string[] = [];
    while (stack.length) {
      const k = stack.pop()!;
      comp.push(k);
      const [x, y] = unkey(k);
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ] as Cell[]) {
        const nk = key(nx, ny);
        if (remaining.has(nk)) {
          remaining.delete(nk);
          stack.push(nk);
        }
      }
    }
    out.push(comp);
  }
  return out;
}

/**
 * Every cell a straight line touches, centre to centre.
 *
 * A supercover walk, which is not the same as Bresenham: where the line runs
 * exactly through a lattice corner it touches *both* cells that share that
 * corner, and a wall standing in either one of them stops the shot. The
 * previous implementation was labelled supercover and was in fact an ordinary
 * 8-connected Bresenham with an `else if`, so it picked one of the two and
 * reported a clear sightline through the other — a false clear, in the one
 * function whose entire job is to find blockers.
 *
 * Amanatides and Woo's grid traversal: step whichever axis reaches its next
 * boundary first, and when they arrive together take both.
 */
export function lineCells(x0: number, y0: number, x1: number, y1: number): Cell[] {
  const out: Cell[] = [[x0, y0]];
  if (x0 === x1 && y0 === y1) return out;

  const dx = x1 - x0;
  const dy = y1 - y0;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  // Parametric distance along the segment: one whole cell on each axis, and
  // half of one to reach the first boundary out of the starting centre.
  const spanX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const spanY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  let nextX = spanX / 2;
  let nextY = spanY / 2;

  let x = x0;
  let y = y0;
  // Manhattan distance is exactly how many single steps this takes; the
  // corner case takes two cells at a time and so only ever comes in under it.
  const limit = Math.abs(dx) + Math.abs(dy) + 2;
  for (let guard = 0; x !== x1 || y !== y1; guard++) {
    if (guard > limit) {
      throw new Error(`lineCells did not terminate walking ${x0},${y0} -> ${x1},${y1}`);
    }
    if (stepX !== 0 && stepY !== 0 && Math.abs(nextX - nextY) < 1e-9) {
      // Straight through the corner. Both cells that share it are touched.
      out.push([x + stepX, y], [x, y + stepY]);
      x += stepX;
      y += stepY;
      nextX += spanX;
      nextY += spanY;
    } else if (nextX < nextY) {
      x += stepX;
      nextX += spanX;
    } else {
      y += stepY;
      nextY += spanY;
    }
    out.push([x, y]);
  }
  return out;
}
