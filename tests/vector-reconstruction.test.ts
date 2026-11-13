import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ArchitectureBuilder, compile, serializeAml, validateForRuntime } from "levelspec";
import {renderReference} from "../src/vector/reference-raster.ts";
import {projectReference} from "../src/vector/reference.ts";
import type {ReferenceView} from "../src/vector/reference.ts";
import { rayBlocked } from "../src/vector/validate.ts";
import { evaluateReconstruction, type PhotoEvidence } from "../src/reconstruction/evaluate.ts";
import { runReconstruction, keepBetter, type BestCandidate, type ReconstructionAttempt } from "../src/reconstruction/loop.ts";

function fixture() {
  const scene = new ArchitectureBuilder("reconstruction-test");
  scene.document.validation = "premap";
  scene.profile("ground-plan", [[0,0,0],[8,0,0],[8,8,0],[0,8,0]]);
  const floor = scene.slab("ground", "ground-plan");
  scene.document.markers.push({ id: "spawn", layer:"architecture", region: floor.id, kind: "spawn", position: [4,4,0] });
  const group = scene;
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

/** Surveyed floor corners standing in for independently measured correspondences. */
function trustedLandmarks(reference: ReferenceView) {
  return ([[0, 0, 0], [8, 0, 0], [8, 8, 0], [0, 8, 0]] as [number, number, number][])
    .map((position, i) => ({ id: `survey-${i}`, position, image: projectReference(reference, position).image! }));
}
function silhouetteEvidence(level: Awaited<ReturnType<typeof compile>>,
  calibrated = true): PhotoEvidence[] {
  return (level.document.references ?? []).map(reference => {
    const raster = renderReference(level, reference, { width: 80, height: 60 });
    return { referenceId: reference.id,
      ...(calibrated ? { landmarks: trustedLandmarks(reference) } : {}),
      imageDimensions: [reference.width, reference.height] as [number, number], silhouette: {
      width: 80, height: 60,
      pixels: Uint8Array.from(raster.surfaceIds, index => index >= 0 ? 1 : 0),
    } };
  });
}

describe("native architectural reconstruction primitives", () => {
  it("creates a real native circular aperture rather than a visual decal", async () => {
    const {scene}=fixture();scene.path("axis",[[1,1,0],[7,1,0]]);scene.wall("courtyard-wall","axis",{height:4});
    scene.opening("round-window","courtyard-wall",{shape:"circle",center:[3,2],radius:1});
    const level=await compile(scene.document,{navigation:false});assert.deepEqual(level.diagnostics.filter(d=>d.severity==="error"),[]);
    assert.equal(rayBlocked(level,[4,0,2],[4,2,2]),false);assert.equal(rayBlocked(level,[4,0,3.5],[4,2,3.5]),true);
  });
  it("retains independent native stair walking tops and sloped undersides",async()=>{
    const {scene}=fixture();scene.path("axis",[[1.75,1,0],[1.75,5,2]]);const flight=scene.stairs("flight",{path:"axis",width:1.5,count:12,underside:"sloped"});
    assert.equal(flight.kind,"stairs");assert.equal(flight.underside,"sloped");assert.ok(scene.document.elements.includes(flight));
    const level=await compile(scene.document,{navigation:false});assert.ok(level.mesh.indices.length>0);
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
    const group = scene;
    group.box("mass", { position: [3, -1, 0], width: 5, depth: 2, height: 9,
      material: "default", collidable: false });
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
  it("returns source-located feedback to a reviser and repairs invalid AML", async () => {
    const { scene } = fixture();
    const compiled = await compile(scene.document, { navigation: false });
    const evidence = silhouetteEvidence(compiled);
    const replacement = serializeAml(scene.document);
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
    const source = serializeAml(scene.document);
    const result = await runReconstruction(source, [], async () => source,
      { maxRevisions: 2, evaluationDimension: 80 });
    assert.equal(result.accepted, false);
    assert.equal(result.status, "stopped");
    assert.equal(result.attempts.length, 1);
  });
  it("keeps the reconstruction API's finite-positive grid contract independent of tool bounds", async () => {
    const { scene } = fixture();
    const source = serializeAml(scene.document);
    const result = await runReconstruction(source, [], async () => null,
      { maxRevisions: 0, navigationCell: 0.75 });
    assert.equal(result.attempts[0].valid, true);
    assert.equal(result.level?.navigation?.settings.cell, 0.75);
    assert.equal(result.accepted, false, "Grid selection cannot replace independent photo evidence.");
    for (const navigationCell of [0, -1, NaN, Infinity]) {
      await assert.rejects(runReconstruction(source, [], async () => {
        assert.fail("Invalid settings must fail before requesting a revision.");
      }, { navigationCell }), /finite and positive/);
    }
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
      landmarks: trustedLandmarks(ref),
    }));
    const cameraOnly = evaluateReconstruction(level, evidence, { navigationPassed: true, maxDimension: 80 });
    assert.equal(cameraOnly.passed, false);
    assert.equal(cameraOnly.verifiedViews, 0);
    // Calibrated, so the rejection is for missing geometry-linked observations.
    assert.ok(cameraOnly.views.every(view => view.cameraCalibrated));
    assert.ok(cameraOnly.views.every(view => view.landmarks.rmsPixels === 0));
    // Unrelated extra geometry does not change the self-consistent camera fit.
    group.box("unrelated", { position: [4, -2, 0], width: 6, depth: 3, height: 10,
      material: "default", collidable: false });
    const unrelated = await compile(scene.document, { navigation: false });
    assert.equal(evaluateReconstruction(unrelated, evidence, {
      navigationPassed: true, maxDimension: 80,
    }).passed, false);
    // Enough landmarks, but collinear ones leave the camera free to roll about their line.
    const collinear = silhouetteEvidence(level);
    for (const item of collinear) {
      const ref = level.document.references!.find(r => r.id === item.referenceId)!;
      item.landmarks = ([[2, 2, 0], [3, 3, 0], [4, 4, 0], [5, 5, 0], [6, 6, 0]] as [number, number, number][])
        .map((position, i) => ({ id: `line-${i}`, position, image: projectReference(ref, position).image! }));
    }
    const rolled = evaluateReconstruction(level, collinear, { navigationPassed: true, maxDimension: 80 });
    assert.equal(rolled.passed, false);
    assert.match(rolled.issues.join(" "), /not independently calibrated/);
    const anchored = silhouetteEvidence(level);
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
  scene.box("closed-gate",{position:[3.8,0,0],width:.4,depth:8,height:3,dynamic:true});
  scene.document.markers[0].position=[1,4,0];
  scene.document.markers.push({id:"exit",layer:"architecture",kind:"objective",position:[7,4,0]});
  scene.document.routes.push({ id: "gate-route", from: "spawn", to: "exit", minRoutes: 1 });
  return scene;
}

describe("review regressions: navigation and candidate retention", () => {
  it("rejects a candidate whose closed dynamic gate disconnects the navigable floor", async () => {
    const scene = dynamicallyBlockedFixture();
    const raw = await compile(scene.document, { navigation: false });
    const evidence = silhouetteEvidence(raw);
    const ordinary = await validateForRuntime(raw, { sealed: true, cell: 0.0625 });
    assert.equal(ordinary.passed, false);
    assert.ok(ordinary.diagnostics.some(diagnostic => diagnostic.code === "ROUTE_REQUIREMENT" && diagnostic.message.startsWith("Sealed:")));
    assert.equal(ordinary.navigation?.settings.cell, 0.0625);
    assert.equal(ordinary.sealed?.settings.cell, 0.0625);
    assert.equal(ordinary.navigation?.routes.find(route => route.id === "gate-route")?.reachable, true);
    assert.equal(ordinary.sealed?.routes.find(route => route.id === "gate-route")?.reachable, false);
    const source = serializeAml(scene.document);
    const result = await runReconstruction(source, evidence, async () => null, {
      maxRevisions: 0, evaluationDimension: 80, navigationCell: 0.0625,
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
    const invalid = serializeAml(scene.document);
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

describe("native reconstruction source identity",()=>{
  for(const wallFirst of [true,false])it(`retains native wall identity independently of floor authoring order: ${wallFirst}`,async()=>{
    const scene=new ArchitectureBuilder("order");scene.document.validation="premap";scene.path("axis",[[0,0,0],[8,0,0]]);scene.profile("plan",[[0,0,0],[8,0,0],[8,8,0],[0,8,0]]);
    const wall=()=>scene.wall("south","axis",{height:3});if(wallFirst)wall();scene.slab("floor","plan");if(!wallFirst)wall();
    const level=await compile(scene.document,{navigation:false});assert.deepEqual(level.diagnostics.filter(d=>d.severity==="error"),[]);assert.ok(level.provenance.south);assert.equal(scene.document.elements.filter(e=>e.id==="south").length,1);assert.ok(serializeAml(scene.document).includes('id="south"'));
  });
});

describe("initial-model generation", () => {
  it("runs the model once when no source is provided and zero revisions are allowed", async () => {
    const { scene } = fixture();
    const compiled = await compile(scene.document, { navigation: false });
    const independent = silhouetteEvidence(compiled);
    const generated = serializeAml(scene.document);
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
    const coincident = evaluateReconstruction(level, [{
      referenceId: reference.id,
      imageDimensions: [reference.width, reference.height],
      landmarks: [0, 1, 2, 3].map(i => ({
        id: `camera-${i}`, position: point, image: projectReference(reference, point).image!,
      })),
    }], { navigationPassed: true, maxDimension: 80, thresholds: { minimumVerifiedViews: 1 } });
    assert.equal(coincident.views[0].cameraCalibrated, false);
    // A properly calibrated camera still cannot certify a single-point "stroke".
    const report = evaluateReconstruction(level, [{
      referenceId: reference.id,
      imageDimensions: [reference.width, reference.height],
      landmarks: trustedLandmarks(reference),
      strokes: [{ id: "single-pixel", points: [[0.5, 0.5]] }],
    }], { navigationPassed: true, maxDimension: 80,
      thresholds: { minimumVerifiedViews: 1, strokeErrorPixels: 1000 } });
    assert.equal(report.views[0].cameraCalibrated, true);
    assert.equal(report.passed, false);
    assert.equal(report.verifiedViews, 0);
    assert.equal(report.views[0].landmarks.compared, 4);
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

});

describe("review regressions: reviser failures and cancellation", () => {
  it("keeps the best valid candidate and reports the error when the reviser throws", async () => {
    const { scene } = fixture();
    const source = serializeAml(scene.document);
    const result = await runReconstruction(source, [], async () => {
      throw new Error("provider unavailable");
    }, { maxRevisions: 2, evaluationDimension: 80 });
    assert.equal(result.accepted, false);
    assert.equal(result.status, "failed");
    assert.match(result.error ?? "", /provider unavailable/);
    assert.equal(result.attempts.length, 1);
    assert.equal(result.source, source);
  });
  it("reports an initial-generation failure without a candidate", async () => {
    const result = await runReconstruction("", [], async () => {
      throw new Error("bad credentials");
    }, { maxRevisions: 0, evaluationDimension: 80 });
    assert.equal(result.status, "failed");
    assert.match(result.error ?? "", /bad credentials/);
    assert.equal(result.source, null);
    assert.equal(result.attempts.length, 0);
  });
  it("does not request another revision after cancellation during inspection", async () => {
    const { scene } = fixture();
    const source = serializeAml(scene.document);
    const controller = new AbortController();
    let revisions = 0;
    const result = await runReconstruction(source, [], async () => { revisions++; return source + " "; }, {
      maxRevisions: 3, evaluationDimension: 80, signal: controller.signal,
      onAttempt: () => controller.abort(),
    });
    assert.equal(revisions, 0);
    assert.equal(result.status, "aborted");
    assert.equal(result.accepted, false);
  });
  it("passes the cancellation signal to the reviser", async () => {
    const { scene } = fixture();
    const source = serializeAml(scene.document);
    const controller = new AbortController();
    let received: AbortSignal | undefined;
    await runReconstruction(source, [], async request => { received = request.signal; return null; },
      { maxRevisions: 1, evaluationDimension: 80, signal: controller.signal });
    assert.equal(received, controller.signal);
  });
});

describe("review regressions: candidate-authored cameras need independent calibration", () => {
  it("does not certify matching silhouettes seen through an uncalibrated camera", async () => {
    const { scene } = fixture();
    const level = await compile(scene.document, { navigation: false });
    const report = evaluateReconstruction(level, silhouetteEvidence(level, false),
      { navigationPassed: true, maxDimension: 80 });
    assert.equal(report.passed, false);
    assert.equal(report.verifiedViews, 0);
    assert.ok(report.views.every(view => !view.cameraCalibrated && (view.silhouette?.iou ?? 0) > 0.99));
    assert.match(report.issues.join(" "), /not independently calibrated/);
  });
  it("rejects a moved camera that the trusted survey contradicts", async () => {
    const { scene } = fixture();
    const truth = await compile(scene.document, { navigation: false });
    const evidence = silhouetteEvidence(truth);
    // The candidate re-aims its camera; calibrated landmarks expose the change.
    scene.document.references![0].camera.position = [2, -14, 9];
    const moved = await compile(scene.document, { navigation: false });
    const report = evaluateReconstruction(moved, evidence, { navigationPassed: true, maxDimension: 80 });
    assert.equal(report.passed, false);
    assert.ok((report.views[0].landmarks.rmsPixels ?? 0) > 1);
    assert.equal(report.views[1].landmarks.rmsPixels, 0);
  });
  it("lets the independent manifest, not the candidate, opt out of calibration", async () => {
    const { scene } = fixture();
    const level = await compile(scene.document, { navigation: false });
    const report = evaluateReconstruction(level, silhouetteEvidence(level, false), {
      navigationPassed: true, maxDimension: 80, thresholds: { minimumCameraLandmarks: 0 },
    });
    assert.equal(report.passed, true, report.issues.join("\n"));
    assert.throws(() => evaluateReconstruction(level, [], {
      navigationPassed: true, thresholds: { minimumCameraLandmarks: -1 } }), /non-negative/);
  });
});

describe("review regressions: cancellation during the final inspection", () => {
  it("reports aborted, not exhausted, for a zero-revision evaluation cancelled mid-run", async () => {
    const { scene } = fixture();
    const controller = new AbortController();
    const result = await runReconstruction(serializeAml(scene.document), [], async () => null, {
      maxRevisions: 0, evaluationDimension: 80, signal: controller.signal,
      onAttempt: () => controller.abort(),
    });
    assert.equal(result.status, "aborted");
    assert.equal(result.accepted, false);
  });
});
