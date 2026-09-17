import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import type { CompiledLevel } from "../../vector/types.ts";
import type { ExportAsset, ExportFiles } from "../../vector/export-assets.ts";
export interface Pixels {
  width: number;
  height: number;
  data: Uint8Array;
}
export function materialPixels(color: string, asset?: ExportAsset): Pixels {
  if (asset?.mimeType === "image/png") {
    const header = Buffer.from(asset.bytes);
    if (
      header.length < 24 ||
      header.readUInt32BE(16) * header.readUInt32BE(20) > 16_777_216
    )
      throw new Error(
        "Export textures must be valid PNGs of at most 16 megapixels.",
      );
  }
  const image = asset
    ? asset.mimeType === "image/png"
      ? PNG.sync.read(Buffer.from(asset.bytes))
      : jpeg.decode(asset.bytes, {
          useTArray: true,
          maxMemoryUsageInMB: 256,
          maxResolutionInMP: 16,
        })
    : { width: 16, height: 16, data: new Uint8Array(16 * 16 * 4).fill(255) };
  if (image.width * image.height > 16_777_216)
    throw new Error("Export textures must be at most 16 megapixels.");
  const tint = [1, 3, 5].map((i) =>
    linear(parseInt(color.slice(i, i + 2), 16) / 255),
  );
  const data = Uint8Array.from(image.data);
  for (let p = 0; p < data.length; p += 4)
    for (let c = 0; c < 3; c++)
      data[p + c] = Math.round(srgb(linear(data[p + c] / 255) * tint[c]) * 255);
  return { width: image.width, height: image.height, data };
}
const linear = (x: number) =>
  x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
const srgb = (x: number) =>
  x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
export function fbxTextures(
  level: CompiledLevel,
  assets: Record<string, ExportAsset>,
) {
  const files: ExportFiles = {},
    textureFiles: Record<string, string> = {};
  for (const m of level.document.materials)
    if (m.texture) {
      const pixels = materialPixels(m.color, assets[m.texture]);
      const bytes = PNG.sync.write({
        ...pixels,
        data: Buffer.from(pixels.data),
      } as PNG);
      const file = `textures/${createHash("sha256").update(bytes).digest("hex")}.png`;
      files[file] = bytes;
      textureFiles[m.id] = file;
    }
  return { files, textureFiles };
}
export interface QuakeTexture {
  name: string;
  width: number;
  height: number;
}
/** WAD2 miptex, quantized to the supplied Quake palette; no game assets bundled. */
export function quakeWad(
  level: CompiledLevel,
  assets: Record<string, ExportAsset>,
  palette: Uint8Array,
) {
  if (palette.length !== 768)
    throw new Error(
      "Quake palette must contain exactly 768 RGB bytes (palette.lmp).",
    );
  const defs = [...level.document.materials];
  if (!defs.some((m) => m.id === "default"))
    defs.unshift({
      id: "default",
      color: "#b9c7d1",
      roughness: 0.8,
      metalness: 0,
      repeat: 1,
    });
  const mappings: Record<string, QuakeTexture> = {},
    chunks: Buffer[] = [],
    names: string[] = [],
    seen = new Map<string, QuakeTexture>();
  const nearest = new Map<number, number>();
  const quantize = (r: number, g: number, b: number) => {
    const key = (r << 16) | (g << 8) | b;
    if (nearest.has(key)) return nearest.get(key)!;
    let best = 0,
      distance = Infinity;
    // Exclude Quake's fullbright range so ordinary images do not glow.
    for (let k = 0; k < 224; k++) {
      const d =
        (r - palette[k * 3]) ** 2 +
        (g - palette[k * 3 + 1]) ** 2 +
        (b - palette[k * 3 + 2]) ** 2;
      if (d < distance) {
        distance = d;
        best = k;
      }
    }
    nearest.set(key, best);
    return best;
  };
  for (const m of [
    ...defs,
    { id: "__enclosure_sky", color: "#829caf", texture: undefined },
  ]) {
    const image = materialPixels(
      m.color,
      m.texture ? assets[m.texture] : undefined,
    );
    const sky = m.id === "__enclosure_sky";
    const width = sky
      ? 256
      : Math.min(512, Math.max(16, Math.ceil(image.width / 16) * 16));
    const height = sky
      ? 128
      : Math.min(512, Math.max(16, Math.ceil(image.height / 16) * 16));
    const levels: Buffer[] = [];
    for (let lod = 0; lod < 4; lod++) {
      const w = width >> lod,
        h = height >> lod,
        bytes = Buffer.alloc(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const sx = Math.min(
            image.width - 1,
            Math.floor(((x + 0.5) * image.width) / w),
          );
          const sy = Math.min(
            image.height - 1,
            Math.floor(((y + 0.5) * image.height) / h),
          );
          const p = (sy * image.width + sx) * 4;
          bytes[y * w + x] = quantize(
            image.data[p],
            image.data[p + 1],
            image.data[p + 2],
          );
        }
      levels.push(bytes);
    }
    const hash = createHash("sha256")
      .update(`${width},${height},${sky}`)
      .update(Buffer.concat(levels))
      .digest("hex");
    if (seen.has(hash)) {
      mappings[m.id] = seen.get(hash)!;
      continue;
    }
    const name = sky ? "sky_ls" : `ls${hash.slice(0, 12)}`;
    const head = Buffer.alloc(40);
    head.write(name, 0, 16, "ascii");
    head.writeUInt32LE(width, 16);
    head.writeUInt32LE(height, 20);
    let offset = 40;
    levels.forEach((bytes, i) => {
      head.writeUInt32LE(offset, 24 + i * 4);
      offset += bytes.length;
    });
    chunks.push(Buffer.concat([head, ...levels]));
    names.push(name);
    const mapping = { name, width, height };
    mappings[m.id] = mapping;
    seen.set(hash, mapping);
  }
  const directory = Buffer.alloc(chunks.length * 32);
  let cursor = 12;
  chunks.forEach((chunk, i) => {
    directory.writeInt32LE(cursor, i * 32);
    directory.writeInt32LE(chunk.length, i * 32 + 4);
    directory.writeInt32LE(chunk.length, i * 32 + 8);
    directory[i * 32 + 12] = 68;
    directory.write(names[i], i * 32 + 16, 16, "ascii");
    cursor += chunk.length;
  });
  const header = Buffer.alloc(12);
  header.write("WAD2");
  header.writeInt32LE(chunks.length, 4);
  header.writeInt32LE(cursor, 8);
  return { bytes: Buffer.concat([header, ...chunks, directory]), mappings };
}
