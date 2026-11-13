import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile, parseAml, validateForRuntime, ArchitectureBuilder } from "../../src/architecture/index.ts";
import { ExplorationSearch, explore, normalizeConfig, parsePacket, realize } from "../../src/generate/exploration/index.ts";
import { adjacencyDistance, crossings, disjointPaths, evaluateGraph } from "../../src/generate/exploration/metrics.ts";
import { writeExperiment } from "../../tools/fps/explore.ts";
import type { Candidate, Connection, Graph, Point } from "../../src/generate/exploration/types.ts";

/** Makes a deliberately small directed graph without deriving expectations from the implementation. */
function graph(ids: string[], pairs: [string, string][]): Graph {
  return { nodes: ids.map((id, i) => ({ id, role: i === 0 ? "entry" : id === "T" ? "key" : "area", radius: 3,
    position: [(i % 3) * 12 - 12, Math.floor(i / 3) * 12 - 12, 0] })),
  edges: pairs.map(([from, to], i) => ({ id: `e${i}`, from, to, mode: "walk", bidirectional: false, width: 3, bend: 0 })) };
}

/** Creates a hand-authored candidate without invoking the stochastic search under test. */
function candidate(input: Graph): { config: ReturnType<typeof normalizeConfig>; candidate: Candidate } {
  const config = normalizeConfig({ initial: input, nodes: [2, 20], targets: { cycles: 0, crossings: 0, lengthVariation: 0,
    approaches: [{ from: input.nodes[0].id, to: input.nodes[1].id, edge: 1, vertex: 1 }] } });
  const metrics = evaluateGraph(input, config);
  return { config, candidate: { id: "candidate-1-r1-p0", graph: input, metrics, proposals: config.proposals, signature: [],
    trace: [{ proposal: 0, graph: input, metrics, mutation: "initial" }] } };
}

test("directed diamond, shared throat, subdivision and capability filtering have distinct semantics", () => {
  const profile = normalizeConfig().profile;
  const diamond = graph(["S", "T", "A", "B"], [["S", "A"], ["A", "T"], ["S", "B"], ["B", "T"]]);
  assert.equal(disjointPaths(diamond, "S", "T", profile), 2);
  assert.equal(disjointPaths(diamond, "S", "T", profile, true), 2);
  assert.equal(disjointPaths(diamond, "T", "S", profile), 0);
  assert.equal(evaluateGraph(diamond, candidate(diamond).config).cycles, 1);
  const throat = graph(["S", "T", "A", "B", "X", "C", "D"], [["S", "A"], ["A", "X"], ["S", "B"], ["B", "X"], ["X", "C"], ["C", "T"], ["X", "D"], ["D", "T"]]);
  assert.equal(disjointPaths(throat, "S", "T", profile), 2);
  assert.equal(disjointPaths(throat, "S", "T", profile, true), 1);
  const subdivided = structuredClone(diamond);
  subdivided.nodes.push({ id: "M", role: "area", position: [0, 0, 0], radius: 2 });
  subdivided.edges[0].to = "M"; subdivided.edges.push({ ...diamond.edges[0], id: "split", from: "M" });
  assert.equal(disjointPaths(subdivided, "S", "T", profile, true), 2);
  assert.equal(evaluateGraph(subdivided, candidate(subdivided).config).cycles, 1);
  diamond.edges[0].mode = "jump";
  assert.equal(disjointPaths(diamond, "S", "T", profile), 1);
  assert.equal(disjointPaths(diamond, "S", "T", { ...profile, modes: [...profile.modes, "jump"] }), 2);
});

test("crossing identity survives resampling, excludes incident edges, and requires body/deck clearance", () => {
  const a = { id: "a", from: "A", to: "B", points: [[-10, 0, 0], [10, 0, 0]] as Point[] };
  const b = { id: "b", from: "C", to: "D", points: [[0, -10, 4], [0, 10, 4]] as Point[] };
  assert.deepEqual(crossings([a, b], 1.8).map(c => c.kind), ["overpass"]);
  assert.deepEqual(crossings([{ ...a, points: [[-10, 0, 0], [0, 0, 0], [10, 0, 0]] }, b], 1.8), crossings([a, b], 1.8));
  assert.equal(crossings([a, { ...b, from: "A" }], 1.8).length, 0);
  assert.equal(crossings([a, { ...b, points: [[0, -10, 2], [0, 10, 2]] }], 1.8)[0].kind, "collision");
  assert.equal(crossings([{ ...a, width: 4 }, { ...b, width: 4, points: [[0, -10, 0], [0, 10, 4.4]] }], 1.8)[0].kind, "collision");
});

test("search keeps pins, locks and impossible demands, counts rejected proposals, and ignores scheduling", () => {
  const config = normalizeConfig({ seed: "locked", restarts: 2, proposals: 80, traceEvery: 1,
    targets: { approaches: [{ from: "entry", to: "key", edge: 100, vertex: 100 }] } });
  config.initial.nodes[0].pinned = true; config.initial.edges[0].locked = true;
  const frozen = JSON.stringify(config);
  const a = new ExplorationSearch(config), b = new ExplorationSearch(config);
  while (!a.done) a.step(1);
  let i = 0; while (!b.done) b.step([3, 19, 7][i++ % 3]);
  assert.equal(a.attempted, 160); assert.deepEqual(a.finish(), b.finish()); assert.equal(JSON.stringify(config), frozen);
  for (const c of a.finish()) {
    assert.equal(c.metrics.approaches[0].edge, 100); assert.ok(c.metrics.deficits.length);
    for (const f of c.trace) {
      assert.deepEqual(f.graph.nodes.find(n => n.id === "entry"), config.initial.nodes[0]);
      assert.deepEqual(f.graph.edges.find(e => e.id === "e0"), config.initial.edges[0]);
    }
  }
});

test("spatial alternatives are distinct, replayable and independent of interpretation order", () => {
  const packet = explore({ seed: "alternatives", restarts: 2, proposals: 100 });
  assert.equal(new Set(packet.realizations.map(r => r.aml)).size, 6);
  for (const c of packet.candidates) assert.equal(new Set(packet.realizations.filter(r => r.candidate === c.id).map(r =>
    JSON.stringify(r.surfaces.map(s => [s.kind, s.points])))).size, 3);
  assert.equal(new Set(packet.candidates.map(c => JSON.stringify(c.signature))).size, 2);
  assert.deepEqual(parsePacket(JSON.stringify(packet)), packet);
  const c = packet.candidates[0];
  const gallery = realize(c, packet.config, "galleries");
  realize(c, packet.config, "courts");
  assert.deepEqual(realize(c, packet.config, "galleries"), gallery);
  assert.throws(() => parsePacket(JSON.stringify({ ...packet, version: "future" })), /version/);
  const invalid = structuredClone(packet); invalid.candidates[0].graph.nodes[0].position[0] = Infinity;
  assert.throws(() => parsePacket(JSON.stringify(invalid)), /position/);
});

test("connected ribbon crossings count once, separated overlap regions remain distinct", () => {
  const a = { id: "a", from: "A", to: "B", width: 4, points: [[-30, 0, 0], [30, 0, 0]] as Point[] };
  const b = { id: "b", from: "C", to: "D", width: 4, points: [[-5, -1, 4], [0, 1, 4], [5, -1, 4]] as Point[] };
  assert.equal(crossings([a, b], 1.8).length, 1);
  const separated = { ...b, points: [[-25, -12, 4], [-15, 12, 4], [15, 12, 4], [25, -12, 4]] as Point[] };
  assert.equal(crossings([a, separated], 1.8).length, 2);
  const steep = { ...b, points: [[-10, -1, 1], [10, 1, 5]] as Point[] };
  assert.equal(crossings([a, steep], 1.8)[0].kind, "collision");
});

test("strategic length variation survives subdivision and adjacency distinguishes equal-degree graphs", () => {
  const g = graph(["S", "T", "A"], [["S", "A"], ["A", "T"]]);
  g.nodes[0].position = [-20, 0, 0]; g.nodes[2].position = [-10, 0, 0]; g.nodes[1].position = [20, 0, 0];
  g.nodes[2].role = "key";
  const { config } = candidate(g);
  assert.equal(evaluateGraph(g, config).lengthVariation, .5);
  const split = structuredClone(g); split.nodes.push({ id: "M", role: "area", radius: 2, position: [5, 0, 0] });
  split.edges[1].to = "M"; split.edges.push({ ...g.edges[1], id: "split", from: "M" });
  assert.equal(evaluateGraph(split, config).lengthVariation, .5);
  const ids = ["S", "T", "A", "B", "C", "D"];
  const prism = graph(ids, [["S", "T"], ["T", "A"], ["A", "S"], ["B", "C"], ["C", "D"], ["D", "B"], ["S", "B"], ["T", "C"], ["A", "D"]]);
  const bipartite = graph(ids, [["S", "B"], ["S", "C"], ["S", "D"], ["T", "B"], ["T", "C"], ["T", "D"], ["A", "B"], ["A", "C"], ["A", "D"]]);
  assert.equal(adjacencyDistance(prism, bipartite), .8);
  assert.equal(adjacencyDistance(prism, { ...prism, edges: [...prism.edges].reverse().map((e, i) => ({ ...e, id: `renamed-${i}` })) }), 0);
});

test("failed fits dominate pending evidence and native stairs/roofs respect the profile", async () => {
  const g = graph(["S", "T"], [["S", "T"]]); g.nodes[0].position = [-10, 0, 0]; g.nodes[1].position = [10, 0, 4]; g.edges[0].mode = "stairs";
  g.edges[0].crossLevel = true;
  const { config, candidate: c } = candidate(g); config.profile.maxSlope = 10;
  const failed = realize(c, config, "terraces");
  assert.equal(failed.mobility[0].geometricFit, "failed"); assert.equal(failed.realizedGraph.edges.length, 0);
  config.profile.maxSlope = 42; config.profile.step = .05;
  const steps = parseAml(realize(c, config, "terraces").aml);
  const assembly = steps.elements[0] as import("../../src/architecture/types.ts").Collection;
  const stairs = assembly.children.find(e => e.kind === "stairs") as import("../../src/architecture/types.ts").Flight;
  assert.equal(stairs.maximumRiser, .05);
  g.edges[0].mode = "ladder"; g.edges[0].width = 1; config.profile.radius = .6;
  assert.equal(realize(c, config, "terraces").mobility[0].geometricFit, "failed");
  g.nodes[1].position[2] = 0; g.edges[0].mode = "walk"; g.edges[0].width = 3;
  const hall = await compile(parseAml(realize(c, config, "galleries").aml));
  assert.ok(!hall.floors.some(f => f.region === "shared-roof"));
  assert.ok(hall.surfaces.some(s => s.role === "roof"));
});

test("three routes sharing one crossing do not invent a triangular cycle", () => {
  const g = graph(["S", "T", "A", "B", "C", "D"], [["S", "T"], ["A", "B"], ["C", "D"]]);
  const positions: Point[] = [[-20, 0, 0], [20, 0, 0], [0, -20, 0], [0, 20, 0], [-20, -20, 0], [20, 20, 0]];
  g.nodes.forEach((n, i) => n.position = positions[i]);
  const { config, candidate: c } = candidate(g), r = realize(c, config, "terraces");
  assert.equal(r.realizedGraph.nodes.filter(n => n.id.startsWith("explore-junction-")).length, 1);
  assert.equal(r.realizedMetrics.cycles, 0);
});

test("fully locked experiments return fewer honest alternatives and reject corrupted retained history", () => {
  const config = normalizeConfig({ proposals: 1, restarts: 4, nodes: [4, 4], maxEdges: 4 });
  config.initial.nodes.forEach(n => n.pinned = true); config.initial.edges.forEach(e => e.locked = true);
  const packet = explore(config); assert.equal(packet.candidates.length, 1);
  const moved = structuredClone(packet); moved.candidates[0].graph.nodes[0].position[0]++;
  assert.throws(() => parsePacket(JSON.stringify(moved)), /Pinned/);
  const edge = structuredClone(packet); edge.candidates[0].graph.edges[0].width++;
  assert.throws(() => parsePacket(JSON.stringify(edge)), /Locked/);
  const trace = structuredClone(packet); trace.candidates[0].trace.push(trace.candidates[0].trace[0]);
  assert.throws(() => parsePacket(JSON.stringify(trace)), /increase/);
  const tampered = structuredClone(packet); tampered.candidates[0].metrics.cycles = 999; tampered.realizations[0].aml = "fiction";
  assert.deepEqual(parsePacket(JSON.stringify(tampered)), packet);
});

test("native ordinary geometry connects both areas, while a physical blocker breaks it", async () => {
  const g = graph(["S", "T"], [["S", "T"]]);
  g.nodes[0].position = [-10, 0, 0]; g.nodes[1].position = [10, 0, 0];
  const { config, candidate: c } = candidate(g), result = realize(c, config, "terraces");
  assert.equal(result.realizedGraph.edges[0].bidirectional, true, "ordinary geometry cannot enforce a one-way rule");
  const document = parseAml(result.aml), compiled = await compile(document);
  assert.deepEqual(compiled.diagnostics.filter(d => d.severity === "error"), []);
  const report = await validateForRuntime(compiled);
  assert.equal(report.navigation?.components, 1);
  assert.deepEqual(new Set(compiled.floors.map(f => f.area)), new Set(["S", "T", "e0"]));
  const builder = new ArchitectureBuilder("blocker");
  (document.elements[0] as import("../../src/architecture/types.ts").Collection).children.push(builder.box("blocker", { width: 2, depth: 10, height: 4, position: [-1, -5, -.3] }));
  const blocked = await validateForRuntime(await compile(document));
  assert.equal(blocked.navigation?.components, 2, "a blocked physical portal must not inherit abstract reachability");
});

test("shared hall collapses independent route labels and unsupported mobility stays unverified", async () => {
  const g = graph(["S", "T", "A", "B"], [["S", "A"], ["A", "T"], ["S", "B"], ["B", "T"]]);
  const { config, candidate: c } = candidate(g);
  const hall = realize(c, config, "galleries");
  assert.ok(hall.transfers.some(t => t.includes("share one")));
  assert.equal(disjointPaths(hall.realizedGraph, "S", "T", config.profile, true), 1);
  const overlapping = graph(["S", "T"], [["S", "T"]]); overlapping.nodes[0].position = [-1, 0, 0]; overlapping.nodes[1].position = [1, 0, 0];
  const overlapCase = candidate(overlapping), overlapHall = realize(overlapCase.candidate, overlapCase.config, "galleries");
  assert.equal(disjointPaths(overlapHall.realizedGraph, "S", "T", config.profile, true), 1, "overlap must not reintroduce a redundant route inside a shared hall");
  const special = structuredClone(c); special.graph.edges[0].mode = "ladder";
  const result = realize(special, { ...config, profile: { ...config.profile, modes: [...config.profile.modes, "ladder"] } }, "terraces");
  const evidence = result.mobility.find(m => m.mode === "ladder")!;
  assert.equal(evidence.assumedCapability, true); assert.equal(evidence.engineVerification, "unverified");
  assert.equal(result.publication, "premap"); assert.deepEqual(result.mapping.edges.e0, []);
  const compiled = await compile(parseAml(result.aml));
  assert.ok(compiled.mesh.positions.length); assert.equal(compiled.architecture.validation, "premap");
});

test("multiple at-grade crossings split each route in geometric order", () => {
  const g = graph(["S", "T", "A", "B", "C", "D"], [["S", "T"], ["A", "B"], ["C", "D"]]);
  const positions: Point[] = [[-20, 0, 0], [20, 0, 0], [-8, -15, 0], [-8, 15, 0], [8, -15, 0], [8, 15, 0]];
  g.nodes.forEach((n, i) => n.position = positions[i]);
  const { config, candidate: c } = candidate(g), r = realize(c, config, "terraces");
  const pieces = r.realizedGraph.edges.filter(e => e.id === "e0" || e.id.startsWith("explore-part-") && e.id.endsWith("-e0"));
  assert.equal(pieces.length, 3);
  assert.deepEqual(pieces.map(e => r.realizedGraph.nodes.find(n => n.id === e.from)!.position[0]), [-20, -8, 8]);
});

test("exclusive output directories preserve independently edited AML", async () => {
  const directory = await mkdtemp(join(tmpdir(), "levelspec-explore-"));
  try {
    const packet = explore({ proposals: 10, restarts: 1 });
    const output = join(directory, "run"); await writeExperiment(packet, output);
    const source = join(output, `${packet.realizations[0].id}.aml`);
    await writeFile(source, "AI-authored revision");
    await assert.rejects(() => writeExperiment(packet, output), { code: "EEXIST" });
    assert.equal(await readFile(source, "utf8"), "AI-authored revision");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
