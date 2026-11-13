import type { V3 } from '../../../src/architecture/types.ts';
import type { Pen } from '../../../src/dressing/pen.ts';
import { WallCondition } from '../../../src/dressing/finish/wall-condition.ts';
import { drawSkin, stainedPanel } from '../../../src/dressing/kowloon/skin.ts';
import { subtractRect, type Rect } from '../../../src/dressing/kowloon/massing.ts';
import { windowUnit } from '../../../src/dressing/kowloon/windows.ts';
import { profiledStrip } from '../../../src/dressing/kowloon/molding.ts';
import { antiClimbFan, type BalconyOutline } from '../../../src/dressing/kowloon/balconies.ts';
import { shade, srgb } from '../../../src/dressing/kowloon/palette.ts';
import { fixingPlate } from '../../../src/dressing/kowloon/signs/steel.ts';
import { weatheredPen } from '../../../src/dressing/kowloon/weathered.ts';
import { COLORS, FINISH, FLOORS, SIZE, type BuildingContext, type BuildingFace, type WindowOpening } from './composition.ts';

/** Draws a four-sided opening reveal; windowUnit supplies its sealed recessed back. */
function drawWindow(pen: Pen, opening: WindowOpening, context: BuildingContext, key: string): void {
  const { u0, u1, v0, v1 } = opening;
  const depth = .24;
  pen.face('wall', [[u0, 0, v0], [u0, -depth, v0], [u0, -depth, v1], [u0, 0, v1]], [1, 0, 0], COLORS.trim);
  pen.face('wall', [[u1, 0, v0], [u1, -depth, v0], [u1, -depth, v1], [u1, 0, v1]], [-1, 0, 0], COLORS.trim);
  pen.face('wall', [[u0, 0, v1], [u1, 0, v1], [u1, -depth, v1], [u0, -depth, v1]], [0, 0, -1], COLORS.trim);
  pen.face('wall', [[u0, 0, v0], [u1, 0, v0], [u1, -depth, v0], [u0, -depth, v0]], [0, 0, 1], COLORS.trim);
  if (opening.door) {
    drawBalconyDoor(pen, opening, context);
    return;
  }
  windowUnit(pen, u0, v0, u1 - u0, v1 - v0, {
    kind: 'casement', frame: COLORS.green, trim: COLORS.trim, curtain: COLORS.ivory,
    reach: .9, hood: false, lit: false, boarded: false, recess: depth, weathering: context.kit,
    transomRatio: .84, lowerPaneBars: opening.lowerRail === undefined ? [] : [opening.lowerRail],
  }, context.kit.rng(key));
  drawWindowInterior(pen, opening);
}

/** Adds selected real screen threads or folded curtains inside the existing recess, behind its glass. */
function drawWindowInterior(pen: Pen, opening: WindowOpening): void {
  const { u0, u1, v0, v1, interior } = opening;
  if (!interior) return;
  const x0 = u0 + .06, x1 = u1 - .06, bottom = v0 + .06, top = v1 - .33;
  if (interior === 'screen') {
    const width = (x1 - x0) * .46;
    pen.panel('glass', x0, x0 + width, bottom, top, -.1, srgb('#8d998f'));
    for (let x = x0; x <= x0 + width; x += .045) pen.tube('metal', [[x, -.095, bottom], [x, -.095, top]], .0018, srgb('#5d675c'), 4);
    for (let z = bottom; z <= top; z += .05) pen.tube('metal', [[x0, -.095, z], [x0 + width, -.095, z]], .0018, srgb('#5d675c'), 4);
    return;
  }
  const width = (x1 - x0) * .34;
  const left = interior === 'left-curtain' ? x0 : x1 - width;
  for (let fold = 0; fold < 8; fold++) {
    const a = left + width * fold / 8, b = left + width * (fold + 1) / 8;
    const ya = -.16 + (fold % 2) * .034, yb = -.16 + ((fold + 1) % 2) * .034;
    pen.sheet('tarp', [[a, ya, bottom], [b, yb, bottom + .025], [b, yb, top], [a, ya, top]], srgb('#8d8874'));
  }
}

/** Sets a framed glazed door into its own full-height opening, including screen, hinges and threshold. */
function drawBalconyDoor(pen: Pen, opening: WindowOpening, context: BuildingContext): void {
  const { u0, u1, v0, v1 } = opening;
  const frame = weatheredPen(pen.into('balcony-door'), context.kit, 'frame');
  pen.panel('pane', u0, u1, v0, v1, -.237, srgb('#252c29'));
  for (const x of [u0, u1 - .065]) frame.box('paint', [x, -.15, v0], [x + .065, -.055, v1], COLORS.green);
  for (const z of [v0, v0 + .69, v1 - .36, v1 - .065]) frame.box('paint', [u0 + .065, -.15, z], [u1 - .065, -.055, z + .065], COLORS.green);
  frame.box('paint', [u0 + .065, -.14, v0 + .065], [u1 - .065, -.09, v0 + .69], COLORS.green);
  pen.panel('glass', u0 + .07, u1 - .07, v0 + .76, v1 - .37, -.11, srgb('#84918b'));
  for (let x = u0 + .12; x < u1 - .1; x += .095)
    frame.tube('metal', [[x, -.105, v0 + .76], [x, -.105, v1 - .37]], .0025, srgb('#70756a'), 5);
  for (let z = v0 + .81; z < v1 - .39; z += .1)
    frame.tube('metal', [[u0 + .07, -.105, z], [u1 - .07, -.105, z]], .0025, srgb('#70756a'), 5);
  frame.tube('metal', [[u1 - .14, -.04, v0 + 1.05], [u1 - .14, -.015, v0 + 1.05], [u1 - .14, -.015, v0 + 1.24]], .012, COLORS.ivory, 8);
  for (const z of [v0 + .35, v1 - .45]) frame.box('metal', [u0 + .025, -.06, z], [u0 + .085, -.035, z + .12], COLORS.green);
  pen.box('concrete', [u0 - .03, -.24, v0 - .03], [u1 + .03, .13, v0 + .025], COLORS.trim);
}

/** Builds continuous cut wall fields with separate, disjoint plaster, tile and plinth finishes. */
function drawFace(context: BuildingContext, face: BuildingFace): void {
  const { kit, wallKit } = context;
  const { pen, width, openings, tiles } = face;
  const seed = kit.rng(`${face.name}/wall`).int(1, 1_000_000);
  const condition = new WallCondition({ base: 0,
    ledges: [...[...FLOORS, SIZE.roof, SIZE.top].map(z => ({ u0: 0, u1: width, z, flow: 1 })),
      ...openings.filter(r => r.v0 >= SIZE.ground).map(r => ({ u0: r.u0, u1: r.u1, z: r.v0, flow: .8 }))],
    openings: openings.map(r => ({ u0: r.u0, u1: r.u1, z0: r.v0, z1: r.v1 })),
  }, { grime: wallKit.grime, wear: wallKit.wear, seed });
  const plinth = { u0: 0, u1: width, v0: 0, v1: 1.02 };
  let plaster: Rect[] = [{ u0: 0, u1: width, v0: 0, v1: SIZE.top }];
  for (const excluded of [...tiles, plinth]) plaster = plaster.flatMap(rect => subtractRect(rect, excluded));
  const shared = {
    pen, openings, condition, finish: FINISH,
    uMarks: openings.flatMap(r => [r.u0, r.u1]), zMarks: openings.flatMap(r => [r.v0, r.v1]),
    raster: { density: wallKit.textureDensity, seed },
  };
  drawSkin({ ...shared, rects: plaster, washAt: () => COLORS.cream, washKey: 'reference/cream' });
  drawSkin({ ...shared, rects: [plinth], washAt: () => COLORS.plinth, washKey: 'reference/charcoal' });
  if (tiles.length) drawSkin({ ...shared, rects: tiles, washAt: () => COLORS.jade, washKey: 'reference/jade',
    tiles: { seed: 23, wear: .22, grime: .38 } });
  for (const [index, opening] of openings.entries()) if (opening.v0 >= SIZE.ground)
    drawWindow(pen.into('windows'), opening, context, `${face.name}/window-${index}`);
  const clip = Math.tan(Math.PI / 8);
  const miters: [number, number] = face.name === 'front' ? [-1, clip]
    : face.name === 'corner' ? [-clip, clip] : face.name === 'right' ? [-clip, 1] : [-1, 1];
  for (const height of [...FLOORS.slice(1), SIZE.roof]) {
    const edges = profiledStrip(pen.into('cornices'), 'concrete', 0, width,
      [[-.01, height - .12], [.11, height - .12], [.16, height - .035], [.16, height + .065], [.02, height + .11]], COLORS.trim, [2], miters, .012);
    stainedPanel(pen.into('cornice-faces'), 'concrete', { u0: miters[0] * .16, u1: width + miters[1] * .16, v0: edges[2].a[1], v1: edges[2].b[1] },
      .16, COLORS.trim, wallKit, .85, seed + Math.round(height * 100));
  }
  const cap = profiledStrip(pen.into('parapet-cap'), 'concrete', 0, width,
    [[-.24, SIZE.top], [.08, SIZE.top], [.08, SIZE.top + .08], [-.24, SIZE.top + .08]], COLORS.trim, [1], miters, .012);
  stainedPanel(pen.into('parapet-cap-face'), 'concrete', { u0: miters[0] * .08, u1: width + miters[1] * .08, v0: cap[1].a[1], v1: cap[1].b[1] },
    .08, COLORS.trim, wallKit, .9, seed + 32);
  pen.box('wall', [0, -.2, SIZE.roof], [width, -.04, SIZE.top], COLORS.cream, 'f');
}

/** Seals the complete exterior and roof while retaining honest window and shop voids. */
export function drawBuildingShell(context: BuildingContext, faces: BuildingFace[]): void {
  for (const face of faces) drawFace(context, face);
  const { root } = context;
  const roof: V3[] = [[0, 0, SIZE.roof], [9.56, 0, SIZE.roof], [9.8, .24, SIZE.roof], [9.8, 7, SIZE.roof], [0, 7, SIZE.roof]];
  root.face('concrete', roof, [0, 0, 1], COLORS.trim);
  root.face('concrete', roof.map(p => [p[0], p[1], SIZE.roof - .2]), [0, 0, -1], COLORS.trim);
}

/** Emits the two nonoverlapping slab faces; only the outer joined perimeter receives fascia or rails. */
function balconySlabFaces(pen: Pen, outline: BalconyOutline): void {
  pen.face('concrete', outline.map(p => [p[0], p[1], 3.35]), [0, 0, 1], COLORS.trim);
  pen.face('concrete', outline.map(p => [p[0], p[1], 3.08]), [0, 0, -1], COLORS.trim);
  pen.face('concrete', [[outline[0][0], 0, 3.08], [outline[1][0], 0, 3.08], [outline[1][0], 0, 3.35], [outline[0][0], 0, 3.35]], [0, -1, 0], COLORS.trim);
}

/** Builds one continuous open-backed, mitered parapet along the stepped balcony's exposed perimeter. */
function balconyPerimeter(context: BuildingContext, pen: Pen, path: V3[]): void {
  const directions = path.slice(0, -1).map((a, i) => {
    const b = path[i + 1], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { tangent: [(b[0] - a[0]) / length, (b[1] - a[1]) / length, 0] as V3, length };
  });
  for (const [index, { tangent, length }] of directions.entries()) {
    const turn = (a: V3, b: V3) => Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
    const miters: [number | undefined, number | undefined] = [
      index === 0 ? undefined : Math.tan(turn(directions[index - 1].tangent, tangent) / 2),
      index + 1 === directions.length ? undefined : -Math.tan(turn(tangent, directions[index + 1].tangent) / 2),
    ];
    const edge = pen.facing(path[index], tangent, [-tangent[1], tangent[0], 0]);
    stainedPanel(edge, 'concrete', { u0: 0, u1: length, v0: 3.08, v1: 3.35 }, 0, COLORS.trim, context.wallKit, .8, 820 + index);
    const deck = edge.move(0, 0, 3.35);
    const upstand = profiledStrip(deck, 'wall', 0, length, [[-.075, .02], [0, .02], [0, .465], [-.075, .465]], COLORS.trim, [1], miters, .015);
    stainedPanel(deck, 'wall', { u0: 0, u1: length, v0: upstand[1].a[1], v1: upstand[1].b[1] }, 0, COLORS.cream, context.wallKit, .8, 830 + index);
    const metal = weatheredPen(deck.into('balcony-rails'), context.kit, 'cage');
    const start = (miters[0] ?? 0) * -.035, end = length + (miters[1] ?? 0) * -.035;
    for (const z of [.59, .83, 1.08]) metal.tube('metal', [[start, -.035, z], [end, -.035, z]], .023, COLORS.green, 10);
    const posts = Math.ceil(length / 1.4);
    for (let i = 0; i <= posts; i++) {
      const x = start + i * (end - start) / posts;
      metal.tube('metal', [[x, -.035, .28], [x, -.035, 1.11]], .026, COLORS.green, 10);
    }
  }
}

/** Constructs the reference's stepped balcony, heavy supports, and fan divider at the depth change. */
export function drawBalcony(context: BuildingContext, front: Pen): void {
  const pen = front.into('balcony');
  const main: BalconyOutline = [[2.5, 0, 0], [9.25, 0, 0], [9.05, 1.13, 0], [2.78, 1.13, 0]];
  const joint: V3 = [2.5 + .28 * .43 / 1.13, .43, 0];
  const shallow: BalconyOutline = [[.42, 0, 0], [2.5, 0, 0], joint, [.42, .43, 0]];
  balconySlabFaces(pen, main);
  balconySlabFaces(pen, shallow);
  balconyPerimeter(context, pen, [shallow[0], shallow[3], joint, main[3], main[2], main[1]]);
  for (const x of [3.05, 4.85, 6.7, 8.55]) {
    const shape: V3[] = [[x - .11, .02, 2.79], [x - .11, 1.02, 3.08], [x - .11, .02, 3.08]];
    pen.face('concrete', shape, [-1, 0, 0], COLORS.trim);
    pen.face('concrete', shape.map(p => [p[0] + .22, p[1], p[2]]), [1, 0, 0], COLORS.trim);
    pen.face('concrete', [shape[0], shape[1], [x + .11, 1.02, 3.08], [x + .11, .02, 2.79]], [0, 0, -1], COLORS.trim);
  }
  antiClimbFan(pen.into('fan-divider'), 2.64, 4.45, .97, COLORS.green, context.kit);
  const fan = weatheredPen(pen.into('fan-divider-frame'), context.kit, 'cage');
  const radius = .97, x = 2.64, center = 4.45;
  const arc: V3[] = Array.from({ length: 25 }, (_, i) => [x, .025 + radius * Math.sin(i * Math.PI / 24), center + radius * Math.cos(i * Math.PI / 24)]);
  fan.tube('metal', arc, .026, COLORS.green, 10);
  for (let i = 2; i < 24; i += 2) fan.tube('metal', [[x, .025, center], arc[i]], .013, COLORS.green, 8);
  for (const z of [3.7, 5.15]) {
    fixingPlate(fan, { slot: 'metal', tint: COLORS.green, weathering: context.kit }, [x, 0, z], [1, 0, 0], [0, 0, 1], [0, 1, 0], .14, .22, 4);
    fan.tube('metal', [[x, .04, z - .12], [x, .04, z + .12]], .042, COLORS.green, 12);
  }

}

/** Grounds the block with narrow concrete pavers, a modest curb and a real corner drain recess. */
export function drawGroundContact({ root, kit }: BuildingContext): void {
  const pen = root.into('pavement');
  pen.face('concrete', [[-.85, -1.91, -.14], [11.25, -1.91, -.14], [11.25, 7.78, -.14], [-.85, 7.78, -.14]], [0, 0, 1], srgb('#55564f'));
  pen.box('concrete', [-.45, -1.31, -.14], [10.5, -.012, -.08], srgb('#696a60'), 'd');
  pen.box('concrete', [9.81, -.012, -.14], [10.8, 7.68, -.08], srgb('#696a60'), 'd');
  const rng = kit.rng('worn-paving');
  const stone = () => shade(srgb('#a8a394'), rng.float(.67, 1.08));
  for (let x = -.45; x < 10.5; x += .55) {
    const right = Math.min(10.5, x + .547);
    for (let y = -1.3; y < 0; y += .43) pen.box('concrete', [x, y, -.09], [right, Math.min(-.012, y + .427), .015], stone(), 'd');
    pen.box('concrete', [x, -1.44, -.13], [right, -1.31, .005], stone(), 'd');
  }
  for (let y = .02; y < 7.5; y += .55) {
    for (let x = 9.81; x < 10.65; x += .42) pen.box('concrete', [x, y, -.09], [x + .417, y + .547, .015], stone(), 'd');
    pen.box('concrete', [10.66, y, -.13], [10.8, y + .547, .005], stone(), 'd');
  }
  pen.box('paint', [10.12, -1.21, .017], [10.52, -.68, .023], COLORS.plinth);
  for (let y = -1.16; y < -.71; y += .072) pen.box('metal', [10.13, y, .025], [10.51, y + .025, .038], COLORS.plinth);
}
