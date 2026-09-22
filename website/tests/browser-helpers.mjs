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
export async function testContext(browser, options = {}) {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    ...options,
  });
  await context.addInitScript(() => {
    window.__walkEvents = [];
    for (const type of [
      "keydown",
      "keyup",
      "blur",
      "focus",
      "visibilitychange",
      "pointerlockchange",
    ])
      window.addEventListener(
        type,
        (event) => {
          window.__walkEvents.push({
            type,
            key: event.key,
            time: performance.now(),
            hidden: document.hidden,
            active: document.activeElement?.id,
            mode: document.querySelector("#model")?.dataset.mode,
          });
          if (window.__walkEvents.length > 40) window.__walkEvents.shift();
        },
        true,
      );
  });
  context.on("page", (page) =>
    page.on("console", (message) => {
      if (["warning", "error"].includes(message.type()))
        console.error("BROWSER_CONSOLE", message.type(), message.text());
    }),
  );
  return context;
}

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
  // Geometry readiness precedes asynchronous bake binding and GPU material setup.
  try {
    await waitForVisualReady(page);
    await page.keyboard.down(key);
    await waitForMovement(page, before, distance);
  } catch (error) {
    const state = await page.evaluate(() => ({
      model: { ...document.querySelector("#model")?.dataset },
      hidden: document.hidden,
      active: document.activeElement?.outerHTML.slice(0, 200),
      events: window.__walkEvents,
    }));
    console.error(
      "WALK_FAILURE",
      JSON.stringify({ before, distance, ...state }),
    );
    throw error;
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
