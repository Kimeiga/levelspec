import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import validator from "gltf-validator";
const BASE = process.env.BASE_URL || "http://127.0.0.1:48217/levelspec/";
const OUT = process.env.QA_OUTPUT || "website-qa";
await mkdir(OUT, { recursive: true });
let executablePath = process.env.BROWSER_PATH;
if (!executablePath && process.platform === "darwin") {
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  try {
    await access(chrome);
    executablePath = chrome;
  } catch {}
}
const browser = await chromium.launch({ headless: true, executablePath });
const results = [],
  errors = [],
  renderComparisons = [];
const ready = (p) =>
  p.locator('#playground[data-status="ready"]').waitFor({ timeout: 45000 });
const position = async (p) =>
  (await p.locator("#model").getAttribute("data-player"))
    .split(",")
    .map(Number);
async function run(name, fn) {
  await fn();
  results.push({ name, passed: true });
  console.log("PASS " + name);
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE);
  await ready(page);
  await run(
    "first-person entry is visible and usable in all four chapters",
    async () => {
      for (let step = 0; step < 4; step++) {
        await page.locator(`[data-step="${step}"]`).click();
        await ready(page);
        assert.equal(await page.locator("#walk-anywhere").isVisible(), true);
        await page.locator("#walk-anywhere").click();
        assert.equal(
          await page.locator("#model").getAttribute("data-mode"),
          "walk",
        );
        const before = await position(page);
        await page.keyboard.down("w");
        await page.waitForTimeout(350);
        await page.keyboard.up("w");
        const after = await position(page);
        assert.ok(
          Math.hypot(after[0] - before[0], after[1] - before[1]) > 0.25,
        );
        await page.keyboard.press("Escape");
        assert.equal(await page.locator(".walk-hud").isVisible(), false);
      }
    },
  );
  await run(
    "validated edits preserve walking; invalid routes stop it explicitly",
    async () => {
      await page.locator("#reset").click();
      await ready(page);
      await page.locator("#walk-anywhere").click();
      const before = await position(page);
      await page.locator("#terrace-height").evaluate((input) => {
        input.value = "4";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await ready(page);
      assert.equal(
        await page.locator("#model").getAttribute("data-mode"),
        "walk",
      );
      const after = await position(page);
      assert.ok(Math.hypot(...after.map((v, i) => v - before[i])) < 0.1);
      await page.locator("#block-route").evaluate((button) => button.click());
      await page.waitForFunction(
        () =>
          document.querySelector("#route-result").textContent === "Unreachable",
      );
      assert.equal(await page.locator(".walk-hud").isVisible(), false);
      assert.equal(await page.locator("#walk-anywhere").isDisabled(), true);
      await page.locator("#repair-route").evaluate((button) => button.click());
      await ready(page);
    },
  );
  await run(
    "each style exports its own authored materials and geometry",
    async () => {
      const signatures = [];
      for (const style of ["clay", "chalk", "night"]) {
        await page.selectOption("#style-select", style);
        await ready(page);
        await page.locator('[data-step="3"]').click();
        const downloading = page.waitForEvent("download");
        await page.locator("#download-glb").click();
        await (await downloading).saveAs(`${OUT}/${style}-world.glb`);
        const bytes = await readFile(`${OUT}/${style}-world.glb`);
        const json = JSON.parse(
          bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
        );
        assert.equal(json.images.length, 6);
        assert.ok(
          json.nodes.some((node) =>
            node.name?.includes(
              style === "clay"
                ? "clay.belvedere"
                : style === "chalk"
                  ? "chalk.west-roof"
                  : "night.monitor",
            ),
          ),
        );
        const result = await validator.validateBytes(new Uint8Array(bytes));
        assert.equal(result.issues.numErrors, 0);
        assert.equal(result.issues.numWarnings, 0);
        signatures.push(JSON.stringify(json.materials));
      }
      assert.equal(new Set(signatures).size, 3);
    },
  );
  await run(
    "returning from a camera orbit produces stable pixels in all three styles",
    async () => {
      for (const style of ["clay", "chalk", "night"]) {
        await page.selectOption("#style-select", style);
        await ready(page);
        await page.waitForFunction(
          () => document.querySelector("#model").dataset.textures === "ready",
        );
        await page.locator("#view-courtyard").click();
        await page.waitForTimeout(150);
        const canvas = page.locator("#model canvas");
        const before = PNG.sync.read(await canvas.screenshot());
        const box = await canvas.boundingBox();
        await page.mouse.move(
          box.x + box.width * 0.5,
          box.y + box.height * 0.5,
        );
        await page.mouse.down();
        await page.mouse.move(
          box.x + box.width * 0.67,
          box.y + box.height * 0.44,
          { steps: 12 },
        );
        await page.mouse.up();
        await page.locator("#view-courtyard").click();
        await page.waitForTimeout(150);
        const shot = await canvas.screenshot({
          path: `${OUT}/stable-${style}.png`,
        });
        const after = PNG.sync.read(shot);
        assert.equal(before.width, after.width);
        assert.equal(before.height, after.height);
        let changed = 0;
        for (let i = 0; i < before.data.length; i += 4) {
          if (
            Math.max(
              ...[0, 1, 2].map((k) =>
                Math.abs(before.data[i + k] - after.data[i + k]),
              ),
            ) > 8
          )
            changed++;
        }
        const ratio = changed / (before.width * before.height);
        assert.ok(ratio < 0.003, `${style}: changed pixel fraction ${ratio}`);
        renderComparisons.push({ style, changedPixelFraction: ratio });
      }
    },
  );
  await context.close();
  await run(
    "mobile walkthrough fills the viewport and on-screen movement works",
    async () => {
      const mobile = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const p = await mobile.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(BASE);
      await ready(p);
      await p.locator('[data-step="3"]').click();
      await p.locator("#walk-anywhere").click();
      const box = await p.locator("#model canvas").boundingBox();
      assert.ok(box.height > 500, JSON.stringify(box));
      const start = await position(p);
      const arrow = await p.locator('[data-move="forward"]').boundingBox();
      await p.mouse.move(arrow.x + arrow.width / 2, arrow.y + arrow.height / 2);
      await p.mouse.down();
      await p.waitForTimeout(400);
      await p.mouse.up();
      const end = await position(p);
      assert.ok(Math.hypot(end[0] - start[0], end[1] - start[1]) > 0.4);
      await p.screenshot({ path: `OUT/fps-mobile.png`.replace("OUT", OUT) });
      await p.locator("#exit-walk").click();
      await mobile.close();
    },
  );
  await run(
    "denied mouse capture retains a working drag-look walkthrough",
    async () => {
      const fallback = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      await fallback.addInitScript(() => {
        HTMLCanvasElement.prototype.requestPointerLock = () =>
          Promise.reject(new Error("Permission denied for test"));
      });
      const p = await fallback.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(BASE);
      await ready(p);
      await p.locator("#walk-anywhere").click();
      assert.equal(await p.locator("#model").getAttribute("data-mode"), "walk");
      const before = await position(p);
      await p.keyboard.down("w");
      await p.waitForTimeout(350);
      await p.keyboard.up("w");
      const after = await position(p);
      assert.ok(Math.hypot(after[0] - before[0], after[1] - before[1]) > 0.25);
      const canvas = await p.locator("#model canvas").boundingBox();
      await p.mouse.move(
        canvas.x + canvas.width * 0.5,
        canvas.y + canvas.height * 0.5,
      );
      await p.mouse.down();
      await p.mouse.move(
        canvas.x + canvas.width * 0.62,
        canvas.y + canvas.height * 0.5,
        { steps: 8 },
      );
      await p.mouse.up();
      assert.equal(await p.locator("#model").getAttribute("data-mode"), "walk");
      await p.keyboard.press("Escape");
      await fallback.close();
    },
  );
  await run(
    "losing WebGL during a walk leaves a usable plan and disables walk entry",
    async () => {
      const fallback = await browser.newContext();
      const p = await fallback.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(BASE);
      await ready(p);
      await p.locator("#walk-anywhere").click();
      await p
        .locator("#model canvas")
        .evaluate((c) =>
          c.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
        );
      await p.locator("#webgl-fallback").waitFor();
      assert.equal(await p.locator(".walk-hud").isVisible(), false);
      assert.equal(await p.locator("#walk-anywhere").isDisabled(), true);
      assert.equal(await p.locator("#plan svg").isVisible(), true);
      assert.equal(await p.locator("#download-glb").isDisabled(), false);
      await fallback.close();
    },
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await writeFile(
    `${OUT}/walk-stability-results.json`,
    JSON.stringify({ base: BASE, results, renderComparisons, errors }, null, 2),
  );
}
