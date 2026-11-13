import type { ConfigInput, ExplorationConfig, Graph, Mobility } from "./types.ts";
import { Rng } from "../rng.ts";
import { permitsLevels, sameLevel, sampleElevation, transitionMode } from "./levels.ts";

export const VERSION = "exploration-2" as const;
export const MODES: Mobility[] = ["walk", "ramp", "stairs", "jump", "ladder", "drop", "vent"];

/** Provides a deliberately small starting graph; search can replace ordinary areas and links. */
export function initialGraph(): Graph {
  return {
    nodes: [
      { id: "entry", role: "entry", position: [-30, -14, 0], radius: 6 },
      { id: "key", role: "key", position: [27, 16, 0], radius: 8 },
      { id: "a", role: "area", position: [-12, 18, 0], radius: 7 },
      { id: "b", role: "area", position: [12, -18, 0], radius: 6 },
    ],
    edges: [["entry", "a"], ["a", "key"], ["key", "b"], ["b", "entry"]].map(([from, to], i) => ({
      id: `e${i}`, from, to, mode: "walk", bidirectional: true, width: 4, bend: 0,
    })),
  };
}

/** Normalizes once, copies caller data, and rejects unsupported or unbounded experiments. */
export function normalizeConfig(input: ConfigInput = {}): ExplorationConfig {
  const config: ExplorationConfig = structuredClone({
    seed: "shipyard-01", restarts: 4, proposals: 2000, traceEvery: 100,
    bounds: [120, 110], nodes: [4, 28], maxEdges: 48, elevations: [0, 4, 8], verticality: .5,
    ...input,
    initial: input.initial ?? initialGraph(),
    targets: { cycles: 3, crossings: 0, lengthVariation: .35, decisionDepth: 2, territories: 3, stackedRegions: 0,
      approaches: [{ from: "entry", to: "key", edge: 2, vertex: 2 }], ...input.targets },
    profile: { modes: ["walk", "ramp", "stairs"], height: 1.8, radius: .35, crouchHeight: 1.1, step: .25,
      maxSlope: 42, maxJump: 3, maxDrop: 3, speed: 3.4, ...input.profile },
  });
  const integer = (value: number, low: number, high: number, name: string) => {
    if (!Number.isInteger(value) || value < low || value > high) throw new Error(`${name} must be an integer in ${low}..${high}`);
  };
  integer(config.restarts, 1, 12, "restarts");
  integer(config.proposals, 1, 20000, "proposals");
  integer(config.traceEvery, 1, 20000, "traceEvery");
  integer(config.nodes[0], 2, 40, "minimum nodes");
  integer(config.nodes[1], config.nodes[0], 40, "maximum nodes");
  integer(config.maxEdges, 1, 100, "maxEdges");
  if (typeof config.seed !== "string" || !config.seed.length || config.seed.length > 200) throw new Error("seed must contain 1..200 characters");
  if (config.bounds.length !== 2 || config.bounds.some(n => !Number.isFinite(n) || n < 20 || n > 500)) throw new Error("bounds must be two finite dimensions in 20..500 meters");
  if (!config.elevations.length || config.elevations.length > 10 || config.elevations.some(n => !Number.isFinite(n) || Math.abs(n) > 50)) throw new Error("elevations must contain 1..10 finite heights within ±50 meters");
  if (typeof config.verticality !== "number" || !Number.isFinite(config.verticality) || config.verticality < 0 || config.verticality > 1) throw new Error("verticality must be a finite number in 0..1");
  for (const [name, value] of Object.entries(config.profile)) {
    if (name !== "modes" && (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 100)) throw new Error(`Invalid profile.${name}`);
  }
  if (!config.profile.modes.length || config.profile.modes.some(mode => !MODES.includes(mode))) throw new Error("profile.modes contains an unsupported mobility mode");
  if (config.profile.maxSlope >= 90 || config.profile.crouchHeight > config.profile.height) throw new Error("Invalid slope or crouch height");
  for (const key of ["cycles", "crossings", "lengthVariation"] as const) {
    if (!Number.isFinite(config.targets[key]) || config.targets[key] < 0 || config.targets[key] > 1000) throw new Error(`Invalid target ${key}`);
  }
  for (const key of ["decisionDepth", "territories", "stackedRegions"] as const) integer(config.targets[key], 0, 40, key);
  if (!Array.isArray(config.targets.approaches) || config.targets.approaches.length > 20) throw new Error("At most 20 approach targets are supported");
  if (input.initial === undefined) assignStarterFloors(config);
  assertGraph(config.initial, config);
  for (const target of config.targets.approaches) {
    if (target.from === target.to || ![target.from, target.to].every(id => config.initial.nodes.some(node => node.id === id))) throw new Error("Approach endpoints must name distinct initial nodes");
    integer(target.edge, 0, 1000, "edge approaches");
    integer(target.vertex, 0, 1000, "vertex approaches");
  }
  return config;
}

/** Assigns a fresh starter's floors before declaring its connections; supplied graphs are never rewritten. */
function assignStarterFloors(config: ExplorationConfig): void {
  const rng = new Rng(`${config.seed}/floors`), graph = config.initial;
  for (const node of graph.nodes) node.position[2] = sampleElevation(config.elevations[0], config, rng);
  graph.edges = graph.edges.filter(edge => {
    const from = graph.nodes.find(n => n.id === edge.from)!, to = graph.nodes.find(n => n.id === edge.to)!;
    if (sameLevel(from.position[2], to.position[2])) return true;
    const mode = transitionMode(config.profile);
    if (!mode) return false;
    edge.crossLevel = true; edge.mode = mode;
    if (mode === "drop") {
      edge.bidirectional = false;
      if (from.position[2] < to.position[2]) [edge.from, edge.to] = [edge.to, edge.from];
    }
    return true;
  });
}

/** Checks hard graph invariants independently of soft search targets. */
export function assertGraph(graph: Graph, config: ExplorationConfig): void {
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || graph.nodes.length < config.nodes[0] || graph.nodes.length > config.nodes[1] || graph.edges.length > config.maxEdges) throw new Error("Graph exceeds node/edge bounds");
  const ids = new Set<string>();
  for (const node of graph.nodes) {
    if (!/^[a-zA-Z][\w-]{0,60}$/.test(node.id) || node.id.startsWith("explore-") || ids.has(node.id)) throw new Error(`Invalid, reserved or duplicate node ID ${node.id}`);
    ids.add(node.id);
    if (node.region !== undefined && (typeof node.region !== "string" || !/^[a-zA-Z][\w-]{0,60}$/.test(node.region))) throw new Error(`Invalid region for ${node.id}`);
    if (!["entry", "key", "area"].includes(node.role) || !Number.isFinite(node.radius) || node.radius < 2 || node.radius > 15) throw new Error(`Invalid area ${node.id}`);
    if (node.position.length !== 3 || node.position.some(n => !Number.isFinite(n)) || Math.abs(node.position[0]) > config.bounds[0] / 2 || Math.abs(node.position[1]) > config.bounds[1] / 2 || Math.abs(node.position[2]) > 50) throw new Error(`Invalid position for ${node.id}`);
  }
  const edges = new Set<string>();
  const pairs = new Set<string>();
  for (const edge of graph.edges) {
    const pair = [edge.from, edge.to].sort().join("/");
    if (!/^[a-zA-Z][\w-]{0,60}$/.test(edge.id) || edge.id.startsWith("explore-") || edges.has(edge.id) || pairs.has(pair) || !ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) throw new Error(`Invalid, reserved or duplicate connection ${edge.id}`);
    edges.add(edge.id); pairs.add(pair);
    if (!MODES.includes(edge.mode) || typeof edge.bidirectional !== "boolean" || !Number.isFinite(edge.width) || edge.width < 1 || edge.width > 12 || !Number.isFinite(edge.bend) || Math.abs(edge.bend) > 30) throw new Error(`Invalid connection dimensions ${edge.id}`);
    if (edge.crossLevel !== undefined && typeof edge.crossLevel !== "boolean") throw new Error(`Invalid cross-level declaration for ${edge.id}`);
    if (!permitsLevels(graph, edge)) throw new Error(`Connection ${edge.id} joins different floors; explicitly mark it cross-level first`);
  }
}

/** Checks persistence of original locks and semantic anchors in searched or imported states. */
export function assertInvariants(graph: Graph, config: ExplorationConfig): void {
  assertGraph(graph, config);
  const endpoints = new Set(config.targets.approaches.flatMap(t => [t.from, t.to]));
  for (const original of config.initial.nodes) {
    const node = graph.nodes.find(n => n.id === original.id);
    if ((original.role !== "area" || endpoints.has(original.id)) && (!node || node.role !== original.role)) throw new Error(`Missing semantic anchor ${original.id}`);
    if (original.pinned && JSON.stringify(node) !== JSON.stringify(original)) throw new Error(`Pinned area changed: ${original.id}`);
  }
  for (const original of config.initial.edges.filter(e => e.locked)) {
    if (JSON.stringify(graph.edges.find(e => e.id === original.id)) !== JSON.stringify(original)) throw new Error(`Locked connection changed: ${original.id}`);
  }
}
