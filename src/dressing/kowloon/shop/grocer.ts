import { Pen } from "../../pen.ts";
import { planGrocerLayout, type GrocerFixture } from "./grocer-layout.ts";
import type { V3 } from "../../../architecture/types.ts";
import { shade, srgb } from "../palette.ts";
import { pendant, shelving, tubeLight, ceilingFan } from "./fittings.ts";
import { stockShelf } from "./goods.ts";
import { GROCER_LINES, grocerProp, propSize, bagCluster, bagClusterSize } from "./grocer-props.ts";
import { extra, stream, type Room, type Trade } from "./room.ts";
import { rotated } from "./forms.ts";
import { packetRow } from "./snack-string.ts";

const TIMBER = srgb("#7a5a3c");
const STOCK = GROCER_LINES;

/** Measures the axis-aligned support footprint after an upright prop turns about Z. */
function footprint(size: V3, yaw: number): [number, number] {
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  return [size[0] * c + size[1] * s, size[0] * s + size[1] * c];
}

/** Places the generated counter and its goods using the counter's measured top and footprint. */
function serviceCounter(room: Room, placement: GrocerFixture): void {
  const size = propSize("shop-counter", [placement.size[0], 0.5, 0.9]);
  const bench = fixturePen(room.pen, placement);
  grocerProp(bench, "shop-counter", [size[0] / 2, size[1] / 2, 0], size);
  const rng = stream(room, "counter");
  const scaleSize = propSize("counter-scale", [Math.min(0.3, size[0] * 0.3), size[1] * 0.64, 0.38]);
  const scaleYaw = rng.float(-0.28, 0.28);
  const scaleFootprint = footprint(scaleSize, scaleYaw);
  const scaleLeft = size[0] - scaleFootprint[0] - 0.025;
  grocerProp(bench, "counter-scale", [scaleLeft + scaleFootprint[0] / 2, size[1] / 2, size[2]], scaleSize, scaleYaw);
  stockShelf(bench, { x0: 0.025, x1: scaleLeft - 0.025, y: 0.015, depth: 0.22, z: size[2], clear: 0.27 },
    [STOCK.smallJars, STOCK.smallTins, STOCK.dryBags, STOCK.smallBottles, STOCK.cartons], rng, 1, 2, "packed");
  if (size[0] >= 0.85) {
    const basket = propSize("egg-basket", [0.28, 0.16, 0.12]);
    const yaw = rng.float(-0.3, 0.3);
    const [, depth] = footprint(basket, yaw);
    grocerProp(bench, "egg-basket", [0.22, size[1] - depth / 2 - 0.02, size[2]], basket, yaw);
  }

}

/** Stacks reusable molded crates and a combined load, with small offsets on a stable base. */
function crateDisplay(room: Room, placement: GrocerFixture): void {
  const pen = fixturePen(room.pen, placement);
  const rng = stream(room, "crates");
  const size = propSize("bottle-crate", [0.42, 0.3, 0.27]);
  const stacks = Math.max(1, Math.min(2, Math.floor((placement.size[0] - 0.02) / 0.47)));
  for (let stack = 0; stack < stacks; stack++) {
    const height = rng.int(2, 3);
    const center: V3 = [0.23 + stack * 0.47, 0.22 + rng.float(-0.012, 0.012), 0];
    const local = rotated(pen, center, "z", rng.float(-0.09, 0.09));
    for (let level = 0; level < height; level++) {
      const at: V3 = [0, 0, level * size[2]];
      grocerProp(local, "bottle-crate", at, size, 0, {variant: stack % 3 + 1});
      if (level === height - 1) grocerProp(local, "bottle-load", [at[0], at[1], at[2] + size[2] * 0.075],
        [size[0] * 0.9, size[1] * 0.85, size[2] * 1.2], 0, {variant:rng.int(1,8)});
    }
  }
}

/** Fits symmetric lighting geometry and fan blades to the room's actual ceiling. */
function lights(room: Room, counter: GrocerFixture): void {
  const { pen, width, depth, height } = room;
  pendant(fixturePen(pen,counter), [counter.size[0]/2, 0.16, height], Math.max(0.3, height - 1.8), srgb("#a52920"));
  tubeLight(pen, [width*.2, depth*.5, height], [width*.8, depth*.5, height]);
  const fanAt = Math.min(depth - 1.02, depth * 0.5 + 0.75);
  if (height >= 2.2 && fanAt - depth * 0.5 >= 0.62 && extra(room, "fan", 0.45))
    ceilingFan(pen, [width/2, fanAt, height], .28, Math.min(1.1, width-.7), stream(room, "fan"));
}

/** Stocks the generated empty cabinet with fitted shelves and reusable bottle/can meshes. */
function cooler(room: Room, placement: GrocerFixture): void {
  const size = placement.size;
  const local = fixturePen(room.pen,placement).move(size[0]/2,size[1]/2,0);
  grocerProp(local, "drinks-cooler", [0,0,0], size);
  const lining = srgb("#d7d9d2");
  local.box("metal", [-size[0]*.47, size[1]*.36, size[2]*.20], [size[0]*.47, size[1]*.40, size[2]*.87], lining, "");
  for (const side of [-1, 1]) {
    const ends = [side*size[0]*.42, side*size[0]*.47].sort((a,b) => a-b);
    local.box("metal", [ends[0], -size[1]*.46, size[2]*.20], [ends[1], size[1]*.4, size[2]*.87], lining, "");
  }
  for (const z of [size[2]*.20, size[2]*.86])
    local.box("metal", [-size[0]*.47, -size[1]*.46, z], [size[0]*.47, size[1]*.40, z+.012], lining, "");
  const rng = stream(room, "cooler");
  for (const fraction of [.24,.45,.66]) {
    const z = size[2]*fraction;
    local.box("metal", [-size[0]*.42, -size[1]*.42, z-.012], [size[0]*.42, size[1]*.40, z], srgb("#a9aaa2"), "d");
    stockShelf(local, {x0:-size[0]*.40,x1:size[0]*.40,y:-size[1]*.37,depth:size[1]*.68,z,clear:size[2]*.19},
      [STOCK.smallBottles,STOCK.tins,STOCK.largeTins], rng, 1, 1, "packed");
  }
}

/** Places a fixture in the canonical room, preserving the pen's host transform. */
function fixturePen(pen: Pen, fixture: GrocerFixture): Pen {
  return rotated(pen,fixture.origin,"z",fixture.turn);
}

/** Packs the floor zone with varied sack groups, with local contact flattening and grounded bases. */
function sackDisplay(room: Room, placement: GrocerFixture): void {
  const rng = stream(room,"sacks");
  const pen = fixturePen(room.pen,placement);
  let left = 0;
  while (left < placement.size[0]-.2) {
    const arrangement = rng.int(0,3);
    let size = bagClusterSize("rice-sack",[rng.float(1.12,1.26),.48,rng.float(.45,.6)],pen.mirrored,arrangement);
    const yaw = rng.float(-.2,.2);
    let [width,depth] = footprint(size,yaw);
    const fit = Math.min(1,(placement.size[0]-.002)/width,(placement.size[1]-.002)/depth);
    size = size.map(value=>value*fit) as V3;
    [width,depth] = footprint(size,yaw);
    if (left+width > placement.size[0]) break;
    bagCluster(pen,"rice-sack",[left+width/2,depth/2+rng.float(0,placement.size[1]-depth),0],size,yaw,rng.int(1,4),arrangement);
    left += width+rng.float(.003,.012);
  }
}

/** Furnishes one seeded counter arrangement with tightly stocked, separately supported fixtures. */
function furnish(input: Room): void {
  const layout = planGrocerLayout(input.width,input.depth,input.height,stream(input,"layout"));
  let room = input;
  if (layout.mirrored) {
    const reflected = input.pen.facing([input.width,0,0],[-1,0,0],[0,1,0]);
    room = {...input,pen:new Pen(reflected.mesh,reflected.part,reflected.matrix,!input.pen.mirrored)};
  }
  const {pen,height:H} = room;
  const wood = shade(TIMBER,stream(room,"fittings").float(.8,1.15));
  for (const placement of layout.shelves) {
    const local = fixturePen(pen,placement);
    const rng = stream(room,placement.id);
    const [width,depth,height] = placement.size;
    for (const shelf of shelving(local,width,depth,height,placement.levels,"timber",wood,placement.above)) {
      const lines = shelf.z > height-.01 ? [STOCK.boxes,STOCK.tallBoxes,STOCK.cartons]
        : shelf.z < .5 ? [STOCK.boxes,STOCK.boxes,STOCK.tallBoxes,STOCK.bigJars,STOCK.dryBags]
        : [STOCK.boxes,STOCK.boxes,STOCK.tallBoxes,STOCK.largeTins,STOCK.tins,STOCK.smallJars,
          STOCK.cartons,STOCK.smallBottles,STOCK.bottles,STOCK.dryBags];
      stockShelf(local,shelf,lines,rng,1,1,"packed");
    }
  }
  if (layout.cooler) cooler(room,layout.cooler);
  serviceCounter(room,layout.counter);
  crateDisplay(room,layout.crates);
  sackDisplay(room,layout.sacks);
  grocerProp(fixturePen(pen,layout.stool),"shop-stool",[.2,.2,0],[.31,.31,.45],stream(room,"stool").float(-.25,.25));
  const hung = stream(room,"hung");
  packetRow(pen,layout.hanging.x0,layout.hanging.x1,layout.hanging.y,H,hung);
  const counter = fixturePen(pen,layout.counter);
  const garlic = propSize("garlic-braid",[.12,.1,.45]);
  const garlicAt: V3 = [layout.counter.size[0]*.1,.25,H-.6];
  grocerProp(counter,"garlic-braid",garlicAt,garlic);
  counter.bar("paint",[garlicAt[0],garlicAt[1],garlicAt[2]+garlic[2]],[garlicAt[0],garlicAt[1],H],.003,srgb("#b29b72"));
  lights(room,layout.counter);
}

/** The provisions store: green dado under cream walls on a gray screed. */
export const grocer: Trade = {
  name: "grocer",
  interior: (rng) => ({
    floor: shade(srgb("#8a8880"), rng.float(0.85, 1.05)),
    ceiling: srgb("#d8d4c4"),
    wall: srgb("#ece4cc"),
    dado: rng.pick([srgb("#5f9a80"), srgb("#6f9fc0"), srgb("#8fa870")]),
    dadoHeight: 1.2,
  }),
  furnish,
};
