/** Bakes long, nonrepeating timber scans and cut-end fields into one portable PBR atlas. */
import { readFile, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { valueNoise, smoothStep } from "../src/dressing/finish/noise.ts";

const folder = "projects/kowloon-liquor-props/materials/shelf-weathering";
const sourceBytes = await readFile(`${folder}/wood-long-source.png`);
const source = PNG.sync.read(sourceBytes);
if (source.width !== 1024 || source.height !== 1536) throw new Error("Long timber source must contain four 256 × 1536 scans");
const recipeHashes = Object.fromEntries(await Promise.all(["tools/bake-shop-timber.ts", "src/dressing/finish/noise.ts"].map(async file =>
  [file, createHash("sha256").update(await readFile(file)).digest("hex")])));
const metadata = { version: 2, width: 1024, height: 1792, padding: 4, texelsPerMeter: 494, endGrainStart: 4, albedoGain: 2,
  regions: Array.from({ length: 8 }, (_, index) => ({ x: index % 4 * 256, y: index < 4 ? 0 : 1536,
    width: 256, height: index < 4 ? 1536 : 256 })) };
const color = new PNG({ width: metadata.width, height: metadata.height });
const normal = new PNG({ width: metadata.width, height: metadata.height });
const properties = new PNG({ width: metadata.width, height: metadata.height });

/** Writes aligned, opaque channels; padding is supplied by the caller's clamped source coordinates. */
function pixel(image: PNG, x: number, y: number, channels: number[]): void {
  const offset = (y * image.width + x) * 4;
  for (let channel = 0; channel < 3; channel++) image.data[offset + channel] = Math.max(0, Math.min(255, Math.round(channels[channel] * 255)));
  image.data[offset + 3] = 255;
}

/** Reserves linear albedo headroom for normalized vertex colors to reveal lighter worn edges. */
function boostedAlbedo(channels: number[]): number[] {
  return channels.map(value => {
    const linear = value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    const boosted = linear * metadata.albedoGain;
    if (boosted > 1) throw new Error("Timber albedo gain clips source detail");
    return boosted <= .0031308 ? boosted * 12.92 : 1.055 * boosted ** (1 / 2.4) - .055;
  });
}

/** Matches opposite field edges without changing the quiet, unique interior of a long scan. */
function makePeriodic(field: Float64Array, channels: number, width: number, height: number): void {
  const band = 24;
  for (const vertical of [false, true]) {
    const length = vertical ? height : width, lines = vertical ? width : height;
    for (let along = 0; along < lines; along++) for (let channel = 0; channel < channels; channel++) {
      const index = (across: number) => ((vertical ? across * width + along : along * width + across) * channels + channel);
      const first = field[index(0)], last = field[index(length - 1)], middle = (first + last) / 2;
      for (let offset = 0; offset < band; offset++) {
        const weight = 1 - smoothStep(0, band - 1, offset);
        field[index(offset)] += (middle - first) * weight;
        field[index(length - 1 - offset)] += (middle - last) * weight;
      }
    }
  }
}

for (const [variant, region] of metadata.regions.entries()) {
  const width = region.width - metadata.padding * 2, height = region.height - metadata.padding * 2;
  const seed = 731 + variant * 193;
  const heights = new Float64Array(width * height), rgb = new Float64Array(width * height * 3);
  const roughness = new Float64Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x, u = x / metadata.texelsPerMeter, v = y / metadata.texelsPerMeter;
    const pores = valueNoise(u * 210, v * 210, seed + 32);
    if (variant < metadata.endGrainStart) {
      const sourceIndex = ((y + metadata.padding) * source.width + region.x + x + metadata.padding) * 4;
      for (let channel = 0; channel < 3; channel++) rgb[index * 3 + channel] = source.data[sourceIndex + channel] / 255;
      const worn = valueNoise(u * 5, v * 4, seed + 71);
      roughness[index] = .77 + worn * .13;
      heights[index] = (pores - .5) * .000025 + (valueNoise(u * 170, v * 11, seed + 119) - .5) * .00004;
    } else {
      const warp = valueNoise(u * 10, v * 10, seed) * .03;
      const radius = Math.hypot(u + .2 + variant % 2 * .35, (v - .25) * .8) + warp;
      const ring = Math.pow(.5 + .5 * Math.sin(radius * 240), 9);
      for (let channel = 0; channel < 3; channel++)
        rgb[index * 3 + channel] = [.37, .25, .14][channel] * (1 - ring * .18 + (pores - .5) * .15);
      heights[index] = ring * -.00015 + pores * .00004;
      roughness[index] = .87 + ring * .05;
    }
  }
  makePeriodic(rgb, 3, width, height);
  makePeriodic(heights, 1, width, height);
  makePeriodic(roughness, 1, width, height);
  for (let y = 0; y < region.height; y++) for (let x = 0; x < region.width; x++) {
    const sx = Math.max(0, Math.min(width - 1, x - metadata.padding));
    const sy = Math.max(0, Math.min(height - 1, y - metadata.padding));
    const index = sy * width + sx;
    const beforeX = sx === 0 || sx === width - 1 ? width - 2 : sx - 1;
    const afterX = sx === 0 || sx === width - 1 ? 1 : sx + 1;
    const beforeY = sy === 0 || sy === height - 1 ? height - 2 : sy - 1;
    const afterY = sy === 0 || sy === height - 1 ? 1 : sy + 1;
    const dx = (heights[sy * width + afterX] - heights[sy * width + beforeX]) * metadata.texelsPerMeter / 2;
    const dy = (heights[beforeY * width + sx] - heights[afterY * width + sx]) * metadata.texelsPerMeter / 2;
    const length = Math.hypot(dx, dy, 1);
    pixel(color, region.x + x, region.y + y, boostedAlbedo(Array.from(rgb.subarray(index * 3, index * 3 + 3))));
    pixel(normal, region.x + x, region.y + y, [-dx / length * .5 + .5, -dy / length * .5 + .5, 1 / length * .5 + .5]);
    pixel(properties, region.x + x, region.y + y, [1, roughness[index], 0]);
  }
}
const outputs: Record<string, string> = {};
for (const [suffix, image] of [["", color], ["-normal", normal], ["-properties", properties]] as const) {
  const file = `src/materials/library/shop-timber${suffix}.png`, bytes = PNG.sync.write(image);
  await writeFile(file + ".tmp", bytes); await rename(file + ".tmp", file);
  outputs[file] = createHash("sha256").update(bytes).digest("hex");
}
await writeFile("src/dressing/kowloon/shop/assets/shop-timber.json", JSON.stringify(metadata) + "\n");
await writeFile(`${folder}/bake.json`, JSON.stringify({ source: `${folder}/wood-long-source.png`,
  sourceSha256: createHash("sha256").update(sourceBytes).digest("hex"), recipeHashes, metadata, outputs,
  technique: "Four long unique scans preserve source aspect at 494 texels/m; four end-grain fields, periodic borders and aligned normal/ORM maps. Albedo has unclipped linear gain 2, balanced by normalized vertex colors so physical edge wear can brighten within GLB color limits." }, null, 2));
console.log(JSON.stringify({ metadata, outputs }));
