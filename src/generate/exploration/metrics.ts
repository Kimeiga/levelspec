import type { Connection, Crossing, ExplorationConfig, Graph, GraphMetrics, MobilityProfile, Point } from "./types.ts";
import { analyzeStructure } from "./structure.ts";
import { permitsLevels } from "./levels.ts";

/** Samples a quadratic route with flat area landings and a central elevation transition. */
export function routePoints(graph: Graph, edge: Connection, samples = 16): Point[] {
  const a = graph.nodes.find(node => node.id === edge.from)!;
  const b = graph.nodes.find(node => node.id === edge.to)!;
  const dx = b.position[0] - a.position[0], dy = b.position[1] - a.position[1];
  const distance = Math.hypot(dx, dy) || 1;
  const bend = Math.sign(edge.bend) * Math.min(Math.abs(edge.bend), distance * .3, distance ** 2 / (8 * (edge.width + 1)));
  const start = Math.min(.3, a.radius / distance), end = Math.max(.7, 1 - b.radius / distance);
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples, bow = 4 * t * (1 - t) * bend;
    const rise = Math.max(0, Math.min(1, (t - start) / (end - start)));
    return [a.position[0] + dx * t - dy / distance * bow,
      a.position[1] + dy * t + dx / distance * bow,
      a.position[2] + (b.position[2] - a.position[2]) * rise];
  });
}

/** Returns polyline length in meters, including vertical travel. */
export function pathLength(points: Point[]): number {
  return points.slice(1).reduce((total, point, i) => total + Math.hypot(...point.map((n, axis) => n - points[i][axis])), 0);
}

/** Assumed connectivity only includes configured game capabilities; it does not certify geometry. */
export function availableEdges(graph: Graph, profile: MobilityProfile): Connection[] {
  return graph.edges.filter(edge => permitsLevels(graph, edge) && profile.modes.includes(edge.mode));
}

/** Computes directed unit max flow, optionally splitting intermediate nodes to model shared throats. */
export function disjointPaths(graph: Graph, from: string, to: string, profile: MobilityProfile, vertex = false): number {
  if (from === to || !graph.nodes.some(n => n.id === from) || !graph.nodes.some(n => n.id === to)) return 0;
  const count = graph.nodes.length * 2, capacity = Array.from({ length: count }, () => Array<number>(count).fill(0));
  const index = new Map(graph.nodes.map((node, i) => [node.id, 2 * i]));
  for (const node of graph.nodes) capacity[index.get(node.id)!][index.get(node.id)! + 1] = vertex && node.id !== from && node.id !== to ? 1 : count;
  for (const edge of availableEdges(graph, profile)) {
    const a = index.get(edge.from)!, b = index.get(edge.to)!;
    capacity[a + 1][b] += 1;
    if (edge.bidirectional) capacity[b + 1][a] += 1;
  }
  const source = index.get(from)!, sink = index.get(to)! + 1;
  let flow = 0;
  for (;;) {
    const parent = Array<number>(count).fill(-1), queue = [source];
    parent[source] = source;
    for (let at = 0; at < queue.length && parent[sink] < 0; at++) {
      const u = queue[at];
      for (let v = 0; v < count; v++) if (capacity[u][v] > 0 && parent[v] < 0) { parent[v] = u; queue.push(v); }
    }
    if (parent[sink] < 0) return flow;
    for (let v = sink; v !== source; v = parent[v]) { capacity[parent[v]][v]--; capacity[v][parent[v]]++; }
    flow++;
  }
}

/** Estimates shortest assumed travel time; null means no directed route under the profile. */
export function travelTime(graph: Graph, from: string, to: string, profile: MobilityProfile): number | null {
  const times = new Map(graph.nodes.map(n => [n.id, Infinity])); times.set(from, 0);
  const pending = new Set(times.keys());
  const edges = availableEdges(graph, profile);
  while (pending.size) {
    const id = [...pending].sort((a, b) => times.get(a)! - times.get(b)!)[0];
    pending.delete(id);
    if (!Number.isFinite(times.get(id))) break;
    if (id === to) return times.get(id)!;
    for (const edge of edges) {
      const next = edge.from === id ? edge.to : edge.bidirectional && edge.to === id ? edge.from : undefined;
      if (!next) continue;
      const multiplier = edge.mode === "ladder" || edge.mode === "vent" ? 2 : 1;
      const time = times.get(id)! + pathLength(routePoints(graph, edge)) / profile.speed * multiplier;
      if (time < times.get(next)!) times.set(next, time);
    }
  }
  return null;
}

/** Counts connected XY crossing regions once per nonincident route pair, independent of collinear resampling. */
export function crossings(paths: { id: string; from: string; to: string; points: Point[]; width?: number }[], bodyHeight: number): Crossing[] {
  const result: Crossing[] = [];
  for (let i = 0; i < paths.length; i++) for (let j = i + 1; j < paths.length; j++) {
    const a = paths[i], b = paths[j];
    if ([a.from, a.to].some(id => id === b.from || id === b.to)) continue;
    const hits: Crossing[] = [];
    for (let ai = 1; ai < a.points.length; ai++) for (let bi = 1; bi < b.points.length; bi++) {
      const p = a.points[ai - 1], q = b.points[bi - 1];
      const dx = a.points[ai][0] - p[0], dy = a.points[ai][1] - p[1];
      const ex = b.points[bi][0] - q[0], ey = b.points[bi][1] - q[1];
      const determinant = dx * ey - dy * ex;
      if (Math.abs(determinant) < 1e-9) continue;
      const t = ((q[0] - p[0]) * ey - (q[1] - p[1]) * ex) / determinant;
      const u = ((q[0] - p[0]) * dy - (q[1] - p[1]) * dx) / determinant;
      if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) continue;
      const z = p[2] + t * (a.points[ai][2] - p[2]), otherZ = q[2] + u * (b.points[bi][2] - q[2]);
      const point: Point = [p[0] + t * dx, p[1] + t * dy, Math.min(z, otherZ)];
      if (hits.some(hit => Math.hypot(hit.position[0] - point[0], hit.position[1] - point[1]) < .2)) continue;
      const separation = Math.abs(z - otherZ);
      const slopeA = Math.abs(a.points[ai][2] - p[2]) / Math.max(.001, Math.hypot(dx, dy));
      const slopeB = Math.abs(b.points[bi][2] - q[2]) / Math.max(.001, Math.hypot(ex, ey));
      const sine = Math.abs(determinant) / Math.max(.000001, Math.hypot(dx, dy) * Math.hypot(ex, ey));
      const cosine = Math.sqrt(Math.max(0, 1 - sine ** 2));
      const clearance = separation - (slopeA * ((b.width ?? 0) + cosine * (a.width ?? 0))
        + slopeB * ((a.width ?? 0) + cosine * (b.width ?? 0))) / (2 * Math.max(.000001, sine));
      hits.push({ edges: [a.id, b.id], position: point, separation,
        kind: separation < .05 ? "junction" : clearance >= bodyHeight + .3 ? "overpass" : "collision" });
    }
    result.push(...(hits.length && a.width && b.width ? crossingRegions(a as WideRoute, b as WideRoute, hits, bodyHeight) : hits));
  }
  return result;
}

interface WideRoute { points: Point[]; width: number }

/** Clips one convex XY polygon against another; shared edges remain connected. */
function polygonIntersection(subject: Point[], clip: Point[]): Point[] {
  let result = subject;
  for (let i = 0; i < clip.length && result.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length], input = result; result = [];
    const distance = (p: Point) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    for (let j = 0; j < input.length; j++) {
      const p = input[j], q = input[(j + 1) % input.length], dp = distance(p), dq = distance(q);
      if (dp >= -1e-8) result.push(p);
      if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) {
        const t = dp / (dp - dq); result.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, 0]);
      }
    }
  }
  return result;
}

/** Uses separating axes to test contact between convex intersection patches. */
function polygonsTouch(a: Point[], b: Point[]): boolean {
  for (const polygon of [a, b]) for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length], axis = [p[1] - q[1], q[0] - p[0]];
    const first = a.map(v => v[0] * axis[0] + v[1] * axis[1]), second = b.map(v => v[0] * axis[0] + v[1] * axis[1]);
    if (Math.max(...first) < Math.min(...second) - 1e-7 || Math.max(...second) < Math.min(...first) - 1e-7) return false;
  }
  return true;
}

/** Builds straight strip patches; polygon connectivity makes counting independent of centerline resampling. */
function routeStrips(route: WideRoute): { points: Point[]; height: (p: Point) => number }[] {
  return route.points.slice(1).flatMap((b, i) => {
    const a = route.points[i], dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    if (length < 1e-8) return [];
    const nx = -dy / length * route.width / 2, ny = dx / length * route.width / 2;
    return [{ points: [[a[0] - nx, a[1] - ny, 0], [b[0] - nx, b[1] - ny, 0], [b[0] + nx, b[1] + ny, 0], [a[0] + nx, a[1] + ny, 0]] as Point[],
      height: (p: Point) => a[2] + ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length ** 2 * (b[2] - a[2]) }];
  });
}

/** Counts connected strip-overlap regions and uses their entire vertical envelope, including shallow angles. */
function crossingRegions(a: WideRoute, b: WideRoute, hits: Crossing[], height: number): Crossing[] {
  const patches: { points: Point[]; low: number; high: number }[] = [];
  for (const first of routeStrips(a)) for (const second of routeStrips(b)) {
    if (!polygonsTouch(first.points, second.points)) continue;
    const points = polygonIntersection(first.points, second.points);
    if (points.length < 3) continue;
    const differences = points.map(p => first.height(p) - second.height(p)), minimum = Math.min(...differences), maximum = Math.max(...differences);
    patches.push({ points, low: minimum <= 0 && maximum >= 0 ? 0 : Math.min(Math.abs(minimum), Math.abs(maximum)), high: Math.max(Math.abs(minimum), Math.abs(maximum)) });
  }
  const pending = new Set(patches.map((_, i) => i)), regions: Crossing[] = [];
  while (pending.size) {
    const group = [pending.values().next().value!]; pending.delete(group[0]);
    for (let at = 0; at < group.length; at++) for (const index of pending) if (polygonsTouch(patches[group[at]].points, patches[index].points)) { pending.delete(index); group.push(index); }
    const hit = hits.find(h => group.some(index => polygonsTouch(patches[index].points, [h.position])));
    if (!hit) continue;
    const low = Math.min(...group.map(index => patches[index].low)), high = Math.max(...group.map(index => patches[index].high));
    regions.push({ ...hit, separation: low, kind: high < .05 ? "junction" : low >= height + .3 ? "overpass" : "collision" });
  }
  return regions;
}

/** Collapses ordinary degree-two chains so subdivision cannot invent strategic length variety. */
function strategicLengths(graph: Graph): number[] {
  const incident = new Map(graph.nodes.map(n => [n.id, graph.edges.filter(e => e.from === n.id || e.to === n.id)]));
  const anchors = graph.nodes.filter(n => n.role !== "area" || incident.get(n.id)!.length !== 2).map(n => n.id);
  const visited = new Set<string>(), lengths: number[] = [];
  for (const start of [...anchors, ...graph.nodes.map(n => n.id)]) for (const edge of incident.get(start)!) {
    if (visited.has(edge.id)) continue;
    let current = start, nextEdge = edge, length = 0;
    for (;;) {
      visited.add(nextEdge.id); length += pathLength(routePoints(graph, nextEdge));
      current = nextEdge.from === current ? nextEdge.to : nextEdge.from;
      if (anchors.includes(current)) break;
      const next = incident.get(current)!.find(e => !visited.has(e.id));
      if (!next) break;
      nextEdge = next;
    }
    lengths.push(length);
  }
  return lengths;
}

/** Evaluates soft demands without changing them. Counts are hypotheses about the abstract graph. */
export function evaluateGraph(graph: Graph, config: ExplorationConfig): GraphMetrics {
  const lengths = strategicLengths(graph), mean = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
  const variation = mean ? Math.sqrt(lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length) / mean : 0;
  const remaining = new Set(graph.nodes.map(n => n.id)); let components = 0;
  while (remaining.size) {
    components++; const queue = [remaining.values().next().value!]; remaining.delete(queue[0]);
    for (let at = 0; at < queue.length; at++) for (const edge of graph.edges) {
      const next = edge.from === queue[at] ? edge.to : edge.to === queue[at] ? edge.from : undefined;
      if (next && remaining.delete(next)) queue.push(next);
    }
  }
  const cycles = graph.edges.length - graph.nodes.length + components;
  const intersections = crossings(graph.edges.map(e => ({ ...e, points: routePoints(graph, e) })), config.profile.height);
  const approaches = config.targets.approaches.map(target => ({ ...target,
    actualEdge: disjointPaths(graph, target.from, target.to, config.profile),
    actualVertex: disjointPaths(graph, target.from, target.to, config.profile, true),
    travelSeconds: travelTime(graph, target.from, target.to, config.profile) }));
  const deficits: string[] = []; let penalty = (components - 1) * 30;
  if (components > 1) deficits.push(`${components} disconnected components`);
  for (const target of approaches) {
    const edge = Math.max(0, target.edge - target.actualEdge), vertex = Math.max(0, target.vertex - target.actualVertex);
    if (edge || vertex) deficits.push(`${target.from}→${target.to}: ${target.actualEdge}/${target.edge} edge and ${target.actualVertex}/${target.vertex} vertex approaches`);
    penalty += 20 * (edge + vertex);
  }
  const overpasses = intersections.filter(c => c.kind === "overpass" && c.edges.every(id => ordinaryFit(graph, graph.edges.find(e => e.id === id)!, config.profile))).length;
  const structure = analyzeStructure(graph, config, graph.edges.filter(edge => ordinaryFit(graph, edge, config.profile)).map(edge => {
    const points = routePoints(graph, edge);
    return { edge, points, length: pathLength(points) };
  }));
  for (const journey of structure.journeys) {
    const missing = Math.max(0, config.targets.decisionDepth - journey.depth);
    if (missing) deficits.push(`${journey.from}→${journey.to}: progressive decision depth ${journey.depth}/${config.targets.decisionDepth}`);
    penalty += missing * 10;
  }
  for (const [name, actual, desired, weight] of [["developed territories", structure.territories.length, config.targets.territories, 7],
    ["stacked region pairs", structure.stacked.length, config.targets.stackedRegions, 5]] as const) {
    if (actual < desired) deficits.push(`${name}: ${actual}/${desired}`);
    penalty += Math.max(0, desired - actual) * weight;
  }
  penalty += structure.excessDegree * 2;
  for (const [name, actual, desired, weight] of [["cycles", cycles, config.targets.cycles, 3], ["overpasses", overpasses, config.targets.crossings, 4], ["length variation", variation, config.targets.lengthVariation, 8]] as const) {
    if (actual + .001 < desired) deficits.push(`${name}: ${actual.toFixed(2)} / ${desired}`);
    penalty += weight * Math.max(0, desired - actual);
  }
  for (let i = 0; i < graph.nodes.length; i++) for (let j = i + 1; j < graph.nodes.length; j++) {
    const a = graph.nodes[i], b = graph.nodes[j];
    if (Math.abs(a.position[2] - b.position[2]) < config.profile.height + .3) penalty += Math.max(0, a.radius + b.radius + 2 - Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1])) * 1.5;
  }
  penalty += intersections.filter(c => c.kind === "collision").length * 4;
  return { cycles, branches: graph.nodes.filter(n => graph.edges.filter(e => e.from === n.id || e.to === n.id).length >= 3).length,
    lengthVariation: variation, crossings: intersections, approaches, deficits, penalty, structure };
}

/** Conservative ordinary access envelope used before rewarding a geometrically separated crossing. */
export function ordinaryFit(graph: Graph, edge: Connection, profile: MobilityProfile): boolean {
  if (!permitsLevels(graph, edge) || !profile.modes.includes(edge.mode) || !["walk", "ramp", "stairs"].includes(edge.mode) || edge.width < profile.radius * 2 + .2) return false;
  const points = routePoints(graph, edge), slopeLimit = edge.mode === "stairs" ? Math.min(profile.maxSlope, 38) : profile.maxSlope;
  return points.slice(1).every((p, i) => Math.atan2(Math.abs(p[2] - points[i][2]), Math.hypot(p[0] - points[i][0], p[1] - points[i][1])) * 180 / Math.PI <= slopeLimit);
}

/** Feature distance favors different topology, height organization and route lengths, not a fun score. */
export function diversitySignature(graph: Graph, metrics: GraphMetrics): number[] {
  const heights = new Set(graph.nodes.map(n => n.position[2])).size;
  const degrees = graph.nodes.map(n => graph.edges.filter(e => e.from === n.id || e.to === n.id).length).sort((a, b) => b - a);
  return [graph.nodes.length / 4, metrics.cycles, metrics.branches / 2, heights, metrics.lengthVariation * 4,
    metrics.crossings.filter(c => c.kind === "overpass").length,
    graph.nodes.reduce((sum, n) => sum + n.position[0], 0) / graph.nodes.length / 10,
    graph.nodes.reduce((sum, n) => sum + n.position[1], 0) / graph.nodes.length / 10,
    graph.edges.filter(e => !e.bidirectional).length, metrics.structure.territories.length, metrics.structure.stacked.length,
    ...metrics.structure.journeys.map(j => j.depth), ...degrees.slice(0, 6).map(n => n / 2)];
}

/** Measures changed named-area connections, including direction and mobility, independently of edge IDs. */
export function adjacencyDistance(a: Graph, b: Graph): number {
  const keys = (graph: Graph) => new Set(graph.edges.map(edge => `${edge.bidirectional ? [edge.from, edge.to].sort().join("↔") : `${edge.from}→${edge.to}`}/${edge.mode}/${edge.crossLevel === true}`));
  const first = keys(a), second = keys(b), union = new Set([...first, ...second]);
  if (!union.size) return 0;
  return [...union].filter(key => first.has(key) !== second.has(key)).length / union.size;
}
