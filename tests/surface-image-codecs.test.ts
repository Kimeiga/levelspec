import { test } from "node:test";
import assert from "node:assert/strict";
import { crc32, deflateSync } from "node:zlib";
import jpeg from "jpeg-js";
import { decodeMaterialPng } from "../src/materials/node-images.ts";
import { decodeSurfaceImage, type SurfacePngDecoder } from "../src/dressing/surface/images.ts";

/** Frames independently specified PNG data with the format's checksum. */
function chunk(type: string, data: Uint8Array): Buffer {
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length); result.write(type, 4); result.set(data, 8);
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
  return result;
}

/** Encodes explicit scanline bytes, allowing format cases unsupported by the production writer. */
function fixture(width: number, height: number, depth: number, color: number, rows: number[],
  options: { interlace?: boolean; palette?: number[]; transparency?: number[] } = {}): Uint8Array {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = depth; header[9] = color; header[12] = options.interlace ? 1 : 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
    ...(options.palette ? [chunk("PLTE", Uint8Array.from(options.palette))] : []),
    ...(options.transparency ? [chunk("tRNS", Uint8Array.from(options.transparency))] : []),
    chunk("IDAT", deflateSync(Uint8Array.from(rows))), chunk("IEND", new Uint8Array())]);
}

const transparent = fixture(2, 1, 8, 6, [0, 12, 34, 56, 0, 78, 90, 123, 128]);
const cases = [
  { name: "RGBA with hidden color", bytes: transparent, size: [2, 1], rgba: [12, 34, 56, 0, 78, 90, 123, 128] },
  { name: "one-bit palette with transparency", bytes: fixture(2, 1, 1, 3, [0, 0x40],
    { palette: [20, 40, 60, 200, 100, 80], transparency: [0, 128] }), size: [2, 1], rgba: [20, 40, 60, 0, 200, 100, 80, 128] },
  { name: "keyed RGB transparency", bytes: fixture(2, 1, 8, 2, [0, 12, 34, 56, 78, 90, 123],
    { transparency: [0, 12, 0, 34, 0, 56] }), size: [2, 1], rgba: [0, 0, 0, 0, 78, 90, 123, 255] },
  { name: "keyed grayscale transparency", bytes: fixture(2, 1, 8, 0, [0, 85, 170],
    { transparency: [0, 85] }), size: [2, 1], rgba: [0, 0, 0, 0, 170, 170, 170, 255] },
  { name: "two-bit grayscale", bytes: fixture(4, 1, 2, 0, [0, 0x1b]), size: [4, 1],
    rgba: [0, 0, 0, 255, 85, 85, 85, 255, 170, 170, 170, 255, 255, 255, 255, 255] },
  { name: "sixteen-bit gray with alpha", bytes: fixture(2, 1, 16, 4, [0, 0x00, 0xff, 0xff, 0x00, 0x80, 0x80, 0x00, 0xff]),
    size: [2, 1], rgba: [1, 1, 1, 254, 128, 128, 128, 1] },
  { name: "Adam7 interlace", bytes: fixture(2, 2, 8, 6, [
    0, 255, 0, 0, 255, 0, 0, 255, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255, 128,
  ], { interlace: true }), size: [2, 2], rgba: [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 128] },
];

for (const [host, codec] of [["browser", undefined], ["Node", decodeMaterialPng]] as const) {
  test(`${host} PNG decoding preserves format semantics, offset input and independent RGBA storage`, () => {
    for (const entry of cases) {
      const backing = new Uint8Array(entry.bytes.length + 13).fill(207);
      backing.set(entry.bytes, 5);
      const bytes = backing.subarray(5, 5 + entry.bytes.length), before = backing.slice();
      const decoded = decodeSurfaceImage(bytes, codec);
      assert.deepEqual([decoded.width, decoded.height], entry.size, entry.name);
      assert.deepEqual([...decoded.data], entry.rgba, entry.name);
      assert.deepEqual(backing, before, "Decoding must not change borrowed bytes or their neighbors");
      decoded.data.fill(0);
      const independent = decodeSurfaceImage(bytes, codec);
      assert.deepEqual([...independent.data], entry.rgba);
      backing.fill(0);
      assert.deepEqual([...independent.data], entry.rgba, "Decoded pixels survive changes to encoded backing storage");
    }
  });

  test(`${host} PNG decoding rejects corrupt and truncated data despite plausible dimensions`, () => {
    const corrupt = Uint8Array.from(transparent); corrupt[45] ^= 255;
    const invalidFilter = fixture(1, 1, 8, 6, [5, 12, 34, 56, 255]);
    for (const bytes of [corrupt, transparent.subarray(0, -13), transparent.subarray(0, 45), invalidFilter])
      assert.throws(() => decodeSurfaceImage(bytes, codec));
    assert.deepEqual([...decodeSurfaceImage(transparent, codec).data], cases[0].rgba);
  });
}

test("image admission rejects oversized PNGs before invoking the host codec", () => {
  const codec: SurfacePngDecoder = () => { assert.fail("Over-budget images must never reach a decoder"); };
  const bytes = Uint8Array.from(transparent);
  new DataView(bytes.buffer).setUint32(16, 16 * 1024 * 1024 + 1);
  assert.throws(() => decodeSurfaceImage(bytes, codec), /16 Mi pixels/);
  assert.throws(() => decodeSurfaceImage(new Uint8Array(32 * 1024 * 1024 + 1), codec), /32 MiB/);
  new DataView(bytes.buffer).setUint32(16, 0);
  assert.throws(() => decodeSurfaceImage(bytes, codec), /16 Mi pixels/);
});

test("host decoding must return complete matching RGBA pixels and cannot retain compiler-owned output", () => {
  for (const image of [{ width: 1, height: 2, data: new Uint8Array(8) },
    { width: 2, height: 1, data: new Uint8Array(7) }, { width: 2, height: 1, data: new Uint8Array(9) }])
    assert.throws(() => decodeSurfaceImage(transparent, () => image), /matching dimensions and complete RGBA8/);
  const scratch = Uint8Array.from(cases[0].rgba);
  const decoded = decodeSurfaceImage(transparent, () => ({ width: 2, height: 1, data: scratch }));
  scratch.fill(0);
  assert.deepEqual([...decoded.data], cases[0].rgba);
});

test("JPEG decoding bypasses the PNG host codec", () => {
  const bytes = jpeg.encode({ width: 2, height: 1, data: Uint8Array.from(cases[0].rgba) }, 90).data;
  const expected = decodeSurfaceImage(bytes);
  assert.deepEqual(decodeSurfaceImage(bytes, () => assert.fail("JPEG must keep its separate decoder")), expected);
});
