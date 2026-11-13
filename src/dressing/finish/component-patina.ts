import type { V3 } from "../../vector/types.ts";
import { fractalNoise, smoothStep, valueNoise } from "./noise.ts";
import type { WeatheringFold } from "./component-geometry.ts";

export type ComponentFinish = "frame" | "cage" | "pipe" | "sheet" | "timber";

/** Exposure in unwrapped physical-meter coordinates; the base finish varies independently of aging. */
export interface ComponentPatina {
  kind: ComponentFinish;
  bounds: [number, number, number, number];
  paint: V3;
  /** Installed coating fraction; bare metal has no paint-chip relief. */
  paintCoverage?: number;
  seed: number;
  wear: number;
  grime: number;
  rust: number;
  /** Whether each UV axis ends at physical boundaries rather than unwrap seams. */
  edgeAxes?: [boolean, boolean];
  contacts?: [number, number][];
  /** Physical meters per canonical U/V unit; gravity is projected into those tangent axes. */
  metric?: { scale: [number, number]; gravity: [number, number] };
  folds?: WeatheringFold[];
  /** Optional world-gravity runoff field, sampled in receiver UV meters; values are in [0,1]. */
  runoff?: (u: number, v: number) => number;
}

/** Layers intact paint, exposed substrate and oxidation using edge, joint and drainage exposure. */
export function componentPatina(finish: ComponentPatina, u: number, v: number): {
  paint: V3; paintCoverage: number; mottling: V3; substrateRoughness: number;
  oxide: V3; oxideCoverage: number; roughness: number; bump: number; runoff: number;
} {
  const { bounds: [u0, v0, u1, v1], kind, seed, wear, grime } = finish;
  const [scaleU, scaleV] = finish.metric?.scale ?? [1, 1];
  const x = (u - u0) * scaleU, y = (v - v0) * scaleV;
  const width = (u1 - u0) * scaleU, height = (v1 - v0) * scaleV;
  // The sides of a pipe strip are an unwrap seam, not exposed metal edges.
  const edge = finish.edgeAxes?.[0] === false ? 0 : Math.exp(-Math.max(0, Math.min(x, width - x)) / 0.012);
  const joint = finish.edgeAxes?.[1] === false ? 0 : Math.exp(-Math.max(0, Math.min(y, height - y)) / 0.024);
  const gravity = finish.metric?.gravity ?? [0, -1];
  const downhillU = finish.edgeAxes?.[0] === false ? Infinity : gravity[0] > 0.01 ? (width - x) / gravity[0] : gravity[0] < -0.01 ? -x / gravity[0] : Infinity;
  const downhillV = finish.edgeAxes?.[1] === false ? Infinity : gravity[1] > 0.01 ? (height - y) / gravity[1] : gravity[1] < -0.01 ? -y / gravity[1] : Infinity;
  const bottom = Math.exp(-Math.max(0, Math.min(downhillU, downhillV)) / 0.09);
  const warp = valueNoise(x * 7, y * 7, seed + 7) - 0.5;
  const fieldU = x + warp * 0.035, fieldV = y - warp * 0.027;
  const islands = fractalNoise(fieldU * 14, fieldV * 14, seed + 11, 4);
  const fine = valueNoise(x * 67 + y * 31, y * 67 - x * 31, seed + 19);
  const brush = valueNoise(x * 55, y * 6, seed + 29);
  let crease = 0, ridge = 0;
  for (const fold of finish.folds ?? []) {
    const distance = Math.abs([u, v][fold.axis] - fold.at) * [scaleU, scaleV][fold.axis];
    if (fold.concave) crease = Math.max(crease, Math.exp(-distance / 0.012));
    else ridge = Math.max(ridge, Math.exp(-distance / 0.009));
  }
  let bleed = finish.runoff?.(u, v) ?? 0;
  for (const point of finish.contacts ?? []) {
    const metric = finish.metric ?? { scale: [1, 1], gravity };
    const delta = [(u - point[0]) * metric.scale[0], (v - point[1]) * metric.scale[1]];
    const gravityLength = Math.hypot(...metric.gravity);
    const spot = Math.exp(-((delta[0] / 0.025) ** 2 + (delta[1] / 0.035) ** 2));
    let trail = 0;
    if (gravityLength > 0.1) {
      const down = (delta[0] * metric.gravity[0] + delta[1] * metric.gravity[1]) / gravityLength;
      const side = Math.abs(delta[0] * metric.gravity[1] - delta[1] * metric.gravity[0]) / gravityLength;
      if (down >= 0 && down < 0.45) trail = Math.exp(-down / 0.15) * Math.exp(-side / (0.012 + down * 0.03));
    }
    bleed = Math.max(bleed, spot * 0.65, trail * (0.45 + valueNoise(x * 21, y * 3, seed + 61) * 0.55));
  }
  const exposure = edge * 0.42 + joint * 0.33 + bottom * 0.2 + crease * 0.24 + ridge * 0.24 + bleed * 0.55;
  const threshold = 0.86 - wear * (0.12 + exposure * 0.5);
  const chips = wear === 0 ? 0 : smoothStep(threshold, threshold + 0.075, islands * 0.8 + fine * 0.2);
  const scratches = wear * edge * smoothStep(0.71, 0.86, brush) * 0.6;
  const coverage = finish.paintCoverage ?? 1;
  const loss = Math.max(chips, scratches);
  const exposed = 1 - coverage * (1 - loss);
  const chalk = fractalNoise(fieldU * 4, fieldV * 4, seed + 43, 4);
  const drip = smoothStep(0.48, 0.73, valueNoise(x * 23, y * 0.7, seed + 47));
  const edgeDeposit = kind === "timber" ? 0 : Math.min(1, edge * 0.45 + joint * 0.35 + crease * 0.7 + bleed * 0.65)
    * smoothStep(0.3, 0.7, islands);
  const dirt = grime * Math.min(0.78, bottom * (0.23 + drip * 0.3) + joint * 0.23 + (1 - chalk) * 0.32
    + bleed * 0.7 + crease * 0.3 + edgeDeposit * 0.28);
  const timber = kind === "timber";
  const fade = wear * (timber ? 0.07 + chalk * 0.28 : 0.02 + chalk * 0.025);
  const pigment = [0, 1, 2].map(axis => (fractalNoise(fieldU * 6.7 + fieldV * 2.1, fieldV * 6.7 - fieldU * 2.1, seed + 101 + axis * 47, 4) - 0.5) * (timber ? 0.28 : 0.025));
  const baseTone = 1 + (chalk - 0.5) * (timber ? 0.85 : 0.055) + (brush - 0.5) * (timber ? 0.06 : 0.012);
  const paint = finish.paint.map((value, axis) => {
    const faded = value * (1 + fade) + fade * 0.065;
    return faded * baseTone * (1 + pigment[axis]) * (1 - dirt * (timber ? 1 : 0.55));
  }) as V3;
  const metalCloud = fractalNoise(fieldU * 21, fieldV * 21, seed + 211, 3);
  const mottling: V3 = [0.78 + metalCloud * 0.2, 0.8 + metalCloud * 0.18, 0.82 + metalCloud * 0.16];
  const rustExposure = Math.min(1, edge * 0.6 + joint * 0.55 + crease * 0.65 + ridge * 0.45 + bleed * 0.8);
  // Sparse centimeter-scale pits remain visible without broad orange staining.
  const fleckThreshold = 0.76 - rustExposure * 0.16;
  const flecks = smoothStep(fleckThreshold, fleckThreshold + 0.12, valueNoise(x * 83, y * 83, seed + 307))
    * smoothStep(0.38, 0.62, islands);
  const oxideCoverage = kind === "timber" ? loss : Math.min(0.8, finish.rust * (exposed * rustExposure * 0.9
    + bleed * 0.4 + crease * smoothStep(0.53, 0.72, islands) * 0.25
    + flecks * (0.7 + rustExposure * 0.65)));
  const oxide: V3 = kind === "timber" ? [0.27, 0.18, 0.09]
    : [0.095 + fine * 0.035, 0.054 + fine * 0.022, 0.028 + fine * 0.015];
  // Oxide grows a thin rough crust; low spots pit it without roughening intact paint.
  const corrosionRelief = oxideCoverage * (timber ? (fine - 0.5) * 0.00012
    : 0.00045 + (fine - 0.5) * 0.0009 + (metalCloud - 0.5) * 0.0003);
  return { paint, runoff: bleed, paintCoverage: coverage * (1 - loss), mottling, substrateRoughness: 0.64 + metalCloud * 0.22, oxide, oxideCoverage,
    roughness: Math.min(0.95, 0.42 + chalk * 0.32 + dirt * 0.4 + loss * 0.2),
    bump: (brush - 0.5) * 0.000045 - coverage * loss * 0.00022 + corrosionRelief };
}
