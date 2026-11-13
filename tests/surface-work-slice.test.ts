import { test } from "node:test";
import assert from "node:assert/strict";
import { SurfaceWorkSlice } from "../src/dressing/surface/work-slice.ts";

test("appearance jobs share elapsed work and allow queued host-task cancellation when a slice expires", async context => {
  let now = 100;
  context.mock.method(performance, "now", () => now);
  const controller = new AbortController();
  const work = new SurfaceWorkSlice(controller.signal);
  assert.equal(work.checkpoint(), undefined);
  now = 104;
  assert.equal(work.checkpoint(), undefined);
  now = 108;
  const cancellation = setImmediate(() => controller.abort());
  try {
    const pending = work.checkpoint();
    assert.ok(pending);
    await assert.rejects(pending, { name: "AbortError" });
  } finally {
    clearImmediate(cancellation);
  }
});

test("appearance work checks abort without waiting for a slice and resets after a successful yield", async context => {
  let now = 0;
  context.mock.method(performance, "now", () => now);
  const controller = new AbortController();
  const work = new SurfaceWorkSlice(controller.signal);
  now = 8;
  await work.checkpoint();
  now = 15;
  assert.equal(work.checkpoint(), undefined);
  controller.abort();
  assert.throws(() => work.checkpoint(), { name: "AbortError" });
  const next = new SurfaceWorkSlice();
  assert.equal(next.checkpoint(), undefined, "A separate compile owns its own scheduling state");
});

test("MessageChannel fallback yields beyond microtasks, checks abort and permits subsequent work", async context => {
  const immediate = Object.getOwnPropertyDescriptor(globalThis, "setImmediate");
  assert.ok(immediate);
  let now = 0;
  context.mock.method(performance, "now", () => now);
  Object.defineProperty(globalThis, "setImmediate", { ...immediate, value: undefined });
  try {
    const work = new SurfaceWorkSlice();
    now = 8;
    let completed = false;
    const pending = work.checkpoint()!.then(() => { completed = true; });
    await new Promise<void>(resolve => queueMicrotask(() => queueMicrotask(resolve)));
    assert.equal(completed, false, "A host-task yield cannot finish while only microtasks have run");
    await pending;
    assert.equal(completed, true);

    const controller = new AbortController(), cancelled = new SurfaceWorkSlice(controller.signal);
    now = 16;
    const inFlight = cancelled.checkpoint();
    assert.ok(inFlight);
    controller.abort();
    await assert.rejects(inFlight, { name: "AbortError" });

    const recovered = new SurfaceWorkSlice();
    now = 24;
    await recovered.checkpoint();
    assert.equal(recovered.checkpoint(), undefined, "The completed fallback starts a fresh work slice");
  } finally {
    Object.defineProperty(globalThis, "setImmediate", immediate);
  }
});
