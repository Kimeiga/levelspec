import { Rng } from "../rng.ts";
import { assertInvariants, normalizeConfig } from "./config.ts";
import { adjacencyDistance, diversitySignature, evaluateGraph } from "./metrics.ts";
import { sameLevel, sampleElevation, transitionMode } from "./levels.ts";
import type { Candidate, ConfigInput, Connection, ExplorationConfig, Graph, GraphMetrics, Mobility, Point, TraceFrame } from "./types.ts";

interface Restart {
  rng: Rng;
  graph: Graph;
  metrics: GraphMetrics;
  trace: TraceFrame[];
  archive: TraceFrame[];
  best: TraceFrame;
  proposal: number;
}

/** Runs the same proposal sequence regardless of worker scheduling or step chunk size. */
export class ExplorationSearch {
  readonly config: ExplorationConfig;
  private runs: Restart[];
  private cursor = 0;

  /** Copies and validates the complete experiment before allocating restart state. */
  constructor(input: ConfigInput = {}) {
    this.config = normalizeConfig(input);
    this.runs = Array.from({ length: this.config.restarts }, (_, restart) => {
      const graph = structuredClone(this.config.initial), metrics = evaluateGraph(graph, this.config);
      const first = { proposal: 0, graph: structuredClone(graph), metrics, mutation: "initial" };
      return { rng: new Rng(`${this.config.seed}/topology/${restart}`), graph, metrics,
        trace: [first], archive: [first], best: first, proposal: 0 };
    });
  }

  /** Number of proposals attempted, including invalid and rejected proposals. */
  get attempted(): number { return this.runs.reduce((sum, run) => sum + run.proposal, 0); }
  /** True only when every configured restart exhausted its unchanged budget. */
  get done(): boolean { return this.cursor >= this.runs.length; }

  /** Advances a bounded chunk. The caller owns yielding/cancellation between chunks. */
  step(count = 50): void {
    if (!Number.isInteger(count) || count < 1) throw new Error("step count must be a positive integer");
    for (let i = 0; i < count && !this.done; i++) {
      const run = this.runs[this.cursor]; run.proposal++;
      const { graph, name } = mutate(run.graph, this.config, run.rng, run.proposal);
      let valid = true;
      try { assertInvariants(graph, this.config); } catch { valid = false; }
      if (valid) {
        const metrics = evaluateGraph(graph, this.config);
        const temperature = 4 * (1 - run.proposal / this.config.proposals) + .08;
        if (metrics.penalty <= run.metrics.penalty || run.rng.next() < Math.exp((run.metrics.penalty - metrics.penalty) / temperature)) {
          run.graph = graph; run.metrics = metrics;
          if (metrics.penalty < run.best.metrics.penalty) run.best = { proposal: run.proposal, graph: structuredClone(graph), metrics, mutation: name };
        }
      }
      if (run.proposal % this.config.traceEvery === 0 || run.proposal === this.config.proposals) {
        const frame = { proposal: run.proposal, graph: structuredClone(run.graph), metrics: run.metrics, mutation: name };
        run.trace.push(frame); run.archive.push(frame);
      }
      if (run.proposal === this.config.proposals) { run.archive.push(run.best); this.cursor++; }
    }
  }

  /** Retains a best attempt plus far-apart alternatives within a stated target-penalty window. */
  finish(): Candidate[] {
    if (!this.done) throw new Error("Search has not exhausted its proposal budget");
    const pool = this.runs.flatMap((run, restart) => run.archive.map(frame => ({ frame, restart,
      signature: diversitySignature(frame.graph, frame.metrics) })));
    pool.sort((a, b) => a.frame.metrics.penalty - b.frame.metrics.penalty || a.restart - b.restart || a.frame.proposal - b.frame.proposal);
    const identities = new Set<string>();
    const eligible = pool.filter(item => {
      const key = JSON.stringify(item.frame.graph);
      if (identities.has(key) || item.frame.metrics.penalty > pool[0].frame.metrics.penalty + 8) return false;
      identities.add(key); return true;
    });
    const selected = [eligible.shift()!];
    while (selected.length < this.config.restarts && eligible.length) {
      let best = 0, distance = -1;
      for (let i = 0; i < eligible.length; i++) {
        const nearest = Math.min(...selected.map(item => signatureDistance(eligible[i].signature, item.signature)
          + 2 * adjacencyDistance(eligible[i].frame.graph, item.frame.graph)));
        if (nearest > distance) { best = i; distance = nearest; }
      }
      if (distance < .000001) break;
      selected.push(eligible.splice(best, 1)[0]);
    }
    return selected.map(({ frame, restart, signature }, index) => ({
      id: `candidate-${index + 1}-r${restart + 1}-p${frame.proposal}`, graph: structuredClone(frame.graph),
      metrics: structuredClone(frame.metrics), signature, proposals: this.config.proposals,
      trace: structuredClone([...this.runs[restart].trace.filter(f => f.proposal < frame.proposal), frame]),
    }));
  }
}

/** Measures squared distance across padded, interpretable diversity features. */
function signatureDistance(a: number[], b: number[]): number {
  return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => ((a[i] ?? 0) - (b[i] ?? 0)) ** 2).reduce((sum, n) => sum + n, 0);
}

/** Makes one local proposal on an owned copy; semantic anchors and explicit locks survive every operator. */
function mutate(source: Graph, config: ExplorationConfig, rng: Rng, serial: number): { graph: Graph; name: string } {
  const graph = structuredClone(source);
  const editable = graph.nodes.filter(n => !n.pinned);
  const unlocked = graph.edges.filter(e => !e.locked);
  const protectedIds = new Set(config.targets.approaches.flatMap(t => [t.from, t.to]));
  const removable = graph.nodes.filter(n => n.role === "area" && !n.pinned && !protectedIds.has(n.id) && !graph.edges.some(e => e.locked && (e.from === n.id || e.to === n.id)));
  const name = rng.pick(["move", "height", "reshape", "bend", "connect", "cross-connect", "cross-level", "disconnect", "split", "merge", "rewire", "mobility", "stage", "stage", "region-move", "region-stack"]);
  const node = rng.pick(editable), edge = rng.pick(unlocked);
  if (name === "move" && node) {
    node.position[0] += rng.float(-8, 8); node.position[1] += rng.float(-8, 8);
  } else if (name === "height" && node) {
    moveFloorComponent(graph, node.id, config, rng);
  } else if (name === "reshape" && node) {
    node.radius = rng.float(2.5, node.region ? 5 : 10);
  } else if (name === "bend" && edge) {
    edge.bend = Math.max(-24, Math.min(24, edge.bend + rng.float(-5, 5))); edge.width = rng.float(2.5, 6);
  } else if ((name === "connect" || name === "cross-connect") && graph.edges.length < config.maxEdges) {
    const [a, b] = rng.sample(graph.nodes, 2);
    const crossLevel = name === "cross-connect", mode = crossLevel ? transitionMode(config.profile) : ordinaryMode(0, 0, config, "walk");
    if (a && b && mode && sameLevel(a.position[2], b.position[2]) !== crossLevel
      && !graph.edges.some(e => [e.from, e.to].includes(a.id) && [e.from, e.to].includes(b.id))) {
      const [from, to] = mode === "drop" && a.position[2] < b.position[2] ? [b.id, a.id] : [a.id, b.id];
      graph.edges.push({ id: `new-${serial}`, from, to, crossLevel, mode, bidirectional: mode !== "drop", width: rng.float(3, 5), bend: rng.float(-8, 8) });
    }
  } else if (name === "cross-level" && edge) {
    const mode = transitionMode(config.profile);
    if (mode) { edge.crossLevel = !edge.crossLevel; if (edge.crossLevel) edge.mode = mode; }
  } else if (name === "disconnect" && edge) {
    graph.edges = graph.edges.filter(e => e !== edge);
  } else if (name === "stage" && edge) {
    developRegion(graph, edge, config, rng, serial);
  } else if (name === "region-move" || name === "region-stack") {
    moveRegion(graph, config, rng, name === "region-stack");
  } else if (name === "split" && edge && graph.nodes.length < config.nodes[1] && graph.edges.length < config.maxEdges) {
    const a = graph.nodes.find(n => n.id === edge.from)!, b = graph.nodes.find(n => n.id === edge.to)!;
    const id = `node-${serial}`;
    graph.nodes.push({ id, role: "area", position: [(a.position[0] + b.position[0]) / 2 + rng.float(-10, 10),
      (a.position[1] + b.position[1]) / 2 + rng.float(-10, 10), edge.crossLevel ? sampleElevation(a.position[2], config, rng) : a.position[2]], radius: rng.float(4, 8),
      ...(a.region && a.region === b.region ? { region: a.region } : {}) });
    graph.edges.push({ ...edge, id: `split-${serial}`, from: id }); edge.to = id;
  } else if (name === "merge" && removable.length && graph.nodes.length > config.nodes[0]) {
    const remove = rng.pick(removable), incident = graph.edges.filter(e => e.from === remove.id || e.to === remove.id);
    const neighbor = incident[0] && (incident[0].from === remove.id ? incident[0].to : incident[0].from);
    graph.nodes = graph.nodes.filter(n => n.id !== remove.id);
    graph.edges = graph.edges.filter(e => !incident.includes(e));
    if (neighbor) for (const connection of incident.slice(1)) {
      const other = connection.from === remove.id ? connection.to : connection.from;
      if (other !== neighbor && !graph.edges.some(e => [e.from, e.to].includes(neighbor) && [e.from, e.to].includes(other))) graph.edges.push({ ...connection,
        from: connection.from === remove.id ? neighbor : connection.from, to: connection.to === remove.id ? neighbor : connection.to });
    }
  } else if (name === "rewire" && edge) {
    edge.to = rng.pick(graph.nodes).id;
  } else if (name === "mobility" && edge) {
    edge.mode = rng.pick(config.profile.modes); edge.bidirectional = edge.mode !== "drop" && rng.bool(.9);
  }
  return { graph, name };
}

/** Moves the weak component of ordinary links together, so its floor identity and pinned members survive. */
function moveFloorComponent(graph: Graph, start: string, config: ExplorationConfig, rng: Rng): void {
  const ids = new Set([start]), queue = [start];
  for (let i = 0; i < queue.length; i++) for (const edge of graph.edges) {
    if (edge.crossLevel || edge.from !== queue[i] && edge.to !== queue[i]) continue;
    const next = edge.from === queue[i] ? edge.to : edge.from;
    if (!ids.has(next)) { ids.add(next); queue.push(next); }
  }
  const nodes = graph.nodes.filter(n => ids.has(n.id));
  if (nodes.some(n => n.pinned)) return;
  const height = sampleElevation(nodes[0].position[2], config, rng);
  if (height === nodes[0].position[2]) return;
  for (const node of nodes) node.position[2] = height;
}

/** Expands one connection into a local fork/rejoin territory with distinct arrival and departure ports. */
function developRegion(graph: Graph, edge: Connection, config: ExplorationConfig, rng: Rng, serial: number): void {
  const diamond = rng.bool(), count = diamond ? 4 : 3;
  if (graph.nodes.length + count > config.nodes[1] || graph.edges.length + count + 1 > config.maxEdges) return;
  const a = graph.nodes.find(n => n.id === edge.from)!, b = graph.nodes.find(n => n.id === edge.to)!;
  const distance = Math.hypot(b.position[0] - a.position[0], b.position[1] - a.position[1]);
  if (distance < 16) return;
  const dx = (b.position[0] - a.position[0]) / distance, dy = (b.position[1] - a.position[1]) / distance;
  const half = Math.min(12, distance * .26), side = rng.float(5, 9), center = rng.float(.4, .6);
  const middle: Point = [a.position[0] + dx * distance * center, a.position[1] + dy * distance * center, rng.pick([a.position[2], b.position[2]])];
  const region = `region-${serial}`;
  const offsets = diamond ? [[-half, 0], [half, 0], [0, side], [0, -side]] : [[-half, 0], [half, 0], [0, side]];
  const nodes = offsets.map(([x, y], i) => ({ id: `stage-${serial}-${i}`, region, role: "area" as const, radius: rng.float(2.5, 3.5),
    position: [middle[0] + dx * x - dy * y, middle[1] + dy * x + dx * y, middle[2]] as Point }));
  graph.nodes.push(...nodes);
  const pairs = diamond ? [[0, 2], [2, 1], [0, 3], [3, 1]] : [[0, 1], [0, 2], [2, 1]];
  const originalEnd = edge.to;
  edge.to = nodes[0].id; edge.mode = ordinaryMode(a.position[2], middle[2], config, edge.mode); edge.bend = 0;
  for (const [index, [from, to]] of pairs.entries()) graph.edges.push({ ...edge, id: `local-${serial}-${index}`, from: nodes[from].id, to: nodes[to].id,
    mode: ordinaryMode(middle[2], middle[2], config, edge.mode), crossLevel: false, width: 3, bend: 0 });
  graph.edges.push({ ...edge, id: `depart-${serial}`, from: nodes[1].id, to: originalEnd,
    mode: ordinaryMode(middle[2], b.position[2], config, edge.mode) });
}

/** Moves a whole editable territory; stacking uses single-floor groups and a configured destination elevation. */
function moveRegion(graph: Graph, config: ExplorationConfig, rng: Rng, stack: boolean): void {
  if (stack && !rng.bool(config.verticality)) return;
  const ids = [...new Set(graph.nodes.flatMap(n => n.region ? [n.region] : []))].filter(id => {
    const members = graph.nodes.filter(n => n.region === id);
    return !stack || members.length >= 3 && members.every(n => sameLevel(n.position[2], members[0].position[2]));
  });
  const editable = ids.filter(id => {
    const members = graph.nodes.filter(n => n.region === id);
    return members.length >= 3 && members.every(n => !n.pinned && !graph.edges.some(e => e.locked && (e.from === n.id || e.to === n.id)));
  });
  const id = rng.pick(editable);
  if (!id) return;
  const nodes = graph.nodes.filter(n => n.region === id), center = regionCenter(nodes.map(n => n.position));
  let delta: Point = [rng.float(-10, 10), rng.float(-10, 10), 0];
  let destinationHeight: number | undefined;
  if (stack) {
    const otherId = rng.pick(ids.filter(other => other !== id));
    if (!otherId) return;
    const other = regionCenter(graph.nodes.filter(n => n.region === otherId).map(n => n.position));
    const heights = config.elevations.filter(z => Math.abs(z - other[2]) >= config.profile.height + .3);
    if (!heights.length) return;
    delta = [other[0] - center[0] + rng.float(-4, 4), other[1] - center[1] + rng.float(-4, 4), 0];
    destinationHeight = rng.pick(heights);
  }
  for (const node of nodes) {
    node.position = node.position.map((n, i) => n + delta[i]) as Point;
    if (destinationHeight !== undefined) node.position[2] = destinationHeight;
  }
  for (const edge of graph.edges.filter(e => !e.locked && (nodes.some(n => n.id === e.from) || nodes.some(n => n.id === e.to)))) {
    const a = graph.nodes.find(n => n.id === edge.from)!, b = graph.nodes.find(n => n.id === edge.to)!;
    edge.mode = ordinaryMode(a.position[2], b.position[2], config, edge.mode);
  }
}

/** Returns the center of a nonempty proposed territory without changing its members. */
function regionCenter(points: Point[]): Point {
  return [0, 1, 2].map(axis => points.reduce((sum, p) => sum + p[axis], 0) / points.length) as Point;
}

/** Chooses an available ordinary transition without inventing a capability absent from the profile. */
function ordinaryMode(from: number, to: number, config: ExplorationConfig, fallback: Mobility): Mobility {
  const preferred: Mobility[] = from === to ? ["walk", "ramp", "stairs"] : ["stairs", "ramp"];
  return preferred.find(mode => config.profile.modes.includes(mode)) ?? fallback;
}

/** Convenience entrypoint for synchronous scripting; browser workers use bounded steps instead. */
export function search(input: ConfigInput = {}): { config: ExplorationConfig; candidates: Candidate[] } {
  const run = new ExplorationSearch(input);
  while (!run.done) run.step(100);
  return { config: run.config, candidates: run.finish() };
}
