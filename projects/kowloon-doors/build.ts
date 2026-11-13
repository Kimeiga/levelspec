/** Exports seeded production entrances with their actual PBR maps for matched visual review. */
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { Matrix4 } from 'three';
import { compile, parseAml, toGLB, resolveExportAssets, collisionMesh } from 'levelspec';
import { localMaterialImages } from '../../src/cli/material-images.ts';
import { kitMaterials, kitFinishes } from '../../src/dressing/kit.ts';
import { KitMesh } from '../../src/dressing/kit-mesh.ts';
import { Pen } from '../../src/dressing/pen.ts';
import { Kit } from '../../src/dressing/kowloon/kit.ts';
import { groundUnit, type UnitKind } from '../../src/dressing/kowloon/ground.ts';
import { planLots } from '../../src/dressing/kowloon/massing.ts';
import { srgb } from '../../src/dressing/kowloon/palette.ts';
import { Rng } from '../../src/generate/rng.ts';
import { compileSurfaceAppearance } from '../../src/dressing/surface/compile.ts';

const output = resolve(process.argv[2] ?? 'generated/kowloon-doors/current');
await mkdir(output, { recursive: true });
const source = resolve('projects/kowloon-doors/study.aml');
const xml = await readFile(source, 'utf8');
const images = localMaterialImages(source);
const materialInputs: Record<string, string> = {};
/** Retains hashes of the exact material images consumed by the bake and export. */
async function materialImage(reference: string, signal?: AbortSignal): Promise<Uint8Array> {
  const bytes = await images.load(reference, signal);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (materialInputs[reference]) assert.equal(materialInputs[reference], hash, `Material changed during bake: ${reference}`);
  materialInputs[reference] = hash;
  return bytes;
}
const cases: { name: string; kind: UnitKind; seed: string }[] = [
  { name: 'steel', kind: 'door', seed: 'door-13' },
  { name: 'timber-glass', kind: 'door', seed: 'door-3' },
  { name: 'painted-timber', kind: 'door', seed: 'door-9' },
  { name: 'gate', kind: 'gate', seed: 'gate-2' },
  { name: 'shutter', kind: 'shutter', seed: 'shutter-1' },
];
const paths = [...(await readdir('src/dressing', {recursive: true})).filter(path => path.endsWith('.ts') || path.endsWith('.json')).map(path => `src/dressing/${path}`),
  'projects/kowloon-doors/build.ts', 'projects/kowloon-doors/viewer.mjs', 'projects/kowloon-doors/study.aml'];
const inputs = Object.fromEntries(await Promise.all(paths.map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
const report = [];
for (const item of cases) {
  const level = await compile(parseAml(xml), { navigation: false });
  const collision = collisionMesh(level, true);
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  kitMaterials(level);
  const mesh = new KitMesh(level, 'host', '', kitFinishes(level, 'kit', 'wall').materials, { maximumTriangles: 10000 });
  const pen = new Pen(mesh, 'openings', new Matrix4(), false);
  const lot = planLots({ width: 2.6, depth: 1, height: 2.95, stories: 1, baseHeight: 0 }, 'door-lot')[0];
  lot.style.shutter = srgb('#939c99');
  const kit = new Kit('entrance-study', 0, .55, .22, false, 128, .28);
  const start = mesh.triangleCount;
  groundUnit(pen, item.kind, { key: item.name, u0: 0, u1: 2.6, height: 3 }, lot, kit, new Rng(item.seed));
  const triangles = mesh.triangleCount - start;
  await compileSurfaceAppearance(level, { navigation: false, resolveMaterialImage: materialImage,
    appearance: { maximumTexels: 8 * 1024 * 1024 } }, 10000);
  assert.deepEqual(collisionMesh(level, true), collision);
  const assets = await resolveExportAssets(level, materialImage);
  const bytes = toGLB(level, { assets });
  await writeFile(join(output, `${item.name}.glb`), bytes);
  report.push({ ...item, emittedPropTriangles: triangles, exportedTriangles: level.mesh.indices.length / 3, glbSha256: createHash('sha256').update(bytes).digest('hex'),
    appearance: level.surfaceAppearance, diagnostics: level.diagnostics });
  process.stderr.write(`${item.name}: ${triangles} triangles\n`);
}
await writeFile(join(output, 'report.json'), JSON.stringify({inputs, materialInputs, entrances: report}, null, 2));
