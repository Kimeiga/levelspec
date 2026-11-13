import type { V3 } from '../../../architecture/types.ts';
import type { Rng } from "../../../generate/rng.ts";
import type { KitSlot } from "../../kit-mesh.ts";
import type { Pen } from "../../pen.ts";
import type { Facade } from "../facade.ts";
import type { Kit } from "../kit.ts";
import type { Lot } from "../massing.ts";
import { GALVANIZED, SHUTTERS, shade } from "../palette.ts";
import { rollerShutter } from "../shutters.ts";
import { weatheredPen } from "../weathered.ts";
import { wallBoard } from "../signs.ts";
import { securityBars } from "../windows.ts";
import { greengrocer } from "./greengrocer.ts";
import { grocer } from "./grocer.ts";
import { hardware } from "./hardware.ts";
import { herbalist } from "./herbalist.ts";
import { roast } from "./roast.ts";
import type { Interior, Trade } from "./room.ts";
import { drawFrontage } from "./frontage.ts";

/** Wall kept on each side of a shop opening within its bay, meters. */
const PIER = 0.3;
/** Height of the shop floor above the building base, meters. */
const STEP = 0.12;
/** Narrowest bay and lowest ground story that take a shop, meters. */
const MIN_BAY = 2.4;
const MIN_STORY = 2.9;
/** Highest opening head, and the wall kept between it and the story above, meters. */
const MAX_HEAD = 2.6;
const LINTEL = 0.7;
/** Shallowest and deepest room, meters. */
const MIN_DEPTH = 2.4;
const MAX_DEPTH = 3.6;
/** Height of the rolled shutter's housing over the opening, meters. */
const HOUSING = 0.22;
/**
 * The fascia board stands this far above the housing and below the story
 * line, and is hung only where at least `least` of height remains. Under the
 * lowest lintel that leaves 0.30 m, clear of the limit by more than rounding.
 */
const FASCIA = { below: 0.06, above: 0.12, least: 0.28 };

/** The trades a shop may draw, with their relative frequency. */
const TRADES: [Trade, number][] = [
  [grocer, 3],
  [greengrocer, 2.5],
  [roast, 2],
  [hardware, 2],
  [herbalist, 2],
];

/**
 * A shop cut into one ground-story bay, in facade coordinates: the opening
 * spans U from `x0` to `x1` and Z from `floor` to `head` on the wall plane,
 * and the room behind it is `depth` deep.
 */
export interface ShopPlan {
  x0: number;
  x1: number;
  floor: number;
  head: number;
  depth: number;
  /** Seed path of this shop. */
  key: string;
  /** Optional explicit shutter paint in finite, nonnegative linear RGB; omission preserves the selected finish. */
  shutterColor?: V3;
}

/**
 * Decides whether the bay spanning `u0..u1` of a front facade opens onto a
 * shop and sizes its room. The decision depends only on the facade's shop
 * chance and the bay's own random stream, never on detail, so raising the
 * chance keeps every shop already open. Returns undefined for a bay that
 * stays closed: one not drawn, too small, or without clear space behind it.
 */
export function planShop(facade: Facade, u0: number, u1: number, key: string, kit: Kit): ShopPlan | undefined {
  const rng = kit.rng(`${key}/shop`);
  if (rng.next() >= facade.shops) return undefined;
  const story = facade.lot.ground;
  if (u1 - u0 < MIN_BAY || story < MIN_STORY) return undefined;
  const x0 = u0 + PIER,
    x1 = u1 - PIER,
    head = Math.min(MAX_HEAD, story - LINTEL);
  const clear = facade.hollow(x0, x1, head, MAX_DEPTH);
  if (clear < MIN_DEPTH) return undefined;
  return { x0, x1, floor: STEP, head, depth: MIN_DEPTH + (clear - MIN_DEPTH) * rng.float(0.5, 1), key };
}

/** Draws concrete floors and ceilings with the shared kit finish; painted walls retain their authored coat. */
function shell(pen: Pen, plan: ShopPlan, coat: KitSlot, look: Interior): void {
  const { x0, x1, floor, head } = plan,
    back = -plan.depth,
    dado = floor + Math.min(look.dadoHeight, head - floor - 0.3);
  pen.face("concrete", [[x0, 0, floor], [x1, 0, floor], [x1, back, floor], [x0, back, floor]], [0, 0, 1], look.floor);
  pen.face("concrete", [[x0, 0, head], [x1, 0, head], [x1, back, head], [x0, back, head]], [0, 0, -1], look.ceiling);
  for (const [z0, z1, wash] of [
    [floor, dado, look.dado],
    [dado, head, look.wall],
  ] as const) {
    pen.face(coat, [[x0, 0, z0], [x0, back, z0], [x0, back, z1], [x0, 0, z1]], [1, 0, 0], shade(wash, 0.94));
    pen.face(coat, [[x1, 0, z0], [x1, back, z0], [x1, back, z1], [x1, 0, z1]], [-1, 0, 0], shade(wash, 0.94));
    pen.face(coat, [[x0, back, z0], [x1, back, z0], [x1, back, z1], [x0, back, z1]], [0, 1, 0], wash);
  }
}

/**
 * Draws what frames the opening on the street side: the housing of the raised
 * roller shutter with its last slats showing, the guides, a threshold strip,
 * sometimes a folded scissor gate, and the fascia sign. Projects at most 0.13 m.
 */
function shopfront(pen: Pen, plan: ShopPlan, lot: Lot, kit: Kit, rng: Rng): void {
  const { x0, x1, floor, head } = plan;
  const selectedPaint = rng.bool(0.5) ? lot.style.shutter : rng.pick(SHUTTERS);
  const paint = plan.shutterColor ?? selectedPaint;
  rng.float(0, 0.3);
  const curtain = head - .18;
  rollerShutter(pen, x0, x1, curtain, head, paint, kit);
  weatheredPen(pen, kit, "frame").box("metal", [x0, 0, floor - 0.02], [x1, 0.025, floor], shade(GALVANIZED, 0.7), "bd");
  if (rng.bool(0.5)) {
    const steel = shade(GALVANIZED, 0.6);
    rng.float(0.1, 0.6);
    const left = rng.bool() ? x0 + 0.01 : x1 - 0.27;
    securityBars(pen.move(0, -0.05, 0), left, floor + 0.01, 0.26, curtain - 0.1 - floor, "diamond", steel, kit);
  }
  const height = Math.min(lot.ground - head - HOUSING - FASCIA.below - FASCIA.above, 0.62, (x1 - x0) / 4);
  if (height >= FASCIA.least) wallBoard(pen, (x0 + x1) / 2 - height * 2, head + HOUSING + FASCIA.below, height * 4, height, kit, rng);
}

/**
 * Draws a planned shop on its facade: the room shell into the facade's own
 * envelope part in the wall finish `coat`, the shopfront into `openings`, and
 * one trade's fittings and stock into `shop-<trade>`. Nothing in that part
 * leaves the room. Grounded street displays have a separate `shop-frontage` part.
 * An explicit trade fixes the shop's business; otherwise its named stream selects one.
 */
export function drawShop(facade: Facade, plan: ShopPlan, coat: KitSlot, kit: Kit, chosenTrade?: Trade): void {
  if (plan.shutterColor && (plan.shutterColor.length !== 3 || plan.shutterColor.some(value => !Number.isFinite(value) || value < 0)))
    throw new Error("Explicit shop shutter paint must be finite nonnegative linear RGB.");
  const rng = kit.rng(`${plan.key}/trade`);
  const trade = chosenTrade ?? rng.weighted(TRADES);
  shell(facade.pen, plan, coat, trade.interior(rng));
  shopfront(facade.pen.into("openings"), plan, facade.lot, kit, kit.rng(`${plan.key}/front`));
  trade.furnish({
    pen: facade.pen.into(`shop-${trade.name}`).move(plan.x0, 0, plan.floor).facing([0, 0, 0], [1, 0, 0], [0, -1, 0]),
    width: plan.x1 - plan.x0,
    depth: plan.depth,
    height: plan.head - plan.floor,
    kit,
    key: plan.key,
  });
  if (facade.frontage && (trade.name === "grocer" || trade.name === "greengrocer" || trade.name === "herbalist" || trade.name === "hardware")) {
    drawFrontage({
      pen: facade.pen.move(plan.x0, 0, 0), width: plan.x1 - plan.x0,
      trade: trade.name, kit, key: plan.key,
      available: (x0,x1,depth,height) => facade.frontage!(plan.x0+x0,plan.x0+x1,depth,height),
    });
  }
}
