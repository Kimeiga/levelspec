import png from "pngjs/browser.js";
import jpeg from "jpeg-js";
import { zlibSync } from "fflate";
import { aborted } from "../../vector/types.ts";

export interface SurfaceImage { width: number; height: number; data: Uint8Array }
/**
 * Synchronous host PNG decoder returning top-to-bottom, unpremultiplied RGBA8.
 * Must validate the PNG and match pngjs normalization: explicit RGBA and palette
 * alpha retain RGB; keyed grayscale/RGB transparency clears the matching color.
 * Borrowed bytes remain unchanged; the compiler checks dimensions and copies pixels.
 */
export type SurfacePngDecoder = (bytes: Uint8Array) => SurfaceImage;
// Obtain the codec's browser-safe buffer class from its public raster allocation.
const RasterBuffer = new png.PNG({ width: 1, height: 1 }).data.constructor as unknown as { from(bytes: Uint8Array): Uint8Array };

/** Decodes PNG without Node dependencies; the browser codec requires its own buffer type. */
function decodeBrowserPng(bytes: Uint8Array): SurfaceImage {
  return png.PNG.sync.read(RasterBuffer.from(bytes));
}

/** Enforces image admission limits and returns independently owned RGBA8 pixels on either host. */
export function decodeSurfaceImage(bytes: Uint8Array, decodePng: SurfacePngDecoder = decodeBrowserPng): SurfaceImage {
  if (bytes.byteLength > 32 * 1024 * 1024) throw new Error("Material image exceeds 32 MiB.");
  if (bytes[0] === 137 && bytes[1] === 80) {
    if (bytes.length < 24) throw new Error("Truncated material PNG.");
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = header.getUint32(16), height = header.getUint32(20);
    if (!width || !height || width * height > 16 * 1024 * 1024)
      throw new Error("Material PNG exceeds 16 Mi pixels.");
    const decoded = decodePng(bytes);
    if (decoded.width !== width || decoded.height !== height || !(decoded.data instanceof Uint8Array)
      || decoded.data.length !== width * height * 4)
      throw new Error("Material PNG decoder must return matching dimensions and complete RGBA8 data.");
    return { width: decoded.width, height: decoded.height, data: new Uint8Array(decoded.data) };
  }
  if (bytes[0] === 255 && bytes[1] === 216) {
    const decoded = jpeg.decode(bytes, { useTArray: true, maxResolutionInMP: 16, maxMemoryUsageInMB: 128 });
    return { width: decoded.width, height: decoded.height, data: new Uint8Array(decoded.data) };
  }
  throw new Error("Material companions must be PNG or JPEG images.");
}

const PNG_CRC = Uint32Array.from({ length: 256 }, (_, byte) => {
  let value = byte;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});

/** Writes one PNG chunk, including its type/data checksum, into caller-owned output. */
function pngChunk(output: Uint8Array, offset: number, type: string, data: Uint8Array): number {
  const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
  view.setUint32(offset, data.length);
  for (let i = 0; i < 4; i++) output[offset + 4 + i] = type.charCodeAt(i);
  output.set(data, offset + 8);
  let crc = 0xffffffff;
  for (let i = offset + 4; i < offset + 8 + data.length; i++) crc = PNG_CRC[(crc ^ output[i]) & 255] ^ (crc >>> 8);
  view.setUint32(offset + 8 + data.length, (crc ^ 0xffffffff) >>> 0);
  return offset + 12 + data.length;
}

/** Encodes lossless RGBA8 with a fixed horizontal predictor and fast browser-safe compression. */
export function encodeSurfaceImage(image: SurfaceImage): Uint8Array {
  const { width, height, data } = image;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || width > 0x7fffffff || height > 0x7fffffff || data.length !== width * height * 4)
    throw new Error("Surface images require positive PNG dimensions and complete RGBA8 data.");
  const stride = width * 4, filtered = new Uint8Array((stride + 1) * height);
  for (let row = 0; row < height; row++) {
    const source = row * stride, target = row * (stride + 1);
    filtered[target] = 1;
    for (let byte = 0; byte < stride; byte++)
      filtered[target + byte + 1] = data[source + byte] - (byte < 4 ? 0 : data[source + byte - 4]);
  }
  const compressed = zlibSync(filtered, { level: 1 });
  const header = new Uint8Array(13), dimensions = new DataView(header.buffer);
  dimensions.setUint32(0, width); dimensions.setUint32(4, height);
  header[8] = 8; header[9] = 6;
  const output = new Uint8Array(57 + compressed.length);
  output.set([137, 80, 78, 71, 13, 10, 26, 10]);
  let offset = pngChunk(output, 8, "IHDR", header);
  offset = pngChunk(output, offset, "IDAT", compressed);
  pngChunk(output, offset, "IEND", new Uint8Array());
  return output;
}

export async function imageHash(bytes: Uint8Array, signal?: AbortSignal): Promise<string> {
  aborted(signal);
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
  aborted(signal);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

const wrap = (value: number, length: number) => ((value % length) + length) % length;

/** Bilinear linear-data sampling in lower-left repeat UVs; an optional caller-owned RGBA buffer is overwritten. */
export function imageSample(image: SurfaceImage, u: number, v: number, result: number[] = [0, 0, 0, 0]): number[] {
  const x = u * image.width - 0.5, y = (1 - v) * image.height - 0.5;
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const left = wrap(ix, image.width) * 4, right = wrap(ix + 1, image.width) * 4;
  const top = wrap(iy, image.height) * image.width * 4, bottom = wrap(iy + 1, image.height) * image.width * 4;
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
  for (let channel = 0; channel < 4; channel++) {
    result[channel] = w00 * (image.data[top + left + channel] / 255)
      + w10 * (image.data[top + right + channel] / 255)
      + w01 * (image.data[bottom + left + channel] / 255)
      + w11 * (image.data[bottom + right + channel] / 255);
  }
  return result;
}
