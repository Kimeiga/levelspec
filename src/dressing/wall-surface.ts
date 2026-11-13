import type { V3 } from "../architecture/types.ts";
import { smoothStep, valueNoise } from "./finish/noise.ts";
import type { WallCondition, WallSample } from "./finish/wall-condition.ts";
import type { SurfaceSample } from "./surface/types.ts";

/** Finish depth is visual only, in meters; exposed backing stays inside the original wall. */
export const PLASTER_DEPTH = 0.006;

/** A stable seed for finish-scale detail, independent of mesh triangulation and host placement. */
export function finishSeed(name: string): number {
  let seed = 2166136261;
  for (const letter of name) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  return seed >>> 0;
}

/** Adds the same fine fracture field to an already evaluated coarse loss. */
function detailedLoss(broad: number, u: number, v: number, seed: number): number {
  if (broad <= -0.9) return broad;
  return broad + (valueNoise(u * 14, v * 14, seed) - 0.5) * 0.025
    + (valueNoise(u * 55, v * 55, seed + 17) - 0.5) * 0.011
    + (valueNoise(u * 180, v * 180, seed + 31) - 0.5) * 0.004;
}

/** Resolves coarse construction loss into clustered centimeter and millimeter-scale crumbling. */
export function plasterLoss(condition: WallCondition, u: number, v: number, seed: number): number {
  return detailedLoss(condition.sample(u, v).loss, u, v, seed);
}

/** Bounds the complete coarse loss plus every possible fine-fracture noise value, independent of seed. */
export function plasterLossRange(condition: WallCondition, bounds: readonly [number, number, number, number]): [number, number] {
  const range = condition.lossRange(bounds);
  if (range[1] <= -0.9) return range;
  const detail = (0.025 + 0.011 + 0.004) / 2;
  return [range[0] - detail, range[1] + detail];
}

/** Asserts a single finish owner only when the complete loss interval excludes the material boundary. */
export function wallChartNeeds(condition: WallCondition, bounds: readonly [number, number, number, number]): { fracture: boolean } {
  const [minimum, maximum] = plasterLossRange(condition, bounds);
  return { fracture: minimum <= 0 && maximum >= 0 };
}

/** Samples the fine coat/backing boundary and intrinsic tint; receiving charts own their finite plate elevations. */
export function plasterSample(
  condition: WallCondition,
  u: number,
  v: number,
  seed: number,
  coat: { material: string; uv: [number, number]; tint: V3 },
  backing: { material: string; uv: [number, number] },
  conditionSample: WallSample = condition.sample(u, v),
): SurfaceSample {
  const loss = detailedLoss(conditionSample.loss, u, v, seed);
  const exposed = smoothStep(-0.004, 0.004, loss);
  const conditionTint = conditionSample.tint;
  const moisture = Math.max(conditionSample.damp, conditionSample.runoff) * condition.grimeLevel;
  return {
    layers: [
      { material: coat.material, weight: 1 - exposed, uv: coat.uv,
        tint: conditionTint.map((value, axis) => value * coat.tint[axis]) as V3 },
      { material: backing.material, weight: exposed, uv: backing.uv,
        tint: conditionTint.map(value => value * 0.84) as V3 },
    ],
    height: 0,
    roughness: Math.min(1, 0.9 + exposed * 0.07 - moisture * 0.09),
  };
}
