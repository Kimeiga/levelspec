import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { decodeSurfaceImage, encodeSurfaceImage, imageSample } from "../src/dressing/surface/images.ts";

test("surface PNG encoding preserves RGBA bytes, dimensions and caller ownership", () => {
  for (const [width, height] of [[1, 1], [1, 7], [7, 1], [7, 11]]) {
    const backing = new Uint8Array(width * height * 4 + 13).fill(173);
    const data = backing.subarray(5, 5 + width * height * 4);
    for (let i = 0; i < data.length; i++) data[i] = (i * 37 + 17) % 256;
    for (let i = 0; i < width * height; i++) data[i * 4 + 3] = [0, 1, 127, 255][i % 4];
    const original = backing.slice(), image = { width, height, data };
    const encoded = encodeSurfaceImage(image), repeated = encodeSurfaceImage(image);
    assert.deepEqual(encoded, repeated, "Identical pixels retain deterministic content-addressed output");
    const independent = PNG.sync.read(Buffer.from(encoded));
    assert.deepEqual([independent.width, independent.height], [width, height]);
    assert.deepEqual(Uint8Array.from(independent.data), data,
      "An independent decoder preserves all channels, including RGB beneath zero alpha");
    const decoded = decodeSurfaceImage(encoded);
    assert.deepEqual([decoded.width, decoded.height], [width, height]);
    assert.deepEqual(decoded.data, data);
    assert.deepEqual(backing, original, "Encoding a subarray does not mutate pixels or neighboring storage");
    const stable = repeated.slice();
    encoded[0] ^= 255;
    assert.deepEqual(repeated, stable, "Separate encodes do not share mutable output storage");
    assert.deepEqual(encodeSurfaceImage(image), stable);
    assert.deepEqual(backing, original);
  }
});

test("linear image sampling overwrites caller scratch without changing sources or independent results", () => {
  const image = { width: 2, height: 2, data: new Uint8Array([
    255, 0, 0, 0, 0, 255, 0, 64,
    0, 0, 255, 128, 255, 255, 255, 255,
  ]) };
  const before = image.data.slice(), scratch = [NaN, NaN, NaN, NaN];
  assert.equal(imageSample(image, .5, .5, scratch), scratch);
  assert.deepEqual(scratch, [.5, .5, .5, 447 / 1020]);
  scratch.fill(100);
  assert.equal(imageSample(image, -.25, .75, scratch), scratch);
  assert.deepEqual(scratch, [0, 1, 0, 64 / 255], "Negative U repeats to the top-right source texel");
  const independent = imageSample(image, .25, .75);
  imageSample(image, .75, .25, scratch);
  assert.deepEqual(independent, [1, 0, 0, 0]);
  assert.deepEqual(scratch, [1, 1, 1, 1]);
  assert.deepEqual(image.data, before);
});

test("PNG encoding rejects invalid dimensions and incomplete RGBA input", () => {
  for (const [width, height, bytes] of [[0, 1, 0], [-1, 1, 0], [1.5, 1, 6], [NaN, 1, 4],
    [1, Infinity, 4], [2, 2, 15], [2, 2, 17]]) {
    assert.throws(() => encodeSurfaceImage({ width, height, data: new Uint8Array(bytes) }),
      /positive PNG dimensions and complete RGBA8 data/);
  }
});
