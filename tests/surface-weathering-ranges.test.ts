import { test } from "node:test";
import assert from "node:assert/strict";
import { valueNoise, valueNoiseRange, fractalNoise, fractalNoiseRange } from "../src/dressing/finish/noise.ts";
import { WallCondition, type WallExposure } from "../src/dressing/finish/wall-condition.ts";
import { plasterLoss, plasterLossRange, wallChartNeeds } from "../src/dressing/wall-surface.ts";

type Bounds = [number, number, number, number];

/** Exercises interior phases and exact endpoints independently of the proof's lattice partitioning. */
function samples(bounds: Bounds): [number, number][] {
  const phases = [0, 0.017, 0.113, 0.271, 0.413, 0.587, 0.739, 0.893, 0.983, 1];
  return phases.flatMap(x => phases.map(y => [bounds[0] + x * (bounds[2] - bounds[0]),
    bounds[1] + y * (bounds[3] - bounds[1])] as [number, number]));
}

/** A conservative interval may be wider than sampled extrema, but must be finite, ordered and enclosing. */
function contains(range: [number, number], actual: number, context: string): void {
  assert.ok(range.every(Number.isFinite) && range[0] <= range[1], `Valid ordered interval: ${context}`);
  assert.ok(actual >= range[0] - 1e-12 && actual <= range[1] + 1e-12,
    `${context}: ${actual} must belong to [${range}]`);
}

test("noise bounds retain off-lattice extrema across negative cells, narrow strips and octave scales", () => {
  const rectangles: Bounds[] = [[-2.17, -1.03, 1.21, 2.19], [-0.001, 0.999, 0.003, 1.004],
    [3.127, -4.353, 3.129, -4.351], [0, -2.5, 0, 1.1], [7.137, -3.273, 7.137, -3.273]];
  for (const seed of [0, 7, 113, 0xffffffff]) for (const bounds of rectangles) {
    const valueRange = valueNoiseRange(bounds, seed);
    assert.ok(valueRange[0] >= 0 && valueRange[1] <= 1);
    for (const [u, v] of samples(bounds)) contains(valueRange, valueNoise(u, v, seed), `value noise seed=${seed}, point=${u},${v}`);
    for (const octaves of [1, 3, 5]) {
      const range = fractalNoiseRange(bounds, seed, octaves);
      assert.ok(range[0] >= 0 && range[1] <= 1);
      for (const [u, v] of samples(bounds)) contains(range, fractalNoise(u, v, seed, octaves), `fractal seed=${seed}, octaves=${octaves}, point=${u},${v}`);
    }
  }
  const point: Bounds = [0.173, -0.391, 0.173, -0.391];
  for (const range of [valueNoiseRange(point, 17), fractalNoiseRange(point, 17, 4)])
    assert.ok(range[1] - range[0] < 1e-12, "A single-point receiver retains useful exact bounds, rather than a vacuous full-noise interval");
  const narrow = valueNoiseRange([0.173, -0.391, 0.17301, -0.39099], 17);
  assert.ok(narrow[1] - narrow[0] < 0.001, "Small smooth regions can be proven uniform without discarding fine boundaries elsewhere");
});

test("wall loss proofs contain real fields through ledge, damp and fine-fracture transitions", () => {
  const exposures: WallExposure[] = [
    { ledges: [] },
    { base: 2, ledges: [] },
    { base: 2, ledges: [{ u0: -0.3, u1: 0.7, z: 3, flow: 1 }, { u0: 0.4, u1: 1.1, z: 4.2, flow: 0.4 }] },
  ];
  const rectangles: Bounds[] = [[-1.21, 1.7, 1.43, 4.31], [-0.451, 2.98, -0.299, 3.002],
    [0.69, 2.989, 0.851, 3.001], [-0.2, 2.991, 0.2, 2.999], [0.1, 1.999, 0.3, 2.001],
    [-2.713, 5.127, -2.701, 5.139], [0.317, 2.673, 0.317, 2.673]];
  let uniform = 0, fractured = 0, agedUniform = 0, bareUniform = 0;
  for (const exposure of exposures) for (const seed of [7, 23, 113]) for (const wear of [0, 0.2, 0.8, 1]) {
    const condition = new WallCondition(exposure, { grime: 0.7, wear, seed });
    for (const bounds of rectangles) {
      const coarse = condition.lossRange(bounds), fine = plasterLossRange(condition, bounds);
      const needs = wallChartNeeds(condition, bounds);
      if (needs.fracture) fractured++; else uniform++;
      if (wear > 0 && !needs.fracture) agedUniform++;
      if (fine[0] > 0) bareUniform++;
      let positive = false, negative = false;
      for (const [u, v] of samples(bounds)) {
        contains(coarse, condition.sample(u, v).loss, `coarse wear=${wear},seed=${seed}, point=${u},${v}`);
        const actual = plasterLoss(condition, u, v, seed + 73);
        contains(fine, actual, `fine wear=${wear},seed=${seed}, point=${u},${v}`);
        positive ||= actual > 0; negative ||= actual < 0;
      }
      if (positive && negative) assert.ok(needs.fracture, "A proven-uniform receiver cannot contain both actual material owners");
      if (!needs.fracture) assert.ok(fine[0] > 0 || fine[1] < 0, "Skipping contour discovery requires the complete loss interval to exclude the boundary");
      if (wear === 0) assert.equal(needs.fracture, false, "An authored intact coat remains a useful cheap uniform case");
    }
  }
  assert.ok(uniform > 0 && fractured > 0, "The fixture exercises both provable uniformity and receivers requiring actual fracture discovery");
  assert.ok(agedUniform > 0 && bareUniform > 0,
    `Useful bounds also prove aged single-owner patches and completely exposed backing: ${agedUniform} aged, ${bareUniform} bare`);
});

