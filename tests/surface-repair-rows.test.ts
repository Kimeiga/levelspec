import { test } from "node:test";
import assert from "node:assert/strict";
import { renderRepairRow, renderRepairSample, type RenderRepair } from "../src/dressing/finish/patina.ts";

test("repair rows preserve rectangle unions, authored overlap order and independent samples", () => {
  const first: RenderRepair = { regions: [[-.4, -.3, .4, .3], [0, -.2, .8, .2]], tint: [.2, .4, .6], age: .25, seed: 17 };
  const last: RenderRepair = { regions: [[-.1, -.1, .3, .1]], tint: [.8, .6, .4], age: .75, seed: 29 };
  const repairs = [first, last], before = structuredClone(repairs);
  const us = Array.from({ length: 17 }, (_, index) => -.6 + index * .1);
  const coordinates = [...us];
  const row = renderRepairRow(repairs, us, 0);
  assert.deepEqual(row[1], { tint: [1, 1, 1], age: 1, height: 0, coverage: 0 });
  assert.deepEqual(row[4].tint, first.tint, "A point inside only the first union takes its authored tint");
  assert.equal(row[4].age, .25);
  assert.deepEqual(row[7].tint, last.tint, "The last fully covering patch owns the overlap");
  assert.equal(row[7].age, .75);
  const reversed = renderRepairRow([last, first], us, 0);
  assert.deepEqual(reversed[7].tint, first.tint);
  assert.equal(reversed[7].age, .25);
  const duplicated = renderRepairRow([{ ...first, regions: [...first.regions, ...first.regions] }, last], us, 0);
  assert.deepEqual(duplicated, row, "Overlapping rectangles describe one patch, not repeated paint operations");
  assert.deepEqual(repairs, before);
  assert.deepEqual(us, coordinates);
  row[0].tint[0] = 7;
  assert.equal(row[1].tint[0], 1, "Returned row samples own their mutable channels");
  assert.deepEqual(repairs, before, "Editing a returned tint cannot mutate authored repairs");
});

test("bounded repair rows agree with scalar sampling across clipped edges and empty footprints", () => {
  const repairs: RenderRepair[] = [
    { regions: [[-.45, -.2, .025, .2], [.02, -.05, .57, .1]], tint: [.3, .8, .5], age: .2, seed: 31 },
    { regions: [[.5, -.3, 2, .3]], tint: [.7, .2, .4], age: .8, seed: 47 },
  ];
  const us = Array.from({ length: 19 }, (_, index) => -.5 + index / 16);
  for (const v of [-.4, -.201, -.05, .099, .201, .4]) {
    assert.deepEqual(renderRepairRow(repairs, us, v), us.map(u => renderRepairSample(repairs, u, v)),
      `Clipped row v=${v} preserves the scalar field, including samples just outside rectangle boundaries`);
  }
  assert.deepEqual(renderRepairRow(repairs, [], 0), []);
  assert.deepEqual(renderRepairRow(repairs, [.024], 0), [renderRepairSample(repairs, .024, 0)]);
  assert.deepEqual(renderRepairRow([], [-1, 0, 1], 0), Array.from({ length: 3 }, () =>
    ({ tint: [1, 1, 1], age: 1, height: 0, coverage: 0 })));
});
