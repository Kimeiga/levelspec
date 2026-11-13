import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startPreview } from '../../src/cli/preview.ts';
import { launchBrowser, waitForFrames } from '../../tests/browser/support/browser.mjs';

const source = resolve(process.argv[2] ?? 'projects/tidebreak/level.aml');
const output = process.argv[3];
if (!output) throw new Error('Usage: node projects/tidebreak/capture.mjs SOURCE.aml NEW_DIRECTORY [view-id,...]');
await mkdir(output);
const text = await readFile(source, 'utf8');
const hash = data => createHash('sha256').update(data).digest('hex');
const views = [
  { id: 'overview', position: [-105, -130, 100], target: [0, 4, 0], projection: 'orthographic', height: 128, roofs: false, appearance: 'full-render' },
  { id: 'architecture', position: [110, -120, 95], target: [0, 4, 1], projection: 'orthographic', height: 128, roofs: true, appearance: 'materials' },
  { id: 'top', position: [0, 4.9, 160], target: [0, 5, 0], projection: 'orthographic', height: 112, roofs: false, appearance: 'full-render' },
  { id: 'dock-approach', position: [-20, -18, -2.326], target: [-12, 18, -2.3], projection: 'perspective', roofs: true, appearance: 'materials' },
  { id: 'dock-head', position: [-12, 18, -2.326], target: [-4, 8, -2.3], projection: 'perspective', roofs: true, appearance: 'materials' },
  { id: 'hall', position: [20, -20, 1.674], target: [28, 18, 3], projection: 'perspective', roofs: true, appearance: 'materials' },
  { id: 'gallery', position: [28, 21.5, 5.674], target: [28, 12, 1.5], projection: 'perspective', roofs: true, appearance: 'materials' },
  { id: 'D2-arrival', position: [10.8, 8, 1.674], target: [16, 2, 1.6], projection: 'perspective', roofs: true, appearance: 'materials' },
  { id: 'D2-opponent', position: [16, 2, 1.674], target: [10.8, 8, 1.674], projection: 'perspective', roofs: true, appearance: 'materials' },
  { id: 'D2-threshold', position: [10.8, 3, 1.674], target: [17, 3, 1.674], projection: 'perspective', roofs: true, appearance: 'materials' },
  { id: 'D2-follower', position: [10.8, 5.5, 1.674], target: [17, 3, 1.674], projection: 'perspective', roofs: true, appearance: 'materials' },
];
const requested = process.argv[4]?.split(',');
if (requested?.some(id => !views.some(view => view.id === id))) throw new Error('Unknown requested view');
let server, browser;
const errors = [], captures = [];
try {
  server = await startPreview(source, { port: 0, navigationCell: .125 });
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1450, height: 1100 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  let payload;
  await page.route('**/__levelspec/*/source', async route => {
    payload ??= route.fetch().then(response => response.json());
    const loaded = await payload; assert.equal(hash(loaded.text), hash(text));
    await route.fulfill({ json: loaded });
  });
  await page.goto(server.url);
  await page.locator('#status[data-state="ready"]').waitFor({ timeout: 90000 });
  await page.locator('#dimensions').uncheck();
  await page.locator('#camera-controls summary').click();
  for (const view of views) {
    if (requested && !requested.includes(view.id)) continue;
    await page.locator('#appearance').selectOption(view.appearance);
    await page.locator('#roofs').setChecked(view.roofs);
    // Submit the visible form atomically: render callbacks synchronize unfocused
    // fields, so sequential fills can silently replace an earlier pending field.
    await page.evaluate(view => {
      for (const [id, value] of Object.entries({
        projection: view.projection, 'camera-position': view.position.join(' '),
        'camera-target': view.target.join(' '), 'camera-height': String(view.height ?? 35),
        'camera-fov': '72', 'camera-roll': '0',
      })) document.getElementById(id).value = value;
      document.getElementById('camera-form').requestSubmit();
    }, view);
    await page.waitForFunction(view => {
      const actual = JSON.parse(document.getElementById('model').dataset.view ?? '{}');
      const same = (a, b) => a?.every((value, i) => Math.abs(value - b[i]) < .00001);
      return actual.projection === view.projection && same(actual.position, view.position)
        && same(actual.target, view.target) && Math.abs(actual.viewHeight - (view.height ?? 35)) < .00001;
    }, view);
    await waitForFrames(page, 4);
    assert.equal(await page.locator('#camera-error').textContent(), '');
    await page.locator('#model canvas').screenshot({ path: resolve(output, `${view.id}.png`) });
    captures.push({ ...view, state: await page.locator('#model').evaluate(element => ({ ...element.dataset })) });
  }
  await page.locator('#view-2d').click(); await waitForFrames(page, 3);
  await page.locator('#plan').screenshot({ path: resolve(output, 'native-plan.png') });
  assert.deepEqual(errors, []); assert.equal(hash(await readFile(source)), hash(text));
  await writeFile(resolve(output, 'capture.json'), JSON.stringify({ source, sourceSha256: hash(text), captures, errors }, null, 2));
  await writeFile(resolve(output, 'loaded.aml'), text);
} catch (error) {
  await writeFile(resolve(output, 'failure.json'), JSON.stringify({ error: String(error), errors }, null, 2)); throw error;
} finally { await browser?.close(); await server?.close(); }
console.log(output);
