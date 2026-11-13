/** Real CLI and browser acceptance for non-blocking, source-bound review suggestions. */
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { startPreview } from "../src/cli/preview.ts";
import {
  launchBrowser,
  waitForFrames,
} from "./browser/support/browser.mjs";
const directory = await mkdtemp(join(tmpdir(), "levelspec-suggestions-"));
const file = join(directory, "level.aml");
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<architecture version="1" id="review-flight" name="Suggestion acceptance" units="meters" validation="premap" curve-tolerance="0.01">
  <path id="lower:path" closed="false" points="0 0 0; 2 0 0"/>
  <path id="right:path" closed="false" points="2 0 0; 2 4 1.2"/>
  <path id="upper:path" closed="false" points="2 4 1.2; 0 4 1.2"/>
  <path id="left:path" closed="false" points="0 4 1.2; 0 0 0"/>
  <path id="side-wall:path" closed="false" points="-0.21 0 0; -0.21 4 0"/>
  <path id="flight:left" paths="right:path" closed="false" points=""/>
  <path id="flight:right" paths="-left:path" closed="false" points=""/>
  <profile id="flight:profile" paths="lower:path right:path upper:path left:path"/>
  <group id="stairs">
    <stairs id="flight" group="stairs" left="flight:left" right="flight:right" maximum-riser="0.18" thickness="0.2" underside="filled"/>
  </group>
  <group id="barriers"/>
  <assembly id="migration:static-walls" coincident-material="retained-face">
    <wall id="side-wall" group="barriers" path="side-wall:path" thickness="0.22" height="3" alignment="center" join="miter" dynamic="false" span-floors="false"/>
  </assembly>
  <box id="overhead" position="-1 -1 6" width="4" depth="6" height="0.20000000000000018" radius="0.5" top-radius="0" dynamic="false" group="stairs"/>
  <player radius="0.25" height="2" step="0.45" slope="42" crouch="1.1" vault="0" rappel="false" ladder="false"/>
  <sky color="#dce8f5" intensity="0.5"/>
</architecture>
`;
const exec = promisify(execFile);
let server, browser;
try {
  await writeFile(file, xml);
  const cli = async (...args) =>
    JSON.parse(
      (
        await exec(process.execPath, ["bin/levelspec.mjs", ...args, "--json"], {
          maxBuffer: 10_000_000,
        })
      ).stdout,
    );
  const validation = await cli("validate", file);
  assert.equal(
    validation.success,
    true,
    "Suggestions cannot fail declared premap validation",
  );
  assert.equal(
    validation.suggestions.filter(
      (s) => !s.code.startsWith("NAV_") && s.code !== "FLIGHT_NAV_MISSING",
    ).length,
    2,
  );
  assert.ok(validation.suggestions.every((s) => s.state === "active"));
  const finding = validation.suggestions.find(
    (s) => s.code === "FLIGHT_WALL_GAP",
  );
  assert.ok(finding);
  assert.equal(
    new URL(finding.review.url, "http://localhost").searchParams.get(
      "suggestion",
    ),
    finding.id,
  );
  assert.deepEqual(finding.review.arguments, [
    "preview",
    file,
    "--suggestion",
    finding.id,
  ]);
  const output = join(directory, "output");
  const build = await cli("build", file, "--out", output, "--no-uv");
  assert.equal(build.success, true);
  assert.deepEqual(
    JSON.parse(
      await readFile(join(output, "review-flight.suggestions.json"), "utf8"),
    ),
    build.suggestions,
  );
  assert.equal(
    JSON.parse(
      await readFile(join(output, "review-flight.runtime.json"), "utf8"),
    ).suggestions,
    undefined,
  );
  server = await startPreview(file, { port: 0, suggestion: finding.id });
  browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.url);
  const ready = () =>
    page.waitForFunction(
      () => document.querySelector("#status")?.dataset.state === "ready",
      null,
      { timeout: 60000 },
    );
  await ready();
  assert.match(
    await page.locator("#suggestions").innerText(),
    new RegExp(`${validation.suggestions.length} active suggestions`),
  );
  assert.match(await page.locator("#selection").innerText(), /flight/);
  await page.waitForFunction(
    () =>
      JSON.parse(document.querySelector("#model").dataset.view).viewHeight < 20,
  );
  const actualView = () =>
    page.locator("#model").getAttribute("data-view").then(JSON.parse);
  assert.deepEqual(
    (await actualView()).target,
    finding.position,
    "Deep link must target the measured finding",
  );
  const warning = validation.diagnostics.find(diagnostic => diagnostic.suggestion?.id === finding.id);
  assert.equal(warning.severity, "warning");
  assert.deepEqual(warning.review.arguments, ["preview", file, "--diagnostic", finding.id]);
  const diagnosticURL = new URL(server.url);
  diagnosticURL.searchParams.delete("suggestion");
  diagnosticURL.searchParams.set("diagnostic", finding.id);
  const diagnosticPage = await context.newPage();
  await diagnosticPage.goto(diagnosticURL.href);
  await diagnosticPage.waitForFunction(() => document.querySelector("#status")?.dataset.state === "ready");
  assert.deepEqual(JSON.parse(await diagnosticPage.locator("#model").getAttribute("data-view")).target, finding.position);
  const diagnosticRow = diagnosticPage.locator(`article[data-diagnostic="${finding.id}"]`);
  await diagnosticRow.getByRole("button", { name: "Copy suppression XML" }).click();
  assert.match(await diagnosticPage.evaluate(() => navigator.clipboard.readText()), /review-suppression.*fingerprint=/);
  await diagnosticRow.getByRole("button", { name: "Copy review link" }).click();
  assert.equal(new URL(await diagnosticPage.evaluate(() => navigator.clipboard.readText())).searchParams.get("diagnostic"), finding.id);
  await diagnosticRow.getByRole("button", { name: "Cutaway" }).click();
  assert.match(await diagnosticPage.locator("#selection").innerText(), /flight/);
  assert.ok(Number(await diagnosticPage.locator("#cut").inputValue()) < 1, "Diagnostic cutaway must update the rendered clipping control");
  await diagnosticPage.close();
  const explicit = new URL(server.url);
  explicit.searchParams.set("camera", "12 -14 10");
  explicit.searchParams.set("target", "1 2 1");
  explicit.searchParams.set("view-height", "17");
  explicit.searchParams.set("roll", "-23");
  const replay = await context.newPage();
  await replay.goto(explicit.href);
  await replay.waitForFunction(
    () => document.querySelector("#status")?.dataset.state === "ready",
  );
  const replayView = JSON.parse(
    await replay.locator("#model").getAttribute("data-view"),
  );
  replayView.position.forEach((value, i) =>
    assert.ok(Math.abs(value - [12, -14, 10][i]) < 1e-6),
  );
  assert.deepEqual(replayView.target, [1, 2, 1]);
  assert.equal(replayView.viewHeight, 17);
  assert.ok(Math.abs(replayView.roll + 23) < 1e-6);
  assert.match(await replay.locator("#selection").innerText(), /side-wall/);
  await replay.locator(`article.suggestion[data-suggestion="${finding.id}"]`)
    .getByRole("button", { name: "Copy review link" }).click();
  const strippedLink = new URL(await replay.evaluate(() => navigator.clipboard.readText()));
  for (const key of ["camera", "target", "view-height", "fov", "roll"])
    assert.equal(strippedLink.searchParams.has(key), false, `Suggestion link must clear ${key}`);
  await replay.locator("#suggestions").getByRole("button", { name: "Restore previous view" }).click();
  await waitForFrames(replay);
  const rolledMatrix = (await replay.locator("#model").getAttribute("data-view-matrix")).split(",").map(Number);
  await replay.locator(`article.suggestion[data-suggestion="${finding.id}"]`)
    .getByRole("button", { name: "Inspect", exact: true }).click();
  await replay.locator("#camera-controls > summary").click();
  await replay.locator("#camera-roll").fill("57");
  await replay.locator("#camera-form button").click();
  await replay.waitForFunction(() => Math.abs(JSON.parse(document.querySelector("#model").dataset.view).roll - 57) < 1e-6);
  await replay.locator("#suggestions").getByRole("button", { name: "Restore previous view" }).click();
  await replay.waitForFunction(() => Math.abs(JSON.parse(document.querySelector("#model").dataset.view).roll + 23) < 1e-6);
  const restoredRolledMatrix = (await replay.locator("#model").getAttribute("data-view-matrix")).split(",").map(Number);
  restoredRolledMatrix.forEach((value, i) => assert.ok(Math.abs(value - rolledMatrix[i]) < 1e-6));
  await replay.close();
  const row = page.locator(
    `article.suggestion[data-suggestion="${finding.id}"]`,
  );
  await row.getByRole("button", { name: "Copy suppression XML" }).click();
  const annotation = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(annotation, /fingerprint="[a-f0-9]{64}"/);
  await row.getByRole("button", { name: "Copy review link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(new URL(link).searchParams.get("suggestion"), finding.id);
  await page.locator("#view-2d").click();
  assert.equal(await page.locator(".suggestion-marker").count(), 1);
  assert.ok(
    (await page
      .locator('#plan [data-object="flight"][data-selected="true"]')
      .count()) > 0,
  );
  assert.ok(
    (await page
      .locator('#plan [data-object="side-wall"][data-selected="true"]')
      .count()) > 0,
    "Inspection highlights both wall and flight",
  );
  await row.getByRole("button", { name: "Cutaway", exact: true }).click();
  assert.ok(Number(await page.locator("#cut").inputValue()) < 1);
  await page.locator("#suggestions").getByRole("button", { name: "Restore previous view" }).click();
  assert.equal(await page.locator(".suggestion-marker").count(), 0);
  assert.equal(await page.locator("#cut").inputValue(), "1");
  const restoredCamera = await actualView();
  const restoredPlan = await page.locator("#plan svg").getAttribute("viewBox");
  await row.getByRole("button", { name: "Inspect", exact: true }).click();
  await page.locator("#suggestions").getByRole("button", { name: "Restore previous view" }).click();
  const restoredActual = await actualView();
  for (const key of ["position", "target"])
    restoredActual[key].forEach((value, i) =>
      assert.ok(Math.abs(value - restoredCamera[key][i]) < 1e-6),
    );
  assert.equal(restoredActual.viewHeight, restoredCamera.viewHeight);
  assert.ok(Math.abs(restoredActual.roll - restoredCamera.roll) < 1e-6);
  assert.equal(
    await page.locator("#plan svg").getAttribute("viewBox"),
    restoredPlan,
  );
  await row.getByRole("button", { name: "Inspect", exact: true }).click();
  await page.locator("#view-3d").click();
  await row.getByRole("button", { name: "Cutaway", exact: true }).click();
  await waitForFrames(page);
  await mkdir("website-qa/suggestions", { recursive: true });
  await page.screenshot({ path: "website-qa/suggestions/inspection.png" });
  await writeFile(
    file, xml.replace(
      "</architecture>",
      annotation.replace(
        "REPLACE WITH REVIEW REASON",
        "Intentional courtyard stair",
      ) + "</architecture>",
    ));
  await page.waitForFunction(
    (count) =>
      document
        .querySelector("#suggestions")
        ?.textContent.includes(`${count} active suggestions`),
    validation.suggestions.length - 1,
  );
  await ready();
  assert.match(
    await page.locator("#suggestions").innerText(),
    /Suppressed \(1\)/,
  );
  const edited = xml
    .replaceAll('4 1.2', '4 1.3')
    .replace("</architecture>", annotation + "</architecture>");
  await writeFile(file, edited);
  await page.waitForFunction(() =>
    document
      .querySelector("#suggestions")
      ?.textContent.includes("Geometry changed; review again"),
  );
  await ready();
  await writeFile(file, "<broken");
  await page.waitForFunction(
    () => document.querySelector("#status")?.dataset.state === "error",
  );
  assert.equal(await page.locator("#suggestions button:enabled").count(), 0);
  await writeFile(file, xml);
  await ready();
  const floorXML = (id, x, size) =>
    `<profile id="${id}:profile" points="${x} 0; ${x + size} 0; ${x + size} ${size}; ${x} ${size}"/>
    <group id="${id}"><slab id="${id}floor" profile="${id}:profile" thickness="0.2"/></group>`;
  const islandsXML = `<architecture version="1" id="nav-review" name="Navigation review" validation="premap">${floorXML("main", 0, 6)}${floorXML("tiny", 10, 1.5)}</architecture>`;
  await writeFile(file, islandsXML);
  const islandResult = await cli("validate", file);
  const island = islandResult.suggestions.find((s) => s.code === "NAV_ISLAND");
  assert.ok(island);
  const islandWarning = islandResult.diagnostics.find(diagnostic => diagnostic.suggestion?.id === island.id);
  await page.goto(new URL(islandWarning.review.url, server.url).href);
  await ready();
  assert.match(await page.locator("#selection").innerText(), /tinyfloor/);
  assert.deepEqual((await actualView()).target, island.position, "A late navigation warning frames its final inspection target");
  assert.equal(await page.locator("#navigation").inputValue(), "land");
  await page.locator("#view-2d").click();
  const overlay = await page
    .locator("#plan .navigation-overlay")
    .getAttribute("d");
  assert.ok(overlay.includes("M "));
  assert.ok(
    overlay
      .split("M ")
      .slice(1)
      .every((triangle) => Number(triangle.trim().split(",")[0]) > 9),
    "Only the detached island is highlighted",
  );
  await page.locator("#diagnostics").getByRole("button", { name: "Restore previous view" }).click();
  assert.equal(await page.locator("#navigation").inputValue(), "");
  await writeFile(
    file, xml.replace('</group>', '<roof id="flight:ceiling" group="stairs" profile="flight:profile" thickness="0.2" flat="true" elevation="1.7"/></group>'));
  const missingResult = await cli("validate", file);
  const missing = missingResult.suggestions.find(
    (s) => s.code === "FLIGHT_NAV_MISSING",
  );
  assert.ok(missing);
  await page.goto(new URL(missing.review.url, server.url).href);
  await ready();
  assert.match(await page.locator("#selection").innerText(), /flight/);
  assert.equal(await page.locator("#navigation").inputValue(), "land");
  await page.goto(new URL("?suggestion=missing", server.url).href);
  await ready();
  assert.match(
    await page.locator("#suggestions").innerText(),
    /no longer exists/,
  );
  await page.goto(new URL("?diagnostic=missing", server.url).href);
  await ready();
  assert.match(await page.locator("#diagnostics").innerText(), /no longer exists/);
  assert.deepEqual(errors, []);
  console.log(
    "Suggestion CLI artifacts, deep links, 2D/3D inspection, clipboard, suppression invalidation and live recovery passed.",
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(directory, { recursive: true, force: true });
}
