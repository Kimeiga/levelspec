import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { validateBytes } from 'gltf-validator';
import { launchBrowser, waitForFrames } from '../../tests/browser/support/browser.mjs';

const [output, only] = process.argv.slice(2);
if (!output) throw new Error('Usage: node projects/kowloon-asset-pilot/capture.mjs NEW_OUTPUT_DIR [asset-id]');
await mkdir(output, { recursive: false });
const manifest = JSON.parse(await readFile('projects/kowloon-asset-pilot/models.json', 'utf8'));
const ids = only ? [only] : Object.keys(manifest);
const errors = [], captures = [], models = [];
const baselineHashes = {};
const evidenceSources = ['build-baseline.ts', 'viewer.ts', 'capture.mjs', 'index.html', 'models.json', 'generation-plan.json', 'concepts/provenance.json'];
const sourceHashes = Object.fromEntries(await Promise.all(evidenceSources.map(async name => [name,
  createHash('sha256').update(await readFile(`projects/kowloon-asset-pilot/${name}`)).digest('hex'),
])));
let server, browser;
try {
  for (const id of ids) {
    baselineHashes[id] = createHash('sha256').update(await readFile(`projects/kowloon-asset-pilot/evidence/baseline/${id}.json`)).digest('hex');
    assert.ok(manifest[id], `${id}: candidate is still pending`);
    const bytes = await readFile(manifest[id]);
    const validation = await validateBytes(bytes, { maxIssues: 30 });
    models.push({ id, path: manifest[id], bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), validation: validation.issues });
    assert.equal(validation.issues.numErrors, 0, `${id}: invalid GLB`);
  }
  server = await createServer({
    configFile: false, root: process.cwd(), cacheDir: resolve(output, '.vite'),
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
  });
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
  await page.goto(`http://127.0.0.1:${port}/projects/kowloon-asset-pilot/`);
  await page.waitForSelector('body[data-ready="true"]');
  for (const id of ids) {
    await page.selectOption('#asset', id);
    for (const [view, surface, light] of [
      ['oblique', 'textured', 'left'], ['front', 'textured', 'left'],
      ['side', 'textured', 'left'], ['back', 'textured', 'left'],
      ['oblique', 'clay', 'left'], ['oblique', 'textured', 'right'],
      ['context', 'textured', 'left'],
    ]) {
      await page.selectOption('#view', view);
      await page.selectOption('#surface', surface);
      await page.selectOption('#light', light);
      await page.waitForFunction(({ id, view, surface, light }) => {
        const state = window.pilot?.capture();
        return document.body.dataset.ready === 'true' && state?.id === id && state.view === view && state.surface === surface && state.light === light;
      }, { id, view, surface, light });
      await waitForFrames(page, 2);
      const state = await page.evaluate(() => window.pilot.capture());
      assert.equal(state.status, 'comparison');
      assert.ok(state.baseline.triangles > 0 && state.candidate.triangles > 0);
      assert.ok(state.candidate.textures.some(texture => texture.slots.includes('map')), `${id}: candidate has no loaded base-color map`);
      if (id === 'laundry-shirt') assert.ok(state.baseline.textures.some(texture => texture.slots.includes('map')), 'Baseline cloth atlas is missing');
      assert.ok(Math.abs(state.baseline.transform.size[2] - state.candidate.transform.size[2]) < 1e-6);
      assert.equal(await page.locator('#error').textContent(), '');
      const filename = `${id}-${view}-${surface}-${light}.png`;
      await page.screenshot({ path: resolve(output, filename) });
      captures.push({ filename, ...state });
    }
  }
  assert.deepEqual(errors, []);
  for (const id of ids) assert.equal(createHash('sha256').update(await readFile(`projects/kowloon-asset-pilot/evidence/baseline/${id}.json`)).digest('hex'), baselineHashes[id], `${id}: baseline changed during capture`);
} finally {
  await writeFile(resolve(output, 'capture.json'), JSON.stringify({ sourceHashes, baselineHashes, models, captures, errors }, null, 2));
  await browser?.close();
  await server?.close();
}
console.log(`${captures.length} verified comparisons saved to ${output}`);
