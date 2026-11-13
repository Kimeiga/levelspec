import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { availableParallelism, tmpdir, totalmem } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { Worker } from "node:worker_threads";
import { collisionMesh, compile } from "levelspec";
import { withBuiltinMaterialImages } from "../src/materials/images.ts";
import type { SurfaceMaterialArtifact, SurfaceMaterialCache } from "../src/dressing/surface/material-cache.ts";
import { compileDemo } from "../tools/dressing-demo/compile.ts";
import { prepareDemoPreset } from "../tools/dressing-demo/presets.ts";
import type { RasterPoolReport } from "../tools/dressing-demo/parallel-raster.ts";
import { rasterCodeHash, replayHash, type RasterReplayInput, type RasterWorkerInput,
  type RasterWorkerMessage } from "../tools/dressing-demo/raster-protocol.ts";
import { decodeSurfaceImage, encodeSurfaceImage } from "../src/dressing/surface/images.ts";

const SOURCE = `<architecture version="1" id="worker-contract">
  <material id="finish" color="#c6c2b4" texture="source.png" repeat="2"/>
  <profile id="plan" points="0 0; 1 0; 1 1; 0 1"/>
  <slab id="floor" profile="plan" thickness="0.2" material="finish"/>
  <path id="axis" points="0 0 0; 1 0 0"/>
  <wall id="wall" path="axis" thickness="0.2" height="1" material="finish"/>
  <dressing theme="kowloon-street@1" seed="worker-contract" detail="low">
    <wall host="wall" material="finish" face="back" windows="false" tile-share="0" texture-density="16"/>
    <floor host="floor" material="finish" ground="patched" texture-density="16"
      relief="0" wetness="0" litter="0" repairs="0" tile-share="1" timber-share="0"
      asphalt="0" manholes="0" breakup="0"/>
  </dressing>
</architecture>`;
const IMAGE = encodeSurfaceImage({ width: 2, height: 2,
  data: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]) });
const BUDGETS = { limits: { triangles: 50_000 },
  appearance: { maximumTexels: 1_000_000, maximumBytes: 16 * 1024 * 1024 } };
const PARALLEL = availableParallelism() >= 2 && totalmem() >= 5 * 1024 ** 3;
const PARALLEL_SKIP = PARALLEL ? false : "Real pool coverage requires two CPUs and enough memory for two scene replicas";
const NO_CACHE: SurfaceMaterialCache = { async read() { return undefined; }, async write() {} };

/** Captures user-visible geometry, ownership, materials and every generated asset byte. */
function result(level: Awaited<ReturnType<typeof compileDemo>>) {
  return { mesh: level.mesh, surfaces: level.surfaces, document: level.document, architecture: level.architecture,
    physicalHash: level.physicalHash, renderHash: level.renderHash, collision: collisionMesh(level, true),
    appearance: level.surfaceAppearance, assets: level.generatedImages, diagnostics: level.diagnostics };
}

test("real raster workers match serial output and use owned frozen material byte views", { skip: PARALLEL_SKIP }, async () => {
  const serial = await compile(prepareDemoPreset(SOURCE, "kowloon"), {
    ...BUDGETS, navigation: false, materialCache: NO_CACHE, resolveMaterialImage: async () => IMAGE,
  });
  assert.deepEqual(serial.diagnostics.filter(diagnostic => diagnostic.severity === "error"), []);
  assert.ok(serial.surfaceAppearance && serial.surfaceAppearance.charts >= 2);
  const backing = new Uint8Array(IMAGE.length + 10).fill(211);
  backing.set(IMAGE, 5);
  const view = backing.subarray(5, backing.length - 5), references: string[] = [], pools: number[] = [];
  let poolReport: RasterPoolReport | undefined;
  const parallel = await compileDemo(SOURCE, "kowloon", {
    workers: 2, budgets: BUDGETS, navigation: false, materialCache: NO_CACHE,
    resolveMaterialImage: async reference => { references.push(reference); return view; },
    onRasterPool(report) {
      poolReport = report;
      pools.push(report.workers);
      backing.fill(0);
    },
  });
  assert.deepEqual(pools, [2], "The fixture actually ran a replay worker");
  assert.ok(Number.isInteger(poolReport!.jobs) && poolReport!.jobs >= 2);
  assert.ok(poolReport!.workers <= poolReport!.jobs);
  assert.equal(poolReport!.texels, parallel.surfaceAppearance!.texels);
  assert.equal(references.filter(reference => reference === "source.png").length, 1,
    "Workers cannot reload the mutable authored source");
  assert.equal(new Set(references).size, references.length, "Each external source is frozen once");
  assert.equal(view.byteLength, IMAGE.length, "Dispatch never detaches caller-owned storage");
  assert.ok(view.every(byte => byte === 0), "The original material was changed after its snapshot was frozen");
  assert.deepEqual(result(parallel), result(serial));
  const used = new Set(parallel.mesh.surfaces.map(index => parallel.surfaces[index].material));
  const bindings = parallel.document.materials.filter(material => used.has(material.id) && material.id.startsWith("$surface/raster/"));
  assert.ok(bindings.length >= 2);
  for (const material of bindings) for (const reference of [material.texture, material.metallicRoughnessTexture, material.normalTexture]) {
    if (!reference) continue;
    const actual = parallel.generatedImages![reference], expected = serial.generatedImages![reference];
    assert.ok(actual && expected);
    assert.equal(actual.hash, expected.hash);
    assert.deepEqual(decodeSurfaceImage(actual.bytes), decodeSurfaceImage(expected.bytes));
  }
});

test("real replay workers retain the full plan when some material artifacts are cached", { skip: PARALLEL_SKIP }, async () => {
  const entries = new Map<string, SurfaceMaterialArtifact>();
  let hits = 0;
  const cache: SurfaceMaterialCache = {
    async read(key) { const value = entries.get(key); if (value) hits++; return value; },
    async write(value) { entries.set(value.key, structuredClone(value)); },
  };
  let coldReport: RasterPoolReport | undefined, warmReport: RasterPoolReport | undefined;
  const cold = await compileDemo(SOURCE, "kowloon", {
    workers: 1, budgets: BUDGETS, navigation: false, materialCache: cache,
    resolveMaterialImage: async () => IMAGE, onRasterPool(report) { coldReport = report; },
  });
  assert.ok(entries.size > 0, "The real fixture must populate an eligible finished-material cache entry");
  assert.equal(hits, 0);
  assert.ok(coldReport && coldReport.jobs >= 3, "Partial replay needs a retained artifact and at least two pending jobs");
  const retained = entries.entries().next().value!;
  entries.clear();
  entries.set(...retained);
  const warm = await compileDemo(SOURCE, "kowloon", {
    workers: 2, budgets: BUDGETS, navigation: false, materialCache: cache,
    resolveMaterialImage: async () => IMAGE, onRasterPool(report) { warmReport = report; },
  });
  assert.ok(hits > 0, "The second compile must combine actual cache hits with replay work");
  assert.ok(coldReport && warmReport);
  assert.equal(warmReport.workers, 2);
  assert.ok(warmReport.jobs >= 2 && warmReport.jobs < coldReport.jobs);
  assert.ok(warmReport.texels > 0 && warmReport.texels < coldReport.texels);
  assert.deepEqual(result(warm), result(cold), "Sparse pending jobs retain the original scene's complete material bindings");
});

test("replay workers reject changed input and job manifests before emitting results and exit naturally", { timeout: 20_000 }, async t => {
  const codeHash = await rasterCodeHash();
  const snapshots = new Map<string, Uint8Array>(), read = withBuiltinMaterialImages(async () => IMAGE);
  const prepared = await compile(prepareDemoPreset(SOURCE, "kowloon"), { ...BUDGETS, navigation: false,
    resolveMaterialImage: async (reference, signal) => {
      const bytes = await read(reference, signal);
      snapshots.set(reference, Uint8Array.from(bytes));
      return bytes;
    } });
  assert.deepEqual(prepared.diagnostics.filter(diagnostic => diagnostic.severity === "error"), []);
  assert.ok(snapshots.has("source.png"));
  for (const failure of ["input", "jobs"] as const) {
    const input: RasterReplayInput = {
      source: SOURCE, preset: "kowloon", budgets: BUDGETS, images: structuredClone([...snapshots]),
    };
    const inputHash = replayHash(input);
    if (failure === "input") input.source = input.source.replace('id="worker-contract"', 'id="changed-input"');
    const workerData: RasterWorkerInput = { input, inputHash, codeHash, jobsHash: "deliberately-not-the-job-manifest", indices: [0] };
    const worker = new Worker(new URL("../tools/dressing-demo/raster-worker.ts", import.meta.url), { workerData });
    t.after(() => worker.terminate());
    const messages: RasterWorkerMessage[] = [];
    worker.on("message", (message: RasterWorkerMessage) => messages.push(message));
    const [exitCode] = await once(worker, "exit");
    assert.equal(exitCode, 0, "A rejected replay closes its port and exits without forced termination");
    assert.equal(messages.length, 1);
    assert.equal(messages[0].kind, "error");
    if (messages[0].kind === "error") assert.match(messages[0].message,
      failure === "input" ? /input.*changed/i : /job plan changed/i);
  }
});

test("cancelling active replay workers releases the process and permits the next compile", {
  skip: PARALLEL_SKIP, timeout: 30_000,
}, async t => {
  const directory = await mkdtemp(join(tmpdir(), "levelspec-worker-cancel-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const script = join(directory, "cancel.mjs");
  const compileUrl = new URL("../tools/dressing-demo/compile.ts", import.meta.url).href;
  await writeFile(script, `import assert from "node:assert/strict";
import { compileDemo } from ${JSON.stringify(compileUrl)};
const source = ${JSON.stringify(SOURCE)};
const image = new Uint8Array(${JSON.stringify(Array.from(IMAGE))});
const budgets = ${JSON.stringify(BUDGETS)};
const materialCache = { read: async () => undefined, write: async () => {} };
const controller = new AbortController(), pools = [];
await assert.rejects(compileDemo(source, "kowloon", {
  workers: 2, budgets, navigation: false, signal: controller.signal, materialCache,
  resolveMaterialImage: async () => image,
  onRasterPool(report) {
    pools.push(report.workers);
    setImmediate(() => controller.abort());
  },
}), error => error.name === "AbortError");
assert.deepEqual(pools, [2]);
const next = await compileDemo(source, "kowloon", {
  workers: 1, budgets, navigation: false, materialCache, resolveMaterialImage: async () => image,
});
assert.ok(!next.diagnostics.some(diagnostic => diagnostic.severity === "error"));
assert.ok(next.surfaceAppearance.charts >= 2);
console.log(JSON.stringify({ cancelled: true, recovered: true }));
`);
  const { stdout } = await promisify(execFile)(process.execPath, [script], { timeout: 25_000, maxBuffer: 1024 * 1024 });
  assert.deepEqual(JSON.parse(stdout.trim()), { cancelled: true, recovered: true });
});
