import { Rng } from "../../generate/rng.ts";
import { lotStyle, type LotStyle } from "./palette.ts";

/** An axis-aligned rectangle in a facade or plan, in meters. */
export interface Rect {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

/**
 * Returns the parts of `rect` outside `hole` as up to four rectangles. An
 * overlap thinner than `sliver` meters in either direction is ignored.
 */
export function subtractRect(rect: Rect, hole: Rect, sliver = 1e-6): Rect[] {
  const u0 = Math.max(rect.u0, hole.u0),
    u1 = Math.min(rect.u1, hole.u1),
    v0 = Math.max(rect.v0, hole.v0),
    v1 = Math.min(rect.v1, hole.v1);
  if (u1 - u0 < sliver || v1 - v0 < sliver) return [rect];
  const pieces: Rect[] = [
    { u0: rect.u0, u1: u0, v0: rect.v0, v1: rect.v1 },
    { u0: u1, u1: rect.u1, v0: rect.v0, v1: rect.v1 },
    { u0, u1, v0: rect.v0, v1: v0 },
    { u0, u1, v0: v1, v1: rect.v1 },
  ];
  return pieces.filter((p) => p.u1 - p.u0 > 1e-6 && p.v1 - p.v0 > 1e-6);
}

/** A solid box in the building frame: X along the front, Y into the depth, Z up. */
export interface Block {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

/**
 * One building in a row. A tenement has a ground story spanning the footprint
 * depth and an upper body that may jetty out or step back. A well is a narrow
 * service recess between tenements whose body sits far behind the frontage.
 */
export interface Lot {
  index: number;
  kind: "tenement" | "well";
  /** Extent along the building front, in meters from its left corner seen from the front. */
  x0: number;
  x1: number;
  /** Stories including the ground story. */
  stories: number;
  /** Ground story height and upper floor-to-floor height, meters. */
  ground: number;
  storyHeight: number;
  /** Roof deck elevation and the top of the parapet walls. */
  roof: number;
  top: number;
  /** Outward shift of the upper body at the front and back; negative steps it back. */
  front: number;
  back: number;
  style: LotStyle;
  /** Seed path for everything generated for this lot. */
  key: string;
}

/** Returns a lot's ground story and upper body; the body is absent when it has no height. */
export function lotBlocks(lot: Lot, depth: number): Block[] {
  const ground: Block = {
    x0: lot.x0,
    x1: lot.x1,
    y0: 0,
    y1: depth,
    z0: 0,
    z1: lot.ground,
  };
  if (lot.top - lot.ground < 0.05) return [ground];
  return [
    ground,
    {
      x0: lot.x0,
      x1: lot.x1,
      y0: -lot.front,
      y1: depth + lot.back,
      z0: lot.ground,
      z1: lot.top,
    },
  ];
}

/** The box and story budget a row of lots must fill. All lengths in meters. */
interface SiteBudget {
  width: number;
  depth: number;
  height: number;
  /** Stories of the tallest tenement, which fills the complete height. */
  stories: number;
  /** Height of a native base wall every ground story must cover, or 0. */
  baseHeight: number;
}

/** Height kept free above the top story for the roof build-up, meters. */
export const ROOF_RESERVE = 0.35;
/** Deepest jetty; with balconies and signs it must stay inside the 1.6 m overhang limit. */
const MAX_JETTY = 0.55;
/** Tallest shop story the kit lays out unless a base wall demands more, meters. */
const MAX_SHOP = 3.9;
/** Lowest upper floor-to-floor height the kit lays out, meters. */
const MIN_STORY = 2.4;
/** Lowest ground story the kit lays out, meters. */
const MIN_GROUND = 2.6;

/** The story count a building recipe receives when it names none: one per 3 m. */
export function defaultStories(height: number): number {
  return Math.max(1, Math.floor((height - ROOF_RESERVE) / 3));
}

/**
 * Stacks one tenement's stories under a roof deck. The ground story is `shop`
 * tall where that fits, squeezed down to MIN_GROUND before an upper story is
 * given up, and never lower than `baseHeight`. Upper stories that still do not
 * fit at MIN_STORY are dropped; the roof is never lower than the ground story.
 */
function stackStories(
  stories: number,
  shop: number,
  roof: number,
  baseHeight: number,
): Pick<Lot, "stories" | "ground" | "storyHeight" | "roof"> {
  const lowest = Math.max(baseHeight, MIN_GROUND);
  const deck = Math.max(roof, lowest);
  const fitting = Math.min(stories, 1 + Math.floor((deck - lowest) / MIN_STORY + 1e-9));
  if (fitting <= 1) return { stories: 1, ground: deck, storyHeight: 0, roof: deck };
  const ground = Math.max(lowest, Math.min(shop, deck - MIN_STORY * (fitting - 1)));
  return {
    stories: fitting,
    ground,
    storyHeight: (deck - ground) / (fitting - 1),
    roof: deck,
  };
}

/**
 * Divides a building box into a row of tenements with independent heights,
 * story datums and frontage planes, separated here and there by service wells.
 * The tallest tenement fills the box; with two or more tenements and at least
 * three stories, one always steps down so the row never shares one roofline.
 * Every ground story rises at least to `baseHeight`.
 */
export function planLots(site: SiteBudget, seed: string): Lot[] {
  const rng = new Rng(`${seed}/lots`);
  const reference = (site.height - ROOF_RESERVE) / site.stories;
  const count =
    site.width < 8.5
      ? 1
      : Math.max(2, Math.round(site.width / rng.float(5.2, 8)));
  const wells: number[] = [];
  for (let i = 0; i + 1 < count; i++) {
    const fits = site.depth >= 5 && site.width / count > 4.4;
    wells.push(fits && rng.bool(0.3) ? rng.float(1.0, 1.5) : 0);
  }
  const weights = Array.from({ length: count }, () => rng.float(0.75, 1.3));
  const share =
    (site.width - wells.reduce((sum, w) => sum + w, 0)) /
    weights.reduce((sum, w) => sum + w, 0);
  const tallest = rng.int(0, count - 1);
  const drops: number[] = weights.map((_, i) =>
    i === tallest
      ? 0
      : Math.min(rng.pick([0, 0, 1, 1, 2]), Math.max(0, site.stories - 2)),
  );
  if (count > 1 && site.stories >= 3 && !drops.some((drop) => drop > 0))
    drops[(tallest + 1 + rng.int(0, count - 2)) % count] = 1;

  const slack = Math.max(0, site.height - ROOF_RESERVE - site.stories * 2.8);
  const tenements: Lot[] = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const width = i === count - 1 ? site.width - x : weights[i] * share;
    const stories = site.stories - drops[i];
    const key = `lot-${i}`;
    const style = lotStyle(new Rng(`${seed}/${key}/style`));
    const shop = Math.min(MAX_SHOP, reference * rng.float(1.0, 1.22));
    let stack: ReturnType<typeof stackStories>;
    let top: number;
    if (i === tallest) {
      const parapet = Math.min(1, ROOF_RESERVE + slack * 0.6);
      const roof = site.height - parapet;
      stack = stackStories(stories, Math.min(shop, roof - (stories - 1) * 2.6), roof, site.baseHeight);
      top = site.height;
    } else {
      // A lower tenement ends a visible step below the box top, thinning its parapet before losing height.
      const wanted = shop + (stories - 1) * reference * rng.float(0.94, 1);
      const limit = site.height - 0.3;
      const parapet = Math.max(0.3, Math.min(rng.float(0.5, 1), limit - wanted));
      stack = stackStories(stories, shop, Math.min(wanted, limit - parapet), site.baseHeight);
      top = Math.min(site.height, stack.roof + parapet);
    }
    const roll = rng.next();
    const jetty = stack.stories > 1 && roll < 0.34 ? rng.float(0.3, MAX_JETTY) : 0;
    const setback =
      stack.stories > 2 && site.depth >= 6 && roll > 0.9 ? rng.float(0.6, 1.2) : 0;
    tenements.push({
      index: 0,
      kind: "tenement",
      x0: x,
      x1: x + width,
      ...stack,
      top,
      front: jetty - setback,
      back: stack.stories > 1 && rng.bool(0.2) ? 0.3 : 0,
      style,
      key,
    });
    x += width + (wells[i] ?? 0);
  }

  const lots: Lot[] = [];
  for (let i = 0; i < count; i++) {
    lots.push(tenements[i]);
    if (!wells[i]) continue;
    const left = tenements[i],
      right = tenements[i + 1];
    const ground = Math.min(left.ground, right.ground);
    const roof = Math.min(left.roof, right.roof) - rng.float(0.4, 2.4);
    const rises = roof - ground > MIN_STORY;
    lots.push({
      index: 0,
      kind: "well",
      x0: left.x1,
      x1: right.x0,
      stories: rises ? 2 : 1,
      ground,
      storyHeight: rises ? roof - ground : 0,
      roof: rises ? roof : ground,
      top: rises ? roof + 0.3 : ground,
      front: -rng.float(1.2, Math.min(3, site.depth * 0.4)),
      back: 0,
      style: left.style,
      key: `well-${i}`,
    });
  }
  lots.forEach((lot, index) => (lot.index = index));
  return lots;
}
