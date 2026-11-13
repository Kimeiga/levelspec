#!/usr/bin/env node
/**
 * Captures stills from the running preview (http://127.0.0.1:5183) for review.
 *
 *   node projects/ninefold-reboot/play/capture.mjs <out dir> [name ...]
 *
 * Views are glTF Y-up eye positions with yaw/pitch in degrees.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const VIEWS = {
  "t-spawn": [11, 1.86, -14, -40, 8], "canal-east": [30, 1.86, -20, -95, 8], "tailor-street": [36, 1.86, -22, -80, 12],
  "butcher": [14, 1.86, -33, 200, 4], "s1-foot": [18, 1.86, -42, -90, 6], "underpass": [52, 1.86, -34, 10, 4],
  "well-up": [51, 1.86, -46.5, 20, 55], "site-b": [48, 5.06, -40, -120, -4], "site-a": [78, 1.86, -46, -90, 0],
  "ct-spawn": [78, 1.86, -78, 135, 10], "boiler": [40, 1.86, -62, 100, 6], "roof": [54, 8.26, -70, -140, 6],
  "skyline": [13, 1.86, -20, -50, 38], "water-street": [70, 1.86, -76, 80, 12], "overview": [10, 85, 25, -32, -52],
};
const [out, ...names] = process.argv.slice(2);
if (!out) {
  console.error("Usage: capture.mjs <out dir> [view ...]");
  process.exit(2);
}
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CAPTURE_CHANNEL ?? "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const problems = [];
page.on("console", (message) => { if (message.type() === "error") problems.push(message.text()); });
page.on("pageerror", (error) => problems.push(String(error)));
for (const name of names.length ? names : Object.keys(VIEWS)) {
  const [x, y, z, yaw, pitch] = VIEWS[name];
  await page.goto(`http://127.0.0.1:5183/?hud=0&pos=${x},${y},${z}&yaw=${yaw}&pitch=${pitch}${process.env.CAPTURE_QUERY ?? ""}`);
  await page.waitForFunction(() => globalThis.ninefoldReady === true, null, { timeout: 120000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, `${name}.jpg`), type: "jpeg", quality: 88 });
  console.log("captured", name);
}
const info = await page.evaluate(() => document.querySelector("#status")?.textContent);
console.log("status:", info);
if (problems.length) console.log("page problems:\n" + [...new Set(problems)].join("\n"));
await browser.close();
