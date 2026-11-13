import { test } from "node:test";
import assert from "node:assert/strict";
import { Matrix4 } from "three";
import { compile, collisionMesh, parseAml } from "levelspec";
import { ArchitectureResolution } from "../src/architecture/resolve.ts";
import type { CompiledArchitecture, V3 } from "../src/architecture/types.ts";
import { KitGeometry, type KitBudget } from "../src/dressing/geometry.ts";
import { kitFinishes, kitMaterials } from "../src/dressing/kit.ts";
import { KitMesh, type KitSlot } from "../src/dressing/kit-mesh.ts";
import { Pen } from "../src/dressing/pen.ts";
import { KowloonBuildings } from "../src/dressing/kowloon/building.ts";
import { createBuildingLevel } from "../src/dressing/kowloon/building-job.ts";
import { Decks } from "../src/dressing/kowloon/deck.ts";
import { Kit } from "../src/dressing/kowloon/kit.ts";
import { weatheredPen } from "../src/dressing/kowloon/weathered.ts";
import { takeSurfaceCharts } from "../src/dressing/surface/plans.ts";
import { TriangleSurvey } from "../src/dressing/triangle-survey.ts";
import { wallMaterials } from "../src/dressing/wall-materials.ts";

const DECK_ELEVATION = 2.123456789;

/** Compiles only authored geometry, leaving the real dressing phase available for direct tests. */
async function sourceLevel(detail: "low" | "medium" | "high" = "medium", placement = "") {
  const document = parseAml(`<architecture version="1" id="survey-test">
    <material id="finish" color="#c6c2b4" repeat="1.7"/>
    <box id="ground" position="-4 -4 -0.2" width="8" depth="8" height="0.2" material="finish"/>
    <box id="building" ${placement} width="2.4" depth="2.4" height="3.35" collidable="false" material="finish"/>
    <dressing seed="survey-test" detail="${detail}" grime="0.6" wear="0.2">
      <building host="building" material="finish" stories="1" shops="0"/>
    </dressing>
  </architecture>`);
  const plain = structuredClone(document); delete plain.dressing;
  const level = await compile(plain, { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  level.architecture = document;
  level.mesh.colors = Array(level.mesh.positions.length).fill(1);
  level.mesh.solidIds ??= Array(level.mesh.surfaces.length).fill("");
  kitMaterials(level); wallMaterials(level);
  return level;
}

/** Uses the same resolved host, physical scene and street support as the production building planner. */
function buildings(level: CompiledArchitecture, budget: KitBudget) {
  const resolution = new ArchitectureResolution(level.architecture, 100, 128);
  const node = resolution.nodes.get("building")!;
  const settings = level.architecture.dressing!;
  return new KowloonBuildings(level, [{ node, rule: settings.rules[0] }], settings, budget,
    level.physicalMesh!, level.mesh);
}

/** Captures retained output rather than private registries or implementation counters. */
function output(level: CompiledArchitecture) {
  return structuredClone({ mesh: level.mesh, surfaces: level.surfaces, materials: level.document.materials,
    architecture: level.architecture, provenance: level.provenance, diagnostics: level.diagnostics,
    groundPlans: level.groundPlans ?? [] });
}

/** Expands a committed triangle range independently of the survey's own extraction helper. */
function corners(level: CompiledArchitecture, first: number): Float64Array {
  const values: number[] = [];
  for (let triangle = first; triangle < level.mesh.surfaces.length; triangle++)
    for (let corner = 0; corner < 3; corner++) {
      const index = level.mesh.indices[triangle * 3 + corner] * 3;
      values.push(level.mesh.positions[index], level.mesh.positions[index + 1], level.mesh.positions[index + 2]);
    }
  return new Float64Array(values);
}

/** Exercises the direct ground writer at an elevation that must retain sub-grid precision. */
function drawDeck(level: CompiledArchitecture, mesh: KitMesh, budget: KitBudget): void {
  new Decks(level, mesh, { host: "building", layer: "props", seed: "survey-deck", grime: .6, wear: .2,
    screed: "finish", fineMarks: true }, budget).lay("roof",
  [[0, 0, DECK_ELEVATION], [.7, 0, DECK_ELEVATION], [.7, .6, DECK_ELEVATION], [0, .6, DECK_ELEVATION]]);
}

test("lower-detail building surveys exactly retain independently drawn high-detail geometry", async () => {
  for (const [detail, placement] of [["medium", ""], ["low", 'rotation="0 0 35" scale="-1 1 1"']] as const) {
    const high = await sourceLevel("high", placement), lower = await sourceLevel(detail, placement);
    const highPlanner = buildings(high, { maximumTriangles: 100_000 });
    const lowerPlanner = buildings(lower, { maximumTriangles: 100_000 });
    const before = output(lower), physical = structuredClone(collisionMesh(lower, true));
    const highJob = highPlanner.generate("building"), lowerJob = lowerPlanner.generate("building");
    assert.ok(highJob.survey.length > 0);
    assert.deepEqual(new Uint8Array(lowerJob.survey.buffer), new Uint8Array(highJob.survey.buffer), detail);
    assert.deepEqual(output(lower), before, "Discarded survey work cannot publish into the retained level");
    const highFirst = high.mesh.surfaces.length, lowerFirst = lower.mesh.surfaces.length;
    highPlanner.append(highJob); lowerPlanner.append(lowerJob);
    assert.deepEqual(new Uint8Array(highJob.survey.buffer), new Uint8Array(corners(high, highFirst).buffer));
    const receivers = takeSurfaceCharts(lower);
    assert.ok(receivers.length > 0, "The retained render still owns its appearance receivers");
    const owned = new Set<number>();
    for (const receiver of receivers) {
      const indices = receiver.triangleIndices ?? Array.from({ length: receiver.triangleCount }, (_, i) => receiver.firstTriangle + i);
      for (const index of indices) {
        assert.ok(index >= lowerFirst && index < lower.mesh.surfaces.length);
        assert.equal(owned.has(index), false, "A survey receiver cannot overlap the retained job's triangles");
        owned.add(index);
      }
    }
    assert.deepEqual(collisionMesh(lower, true), physical);
    assert.deepEqual(lower.architecture, before.architecture);
  }
});

test("survey collectors preserve interleaved kit, box and deck corners without populating render buffers", async () => {
  const source = await sourceLevel(), sourceSnapshot = output(source);
  const draw = (survey?: TriangleSurvey) => {
    const level = createBuildingLevel(source), slots = kitFinishes(level, undefined, "finish").materials;
    const budget = { maximumTriangles: 2000 };
    const emptyMesh = structuredClone(level.mesh);
    const mesh = new KitMesh(level, "building", "props", slots, budget, survey);
    const pen = new Pen(mesh, "fixture", new Matrix4(), false);
    const tintCalls: V3[] = [];
    const tint = (point: V3): V3 => { tintCalls.push([...point]); return [1, 1, 1]; };
    pen.face("wall", [[0, 0, 0], [.25, 0, 0], [0, 0, .25]], [0, 1, 0], tint);
    mesh.receive({ id: "wall", firstTriangle: 0, triangleCount: 1, frame: pen.surfaceFrame(), bounds: [0, 0, .25, .25],
      materials: ["finish"], sample: (u, v) => ({ height: 0, roughness: .8, depositRetention: .5,
        layers: [{ material: "finish", weight: 1, uv: [u, v], tint: [1, 1, 1] }] }) });
    mesh.deposit({ frame: pen.surfaceFrame(), bounds: [0, 0, .25, .25],
      sample: () => ({ strength: .5, tint: [.2, .4, .6], roughness: 0 }) });
    const metal = weatheredPen(pen.into("metal"), new Kit("survey-member", 2, .6, .2, false, 128), "frame");
    metal.beveledBar("metal", [0, 0, 1], [.6, 0, 1], [0, 1, 0], .03, .04, [.3, .4, .5]);
    metal.tube("metal", [[0, 0, 1], [0, .3, 1.2], [.2, .4, 1.4]], .02, [.4, .5, .6], 6);
    const boxStart = mesh.triangleCount, weatherCalls: V3[] = [];
    const boxTransform = new Matrix4().makeScale(-1, 1, 1).setPosition(.123456789, -.87654321, .234567891);
    new KitGeometry(level, "building", boxTransform, "props", budget, survey).box("litter",
      [.02, .03, .04], [.7, .23, .17], "finish", [.8, .9, 1], "visual-mesh", point => {
        weatherCalls.push([...point]); return [1 + point[0], 1 + point[1], 1 + point[2]];
      });
    const boxEnd = mesh.triangleCount;
    const deckStart = mesh.triangleCount;
    drawDeck(level, mesh, budget);
    const deckEnd = mesh.triangleCount;
    pen.face("wall", [[2, 0, DECK_ELEVATION], [2.25, 0, DECK_ELEVATION], [2, .25, DECK_ELEVATION]], [0, 0, 1], tint);
    return { level, emptyMesh, tintCalls, weatherCalls, boxStart, boxEnd, deckStart, deckEnd,
      count: mesh.triangleCount, charts: takeSurfaceCharts(level) };
  };
  const render = draw(), collector = new TriangleSurvey(), survey = draw(collector);
  assert.ok(render.charts.length > 1, "Both a kit receiver and a directly registered deck receiver are exercised");
  assert.deepEqual(render.charts.find(chart => chart.firstTriangle === 0)!.sample(.1, .1).layers[0].tint, [.8, .85, .9]);
  assert.deepEqual(survey.charts, [], "Survey work retains neither kit nor direct ground appearance plans");
  const saved = collector.snapshot(), expected = corners(render.level, 0);
  assert.deepEqual(new Uint8Array(saved.buffer), new Uint8Array(expected.buffer), "All emitters keep their original order and precision");
  assert.deepEqual([survey.boxStart, survey.boxEnd, survey.deckStart, survey.deckEnd, survey.count],
    [render.boxStart, render.boxEnd, render.deckStart, render.deckEnd, render.count]);
  assert.ok(survey.boxEnd > survey.boxStart);
  const boxCorners = saved.slice(survey.boxStart * 9, survey.boxEnd * 9);
  assert.ok(boxCorners.some(value => value !== Math.round(value * 1e5) / 1e5), "Box corners keep their transformed Float32 precision");
  assert.deepEqual(survey.weatherCalls, render.weatherCalls);
  assert.equal(survey.weatherCalls.length, (survey.boxEnd - survey.boxStart) * 3,
    "Box weather callbacks still evaluate each emitted corner");
  assert.ok(survey.deckEnd > survey.deckStart);
  const deckCorners = saved.slice(survey.deckStart * 9, survey.deckEnd * 9);
  assert.ok(deckCorners.some((value, index) => index % 3 === 2 && value === DECK_ELEVATION), "Ground keeps its raw world elevation");
  assert.deepEqual(Array.from(saved.slice(-9)), [2, 0, 2.12346, 2.25, 0, 2.12346, 2, .25, 2.12346], "Kit corners retain the existing 10 micrometer grid");
  assert.deepEqual(survey.tintCalls, render.tintCalls);
  assert.equal(survey.tintCalls.length, 6, "Discarding attributes cannot suppress per-corner tint evaluation");
  assert.equal(collector.triangleCount, render.count);
  assert.deepEqual(survey.level.mesh, survey.emptyMesh, "A survey does not leave partial or invalid render attributes");
  const another = collector.snapshot(); another[0] = 999;
  assert.equal(collector.positions[0], saved[0], "Extracted arrays do not alias collector storage");
  collector.positions.push(0, 0, 99, 1, 0, 99, 0, 1, 99);
  assert.equal(collector.triangleCount, render.count + 1);
  assert.deepEqual(new Uint8Array(saved.buffer), new Uint8Array(expected.buffer), "Later collection cannot mutate an earlier extraction");
  assert.deepEqual(output(source), sourceSnapshot);
});

test("interleaved ground and kit survey writers share triangle caps and cancellation recovery", async () => {
  const source = await sourceLevel();
  const prepare = () => {
    const level = createBuildingLevel(source), survey = new TriangleSurvey();
    const slots = kitFinishes(level, undefined, "finish").materials, budget: KitBudget = { maximumTriangles: 2000 };
    const mesh = new KitMesh(level, "building", "props", slots, budget, survey);
    const pen = new Pen(mesh, "fixture", new Matrix4(), false);
    const emitKit = () => pen.face("wall", [[0, 0, 0], [.25, 0, 0], [0, 0, .25]], [0, 1, 0], [1, 1, 1]);
    const emitBox = () => new KitGeometry(level, "building", new Matrix4(), "props", budget, survey)
      .box("litter", [0, 0, 0], [.2, .3, .1], "finish");
    return { level, survey, budget, mesh, emitKit, emitBox };
  };
  const groundFirst = prepare();
  drawDeck(groundFirst.level, groundFirst.mesh, groundFirst.budget);
  const deckCount = groundFirst.survey.triangleCount, groundSnapshot = groundFirst.survey.snapshot();
  assert.ok(deckCount > 0);
  groundFirst.budget.maximumTriangles = deckCount;
  assert.throws(groundFirst.emitKit, /budget/i);
  assert.deepEqual(groundFirst.survey.snapshot(), groundSnapshot, "The kit writer accounts for previous direct ground triangles");

  const kitFirst = prepare(); kitFirst.emitKit();
  kitFirst.budget.maximumTriangles = deckCount;
  assert.throws(() => drawDeck(kitFirst.level, kitFirst.mesh, kitFirst.budget), /budget/i);
  assert.ok(kitFirst.survey.triangleCount > 1 && kitFirst.survey.triangleCount <= deckCount,
    "The ground writer must include existing kit triangles rather than start a new allowance");

  const controller = new AbortController(); controller.abort();
  groundFirst.budget.maximumTriangles = deckCount + 1;
  groundFirst.budget.signal = controller.signal;
  assert.throws(() => drawDeck(groundFirst.level, groundFirst.mesh, groundFirst.budget),
    (error: unknown) => error instanceof Error && error.name === "AbortError");
  assert.deepEqual(groundFirst.survey.snapshot(), groundSnapshot);
  groundFirst.budget.signal = undefined;
  groundFirst.emitKit();
  assert.equal(groundFirst.survey.triangleCount, deckCount + 1);
  assert.equal(groundFirst.mesh.triangleCount, deckCount + 1);
  const beforeBox = groundFirst.survey.snapshot();
  groundFirst.budget.maximumTriangles = deckCount + 12;
  assert.throws(groundFirst.emitBox, /budget/i);
  assert.deepEqual(groundFirst.survey.snapshot(), beforeBox, "Box admission includes previous kit and ground triangles");
  groundFirst.budget.maximumTriangles = deckCount + 13;
  groundFirst.emitBox();
  assert.equal(groundFirst.survey.triangleCount, deckCount + 13, "An unsubdivided six-face box fits its exact remaining allowance");
  assert.equal(groundFirst.mesh.triangleCount, deckCount + 13);
  assert.throws(groundFirst.emitKit, /budget/i, "Kit admission includes the box writer's triangles");
  assert.equal(groundFirst.level.mesh.indices.length, 0);
  assert.equal(kitFirst.level.mesh.indices.length, 0);
});

test("survey generation keeps triangle and cancellation failures isolated and supports a fresh generation", async () => {
  const level = await sourceLevel(), capped = buildings(level, { maximumTriangles: 8 }), before = output(level);
  assert.throws(() => capped.generate("building"), /budget/i);
  assert.deepEqual(output(level), before);
  assert.deepEqual(takeSurfaceCharts(level), []);
  const controller = new AbortController(); controller.abort();
  const cancelled = buildings(level, { maximumTriangles: 100_000, signal: controller.signal });
  assert.throws(() => cancelled.generate("building"), (error: unknown) => error instanceof Error && error.name === "AbortError");
  assert.deepEqual(output(level), before);
  assert.deepEqual(takeSurfaceCharts(level), []);
  const recovered = buildings(level, { maximumTriangles: 100_000 }), job = recovered.generate("building");
  assert.ok(job.survey.length > 0); recovered.append(job);
  assert.ok(level.mesh.surfaces.length > before.mesh.surfaces.length);
  assert.ok(takeSurfaceCharts(level).length > 0);
});

test("kit triangle emission preserves independent rounding, per-corner attributes and input ownership", async () => {
  const source = await sourceLevel(), level = createBuildingLevel(source);
  const mesh = new KitMesh(level, "building", "props", { wall: "finish" } as Record<KitSlot, string>, { maximumTriangles: 2 });
  const points: V3[] = [[.000005, -.000005, 1.234567], [1.000004, -1.234565, 2.000006], [-1.000006, .000004, -2.000004]];
  const face: V3 = [Math.SQRT1_2, -Math.SQRT1_2, 0];
  const smooth: V3[] = [[1, 0, 0], [0, 1, 0], [-Math.SQRT1_2, 0, Math.SQRT1_2]];
  const uv = [[1 / 3, -7.25], [13, .125], [-.5, 0]];
  const colors: V3[] = [[.1234, .1236, 1.2346], [.0004, .0005, 0], [.5, .00049, .9999]];
  const inputs = structuredClone({ points, face, smooth, uv, colors });
  mesh.add("flat", "wall", points, face, uv, colors);
  mesh.add("smooth", "wall", points, smooth, uv, colors);
  const roundedPoints = [.00001, -0, 1.23457, 1, -1.23456, 2.00001, -1.00001, 0, -2];
  const roundedColors = [.123, .124, 1.235, 0, .001, 0, .5, 0, 1];
  assert.deepEqual(level.mesh.positions, [...roundedPoints, ...roundedPoints]);
  assert.deepEqual(level.mesh.normals, [.7071, -.7071, 0, .7071, -.7071, 0, .7071, -.7071, 0, 1, 0, 0, 0, 1, 0, -.7071, 0, .7071]);
  assert.deepEqual(level.mesh.colors, [...roundedColors, ...roundedColors]);
  assert.deepEqual(level.mesh.uv, [...uv.flat(), ...uv.flat()]);
  assert.deepEqual(level.mesh.indices, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(level.mesh.surfaces.map(index => level.surfaces[index].object), ["building/$dressing/flat", "building/$dressing/smooth"]);
  assert.deepEqual({ points, face, smooth, uv, colors }, inputs);
});
