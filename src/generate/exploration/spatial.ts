import { ArchitectureBuilder } from "../../architecture/builder.ts";
import { serializeAml } from "../../architecture/format.ts";
import { Rng } from "../rng.ts";
import { evaluateGraph, pathLength, routePoints } from "./metrics.ts";
import { assertGraph } from "./config.ts";
import { permitsLevels, sameLevel } from "./levels.ts";
import type { AreaNode, Candidate, ExplorationConfig, Graph, Interpretation, MobilityEvidence, Point, Realization, Surface } from "./types.ts";

export const INTERPRETATIONS: Interpretation[] = ["terraces", "courts", "galleries"];

/** Creates reproducible native AML hypotheses. Up to three width/bend rounds retain the fewest fit issues. */
export function realize(candidate: Candidate, config: ExplorationConfig, interpretation: Interpretation): Realization {
  assertGraph(candidate.graph, config);
  const rounds = [0, 1, 2].map(round => realizeRound(candidate, config, interpretation, round));
  rounds.sort((a, b) => a.issues.length - b.issues.length || a.feedbackRound - b.feedbackRound);
  return rounds[0];
}

/** Builds one complete spatial interpretation, keeping geometry decisions out of graph search randomness. */
function realizeRound(candidate: Candidate, config: ExplorationConfig, interpretation: Interpretation, round: number): Realization {
  const graph = structuredClone(candidate.graph), id = `${candidate.id}-${interpretation}`;
  const rng = new Rng(`${config.seed}/realization/${candidate.id}/${interpretation}`);
  for (const edge of graph.edges) if (!edge.locked) { edge.width *= 1 - round * .08; edge.bend *= 1 - round * .15; }
  const builder = new ArchitectureBuilder(id), surfaces: Surface[] = [];
  builder.document.validation = "premap";
  builder.document.description = "Disposable spatial hypothesis. Graph transfers are plan-derived; mobility and gameplay require independent verification.";
  builder.document.player = { ...builder.document.player, height: config.profile.height, radius: config.profile.radius,
    crouch: config.profile.crouchHeight, slope: config.profile.maxSlope, step: config.profile.step };
  const mapping: Realization["mapping"] = { nodes: {}, edges: {} };
  const issues: string[] = [], transfers: string[] = [], mobility: MobilityEvidence[] = [];
  const realizedGraph = structuredClone(graph);
  for (const node of graph.nodes) {
    const points = areaFootprint(node, rng, interpretation), surfaceId = `area-${node.id.length}-${node.id}`;
    builder.profile(`profile-${surfaceId}`, points);
    builder.slab(surfaceId, `profile-${surfaceId}`, { thickness: .3, area: node.id });
    surfaces.push({ id: surfaceId, owner: node.id, kind: "area", points });
    mapping.nodes[node.id] = [surfaceId];
    builder.document.markers.push({ id: `marker-${node.id}`, kind: node.role === "entry" ? "spawn" : "objective", layer: "architecture",
      position: node.position, movement: "none" });
  }
  for (const edge of graph.edges) {
    const points = routePoints(graph, edge), routeId = `route-${edge.id.length}-${edge.id}`;
    const special = ["jump", "ladder", "drop", "vent"].includes(edge.mode);
    const notes: string[] = [];
    const horizontal = pathLength(points.map(p => [p[0], p[1], 0]));
    let steepest = 0;
    for (let i = 1; i < points.length; i++) steepest = Math.max(steepest, Math.atan2(Math.abs(points[i][2] - points[i - 1][2]),
      Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])) * 180 / Math.PI);
    const delta = points.at(-1)![2] - points[0][2];
    let fit: MobilityEvidence["geometricFit"] = "plausible";
    if (edge.width < config.profile.radius * 2 + .2) { fit = "failed"; notes.push("Body width plus clearance exceeds route width"); }
    if (["walk", "ramp", "vent"].includes(edge.mode) && steepest > config.profile.maxSlope) { fit = "failed"; notes.push(`Local slope ${steepest.toFixed(1)}° exceeds profile`); }
    if (edge.mode === "stairs" && steepest > Math.min(38, config.profile.maxSlope)) { fit = "failed"; notes.push("Stair pitch exceeds profile / provisional 38° envelope"); }
    if (edge.mode === "jump" && horizontal > config.profile.maxJump) { fit = "failed"; notes.push("Center-to-center jump span exceeds assumed range; landing design is required"); }
    if (edge.mode === "drop" && (delta >= 0 || -delta > config.profile.maxDrop)) { fit = "failed"; notes.push("Drop direction or height exceeds profile"); }
    if (edge.mode === "ladder") { if (fit !== "failed") fit = "pending"; notes.push("Ladder placement and mounting space require a game-specific implementation"); }
    if (special) notes.push("No runtime traversal verification; this edge must not certify a playable route");
    mobility.push({ edge: edge.id, mode: edge.mode, geometricFit: fit, assumedCapability: config.profile.modes.includes(edge.mode), engineVerification: "unverified", notes });
    if (fit !== "plausible") issues.push(`${edge.id}: ${notes[0]}`);
    if (fit === "failed") realizedGraph.edges = realizedGraph.edges.filter(e => e.id !== edge.id);
    if (special && edge.mode !== "vent") {
      mapping.edges[edge.id] = [];
      issues.push(`${edge.id}: ${edge.mode} is a reserved movement proposal, without continuous walking geometry`);
      realizedGraph.edges = realizedGraph.edges.filter(e => e.id !== edge.id);
      continue;
    }
    const ribbon = ribbonPoints(points, edge.width);
    surfaces.push({ id: routeId, owner: edge.id, kind: "connection", points: ribbon });
    builder.path(`path-${routeId}`, points);
    if (edge.mode === "stairs" && Math.abs(delta) > .01) builder.stairs(routeId, { path: `path-${routeId}`, width: edge.width, maximumRiser: Math.min(.18, config.profile.step), thickness: .3, underside: "stepped", area: edge.id });
    else builder.ramp(routeId, { path: `path-${routeId}`, width: edge.width, thickness: .3, area: edge.id });
    mapping.edges[edge.id] = [routeId];
    if (!edge.bidirectional) {
      const realizedEdge = realizedGraph.edges.find(e => e.id === edge.id);
      if (realizedEdge) realizedEdge.bidirectional = true;
      transfers.push(`${edge.id}: continuous walking geometry also permits reverse movement; one-way gating is not implemented`);
    }
    if (edge.mode === "vent") {
      builder.profile(`ceiling-profile-${routeId}`, ribbon.map(p => [p[0], p[1], p[2] + config.profile.crouchHeight + .15]));
      const ceiling = builder.slab(`ceiling-${routeId}`, `ceiling-profile-${routeId}`, { thickness: .15, playable: false });
      ceiling.kind = "roof";
    }
  }
  if (interpretation !== "terraces") addSharedSpaces(builder, surfaces, graph, realizedGraph, mapping, transfers, interpretation, config);
  reconcileTransfers(graph, realizedGraph, surfaces, config, transfers, issues);
  for (const crossing of evaluateGraph(graph, config).crossings) {
    if (crossing.kind === "collision") issues.push(`Insufficient headroom between ${crossing.edges.join(" / ")}: ${crossing.separation.toFixed(2)}m`);
  }
  if (interpretation === "terraces") {
    for (const node of graph.nodes.filter(n => n.position[2] > 0)) builder.box(`pier-${node.id}`, {
      width: 1.2, depth: 1.2, height: node.position[2], anchor: "bottom-center", position: [node.position[0], node.position[1], -.3] });
  }
  builder.assembly("spatial-fabric", [...builder.document.elements], { coincidentMaterial: "retained-face" });
  return { id, candidate: candidate.id, interpretation, feedbackRound: round + 1, surfaces, aml: serializeAml(builder.document), mapping,
    realizedGraph, realizedMetrics: evaluateGraph(realizedGraph, config), transfers, issues: [...new Set(issues)], mobility, publication: "premap" };
}

/** Makes convex, rotated irregular or rounded area outlines; roles never imply one room per node. */
function areaFootprint(node: AreaNode, rng: Rng, interpretation: Interpretation): Point[] {
  const count = interpretation === "terraces" ? rng.pick([5, 6, 8]) : 12;
  const angle = rng.float(0, Math.PI), stretch = rng.float(.75, 1.5);
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count * Math.PI * 2;
    const x = Math.cos(t) * node.radius * stretch, y = Math.sin(t) * node.radius / stretch;
    points.push([node.position[0] + x * Math.cos(angle) - y * Math.sin(angle), node.position[1] + x * Math.sin(angle) + y * Math.cos(angle), node.position[2]]);
  }
  return points;
}

/** Offsets a sampled centerline into a constant-width strip for plan evidence. */
function ribbonPoints(points: Point[], width: number): Point[] {
  const left: Point[] = [], right: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
    const dx = after[0] - before[0], dy = after[1] - before[1], length = Math.hypot(dx, dy) || 1;
    const p = points[i]; left.push([p[0] - dy / length * width / 2, p[1] + dx / length * width / 2, p[2]]);
    right.push([p[0] + dy / length * width / 2, p[1] - dx / length * width / 2, p[2]]);
  }
  return [...left, ...right.reverse()];
}

/**
 * Groups connected ordinary areas locally without crossing declared regions or elevations.
 * All center pairs stay within 28 meters; unlabeled groups contain at most four areas.
 */
function localSharedGroups(graph: Graph, realized: Graph, config: ExplorationConfig): AreaNode[][] {
  const ordinary = realized.edges.filter(edge => ["walk", "ramp", "stairs"].includes(edge.mode) && config.profile.modes.includes(edge.mode));
  const unassigned = new Set(graph.nodes.map(node => node.id));
  const groups: AreaNode[][] = [];
  for (const seed of graph.nodes) {
    if (!unassigned.delete(seed.id)) continue;
    const group = [seed];
    const limit = seed.region === undefined ? 4 : graph.nodes.length;
    for (let at = 0; at < group.length && group.length < limit; at++) {
      for (const node of graph.nodes) {
        if (group.length === limit) break;
        if (!unassigned.has(node.id) || node.region !== seed.region || node.position[2] !== seed.position[2]) continue;
        if (!ordinary.some(edge => [edge.from, edge.to].includes(group[at].id) && [edge.from, edge.to].includes(node.id))) continue;
        if (group.some(member => Math.hypot(member.position[0] - node.position[0], member.position[1] - node.position[1]) > 28)) continue;
        unassigned.delete(node.id);
        group.push(node);
      }
    }
    if (group.length > 1) groups.push(group);
  }
  return groups;
}

/** Creates separate local envelopes, each with its own explicitly shared transfer hub. */
function addSharedSpaces(builder: ArchitectureBuilder, surfaces: Surface[], graph: Graph, realized: Graph, mapping: Realization["mapping"], transfers: string[], interpretation: Interpretation, config: ExplorationConfig): void {
  const groups = localSharedGroups(graph, realized, config);
  for (const [index, nodes] of groups.entries()) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    addSharedSpace(builder, surfaces, realized, mapping, transfers, interpretation, nodes, suffix);
  }
}

/** Adds one bounded common floor and reports the independence lost inside that envelope. */
function addSharedSpace(builder: ArchitectureBuilder, surfaces: Surface[], realized: Graph, mapping: Realization["mapping"], transfers: string[], interpretation: Interpretation, nodes: AreaNode[], suffix: string): void {
  const members = new Set(nodes.map(n => n.id));
  const hull = convexHull(surfaces.filter(s => s.kind === "area" && members.has(s.owner)).flatMap(s => s.points));
  const floorId = `shared-floor${suffix}`, profileId = `shared-profile${suffix}`, hubId = `explore-shared-space${suffix}`;
  builder.profile(profileId, hull); builder.slab(floorId, profileId, { thickness: .3, area: `shared${suffix}` });
  surfaces.push({ id: floorId, owner: hubId, kind: "hall", points: hull });
  const center: Point = [hull.reduce((sum, p) => sum + p[0], 0) / hull.length, hull.reduce((sum, p) => sum + p[1], 0) / hull.length, hull[0][2]];
  realized.nodes.push({ id: hubId, role: "area", position: center, radius: 3, ...(nodes[0].region === undefined ? {} : { region: nodes[0].region }) });
  realized.edges = realized.edges.filter(edge => !members.has(edge.from) || !members.has(edge.to));
  for (const node of nodes) {
    mapping.nodes[node.id].push(floorId);
    realized.edges.push({ id: `explore-transfer-${node.id}`, from: node.id, to: hubId, mode: "walk", bidirectional: true, width: 4, bend: 0 });
  }
  transfers.push(`${nodes.map(n => n.id).join(", ")} share one ${interpretation === "courts" ? "outdoor yard" : "covered hall"} (${floorId}); their floor permits extra transfers through a common territory`);
  if (interpretation === "galleries") {
    const roof = builder.slab(`shared-roof${suffix}`, profileId, { elevation: 6, thickness: .25, playable: false });
    roof.kind = "roof";
    for (let i = 0; i < hull.length; i++) builder.box(`column${suffix}-${i}`, { width: .4, depth: .4, height: 6, anchor: "bottom-center", position: hull[i] });
  } else {
    builder.solid("cylinder", `yard-monument${suffix}`, { radius: 2, height: 3, segments: 12, position: center, anchor: "bottom-center" });
  }
}

/** Computes a counterclockwise convex hull without a third-party geometry dependency. */
function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = (list: Point[]) => {
    const hull: Point[] = [];
    for (const point of list) { while (hull.length > 1 && cross(hull.at(-2)!, hull.at(-1)!, point) <= 0) hull.pop(); hull.push(point); }
    return hull.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/** Tests planar containment; its result is a geometry warning, never a navigation certificate. */
function inside(point: Point, polygon: Point[]): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}

/** Tests convex footprints in XY, conservatively including boundary contact within one micrometer. */
function convexFootprintsTouch(a: Point[], b: Point[]): boolean {
  for (const polygon of [a, b]) for (let i = 0; i < polygon.length; i++) {
    const from = polygon[i], to = polygon[(i + 1) % polygon.length];
    const dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy);
    if (length < 1e-8) continue;
    const first = a.map(p => (-dy * p[0] + dx * p[1]) / length);
    const second = b.map(p => (-dy * p[0] + dx * p[1]) / length);
    if (Math.max(...first) < Math.min(...second) - 1e-6 || Math.max(...second) < Math.min(...first) - 1e-6) return false;
  }
  return true;
}

/** Reports unresolved shared-floor contacts without certifying new movement links. */
function reportSharedFloorContacts(surfaces: Surface[], sharedHubs: Map<string, string>, config: ExplorationConfig, issues: string[]): void {
  const floors = surfaces.filter(surface => surface.kind !== "connection");
  for (let i = 0; i < floors.length; i++) for (let j = i + 1; j < floors.length; j++) {
    const a = floors[i], b = floors[j];
    if (a.kind !== "hall" && b.kind !== "hall") continue;
    if (a.kind === "hall" && sharedHubs.get(b.owner) === a.owner) continue;
    if (b.kind === "hall" && sharedHubs.get(a.owner) === b.owner) continue;
    const separation = Math.abs(a.points[0][2] - b.points[0][2]);
    if (separation >= config.profile.height + .3 || !convexFootprintsTouch(a.points, b.points)) continue;
    const pair = `${a.id} (${a.owner}) / ${b.id} (${b.owner})`;
    if (separation < .05) issues.push(`Unresolved shared floor contact ${pair}: overlapping envelopes at grade; physical portal reconstruction required`);
    else issues.push(`Unresolved shared floor contact ${pair}: ${separation.toFixed(2)}m separation provides insufficient body/deck clearance`);
  }
}

/** Records accidental overlap and crossing transfers, splitting shared route throats in the inferred graph. */
function reconcileTransfers(graph: Graph, realized: Graph, surfaces: Surface[], config: ExplorationConfig, transfers: string[], issues: string[]): void {
  const splits = new Map<string, { id: string; station: number }[]>();
  for (const crossing of evaluateGraph(graph, config).crossings.filter(c => c.kind === "junction")) {
    if (!sameLevel(crossing.separation, 0)) {
      issues.push(`Near-grade crossing ${crossing.edges.join(" / ")} has different elevations; an explicit cross-level transition is unresolved`);
      continue;
    }
    const edges = crossing.edges.map(id => realized.edges.find(e => e.id === id));
    if (edges.some(e => !e)) { issues.push(`Shared/special crossing requires manual reconciliation: ${crossing.edges.join(" / ")}`); continue; }
    const existing = realized.nodes.find(n => n.id.startsWith("explore-junction-") && n.position[2] === crossing.position[2]
      && Math.hypot(n.position[0] - crossing.position[0], n.position[1] - crossing.position[1]) < .2);
    const id = existing?.id ?? `explore-junction-${realized.nodes.length}`;
    if (!existing) realized.nodes.push({ id, role: "area", position: crossing.position, radius: 2 });
    for (const edge of edges) {
      const points = routePoints(graph, graph.edges.find(e => e.id === edge!.id)!);
      const station = nearestStation(points, crossing.position);
      const prior = splits.get(edge!.id) ?? [];
      if (!prior.some(split => split.id === id)) splits.set(edge!.id, [...prior, { id, station }]);
    }
    transfers.push(`${crossing.edges.join(" / ")} intersect at grade at ${id}; a shared throat and extra transfer replace independent crossings`);
  }
  for (const [edgeId, junctions] of splits) {
    const edge = realized.edges.find(e => e.id === edgeId)!;
    junctions.sort((a, b) => a.station - b.station);
    const sequence = [edge.from, ...junctions.map(j => j.id), edge.to];
    realized.edges = realized.edges.filter(e => e.id !== edgeId);
    for (let i = 1; i < sequence.length; i++) {
      const part = { ...edge, id: i === 1 ? edge.id : `explore-part-${i}-${edge.id}`, from: sequence[i - 1], to: sequence[i] };
      if (permitsLevels(realized, part)) realized.edges.push(part);
      else issues.push(`${part.id}: crossing reconstruction would change floors without cross-level permission`);
    }
  }
  const areas = surfaces.filter(s => s.kind === "area");
  const sharedHubs = new Map(realized.edges.filter(e => e.to.startsWith("explore-shared-space")).map(e => [e.from, e.to]));
  reportSharedFloorContacts(surfaces, sharedHubs, config, issues);
  for (let i = 0; i < areas.length; i++) for (let j = i + 1; j < areas.length; j++) {
    const a = areas[i], b = areas[j];
    if (Math.abs(a.points[0][2] - b.points[0][2]) > .05) continue;
    if (!a.points.some(p => inside(p, b.points)) && !b.points.some(p => inside(p, a.points))) continue;
    if (!sameLevel(a.points[0][2], b.points[0][2])) {
      issues.push(`Overlapping areas ${a.owner} / ${b.owner} occupy different floors; cross-level access is unresolved`);
      continue;
    }
    transfers.push(`Overlapping areas ${a.owner} / ${b.owner}: inspect shared clearance`);
    if (sharedHubs.has(a.owner) && sharedHubs.get(a.owner) === sharedHubs.get(b.owner)) continue;
    if (!realized.edges.some(e => [e.from, e.to].includes(a.owner) && [e.from, e.to].includes(b.owner))) realized.edges.push({
      id: `explore-overlap-${i}-${j}`, from: a.owner, to: b.owner, mode: "walk", bidirectional: true, width: 2, bend: 0 });
  }
  for (const edge of graph.edges) for (const area of areas) {
    if (area.owner === edge.from || area.owner === edge.to) continue;
    if (routePoints(graph, edge).some(p => Math.abs(p[2] - area.points[0][2]) < .1 && inside(p, area.points))) {
      issues.push(`${edge.id} crosses unrelated area ${area.owner}; physical portal reconstruction required`);
    }
  }
}

/** Locates a crossing along its original route before any topology is split. */
function nearestStation(points: Point[], point: Point): number {
  let best = Infinity, station = 0, accumulated = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy), t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / Math.max(.000001, length ** 2)));
    const distance = Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
    if (distance < best) { best = distance; station = accumulated + length * t; }
    accumulated += length;
  }
  return station;
}
