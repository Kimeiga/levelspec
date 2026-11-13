import type { Rng } from "../rng.ts";
import type { Connection, ExplorationConfig, Graph, Mobility, MobilityProfile } from "./types.ts";

/** Floor identity allows at most one micrometer of coordinate noise, not a climbable step. */
export function sameLevel(a: number, b: number): boolean { return Math.abs(a - b) <= 1e-6; }

/** Cross-level permission is explicit and independent of movement capability or geometric fit. */
export function permitsLevels(graph: Graph, edge: Connection): boolean {
  const a = graph.nodes.find(n => n.id === edge.from), b = graph.nodes.find(n => n.id === edge.to);
  return !!a && !!b && (sameLevel(a.position[2], b.position[2]) || edge.crossLevel === true);
}

/** Samples configured floors with the requested frequency; zero preserves the caller's current height. */
export function sampleElevation(current: number, config: ExplorationConfig, rng: Rng): number {
  return rng.bool(config.verticality) ? rng.pick(config.elevations) : current;
}

/** Chooses an available transition proposal without asserting that its geometry or traversal works. */
export function transitionMode(profile: MobilityProfile): Mobility | undefined {
  return (["stairs", "ramp", "ladder", "jump", "drop"] as Mobility[]).find(mode => profile.modes.includes(mode));
}
