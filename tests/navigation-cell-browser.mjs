/** Real worker and ordinary WASD acceptance for configurable navigation resolution. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import { serializeLevelSvgx } from '../src/vector/index.ts';
import { navigationDoorway } from './fixtures/navigation-doorway.ts';
import { startPreview } from '../src/cli/preview.ts';
import { launchBrowser } from '../website/tests/browser-helpers.mjs';

await mkdir('generated', { recursive: true });
const output = await mkdtemp('generated/navigation-cell-browser-');
const directory = await mkdtemp(join(tmpdir(), 'levelspec-nav-cell-'));
const file = join(directory, 'level.level.svgx');
const source = serializeLevelSvgx(navigationDoorway());
await writeFile(file, source);
const errors = [], results = [];
let server, website, browser;

/** Waits for an applied result rather than worker progress or a passing premap label. */
async function ready(page, cell) {
  await page.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
  await page.waitForFunction(value => document.querySelector('#nav-cell-status')?.textContent.startsWith(`Applied: ${value} m horizontal cells`), cell);
  assert.match(await page.locator('#nav-cell-status').textContent(), /body 1\.8 m tall, 0\.5 m wide/);
}
/** Reads the actual published pose, not the requested form coordinates. */
async function walkState(page) {
  return page.locator('#model').getAttribute('data-walk').then(JSON.parse);
}
/** Opens native details without changing application-owned DOM. */
async function open(page, id) {
  if (!(await page.locator(id).evaluate(element => element.open))) await page.locator(`${id} > summary`).click();
}
/** Uses the visible placement controls to start facing +X before the real doorway. */
async function startWalk(page) {
  await open(page, '#walk-controls');
  await page.locator('#walk-feet').fill('3 3 0');
  await page.locator('#walk-yaw').fill('0');
  await page.locator('#walk-pitch').fill('0');
  await page.locator('#walk-start').click();
  await page.waitForFunction(() => JSON.parse(document.querySelector('#model').dataset.walk).active);
}
/** Submits the real form and observes its synchronous invalidation before a fast worker can finish. */
async function applyCell(page, value) {
  await open(page, '#navigation-grid');
  await page.locator('#nav-cell').fill(value);
  return page.locator('#nav-cell-form').evaluate(form => {
    form.requestSubmit();
    const model = document.querySelector('#model');
    return {
      state: document.querySelector('#status').dataset.state,
      stale: model.dataset.stale,
      mode: model.dataset.mode,
      walkDisabled: document.querySelector('#walk-start').disabled,
    };
  });
}
/** Holds ordinary input long enough to observe the wall contact, sampling actual frames. */
async function coarseWalk(page) {
  await page.locator('#model canvas').focus();
  try {
    await page.keyboard.down('w');
    await page.waitForFunction(() => JSON.parse(document.querySelector('#model').dataset.walk).feet[0] > 3.3);
    // Deliberate movement observation: keep pushing at the throat for 90 rendered frames.
    const sample = await page.evaluate(async () => {
      const positions = [];
      for (let frame = 0; frame < 90; frame++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        positions.push(JSON.parse(document.querySelector('#model').dataset.walk).feet[0]);
      }
      return positions;
    });
    assert.ok(Math.max(...sample) < 3.85, 'Coarse grid must not carry the standing body through the throat');
    assert.ok(Math.abs(sample.at(-1) - sample.at(-10)) < 0.001, 'Continued input settles at the blocked throat');
    results.push({ scenario: 'coarse blocked', x: sample.at(-1) });
  } finally { await page.keyboard.up('w'); }
}
/** Fine navigation must move the same body all the way to the other side. */
async function fineWalk(page) {
  await page.locator('#model canvas').focus();
  try {
    await page.keyboard.down('w');
    await page.waitForFunction(() => JSON.parse(document.querySelector('#model').dataset.walk).feet[0] > 5, null, { timeout: 10000 });
  } finally { await page.keyboard.up('w'); }
  const pose = await walkState(page);
  assert.ok(pose.feet[0] > 5);
  assert.ok(Math.abs(pose.feet[1] - 3) < 0.02);
  results.push({ scenario: 'fine crossed', feet: pose.feet });
}

try {
  server = await startPreview(file, { port: 0, navigationCell: 0.125 });
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(server.url);
  await ready(page, 0.125);
  await startWalk(page);
  await coarseWalk(page);
  const changing = await applyCell(page, '0.0625');
  assert.deepEqual(changing, { state: 'busy', stale: 'true', mode: 'overview', walkDisabled: true });
  await ready(page, 0.0625);
  assert.equal(await page.locator('#model').getAttribute('data-mode'), 'overview');
  await startWalk(page);
  await fineWalk(page);
  await page.locator('#model canvas').screenshot({ path: join(output, 'fine-doorway-crossed.png') });

  const pose = await walkState(page);
  const appliedView = await page.locator('#model').getAttribute('data-view');
  const status = await page.locator('#nav-cell-status').textContent();
  const invalid = await applyCell(page, '0');
  assert.equal(invalid.state, 'ready');
  assert.equal(invalid.stale, 'false');
  assert.equal(invalid.mode, 'walk');
  assert.equal(await page.locator('#nav-cell-error').isVisible(), true);
  assert.match(await page.locator('#nav-cell-error').textContent(), /0\.025.*0\.5/);
  assert.equal(await page.locator('#nav-cell-status').textContent(), status);
  assert.equal(await page.locator('#model').getAttribute('data-view'), appliedView);
  assert.deepEqual(await walkState(page), pose, 'Invalid input preserves the applied walk and model');
  assert.equal(new URL(page.url()).searchParams.get('nav-cell'), '0.0625');

  await page.locator('#nav-cell').fill('0.0625');
  const walkingURL = await page.locator('#walk-link').getAttribute('href');
  assert.equal(new URL(walkingURL).searchParams.get('nav-cell'), '0.0625');
  assert.ok(new URL(walkingURL).searchParams.has('walk-feet'));
  await page.keyboard.press('Escape');
  const cameraURL = await page.locator('#view-link').getAttribute('href');
  assert.equal(new URL(cameraURL).searchParams.get('nav-cell'), '0.0625');
  assert.ok(new URL(cameraURL).searchParams.has('camera'));
  await page.goto(walkingURL);
  await ready(page, 0.0625);
  await page.waitForFunction(() => document.querySelector('#model').dataset.mode === 'walk');
  const replayed = await walkState(page);
  assert.ok(Math.hypot(...replayed.feet.map((value, index) => value - pose.feet[index])) < 0.1);
  await page.reload();
  await ready(page, 0.0625);
  await page.waitForFunction(() => document.querySelector('#model').dataset.mode === 'walk');

  await writeFile(file, source.replace('name="navigation-doorway"', 'name="Refreshed doorway"'));
  await page.waitForFunction(() => document.querySelector('#title').textContent === 'Refreshed doorway');
  await ready(page, 0.0625);

  // Coincident visible wall faces produce real partial geometry with a terminal compiler error.
  const overlapping = navigationDoorway();
  overlapping.name = 'Overlapping doorway jamb';
  overlapping.props.push({ ...structuredClone(overlapping.props[0]), id: 'duplicate-jamb' });
  await writeFile(file, serializeLevelSvgx(overlapping));
  await page.waitForFunction(() => document.querySelector('#title').textContent === 'Overlapping doorway jamb'
    && document.querySelector('#status').dataset.state === 'ready');
  await open(page, '#navigation-grid');
  const unavailable = await page.locator('#nav-cell-status').textContent();
  assert.match(unavailable, /unavailable/i, 'Finished partial geometry must report unavailable navigation');
  assert.doesNotMatch(unavailable, /rebuilding|applied:/i, 'Terminal failure cannot retain a busy or previously applied claim');
  assert.match(await page.locator('#diagnostics').textContent(), /SURFACE_COPLANAR/);
  assert.equal(await page.locator('#walk').isDisabled(), true);
  assert.equal(await page.locator('#walk-start').isDisabled(), true);
  assert.equal(await page.locator('#model').getAttribute('data-stale'), 'false');
  assert.equal(await page.locator('#model').getAttribute('data-mode'), 'overview');
  await page.waitForFunction(() => Number(document.querySelector('#model').dataset.triangles) > 0);
  assert.equal(await page.locator('#nav-cell').inputValue(), '0.0625');
  results.push({ scenario: 'partial geometry without navigation', status: unavailable });
  await writeFile(file, source);
  await page.waitForFunction(() => document.querySelector('#title').textContent === 'navigation-doorway');
  await ready(page, 0.0625);
  await startWalk(page);
  await fineWalk(page);

  await writeFile(file, '<broken>');
  await page.locator('#status[data-state="error"]').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('#walk-start').isDisabled(), true);
  await page.locator('#retry').click();
  await page.locator('#status[data-state="error"]').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('#nav-cell').inputValue(), '0.0625');
  await writeFile(file, source);
  await page.locator('#retry').click();
  await ready(page, 0.0625);
  await startWalk(page);
  await fineWalk(page);

  const malformed = new URL(server.url);
  malformed.searchParams.set('nav-cell', 'NaN');
  await page.goto(malformed.href);
  await page.locator('#status[data-state="error"]').waitFor();
  await open(page, '#navigation-grid');
  assert.equal(await page.locator('#nav-cell-error').isVisible(), true);
  assert.match(await page.locator('#nav-cell-error').textContent(), /0\.025.*0\.5/);
  assert.equal(await page.locator('#walk-start').isDisabled(), true);
  await applyCell(page, '0.0625');
  await ready(page, 0.0625);
  await startWalk(page);
  await fineWalk(page);
  assert.equal(await readFile(file, 'utf8'), source, 'Inspection configuration never rewrites authored XML');

  // Use the actual curated entry and shared worker, isolating Vite caches and disabling HMR.
  website = await createServer({ configFile: 'vite.website.config.ts', cacheDir: join(directory, 'site-cache'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
  await website.listen();
  const site = await browser.newPage();
  site.on('pageerror', error => errors.push(error.message));
  const siteURL = new URL(website.resolvedUrls.local[0]);
  siteURL.searchParams.set('nav-cell', '0.0625');
  await site.goto(siteURL.href);
  await site.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
  assert.match(await site.locator('#nav-cell-status').textContent(), /Applied: 0\.0625 m horizontal cells/);
  await applyCell(site, '0.125');
  await site.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
  assert.match(await site.locator('#nav-cell-status').textContent(), /Applied: 0\.125 m horizontal cells/);
  await site.close();
  assert.deepEqual(errors, []);
  console.log('PASS real WASD coarse/fine doorway, same standing body, rebuild/stale/invalid recovery, terminal partial geometry, URL/reload, source watch/retry and shared website worker');
} finally {
  await writeFile(join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2) + '\n');
  await browser?.close();
  await website?.close();
  await server?.close();
  await rm(directory, { recursive: true, force: true });
  console.log('Navigation cell evidence: ' + output);
}
