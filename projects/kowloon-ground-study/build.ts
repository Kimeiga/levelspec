/** Rebuilds only courtyard dressing; leaves the published demo and other agents' buildings untouched. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compile, resolveExportAssets } from '../../src/architecture/index.ts';
import { exportLevel } from '../../src/export/vector/index.ts';
import { localMaterialImages } from '../../src/cli/material-images.ts';
import { prepareDemoPreset } from '../../tools/dressing-demo/presets.ts';
const sourceFile = resolve('projects/dressing-demo/level.aml');
const document = prepareDemoPreset(await readFile(sourceFile, 'utf8'), 'kowloon', 'courtyard');
const images = localMaterialImages(sourceFile);
let phase = '';
const level = await compile(document, { resolveMaterialImage: images.load,
  appearance: { maximumTexels: 32 * 1024 * 1024, maximumBytes: 128 * 1024 * 1024 },
  onProgress(stage) {
  if (stage !== phase) { phase = stage; console.error(stage); }
} });
const errors = level.diagnostics.filter(item => item.severity === 'error');
if (errors.length) throw new Error(JSON.stringify(errors));
await exportLevel(level, { formats: ['glb', 'gltf'], sourceFile,
  output: resolve('generated/ground-study'), assets: await resolveExportAssets(level, images.load) });

await writeFile(resolve('generated/ground-study/asphalt-regions.json'), JSON.stringify(
  level.groundPlans?.find(plan => plan.host === "courtyard")?.regions
    .filter(region => region.kind === "asphalt").map(region => region.bounds) ?? []));
