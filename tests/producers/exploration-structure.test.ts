import { test } from "node:test";
import assert from "node:assert/strict";
import { ExplorationSearch, normalizeConfig, realize } from "../../src/generate/exploration/index.ts";
import { evaluateGraph } from "../../src/generate/exploration/metrics.ts";
import type { Candidate, Graph, Point } from "../../src/generate/exploration/types.ts";

/** Builds measured straight paths; expected decisions are derived from the explicit forks below. */
function layout(points: Record<string, Point>, pairs: [string, string][], bidirectional = false): Graph {
  return {
    nodes: Object.entries(points).map(([id, position]) => ({ id, position, radius: 2, role: id === "S" ? "entry" : id === "T" ? "key" : "area" })),
    edges: pairs.map(([from, to], i) => ({ id: `edge${i}`, from, to, width: 3, bend: 0, mode: "walk", bidirectional })),
  };
}

/** Evaluates only the requested structure; unrelated exploration targets are deliberately disabled. */
function inspect(graph: Graph) {
  const config = normalizeConfig({ initial: graph, nodes: [2, 40], bounds: [160, 160],
    targets: { cycles: 0, crossings: 0, lengthVariation: 0, decisionDepth: 2, territories: 0, stackedRegions: 0,
      approaches: [{ from: "S", to: "T", edge: 1, vertex: 1 }] } });
  return { config, metrics: evaluateGraph(graph, config) };
}

/** Two successive unequal forks: A→X versus A→B→X, then X→C versus X→D→C. */
function staged(): Graph {
  return layout({ S: [-30, 0, 0], A: [-20, 0, 0], X: [0, 0, 0], B: [-10, 10, 0],
    C: [20, 0, 0], D: [10, -10, 0], T: [30, 0, 0] },
  [["S", "A"], ["A", "X"], ["A", "B"], ["B", "X"], ["X", "C"], ["X", "D"], ["D", "C"], ["C", "T"]]);
}

test("developed forks have depth while a direct clique or equal-cost shortcut does not", () => {
  const graph = staged();
  assert.equal(inspect(graph).metrics.structure.journeys[0].depth, 2);
  assert.equal(inspect(graph).metrics.structure.journeys[0].distance, 60);
  const clique = layout({ S: [-30, 0, 0], A: [-10, 15, 0], B: [10, -15, 0], T: [30, 0, 0] },
    [["S", "A"], ["S", "B"], ["S", "T"], ["A", "B"], ["A", "T"], ["B", "T"]], true);
  assert.equal(inspect(clique).metrics.cycles, 3);
  assert.equal(inspect(clique).metrics.structure.journeys[0].depth, 0);
  graph.edges.push({ ...graph.edges[0], id: "shortcut", from: "S", to: "T" });
  assert.equal(inspect(graph).metrics.structure.journeys[0].depth, 0, "a tied direct route must not inherit the deeper route's score");
});

test("degree-two subdivisions near a fork preserve depth, while coincident paths and dead ends do not add it", () => {
  const graph = staged();
  graph.nodes.push({ id: "Mx", role: "area", radius: 2, position: [-19, 0, 0] },
    { id: "Mb", role: "area", radius: 2, position: [-19, 1, 0] });
  const first = graph.edges.find(e => e.from === "A" && e.to === "X")!;
  const second = graph.edges.find(e => e.from === "A" && e.to === "B")!;
  graph.edges.push({ ...first, id: "splitX", from: "Mx" }, { ...second, id: "splitB", from: "Mb" });
  first.to = "Mx"; second.to = "Mb";
  assert.equal(inspect(graph).metrics.structure.journeys[0].depth, 2, "overlapping immediate successor disks do not erase separated complete routes");
  const coincident = staged(); coincident.nodes.find(n => n.id === "B")!.position = [-10, 0, 0];
  assert.equal(inspect(coincident).metrics.structure.journeys[0].depth, 1);
  const deadEnd = staged(); deadEnd.edges = deadEnd.edges.filter(e => e.from !== "B");
  assert.equal(inspect(deadEnd).metrics.structure.journeys[0].depth, 1);
});

test("structure excludes unavailable or implausible mobility, and respects route direction", () => {
  const graph = staged(); graph.edges.find(e => e.to === "B")!.mode = "ladder";
  assert.equal(inspect(graph).metrics.structure.journeys[0].depth, 1);
  graph.edges.find(e => e.to === "B")!.mode = "walk";
  graph.nodes.find(n => n.id === "B")!.position[2] = 40;
  for (const edge of graph.edges.filter(e => e.from === "B" || e.to === "B")) edge.crossLevel = true;
  assert.equal(inspect(graph).metrics.structure.journeys[0].depth, 1);
  const forward = staged(), { config } = inspect(forward);
  config.targets.approaches = [{ from: "T", to: "S", edge: 1, vertex: 1 }];
  const reverse = evaluateGraph(forward, config).structure.journeys[0];
  assert.equal(reverse.distance, null); assert.equal(reverse.depth, 0);
});

test("reduction preserves ordinary query endpoints and the widest part of a route", () => {
  const graph = staged(), { config } = inspect(graph);
  config.targets.approaches = [{ from: "B", to: "D", edge: 1, vertex: 1 }];
  const journey = evaluateGraph(graph, config).structure.journeys[0];
  assert.equal(journey.depth, 0); assert.equal(journey.path[0], "B"); assert.equal(journey.path.at(-1), "D");
  assert.ok(Math.abs(journey.distance! - 2 * Math.sqrt(200)) < 1e-6);
  const wide = staged(); wide.nodes.find(n => n.id === "B")!.position[1] = 6;
  assert.equal(inspect(wide).metrics.structure.journeys[0].depth, 2);
  wide.edges.find(e => e.from === "B")!.width = 12;
  assert.equal(inspect(wide).metrics.structure.journeys[0].depth, 1, "the wide downstream segment prevents treating close reduced routes as separated");
  const long = staged(); long.nodes.find(n => n.id === "B")!.position[1] = 60;
  assert.equal(inspect(long).metrics.structure.journeys[0].depth, 1, "an arbitrarily long detour does not satisfy a decision demand");
});

/** Two cyclic regions with distinct arrival/departure ports, joined by a controlled connection. */
function regions(): Graph {
  const graph = layout({ S: [-40, 0, 0], Lu: [-30, 0, 0], Lv: [-10, 0, 0], Lw: [-20, 10, 0],
    Ru: [10, 0, 0], Rv: [30, 0, 0], Rw: [20, 10, 0], T: [40, 0, 0] },
  [["S", "Lu"], ["Lu", "Lv"], ["Lu", "Lw"], ["Lw", "Lv"], ["Lv", "Ru"],
    ["Ru", "Rv"], ["Ru", "Rw"], ["Rw", "Rv"], ["Rv", "T"]], true);
  for (const node of graph.nodes) if (node.id.startsWith("L") || node.id.startsWith("R")) node.region = node.id[0];
  for (const edge of graph.edges.filter(e => e.from === "Lv" && e.to === "Ru" || e.from === "Rv" && e.to === "T")) edge.crossLevel = true;
  return graph;
}

test("regional cycles need useful ports and access; stacking counts connected region pairs once", () => {
  const graph = regions();
  assert.equal(inspect(graph).metrics.structure.territories.length, 2);
  assert.equal(inspect(graph).metrics.structure.stacked.length, 0);
  for (const node of graph.nodes.filter(n => n.region === "R")) { node.position[0] -= 40; node.position[2] = 4; }
  assert.equal(inspect(graph).metrics.structure.stacked.length, 1);
  graph.edges = graph.edges.filter(e => !(e.from === "Lv" && e.to === "Ru"));
  assert.equal(inspect(graph).metrics.structure.territories.length, 0, "detached regional loops cannot satisfy a requested journey");
  const tail = regions(); tail.edges = tail.edges.filter(e => e.to !== "T");
  tail.edges.push({ ...tail.edges[0], id: "exit", from: "Ru", to: "T" });
  assert.equal(inspect(tail).metrics.structure.territories.length, 1, "arrival/departure through one member is not two regional ports");
});

test("stacking uses any mutually reachable member pair, independent of region member order", () => {
  const graph = regions();
  for (const node of graph.nodes.filter(n => n.region === "R")) { node.position[0] -= 40; node.position[2] = 4; }
  for (const edge of graph.edges) edge.bidirectional = edge.from === "Lv" && edge.to === "Ru";
  assert.equal(inspect(graph).metrics.structure.territories.length, 2);
  assert.equal(inspect(graph).metrics.structure.stacked.length, 1);
  graph.nodes.reverse(); assert.equal(inspect(graph).metrics.structure.stacked.length, 1);
  graph.nodes.find(n => n.id === "Lu")!.id = "ZLu";
  for (const edge of graph.edges) { if (edge.from === "Lu") edge.from = "ZLu"; if (edge.to === "Lu") edge.to = "ZLu"; }
  assert.equal(inspect(graph).metrics.structure.stacked.length, 1);
  graph.edges.find(e => e.from === "Lv" && e.to === "Ru")!.bidirectional = false;
  assert.equal(inspect(graph).metrics.structure.stacked.length, 0);
});

test("regional search preserves pinned nodes, locked connections, budgets and scheduling determinism", () => {
  const graph = regions(); graph.nodes.find(n => n.id === "Lu")!.pinned = true;
  graph.edges.find(e => e.from === "Lu" && e.to === "Lv")!.locked = true;
  const { config } = inspect(graph); config.seed = "regional-locks"; config.restarts = 2; config.proposals = 250; config.traceEvery = 1;
  const before = structuredClone(config), first = new ExplorationSearch(config), second = new ExplorationSearch(config);
  while (!first.done) first.step(1);
  while (!second.done) second.step(37);
  assert.equal(first.attempted, 500); assert.deepEqual(first.finish(), second.finish()); assert.deepEqual(config, before);
  for (const candidate of first.finish()) for (const frame of candidate.trace) {
    assert.deepEqual(frame.graph.nodes.find(n => n.id === "Lu"), before.initial.nodes.find(n => n.id === "Lu"));
    assert.deepEqual(frame.graph.edges.find(e => e.locked), before.initial.edges.find(e => e.locked));
  }
});

test("regional search keeps generated floors within the configured elevations", () => {
  const run = new ExplorationSearch({ seed: "complexity-01", restarts: 2, proposals: 1200, traceEvery: 1,
    targets: { decisionDepth: 2, territories: 3, stackedRegions: 1 } });
  while (!run.done) run.step(100);
  const frames = run.finish().flatMap(candidate => candidate.trace);
  assert.ok(frames.some(frame => frame.graph.nodes.some(node => node.position[2] > 0)), "the search exercises elevated floors");
  for (const frame of frames) for (const node of frame.graph.nodes) {
    assert.ok(run.config.elevations.some(z => Math.abs(node.position[2] - z) < 1e-6),
      `proposal ${frame.proposal}: ${node.id} has unconfigured floor ${node.position[2]}`);
  }
});

test("spatial interpretations preserve separate same-height regional envelopes", () => {
  const graph = regions(), { config, metrics } = inspect(graph);
  const candidate: Candidate = { id: "candidate-1-r1-p0", graph, metrics, signature: [], proposals: config.proposals,
    trace: [{ proposal: 0, graph, metrics, mutation: "initial" }] };
  const result = realize(candidate, config, "galleries");
  const halls = result.surfaces.filter(s => s.kind === "hall");
  assert.equal(halls.length, 2);
  for (const hall of halls) assert.ok(hall.points.every(p => p[0] < 0) || hall.points.every(p => p[0] > 0), "a shared floor must not erase the controlled inter-region gap");
  assert.equal(result.realizedMetrics.structure.territories.length, 0, "one shared hub per region honestly collapses its internal cycle");
});

/** Builds a disposable interpretation without searching, so contact expectations are independent of random topology. */
function spatial(graph: Graph) {
  const { config, metrics } = inspect(graph);
  return realize({ id: "candidate-1-r1-p0", graph, metrics, signature: [], proposals: config.proposals,
    trace: [{ proposal: 0, graph, metrics, mutation: "initial" }] }, config, "galleries");
}

test("unlabelled shared spaces are bounded in both member count and diameter", () => {
  for (const points of [Array.from({ length: 6 }, (_, i) => [(i % 3) * 8, Math.floor(i / 3) * 8, 0] as Point),
    Array.from({ length: 8 }, (_, i) => [i * 12 - 42, 0, 0] as Point)]) {
    const ids = points.map((_, i) => i === 0 ? "S" : i === points.length - 1 ? "T" : `A${i}`);
    const graph = layout(Object.fromEntries(ids.map((id, i) => [id, points[i]])), ids.slice(1).map((id, i) => [ids[i], id]), true);
    const result = spatial(graph), halls = result.surfaces.filter(s => s.kind === "hall");
    assert.ok(halls.length > 1);
    for (const hall of halls) {
      const members = graph.nodes.filter(n => result.mapping.nodes[n.id].includes(hall.id));
      assert.ok(members.length <= 4);
      for (const a of members) for (const b of members) assert.ok(Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1]) <= 28);
    }
  }
});

test("crossing shared hulls and unrelated interior areas report unresolved contact without inventing links", () => {
  const graph = layout({ S: [-12, 0, 0], T: [12, 0, 0], U: [0, -12, 0], V: [0, 12, 0], M: [0, 0, 0] },
    [["S", "T"], ["U", "V"]], true);
  for (const node of graph.nodes) node.region = ["S", "T"].includes(node.id) ? "horizontal" : node.id === "M" ? "isolated" : "vertical";
  const result = spatial(graph);
  assert.ok(result.issues.some(issue => issue.includes("Unresolved shared floor contact") && issue.includes("shared-floor (") && issue.includes("shared-floor-2 (")));
  assert.ok(result.issues.some(issue => issue.includes("Unresolved shared floor contact") && issue.includes("area-1-M") && issue.includes("shared-floor")));
  assert.ok(!result.realizedGraph.edges.some(e => e.from === "M" || e.to === "M"));
  const hubs = new Set(result.surfaces.filter(s => s.kind === "hall").map(s => s.owner));
  assert.ok(!result.realizedGraph.edges.some(e => hubs.has(e.from) && hubs.has(e.to)), "an unresolved contact must not invent a certified inter-hall transfer");
  assert.ok(!result.issues.some(issue => issue.includes("Unresolved shared floor contact") && issue.includes("area-1-S")));
  const vertical = regions();
  for (const height of [2, 2.1]) {
    for (const node of vertical.nodes.filter(n => n.region === "R")) { node.position[0] = graphCoordinate(node.id); node.position[2] = height; }
    const layered = spatial(vertical);
    const warning = layered.issues.some(issue => issue.includes("Unresolved shared floor contact") && issue.includes("shared-floor (") && issue.includes("shared-floor-2 (") && issue.includes("clearance"));
    assert.equal(warning, height === 2);
  }
});

/** Coordinates align the two hand-authored regions exactly in XY for a clearance boundary check. */
function graphCoordinate(id: string): number { return id === "Ru" ? -30 : id === "Rv" ? -10 : -20; }
