/** Builds the reusable demo presets and their portable preview packages. */
import {
  readFile,
  mkdir,
  writeFile,
  mkdtemp,
  rename,
  rm,
} from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import {
  serializeAml,
  validateForRuntime,
  toRuntime,
  resolveExportAssets,
} from "../src/architecture/index.ts";
import { exportLevel } from "../src/export/vector/index.ts";
import { materialCompanions } from "../src/vector/materials.ts";
import { localMaterialImages } from "../src/cli/material-images.ts";
import { generatedImageManifest } from "../src/vector/export-assets.ts";
import { DEMO_PRESETS, prepareDemoPreset } from "./dressing-demo/presets.ts";
import { compileDemo } from "./dressing-demo/compile.ts";
import { demoCacheAvailable, demoFingerprint } from "./dressing-demo/cache.ts";
import { packageDemoPreset } from "./dressing-demo/package.ts";

const sourceFile = resolve("projects/dressing-demo/level.aml");
const output = resolve("generated/dressing-demo/presets");
const fingerprint = await demoFingerprint(process.cwd());
if (await demoCacheAvailable(output, fingerprint)) process.exit(0);
await mkdir(dirname(output), { recursive: true });
const staging = await mkdtemp(`${output}.staging-`);
try {
  const source = await readFile(sourceFile, "utf8");
  const previews = [];
  for (const id of DEMO_PRESETS) {
    const document = prepareDemoPreset(source, id);
    const materialImages = localMaterialImages(sourceFile);
    let phase = "";
    const started = performance.now();
    const level = await compileDemo(source, id, { resolveMaterialImage: materialImages.load,
      onProgress(stage) {
        if (stage === phase) return;
        phase = stage;
        process.stderr.write(`[${id}] ${stage} (${((performance.now() - started) / 1000).toFixed(1)}s)\n`);
      },
    });
    const report = await validateForRuntime(level, { sealed: true });
    if (!report.passed) throw new Error(JSON.stringify(report.diagnostics));
    const directory = join(staging, id);
    const companions: Record<string, Uint8Array> = {};
    for (const material of document.materials)
      for (const reference of materialCompanions(material))
        companions[reference] = await materialImages.load(reference);
    const { generatedImages, ...previewLevel } = level;
    const imageManifest = generatedImageManifest(level);
    await exportLevel(level, {
      formats: ["glb", "gltf"],
      assets: await resolveExportAssets(level, materialImages.load),
      sourceFile,
      output: directory,
      additionalFiles: {
        "level.aml": serializeAml(document),
        "preview.json": JSON.stringify({ version: 2, level: previewLevel, report, generatedImages: imageManifest }),
        "dressing-demo.runtime.json": JSON.stringify(toRuntime(level)),
        "dressing-demo.report.json": JSON.stringify(report, null, 2),
        ...companions,
      },
    });
    await packageDemoPreset(directory);
    previews.push({
      id,
      physicalHash: level.physicalHash,
      renderHash: level.renderHash,
      triangles: level.mesh.indices.length / 3,
    });
  }
  if (previews[0].physicalHash !== previews[1].physicalHash)
    throw new Error("Dressing changed the demo collision geometry.");

  await writeFile(
    join(staging, "manifest.json"),
    JSON.stringify({ version: 1, fingerprint, previews }, null, 2) + "\n",
  );
  const previous = `${output}.previous`;
  await rm(previous, { recursive: true, force: true });
  let hadPrevious = false;
  try {
    await rename(output, previous);
    hadPrevious = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    await rename(staging, output);
  } catch (error) {
    if (hadPrevious) await rename(previous, output);
    throw error;
  }
  await rm(previous, { recursive: true, force: true });
  console.log("Built Blockout and Kowloon demo presets.");
} finally {
  await rm(staging, { recursive: true, force: true });
}
