import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import type { Pen } from "../../pen.ts";
import { GALVANIZED, shade, srgb } from "../palette.ts";
import { lathe, rotated } from "./forms.ts";
import { grocerProp } from "./grocer-props.ts";
import type { Shelf } from "./fittings.ts";
import { kitchenFace, kitchenMetal, kitchenTiles } from "./restaurant-surfaces.ts";

const WIPED_STEEL: V3 = [.88, .90, .91];

/** Preserves a flat support plane inside a narrow folded edge, with a real bevel for moving highlights. */
export function restaurantSteelTop(pen: Pen, width: number, depth: number, height: number, thickness = .04): void {
  const steel = kitchenMetal(pen), bevel = .004;
  steel.box("metal", [0,0,height-thickness], [width,depth,height-bevel], [.62,.65,.65], "bu");
  steel.face("metal", [[bevel,bevel,height],[width-bevel,bevel,height],
    [width-bevel,depth-bevel,height],[bevel,depth-bevel,height]], [0,0,1], WIPED_STEEL);
  const low: V3[] = [[0,0,height-bevel],[width,0,height-bevel],[width,depth,height-bevel],[0,depth,height-bevel]];
  const high: V3[] = [[bevel,bevel,height],[width-bevel,bevel,height],[width-bevel,depth-bevel,height],[bevel,depth-bevel,height]];
  const hints: V3[] = [[0,-1,1],[1,0,1],[0,1,1],[-1,0,1]];
  for (let i = 0; i < 4; i++) steel.face("metal", [low[i],low[(i+1)%4],high[(i+1)%4],high[i]], hints[i], [1,1,1]);
  steel.face("metal", [[0,0,height-thickness],[width,0,height-thickness],
    [width,0,height-thickness+.006],[0,0,height-thickness+.006]], [0,-1,0], [.28,.30,.29]);
  steel.face("metal", [[0,0,height-thickness+.006],[width,0,height-thickness+.006],
    [width,0,height-bevel],[0,0,height-bevel]], [0,-1,0], [.62,.65,.65]);
}

/** A fitted stainless cabinet with recessed doors, drawers and handles beneath the original worktop datum. */
export function restaurantWorkBench(pen: Pen, width: number, depth: number, height: number): Shelf {
  const steel = kitchenMetal(pen), body = height - .04;
  steel.box("metal", [.02,.03,.07], [width-.02,depth,body], [.47,.50,.50], "bdu");
  steel.box("metal", [.035,.045,.07], [width-.035,depth-.02,.11], [.23,.25,.25], "");
  for (const x of [.04,width-.08]) for (const y of [.05,depth-.07])
    steel.box("metal", [x,y,0], [x+.035,y+.035,.11], [.50,.53,.53], "");
  const bays = Math.max(1, Math.ceil(width / .85)), pitch = (width - .06) / bays;
  const separator = body - .15;
  for (let i = 0; i < bays; i++) {
    const left = .03 + i * pitch, right = left + pitch - .008;
    const brightness = .56 + (i % 3) * .045;
    steel.box("metal", [left,.025,.115], [right,.037,separator-.006], [brightness,brightness+.025,brightness+.025], "bf");
    for (const [low, high] of [[.115,.235],[.235,separator-.006]]) {
      steel.face("metal", [[left,.025,low],[right,.025,low],[right,.025,high],[left,.025,high]], [0,-1,0], point => {
        const lowerWear = Math.max(0, 1 - (point[2]-.115)/.12) * .10;
        return [brightness-lowerWear,brightness+.025-lowerWear,brightness+.025-lowerWear];
      });
    }
    steel.box("metal", [left,.023,separator], [right,.037,body-.012], [.70,.72,.72], "f");
    const handleX = (left + right) / 2;
    for (const z of [separator-.065,body-.08]) {
      for (const x of [handleX-.055,handleX+.055])
        steel.bar("metal", [x,.027,z], [x,.009,z], .009, [.86,.88,.88]);
      steel.bar("metal", [handleX-.055,.009,z], [handleX+.055,.009,z], .012, WIPED_STEEL);
    }
    for (const z of [.19,separator-.10])
      steel.box("metal", [left+.012,.021,z], [left+.028,.033,z+.028], [.82,.84,.84], "f");
  }
  restaurantSteelTop(pen, width, depth+.02, height);
  return { x0: .03, x1: width-.03, y: .03, depth: depth-.05, z: height, clear: 1 };
}

/** Draws a wiped steel serving surface above an aged ceramic counter, returning its support height. */
export function restaurantCounter(pen: Pen, width: number, depth: number, height: number, seed: number): number {
  pen.box("paint", [.02, .03, 0], [width - .02, depth, height - .045], srgb("#a6aaa0"), "dfu");
  kitchenTiles(pen.move(.02, 0, 0), width - .04, height - .045, .024, seed);
  const steel = kitchenMetal(pen);
  restaurantSteelTop(pen, width, depth, height, .045);
  steel.bar("metal", [.015, .014, .045], [width - .015, .014, .045], .02, shade(GALVANIZED, .8));
  return height;
}

/** Draws a hood and grease-filter slats above the back hob, fitted beneath the ceiling. */
export function extractor(pen: Pen, at: V3, width: number, ceiling: number): void {
  const steel = kitchenMetal(pen), [x, y, z] = at;
  steel.box("metal", [x, y, z], [x + width, y + .34, z + .13], GALVANIZED, "d");
  steel.face("metal", [[x, y, z], [x + width, y, z], [x + width, y + .34, z - .15], [x, y + .34, z - .15]],
    [0, -.4, -1], shade(GALVANIZED, .65));
  for (let offset = .035; offset < width - .03; offset += .065)
    steel.bar("metal", [x + offset, y + .025, z - .008], [x + offset, y + .31, z - .135], .017, shade(GALVANIZED, .45));
  const ductWidth = Math.min(.27, width * .5);
  steel.box("metal", [x + (width - ductWidth) / 2, y + .14, z + .13], [x + (width + ductWidth) / 2, y + .32, ceiling], shade(GALVANIZED, .85), "du");
}

/** Nests a small number of thin bowls, retaining a hollow top and restrained colored rim. */
export function bowlStack(pen: Pen, at: V3, count: number, radius: number, rim: V3): void {
  const glaze = srgb("#e5e0ce");
  for (let index = 0; index < count; index++) {
    const base: V3 = [at[0], at[1], at[2] + index * .022];
    lathe(pen, "pane", base, [[radius * .42, 0], [radius, .046], [radius * 1.015, .052]], [glaze, rim], 10);
    if (index === count - 1) lathe(pen, "pane", base, [[radius * 1.015, .052], [radius * .94, .047], [radius * .4, .009], [0, .009]], [rim, glaze, glaze], 10);
  }
}

/** Groups differently sized, labeled pantry bottles tightly, without tinting their glass and caps. */
export function condimentGroup(pen: Pen, at: V3, rng: Rng): void {
  const local = pen.move(...at);
  const heights = [.225, .27, .20, .25];
  for (let i = 0; i < 4; i++) grocerProp(local, "drink-bottle", [(i - 1.5) * .063, rng.float(-.006, .006), 0],
    [.060, .060, heights[i]], rng.float(-.22, .22), { variant: rng.int(1, 8), base: "supported"});
  for (let i = 0; i < 3; i++) grocerProp(local, "seasoning-jar", [(i - 1) * .08, -.11, 0],
    [.072, .072, .105], rng.float(-.25, .25), { variant: rng.int(1, 8), base: "supported"});
}

/** Keeps takeaway boxes in an uneven but supported stack, inside a 28 by 23 cm footprint. */
export function takeawayStack(pen: Pen, at: V3, rng: Rng): void {
  const local = rotated(pen, at, "z", rng.float(-.07, .07));
  const count = rng.int(4, 6);
  for (let i = 0; i < count; i++) {
    const x = i * .002, y = (i % 2) * .003, z = i * .037;
    local.box("paint", [x - .12, y - .09, z], [x + .12, y + .09, z + .035], srgb("#e8e3d3"), "d");
    local.box("paint", [x - .124, y - .094, z + .031], [x + .124, y + .094, z + .037], srgb("#d5d0c1"), "d");
  }
}

/** Creates a shallow open tray: the added food sits on its floor, below its rolled rim. */
export function meatTray(pen: Pen, at: V3, width: number, depth: number): number {
  const steel = kitchenMetal(pen), [x, y, z] = at;
  steel.box("metal", [x - width / 2, y - depth / 2, z], [x + width / 2, y + depth / 2, z + .009], GALVANIZED, "d");
  for (const sign of [-1, 1]) {
    steel.box("metal", [x - width / 2, y + sign * depth / 2 - .004, z], [x + width / 2, y + sign * depth / 2 + .004, z + .035], GALVANIZED, "");
    steel.box("metal", [x + sign * width / 2 - .004, y - depth / 2, z], [x + sign * width / 2 + .004, y + depth / 2, z + .035], GALVANIZED, "");
  }
  return z + .009;
}

/** Groups two sauce bowls and their spoons in one open tray, providing a different counter silhouette. */
export function sauceTray(pen: Pen, at: V3): void {
  const z = meatTray(pen, at, .34, .24);
  for (const [index, color] of ["#536c27", "#873522"].entries()) {
    const base: V3 = [at[0] + (index - .5) * .15, at[1], z];
    lathe(pen, "pane", base, [[.028, 0], [.053, .043], [.055, .05], [.049, .046], [.04, .024], [0, .024]],
      [srgb("#e6e0cf"), srgb("#3a5b72"), srgb("#e6e0cf"), srgb("#e6e0cf"), srgb(color)], 10);
    kitchenMetal(pen).bar("metal", [base[0], base[1] - .015, z + .037], [base[0] + .027, base[1] + .07, z + .069], .008, GALVANIZED);
  }
}
