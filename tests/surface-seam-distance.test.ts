import { test } from "node:test";
import assert from "node:assert/strict";
import { seamDistance, type Seam } from "../src/dressing/seams.ts";
import type { V3 } from "../src/architecture/types.ts";

test("contact distance follows finite segments in three dimensions without mutating inputs", () => {
  const seam: Seam = [[1, 2, 3], [3, 4, 5]];
  const original = structuredClone(seam);
  const cases: { point: V3; expected: number }[] = [
    { point: [2, 3, 4], expected: 0 },
    { point: [3, 2, 4], expected: Math.sqrt(2) },
    { point: [-1, 0, 1], expected: Math.sqrt(12) },
    { point: [5, 6, 7], expected: Math.sqrt(12) },
    { point: [1, 2, 3], expected: 0 },
    { point: [3, 4, 5], expected: 0 },
  ];
  for (const { point, expected } of cases) {
    const before = [...point];
    assert.ok(Math.abs(seamDistance(point, seam) - expected) < 1e-14);
    assert.ok(Math.abs(seamDistance(point, [seam[1], seam[0]]) - expected) < 1e-14);
    assert.deepEqual(point, before);
  }
  assert.equal(seamDistance([1, 3, 4], [[0, 0, 0], [2, 0, 0]]), 5);
  assert.deepEqual(seam, original);
});
