import type { Connection, ExplorationConfig, Graph, Point, StructureMetrics } from "./types.ts";

const EPSILON = 1e-6;
const DETOUR_LIMIT = 1.75;

/** Caller supplies capability-filtered, physically plausible ordinary centerlines in Z-up meters. */
export interface OrdinaryRoute { edge: Connection; points: Point[]; length: number }
interface Arc { from: string; to: string; length: number; width: number; points: Point[]; path: string[] }

/** Keeps local cycles and developed journeys distinct from a dense web or arbitrary height jitter. */
export function analyzeStructure(graph: Graph, config: ExplorationConfig, routes: OrdinaryRoute[]): StructureMetrics {
  const directed = routes.flatMap(({ edge, points, length }) => {
    if (length < EPSILON) return [];
    const arc: Arc = { from: edge.from, to: edge.to, length, points, width: edge.width, path: [edge.from, edge.to] };
    return edge.bidirectional ? [arc, { ...arc, from: edge.to, to: edge.from, points: [...points].reverse(), path: [edge.to, edge.from] }] : [arc];
  });
  const reduced = reduceTransit(graph, directed, config);
  const envelopes = config.targets.approaches.map(target => ({ ...target,
    forward: distances(directed, target.from), backward: distances(directed, target.to, true) }));
  const journeys = config.targets.approaches.map(target => journey(reduced, target.from, target.to));
  const groups = new Map<string, typeof graph.nodes>();
  for (const node of graph.nodes) if (node.region) groups.set(node.region, [...(groups.get(node.region) ?? []), node]);
  const territories: StructureMetrics["territories"] = [];
  for (const [id, nodes] of groups) {
    if (nodes.length < 3 || nodes.some(n => Math.abs(n.position[2] - nodes[0].position[2]) > EPSILON)) continue;
    const useful = envelopes.filter(e => {
      const shortest = e.forward.get(e.to) ?? Infinity;
      return Number.isFinite(shortest) && nodes.every(n => (e.forward.get(n.id) ?? Infinity) + (e.backward.get(n.id) ?? Infinity) <= shortest * DETOUR_LIMIT + EPSILON);
    });
    if (!useful.length) continue;
    const members = new Set(nodes.map(n => n.id));
    const internal = routes.filter(r => members.has(r.edge.from) && members.has(r.edge.to));
    if (internal.length < nodes.length) continue;
    const reached = new Set([nodes[0].id]);
    for (let previous = -1; previous !== reached.size;) {
      previous = reached.size;
      for (const { edge } of internal) if (reached.has(edge.from) || reached.has(edge.to)) { reached.add(edge.from); reached.add(edge.to); }
    }
    if (reached.size !== nodes.length) continue;
    const outside = directed.filter(a => !members.has(a.from) && !members.has(a.to));
    const ports = new Set<string>();
    for (const envelope of useful) {
      const arrivals = distances(outside, envelope.from), departures = distances(outside, envelope.to, true);
      const incoming = directed.filter(a => !members.has(a.from) && members.has(a.to) && arrivals.has(a.from)).map(a => a.to);
      const outgoing = directed.filter(a => members.has(a.from) && !members.has(a.to) && departures.has(a.to)).map(a => a.from);
      if (members.has(envelope.from)) incoming.push(envelope.from);
      if (members.has(envelope.to)) outgoing.push(envelope.to);
      if (incoming.some(a => outgoing.some(b => a !== b))) for (const port of [...incoming, ...outgoing]) ports.add(port);
    }
    if (ports.size < 2) continue;
    territories.push({ id, nodes: [...members].sort(), elevation: nodes[0].position[2], ports: [...ports].sort() });
  }
  territories.sort((a, b) => a.id < b.id ? -1 : 1);
  const stacked: [string, string][] = [];
  const reach = new Map<string, Map<string, number>>();
  const reachable = (from: string, to: string) => {
    if (!reach.has(from)) reach.set(from, distances(directed, from));
    return reach.get(from)!.has(to);
  };
  for (let i = 0; i < territories.length; i++) for (let j = i + 1; j < territories.length; j++) {
    const a = territories[i], b = territories[j];
    if (Math.abs(a.elevation - b.elevation) < config.profile.height + .3 - EPSILON) continue;
    const first = graph.nodes.filter(n => a.nodes.includes(n.id)), second = graph.nodes.filter(n => b.nodes.includes(n.id));
    const overlaps = first.some(p => second.some(q => Math.hypot(p.position[0] - q.position[0], p.position[1] - q.position[1]) < p.radius + q.radius - EPSILON));
    if (overlaps && a.nodes.some(from => b.nodes.some(to => reachable(from, to) && reachable(to, from)))) stacked.push([a.id, b.id]);
  }
  const excessDegree = graph.nodes.reduce((sum, n) => sum + Math.max(0, new Set(graph.edges.filter(e => e.from === n.id || e.to === n.id).map(e => e.from === n.id ? e.to : e.from)).size - 4), 0);
  return { journeys, territories, stacked, excessDegree };
}

/** Suppresses traversable degree-two transit while preserving parallel routes, geometry and query anchors. */
function reduceTransit(graph: Graph, arcs: Arc[], config: ExplorationConfig): Arc[] {
  const endpoints = new Set(config.targets.approaches.flatMap(t => [t.from, t.to]));
  const transit = new Set(graph.nodes.filter(node => {
    if (node.role !== "area" || endpoints.has(node.id)) return false;
    const incoming = arcs.filter(a => a.to === node.id), outgoing = arcs.filter(a => a.from === node.id);
    const neighbors = new Set([...incoming.map(a => a.from), ...outgoing.map(a => a.to)]);
    return neighbors.size === 2 && incoming.length > 0 && incoming.every(a => outgoing.some(b => b.to !== a.from));
  }).map(n => n.id));
  const result: Arc[] = [];
  for (const first of arcs.filter(a => !transit.has(a.from))) {
    let arc = { ...first, points: [...first.points], path: [...first.path] }, previous = arc.from;
    const seen = new Set([arc.from]);
    while (transit.has(arc.to) && !seen.has(arc.to)) {
      seen.add(arc.to);
      const next = arcs.find(a => a.from === arc.to && a.to !== previous);
      if (!next) break;
      previous = arc.to;
      arc = { ...arc, to: next.to, length: arc.length + next.length, width: Math.max(arc.width, next.width),
        points: [...arc.points, ...next.points.slice(1)], path: [...arc.path, ...next.path.slice(1)] };
    }
    if (arc.from !== arc.to) result.push(arc);
  }
  return result;
}

/** Nonnegative shortest centerline distance; absent entries are unreachable. */
function distances(arcs: Arc[], source: string, reverse = false): Map<string, number> {
  const values = new Map<string, number>([[source, 0]]), pending = new Set(arcs.flatMap(a => [a.from, a.to]));
  while (pending.size) {
    const node = [...pending].sort((a, b) => (values.get(a) ?? Infinity) - (values.get(b) ?? Infinity))[0];
    pending.delete(node);
    const distance = values.get(node);
    if (distance === undefined) break;
    for (const arc of arcs) {
      if ((reverse ? arc.to : arc.from) !== node) continue;
      const next = reverse ? arc.from : arc.to, candidate = distance + arc.length;
      if (candidate < (values.get(next) ?? Infinity)) values.set(next, candidate);
    }
  }
  return values;
}

/** Reports the least decision depth among tied shortest routes, with a full route witness. */
function journey(arcs: Arc[], from: string, to: string): StructureMetrics["journeys"][number] {
  const forward = distances(arcs, from), backward = distances(arcs, to, true), shortest = backward.get(from);
  if (shortest === undefined) return { from, to, depth: 0, distance: null, path: [] };
  const states = new Map<string, { depth: number; path: string[] }>([[to, { depth: 0, path: [to] }]]);
  for (const [node, remaining] of [...backward].sort((a, b) => a[1] - b[1])) {
    if (node === to) continue;
    const exits = arcs.filter(a => a.from === node && (backward.get(a.to) ?? Infinity) < remaining - EPSILON
      && (forward.get(node) ?? Infinity) + a.length + backward.get(a.to)! <= shortest * DETOUR_LIMIT + EPSILON);
    const decision = node !== from && exits.some((a, i) => exits.slice(i + 1).some(b => separated(a, b)));
    const continuations = exits.filter(a => Math.abs(a.length + backward.get(a.to)! - remaining) < EPSILON && states.has(a.to))
      .map(a => ({ depth: states.get(a.to)!.depth + Number(decision), path: [...a.path, ...states.get(a.to)!.path.slice(1)] }));
    continuations.sort((a, b) => a.depth - b.depth || (a.path.join("/") < b.path.join("/") ? -1 : 1));
    if (continuations.length) states.set(node, continuations[0]);
  }
  return { from, to, distance: shortest, ...(states.get(from) ?? { depth: 0, path: [] }) };
}

/** Distinct sampled route geometry must separate by the combined half-widths plus a small margin. */
function separated(a: Arc, b: Arc): boolean {
  const clearance = (a.width + b.width) / 2 + .2;
  const departs = (first: Point[], second: Point[]) => first.some(p => Math.min(...second.slice(1).map((end, i) => pointSegmentDistance(p, second[i], end))) > clearance);
  return departs(a.points, b.points) || departs(b.points, a.points);
}

/** Euclidean point-to-segment distance in Z-up meters, including degenerate samples. */
function pointSegmentDistance(point: Point, start: Point, end: Point): number {
  const delta = end.map((n, i) => n - start[i]), squared = delta.reduce((sum, n) => sum + n * n, 0);
  const t = squared ? Math.max(0, Math.min(1, delta.reduce((sum, n, i) => sum + n * (point[i] - start[i]), 0) / squared)) : 0;
  return Math.hypot(...point.map((n, i) => n - start[i] - t * delta[i]));
}
