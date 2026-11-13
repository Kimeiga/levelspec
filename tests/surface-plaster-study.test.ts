import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlasterStudy, createStudyUV } from "../src/dressing/finish/plaster-study.ts";

/** Allows only floating-point roundoff in the affine meter-to-texture transform. */
function close(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)),
    `Expected ${expected}, received ${actual}`);
}

test("prepared study UVs retain affine meter scale, orientation and independent results", () => {
  const origins = [[0, 0], [-3.2, 1.7], [2.4, -5.3]] as const;
  for (const seed of [0, 17, -23.5]) for (const repeat of [.25, 2, 7.5]) {
    const sample = createStudyUV(repeat, seed);
    for (const [u, v] of origins) {
      const origin = sample(u, v), retained = [...origin];
      const east = sample(u + 1, v), north = sample(u, v + 1);
      const x = [east[0] - origin[0], east[1] - origin[1]];
      const y = [north[0] - origin[0], north[1] - origin[1]];
      close(Math.hypot(...x), repeat);
      close(Math.hypot(...y), repeat);
      close(x[0] * y[0] + x[1] * y[1], 0);
      close(x[0] * y[1] - x[1] * y[0], repeat * repeat);
      const offset = sample(u - 2.5, v + .75);
      for (let axis = 0; axis < 2; axis++)
        close(offset[axis], origin[axis] - 2.5 * x[axis] + .75 * y[axis]);
      assert.deepEqual(origin, retained, "Later samples cannot overwrite an earlier UV");
      assert.deepEqual(sample(u, v), createStudyUV(repeat, seed)(u, v));
      origin[0] = NaN;
      assert.deepEqual(sample(u, v), retained, "Caller mutation cannot change prepared transform state");
    }
  }
});

test("prepared plaster fields keep forced exposure, finite channels and sampling-order independence", () => {
  const points = [[0, 0], [-.01, -.02], [.31, 1.27], [-3.2, 1.7], [2.4, -5.3]] as const;
  const settings = [0, 17, -23.5].flatMap(seed => [16, 128, 1024].flatMap(density =>
    [0, .6, 1].flatMap(wear => [false, true].map(coated =>
      ({ seed, density, wear, coated, sample: createPlasterStudy(seed, density, wear, coated) })))));
  for (const [u, v] of [...points, ...points.toReversed()]) for (const setting of settings) {
    const { seed, density, wear, coated, sample } = setting;
    const value = sample(u, v), retained = { ...value };
    assert.ok(Object.values(value).every(Number.isFinite));
    assert.ok(value.exposed >= 0 && value.exposed <= 1);
    if (!coated) assert.equal(value.exposed, 1, "An uncoated surface is exposed even when wear is zero");
    else if (wear === 0) assert.equal(value.exposed, 0, "Zero wear retains the complete authored coat");
    const uncoated = createPlasterStudy(seed, 16, 0, false)(u, v);
    assert.equal(value.tone, uncoated.tone, "Pigment sampling does not depend on coat loss or map resolution");
    if (!coated) assert.equal(value.bump, uncoated.bump,
      "Uncoated relief has no coat-loss or filtered-coat grain contribution");
    sample(v + .37, u - .29);
    assert.deepEqual(value, retained, "Later samples cannot overwrite returned channels");
    assert.deepEqual(sample(u, v), createPlasterStudy(seed, density, wear, coated)(u, v),
      "Interleaved coordinates and prepared settings cannot leak into later samples");
    value.bump = NaN;
    assert.deepEqual(sample(u, v), retained, "Caller mutation cannot change prepared field state");
  }
  assert.deepEqual(createPlasterStudy(17, 128, .6)(.31, 1.27),
    createPlasterStudy(17, 128, .6, true)(.31, 1.27), "The default field retains its coat");
});
