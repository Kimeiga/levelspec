/**
 * A map that starts as a place rather than as a floorplan.
 *
 * Everything in `plan.ts` is about *drawing*: here is a grid of characters,
 * here is what each one means, compile it. That is the right level to work at
 * once you know what you are drawing, and it is no help at all with the
 * question before that one — what is this map, and why does it have the shape
 * it has.
 *
 * A `SpatialConcept` answers that question in the form the answer actually
 * takes. Not a floorplan: a *section*. Two or three elevation bands, what each
 * one is for, what occupies it and in what proportion, and where the links
 * between them are. A concept says "a public deck over a drained basin with a
 * maintenance run under that, and the only way between the middle and the
 * bottom is one pressure door" — and this file turns that into a grid of
 * characters that compiles, bakes and passes its gates.
 *
 * Three things about why it works this way.
 *
 * **The section is the input.** A floorplan can only ever describe a place you
 * are *in*; what makes somewhere memorable is nearly always what is over your
 * head or under your feet — that the route you took ten seconds ago is visible
 * below you, that the fast way and the safe way are at different heights and
 * can see each other. Bands are the first thing a concept declares because
 * they are the first thing a designer decides.
 *
 * **Zones are proportions, not rectangles.** A concept says the reservoir is
 * four times the apron; the slicer decides where the wall goes. That is what
 * makes a concept a thing you can generate a dozen variants of and score,
 * rather than a drawing you have already committed to.
 *
 * **Every constraint the compiler has is obeyed by construction.** Two maps
 * were hand-drawn before this existed and between them they cost about forty
 * rounds of "compile, read the error, move a rectangle". Every one of those
 * errors is a rule — a stair needs twice its rise in run and a cell of
 * clearance at each end; a band's walls must not reach into the band above;
 * a ladder does not connect the navmesh; a vertical must be written from its
 * lower end. They are encoded here once instead of being rediscovered.
 */

import type { SpaceRole } from '../core/types.ts';

/** Cells: x, y, width, depth. */
export type Cells = [number, number, number, number];

export interface CoverPlan {
  label: string;
  /** Waist, chest or head, in metres. */
  height: number;
  as: 'crate' | 'barrel' | 'vehicle';
  count: number;
}

export interface ZonePlan {
  id: string;
  label: string;
  role: SpaceRole;
  /** Share of the band's floor. Relative to the other zones in the band. */
  weight: number;
  /** Ceiling height. Bounded by the band's own headroom; see `headroom`. */
  height?: number;
  /**
   * A hole rather than a room.
   *
   * The band's floor is not emitted here, so whatever is on the band below
   * shows through — which is how a bridge gets something to cross and how an
   * atrium gets to be three storeys of one space rather than three spaces.
   */
  open?: boolean;
  cover?: CoverPlan;
  /**
   * Neighbours this zone is walled off from, and how you get through.
   *
   * Walls are opt-in: two zones that say nothing about each other are simply
   * open to one another, which is right far more often than not. A `door` is
   * the compression a concept is usually after; an `arch` is a threshold.
   */
  seal?: Record<string, 'door' | 'arch'>;
}

export interface BandPlan {
  id: string;
  /** Floor elevation and headroom, in metres. */
  z: number;
  height: number;
  /** What this band is for, in the concept's own words. */
  purpose: string;
  /**
   * Whether this band has a ceiling where nothing is standing on it.
   *
   * Defaults to true for every band except the topmost, which is the honest
   * answer for a building: a promenade under an inspection gantry is indoors
   * where the gantry is and indoors where it is not, because a building has a
   * roof. It was false everywhere, and the consequence is that a *covered*
   * reservoir was open to the sky across three fifths of itself — which the
   * frame metric noticed the day it learned to ask.
   *
   * The exception is a place that genuinely has no lid: a quarry bench, a
   * terrace, a clay pit, a dock. Those say so.
   *
   * The compiler only emits roof where no band above already covers the cell,
   * so this never doubles a slab; it fills in the part of a storey that has
   * nothing over it.
   */
  roofed?: boolean;
  /**
   * The part of the grid this band occupies, in cells.
   *
   * Bands need not be the same size: a plant deck smaller than the floor below
   * it is what makes a building read as a building rather than as an extrusion.
   */
  extent: Cells;
  zones: ZonePlan[];
}

export interface LinkPlan {
  /** Lower band and upper band, in that order. Always. */
  from: string;
  to: string;
  /** Zones the two ends must land in. */
  fromZone: string;
  toZone: string;
  width: number;
  /**
   * A shortcut rather than a spine.
   *
   * A flight needs twice its rise in run plus a cell of clearance all round,
   * which a zone the concept gave a tenth of the band to frequently does not
   * have. An optional link is one the concept would like and can do without —
   * a back stair into the plant room — and its absence is not a reason to
   * throw away an otherwise good layout. At least one link between any two
   * bands has to be required, or the upper one is unreachable.
   */
  optional?: boolean;
}

/** One of the eight verbs a map can be about. */
export type SpatialVerb =
  | 'cross' | 'climb' | 'descend' | 'orbit' | 'thread' | 'infiltrate' | 'escape' | 'emerge';

export interface SpatialConcept {
  id: string;
  name: string;
  /**
   * One sentence, and it has to be about a place.
   *
   * "A flood-control station whose public promenade crosses above its failed
   * pumping basin" is a thesis. "A cyberpunk map" is a theme, "three lanes
   * with cover" is a layout, and neither of those tells you where a wall goes.
   */
  thesis: string;
  /** What the place was built to do, before any of this happened in it. */
  built: string;
  /** What happened immediately before the player arrived. */
  incident: string;
  verb: SpatialVerb;
  /** Two things the map physically contains, which are not alike. */
  contrast: [string, string];
  /** The whole grid, in cells, and how big a cell is. */
  grid: number;
  size: [number, number];
  wall: number;
  bands: BandPlan[];
  links: LinkPlan[];
  /** Where the player arrives, and what the floor is about. */
  spawn: string;
  objective: string;
  /**
   * How many independent ways there should be from one to the other.
   *
   * Two by default, because a map with one route is a corridor. One is a
   * legitimate answer for a concept whose whole point is a single entrance —
   * a buried reservoir reached through one door is not failing a gate, it is
   * the idea — and saying so here is the difference between a constraint and
   * an accident.
   */
  routes?: number;
}

// -----------------------------------------------------------------------------
// Laying it out

/** A zone, once the slicer has decided where it goes. */
export interface PlacedZone extends ZonePlan {
  band: string;
  at: Cells;
}

function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >> 17;
    h ^= h << 5; h >>>= 0;
    return h / 4294967296;
  };
}

/**
 * Cut a rectangle into one per zone, in proportion to their weights.
 *
 * Recursive binary slicing along the longer axis. It is the simplest thing
 * that gives every zone a rectangle, guarantees they tile the band with no
 * gaps and no overlaps, and guarantees that any two of them that share an edge
 * share a whole edge — which is what stops the compiler finding a single-cell
 * corner reachable only on the diagonal, and what makes "these two zones are
 * adjacent" a fact rather than a hope.
 *
 * The split point is jittered by the seed, which is the whole variation
 * budget: the same concept laid out under twenty seeds is twenty different
 * maps of the same place, and that is exactly the thing worth scoring.
 */
function slice(rect: Cells, zones: ZonePlan[], roll: () => number): Map<string, Cells> {
  const out = new Map<string, Cells>();
  const cut = (r: Cells, group: ZonePlan[]): void => {
    if (!group.length) return;
    if (group.length === 1) {
      out.set(group[0].id, r);
      return;
    }
    const total = group.reduce((a, z) => a + z.weight, 0);
    // Split the list at the point nearest half the weight, so neither side is
    // a single zone squeezed against a wall unless the weights say so.
    let run = 0;
    let at = 1;
    for (let i = 0; i < group.length - 1; i++) {
      run += group[i].weight;
      at = i + 1;
      if (run >= total / 2) break;
    }
    const share = run / total;
    const along = r[2] >= r[3] ? 0 : 1;
    const span = along === 0 ? r[2] : r[3];
    // Jittered a tenth either way, and never closer than three cells to an
    // edge: a two-cell zone is a corridor whatever the concept called it.
    const wobble = (roll() - 0.5) * 0.2;
    const size = Math.max(3, Math.min(span - 3, Math.round(span * (share + wobble))));
    const a: Cells = along === 0 ? [r[0], r[1], size, r[3]] : [r[0], r[1], r[2], size];
    const b: Cells = along === 0
      ? [r[0] + size, r[1], r[2] - size, r[3]]
      : [r[0], r[1] + size, r[2], r[3] - size];
    cut(a, group.slice(0, at));
    cut(b, group.slice(at));
  };
  cut(rect, zones);
  return out;
}

/**
 * Is there room for a flight between these two rectangles?
 *
 * The same test the emitter uses, without the bookkeeping — the layout has to
 * be able to ask it before it has committed to anything.
 */
export function linkFits(a: Cells, b: Cells, run: number, wide: number): boolean {
  const across = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const along = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return (along >= run + 2 && across >= wide + 2) || (across >= run + 2 && along >= wide + 2);
}

/**
 * How many of the concept's links the placement can actually hold.
 *
 * The number the repair pass is climbing. A layout that satisfies every
 * proportion the concept asked for and has nowhere to put the stairs is not a
 * near miss — the band on the far side of a missing link is unreachable, and
 * the map is thrown away.
 */
function linksMade(concept: SpatialConcept, placed: PlacedZone[]): number {
  const at = new Map(placed.map((z) => [z.id, z]));
  let made = 0;
  for (const link of concept.links) {
    const lower = concept.bands.find((b) => b.id === link.from);
    const upper = concept.bands.find((b) => b.id === link.to);
    const a = at.get(link.fromZone);
    const b = at.get(link.toZone);
    if (!lower || !upper || !a || !b) continue;
    const run = flightCells(upper.z - lower.z, concept.grid);
    const wide = Math.max(1, Math.round(link.width / concept.grid));
    if (linkFits(a.at, b.at, run, wide)) made++;
  }
  return made;
}

/** A flight's plan footprint, grown by a cell so cover keeps off its edges. */
function footprintOf(from: [number, number], to: [number, number], wide: number): Cells {
  const x0 = Math.min(from[0], to[0]) - 1;
  const y0 = Math.min(from[1], to[1]) - 1;
  const w = Math.abs(to[0] - from[0]) + wide + 2;
  const h = Math.abs(to[1] - from[1]) + wide + 2;
  return [x0, y0, w, h];
}

export function layout(concept: SpatialConcept, seed: string): PlacedZone[] {
  const roll = rng(`${concept.id}:${seed}`);
  const placed: PlacedZone[] = [];
  const [W, H] = concept.size;
  for (const band of concept.bands) {
    /*
     * Clipped to the grid, with a cell of margin.
     *
     * A band's extent and the concept's size are two numbers a person has to
     * keep in step, and the failure when they drift is a write past the end of
     * a row — which reports as a type error somewhere in the emitter and says
     * nothing at all about which band is too big. Clamping makes the extent a
     * request rather than an assertion.
     */
    const ex = Math.max(1, Math.min(band.extent[0], W - 4));
    const ey = Math.max(1, Math.min(band.extent[1], H - 4));
    const extent: Cells = [
      ex, ey,
      Math.min(band.extent[2], W - 1 - ex),
      Math.min(band.extent[3], H - 1 - ey),
    ];
    // Order is the concept's, but which half of the band each group lands in
    // is the seed's — otherwise every variant is the same map with the walls
    // in slightly different places.
    const zones = band.zones.slice();
    if (roll() < 0.5) zones.reverse();
    const cuts = slice(extent, zones, roll);
    for (const z of zones) {
      const at = cuts.get(z.id);
      if (at) placed.push({ ...z, band: band.id, at });
    }
  }

  /*
   * Then move things until the stairs fit.
   *
   * The slicer only knows about proportions, so it will happily put the two
   * ends of a flight in rectangles that share four cells of edge — and a
   * concept whose section depends on that flight then has an unreachable band
   * and is discarded. Which is a waste: the *proportions* were fine and only
   * the arrangement was wrong.
   *
   * So each zone's rectangle is swapped with a sibling in its own band and the
   * swap is kept if more links fit. Swapping rather than resizing keeps every
   * guarantee the slicer gave — the band is still tiled, nothing overlaps, and
   * every shared edge is still a whole edge — and only the areas move around,
   * which is a thing the concept did not specify.
   */
  for (let pass = 0; pass < 6; pass++) {
    let best = linksMade(concept, placed);
    if (best === concept.links.length) break;
    let improved = false;
    for (let i = 0; i < placed.length && !improved; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        if (placed[i].band !== placed[j].band) continue;
        const a = placed[i].at;
        placed[i].at = placed[j].at;
        placed[j].at = a;
        const now = linksMade(concept, placed);
        if (now > best) {
          best = now;
          improved = true;
          break;
        }
        placed[j].at = placed[i].at;
        placed[i].at = a;
      }
    }
    if (!improved) break;
  }
  return placed;
}

// -----------------------------------------------------------------------------
// Turning it into a drawing

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const COVERS = '0123456789';

/**
 * The headroom a band actually has.
 *
 * A space whose walls reach into the band above it is two solids sharing a
 * plane, which the compiler rejects and which nobody would find by looking.
 * The concept may ask for a nine-metre atrium; what it gets is nine metres or
 * the distance to the next floor, whichever is less.
 */
function headroom(concept: SpatialConcept, band: BandPlan): number {
  let ceiling = Infinity;
  for (const other of concept.bands) {
    if (other.z > band.z) ceiling = Math.min(ceiling, other.z);
  }
  return ceiling === Infinity ? Math.max(band.height, 9) : ceiling - band.z - 0.4;
}

/**
 * How long a flight has to be, in cells, for a given rise.
 *
 * Twice the rise is a comfortable stair and the compiler's own slope gate is
 * stricter than that; plus one cell of clearance at each end, because a flight
 * that begins on a zone's edge cell begins inside the wall on that edge.
 */
export function flightCells(rise: number, grid: number): number {
  return Math.ceil((Math.abs(rise) * 2) / grid) + 2;
}

interface Drawn {
  text: string;
  placed: PlacedZone[];
  /**
   * Which zone ended up in which rectangle, as one string.
   *
   * Two layouts of one concept are the same map if every zone is in the same
   * place and a different map if they are not — and "different" has to be
   * measured rather than assumed, because a slicer given twenty seeds will
   * produce the same tiling under most of them with the split points a cell
   * either way. This is what that comparison is made against.
   */
  signature: string[];
  /**
   * Links the layout had no room for.
   *
   * A concept declares where the stairs go; a slicer can put the two ends of
   * one in rectangles that share no run long enough to hold a flight. The
   * candidate is not salvageable — the band on the far side of the missing
   * link is unreachable — so it is cheaper to say so here than to compile a
   * map whose navmesh will come back in pieces.
   */
  missing: string[];
}

/** How a variant is written on the map's own name plate. */
const NUMERAL: Record<number, string> = { 1: 'II', 2: 'III', 3: 'IV', 4: 'V' };

export function draw(concept: SpatialConcept, seed: string, variant = 0): Drawn {
  const placed = layout(concept, seed);
  const roll = rng(`${concept.id}:${seed}:cover`);
  const [W, H] = concept.size;
  const at = new Map(placed.map((z) => [z.id, z]));

  /*
   * The stairs are resolved before anything is drawn.
   *
   * They have to be: a flight's footprint is a strip of the band it climbs
   * out of, and a cover block dropped on that strip is a crate with a
   * staircase through it — which is what the first version did, on every
   * candidate, because it painted the furniture and then found somewhere for
   * the stairs.
   */
  const missing: string[] = [];
  const taken: Cells[] = [];
  const flights: { band: string; foot: Cells }[] = [];
  const stairLines: string[] = [];
  for (const link of concept.links) {
    const lower = concept.bands.find((b) => b.id === link.from);
    const upper = concept.bands.find((b) => b.id === link.to);
    const a = at.get(link.fromZone);
    const b = at.get(link.toZone);
    if (!lower || !upper || !a || !b) {
      if (!link.optional) missing.push(`${link.fromZone}->${link.toZone}`);
      continue;
    }
    const wide = Math.max(1, Math.round(link.width / concept.grid));
    const flight = stairBetween(a.at, b.at, flightCells(upper.z - lower.z, concept.grid), wide, taken);
    if (!flight) {
      if (!link.optional) missing.push(`${link.fromZone}->${link.toZone}`);
      continue;
    }
    const [fx, fy, tx, ty] = flight;
    const foot = footprintOf([fx, fy], [tx, ty], wide);
    flights.push({ band: link.from, foot }, { band: link.to, foot });
    stairLines.push(`stairs ${link.from} ${fx},${fy} -> ${link.to} ${tx},${ty} ${link.width}`);
  }
  const byBand = new Map<string, PlacedZone[]>();
  for (const z of placed) {
    const list = byBand.get(z.band) ?? [];
    list.push(z);
    byBand.set(z.band, list);
  }

  const parts: string[] = [];
  // The same letter the file is named with, so the id the runtime reads and
  // the name the library files it under agree about which variant this is.
  parts.push(`id: og_${concept.id}${variant ? `_${'bcde'[variant - 1]}` : ''}`);
  /*
   * A variant is a different map of the same place, and is named like one.
   *
   * The library files maps by display name and keeps the largest of any two
   * that share one, so two layouts of Terminus called Terminus are one map.
   * The numeral is how the traced half of this library already distinguishes
   * two cuts of one place, and it is honest about what a variant is: not
   * somewhere else, the same somewhere laid out differently.
   */
  parts.push(`name: ${concept.name}${variant ? ` ${NUMERAL[variant] ?? variant}` : ''}`);
  parts.push(`description: ${concept.name}. ${concept.thesis} Built as ${concept.built}; ${concept.incident}.`);
  parts.push('');
  parts.push(`grid: ${concept.grid}`);
  parts.push(`wall_thickness: ${concept.wall}`);

  for (const band of concept.bands) {
    const mine = byBand.get(band.id) ?? [];
    const grid: string[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));
    const legend: string[] = [];
    const covers: string[] = [];
    let letter = 0;
    let digit = 0;
    const room = headroom(concept, band);

    for (const z of mine) {
      if (z.open) continue;
      const ch = ALPHABET[letter++ % ALPHABET.length];
      const h = Math.min(z.height ?? band.height, room);
      legend.push(`  ${ch}  ${z.id.padEnd(17)} "${z.label}"  ${z.role}  h=${h.toFixed(1)}`);
      const [x, y, w, d] = z.at;
      for (let cy = y; cy < y + d; cy++) {
        for (let cx = x; cx < x + w; cx++) {
          // Rows are written top-down and the grid is Y-up.
          grid[H - 1 - cy][cx] = ch;
        }
      }
    }

    /*
     * Cover, kept two cells clear of everything.
     *
     * A block on a zone's edge cell overlaps the wall on that edge, which the
     * compiler calls a placed solid clipping a wall — and which cost three of
     * the forty rounds the two hand-drawn maps took.
     */
    const onFlight = (cx: number, cy: number): boolean =>
      flights.some((f) => f.band === band.id
        && cx >= f.foot[0] && cx < f.foot[0] + f.foot[2]
        && cy >= f.foot[1] && cy < f.foot[1] + f.foot[3]);

    let index = -1;
    for (const z of mine) {
      if (z.open) continue;
      index++;
      if (!z.cover) continue;
      const own = ALPHABET[index % ALPHABET.length];
      const ch = COVERS[digit++ % COVERS.length];
      covers.push(`  ${ch}  ${(z.id + '_cover').padEnd(17)} "${z.cover.label}"  cover=${z.cover.height}  as=${z.cover.as}`);
      const [x, y, w, d] = z.at;
      if (w < 6 || d < 6) continue;
      for (let i = 0; i < z.cover.count; i++) {
        const cx = x + 2 + Math.floor(roll() * (w - 4));
        const cy = y + 2 + Math.floor(roll() * (d - 4));
        const row = H - 1 - cy;
        // Not on a flight, not on another block, and not on a different zone:
        // a cell that still holds this zone's own letter is all three at once.
        if (grid[row][cx] !== own || onFlight(cx, cy)) continue;
        grid[row][cx] = ch;
      }
    }

    parts.push('');
    /*
     * The band's own height is capped too, not just its zones'.
     *
     * Zone heights have been clamped to the headroom since the first version;
     * the layer's default height was not, so a band declared taller than the
     * gap to the band above emitted walls straight through the floor of it —
     * twenty coplanar faces and twenty shared volumes, with nothing in the
     * message to say which of five bands was the tall one.
     */
    const topmost = !concept.bands.some((b) => b.z > band.z);
    const roofed = band.roofed ?? !topmost;
    parts.push(
      `layer ${band.id} z=${band.z} height=${Math.min(band.height, room).toFixed(2)} roof=${roofed ? 'yes' : 'no'}`,
    );
    parts.push('');
    parts.push('legend');
    parts.push(...legend, ...covers);
    parts.push('end');
    parts.push('');
    parts.push('plan');
    parts.push(...grid.map((r) => r.join('')));
    parts.push('end');
  }

  // --- what is walled off from what ------------------------------------------
  parts.push('');
  for (const z of placed) {
    for (const [other, kind] of Object.entries(z.seal ?? {})) {
      const o = at.get(other);
      if (!o || o.band !== z.band || !touching(z.at, o.at)) continue;
      parts.push(`wall ${z.id} ${other}`);
      parts.push(`${kind} ${z.id} ${other} ${kind === 'door' ? 2 : 3}`);
    }
  }

  // --- stairs, always written from the lower end ------------------------------
  parts.push('');
  parts.push(...stairLines);
  parts.push('');
  parts.push(`mark attacker_spawn ${concept.spawn} attack "${at.get(concept.spawn)?.label ?? 'Start'}"`);
  parts.push(`mark site ${concept.objective} neutral "${at.get(concept.objective)?.label ?? 'Objective'}"`);
  parts.push('');
  parts.push(`route ${concept.spawn} ${concept.objective} ${concept.routes ?? 2}`);
  parts.push('');

  return {
    text: parts.join('\n'),
    placed,
    missing,
    signature: placed.map((z) => `${z.id}@${z.at.join(',')}`),
  };
}

/**
 * How much two layouts of one concept disagree, 0 to 1.
 *
 * The fraction of zones that ended up somewhere else. Nought is the same map
 * twice; a half means half the building has moved, which is enough that the
 * routes through it, the sightlines across it and which room you arrive in
 * are all different — and those are the only things a player experiences.
 */
export function apart(a: string[], b: string[]): number {
  if (!a.length) return 0;
  const other = new Set(b);
  let moved = 0;
  for (const one of a) if (!other.has(one)) moved++;
  return moved / a.length;
}

/** Do two cell rectangles share a whole edge? */
function touching(a: Cells, b: Cells): boolean {
  const overlapX = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const overlapY = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  const meetX = a[0] + a[2] === b[0] || b[0] + b[2] === a[0];
  const meetY = a[1] + a[3] === b[1] || b[1] + b[3] === a[1];
  return (meetX && overlapY >= 2) || (meetY && overlapX >= 2);
}

/**
 * Where a flight fits between two zones on different bands.
 *
 * It has to run inside *both* rectangles for its whole length, with a cell of
 * clearance at each end, because the flight punches through the upper band's
 * floor along its whole footprint and anything outside the upper zone is a
 * hole in the middle of nothing. Returns the two endpoints in grid
 * coordinates, or null if the two zones have no column or row long enough to
 * hold the run.
 */
function stairBetween(
  a: Cells,
  b: Cells,
  run: number,
  wideCells: number,
  taken: Cells[],
): [number, number, number, number] | null {
  const x0 = Math.max(a[0], b[0]);
  const x1 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y0 = Math.max(a[1], b[1]);
  const y1 = Math.min(a[1] + a[3], b[1] + b[3]);
  const across = x1 - x0;
  const along = y1 - y0;

  /** Two flights through one another is worse than one flight fewer. */
  const free = (r: Cells): boolean =>
    !taken.some((t) =>
      Math.min(t[0] + t[2], r[0] + r[2]) - Math.max(t[0], r[0]) > 0 &&
      Math.min(t[1] + t[3], r[1] + r[3]) - Math.max(t[1], r[1]) > 0);

  /*
   * A cell of clearance on every side, not just at the ends.
   *
   * A flight touching its zone's edge cell is a flight inside the wall on that
   * edge, and the compiler calls that a placed solid clipping a wall. The run
   * needs two cells spare along it and the width needs two across it.
   */
  const fits = (n: number, needed: number): boolean => n >= needed + 2;

  if (along >= across && fits(along, run) && fits(across, wideCells)) {
    for (let off = 0; off + wideCells <= across - 2; off++) {
      const x = x0 + 1 + off;
      const foot: Cells = [x, y0 + 1, wideCells, run];
      if (!free(foot)) continue;
      taken.push(foot);
      return [x, y0 + 1, x, y0 + run];
    }
  }
  if (fits(across, run) && fits(along, wideCells)) {
    for (let off = 0; off + wideCells <= along - 2; off++) {
      const y = y0 + 1 + off;
      const foot: Cells = [x0 + 1, y, run, wideCells];
      if (!free(foot)) continue;
      taken.push(foot);
      return [x0 + 1, y, x0 + run, y];
    }
  }
  return null;
}
