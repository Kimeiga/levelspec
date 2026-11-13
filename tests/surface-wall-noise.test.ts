import { test } from "node:test";
import assert from "node:assert/strict";
import { createWallNoise, wallNoise } from "../src/dressing/finish/wall-noise.ts";

test("cached noise is exact across cell transitions, revisits, and interleaved seeds", () => {
  const seeds = [0, 7, 31.625, -3.5, 2147483647];
  const samplers = seeds.map(createWallNoise);
  const points = [[0, 0], [.125, .875], [.875, .125], [.99, .25], [1.01, .25],
    [1.01, .99], [1.01, 1.01], [-.01, -.01], [-1, -2], [-1.01, -1.99],
    [8.1, -9.2], [.125, .875], [0, 0]];
  for (let i = 0; i < 1000; i++) points.push([Math.sin(i * 1.37) * 20, Math.cos(i * .73) * 20]);
  for (const [x, y] of points) for (const [index, seed] of seeds.entries())
    assert.equal(samplers[index](x, y), wallNoise(x, y, seed), `Exact interpolation at ${x},${y}, seed ${seed}`);
});
