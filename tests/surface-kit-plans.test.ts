import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml } from "levelspec";
import { KitSurfaces, type SurfaceDeposit } from "../src/dressing/kit-surfaces.ts";
import { takeSurfaceCharts } from "../src/dressing/surface/plans.ts";
import type { SurfaceChart } from "../src/dressing/surface/types.ts";

const frame: SurfaceChart["frame"] = { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] };
const level = () => compile(parseAml(`<architecture version="1" id="kit-plan"><material id="finish"/>
  <box id="receiver" width="1" depth="1" height="1" material="finish"/></architecture>`), { navigation: false });
const chart = (id: string, triangle: number, bounds: SurfaceChart["bounds"], mergeGroup = "same-coat-and-wash"): SurfaceChart => ({
  id, host: "receiver", firstTriangle: triangle, triangleCount: 1, frame, bounds, mergeGroup,
  materials: ["finish"], geometryStep: 0.05, featureScale: 0.02,
  sample: (u, v) => ({ layers: [{ material: "finish", weight: 1, uv: [2 * u + 0.27, 3 * v - 0.11], tint: [1, 1, 1] }],
    height: 0.004, roughness: 0.8 }),
});
const stain: SurfaceDeposit = { frame, bounds: [0.32, 0.02, 0.48, 0.18],
  sample: () => ({ strength: 0.5, tint: [0.2, 0.4, 0.6], roughness: 0 }) };

for (const order of ["before", "between", "after"] as const) {
  test(`same-field receiver coalescing retains later-patch deposits added ${order} registration`, async () => {
    const compiled = await level(), originalMesh = compiled.mesh, meshSnapshot = structuredClone(compiled.mesh), physicalHash = compiled.physicalHash;
    assert.deepEqual(compiled.diagnostics, []);
    const manager = new KitSurfaces(compiled);
    const first = chart("first", 2, [0, 0, 0.2, 0.2]), later = chart("later", 7, [0.3, 0, 0.5, 0.2]);
    const originalSample = first.sample;
    if (order === "before") manager.deposit(stain);
    manager.receive(first);
    if (order === "between") manager.deposit(stain);
    manager.receive(later);
    if (order === "after") manager.deposit(stain);
    const receivers = takeSurfaceCharts(compiled);
    assert.equal(receivers.length, 1, "The identical continuous field shares bounded receiver metadata");
    const [merged] = receivers;
    assert.deepEqual([...merged.triangleIndices!].sort((a, b) => a - b), [2, 7],
      "Disjoint patches retain exact triangle ownership; their intervening gap is never filled");
    assert.equal(merged.triangleCount, 2);
    const untouched = merged.sample(0.1, 0.1), deposited = merged.sample(0.4, 0.1);
    assert.deepEqual(untouched.layers[0].tint, [1, 1, 1], "A later-only deposit does not leak to the first patch");
    assert.deepEqual(deposited.layers[0].tint, [0.6, 0.7, 0.8], "Deposit strength is applied once after coalescing");
    assert.equal(deposited.roughness, 0.4);
    assert.equal(deposited.height, 0.004, "A deposit cannot move solid finish depth");
    assert.ok(deposited.layers[0].uv.every((value, axis) => Math.abs(value - [1.07, 0.19][axis]) < 1e-12));
    assert.equal(deposited.layers[0].material, "finish");
    assert.equal(first.sample, originalSample, "Coalescing does not replace the producer's original field");
    assert.equal(compiled.mesh, originalMesh);
    assert.deepEqual(compiled.mesh, meshSnapshot, "Metadata coalescing cannot mutate existing geometry in place");
    assert.equal(compiled.physicalHash, physicalHash);
  });
}

test("receiver coalescing keeps different condition contexts, wash fields, planes and plate elevations independent", async () => {
  for (const difference of ["condition", "wash", "plane", "elevation"] as const) {
    const compiled = await level(), manager = new KitSurfaces(compiled);
    const first = chart("first", 2, [0, 0, 0.2, 0.2]);
    const later = chart("later", 7, [0.3, 0, 0.5, 0.2], difference === "plane" || difference === "elevation" ? first.mergeGroup : `other-${difference}`);
    if (difference === "plane") later.frame = { ...frame, origin: [0, 0, 0.1] };
    else if (difference === "elevation") { first.layerElevations = [0]; later.layerElevations = [-0.006]; }
    else later.sample = (u, v) => ({ layers: [{ material: "finish", weight: 1, uv: [u, v], tint: [0.3, 0.4, 0.5] }], height: 0.002 });
    manager.receive(first); manager.receive(later); manager.deposit(stain);
    const receivers = takeSurfaceCharts(compiled);
    assert.equal(receivers.length, 2, `${difference} changes cannot inherit the first receiver's field`);
    const second = receivers.find(receiver => receiver.triangleIndices?.includes(7))!;
    assert.ok(second);
    if (difference === "plane") assert.deepEqual(second.sample(0.4, 0.1).layers[0].tint, [1, 1, 1],
      "A coplanar stain cannot jump onto a different receiving plane");
    else if (difference === "elevation") assert.deepEqual(second.layerElevations, [-0.006],
      "Identical sampling contexts retain their distinct physical plate depths");
    else {
      assert.equal(second.sample(0.1, 0.1).height, 0.002);
      assert.deepEqual(second.sample(0.1, 0.1).layers[0].tint, [0.3, 0.4, 0.5]);
    }
  }
});

test("clean scalar and row sampling retain producer values and observe deposits added later", async () => {
  const compiled = await level(), manager = new KitSurfaces(compiled);
  const source = chart("observed", 2, [0, 0, 0.5, 0.2]);
  const first = source.sample(0.1, 0.1), later = source.sample(0.4, 0.1);
  first.bump = 0.01;
  later.bump = 0.02;
  later.depositRetention = 0.5;
  const originals = structuredClone([first, later]);
  const sample: SurfaceChart["sample"] = u => u < 0.3 ? first : later;
  source.sample = sample;
  source.sampleRow = function* (us, v) { for (const u of us) yield sample(u, v); };
  manager.receive(source);
  const [receiver] = takeSurfaceCharts(compiled);
  assert.equal(receiver.sample(0.4, 0.1), later, "An unstained scalar sample retains producer ownership");
  const cleanRow = [...receiver.sampleRow!([0.1, 0.4], 0.1)];
  assert.equal(cleanRow[0], first);
  assert.equal(cleanRow[1], later, "The clean row path does not copy or change producer values");

  manager.deposit(stain);
  const deposited = receiver.sample(0.4, 0.1);
  assert.notEqual(deposited, later, "A late deposit must not mutate the producer sample");
  assert.deepEqual(deposited.layers[0].tint, [0.8, 0.85, 0.9]);
  assert.ok(Math.abs(deposited.roughness! - 0.6) < 1e-12);
  assert.equal(deposited.height, later.height);
  assert.equal(deposited.bump, later.bump);
  assert.deepEqual(deposited.layers[0].uv, later.layers[0].uv);
  const stainedRow = [...receiver.sampleRow!([0.1, 0.4], 0.1)];
  assert.equal(stainedRow[0], first, "A deposit leaves samples outside its footprint untouched");
  assert.deepEqual(stainedRow[1], deposited, "Previously used row wrappers observe the same late deposit");
  assert.deepEqual([first, later], originals);
});

test("UV receivers keep sparse grouping and late intrinsic state while world deposits remain isolated", async () => {
  const compiled = await level(), manager = new KitSurfaces(compiled);
  const before = structuredClone(compiled.mesh), physicalHash = compiled.physicalHash;
  let generation = 1;
  const sample: SurfaceChart["sample"] = (u, v) => ({ height: 0, bump: generation * .001, roughness: .8,
    layers: [{ material: "finish", weight: 1, uv: [u * 2, v * 3], tint: [generation / 4, .75, 1] }] });
  const uvChart = (id: string, triangle: number, bounds: SurfaceChart["bounds"], grouped = true): SurfaceChart => ({
    ...chart(id, triangle, bounds, "shared-program"), mergeGroup: grouped ? "shared-program" : undefined,
    sample, sampleRow: function* (us, v) { for (const u of us) yield sample(u, v); },
    raster: { coordinates: "uv", scope: "scene", bounds: [0, 0, 1, 1], texelsPerMeter: 32, bump: "sample",
      get group() { return `${grouped ? "component" : "separate"}/${generation}`; },
      get materialKey() { return `recipe/${this.group}`; } },
  });
  const film: SurfaceDeposit = { ...stain, bounds: [0, 0, 1, 1] };
  const first = uvChart("uv-first", 2, [0, 0, .2, .2]);
  const later = uvChart("uv-later", 7, [.3, 0, .5, .2]);
  manager.deposit(film);
  manager.receive(first);
  manager.deposit(film);
  manager.receive(later);
  manager.receive(uvChart("uv-separate", 10, [.3, 0, .5, .2], false));
  manager.receive(chart("world", 11, [.3, 0, .5, .2], "shared-program"));
  manager.deposit(film);
  generation = 2;

  const receivers = takeSurfaceCharts(compiled);
  assert.equal(receivers.length, 3);
  const merged = receivers.find(receiver => receiver.id === "uv-first")!;
  assert.deepEqual(merged.triangleIndices, [2, 7]);
  assert.equal(merged.triangleCount, 2);
  assert.deepEqual(merged.bounds, [0, 0, .5, .2]);
  for (const receiver of receivers.filter(receiver => receiver.raster?.coordinates === "uv")) {
    assert.deepEqual(receiver.sample(.375, .125), { height: 0, bump: .002, roughness: .8,
      layers: [{ material: "finish", weight: 1, uv: [.75, .375], tint: [.5, .75, 1] }] });
    const row = [...receiver.sampleRow!([.125, .375], .125)];
    assert.deepEqual(row.map(value => value.layers[0].uv), [[.25, .375], [.75, .375]]);
    assert.deepEqual(row.map(value => [value.bump, value.roughness, value.layers[0].tint]),
      [[.002, .8, [.5, .75, 1]], [.002, .8, [.5, .75, 1]]]);
  }
  const separate = receivers.find(receiver => receiver.id === "uv-separate")!;
  assert.equal(merged.raster!.materialKey, "recipe/component/2");
  assert.equal(separate.raster!.materialKey, "recipe/separate/2");
  generation = 3;
  assert.equal(merged.raster!.materialKey, "recipe/component/3");
  assert.equal(separate.raster!.materialKey, "recipe/separate/3", "An ungrouped producer key must remain lazy after registration");
  assert.equal(separate.sample(.375, .125).bump, .003);

  const world = receivers.find(receiver => receiver.id === "world")!.sample(.375, .125);
  assert.ok(world.layers[0].tint!.every((value, axis) => Math.abs(value - [.216, .343, .512][axis]) < 1e-12));
  assert.ok(Math.abs(world.roughness! - .1) < 1e-12, "All three ordered deposits still reach the world-space receiver");
  assert.deepEqual(first.bounds, [0, 0, .2, .2]);
  assert.equal(first.triangleCount, 1);
  assert.deepEqual(later.bounds, [.3, 0, .5, .2]);
  assert.equal(later.triangleCount, 1);
  assert.deepEqual(compiled.mesh, before);
  assert.equal(compiled.physicalHash, physicalHash);
});
