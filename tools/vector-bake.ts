import { localHeightmaps } from "../src/cli/heightmaps.ts";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  parseAml,
  compile,
  resolveExportAssets,
} from "../src/architecture/index.ts";
import { bakeLighting } from "../src/lighting/bake.ts";
const [
  file = "examples/showcase.aml",
  output = "generated/lighting/showcase",
  samples = "32",
] = process.argv.slice(2);
const level = await compile(parseAml(await readFile(file, "utf8")), {
  uvs: true,
  resolveHeightmap: localHeightmaps(file).load,
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
