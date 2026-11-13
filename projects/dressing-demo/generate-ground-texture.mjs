/** Generates seamless aggregate color and tangent normals; no illumination, shadows, or AO are baked. */
import { writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
const size = 1024, image = new PNG({ width: size, height: size });
const normal = new PNG({width: size, height: size});
const heights = new Float64Array(size * size);

/** Coordinate-hashed aggregate samples repeat exactly at the texture boundary. */
function hash(x, y, seed = 41) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Seamless smooth value noise with an integer lattice period. */
function noise(u, v, period, seed) {
  const x = u * period, y = v * period, ix = Math.floor(x), iy = Math.floor(y);
  const sx = x - ix, sy = y - iy, fx = sx * sx * (3 - 2 * sx), fy = sy * sy * (3 - 2 * sy);
  const a = hash(ix % period, iy % period, seed), b = hash((ix + 1) % period, iy % period, seed);
  const c = hash(ix % period, (iy + 1) % period, seed), d = hash((ix + 1) % period, (iy + 1) % period, seed);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const u = x / size, v = y / size, grain = hash(x, y, 177);
  const aggregate = noise(u, v, 180, 17), pore = noise(u, v, 300, 59);
  const large = noise(u, v, 5, 181) * 12 + noise(u, v, 23, 49) * 8;
  let value = 181 + large + (grain - 0.5) * 22 + (aggregate - 0.5) * 36;
  if (pore < 0.19) value -= (0.19 - pore) * 230;
  if (aggregate > 0.8) value += (aggregate - 0.8) * 120;
  heights[y * size + x] = noise(u, v, 9, 63) * 0.0012
    + noise(u, v, 48, 71) * 0.0015 + aggregate * 0.0007
    - Math.max(0, 0.3 - pore) * 0.003;
  const i = (y * size + x) * 4;
  image.data[i] = Math.max(0, Math.min(255, value + 2));
  image.data[i + 1] = Math.max(0, Math.min(255, value + 1));
  image.data[i + 2] = Math.max(0, Math.min(255, value - 3));
  image.data[i + 3] = 255;
}
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const height = (dx, dy) => heights[((y + dy + size) % size) * size + (x + dx + size) % size];
  const nx = -(height(1, 0) - height(-1, 0)) * size / 2;
  const ny = (height(0, 1) - height(0, -1)) * size / 2;
  const length = Math.hypot(nx, ny, 1), i = (y * size + x) * 4;
  normal.data[i] = Math.round((nx / length * 0.5 + 0.5) * 255);
  normal.data[i + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
  normal.data[i + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
  normal.data[i + 3] = 255;
}
await writeFile(new URL('./textures/ground-concrete.png', import.meta.url), PNG.sync.write(image));
await writeFile(new URL('./textures/ground-normal.png', import.meta.url), PNG.sync.write(normal));
