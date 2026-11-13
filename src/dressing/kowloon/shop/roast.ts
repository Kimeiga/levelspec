import { drawPoster } from "../../posters.ts";
import { PipeSystem } from "../pipes.ts";
import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import { Pen } from "../../pen.ts";
import { GALVANIZED, SOOT, shade, srgb } from "../palette.ts";
import { hook, pendant, rail, shelving } from "./fittings.ts";
import { lathe, limb, rotated } from "./forms.ts";
import { LINES, stockShelf } from "./goods.ts";
import { onLeftWall, onRightWall, amenities, stream, type Room, type Trade } from "./room.ts";
import { bucket, ladles, pot, wok } from "./wares.ts";
import { hangingChicken, slicedMeat } from "./restaurant-food.ts";
import { GROCER_LINES, grocerProp, propSize } from "./grocer-props.ts";
import { agedShopTimber } from "./timber.ts";
import { kitchenMetal, kitchenTiles } from "./restaurant-surfaces.ts";
import { restaurantCounter, restaurantWorkBench, extractor, bowlStack, condimentGroup, takeawayStack, meatTray, sauceTray } from "./restaurant-fittings.ts";

import { choppingBlock } from "./chopping-block.ts";
import { displayCabinet, counterTowel, orderSlips, chopstickCup } from "./restaurant-work-details.ts";

const STEEL = shade(GALVANIZED, 0.95);

/** Grounds one inexpensive shared meat pile inside an open steel tray. */
function slicedTray(pen: Pen, at: V3, rng: Rng): void {
  const floor = meatTray(pen, at, .34, .24);
  const variation = rng.float(.9, 1);
  slicedMeat(pen, [at[0], at[1], floor], [.30 * variation, .20 * variation, .075]);
}

/** Draws a gas cylinder standing on `at` with its collar and valve. */
function gasCylinder(pen: Pen, at: V3, rng: Rng): void {
  const paint = shade(rng.pick([srgb("#b8281e"), srgb("#2f5f9a"), srgb("#8a8f92")]), rng.float(0.8, 1.05));
  lathe(
    pen,
    "metal",
    at,
    [[0.14, 0], [0.15, 0.03], [0.15, 0.5], [0.11, 0.6], [0.05, 0.63], [0.05, 0.66], [0.09, 0.66], [0.09, 0.74], [0.08, 0.74], [0.08, 0.66]],
    [shade(paint, 0.7), paint, paint, paint, shade(paint, 0.8), shade(paint, 0.6), shade(paint, 0.9), shade(paint, 0.9), shade(paint, 0.5)],
    12,
  );
  lathe(pen, "metal", [at[0], at[1], at[2] + 0.63], [[0.02, 0], [0.02, 0.07], [0.035, 0.075], [0.035, 0.09], [0, 0.09]], srgb("#b8a04a"), 6);
}

/** Draws a barrel roasting oven standing on `at`, its flue supplied separately by the modular pipe kit. */
function roaster(pen: Pen, at: V3, rng: Rng): void {
  const iron = shade([.57,.60,.59], rng.float(.94,1.04));
  const [x, y, z] = at;
  lathe(
    pen,
    "metal",
    at,
    [
      [0.36, 0],
      [0.36, 0.3],
      [0.372, 0.3],
      [0.372, 0.34],
      [0.36, 0.34],
      [0.36, 0.9],
      [0.372, 0.9],
      [0.372, 0.94],
      [0.36, 0.94],
      [0.36, 1.22],
      [0.375, 1.24],
      [0.3, 1.31],
      [0.1, 1.37],
      [0, 1.37],
    ],
    [shade(iron,.64),iron,shade(iron,1.3),shade(iron,.85),iron,iron,shade(iron,1.3),shade(iron,.85),iron,shade(iron,1.18),shade(iron,1.03),shade(iron,.9),shade(iron,.75)],
    14,
    pen.mesh.textured("brushed-metal") ? pen.mesh.repeat("brushed-metal") : undefined,
  );
  limb(
    pen,
    "metal",
    [[x - 0.1, y - 0.2, z + 1.33], [x - 0.1, y - 0.2, z + 1.42], [x + 0.1, y - 0.2, z + 1.42], [x + 0.1, y - 0.2, z + 1.33]],
    [0.008, 0.008, 0.008, 0.008],
    shade(iron, 0.7),
    4,
  );
  // The hatch sits over a dark gasket, with raised hinges and an insulated latch.
  pen.box("paint", [x-.152,y-.369,z+.407], [x+.152,y-.318,z+.793], srgb("#383b37"), "f");
  pen.box("metal", [x-.14,y-.376,z+.42], [x+.14,y-.367,z+.78], shade(iron,1.18), "f");
  for (const level of [.46,.70]) {
    pen.box("metal", [x-.151,y-.383,z+level], [x-.12,y-.367,z+level+.036], [.82,.84,.83], "f");
  }
  pen.box("metal", [x+.075,y-.388,z+.56], [x+.108,y-.373,z+.65], [.80,.82,.80], "f");
  pen.bar("paint", [x+.085,y-.397,z+.575], [x+.085,y-.397,z+.637], .018, srgb("#39362d"));
  for (const dx of [-.12,.12]) for (const dz of [.44,.76]) {
    const bolt = kitchenMetal(rotated(pen,[x+dx,y-.379,z+dz],"x",Math.PI/2));
    lathe(bolt,"metal",[0,0,0],[[.006,0],[.006,.004],[0,.004]],[.88,.90,.90],6);
  }
  const gauge = rotated(pen,[x,y-.352,z+1.08],"x",Math.PI/2);
  lathe(kitchenMetal(gauge),"metal",[0,0,0],[[.049,0],[.049,.016],[.043,.018]],[.80,.82,.81],16);
  lathe(gauge,"paint",[0,0,0],[[.043,.017],[0,.017]],srgb("#d6cba7"),16);
  for (let tick = 0; tick < 9; tick++) {
    const angle = (-.8 + tick * .325) * Math.PI;
    gauge.bar("paint",[Math.cos(angle)*.031,Math.sin(angle)*.031,.018],
      [Math.cos(angle)*.037,Math.sin(angle)*.037,.018],.0015,srgb("#514b3d"));
  }
  gauge.bar("paint",[0,0,.02],[.019,.022,.02],.0025,srgb("#9a3f2c"));
}

/** Furnishes a compact working restaurant with dense display zones, clear chopping space and fitted storage. */
function furnish(sourceRoom: Room): void {
  let room = sourceRoom;
  const layout = stream(room, "layout");
  if (layout.bool()) {
    const frame = room.pen.facing([room.width, 0, 0], [-1, 0, 0], [0, 1, 0]);
    room = { ...room, pen: new Pen(frame.mesh, frame.part, frame.matrix, !frame.mirrored) };
  }
  const { pen, width: W, depth: D, height: H } = room;
  const rng = stream(room, "fittings");
  const counterY = D >= 2.7  &&  layout.bool() ? .26 : .08;
  const counterEnd = W - (W < 2.3 ? .56 : .72);
  const bench = pen.move(.06, counterY, 0);
  const benchWidth = counterEnd - .06;
  const top = restaurantCounter(bench, benchWidth, .55, .92, rng.int(1, 100000));
  choppingBlock(bench, [benchWidth - .26, .3, top]);
  const stock = stream(room, "counter-stock");
  if (benchWidth >= 1.7) {
    condimentGroup(bench, [.19, .37, top], stock);
    takeawayStack(bench, [.53, .42, top], stock);
    if (benchWidth >= 2.3) grocerProp(bench, "counter-scale", [.92, .4, top], [.28, .26, .32], -.1);
  }
  const start = benchWidth >= 1.7 ? .48 : .20;
  for (let x = start, index = 0; x < benchWidth - .66; x += .38, index++) {
    const tray = rotated(bench, [x, .14 + stock.float(-.006, .006), top], "z", stock.float(-.05, .05));
    if (index % 3 === 2) sauceTray(tray, [0, 0, 0]);
    else slicedTray(tray, [0, 0, 0], stock);
  }
  if (benchWidth < 1.7) bowlStack(bench, [.16, .41, top], 3, .075, srgb("#385c7a"));

  const railZ = Math.min(H - .22, 1.98), railY = counterY + .30;
  const displayWidth = benchWidth >= 1.7 ? benchWidth - .72 : benchWidth - .62;
  if (benchWidth >= 1.7) {
    displayCabinet(bench, displayWidth, top, railZ);
    counterTowel(bench, benchWidth - .62, top);
  }
  const displayStart = .06;
  rail(pen, [displayStart+.10, railY, railZ], [displayStart+displayWidth-.06, railY, railZ], H, STEEL);
  const meats = stream(room, "meats");
  const foodPen = pen.into(`${pen.part}/display-food`);
  for (let x = .23, index = 0; x < displayWidth - .07; x += meats.float(.235, .265), index++) {
    const yaw = meats.float(-.32, .32);
    const hanging = rotated(foodPen, [x, railY, railZ], "z", yaw);
    const held = hook(hanging, [0, 0, 0], (index % 3 === 1 ? .16 : .065) + meats.float(0,.025), STEEL);
    hangingChicken(hanging, held, meats.float(.88, 1.01), meats.int(0, 2));
  }
  const lamps = Math.max(1, Math.round(displayWidth / 1.05));
  for (let i = 0; i < lamps; i++) {
    const lamp = pen.into(`${pen.part}/task-lamp-${i}`);
    pendant(lamp, [.06 + (i + .5) * displayWidth / lamps, counterY + .43, H], H - railZ - .04, srgb("#b83e28"));
  }

  roaster(kitchenMetal(pen), [.46, D - .46, 0], stream(room, "oven"));
  new PipeSystem(pen, { radius: 0.06, color: shade(GALVANIZED, 0.8), kit: room.kit }).run([[.62, D - .34, 1.3], [.62, D - .34, H]]);
  const stoveWidth = W - .98;
  if (stoveWidth >= .8) {
    const stove = pen.move(.92, D - .64, 0), steel = kitchenMetal(stove);
    const hob = restaurantWorkBench(stove, stoveWidth, .56, .78);
    steel.box("metal", [.015,.54,hob.z], [stoveWidth-.015,.56,hob.z+.075], [.67,.70,.70], "d");
    steel.bar("metal", [.015,.55,hob.z+.075], [stoveWidth-.015,.55,hob.z+.075], .008, [.88,.90,.91]);
    pot(steel, [.29, .3, hob.z], .18, .28, GALVANIZED, srgb("#795231"));
    if (stoveWidth >= 1.25) {
      lathe(steel, "metal", [.82, .3, hob.z], [[.15, 0], [.15, .05], [.11, .05]], SOOT, 10);
      wok(stove, [.82, .3, hob.z + .05], .22, srgb("#353430"));
    }
    if (stoveWidth >= 1.95) {
      pot(steel, [stoveWidth - .28, .27, hob.z], .15, .18, GALVANIZED);
      bowlStack(stove, [stoveWidth - .70, .28, hob.z], 5, .075, srgb("#385c7a"));
    }
    orderSlips(pen, [1.02, D - .075, Math.min(1.59, H - .5)], Math.min(.72, stoveWidth - .16), stream(room, "orders"));
    chopstickCup(stove, [Math.min(stoveWidth-.10,.57),.43,hob.z], stream(room, "chopsticks"));
    ladles(steel, [stoveWidth - .14, .50, 1.26], rng);
    const hoodZ = Math.min(2.02, H - .3);
    extractor(pen, [.95, D - .63, hoodZ], Math.min(stoveWidth - .06, 1.35), H);
    const highShelf = pen.move(.92, D - .22, H - .32);
    const board = agedShopTimber(highShelf);
    board.box("timber", [0, 0, 0], [stoveWidth, .22, .022], srgb("#7a5a3c"), "f");
    board.box("timber", [.03, .18, -.045], [stoveWidth - .03, .22, 0], srgb("#6e5136"), "f");
    stockShelf(highShelf, {x0: .03, x1: stoveWidth - .03, y: .01, depth: .2, z: .022, clear: .26 },
      [GROCER_LINES.tins, GROCER_LINES.smallJars, LINES.bowls, GROCER_LINES.boxes], stream(room, "high-pantry"), .98, 1, "packed");
  }
  if (W >= 2.3 && D >= 2.7) {
    const side = onLeftWall(room, .91, .03).move(0, -.25, 1.26);
    const shelves = shelving(side, D - 1.83, .23, Math.min(.65, H - 1.51), 2, "timber", srgb("#7a5a3c"), .25);
    const pantry = stream(room, "side-pantry");
    for (const shelf of shelves) stockShelf(side, shelf,
      [LINES.bowls, GROCER_LINES.jars, GROCER_LINES.bottles, GROCER_LINES.smallTins, GROCER_LINES.boxes], pantry, .99, 1, "packed");
  }
  const supplies = stream(room, "supplies");
  if (W >= 2.3) {
    grocerProp(pen, "stock-box", [W - .28, D - 1.25, 0], [.42, .34, .28], .045);
    grocerProp(pen, "stock-box", [W - .29, D - 1.25, .28], [.36, .30, .22], -.07);
    const stoolYaw = supplies.float(-.2, .2);
    const stoolSize = propSize("shop-stool", [.36, .36, .46]);
    const stoolDepth = Math.abs(Math.sin(stoolYaw)) * stoolSize[0] + Math.cos(stoolYaw) * stoolSize[1];
    const boxDepth = .42 * Math.sin(.045) + .34 * Math.cos(.045);
    if (D - 1.25 - 1.12 > (stoolDepth + boxDepth) / 2 + .04)
      grocerProp(pen, "shop-stool", [W - .28, 1.12, 0], [.36, .36, .46], stoolYaw);
  }
  bucket(pen, [W - .2, .3, 0], .13, .23, srgb("#2d7885"));
  if (D >= 2.7) gasCylinder(pen, [W - .25, D - .89, 0], rng);
  kitchenTiles(pen, W, 1.5, D - .003, 317, true);
  kitchenTiles(onLeftWall(room, 0), D, 1.5, -.003, 318);
  kitchenTiles(onRightWall(room, D), D, 1.5, -.003, 319);
  if (pen.mesh.textured("posters") && H >= 2.35) {
    const posters = stream(room, "posters");
    const wall = pen.into(`${pen.part}/posters`).facing([W-.006,0,0],[0,-1,0],[-1,0,0]);
    drawPoster(wall.move(-.94,0,1.91), { design: "roast-menu", width: .34,
      rotation: posters.float(-2,2), seed: `${room.key}/menu` });
    drawPoster(wall.move(-1.55,0,1.92), { design: "calendar", width: .25,
      rotation: posters.float(-3,3), seed: `${room.key}/calendar` });
    const left = pen.into(`${pen.part}/posters`).facing([.006,.43,1.71],[0,1,0],[1,0,0]);
    drawPoster(left, { design: "soda-ad", width: .23, rotation: posters.float(-3,3), seed: `${room.key}/soda` });
  }
  amenities(room, Math.min(.9, D - 1.9), D >= 3 ? 1.2 : undefined);
}

/** The roast-meat shop: white tile to the ceiling over a red quarry floor. */
export const roast: Trade = {
  name: "roast",
  interior: (rng) => ({
    floor: shade(srgb("#8a4a3a"), rng.float(0.8, 1.05)),
    ceiling: srgb("#d4d0c0"),
    wall: srgb("#e8eae4"),
    dado: rng.pick([srgb("#e0e4e0"), srgb("#b8d0c8"), srgb("#dfe6ea")]),
    dadoHeight: 1.5,
  }),
  furnish,
};
