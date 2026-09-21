import { chromium } from "playwright";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { unzipSync } from "fflate";
import validator from "gltf-validator";
const require = createRequire(import.meta.url);
const BASE = process.env.BASE_URL || "http://127.0.0.1:48217/levelspec/";
const OUTPUT = process.env.QA_OUTPUT || "website-qa";
await mkdir(OUTPUT, { recursive: true });
let executablePath = process.env.BROWSER_PATH;
if (!executablePath && process.platform === "darwin") {
  const candidate =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  try {
    await access(candidate);
    executablePath = candidate;
  } catch {
    /* Use Playwright's installed browser. */
  }
}
const browser = await chromium.launch({ headless: true, executablePath });
const results = [],
  consoleErrors = [];
const ready = (page) =>
  page.locator('#playground[data-status="ready"]').waitFor({ timeout: 30000 });
const noOverflow = async (page) =>
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "No horizontal page overflow",
  );
async function scenario(name, run) {
  const start = Date.now();
  await run();
  results.push({ name, passed: true, milliseconds: Date.now() - start });
  console.log(`PASS ${name}`);
}
const axe = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
async function audit(page, name) {
  await page.addScriptTag({ content: axe });
  const result = await page.evaluate(() =>
    window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    }),
  );
  await writeFile(
    `${OUTPUT}/accessibility-${name}.json`,
    JSON.stringify(result.violations, null, 2),
  );
  assert.deepEqual(
    result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
    `Accessibility: ${name}`,
  );
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  const external = new Set();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.origin !== new URL(BASE).origin)
      external.add(url.origin);
  });
  await scenario(
    "cold load: real geometry, no off-origin runtime requests",
    async () => {
      await page.goto(BASE);
      await ready(page);
      await noOverflow(page);
      assert.equal(await page.locator("#webgl-fallback").isVisible(), false);
      assert.equal(
        await page.locator("#validation-result").textContent(),
        "Passed",
      );
      await page.screenshot({ path: `${OUTPUT}/desktop.png`, fullPage: true });
      assert.deepEqual([...external], []);
      await audit(page, "desktop");
    },
  );
  const originalHash = await page
    .locator("#playground")
    .getAttribute("data-geometry-hash");
  await scenario(
    "one click edits source and recompiles both views",
    async () => {
      await page.locator("#next").click();
      await ready(page);
      assert.equal(
        await page.locator("#playground").getAttribute("data-curve"),
        "6",
      );
      assert.notEqual(
        await page.locator("#playground").getAttribute("data-geometry-hash"),
        originalHash,
      );
      assert.ok(
        (await page.locator("#code-after").textContent()).includes("-6"),
      );
      await page.screenshot({ path: `${OUTPUT}/reshaped.png`, fullPage: true });
    },
  );
  await scenario(
    "rapid input cannot publish or export a stale result",
    async () => {
      await page.locator("#curve").evaluate((input) => {
        for (const value of [1, 2.5, 5, 0.25, 4.75]) {
          input.value = String(value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
      assert.equal(await page.locator("#download-glb").isDisabled(), true);
      await ready(page);
      assert.equal(
        await page.locator("#playground").getAttribute("data-curve"),
        "4.75",
      );
      assert.equal(await page.locator("#download-glb").isDisabled(), false);
    },
  );
  await scenario(
    "navigation overlay shows measured validation results",
    async () => {
      await page.locator('[data-step="2"]').click();
      assert.equal(
        await page.locator("#validation-result").textContent(),
        "Passed",
      );
      assert.equal(
        await page.locator("#regions-result").textContent(),
        "4 / 4",
      );
      assert.equal(await page.locator("#coverage-result").textContent(), "0");
      assert.equal(
        await page.locator("#plan-key-label").textContent(),
        "Computed navigation",
      );
      await page.screenshot({
        path: `${OUTPUT}/navigation.png`,
        fullPage: true,
      });
      await audit(page, "navigation");
    },
  );
  await scenario(
    "downloaded GLB and glTF pass Khronos validation",
    async () => {
      await page.locator('[data-step="3"]').click();
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#download-glb").click();
      const glb = await downloadPromise;
      await glb.saveAs(`${OUTPUT}/courtyard.glb`);
      const glbResult = await validator.validateBytes(
        new Uint8Array(await readFile(`${OUTPUT}/courtyard.glb`)),
        { uri: "courtyard.glb" },
      );
      assert.equal(glbResult.issues.numErrors, 0);
      assert.equal(glbResult.issues.numWarnings, 0);
      const zipPromise = page.waitForEvent("download");
      await page.locator("#download-gltf").click();
      const zip = await zipPromise;
      await zip.saveAs(`${OUTPUT}/courtyard.zip`);
      const files = unzipSync(
        new Uint8Array(await readFile(`${OUTPUT}/courtyard.zip`)),
      );
      const gltfName = Object.keys(files).find((name) =>
        name.endsWith(".gltf"),
      );
      assert.ok(gltfName);
      assert.ok(files["source.level.svgx"]);
      assert.ok(files["showcase.levelspec.json"]);
      assert.ok(
        new TextDecoder()
          .decode(files["source.level.svgx"])
          .includes('control="4 -4.75; 10 -4.75"'),
      );
      const gltfResult = await validator.validateString(
        new TextDecoder().decode(files[gltfName]),
        {
          uri: gltfName,
          externalResourceFunction: async (uri) => {
            assert.ok(files[uri], `Missing ${uri}`);
            return files[uri];
          },
        },
      );
      assert.equal(gltfResult.issues.numErrors, 0);
      assert.equal(gltfResult.issues.numWarnings, 0);
      await page.screenshot({ path: `${OUTPUT}/export.png`, fullPage: true });
      await audit(page, "export");
    },
  );
  await scenario(
    "presentation advances with arrow keys and exits with Escape",
    async () => {
      await page.locator("#reset").click();
      await ready(page);
      await page.locator("#present").click();
      await page.keyboard.press("ArrowRight");
      await ready(page);
      assert.equal(
        await page.locator('[data-step="1"]').getAttribute("aria-current"),
        "step",
      );
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await page.locator('[data-step="2"]').getAttribute("aria-current"),
        "step",
      );
      await page.screenshot({ path: `${OUTPUT}/presentation.png` });
      await page.keyboard.press("Escape");
      assert.equal(
        await page
          .locator("body")
          .evaluate((node) => node.classList.contains("present")),
        false,
      );
    },
  );
  await scenario("offline reload, recompilation, and export", async () => {
    await page.waitForFunction(() =>
      document
        .querySelector("#offline-status")
        .textContent.includes("Ready offline"),
    );
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
    await context.setOffline(true);
    await page.reload();
    await ready(page);
    await page.locator('[data-step="1"]').click();
    await page.locator("#original").click();
    await ready(page);
    assert.equal(
      await page.locator("#playground").getAttribute("data-curve"),
      "3",
    );
    await page.locator('[data-step="3"]').click();
    const download = page.waitForEvent("download");
    await page.locator("#download-glb").click();
    await download;
    await context.setOffline(false);
  });
  await context.close();
  for (const width of [375, 390, 768]) {
    await scenario(
      `responsive layout and interaction at ${width}px`,
      async () => {
        const mobile = await browser.newContext({
          viewport: { width, height: 844 },
          isMobile: width < 500,
          hasTouch: true,
          reducedMotion: "reduce",
        });
        const p = await mobile.newPage();
        p.on("pageerror", (e) => consoleErrors.push(e.message));
        await p.goto(BASE);
        await ready(p);
        await noOverflow(p);
        await p.locator('[data-step="1"]').click();
        await ready(p);
        await noOverflow(p);
        await p.screenshot({
          path: `${OUTPUT}/mobile-${width}.png`,
          fullPage: true,
        });
        if (width === 390) await audit(p, "mobile");
        await mobile.close();
      },
    );
  }
  await scenario(
    "compiler network failure disables export and Retry recovers",
    async () => {
      const failure = await browser.newContext({ serviceWorkers: "block" });
      const p = await failure.newPage();
      await p.route("**/assets/worker-*.js", (route) => route.abort());
      await p.goto(BASE);
      await p.locator("#retry:not([hidden])").waitFor();
      assert.equal(await p.locator("#download-glb").isDisabled(), true);
      await p.unroute("**/assets/worker-*.js");
      await p.locator("#retry").click();
      await ready(p);
      await failure.close();
    },
  );
  await scenario(
    "unavailable WebGL retains the plan, compiler, and exports",
    async () => {
      const fallback = await browser.newContext();
      await fallback.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          if (kind === "webgl" || kind === "webgl2") return null;
          return original.call(this, kind, ...args);
        };
      });
      const p = await fallback.newPage();
      await p.goto(BASE);
      await ready(p);
      assert.equal(await p.locator("#webgl-fallback").isVisible(), true);
      assert.equal(await p.locator("#download-glb").isDisabled(), false);
      assert.equal(await p.locator("#plan svg").count(), 1);
      await fallback.close();
    },
  );
  assert.deepEqual(
    consoleErrors,
    [],
    "No uncaught page errors in normal scenarios",
  );
} finally {
  await browser.close();
  await writeFile(
    `${OUTPUT}/browser-results.json`,
    JSON.stringify({ base: BASE, results, consoleErrors }, null, 2),
  );
}
