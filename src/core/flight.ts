import type { Box, Solid } from './types.ts';

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
    const cut = eligible ? intersection(solid.box, band) : undefined;
    if (!cut) { remaining.push(solid); continue; }
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

function occupiedIntervals(sources: Solid[], axis: 0 | 1, p0: number, p1: number, z0: number, z1: number) {
  const perp = 1 - axis;
  const intervals = sources.filter(({ box: b }) =>
    b.min[perp] < p1 - EPS && b.max[perp] > p0 + EPS &&
    b.min[2] < z1 - EPS && b.max[2] > z0 + EPS)
    .map(({ box: b }): [number, number] => [b.min[axis], b.max[axis]])
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (previous && interval[0] <= previous[1] + EPS) previous[1] = Math.max(previous[1], interval[1]);
    else merged.push(interval);
  }
  return merged;
}

function unionBand(sources: Solid[], band: Box, options: FlightBands): Solid[] {
  const perp = 1 - options.axis;
  const ps = coordinates(sources, perp), zs = coordinates(sources, 2);
  const emitted: Solid[] = [], sections = new Map<string, Solid>();
  const spaces = [...new Set(sources.flatMap((s) => s.spaces))].sort();
  for (let p = 0; p + 1 < ps.length; p++) {
    for (let z = 0; z + 1 < zs.length; z++) {
      for (const [lo, hi] of occupiedIntervals(sources, options.axis, ps[p], ps[p + 1], zs[z], zs[z + 1])) {
        const section = [ps[p], ps[p + 1], lo, hi].join('|');
        const previous = sections.get(section);
        if (previous && Math.abs(previous.box.max[2] - zs[z]) <= EPS) {
          previous.box.max[2] = zs[z + 1];
          continue;
        }
        const box = copyBox(band);
        box.min[options.axis] = lo; box.max[options.axis] = hi;
        box.min[perp] = ps[p]; box.max[perp] = ps[p + 1];
        box.min[2] = zs[z]; box.max[2] = zs[z + 1];
        const solid: Solid = {
          id: `${options.id}_support_${emitted.length}`, role: 'riser', box,
          layer: options.layer, spaces, dynamic: false,
        };
        emitted.push(solid);
        sections.set(section, solid);
      }
    }
  }
  return emitted;
}

/**
 * A tiny wing beside a wall cap cannot be a separate full-depth tread box:
 * its end faces nearly coincide with the cap or its adjoining tread. Keep
 * the exact union of wings, guards and static wall bases in horizontal layers.
 * The central treads retain their original heights. Dynamic walls stay separate.
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
      const supports = unionBand(collected.sources, band, { ...options, id: `${options.id}_side_${side}` });
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
