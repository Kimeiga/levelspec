/** Lit surface uniformity and retained cast shadows through the real AML reviewer. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { Matrix4, Vector3 } from 'three';
import { compile, parseAml } from 'levelspec';
import { startPreview } from '../src/cli/preview.ts';
import { launchBrowser, waitForFrames } from './browser/support/browser.mjs';

await mkdir('generated', { recursive: true });
const output = await mkdtemp('generated/shadows-browser-');
const directory = await mkdtemp(join(tmpdir(), 'levelspec-shadows-'));
const measurements = [], errors = [];
let browser, server;

/** Keeps the inspected wall unchanged while varying the area covered by the shadow map. */
function source(extent, [x, y, z]) {
  return `<architecture version="1" id="shadow-${extent}" name="Shadow calibration" units="meters" validation="premap">
    <profile id="floor-profile" points="${x - extent} ${y - extent}; ${x + extent} ${y - extent}; ${x + extent} ${y + extent}; ${x - extent} ${y + extent}"/>
    <material id="floor-color" color="#708090"/>
    <material id="wall-color" color="#ccaa55"/>
    <group id="ground"><slab id="floor" profile="floor-profile" elevation="${z}" thickness="0.2" material="floor-color"/></group>
    <path id="wall-path" points="${x - 4} ${y} ${z}; ${x + 4} ${y} ${z}" closed="false"/>
    <wall id="wall" group="ground" path="wall-path" thickness="0.4" height="3" material="wall-color"/>
  </architecture>`;
}

/** Projects known world coordinates with the delivered camera rather than a second camera model. */
async function projection(page, bitmapWidth) {
  const state = await page.locator('#model').evaluate(host => ({
    width: host.clientWidth, height: host.clientHeight,
    view: host.dataset.viewMatrix.split(',').map(Number),
    projection: host.dataset.projectionMatrix.split(',').map(Number),
  }));
  const matrix = new Matrix4().fromArray(state.projection).multiply(new Matrix4().fromArray(state.view));
  const scale = bitmapWidth / state.width;
  return point => {
    const projected = new Vector3(...point).applyMatrix4(matrix);
    return [(projected.x + 1) * state.width * scale / 2, (1 - projected.y) * state.height * scale / 2];
  };
}

/** Measures brightness and variation inside a uniform surface, clear of edges and real shadows. */
function patch(image, point, radius = 10) {
  const [x, y] = point.map(Math.round);
  const values = [];
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    assert.ok(x + dx >= 0 && x + dx < image.width && y + dy >= 0 && y + dy < image.height, 'Shadow sample stays inside the canvas');
    const offset = ((y + dy) * image.width + x + dx) * 4;
    values.push((image.data[offset] + image.data[offset + 1] + image.data[offset + 2]) / 3);
  }
  return { mean: values.reduce((sum, value) => sum + value, 0) / values.length, range: Math.max(...values) - Math.min(...values) };
}

try {
  browser = await launchBrowser();
  for (const [extent, offset] of [[6, [0, 0, 0]], [60, [0, 0, 0]], [60, [1000, 2000, 50]]]) {
    const label = `${extent}-${offset[0]}`;
    const file = join(directory, `shadow-${label}.aml`);
    const text = source(extent, offset);
    await writeFile(file, text);
    const level = await compile(parseAml(text), { navigation: false });
    server = await startPreview(file, { port: 0 });
    const context = await browser.newContext({ viewport: { width: 1400, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if ((message.type() === 'error' && !/favicon\.ico/.test(message.location().url)) || /INVALID_OPERATION|GL_INVALID/.test(message.text())) errors.push(message.text());
      });
      await page.route(url => url.pathname === '/', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0"><div id="model" style="width:100vw;height:100vh"></div></body></html>' }));
      await page.goto(server.url);
      // Use one setLevel call so progressive worker updates cannot hide a broken first render.
      await page.evaluate(async level => {
        const { ReviewScene } = await import('/review/scene.ts');
        window.shadowScene = new ReviewScene(document.querySelector('#model'), () => {}, () => {}, () => {});
        window.shadowScene.setLevel(level, { layer: '', roofs: true, cut: 1, appearance: 'full-render', movement: '', selected: '', issues: false }, true);
      }, level);
      for (const [name, position] of [['lit-wall', [9, -12, 10]], ['shadow-contact', [9, 12, 10]]]) {
        await page.evaluate(({ position, offset }) => {
          window.shadowScene.overview.setView({ projection: 'orthographic', position: position.map((value, i) => value + offset[i]), target: [offset[0], offset[1], offset[2] + 1], viewHeight: 12 });
        }, { position, offset });
        await waitForFrames(page);
        const image = PNG.sync.read(await page.locator('#model canvas').screenshot({ path: join(output, `${label}-${name}.png`) }));
        const project = await projection(page, image.width);
        const projectLocal = point => project(point.map((value, i) => value + offset[i]));
        const floor = patch(image, projectLocal([3, -3, 0]));
        assert.ok(floor.range <= 2, `Uniform lit floor must not show self-shadow bands: extent=${extent}, range=${floor.range}`);
        const result = { extent, offset, name, floor };
        if (name === 'lit-wall') {
          result.wall = patch(image, projectLocal([0, -0.2, 1.5]));
          assert.ok(result.wall.range <= 2, `Uniform lit wall must not show self-shadow bands: extent=${extent}, range=${result.wall.range}`);
        } else {
          result.shadow = patch(image, projectLocal([0, 1, 0]), 2);
          result.contact = patch(image, projectLocal([0, 0.35, 0]), 1);
          assert.ok(floor.mean - result.shadow.mean > 35, 'The wall must retain a clearly visible cast shadow');
          assert.ok(floor.mean - result.contact.mean > 25, 'The cast shadow must remain near the wall base');
        }
        measurements.push(result);
      }
      await page.evaluate(() => window.shadowScene.dispose());
      console.log(`PASS first-render lit floor/wall uniformity and cast-shadow contact across a ${extent * 2} m floor at ${offset}`);
    } finally {
      await context.close();
      await server.close();
      server = undefined;
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(join(output, 'results.json'), JSON.stringify({ measurements, errors }, null, 2) + '\n');
  await browser?.close();
  await server?.close();
  await rm(directory, { recursive: true, force: true });
  console.log('Shadow evidence: ' + output);
}
