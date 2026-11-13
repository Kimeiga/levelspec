import type { V3 } from '../../vector/types.ts';
import type { Rng } from '../../generate/rng.ts';
import type { Pen } from '../pen.ts';
import type { Unit } from './ground.ts';
import type { Lot } from './massing.ts';
import type { Kit } from './kit.ts';
import { DOORS, GALVANIZED, SOOT, shade, srgb } from './palette.ts';
import { weatheredPen } from './weathered.ts';
import { paintedBox, paintedFace, paintedPanel, type PaintedSurface } from './painted.ts';
import { finishSeed } from '../wall-surface.ts';
import { valueNoise } from '../finish/noise.ts';
import { materialRecipeKey } from '../surface/material.ts';
import { agedShopTimber } from './shop/timber.ts';
import { notices, wallLamp } from './fixtures.ts';

type Rect = [number, number, number, number];
const BRASS = srgb('#a38a57');
const WOODS = ['#705039', '#72523b', '#6e503a'].map(srgb);

/** Draws a rounded pull with two attached escutcheons; depth is the supporting face in meters. */
export function pullHandle(pen: Pen, x: number, z: number, depth: number, color: V3): void {
  for (const height of [z, z + .23])
    pen.disc('metal', [x, depth + .002, height], .024, [0, 1, 0], color, 8);
  const path = [[depth, z], [depth + .025, z], [depth + .04, z + .015],
    [depth + .043, z + .035], [depth + .043, z + .195], [depth + .04, z + .215],
    [depth + .025, z + .23], [depth, z + .23]];
  const rings = path.map(([y, height], index) => {
    const before = path[Math.max(0, index - 1)], after = path[Math.min(path.length - 1, index + 1)];
    const dy = after[0] - before[0], dz = after[1] - before[1], length = Math.hypot(dy, dz);
    return Array.from({ length: 8 }, (_, side) => {
      const angle = side * Math.PI / 4;
      const normal: V3 = [Math.cos(angle), -dz / length * Math.sin(angle), dy / length * Math.sin(angle)];
      return { normal, point: [x + normal[0] * .009, y + normal[1] * .009, height + normal[2] * .009] as V3 };
    });
  });
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let side = 0; side < 8; side++) {
      const next = (side + 1) % 8;
      const corners = [rings[ring][side], rings[ring + 1][side], rings[ring + 1][next], rings[ring][next]];
      const normal = corners.reduce((sum, corner) => sum.map((v, axis) => v + corner.normal[axis]) as V3, [0, 0, 0] as V3);
      pen.face('metal', corners.map(corner => corner.point), normal, color, undefined, corners.map(corner => corner.normal));
    }
  }
}

/** Attaches hinge leaves and a capped barrel across the leaf/jamb joint. */
function hinges(pen: Pen, x: number, inward: number, paint: V3): void {
  for (const z of [.3, 1.05, 1.83]) {
    const ends = [x - inward * .023, x + inward * .045].sort((a, b) => a - b);
    pen.box('paint', [ends[0], .061, z - .05], [ends[1], .067, z + .05], shade(paint, .8));
    pen.tube('metal', [[x, .071, z - .055], [x, .071, z + .055]], .012, BRASS, 8);
    for (const dz of [-.055, .055]) pen.disc('metal', [x, .071, z + dz], .012, [0, 0, Math.sign(dz)], BRASS, 8);
    for (const dz of [-.032, .032]) pen.disc('metal', [x + inward * .031, .068, z + dz], .004, [0, 1, 0], GALVANIZED, 6);
  }
}

/** A pressed recess has a shallow sloped shoulder and an inset face, rather than applied box rails. */
function pressedPanel(pen: Pen, rect: Rect, paint: V3, surface?: PaintedSurface): void {
  const [a, low, b, high] = rect, bevel = .018;
  const outer: V3[] = [[a, .056, low], [b, .056, low], [b, .056, high], [a, .056, high]];
  const inner: V3[] = [[a + bevel, .035, low + bevel], [b - bevel, .035, low + bevel],
    [b - bevel, .035, high - bevel], [a + bevel, .035, high - bevel]];
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    paintedFace(pen, 'paint', [outer[i], outer[next], inner[next], inner[i]], paint, surface);
  }
  paintedPanel(pen, 'paint', [a + bevel, low + bevel, b - bevel, high - bevel], .035, paint, surface);
}

/** Small front chamfers catch light and carry the same broken paint bands around physical edges. */
function beveledRail(pen: Pen, low: V3, high: V3, paint: V3, surface?: PaintedSurface): void {
  const bevel = .004;
  pen.box('paint', low, [high[0], high[1] - bevel, high[2]], paint, 'bf');
  const outer: V3[] = [[low[0], high[1] - bevel, low[2]], [high[0], high[1] - bevel, low[2]],
    [high[0], high[1] - bevel, high[2]], [low[0], high[1] - bevel, high[2]]];
  const inner: V3[] = [[low[0] + bevel, high[1], low[2] + bevel], [high[0] - bevel, high[1], low[2] + bevel],
    [high[0] - bevel, high[1], high[2] - bevel], [low[0] + bevel, high[1], high[2] - bevel]];
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    paintedFace(pen, 'paint', [outer[i], outer[next], inner[next], inner[i]], paint, surface);
  }
  paintedFace(pen, 'paint', inner, paint, surface);
}

/** Bakes opaque patterned glass: fine stipple and soft color variation, without simulated transparency. */
function frostedGlass(pen: Pen, rect: Rect, depth: number, key: string, kit: Kit): void {
  const [a, low, b, high] = rect, tint = srgb('#a59e83');
  const firstTriangle = pen.mesh.triangleCount;
  pen.panel('pane', a, b, low, high, depth, kit.textureDensity ? [1, 1, 1] : tint);
  if (!kit.textureDensity) return;
  const material = pen.mesh.material('pane'), seed = finishSeed(`${kit.seed}/${key}`);
  const grain = (u: number, v: number) => valueNoise(u * 190, v * 190, seed);
  pen.mesh.receive({ id: `${pen.part}/glass/${firstTriangle}`, firstTriangle,
    triangleCount: pen.mesh.triangleCount - firstTriangle, frame: pen.surfaceFrame(depth), bounds: rect,
    materials: [material], raster: { geometry: "preserve", group: `${key}/glass`, bounds: rect, texelsPerMeter: 256,
      materialKey: materialRecipeKey("frosted-glass/v1", { seed, tint }),
      bump: (u, v) => (grain(u, v) - .5) * .00065 },
    sample(u, v) {
      const mottling = .86 + grain(u, v) * .2 + valueNoise(u * 7, v * 7, seed + 7) * .1;
      return { height: 0, roughness: .68, layers: [{ material, weight: 1, uv: [u, v], tint: shade(tint, mottling) }] };
    },
  });
}

/** Maps the shelf's -Y contact face onto the facade's +Y face, retaining meter-scale grain and edge wear. */
export function doorTimberBoard(pen: Pen, low: V3, high: V3, tint: V3, wear: number): void {
  const local = pen.facing([high[0], high[1], low[2]], [-1, 0, 0], [0, -1, 0]);
  agedShopTimber(local, undefined, { grainVariant: 1, frontWear: { width: .008, strength: Math.min(1.2, wear * 4) } })
    .box("timber", [0, 0, 0],
    [high[0] - low[0], high[1] - low[1], high[2] - low[2]], tint, "f");
}

/** Rails and stiles border six frosted lights and tongue-and-groove lower boards. */
function timberLeaf(pen: Pen, a: number, b: number, paint: V3, key: string, kit: Kit): void {
  const board = (low: V3, high: V3, tint: V3) => doorTimberBoard(pen, low, high, tint, kit.wear);
  pen.box('paint', [a, .018, .055], [b, .028, 2.045], shade(paint, .6));
  for (const x of [a, b - .085]) board([x, .028, .06], [x + .085, .064, 2.045], paint);
  for (const [z, h] of [[.06, .12], [.9, .12], [1.96, .085]])
    board([a + .085, .028, z], [b - .085, .064, z + h], paint);
  const left = a + .085, right = b - .085, center = (a + b) / 2;
  frostedGlass(pen, [left, 1.02, right, 1.96], .035, key, kit);
  board([center - .017, .035, 1.02], [center + .017, .062, 1.96], paint);
  for (const z of [1.33, 1.65]) board([left, .035, z - .014], [right, .061, z + .014], paint);
  const boards = Math.max(4, Math.round((right - left) / .085));
  for (let i = 0; i < boards; i++) {
    const x = left + (right - left) * i / boards, end = left + (right - left) * (i + 1) / boards;
    board([x + .002, .028, .18], [end - .002, .047, .9], shade(paint, .97 + (i % 3) * .015));
  }
  const repair = kit.rng(`${key}/repair`);
  if (repair.bool(.6)) {
    board([right - .105, .048, .18], [right, .054, .39], shade(paint, 1.06));
    for (const z of [.2, .37]) pen.disc('metal', [right - .02, .055, z], .005, [0, 1, 0], GALVANIZED, 6);
  }
}

/** Plans the door opening using the same design stream as the leaf, so adjacent masonry stops at its jambs. */
export function entranceBounds(unit: Unit, rng: Rng): {double: boolean; w: number; h: number; x0: number; x1: number} {
  const double = unit.u1 - unit.u0 > 2.3 && rng.bool(.4);
  const w = double ? 1.4 : rng.float(.85, 1);
  const h = 2.05;
  const x0 = unit.u0 + Math.max(.3, (unit.u1 - unit.u0 - w) * rng.pick([.25, .5, .75])), x1 = x0 + w;
  return {double,w,h,x0,x1};
}

/** Builds one closed entrance, with all visual depth within the facade's 15 cm dressing allowance. */
export function entranceDoor(pen: Pen, unit: Unit, lot: Lot, kit: Kit, rng: Rng): void {
  const {double,w,h,x0,x1}=entranceBounds(unit,rng);
  const selectedPaint = rng.pick(DOORS);
  rng.float(0, .2); // Keep the existing design stream independent of the revised pigment treatment.
  const steel = rng.bool(.35);
  const glazed = !steel && !double;
  const paint = glazed ? kit.rng(`${unit.key}/wood`).pick(WOODS) : selectedPaint;
  const transom = unit.height - h > .95 ? .36 : 0;
  const frame = shade(paint, .8);
  const frameSurface: PaintedSurface | undefined = kit.textureDensity ? {
    group: `${unit.key}/door/frame`, density: Math.max(128, kit.textureDensity),
    finish: {bounds: [x0 - .09, 0, x1 + .09, h + transom + .09], paint: frame, substrate: srgb('#80756a'),
      seed: finishSeed(`${kit.seed}/${unit.key}/frame`), wear: kit.wear * .8, grime: kit.grime},
  } : undefined;
  const steelFrame = weatheredPen(pen, kit, "frame");
  const frameBox = (low: V3, high: V3, omit: string, tint = frame) => {
    if (glazed) doorTimberBoard(pen, low, high, shade(paint, .98), kit.wear);
    else if (steel) steelFrame.box('metal', low, high, tint, omit);
    else paintedBox(pen, 'paint', low, high, tint, omit, frameSurface);
  };
  pen.panel('paint', x0 - .015, x1 + .015, .045, h + transom, .009, SOOT);
  for (const x of [x0 - .085, x1]) {
    frameBox([x, 0, .05], [x + .085, .085, h + transom], 'bd');
    frameBox([x - .015, 0, .05], [x + .1, .028, h + transom + .1], 'bf', shade(frame, .8));
  }
  frameBox([x0 - .085, 0, h + transom], [x1 + .085, .085, h + transom + .085], 'b');
  pen.box('wall', [x0 - .12, 0, 0], [x1 + .12, .13, .045], shade(lot.style.trim, .75), 'bd');
  pen.box('metal', [x0, .015, .045], [x1, .085, .055], shade(GALVANIZED, .7), 'bd');
  const leaves = double ? 2 : 1;
  for (let leaf = 0; leaf < leaves; leaf++) {
    const a = x0 + leaf * w / leaves + .009, b = x0 + (leaf + 1) * w / leaves - .009;
    const handleX = leaf === 0 ? b - .065 : a + .065;
    const key = `${unit.key}/door/${leaf}`;
    if (glazed) timberLeaf(pen, a, b, paint, key, kit);
    else {
      const panels: Rect[] = [[a + .095, .2, b - .095, .73], [a + .095, .83, b - .095, 1.28], [a + .095, 1.39, b - .095, 1.94]];
      const leafPen = steel ? weatheredPen(pen, kit, "sheet", {
        key, bounds: [a, .055, b, h - .005], uv: point => [point[0], point[2]], gravity: [0, -1], paint,
      }) : pen;
      const surface: PaintedSurface | undefined = !steel ? {
        group: key, density: Math.max(256, kit.textureDensity * 2),
        finish: {bounds: [a, .055, b, h - .005], seed: finishSeed(`${kit.seed}/${key}`), paint,
          substrate: srgb(steel ? '#8c8272' : '#947957'), wear: Math.min(1, kit.wear * 1.2), grime: kit.grime,
          handle: [handleX, 1.12], panels},
      } : undefined;
      paintedPanel(leafPen, 'paint', [a, .055, b, h - .005], .025, paint, surface);
      for (const [left, right] of [[a, a + .095], [b - .095, b]])
        beveledRail(leafPen, [left, .025, .055], [right, .06, h - .005], paint, surface);
      for (const [bottom, top] of [[.055, .2], [.73, .83], [1.28, 1.39], [1.94, h - .005]])
        beveledRail(leafPen, [a + .095, .025, bottom], [b - .095, .06, top], paint, surface);
      for (const panel of panels) pressedPanel(leafPen, panel, paint, surface);
    }
    hinges(pen, leaf === 0 ? a - .004 : b + .004, leaf === 0 ? 1 : -1, paint);
    pullHandle(pen, handleX, 1.01, .064, BRASS);
    pen.disc('metal', [handleX, .068, .92], .022, [0, 1, 0], BRASS, 10);
    pen.panel('paint', handleX - .003, handleX + .003, .911, .926, .069, SOOT);
    if (glazed) {
      pen.box('metal', [handleX - .085, .065, .975], [handleX + .035, .074, 1.005], BRASS);
      pen.tube('metal', [[handleX - .07, .084, .99], [handleX + .045, .084, .99]], .009, BRASS, 6);
    }
  }
  if (transom) {
    frostedGlass(pen, [x0, h + .045, x1, h + transom], .029, `${unit.key}/transom`, kit);
    frameBox([x0, 0, h], [x1, .075, h + .045], 'blr');
    const count = Math.max(2, Math.round(w / .28));
    for (let i = 1; i < count; i++) frameBox([x0 + w * i / count - .009, .03, h + .045], [x0 + w * i / count + .009, .061, h + transom], 'bdu');
    frameBox([x0, .03, h + .19], [x1, .06, h + .208], 'blr');
  }
  if (unit.height - h - transom > .5) wallLamp(pen, (x0 + x1) / 2, h + transom + .16, kit);
  const plate = x1 + .16 < unit.u1 - .25 ? x1 + .16 : x0 - .36;
  pen.box('paint', [plate, 0, 1.55], [plate + .2, .012, 1.7], srgb('#2a4f8f'), 'b');
  pen.panel('paint', plate + .05, plate + .15, 1.59, 1.66, .014, srgb('#f0ece0'));
  const side = unit.u1 - x1 > x0 - unit.u0 ? x1 + .45 : unit.u0 + .2;
  if (kit.detail > 0 && Math.max(unit.u1 - x1, x0 - unit.u0) > 1.3) {
    const extras = pen.into('fixtures');
    for (let i = 0; i < 6; i++) {
      const bx = side + (i % 3) * .22, bz = 1.1 + Math.floor(i / 3) * .17;
      extras.box('metal', [bx, 0, bz], [bx + .2, .09, bz + .15], shade(GALVANIZED, rng.float(.6, .9)), 'b');
      extras.panel('paint', bx + .04, bx + .16, bz + .1, bz + .12, .094, SOOT);
    }
    notices(extras, side, side + .7, 1.5, 2.1, rng);
  }
}
