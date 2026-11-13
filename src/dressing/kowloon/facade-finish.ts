import { fractalNoise, smoothStep, valueNoise } from "../finish/noise.ts";
import { finishSeed } from "../wall-surface.ts";

/** Shared facade field size in meters, independent of host dimensions. */
export const FACADE_PERIOD = 4.8;

/** The intrinsic coating field shared by reusable maps and their finite deposit fallback. */
export interface FacadeFinishSettings {
  concrete: boolean;
  wear: number;
  density: number;
  variant: number;
}

/**
 * Produces connected plaster loss with fine chipped borders. Scalar fields wrap
 * before thresholding, so seams do not dissolve opaque chips into translucent spots.
 * Relief is intrinsic millimeter-scale normal detail, never displaced architecture.
 */
export function facadeFinish(settings: FacadeFinishSettings): (u: number, v: number) => {
  exposed: number; bump: number; tone: number; backingTone: number;
} {
  const seed = finishSeed(`facade-finish/v1/${settings.variant % 2}`);
  const grainFrequency = Math.min(63, settings.density * .35);
  return (u, v) => {
    const x = ((u % FACADE_PERIOD) + FACADE_PERIOD) % FACADE_PERIOD;
    const y = ((v % FACADE_PERIOD) + FACADE_PERIOD) % FACADE_PERIOD;
    const across = smoothStep(0, FACADE_PERIOD, x), up = smoothStep(0, FACADE_PERIOD, y);
    let erosion = 0, edge = 0, tooth = 0, tone = 0, backingTone = 0;
    for (let row = 0; row < 2; row++) for (let column = 0; column < 2; column++) {
      const weight = (column ? across : 1 - across) * (row ? up : 1 - up);
      const a = x - column * FACADE_PERIOD, b = y - row * FACADE_PERIOD;
      const warpU = (fractalNoise(a * 1.7, b * 1.7, seed + 3, 3) - .5) * .24;
      const warpV = (fractalNoise(a * 1.7 + 13, b * 1.7 + 29, seed + 7, 3) - .5) * .24;
      erosion += weight * fractalNoise((a + warpU) * .65, (b + warpV) * .78, seed + 11, 4);
      if (settings.density >= 32) edge += weight * (valueNoise(a * 13, b * 13, seed + 31) - .5) * .11;
      if (settings.density >= 76) edge += weight * (valueNoise(a * 31, b * 31, seed + 41) - .5) * .07;
      if (settings.density >= 180) edge += weight * (valueNoise(a * 73, b * 73, seed + 47) - .5) * .035;
      backingTone += weight * (.43 + fractalNoise(a * 2.8, b * 2.8, seed + 67, 4) * .75);
      tooth += weight * (valueNoise(a * grainFrequency, b * grainFrequency, seed + 53) - .5) * .0008;
      tone += weight * (.86 + fractalNoise(a * 1.85, b * 1.4, seed + 59, 3) * .14);
    }
    const threshold = .72 - settings.wear * .22;
    const exposed = settings.concrete ? 1 : settings.wear <= 0 ? 0
      : smoothStep(threshold - .004, threshold + .004, erosion + edge);
    const rim = settings.concrete || settings.wear <= 0 ? 0 : Math.exp(-Math.abs(erosion + edge - threshold) / .016);
    return { exposed, bump: tooth + .004 * (1 - exposed), tone: tone * (1 - rim * .16),
      backingTone: backingTone * (1 - rim * .24) };
  };
}
