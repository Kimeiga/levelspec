import type { Pen } from '../../../src/dressing/pen.ts';
import type { Facade } from '../../../src/dressing/kowloon/facade.ts';
import type { Room, Trade } from '../../../src/dressing/kowloon/shop/room.ts';
import { drawShop } from '../../../src/dressing/kowloon/shop/shop.ts';
import { hardware } from '../../../src/dressing/kowloon/shop/hardware.ts';
import { groundUnit } from '../../../src/dressing/kowloon/ground.ts';
import { canvasAwning } from '../../../src/dressing/kowloon/tarps.ts';
import { crate, shelving, counter, tubeLight } from '../../../src/dressing/kowloon/shop/fittings.ts';
import { cartonStack, stockShelf } from '../../../src/dressing/kowloon/shop/goods.ts';
import { GROCER_LINES, grocerProp, propSize } from '../../../src/dressing/kowloon/shop/grocer-props.ts';
import { agedShopTimber } from '../../../src/dressing/kowloon/shop/timber.ts';
import { packetRow } from '../../../src/dressing/kowloon/shop/snack-string.ts';
import { washing } from '../../../src/dressing/kowloon/laundry.ts';
import { shade, srgb } from '../../../src/dressing/kowloon/palette.ts';
import { weatheredPen } from '../../../src/dressing/kowloon/weathered.ts';
import { COLORS, FINISH, LOT, SIZE, type BuildingContext, type BuildingFace } from './composition.ts';

/** Adapts the fixed facade dimensions to shared shop emitters; it performs no layout planning. */
function shopFacade(face: BuildingFace): Facade {
  return {
    role: 'front', lot: LOT, finish: FINISH, key: face.name, pen: face.pen, width: face.width,
    shift: 0, bodyU0: 0, bodyU1: face.width,
    ground: [{ u0: 0, u1: face.width, v0: 0, v1: SIZE.ground }], body: [],
    reach: (_zone, _u0, _u1, _z0, _z1, limit) => limit,
    shops: 1, hollow: (_u0, _u1, _height, limit) => Math.min(limit, 3.15),
  };
}

/** Stocks fixed shelf banks and a side counter, leaving a central entry rather than a repeated sack display. */
function furnishProvisions(room: Room): void {
  const { pen, kit } = room;
  const wood = srgb('#78644b');
  for (const [index, [x, width, height]] of [[.08, 2.86, 2.22], [3.06, 2.84, 2.46]].entries()) {
    const shelfPen = pen.move(x, room.depth - .39, 0);
    for (const shelf of shelving(shelfPen, width, .35, height, 6, 'timber', wood, .2))
      stockShelf(shelfPen, shelf, [GROCER_LINES.boxes, GROCER_LINES.tallBoxes, GROCER_LINES.tins, GROCER_LINES.smallJars, GROCER_LINES.bottles, GROCER_LINES.dryBags], kit.rng(`back-stock-${index}-${shelf.z}`), .96, 2, 'packed');
  }
  const left = pen.facing([.25, .8, 0], [0, 1, 0], [-1, 0, 0]);
  for (const shelf of shelving(left, 1.8, .32, 2.16, 5, 'timber', wood))
    stockShelf(left, shelf, [GROCER_LINES.cartons, GROCER_LINES.smallBottles, GROCER_LINES.smallJars], kit.rng(`side-stock-${shelf.z}`), .95, 1, 'packed');
  const counterPen = pen.move(.1, .39, 0);
  const top = counter(counterPen, 1.3, .56, .93, 'timber', wood, kit.rng('counter'));
  stockShelf(counterPen, top, [GROCER_LINES.smallJars, GROCER_LINES.cartons], kit.rng('counter-stock'), .75, 1);
  packetRow(pen, .22, 2.25, .55, 2.53, kit.rng('hung-packets'));
  washing(pen.move(.36, .25, 0), 0, 1.45, 2.48, kit.rng('shop-cloths'), { fill: 1, drop: 1.08, support: 'pole' });
  tubeLight(pen, [.38, 1.22, 2.69], [2.3, 1.22, 2.69]);
  for (const [index, [x, y, size, height]] of [[.7, 1.42, .48, .72], [1.24, 1.7, .58, 1.02], [4.65, 2.2, .56, .8], [5.36, 1.69, .43, .63]].entries())
    cartonStack(pen, [x, y, .025], size, height, kit.rng(`inside-cartons-${index}`));
}

/** A deliberately composed general store using existing stock and fixture emitters. */
const provisions: Trade = {
  name: 'reference-provisions',
  interior: () => ({ floor: srgb('#747168'), ceiling: srgb('#b3ac99'), wall: srgb('#b3aa91'), dado: srgb('#4c655b'), dadoHeight: 1.1 }),
  furnish: furnishProvisions,
};

/** Builds a narrow stocked wire rack whose open sides reveal a second layer of goods behind it. */
function wireRack(pen: Pen, context: BuildingContext, key: string): void {
  const { kit } = context;
  const metal = weatheredPen(pen, kit, 'cage');
  const color = srgb('#808579');
  for (const x of [0, .66]) for (const y of [0, .34]) metal.tube('metal', [[x, y, 0], [x, y, 2.22]], .012, color, 8);
  for (let row = 0; row < 6; row++) {
    const z = .12 + row * .35;
    for (const y of [0, .34]) metal.tube('metal', [[0, y, z], [.66, y, z]], .01, color, 8);
    for (const x of [0, .66]) {
      metal.tube('metal', [[x, 0, z], [x, .34, z]], .01, color, 8);
      metal.tube('metal', [[x, 0, z + .11], [x, .34, z + .11]], .006, color, 6);
    }
    pen.box('metal', [.012, .012, z - .012], [.648, .328, z], color, 'lr');
    stockShelf(pen, { x0: .035, x1: .625, y: .03, depth: .27, z, clear: .31 },
      [GROCER_LINES.tins, GROCER_LINES.smallJars, GROCER_LINES.smallBottles, GROCER_LINES.cartons], kit.rng(`${key}/${row}`), .97, 1, 'packed');
  }
}

/** Emits the deep provisions shop, closed pharmacy gate, and restrained return-shop display. */
export function drawShopfronts(context: BuildingContext, front: BuildingFace, right: BuildingFace): void {
  const { kit } = context;
  drawShop(shopFacade(front), { x0: 3.05, x1: 9.05, floor: .12, head: 2.85, depth: 3.15, key: 'main-provisions', shutterColor: srgb('#758077') }, 'wall', kit, provisions);
  drawShop(shopFacade(right), { x0: 3.05, x1: 5.9, floor: .12, head: 2.65, depth: 2.4, key: 'return-hardware' }, 'wall', kit, hardware);
  groundUnit(front.pen.into('left-gate'), 'gate', { u0: .15, u1: 2.95, height: 3.35, key: 'closed-pharmacy' }, LOT, kit, kit.rng('closed-pharmacy'));
  groundUnit(right.pen.into('right-gate'), 'gate', { u0: .15, u1: 2.8, height: 3.35, key: 'return-gate' }, LOT, kit, kit.rng('return-gate'));
  front.pen.into('gate-head-infill').panel('wall', .4, 2.7, 2.58, 2.7, 0, COLORS.cream);
  right.pen.into('gate-head-infill').panel('wall', .4, 2.55, 2.58, 2.65, 0, COLORS.cream);
  canvasAwning(front.pen.into('left-canvas'), { x0: .12, x1: 2.95, z: 2.75, depth: 1.27, drop: .46 },
    srgb('#778778'), srgb('#a39f81'), 'left-canvas', kit);
  canvasAwning(front.pen.into('striped-awning'), { x0: 2.98, x1: 9.18, z: 2.7, depth: 1.5, drop: .2, valance: .22 },
    srgb('#ad7b6b'), srgb('#d2c6af'), 'main-canvas', kit, { color: srgb('#d2c6af'), width: .22 });
  canvasAwning(right.pen.into('side-canvas'), { x0: 3.0, x1: 5.96, z: 2.72, depth: .99, drop: .37 },
    srgb('#868879'), COLORS.ivory, 'side-canvas', kit);
  const goods = front.pen.into('street-stock');
  const stacks = [[3.3, .48, 3, .48], [3.94, .39, 2, .55], [4.54, .55, 3, .49], [7.66, .28, 2, .56], [8.4, .53, 1, .49]];
  for (const [index, [x, y, rows, width]] of stacks.entries()) {
    const color = [srgb('#a46752'), srgb('#586c5d'), srgb('#a87359'), srgb('#717451'), srgb('#866b4f')][index];
    for (let row = 0; row < rows; row++) {
      const local = goods.move(x + (row % 2) * .026, y, .015 + row * .29);
      const floor = crate(local, width, .4, .29, color, kit.rng(`crate-${index}-${row}`));
      if (row !== rows - 1) continue;
      const center = (floor.x0 + floor.x1) / 2;
      if (index === 1) {
        const rim = floor.z + floor.clear, thickness = .018;
        agedShopTimber(local).box('timber', [-.008, -.008, rim], [width + .008, .408, rim + thickness], color);
        cartonStack(local, [center, .2, rim + thickness], .36, .52, kit.rng(`cartons-${index}`));
      } else {
        const size = propSize('bottle-load', [floor.x1 - floor.x0 - .012, floor.depth - .012, floor.clear + .085]);
        grocerProp(local, 'bottle-load', [center, floor.y + floor.depth / 2, floor.z], size, 0, { variant: index + 1 });
      }
    }
  }
  wireRack(goods.facing([8.29, .26, .03], [1, 0, 0], [0, -1, 0]), context, 'threshold-rack');
  cartonStack(right.pen.into('side-stock'), [5.45, .22, .03], .43, .91, kit.rng('side-cartons'));
  const dolly = goods.move(2.83, .24, 0);
  for (const x of [0, .4]) {
    dolly.tube('metal', [[x, 0, .15], [x, 0, 1.58], [x, .2, 1.64]], .021, shade(COLORS.ivory, .5), 8);
    dolly.disc('paint', [x, .14, .14], .13, [1, 0, 0], COLORS.plinth, 20);
  }
  for (const z of [.32, .76, 1.24]) dolly.tube('metal', [[0, 0, z], [.4, 0, z]], .018, COLORS.ivory, 8);
  dolly.box('metal', [-.02, 0, .06], [.42, .33, .095], COLORS.green);
}
