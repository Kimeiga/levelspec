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

import {layout,rng,footprintOf,headroom,flightCells,touching,stairBetween,conceptLink} from './concept-layout.ts';
import type {SpatialConcept,PlacedZone,Cells} from './concept-layout.ts';
export {layout,linkFits,flightCells,apart} from './concept-layout.ts';
export type * from './concept-layout.ts';

// -----------------------------------------------------------------------------
// Turning it into a drawing

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const COVERS = '0123456789';

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
    const ends=conceptLink(concept,at,link);
    if (!ends) {
      if (!link.optional) missing.push(`${link.fromZone}->${link.toZone}`);
      continue;
    }
    const {lower,upper,a,b}=ends;
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
