import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startPreview } from '../../src/cli/preview.ts';
import { launchBrowser, waitForFrames } from '../../tests/browser/support/browser.mjs';

const source = resolve(process.argv[2] ?? 'projects/last-light-reboot/level.aml');
const output = process.argv[3];
if (!output) throw new Error('Usage: node projects/last-light-reboot/capture.mjs SOURCE.aml NEW_DIRECTORY [view-id,...]');
await mkdir(output);
const text = await readFile(source, 'utf8');
const hash = data => createHash('sha256').update(data).digest('hex');
const views = JSON.parse(await readFile(new URL('./views-c02.json', import.meta.url), 'utf8')); 
const requested = process.argv[4]?.split(',');
if (requested?.some(id => !views.some(view => view.id === id))) throw new Error('Unknown requested view');
let server, browser;
const errors = [], captures = [];
try {
  server = process.env.LASTLIGHT_NATIVE_PREVIEW === '1' ? await startPreview(source,{port:0,navigationCell:.125}) : await (await import('./experiments/c02/artifact-review.mjs')).startArtifactReview('generated/last-light-reboot-c02-native');
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
  if(process.env.LASTLIGHT_NATIVE_PREVIEW !== '1') await page.waitForFunction(hash => document.documentElement.dataset.artifactSource === hash, hash(text));
  await page.locator('#status[data-state="ready"]').waitFor({ timeout: 90000 });
  await page.locator('#dimensions').uncheck();
  await page.locator('#frame-controls').evaluate(e=>e.open=true);
  await page.locator('#frame-mode').selectOption('1.3333333333333333');
  await page.locator('#camera-controls summary').click();
  for (const view of views) {
    if (requested && !requested.includes(view.id)) continue;
    await page.locator('#appearance').selectOption(view.appearance);
    await page.locator('#roofs').setChecked(view.roofs);
    await page.locator('#cut').fill(String(view.cut ?? 1));
    await page.locator('#cut').dispatchEvent('input');
    // Submit the visible form atomically: render callbacks synchronize unfocused
    // fields, so sequential fills can silently replace an earlier pending field.
    await page.evaluate(view => {
      for (const [id, value] of Object.entries({
        projection: view.projection, 'camera-position': view.position.join(' '),
        'camera-target': view.target.join(' '), 'camera-height': String(view.height ?? 35),
        'camera-fov': String(view.fov ?? 75), 'camera-roll': '0',
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
  await writeFile(resolve(output, 'capture.json'), JSON.stringify({ source, sourceSha256: hash(text), transport:process.env.LASTLIGHT_NATIVE_PREVIEW==='1'?'Ordinary native preview; public camera form after ready; actual dataset.view assertions.':'Artifact-backed exact native compilation; historical failed report retained. Unmodified mountReviewer renderer/WalkMotion.', captures, errors }, null, 2));
  await writeFile(resolve(output, 'loaded.aml'), text);
} catch (error) {
  await writeFile(resolve(output, 'failure.json'), JSON.stringify({ error: String(error), errors }, null, 2)); throw error;
} finally { await browser?.close(); await server?.close(); }
console.log(output);
