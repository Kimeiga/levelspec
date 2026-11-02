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
    // Poll independently of requestAnimationFrame: software WebGL rendering
    // can stall the animation callback while the walk state is still active.
    { timeout: 12000, polling: 100 },
  );
}
export async function holdKeyUntilMoved(page, key, before, distance) {
  // Walking depends on scene geometry and textures, not the asynchronous light
  // bake. Do not turn a slow or unavailable bake into a locomotion failure.
  try {
    await page.waitForFunction(
      () => {
        const state = document.querySelector("#model")?.dataset;
        return state?.mode === "walk" && state.textures === "ready" && state.detail === "ready";
      },
      undefined,
      // This readiness predicate is DOM state, not an animation-frame condition.
      // Software-rendered WebGL may stall requestAnimationFrame in headless Chrome.
      { timeout: 15000, polling: 100 },
    );
    await page.keyboard.down(key);
    // Chromium pointer lock may suppress the initial automation keydown or
    // blur may clear pressed keys. Repeat real DOM keydown events while held.
    // This exercises the normal input handler, never mutates player position.
    const repeat = await page.evaluate((key) => {
      const press = () => window.dispatchEvent(new KeyboardEvent("keydown", {
        key, bubbles: true, cancelable: true, repeat: true,
      }));
      press();
      return window.setInterval(press, 120);
    }, key);
    try {
      await waitForMovement(page, before, distance);
    } finally {
      await page.evaluate((id) => window.clearInterval(id), repeat);
    }
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
    await page.evaluate(
      (key) => window.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true })),
      key,
    );
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
