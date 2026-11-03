import type { Box, Solid } from './types.ts';
import { FACE_TOLERANCE } from './contact.ts';
import { repairBandRectangles } from './flight-rectangles.ts';

const EPS = 1e-6;
const WALL_ROLES = new Set(['static_hard', 'exterior_wall', 'riser', 'sill', 'lintel']);
const copyBox = (b: Box): Box => ({ min: [...b.min], max: [...b.max] });

interface FlightBands {
  id: string;
  layer: string;
  axis: 0 | 1;
  bounds: Box;
  wallThickness: number;
}

/** Keep adjacent pieces with identical sections as one solid, including guards. */
export function appendFlightBox(solids: Solid[], sections: Map<string, Solid>, solid: Solid, axis: 0 | 1): void {
  const b = solid.box, perp = 1 - axis;
  const section = [solid.role, b.min[perp], b.max[perp], b.min[2], b.max[2]].join('|');
  const previous = sections.get(section);
  if (previous && (Math.abs(previous.box.max[axis] - b.min[axis]) <= EPS ||
                   Math.abs(b.max[axis] - previous.box.min[axis]) <= EPS)) {
    previous.box.min[axis] = Math.min(previous.box.min[axis], b.min[axis]);
    previous.box.max[axis] = Math.max(previous.box.max[axis], b.max[axis]);
  } else {
    solids.push(solid);
    sections.set(section, solid);
  }
}

function intersection(a: Box, b: Box): Box | undefined {
  const min = a.min.map((n, i) => Math.max(n, b.min[i])) as Box['min'];
  const max = a.max.map((n, i) => Math.min(n, b.max[i])) as Box['max'];
  return min.every((n, i) => max[i] > n + EPS) ? { min, max } : undefined;
}

/** Six disjoint remnants around an intersection, without moving any plane. */
function subtractBox(box: Box, cut: Box): Box[] {
  const rest = copyBox(box), out: Box[] = [];
  for (let axis = 0; axis < 3; axis++) {
    if (cut.min[axis] > rest.min[axis] + EPS) {
      const part = copyBox(rest);
      part.max[axis] = cut.min[axis];
      out.push(part);
      rest.min[axis] = cut.min[axis];
    }
    if (cut.max[axis] < rest.max[axis] - EPS) {
      const part = copyBox(rest);
      part.min[axis] = cut.max[axis];
      out.push(part);
      rest.max[axis] = cut.max[axis];
    }
  }
  return out;
}

function collectBand(solids: Solid[], flight: Set<Solid>, band: Box, options: FlightBands) {
  const sources: Solid[] = [], remaining: Solid[] = [];
  for (const solid of solids) {
    const eligible = flight.has(solid) ||
      (!solid.dynamic && solid.layer === options.layer && WALL_ROLES.has(solid.role));
    let cut = eligible ? intersection(solid.box, band) : undefined;
    if (!cut) { remaining.push(solid); continue; }
    if (!flight.has(solid)) {
      // Keep the entire wall column in run/z. Cutting it at the flight's
      // bounds can create a thin upper, lower or end remnant by itself.
      const perp = 1 - options.axis;
      const column = copyBox(solid.box);
      column.min[perp] = cut.min[perp]; column.max[perp] = cut.max[perp];
      cut = column;
    }
    sources.push({ ...solid, box: cut });
    for (const [i, box] of subtractBox(solid.box, cut).entries()) {
      const part = { ...solid, id: `${solid.id}_${options.id}_rest_${i}`, box };
      remaining.push(part);
      if (flight.has(solid)) flight.add(part);
    }
  }
  return { sources, remaining };
}

function coordinates(sources: Solid[], axis: number): number[] {
  return [...new Set(sources.flatMap(({ box: b }) => [b.min[axis], b.max[axis]]))].sort((a, b) => a - b);
}

function unionBand(sources: Solid[], neighbors: Solid[], options: FlightBands): Solid[] {
  if (sources.length === 0) return [];
  const perp = 1 - options.axis;
  const ps = coordinates(sources, perp);
  const emitted: Solid[] = [];
  const spaces = [...new Set(sources.flatMap((s) => s.spaces))].sort();
  const min = [0, 1, 2].map((i) => Math.min(...sources.map((s) => s.box.min[i])));
  const max = [0, 1, 2].map((i) => Math.max(...sources.map((s) => s.box.max[i])));
  const nearby = neighbors.filter(({ box: b }) => b.min.every((lo, i) =>
    lo <= max[i] + FACE_TOLERANCE && b.max[i] >= min[i] - FACE_TOLERANCE)).map((s) => s.box);
  for (let p = 0; p + 1 < ps.length; p++) {
    const boxes = sources.filter(({ box: b }) => b.min[perp] < ps[p + 1] - EPS && b.max[perp] > ps[p] + EPS)
      .map(({ box: b }) => {
        const box = copyBox(b);
        box.min[perp] = ps[p]; box.max[perp] = ps[p + 1];
        return box;
      });
    for (const box of repairBandRectangles(boxes, options.axis, nearby)) {
      emitted.push({
        id: `${options.id}_support_${emitted.length}`, role: 'riser', box,
        layer: options.layer, spaces, dynamic: false,
      });
    }
  }
  return emitted;
}

/**
 * A tiny wing beside a wall cap cannot be a separate full-depth tread box:
 * its end faces nearly coincide with the cap or its adjoining tread. Keep
 * the exact union of wings, guards and static wall bases, choosing only pair
 * repairs that remove conflicts. Central tread heights and valid wall columns
 * stay intact. Dynamic walls stay separate.
 */
export function normalizeFlightBands(solids: Solid[], pieces: Solid[], options: FlightBands): void {
  const perp = 1 - options.axis, base = options.bounds;
  let remaining = [...solids, ...pieces];
  const flight = new Set(pieces);
  if (base.max[perp] - base.min[perp] - options.wallThickness >= 0.3 && base.max[2] > base.min[2] + EPS) {
    for (const side of [0, 1]) {
      const band = copyBox(base);
      if (side === 0) band.max[perp] = band.min[perp] + options.wallThickness / 2;
      else band.min[perp] = band.max[perp] - options.wallThickness / 2;
      const collected = collectBand(remaining, flight, band, options);
      const supports = unionBand(collected.sources, collected.remaining,
        { ...options, id: `${options.id}_side_${side}` });
      remaining = [...collected.remaining, ...supports];
    }
  }
  const core: Solid[] = [], sections = new Map<string, Solid>();
  const shell: Solid[] = [];
  for (const solid of remaining) {
    if (flight.has(solid)) appendFlightBox(core, sections, solid, options.axis);
    else shell.push(solid);
  }
  solids.splice(0, solids.length, ...shell, ...core);
}
