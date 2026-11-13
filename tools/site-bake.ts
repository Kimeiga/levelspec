import { COURTYARD_BAKE_PRESETS } from "./fixtures/courtyard/bake-presets.ts";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  compile,
  parseAml,
  generateUVs,
  resolveExportAssets,
} from "../src/architecture/index.ts";
import { sourceForState } from "./fixtures/courtyard/variants.ts";
import { bakeLighting } from "../src/lighting/bake.ts";
import { createHash } from "node:crypto";
const presets = COURTYARD_BAKE_PRESETS;
const [style = "clay", destination = "generated/site-bakes", sampleText = "32"] =
  process.argv.slice(2);
if (!(style in presets)) throw new Error("Use clay, chalk, or night.");
const look = style as keyof typeof presets;
const source = sourceForState({ look, ...presets[look] });
const level = await compile(parseAml(source));
await generateUVs(level, { density: 8, resolution: 1024, padding: 8 });
console.log("ATLAS", JSON.stringify(level.atlas?.pages));
const assets = await resolveExportAssets(level, (ref) =>
  readFile(resolve("website/assets", ref)),
);
const output = resolve(destination, look);
const start = Date.now();
const manifest = await bakeLighting(level, {
  output,
  samples: Number(sampleText),
  assets,
  onProgress: (s) => process.stdout.write(s),
});
await writeFile(resolve(output, "source.aml"), source);
await writeFile(resolve(output, "compiled.json"), JSON.stringify(level));
await writeFile(
  resolve(output, "receipt.json"),
  JSON.stringify(
    {
      sourceHash: createHash("sha256").update(source).digest("hex"),
      elapsedSeconds: (Date.now() - start) / 1000,
      pages: manifest.pages.length,
      samples: manifest.samples,
      blender: manifest.blenderVersion,
    },
    null,
    2,
  ),
);
console.log(
  "SITE_BAKE_PASSED",
  JSON.stringify({
    style,
    pages: manifest.pages,
    seconds: (Date.now() - start) / 1000,
  }),
);
