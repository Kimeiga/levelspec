/** Exploration coordinates are meters, right-handed Z-up. These are proposals, not runtime levels. */
export type Point = [number, number, number];
export type Mobility = "walk" | "ramp" | "stairs" | "jump" | "ladder" | "drop" | "vent";
export interface AreaNode {
  id: string;
  role: "entry" | "key" | "area";
  position: Point;
  radius: number;
  /** Optional proposed territory; several areas can develop one region without becoming one room. */
  region?: string;
  /** Pins preserve this entire node through search, including its identity. */
  pinned?: boolean;
}
export interface Connection {
  id: string;
  from: string;
  to: string;
  mode: Mobility;
  /** Only true permits unequal endpoint heights. Mobility and physical fit remain separate checks. */
  crossLevel?: boolean;
  bidirectional: boolean;
  width: number;
  bend: number;
  locked?: boolean;
}
export interface Graph { nodes: AreaNode[]; edges: Connection[] }
export interface ApproachTarget { from: string; to: string; edge: number; vertex: number }
export interface MobilityProfile {
  modes: Mobility[];
  height: number;
  radius: number;
  crouchHeight: number;
  step: number;
  maxSlope: number;
  maxJump: number;
  maxDrop: number;
  speed: number;
}
export interface ExplorationConfig {
  seed: string;
  restarts: number;
  proposals: number;
  traceEvery: number;
  bounds: [number, number];
  nodes: [number, number];
  maxEdges: number;
  elevations: number[];
  /** Probability of sampling a configured floor instead of retaining an assigned height, in 0..1. */
  verticality: number;
  targets: { cycles: number; crossings: number; lengthVariation: number; decisionDepth: number; territories: number; stackedRegions: number; approaches: ApproachTarget[] };
  profile: MobilityProfile;
  initial: Graph;
}
export type ConfigInput = Partial<Omit<ExplorationConfig, "targets" | "profile">> & {
  targets?: Partial<ExplorationConfig["targets"]>;
  profile?: Partial<MobilityProfile>;
};
export interface Crossing {
  edges: [string, string];
  position: Point;
  separation: number;
  kind: "overpass" | "junction" | "collision";
}
export interface GraphMetrics {
  cycles: number;
  branches: number;
  lengthVariation: number;
  crossings: Crossing[];
  approaches: (ApproachTarget & { actualEdge: number; actualVertex: number; travelSeconds: number | null })[];
  deficits: string[];
  penalty: number;
  structure: StructureMetrics;
}
/** Planning proxies measured on plausible ordinary movement, not player or visibility simulation. */
export interface StructureMetrics {
  journeys: { from: string; to: string; depth: number; distance: number | null; path: string[] }[];
  territories: { id: string; nodes: string[]; elevation: number; ports: string[] }[];
  stacked: [string, string][];
  excessDegree: number;
}
export interface TraceFrame { proposal: number; graph: Graph; metrics: GraphMetrics; mutation: string }
export interface Candidate {
  id: string;
  graph: Graph;
  metrics: GraphMetrics;
  signature: number[];
  proposals: number;
  trace: TraceFrame[];
}
export type Interpretation = "terraces" | "courts" | "galleries";
export interface Surface {
  id: string;
  owner: string;
  kind: "area" | "connection" | "hall";
  points: Point[];
}
export interface MobilityEvidence {
  edge: string;
  mode: Mobility;
  geometricFit: "plausible" | "failed" | "pending";
  assumedCapability: boolean;
  engineVerification: "unverified";
  notes: string[];
}
export interface Realization {
  id: string;
  candidate: string;
  interpretation: Interpretation;
  feedbackRound: number;
  surfaces: Surface[];
  aml: string;
  mapping: { nodes: Record<string, string[]>; edges: Record<string, string[]> };
  /** Plan-derived transfer model. It is explicitly not a navigation proof. */
  realizedGraph: Graph;
  realizedMetrics: GraphMetrics;
  transfers: string[];
  issues: string[];
  mobility: MobilityEvidence[];
  publication: "premap";
}
export interface ExplorationPacket {
  version: "exploration-2";
  config: ExplorationConfig;
  candidates: Candidate[];
  realizations: Realization[];
}
