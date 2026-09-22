import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import {
  launchBrowser,
  testContext,
  waitForVisualReady,
} from "./browser-helpers.mjs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:48217/levelspec/";
const OUT = process.env.QA_OUTPUT || "website-qa";
await mkdir(OUT, { recursive: true });
const browser = await launchBrowser();
const context = await testContext(browser, {
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const position = () =>
  page
    .locator("#model")
    .evaluate((element) => element.dataset.player.split(",").map(Number));
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
try {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.goto(BASE);
  await page.locator('#playground[data-status="ready"]').waitFor();
  await waitForVisualReady(page);
  await page.locator("#walk-anywhere").click();
  await page.clock.pauseAt(new Date("2026-01-02T00:00:00Z"));
  const before = await position();
  await page.keyboard.down("w");
  // Fast-forward fires the due render callback once, representing a slow frame.
  await page.clock.fastForward(600);
  await page.keyboard.up("w");
  const after = await position(),
    moved = distance(before, after);
  assert.ok(moved > 2.03 && moved < 2.05, `600 ms at 3.4 m/s: ${moved} m`);
  await page.clock.runFor(100);
  assert.deepEqual(await position(), after, "Released movement must stop");
  await page.keyboard.down("w");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.clock.fastForward(3000);
  await page.keyboard.up("w");
  assert.deepEqual(
    await position(),
    after,
    "Blur must clear held input without catch-up",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    `${OUT}/walk-timing-results.json`,
    JSON.stringify(
      {
        heldMilliseconds: 600,
        movedMetres: moved,
        stoppedAfterRelease: true,
        suspendedWithoutCatchUp: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS sparse-frame walking preserves elapsed input time, release and blur",
  );
} finally {
  await browser.close();
}
