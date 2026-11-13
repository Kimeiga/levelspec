/** Capture named views from the XML browser reviewer with verified loaded-input provenance. */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {startPreview} from '../src/cli/preview.ts';
import {launchBrowser, waitForFrames} from '../tests/browser/support/browser.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Reject ambiguous names and invalid camera settings before starting a server or writing output. */
export function validateViews(views) {
  assert.ok(Array.isArray(views) && views.length, 'Provide a nonempty array of named views');
  const names = new Set();
  for (const view of views) {
    assert.match(view.id ?? '', /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, 'Unsafe view id');
    assert.ok(!names.has(view.id), 'Duplicate view id');
    names.add(view.id);
    for (const key of ['position', 'target']) {
      assert.ok(Array.isArray(view[key]) && view[key].length === 3 && view[key].every(Number.isFinite), `Invalid ${key}`);
    }
    assert.notDeepEqual(view.position, view.target, 'Camera must differ from target');
    assert.ok(['perspective', 'orthographic'].includes(view.projection), 'Specify projection');
    for (const key of ['fov', 'viewHeight', 'roll', 'frameAspect']) {
      if (view[key] !== undefined) assert.ok(Number.isFinite(view[key]), `Invalid ${key}`);
    }
    if (view.fov !== undefined) assert.ok(view.fov > 0 && view.fov < 180, 'Invalid fov');
    for (const key of ['viewHeight', 'frameAspect']) {
      if (view[key] !== undefined) assert.ok(view[key] > 0, `Invalid ${key}`);
    }
    if (view.appearance !== undefined) assert.ok(['wireframe', 'materials', 'full-render'].includes(view.appearance), 'Invalid appearance');
  }
}

/**
 * Archive the source/companion buffers delivered by preview and actual browser images.
 * Provenance identifies loaded inputs, not camera correspondence or architectural acceptance.
 * Output must be new; a failed run retains diagnostics without a success capture.json.
 */
export async function captureLevel(source, output, views, options = {}) {
  validateViews(views);
  const file = resolve(source);
  const directory = resolve(output);
  const bytes = await readFile(file);
  await mkdir(resolve(directory, '..'), {recursive: true});
  await mkdir(directory);
  let server, browser;
  const errors = [];
  const evidence = [];
  let loadedIdentity;
  try {
    server = await startPreview(file, {port: 0, navigationCell: options.navigationCell ?? .125});
    browser = await launchBrowser();
    const page = await browser.newPage({viewport: {width: 1280, height: 1024}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
    page.on('pageerror', error => errors.push(error.message));
    // Freeze the exact payload before the browser compiles it; HMR cannot mix revisions.
    let payload;
    await page.route('**/__levelspec/*/source', async route => {
      payload ??= route.fetch().then(response => response.json());
      await route.fulfill({json: await payload});
    });
    for (const view of views) {
      const url = new URL(server.url);
      const settings = {camera: view.position.join(' '), target: view.target.join(' '), projection: view.projection,
        fov: view.fov ?? 55, 'view-height': view.viewHeight ?? 20, roll: view.roll ?? 0,
        appearance: view.appearance ?? 'full-render', 'frame-aspect': view.frameAspect ?? 1.25};
      for (const [key, value] of Object.entries(settings)) url.searchParams.set(key, String(value));
      const [response] = await Promise.all([
        page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/source')),
        page.goto(url.href),
      ]);
      const loaded = await response.json();
      assert.equal(hash(Buffer.from(loaded.text)), hash(bytes), 'Preview loaded a different XML source');
      const companions = {};
      for (const [name, value] of Object.entries(loaded.files)) {
        const buffer = Buffer.from(value);
        const identity = hash(buffer);
        await writeFile(join(directory, identity + '.bin'), buffer);
        companions[name] = identity;
      }
      const identity = JSON.stringify({source: hash(bytes), companions});
      if (loadedIdentity !== undefined) assert.equal(identity, loadedIdentity, 'Inputs changed between views');
      loadedIdentity = identity;
      await page.locator('#status[data-state="ready"]').waitFor({timeout: 60000});
      await page.locator('#dimensions').uncheck();
      await waitForFrames(page, 3);
      assert.deepEqual(errors, [], 'Browser errors during capture');
      const canvas = page.locator('#model canvas');
      await canvas.screenshot({path: join(directory, view.id + '.png')});
      evidence.push({id: view.id, url: url.href, state: await page.locator('#model').evaluate(element => ({...element.dataset})), canvas: await canvas.boundingBox()});
    }
    assert.equal(hash(await readFile(file)), hash(bytes), 'Source changed during capture');
    assert.deepEqual(errors, [], 'Browser errors during capture');
    await writeFile(join(directory, 'loaded.aml'), bytes);
    const result = {...JSON.parse(loadedIdentity), sourceFile: file, views: evidence, errors};
    await writeFile(join(directory, 'capture.json'), JSON.stringify(result, null, 2) + '\n');
    return result;
  } catch (error) {
    await writeFile(join(directory, 'failure.json'), JSON.stringify({message: String(error), errors}, null, 2));
    throw error;
  } finally {
    try { await browser?.close(); } finally { await server?.close(); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [source, output, manifest] = process.argv.slice(2);
  if (!source || !output || !manifest) throw new Error('Usage: node tools/capture-level.mjs SOURCE.aml NEW_OUTPUT VIEWS.json');
  const result = await captureLevel(source, output, JSON.parse(await readFile(manifest, 'utf8')));
  console.log(JSON.stringify({output: resolve(output), source: result.source, views: result.views.map(view => view.id)}));
}
