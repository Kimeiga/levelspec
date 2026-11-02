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
} from "../website/tests/browser-helpers.mjs";
const directory = await mkdtemp(join(tmpdir(), "levelspec-suggestions-"));
const file = join(directory, "level.level.svgx");
const xml = `<level version="2" id="review-flight" name="Suggestion acceptance" validation="premap"><layer id="stairs"><vertex id="a" x="0" y="0" z="0"/><vertex id="b" x="2" y="0" z="0"/><vertex id="c" x="2" y="4" z="1.2"/><vertex id="d" x="0" y="4" z="1.2"/><edge id="lower" from="a" to="b" kind="open"/><edge id="right" from="b" to="c" kind="open"/><edge id="upper" from="c" to="d" kind="open"/><edge id="left" from="d" to="a" kind="open"/><region id="flight" boundary="lower right upper left" fill="stairs" lower="lower" upper="upper"/></layer><layer id="barriers"><vertex id="wall-a" x="-0.21" y="0" z="0"/><vertex id="wall-b" x="-0.21" y="4" z="0"/><edge id="side-wall" from="wall-a" to="wall-b" kind="wall" height="3" thickness="0.22"/></layer><cover id="overhead" layer="stairs" min="-1 -1 6" max="3 5 6.2"/></level>`;
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
  await replay.getByRole("button", { name: "Restore previous view" }).click();
  await waitForFrames(replay);
  const rolledMatrix = (await replay.locator("#model").getAttribute("data-view-matrix")).split(",").map(Number);
  await replay.locator(`article.suggestion[data-suggestion="${finding.id}"]`)
    .getByRole("button", { name: "Inspect", exact: true }).click();
  await replay.locator("#camera-controls > summary").click();
  await replay.locator("#camera-roll").fill("57");
  await replay.locator("#camera-form button").click();
  await replay.waitForFunction(() => Math.abs(JSON.parse(document.querySelector("#model").dataset.view).roll - 57) < 1e-6);
  await replay.getByRole("button", { name: "Restore previous view" }).click();
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
  await page.getByRole("button", { name: "Restore previous view" }).click();
  assert.equal(await page.locator(".suggestion-marker").count(), 0);
  assert.equal(await page.locator("#cut").inputValue(), "1");
  const restoredCamera = await actualView();
  const restoredPlan = await page.locator("#plan svg").getAttribute("viewBox");
  await row.getByRole("button", { name: "Inspect", exact: true }).click();
  await page.getByRole("button", { name: "Restore previous view" }).click();
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
    file,
    xml.replace(
      "</level>",
      annotation.replace(
        "REPLACE WITH REVIEW REASON",
        "Intentional courtyard stair",
      ) + "</level>",
    ),
  );
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
    .replaceAll('z="1.2"', 'z="1.3"')
    .replace("</level>", annotation + "</level>");
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
    `<layer id="${id}">${[
      [x, 0],
      [x + size, 0],
      [x + size, size],
      [x, size],
    ]
      .map(([x, y], i) => `<vertex id="${id}v${i}" x="${x}" y="${y}" z="0"/>`)
      .join(
        "",
      )}${[0, 1, 2, 3].map((i) => `<edge id="${id}e${i}" from="${id}v${i}" to="${id}v${(i + 1) % 4}" kind="open"/>`).join("")}<region id="${id}floor" boundary="${[0, 1, 2, 3].map((i) => id + "e" + i).join(" ")}" fill="floor"/></layer>`;
  const islandsXML = `<level version="2" id="nav-review" name="Navigation review" validation="premap">${floorXML("main", 0, 6)}${floorXML("tiny", 10, 1.5)}</level>`;
  await writeFile(file, islandsXML);
  const islandResult = await cli("validate", file);
  const island = islandResult.suggestions.find((s) => s.code === "NAV_ISLAND");
  assert.ok(island);
  await page.goto(new URL(island.review.url, server.url).href);
  await ready();
  assert.match(await page.locator("#selection").innerText(), /tinyfloor/);
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
  await page.getByRole("button", { name: "Restore previous view" }).click();
  assert.equal(await page.locator("#navigation").inputValue(), "");
  await writeFile(
    file,
    xml.replace('fill="stairs"', 'fill="stairs" ceiling="1.5"'),
  );
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
  assert.deepEqual(errors, []);
  console.log(
    "Suggestion CLI artifacts, deep links, 2D/3D inspection, clipboard, suppression invalidation and live recovery passed.",
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(directory, { recursive: true, force: true });
}
