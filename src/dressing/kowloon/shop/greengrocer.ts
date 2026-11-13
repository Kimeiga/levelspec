import type { V3 } from "../../../architecture/types.ts";
import { Rng } from "../../../generate/rng.ts";
import type { Pen } from "../../pen.ts";
import { GALVANIZED, shade, srgb } from "../palette.ts";
import { crate, hangingScale, hook, pendant, priceCard, rail, stool, tubeLight } from "./fittings.ts";
import { limb, rotated } from "./forms.ts";
import { FRUITS, bananas, cabbage, cartonStack, fruit, garlicString, greens, heap, melon, melonHalf, pineapple, root, type Fruit } from "./goods.ts";
import { applePile } from "./stock-mesh.ts";
import { extra, stream, type Room, type Trade } from "./room.ts";

const TIMBER = srgb("#9a7a52");
/** Display crate size and how steeply the tiers tip their crates toward the street. */
const CRATE = { width: 0.5, depth: 0.38, height: 0.17 };
const TIP = 0.2;

/** What one display crate holds: a heap of one fruit, or produce laid out by hand. */
type Load = Fruit | "cabbages" | "greens" | "radishes" | "carrots" | "pineapples";

const LOADS: [Load, number][] = [
  [FRUITS.orange, 3],
  [FRUITS.apple, 2.5],
  [FRUITS.greenApple, 1.2],
  [FRUITS.pear, 1.5],
  [FRUITS.tomato, 1.5],
  [FRUITS.lemon, 1],
  [FRUITS.pomelo, 1.2],
  [FRUITS.plum, 0.8],
  [FRUITS.potato, 1],
  [FRUITS.onion, 1],
  ["cabbages", 1.4],
  ["greens", 1.6],
  ["radishes", 1],
  ["carrots", 1],
  ["pineapples", 0.9],
];

/** Fills one crate, drawn in the crate's own tipped frame, and plants its price card. */
function load(pen: Pen, what: Load, rng: Rng, crateKey: string): void {
  const { width: w, depth: d, height: h } = CRATE;
  if (what === FRUITS.apple) {
    const pose = new Rng(`apple-crate/${crateKey}`);
    const load = rotated(pen, [
      w / 2 + pose.float(-0.006, 0.006), d / 2 + pose.float(-0.006, 0.006), h - 0.052,
    ], "z", pose.pick([0, Math.PI]) + pose.float(-0.035, 0.035));
    applePile(load, [0, 0, 0], [w - 0.02, d - 0.02, 0.112], rng.pick(what.colors));
  } else if (typeof what === "object") {
    // Only the courses that show above the rim are drawn; the heap rises over it.
    const courses = what.radius < 0.03 ? 3 : 2;
    const base = Math.max(0.012, h - what.radius * (courses === 3 ? 3.4 : 2.3));
    heap(pen, [w / 2, d / 2, base], w / 2 - 0.01, d / 2 - 0.01, what.radius, courses, rng, (at) => fruit(pen, at, what, rng));
  } else if (what === "cabbages") {
    for (const x of [0.13, 0.37]) for (const y of [0.1, 0.28]) cabbage(pen, [x + rng.float(-0.01, 0.01), y, h - 0.12], rng.float(0.085, 0.1), rng);
  } else if (what === "greens") {
    for (let x = 0.07; x < w - 0.05; x += 0.075) greens(pen, [x, 0.03, h - 0.05 + rng.float(0, 0.02)], rng.float(0.26, 0.32), rng);
  } else if (what === "radishes" || what === "carrots") {
    const orange = what === "carrots";
    for (let layer = 0; layer < 2; layer++)
      for (let y = 0.05; y < d - 0.04; y += orange ? 0.036 : 0.066) root(
        pen,
        [0.08 + rng.float(0, 0.04), y, h - 0.07 + layer * (orange ? 0.03 : 0.05)],
        rng.float(0.28, 0.36),
        orange,
        rng,
      );
  } else if (what === "pineapples") {
    for (const x of [0.09, 0.25, 0.41]) for (const y of [0.11, 0.27]) pineapple(pen, [x, y, h - 0.13], rng);
  }
  priceCard(pen, [rng.float(0.1, w - 0.1), d - 0.05, h - 0.04], rng);
}

/** Hangs a bundle of thin carrier bags from `at`, as stallholders keep them to hand. */
function bagBundle(pen: Pen, at: V3, rng: Rng): void {
  const tint = rng.pick([srgb("#e8486a"), srgb("#e8e4dc"), srgb("#d8281e")]);
  limb(pen, "paint", [at, [at[0], at[1], at[2] - 0.06], [at[0] + 0.01, at[1], at[2] - 0.22], [at[0], at[1], at[2] - 0.4]], [0.008, 0.03, 0.055, 0.02], tint, 6, 0.6);
}

/**
 * Furnishes a greengrocer: three or four tiers of tipped crates across the opening,
 * each heaped with one kind of fruit or vegetable under its price card, red
 * lamps and hands of bananas overhead, watermelons and a hanging scale where
 * the room is wide enough, and stacked cartons along the back wall.
 */
function furnish(room: Room): void {
  const { pen, width: W, depth: D, height: H } = room;
  const rng = stream(room, "fittings");
  const wood = shade(TIMBER, rng.float(0.75, 1.1));
  const aisle = W >= 2.4;
  const rackEnd = W - (aisle ? 0.82 : 0.06);
  const columns = Math.floor((rackEnd - 0.06) / (CRATE.width + 0.035));
  const pitch = (rackEnd - 0.06) / columns;
  const tiers = D >= 2.9 ? 4 : 3;

  const stock = stream(room, "crates");
  for (let tier = 0; tier < tiers; tier++) {
    const y = 0.06 + tier * 0.47,
      z = 0.3 + tier * 0.25;
    // Each tier is a plank deck on a boarded front that the tier before it mostly hides.
    pen.box("timber", [0.04, y, 0], [rackEnd, y + 0.47, z], shade(wood, 0.75 + tier * 0.05), "dfl");
    for (let column = 0; column < columns; column++) {
      const tipped = rotated(pen, [0.06 + column * pitch + (pitch - CRATE.width) / 2, y + 0.03, z + 0.012], "x", TIP);
      crate(tipped, CRATE.width, CRATE.depth, CRATE.height, shade(wood, stock.float(0.85, 1.25)), stock);
      load(tipped, stock.weighted(LOADS), stock, `${tier}/${column}`);
    }
  }

  const overhead = stream(room, "overhead");
  const lamps = Math.max(2, Math.round(rackEnd / 0.95));
  const lampShade = overhead.pick([srgb("#d8281e"), srgb("#d8281e"), srgb("#e85a20")]);
  for (let i = 0; i < lamps; i++) pendant(pen, [0.06 + ((i + 0.5) * (rackEnd - 0.06)) / lamps, 0.34, H], H - 1.72, lampShade);
  const steel = shade(GALVANIZED, 0.75);
  const railZ = H - 0.2;
  rail(pen, [0.1, 0.98, railZ], [rackEnd - 0.04, 0.98, railZ], H, steel);
  for (let x = 0.3; x < rackEnd - 0.25; x += overhead.float(0.26, 0.4)) {
    const held = hook(pen, [x, 0.98, railZ], 0.07, steel);
    const pick = overhead.next();
    if (pick < 0.6) bananas(pen, held, overhead);
    else if (pick < 0.8) garlicString(pen, held, overhead.float(0.3, 0.45), overhead);
    else bagBundle(pen, held, overhead);
  }

  if (aisle) {
    const melons = stream(room, "melons");
    const x = W - 0.42;
    // A low pallet keeps the melons off the floor.
    pen.box("timber", [x - 0.33, 0.1, 0], [x + 0.33, 0.95, 0.1], shade(wood, 0.8), "df");
    for (const [dx, y, z] of [[-0.14, 0.3, 0.1], [0.15, 0.36, 0.1], [-0.1, 0.68, 0.1], [0.14, 0.72, 0.1]] as V3[]) melon(
      rotated(pen, [x + dx, y, z], "z", melons.float(-0.5, 0.5)),
      [0, 0, 0],
      melons.float(0.3, 0.36),
      melons,
    );
    melonHalf(pen, [x + 0.02, 0.5, 0.345], 0.14);
    hangingScale(pen, [x, 0.5, H], Math.max(0.7, H - 1.25), shade(srgb("#3f7f9a"), melons.float(0.8, 1.1)));
    if (extra(room, "stool", 0.7)) stool(pen, [x, 1.5, 0], shade(wood, 0.8));
  }

  const backStock = stream(room, "back");
  const rackBack = 0.06 + tiers * 0.47;
  for (let x = 0.3; x < W - 0.28; x += 0.5) cartonStack(pen, [x, D - 0.22, 0], 0.44, backStock.float(0.9, Math.min(1.9, H - 0.2)), backStock);
  if (D - 0.45 - rackBack >= 0.5) {
    // Empty crates wait behind the display.
    for (let i = 0; i < 3; i++) crate(
      pen.move(0.12 + backStock.float(0, 0.03), rackBack + 0.08, i * (CRATE.height + 0.012)),
      CRATE.width,
      CRATE.depth,
      CRATE.height,
      shade(wood, backStock.float(0.8, 1.2)),
      backStock,
    );
  }
  tubeLight(pen, [W * 0.2, D * 0.72, H], [W * 0.8, D * 0.72, H]);
}

/** The greengrocer: bare whitewash over a dark wet floor. */
export const greengrocer: Trade = {
  name: "greengrocer",
  interior: (rng) => ({
    floor: shade(srgb("#6a6a64"), rng.float(0.85, 1.05)),
    ceiling: srgb("#cfcabb"),
    wall: srgb("#e4decb"),
    dado: rng.pick([srgb("#c8c4b4"), srgb("#9ab0a0"), srgb("#b8b09a")]),
    dadoHeight: 1,
  }),
  furnish,
};
