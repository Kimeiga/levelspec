import type { Rect, VerticalConnectionSpec } from './types.ts';

function connectionDirection(vc: VerticalConnectionSpec) {
  if (vc.direction) return vc.direction;
  const dx = vc.to_cell[0] - vc.from_cell[0], dy = vc.to_cell[1] - vc.from_cell[1];
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx > 0 ? 'E' : 'W';
  if (dy !== 0) return dy > 0 ? 'N' : 'S';
  return null;
}

/** One footprint definition for geometry, punched slabs and automatic markers. */
export function verticalFootprint(vc: VerticalConnectionSpec, grid: number): { footprint: Rect; direction: 'N' | 'S' | 'E' | 'W' | null } | undefined {
  if (vc.kind !== 'stairs' && vc.kind !== 'ramp') {
    const [w, h] = vc.size_cells ?? [1, 1];
    return { footprint: [vc.from_cell[0], vc.from_cell[1], w, h], direction: null };
  }
  const dx = vc.to_cell[0] - vc.from_cell[0], dy = vc.to_cell[1] - vc.from_cell[1];
  const direction = connectionDirection(vc);
  if (!direction) return undefined;
  const width = Math.max(1, Math.round((vc.width ?? 1.6) / grid)),
    run = Math.max(1, Math.abs(direction === 'E' || direction === 'W' ? dx : dy) + 1),
    half = Math.floor((width - 1) / 2), [x, y] = vc.from_cell;
  const footprint: Rect = direction === 'E' ? [x, y - half, run, width]
    : direction === 'W' ? [x - run + 1, y - half, run, width]
    : direction === 'N' ? [x - half, y, width, run]
    : [x - half, y - run + 1, width, run];
  return { footprint, direction };
}
