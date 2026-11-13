import { test } from "node:test";
import assert from "node:assert/strict";
import { ExplorationSearch, explore, normalizeConfig, parsePacket, realize } from "../../src/generate/exploration/index.ts";
import { evaluateGraph } from "../../src/generate/exploration/metrics.ts";
import type { Candidate, Graph } from "../../src/generate/exploration/types.ts";

/** Two ordinary pairs with one declared transition; heights and expected grouping are authored. */
function floors(): Graph {
  return {
    nodes: [
      { id: "S", role: "entry", position: [-30, 0, 0], radius: 3 },
      { id: "A", role: "area", position: [-15, 0, 0], radius: 3 },
      { id: "B", role: "area", position: [15, 0, 4], radius: 3 },
      { id: "T", role: "key", position: [30, 0, 4], radius: 3 },
    ],
    edges: [
      { id: "left", from: "S", to: "A", mode: "walk", bidirectional: true, width: 3, bend: 0 },
      { id: "transition", from: "A", to: "B", mode: "stairs", crossLevel: true, bidirectional: true, width: 3, bend: 0 },
      { id: "right", from: "B", to: "T", mode: "walk", bidirectional: true, width: 3, bend: 0 },
    ],
  };
}

/** Disables unrelated design demands for small authored floor-contract fixtures. */
function configFor(initial: Graph) {
  return normalizeConfig({ initial, nodes: [4, 12], restarts: 2, proposals: 240, traceEvery: 1,
    targets: { cycles: 0, crossings: 0, lengthVariation: 0, decisionDepth: 0, territories: 0, stackedRegions: 0,
      approaches: [{ from: "S", to: "T", edge: 1, vertex: 1 }] } });
}

/** Checks the public edge rule independently, including provisional realized transfers. */
function assertFloors(graph: Graph): void {
  for (const edge of graph.edges) {
    const from = graph.nodes.find(n => n.id === edge.from)!, to = graph.nodes.find(n => n.id === edge.to)!;
    assert.ok(Math.abs(from.position[2] - to.position[2]) <= 1e-6 || edge.crossLevel === true,
      `${edge.id} connects ${from.position[2]}m to ${to.position[2]}m without permission`);
  }
}

test("height changes require an explicit boolean cross-level declaration, independently of mobility", () => {
  const graph = floors();
  assert.doesNotThrow(() => configFor(graph));
  delete graph.edges[1].crossLevel;
  assert.throws(() => configFor(graph), /cross.level/i, "stairs alone is not permission to connect floors");
  graph.edges[1].crossLevel = false;
  assert.throws(() => configFor(graph), /cross.level/i);
  graph.edges[1].crossLevel = true;
  graph.nodes[2].position[2] = graph.nodes[3].position[2] = 0;
  assert.doesNotThrow(() => configFor(graph), "a declared transition may currently be flat");
  graph.edges[1].crossLevel = "true" as unknown as boolean;
  assert.throws(() => configFor(graph), /cross.level/i);
  delete graph.edges[1].crossLevel;
  graph.nodes[2].position[2] = graph.nodes[3].position[2] = 1e-6;
  assert.doesNotThrow(() => configFor(graph));
  graph.nodes[2].position[2] = graph.nodes[3].position[2] = 2e-6;
  assert.throws(() => configFor(graph), /cross.level/i);
});

test("verticality assigns reproducible starter floors and honors the first configured base elevation", () => {
  for (const value of [-.01, 1.01, NaN, Infinity, null, "0.5"]) {
    assert.throws(() => normalizeConfig({ verticality: value as number }), /verticality/i);
  }
  const flat = normalizeConfig({ verticality: 0, elevations: [7, -4, 12] });
  assert.ok(flat.initial.nodes.every(n => n.position[2] === 7));
  const input = { seed: "floor-assignment", verticality: 1, elevations: [0, 4, 8] };
  const layered = normalizeConfig(input);
  assert.deepEqual(normalizeConfig(input), layered);
  assert.ok(new Set(layered.initial.nodes.map(n => n.position[2])).size > 1);
  assert.ok(layered.initial.nodes.every(n => input.elevations.includes(n.position[2])));
  assertFloors(layered.initial);
  const walking = normalizeConfig({ ...input, profile: { modes: ["walk"] } });
  assert.ok(walking.initial.edges.every(e => e.mode === "walk" && !e.crossLevel));
  assertFloors(walking.initial);
});

test("zero verticality preserves authored floors, while all retained search frames obey level permissions", () => {
  for (const verticality of [0, 1]) {
    const input = { ...configFor(floors()), seed: "floor-search", verticality, elevations: [0, 4, 8] };
    if (verticality === 0) for (const node of input.initial.nodes.filter(n => n.id === "B" || n.id === "T")) node.position[2] = 2.5;
    input.initial.nodes[0].pinned = true; input.initial.edges[0].locked = true;
    const original = structuredClone(input), first = new ExplorationSearch(input), second = new ExplorationSearch(input);
    while (!first.done) first.step(1);
    while (!second.done) second.step(37);
    const candidates = first.finish();
    assert.deepEqual(candidates, second.finish()); assert.deepEqual(input, original);
    if (verticality === 1) assert.ok(candidates.some(candidate => candidate.trace.some(frame => frame.graph.nodes.some(node =>
      node.position[2] === 8 || original.initial.nodes.some(authored => authored.id === node.id && authored.position[2] !== node.position[2])))),
    "supplied input must still explore heights after startup");
    for (const candidate of candidates) for (const frame of candidate.trace) {
      assertFloors(frame.graph);
      assert.deepEqual(frame.graph.nodes.find(n => n.id === "S"), original.initial.nodes[0]);
      assert.deepEqual(frame.graph.edges.find(e => e.id === "left"), original.initial.edges[0]);
      if (verticality === 0) for (const node of frame.graph.nodes) {
        const authored = original.initial.nodes.find(n => n.id === node.id);
        if (authored) assert.equal(node.position[2], authored.position[2]);
        assert.ok([0, 2.5].includes(node.position[2]), "new areas inherit an existing floor when height exploration is disabled");
      }
    }
    for (const candidate of candidates) for (const interpretation of ["terraces", "courts", "galleries"] as const) {
      assertFloors(realize(candidate, first.config, interpretation).realizedGraph);
    }
  }
});

test("replay preserves cross-level declarations and rejects an unlabeled initial or retained transition", () => {
  const input = configFor(floors()); input.proposals = 1; input.restarts = 1;
  input.initial.nodes.forEach(n => n.pinned = true); input.initial.edges.forEach(e => e.locked = true);
  const packet = explore(input);
  assert.deepEqual(parsePacket(JSON.stringify(packet)), packet);
  const initial = structuredClone(packet); delete initial.config.initial.edges[1].crossLevel;
  assert.throws(() => parsePacket(JSON.stringify(initial)), /cross.level/i);
  const retained = structuredClone(packet); delete retained.candidates[0].trace[0].graph.edges[1].crossLevel;
  assert.throws(() => parsePacket(JSON.stringify(retained)), /cross.level/i);
  assert.throws(() => parsePacket(JSON.stringify({ ...packet, version: "exploration-1" })), /version/i);
});

test("near-grade area and route contacts cannot invent an undeclared floor transition", () => {
  const graph = floors(); graph.edges = [graph.edges[0], graph.edges[2]];
  graph.nodes[0].position = [-10, 0, 0]; graph.nodes[1].position = [10, 0, 0];
  graph.nodes[2].position = [0, -10, .02]; graph.nodes[3].position = [0, 10, .02];
  const inspect = (graph: Graph) => {
    const config = configFor(graph), metrics = evaluateGraph(graph, config);
    const candidate: Candidate = { id: "candidate-1-r1-p0", graph, metrics, signature: [], proposals: config.proposals,
      trace: [{ proposal: 0, graph, metrics, mutation: "initial" }] };
    return realize(candidate, config, "terraces");
  };
  const crossing = inspect(graph);
  assertFloors(crossing.realizedGraph);
  assert.equal(crossing.realizedGraph.nodes.length, 4);
  assert.ok(crossing.issues.some(issue => /cross.level|floor|elevation/i.test(issue)));
  graph.edges = []; graph.nodes[2].position = [-10, 0, .02];
  const overlap = inspect(graph);
  assertFloors(overlap.realizedGraph); assert.equal(overlap.realizedGraph.edges.length, 0);
  assert.ok(overlap.issues.some(issue => /cross.level|floor|elevation/i.test(issue)));
});
