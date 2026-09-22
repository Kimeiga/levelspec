import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  parseLevelSvgx,
  compile,
  resolveExportAssets,
} from "../src/vector/index.ts";
import { bakeLighting } from "../src/lighting/bake.ts";
const [
  file = "examples/showcase.level.svgx",
  output = "generated/lighting/showcase",
  samples = "32",
] = process.argv.slice(2);
const level = await compile(parseLevelSvgx(await readFile(file, "utf8")), {
  uvs: true,
});
const assets = await resolveExportAssets(level, (reference) =>
  readFile(resolve(dirname(resolve(file)), reference)),
);
await bakeLighting(level, {
  output,
  assets,
  samples: Number(samples),
  onProgress: (s) => process.stdout.write(s),
});
