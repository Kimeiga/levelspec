import { readFile, writeFile, access, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { launchBrowser } from '../tests/browser/support/browser.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('src/materials/concrete/textures/', root);
const inputs = ['material.ts', 'maps.ts', 'plaster.ts', 'grime.ts', 'textures/concrete-plain.png', 'textures/concrete-fine-sand.png'];
const hash = createHash('sha256');
for (const file of inputs) hash.update(await readFile(new URL(`src/materials/concrete/${file}`, root)));
hash.update(await readFile(new URL('./concrete-maps.ts', import.meta.url)));
hash.update(await readFile(new URL('node_modules/three/package.json', root)));
const signature = hash.digest('hex');
const manifest = new URL('maps.json', output);
let cached = false;
try {
  cached = JSON.parse(await readFile(manifest, 'utf8')).signature === signature;
  for (const name of ['base-color.png', 'normal.png']) await access(new URL(name, output));
} catch { cached = false; }
if (cached) {
  console.log('Shared concrete maps are current.');
} else {
  const server = await createServer({ configFile: false, root: root.pathname, server: { host: '127.0.0.1', port: 5199, strictPort: true } });
  let browser;
  try {
    await server.listen();
    browser = await launchBrowser();
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('http://127.0.0.1:5199/tools/concrete-maps.html');
    await page.waitForFunction(() => document.body.dataset.ready || document.body.dataset.error, undefined, { timeout: 120000 });
    const result = await page.evaluate(() => ({ maps: window.concreteMaps, error: document.body.dataset.error }));
    if (result.error || errors.length) throw new Error([result.error, ...errors].filter(Boolean).join('\n'));
    for (const [channel, image] of Object.entries(result.maps)) {
      await writeFile(new URL(channel === 'color' ? 'base-color.png' : 'normal.png', output), Buffer.from(image.split(',')[1], 'base64'));
    }
    await writeFile(manifest, JSON.stringify({ signature, meters: 8, pixels: 2048, roughness: 0.96,
      description: 'Shared concrete intrinsic albedo and tangent normals. No lighting, shadows or AO.' }, null, 2) + '\n');
    console.log('Generated shared 2048px concrete color and normal maps (8m period).');
  } finally {
    await browser?.close();
    await server.close();
  }
}

// Publish the official intrinsic maps used by all procedural scenes.
for (const [source, target] of [["base-color.png", "concrete-shared.png"], ["normal.png", "concrete-shared-normal.png"]]) {
  await copyFile(new URL(source, output), new URL(`src/materials/library/${target}`, root));
}
