import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SceneBuilder, compile, renderReference, serializeLevelSvgx, projectReference, validateForRuntime,
  type ReferenceView } from "../src/vector/index.ts";
import { rayBlocked } from "../src/vector/validate.ts";
import { addWall, addCircularOpening, addStoreyShell, addStairFlight } from "../src/vector/architecture.ts";
import { evaluateReconstruction, type PhotoEvidence } from "../src/reconstruction/evaluate.ts";
import { runReconstruction, keepBetter, type BestCandidate, type ReconstructionAttempt } from "../src/reconstruction/loop.ts";

function fixture() {
  const scene = new SceneBuilder("reconstruction-test");
  const group = scene.group("building");
  const floor = group.platform("ground", { origin: [0, 0, 0], width: 8, depth: 8, material: "default" });
  scene.document.markers.push({ id: "spawn", layer: group.layer.id, region: floor.id,
    kind: "attacker_spawn", position: [4, 4, 0] });
  const reference = (id: string, x: number): ReferenceView => ({
    id, image: id + ".png", width: 80, height: 60,
    scale: "assumed", scaleNote: "Synthetic scene; dimensions are not survey measurements.",
    camera: { position: [x, -10, 7], target: [4, 4, 0],
      up: [0, 0, 1], fov: 58, near: 0.05, far: 500 },
    landmarks: [], masks: [],
  });
  scene.document.references = [reference("front", 4), reference("oblique", 12)];
  return { scene, group };
}

function silhouetteEvidence(level: Awaited<ReturnType<typeof compile>>): PhotoEvidence[] {
  return (level.document.references ?? []).map(reference => {
    const raster = renderReference(level, reference, { width: 80, height: 60 });
    return { referenceId: reference.id,
      imageDimensions: [reference.width, reference.height] as [number, number], silhouette: {
      width: 80, height: 60,
      pixels: Uint8Array.from(raster.surfaceIds, index => index >= 0 ? 1 : 0),
    } };
  });
}

describe("architectural reconstruction primitives", () => {
  it("creates real wall cutouts, not visual-only round decals", async () => {
    const { scene, group } = fixture();
    const wall = addWall(group, "courtyard-wall", {
      from: [1, 1, 0], to: [7, 1, 0], height: 4, material: "default" });
    const slices = addCircularOpening(group, wall, "round-window", {
      centerAlong: 3, centerHeight: 2, radius: 1, segments: 32 });
    assert.ok(slices.length >= 28);
    assert.equal(wall.kind, "wall");
    assert.ok(slices.every(s => s.head > s.sill));
    const level = await compile(scene.document, { navigation: false });
    assert.deepEqual(level.diagnostics.filter(d => d.severity === "error"), []);
    assert.equal(rayBlocked(level, [4, 0, 2], [4, 2, 2]), false,
      "Line of sight must pass through the actual opening");
    assert.equal(rayBlocked(level, [4, 0, 3.5], [4, 2, 3.5]), true,
      "Solid wall above the circular opening must block visibility");
  });
  it("supports irregular enterable shells and individually positioned flights", async () => {
    const { scene, group } = fixture();
    const shell = addStoreyShell(group, "upper", {
      footprint: [[0, 0], [8, 0], [8, 3], [5, 3], [5, 7], [0, 7]],
      z: 4, height: 3.2, material: "default" });
    assert.equal(shell.walls.length, 6);
    assert.ok(shell.walls.every(w => w.kind === "wall"));
    const flight = addStairFlight(group, "flight", {
      lower: [[1, 1, 0], [2.5, 1, 0]],
      upper: [[1, 5, 2], [2.5, 5, 2]], material: "default" });
    assert.equal(flight.fill, "stairs");
    assert.equal(flight.underside, "sloped");
    assert.deepEqual(scene.document.layers[0].regions.find(r => r.id === flight.id), flight);
    const level = await compile(scene.document, { navigation: false });
    assert.ok(level.mesh.indices.length > 0);
  });
});

describe("multi-view reference evaluation", () => {
  it("accepts matching independent masks from two distinct reference cameras", async () => {
    const { scene } = fixture();
    const level = await compile(scene.document, { navigation: false });
    const evidence = silhouetteEvidence(level);
    const report = evaluateReconstruction(level, evidence, {
      maxDimension: 80, navigationPassed: true,
      thresholds: { minimumVerifiedViews: 2, silhouetteIoU: 0.99 },
    });
    assert.equal(report.verifiedViews, 2);
    assert.equal(report.passed, true, report.issues.join("\n"));
    assert.ok(report.views.every(v => v.silhouette?.iou === 1));
  });
  it("rejects a wrong silhouette even when the geometry compiles", async () => {
    const { scene } = fixture();
    const baseline = await compile(scene.document, { navigation: false });
    const evidence = silhouetteEvidence(baseline);
    const group = scene.group("extra");
    group.box("mass", { position: [3, -1, 0], size: [5, 2, 9],
      material: "default", collision: "none" });
    const altered = await compile(scene.document, { navigation: false });
    const report = evaluateReconstruction(altered, evidence,
      { maxDimension: 80, navigationPassed: true, thresholds: { silhouetteIoU: 0.99 } });
    assert.equal(report.passed, false);
    assert.ok(report.views.some(v => (v.silhouette?.iou ?? 1) < 0.99));
  });
  it("does not certify a reconstruction based solely on unannotated photos", async () => {
    const { scene } = fixture();
    const level = await compile(scene.document, { navigation: false });
    const blank = { width: 80, height: 60, rgba: new Uint8Array(80 * 60 * 4) };
    const report = evaluateReconstruction(level, [{ referenceId: "front", photo: blank }],
      { maxDimension: 80, navigationPassed: true });
    assert.equal(report.passed, false);
    assert.equal(report.verifiedViews, 0);
    assert.match(report.issues.join(" "), /unverified/);
  });
  it("returns source-located feedback to a reviser and repairs invalid SVGX", async () => {
    const { scene } = fixture();
    const compiled = await compile(scene.document, { navigation: false });
    const evidence = silhouetteEvidence(compiled);
    const replacement = serializeLevelSvgx(scene.document);
    let calls = 0;
    const result = await runReconstruction("<invalid>", evidence, async feedback => {
      calls++;
      assert.equal(feedback.iteration, 1);
      assert.ok(feedback.lastAttempt?.diagnostics.length);
      return replacement;
    }, { maxRevisions: 1, evaluationDimension: 80,
      thresholds: { minimumVerifiedViews: 2, silhouetteIoU: 0.99 } });
    assert.equal(calls, 1);
    assert.equal(result.accepted, true,
      result.attempts.map(a => a.diagnostics.join("\n")).join("\n"));
    assert.equal(result.attempts.length, 2);
    assert.equal(result.source, replacement);
  });
  it("limits revisions and does not declare success without independent evidence", async () => {
    const { scene } = fixture();
    const source = serializeLevelSvgx(scene.document);
    const result = await runReconstruction(source, [], async () => source,
      { maxRevisions: 2, evaluationDimension: 80 });
    assert.equal(result.accepted, false);
    assert.equal(result.status, "stopped");
    assert.equal(result.attempts.length, 1);
  });
});

describe("review regressions: independently trusted evidence", () => {
  it("rejects model-authored perfectly aligned landmarks without external annotations", async () => {
    const { scene } = fixture();
    const positions: [number, number, number][] = [[3, 3, 0], [4, 4, 0], [5, 5, 0]];
    for (const ref of scene.document.references ?? [])
      ref.landmarks = positions.map((position, index) => ({
        id: `fabricated-${index}`, position, image: projectReference(ref, position).image!,
      }));
    const level = await compile(scene.document, { navigation: false });
    const reported = evaluateReconstruction(level, [], { navigationPassed: true, maxDimension: 80 });
    assert.equal(reported.passed, false);
    assert.equal(reported.verifiedViews, 0);
    assert.ok(reported.views.every(view => view.landmarks.compared === 0));
    assert.match(reported.issues.join(" "), /independent|unverified/i);
  });
  it("uses trusted landmarks to check cameras, but requires actual geometry-linked observations", async () => {
    const { scene, group } = fixture();
    const level = await compile(scene.document, { navigation: false });
    const evidence: PhotoEvidence[] = (level.document.references ?? []).map(ref => ({
      referenceId: ref.id, imageDimensions: [ref.width, ref.height],
      landmarks: ([[3, 3, 0], [4, 4, 0], [5, 5, 0]] as [number, number, number][])
        .map((position, i) => ({
          id: `trusted-${i}`, position, image: projectReference(ref, position).image!,
        })),
    }));
    const cameraOnly = evaluateReconstruction(level, evidence, { navigationPassed: true, maxDimension: 80 });
    assert.equal(cameraOnly.passed, false);
    assert.equal(cameraOnly.verifiedViews, 0);
    assert.ok(cameraOnly.views.every(view => view.landmarks.rmsPixels === 0));
    // Unrelated extra geometry does not change the self-consistent camera fit.
    group.box("unrelated", { position: [4, -2, 0], size: [6, 3, 10],
      material: "default", collision: "none" });
    const unrelated = await compile(scene.document, { navigation: false });
    assert.equal(evaluateReconstruction(unrelated, evidence, {
      navigationPassed: true, maxDimension: 80,
    }).passed, false);
    const anchored = silhouetteEvidence(level);
    for (let i = 0; i < anchored.length; i++) anchored[i].landmarks = evidence[i].landmarks;
    const matched = evaluateReconstruction(level, anchored, { navigationPassed: true, maxDimension: 80 });
    assert.equal(matched.passed, true, matched.issues.join("\n"));
    assert.equal(matched.verifiedViews, 2);
    anchored[0].landmarks![0].image = [0, 0];
    const mismatched = evaluateReconstruction(level, anchored, { navigationPassed: true, maxDimension: 80 });
    assert.equal(mismatched.passed, false);
    assert.match(mismatched.issues.join(" "), /Landmark error/);
  });
  it("does not allow candidate-defined masks to erase external structural evidence", async () => {
    const { scene } = fixture();
    const target = scene.document.references![0];
    target.masks.push({ id: "fake-mask", points: [[0, 0], [1, 0], [1, 1], [0, 1]] });
    const level = await compile(scene.document, { navigation: false });
    const evidence: PhotoEvidence[] = [{
      referenceId: "front", imageDimensions: [80, 60], strokes: [{ id: "unmatched-edge", points: [[0.99, 0.98]] }],
    }];
    const report = evaluateReconstruction(level, evidence, {
      navigationPassed: true, maxDimension: 80,
      thresholds: { strokeErrorPixels: 1, minimumVerifiedViews: 1 },
    });
    assert.equal(report.passed, false);
    assert.ok((report.views[0].strokeErrorPixels ?? 0) > 1);
  });
});

function dynamicallyBlockedFixture() {
  const { scene, group } = fixture();
  scene.document.covers.push({
    id: "closed-gate", layer: group.layer.id,
    min: [3.8, 0, 0], max: [4.2, 8, 3], dynamic: true,
  });
  scene.document.markers[0].position = [1, 4, 0];
  scene.document.markers.push({
    id: "exit", layer: group.layer.id, kind: "objective", position: [7, 4, 0],
  });
  scene.document.routes.push({ id: "gate-route", from: "spawn", to: "exit", minRoutes: 1 });
  return scene;
}

describe("review regressions: navigation and candidate retention", () => {
  it("rejects a candidate whose closed dynamic gate disconnects the navigable floor", async () => {
    const scene = dynamicallyBlockedFixture();
    const raw = await compile(scene.document, { navigation: false });
    const evidence = silhouetteEvidence(raw);
    const ordinary = await validateForRuntime(raw, { sealed: true });
    assert.equal(ordinary.passed, true);
    assert.equal(ordinary.navigation?.routes.find(route => route.id === "gate-route")?.reachable, true);
    assert.equal(ordinary.sealed?.routes.find(route => route.id === "gate-route")?.reachable, false);
    const source = serializeLevelSvgx(scene.document);
    const result = await runReconstruction(source, evidence, async () => null, {
      maxRevisions: 0, evaluationDimension: 80,
    });
    assert.equal(result.attempts.length, 1);
    const attempt = result.attempts[0];
    assert.equal(attempt.report?.navigationPassed, false, attempt.diagnostics.join("\n"));
    assert.equal(attempt.report?.sealedNavigationPassed, false);
    assert.equal(attempt.valid, false);
    assert.equal(attempt.accepted, false);
    assert.match(attempt.diagnostics.join(" "), /SEALED/);
    assert.equal(result.accepted, false);
  });
  it("does not expose an invalid but compilable candidate as the best output", async () => {
    const scene = dynamicallyBlockedFixture();
    const raw = await compile(scene.document, { navigation: false });
    const evidence = silhouetteEvidence(raw);
    const invalid = serializeLevelSvgx(scene.document);
    const result = await runReconstruction(invalid, evidence, async () => null, {
      maxRevisions: 1, evaluationDimension: 80,
    });
    assert.equal(result.attempts[0].valid, false);
    assert.ok(result.attempts[0].report);
    assert.ok(Number.isFinite(result.attempts[0].score), "Rejected candidate must be genuinely scored.");
    assert.equal(result.source, null);
    assert.equal(result.level, null);
    assert.equal(result.report, null);
    assert.equal(result.attempts[0].source, invalid, "Rejected drafts must remain available to the reviser.");
  });
});

describe("review regressions: shared architectural topology", () => {
  for (const wallFirst of [true, false]) {
    it(`uses one wall edge and four vertices when wall is ${wallFirst ? "before" : "after"} floor`, async () => {
      const scene = new SceneBuilder(wallFirst ? "wall-first" : "floor-first");
      const group = scene.group("shell");
      const makeWall = () => addWall(group, "south", {
        from: [0, 0, 0], to: [8, 0, 0], height: 3, material: "default",
      });
      const wall = wallFirst ? makeWall() : null;
      const floor = group.platform("deck", { width: 8, depth: 8, material: "default" });
      const shared = wall ?? makeWall();
      const source = serializeLevelSvgx(scene.document);
      assert.equal(group.layer.vertices.length, 4);
      assert.equal(group.layer.edges.length, 4);
      assert.equal(group.layer.edges.filter(edge => edge.kind === "wall").length, 1);
      assert.ok(floor.boundary.includes(shared.id) || floor.boundary.includes("-" + shared.id));
      assert.ok(source.includes(shared.id));
      const level = await compile(scene.document, { navigation: false });
      assert.deepEqual(level.diagnostics.filter(d => d.severity === "error"), []);
    });
  }
  it("reuses a compatible wall that was authored before the enclosing storey", () => {
    const scene = new SceneBuilder("prior-wall");
    const group = scene.group("shell");
    const existing = addWall(group, "south", { from: [0, 0, 0], to: [8, 0, 0],
      height: 3.2, material: "default" });
    const shell = addStoreyShell(group, "floor", {
      footprint: [[0, 0], [8, 0], [8, 8], [0, 8]],
      z: 0, height: 3.2, material: "default",
    });
    assert.strictEqual(shell.walls[0], existing);
    assert.equal(group.layer.vertices.length, 4);
    assert.equal(group.layer.edges.length, 4);
  });
});

describe("initial-model generation", () => {
  it("runs the model once when no source is provided and zero revisions are allowed", async () => {
    const { scene } = fixture();
    const compiled = await compile(scene.document, { navigation: false });
    const independent = silhouetteEvidence(compiled);
    const generated = serializeLevelSvgx(scene.document);
    let count = 0;
    const result = await runReconstruction("", independent, async feedback => {
      count++;
      assert.equal(feedback.iteration, 0);
      assert.equal(feedback.lastAttempt, null);
      return generated;
    }, { maxRevisions: 0, evaluationDimension: 80 });
    assert.equal(count, 1);
    assert.equal(result.attempts.length, 1);
    assert.equal(result.status, "accepted", result.attempts[0].diagnostics.join("\n"));
    assert.equal(result.source, generated);
  });
});

describe("review regressions: image metadata is not model-controlled evidence", () => {
  it("rejects dimensions changed by the candidate despite independent matching silhouettes", async () => {
    const { scene } = fixture();
    const compiled = await compile(scene.document, { navigation: false });
    const evidence = silhouetteEvidence(compiled);
    compiled.document.references![0].width = 40;
    assert.throws(() => evaluateReconstruction(compiled, evidence, {
      navigationPassed: true, maxDimension: 80,
    }), /dimensions differ from independently supplied photo/);
  });
  it("does not accept landmark-only evidence without independently measured image size", async () => {
    const { scene } = fixture();
    const compiled = await compile(scene.document, { navigation: false });
    const reference = compiled.document.references![0];
    const position: [number, number, number] = [4, 4, 0];
    const evidence: PhotoEvidence[] = [{ referenceId: reference.id,
      landmarks: [{ id: "trusted-point", position, image: projectReference(reference, position).image! }],
    }];
    assert.throws(() => evaluateReconstruction(compiled, evidence, {
      navigationPassed: true, maxDimension: 80,
    }), /independently supplied image dimensions/);
  });
});


describe("acceptance correctness regressions", () => {
  it("prioritizes an accepted result even when a rejected valid candidate scored lower", async () => {
    const { scene } = fixture();
    const level = await compile(scene.document, { navigation: false });
    const report = evaluateReconstruction(level, silhouetteEvidence(level), {
      navigationPassed: true, maxDimension: 80,
    });
    const best: BestCandidate = { source: null, level: null, report: null, score: Infinity };
    const rejected: ReconstructionAttempt = {
      iteration: 0, source: "rejected", valid: true, accepted: false,
      report, score: 1, diagnostics: ["Rejected visual acceptance"],
    };
    const accepted: ReconstructionAttempt = {
      iteration: 1, source: "accepted", valid: true, accepted: true,
      report, score: 500, diagnostics: [],
    };
    keepBetter(best, { attempt: rejected, level });
    assert.equal(best.source, "rejected");
    keepBetter(best, { attempt: accepted, level });
    assert.equal(best.source, "accepted");
    assert.equal(best.score, 500);
    assert.strictEqual(best.report, accepted.report);
  });
  it("rejects camera-only observations and single point pseudo-edges", async () => {
    const { scene } = fixture();
    const level = await compile(scene.document, { navigation: false });
    const reference = level.document.references![0];
    const point: [number, number, number] = [4, 4, 0];
    const report = evaluateReconstruction(level, [{
      referenceId: reference.id,
      imageDimensions: [reference.width, reference.height],
      landmarks: [0, 1, 2].map(i => ({
        id: `camera-${i}`, position: point, image: projectReference(reference, point).image!,
      })),
      strokes: [{ id: "single-pixel", points: [[0.5, 0.5]] }],
    }], { navigationPassed: true, maxDimension: 80,
      thresholds: { minimumVerifiedViews: 1, strokeErrorPixels: 1000 } });
    assert.equal(report.passed, false);
    assert.equal(report.verifiedViews, 0);
    assert.equal(report.views[0].landmarks.compared, 3);
  });
  it("requires sealed-navigation evidence from direct evaluator calls", async () => {
    const scene = dynamicallyBlockedFixture();
    const level = await compile(scene.document, { navigation: false });
    const evidence = silhouetteEvidence(level);
    const ordinaryOnly = evaluateReconstruction(level, evidence, {
      navigationPassed: true, maxDimension: 80,
    });
    assert.equal(ordinaryOnly.passed, false);
    assert.match(ordinaryOnly.issues.join(" "), /Sealed navigation has not been verified/);
    const failedSealed = evaluateReconstruction(level, evidence, {
      navigationPassed: true, sealedNavigationPassed: false, maxDimension: 80,
    });
    assert.equal(failedSealed.passed, false);
    assert.equal(failedSealed.sealedNavigationPassed, false);
    assert.match(failedSealed.issues.join(" "), /Sealed navigation failed/);
    const noDynamic = await compile(fixture().scene.document, { navigation: false });
    const badStatus = evaluateReconstruction(noDynamic, silhouetteEvidence(noDynamic), {
      navigationPassed: true, sealedNavigationPassed: false, maxDimension: 80,
    });
    assert.equal(badStatus.passed, false, "Direct evaluator must never ignore explicit sealed failure.");
  });
  it("keeps coincident and adjacent architectural groups topologically independent", () => {
    const scene = new SceneBuilder("assembly-isolation");
    const first = scene.group("west");
    const second = scene.group("east");
    const wall = addWall(first, "partition", {
      from: [4, 0, 0], to: [4, 4, 0], height: 3, material: "default",
    });
    const left = first.platform("floor", { width: 4, depth: 4, material: "default" });
    const right = second.platform("floor", {
      origin: [4, 0, 0], width: 4, depth: 4, material: "default",
    });
    const edges = (boundary: string[]) => boundary.map(e => e.replace(/^-/, ""));
    assert.ok(edges(left.boundary).includes(wall.id));
    assert.ok(!edges(right.boundary).includes(wall.id));
    assert.equal(first.layer, second.layer);
    assert.equal(first.layer.vertices.length, 8);
    assert.equal(first.layer.edges.length, 8);
    assert.equal(first.layer.edges.filter(edge => edge.kind === "wall").length, 1);
    for (const edge of edges(right.boundary)) assert.ok(!edges(left.boundary).includes(edge));
  });
});
