import { test } from "node:test";
import assert from "node:assert/strict";
import { AmlError, collisionMesh, compile, parseAml } from "levelspec";
import { compileSurfaceAppearance } from "../src/dressing/surface/compile.ts";
import { encodeSurfaceImage } from "../src/dressing/surface/images.ts";
import { registerSurfaceChart } from "../src/dressing/surface/plans.ts";
import type { SurfaceChart } from "../src/dressing/surface/types.ts";
import { decodeMaterialPng } from "../src/materials/node-images.ts";

const source = `<architecture version="1" id="validation-cancel">
  <material id="finish" texture="finish.png"/>
  <box id="early" width="1" depth="1" height="0.1" material="finish"/>
  <box id="late" position="2 0 0" width="1" depth="1" height="0.1" material="finish"/>
</architecture>`;
const image = encodeSurfaceImage({ width: 1, height: 1, data: new Uint8Array([180, 140, 100, 255]) });
type Level = Awaited<ReturnType<typeof compile>>;

/** Selects the real top face of one source object without altering compiled geometry. */
function receiver(level: Level, host: "early" | "late"): SurfaceChart {
  const triangles = level.mesh.surfaces.flatMap((surface, triangle) =>
    level.surfaces[surface].object === host && level.mesh.normals[level.mesh.indices[triangle * 3] * 3 + 2] > .99 ? [triangle] : []);
  assert.equal(triangles.length, 2);
  return { id: `${host}/top`, host, firstTriangle: triangles[0], triangleCount: 2, triangleIndices: triangles,
    frame: { origin: [host === "early" ? 0 : 2, 0, .1], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] },
    bounds: [0, 0, 1, 1], materials: ["finish"],
    raster: { geometry: "preserve", group: "top", bounds: [0, 0, 1, 1], texelsPerMeter: 2 },
    sample: (u, v) => ({ height: 0, layers: [{ material: "finish", weight: 1, uv: [u, v] }] }),
  };
}

/** Captures the published transaction state, including source and existing physical identity. */
function published(level: Level) {
  return { mesh: level.mesh, document: level.document, surfaces: level.surfaces, architecture: level.architecture,
    generatedImages: level.generatedImages, surfaceAppearance: level.surfaceAppearance, physicalHash: level.physicalHash };
}

test("host image decode failures and cancellation preserve source-linked atomic state and permit recovery", async () => {
  for (const failure of ["throw", "incomplete", "cancel"] as const) {
    const level = await compile(parseAml(source), { navigation: false });
    const before = structuredClone(published(level)), controller = new AbortController();
    registerSurfaceChart(level, receiver(level, "early"));
    await assert.rejects(compileSurfaceAppearance(level, {
      signal: controller.signal, resolveMaterialImage: async () => image,
      decodeMaterialPng(bytes) {
        if (failure === "throw") throw new Error("host could not decode image");
        if (failure === "incomplete") return { width: 1, height: 1, data: new Uint8Array(3) };
        controller.abort();
        return decodeMaterialPng(bytes);
      },
    }, 100), error => {
      if (failure === "cancel") assert.equal((error as Error).name, "AbortError");
      else {
        assert.ok(error instanceof AmlError);
        assert.ok(error.diagnostics[0].objects?.includes("early"));
        assert.ok(error.diagnostics[0].source?.line);
        assert.match(error.message, failure === "throw" ? /host could not decode image/ : /complete RGBA8/);
      }
      return true;
    });
    assert.deepEqual(published(level), before);
    registerSurfaceChart(level, receiver(level, "early"));
    await compileSurfaceAppearance(level, { resolveMaterialImage: async () => image, decodeMaterialPng }, 100);
    assert.equal(level.surfaceAppearance?.charts, 1);
    assert.ok(Object.keys(level.generatedImages!).length > 0);
    assert.equal(level.physicalHash, before.physicalHash);
  }
});

test("receiver validation delivers queued cancellation before image work and preserves a recoverable result", async context => {
  const level = await compile(parseAml(source), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  const before = structuredClone(published(level)), collision = collisionMesh(level, true);
  const first = receiver(level, "early"), second = receiver(level, "late"), originalSample = first.sample;
  let now = 0, phase = "", cancelledDuring = "", reads = 0;
  const clock = context.mock.method(performance, "now", () => now);
  const controller = new AbortController();
  let cancellation: ReturnType<typeof setImmediate> | undefined;
  first.sample = (u, v) => {
    if (cancellation === undefined) {
      now += 20;
      cancellation = setImmediate(() => { cancelledDuring = phase; controller.abort(); });
    }
    return originalSample(u, v);
  };
  registerSurfaceChart(level, first);
  registerSurfaceChart(level, second);
  const resolveMaterialImage = async (reference: string) => {
    reads++;
    assert.equal(reference, "finish.png");
    return image;
  };
  try {
    await assert.rejects(compileSurfaceAppearance(level, { signal: controller.signal, resolveMaterialImage,
      onProgress: value => { phase = value; } }, 100), error => {
      assert.equal((error as Error).name, "AbortError");
      assert.ok(!(error instanceof AmlError), "Cancellation retains its distinct control-flow result");
      return true;
    });
  } finally {
    clearImmediate(cancellation);
    clock.mock.restore();
  }
  assert.notEqual(cancellation, undefined, "Actual receiver validation schedules cancellation");
  assert.equal(cancelledDuring, "Surface appearance: validating receivers");
  assert.equal(reads, 0, "Cancelled validation cannot start material-image work");
  assert.deepEqual(published(level), before);
  assert.deepEqual(collisionMesh(level, true), collision);
  registerSurfaceChart(level, receiver(level, "early"));
  registerSurfaceChart(level, receiver(level, "late"));
  await compileSurfaceAppearance(level, { resolveMaterialImage }, 100);
  assert.ok(reads > 0);
  assert.equal(level.surfaceAppearance!.charts, 2);
  assert.ok(Object.keys(level.generatedImages!).length > 0);
  assert.deepEqual(collisionMesh(level, true), collision);
  assert.deepEqual(level.architecture, before.architecture);
  assert.equal(level.physicalHash, before.physicalHash);
});

test("validation failures after a cooperative turn retain the failing receiver source", async context => {
  const level = await compile(parseAml(source), { navigation: false });
  const before = structuredClone(published(level));
  const first = receiver(level, "early"), second = receiver(level, "late"), originalSample = first.sample;
  let now = 0, reads = 0;
  const clock = context.mock.method(performance, "now", () => now);
  first.sample = (u, v) => { now += 20; return originalSample(u, v); };
  second.sample = () => { throw new Error("invalid late receiver field"); };
  registerSurfaceChart(level, first);
  registerSurfaceChart(level, second);
  try {
    await assert.rejects(compileSurfaceAppearance(level, { resolveMaterialImage: async () => { reads++; return image; } }, 100), error => {
      assert.ok(error instanceof AmlError);
      assert.match(error.message, /invalid late receiver field/);
      assert.equal(error.diagnostics.length, 1);
      const diagnostic = error.diagnostics[0];
      assert.deepEqual(diagnostic.objects, ["late"]);
      assert.ok(diagnostic.source);
      assert.deepEqual(diagnostic.review!.bounds, { min: [2, 0, .1], max: [3, 1, .1] });
      return true;
    });
  } finally {
    clock.mock.restore();
  }
  assert.equal(reads, 0);
  assert.deepEqual(published(level), before);
});
