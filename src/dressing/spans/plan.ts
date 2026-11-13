import type { V3 } from "../../architecture/types.ts";
import { Rng } from "../../generate/rng.ts";
import { chooseGarment, type Garment } from "../kowloon/laundry.ts";
import { srgb } from "../kowloon/palette.ts";
import type { SpanRule } from "../types.ts";
import type { Anchor, Surroundings } from "./anchors.ts";
import { AnchorIndex } from "./neighbor-index.ts";
import { hangingCurve } from "./catenary.ts";

/** Cable strands leave a bracket rack this far in front of the wall, meters. */
export const RACK_STANDOFF = 0.11;
/** Heights of a rack's insulators relative to its anchor, in the order they fill, meters. */
export const RACK_SLOTS = [0, 0.065, -0.065, 0.13, -0.13, 0.195, -0.195, 0.26, -0.26];
/** Clothesline pulleys and sign fixings stand this far in front of the wall, meters. */
export const LINE_STANDOFF = 0.09;
/** The loaded washing line runs this far below the taut return line, meters. */
export const LINE_DROP = 0.14;
/** Nothing on a clothesline hangs further below it than this, meters. */
const LONGEST_WASHING = 1.15;
/** Depth of a gantry truss between its chords, meters. */
export const TRUSS_DEPTH = 0.22;

/** Cable bundles planned per utility anchor at full density. */
const BUNDLES_PER_ANCHOR = 0.22;
/** Clearance is sampled at least this often in plan along a span, so no narrow walkway slips between samples, meters. */
const CLEARANCE_STEP = 0.25;
/** Lengths a conduit may drop below its rack, longest first, and the height of the junction box at its foot, meters. */
const CONDUIT_DROPS = [2.1, 1.4, 0.8];
export const CONDUIT_BOX = 0.22;
/** Distance of a conduit's axis from its wall, meters. Probes run along this axis, so parts touching it register. */
export const CONDUIT_STANDOFF = 0.03;
/** Clotheslines planned per window anchor at full density. */
const LINES_PER_WINDOW = 0.4;
/** Street signs planned per utility anchor at full density. */
const SIGNS_PER_ANCHOR = 0.02;
/** Street signs keep at least this distance between their centers, meters. */
const SIGN_SPACING = 5;

const CABLE_TINTS = [
  "#1b1b1b", "#1b1b1b", "#242424", "#242424", "#2c2925", "#33332f", "#3d3a35",
  "#4a4640", "#5a5852", "#6a2f26", "#b8b4a6",
].map(srgb);

/** One cable of a bundle. `points` hang between the two racks' insulators. */
export interface Strand {
  /** Insulator slot used at the bundle's `from` and `to` racks. */
  slots: [number, number];
  /** Meters. */
  radius: number;
  /** Linear RGB. */
  tint: V3;
  points: V3[];
}

/** Utility cables that run together between two bracket racks. */
export interface CableBundle {
  from: Anchor;
  to: Anchor;
  strands: Strand[];
}

/** One piece of washing on a line, which holds it between `left` and `right`. */
export interface HungGarment {
  garment: Garment;
  left: V3;
  right: V3;
  /** Sideways lean of the hem off the line's vertical plane, meters. */
  sway: number;
}

/** A pulley clothesline: a taut return line above a loaded line of washing. */
export interface Clothesline {
  from: Anchor;
  to: Anchor;
  upper: V3[];
  lower: V3[];
  garments: HungGarment[];
}

/** A lettered rectangle in a sign's vertical plane: `s` is meters along the span from its start. */
export interface SignPanel {
  s0: number;
  s1: number;
  z0: number;
  z1: number;
}

/**
 * A sign carried between two walls: a cloth banner tied by its corners, or
 * rigid boards hung from a steel gantry. `start` is the fixing in front of
 * the `from` wall and `direction` the horizontal unit vector toward `to`.
 */
export interface StreetSign {
  kind: "banner" | "gantry";
  from: Anchor;
  to: Anchor;
  start: V3;
  direction: V3;
  /** Plan distance between the two fixings, meters. */
  length: number;
  /** Elevation of the banner's upper ropes or the gantry's top chord at the walls. */
  top: number;
  /** How far below `top` the lower fixing meets each wall, meters. */
  mount: number;
  panels: SignPanel[];
}

/**
 * The bracket that fixes cables to one anchor: how many insulators it
 * carries and, where one runs clear down the wall, the length of the conduit
 * dropping from it to a junction box, meters.
 */
export interface Rack {
  anchor: Anchor;
  slots: number;
  conduit?: number;
}

/** Everything one span recipe strings between its hosts. */
export interface SpanPlan {
  cables: CableBundle[];
  racks: Rack[];
  clotheslines: Clothesline[];
  signs: StreetSign[];
}

/** Returns the point `out` meters in front of an anchor's wall, raised by `up` meters. */
export function inFront(anchor: Anchor, out: number, up = 0): V3 {
  const { normal } = anchor.plane;
  return [
    anchor.position[0] + normal[0] * out,
    anchor.position[1] + normal[1] * out,
    anchor.position[2] + up,
  ];
}

/** Returns the world position of a sign-plane coordinate (`s` along the span, elevation `z`). */
export function onSign(sign: Pick<StreetSign, "start" | "direction">, s: number, z: number): V3 {
  return [sign.start[0] + sign.direction[0] * s, sign.start[1] + sign.direction[1] * s, z];
}

/** Plan distance in meters between two points. */
function planDistance(a: V3, b: V3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/**
 * True when a span between the anchors leaves and meets both walls within
 * the angle from their normals whose cosine is `minimum`. Walls that face
 * the same way, or away from one another, never qualify.
 */
function facing(from: Anchor, to: Anchor, minimum: number): boolean {
  const distance = planDistance(from.position, to.position);
  if (distance < 1e-6) return false;
  const dx = (to.position[0] - from.position[0]) / distance,
    dy = (to.position[1] - from.position[1]) / distance;
  const leaves = dx * from.plane.normal[0] + dy * from.plane.normal[1],
    meets = -(dx * to.plane.normal[0] + dy * to.plane.normal[1]);
  return leaves >= minimum && meets >= minimum;
}

/** True when a hanging path crosses nothing and keeps the recipe's clearance over walking surfaces. */
function passes(points: V3[], rule: SpanRule, surroundings: Surroundings): boolean {
  return clears(points, rule.clearance, surroundings) && !surroundings.obstructions.blockedPath(points);
}

/**
 * True when the polyline keeps `clearance` over the walking surface beneath
 * it, sampled every CLEARANCE_STEP in plan along each piece as well as at its
 * points.
 */
function clears(points: V3[], clearance: number, surroundings: Surroundings): boolean {
  if (points.length === 1) return surroundings.floors.clears(points[0], clearance);
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i],
      b = points[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / CLEARANCE_STEP));
    for (let step = i ? 1 : 0; step <= steps; step++) {
      const t = step / steps;
      const sample: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      if (!surroundings.floors.clears(sample, clearance)) return false;
    }
  }
  return true;
}

/** Returns the point `distance` meters in plan along a curve sampled evenly in plan. */
function alongCurve(curve: V3[], distance: number, length: number): V3 {
  const position = Math.min(curve.length - 1, Math.max(0, (distance / length) * (curve.length - 1)));
  const index = Math.min(curve.length - 2, Math.floor(position));
  const t = position - index;
  return curve[index].map((value, axis) => value + (curve[index + 1][axis] - value) * t) as V3;
}

/** Shared state of one recipe's planning pass. */
interface Planning {
  rule: SpanRule;
  seed: string;
  surroundings: Surroundings;
  /** Anchors a sign or clothesline already occupies; later families leave them alone. */
  taken: Set<Anchor>;
}

/**
 * Hangs one sign between two anchors, or returns undefined when its boards
 * would hit something, hang too low over the street, or find no street
 * beneath them to be read from.
 */
function hangSign(from: Anchor, to: Anchor, rng: Rng, planning: Planning): StreetSign | undefined {
  const { rule, surroundings } = planning;
  const top = Math.min(from.position[2], to.position[2]);
  const start = inFront(from, LINE_STANDOFF, top - from.position[2]),
    end = inFront(to, LINE_STANDOFF, top - to.position[2]);
  const length = planDistance(start, end);
  const direction: V3 = [(end[0] - start[0]) / length, (end[1] - start[1]) / length, 0];
  const sign: StreetSign = { kind: "banner", from, to, start, direction, length, top, mount: TRUSS_DEPTH, panels: [] };
  if (length <= 7 && rng.bool(0.5)) {
    sign.kind = "gantry";
    const hung = top - TRUSS_DEPTH - 0.12;
    if (length >= 3.2 && rng.bool(0.5)) {
      const width = Math.min(4 * Math.min(0.85, Math.max(0.45, length * 0.15)), length - 0.7);
      const s0 = (length - width) / 2;
      sign.panels.push({ s0, s1: s0 + width, z0: hung - width / 4, z1: hung });
    } else {
      const count = Math.min(3, Math.max(1, Math.floor(length / 1.4)));
      const width = rng.float(0.4, 0.55);
      for (let i = 0; i < count; i++) {
        const center = (length * (i + 1)) / (count + 1);
        sign.panels.push({ s0: center - width / 2, s1: center + width / 2, z0: hung - width * 4, z1: hung });
      }
    }
  } else {
    const width = Math.min(4 * Math.min(1.15, Math.max(0.5, length * 0.14)), length - 0.9);
    if (width < 1.6) return undefined;
    const s0 = (length - width) / 2 + rng.float(-0.2, 0.2) * (length - width - 0.6);
    sign.panels.push({ s0, s1: s0 + width, z0: top - 0.14 - width / 4, z1: top - 0.14 });
    sign.mount = width / 4 + 0.09;
  }
  for (const anchor of [from, to]) {
    const plate = { u0: anchor.u - 0.08, u1: anchor.u + 0.08, z0: top - sign.mount - 0.08, z1: top + 0.08 };
    if (!anchor.plane.covers(plate)) return undefined;
  }
  const overhead = onSign(sign, length / 2, Math.min(...sign.panels.map((panel) => panel.z0)) - 0.05);
  const street = surroundings.floors.below(overhead);
  if (street === undefined || top - street > 7.5) return undefined;
  // A sign is read from the street: open air must reach from it down to the paving.
  if (surroundings.obstructions.blocked(overhead, [overhead[0], overhead[1], street + 0.1])) return undefined;
  if (surroundings.obstructions.blocked(start, end)) return undefined;
  for (const panel of sign.panels) {
    const corners = [
      onSign(sign, panel.s0, panel.z0),
      onSign(sign, panel.s1, panel.z0),
      onSign(sign, panel.s1, panel.z1),
      onSign(sign, panel.s0, panel.z1),
    ];
    const outline = [...corners, corners[0], corners[2]];
    if (!passes(outline, rule, surroundings)) return undefined;
    if (surroundings.obstructions.blocked(corners[1], corners[3])) return undefined;
    // Cables strung by an earlier recipe are thinner than the gaps between those probes.
    if (surroundings.obstructions.pierced(corners)) return undefined;
  }
  return sign;
}

/**
 * Chooses street signs among the utility anchors: pairs that face one
 * another squarely at nearly one height, over a street, spaced apart.
 */
function planSigns(anchors: Anchor[], planning: Planning): StreetSign[] {
  const { rule, surroundings, taken } = planning;
  if (rule.signs <= 0 || !anchors.length) return [];
  const rng = new Rng(`${planning.seed}/signs`);
  const target = Math.max(1, Math.round(rule.signs * anchors.length * SIGNS_PER_ANCHOR));
  const reach = Math.min(rule.reach, 12);
  const index = new AnchorIndex(anchors, reach, 0.3);
  const signs: StreetSign[] = [];
  const center = (sign: StreetSign) => onSign(sign, sign.length / 2, sign.top);
  for (const from of rng.shuffle([...anchors])) {
    if (signs.length >= target) break;
    if (taken.has(from)) continue;
    const partners = index.near(from).filter(
      (to) =>
        !taken.has(to) &&
        to.plane !== from.plane &&
        planDistance(from.position, to.position) >= 3 &&
        Math.abs(to.position[2] - from.position[2]) <= 0.3 &&
        facing(from, to, 0.95),
    );
    if (!partners.length) continue;
    const sign = hangSign(from, rng.pick(partners), rng, planning);
    if (!sign) continue;
    const here = center(sign);
    if (signs.some((other) => Math.hypot(...center(other).map((v, k) => v - here[k])) < SIGN_SPACING))
      continue;
    signs.push(sign);
    taken.add(sign.from).add(sign.to);
    for (const panel of sign.panels)
      surroundings.obstructions.reserve([
        onSign(sign, panel.s0, panel.z0),
        onSign(sign, panel.s1, panel.z0),
        onSign(sign, panel.s1, panel.z1),
        onSign(sign, panel.s0, panel.z1),
      ]);
  }
  return signs;
}

/**
 * Hangs a pulley line between two anchors and fills it with washing. Pieces
 * that would touch something or hang too low are left off; a line that ends
 * up nearly bare is not worth stringing and returns undefined.
 */
function hangClothesline(from: Anchor, to: Anchor, rng: Rng, planning: Planning): Clothesline | undefined {
  const { rule, surroundings } = planning;
  const upper = hangingCurve(inFront(from, LINE_STANDOFF), inFront(to, LINE_STANDOFF), 0.003, 8);
  const lower = hangingCurve(
    inFront(from, LINE_STANDOFF, -LINE_DROP),
    inFront(to, LINE_STANDOFF, -LINE_DROP),
    rng.float(0.015, 0.035),
    16,
  );
  if (!passes(lower, rule, surroundings) || surroundings.obstructions.blockedPath(upper)) return undefined;
  const length = planDistance(lower[0], lower[lower.length - 1]);
  const garments: HungGarment[] = [];
  let s = 0.4 + rng.float(0, 0.3);
  while (s < length - 0.75) {
    const garment = chooseGarment(rng, { width: length - 0.4 - s, drop: LONGEST_WASHING }, "line");
    if (!garment) break;
    const hung: HungGarment = {
      garment,
      left: alongCurve(lower, s, length),
      right: alongCurve(lower, s + garment.width, length),
      sway: rng.float(-0.05, 0.05),
    };
    const hem = [hung.left, hung.right].map((p) => [p[0], p[1], p[2] - garment.drop] as V3);
    s += garment.width + (rng.bool(0.15) ? rng.float(0.5, 1.1) : rng.float(0.05, 0.22));
    if (!passes([hung.left, hem[0], hem[1], hung.right], rule, surroundings)) continue;
    if (surroundings.obstructions.pierced([hung.left, hung.right, hem[1], hem[0]])) continue;
    garments.push(hung);
  }
  if (garments.length < 2) return undefined;
  return { from, to, upper, lower, garments };
}

/**
 * Chooses clotheslines. Each starts beside a window and crosses a gap of at
 * most 9 m to another window or to a bare-wall pulley at about the same height.
 */
function planClotheslines(windows: Anchor[], utility: Anchor[], planning: Planning): Clothesline[] {
  const { rule, surroundings, taken } = planning;
  if (rule.clotheslines <= 0 || !windows.length) return [];
  const rng = new Rng(`${planning.seed}/clotheslines`);
  const target = Math.max(1, Math.round(rule.clotheslines * windows.length * LINES_PER_WINDOW));
  const reach = Math.min(rule.reach, 9);
  const index = new AnchorIndex([...windows, ...utility], reach, 0.45);
  const lines: Clothesline[] = [];
  for (const from of rng.shuffle([...windows])) {
    if (lines.length >= target) break;
    if (taken.has(from)) continue;
    const partners = index
      .near(from)
      .filter(
        (to) =>
          !taken.has(to) &&
          to.plane !== from.plane &&
          planDistance(from.position, to.position) >= 1.8 &&
          Math.abs(to.position[2] - from.position[2]) <= 0.45 &&
          facing(from, to, 0.82),
      )
      .map((to) => [to, (to.window ? 3 : 1) * Math.exp(-planDistance(from.position, to.position) / 5)] as const);
    if (!partners.length) continue;
    const line = hangClothesline(from, rng.weighted(partners), rng, planning);
    if (!line) continue;
    lines.push(line);
    taken.add(line.from).add(line.to);
    for (const { garment, left, right } of line.garments)
      surroundings.obstructions.reserve([
        left,
        right,
        [right[0], right[1], right[2] - garment.drop],
        [left[0], left[1], left[2] - garment.drop],
      ]);
  }
  return lines;
}

/** How likely a fresh cable run is to start at an anchor: the tangle thins above the lower stories. */
function startWeight(anchor: Anchor): number {
  return anchor.height < 9 ? 1 : Math.exp(-(anchor.height - 9) / 6);
}

/**
 * Chooses utility cable bundles. Runs hop from rack to rack: a run keeps
 * heading the same way along the walls it visits, so it zigzags down an
 * alley, and new runs often start from a rack already in use, so lines
 * gather at hubs the way service drops gather at a pole. Every strand hangs
 * clear of the scene and of the washing and signs placed before it.
 */
function planCables(anchors: Anchor[], planning: Planning): CableBundle[] {
  const { rule, surroundings, taken } = planning;
  const free = anchors.filter((anchor) => !taken.has(anchor));
  if (rule.cables <= 0 || !free.length) return [];
  const rng = new Rng(`${planning.seed}/cables`);
  const target = Math.max(1, Math.round(rule.cables * free.length * BUNDLES_PER_ANCHOR));
  const index = new AnchorIndex(free, rule.reach, rule.reach * 0.35);
  let totalWeight = 0;
  const cumulativeWeights = free.map((anchor) => (totalWeight += startWeight(anchor)));
  /** Draws from the static height weights without rescanning every anchor. */
  const pickStart = (): Anchor => {
    const roll = rng.next() * totalWeight;
    let low = 0, high = free.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (roll <= cumulativeWeights[middle]) high = middle;
      else low = middle + 1;
    }
    return free[low];
  };
  const used = new Map<Anchor, number>();
  const linked = new Set<string>();
  const order = new Map(free.map((anchor, i) => [anchor, i]));
  const pair = (a: Anchor, b: Anchor) => {
    const i = order.get(a)!,
      j = order.get(b)!;
    return i < j ? `${i}:${j}` : `${j}:${i}`;
  };
  const bundles: CableBundle[] = [];
  let run: { at: Anchor; heading: number; strands: number } | undefined;
  for (let attempt = 0; bundles.length < target && attempt < target * 16; attempt++) {
    const hubs = [...used.keys()];
    const from = run?.at ?? (hubs.length && rng.bool(0.4) ? rng.pick(hubs) : pickStart());
    const heading = run?.heading ?? 0;
    const strandsWanted = run
      ? Math.min(6, Math.max(1, run.strands + rng.int(-1, 1)))
      : rng.weighted([[1, 5], [2, 3], [3, 1.5], [4, 0.8], [6, 0.3]] as const);
    run = undefined;
    const room = RACK_SLOTS.length - (used.get(from) ?? 0);
    if (room <= 0) continue;
    const partners: (readonly [Anchor, number])[] = [];
    for (const to of index.near(from)) {
      const distance = planDistance(from.position, to.position);
      const rise = Math.abs(to.position[2] - from.position[2]);
      if (to.plane === from.plane || distance < 1.5 || rise > distance * 0.35) continue;
      if ((used.get(to) ?? 0) >= RACK_SLOTS.length || linked.has(pair(from, to))) continue;
      if (!facing(from, to, 0.3)) continue;
      const along =
        ((to.position[0] - from.position[0]) * from.plane.tangent[0] +
          (to.position[1] - from.position[1]) * from.plane.tangent[1]) * heading;
      const onward = heading === 0 ? 1 : along > 0.3 ? 2.5 : 0.3;
      partners.push([to, Math.exp(-distance / 5.5 - rise / 1.2) * (used.has(to) ? 2.5 : 1) * onward]);
    }
    if (!partners.length) continue;
    const to = rng.weighted(partners);
    const count = Math.min(strandsWanted, room, RACK_SLOTS.length - (used.get(to) ?? 0));
    const trunk = count >= 3 || rng.bool(0.25);
    const gauge = trunk ? rng.float(0.011, 0.017) : rng.float(0.006, 0.01);
    const slack = 0.008 + 0.05 * rng.next() ** 2;
    // A tauter line bends less and needs fewer pieces to look round.
    const pieces = Math.round(6 + slack * 120);
    const tint = rng.pick(CABLE_TINTS);
    const strands: Strand[] = [];
    for (let i = 0; i < count; i++) {
      const slots: [number, number] = [(used.get(from) ?? 0) + i, (used.get(to) ?? 0) + i];
      strands.push({
        slots,
        radius: gauge * rng.float(0.8, 1.15),
        tint: rng.bool(0.7) ? tint : rng.pick(CABLE_TINTS),
        points: hangingCurve(
          inFront(from, RACK_STANDOFF, RACK_SLOTS[slots[0]]),
          inFront(to, RACK_STANDOFF, RACK_SLOTS[slots[1]]),
          slack * rng.float(0.75, 1.4),
          pieces,
        ),
      });
    }
    if (!strands.every((strand) => passes(strand.points, rule, surroundings))) continue;
    bundles.push({ from, to, strands });
    used.set(from, (used.get(from) ?? 0) + count);
    used.set(to, (used.get(to) ?? 0) + count);
    linked.add(pair(from, to));
    if (rng.bool(0.55)) {
      // The run keeps its direction along the next wall, whose tangent may point either way.
      const traveled =
        (to.position[0] - from.position[0]) * to.plane.tangent[0] +
        (to.position[1] - from.position[1]) * to.plane.tangent[1];
      run = { at: to, heading: Math.sign(traveled), strands: count };
    }
  }
  return bundles;
}

/**
 * Sizes one rack for every anchor the bundles use. Racks carrying several
 * lines sometimes drop a conduit down the wall to a junction box: the longest
 * of a few lengths whose run is solid wall with nothing rendered across it.
 */
function planRacks(cables: CableBundle[], planning: Planning): Rack[] {
  const slots = new Map<Anchor, number>();
  for (const bundle of cables)
    for (const strand of bundle.strands) {
      slots.set(bundle.from, Math.max(slots.get(bundle.from) ?? 0, strand.slots[0] + 1));
      slots.set(bundle.to, Math.max(slots.get(bundle.to) ?? 0, strand.slots[1] + 1));
    }
  const { obstructions } = planning.surroundings;
  return [...slots].map(([anchor, count], index) => {
    const rack: Rack = { anchor, slots: count };
    if (count < 2 || new Rng(`${planning.seed}/conduit/${index}`).bool(0.4)) return rack;
    const { plane, u, z } = anchor;
    const top = z + Math.min(...RACK_SLOTS.slice(0, count)) - 0.07;
    rack.conduit = CONDUIT_DROPS.find((length) => {
      const foot = top - length - CONDUIT_BOX;
      if (!plane.covers({ u0: u - 0.1, u1: u + 0.1, z0: foot - 0.08, z1: top })) return false;
      if (obstructions.blocked(plane.point(u, top, CONDUIT_STANDOFF), plane.point(u, foot, CONDUIT_STANDOFF))) return false;
      // Pipes and cables running up the wall cross these level probes without meeting the upright one.
      for (let level = foot; level < top; level += 0.25)
        if (obstructions.blocked(plane.point(u - 0.09, level, CONDUIT_STANDOFF), plane.point(u + 0.09, level, CONDUIT_STANDOFF))) return false;
      return true;
    });
    return rack;
  });
}

/**
 * Plans everything one recipe strings between its hosts. Signs are placed
 * first, then clotheslines, then cables, so each later and more flexible
 * family threads around the bulkier parts already hung. The plan depends
 * only on the seed, the recipe and the anchors' order.
 */
export function planSpans(
  rule: SpanRule,
  seed: string,
  utility: Anchor[],
  windows: Anchor[],
  surroundings: Surroundings,
): SpanPlan {
  const planning: Planning = { rule, seed, surroundings, taken: new Set() };
  const signs = planSigns(utility, planning);
  const clotheslines = planClotheslines(windows, utility, planning);
  const cables = planCables(utility, planning);
  return { cables, racks: planRacks(cables, planning), clotheslines, signs };
}
