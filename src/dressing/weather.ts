import type { V3 } from "../architecture/types.ts";
import { valueNoise3 } from "./finish/noise.ts";

/**
 * Continuous tone variation in [-0.75, 0.75] over world positions in meters,
 * independent of mesh tessellation. Three-dimensional noise varies in two
 * directions on any floor or wall, so no surface bands or repeats a blotch.
 */
function variation(p: V3, phase: number): number {
  const noise = valueNoise3(p[0] * 0.4, p[1] * 0.4, p[2] * 0.4, Math.round(phase * 1e5));
  return Math.max(-0.75, Math.min(0.75, (noise - 0.5) * 1.8));
}

/**
 * Broad seeded finish mottling in linear RGB, independent of nearby geometry.
 * Grime darkens the finish; wear lightens it. Wall-specific damp and runoff
 * belong to WallCondition, and ground wetness belongs to the receiving patch.
 */
export function weatherColor(
  p: V3,
  grime: number,
  wear: number,
  phase: number,
): V3 {
  const noise = variation(p, phase);
  const deposit = grime * (0.12 + (noise + 0.75) * 0.08);
  const value = Math.max(
    0.18,
    Math.min(
      1,
      0.88 + noise * 0.12 - deposit + wear * 0.06,
    ),
  );
  return [value * 0.98, value, value * 0.93];
}
