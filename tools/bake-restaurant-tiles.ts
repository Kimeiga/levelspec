/** Bakes the current production tile damage field into shared metric kitchen maps. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { TileField } from "../src/dressing/tile-field.ts";

const width = 1152, height = 576, density = 320;
const wear = .42, grime = .95;
const tileRoughness = .66 + .34 * grime * .45;
const field = new TileField({ seed: 317, share: 1, wear, grime, size: .18, aspect: 1 });
const sourcePath = "src/materials/library/wall-ceramic-weathered.png";
const sourceBytes = await readFile(sourcePath), source = PNG.sync.read(sourceBytes);
const albedo = new PNG({ width, height }), normal = new PNG({ width, height }), properties = new PNG({ width, height });
const heights = new Float64Array(width * height);

/** Converts stored sRGB pigment to linear mixing space. */
function linear(value: number): number { return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }
/** Encodes mixed pigment for the ordinary sRGB color texture. */
function srgb(value: number): number { return value <= .0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - .055; }
/** Converts a six-digit material swatch to linear RGB. */
function color(hex: string): number[] { return [0, 2, 4].map(start => linear(parseInt(hex.slice(start, start + 2), 16) / 255)); }
/** Writes one opaque pixel in a bounded normalized channel space. */
function pixel(image: PNG, index: number, rgb: number[]): void {
  image.data.set([...rgb.map(value => Math.round(Math.max(0, Math.min(1, value)) * 255)), 255], index * 4);
}
const cream = color("dfd0ad"), jade = color("83a99c"), bedColor = color("737373"), dirt = color("725139");
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const u = (x + .5) / density, v = (height - y - .5) / density, index = y * width + x;
  const coverage = field.coverage(u, v, 1 / density), bed = field.bed(u, v, 1 / density);
  const seam = field.seam(u, v, 1 / density), finish = field.appearance(u, v, 1 / density);
  const tone = v < .36 || (v >= 1.08 && v < 1.26) ? jade : cream;
  const sx = Math.floor((u * 2.5 % 1) * source.width), sy = Math.floor((1 - v * 2.5 % 1) * source.height) % source.height;
  const offset = (sy * source.width + sx) * 4;
  const mixed = tone.map((value, channel) => {
    const ceramic = value * (.8 + .2 * linear(source.data[offset + channel] / 255)) * finish.tint[channel];
    const coated = ceramic * (1 - finish.deposit) + dirt[channel] * finish.deposit;
    const plaster = bedColor[channel] * .82 * bed.tone * (1 - seam * .35);
    return srgb(coated * coverage + plaster * (1 - coverage));
  });
  pixel(albedo, index, mixed);
  pixel(properties, index, [1, (tileRoughness + (1 - tileRoughness) * finish.fade * .2) * coverage + .96 * (1 - coverage), 0]);
  heights[index] = bed.bump * (1 - coverage) + field.relief(u, v, 1 / density) * coverage;
}
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const at = (a: number, b: number) => heights[Math.max(0, Math.min(height - 1, b)) * width + Math.max(0, Math.min(width - 1, a))];
  const dx = (at(x + 1, y) - at(x - 1, y)) * density / 2;
  const dy = (at(x, y + 1) - at(x, y - 1)) * density / 2;
  const length = Math.hypot(dx, dy, 1);
  pixel(normal, y * width + x, [.5 - dx / length / 2, .5 + dy / length / 2, .5 + 1 / length / 2]);
}
const outputs: Record<string, { bytes: number; sha256: string }> = {};
for (const [suffix, image] of [["", albedo], ["-normal", normal], ["-properties", properties]] as const) {
  const path = `src/materials/library/restaurant-tiles${suffix}.png`;
  const bytes = PNG.sync.write(image); await writeFile(path, bytes);
  outputs[path] = { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}
const recipes = ["tools/bake-restaurant-tiles.ts", "src/dressing/tile-field.ts", "src/dressing/finish/tile-damage.ts",
  "src/dressing/finish/noise.ts", "src/dressing/finish/tile-grid.ts"];
await writeFile("projects/kowloon-restaurant-props/tiles-bake.json", JSON.stringify({ width, height, density,
  meters: [width / density, height / density], tileSize: .18, wear, grime,
  sourcePath, sourceSha256: createHash("sha256").update(sourceBytes).digest("hex"),
  recipes: Object.fromEntries(await Promise.all(recipes.map(async path => [path, createHash("sha256").update(await readFile(path)).digest("hex")]))),
  outputs, channels: "sRGB albedo; OpenGL tangent normal; linear R unused G roughness B metalness",
}, null, 2) + "\n");
console.log(JSON.stringify(outputs));
