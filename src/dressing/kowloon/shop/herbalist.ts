import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import type { Pen } from "../../pen.ts";
import { GALVANIZED, shade, srgb } from "../palette.ts";
import { counter, counterScale, hook, pendant, priceCard, rail, shelving, stool } from "./fittings.ts";
import { ball, front, lathe, limb } from "./forms.ts";
import { CONTENTS, LINES, garlicString, jar, sack, saltedFish, sausages, stockShelf } from "./goods.ts";
import { onLeftWall, amenities, stream, type Room, type Trade } from "./room.ts";
import { basket } from "./wares.ts";

const ROSEWOOD = srgb("#5a3222");
const BRASS = srgb("#c8a04a");
const SACKING = srgb("#c8b48a");
const DRIED = ["#6a1e1a", "#3a2a1e", "#e8dcc0", "#a85a1e", "#c8a050", "#5a4a2a", "#d8862c", "#8a6a3a"].map(srgb);

/**
 * Draws a cabinet of small labeled drawers over cupboard doors, filling
 * `width` and `height` from the pen origin and 0.34 m deep. Each drawer has
 * its own front, brass pull and paper label.
 */
function drawerCabinet(pen: Pen, width: number, height: number, tint: V3, rng: Rng): void {
  const base = 0.72;
  pen.box("timber", [0, 0.02, 0], [width, 0.34, height], shade(tint, 0.75), "df");
  const doors = Math.max(2, Math.round(width / 0.55));
  for (let i = 0; i < doors; i++) {
    const x0 = (i * width) / doors + 0.012,
      x1 = ((i + 1) * width) / doors - 0.012;
    pen.box("timber", [x0, 0, 0.07], [x1, 0.02, base - 0.03], shade(tint, rng.float(0.9, 1.05)), "df");
    pen.box("timber", [x0 + 0.05, -0.006, 0.12], [x1 - 0.05, 0, base - 0.08], shade(tint, 0.82), "df");
    ball(pen, "metal", [i % 2 ? x0 + 0.03 : x1 - 0.03, -0.012, base * 0.55], 0.012, BRASS, 5);
  }
  const columns = Math.max(3, Math.round(width / 0.19)),
    rows = Math.max(3, Math.round((height - base - 0.04) / 0.15));
  const w = width / columns,
    h = (height - base - 0.04) / rows;
  for (let column = 0; column < columns; column++)
    for (let row = 0; row < rows; row++) {
      const x = column * w,
        z = base + row * h;
      pen.box("timber", [x + 0.006, 0, z + 0.006], [x + w - 0.006, 0.02, z + h - 0.006], shade(tint, rng.float(0.88, 1.12)), "df");
      ball(pen, "metal", [x + w / 2, -0.008, z + h * 0.34], 0.009, BRASS, 5, [1, 1, 1], 2);
      front(pen, "paint", x + w * 0.2, x + w * 0.8, z + h * 0.56, z + h * 0.84, -0.001, shade(srgb("#e8dcc0"), rng.float(0.8, 1)));
      front(pen, "paint", x + w * 0.3, x + w * 0.7, z + h * 0.64, z + h * 0.76, -0.002, srgb("#3a1a14"));
    }
}

/** Draws an abacus lying on `at`: a rosewood frame, a dividing beam, and beads on nine rods. */
function abacus(pen: Pen, at: V3): void {
  const [x, y, z] = at;
  const w = 0.32,
    d = 0.15;
  for (const edge of [y, y + d - 0.012]) pen.box("timber", [x, edge, z], [x + w, edge + 0.012, z + 0.022], ROSEWOOD, "d");
  for (const edge of [x, x + w - 0.012]) pen.box("timber", [edge, y, z], [edge + 0.012, y + d, z + 0.022], ROSEWOOD, "d");
  pen.box("timber", [x, y + d * 0.66, z], [x + w, y + d * 0.66 + 0.01, z + 0.022], ROSEWOOD, "d");
  for (let rod = 0; rod < 9; rod++) {
    const rx = x + 0.03 + rod * ((w - 0.06) / 8);
    pen.bar("timber", [rx, y + 0.01, z + 0.012], [rx, y + d - 0.01, z + 0.012], 0.004, srgb("#c8b888"));
    for (const bead of [0.022, 0.038, 0.054, 0.082, 0.118, 0.131])
      ball(pen, "pane", [rx, y + bead, z + 0.012], 0.012, shade(ROSEWOOD, 0.7), 5, [1, 0.62, 1], 2);
  }
}

/** Draws a stone mortar with its pestle standing in it, on `at`. */
function mortar(pen: Pen, at: V3): void {
  const stone = srgb("#8a8a84");
  lathe(
    pen,
    "paint",
    at,
    [[0.05, 0], [0.075, 0.02], [0.085, 0.09], [0.078, 0.092], [0.05, 0.03], [0, 0.03]],
    [stone, stone, shade(stone, 1.15), shade(stone, 0.7), shade(stone, 0.55)],
    9,
  );
  limb(pen, "paint", [[at[0] + 0.01, at[1], at[2] + 0.035], [at[0] + 0.05, at[1] + 0.02, at[2] + 0.17]], [0.022, 0.014], shade(stone, 1.1), 6);
}

/** Hangs a tied bundle of dried herbs or roots from `at`. */
function herbBundle(pen: Pen, at: V3, rng: Rng): void {
  const tint = rng.pick(DRIED);
  for (let stem = 0; stem < 7; stem++) {
    const angle = rng.float(0, Math.PI * 2),
      spread = rng.float(0.02, 0.06),
      length = rng.float(0.22, 0.34);
    limb(
      pen,
      "paint",
      [
        [at[0], at[1], at[2]],
        [at[0] + Math.cos(angle) * spread * 0.3, at[1] + Math.sin(angle) * spread * 0.3, at[2] - 0.08],
        [at[0] + Math.cos(angle) * spread, at[1] + Math.sin(angle) * spread, at[2] - length],
      ],
      [0.006, 0.01, 0.006],
      shade(tint, rng.float(0.8, 1.25)),
      4,
    );
  }
}

/**
 * Furnishes a herbalist and dried-goods shop: a wall of labeled drawers
 * under a row of ceramic jars, a rosewood counter with a scale, abacus,
 * mortar and specimen jars, open sacks and baskets of dried goods along the
 * front, jar shelving on the left wall, and cured sausages, salted fish and
 * herb bundles on a rail overhead.
 */
function furnish(room: Room): void {
  const { pen, width: W, depth: D, height: H } = room;
  const rng = stream(room, "fittings");
  const wood = shade(ROSEWOOD, rng.float(0.85, 1.2));

  const cabinetHeight = Math.min(H - 0.42, 1.9);
  const cabinet = pen.move(0.05, D - 0.36, 0);
  drawerCabinet(cabinet, W - 0.1, cabinetHeight, wood, stream(room, "drawers"));
  stockShelf(
    cabinet,
    { x0: 0.04, x1: W - 0.14, y: 0.05, depth: 0.26, z: cabinetHeight, clear: H - cabinetHeight - 0.03 },
    [LINES.ceramicJars, LINES.ceramicJars, LINES.bigJars],
    stream(room, "jars"),
    0.6,
  );

  const sideLength = D - 0.36 - 0.05 - 1.0;
  if (sideLength >= 0.8) {
    const unit = Math.min(H - 0.3, 1.9);
    const left = onLeftWall(room, 1.0, 0.285);
    const sideStock = stream(room, "side");
    for (const shelf of shelving(left, sideLength, 0.28, unit, 4, "timber", wood, H - unit - 0.03))
      stockShelf(left, shelf, shelf.z > unit - 0.01 ? [LINES.cartons] : [LINES.bigJars, LINES.bigJars, LINES.jars, LINES.ceramicJars, LINES.cartons], sideStock);
  }

  const counterWidth = Math.min(1.9, W - 0.85);
  const counterAt = W - 0.06 - counterWidth;
  const bench = pen.move(counterAt, 0.95, 0);
  const top = counter(bench, counterWidth, 0.5, 0.92, "timber", wood, rng);
  const wares = stream(room, "counter");
  counterScale(bench, [counterWidth - 0.22, 0.27, top.z], shade(BRASS, wares.float(0.8, 1.05)));
  abacus(bench, [0.08, 0.06, top.z]);
  if (counterWidth >= 1.2) mortar(bench, [0.56, 0.3, top.z]);
  // Specimen jars stand between the abacus and the scale.
  for (let x = 0.75; x < counterWidth - 0.45; x += 0.2) jar(bench, [x, 0.14, top.z], 0.08, 0.22, wares.pick(CONTENTS), srgb("#2a2a2c"));
  stool(pen, [counterAt + counterWidth * 0.5, 1.8, 0], shade(wood, 1.1));

  // Open sacks and baskets of dried goods stand in two staggered rows before the counter.
  const floor = stream(room, "floor");
  for (let row = 0; row < 2; row++)
    for (let x = 0.28 + row * 0.2; x < W - 0.24; x += 0.43) {
      const radius = floor.float(0.17, 0.2),
        at: V3 = [x, 0.27 + row * 0.38, 0],
        goods = floor.pick(DRIED);
      if (floor.bool(0.6)) {
        const height = floor.float(0.32, 0.46) + row * 0.12;
        sack(pen, at, radius, height, shade(SACKING, floor.float(0.8, 1.1)), goods);
        priceCard(pen, [x + radius * 0.25, at[1] + radius * 0.3, height - 0.03], floor);
      } else {
        const height = 0.2 + row * 0.14;
        basket(pen, at, radius, height, shade(srgb("#b89a62"), floor.float(0.8, 1.15)));
        lathe(pen, "paint", at, [[radius * 0.93, height - 0.02], [radius * 0.5, height + 0.03], [0, height + 0.05]], goods, 9);
        priceCard(pen, [x + radius * 0.25, at[1] + radius * 0.3, height], floor);
      }
    }

  const overhead = stream(room, "overhead");
  const steel = shade(GALVANIZED, 0.7);
  const railZ = H - 0.14;
  rail(pen, [0.12, 0.3, railZ], [W - 0.12, 0.3, railZ], H, steel);
  for (let x = 0.3; x < W - 0.25; x += overhead.float(0.17, 0.26)) {
    const held = hook(pen, [x, 0.3, railZ], 0.06, steel);
    const pick = overhead.next();
    if (pick < 0.4) sausages(pen, held, overhead);
    else if (pick < 0.65) saltedFish(pen, held, overhead.float(0.28, 0.4), overhead);
    else if (pick < 0.85) herbBundle(pen, held, overhead);
    else garlicString(pen, held, overhead.float(0.3, 0.42), overhead);
  }
  pendant(pen, [counterAt + counterWidth * 0.5, 0.78, H], Math.max(0.3, H - 1.8));
  amenities(room, D * 0.45, D >= 3.2 ? 1.6 : undefined);
}

/** The herbalist: dark paneling under ocher walls on a tiled floor. */
export const herbalist: Trade = {
  name: "herbalist",
  interior: (rng) => ({
    floor: shade(srgb("#7a6a58"), rng.float(0.85, 1.05)),
    ceiling: srgb("#d0c8b0"),
    wall: srgb("#e0d0a8"),
    dado: rng.pick([srgb("#8a5a3c"), srgb("#7a4a34"), srgb("#96684a")]),
    dadoHeight: 1.1,
  }),
  furnish,
};
