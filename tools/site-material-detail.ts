import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { PNG } from "pngjs";
const root = "website/assets/textures",
  out = "website/assets/detail";
await mkdir(out, { recursive: true });
for (const file of (await readdir(root)).filter(
  (f) => f.includes("-") && f.endsWith(".png"),
)) {
  const src = PNG.sync.read(await readFile(`${root}/${file}`)),
    { width: w, height: h } = src;
  const height = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const k = (((y + j + h) % h) * w + ((x + i + w) % w)) * 4;
          sum += (src.data[k] + src.data[k + 1] + src.data[k + 2]) / 765;
        }
      height[y * w + x] = sum / 9;
    }
  const normal = new PNG({ width: w, height: h }),
    rough = new PNG({ width: w, height: h });
  const at = (x: number, y: number) =>
    height[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4,
        dx = (at(x - 1, y) - at(x + 1, y)) * 1.5,
        dy = (at(x, y + 1) - at(x, y - 1)) * 1.5,
        len = Math.hypot(dx, dy, 1);
      normal.data[k] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      normal.data[k + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      normal.data[k + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      normal.data[k + 3] = 255;
      const value = Math.round(Math.min(1, 0.75 + (1 - at(x, y)) * 0.28) * 255);
      rough.data[k] = rough.data[k + 1] = rough.data[k + 2] = value;
      rough.data[k + 3] = 255;
    }
  await writeFile(
    `${out}/${file.replace(".png", "-normal.png")}`,
    PNG.sync.write(normal),
  );
  await writeFile(
    `${out}/${file.replace(".png", "-rough.png")}`,
    PNG.sync.write(rough),
  );
}
console.log("Original low-amplitude material-detail maps generated.");
