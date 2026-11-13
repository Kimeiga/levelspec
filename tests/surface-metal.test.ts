import { test } from "node:test";
import assert from "node:assert/strict";
import type { V3 } from "../src/architecture/types.ts";
import { createMetalSurface, type MetalSurfaceSettings } from "../src/dressing/finish/metal-surface.ts";
import type { WeatheringFold } from "../src/dressing/finish/component-geometry.ts";
import type { SurfaceSample } from "../src/dressing/surface/types.ts";

/** Distinct source bindings and repeats expose accidental material or coordinate substitution. */
function settings(overrides: Partial<MetalSurfaceSettings> = {}): MetalSurfaceSettings {
  return { kind: "frame", bounds: [0, 0, 1, .6], paint: [.3, .5, .7], seed: 37,
    wear: .6, grime: .7, rust: .4,
    substrate: { material: "steel", repeat: 3 }, coating: { material: "paint", repeat: 5 }, ...overrides };
}

/** Asserts the opaque receiver and finite PBR contract without choosing its artwork. */
function valid(sample: SurfaceSample): void {
  assert.equal(sample.height, 0, "Procedural metal relief belongs to normal maps");
  assert.ok(Number.isFinite(sample.bump), "A single evaluation includes finite appearance-only bump meters");
  if (sample.roughness !== undefined) assert.ok(Number.isFinite(sample.roughness) && sample.roughness >= 0 && sample.roughness <= 1);
  assert.equal(sample.layers.length, 1);
  const layer = sample.layers[0];
  assert.equal(layer.material, "steel");
  assert.equal(layer.weight, 1);
  assert.ok(layer.uv.every(Number.isFinite));
  if (layer.tint) assert.ok(layer.tint.every(value => Number.isFinite(value) && value >= 0));
  assert.ok(layer.coatings?.length);
  for (const coat of layer.coatings!) {
    assert.equal(coat.material, "paint");
    assert.ok(coat.uv.every(Number.isFinite));
    assert.ok(Number.isFinite(coat.opacity) && coat.opacity >= 0 && coat.opacity <= 1);
    if (coat.tint) assert.ok(coat.tint.every(value => Number.isFinite(value) && value >= 0));
    if (coat.roughness !== undefined) assert.ok(Number.isFinite(coat.roughness) && coat.roughness >= 0 && coat.roughness <= 1);
  }
}

/** Compares intrinsic channels separately from UVs, whose integer repeats intentionally advance. */
function channels(sample: SurfaceSample): number[] {
  return [sample.height, sample.bump!, sample.roughness ?? -1, ...sample.layers.flatMap(layer => [
    layer.weight, ...(layer.tint ?? [1, 1, 1]), ...(layer.coatings ?? []).flatMap(coat => [coat.opacity, coat.roughness ?? -1, ...(coat.tint ?? [1, 1, 1])]),
  ])];
}

test("metal sampling supplies source PBR bindings, metric UVs and bump without geometric displacement", () => {
  for (const kind of ["frame", "cage", "pipe", "sheet"] as const) {
    const input = settings({ kind }), before = structuredClone(input), metal = createMetalSurface(input);
    let order: string[] | undefined;
    for (const [u, v] of [[-.01, -.02], [0, 0], [.17, .29], [1.01, .62]]) {
      const sample = metal.sample(u, v);
      valid(sample);
      assert.deepEqual(sample.layers[0].uv, [u * 3, v * 3]);
      for (const coat of sample.layers[0].coatings!) assert.deepEqual(coat.uv, [u * 5, v * 5]);
      const current = sample.layers[0].coatings!.map(coat => coat.material);
      if (order) assert.deepEqual(current, order, "Coating identities stay stable across one receiver");
      order = current;
    }
    assert.deepEqual(input, before);
  }
});

test("periodic metal channels agree across the unwrap seam while source UVs advance by whole repeats", () => {
  const period = .4;
  const metal = createMetalSurface(settings({ kind: "pipe", bounds: [0, 0, period, .6], wrapU: period,
    edgeAxes: [false, true] }));
  for (const u of [-.13, 0, .071, period]) for (const v of [-.01, .27, .61]) {
    const a = metal.sample(u, v), b = metal.sample(u + period, v);
    valid(a); valid(b);
    const expected = channels(a), actual = channels(b);
    assert.equal(actual.length, expected.length);
    actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-10));
    for (const [first, next, repeat] of [[a.layers[0], b.layers[0], 3],
      ...a.layers[0].coatings!.map((coat, index) => [coat, b.layers[0].coatings![index], 5] as const)] as const) {
      assert.ok(Math.abs(next.uv[0] - first.uv[0] - Math.max(1, Math.round(period * repeat))) < 1e-12);
      assert.equal(next.uv[1], first.uv[1]);
    }
  }
});

test("metal sampling resolves late assembly exposure and owns returned numeric arrays", () => {
  const contacts: [number, number][] = [], folds: WeatheringFold[] = [];
  let assembled = false;
  const base = settings();
  const metal = createMetalSurface({ ...base,
    get contacts() { assert.ok(assembled, "Exposure is not resolved while the assembly is still being drawn"); return contacts; },
    get folds() { assert.ok(assembled, "Folds remain available after construction"); return folds; },
  });
  contacts.push([.2, .3]);
  folds.push({ axis: 0, at: .2, concave: true });
  assembled = true;
  const input = structuredClone({ base, contacts, folds });
  const expected = createMetalSurface({ ...base, contacts: structuredClone(contacts), folds: structuredClone(folds) }).sample(.2, .3);
  const actual = metal.sample(.2, .3);
  assert.deepEqual(actual, expected, "Late contacts and folds participate in the same completed surface field");
  assert.notDeepEqual(actual, createMetalSurface({ ...base, contacts: [], folds: [] }).sample(.2, .3),
    "Completed assembly exposure affects the result");
  const retained = structuredClone(actual);
  metal.sample(.7, .5);
  assert.deepEqual(actual, retained, "Sampling another point cannot overwrite a live result");
  actual.layers[0].uv[0] = 123;
  actual.layers[0].tint![0] = 123;
  actual.layers[0].coatings![0].uv[0] = 123;
  actual.layers[0].coatings![0].tint![0] = 123;
  assert.deepEqual(metal.sample(.2, .3), expected);
  assert.deepEqual({ base, contacts, folds }, input, "Sampling and editing a result cannot mutate caller inputs");
});

test("metal settings reject invalid material scales, physical coordinates and numeric controls", () => {
  const cases: Partial<MetalSurfaceSettings>[] = [
    { paintCoverage: -1 }, { paintCoverage: 2 }, { paintCoverage: NaN }, { wrapU: 0 },
    { substrate: { material: "steel", repeat: 0 } }, { coating: { material: "paint", repeat: Infinity } },
    { metric: { scale: [1, 2], gravity: [0, -1] } }, { metric: { scale: [1, 1], gravity: [NaN, 0] } },
    { wear: -1 }, { grime: Infinity }, { rust: 2 }, { seed: NaN }, { bounds: [0, 0, 0, 1] },
    { paint: [0, NaN, 1] as V3 },
  ];
  for (const invalid of cases) assert.throws(() => createMetalSurface(settings(invalid)), /Metal surface|Metal wrap/);
});
