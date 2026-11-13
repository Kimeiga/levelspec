import type { V3 } from "../../architecture/types.ts";
import { materialRecipeKey } from "../surface/material.ts";
import { fractalNoise, fractalNoiseRange, smoothStep, valueNoise, valueNoiseRange } from "./noise.ts";

/**
 * A horizontal edge that sheds water onto the wall below it: a sill, a slab
 * edge, a canopy or the roofline. Face coordinates in meters.
 */
export interface WallLedge {
  u0: number;
  u1: number;
  /** Height of the drip edge. */
  z: number;
  /** Water shed, 0–1: about 0.6 for a window sill and 1 for a roof edge. */
  flow: number;
}

/**
 * What makes one wall face wet and dirty. U runs along the face and Z up, in
 * meters; the origin is the caller's, and the same frame must be used for
 * every sample of the face.
 */
export interface WallExposure {
  /** Height of the ground the face stands on; omitted when it hangs clear of any floor. */
  base?: number;
  ledges: WallLedge[];
  /** Actual opening surrounds in face-local meters; these deposit soot, never cut geometry. */
  openings?: WallOpening[];
}

export interface WallOpening { u0: number; u1: number; z0: number; z1: number }

/** Finite support of opening soot, meters from the actual aperture. */
const SOOT_REACH = 0.65;

/** Normalized aging amounts and the seed that distinguishes one face from the next. */
export interface WallAging {
  /** 0–1 deposits: damp, run-off and rain streaking. Zero leaves only finish mottling. */
  grime: number;
  /** 0–1 loss of the applied coat and fading of what remains. */
  wear: number;
  seed: number;
}

/** The condition of a wall at one point. */
export interface WallSample {
  /** Linear RGB multiplier for the finish at this point; never illumination. */
  tint: V3;
  /** Positive where the applied coat has come away from the substrate; zero on the boundary. */
  loss: number;
  /** Shared intrinsic finish tone and moisture channels used by material composition. */
  tone: number;
  damp: number;
  runoff: number;
}

/** Farthest a ledge's stain spreads sideways past its ends, meters. */
export const LEDGE_SPREAD = 0.15;
/** Longest run-off streak below a full-flow ledge, meters. */
const LONGEST_RUN = 2.8;
const DIRT: V3 = [0.36, 0.34, 0.31];

/** Evaluates moisture monotonically in height and front reach, shared by samples and interval bounds. */
function dampAmount(height: number, front: number): number {
  if (height <= 0) return 1;
  const rising = Math.max(0, 1 - height / front) ** 1.6;
  const splash = Math.exp(-height / 0.16);
  return Math.min(1, rising * 0.8 + splash * 0.6);
}

/**
 * The common weathering model for vertical finishes. Variation is layered
 * from broad to fine: blotchy mottling of the finish itself, damp rising from
 * the ground with an uneven front, run-off streaks below every ledge, and
 * rain streaking over the whole face. A coat-loss field built from the same
 * causes says where paint or render has come away. All fields are continuous
 * functions of position, so any tessellation of the face samples one pattern.
 */
export class WallCondition {
  private readonly base: number | undefined;
  private readonly ledges: WallLedge[];
  private readonly openings: WallOpening[];
  private readonly grime: number;
  private readonly wear: number;
  private readonly seed: number;

  /** Snapshots exposure and aging; changes to caller-owned ledges require a new condition. */
  constructor(exposure: WallExposure, aging: WallAging) {
    this.base = exposure.base;
    this.ledges = exposure.ledges.filter(ledge => ledge.flow > 0 && ledge.u1 > ledge.u0)
      .map(ledge => ({ ...ledge }));
    this.openings = (exposure.openings ?? []).filter(opening => opening.u1 > opening.u0 && opening.z1 > opening.z0)
      .map(opening => ({ ...opening }));
    this.grime = aging.grime;
    this.wear = aging.wear;
    this.seed = aging.seed;
  }

  /** Authored deposit amount; a clean finish needs no damp or runoff material chart. */
  get grimeLevel(): number {
    return this.grime;
  }

  /** Authored coating loss amount; zero retains the intact coat. */
  get wearLevel(): number { return this.wear; }

  /** Complete moisture/coat-loss program; ledge order and infinite ends remain explicit. */
  get materialKey(): string {
    return materialRecipeKey("wall-condition/v4", { base: this.base, ledges: this.ledges, openings: this.openings,
      grime: this.grime, wear: this.wear, seed: this.seed });
  }

  /** Borrowed read-only water sources for texture-scale deposits; the geometric loss field stays independent. */
  get runoffSources(): readonly Readonly<WallLedge>[] {
    return this.ledges;
  }

  /** Tone-free brown deposits from ground, ledges, rain and openings, for shared finished materials. */
  depositTint(u: number, z: number, damp = this.damp(u, z), runoff = this.runoff(u, z)): V3 {
    const rain = smoothStep(0.4, 0.9, valueNoise(u * 2.2, z * 0.17, this.seed + 29));
    const streak = this.depositDetail(u, z);
    const dirt = this.grime * Math.min(1, damp * .75 + runoff * .85 + rain * .22) * streak;
    const soot = this.openingTint(u, z);
    return DIRT.map((pigment, axis) => (1 + (pigment - 1) * dirt) * soot[axis]) as V3;
  }

  /** Centimeter-scale broken rivulets, elongated along gravity; this never changes geometric coat loss. */
  private depositDetail(u: number, z: number): number {
    const wander = (valueNoise(u * 3.1, z * 1.4, this.seed + 419) - .5) * .06;
    const fine = fractalNoise((u + wander) * 17, z * 2.3, this.seed + 421, 3);
    const broken = fractalNoise(u * 13, z * 11, this.seed + 423, 2);
    const grain = valueNoise(u * 71, z * 67, this.seed + 431);
    return .12 + .62 * smoothStep(.36, .68, fine) + .18 * broken + .08 * grain;
  }

  /** Intrinsic brown-black deposits around heads/jambs, with downward streaks below sills. */
  openingTint(u: number, z: number): V3 {
    if (this.grime <= 0) return [1, 1, 1];
    let clean = 1;
    for (const opening of this.openings) {
      const outsideU = Math.max(opening.u0 - u, u - opening.u1, 0);
      const outsideZ = Math.max(opening.z0 - z, z - opening.z1, 0);
      if (outsideU >= SOOT_REACH || outsideZ >= SOOT_REACH) continue;
      const edge = Math.min(Math.abs(u - opening.u0), Math.abs(u - opening.u1));
      const across = 1 - smoothStep(.02, .32, outsideU);
      const withinHeight = smoothStep(opening.z0 - .14, opening.z0 + .08, z)
        * (1 - smoothStep(opening.z1 - .04, opening.z1 + .2, z));
      const jamb = Math.exp(-edge / .12) * withinHeight * .58;
      const head = Math.exp(-(((z - opening.z1 - .035) / .21) ** 2)) * across;
      const drop = Math.max(0, opening.z0 - z);
      const sill = z < opening.z0 ? Math.exp(-drop / .2) * across
        * (.2 + .5 * valueNoise(u * 9, drop * 1.4, this.seed + 403)) : 0;
      const mottling = (.58 + .42 * valueNoise(u * 4.8, z * 3.4, this.seed + 397)) * this.depositDetail(u, z);
      const fade = (1 - smoothStep(.4, SOOT_REACH, outsideU))
        * (1 - smoothStep(.4, SOOT_REACH, outsideZ));
      const deposit = Math.min(1, (head * .85 + jamb + sill) * mottling * fade);
      clean *= 1 - deposit;
    }
    const amount = (1 - clean) * this.grime;
    return [0.24, 0.21, 0.17].map(pigment => 1 - amount * (1 - pigment)) as V3;
  }

  /** Neutral material variation before deposits, shared by old surfaces and newly applied repairs. */
  finishTone(u: number, z: number): number {
    const broad = fractalNoise(u * 0.37, z * 0.31, this.seed, 3);
    const grain = valueNoise(u * 2.9, z * 2.3, this.seed + 19);
    return 0.9 + (broad - 0.5) * (0.26 + this.wear * 0.1) + (grain - 0.5) * 0.08 + this.wear * 0.04;
  }

  /**
   * Returns how damp the wall is at a point from splash-back and rising
   * moisture, 0–1. The damp front rises between 0.2 and 1.3 m and wanders
   * along the wall, so no two stretches share a tide line.
   */
  damp(u: number, z: number): number {
    if (this.base === undefined) return 0;
    const height = z - this.base;
    if (height <= 0) return 1;
    const front = 0.2 + 1.1 * fractalNoise(u * 0.55, 0.37, this.seed + 37, 2);
    return dampAmount(height, front);
  }

  /** Bounds rising moisture using its monotone height response and the complete front-noise interval. */
  private dampRange(bounds: readonly [number, number, number, number]): [number, number] {
    if (this.base === undefined) return [0, 0];
    const [u0, z0, u1, z1] = bounds;
    const front = fractalNoiseRange([u0 * 0.55, 0.37, u1 * 0.55, 0.37], this.seed + 37, 2);
    return [dampAmount(z1 - this.base, 0.2 + 1.1 * front[0]),
      dampAmount(z0 - this.base, 0.2 + 1.1 * front[1])];
  }

  /** Bounds every active ledge without replacing its onset, reach or sideways overlap with sampled guesses. */
  private runoffRange(bounds: readonly [number, number, number, number]): [number, number] {
    const [u0, z0, u1, z1] = bounds;
    let cleanLow = 1, cleanHigh = 1;
    for (const ledge of this.ledges) {
      const lowDrop = Math.max(0, ledge.z - z1), highDrop = Math.min(LONGEST_RUN, ledge.z - z0);
      const outside = Math.max(ledge.u0 - u1, u0 - ledge.u1, 0);
      if (lowDrop > highDrop || outside >= LEDGE_SPREAD) continue;
      const reach = LONGEST_RUN * (0.4 + 0.6 * ledge.flow);
      const streak = Math.max(0, 1 - lowDrop / reach) ** 1.4;
      const beneath = 0.55 * Math.exp(-lowDrop / 0.1);
      const maximum = ledge.flow * (1 - outside / LEDGE_SPREAD) * Math.min(1, streak + beneath)
        * smoothStep(0, 0.008, highDrop);
      const products = [cleanLow, cleanHigh, cleanLow * (1 - maximum), cleanHigh * (1 - maximum)];
      cleanLow = Math.min(...products); cleanHigh = Math.max(...products);
    }
    return [1 - cleanHigh, 1 - cleanLow];
  }

  /** Conservatively encloses coarse coat loss throughout a complete wall-coordinate rectangle. */
  lossRange(bounds: readonly [number, number, number, number]): [number, number] {
    if (this.wear <= 0) return [-1, -1];
    const [u0, z0, u1, z1] = bounds;
    const patch = fractalNoiseRange([u0 * 0.5, z0 * 0.42, u1 * 0.5, z1 * 0.42], this.seed + 91, 4);
    const ragged = valueNoiseRange([u0 * 4.7, z0 * 4.1, u1 * 4.7, z1 * 4.1], this.seed + 113);
    const damp = this.dampRange(bounds), runoff = this.runoffRange(bounds);
    const values = [0, 1].map(index => 0.5 + (patch[index] - 0.5) * 1.5 + (ragged[index] - 0.5) * 0.16
      + damp[index] * 0.2 + runoff[index] * 0.14 - (1 - this.wear * 0.45));
    return [values[0] - 1e-12, values[1] + 1e-12];
  }

  /**
   * Returns the run-off staining at a point from every ledge above it, 0–1.
   * Each ledge leaves a dirt line directly beneath, streaks of uneven length
   * and the heavier stains water leaves where it runs off a ledge's ends.
   */
  runoff(u: number, z: number): number {
    let clean = 1;
    for (const ledge of this.ledges) {
      const drop = ledge.z - z;
      if (drop < 0 || drop > LONGEST_RUN) continue;
      const outside = Math.max(ledge.u0 - u, u - ledge.u1, 0);
      if (outside >= LEDGE_SPREAD) continue;
      const ends = Math.exp(
        -Math.min(Math.abs(u - ledge.u0), Math.abs(u - ledge.u1)) / 0.14,
      );
      const streak = smoothStep(
        0.3,
        0.78,
        valueNoise(u * 3.4, ledge.z * 0.7, this.seed + 53),
      );
      const strength = Math.min(1, 0.2 + 0.8 * Math.max(streak, ends * 0.9));
      const reach =
        (0.3 + (LONGEST_RUN - 0.3) * strength * valueNoise(u * 2.1, ledge.z * 1.3, this.seed + 71)) *
        (0.4 + 0.6 * ledge.flow);
      const streaked = strength * Math.max(0, 1 - drop / reach) ** 1.4;
      const beneath = 0.55 * Math.exp(-drop / 0.1);
      const stain =
        ledge.flow * (1 - outside / LEDGE_SPREAD) * Math.min(1, streaked + beneath) * smoothStep(0, 0.008, drop);
      clean *= 1 - stain;
    }
    return 1 - clean;
  }

  /** Returns the finish tint and coat loss at a point of the face. */
  sample(u: number, z: number): WallSample {
    const damp = this.damp(u, z);
    const runoff = this.runoff(u, z);
    const tone = this.finishTone(u, z);
    const deposits = this.depositTint(u, z, damp, runoff);
    return { tint: deposits.map(value => Math.max(0.16, Math.min(1, tone * value))) as V3,
      loss: this.loss(u, z, damp, runoff), tone, damp, runoff };
  }

  /** Returns the finish tint alone, for faces that keep a single coat. */
  tint(u: number, z: number): V3 {
    return this.sample(u, z).tint;
  }

  /**
   * Coat loss as a signed field: broad patches with ragged edges, far more
   * likely where the wall stays damp or run-off scours it. Without wear the
   * coat is intact everywhere.
   */
  private loss(u: number, z: number, damp: number, runoff: number): number {
    if (this.wear <= 0) return -1;
    const patch = fractalNoise(u * 0.5, z * 0.42, this.seed + 91, 4);
    const ragged = valueNoise(u * 4.7, z * 4.1, this.seed + 113);
    const exposure = 0.5 + (patch - 0.5) * 1.5 + (ragged - 0.5) * 0.16;
    return exposure + damp * 0.2 + runoff * 0.14 - (1 - this.wear * 0.45);
  }
}
