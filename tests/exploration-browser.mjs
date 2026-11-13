import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { preview } from "vite";
import { launchBrowser } from "./browser/support/browser.mjs";
import { normalizeConfig, parsePacket, VERSION } from "../src/generate/exploration/index.ts";
import { evaluateGraph } from "../src/generate/exploration/metrics.ts";

const output = resolve("generated/exploration-browser");
await mkdir(output, { recursive: true });
const server = await preview({ configFile: resolve("vite.explore.config.ts"), preview: { host: "127.0.0.1", port: 63303, strictPort: true } });
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1450, height: 1100 }, reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__exploreWorkers = [];
  window.Worker = class extends NativeWorker {
    constructor(...args) { super(...args); this.record = {}; window.__exploreWorkers.push(this.record); }
    set onmessage(handler) { this.record.handler = handler; super.onmessage = event => { if (event.data.kind === "result") window.__lastPacket = event.data.packet; handler(event); }; }
    postMessage(message, ...args) { this.record.id = message.id; return super.postMessage(message, ...args); }
  };
});

try {
  await page.goto("http://127.0.0.1:63303/");
  await page.locator('#status[data-state="idle"]').waitFor();
  await page.locator("#proposals").fill("20000"); await page.locator("#restarts").fill("12");
  await page.locator("#run").click(); await page.locator('#status[data-state="running"]').waitFor();
  await page.locator("#cancel").click(); await page.locator('#status[data-state="cancelled"]').waitFor();

  await page.locator("#run").click(); await page.locator('#status[data-state="running"]').waitFor();
  await page.locator("#seed").fill("edited-during-run");
  await page.locator('#status[data-state="cancelled"]').waitFor();
  assert.equal(await page.locator("#seed").inputValue(), "edited-during-run");

  const node = page.locator('#drawing [data-node="entry"] circle');
  const bounds = await node.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width / 2 + 25, bounds.y + bounds.height / 2 - 20, { steps: 5 }); await page.mouse.up();
  assert.equal(await page.locator("#node-pin").isChecked(), true);
  const edited = JSON.parse(await page.locator("#config").inputValue());
  const pinned = edited.initial.nodes.find(n => n.id === "entry");
  edited.seed = "browser-frozen"; edited.proposals = 80; edited.restarts = 2; edited.elevations = [0]; edited.nodes = [4, 5]; edited.maxEdges = 7;
  edited.profile.modes = ["walk"]; edited.targets.crossings = 0;
  await page.getByText("Full configuration", { exact: true }).click();
  await page.locator("#config").fill(JSON.stringify(edited)); await page.locator("#apply-config").click();
  await page.locator("#decision-depth").fill("3"); await page.locator("#territories").fill("2"); await page.locator("#stacked-regions").fill("1");
  await page.locator("#verticality").fill(".75");
  await page.locator("#run").click(); await page.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
  const count = await page.locator(".candidate").count(); assert.ok(count >= 1);
  await page.evaluate(() => { const old = window.__exploreWorkers[0]; old.handler({ data: { id: old.id, kind: "result", packet: { ...window.__lastPacket, config: { ...window.__lastPacket.config, seed: "obsolete" } } } }); });
  assert.equal(await page.locator("#seed").inputValue(), "browser-frozen", "an obsolete worker result must not replace current input");
  if (count > 1) await page.locator('.candidate[data-candidate="1"]').click();
  await page.locator("#iteration").fill("0"); await page.locator("#iteration").dispatchEvent("input");
  assert.match(await page.locator("#iteration-label").textContent(), /Proposal 0/);
  await page.locator('.candidate[data-candidate="0"]').click();
  await page.locator("#interpretation").selectOption("galleries");
  await page.locator('[data-view="plan"]').click();
  await page.screenshot({ path: resolve(output, "lab-plan.png"), fullPage: true });
  const downloadPromise = page.waitForEvent("download"); await page.locator("#export").click();
  const download = await downloadPromise, exported = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.deepEqual(exported.candidates[0].graph.nodes.find(n => n.id === "entry"), pinned);
  assert.deepEqual([exported.config.targets.decisionDepth, exported.config.targets.territories, exported.config.targets.stackedRegions], [3, 2, 1]);
  assert.equal(exported.config.verticality, .75);
  assert.equal(await page.getByRole("heading", { name: "Structure before → after realization" }).count(), 1);
  exported.config.seed = "import-confirmed";
  await page.locator("#file").setInputFiles({ name: "experiment.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(exported)) });
  await page.waitForFunction(() => document.querySelector("#seed").value === "import-confirmed");
  await page.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
  assert.equal(await page.locator(".candidate").count(), count);
  assert.deepEqual(await Promise.all(["decision-depth", "territories", "stacked-regions"].map(id => page.locator(`#${id}`).inputValue())), ["3", "2", "1"]);
  assert.equal(await page.locator("#verticality").inputValue(), "0.75");
  await page.locator('[data-view="3d"]').click();
  await page.frameLocator("#preview").locator('#status[data-state="ready"]').waitFor({ timeout: 90000 });
  assert.ok(await page.frameLocator("#preview").locator("#model canvas").count());
  await page.screenshot({ path: resolve(output, "lab-3d.png"), fullPage: true });

  // A valid authored trace makes deleted-node editing independent of search heuristics or seed luck.
  const historyConfig = normalizeConfig({ seed: "history-edit", verticality: 0, proposals: 1, restarts: 1, nodes: [3, 4] });
  const initial = structuredClone(historyConfig.initial), final = structuredClone(initial);
  final.nodes = final.nodes.filter(n => n.id !== "a");
  final.edges = final.edges.filter(e => e.from !== "a" && e.to !== "a");
  final.edges.push({ ...initial.edges[0], id: "replacement", from: "entry", to: "key" });
  const history = parsePacket(JSON.stringify({ version: VERSION, config: historyConfig, candidates: [{
    id: "candidate-1-r1-p1", graph: final, proposals: 1, metrics: evaluateGraph(final, historyConfig), signature: [],
    trace: [{ proposal: 0, graph: initial, metrics: evaluateGraph(initial, historyConfig), mutation: "initial" },
      { proposal: 1, graph: final, metrics: evaluateGraph(final, historyConfig), mutation: "authored merge" }],
  }], realizations: [] }));
  const selection = history.candidates.findIndex(c => c.trace.some(f => f.graph.nodes.some(n => !c.graph.nodes.some(final => final.id === n.id))));
  assert.ok(selection >= 0, "the frozen fixture must include a node deleted after a retained frame");
  const candidate = history.candidates[selection], older = candidate.trace.findIndex(f => f.graph.nodes.some(n => !candidate.graph.nodes.some(final => final.id === n.id)));
  const deleted = candidate.trace[older].graph.nodes.find(n => !candidate.graph.nodes.some(final => final.id === n.id));
  await page.locator("#file").setInputFiles({ name: "history.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(history)) });
  await page.waitForFunction(() => document.querySelector("#seed").value === "history-edit");
  await page.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
  await page.locator(`[data-candidate="${selection}"]`).click(); await page.locator('[data-view="graph"]').click();
  await page.locator("#iteration").fill(String(older)); await page.locator("#iteration").dispatchEvent("input");
  const oldNode = await page.locator(`#drawing [data-node="${deleted.id}"] circle`).boundingBox();
  await page.mouse.move(oldNode.x + oldNode.width / 2, oldNode.y + oldNode.height / 2); await page.mouse.down();
  await page.mouse.move(oldNode.x + oldNode.width / 2 + 20, oldNode.y + oldNode.height / 2 + 10, { steps: 3 }); await page.mouse.up();
  assert.ok(JSON.parse(await page.locator("#config").inputValue()).initial.nodes.find(n => n.id === deleted.id)?.pinned);

  const floorConfig = normalizeConfig({ seed: "browser-floors", verticality: 0, elevations: [0, 4, 8], nodes: [3, 5],
    proposals: 1, restarts: 1, targets: { approaches: [{ from: "A", to: "C", edge: 1, vertex: 1 }] }, initial: {
      nodes: [{ id: "A", role: "entry", position: [-20, 0, 0], radius: 3 }, { id: "B", role: "area", position: [0, 0, 0], radius: 3 },
        { id: "C", role: "key", position: [20, 0, 4], radius: 3 }],
      edges: [{ id: "AB", from: "A", to: "B", mode: "walk", bidirectional: true, width: 3, bend: 0 },
        { id: "BC", from: "B", to: "C", mode: "stairs", crossLevel: true, bidirectional: true, width: 3, bend: 0 }],
    } });
  await page.locator("#config").fill(JSON.stringify(floorConfig)); await page.locator("#apply-config").click();
  await page.locator('#drawing [data-node="A"]').focus(); await page.keyboard.press("Enter");
  const heightInput = page.locator('#node-editor [data-coordinate="2"]');
  await heightInput.fill("4"); await heightInput.press("Tab");
  await page.locator('#status[data-state="error"]').waitFor();
  assert.equal(await heightInput.inputValue(), "0");
  assert.deepEqual(JSON.parse(await page.locator("#config").inputValue()).initial, floorConfig.initial);
  await page.getByText("Add / edit connection", { exact: true }).click();
  await page.locator("#edge-from").fill("A"); await page.locator("#edge-to").fill("B"); await page.locator("#edge-to").press("Tab");
  await page.locator("#edge-mode").selectOption("stairs"); await page.locator("#edge-cross-level").check(); await page.locator("#edge-save").click();
  await heightInput.fill("4"); await heightInput.press("Tab");
  await page.locator('#status[data-state="idle"]').waitFor();
  assert.equal(JSON.parse(await page.locator("#config").inputValue()).initial.nodes[0].position[2], 4);
  assert.equal(await page.locator('#drawing [data-edge="AB"]').getAttribute("data-cross-level"), "true");
  await page.locator("#edge-cross-level").uncheck(); await page.locator("#edge-save").click();
  await page.locator('#status[data-state="error"]').waitFor();
  assert.equal(JSON.parse(await page.locator("#config").inputValue()).initial.edges.find(e => e.id === "AB").crossLevel, true);
  await page.locator("#edge-cross-level").check(); await page.locator("#edge-save").click();
  await page.locator('#status[data-state="idle"]').waitFor();
  await page.locator("#run").click(); await page.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
  const floorDownloadPromise = page.waitForEvent("download"); await page.locator("#export").click();
  const floorDownload = await floorDownloadPromise, floorPacket = JSON.parse(await readFile(await floorDownload.path(), "utf8"));
  assert.equal(floorPacket.config.initial.edges.find(e => e.id === "AB").crossLevel, true);
  floorPacket.config.seed = "floor-import-confirmed";
  await page.locator("#file").setInputFiles({ name: "floors.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(floorPacket)) });
  await page.waitForFunction(() => document.querySelector("#seed").value === "floor-import-confirmed");
  await page.locator('#status[data-state="ready"]').waitFor({ timeout: 60000 });
  assert.equal(JSON.parse(await page.locator("#config").inputValue()).initial.edges.find(e => e.id === "AB").crossLevel, true);
  const resetInput = { ...floorConfig, seed: "new-floor-seed", verticality: 1, elevations: [7, -4, 12], initial: undefined,
    targets: { ...floorConfig.targets, approaches: [{ from: "entry", to: "key", edge: 2, vertex: 2 }] } };
  const resetConfig = normalizeConfig(resetInput);
  const priorResetConfig = normalizeConfig({ ...floorConfig, seed: "old-floor-seed", verticality: 0, elevations: resetInput.elevations });
  assert.notDeepEqual(priorResetConfig.initial, resetConfig.initial);
  await page.locator("#config").fill(JSON.stringify(priorResetConfig)); await page.locator("#apply-config").click();
  await page.locator("#seed").fill(resetInput.seed); await page.locator("#verticality").fill("1"); await page.locator("#reset").click();
  assert.deepEqual(JSON.parse(await page.locator("#config").inputValue()).initial, resetConfig.initial);
  assert.deepEqual(JSON.parse(await page.locator("#config").inputValue()).targets.approaches, resetConfig.targets.approaches);
  await page.screenshot({ path: resolve(output, "lab-verticality.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, "result.json"), JSON.stringify({ passed: true, candidateCount: count, cancelled: true, staleReplyRejected: true, historyDrag: deleted.id,
    crossLevelEditor: true, verticalityRoundtrip: true, customGraphReset: true, errors }, null, 2));
  console.log("Exploration browser acceptance passed: cancellation, input edits, pins, comparison, history, stale replies, export/import, cross-level editing, verticality/reset, native 3D and mobile width.");
} catch (error) {
  await page.screenshot({ path: resolve(output, "failure.png"), fullPage: true });
  await writeFile(resolve(output, "failure.json"), JSON.stringify({ message: String(error), errors }, null, 2));
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)); }
