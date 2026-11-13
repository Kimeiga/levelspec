import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { decodeMaterialPng } from "../src/materials/node-images.ts";
import { Matrix4 } from "three";
import { AmlError, collisionMesh, compile, parseAml } from "levelspec";
import type { ArchitectureCompileOptions } from "../src/architecture/types.ts";
import { KitMesh, type KitSlot } from "../src/dressing/kit-mesh.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import { weatheredPen } from "../src/dressing/kowloon/weathered.ts";
import { Pen } from "../src/dressing/pen.ts";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { encodeSurfaceImage, imageHash } from "../src/dressing/surface/images.ts";
import type { SurfaceMaterialArtifact, SurfaceMaterialCache } from "../src/dressing/surface/material-cache.ts";
import type { SurfaceMaterialRecipe } from "../src/dressing/surface/material.ts";
import { registerSurfaceChart, takeSurfaceCharts } from "../src/dressing/surface/plans.ts";
import type { SurfaceRasterExecutor } from "../src/dressing/surface/raster-execution.ts";
import type { SurfaceChart } from "../src/dressing/surface/types.ts";

const color = encodeSurfaceImage({ width: 2, height: 1, data: new Uint8Array([255, 80, 30, 255, 20, 150, 230, 255]) });
const changedColor = encodeSurfaceImage({ width: 2, height: 1, data: new Uint8Array([30, 80, 255, 255, 230, 150, 20, 255]) });
const normal = encodeSurfaceImage({ width: 1, height: 1, data: new Uint8Array([128, 160, 250, 255]) });
type Level = Awaited<ReturnType<typeof compile>>;
interface FixtureSettings {
  count?: number;
  version?: string;
  density?: number;
  span?: number;
  roughness?: number;
  repeat?: number;
  normalScale?: number;
  image?: Uint8Array;
  width?: number;
  shift?: number;
  tint?: number;
  extraMaterial?: boolean;
  opaque?: boolean;
}

/** Small real receivers separate recipe identity from host geometry and placement color. */
async function fixture(settings: FixtureSettings = {}) {
  const count = settings.count ?? 1, width = settings.width ?? 1, shift = settings.shift ?? 0;
  const level = await compile(parseAml(`<architecture version="1" id="material-cache">
    <material id="paint" color="#ffffff" roughness="${settings.roughness ?? .5}" repeat="${settings.repeat ?? 2}"
      texture="color.png" normal-texture="normal.png" normal-scale="${settings.normalScale ?? 1}"/>
    ${settings.extraMaterial ? '<material id="unused" color="#ff00ff"/>' : ""}
    ${Array.from({ length: count }, (_, index) => `<box id="panel${index}" position="${shift + index * 3} 0 0" width="${width}" depth="1" height="0.1" material="paint"/>`).join("")}
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  const register = () => {
    for (let index = 0; index < count; index++) {
      const host = `panel${index}`, left = shift + index * 3;
      const triangles = level.mesh.surfaces.flatMap((surface, triangle) => level.surfaces[surface].object === host
        && level.mesh.normals[level.mesh.indices[triangle * 3] * 3 + 2] > .99 ? [triangle] : []);
      assert.equal(triangles.length, 2);
      const span = settings.span ?? 1, repeat = settings.repeat ?? 2;
      const recipe: SurfaceMaterialRecipe = { key: `cache-fixture/${settings.version ?? "v1"}/${index}`,
        bounds: [0, 0, span, 1], texelsPerMeter: settings.density ?? 4, materials: ["paint"],
        sample: (u, v) => ({ height: 0, layers: [{ material: "paint", weight: 1, uv: [u * repeat, v * repeat], tint: [1, .5 + index * .1, .8] }] }) };
      const chart: SurfaceChart = { id: `${host}/top`, host, firstTriangle: triangles[0], triangleCount: 2, triangleIndices: triangles,
        frame: { origin: [left, 0, .1], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] }, bounds: [0, 0, width, 1],
        materials: ["paint"], sample: recipe.sample,
        raster: { geometry: "preserve", repeat: true, scope: "scene", group: recipe.key, bounds: recipe.bounds, texelsPerMeter: recipe.texelsPerMeter },
        reusableMaterial: settings.opaque ? undefined : { recipe, tint: () => [settings.tint ?? 1, 1, 1] } };
      registerSurfaceChart(level, chart);
    }
  };
  const options: ArchitectureCompileOptions = { resolveMaterialImage: async reference => {
    assert.ok(reference === "color.png" || reference === "normal.png");
    return reference === "color.png" ? settings.image ?? color : normal;
  } };
  register();
  return { level, options, register };
}

/** Keeps cache storage observable without copying on read, so compiler ownership is tested. */
function memoryCache() {
  const entries = new Map<string, SurfaceMaterialArtifact>(), reads: string[] = [], writes: string[] = [];
  const borrowedWrites: SurfaceMaterialArtifact[] = [];
  const cache: SurfaceMaterialCache = {
    async read(key) { reads.push(key); return entries.get(key); },
    async write(artifact) {
      writes.push(artifact.key); borrowedWrites.push(artifact);
      entries.set(artifact.key, structuredClone(artifact));
    },
  };
  return { cache, entries, reads, writes, borrowedWrites };
}

/** Includes every published appearance value and immutable physical result. */
function published(level: Level) {
  return { mesh: level.mesh, document: level.document, surfaces: level.surfaces,
    generatedImages: level.generatedImages, surfaceAppearance: level.surfaceAppearance,
    physicalHash: level.physicalHash, collision: collisionMesh(level, true) };
}

/** Runs the public appearance transaction with narrowly controlled cache/executor collaborators. */
async function finish(input: Awaited<ReturnType<typeof fixture>>, cache?: SurfaceMaterialCache, options: ArchitectureCompileOptions = {}) {
  await compileSurfaceAppearance(input.level, { ...input.options, materialCache: cache, ...options }, 100);
  assert.deepEqual(input.level.diagnostics, []);
}

/** Enumerates all encoded buffers whose ownership crosses the cache boundary. */
function channels(artifact: SurfaceMaterialArtifact) {
  return artifact.layers.flatMap(layer => [layer.color, layer.metallicRoughness, ...(layer.normal ? [layer.normal] : [])]);
}

test("host PNG decoding serves source images and validated cache hits without changing published output", async () => {
  const storage = memoryCache(), cold = await fixture();
  await finish(cold, storage.cache);
  const expected = new Set([Buffer.from(color).toString("base64"), Buffer.from(normal).toString("base64"),
    ...[...storage.entries.values()].flatMap(channels).map(image => Buffer.from(image.bytes).toString("base64"))]);
  const observed = new Set<string>(), warm = await fixture();
  await finish(warm, storage.cache, {
    decodeMaterialPng(bytes) { observed.add(Buffer.from(bytes).toString("base64")); return decodeMaterialPng(bytes); },
    rasterExecutor: async function* () { assert.fail("Validated artifact hits must not rasterize again"); },
  });
  assert.deepEqual(observed, expected, "The host codec handles both source companions and finished map validation");
  assert.deepEqual(published(warm.level), published(cold.level));

  observed.clear();
  const trusted = await fixture();
  await finish(trusted, storage.cache, {
    materialCacheValidation: "integrity",
    decodeMaterialPng(bytes) { observed.add(Buffer.from(bytes).toString("base64")); return decodeMaterialPng(bytes); },
    rasterExecutor: async function* () { assert.fail("Trusted intact artifacts must not rasterize again"); },
  });
  assert.deepEqual(observed, new Set([Buffer.from(color).toString("base64"), Buffer.from(normal).toString("base64")]),
    "Trusted cache hits never reconstruct pixels; source companions still decode");
  assert.deepEqual(published(trusted.level), published(cold.level));
});

test("integrity-only material cache validation detects accidental byte corruption and recovers", async () => {
  const storage = memoryCache(), cold = await fixture();
  await finish(cold, storage.cache);
  const artifact = [...storage.entries.values()][0];
  artifact.layers[0].color.bytes[45] ^= 255;
  const damaged = await fixture();
  let jobs = 0;
  await finish(damaged, storage.cache, { materialCacheValidation: "integrity", rasterExecutor: async function* (pending, bake) {
    jobs += pending.length; for (const job of pending) yield await bake(job.index);
  } });
  assert.equal(jobs, 1, "A digest mismatch must regenerate the damaged material");
  assert.deepEqual(published(damaged.level), published(cold.level));
  const recovered = await fixture();
  await finish(recovered, storage.cache, { materialCacheValidation: "integrity",
    rasterExecutor: async function* () { assert.fail("The repaired artifact must be reusable"); } });
  assert.deepEqual(published(recovered.level), published(cold.level));
});

test("material cache hits bypass raster work, own both byte directions and preserve sparse miss indices", async () => {
  const storage = memoryCache(), cold = await fixture({ count: 3 });
  await finish(cold, storage.cache);
  assert.equal(storage.entries.size, 3);
  const original = structuredClone(published(cold.level));
  for (const artifact of storage.borrowedWrites) for (const channel of channels(artifact)) channel.bytes.fill(0);
  assert.deepEqual(published(cold.level), original, "A cache may retain its write argument without owning scene bytes");

  for (const artifact of storage.entries.values()) for (const channel of channels(artifact)) {
    const buffer = new Uint8Array(channel.bytes.length + 8).fill(219);
    buffer.set(channel.bytes, 3); channel.bytes = buffer.subarray(3, 3 + channel.bytes.length);
  }
  const warm = await fixture({ count: 3 });
  const noRaster: SurfaceRasterExecutor = async function* () { throw new Error("A valid all-hit compile must not dispatch raster work"); };
  await finish(warm, storage.cache, { rasterExecutor: noRaster });
  assert.deepEqual(published(warm.level), original);
  const stored = [...storage.entries.values()].map(value => structuredClone(value));
  const warmSnapshot = structuredClone(published(warm.level));
  for (const artifact of storage.entries.values()) for (const channel of channels(artifact)) channel.bytes.fill(0);
  assert.deepEqual(published(warm.level), warmSnapshot, "Published assets cannot alias a cache read buffer or its offset backing store");
  storage.entries.clear();
  storage.entries.set(stored[1].key, stored[1]);
  let executions = 0;
  const mixed = await fixture({ count: 3 });
  await finish(mixed, storage.cache, { rasterExecutor: async function* (jobs, bake, context) {
    executions++;
    assert.deepEqual(jobs.map(job => job.index), [0, 2], "Cache hits must not renumber remaining jobs");
    assert.deepEqual(context.fullPlan!.map(job => job.index), [0, 1, 2]);
    for (const job of [...jobs].reverse()) yield await bake(job.index);
  } });
  assert.equal(executions, 1);
  assert.deepEqual(published(mixed.level), original, "Cached and freshly completed jobs publish in the original plan order");

  const alternative = structuredClone(storage.entries.get(stored[0].key)!);
  const decoded = PNG.sync.read(Buffer.from(alternative.layers[0].color.bytes));
  const bytes = new Uint8Array(PNG.sync.write(decoded, { filterType: 0, deflateLevel: 9 }));
  assert.notDeepEqual(bytes, alternative.layers[0].color.bytes);
  const hash = await imageHash(bytes);
  alternative.layers[0].color = { bytes, hash };
  storage.entries.set(alternative.key, alternative);
  const encodedHit = await fixture({ count: 3 });
  await finish(encodedHit, storage.cache, { rasterExecutor: noRaster });
  const retained = Object.values(encodedHit.level.generatedImages!).find(asset => asset.hash === hash);
  assert.ok(retained, "A valid encoded cache hit retains its content identity instead of re-encoding");
  assert.deepEqual(retained.bytes, bytes);
});

test("material cache keys include intrinsic dependencies and exclude placement and opaque charts", async () => {
  const storage = memoryCache(), baseline = await fixture();
  await finish(baseline, storage.cache);
  const baseKey = storage.writes[0];
  const changes: FixtureSettings[] = [
    { version: "v2" }, { density: 8 }, { span: 2 }, { roughness: .8 },
    { repeat: 3 }, { normalScale: .4 }, { image: changedColor },
  ];
  for (const change of changes) {
    storage.reads.length = 0;
    const input = await fixture(change);
    let jobs = 0;
    await finish(input, storage.cache, { rasterExecutor: async function* (pending, bake) {
      jobs += pending.length; for (const job of pending) yield await bake(job.index);
    } });
    assert.equal(jobs, 1, `Intrinsic dependency must invalidate: ${JSON.stringify(change, (key, value) => key === "image" ? "new PNG bytes" : value)}`);
    assert.notEqual(storage.reads[0], baseKey);
  }
  const moved = await fixture({ width: 1.7, shift: -3, tint: .4, extraMaterial: true });
  const collision = collisionMesh(moved.level, true);
  const positions = moved.level.mesh.indices.map(index => moved.level.mesh.positions.slice(index * 3, index * 3 + 3));
  await finish(moved, storage.cache, { rasterExecutor: async function* () { throw new Error("Placement must reuse the finished recipe"); } });
  assert.deepEqual(collisionMesh(moved.level, true), collision);
  assert.deepEqual(moved.level.mesh.indices.map(index => moved.level.mesh.positions.slice(index * 3, index * 3 + 3)), positions);
  assert.deepEqual(moved.level.surfaceAppearance!.generatedHashes, baseline.level.surfaceAppearance!.generatedHashes);
  assert.ok(moved.level.mesh.colors!.some(value => value === .4), "A cache hit still evaluates the new placement tint");
  storage.reads.length = storage.writes.length = 0;
  const opaque = await fixture({ opaque: true });
  await finish(opaque, storage.cache);
  assert.deepEqual(storage.reads, [], "Repeat and scene scope alone do not authorize caching opaque callbacks");
  assert.deepEqual(storage.writes, []);
});

test("corrupt material artifacts rebuild and non-abort cache I/O remains opportunistic", async () => {
  const seed = memoryCache(), baseline = await fixture();
  await finish(baseline, seed.cache);
  const artifact = structuredClone([...seed.entries.values()][0]);
  for (const failure of ["key", "version", "source", "channel", "hash", "png", "png-data", "dimensions"] as const) {
    const storage = memoryCache(), bad = structuredClone(artifact);
    if (failure === "key") bad.key = "wrong-recipe";
    if (failure === "version") bad.version = 99 as 1;
    if (failure === "source") bad.layers[0].source = "other-source";
    if (failure === "channel") delete bad.layers[0].normal;
    if (failure === "hash") bad.layers[0].color.hash = "0".repeat(64);
    if (failure === "png") bad.layers[0].color.bytes = new Uint8Array([137, 80, 78, 71]);
    if (failure === "png-data") {
      const bytes = bad.layers[0].color.bytes.slice();
      bytes[45] ^= 255;
      bad.layers[0].color = { bytes, hash: await imageHash(bytes) };
    }
    if (failure === "dimensions") {
      const bytes = encodeSurfaceImage({ width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255]) });
      bad.layers[0].color = { bytes, hash: await imageHash(bytes) };
    }
    storage.entries.set(artifact.key, bad);
    const input = await fixture();
    let jobs = 0;
    await finish(input, storage.cache, { decodeMaterialPng, rasterExecutor: async function* (pending, bake) {
      jobs += pending.length; for (const job of pending) yield await bake(job.index);
    } });
    assert.equal(jobs, 1, `${failure}: an invalid cache entry must not become a material`);
    assert.deepEqual(published(input.level), published(baseline.level));
    assert.equal(storage.writes.length, 1, "A successfully rebuilt artifact replaces the bad entry");
  }
  for (const failure of [new Error("cache unavailable"), null, undefined, "cache unavailable"]) {
    const input = await fixture();
    let reads = 0, writes = 0;
    await finish(input, { async read() { reads++; throw failure; }, async write() { writes++; throw failure; } });
    assert.equal(reads, 1);
    assert.equal(writes, 1, "Every non-abort read failure is a miss, followed by an opportunistic write");
    assert.deepEqual(published(input.level), published(baseline.level));
  }
});

test("cache I/O cancellation cannot publish a partial scene and a following compile recovers", async () => {
  for (const phase of ["read", "write"] as const) {
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => { enter = resolve; });
    const released = new Promise<void>(resolve => { release = resolve; });
    const input = await fixture(), before = structuredClone(published(input.level));
    const controller = new AbortController();
    const cache: SurfaceMaterialCache = {
      async read() { if (phase === "read") { enter(); await released; } return undefined; },
      async write() { if (phase === "write") { enter(); await released; } },
    };
    const pending = finish(input, cache, { signal: controller.signal });
    const rejected = assert.rejects(pending, { name: "AbortError" });
    await entered;
    controller.abort();
    await rejected;
    assert.deepEqual(published(input.level), before);
    release();
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.deepEqual(published(input.level), before, "Late cache completion cannot mutate the rejected scene");
    input.register();
    await finish(input, memoryCache().cache);
    assert.ok(input.level.generatedImages);
  }
});

test("cache hits still obey resource admission and reject invalid late placement tint atomically", async () => {
  const storage = memoryCache(), baseline = await fixture();
  await finish(baseline, storage.cache);
  for (const failure of ["budget", "tint"] as const) {
    const input = await fixture(failure === "tint" ? { tint: NaN } : {}), before = structuredClone(published(input.level));
    await assert.rejects(finish(input, storage.cache, { appearance: failure === "budget" ? { maximumTexels: 47 } : undefined }), error => {
      assert.ok(error instanceof AmlError);
      assert.match(error.message, failure === "budget" ? /budget/i : /tint/i);
      assert.ok(error.diagnostics.some(diagnostic => diagnostic.source && diagnostic.objects?.includes("panel0")));
      return true;
    });
    assert.deepEqual(published(input.level), before);
  }
});

test("one raster group cannot alias different explicit material identities", async () => {
  const input = await fixture({ count: 2, opaque: true }), storage = memoryCache();
  const charts = takeSurfaceCharts(input.level);
  for (const [index, chart] of charts.entries()) {
    chart.raster!.group = "shared-raster";
    chart.raster!.materialKey = `explicit-recipe/${index}`;
    registerSurfaceChart(input.level, chart);
  }
  const before = structuredClone(published(input.level));
  await assert.rejects(finish(input, storage.cache), error => {
    assert.ok(error instanceof AmlError);
    assert.match(error.message, /incompatible/);
    assert.ok(error.diagnostics.some(diagnostic => diagnostic.source && diagnostic.objects?.includes("panel1")));
    return true;
  });
  assert.deepEqual(storage.reads, [], "Incompatible grouped recipes cannot reach the cache");
  assert.deepEqual(storage.writes, []);
  assert.deepEqual(published(input.level), before);
});

test("component cache reuses completed finishes and invalidates aging and later assembly contacts", async () => {
  /** Only the first member is baked, so a later member cannot cause a miss merely by adding a job. */
  async function component(wear: number, joint = false) {
    const level = await compile(parseAml(`<architecture version="1" id="component-cache">
      <material id="steel" color="#b0bac0" repeat="2" roughness="0.4"/>
      <material id="paint" color="#ffffff" repeat="3" roughness="0.6"/>
      <box id="support" width="0.1" depth="0.1" height="0.1" material="steel"/>
    </architecture>`), { navigation: false });
    level.mesh.colors = Array(level.mesh.positions.length).fill(1);
    const materials = { metal: "steel", paint: "paint" } as Record<KitSlot, string>;
    const mesh = new KitMesh(level, "support", "props", materials, { maximumTriangles: 100 });
    const pen = weatheredPen(new Pen(mesh, "frame", new Matrix4(), false), new Kit("cache", 1, .3, wear, false, 128, .2), "frame");
    pen.bar("metal", [0, 0, 0], [0, 0, .15], .025, [.3, .5, .7]);
    const firstMemberEnd = mesh.triangleCount;
    if (joint) pen.bar("metal", [0, 0, .075], [.1, 0, .075], .025, [.3, .5, .7]);
    const charts = takeSurfaceCharts(level).filter(chart => chart.firstTriangle < firstMemberEnd);
    assert.ok(charts.length > 0);
    for (const chart of charts) registerSurfaceChart(level, chart);
    return level;
  }
  /** Source-owned triangle corners remain exact even if material binding splits shared vertices. */
  function geometry(level: Level) {
    return level.mesh.surfaces.map((surface, triangle) => ({ object: level.surfaces[surface].object,
      corners: level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(vertex => ({
        position: level.mesh.positions.slice(vertex * 3, vertex * 3 + 3),
        normal: level.mesh.normals.slice(vertex * 3, vertex * 3 + 3),
      })) }));
  }
  const storage = memoryCache(), cold = await component(.25);
  const before = geometry(cold), collision = collisionMesh(cold, true), physicalHash = cold.physicalHash;
  await compileSurfaceAppearance(cold, { materialCache: storage.cache }, 100);
  assert.deepEqual(cold.diagnostics, []);
  assert.ok(storage.entries.size > 0);
  assert.deepEqual(geometry(cold), before);
  assert.deepEqual(collisionMesh(cold, true), collision);
  assert.equal(cold.physicalHash, physicalHash);
  const warm = await component(.25);
  await compileSurfaceAppearance(warm, { materialCache: storage.cache, rasterExecutor: async function* () {
    throw new Error("An identical completed component must reuse all cached finishes");
  } }, 100);
  assert.deepEqual(published(warm), published(cold));

  for (const change of ["aging", "contact"] as const) {
    const level = await component(change === "aging" ? .5 : .25, change === "contact");
    const original = geometry(level), physical = collisionMesh(level, true);
    let misses = 0;
    await compileSurfaceAppearance(level, { materialCache: storage.cache, rasterExecutor: async function* (jobs, bake) {
      misses += jobs.length;
      for (const job of jobs) yield await bake(job.index);
    } }, 100);
    assert.ok(misses > 0, `${change}: the existing member must not inherit an incompatible finish`);
    assert.deepEqual(level.diagnostics, []);
    assert.deepEqual(geometry(level), original);
    assert.deepEqual(collisionMesh(level, true), physical);
  }
});
