import type { V3 } from "../../../architecture/types.ts";
import type { Rng } from "../../../generate/rng.ts";
import type { Pen } from "../../pen.ts";
import { GALVANIZED, shade, srgb } from "../palette.ts";
import { GROCER_LINES, grocerProp, propSize } from "./grocer-props.ts";
import { stockShelf } from "./goods.ts";
import { applePile } from "./stock-mesh.ts";
import { agedShopTimber } from "./timber.ts";

export type DisplayKind = "stool" | "box-stand" | "crate-shelf" | "cart";
export type DisplayTrade = "grocer" | "greengrocer" | "herbalist" | "hardware";

/** Conservative envelopes, centered in XY with feet at Z=0, including goods and handles. */
export const DISPLAY_SIZES: Record<DisplayKind, V3> = {
  stool: [0.46, 0.4, 0.7],
  "box-stand": [0.46, 0.4, 0.85],
  "crate-shelf": [0.8, 0.42, 1.05],
  cart: [0.78, 0.5, 0.95],
};
const WOOD = srgb("#94704d");

/** A closed packing box with taped seams, strong enough to support the small display above. */
function packingBox(pen: Pen, at: V3, size: V3, rng: Rng): void {
  grocerProp(pen,"stock-box",at,size,0,{variant:rng.int(1,4)});
}

/** A shallow wooden produce tray, with its contents resting on the tray floor. */
function produceTray(pen: Pen, z: number, width: number): void {
  const scale = width / .4;
  grocerProp(pen,"produce-crate",[0,0,z],[width,.31*scale,.071*scale]);
  applePile(pen, [0,0,z+.014*scale], [.375*scale,.285*scale,.095*scale], srgb("#b32c24"));
}

/** Stocks a board by trade, leaving the board's entire support envelope intact. */
function boardGoods(pen: Pen, z: number, width: number, depth: number, trade: DisplayTrade, rng: Rng): void {
  if (trade === "greengrocer" || (trade === "grocer" && rng.bool(.65))) {
    const count = width > .5 ? 2 : 1;
    const gap = .012;
    const trayWidth = Math.min(.4, (width-gap*(count-1))/count, depth*.4/.31);
    for (let index = 0; index < count; index++)
      produceTray(pen.move((index-(count-1)/2)*(trayWidth+gap),0,0),z,trayWidth);
    return;
  }
  const contents = trade === "hardware" ? [GROCER_LINES.cartons,GROCER_LINES.rolls]
    : [GROCER_LINES.smallJars,GROCER_LINES.smallTins,GROCER_LINES.tins,GROCER_LINES.smallBottles,GROCER_LINES.dryBags];
  // Low displays expose several rows; one layer keeps individual goods visible without concealed stacks.
  const singleLayer = contents.map(make => (random: Rng) => ({...make(random),stack:1}));
  stockShelf(pen, {x0:-width/2+.015,x1:width/2-.015,y:-depth/2+.01,depth:depth-.02,z,clear:.22},
    singleLayer, rng, 1, width > .5 ? 2 : 3, "packed");
}

/** A stool or reused shipping boxes carry a board, then a compact tray or group of goods. */
function smallStand(pen: Pen, kind: "stool" | "box-stand", trade: DisplayTrade, rng: Rng): void {
  let top: number;
  if (kind === "stool") {
    const size = propSize("shop-stool", [.31,.31,.45]);
    grocerProp(pen, "shop-stool", [0,0,0], size);
    top = size[2];
  } else {
    packingBox(pen, [0,0,0], [.34,.3,.24], rng);
    packingBox(pen, [.008,-.008,.2405], [.32,.28,.22], rng);
    top = .461;
  }
  agedShopTimber(pen).box("timber", [-.21,-.17,top], [.21,.17,top+.018], WOOD, "");
  boardGoods(pen, top+.018, .4, .31, trade, rng);
}

/** Two crate piers support a plank; two boxes on it carry a second small shelf. */
function crateShelf(pen: Pen, trade: DisplayTrade, rng: Rng): void {
  const crate = propSize("bottle-crate", [.28,.28,.27]);
  const base = crate[2];
  for (const x of [-.22,.22])
    grocerProp(pen,"bottle-crate",[x,0,0],crate);
  agedShopTimber(pen).box("timber",[-.39,-.19,base],[.39,.19,base+.02],WOOD,"");
  for (const x of [-.23,.23]) packingBox(pen,[x,0,base+.02],[.23,.29,.22],rng);
  const shelf = base+.2405;
  agedShopTimber(pen).box("timber",[-.38,-.18,shelf],[.38,.18,shelf+.018],shade(WOOD,.85),"");
  boardGoods(pen,shelf+.018,.72,.32,trade,rng);
}

/** A two-tier hand cart with four attached casters, open boxes and a push handle. */
function cart(pen: Pen, trade: DisplayTrade, rng: Rng): void {
  const metal = shade(GALVANIZED,.7), rubber = srgb("#34332f");
  for (const x of [-.31,.31]) for (const y of [-.17,.17]) {
    pen.tube("paint",[[x-.019,y,.055],[x+.019,y,.055]],.055,rubber,12);
    pen.disc("paint",[x-.019,y,.055],.055,[-1,0,0],rubber,12);
    pen.disc("paint",[x+.019,y,.055],.055,[1,0,0],rubber,12);
    pen.bar("metal",[x,y,.055],[x,y,.15],.015,metal);
  }
  for (const z of [.15,.55]) {
    agedShopTimber(pen).box("timber",[-.36,-.22,z],[.36,.22,z+.02],WOOD,"");
    for (const y of [-.21,.21]) pen.bar("metal",[-.35,y,z],[.35,y,z],.014,metal);
  }
  for (const x of [-.35,.35]) for (const y of [-.21,.21])
    pen.bar("metal",[x,y,.15],[x,y,.59],.015,metal);
  for (const y of [-.18,.18]) pen.bar("metal",[.35,y,.56],[.35,y,.88],.016,metal);
  pen.bar("metal",[.35,-.18,.88],[.35,.18,.88],.018,metal);
  packingBox(pen,[-.14,0,.17],[.3,.35,.23],rng);
  grocerProp(pen,"seasoning-jar",[.19,0,.17],[.12,.12,.18],rng.float(-.25,.25),{variant:rng.int(1,8)});
  boardGoods(pen,.57,.62,.37,trade,rng);
}

/** Draws one grounded, self-supporting display in its declared centered envelope. */
export function drawDisplay(pen: Pen, kind: DisplayKind, trade: DisplayTrade, rng: Rng): void {
  if (kind === "cart") cart(pen,trade,rng);
  else if (kind === "crate-shelf") crateShelf(pen,trade,rng);
  else smallStand(pen,kind,trade,rng);
}
