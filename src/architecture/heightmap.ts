import { Unzlib } from "fflate";
import { aborted } from "../vector/types.ts";

export interface HeightmapRaster {
  width: number;
  height: number;
  bitDepth: 8 | 16;
  samples: Uint16Array;
}
export interface HeightmapDecodeOptions {
  maxSamples?: number;
  maxBytes?: number;
  signal?: AbortSignal;
}

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let i = 0; i < 8; i++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

/** Checks a PNG chunk's type and payload before interpreting it. */
function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes)
    value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

/** Verifies the zlib checksum after bounded decompression. */
function adler32(bytes: Uint8Array): number {
  let a = 1,
    b = 0;
  for (const value of bytes) {
    a = (a + value) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** Returns PNG's predictor without changing the source or previous row. */
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c,
    da = Math.abs(p - a),
    db = Math.abs(p - b),
    dc = Math.abs(p - c);
  if (da <= db && da <= dc) return a;
  return db <= dc ? b : c;
}

/**
 * Decodes grayscale non-interlaced PNG samples without gamma, color conversion,
 * or loss of 16-bit precision. Pixel row zero remains authored local row zero.
 * Chunk CRCs, decompressed length, and zlib checksum are checked with bounded work.
 */
export function decodeHeightmapPng(
  bytes: Uint8Array,
  options: HeightmapDecodeOptions = {},
): HeightmapRaster {
  aborted(options.signal);
  const maxSamples = options.maxSamples ?? 1_048_576,
    maxBytes = options.maxBytes ?? 16 * 1024 * 1024;
  if (
    ![maxSamples, maxBytes].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    )
  )
    throw new Error("Heightmap limits must be positive safe integers.");
  if (bytes.byteLength > maxBytes)
    throw new Error("Heightmap encoded byte budget exceeded.");
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 33 || signature.some((value, i) => bytes[i] !== value))
    throw new Error("Expected a PNG heightmap.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8,
    width = 0,
    height = 0,
    depth = 0,
    ended = false,
    chunks = 0,
    dataLength = 0,
    dataEnded = false;
  const data: Uint8Array[] = [];
  while (offset < bytes.length) {
    aborted(options.signal);
    if (++chunks > 65_536 || offset + 12 > bytes.length)
      throw new Error("Invalid or excessive PNG chunks.");
    const length = view.getUint32(offset),
      finish = offset + 12 + length;
    if (finish > bytes.length) throw new Error("Truncated PNG chunk.");
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (
      crc32(bytes.subarray(offset + 4, finish - 4)) !==
      view.getUint32(finish - 4)
    )
      throw new Error("PNG chunk CRC mismatch.");
    const payload = bytes.subarray(offset + 8, finish - 4);
    if (chunks === 1 && type !== "IHDR")
      throw new Error("PNG must begin with IHDR.");
    if (type === "IHDR") {
      if (chunks !== 1 || length !== 13) throw new Error("Invalid PNG header.");
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      depth = payload[8];
      if (!width || !height || width * height > maxSamples)
        throw new Error("Heightmap sample budget exceeded.");
      if (
        ![8, 16].includes(depth) ||
        payload[9] !== 0 ||
        payload[10] !== 0 ||
        payload[11] !== 0 ||
        payload[12] !== 0
      )
        throw new Error(
          "Heightmaps require non-interlaced 8/16-bit grayscale PNG.",
        );
    } else if (type === "IDAT") {
      if (dataEnded) throw new Error("PNG IDAT chunks must be consecutive.");
      data.push(payload);
      dataLength += payload.length;
    } else if (type === "IEND") {
      if (length || !data.length || finish !== bytes.length)
        throw new Error("Invalid PNG end.");
      ended = true;
      break;
    } else {
      if (data.length) dataEnded = true;
      if (type[0] === type[0].toUpperCase())
        throw new Error(`Unsupported PNG critical chunk ${type}.`);
    }
    offset = finish;
  }
  if (!ended) throw new Error("PNG is missing IEND.");
  const compressed = new Uint8Array(dataLength);
  offset = 0;
  for (const chunk of data) {
    compressed.set(chunk, offset);
    offset += chunk.length;
  }
  if (compressed.length < 6) throw new Error("Truncated PNG zlib stream.");
  const stride = width * (depth / 8),
    expected = height * (stride + 1),
    raw = new Uint8Array(expected);
  let written = 0;
  const inflater = new Unzlib((chunk) => {
    if (written + chunk.length > expected)
      throw new Error("PNG decompressed length exceeds its header.");
    raw.set(chunk, written);
    written += chunk.length;
  });
  for (let i = 0; i < compressed.length; i += 256) {
    aborted(options.signal);
    inflater.push(
      compressed.subarray(i, i + 256),
      i + 256 >= compressed.length,
    );
  }
  if (written !== expected)
    throw new Error("PNG decompressed length does not match its header.");
  const checksum = new DataView(compressed.buffer).getUint32(
    compressed.length - 4,
  );
  if (adler32(raw) !== checksum) throw new Error("PNG zlib checksum mismatch.");
  const pixels = new Uint8Array(height * stride),
    pixelBytes = depth / 8;
  for (let y = 0; y < height; y++) {
    aborted(options.signal);
    const filter = raw[y * (stride + 1)];
    if (filter > 4) throw new Error("Invalid PNG row filter.");
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x,
        a = x >= pixelBytes ? pixels[index - pixelBytes] : 0,
        b = y ? pixels[index - stride] : 0,
        c = y && x >= pixelBytes ? pixels[index - stride - pixelBytes] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a;
      else if (filter === 2) predictor = b;
      else if (filter === 3) predictor = Math.floor((a + b) / 2);
      else if (filter === 4) predictor = paeth(a, b, c);
      pixels[index] = (raw[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  }
  const samples = new Uint16Array(width * height);
  for (let i = 0; i < samples.length; i++)
    samples[i] =
      depth === 8 ? pixels[i] : pixels[i * 2] * 256 + pixels[i * 2 + 1];
  return { width, height, bitDepth: depth as 8 | 16, samples };
}
