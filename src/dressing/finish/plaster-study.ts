import { fractalNoise, smoothStep, valueNoise } from "./noise.ts";

/**
 * Prepares intrinsic plaster sampling in physical wall meters. Erosion bands
 * obey the requested output sampling frequency; uncoated or unworn finishes
 * skip erosion that cannot affect their exposure, while retaining tone and relief.
 */
export function createPlasterStudy(seed: number, density: number, wear: number, coated = true):
  (u: number, v: number) => { exposed: number; bump: number; tone: number } {
  const bands = [[13, 0.055], [31, 0.015], [83, 0.028], [173, 0.012], [347, 0.004]]
    .filter(([frequency]) => frequency * 1.2 <= density * 0.5);
  const threshold = 0.69 - wear * 0.08, grainFrequency = Math.min(95, density * 0.4);
  return (u, v) => {
    let exposed = coated ? 0 : 1;
    if (coated && wear > 0) {
      const x = u * 1.2 + 28.1, y = v + 4.7;
      const warpX = (fractalNoise(x * 2.3 + 7.1, y * 2.3 + 31.8, seed, 3) - 0.5) * 0.144;
      const warpY = (fractalNoise(x * 2.3 + 53.2, y * 2.3 + 9.4, seed, 3) - 0.5) * 0.144;
      const broad = fractalNoise(x + warpX, y + warpY, seed + 11, 3);
      let detail = 0;
      for (let index = 0; index < bands.length; index++) {
        const [frequency, amplitude] = bands[index];
        detail += (valueNoise(x * frequency, y * frequency, seed + frequency) - 0.5) * amplitude;
      }
      const border = 1 - smoothStep(0.025, 0.08, Math.abs(broad - threshold));
      exposed = smoothStep(threshold - 0.005, threshold + 0.005, broad + detail * 0.8 * border);
    }
    const tooth = (fractalNoise(u * 20, v * 20, seed + 31, 2) - 0.5) * 0.00035;
    let bump = tooth;
    if (exposed !== 1) {
      const grain = (valueNoise(u * grainFrequency, v * grainFrequency, seed + 29) - 0.5) * 0.00018;
      bump = (0.004 + grain + tooth) * (1 - exposed) + tooth * exposed;
    }
    return { exposed, bump, tone: 0.9 + fractalNoise(u * 1.85, v * 1.4, seed + 59, 3) * 0.1 };
  };
}

/** Prepares one affine source-texture transform, preserving the authored meter scale and normal-map basis. */
export function createStudyUV(repeat: number, seed: number): (u: number, v: number) => [number, number] {
  const angle = (valueNoise(0, 0, seed) - 0.5) * Math.PI / 10;
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  const phaseU = valueNoise(0, 0, seed + 1) * 7, phaseV = valueNoise(0, 0, seed + 2) * 7;
  return (u, v) => [(u * cosine - v * sine) * repeat + phaseU, (u * sine + v * cosine) * repeat + phaseV];
}
