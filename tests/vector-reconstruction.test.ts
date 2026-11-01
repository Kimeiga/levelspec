import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SceneBuilder, compile, renderReference, serializeLevelSvgx,
  type ReferenceView } from "../src/vector/index.ts";
import { rayBlocked } from "../src/vector/validate.ts";
import { addWall, addCircularOpening, addStoreyShell, addStairFlight } from "../src/vector/architecture.ts";
import { evaluateReconstruction, type PhotoEvidence } from "../src/reconstruction/evaluate.ts";
import { runReconstruction } from "../src/reconstruction/loop.ts";

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
    return { referenceId: reference.id, silhouette: {
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
