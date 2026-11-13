import { test } from "node:test";
import assert from "node:assert/strict";
import { AmlError, collisionMesh, compile, parseAml } from "levelspec";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { decodeSurfaceImage, encodeSurfaceImage } from "../src/dressing/surface/images.ts";
import { registerSurfaceChart } from "../src/dressing/surface/plans.ts";
import type { SurfaceRasterExecutor, SurfaceRasterResult } from "../src/dressing/surface/raster-execution.ts";
import type { SurfaceRasterLayer } from "../src/dressing/surface/raster.ts";
import type { SurfaceChart } from "../src/dressing/surface/types.ts";

const SOURCE = `<architecture version="1" id="raster-executor">
  <material id="coat" color="#ffffff" texture="source.png" roughness="0.7"/>
  <material id="other-coat" color="#4080c0" roughness="0.3"/>
  <group id="wall">
    <box id="first" width="1" depth="1" height="0.1" material="coat"/>
    <box id="shared" position="2 0 0" width="1" depth="1" height="0.1" material="coat"/>
  </group>
  <box id="other" position="4 0 0" width="1" depth="1" height="0.1" material="other-coat"/>
</architecture>`;
const SOURCE_IMAGE = encodeSurfaceImage({ width: 2, height: 2,
  data: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]) });
const OPTIONS = { resolveMaterialImage: async (reference: string) => {
  assert.equal(reference, "source.png");
  return SOURCE_IMAGE;
} };
type Level = Awaited<ReturnType<typeof compile>>;

/** Selects actual source-owned top faces and gives two receivers the same local appearance. */
function register(level: Level, configure?: (chart: SurfaceChart) => void): void {
  for (const [object, left] of [["first", 0], ["shared", 2], ["other", 4]] as const) {
    const triangles = level.mesh.surfaces.flatMap((surface, triangle) =>
      level.surfaces[surface].object === object && level.mesh.normals[level.mesh.indices[triangle * 3] * 3 + 2] > .99
        ? [triangle] : []);
    assert.equal(triangles.length, 2);
    const shared = object !== "other", material = shared ? "coat" : "other-coat";
    const chart: SurfaceChart = {
      id: `${object}/top`, host: shared ? "wall" : "other", firstTriangle: triangles[0], triangleCount: 2,
      triangleIndices: triangles, bounds: [0, 0, 1, 1], materials: [material],
      frame: { origin: [left, 0, .1], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] },
      raster: { geometry: "preserve", group: shared ? "shared" : "different", bounds: [0, 0, 1, 1],
        texelsPerMeter: 2, bump: shared ? "sample" : undefined },
      sample: (u, v) => ({ height: 0, bump: shared ? .01 * u * v : undefined,
        layers: [{ material, weight: 1, uv: [u, v], tint: [.6 + u * .1, .8, .7 + v * .1] }] }),
    };
    configure?.(chart);
    registerSurfaceChart(level, chart);
  }
}

/** Creates an undressed native fixture so failures can be checked against published state. */
async function fixture(configure?: (chart: SurfaceChart) => void): Promise<Level> {
  const level = await compile(parseAml(SOURCE), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  register(level, configure);
  return level;
}

/** Captures all appearance publication plus immutable physical and authored state. */
function published(level: Level) {
  return { mesh: level.mesh, document: level.document, architecture: level.architecture, surfaces: level.surfaces,
    generatedImages: level.generatedImages, surfaceAppearance: level.surfaceAppearance,
    physicalHash: level.physicalHash, collision: collisionMesh(level, true) };
}

/** A successful transaction following failure must work on the same published level. */
async function recover(level: Level): Promise<void> {
  register(level);
  await compileSurfaceAppearance(level, OPTIONS, 100);
  assert.equal(level.surfaceAppearance!.charts, 3);
  assert.equal(level.surfaceAppearance!.texels, 6 * 6 * 5, "The shared color/MR/normal job is charged once");
  assert.ok(Object.keys(level.generatedImages!).length > 0);
}

/** Poisoning retained executor buffers must not affect compiler-owned image data. */
function poison(result: SurfaceRasterResult): void {
  for (const layer of result.layers) {
    layer.source = "retained-result-was-mutated";
    for (const image of [layer.color, layer.metallicRoughness, layer.normal]) {
      if (!image) continue;
      image.data.fill(0);
      image.width = 999;
    }
  }
}

test("raster executors deduplicate jobs, accept reversed completion and own copied byte views", async () => {
  const serial = await fixture();
  await compileSurfaceAppearance(serial, OPTIONS, 100);
  const level = await fixture(), physical = collisionMesh(level, true), inputImage = SOURCE_IMAGE.slice();
  const retained: SurfaceRasterResult[] = [];
  let invocations = 0;
  const executor: SurfaceRasterExecutor = async function* (jobs, bake, context) {
    invocations++;
    assert.equal(jobs.length, 2);
    assert.deepEqual(jobs.map(job => [job.width, job.height, job.layers.map(layer => layer.normal)]),
      [[6, 6, [true]], [6, 6, [false]]]);
    assert.equal(jobs.reduce((total, job) => total + job.texels, 0), 6 * 6 * 5);
    assert.ok(Number.isFinite(context.maximumScratchBytes) && context.maximumScratchBytes > 0);
    const snapshot = structuredClone(jobs);
    assert.equal(Reflect.set(jobs, 0, jobs[1]), false, "The descriptor array is frozen");
    assert.equal(Reflect.set(jobs[0], "width", 999), false, "Each descriptor is frozen");
    assert.equal(Reflect.set(jobs[0].layers, 0, jobs[1].layers[0]), false, "Nested layer arrays are frozen");
    assert.equal(Reflect.set(jobs[0].layers[0], "source", "other-coat"), false, "Nested identities are frozen");
    const results = await Promise.all(jobs.map(job => bake(job.index)));
    for (const result of results.toReversed()) {
      for (const layer of result.layers) for (const image of [layer.color, layer.metallicRoughness, layer.normal]) {
        if (!image) continue;
        const storage = new Uint8Array(image.data.length + 6).fill(211);
        storage.set(image.data, 3);
        image.data = storage.subarray(3, storage.length - 3);
      }
      retained.push(result);
      yield result;
      poison(result);
    }
    assert.deepEqual(jobs, snapshot);
  };
  await compileSurfaceAppearance(level, { ...OPTIONS, rasterExecutor: executor }, 100);
  assert.equal(invocations, 1);
  assert.deepEqual(published(level), published(serial), "Completion order cannot alter bindings, maps or manifest order");
  assert.deepEqual(collisionMesh(level, true), physical);
  assert.deepEqual(SOURCE_IMAGE, inputImage);
  const beforeMutation = structuredClone(published(level));
  retained.forEach(poison);
  assert.deepEqual(published(level), beforeMutation);
  for (const asset of Object.values(level.generatedImages!)) {
    const image = decodeSurfaceImage(asset.bytes);
    assert.deepEqual([image.width, image.height], [6, 6]);
  }
});

test("malformed executor results reject atomically, close the stream and permit recovery", async () => {
  for (const failure of ["missing", "duplicate", "unknown", "signature", "source", "channel", "extra-normal", "dimensions", "bytes"] as const) {
    const level = await fixture(), before = structuredClone(published(level));
    let closed = false;
    const executor: SurfaceRasterExecutor = async function* (jobs, bake) {
      try {
        const first = await bake(jobs[0].index);
        yield first;
        if (failure === "missing") return;
        if (failure === "duplicate") { yield first; return; }
        const result = await bake(jobs[1].index);
        if (failure === "unknown") result.index = 999;
        if (failure === "signature") result.signature += "/stale";
        if (failure === "source") result.layers[0].source = "coat";
        if (failure === "channel") delete (result.layers[0] as Partial<SurfaceRasterLayer>).metallicRoughness;
        if (failure === "extra-normal") result.layers[0].normal = structuredClone(result.layers[0].color);
        if (failure === "dimensions") result.layers[0].color.width++;
        if (failure === "bytes") result.layers[0].color.data = result.layers[0].color.data.slice(1);
        yield result;
      } finally { closed = true; }
    };
    await assert.rejects(compileSurfaceAppearance(level, { ...OPTIONS, rasterExecutor: executor }, 100), error => {
      assert.ok(error instanceof AmlError, `${failure}: executor validation is source-linked`);
      assert.match(error.message, /raster|executor/i);
      assert.ok(error.diagnostics.some(diagnostic => diagnostic.source && diagnostic.objects?.length));
      if (!["unknown", "duplicate"].includes(failure))
        assert.ok(error.diagnostics.some(diagnostic => diagnostic.objects?.includes("other")),
          `${failure}: a known bad result identifies its actual receiving source`);
      return true;
    });
    assert.equal(closed, true, `${failure}: the executor stream is closed`);
    assert.deepEqual(published(level), before, failure);
    await recover(level);
  }
});

test("executor cancellation rejects late results without publication and closes the stream", { timeout: 10_000 }, async () => {
  const level = await fixture(), before = structuredClone(published(level)), controller = new AbortController();
  let resume!: () => void, entered!: () => void, closed = false;
  const gate = new Promise<void>(resolve => { resume = resolve; });
  const ready = new Promise<void>(resolve => { entered = resolve; });
  const executor: SurfaceRasterExecutor = async function* (jobs, bake, context) {
    assert.equal(context.signal, controller.signal);
    try {
      const result = await bake(jobs[0].index);
      entered();
      await gate;
      yield result;
    } finally { closed = true; }
  };
  const running = compileSurfaceAppearance(level, { ...OPTIONS, rasterExecutor: executor, signal: controller.signal }, 100);
  const rejected = assert.rejects(running, error => (error as Error).name === "AbortError" && !(error instanceof AmlError));
  await ready;
  controller.abort();
  resume();
  await rejected;
  assert.equal(closed, true);
  assert.deepEqual(published(level), before);
  await recover(level);

  const synchronous = await fixture(), prior = structuredClone(published(synchronous));
  const syncController = new AbortController();
  let returned = false;
  const abortingIterator: SurfaceRasterExecutor = () => ({
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<SurfaceRasterResult>> {
          syncController.abort();
          return new Promise((_, reject) => {
            queueMicrotask(() => reject(new Error("iterator rejected after synchronous cancellation")));
          });
        },
        async return() { returned = true; return { done: true as const, value: undefined }; },
      };
    },
  });
  await assert.rejects(compileSurfaceAppearance(synchronous, {
    ...OPTIONS, rasterExecutor: abortingIterator, signal: syncController.signal,
  }, 100), error => (error as Error).name === "AbortError");
  // Drain the host turn so an unhandled late iterator rejection fails this test.
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(returned, true);
  assert.deepEqual(published(synchronous), prior);
  await recover(synchronous);
});

test("raster planning rejects global budgets and pre-aborted work before executor invocation", async () => {
  for (const failure of ["texels", "bytes", "cancel"] as const) {
    const level = await fixture(), before = structuredClone(published(level)), controller = new AbortController();
    let invocations = 0;
    const executor: SurfaceRasterExecutor = async function* (jobs, bake) {
      invocations++;
      for (const job of jobs) yield await bake(job.index);
    };
    if (failure === "cancel") controller.abort();
    await assert.rejects(compileSurfaceAppearance(level, { ...OPTIONS, rasterExecutor: executor,
      signal: controller.signal, appearance: failure === "texels" ? { maximumTexels: 6 * 6 * 5 - 1 }
        : failure === "bytes" ? { maximumBytes: 100 } : undefined }, 100), error => {
      if (failure === "cancel") return (error as Error).name === "AbortError";
      assert.ok(error instanceof AmlError);
      assert.match(error.message, /budget/i);
      assert.ok(error.diagnostics.some(diagnostic => diagnostic.source));
      return true;
    });
    assert.equal(invocations, 0, `${failure}: invalid work never enters the executor`);
    assert.deepEqual(published(level), before);
    await recover(level);
  }
});

test("executor failure cancels and drains admitted local work before returning", async context => {
  let baking = false, callbacks = 0, now = 0;
  const level = await fixture(chart => {
    const sample = chart.sample;
    chart.sample = (u, v) => {
      if (baking) {
        callbacks++;
        if (callbacks === 2) now += 16;
      }
      return sample(u, v);
    };
  });
  const before = structuredClone(published(level));
  const clock = context.mock.method(performance, "now", () => now);
  let settled = false, outcome = "", stoppedAt = 0;
  const executor: SurfaceRasterExecutor = async function* (jobs, bake) {
    baking = true;
    const local = bake(jobs[0].index);
    void local.then(() => { settled = true; outcome = "completed"; }, error => {
      settled = true; outcome = error.name;
    });
    throw new Error("parallel peer failed");
  };
  try {
    await assert.rejects(compileSurfaceAppearance(level, { ...OPTIONS, rasterExecutor: executor }, 100), error => {
      assert.ok(error instanceof AmlError);
      assert.match(error.message, /parallel peer failed/);
      return true;
    });
    assert.ok(callbacks > 0, "Local sampling started before its peer failed");
    assert.equal(settled, true, "The compiler drains admitted work before reporting failure");
    assert.equal(outcome, "AbortError", "Incomplete local work is cancelled rather than finishing unseen");
    stoppedAt = callbacks;
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(callbacks, stoppedAt, "No recipe callbacks continue after the rejected compile");
    assert.deepEqual(published(level), before);
  } finally { clock.mock.restore(); }
  await recover(level);
  assert.equal(callbacks, stoppedAt, "Recovery cannot overlap abandoned recipe callbacks");
});
