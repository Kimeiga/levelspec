/** Capture named reviewer views of an AML source with the loaded-source hash recorded.
 *  Usage: node projects/dragon-ford/capture.mjs <level.aml> <new-output-dir> <views.json> [id,id,...]
 *  View: {id, position:[x,y,z], target:[x,y,z], projection:'perspective'|'orthographic', height?, fov?, roofs?, appearance?}
 *  or an eye-level view {id, feet:[x,y,z], lookAt:[x,y,z], stance?:'stand'|'crouch', roofs?} (camera placed at the inspection eye). */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {startPreview} from '../../src/cli/preview.ts';
import {launchBrowser, waitForFrames} from '../../tests/browser/support/browser.mjs';

const [sourceArg, output, viewsPath, only] = process.argv.slice(2);
if (!viewsPath) throw new Error('Usage: capture.mjs level.aml NEW_DIR views.json [ids]');
const source = resolve(sourceArg), wanted = only?.split(',');
const hash = x => createHash('sha256').update(x).digest('hex');
const EYE = {stand: 1.86, crouch: 1.023};
const bytes = await readFile(source);
const views = JSON.parse(await readFile(viewsPath, 'utf8')).filter(v => !wanted || wanted.includes(v.id)).map(v => {
  if (!v.feet) return v;
  const eye = EYE[v.stance ?? 'stand'];
  return {...v, position: [v.feet[0], v.feet[1], v.feet[2] + eye], target: [v.lookAt[0], v.lookAt[1], v.lookAt[2] + (v.lookEye ?? 1.5)], projection: 'perspective', fov: v.fov ?? 65};
});
await mkdir(output, {recursive: true});
let browser, server; const captures = [], errors = [];
try {
  server = await startPreview(source, {port: 0, navigationCell: .125}); browser = await launchBrowser();
  const page = await browser.newPage({viewport: {width: 1600, height: 1200}, reducedMotion: 'reduce'}); page.on('pageerror', e => errors.push(e.message));
  let payload; await page.route('**/__levelspec/*/source', async route => { payload ??= route.fetch().then(r => r.json()); const loaded = await payload; assert.equal(hash(loaded.text), hash(bytes)); await route.fulfill({json: loaded}); });
  await page.goto(server.url); await page.locator('#status[data-state="ready"]').waitFor({timeout: 240000});
  await page.locator('#dimensions').uncheck(); await page.locator('#camera-controls summary').click(); await page.locator('#frame-controls summary').click(); await page.locator('#frame-mode').selectOption('1.3333333333333333');
  for (const v of views) {
    const want = v.appearance ?? 'materials';
    await page.locator('#appearance').selectOption(want); await page.locator('#roofs').setChecked(v.roofs ?? true);
    const fov = v.fov ?? 60;
    await page.evaluate(({v, fov}) => { for (const [id, value] of Object.entries({projection: v.projection, 'camera-position': v.position.join(' '), 'camera-target': v.target.join(' '), 'camera-height': String(v.height ?? 60), 'camera-fov': String(fov), 'camera-roll': '0'})) document.getElementById(id).value = value; document.getElementById('camera-form').requestSubmit(); }, {v, fov});
    await page.waitForFunction(v => { const s = JSON.parse(document.getElementById('model').dataset.view ?? '{}'); const same = (a, b) => a?.every((n, i) => Math.abs(n - b[i]) < 1e-4); return s.projection === v.projection && same(s.position, v.position) && same(s.target, v.target); }, v);
    await waitForFrames(page, 4); assert.equal(await page.locator('#camera-error').textContent(), '');
    await page.locator('#model canvas').screenshot({path: resolve(output, v.id + '.png')});
    captures.push({...v, appearanceUsed: want, fov, frameAspect: 4 / 3, roofsShown: await page.locator('#roofs').isChecked()});
  }
  assert.deepEqual(errors, []); assert.equal(hash(await readFile(source)), hash(bytes));
  await writeFile(resolve(output, 'capture.json'), JSON.stringify({source, sourceSha256: hash(bytes), captures, errors, notes: 'Camera-form optical views of the compiled source. Eye-level views place the camera at the inspection eye offset above declared feet; they do not prove body placement (see verification.json for physical placement).'}, null, 1));
} catch (error) { await writeFile(resolve(output, 'failure.json'), JSON.stringify({error: String(error), errors}, null, 1)); throw error; }
finally { await browser?.close(); await server?.close(); }
console.log(output, captures.length, 'views');
