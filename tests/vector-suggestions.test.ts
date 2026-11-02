import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compile,
  createDocument,
  parseLevelSvgx,
  serializeLevelSvgx,
  type CompiledLevel,
  type EdgeKind,
  type Layer,
  type LevelDocument,
  type V3,
} from "../src/vector/index.ts";

/** Two separated wall continuations, with dimensions in Z-up meters. */
function walls(offset = 0.05): LevelDocument {
  const document = createDocument("suggested-walls");
  document.layers = [wall("first", [0, 0, 0], [2, 0, 0]), wall("second", [2.1, offset, 0], [4.1, offset, 0])];
  return document;
}

/** A source wall owns its vertices so tests can vary layers independently. */
function wall(id: string, a: V3, b: V3, kind: EdgeKind = "wall"): Layer {
  return {
    id: `${id}.layer`,
    vertices: [a, b].map(([x, y, z], i) => ({ id: `${id}.v${i}`, x, y, z })),
    edges: [{ id, from: `${id}.v0`, to: `${id}.v1`, kind, height: 3, thickness: 0.22, openings: [] }],
    regions: [],
  };
}

/** A 2 m wide, 4 m long flight rising 1.2 m, with initially open sides. */
function flight(fill: "stairs" | "ramp" = "stairs"): LevelDocument {
  const document = createDocument("suggested-flight");
  const points: V3[] = [[0, 0, 0], [2, 0, 0], [2, 4, 1.2], [0, 4, 1.2]];
  document.layers = [{
    id: "flight.layer",
    vertices: points.map(([x, y, z], i) => ({ id: `v${i}`, x, y, z })),
    edges: points.map((_, i) => ({ id: `e${i}`, from: `v${i}`, to: `v${(i + 1) % 4}`, kind: "open", openings: [] })),
    regions: [{ id: "flight", fill, lower: "e0", upper: "e2", boundary: ["e0", "e1", "e2", "e3"], holes: [], interior: [], creases: [] }],
  }];
  return document;
}

/** Compile through the public API without unrelated navigation or contact audits. */
async function inspect(document: LevelDocument, onGeometry?: (level: CompiledLevel) => void) {
  const level = await compile(document, { navigation: false, floorGaps: false, surfaceContacts: false, onGeometry });
  assert.deepEqual(level.diagnostics, [], "Suggestion fixtures must remain valid geometry with no warnings.");
  return level;
}

/** Select the one aggregated wall-pair finding. */
function alignment(level: CompiledLevel) {
  const findings = level.suggestions.filter((suggestion) => suggestion.code === "WALL_ALIGNMENT");
  assert.equal(findings.length, 1, "One source wall pair must not emit duplicate findings for its triangles or opposite faces.");
  return findings[0];
}

/** Bind exactly one current suggestion to an intentional XML review decision. */
function suppress(document: LevelDocument, suggestion: CompiledLevel["suggestions"][number]) {
  document.reviewSuppressions = [{ suggestion: suggestion.id, fingerprint: suggestion.fingerprint, reason: "Intentional architectural offset" }];
}

describe("compiler review suggestions", () => {
  it("reports measured wall offsets and source-linked spatial targets before geometry-ready", async () => {
    const document = parseLevelSvgx(serializeLevelSvgx(walls()));
    let ready: CompiledLevel["suggestions"] | undefined;
    const level = await inspect(document, (geometry) => { ready = structuredClone(geometry.suggestions); });
    const suggestion = alignment(level);
    assert.deepEqual([...suggestion.objects].sort(), ["first", "second"]);
    assert.ok(Math.abs(suggestion.evidence.offset! - 0.05) < 0.001, "Source geometry defines a 5 cm face offset.");
    assert.equal(suggestion.state, "active");
    assert.deepEqual([...suggestion.layers].sort(), ["first.layer", "second.layer"]);
    for (const object of suggestion.objects) assert.ok(suggestion.sources.some((entry) => entry.object === object && entry.source && entry.source.line > 0));
    assert.ok(suggestion.position.every(Number.isFinite));
    for (let axis = 0; axis < 3; axis++) assert.ok(suggestion.bounds.min[axis] <= suggestion.position[axis] && suggestion.position[axis] <= suggestion.bounds.max[axis]);
    assert.ok(Math.hypot(...suggestion.direction) > 0.9);
    assert.deepEqual(ready, level.suggestions);
  });

  it("uses wall faces rather than centerlines to measure thickness changes", async () => {
    const document = walls(0);
    document.layers[1].edges[0].thickness = 0.32;
    const suggestion = alignment(await inspect(document));
    assert.ok(Math.abs(suggestion.evidence.offset! - 0.05) < 0.001);
  });

  it("handles rotated walls and reversed source edge directions", async () => {
    const document = walls();
    for (const layer of document.layers) for (const vertex of layer.vertices) {
      const x = vertex.x, y = vertex.y;
      vertex.x = (x - y) * Math.SQRT1_2;
      vertex.y = (x + y) * Math.SQRT1_2;
    }
    const second = document.layers[1].edges[0];
    [second.from, second.to] = [second.to, second.from];
    assert.ok(Math.abs(alignment(await inspect(document)).evidence.offset! - 0.05) < 0.002);
  });

  it("measures slightly angled continuations at their adjoining ends", async () => {
    const document = walls();
    // The second wall turns atan(.01), about 0.573 degrees, over its 40 m length.
    document.layers[1].vertices[1].x = 42.1;
    document.layers[1].vertices[1].y = 0.45;
    const finding = alignment(await inspect(document));
    assert.ok(Math.abs(finding.evidence.offset! - 0.0495) < 0.001,
      "The roughly 5 cm join offset must not be measured at the far end's 45 cm displacement.");
    assert.ok(Math.abs(finding.position[0] - 2.05) < 0.01,
      "The inspection target belongs between the adjoining wall ends.");
  });

  it("applies the 2 mm exclusive and 10 cm inclusive offset limits", async () => {
    for (const [offset, expected] of [[0, false], [0.002, false], [0.003, true], [0.1, true], [0.101, false]] as const) {
      const level = await inspect(walls(offset));
      assert.equal(level.suggestions.some((s) => s.code === "WALL_ALIGNMENT"), expected, `Offset ${offset} m`);
    }
  });

  it("excludes overlapping parallel runs, distant ends, and vertically separated walls", async () => {
    const overlapping = walls();
    overlapping.layers[1].vertices[0].x = 0;
    overlapping.layers[1].vertices[1].x = 2;
    const distant = walls();
    for (const vertex of distant.layers[1].vertices) vertex.x += 1;
    const stacked = walls();
    for (const vertex of stacked.layers[1].vertices) vertex.z = 4;
    for (const document of [overlapping, distant, stacked]) assert.deepEqual((await inspect(document)).suggestions, []);
  });

  for (const fill of ["stairs", "ramp"] as const) {
    it(`reports the two open ${fill} sides, excluding landing ends`, async () => {
      const level = await inspect(flight(fill));
      const suggestions = level.suggestions.filter((s) => s.code === "FLIGHT_OPEN_SIDE");
      assert.equal(suggestions.length, 2);
      assert.ok(suggestions.every((s) => s.objects.includes("flight")));
      assert.ok(suggestions.every((s) => s.evidence.length >= 4 && s.evidence.length < 4.3));
    });

    it(`measures ${fill} gaps to actual wall faces across layer boundaries`, async () => {
      const document = flight(fill);
      document.layers.push(wall("left-wall", [-0.21, 0, 0], [-0.21, 4, 1.2]));
      document.layers.push(wall("right-wall", [2.11, 0, 0], [2.11, 4, 1.2]));
      const level = await inspect(document);
      const gaps = level.suggestions.filter((s) => s.code === "FLIGHT_WALL_GAP");
      assert.equal(gaps.length, 1);
      assert.ok(gaps[0].objects.includes("left-wall"));
      assert.ok(Math.abs(gaps[0].evidence.offset! - 0.1) < 0.001);
      assert.equal(level.suggestions.filter((s) => s.code === "FLIGHT_OPEN_SIDE").length, 0);
    });
  }

  it("accepts aligned glass and railing sides without suggesting a solid wall", async () => {
    const document = flight();
    document.layers[0].edges[1].kind = "glass";
    document.layers[0].edges[3].kind = "railing";
    assert.deepEqual((await inspect(document)).suggestions, []);
  });

  it("reports partial wall coverage and ignores walls on another storey", async () => {
    const document = flight();
    document.layers.push(wall("partial", [-0.11, 0, 0], [-0.11, 2, 0.6]));
    document.layers.push(wall("upstairs", [2.11, 0, 10], [2.11, 4, 11.2]));
    const suggestions = (await inspect(document)).suggestions;
    assert.equal(suggestions.filter((s) => s.code === "FLIGHT_OPEN_SIDE").length, 2);
    assert.ok(suggestions.every((s) => !s.objects.includes("upstairs")));
  });

  it("does not report the curved sides of a flight already enclosed by walls", async () => {
    const document = flight();
    const layer = document.layers[0];
    const points: V3[] = [[2, 0, 0], [4, 0, 0], [0, 4, 1.2], [0, 2, 1.2]];
    layer.vertices = points.map(([x, y, z], i) => ({ id: `v${i}`, x, y, z }));
    layer.edges[1].kind = "wall";
    layer.edges[1].control = [[4, 2.209], [2.209, 4]];
    layer.edges[3].kind = "wall";
    layer.edges[3].control = [[1.105, 2], [2, 1.105]];
    assert.deepEqual((await inspect(document)).suggestions, []);
  });

  it("treats a floor-level opening in a side wall as partial coverage", async () => {
    const document = flight();
    const layer = document.layers[0];
    layer.edges[1].kind = "wall";
    layer.edges[3].kind = "wall";
    layer.edges[3].openings = [{ id: "side-opening", kind: "door", start: 1, end: 3, sill: 0, head: 2.1 }];
    const findings = (await inspect(document)).suggestions;
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, "FLIGHT_OPEN_SIDE");
    assert.ok(Math.abs(findings[0].evidence.length - 2) < 0.02, "Only the 2 m opening lacks an adjoining boundary.");
    const { min, max } = findings[0].bounds;
    for (const [actual, expected] of [[min[0], 0], [max[0], 0], [min[1], 1], [max[1], 3], [min[2], 0.3], [max[2], 0.9]]) {
      assert.ok(Math.abs(actual - expected) < 0.005,
        `The target must frame the opening span, not the entire flight side: ${actual} versus ${expected}.`);
    }
    assert.ok(Math.abs(findings[0].position[1] - 2) < 0.005);
  });

  it("does not aggregate separate sub-tolerance openings into an unframeable finding", async () => {
    const document = flight();
    const layer = document.layers[0];
    layer.edges[1].kind = "wall";
    layer.edges[3].kind = "wall";
    layer.edges[3].openings = [1, 2, 3].map((start, index) => ({
      id: `tiny-opening-${index}`, kind: "door", start, end: start + 0.001, sill: 0, head: 2.1,
    }));
    const level = await inspect(document);
    assert.deepEqual(level.suggestions, [],
      "Each 1 mm opening is below the 2 mm inspection threshold, even though their lengths sum to 3 mm.");
    assert.ok(level.mesh.indices.length > 0, "The wall and flight geometry must still compile.");
  });

  it("uses the inclusive 25 cm range for nearby flight walls", async () => {
    for (const [x, code] of [[-0.36, "FLIGHT_WALL_GAP"], [-0.361, "FLIGHT_OPEN_SIDE"]] as const) {
      const document = flight();
      document.layers[0].edges[1].kind = "wall";
      document.layers.push(wall("nearby", [x, 0, 0], [x, 4, 1.2]));
      const findings = (await inspect(document)).suggestions;
      assert.equal(findings.length, 1);
      assert.equal(findings[0].code, code);
    }
  });

  it("keeps suggestions deterministic and never mutates caller-owned source", async () => {
    const document = walls();
    const before = structuredClone(document);
    const first = await inspect(document), second = await inspect(document);
    assert.deepEqual(first.suggestions, second.suggestions);
    assert.deepEqual(document, before);
  });

  it("round-trips exact suppressions without changing geometry or diagnostics", async () => {
    const document = walls();
    const initial = await inspect(document);
    suppress(document, alignment(initial));
    const source = serializeLevelSvgx(document);
    const parsed = parseLevelSvgx(source);
    assert.deepEqual(parsed.reviewSuppressions, document.reviewSuppressions);
    const suppressed = await inspect(parsed);
    const finding = alignment(suppressed);
    assert.equal(finding.state, "suppressed");
    assert.equal(finding.suppression?.reason, "Intentional architectural offset");
    assert.equal(suppressed.geometryHash, initial.geometryHash);
    assert.deepEqual(suppressed.mesh, initial.mesh);
    assert.ok(source.includes("review-suppression"));
  });

  it("reactivates the same logical finding when relevant geometry changes", async () => {
    const document = walls();
    const initial = alignment(await inspect(document));
    suppress(document, initial);
    for (const vertex of document.layers[1].vertices) vertex.y = 0.06;
    const finding = alignment(await inspect(document));
    assert.equal(finding.id, initial.id);
    assert.notEqual(finding.fingerprint, initial.fingerprint);
    assert.equal(finding.state, "active");
    assert.equal(finding.suppression?.stale, true);
  });

  it("retains suppression through comments, labels, material changes, and unrelated geometry", async () => {
    const document = walls();
    const initial = alignment(await inspect(document));
    suppress(document, initial);
    document.materials.push({ id: "paint", color: "#aabbcc", repeat: 1, roughness: 1, metalness: 0 });
    document.layers[0].edges[0].material = "paint";
    document.layers[0].edges[0].label = "Reviewed wall";
    document.layers.push(wall("unrelated", [50, 50, 0], [55, 50, 0]));
    const parsed = parseLevelSvgx(serializeLevelSvgx(document).replace("<level ", "<!-- reviewed source -->\n<level "));
    const finding = alignment(await inspect(parsed));
    assert.equal(finding.fingerprint, initial.fingerprint);
    assert.equal(finding.state, "suppressed");
  });

  it("invalidates a flight gap suppression when its nearby wall moves", async () => {
    const document = flight();
    document.layers.push(wall("nearby", [-0.21, 0, 0], [-0.21, 4, 1.2]));
    const initial = (await inspect(document)).suggestions.find((s) => s.code === "FLIGHT_WALL_GAP")!;
    assert.ok(initial);
    suppress(document, initial);
    for (const vertex of document.layers[1].vertices) vertex.x -= 0.03;
    const changed = (await inspect(document)).suggestions.find((s) => s.id === initial.id)!;
    assert.ok(changed);
    assert.equal(changed.state, "active");
    assert.notEqual(changed.fingerprint, initial.fingerprint);
  });

  it("reactivates an open-side review when a new partial barrier appears", async () => {
    const document = flight();
    const initial = (await inspect(document)).suggestions.find((s) => s.position[0] === 0)!;
    assert.ok(initial);
    suppress(document, initial);
    document.layers.push(wall("new-barrier", [-0.11, 0, 0], [-0.11, 2, 0.6]));
    const changed = (await inspect(document)).suggestions.find((s) => s.id === initial.id)!;
    assert.ok(changed, "The same flight-side finding remains addressable after its context changes.");
    assert.equal(changed.state, "active");
    assert.notEqual(changed.fingerprint, initial.fingerprint);
    assert.ok(changed.evidence.length < initial.evidence.length);
  });

  it("rejects an XML suppression without a reason", () => {
    const source = serializeLevelSvgx(walls()).replace("</level>", '<review-suppression suggestion="finding" fingerprint="fingerprint" reason=" "/></level>');
    assert.throws(() => parseLevelSvgx(source), /reason/i);
  });

  it("rejects duplicate suppressions for one logical finding", () => {
    const annotation = '<review-suppression suggestion="finding" fingerprint="first" reason="Intentional"/>';
    const other = '<review-suppression suggestion="finding" fingerprint="second" reason="Updated review"/>';
    for (const second of [annotation, other]) {
      const source = serializeLevelSvgx(walls()).replace("</level>", annotation + second + "</level>");
      assert.throws(() => parseLevelSvgx(source), /duplicate suppression/i);
    }
  });

  it("honors cancellation without leaving later compilation unusable", async () => {
    const abort = new AbortController();
    abort.abort();
    await assert.rejects(() => compile(walls(), { signal: abort.signal }), { name: "AbortError" });
    assert.equal(alignment(await inspect(walls())).state, "active");
  });
});
