import type { V3 } from "../../architecture/types.ts";
import type { Rng } from "../../generate/rng.ts";
import type { Pen } from "../pen.ts";
import { atlasPoint } from "./atlas.ts";
import { corrugated } from "./fixtures.ts";
import { AC_BODIES, GALVANIZED, RUST, mix, shade, srgb } from "./palette.ts";
import type { Kit } from "./kit.ts";
import { weatheredPen } from "./weathered.ts";
import { angle, bolt, fixingPlate, member, type Steel } from "./signs/steel.ts";

// Cells of the air conditioner atlas.
/** Case sides and tops, from fresh to weathered. */
const SIDE_CELLS = [0, 1, 2];
const TOP_CELLS = [3, 4];
/** Condenser coils: clean fins, clogged fins, and fins behind an expanded-mesh guard. */
const COIL_CELLS = [5, 6, 7];
/** Condenser fronts: white, cream with ribs, rusted cream, gray with ribs. */
const FRONT_CELLS = [8, 9, 10, 11];
const RUSTED_FRONT = 10;
/** Condenser service ends, fresh and weathered. */
const VALVE_CELLS = [12, 13];
/** Fans: three dark blades, five dusty ones. */
const FAN_CELLS = [14, 15];
/** Rear grilles: stamped louvers, wire grid, bare coil, expanded mesh; add 4 for the weathered set. */
const REAR_CELLS = [16, 17, 18, 19];
const BOARD_CELL = 24;
const DUCT_CELL = 25;

/** How far each rear grille construction is set into its rim, meters; the mesh guard bulges out. */
const REAR_RECESS = [0.006, 0.02, 0.028, -0.026];
/** A condenser front leaves its fan opening here: center and radius as fractions of width and height. */
const FAN_CENTER = 0.37;
const FAN_RADIUS = 0.4;
/** Width over height of the front a single fan sits in, which makes the opening round. */
const FAN_ASPECT = 1.4545;

const HOSE = srgb("#3a3a38");
const INSULATION = srgb("#d8d6cc");
const BRICK = srgb("#8f5a48");
const SHADOW: V3 = [0.05, 0.05, 0.055];
const YELLOWED = srgb("#cdbf98");

/** Maps a pen-local point to a position in an atlas cell, right and down from its top left. */
type Projector = (point: V3) => [number, number];

/** Draws a polygon unwrapped onto an atlas cell by `project`, facing `hint`. */
function unwrapped(pen: Pen, cell: number, points: V3[], hint: V3, tint: V3, project: Projector): void {
  pen.face("aircon", points, hint, tint, points.map((point) => atlasPoint(cell, ...project(point))));
}

/** Atlas cells for the faces of a case; `back` closes a case that stands off its wall. */
interface CaseCells {
  front: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  back?: number;
}

/** Returns the projector that spreads one atlas cell over `x0..x1`, `z0..z1` of a face looking along +Y. */
function onFace(x0: number, x1: number, z0: number, z1: number): Projector {
  return (p) => [(p[0] - x0) / (x1 - x0), (z1 - p[2]) / (z1 - z0)];
}

/**
 * Draws a sheet-metal case from `lo` to `hi` with its front edges beveled by
 * `bevel`, each face unwrapped onto its own atlas cell across the case's full
 * extent. The front face itself is left to the caller: the rectangle from
 * `lo + bevel` to `hi - bevel` in X and Z at Y = `hi`.
 */
function casing(pen: Pen, lo: V3, hi: V3, bevel: number, cells: CaseCells, tint: V3): void {
  const [x0, y0, z0] = lo,
    [x1, y1, z1] = hi;
  const b = bevel;
  const front = onFace(x0, x1, z0, z1);
  const left: Projector = (p) => [(p[1] - y0) / (y1 - y0), (z1 - p[2]) / (z1 - z0)];
  const right: Projector = (p) => [(y1 - p[1]) / (y1 - y0), (z1 - p[2]) / (z1 - z0)];
  const top: Projector = (p) => [(p[0] - x0) / (x1 - x0), (p[1] - y0) / (y1 - y0)];
  unwrapped(pen, cells.left, [[x0, y0, z0 + b], [x0, y1 - b, z0 + b], [x0, y1 - b, z1 - b], [x0, y0, z1 - b]], [-1, 0, 0], tint, left);
  unwrapped(pen, cells.right, [[x1, y1 - b, z0 + b], [x1, y0, z0 + b], [x1, y0, z1 - b], [x1, y1 - b, z1 - b]], [1, 0, 0], tint, right);
  unwrapped(pen, cells.top, [[x0 + b, y1 - b, z1], [x1 - b, y1 - b, z1], [x1 - b, y0, z1], [x0 + b, y0, z1]], [0, 0, 1], tint, top);
  unwrapped(pen, cells.bottom, [[x0 + b, y0, z0], [x1 - b, y0, z0], [x1 - b, y1 - b, z0], [x0 + b, y1 - b, z0]], [0, 0, -1], shade(tint, 0.7), top);
  if (cells.back !== undefined)
    unwrapped(pen, cells.back, [[x1, y0, z0], [x0, y0, z0], [x0, y0, z1], [x1, y0, z1]], [0, -1, 0], shade(tint, 0.8), front);
  // Bevels between the side faces and the top and bottom, running back to the wall.
  for (const [x, inner, side] of [[x0, x0 + b, -1], [x1, x1 - b, 1]] as const)
    for (const [z, flat, up, cell] of [[z1 - b, z1, 1, cells.top], [z0 + b, z0, -1, cells.bottom]] as const)
      unwrapped(pen, cell, [[x, y0, z], [x, y1 - b, z], [inner, y1 - b, flat], [inner, y0, flat]], [side, 0, up], shade(tint, 0.94), top);
  // Bevels around the front, and the corner facets where three of them meet.
  for (const [z, flat, up] of [[z1 - b, z1, 1], [z0 + b, z0, -1]] as const)
    unwrapped(pen, cells.front, [[x0 + b, y1, z], [x1 - b, y1, z], [x1 - b, y1 - b, flat], [x0 + b, y1 - b, flat]], [0, 1, up], shade(tint, 0.96), front);
  for (const [x, inner, side] of [[x0, x0 + b, -1], [x1, x1 - b, 1]] as const) {
    unwrapped(pen, cells.front, [[inner, y1, z0 + b], [inner, y1, z1 - b], [x, y1 - b, z1 - b], [x, y1 - b, z0 + b]], [side, 1, 0], shade(tint, 0.96), front);
    for (const [z, flat, up] of [[z1 - b, z1, 1], [z0 + b, z0, -1]] as const)
      unwrapped(pen, cells.front, [[inner, y1, z], [x, y1 - b, z], [inner, y1 - b, flat]], [side, 1, up], shade(tint, 0.9), front);
  }
}

/**
 * Draws a window unit's outdoor face over `x0..x1`, `z0..z1` at depth `y`: a
 * pressed rim around a grille set back by `recess` meters, or bulging out when
 * that is negative. The rectangle shows one whole cell, whose rim and step
 * the atlas paints at the same fractions.
 */
function grille(pen: Pen, x0: number, x1: number, z0: number, z1: number, y: number, recess: number, cell: number, tint: V3): void {
  const project = onFace(x0, x1, z0, z1);
  const rim = 0.05,
    wall = 0.075;
  /** The rectangle's corners moved inward by a fraction of its size, at the given depth. */
  const ring = (inset: number, depth: number): V3[] => {
    const dx = (x1 - x0) * inset,
      dz = (z1 - z0) * inset;
    return [[x0 + dx, depth, z0 + dz], [x1 - dx, depth, z0 + dz], [x1 - dx, depth, z1 - dz], [x0 + dx, depth, z1 - dz]];
  };
  const outer = ring(0, y),
    lip = ring(rim, y),
    panel = ring(wall, y - recess);
  const inward: V3[] = [[0, 0, 1], [-1, 0, 0], [0, 0, -1], [1, 0, 0]];
  for (let k = 0; k < 4; k++) {
    const next = (k + 1) % 4;
    unwrapped(pen, cell, [outer[k], outer[next], lip[next], lip[k]], [0, 1, 0], tint, project);
    const facing = inward[k].map((value) => value * Math.sign(recess)) as V3;
    unwrapped(pen, cell, [lip[k], lip[next], panel[next], panel[k]], [facing[0], 0.4, facing[2]], shade(tint, recess > 0 ? 0.6 : 0.9), project);
  }
  unwrapped(pen, cell, panel, [0, 1, 0], tint, project);
}

/**
 * Draws a block of pressed louvers on the side face at `x` of a case, over
 * `y0..y1` and `z0..z1`: a dark opening with slats tilted out over it.
 * `side` is -1 on the case's left face and 1 on its right.
 */
function louvers(pen: Pen, x: number, side: number, y0: number, y1: number, z0: number, z1: number, tint: V3): void {
  /** The X coordinate `depth` meters proud of the face. */
  const out = (depth: number) => x + side * depth;
  pen.face("paint", [[out(0.001), y0, z0], [out(0.001), y1, z0], [out(0.001), y1, z1], [out(0.001), y0, z1]], [side, 0, 0], SHADOW);
  const slats = Math.max(3, Math.round((z1 - z0) / 0.03));
  const pitch = (z1 - z0) / slats;
  for (let i = 0; i < slats; i++) {
    const foot = z0 + i * pitch,
      lip = foot + pitch * 0.72;
    pen.face("metal", [[out(0.011), y0, foot], [out(0.011), y1, foot], [out(0.002), y1, lip], [out(0.002), y0, lip]], [side, 0, -0.6], shade(tint, 0.92));
  }
}

/**
 * Draws a pair of steel angle brackets carrying a unit whose underside is at
 * `z` between `x0` and `x1`, reaching `depth` from the wall. Struts and wall
 * plates hang at most `drop` below `z`.
 */
function brackets(pen: Pen, x0: number, x1: number, depth: number, z: number, drop: number, steel: V3, kit?: Kit): void {
  const fall = Math.min(0.32, drop);
  pen = weatheredPen(pen, kit, "frame");
  const finish: Steel = { slot: "metal", tint: steel, weathering: kit };
  for (const x of [x0 + 0.07, x1 - 0.07]) {
    angle(pen, finish, [x-.018, .008, z-.04], [x-.018, depth, z-.04], [1,0,0], [0,0,1], .035, .004);
    if (fall < 0.12) continue;
    member(pen, finish, [x, depth-.05, z-.04], [x,.014,z-fall+.035], [1,0,0], .026, .018);
    fixingPlate(pen,finish,[x,0,z-fall/2],[1,0,0],[0,0,1],[0,1,0],.07,fall,4);
  }
}

/** A rain cover overhangs its unit by this much at each side and at the front, meters. */
const COVER_OVERHANG = 0.06;

/**
 * Draws what an owner puts over a unit to keep the rain off: sheet metal, or
 * a board under a brick. The unit spans `x0..x1`, reaches `depth` from the
 * wall and ends at `top`; the cover stands at most 0.14 m above that.
 */
function rainCover(pen: Pen, x0: number, x1: number, depth: number, top: number, rng: Rng): void {
  if (rng.bool(0.6)) {
    const sheet = mix(GALVANIZED, RUST, rng.float(0.1, 0.6));
    const left = x0 - COVER_OVERHANG,
      right = x1 + COVER_OVERHANG,
      front = depth + COVER_OVERHANG;
    corrugated(pen, "sheet", [left, 0, top + 0.11], [right, 0, top + 0.11], [right, front, top + 0.02], [left, front, top + 0.02], 0.09, sheet);
    return;
  }
  const lo: V3 = [x0 - 0.04, 0, top + 0.002],
    hi: V3 = [x1 + 0.04, depth + 0.05, top + 0.016];
  const flat: Projector = (p) => [(p[0] - lo[0]) / (hi[0] - lo[0]), p[1] / hi[1]];
  const edge: Projector = (p) => [(p[0] - lo[0] + p[1]) / (hi[0] - lo[0] + hi[1]), (hi[2] - p[2]) / 0.2];
  const wood = shade([1, 1, 1], rng.float(0.7, 0.95));
  unwrapped(pen, BOARD_CELL, [[lo[0], hi[1], hi[2]], [hi[0], hi[1], hi[2]], [hi[0], 0, hi[2]], [lo[0], 0, hi[2]]], [0, 0, 1], wood, flat);
  unwrapped(pen, BOARD_CELL, [[lo[0], hi[1], lo[2]], [hi[0], hi[1], lo[2]], [hi[0], hi[1], hi[2]], [lo[0], hi[1], hi[2]]], [0, 1, 0], shade(wood, 0.7), edge);
  for (const x of [lo[0], hi[0]])
    unwrapped(pen, BOARD_CELL, [[x, 0, lo[2]], [x, hi[1], lo[2]], [x, hi[1], hi[2]], [x, 0, hi[2]]], [x === lo[0] ? -1 : 1, 0, 0], shade(wood, 0.7), edge);
  const bx = x0 + (x1 - x0) * rng.float(0.2, 0.7);
  pen.box("paint", [bx, depth * 0.3, hi[2]], [bx + 0.2, depth * 0.3 + 0.1, hi[2] + 0.06], shade(BRICK, rng.float(0.8, 1.1)), "d");
}

/**
 * Draws a window air conditioner centered on `x` with its underside at `z`,
 * as seen from the street: a beveled case, one of four rear grilles, side
 * louvers, brackets, a drain hose and often a rain cover. Models, sizes,
 * colors and wear vary with `rng`. It projects at most 0.45 m and hangs at
 * most `drop` below `z`; callers add the stain it leaves on the wall beneath.
 */
export function airConditioner(pen: Pen, x: number, z: number, drop: number, rng: Rng, kit?: Kit): { x0: number; x1: number; z: number } {
  const model = rng.int(0, 3);
  const wear = rng.weighted([[0, 3], [1, 4], [2, 3]] as const);
  const [narrowest, widest] = [[0.58, 0.68], [0.62, 0.72], [0.5, 0.58], [0.6, 0.7]][model];
  const w = rng.float(narrowest, widest);
  const h = w * rng.float(0.6, 0.67),
    d = rng.float(0.3, 0.37);
  const body = mix(mix(rng.pick(AC_BODIES), YELLOWED, wear * rng.float(0.1, 0.3)), RUST, wear * rng.float(0, 0.06));
  const x0 = x - w / 2,
    x1 = x + w / 2,
    bevel = 0.012;
  const rear = REAR_CELLS[model] + (wear > 0 ? 4 : 0);
  const side = SIDE_CELLS[wear];
  const top = wear > 0 && rng.bool(0.6) ? TOP_CELLS[1] : TOP_CELLS[0];
  casing(pen, [x0, 0, z], [x1, d, z + h], bevel, { front: rear, left: side, right: side, top, bottom: TOP_CELLS[0] }, body);
  grille(pen, x0 + bevel, x1 - bevel, z + bevel, z + h - bevel, d, REAR_RECESS[model], rear, body);
  const wire=shade(body,.65), grilleY=d-REAR_RECESS[model]+.003;
  for(let u=x0+.055;u<x1-.045;u+=.055) pen.tube("metal",[[u,grilleY,z+.05],[u,grilleY,z+h-.05]],.0018,wire,5);
  for(let v=z+.065;v<z+h-.05;v+=.055) pen.tube("metal",[[x0+.05,grilleY,v],[x1-.05,grilleY,v]],.0018,wire,5);
  const screws: Steel={slot:"metal",tint:shade(body,.7)};
  for(const u of [x0+.026,x1-.026]) for(const v of [z+.026,z+h-.026]) bolt(pen,screws,[u,d+.001,v],[0,1,0],.004);
  for (const [face, direction] of [[x0, -1], [x1, 1]] as const)
    louvers(pen, face, direction, d * 0.42, d - 0.05, z + h * 0.24, z + h * 0.78, body);
  // The sleeve the unit slides into, proud of the wall around it.
  pen.box("metal", [x0 - 0.015, 0, z - 0.015], [x1 + 0.015, 0.035, z + h + 0.015], shade(body, 0.8));
  if (rng.bool(0.6)) rainCover(pen, x0, x1, d, z + h, rng);
  const steel = mix(shade(GALVANIZED, 0.6), shade(RUST, 0.75), rng.float(0.2, 0.85));
  brackets(pen, x0, x1, d - 0.02, z, drop, steel, kit);
  // The slanted end of the hose dips a few millimeters below its last point.
  const hose = x + rng.float(-0.2, 0.2),
    length = Math.min(rng.float(0.3, 0.7), drop) - 0.005;
  if (length > 0.15)
    pen.tube("paint", [[hose, d - 0.05, z], [hose, d - 0.06, z - 0.12], [hose + 0.03, d - 0.1, z - length]], 0.011, HOSE, 5);
  return { x0, x1, z };
}

/**
 * Draws a condenser front over `x0..x1`, `z0..z1` at depth `y`: the pressed
 * panel around a round fan opening, the fan in its shroud behind it, and a
 * wire guard over it. The rectangle shows one whole cell and must be
 * FAN_ASPECT times as wide as tall, which makes the painted opening round.
 */
function fanFront(pen: Pen, x0: number, x1: number, z0: number, z1: number, y: number, cell: number, fan: number, tint: V3): void {
  const project = onFace(x0, x1, z0, z1);
  const cx = x0 + (x1 - x0) * FAN_CENTER,
    cz = (z0 + z1) / 2,
    radius = (z1 - z0) * FAN_RADIUS;
  // Spokes of the panel run to the rectangle's edge; its corners need spokes of their own.
  const angles = Array.from({ length: 40 }, (_, i) => (i / 40) * Math.PI * 2);
  for (const corner of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]])
    angles.push((Math.atan2(corner[1] - cz, corner[0] - cx) + Math.PI * 2) % (Math.PI * 2));
  angles.sort((a, b) => a - b);
  /** A point around the fan axis at `scale` times the opening's radius. */
  const rim = (angle: number, scale: number, depth: number): V3 => [cx + Math.cos(angle) * radius * scale, depth, cz + Math.sin(angle) * radius * scale];
  /** Where the spoke at `angle` meets the rectangle's edge. */
  const edge = (angle: number): V3 => {
    const cos = Math.cos(angle),
      sin = Math.sin(angle);
    const reachX = Math.abs(cos) < 1e-9 ? Infinity : ((cos > 0 ? x1 : x0) - cx) / cos;
    const reachZ = Math.abs(sin) < 1e-9 ? Infinity : ((sin > 0 ? z1 : z0) - cz) / sin;
    const reach = Math.min(reachX, reachZ);
    return [cx + cos * reach, y, cz + sin * reach];
  };
  const shroud = y - 0.05;
  for (let i = 0; i < angles.length; i++) {
    // The last segment closes the circle, so its far angle lies a full turn past the first.
    const a = angles[i],
      b = i + 1 < angles.length ? angles[i + 1] : angles[0] + Math.PI * 2;
    if (Math.abs(b - a) < 1e-6) continue;
    const middle: V3 = [-Math.cos((a + b) / 2), 0.3, -Math.sin((a + b) / 2)];
    unwrapped(pen, cell, [rim(a, 1, y), rim(b, 1, y), edge(b), edge(a)], [0, 1, 0], tint, project);
    pen.face("paint", [rim(a, 1, y), rim(b, 1, y), rim(b, 0.96, shroud), rim(a, 0.96, shroud)], middle, SHADOW);
  }
  pen.disc("paint",[cx,shroud-.035,cz],radius*.96,[0,1,0],srgb("#222724"),40);
  fanRotor(pen,[cx,shroud+.01,cz],radius*.9,fan===FAN_CELLS[0]?3:5);
  const wire = shade(tint, .72), proud=y+.014;
  for(const scale of [.26,.42,.58,.74,.9,.99]) {
    const path=Array.from({length:41},(_,i)=>rim(i/40*Math.PI*2,scale,y+.006+.012*(1-scale*scale)));
    pen.tube("metal",path,.0019,wire,5);
  }
  for(let i=0;i<10;i++) pen.tube("metal",[rim(i/10*Math.PI*2,.2,proud),rim(i/10*Math.PI*2,.99,y+.006)],.0018,wire,5);
  pen.disc("metal", [cx, proud + 0.002, cz], radius * 0.19, [0, 1, 0], shade(tint, 0.9), 24);
}

/** A stationary rotor around an explicit +Y pivot, with individually curved, pitched blades clear of the wire guard. */
function fanRotor(pen: Pen, center: V3, radius: number, blades: number): void {
  const [x,y,z]=center, dark=srgb("#50564f");
  const point=(angle:number,r:number,pitch:number):V3=>[x+Math.cos(angle)*r,y+pitch,z+Math.sin(angle)*r];
  for(let blade=0;blade<blades;blade++) {
    const start=blade/blades*Math.PI*2;
    for(let ring=0;ring<4;ring++) {
      const inner=.18+ring*.19,outer=inner+.19;
      const a=start+inner*.55,b=start+outer*.55;
      pen.sheet("metal",[point(a,inner*radius,-.007),point(b,outer*radius,-.007),point(b+.56,outer*radius,.012),point(a+.56,inner*radius,.012)],dark);
    }
  }
  pen.tube("metal",[[x,y-.025,z],[x,y+.018,z]],radius*.19,dark,20);
  pen.disc("metal",[x,y+.018,z],radius*.19,[0,1,0],dark,20);
}

/**
 * Draws the insulated line set of a condenser from its service end at `from`
 * back to the wall and `rise` meters up it, inside a plastic duct when there
 * is room for a run worth boxing in. It reaches 0.11 m beyond `from` in X.
 */
function lineSet(pen: Pen, from: V3, rise: number, rng: Rng): void {
  const [x, y, z] = from;
  const out = x + 0.07;
  if (rise < 0.3) {
    pen.tube("paint", [[x, y, z], [out, y, z], [out, 0.01, z + 0.04]], 0.016, INSULATION, 6);
    pen.tube("paint", [[x, y, z - 0.05], [out + 0.03, y, z - 0.05], [out + 0.03, 0.01, z]], 0.011, HOSE, 5);
    return;
  }
  pen.tube("paint", [[x, y, z], [out, y, z], [out, 0.04, z + 0.05]], 0.016, INSULATION, 6);
  pen.tube("paint", [[x, y, z - 0.05], [out, y, z - 0.05], [out, 0.04, z]], 0.011, HOSE, 5);
  const top = z + rise,
    half = 0.04,
    deep = 0.055;
  const white = shade([1, 1, 1], rng.float(0.78, 0.95));
  // The duct cell shows four lengths of duct; one cell covers each half meter of run.
  for (let foot = z - 0.02; foot < top - 1e-6; foot += 0.5) {
    const head = Math.min(top, foot + 0.5);
    const share = (head - foot) / 0.5;
    const face: Projector = (p) => [0.25 + ((p[0] - out + half) / (2 * half)) * 0.5, ((head - p[2]) / (head - foot)) * share];
    const flank: Projector = (p) => [(p[1] / deep) * 0.25, ((head - p[2]) / (head - foot)) * share];
    unwrapped(pen, DUCT_CELL, [[out - half, deep, foot], [out + half, deep, foot], [out + half, deep, head], [out - half, deep, head]], [0, 1, 0], white, face);
    for (const side of [-1, 1])
      unwrapped(pen, DUCT_CELL, [[out + side * half, 0, foot], [out + side * half, deep, foot], [out + side * half, deep, head], [out + side * half, 0, head]], [side, 0, 0], shade(white, 0.85), flank);
  }
  pen.face("paint", [[out - half, 0, top], [out + half, 0, top], [out + half, deep, top], [out - half, deep, top]], [0, 0, 1], shade(white, 0.9));
}

/** Reach of a condenser's valve cover and line set beyond its case, meters. */
const LINE_SET_REACH = 0.15;
/** The shortest stretch of wall that takes the smallest condenser with its cover and line set, meters. */
export const CONDENSER_ROOM = COVER_OVERHANG + 0.7 + LINE_SET_REACH;
/** The least free height a condenser needs above its base, meters. */
export const CONDENSER_HEIGHT = 0.5;

/**
 * Draws a split-system condenser on wall brackets somewhere along the wall
 * stretch `x0..x1`, its base at `z`: one fan or, where `height` allows, two
 * stacked, with coil sides, a valve cover, feet and a line set. The stretch
 * must be at least CONDENSER_ROOM long and `height`, the free height above
 * `z` for the unit, its cover and its pipes, at least CONDENSER_HEIGHT.
 * Models, sizes and wear vary with `rng`. Everything stays inside the
 * stretch and the height, projects at most 0.45 m and hangs 0.36 m below `z`.
 */
export function condenser(pen: Pen, x0: number, x1: number, z: number, height: number, rng: Rng, kit?: Kit): { x0: number; x1: number; z: number } {
  const bevel = 0.014;
  /** Height of one fan's case: its front inside the bevels keeps the fan's proportions. */
  const fanHeightOf = (width: number) => (width - 2 * bevel) / FAN_ASPECT + 2 * bevel;
  const spare = x1 - x0 - COVER_OVERHANG - LINE_SET_REACH;
  const widths = [0.7, 0.78, 0.86].filter((width) => width <= spare && fanHeightOf(width) <= height);
  const w = widths.length ? rng.pick(widths) : 0.7;
  const fanHeight = fanHeightOf(w);
  const fans = height >= fanHeight * 2 + 0.08 && rng.bool(0.25) ? 2 : 1;
  const h = fanHeight * fans,
    d = w * 0.36;
  const wear = rng.weighted([[0, 3], [1, 4], [2, 2]] as const);
  const front = wear === 2 ? RUSTED_FRONT : rng.pick(FRONT_CELLS.filter((cell) => cell !== RUSTED_FRONT));
  const body = mix(rng.pick(AC_BODIES), YELLOWED, wear * rng.float(0.05, 0.25));
  const left = x0 + COVER_OVERHANG + rng.float(0, Math.max(0, spare - w)),
    right = left + w,
    y0 = 0.07,
    y1 = y0 + d;
  const coil = rng.bool(0.3) ? COIL_CELLS[2] : COIL_CELLS[Math.min(1, wear)];
  const cells = { front, left: coil, right: VALVE_CELLS[Math.min(1, wear)], top: TOP_CELLS[wear > 0 && rng.bool(0.5) ? 1 : 0], bottom: TOP_CELLS[0], back: coil };
  const fan = rng.pick(FAN_CELLS);
  casing(pen, [left, y0, z], [right, y1, z+h], bevel, cells, body);
  for (let i = 0; i < fans; i++) {
    const foot = z + i * fanHeight;
    fanFront(pen, left + bevel, right - bevel, foot + bevel, foot + fanHeight - bevel, y1, front, fan, body);
  }
  if(fans===2) pen.panel("metal",left+bevel,right-bevel,z+fanHeight-bevel,z+fanHeight+bevel,y1,body);
  const fasteners: Steel={slot:"metal",tint:shade(body,.65)};
  for(const x of [left+.035,right-.035]) for(const v of [z+.035,z+h-.035]) bolt(pen,fasteners,[x,y1+.001,v],[0,1,0],.004);
  pen.box("metal", [right, y0 + d * 0.3, z + 0.05], [right + 0.035, y1 - d * 0.12, z + fanHeight * 0.5], shade(body, 0.95), "l");
  const steel = mix(shade(GALVANIZED, 0.6), shade(RUST, 0.75), rng.float(0.15, 0.75));
  for (const rail of [left + 0.1, right - 0.1]) {
    pen.box("metal", [rail - 0.03, y0 + 0.02, z - 0.016], [rail + 0.03, y1 - 0.02, z], shade(body, 0.75), "u");
    for(const y of [y0+.05,y1-.05]) {
      pen.drum("paint",[rail,y,z-.04],.024,.024,HOSE,10);
      bolt(pen,fasteners,[rail,y,z-.012],[0,0,1],.006);
    }
  }
  brackets(pen,left+.03,right-.03,y1,z-.04,.32,steel,kit);
  lineSet(pen, [right + 0.035, (y0 + y1) / 2, z + 0.14], Math.min(rng.float(0.5, 1.3), height - 0.2), rng);
  // A cover stands up to 0.14 m above the case, so it needs that much height to spare.
  if (wear > 0 && height >= h + 0.14 && rng.bool(0.3)) rainCover(pen, left, right, y1, z + h, rng);
  return { x0: left, x1: right, z };
}
