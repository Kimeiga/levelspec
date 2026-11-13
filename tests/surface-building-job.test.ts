import { test } from "node:test";
import assert from "node:assert/strict";
import { Matrix4 } from "three";
import { compile, collisionMesh, parseAml } from "levelspec";
import type { CompiledArchitecture } from "../src/architecture/types.ts";
import { triangle } from "../src/dressing/geometry.ts";
import { KitMesh, type KitSlot } from "../src/dressing/kit-mesh.ts";
import { Pen } from "../src/dressing/pen.ts";
import { BuildingJob, createBuildingLevel } from "../src/dressing/kowloon/building-job.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import { SignBook, type SignProposal } from "../src/dressing/kowloon/signs/book.ts";
import type { Business } from "../src/dressing/kowloon/signs/copy.ts";
import { Obstructions } from "../src/dressing/spans/scene.ts";
import { takeSurfaceCharts } from "../src/dressing/surface/plans.ts";
import type { SurfaceChart } from "../src/dressing/surface/types.ts";

/** Supplies real source ancestry, physical geometry and an existing render prefix. */
async function sourceLevel() {
  const level = await compile(parseAml(`<architecture version="1" id="building-jobs">
    <material id="source" color="#fff"/>
    <box id="first" width="1" depth="1" height="1" material="source"/>
    <box id="second" position="3 0 0" width="1" depth="1" height="1" material="source"/>
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  return level;
}

/** Adds the same shared finish and one host-specific finish through ordinary material records. */
function meshFor(level: CompiledArchitecture, host: string) {
  for (const id of ["shared", `${host}-finish`])
    if (!level.document.materials.some(material => material.id === id))
      level.document.materials.push({ ...level.document.materials[0], id });
  const slots = { wall: "shared", metal: `${host}-finish`, paint: "shared", board: "shared", rust: "shared" } as Record<KitSlot, string>;
  return new KitMesh(level, host, "props", slots, { maximumTriangles: 1000 });
}

/** Uses distinguishable corner attributes, including zero, to expose offset and copy mistakes. */
function addTriangle(mesh: KitMesh, x: number, slot: KitSlot = "wall") {
  mesh.add("wall", slot, [[x, 0, 0], [x + .2, 0, 0], [x, .2, 0]],
    [[0, 0, 1], [0, .6, .8], [.6, 0, .8]], [[.2, .7], [.9, .1], [.4, .3]],
    [[0, .2, .3], [.4, 0, .6], [.7, .8, 0]]);
}

/** Creates a finish whose live eligibility and row wrapper must survive job transfer. */
function receiver(firstTriangle: number): Omit<SurfaceChart, "host"> {
  const sample: SurfaceChart["sample"] = (u, v) => ({ height: 0, bump: .002, roughness: .8,
    depositRetention: .5, layers: [{ material: "shared", weight: 1, uv: [u * 2, v * 3], tint: [1, 1, 1] }] });
  return { id: "same-local-receiver", mergeGroup: "same-local-field", firstTriangle,
    triangleCount: 1,
    frame: { origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] },
    bounds: [0, 0, 1, 1], materials: ["shared"], sample,
    sampleRow: function* (us, v) { for (const u of us) yield sample(u, v); },
    raster: { geometry: "preserve", group: "same-local-group", materialKey: "finish/v1", bounds: [0, 0, 1, 1], texelsPerMeter: 4 },
    reusableMaterial: { recipe: { key: "repeat/v1", bounds: [0, 0, 1, 1], texelsPerMeter: 4, materials: ["shared"], sample } } };
}

/** Snapshots published state without cloning private callbacks or transient planning registries. */
function output(level: CompiledArchitecture) {
  return structuredClone({ mesh: level.mesh, surfaces: level.surfaces, materials: level.document.materials,
    provenance: level.provenance, diagnostics: level.diagnostics, groundPlans: level.groundPlans ?? [] });
}

test("building jobs assemble owned output in order and preserve live pens, receivers and deposits", async () => {
  const target = await sourceLevel(), before = output(target), physical = structuredClone(collisionMesh(target, true));
  const authored = structuredClone(target.architecture), prefix = target.mesh.surfaces.length;
  assert.ok(authored.elements.length > 0);
  const locals = [createBuildingLevel(target), createBuildingLevel(target)];
  const meshes = locals.map((local, index) => meshFor(local, index === 0 ? "first" : "second"));
  const pens = meshes.map(mesh => new Pen(mesh, "wall", new Matrix4(), false));
  for (const [index, local] of locals.entries()) {
    assert.equal(local.mesh.indices.length, 0);
    assert.equal(local.surfaces.length, 0);
    assert.notEqual(local.document.materials, target.document.materials);
    assert.notEqual(local.provenance, target.provenance);
    addTriangle(meshes[index], 0); addTriangle(meshes[index], .3, "metal"); addTriangle(meshes[index], .6);
    meshes[index].receive(receiver(0));
    meshes[index].receive(receiver(2));
    const host = index === 0 ? "first" : "second";
    local.diagnostics.push({ severity: "info", code: "JOB_NOTE", message: host, objects: [host] });
    local.groundPlans = [{ host, anchors: [{ point: [index, 0, 0], kind: "floor" }], regions: [] }];
  }
  assert.deepEqual(output(target), before, "Generating detached jobs cannot publish their output");
  const chunks = locals.map(local => structuredClone(local.mesh));
  const surveys = locals.map((_local, index) => new Float64Array([index, 0, 0, index + .2, 0, 0, index, .2, 0]));
  const surveySnapshots = surveys.map(survey => Array.from(survey));
  const jobs = locals.map((local, index) => new BuildingJob(local, meshes[index], new SignBook(), surveys[index]));
  for (const job of jobs) job.appendTo(target, { maximumTriangles: 1000 });
  jobs.forEach((job, index) => assert.deepEqual(Array.from(job.survey), surveySnapshots[index]));
  for (const field of ["positions", "normals", "uv", "colors"] as const)
    assert.deepEqual(target.mesh[field], [...before.mesh[field]!, ...chunks[0][field]!, ...chunks[1][field]!], field);
  const vertexPrefix = before.mesh.positions.length / 3;
  assert.deepEqual(target.mesh.indices, [...before.mesh.indices,
    ...chunks[0].indices.map(index => index + vertexPrefix),
    ...chunks[1].indices.map(index => index + vertexPrefix + chunks[0].positions.length / 3)]);
  assert.deepEqual(target.mesh.surfaces.slice(prefix).map(index => target.surfaces[index].material),
    ["shared", "first-finish", "shared", "shared", "second-finish", "shared"]);
  assert.deepEqual(target.diagnostics.map(diagnostic => diagnostic.message), ["first", "second"]);
  assert.deepEqual(target.groundPlans?.map(plan => plan.host), ["first", "second"]);
  assert.equal(target.document.materials.filter(material => material.id === "shared").length, 1);
  for (const host of ["first", "second"]) {
    const surfaces = target.surfaces.filter(surface => surface.object.startsWith(`${host}/$dressing/`));
    assert.ok(surfaces.length > 0);
    for (const surface of surfaces) assert.equal(target.provenance[surface.object].host, host);
  }

  const existingSurface = target.mesh.surfaces[prefix], beforeLate = target.mesh.surfaces.length;
  pens[0].face("wall", [[0, 0, 0], [.2, 0, 0], [0, .2, 0]], [0, 0, 1], [.2, .3, .4]);
  assert.equal(target.mesh.surfaces[beforeLate], existingSurface, "An old pen reuses its remapped surface");
  const late = pens[0].into("late");
  late.face("wall", [[0, 0, 0], [.2, 0, 0], [0, .2, 0]], [0, 0, 1], [.4, .3, .2]);
  meshes[0].receive({ ...receiver(beforeLate + 1), id: "late-receiver", mergeGroup: "late-field" });
  meshes[0].deposit({ frame: receiver(0).frame, bounds: [0, 0, .5, .5], materialKey: "stain/v1",
    sample: () => ({ strength: .5, tint: [.2, .4, .6], roughness: 0 }) });
  const charts = takeSurfaceCharts(target);
  assert.equal(charts.length, 3);
  assert.equal(new Set(charts.map(chart => chart.id)).size, 3, "Matching local receiver names remain host-specific");
  const first = charts.find(chart => chart.host === "first" && chart.triangleCount === 2)!;
  const second = charts.find(chart => chart.host === "second")!;
  assert.deepEqual(first.triangleIndices, [prefix, prefix + 2]);
  assert.deepEqual(second.triangleIndices, [prefix + 3, prefix + 5]);
  assert.equal(charts.find(chart => chart.firstTriangle === beforeLate + 1)?.host, "first");
  const deposited = first.sample(.1, .1);
  assert.deepEqual(deposited.layers[0].tint, [.8, .85, .9]);
  assert.ok(Math.abs(deposited.roughness! - .6) < 1e-12);
  assert.equal(deposited.bump, .002);
  assert.deepEqual([...first.sampleRow!([.1], .1)], [deposited]);
  assert.equal(first.reusableMaterial, undefined);
  assert.notEqual(first.raster!.materialKey, "finish/v1");
  assert.equal(second.raster!.materialKey, "finish/v1");
  assert.ok(second.reusableMaterial);
  assert.deepEqual(second.sample(.1, .1).layers[0].tint, [1, 1, 1], "Deposits remain owned by their host");
  assert.deepEqual(takeSurfaceCharts(locals[0]), [], "Transferred registrations do not remain in the local level");
  assert.deepEqual(collisionMesh(target, true), physical);
  assert.deepEqual(target.architecture, authored);
  const committed = output(target);
  assert.throws(() => jobs[0].appendTo(target, { maximumTriangles: 1000 }));
  assert.deepEqual(output(target), committed, "A consumed job cannot duplicate output");
});

/** Uses real sign drawing with simple authored panels, avoiding assumptions about generated artwork. */
function propose(book: SignBook, mesh: KitMesh, host: string, x: number, key: string, shown = true) {
  const pen = new Pen(mesh, "sign", new Matrix4().makeTranslation(x, 0, 2), false);
  const kit = new Kit("job-sign", 1, 0, 0, false, 0);
  const business: Business = { name: host, trade: "shop", english: host, tagline: "", phone: "", sector: "retail" };
  const proposal: SignProposal = { key, mount: "fascia", form: "board", shown, above: 0, business,
    panels: [{ pen, sides: "front", design: { width: .4, height: .3, depth: 0, construction: "painted", outline: "rectangle",
      ground: [.4, .5, .6], border: [.2, .3, .4], stack: "down", age: 0, phase: 0, blocks: [] } }],
    steel: { slot: "metal", tint: [.2, .3, .4] },
    fixings() { pen.into("fixing").face("metal", [[0, 0, 0], [.1, 0, 0], [0, 0, .1]], [0, 1, 0], [1, 1, 1]); } };
  book.desk(host, kit).propose(proposal);
  return { kit, business };
}

test("transferred sign books retain global proposal order and draw through assembled pens", async () => {
  const target = await sourceLevel(), reference = await sourceLevel();
  const assembled = new SignBook(), direct = new SignBook();
  const books: SignBook[] = [];
  for (const host of ["first", "second"]) {
    const local = createBuildingLevel(target), mesh = meshFor(local, host), book = new SignBook();
    addTriangle(mesh, 0);
    const { kit, business } = propose(book, mesh, host, 0, "overlap");
    assert.equal(book.desk(host, kit).shopNear([.2, 0, 0], 1), business);
    assert.equal(book.desk(host === "first" ? "second" : "first", kit).shopNear([.2, 0, 0], 1), undefined);
    if (host === "second") propose(book, mesh, host, 3, "hidden", false);
    const job = new BuildingJob(local, mesh, book, new Float64Array());
    job.appendTo(target, { maximumTriangles: 1000 });
    assembled.append(job.signs); books.push(book);
    const directMesh = meshFor(reference, host); addTriangle(directMesh, 0);
    propose(direct, directMesh, host, 0, "overlap");
    if (host === "second") propose(direct, directMesh, host, 3, "hidden", false);
  }
  const empty = new Obstructions(new Float64Array());
  const plans = assembled.settle(empty, () => target.mesh.surfaces.length);
  assert.deepEqual(plans.map(plan => [plan.host, plan.status]), [["first", "built"], ["second", "crowded"], ["second", "withheld"]]);
  assert.ok(plans[0].triangles > 0);
  assert.deepEqual(plans, direct.settle(empty, () => reference.mesh.surfaces.length));
  assert.deepEqual(output(target), output(reference), "Deferred panels and fixings use the assembled output and source ownership");
  for (const book of books) assert.deepEqual(book.settle(empty, () => target.mesh.surfaces.length), [], "Sign transfer consumes source proposals");
});

test("building assembly rejects budget, material conflicts and cancellation without consuming retryable jobs", async () => {
  const target = await sourceLevel(), prefix = target.mesh.surfaces.length;
  const make = (host: string) => {
    const local = createBuildingLevel(target), mesh = meshFor(local, host);
    addTriangle(mesh, 0);
    triangle(local.mesh, [[0, 0, 0], [.2, 0, 0], [0, .2, 0]], [0, 0, 1], [[0, 0], [1, 0], [0, 1]],
      [[1, 1, 1], [1, 1, 1], [1, 1, 1]], mesh.finished("direct", "finish", "shared"));
    mesh.receive(receiver(0));
    return { local, mesh, job: new BuildingJob(local, mesh, new SignBook(), new Float64Array()) };
  };
  const first = make("first"), second = make("second"), budget = { maximumTriangles: prefix + 3 };
  first.job.appendTo(target, budget);
  const committed = output(target), pending = output(second.local);
  assert.throws(() => second.job.appendTo(target, budget), /budget/i);
  assert.deepEqual(output(target), committed);
  assert.deepEqual(output(second.local), pending);
  const sharedIndex = second.local.document.materials.findIndex(material => material.id === "shared");
  const originalMaterial = second.local.document.materials[sharedIndex];
  second.local.document.materials[sharedIndex] = { ...originalMaterial, roughness: originalMaterial.roughness === .2 ? .8 : .2 };
  const conflicting = output(second.local);
  assert.throws(() => second.job.appendTo(target, { maximumTriangles: prefix + 4 }), /material/i);
  assert.deepEqual(output(target), committed, "Equal material IDs cannot silently alias different definitions");
  assert.deepEqual(output(second.local), conflicting);
  second.local.document.materials[sharedIndex] = originalMaterial;
  const controller = new AbortController(); controller.abort();
  const beforeCancel = output(target), pendingCancel = output(second.local);
  assert.throws(() => second.job.appendTo(target, { maximumTriangles: prefix + 4, signal: controller.signal }),
    (error: unknown) => error instanceof Error && error.name === "AbortError");
  assert.deepEqual(output(target), beforeCancel);
  assert.deepEqual(output(second.local), pendingCancel);
  budget.maximumTriangles++;
  second.job.appendTo(target, budget);
  assert.equal(target.mesh.surfaces.length, prefix + 4);
  assert.throws(() => addTriangle(first.mesh, 0), /budget/i, "Deferred drawing observes the shared global limit");
  assert.equal(takeSurfaceCharts(target).length, 2, "Failed attempts neither lose nor duplicate pending receivers");
});
