import { chromium } from "playwright";
import { access } from "node:fs/promises";

/** Launches an available browser, honoring explicit software-rendering and binary overrides. */
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
/** Opens a deterministic reduced-motion context unless a scenario overrides it. */
export async function testContext(browser, options = {}) {
  return browser.newContext({ reducedMotion: "reduce", ...options });
}

/** Waits for delivered browser frames without an arbitrary settling delay. */
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
