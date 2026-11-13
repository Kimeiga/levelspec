import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import type { Pen } from "../../pen.ts";
import { GALVANIZED, shade, srgb } from "../palette.ts";
import { hook, rail, shelving, tubeLight } from "./fittings.ts";
import { lathe } from "./forms.ts";
import { LINES, PLASTICS, cartonStack, stockShelf } from "./goods.ts";
import { onLeftWall, stream, type Room, type Trade } from "./room.ts";
import { basin, basket, broom, bucket, clayPot, coil, duster, hangingWok, kettle, ladder, ladles, mop, pot, stoolStack } from "./wares.ts";

const IRON = srgb("#3c3c3a");
const CANE = srgb("#b89a62");
const HOSES = ["#2f8f4f", "#d8a82c", "#c8281e", "#c8b888", "#1f5fa8"].map(srgb);

/** Hangs one ware from the hook point `at`: a wok, pot, kettle, pail, coil, duster, basket or ladles. */
function hangWare(pen: Pen, at: V3, rng: Rng): void {
  const [x, y, z] = at;
  const pick = rng.next();
  if (pick < 0.2) hangingWok(pen, at, rng.float(0.15, 0.2), shade(IRON, rng.float(0.8, 1.4)), rng.bool(0.6));
  else if (pick < 0.34) {
    const radius = rng.float(0.1, 0.14);
    pen.bar("metal", at, [x, y, z - 0.1], 0.005, shade(GALVANIZED, 0.7));
    pot(pen, [x, y, z - 0.1 - radius * 1.4 - 0.1], radius, radius * 1.4, shade(GALVANIZED, rng.float(1, 1.25)));
  } else if (pick < 0.48) {
    const radius = rng.float(0.09, 0.12);
    kettle(pen, [x, y, z - radius * 2.15], radius, shade(GALVANIZED, rng.float(0.95, 1.25)));
  } else if (pick < 0.62) {
    const radius = rng.float(0.12, 0.15),
      height = radius * 1.7;
    const tints = rng.sample(PLASTICS, 2);
    pen.bar("metal", at, [x, y, z - 0.12], 0.005, shade(GALVANIZED, 0.7));
    for (let i = 0; i < 3; i++) bucket(pen, [x, y, z - 0.12 - height - 0.012 - (2 - i) * 0.05], radius, height, tints[i % 2]);
  } else if (pick < 0.76) coil(pen, at, rng.float(0.14, 0.19), rng.float(0.011, 0.016), rng.int(3, 5), rng.pick(HOSES));
  else if (pick < 0.86) duster(pen, at, rng);
  else if (pick < 0.94) {
    const radius = rng.float(0.13, 0.17);
    pen.bar("metal", at, [x, y, z - 0.1], 0.005, shade(GALVANIZED, 0.7));
    basket(pen, [x, y, z - 0.1 - radius * 1.1 - 0.012], radius, radius * 1.1, shade(CANE, rng.float(0.8, 1.15)));
  } else ladles(pen, at, rng);
}

/** Stands one stack of wares on the floor point `at`: nested pails, basins, stools, clay pots or baskets. */
function floorStack(pen: Pen, at: V3, kind: number, rng: Rng): void {
  const [x, y, z] = at;
  if (kind === 0) {
    const tints = rng.sample(PLASTICS, 3);
    for (let i = 0; i < rng.int(4, 6); i++) bucket(pen, [x, y, z + i * 0.065], 0.17, 0.3, tints[i % 3]);
  } else if (kind === 1) {
    const tints = rng.sample(PLASTICS, 2);
    for (let i = 0; i < rng.int(4, 7); i++) basin(pen, [x, y, z + i * 0.04], 0.23, tints[i % 2]);
  } else if (kind === 2) stoolStack(pen, at, rng.int(3, 6), rng.sample(PLASTICS, 2));
  else if (kind === 3) {
    for (let i = 0; i < 3; i++) clayPot(pen, [x + (i - 1) * 0.04 * (i % 2 ? 1 : -1), y, z + i * 0.2], 0.15 - i * 0.012, rng);
  } else {
    for (let i = 0; i < rng.int(3, 5); i++) basket(pen, [x, y, z + i * 0.07], 0.2, 0.2, shade(CANE, rng.float(0.8, 1.15)));
  }
}

/**
 * Furnishes a hardware and household store: rails of woks, pots, kettles,
 * pails and coils overhead, steel shelving of tins, crockery and flasks on
 * the back and left walls, nested stacks of wares across the opening, a bin
 * of brooms and mops, coiled hose on the wall and a bamboo ladder.
 */
function furnish(room: Room): void {
  const { pen, width: W, depth: D, height: H } = room;
  const rng = stream(room, "fittings");
  const steel = shade(srgb("#6f7f78"), rng.float(0.8, 1.15));
  const unit = Math.min(H - 0.3, 1.95);

  const back = pen.move(0.05, D - 0.36, 0);
  const backStock = stream(room, "back");
  for (const shelf of shelving(back, W - 0.1, 0.35, unit, 5, "metal", steel, H - unit - 0.03)) {
    const lines =
      shelf.z > unit - 0.01
        ? [LINES.cartons]
        : shelf.z < 0.5
          ? [LINES.paintTins, LINES.paintTins, LINES.ceramicJars]
          : [LINES.mugs, LINES.bowls, LINES.thermoses, LINES.tins, LINES.cartons, LINES.paintTins, LINES.rolls];
    stockShelf(back, shelf, lines, backStock);
  }
  const sideLength = D - 0.36 - 0.05 - 0.95;
  if (sideLength >= 0.8) {
    const left = onLeftWall(room, 0.95, 0.285);
    const sideStock = stream(room, "side");
    for (const shelf of shelving(left, sideLength, 0.28, unit, 5, "metal", steel, H - unit - 0.03))
      stockShelf(left, shelf, shelf.z > unit - 0.01 ? [LINES.cartons] : [LINES.cartons, LINES.tins, LINES.bowls, LINES.mugs, LINES.thermoses], sideStock);
  }

  const binAt = W - 0.34;
  const overhead = stream(room, "overhead");
  const railSteel = shade(GALVANIZED, 0.7);
  // Hooks on the front rail stop short of the broom bin; those on the rear one clear the side shelving.
  const rails = [{ y: 0.42, from: 0.14, to: binAt - 0.42 }];
  if (D >= 2.9) rails.push({ y: 1.2, from: 0.62, to: W - 0.5 });
  for (const { y, from, to } of rails) {
    rail(pen, [from, y, H - 0.1], [W - 0.14, y, H - 0.1], H, railSteel);
    for (let x = from + 0.24; x < to; x += overhead.float(0.4, 0.5)) hangWare(pen, hook(pen, [x, y, H - 0.1], 0.07, railSteel), overhead);
  }

  const floor = stream(room, "floor");
  const kinds = floor.shuffle([0, 1, 2, 3, 4]);
  let slot = 0;
  for (let x = 0.32; x < binAt - 0.5; x += 0.52) floorStack(pen, [x, 0.34, 0], kinds[slot++ % kinds.length], floor);
  // A second row of taller cartons stands behind the stacks.
  for (let x = 0.6; x < binAt - 0.3; x += 0.55) cartonStack(pen, [x, 0.9, 0], 0.42, floor.float(0.5, 1), floor);

  const bin: V3 = [binAt, 0.36, 0];
  lathe(
    pen,
    "metal",
    bin,
    [[0.2, 0], [0.22, 0.55], [0.23, 0.56], [0.21, 0.55], [0.19, 0.02], [0, 0.02]],
    [steel, shade(steel, 1.2), shade(steel, 0.6), shade(steel, 0.5), shade(steel, 0.4)],
    12,
  );
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + floor.float(-0.3, 0.3);
    const foot: V3 = [bin[0] + Math.cos(angle) * 0.07, bin[1] + Math.sin(angle) * 0.07, 0.02];
    const top: V3 = [bin[0] + Math.cos(angle) * 0.17, bin[1] + Math.sin(angle) * 0.17, floor.float(1.15, Math.min(1.45, H - 0.75))];
    if (i % 3 === 2) mop(pen, foot, top, floor);
    else broom(pen, foot, top, floor);
  }

  const wall = onLeftWall(room, 0.1);
  for (const [x, z] of [[0.22, Math.min(1.85, H - 0.25)], [0.6, Math.min(1.7, H - 0.4)]]) {
    wall.box("metal", [x - 0.015, -0.17, z - 0.015], [x + 0.015, 0, z + 0.015], railSteel, "f");
    coil(wall, [x, -0.09, z - 0.01], floor.float(0.15, 0.2), floor.float(0.011, 0.017), floor.int(3, 5), floor.pick(HOSES));
  }
  if (D >= 2.7) ladder(pen, [W - 0.45, 1.75, 0.03], [W - 0.07, 1.75, Math.min(H - 0.12, 2.25)], 0.34, floor);
  tubeLight(pen, [W * 0.2, D * 0.66, H], [W * 0.8, D * 0.66, H]);
}

/** The hardware store: bare gray render on a worn screed. */
export const hardware: Trade = {
  name: "hardware",
  interior: (rng) => ({
    floor: shade(srgb("#7c7a72"), rng.float(0.85, 1.05)),
    ceiling: srgb("#c8c4b6"),
    wall: srgb("#d8d4c6"),
    dado: rng.pick([srgb("#a8a89c"), srgb("#8f9a90"), srgb("#b0a890")]),
    dadoHeight: 1.1,
  }),
  furnish,
};
