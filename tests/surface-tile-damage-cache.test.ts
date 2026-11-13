import { test } from "node:test";
import assert from "node:assert/strict";
import { TileDamageBlobs } from "../src/dressing/finish/tile-damage.ts";

type Query = [u: number, v: number, tileColumn: number, tileRow: number, footprint: number];

test("tile damage is independent of traversal, nearby sampling, candidate eviction and other instances", () => {
  const local: Query[] = [];
  for (let i = 0; i < 64; i++) {
    local.push([.02 + i * .02, .21 + i % 5 * .01, Math.floor(i / 8), 1, [0, .002, .03, .1][i % 4]]);
    local.push([.37, .61, i % 7 - 3, i % 5 - 2, [0, .01, .05][i % 3]]);
  }
  const boundaries: Query[] = [];
  for (const boundary of [-3.2, -1.6, 0, 1.6, 3.2]) for (const delta of [-1e-8, 0, 1e-8]) {
    const coordinate = boundary + delta;
    boundaries.push([coordinate, .41, Math.floor(coordinate / .16), 2, .025]);
    boundaries.push([.41, coordinate, 2, Math.floor(coordinate / .24), .025]);
  }
  const distant: Query[] = Array.from({ length: 80 }, (_, i) =>
    [(i + 1) * 8.1, -(i + 1) * 4.9, i * 37, -i * 19, .015]);
  const queries = [...local, ...boundaries, ...distant, ...local, ...boundaries.toReversed()];
  const variants = [{ seed: 17, wear: .8 }, { seed: 103, wear: 1 }, { seed: 17, wear: 0 }];
  const samplers = variants.map(({ seed, wear }) => new TileDamageBlobs(seed, wear));
  const expected = variants.map(({ seed, wear }) => queries.map(query => new TileDamageBlobs(seed, wear).retention(...query)));
  for (const order of [queries.map((_, i) => i), queries.map((_, i) => i).toReversed()]) {
    for (const index of order) for (const [variant, sampler] of samplers.entries()) {
      const result = sampler.retention(...queries[index]);
      assert.ok(Number.isFinite(result) && result >= 0 && result <= 1);
      assert.equal(result, expected[variant][index],
        `Traversal changed coverage for ${JSON.stringify(variants[variant])} at ${JSON.stringify(queries[index])}`);
      if (variants[variant].wear === 0) assert.equal(result, 1);
    }
  }
});
