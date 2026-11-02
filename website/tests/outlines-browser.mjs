import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import * as THREE from 'three';
import { launchBrowser, testContext, waitForFrames } from './browser-helpers.mjs';

const VIEWER = process.env.VIEWER_URL || 'http://127.0.0.1:48218/';
const OUTPUT = process.env.QA_OUTPUT || 'website-qa/outlines';
await mkdir(OUTPUT, { recursive: true });
const browser = await launchBrowser();
const errors = [], measurements = [];
const source = `<level version="2" id="outline-calibration" name="Outline calibration" validation="premap" floor-thickness="0.2">
  <material id="white" color="#eeeeee" roughness="1"/>
  <layer id="ground">
    <vertex id="a" x="-6" y="-6" z="0"/><vertex id="b" x="6" y="-6" z="0"/>
    <vertex id="c" x="6" y="6" z="0"/><vertex id="d" x="-6" y="6" z="0"/>
    <edge id="ab" from="a" to="b" kind="open"/><edge id="bc" from="b" to="c" kind="open"/>
    <edge id="cd" from="c" to="d" kind="open"/><edge id="da" from="d" to="a" kind="open"/>
    <region id="ground-floor" boundary="ab bc cd da" fill="floor" material="white"/>
    <vertex id="west" x="-4" y="0" z="0"/><vertex id="east" x="4" y="0" z="0"/>
    <vertex id="south" x="0" y="0.5" z="0"/><vertex id="north" x="0" y="4" z="0"/>
    <edge id="lower-box" from="west" to="east" kind="wall" thickness="2" height="2" material="white"/>
    <edge id="upper-box" from="south" to="north" kind="wall" thickness="2" height="4" material="white"/>
  </layer>
</level>`;

/** Uses observable camera diagnostics only to project analytically known geometry. */
async function projection(page) {
  const state = await page.locator('#model').evaluate(host => ({
    camera: host.dataset.camera.split(',').map(Number),
    frustum: host.dataset.frustum.split(',').map(Number),
    width: host.clientWidth, height: host.clientHeight,
  }));
  const [left, right, top, bottom, near, far] = state.frustum;
  const camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
  camera.position.fromArray(state.camera);
  camera.zoom = state.camera[3];
  camera.up.set(0, 0, 1);
  camera.lookAt(new THREE.Vector3().fromArray(state.camera, 4));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return point => {
    const projected = new THREE.Vector3(...point).project(camera);
    return [(projected.x + 1) * state.width / 2, (1 - projected.y) * state.height / 2];
  };
}

/** Reads a CSS-resolution screenshot so thickness comparisons are independent of DPR. */
async function screenshot(page, name) {
  return PNG.sync.read(await page.locator('#model canvas').screenshot({ path: `${OUTPUT}/${name}.png`, scale: 'css' }));
}

/** Distinguishes dark contour ink from the calibration fixture's lit pale surfaces. */
function dark(image, x, y) {
  x = Math.round(x); y = Math.round(y);
  assert.ok(x >= 0 && x < image.width && y >= 0 && y < image.height, 'Known contact must remain inside the viewport');
  const pixel = (y * image.width + x) * 4;
  return Math.max(image.data[pixel], image.data[pixel + 1], image.data[pixel + 2]) < 115;
}

/** Samples the transverse dark run through a known contact segment, in CSS pixels. */
function contactWidth(image, project, y) {
  const center = project([y, 0.5, 2]);
  const a = project([-0.6, 0.5, 2]), b = project([0.6, 0.5, 2]);
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
  const normal = [-dy / length, dx / length];
  const samples = Array.from({ length: 25 }, (_, i) => {
    const distance = (i - 12) * 0.5;
    return dark(image, center[0] + normal[0] * distance, center[1] + normal[1] * distance);
  });
  let closest = -1;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] && (closest < 0 || Math.abs(i - 12) < Math.abs(closest - 12))) closest = i;
  }
  assert.ok(closest >= 0 && Math.abs(closest - 12) <= 5, 'Visible crossing contact must carry dark ink at its independently projected location');
  let start = closest, end = closest;
  while (start > 0 && samples[start - 1]) start--;
  while (end < samples.length - 1 && samples[end + 1]) end++;
  return (end - start + 1) * 0.5;
}

/** Checks a lit flat surface patch without sampling its legitimate outer boundaries. */
function cleanPatch(image, center) {
  let ink = 0, pixels = 0;
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    pixels++;
    if (dark(image, center[0] + dx, center[1] + dy)) ink++;
  }
  assert.ok(ink / pixels < 0.02, 'Flat interiors must not contain hidden contact, triangle diagonals or dither-derived contour ink');
}

try {
  for (const dpr of [1, 2]) {
    const context = await testContext(browser, { viewport: { width: 1280, height: 900 }, deviceScaleFactor: dpr });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' || (message.type() === 'warning' && /INVALID_OPERATION|GL_INVALID/.test(message.text()))) errors.push(message.text());
    });
    await page.goto(VIEWER);
    await page.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
    const started = Date.now();
    await page.locator('#file').setInputFiles({ name: 'outline-calibration.level.svgx', mimeType: 'application/xml', buffer: Buffer.from(source) });
    await page.waitForFunction(() => document.querySelector('#title').textContent === 'Outline calibration');
    await page.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
    const sourceReadyMilliseconds = Date.now() - started;
    await page.locator('[data-preset="iso"]').click();
    await waitForFrames(page);
    const widths = [];
    for (let zoom = 0; zoom < 2; zoom++) {
      const project = await projection(page);
      const image = await screenshot(page, `crossing-dpr${dpr}-zoom${zoom}`);
      const samples = [-0.5, 0, 0.5].map(y => contactWidth(image, project, y));
      const width = [...samples].sort((a, b) => a - b)[1];
      assert.ok(width >= 0.5 && width <= 3.5, `Contact ink should be about 1.5 CSS px, observed ${width} px at DPR ${dpr}/zoom ${zoom}`);
      widths.push(width);
      if (zoom === 0) {
        const before = await page.locator('#model').getAttribute('data-camera');
        await page.locator('#model canvas').hover();
        await page.mouse.wheel(0, -450);
        await page.waitForFunction(before => document.querySelector('#model').dataset.camera !== before, before);
        await waitForFrames(page);
      }
    }
    assert.ok(Math.abs(widths[0] - widths[1]) <= 1.5, `Zoom must preserve apparent contact ink width: ${widths}`);
    await page.locator('[data-preset="top"]').click();
    await waitForFrames(page);
    const project = await projection(page);
    const top = await screenshot(page, `occlusion-dpr${dpr}`);
    cleanPatch(top, project([0, 2, 4]));
    cleanPatch(top, project([4.5, 4.5, 0]));
    await page.locator('#cut').fill('0');
    await waitForFrames(page);
    const clipped = await screenshot(page, `clipped-dpr${dpr}`);
    let ink = 0;
    for (let y = 0; y < clipped.height; y++) for (let x = 0; x < clipped.width; x++) if (dark(clipped, x, y)) ink++;
    assert.ok(ink / (clipped.width * clipped.height) < 0.001, 'Fully clipped geometry must not leave ghost outline strokes');
    measurements.push({ dpr, widths, sourceReadyMilliseconds });
    console.log(`PASS screen-space contact/zoom/occlusion/clipping at DPR ${dpr}; widths ${widths.join('/')} CSS px`);
    await context.close();
  }
  assert.ok(Math.abs(measurements[0].widths[0] - measurements[1].widths[0]) <= 1.5, 'Device density must not double or halve CSS outline width');
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`${OUTPUT}/results.json`, JSON.stringify({ measurements, errors }, null, 2));
  await browser.close();
}
