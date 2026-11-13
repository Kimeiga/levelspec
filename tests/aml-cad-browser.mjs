/** Native architectural profiles and composed materials in the real shared reviewer. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startPreview } from '../src/cli/preview.ts';
import { launchBrowser, waitForFrames } from './browser/support/browser.mjs';

const output = 'generated/aml-phase2-browser';
await mkdir(output, { recursive: true });
let server, browser;
try {
  server = await startPreview(resolve('tests/fixtures/aml/architecture-cad.aml'), { port: 0 });
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(server.url);
  await page.waitForFunction(() => document.querySelector('#status')?.dataset.state === 'ready', null, { timeout: 60000 });
  assert.equal(await page.locator('#title').textContent(), 'Architecture and CAD study');
  await page.locator('#appearance').selectOption('materials');
  await waitForFrames(page, 3);
  await page.screenshot({ path: `${output}/composed-materials.png` });
  await page.locator('#view-2d').click();
  const screen = page.locator('#plan polyline[data-object="screen"]').first();
  const position = await screen.evaluate(element => {
    const point = element.getPointAtLength(element.getTotalLength() * .12), matrix = element.getScreenCTM();
    return { x: matrix.a * point.x + matrix.c * point.y + matrix.e, y: matrix.b * point.x + matrix.d * point.y + matrix.f };
  });
  await page.mouse.click(position.x, position.y);
  await page.locator('#architecture-inspection').waitFor({ state: 'visible' });
  assert.match(await page.locator('#architecture-inspection').textContent(), /Object: screen/);
  assert.match(await page.locator('#architecture-inspection').textContent(), /Assemblies: shell/);
  assert.match(await page.locator('#architecture-inspection').textContent(), /Source: line/);
  assert.match(await page.locator('#architecture-inspection').textContent(), /unrolled distance and height/);
  assert.ok(await page.locator('#architecture-inspection svg polyline').count() > 0);
  await page.screenshot({ path: `${output}/source-profiles.png` });
  await page.locator('#view-3d').click();
  await page.locator('#walk').click();
  await page.waitForFunction(() => JSON.parse(document.querySelector('#model').dataset.walk).active);
  const feet = () => page.locator('#model').evaluate(element => JSON.parse(element.dataset.walk).feet);
  const route = [await feet()];
  for (const [key, axis, threshold, increasing] of [['w', 0, 5.5, true], ['d', 1, 4.2, true], ['w', 0, 9, true], ['a', 1, 3, false]]) {
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(({ axis, threshold, increasing }) => {
        const position = JSON.parse(document.querySelector('#model').dataset.walk).feet;
        return increasing ? position[axis] >= threshold : position[axis] <= threshold;
      }, { axis, threshold, increasing }, { timeout: 10000 });
    } finally { await page.keyboard.up(key); }
    route.push(await feet());
  }
  assert.ok(route.every(position => Math.abs(position[2]) < .05));
  assert.ok(Math.abs(route.at(-1)[0] - 9) < .2 && Math.abs(route.at(-1)[1] - 3) < .2);
  await page.screenshot({ path: `${output}/walk-finish.png` });
  await (await import('node:fs/promises')).writeFile(`${output}/walk.json`, JSON.stringify(route, null, 2));
  assert.deepEqual(errors, []);
  console.log(`AML CAD browser acceptance passed: ${output}`);
} finally {
  await browser?.close(); await server?.close();
}
