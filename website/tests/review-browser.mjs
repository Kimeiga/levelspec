import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { createRequire } from 'node:module';
import { launchBrowser, testContext, waitForFrames } from './browser-helpers.mjs';
import { amlSource } from '../../tests/fixtures/aml-source.mjs';

const SITE = process.env.BASE_URL || 'http://127.0.0.1:48217/levelspec/';
const VIEWER = process.env.VIEWER_URL || 'http://127.0.0.1:48218/';
const OUTPUT = process.env.QA_OUTPUT || 'website-qa/reviewer';
await mkdir(OUTPUT, { recursive: true });
const browser = await launchBrowser();
const results = [];
const measurements = [];
const errors = [];
const require = createRequire(import.meta.url);
const axe = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');

/** Records uncaught failures and GL diagnostics, including driver warnings. */
function captureErrors(page, surface) {
  page.on('pageerror', error => errors.push(`${surface}: ${error.message}`));
  page.on('console', message => {
    const text = message.text();
    if (message.type() === 'error' || (message.type() === 'warning' && /GL_INVALID|INVALID_OPERATION|WebGL.*error/i.test(text))) {
      const entry = `${surface}: ${text}`;
      if (!errors.includes(entry)) errors.push(entry);
    }
  });
}

/** Waits for the real compile/validation worker and one delivered GPU frame. */
async function ready(page, webgl = true) {
  try {
    await page.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
  } catch (error) {
    throw new Error(`Reviewer never became ready: ${await page.locator('#status').innerText()}`, { cause: error });
  }
  if (webgl) await page.locator('#model[data-frames]').waitFor({ state: 'attached' });
  await waitForFrames(page);
}

/** Reports independent scenarios while preserving the failure's full stack. */
async function scenario(name, action) {
  await action();
  results.push({ name, passed: true });
  console.log(`PASS ${name}`);
}

/** Audits the real rendered interface against WCAG A/AA rules. */
async function audit(page, name) {
  await page.addScriptTag({ content: axe });
  const result = await page.evaluate(() => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  }));
  await writeFile(`${OUTPUT}/accessibility-${name}.json`, JSON.stringify(result.violations, null, 2));
  assert.deepEqual(result.violations.map(issue => ({ id: issue.id, nodes: issue.nodes.map(node => node.target) })), [], `Accessibility: ${name}`);
}

/** Checks the CAD-like frame through real layout rather than CSS source spelling. */
async function compactWorkspace(page) {
  const layout = await page.evaluate(() => ({
    header: document.querySelector('header').getBoundingClientRect().height,
    viewport: document.querySelector('.viewport').getBoundingClientRect().height,
    height: innerHeight,
    documentHeight: document.documentElement.scrollHeight,
    buttons: [...document.querySelectorAll('.toolbar button')].filter(button => !button.hidden).map(button => button.getBoundingClientRect().height),
  }));
  assert.ok(layout.header <= 40, `Tool header must stay compact: ${layout.header} px`);
  assert.ok(layout.viewport / layout.height > 0.8, 'Architectural viewport should occupy at least 80% of desktop height');
  assert.ok(layout.documentHeight <= layout.height + 1, 'Reviewer should fill the window without page scrolling');
  assert.ok(layout.buttons.every(height => height <= 32), 'Desktop toolbar controls should stay compact');
}

/** Counts pixel changes without treating screenshot equality as geometric proof. */
function changedPixels(first, second) {
  const a = PNG.sync.read(first), b = PNG.sync.read(second);
  assert.equal(a.width, b.width);
  assert.equal(a.height, b.height);
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 24) changed++;
  }
  return changed / (a.width * a.height);
}

/** Checks that a fitted viewport actually contains a visible architectural render. */
async function renderedGeometry(page, name) {
  const canvas = page.locator('#model canvas');
  const screenshot = await canvas.screenshot({ path: `${OUTPUT}/${name}.png` });
  const image = PNG.sync.read(screenshot);
  let ink = 0, borderInk = 0, borderPixels = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    const pixel = i / 4, x = pixel % image.width, y = Math.floor(pixel / image.width);
    const dark = Math.min(image.data[i], image.data[i + 1], image.data[i + 2]) < 220;
    if (dark) ink++;
    if (x < 2 || x >= image.width - 2 || y < 2 || y >= image.height - 2) {
      borderPixels++;
      if (dark) borderInk++;
    }
  }
  assert.ok(borderInk / borderPixels < 0.01, 'Fit must leave architectural geometry inside the canvas edges');
  assert.ok(ink / (image.width * image.height) > 0.005, 'Fitted 3D view must show real geometry rather than an empty canvas');
  return screenshot;
}

/** Obtains the constrained walking position, in meters. */
async function position(page) {
  return page.locator('#model').evaluate(node => node.dataset.player.split(',').map(Number));
}

/** Uses native keyboard input until a meaningful measured displacement occurs. */
async function walkForward(page, before) {
  try {
    await page.keyboard.down('w');
    await page.waitForFunction(before => {
      const after = document.querySelector('#model')?.dataset.player?.split(',').map(Number);
      return after && Math.hypot(after[0] - before[0], after[1] - before[1]) > 0.25;
    }, before, { timeout: 15000 });
  } finally {
    await page.keyboard.up('w');
  }
}

try {
  for (const [surface, url] of [['site', SITE], ['viewer', VIEWER]]) {
    const context = await testContext(browser, { viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    captureErrors(page, surface);
    const external = new Set();
    page.on('request', request => {
      const requestURL = new URL(request.url());
      if (requestURL.protocol.startsWith('http') && requestURL.origin !== new URL(url).origin) external.add(requestURL.origin);
    });
    const started = Date.now();
    await page.goto(url);
    await ready(page);
    await scenario(`${surface}: production load, local fonts and visible orthographic geometry`, async () => {
      assert.equal(await page.locator('#title').innerText(), surface === 'viewer' ? 'Dust II · CS2 blockout' : 'Lantern Court');
      assert.equal(await page.locator('#appearance').inputValue(), 'flat');
      assert.equal(await page.locator('#walk').isEnabled(), true);
      if (surface === 'viewer') {
        const triangles = Number(await page.locator('#model').getAttribute('data-triangles'));
        assert.ok(triangles > 1000, 'Default Dust II must render substantial compiled geometry');
        measurements.push({ source: 'examples/dust2.aml', sourceReadyMilliseconds: Date.now() - started, triangles });
      }
      assert.equal(await page.locator('.reviewer').getAttribute('aria-busy'), 'false');
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.fonts.check('16px "Super Pixel Bitmap"')), true);
      assert.deepEqual([...external], [], 'Review must not depend on off-origin fonts or runtime assets');
      await renderedGeometry(page, `${surface}-desktop`);
      await compactWorkspace(page);
      await audit(page, `${surface}-desktop`);
      assert.match(await page.locator('#dimensions-value').innerText(), /\d+\.\d{2} × \d+\.\d{2} × \d+\.\d{2} m/);
    });
    await scenario(`${surface}: camera, floor, plan framing and keyboard selection survive view switching`, async () => {
      const canvas = page.locator('#model canvas');
      await canvas.hover();
      const initialCamera = await page.locator('#model').getAttribute('data-camera');
      await page.mouse.wheel(0, -250);
      await page.waitForFunction(before => document.querySelector('#model').dataset.camera !== before, initialCamera);
      await waitForFrames(page);
      const camera = await page.locator('#model').getAttribute('data-camera');
      await page.locator('#view-2d').click();
      assert.equal(await canvas.isVisible(), false);
      assert.equal(await page.locator('#plan svg').isVisible(), true);
      const floor = await page.locator('#floor option').nth(1).getAttribute('value');
      await page.locator('#floor').selectOption(floor);
      const selectable = page.locator('#plan [data-object]').first();
      const selected = await selectable.getAttribute('data-object');
      await selectable.focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#selection').innerText(), selected);
      const beforePlan = await page.locator('#plan svg').getAttribute('viewBox');
      await page.locator('#plan').hover();
      await page.mouse.wheel(0, -200);
      await page.waitForFunction(before => document.querySelector('#plan svg').getAttribute('viewBox') !== before, beforePlan);
      const framing = await page.locator('#plan svg').getAttribute('viewBox');
      await page.locator('#view-3d').click();
      await waitForFrames(page);
      assert.equal(await page.locator('#model').getAttribute('data-camera'), camera);
      assert.equal(await page.locator('#floor').inputValue(), floor);
      assert.equal(await page.locator('#selection').innerText(), selected);
      await page.locator('#view-2d').click();
      assert.equal(await page.locator('#plan svg').getAttribute('viewBox'), framing);
      await page.locator('#fit').click();
      assert.notEqual(await page.locator('#plan svg').getAttribute('viewBox'), framing);
      await page.locator('#floor').selectOption('');
      await page.locator('#view-3d').click();
      await page.locator('#fit').click();
    });
    await scenario(`${surface}: standard camera presets and quarter turns fit usable views`, async () => {
      for (const preset of ['top', 'front', 'side', 'iso']) {
        await page.locator(`[data-preset="${preset}"]`).click();
        await waitForFrames(page);
        await renderedGeometry(page, `${surface}-preset-${preset}`);
      }
      const before = await page.locator('#model').getAttribute('data-camera');
      await page.locator('#turn').click();
      await waitForFrames(page);
      assert.notEqual(await page.locator('#model').getAttribute('data-camera'), before);
      await page.locator('[data-preset="iso"]').click();
    });
    await scenario(`${surface}: navigation overlays, section and appearance affect the real preview`, async () => {
      await page.locator('#view-2d').click();
      await page.locator('#navigation').selectOption('land');
      assert.ok((await page.locator('#plan .navigation-overlay').getAttribute('d')).length > 10);
      assert.match(await page.locator('#navigation-summary').innerText(), /Land/);
      await page.locator('#navigation').selectOption('water');
      assert.match(await page.locator('#navigation-summary').innerText(), /Boat|No navigation available/);
      await page.locator('#issues').check();
      assert.equal(await page.locator('#validation').getAttribute('open'), '');
      await page.locator('#navigation').selectOption('');
      await page.locator('#view-3d').click();
      await waitForFrames(page);
      const full = await page.locator('#model canvas').screenshot();
      await page.locator('#cut').fill('0.4');
      await waitForFrames(page);
      const section = await page.locator('#model canvas').screenshot({ path: `${OUTPUT}/${surface}-section.png` });
      assert.ok(changedPixels(full, section) > 0.005, 'Section control must visibly remove architectural geometry');
      await page.locator('#cut').fill('1');
      await page.locator('#appearance').selectOption('materials');
      await waitForFrames(page);
      assert.ok(changedPixels(full, await page.locator('#model canvas').screenshot()) > 0.005, 'Authored colors must affect the rendered preview');
      await page.locator('#appearance').selectOption('illustrated');
      await page.locator('#dimensions').uncheck();
      assert.equal(await page.locator('#dimensions-value').innerText(), '');
      await page.locator('#dimensions').check();
    });
    await scenario(`${surface}: walking moves, releases input, exits with Escape and preserves overview`, async () => {
      await page.locator('#view-2d').click();
      await page.locator('#walk').click();
      await page.locator('#model[data-mode="walk"][data-player]').waitFor();
      assert.equal(await page.locator('#plan').isVisible(), false);
      const camera = await page.locator('#model').getAttribute('data-camera');
      const before = await position(page);
      await walkForward(page, before);
      await waitForFrames(page, 3);
      const after = await position(page);
      assert.ok(Math.hypot(after[0] - before[0], after[1] - before[1]) > 0.25);
      await waitForFrames(page, 3);
      assert.deepEqual(await position(page), after, 'Released walking input must stop movement');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#exit-walk').isVisible(), false);
      await waitForFrames(page);
      assert.equal(await page.locator('#model').getAttribute('data-camera'), camera);
    });
    await scenario(`${surface}: mobile framing, keyboard controls and reduced motion`, async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('#fit').click();
      await waitForFrames(page);
      await renderedGeometry(page, `${surface}-mobile`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobile review must not overflow horizontally');
      await page.locator('#view-2d').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#plan svg').isVisible(), true);
      await page.screenshot({ path: `${OUTPUT}/${surface}-mobile-plan.png`, fullPage: true });
      await audit(page, `${surface}-mobile`);
      await page.setViewportSize({ width: 1440, height: 1000 });
    });
    if (surface === 'site') {
      await scenario('site: production service worker reloads the full reviewer offline', async () => {
        await page.locator('#offline').filter({ hasText: 'Ready offline' }).waitFor({ timeout: 30000 });
        await page.evaluate(async () => {
          await navigator.serviceWorker.ready;
          if (navigator.serviceWorker.controller) return;
          await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
        });
        await context.setOffline(true);
        await page.reload();
        await ready(page);
        await renderedGeometry(page, 'site-offline');
        await context.setOffline(false);
      });
    } else {
      await scenario('viewer: dimensions report independently known architectural extents', async () => {
        const source = `<level version="2" id="measured-room" name="Measured room" floor-thickness="0.2">
          <layer id="ground">
            <vertex id="a" x="0" y="0" z="0"/><vertex id="b" x="4" y="0" z="0"/>
            <vertex id="c" x="4" y="3" z="0"/><vertex id="d" x="0" y="3" z="0"/>
            <edge id="ab" from="a" to="b" kind="open"/><edge id="bc" from="b" to="c" kind="open"/>
            <edge id="cd" from="c" to="d" kind="open"/><edge id="da" from="d" to="a" kind="open"/>
            <region id="room" boundary="ab bc cd da" fill="floor"/>
          </layer>
          <marker id="spawn" layer="ground" region="room" position="1 1 0" kind="attacker_spawn"/>
          <marker id="objective" layer="ground" region="room" position="3 2 0" kind="objective"/>
          <route id="cross" from="spawn" to="objective" min-routes="1"/>
        </level>`;
        await page.locator('#file').setInputFiles({ name: 'measured.aml', mimeType: 'application/xml', buffer: Buffer.from(await amlSource(source)) });
        await page.waitForFunction(() => document.querySelector('#title').textContent === 'Measured room');
        await ready(page);
        assert.equal(await page.locator('#dimensions-value').innerText(), 'Layout bounds / 4.00 × 3.00 × 0.20 m');
        await page.locator('#view-3d').click();
        await page.locator('#fit').click();
        await renderedGeometry(page, 'viewer-small-known-room');
      });
      await scenario('viewer: invalid local XML retains stale preview and a valid file recovers', async () => {
        await page.locator('#file').setInputFiles({ name: 'invalid.aml', mimeType: 'application/xml', buffer: Buffer.from('<level>') });
        await page.locator('#status[data-state="error"]').waitFor();
        assert.match(await page.locator('#status').innerText(), /stale/);
        assert.equal(await page.locator('#walk').isDisabled(), true);
        assert.equal(await page.locator('#model').getAttribute('data-stale'), 'true');
        await page.locator('#view-2d').click();
        assert.ok(await page.locator('#plan [data-object]').count() > 0, 'Previous geometry remains available for review');
        const crossing = `<architecture version="1" id="invalid-crossing" validation="premap">
          <profile id="crossing-profile" points="0 0; 2 2; 0 2; 2 0"/>
          <slab id="invalid-floor" profile="crossing-profile"/>
        </architecture>`;
        await page.locator('#file').setInputFiles({ name: 'invalid-crossing.aml', mimeType: 'application/xml', buffer: Buffer.from(crossing) });
        await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'error' && document.querySelector('#status').textContent.includes('AML_PROFILE'));
        assert.equal(await page.locator('#title').innerText(), 'Measured room', 'Compile failure must not replace the previous reviewed layout');
        assert.equal(await page.locator('#model').getAttribute('data-stale'), 'true');
        assert.equal(await page.locator('#walk').isDisabled(), true);
        const source = await readFile(new URL('../../examples/showcase.aml', import.meta.url));
        await page.locator('#file').setInputFiles({ name: 'recovered.aml', mimeType: 'application/xml', buffer: source });
        await ready(page);
        assert.equal(await page.locator('#model').getAttribute('data-stale'), 'false');
        assert.equal(await page.locator('#title').innerText(), 'Elevation laboratory');
        assert.equal(await page.locator('#walk').isDisabled(), false);
      });
      await scenario('viewer: reload restores default Dust II after opening Showcase', async () => {
        await page.locator('#view-3d').click();
        const started = Date.now();
        await page.reload();
        await page.waitForFunction(() => document.querySelector('#title').textContent === 'Dust II · CS2 blockout', undefined, { timeout: 60000 });
        await ready(page);
        assert.equal(await page.locator('#model').getAttribute('data-stale'), 'false');
        assert.equal(await page.locator('#walk').isEnabled(), true);
        const sourceReadyMilliseconds = Date.now() - started;
        await page.locator('#fit').click();
        await waitForFrames(page);
        await renderedGeometry(page, 'viewer-dust2-large');
        const summary = await page.locator('#summary').innerText();
        const triangles = Number(await page.locator('#model').getAttribute('data-triangles'));
        assert.ok(triangles > 1000, 'Large retained level must render its compiled architecture');
        measurements.push({ source: 'examples/dust2.aml', sourceReadyMilliseconds, triangles, summary, viewport: { width: 1440, height: 1000 } });
        console.log(`MEASURE Dust II ready ${sourceReadyMilliseconds} ms / ${triangles} rendered triangles / ${summary}`);
      });
    }
    await context.close();
  }
  await scenario('walking integrates sparse-frame input time and clears held input on blur', async () => {
    const context = await testContext(browser, { viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    captureErrors(page, 'walk timing');
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.goto(SITE);
    await ready(page);
    await page.locator('#walk').click();
    await page.locator('#model[data-mode="walk"][data-player]').waitFor();
    await page.clock.pauseAt(new Date('2026-01-02T00:00:00Z'));
    const before = await position(page);
    await page.keyboard.down('w');
    await page.clock.fastForward(600);
    await page.keyboard.up('w');
    const after = await position(page);
    const moved = Math.hypot(after[0] - before[0], after[1] - before[1]);
    assert.ok(moved > 2.03 && moved < 2.05, `600 ms at 3.4 m/s must move 2.04 m; observed ${moved} m`);
    await page.clock.runFor(100);
    assert.deepEqual(await position(page), after, 'Released input stops sparse-frame walking');
    await page.keyboard.down('w');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.clock.fastForward(3000);
    await page.keyboard.up('w');
    assert.deepEqual(await position(page), after, 'Blur clears movement without replaying stale input');
    await page.keyboard.down('a');
    await page.clock.fastForward(9000);
    const wall = await position(page);
    assert.ok(wall[1] > -3 && wall[1] < 0, `Courtyard's curved front wall must stop movement inside its authored -3..0 m envelope: ${wall}`);
    await page.clock.fastForward(1000);
    assert.deepEqual(await position(page), wall, 'Continued input into the boundary must remain constrained');
    await page.keyboard.up('a');
    await context.close();
  });
  await scenario('viewer: cancellation rejects pending results and retry successfully reloads', async () => {
    const context = await testContext(browser, { serviceWorkers: 'block' });
    const page = await context.newPage();
    captureErrors(page, 'cancel recovery');
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let started;
    const requestStarted = new Promise(resolve => { started = resolve; });
    let intercepted = false;
    await page.route(/worker[^/]*\.js(?:\?.*)?$/, async route => {
      intercepted = true;
      started();
      await gate;
      await route.continue().catch(() => {});
    });
    await page.goto(VIEWER);
    await requestStarted;
    await page.locator('#cancel').click();
    assert.equal(intercepted, true, 'Hold the real worker request so cancellation happens before compilation');
    assert.match(await page.locator('#status').innerText(), /cancelled/);
    assert.equal(await page.locator('.reviewer').getAttribute('aria-busy'), 'false');
    release();
    await page.locator('#retry').click();
    await ready(page);
    await renderedGeometry(page, 'viewer-cancel-recovery');
    await context.close();
  });
  await scenario('graphics context loss falls back to plan and restores usable 3D', async () => {
    const context = await testContext(browser);
    const page = await context.newPage();
    captureErrors(page, 'context recovery');
    await page.goto(SITE);
    await ready(page);
    const supported = await page.locator('#model canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2');
      const extension = gl?.getExtension('WEBGL_lose_context');
      if (!extension) return false;
      window.__reviewContext = extension;
      extension.loseContext();
      return true;
    });
    assert.equal(supported, true, 'Acceptance browser must expose graphics context loss for recovery testing');
    await page.locator('#fallback').waitFor();
    assert.equal(await page.locator('#plan svg').isVisible(), true);
    assert.equal(await page.locator('#view-3d').isDisabled(), true);
    assert.equal(await page.locator('#walk').isDisabled(), true);
    await page.evaluate(() => window.__reviewContext.restoreContext());
    await page.waitForFunction(() => !document.querySelector('#view-3d').disabled);
    await page.locator('#view-3d').click();
    await waitForFrames(page);
    assert.equal(await page.locator('#fallback').isVisible(), false);
    await renderedGeometry(page, 'restored-graphics');
    await context.close();
  });
  await scenario('WebGL unavailable: 2D plan and diagnostics remain usable', async () => {
    const context = await testContext(browser);
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        if (type.startsWith('webgl')) return null;
        return original.call(this, type, ...args);
      };
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`fallback: ${error.message}`));
    await page.goto(VIEWER);
    await ready(page, false);
    assert.equal(await page.locator('#fallback').isVisible(), true);
    assert.equal(await page.locator('#plan svg').isVisible(), true);
    assert.equal(await page.locator('#view-3d').isDisabled(), true);
    assert.equal(await page.locator('#walk').isDisabled(), true);
    await page.locator('#issues').check();
    assert.ok((await page.locator('#validation-mode').innerText()).trim(), 'The current validation mode must remain available without WebGL');
    const valid = await readFile(new URL('../../examples/cli-starter.aml', import.meta.url), 'utf8');
    const lowCeiling = valid.replace('</architecture>', '<box id="low-ceiling" width="8" depth="6" height="0.2" position="0 0 0.5"/></architecture>');
    await page.locator('#file').setInputFiles({name:'low-clearance.aml',mimeType:'application/xml',buffer:Buffer.from(lowCeiling)});
    await ready(page,false);
    if (!(await page.locator('#validation').evaluate(element => element.open)))
      await page.locator('#validation summary').click();
    await page.waitForFunction(()=>Number(document.querySelector('#issue-count').textContent)>0);
    await page.locator('#diagnostics p:visible').first().waitFor();
    assert.ok((await page.locator('#diagnostics').innerText()).trim(), 'A controlled clearance failure must expose diagnostics without WebGL');
    await page.locator('#file').setInputFiles({name:'repaired.aml',mimeType:'application/xml',buffer:Buffer.from(valid)});
    await ready(page,false);
    assert.equal(await page.locator('#plan').getAttribute('data-stale'),'false');
    assert.equal(await page.locator('#view-3d').isDisabled(),true);
    await page.locator('#issues').uncheck();
    assert.equal(await page.locator('#plan svg').isVisible(), true);
    await page.screenshot({ path: `${OUTPUT}/webgl-fallback.png`, fullPage: true });
    await context.close();
  });
  assert.deepEqual(errors, [], 'Production reviewer must not emit uncaught exceptions or shader/console errors');
} finally {
  await writeFile(`${OUTPUT}/results.json`, JSON.stringify({ results, measurements, errors }, null, 2));
  await browser.close();
}
