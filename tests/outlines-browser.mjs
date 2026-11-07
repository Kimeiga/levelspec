/** Physical feature ink must be independent of an assembly's mesh partitioning. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import * as THREE from 'three';
import { startPreview } from '../src/cli/preview.ts';
import { launchBrowser, waitForFrames } from '../website/tests/browser-helpers.mjs';

await mkdir('generated', { recursive: true });
const output = await mkdtemp('generated/physical-outlines-browser-');
const directory = await mkdtemp(join(tmpdir(), 'levelspec-outlines-'));
const file = join(directory, 'level.level.svgx');
const source = `<level version="2" id="physical-outlines" name="Physical outlines" validation="premap">
 <material id="pale" color="#dddddd"/>
 <layer id="ground">
  <vertex id="a" x="-7" y="-5" z="-1"/><vertex id="b" x="7" y="-5" z="-1"/>
  <vertex id="c" x="7" y="5" z="-1"/><vertex id="d" x="-7" y="5" z="-1"/>
  <edge id="ab" from="a" to="b" kind="open"/><edge id="bc" from="b" to="c" kind="open"/>
  <edge id="cd" from="c" to="d" kind="open"/><edge id="da" from="d" to="a" kind="open"/>
  <region id="floor" boundary="ab bc cd da" fill="floor" material="pale"/>
 </layer>
 <prop id="flush-left" layer="ground" shape="box" position="-3 0 0" scale="2 4 1" material="pale" collision="solid"/>
 <prop id="flush-right" layer="ground" shape="box" position="-1 0 0" scale="2 4 1" material="pale" collision="solid"/>
 <prop id="step-low" layer="ground" shape="box" position="2 0 0" scale="2 4 1" material="pale" collision="solid"/>
 <prop id="step-high" layer="ground" shape="box" position="4 0 0" scale="2 4 2" material="pale" collision="solid"/>
</level>`;
await writeFile(file, source);
const measurements = [], errors = [];
let server, browser;

/** Projects known fixture coordinates using the delivered camera matrices. */
async function projection(page, bitmapWidth) {
  const state = await page.locator('#model').evaluate(host => ({
    width: host.clientWidth, height: host.clientHeight,
    view: host.dataset.viewMatrix.split(',').map(Number),
    projection: host.dataset.projectionMatrix.split(',').map(Number),
  }));
  const matrix = new THREE.Matrix4().fromArray(state.projection).multiply(new THREE.Matrix4().fromArray(state.view));
  const pixelScale = bitmapWidth / state.width;
  return point => {
    const p = new THREE.Vector3(...point).applyMatrix4(matrix);
    return [(p.x + 1) * state.width * pixelScale / 2, (1 - p.y) * state.height * pixelScale / 2];
  };
}

/** Counts dark feature pixels near a known location, allowing subpixel raster alignment. */
function inkCount(image, point, radius = 3) {
  const [x, y] = point.map(Math.round);
  assert.ok(x - radius >= 0 && y - radius >= 0 && x + radius < image.width && y + radius < image.height, 'Fixture sample inside canvas');
  let count = 0;
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const offset = ((y + dy) * image.width + x + dx) * 4;
    if (Math.max(image.data[offset], image.data[offset + 1], image.data[offset + 2]) < 100) count++;
  }
  return count;
}

try {
  server = await startPreview(file, { port: 0 });
  browser = await launchBrowser();
  for (const dpr of [1, 2]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if ((message.type() === 'error' && !/favicon\.ico/.test(message.location().url)) || /INVALID_OPERATION|GL_INVALID/.test(message.text())) errors.push(message.text());
      });
      for (const view of [
        { name: 'orthographic-oblique', projection: 'orthographic', camera: '5 -12 12' },
        { name: 'perspective-oblique', projection: 'perspective', camera: '5 -12 12' },
        { name: 'orthographic-top', projection: 'orthographic', camera: '0 0 20' },
        { name: 'perspective-top', projection: 'perspective', camera: '3 0 20', target: '3 0 1' },
      ]) {
        const url = new URL(server.url);
        for (const [key, value] of Object.entries({ projection: view.projection, camera: view.camera, target: view.target ?? '0 0 1', 'view-height': '11', fov: '45', appearance: 'inspection' })) url.searchParams.set(key, value);
        await page.goto(url.href);
        await page.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
        await waitForFrames(page);
        // Native pixels preserve ink coverage; CSS screenshot resampling can average thin ink into gray.
        const image = PNG.sync.read(await page.locator('#model canvas').screenshot({ path: join(output, `${view.name}-dpr${dpr}.png`), scale: 'device' }));
        const project = await projection(page, image.width);
        const samples = {
          flush: [-1, 0, 1].map(y => inkCount(image, project([-2, y, 1]))),
          flat: inkCount(image, project([-3, 0, 1])),
          opening: inkCount(image, project([0, 0, 1])),
          depthStep: inkCount(image, project([3, 0, 2])),
          rim: inkCount(image, project([-3, -2, 1])),
          silhouette: inkCount(image, project([0, -5, -1])),
        };
        measurements.push({ view: view.name, dpr, samples });
        assert.ok(samples.flush.every(count => count === 0), `Coplanar owner split must not create a false seam: ${JSON.stringify(measurements.at(-1))}`);
        assert.equal(samples.flat, 0, 'Flat surface has no wireframe or invented ink');
        for (const field of ['opening', 'depthStep', 'rim', 'silhouette']) assert.ok(samples[field] > 2, `${view.name} DPR${dpr}: real ${field} must retain ink`);
        await page.locator('#cut').fill('0');
        await waitForFrames(page);
        const clipped = PNG.sync.read(await page.locator('#model canvas').screenshot({ path: join(output, `${view.name}-dpr${dpr}-clipped.png`), scale: 'device' }));
        for (const point of [[0, 0, 1], [3, 0, 2], [-3, -2, 1]]) assert.equal(inkCount(clipped, project(point)), 0, 'Clipped geometry leaves no ghost ink');
        console.log(`PASS physical contours ${view.name} DPR${dpr}`);
      }
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(join(output, 'results.json'), JSON.stringify({ measurements, errors }, null, 2) + '\n');
  await browser?.close();
  await server?.close();
  await rm(directory, { recursive: true, force: true });
  console.log('Outline evidence: ' + output);
}
