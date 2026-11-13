import type { V3 } from "../../vector/types.ts";
import { Rng } from "../../generate/rng.ts";
import { fractalNoise, latticeHash, smoothStep, valueNoise } from "./noise.ts";
import type { WallCondition, WallLedge, WallSample } from "./wall-condition.ts";

type Bounds = [number, number, number, number];

/** A repaired area in a surface's own meter coordinates; overlapping rectangles form a stepped patch. */
export interface RenderRepair {
  regions: Bounds[];
  tint: V3;
  seed: number;
  /** 0 is newly applied over old dirt; 1 has accumulated the full subsequent weathering. */
  age: number;
}

/** Plans sparse repair campaigns independently of triangulation, grime, or the material-loss mask. */
export function planRenderRepairs(bounds: Bounds, seed: number, openings: Bounds[] = []): RenderRepair[] {
  const rng = new Rng(`render-repairs/${seed}`), patches: RenderRepair[] = [];
  const [u0, v0, u1, v1] = bounds;
  const tones: V3[] = [[0.92, 0.94, 0.95], [1.06, 1.04, 1.01], [0.97, 0.99, 1.02], [1.04, 1.02, 0.98]];
  for (let v = v0 - 0.3; v < v1; v += 1.9) for (let u = u0 - 0.3; u < u1; u += 2.1) {
    if (!rng.bool(0.65)) continue;
    const x = u + rng.float(0.1, 0.7), y = v + rng.float(0.1, 0.8);
    const width = rng.float(0.45, 1.3), height = rng.float(0.35, 1.05);
    const regions: Bounds[] = [[x, y, x + width, y + height]];
    if (rng.bool(0.65)) regions.push([x + width * 0.2, y + height * 0.5, x + width * 0.8, y + height + rng.float(0.18, 0.5)]);
    patches.push({ regions, tint: rng.pick(tones), seed: rng.int(1, 2147483647), age: rng.pick([0.08, 0.18, 0.45, 0.8]) });
  }
  for (const [index, opening] of openings.entries()) {
    if (index % 2 !== 0) continue;
    const [left, , , top] = opening;
    const x = Math.max(u0 + 0.06, left - rng.float(0.45, 0.75));
    const y = top - rng.float(0.45, 0.8), end = Math.min(v1 - 0.05, top + rng.float(0.45, 0.8));
    if (end <= y || left - x < 0.12) continue;
    patches.push({ regions: [[x, y, left + 0.2, end], [x + 0.2, y + 0.15, left + 0.45, end + 0.2]],
      tint: rng.pick(tones), seed: rng.int(1, 2147483647), age: rng.pick([0.08, 0.18, 0.5]) });
  }
  return patches;
}

/** Combined repair channels at one surface point. */
export interface RenderRepairSample { tint: V3; age: number; height: number; coverage: number }

/** Creates independently owned neutral repair channels. */
function cleanRepair(): RenderRepairSample { return { tint: [1, 1, 1], age: 1, height: 0, coverage: 0 }; }

/** Composites one rectangle union once, in campaign order, without allocating distance arrays. */
function applyRepair(sample: RenderRepairSample, patch: RenderRepair, u: number, v: number): void {
  let distance = -Infinity;
  for (const [u0, v0, u1, v1] of patch.regions)
    distance = Math.max(distance, Math.min(u - u0, u1 - u, v - v0, v1 - v));
  if (distance < -0.06) return;
  const ragged = (valueNoise(u * 47, v * 43, patch.seed) - 0.5) * 0.008;
  const coverage = smoothStep(-0.004, 0.004, distance + ragged);
  const trowel = (valueNoise(u * 7 + v * 2.2, v * 24, patch.seed + 7) - 0.5) * 0.0009;
  for (let axis = 0; axis < 3; axis++) sample.tint[axis] = sample.tint[axis] * (1 - coverage) + patch.tint[axis] * coverage;
  sample.age = sample.age * (1 - coverage) + patch.age * coverage;
  sample.height = sample.height * (1 - coverage) + (0.003 + trowel) * coverage;
  sample.coverage = 1 - (1 - sample.coverage) * (1 - coverage);
}

/** Samples repair color, age and shallow troweled relief in authored overlap order. */
export function renderRepairSample(repairs: RenderRepair[], u: number, v: number): RenderRepairSample {
  const sample = cleanRepair();
  for (const patch of repairs) applyRepair(sample, patch, u, v);
  return sample;
}

/** Paints ordered repair unions directly into an evenly spaced ascending raster row, including its halo. */
export function renderRepairRow(repairs: RenderRepair[], us: readonly number[], v: number): RenderRepairSample[] {
  const samples = us.map(cleanRepair);
  if (!us.length) return samples;
  const step = us.length > 1 ? us[1] - us[0] : 1;
  for (const patch of repairs) {
    let left = Infinity, right = -Infinity;
    for (const [u0, v0, u1, v1] of patch.regions) {
      if (v < v0 - 0.06 || v > v1 + 0.06) continue;
      left = Math.min(left, u0 - 0.06); right = Math.max(right, u1 + 0.06);
    }
    if (left > right) continue;
    const first = Math.max(0, Math.floor((left - us[0]) / step) - 1);
    const last = Math.min(us.length - 1, Math.ceil((right - us[0]) / step) + 1);
    for (let column = first; column <= last; column++) applyRepair(samples[column], patch, us[column], v);
  }
  return samples;
}

/** Broad domain-warped color islands retain connected shapes down through smaller troweled mottling. */
export function renderVariation(u: number, v: number, seed: number): { tint: V3; weathering: number } {
  const x = u + (fractalNoise(u * 0.43, v * 0.43, seed + 181, 3) - 0.5) * 1.3;
  const y = v + (fractalNoise(u * 0.51, v * 0.39, seed + 191, 3) - 0.5) * 1.1;
  const edge = (fractalNoise(x * 19, y * 23, seed + 211, 3) - 0.5) * 0.11;
  const field = fractalNoise(x * 1.4, y * 1.7, seed + 197, 6) + edge;
  const islands = smoothStep(0.4, 0.6, field);
  const mottling = fractalNoise(x * 5.3, y * 4.7, seed + 199, 3) - 0.5;
  const tone = 0.86 + islands * 0.24 + mottling * 0.13;
  const warmth = (fractalNoise(x * 0.9, y * 1.1, seed + 203, 3) - 0.5) * 0.12;
  const hues = [0, 1, 2].map(axis => (fractalNoise(x * 3.7, y * 4.3, seed + 307 + axis * 23, 4) - 0.5) * 0.1);
  const average = (hues[0] + hues[1] + hues[2]) / 3;
  return { tint: [tone * (1 + warmth + hues[0] - average), tone * (1 + (hues[1] - average) * 0.4),
    tone * (1 - warmth + hues[2] - average)], weathering: (1 - islands) * 0.65 };
}

/** Ragged gravity-driven deposits have separate centimeter rivulets, long tails, and irregular drying edges. */
export function runoffPigment(ledges: readonly Readonly<WallLedge>[], u: number, v: number, seed: number): number {
  let clean = 1;
  for (const ledge of ledges) {
    const drop = ledge.z - v, outside = Math.max(ledge.u0 - u, u - ledge.u1, 0);
    if (drop <= 0 || drop > 1.8 || outside >= 0.12) continue;
    const warped = u + (valueNoise(u * 3, v * 5, seed + 251) - 0.5) * 0.025;
    const finger = smoothStep(0.28, 0.8, valueNoise(warped * 13, ledge.z * 0.31, seed + 257));
    const hairline = smoothStep(0.38, 0.82, valueNoise(warped * 59, v * 0.18, seed + 263));
    const ends = Math.exp(-Math.min(Math.abs(u - ledge.u0), Math.abs(u - ledge.u1)) / 0.035);
    const reach = (0.18 + 1.5 * Math.max(finger, ends)) * (0.45 + 0.55 * ledge.flow);
    const ragged = (fractalNoise(u * 24, v * 20, seed + 269, 2) - 0.5) * 0.2;
    const tail = smoothStep(-0.08, 0.12, 1 - drop / reach + ragged) * Math.max(0, 1 - drop / reach) ** 0.45;
    const thread = (0.25 + 0.75 * Math.max(finger, ends)) * (0.45 + 0.55 * hairline);
    const apron = Math.exp(-drop / 0.12) * 0.72;
    const breakup = 0.3 + fractalNoise(u * 37, v * 29, seed + 271, 2) * 0.9;
    const concentration = 0.4 + 0.6 * Math.min(1, 0.8 / (ledge.u1 - ledge.u0));
    const stain = Math.min(1, (thread * tail + apron) * breakup) * ledge.flow * concentration
      * (1 - smoothStep(0, 0.12, outside)) * smoothStep(0, 0.015, drop);
    clean *= 1 - stain;
  }
  return 1 - clean;
}

/** Repair age determines which old deposits were covered and how much subsequent runoff has returned. */
export function renderPatina(condition: WallCondition, repair: RenderRepairSample, variation: ReturnType<typeof renderVariation>, wall: WallSample, u: number, v: number, seed: number): V3 {
  const grain = (valueNoise(u * 95, v * 95, seed + 223) - 0.5) * 0.012;
  const runoff = runoffPigment(condition.runoffSources, u, v, seed) * condition.grimeLevel * repair.age;
  const old = wall.tint, fresh = Math.min(1, wall.tone);
  const gray = (old[0] + old[1] + old[2]) / 3;
  return repair.tint.map((value, axis) => value * (variation.tint[axis] + grain)
    * (fresh * (1 - repair.age) + (gray + (old[axis] - gray) * 0.15) * repair.age)
    * (1 - runoff * [0.72, 0.76, 0.8][axis])) as V3;
}

/** Cement tooth and shallow repair ridges for normal-map baking, never geometric displacement. */
export function renderBump(u: number, v: number, seed: number, repairHeight = 0): number {
  const warp = (fractalNoise(u * 2.1, v * 2.3, seed + 229, 3) - 0.5) * 0.16;
  const trowel = valueNoise(u * 2.8 + v * 1.3, (v + warp) * 16, seed + 233) - 0.5;
  return trowel * 0.0007 + (valueNoise(u * 95, v * 95, seed + 223) - 0.5) * 0.00006
    + (valueNoise(u * 22, v * 26, seed + 227) - 0.5) * 0.00008 + repairHeight;
}

/** Intrinsic painted-part appearance; bounds and contact points use surface-local meters. */
export interface PaintedPatina {
  bounds: Bounds;
  paint: V3;
  substrate: V3;
  seed: number;
  wear: number;
  grime: number;
  handle?: [number, number];
  /** Recessed panel perimeters, in the same local meters as bounds. */
  panels?: Bounds[];
}

/** Returns pigment, roughness and normal-only relief for paint worn by edges, boots, hands and rain. */
export function paintedPatina(finish: PaintedPatina, u: number, v: number): { tint: V3; roughness: number; bump: number } {
  const { bounds: [u0, v0, u1, v1], seed, wear, grime, paint, substrate } = finish;
  const foot = Math.exp(-Math.max(0, v - v0) / 0.22);
  const hand = finish.handle ? Math.exp(-(((u - finish.handle[0]) / 0.12) ** 2 + ((v - finish.handle[1]) / 0.22) ** 2)) : 0;
  let loss = 0;
  const boundaries = [finish.bounds, ...(finish.panels ?? [])];
  for (const [index, [left, bottom, right, top]] of boundaries.entries()) {
    const edges = [
      [Math.abs(u - left), v, v >= bottom && v <= top],
      [Math.abs(u - right), v, v >= bottom && v <= top],
      [Math.abs(v - bottom), u, u >= left && u <= right],
      [Math.abs(v - top), u, u >= left && u <= right],
    ] as [number, number, boolean][];
    for (const [edge, [distance, along, within]] of edges.entries()) {
      if (!within || distance > .045) continue;
      const edgeSeed = seed + index * 197 + edge * 31;
      const cluster = smoothStep(.48, .79, valueNoise(along * 6, 0, edgeSeed));
      // Linear lattice interpolation makes a torn contour, rather than rounded crater islands.
      const tooth = Math.floor(along * 110);
      const fraction = along * 110 - tooth;
      const jagged = latticeHash(tooth, 0, edgeSeed + 7) * (1 - fraction)
        + latticeHash(tooth + 1, 0, edgeSeed + 7) * fraction;
      const width = wear * cluster * (.008 + foot * .055 + hand * .038) * (.3 + jagged * .9);
      const chip = width > .0002 ? 1 - smoothStep(width - .0006, width + .0006, distance) : 0;
      loss = Math.max(loss, chip);
    }
  }
  const cloud = fractalNoise(u * 2.3, v * 1.7, seed + 13, 3);
  const grain = valueNoise(u * 130, v * 45, seed + 17);
  const brush = valueNoise(u * 170, v * 11, seed + 37) - 0.5;
  const fade = wear * (0.06 + cloud * 0.3);
  const dirt = grime * Math.min(0.65, foot * (0.22 + cloud * 0.32) + hand * 0.16);
  const tint = paint.map((value, axis) => {
    const pigment = fractalNoise(u * 6.7 + v * 2.1, v * 6.7 - u * 2.1, seed + 101 + axis * 47, 4) - 0.5;
    const chalk = value * (1 + (cloud - 0.5) * 0.85) * (1 + pigment * 0.28) * (1 + fade) + fade * 0.06;
    const bare = substrate[axis] * (0.75 + grain * 0.35);
    return (chalk * (1 - loss) + bare * loss) * (1 - dirt) * (1 + brush * 0.035);
  }) as V3;
  return { tint, roughness: Math.min(1, 0.45 + cloud * 0.26 + fade * 0.5 + loss * 0.28 + dirt * 0.22),
    bump: (grain - 0.5) * 0.00008 + brush * 0.00008 - loss * 0.00012 };
}
