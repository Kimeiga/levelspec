import { chromium } from "playwright";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:48217/levelspec/",
  OUT = process.env.QA_OUTPUT || "website-qa";
await mkdir(OUT, { recursive: true });
let executablePath = process.env.BROWSER_PATH;
if (!executablePath && process.platform === "darwin") {
  const p = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  try {
    await access(p);
    executablePath = p;
  } catch {}
}
const browser = await chromium.launch({ headless: true, executablePath });
const results = [],
  errors = [];
async function run(name, fn) {
  await fn();
  results.push({ name, passed: true });
  console.log("PASS " + name);
}
const ready = (p) =>
  p.locator('#playground[data-status="ready"]').waitFor({ timeout: 45000 });
try {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.text().includes("GL_INVALID"))
      errors.push(m.text().slice(0, 600));
  });
  await page.goto(BASE);
  await ready(page);
  await run(
    "all three calibrated preset bakes load with their current source",
    async () => {
      for (const style of ["clay", "chalk", "night"]) {
        await page.locator("#style-select").selectOption(style);
        await ready(page);
        await page
          .locator('#model[data-bake="ready"]')
          .waitFor({ timeout: 45000 });
        assert.ok(
          (await page.locator("#bake-status").innerText()).includes(
            "32 samples",
          ),
        );
        await page.screenshot({ path: `${OUT}/baked-${style}.png` });
      }
    },
  );
  await run(
    "baked lighting visibly changes pixels and may be compared with live lighting",
    async () => {
      await page.locator("#style-select").selectOption("clay");
      await ready(page);
      await page.locator('#model[data-bake="ready"]').waitFor();
      const a = PNG.sync.read(await page.locator(".model-pane").screenshot());
      await page.locator(".graphics-bar summary").click();
      await page.locator("#bake-toggle").uncheck();
      await page.locator(".graphics-bar summary").click();
      const b = PNG.sync.read(await page.locator(".model-pane").screenshot());
      let changed = 0;
      for (let i = 0; i < a.data.length; i += 4)
        if (
          Math.abs(a.data[i] - b.data[i]) +
            Math.abs(a.data[i + 1] - b.data[i + 1]) +
            Math.abs(a.data[i + 2] - b.data[i + 2]) >
          12
        )
          changed++;
      assert.ok(
        changed / (a.width * a.height) > 0.02,
        "Baked lighting must affect the visible render.",
      );
      await page.locator(".graphics-bar summary").click();
      await page.locator("#bake-toggle").check();
      await page.locator(".graphics-bar summary").click();
    },
  );
  await run(
    "source edits remove stale lightmaps; resetting reloads the matching bake",
    async () => {
      await page.locator('[data-step="1"]').click();
      await ready(page);
      assert.notEqual(
        await page.locator("#model").getAttribute("data-bake"),
        "ready",
      );
      await page.locator("#reset").click();
      await ready(page);
      await page.locator('#model[data-bake="ready"]').waitFor();
    },
  );
  await run(
    "motion can be paused and Basic graphics retains walking and exports",
    async () => {
      await page.waitForTimeout(400);
      const before = await page.locator("#model").getAttribute("data-frame");
      await page.waitForTimeout(200);
      assert.equal(
        await page.locator("#model").getAttribute("data-frame"),
        before,
      );
      await page.locator(".graphics-bar summary").click();
      await page.locator("#animate-effects").check();
      await page.locator(".graphics-bar summary").click();
      const start = Number(
        await page.locator("#model").getAttribute("data-frame"),
      );
      await page.waitForTimeout(200);
      assert.ok(
        Number(await page.locator("#model").getAttribute("data-frame")) > start,
      );
      await page.locator(".graphics-bar summary").click();
      await page.locator("#animate-effects").uncheck();
      await page.locator("#graphics-quality").selectOption("basic");
      await page.locator(".graphics-bar summary").click();
      await page.locator("#walk-anywhere").click();
      assert.equal(
        await page.locator("#model").getAttribute("data-mode"),
        "walk",
      );
      await page.keyboard.press("Escape");
      await page.locator('[data-step="3"]').click();
      assert.equal(await page.locator("#download-glb").isDisabled(), false);
    },
  );
  await run(
    "baked lightmaps and enhanced graphics survive an offline reload",
    async () => {
      await page.waitForFunction(
        () =>
          document
            .querySelector("#offline-status")
            .textContent.includes("Ready offline") &&
          navigator.serviceWorker.controller,
      );
      await ctx.setOffline(true);
      await page.reload();
      await ready(page);
      await page.locator('#model[data-bake="ready"]').waitFor();
      assert.equal(
        await page.locator("#model").getAttribute("data-graphics"),
        "enhanced",
      );
      await ctx.setOffline(false);
    },
  );
  await ctx.close();
  await run(
    "corrupt lightmaps fall back to usable live lighting without a false success",
    async () => {
      const c = await browser.newContext({
        serviceWorkers: "block",
        reducedMotion: "reduce",
      });
      const p = await c.newPage();
      await p.route("**/*.exr", (route) =>
        route.fulfill({ status: 200, body: "corrupt lightmap" }),
      );
      await p.goto(BASE);
      await ready(p);
      await p.locator('#model[data-bake="error"]').waitFor();
      assert.ok(
        (await p.locator("#bake-status").innerText()).includes(
          "using live lighting",
        ),
      );
      assert.equal(await p.locator("#download-glb").isDisabled(), false);
      await c.close();
    },
  );
  assert.deepEqual(
    errors,
    [],
    "No GLSL compilation errors or WebGL draw errors",
  );
} finally {
  await browser.close();
  await writeFile(
    `${OUT}/graphics-results.json`,
    JSON.stringify({ base: BASE, results, errors }, null, 2),
  );
}
