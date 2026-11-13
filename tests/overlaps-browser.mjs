/** Real CLI failure and source-linked inspection of invalid but renderable overlaps. */
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { startPreview } from "../src/cli/preview.ts";
import {
  launchBrowser,
  waitForFrames,
} from "./browser/support/browser.mjs";
const directory = await mkdtemp(join(tmpdir(), "levelspec-overlaps-")),
  file = join(directory, "level.aml");
const source = `<?xml version="1.0" encoding="UTF-8"?>
<architecture version="1" id="overlap-demo" name="Overlap acceptance" units="meters" validation="premap" curve-tolerance="0.01">
  <group id="objects"/>
  <box id="first" group="objects" material="default" position="0 0 0" rotation="0 0 0" anchor="bottom-center" width="2" depth="2" height="2" radius="0.5" top-radius="0" collidable="false"/>
  <box id="second" group="objects" material="default" position="0.5 0 0" rotation="0 0 0" anchor="bottom-center" width="2" depth="2" height="2" radius="0.5" top-radius="0" collidable="false"/>
  <player radius="0.25" height="2" step="0.45" slope="42" crouch="1.1" vault="0" rappel="false" ladder="false"/>
  <sky color="#dce8f5" intensity="0.5"/>
</architecture>
`;
const run = promisify(execFile);
let server, browser;
try {
  await writeFile(file, source);
  let failed;
  try {
    await run(process.execPath, [
      "bin/levelspec.mjs",
      "validate",
      file,
      "--json",
    ]);
  } catch (error) {
    assert.equal(error.code, 1);
    failed = JSON.parse(error.stdout);
  }
  assert.equal(failed.success, false);
  const diagnostic = failed.diagnostics.find(
    (d) => d.code === "SURFACE_COPLANAR",
  );
  assert.equal(diagnostic.severity, "error");
  assert.ok(diagnostic.review.patches.length);
  const warning = JSON.parse(
    (
      await run(process.execPath, [
        "bin/levelspec.mjs",
        "validate",
        file,
        "--json",
        "--surface-contacts",
        "warning",
      ])
    ).stdout,
  );
  assert.equal(warning.success, true);
  assert.equal(
    warning.diagnostics.find((d) => d.code === "SURFACE_COPLANAR").severity,
    "warning",
  );
  const off = JSON.parse(
    (
      await run(process.execPath, [
        "bin/levelspec.mjs",
        "validate",
        file,
        "--json",
        "--surface-contacts",
        "off",
      ])
    ).stdout,
  );
  assert.equal(
    off.diagnostics.some((d) => d.code === "SURFACE_COPLANAR"),
    false,
  );
  const output = join(directory, "published");
  await run(process.execPath, [
    "bin/levelspec.mjs",
    "build",
    file,
    "--out",
    output,
    "--no-uv",
    "--surface-contacts",
    "warning",
    "--json",
  ]);
  const previous = await readFile(join(output, "overlap-demo.runtime.json"));
  let buildFailed = false;
  try {
    await run(process.execPath, [
      "bin/levelspec.mjs",
      "build",
      file,
      "--out",
      output,
      "--no-uv",
      "--json",
    ]);
  } catch (error) {
    buildFailed = true;
    assert.equal(error.code, 1);
    assert.ok(
      JSON.parse(error.stdout).diagnostics.some(
        (d) => d.code === "SURFACE_COPLANAR",
      ),
    );
  }
  assert.ok(buildFailed);
  assert.deepEqual(
    await readFile(join(output, "overlap-demo.runtime.json")),
    previous,
    "Overlap failure preserves the previously published artifact",
  );
  server = await startPreview(file, {
    port: 0,
    diagnostic: diagnostic.review.id,
  });
  browser = await launchBrowser();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(server.url);
  const ready = () =>
    page.waitForFunction(
      () => document.querySelector("#status")?.dataset.state === "ready",
      null,
      { timeout: 60000 },
    );
  await ready();
  assert.equal(await page.locator("#validation").getAttribute("open"), "");
  assert.match(await page.locator("#selection").innerText(), /first.*second/);
  assert.match(await page.locator("#status").innerText(), /review validation/);
  await page.locator("#view-2d").click();
  assert.ok(
    (await page.locator("#plan polygon.suggestion-marker").count()) > 0,
  );
  await page.locator("#view-3d").click();
  await waitForFrames(page);
  assert.ok(await page.locator("#model canvas").count());
  await writeFile(
    file, source.replace('position="0.5 0 0"', 'position="0.5 0 2"'));
  await page.waitForFunction(() =>
    document
      .querySelector("#diagnostics")
      ?.textContent.includes("no longer exists"),
  );
  await ready();
  assert.equal(await page.locator("#diagnostics [data-diagnostic]").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS overlap default errors, warning/off controls, diagnostic link, patch inspection and resolved recompile.",
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(directory, { recursive: true, force: true });
}
