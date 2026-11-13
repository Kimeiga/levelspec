import { balconyPlant, BALCONY_PLANTS } from "./balcony-props.ts";
import { canvasAwning } from "./tarps.ts";
import { PipeSystem } from "./pipes.ts";
import type { V3 } from "../../architecture/types.ts";
import type { Rng } from "../../generate/rng.ts";
import type { KitSlot } from "../kit-mesh.ts";
import type { Pen } from "../pen.ts";
import { drawPoster, posterBounds, POSTER_DESIGNS, type PosterOptions } from "../posters.ts";
import { smoothStep, valueNoise } from "../finish/noise.ts";
import { finishSeed } from "../wall-surface.ts";
import { materialRecipeKey } from "../surface/material.ts";
import { weatheredPen, metalColor } from "./weathered.ts";
import { fixingPlate, member } from "./signs/steel.ts";
import type { Kit } from "./kit.ts";
import { hangers, washing } from "./laundry.ts";
import {
  GALVANIZED,
  GREENS,
  RUST,
  SOOT,
  mix,
  shade,
  srgb,
} from "./palette.ts";

const CARDBOARD = srgb("#a8845a");
const BAMBOO = srgb("#c8b888");

/**
 * Soils the actual receiving wall below a dripping fixture. Fine irregular
 * streaks change its intrinsic color and roughness without an offset decal.
 */
export function stain(
  pen: Pen,
  x0: number,
  x1: number,
  top: number,
  bottom: number,
  wash: V3,
  depth: number,
): void {
  if (top <= bottom || x1 <= x0) return;
  const seed = finishSeed(`${pen.part}/${x0}/${x1}/${top}`), width = x1 - x0, height = top - bottom;
  pen.mesh.deposit({
    frame: pen.surfaceFrame(), bounds: [x0, bottom, x1, top],
    materialKey: materialRecipeKey("fixture-stain/v1", { seed, x0, x1, top, bottom, wash, depth }),
    sample(u, v) {
      const fall = (top - v) / height;
      const center = (x0 + x1) / 2 + (valueNoise(v * 8, 0, seed) - 0.5) * width * 0.12;
      const reach = width * (0.46 - fall * 0.3);
      const sides = 1 - smoothStep(reach * 0.3, reach, Math.abs(u - center));
      const ends = smoothStep(bottom, bottom + height * 0.35, v) * smoothStep(top, top - 0.012, v);
      const threads = 0.45 + valueNoise(u * 65, v * 2, seed + 17) * 0.55;
      return { strength: Math.min(1, depth * 1.6) * sides * ends * threads,
        tint: wash.map(value => 0.38 + value * 0.24) as V3, roughness: 0.94 };
    },
  });
}

/**
 * Draws a sheet with a corrugated profile, visible from both sides. `a` to
 * `b` is the edge the ribs cross and `a` to `d` the direction they run;
 * `pitch` is the rib spacing in meters.
 */
export function corrugated(
  pen: Pen,
  slot: KitSlot,
  a: V3,
  b: V3,
  c: V3,
  d: V3,
  pitch: number,
  tint: V3,
  kit?: Kit,
): void {
  const across = b.map((v, k) => v - a[k]) as V3,
    along = d.map((v, k) => v - a[k]) as V3;
  const normal: V3 = [
    across[1] * along[2] - across[2] * along[1],
    across[2] * along[0] - across[0] * along[2],
    across[0] * along[1] - across[1] * along[0],
  ];
  const length = Math.hypot(...normal);
  const width = Math.hypot(...across), run = Math.hypot(...along);
  const steps = Math.max(2, Math.round(width / pitch) * 2);
  const unfoldedWidth = steps * Math.hypot(width / steps, pitch * 0.28);
  pen = weatheredPen(pen, kit, "sheet", { bounds: [0, 0, unfoldedWidth, run], paint: tint,
    gravity: [-across[2] / unfoldedWidth, along[2] / run],
    key: `sheet/${a.join(",")}/${width}/${run}`,
    uv: point => [point.reduce((sum, value, axis) => sum + (value - a[axis]) * across[axis] / (width * width) * unfoldedWidth, 0),
      run - point.reduce((sum, value, axis) => sum + (value - a[axis]) * along[axis] / run, 0)] }, [slot]);
  const at = (from: V3, to: V3, i: number): V3 => {
    const t = i / steps,
      lift = (i % 2 ? 1 : -1) * pitch * 0.14;
    return from.map((v, k) => v + (to[k] - v) * t + (normal[k] / length) * lift) as V3;
  };
  for (let i = 0; i < steps; i++)
    pen.sheet(slot, [at(a, b, i), at(a, b, i + 1), at(d, c, i + 1), at(d, c, i)], shade(tint, i % 2 ? 1 : 0.88), shade(tint, 0.6));
}

/**
 * Draws a drying rack below a window: two arms from the wall carrying bamboo
 * poles of washing parallel to the facade, out to `depth`. Washing hangs at
 * most 0.8 m below the poles and 0.05 m beyond the outermost one.
 */
export function dryingRack(pen: Pen, x0: number, x1: number, z: number, depth: number, rng: Rng, kit?: Kit): void {
  const hardware = weatheredPen(pen, kit, "frame", undefined, ["metal"]);
  const metal = metalColor(GALVANIZED, rng.float(0.2, 0.7), kit);
  for (const x of [x0, x1]) {
    hardware.bar("metal", [x, 0, z], [x, depth, z + 0.04], 0.025, metal);
    hardware.bar("metal", [x, 0, z - 0.25], [x, depth * 0.7, z + 0.02], 0.018, metal);
  }
  const poles = depth > 0.5 ? 3 : 2;
  for (let i = 0; i < poles; i++) {
    const y = depth * (0.35 + (0.65 * i) / (poles - 1));
    pen.tube("paint", [[x0 - 0.15, y, z + 0.03], [x1 + 0.15, y, z + 0.03]], 0.013, BAMBOO, 6);
    washing(pen.move(0, y, 0), x0 - 0.1, x1 + 0.1, z + 0.03, rng, { fill: 0.75, drop: 0.8, support: "pole" });
  }
}

/**
 * Draws a bamboo pole socketed into the wall at `x`, `z`, reaching `length`
 * outward, with clothes on hangers along it from 0.3 m off the wall. They
 * hang square to the pole, up to 0.4 m either side of it and 0.85 m below.
 */
export function dryingPole(pen: Pen, x: number, z: number, length: number, rng: Rng, kit?: Kit): void {
  const hardware = weatheredPen(pen, kit, "frame", undefined, ["metal"]);
  const slope = 0.12;
  pen.tube("paint", [[x, 0, z], [x, length, z + length * slope]], 0.014, BAMBOO, 6);
  hardware.tube("metal", [[x, 0, z], [x, 0.06, z + 0.007]], 0.024, shade(GALVANIZED, 0.6), 6);
  const along = pen.facing([x, 0, z], [0, 1, 0], [1, 0, 0]);
  hangers(along, 0.3, length - 0.04, 0, slope, rng, 0.4, 0.85);
}

/** Draws a clump of arching leaves around `center`; `size` is its radius in meters. */
export function foliage(pen: Pen, center: V3, size: number, rng: Rng, leaves = 9): void {
  const green = rng.pick(GREENS);
  for (let i = 0; i < leaves; i++) {
    const azimuth = (i / leaves) * Math.PI * 2 + rng.float(-0.4, 0.4),
      lift = rng.float(0.1, 1.3);
    const out: V3 = [Math.cos(azimuth), Math.sin(azimuth), 0];
    const side: V3 = [-out[1], out[0], 0];
    const span = size * rng.float(0.6, 1.1),
      width = span * rng.float(0.22, 0.36);
    const point = (t: number, s: number): V3 => [
      center[0] + out[0] * span * t + side[0] * width * s,
      center[1] + out[1] * span * t + side[1] * width * s,
      center[2] + span * (lift * t - 0.9 * t * t),
    ];
    const tint = shade(green, rng.float(0.7, 1.3));
    pen.sheet("paint", [point(0.05, 0), point(0.5, 1), point(0.55, 0)], tint, shade(tint, 0.75));
    pen.sheet("paint", [point(0.05, 0), point(0.55, 0), point(0.5, -1)], shade(tint, 0.9), shade(tint, 0.7));
    pen.sheet("paint", [point(0.5, 1), point(1, 0), point(0.55, 0)], shade(tint, 1.08), shade(tint, 0.75));
    pen.sheet("paint", [point(0.55, 0), point(1, 0), point(0.5, -1)], tint, shade(tint, 0.7));
  }
}

/** Draws a shared textured plant, uniformly scaled and rotated around its grounded pot base. */
export function pottedPlant(pen: Pen, base: V3, rng: Rng): void {
  balconyPlant(pen, rng.pick(BALCONY_PLANTS), base, rng.float(.72, 1.02), rng.float(0, Math.PI * 2));
}

/** Draws a row of pots along `x0..x1` at depth `y`, standing on height `z`. */
export function plantRow(pen: Pen, x0: number, x1: number, y: number, z: number, rng: Rng): void {
  for (let x = x0 + 0.14; x < x1 - 0.1; x += rng.float(0.28, 0.55))
    if (rng.bool(0.8)) pottedPlant(pen, [x, y, z], rng);
}

/**
 * Draws a projecting window cage over `x0..x1`, `z0..z1` reaching `depth`:
 * welded bar frame and infill, mesh floor, optional sheet roof, and when
 * `stocked` the plants, washing and stored boxes a household keeps in it.
 */
export function cage(
  pen: Pen,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  depth: number,
  color: V3,
  rng: Rng,
  stocked: boolean,
  kit?: Kit,
): void {
  const paint = metalColor(color, rng.float(0, 0.35), kit);
  const steel = weatheredPen(pen, kit, "cage");
  const frame = { slot: "paint" as const, tint: paint, weathering: kit };
  const rail = (a: V3, b: V3, thickness: number): void => {
    const axis = b.map((value, i) => value - a[i]);
    const side: V3 = Math.abs(axis[0]) > Math.abs(axis[2]) ? [0, 0, 1] : [1, 0, 0];
    steel.beveledBar("paint", a, b, side, thickness, thickness, paint, 0.001);
  };
  const mountWidth = Math.min(0.09, (x1 - x0) * 0.2), mountHeight = Math.min(0.14, (z1 - z0) * 0.2);
  for (const x of [x0 + mountWidth / 2, x1 - mountWidth / 2])
    for (const z of [z0 + mountHeight / 2, z1 - mountHeight / 2]) {
      fixingPlate(steel, frame, [x, 0, z], [1, 0, 0], [0, 0, 1], [0, 1, 0], mountWidth, mountHeight, 2);
      const frontZ = z < (z0 + z1) / 2 ? z0 + 0.014 : z1 - 0.014;
      member(steel, frame, [x, 0.012, z], [x, depth - 0.014, frontZ], [1, 0, 0], 0.025, 0.012);
    }
  for (let y = 0.055; y < depth; y += 0.11)
    rail([x0, y, z0], [x1, y, z0], 0.009);
  for (const z of [z0, (z0 + z1) / 2, z1]) {
    rail([x0, depth, z], [x1, depth, z], 0.028);
    for (const x of [x0, x1]) rail([x, 0, z], [x, depth, z], 0.028);
  }
  for (const x of [x0, x1]) rail([x, depth, z0], [x, depth, z1], 0.03);
  const pitch = 0.11;
  for (let x = x0 + pitch; x < x1 - 0.04; x += pitch)
    rail([x, depth, z0], [x, depth, z1], 0.012);
  for (const x of [x0, x1])
    for (let y = pitch; y < depth - 0.03; y += pitch)
      rail([x, y, z0], [x, y, z1], 0.012);
  for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.2)
    rail([x, 0, z0], [x, depth, z0], 0.012);
  if (rng.bool(0.55)) {
    const roof = rng.bool(0.5) ? srgb("#b9c79a") : metalColor(GALVANIZED, rng.float(0, 0.6), kit);
    corrugated(pen, "sheet", [x0 - 0.05, 0, z1 + 0.14], [x1 + 0.05, 0, z1 + 0.14], [x1 + 0.05, depth + 0.1, z1 + 0.02], [x0 - 0.05, depth + 0.1, z1 + 0.02], 0.09, roof, kit);
  }
  if (!stocked) return;
  const content = rng.pick(["plants", "plants", "washing", "storage", "mixed"]);
  if (content === "plants" || content === "mixed") plantRow(pen, x0, x1, depth * 0.6, z0 + 0.01, rng);
  if (content === "washing" || content === "mixed") {
    pen.tube("paint", [[x0, depth * 0.72, z1 - 0.05], [x1, depth * 0.72, z1 - 0.05]], 0.013, BAMBOO, 6);
    washing(pen.move(0, depth * 0.72, 0), x0 + 0.05, x1 - 0.05, z1 - 0.05, rng, { fill: 0.85, drop: Math.min(0.8, z1 - z0 - 0.12), support: "pole" });
  }
  if (content === "storage")
    for (let x = x0 + 0.06; x < x1 - 0.35; x += rng.float(0.32, 0.5)) {
      const size = rng.float(0.22, 0.34);
      pen.box("paint", [x, depth * 0.25, z0 + 0.01], [x + size, depth * 0.25 + size, z0 + size * rng.float(0.7, 1.3)], shade(CARDBOARD, rng.float(0.7, 1.2)), "d");
    }
}

/**
 * Draws a sloping awning over `x0..x1` from the wall at `z` out to `depth`,
 * falling by `drop`: simulated canvas on a fitted tube frame,
 * or ribbed sheet metal on brackets.
 */
export function awning(
  pen: Pen,
  x0: number,
  x1: number,
  z: number,
  depth: number,
  drop: number,
  style: { canvas: boolean; base: V3; hem: V3 },
  key: string,
  kit?: Kit,
): void {
  const hardware = weatheredPen(pen, kit, "frame", undefined, ["metal"]);
  const steel = shade(GALVANIZED, 0.6);
  if (!style.canvas) {
    corrugated(pen, "sheet", [x0, 0, z], [x1, 0, z], [x1, depth, z - drop], [x0, depth, z - drop], 0.11, style.base, kit);
    for (const x of [x0 + 0.05, x1 - 0.05]) {
      hardware.bar("metal", [x, 0, z - 0.03], [x, depth, z - drop - 0.03], 0.025, steel);
      hardware.bar("metal", [x, 0, z - drop - 0.25], [x, depth * 0.8, z - drop * 0.8 - 0.04], 0.02, steel);
    }
    return;
  }
  canvasAwning(pen, { x0, x1, z, depth, drop }, style.base, style.hem, key, kit);
}

/** Draws a small bulkhead lamp with a conduit, centered on `x` at height `z`. Projects 0.13 m. */
export function wallLamp(pen: Pen, x: number, z: number, kit: Kit): void {
  const hardware = weatheredPen(pen, kit, "frame", undefined, ["metal"]);
  hardware.box("metal", [x - 0.09, 0, z], [x + 0.09, 0.06, z + 0.13], shade(GALVANIZED, 0.5));
  pen.box("pane", [x - 0.07, 0.06, z + 0.015], [x + 0.07, 0.125, z + 0.115], srgb("#f4e8c0"));
  for (const bar of [-0.03, 0.03])
    hardware.bar("metal", [x + bar, 0.128, z + 0.015], [x + bar, 0.128, z + 0.115], 0.008, shade(GALVANIZED, 0.4));
  new PipeSystem(pen, { radius: 0.012, color: SOOT, kit }).run([[x, 0.02, z + 0.13], [x, 0.02, z + 0.75]], 0);
}

/** Draws a bank of utility meters with rising conduits from `x`, `z`. Projects 0.13 m. */
export function meterBank(pen: Pen, x: number, z: number, count: number, rng: Rng, kit: Kit): void {
  const hardware = weatheredPen(pen, kit, "frame", undefined, ["metal"]);
  const body = shade(GALVANIZED, rng.float(0.5, 0.9));
  for (let i = 0; i < count; i++) {
    const x0 = x + i * 0.3;
    hardware.box("metal", [x0, 0, z], [x0 + 0.24, 0.12, z + 0.34], body);
    hardware.box("metal", [x0 + 0.03, 0.12, z + 0.15], [x0 + 0.21, 0.128, z + 0.31], shade(body, 0.7), "b");
    pen.panel("pane", x0 + 0.05, x0 + 0.19, z + 0.17, z + 0.29, 0.13, srgb("#d8d8cc"));
    new PipeSystem(pen, { radius: 0.011, color: SOOT, kit }).run([[x0 + 0.12, 0.03, z + 0.34], [x0 + 0.12, 0.03, z + 1.2 + i * 0.07]], 0);
  }
}

/** Draws pasted bills and notices scattered over `x0..x1`, `z0..z1`. */
export function notices(pen: Pen, x0: number, x1: number, z0: number, z1: number, rng: Rng): void {
  if (x1 <= x0 || z1 <= z0 || !pen.mesh.textured("posters")) return;
  const count = Math.min(9, Math.round((x1 - x0) * (z1 - z0) * rng.float(1.5, 4)));
  for (let i = 0; i < count; i++) {
    const options: PosterOptions = { design: rng.pick(POSTER_DESIGNS), width: rng.float(.2, .34),
      rotation: rng.float(-7, 7), layer: i, wear: rng.float(.15, .6), seed: `${pen.part}/notice-${i}` };
    const proposed = posterBounds(options);
    options.width *= Math.min(1, (x1 - x0) / proposed.width, (z1 - z0) / proposed.height);
    if (options.width < .05) continue;
    const bounds = posterBounds(options);
    const x = rng.float(x0 + bounds.width / 2, x1 - bounds.width / 2);
    const z = rng.float(z0 + bounds.height / 2, z1 - bounds.height / 2);
    // A separate paper plane per sheet permits natural overlaps without coplanar faces.
    drawPoster(pen.into(`${pen.part}/notice-${i}`).move(x, .003, z), options);
  }
}
