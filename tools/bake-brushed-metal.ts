/** Bakes one shared seamless stainless field; geometry and lighting never enter the texture recipe. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { latticeHash } from "../src/dressing/finish/noise.ts";

const size = 512;
const period = .5;
const albedo = new PNG({ width: size, height: size });
const properties = new PNG({ width: size, height: size });
const normal = new PNG({ width: size, height: size });
const heights = new Float64Array(size * size);

/** Periodic smooth noise with independent integer lattice frequencies in each direction. */
function noise(u: number, v: number, nx: number, ny: number, seed: number): number {
  const x = u * nx, y = v * ny, ix = Math.floor(x), iy = Math.floor(y);
  const wrap = (value: number, count: number) => ((value % count) + count) % count;
  const hash = (a: number, b: number) => latticeHash(wrap(a, nx), wrap(b, ny), seed);
  const smooth = (a: number) => a * a * (3 - 2 * a);
  const tx = smooth(x - ix), ty = smooth(y - iy);
  return (hash(ix, iy) * (1 - tx) + hash(ix + 1, iy) * tx) * (1 - ty)
    + (hash(ix, iy + 1) * (1 - tx) + hash(ix + 1, iy + 1) * tx) * ty;
}

/** Writes an opaque texel, clamping normalized channels at the image boundary. */
function pixel(image: PNG, index: number, channels: number[]): void {
  image.data.set([...channels.map(value => Math.round(Math.max(0, Math.min(1, value)) * 255)), 255], index * 4);
}

for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const u = x / size, v = y / size, index = y * size + x;
  const cloud = noise(u, v, 5, 5, 173) * .65 + noise(u, v, 13, 13, 619) * .35;
  const brushed = noise(u, v, 9, 240, 47);
  const fine = noise(u, v, 53, 251, 91);
  const scuff = Math.max(0, noise(u, v, 21, 95, 539) - .58) * 2.3;
  const haze = Math.max(0, cloud - .48);
  const silver = .76 + (cloud - .5) * .02 + (brushed - .5) * .019 + scuff * .015;
  pixel(albedo, index, [silver, silver + .006, silver + .009]);
  pixel(properties, index, [1, .31 + cloud * .14 + scuff * .12 + (brushed - .5) * .035, .97 - haze * .14]);
  heights[index] = (brushed - .5) * .000008 + (fine - .5) * .000003 - scuff * .000004;
}
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const at = (a: number, b: number) => heights[((b + size) % size) * size + (a + size) % size];
  const dx = (at(x + 1, y) - at(x - 1, y)) / (2 * period / size);
  const dy = (at(x, y + 1) - at(x, y - 1)) / (2 * period / size);
  const length = Math.hypot(dx, dy, 1);
  // Image rows run opposite UV V; green therefore uses the positive image-row derivative.
  pixel(normal, y * size + x, [.5 - dx / length / 2, .5 + dy / length / 2, .5 + 1 / length / 2]);
}
const outputs: Record<string, { sha256: string; bytes: number }> = {};
await mkdir("src/materials/library", { recursive: true });
await mkdir("projects/modular-metal", { recursive: true });
for (const [suffix, image] of [["", albedo], ["-normal", normal], ["-properties", properties]] as const) {
  const path = `src/materials/library/brushed-metal${suffix}.png`;
  const bytes = PNG.sync.write(image);
  await writeFile(path, bytes);
  outputs[path] = { sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length };
}
await writeFile("projects/modular-metal/material-bake.json", JSON.stringify({
  recipe: "tools/bake-brushed-metal.ts", recipeSha256: createHash("sha256").update(await readFile(import.meta.filename)).digest("hex"),
  width: size, height: size, periodMeters: period, outputs,
  channels: "sRGB albedo; linear OpenGL tangent normal; linear R=unused white G=roughness B=metalness",
  intent: "Wiped brushed stainless. Shared periodic maps, no baked light, AO, rust, or object-specific edge masks.",
}, null, 2) + "\n");
console.log(JSON.stringify(outputs, null, 2));
