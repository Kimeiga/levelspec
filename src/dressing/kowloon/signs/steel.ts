import type { V3 } from "../../../architecture/types.ts";
import type { KitSlot } from "../../kit-mesh.ts";
import type { Pen } from "../../pen.ts";
import type { Kit } from "../kit.ts";
import { weatheredPen } from "../weathered.ts";

/** How a sign's steelwork is finished: the kit slot it is drawn in and its tint. */
export interface Steel {
  slot: KitSlot;
  tint: V3;
  /** Shared component-paint controls, enabled only for texture-weathered buildings. */
  weathering?: Kit;
}

const subtract = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const added = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scaled = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: V3): V3 => scaled(a, 1 / Math.hypot(...a));

/** Returns `steel` with its tint scaled, for members that should read apart from their neighbors. */
export function toned(steel: Steel, factor: number): Steel {
  return { ...steel, tint: scaled(steel.tint, factor).map((value) => Math.min(1, value)) as V3 };
}

/** Returns a unit vector square to `axis`, level where the axis allows it. */
function perpendicular(axis: V3): V3 {
  return unit(cross(axis, Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]));
}

/**
 * Draws a solid rectangular member from `a` to `b` with capped ends. `side`
 * is a unit vector square to the run along which the section is `width`
 * wide; it is `depth` thick the other way. Texture-weathered members have small
 * chamfered edges for lighting highlights. Lengths are meters in the pen's frame.
 */
export function member(pen: Pen, steel: Steel, a: V3, b: V3, side: V3, width: number, depth: number): void {
  pen = weatheredPen(pen, steel.weathering, steel.slot === "timber" ? "timber" : "frame", undefined, [steel.slot]);
  pen.beveledBar(steel.slot, a, b, side, width, depth, steel.tint, steel.weathering ? 0.0015 : 0);
}

/**
 * Draws an angle section whose heel runs from `a` to `b`. One leg lies along
 * `legA` and the other along `legB`, unit vectors square to the run and to
 * each other; each leg is `leg` wide and `gauge` thick.
 */
export function angle(pen: Pen, steel: Steel, a: V3, b: V3, legA: V3, legB: V3, leg: number, gauge: number): void {
  const shiftA = added(scaled(legA, leg / 2), scaled(legB, gauge / 2));
  const shiftB = added(scaled(legB, leg / 2), scaled(legA, gauge / 2));
  member(pen, steel, added(a, shiftA), added(b, shiftA), legA, leg, gauge);
  member(pen, toned(steel, 0.88), added(a, shiftB), added(b, shiftB), legB, leg, gauge);
}

/** Draws a solid triangular gusset centered on its plane, with capped edges. */
export function gusset(pen: Pen, steel: Steel, points: [V3, V3, V3], normal: V3, gauge = 0.006): void {
  pen = weatheredPen(pen, steel.weathering, "frame", undefined, [steel.slot]);
  const half = scaled(normal, gauge / 2);
  const front = points.map(point => added(point, half)), back = points.map(point => subtract(point, half));
  pen.face(steel.slot, front, normal, steel.tint);
  pen.face(steel.slot, back, scaled(normal, -1), steel.tint);
  const center = scaled(added(added(points[0], points[1]), points[2]), 1 / 3);
  for (let i = 0; i < 3; i++) {
    const next = (i + 1) % 3;
    const out = subtract(scaled(added(points[i], points[next]), 0.5), center);
    pen.face(steel.slot, [front[i], back[i], back[next], front[next]], out, steel.tint);
  }
}

/** Draws a round rod through `path`, such as a stay or a hanger; `sides` facets suit its thickness. */
export function rod(pen: Pen, steel: Steel, path: V3[], radius: number, sides = 6): void {
  pen = weatheredPen(pen, steel.weathering, "pipe", undefined, [steel.slot]);
  pen.tube(steel.slot, path, radius, steel.tint, sides);
}

/** Draws a hexagonal bolt head `radius` across standing on `center`, its shank along the unit vector `out`. */
export function bolt(pen: Pen, steel: Steel, center: V3, out: V3, radius: number): void {
  pen = weatheredPen(pen, steel.weathering, "frame", undefined, [steel.slot]);
  const washerTop = added(center, scaled(out, radius * 0.18));
  pen.tube(steel.slot, [center, washerTop], radius * 1.28, toned(steel, 0.8).tint, 12);
  pen.disc(steel.slot, washerTop, radius * 1.28, out, toned(steel, 0.8).tint, 12);
  const shoulder = added(washerTop, scaled(out, radius * 0.5));
  const top = added(shoulder, scaled(out, radius * 0.12));
  pen.tube(steel.slot, [washerTop, shoulder], radius, steel.tint, 6);
  const side = perpendicular(out), other = cross(out, side);
  for (let i = 0; i < 6; i++) {
    const radial = (angle: number): V3 => added(scaled(side, Math.cos(angle)), scaled(other, Math.sin(angle)));
    const a = radial(i * Math.PI / 3), b = radial((i + 1) * Math.PI / 3);
    pen.face(steel.slot, [added(shoulder, scaled(a, radius)), added(shoulder, scaled(b, radius)),
      added(top, scaled(b, radius * 0.83)), added(top, scaled(a, radius * 0.83))], added(a, b), steel.tint);
  }
  pen.disc(steel.slot, top, radius * 0.83, out, steel.tint, 6);
}

/**
 * Draws a fixing plate lying against a surface whose outward unit normal is
 * `out`, centered on `center`. It is `width` along `across` and `height`
 * along `up`, 8 mm thick, and bolted at two opposite corners or at all
 * four: four bolts are the two and two more.
 */
export function fixingPlate(
  pen: Pen,
  steel: Steel,
  center: V3,
  across: V3,
  up: V3,
  out: V3,
  width: number,
  height: number,
  bolts: 2 | 4,
): void {
  const thickness = 0.008;
  const middle = added(center, scaled(out, thickness / 2));
  member(pen, steel, added(middle, scaled(up, -height / 2)), added(middle, scaled(up, height / 2)), across, width, thickness);
  const face = added(center, scaled(out, thickness));
  const dark = toned(steel, 0.7);
  const corners = [[-1, -1], [1, 1], [-1, 1], [1, -1]].slice(0, bolts);
  for (const [column, row] of corners)
    bolt(pen, dark, added(face, added(scaled(across, width * 0.32 * column), scaled(up, height * 0.34 * row))), out, Math.min(0.011, width * 0.13, height * 0.115));
}

/** Draws a turnbuckle's barrel at the middle of the rod from `a` to `b`. */
export function turnbuckle(pen: Pen, steel: Steel, a: V3, b: V3, radius: number): void {
  pen = weatheredPen(pen, steel.weathering, "pipe", undefined, [steel.slot]);
  const axis = unit(subtract(b, a));
  const middle = scaled(added(a, b), 0.5);
  const half = radius * 5;
  pen.tube(steel.slot, [added(middle, scaled(axis, -half)), added(middle, scaled(axis, half))], radius * 2.2, steel.tint, 6);
}

/**
 * Draws a hanger of chain from `a` down to `b` as alternating flat links,
 * each about `size` long. The two points must differ.
 */
export function chain(pen: Pen, steel: Steel, a: V3, b: V3, size: number): void {
  const run = subtract(b, a);
  const length = Math.hypot(...run);
  const axis = scaled(run, 1 / length);
  const side = perpendicular(axis);
  const other = cross(axis, side);
  const count = Math.max(1, Math.round(length / (size * 0.8)));
  for (let i = 0; i < count; i++) {
    const from = added(a, scaled(axis, (length * i) / count)),
      to = added(a, scaled(axis, (length * (i + 1)) / count));
    member(pen, i % 2 ? toned(steel, 0.85) : steel, from, to, i % 2 ? side : other, size * 0.55, size * 0.16);
  }
}

/**
 * Draws a lattice truss in one plane: two chords from `a0` to `a1` and from
 * `b0` to `b1`, with posts and alternating diagonals at `bays` equal
 * divisions. Chords are `chord` square and the web `web` square, meters.
 */
export function lattice(pen: Pen, steel: Steel, a0: V3, a1: V3, b0: V3, b1: V3, bays: number, chord: number, web: number): void {
  const along = unit(subtract(a1, a0));
  const across = unit(subtract(b0, a0));
  const normal = unit(cross(along, across));
  member(pen, steel, a0, a1, normal, chord, chord);
  member(pen, steel, b0, b1, normal, chord, chord);
  const light = toned(steel, 0.9);
  const at = (from: V3, to: V3, t: number): V3 => added(from, scaled(subtract(to, from), t));
  for (let bay = 0; bay <= bays; bay++) {
    const t = bay / bays;
    member(pen, light, at(a0, a1, t), at(b0, b1, t), normal, web, web);
    if (bay === bays) continue;
    const next = (bay + 1) / bays;
    const [from, to] = bay % 2 ? [at(b0, b1, t), at(a0, a1, next)] : [at(a0, a1, t), at(b0, b1, next)];
    member(pen, light, from, to, normal, web, web);
  }
}
