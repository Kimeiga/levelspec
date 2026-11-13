/** Real shared-reviewer circulation, source comparisons, and continuous local walks. */
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startPreview } from '../src/cli/preview.ts';
import { launchBrowser, waitForFrames } from './browser/support/browser.mjs';
import { parseAml } from 'levelspec';

const output = 'generated/aml-phase3-browser'; await mkdir(output, { recursive: true });
const source = parseAml(await readFile('examples/daiban.aml', 'utf8'));
let server, browser;
const results = [], errors = [];
try {
  server = await startPreview(resolve('examples/daiban.aml'), { port: 0 }); browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.on('pageerror', error => errors.push(error.message));
  const ready = () => page.waitForFunction(() => document.querySelector('#status')?.dataset.state === 'ready', null, { timeout: 60000 });
  await page.goto(server.url); await ready();
  await page.locator('#appearance').selectOption('materials'); await waitForFrames(page, 3);
  await page.screenshot({ path: `${output}/overview.png` });
  await page.locator('#view-2d').click(); await page.screenshot({ path: `${output}/plan.png` }); await page.locator('#view-3d').click();
  for (const reference of source.references) {
    const url = new URL(server.url);
    const forward = new Vector3(...reference.camera.target).sub(new Vector3(...reference.camera.position)).normalize();
    const baseline = new Vector3(0,0,1).addScaledVector(forward, -forward.z).normalize();
    const up = new Vector3(...reference.camera.up).addScaledVector(forward, -new Vector3(...reference.camera.up).dot(forward)).normalize();
    const roll = Math.atan2(forward.dot(baseline.clone().cross(up)), baseline.dot(up)) * 180 / Math.PI;
    for (const [key, value] of Object.entries({ projection: 'perspective', camera: reference.camera.position.join(','), target: reference.camera.target.join(','), fov: reference.camera.fov, 'frame-aspect': reference.width / reference.height, appearance: 'materials', roll })) url.searchParams.set(key, String(value));
    await page.goto(url.href); await ready(); await waitForFrames(page, 3);
    await page.locator('#model canvas').screenshot({ path: `${output}/${reference.id}.png` });
    results.push({ reference: reference.id, camera: reference.camera, actual: await page.locator('#model').evaluate(element => ({ view: element.dataset.view, viewMatrix: element.dataset.viewMatrix, projectionMatrix: element.dataset.projectionMatrix })) });
  }
  await page.goto(server.url); await ready();
  const routes = [
    { id: 'lower-flight-route', start: [0.7, .5, 0], legs: [['d', 1, 6.5, true]], end: [.7, 6.5, 2.4] },
    { id: 'near-flight-route', start: [5.7, .6, 4.8], legs: [['d', 1, 6.5, true]], end: [5.7, 6.5, 7.4] },
    { id: 'middle-gallery-route', start: [2, .65, 4.8], legs: [['s', 0, .7, false], ['d', 1, 6, true]], end: [.7, 6, 4.8] },
    { id: 'incline-route', start: [7.3, 3, 7.4], legs: [['d', 1, 7.8, true]], end: [7.3, 7.8, 9.3] },
  ];
  const feet = () => page.locator('#model').evaluate(element => JSON.parse(element.dataset.walk).feet);
  for (const route of routes) {
    await page.keyboard.press('Escape');
    if (!(await page.locator('#walk-controls').evaluate(element => element.open))) await page.locator('#walk-controls > summary').click();
    await page.locator('#walk-feet').fill(route.start.join(' ')); await page.locator('#walk-yaw').fill('0'); await page.locator('#walk-pitch').fill('0'); await page.locator('#walk-form button').click();
    await page.waitForFunction(() => JSON.parse(document.querySelector('#model').dataset.walk).active);
    const trace = [await feet()];
    for (const [key, axis, threshold, increasing] of route.legs) {
      await page.keyboard.down(key);
      try { await page.waitForFunction(({ axis, threshold, increasing }) => { const p = JSON.parse(document.querySelector('#model').dataset.walk).feet; return increasing ? p[axis] >= threshold : p[axis] <= threshold; }, { axis, threshold, increasing }, { timeout: 10000 }); }
      finally { await page.keyboard.up(key); }
      trace.push(await feet());
    }
    assert.ok(Math.hypot(...trace.at(-1).map((n, i) => n - route.end[i])) < .25, route.id);
    await page.screenshot({ path: `${output}/${route.id}.png` }); results.push({ route: route.id, trace });
  }
  assert.deepEqual(errors, []); console.log('PASS native Daiban comparisons and four continuous local walkthroughs');
} finally {
  await writeFile(`${output}/capture.json`, JSON.stringify({ results, errors }, null, 2));
  await browser?.close(); await server?.close();
}
