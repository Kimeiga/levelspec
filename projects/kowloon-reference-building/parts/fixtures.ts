import type { Pen } from '../../../src/dressing/pen.ts';
import type { V3 } from '../../../src/architecture/types.ts';
import { stairHut } from '../../../src/dressing/kowloon/roof-access.ts';
import { roundTank } from '../../../src/dressing/kowloon/water-tanks.ts';
import { airConditioner, condenser } from '../../../src/dressing/kowloon/aircon.ts';
import { PipeSystem } from '../../../src/dressing/kowloon/pipes.ts';
import { awning, cage, pottedPlant, notices, meterBank } from '../../../src/dressing/kowloon/fixtures.ts';
import { drawPanel, type PanelDesign } from '../../../src/dressing/kowloon/signs/panel.ts';
import { weatheredPen } from '../../../src/dressing/kowloon/weathered.ts';
import { COLORS, LOT, SIZE, type BuildingContext } from './composition.ts';
import { srgb } from '../../../src/dressing/kowloon/palette.ts';

/** Draws a fixed lettered sign with a steel perimeter and visible brackets anchored to its facade. */
function sign(context: BuildingContext, pen: Pen, at: V3, width: number, height: number, text: string, red: boolean, vertical = true, turnTowardFront = false): void {
  const { kit } = context;
  const mounted = pen.move(...at);
  const face = turnTowardFront ? mounted.facing([0, 0, 0], [.6, .8, 0], [-.8, .6, 0]) : mounted;
  const steel = { slot: 'metal' as const, tint: srgb('#504d3d'), weathering: kit };
  const design: PanelDesign = {
    width, height, depth: .045, construction: 'sheet', outline: 'rectangle',
    ground: red ? COLORS.oxblood : COLORS.ivory, border: red ? COLORS.ivory : COLORS.oxblood,
    stack: 'down', blocks: [{ text, face: 'kai', direction: vertical ? 'ttb' : 'ltr', ink: red ? COLORS.ivory : COLORS.oxblood, share: 1 }],
    age: .7, phase: at[0] * 5 + at[2],
  };
  drawPanel(face, design, 'both', steel, kit);
  const metal = weatheredPen(pen, kit, 'frame');
  for (const z of [at[2] + .12, at[2] + height - .12]) {
    if (turnTowardFront) {
      metal.tube('metal', [[at[0], .02, z], [at[0], at[1], z], [at[0] + width * .6, at[1] + width * .8, z]], .027, steel.tint, 10);
      metal.tube('metal', [[at[0] + .5, .02, z + .25], [at[0] + width * .6, at[1] + width * .8, z]], .018, steel.tint, 8);
      continue;
    }
    if (at[0] < 0) {
      metal.tube('metal', [[.15, .02, z], [.15, at[1], z], [at[0] - .08, at[1], z]], .027, steel.tint, 8);
      metal.tube('metal', [[.15, .02, z + .3], [at[0] + width - .05, at[1], z]], .018, steel.tint, 8);
      continue;
    }
    metal.tube('metal', [[at[0] - .12, .02, z], [at[0] - .12, at[1] + .08, z], [at[0] + width + .1, at[1] + .08, z]], .023, steel.tint, 8);
    metal.tube('metal', [[at[0] - .12, .02, z + .3], [at[0] - .12, at[1] + .08, z]], .015, steel.tint, 8);
  }
}

/** Places asymmetric roof equipment, reference signs, selected AC units and connected facade services. */
export function drawBuildingFixtures(context: BuildingContext, front: Pen, right: Pen): void {
  const { root, kit } = context;
  const roof = root.into('roof-equipment').move(0, 0, SIZE.roof);
  stairHut(roof, { x0: 2.0, x1: 4.05, y0: 2.15, y1: 4.35 }, 2.35, LOT, kit, context.wallKit);
  roundTank(roof, [6.05, 3.05, 0], kit.rng('roof-tank'), kit);
  const aerial = weatheredPen(roof, kit, 'frame');
  aerial.tube('metal', [[.8, 1.2, .05], [.8, 1.2, 1.7]], .018, COLORS.green, 8);
  aerial.tube('metal', [[.1, 1.2, 1.55], [1.5, 1.2, 1.55]], .009, COLORS.green, 6);
  for (const x of [.22, .45, .68, .91, 1.14, 1.37]) aerial.tube('metal', [[x, .92, 1.55], [x, 1.48, 1.55]], .006, COLORS.green, 6);
  for (const x of [4.25, 4.62]) aerial.tube('metal', [[x, 2.4, .05], [x, 2.4, 2.1], [x, 2.65, 2.22]], .025, COLORS.green, 10);
  for (let z = .28; z < 2.1; z += .3) aerial.tube('metal', [[4.25, 2.4, z], [4.62, 2.4, z]], .017, COLORS.green, 8);
  for (const [index, z] of [7.38, 10.38].entries()) {
    condenser(front.into('front-condenser'), 7.7, 9.03, z, .78, kit.rng(`condenser-${index}`), kit);
    airConditioner(front.into('front-aircon'), 4.55, z - .05, .36, kit.rng(`central-ac-${index}`), kit);
    if (index === 0) airConditioner(front.into('left-aircon'), 2.05, z - .04, .36, kit.rng('left-ac'), kit);
    airConditioner(right.into('side-aircon'), 1.5, z + .2, .36, kit.rng(`side-ac-${index}`), kit);
    awning(front.into('window-hoods'), 5.88, 8.22, z + 1.72, .32, .1,
      { canvas: false, base: srgb('#6c6a5a'), hem: COLORS.green }, `hood-${index}`, kit);
  }
  awning(front.into('window-hoods'), .47, 2.72, 12.11, .36, .1,
    { canvas: false, base: srgb('#6c6a5a'), hem: COLORS.green }, 'left-top-hood', kit);
  cage(front.into('old-ac-cages'), 4.08, 5.04, 7.3, 8.02, .48, srgb('#857a61'), kit.rng('central-cage'), false, kit);
  cage(front.into('old-ac-cages'), 1.6, 2.51, 7.29, 7.96, .48, srgb('#827965'), kit.rng('left-cage'), false, kit);
  cage(right.into('side-ac-cage'), 1.08, 1.93, 10.54, 11.19, .48, COLORS.green, kit.rng('return-cage'), false, kit);
  const lines = new PipeSystem(front.into('condenser-connections'), { radius: .014, color: srgb('#9b9985'), kit, variant: 'condenser-lines' });
  for (const z of [7.38, 10.38]) {
    lines.run([[8.97, .22, z + .19], [9.12, .12, z + .19], [9.12, .12, z - .49], [9.3, .09, z - .49], [9.3, .09, z + 1.32]], 0);
    lines.run([[5.01, .27, z + .03], [5.48, .08, z + .03], [5.48, .08, z - .38]], 0);
  }
  const sideLines = new PipeSystem(right.into('side-conduits'), { radius: .014, color: srgb('#696c60'), kit, variant: 'side-lines' });
  sideLines.run([[.2, .055, 12.2], [.2, .055, 6.2], [2.68, .055, 6.2], [2.68, .055, 3.01]], 0);
  awning(right.into('return-hood'), .36, 2.48, 9.12, .36, .11, { canvas: false, base: srgb('#777364'), hem: COLORS.green }, 'return-hood', kit);
  const drain = new PipeSystem(front.into('downpipes'), { radius: .043, color: srgb('#605b49'), kit, variant: 'building-drains' });
  for (const x of [.2, 5.65, 9.36]) drain.run([[x, .07, 12.28], [x, .07, 3.15], [x + .11, .12, 2.92], [x + .11, .12, .12]], 0);
  const conduit = new PipeSystem(front.into('conduits'), { radius: .012, color: srgb('#4d5048'), kit, variant: 'electrical' });
  conduit.run([[2.85, .04, .18], [2.85, .04, 3], [5.56, .04, 3], [5.56, .04, 12.2]], 0);
  const sideDrain = new PipeSystem(right.into('side-downpipe'), { radius: .04, color: srgb('#605b49'), kit, variant: 'building-drains' });
  sideDrain.run([[2.76, .07, 12.25], [2.76, .07, .12]], 0);
  sign(context, front.into('pharmacy-sign'), [-1.03, .85, 4.72], .94, 2.82, '永昌藥行', false);
  sign(context, right.into('hardware-sign'), [.02, .78, 6.05], .94, 3.33, '興隆五金', true, true, true);
  sign(context, right.into('repair-sign'), [-.02, .83, 4.95], 1.95, .64, '電器修理', false, false);
  front.into('balcony-pot-shelf').box('timber', [5.65, .77, 3.73], [7.45, 1.01, 3.78], srgb('#78644b'));
  for (const [index, x] of [5.9, 6.4, 7.2].entries()) pottedPlant(front.into('balcony-pots'), [x, .91, 3.78], kit.rng(`pot-${index}`));
  notices(front.into('ground-notices'), 9.14, 9.38, 1.17, 1.97, kit.rng('notices'));
  meterBank(front.into('meters'), 2.79, 1.47, 1, kit.rng('meters'), kit);
}
