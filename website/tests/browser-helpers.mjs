import { chromium } from "playwright";
import { access } from "node:fs/promises";

export async function launchBrowser() {
  const software = process.env.SOFTWARE_RENDERING === "1";
  let executablePath = process.env.BROWSER_PATH;
  if (!executablePath && !software && process.platform === "darwin") {
    const chrome =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    try {
      await access(chrome);
      executablePath = chrome;
    } catch {}
  }
  return chromium.launch({
    headless: true,
    executablePath,
    args: software ? ["--use-angle=swiftshader"] : undefined,
  });
}
/** Workflow/screenshots start still. The graphics suite explicitly tests animation. */
export const testContext = (browser, options = {}) =>
  browser.newContext({ reducedMotion: "reduce", ...options });

export async function waitForFrames(page, count = 2) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        const frame = () =>
          --count <= 0 ? resolve() : requestAnimationFrame(frame);
        requestAnimationFrame(frame);
      }),
    count,
  );
}
export async function waitForMovement(page, before, distance) {
  await page.waitForFunction(
    ({ before, distance }) => {
      const element = document.querySelector("#model");
      const after = element?.dataset.player?.split(",").map(Number);
      return (
        element?.dataset.mode === "walk" &&
        after?.length === 3 &&
        Math.hypot(after[0] - before[0], after[1] - before[1]) > distance
      );
    },
    { before, distance },
    { timeout: 10000 },
  );
}
export async function holdKeyUntilMoved(page, key, before, distance) {
  await page.keyboard.down(key);
  try {
    await waitForMovement(page, before, distance);
  } finally {
    await page.keyboard.up(key);
  }
}
export async function waitForVisualReady(page) {
  await page.waitForFunction(
    () => {
      const state = document.querySelector("#model")?.dataset;
      return (
        state?.textures === "ready" &&
        state.detail === "ready" &&
        ["ready", "live"].includes(state.bake)
      );
    },
    undefined,
    { timeout: 45000 },
  );
  await waitForFrames(page);
}
