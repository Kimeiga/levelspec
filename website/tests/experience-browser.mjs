import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile, mkdir, access } from "node:fs/promises";
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
  } catch {}
}
const browser = await chromium.launch({ headless: true, executablePath });
const results = [],
  errors = [];
const ready = (p) =>
  p.locator('#playground[data-status="ready"]').waitFor({ timeout: 30000 });
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
    "eye-level entry, constrained walking, key release and Escape",
    async () => {
      assert.equal(
        await page.locator("#model").getAttribute("data-mode"),
        "courtyard",
      );
      await page.locator("#enter").click();
      assert.equal(
        await page.locator("#model").getAttribute("data-mode"),
        "walk",
      );
      const before = await position(page);
      await page.keyboard.down("w");
      await page.waitForTimeout(600);
      await page.keyboard.up("w");
      const after = await position(page);
      assert.ok(Math.hypot(after[0] - before[0], after[1] - before[1]) > 0.5);
      await page.waitForTimeout(200);
      assert.deepEqual(await position(page), after);
      await page.screenshot({ path: `${OUTPUT}/immersive-walk.png` });
      await page.keyboard.press("Escape");
      assert.equal(
        await page
          .locator("body")
          .evaluate((b) => b.classList.contains("walking")),
        false,
      );
    },
  );
  await run(
    "raising the terrace really changes shared elevations and geometry",
    async () => {
      await page.locator('[data-step="1"]').click();
      await ready(page);
      const hash = await page
        .locator("#playground")
        .getAttribute("data-geometry-hash");
      await page.locator("#raise-terrace").click();
      assert.equal(await page.locator("#download-glb").isDisabled(), true);
      await ready(page);
      assert.equal(
        await page.locator("#playground").getAttribute("data-height"),
        "5",
      );
      assert.notEqual(
        await page.locator("#playground").getAttribute("data-geometry-hash"),
        hash,
      );
      await page.screenshot({ path: `${OUTPUT}/immersive-terrace.png` });
    },
  );
  await run(
    "closing both approaches fails actual navigation and prevents model export",
    async () => {
      await page.locator('[data-step="2"]').click();
      await page.locator("#block-route").click();
      assert.equal(await page.locator("#download-glb").isDisabled(), true);
      await page.waitForFunction(
        () =>
          document.querySelector("#route-result").textContent === "Unreachable",
      );
      assert.equal(
        await page.locator("#regions-result").textContent(),
        "1 / 4",
      );
      assert.ok(
        (await page.locator("#diagnostic-list").textContent()).includes(
          "ROUTE_REQUIREMENT",
        ),
      );
      assert.equal(
        await page.locator("#playground").getAttribute("data-blocked"),
        "true",
      );
      await page.screenshot({ path: `${OUTPUT}/immersive-disconnected.png` });
      await page.locator("#show-plan").click();
      assert.equal(await page.locator("#plan svg").isVisible(), true);
      await page.locator("#repair-route").click();
      await ready(page);
      assert.equal(
        await page.locator("#route-result").textContent(),
        "Reachable",
      );
      assert.equal(await page.locator("#download-glb").isDisabled(), false);
      await page.locator("#show-space").click();
    },
  );
  await run(
    "all three parameter presets compile and preserve their shared URL",
    async () => {
      for (const [name, height, curve] of [
        ["chalk", "5", "6"],
        ["night", "2", "0"],
        ["clay", "3", "3"],
      ]) {
        await page.locator(`[data-preset="${name}"]`).click();
        await ready(page);
        assert.equal(
          await page.locator("#playground").getAttribute("data-height"),
          height,
        );
        assert.equal(
          await page.locator("#playground").getAttribute("data-curve"),
          curve,
        );
        assert.equal(new URL(page.url()).searchParams.get("look"), name);
      }
    },
  );
  await run("Escape leaves walking before leaving presentation", async () => {
    await page.locator("#present").click();
    await page.locator("#enter").click();
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .locator("body")
        .evaluate((b) => b.classList.contains("walking")),
      false,
    );
    assert.equal(
      await page
        .locator("body")
        .evaluate((b) => b.classList.contains("present")),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .locator("body")
        .evaluate((b) => b.classList.contains("present")),
      false,
    );
  });
  await run(
    "reduced motion uses a static viewpoint rather than an automatic tour",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.locator("#tour").click();
      assert.equal(
        await page.locator("#model").getAttribute("data-mode"),
        "terrace",
      );
      assert.equal(
        await page.locator("#tour").getAttribute("aria-pressed"),
        "false",
      );
    },
  );
  await run(
    "offline structural edits, break/repair, and walking remain available",
    async () => {
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
      await page.locator("#raise-terrace").click();
      await ready(page);
      await page.locator('[data-step="2"]').click();
      await page.locator("#block-route").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#route-result").textContent === "Unreachable",
      );
      await page.locator("#repair-route").click();
      await ready(page);
      await page.locator('[data-step="0"]').click();
      await page.locator("#enter").click();
      assert.equal(
        await page.locator("#model").getAttribute("data-mode"),
        "walk",
      );
      await page.keyboard.press("Escape");
      await context.setOffline(false);
    },
  );
  await context.close();
  for (const width of [375, 390])
    await run(
      `mobile ${width}: controls and affected view share the viewport`,
      async () => {
        const ctx = await browser.newContext({
          viewport: { width, height: 844 },
          isMobile: true,
          hasTouch: true,
        });
        const p = await ctx.newPage();
        p.on("pageerror", (e) => errors.push(e.message));
        await p.goto(BASE);
        await ready(p);
        await p.locator('[data-step="1"]').click();
        await ready(p);
        await p
          .locator("#terrace-height")
          .evaluate((e) => e.scrollIntoView({ block: "end" }));
        const model = await p.locator(".visual-panel").boundingBox(),
          slider = await p.locator("#terrace-height").boundingBox();
        assert.ok(model && slider);
        assert.ok(
          model.y >= 55 && model.y + model.height < slider.y,
          JSON.stringify({ model, slider }),
        );
        assert.ok(slider.y + slider.height <= 845);
        await p.screenshot({ path: `${OUTPUT}/immersive-mobile-${width}.png` });
        await p.locator("#show-plan").click();
        assert.equal(await p.locator("#plan svg").isVisible(), true);
        await ctx.close();
      },
    );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await writeFile(
    `${OUTPUT}/experience-results.json`,
    JSON.stringify({ base: BASE, results, errors }, null, 2),
  );
}
