import type { MeshAsset, AssetResolver } from "./props.ts";
import type { ReferenceView } from "./reference.ts";
/** Shared geometry and output contracts use right-handed Z-up meters. */
export type V2 = [number, number];
export type V3 = [number, number, number];
export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
  end?: number;
}
/** Source-linked world-space overlap inspection target in Z-up meters. */
export interface DiagnosticReview {
  id: string;
  layers: string[];
  bounds: { min: V3; max: V3 };
  position: V3;
  direction: V3;
  patches: V3[][];
}
export type ReviewFinding = Pick<
  Suggestion,
  | "id"
  | "objects"
  | "layers"
  | "bounds"
  | "position"
  | "direction"
  | "navigation"
> & { code?: string; patches?: V3[][] };
export interface Diagnostic {
  review?: DiagnosticReview;
  relatedSources?: { object: string; source?: SourceLocation }[];
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  objects: string[];
  source?: SourceLocation;
}
/** Non-blocking architectural review finding. Distances and targets use Z-up meters. */
export interface Suggestion {
  id: string;
  code:
    | "WALL_ALIGNMENT"
    | "FLIGHT_WALL_GAP"
    | "FLIGHT_OPEN_SIDE"
    | "NAV_ISLAND"
    | "FLIGHT_NAV_MISSING";
  message: string;
  objects: string[];
  sources: { object: string; source?: SourceLocation }[];
  layers: string[];
  position: V3;
  bounds: { min: V3; max: V3 };
  direction: V3;
  evidence: {
    offset?: number;
    length: number;
    area?: number;
    small?: boolean;
    disconnected?: boolean;
  };
  navigation?: { component: string };
  fingerprint: string;
  state: "active" | "suppressed";
  suppression?: { reason: string; stale: boolean };
}
/** An intentional finding, acknowledged against one revision of its local geometry. */
export interface ReviewSuppression {
  suggestion: string;
  fingerprint: string;
  reason: string;
}
export interface Named {
  id: string;
  label?: string;
  source?: SourceLocation;
}
export interface Vertex extends Named {
  x: number;
  y: number;
  z: number;
}
export type EdgeKind =
  | "wall"
  | "hard"
  | "soft"
  | "reinforced"
  | "glass"
  | "open"
  | "door"
  | "window"
  | "arch"
  | "breach"
  | "railing"
  | "rappel_window"
  | "rappel_door";
export interface Opening extends Named {
  kind: EdgeKind;
  start: number;
  end: number;
  sill: number;
  head: number;
  barricade?: boolean;
}
export interface Edge extends Named {
  from: string;
  to: string;
  kind: EdgeKind;
  control?: V2[];
  height?: number;
  /** Anchor bottom to this filled floor region instead of endpoint Z. */
  baseFloor?: string;
  /** Span from a lower floor to the upper slab's underside. */
  spanFloors?: boolean;
  topFloor?: string;
  thickness?: number;
  material?: string;
  openings: Opening[];
  join?: "miter" | "round";
}
export interface Region extends Named {
  boundary: string[];
  holes: string[][];
  fill: "floor" | "stairs" | "ramp" | "water";
  interior: string[];
  creases: [string, string][];
  material?: string;
  ceiling?: number;
  thickness?: number;
  role?: string;
  lower?: string;
  upper?: string;
  rise?: number;
  /** Stair body: filled by default, a smooth sloping slab, or constant-thickness stepped treads. */
  underside?: "filled" | "sloped" | "stepped";
  area?: string;
}
export interface Layer extends Named {
  vertices: Vertex[];
  edges: Edge[];
  regions: Region[];
}
export interface Seam extends Named {
  edges: [string, string];
  kind: "open" | "wall";
  material?: string;
}
export interface Material extends Named {
  color: string;
  repeat: number;
  roughness: number;
  metalness: number;
  texture?: string;
}
export interface Light extends Named {
  kind: "directional" | "point" | "spot";
  position: V3;
  target: V3;
  color: string;
  intensity: number;
  angle?: number;
}
export interface Marker extends Named {
  movement?: "land" | "water" | "none";
  layer: string;
  region?: string;
  position: V3;
  kind: string;
  team?: string;
}
export interface Route extends Named {
  movement?: "land" | "water";
  from: string;
  to: string;
  minRoutes: number;
  minDistance?: number;
  maxDistance?: number;
}
export interface Link extends Named {
  movement?: "land" | "water";
  from: V3;
  to: V3;
  kind: string;
  bidirectional: boolean;
  ability?: string;
  /**
   * Areas the link joins. Without them the compiler infers each end from the
   * floor at its position, which fails when an end lands on stair treads or
   * over the stairwell hole it climbs through.
   */
  fromArea?: string;
  toArea?: string;
}
export interface Cover extends Named {
  layer: string;
  min: V3;
  max: V3;
  material?: string;
  dynamic?: boolean;
  role?: string;
}
export interface Player {
  radius: number;
  height: number;
  step: number;
  slope: number;
  crouch: number;
  vault: number;
  rappel: boolean;
  ladder: boolean;
}
export interface RepairRecord {
  code: string;
  message: string;
  objects: string[];
  source?: SourceLocation;
  count: number;
  area?: number;
  maxDisplacement?: number;
  movement?: "land" | "water";
}
export interface ClippingLimits {
  fragmentsPerTriangle: number;
  intermediateVerticesPerTriangle: number;
  generatedVertices: number;
}
/** Generic circular boat footprint; dimensions are in document metres. */
export interface Boat {
  radius: number;
  draft: number;
  height: number;
}
export const DEFAULT_BOAT: Boat = { radius: 2, draft: 0.5, height: 2 };
/** Derived semantic context for geometry backends; never an authoring document. */
export interface RuntimeContext extends Named {
  reviewSuppressions?: ReviewSuppression[];
  assets?: MeshAsset[];
  references?: ReferenceView[];
  validation?: "premap" | "playable";
  boat?: Boat;
  name: string;
  description?: string;
  units: "meters";
  wallThickness: number;
  wallHeight: number;
  floorThickness: number;
  curveTolerance: number;
  player: Player;
  layers: Layer[];
  materials: Material[];
  lights: Light[];
  markers: Marker[];
  routes: Route[];
  links: Link[];
  noSpawnLos: [string, string][];
  sky: { color: string; intensity: number };
}
export type MeshKind =
  "wall" | "floor" | "stairs" | "ceiling" | "prop" | "water";
export interface MeshPart {
  collidable?: boolean;
  visible?: boolean;
  id: string;
  kind: MeshKind;
  /** Sole owning layer, or an empty string for a shell spanning several layers. */
  layer: string;
  /** Source layers represented by this mesh; faces retain their own source IDs. */
  layers: string[];
  dynamic: boolean;
  triangles: number[];
}
export interface Surface {
  /** AML separates architectural checks, permissive terrain, and unchecked visualization assets. */
  domain?: "architecture" | "terrain" | "visualization";
  /** Omitted means true, preserving legacy surface semantics. */
  collidable?: boolean;
  /** True for checked native solid faces; false for intentionally open physical patches. */
  closed?: boolean;
  visible?: boolean;
  mesh: string;
  kind: MeshKind;
  id: string;
  object: string;
  layer: string;
  role: string;
  material: string;
  dynamic: boolean;
  path?: V3[];
  /** AML source contributors and optional nonphysical face assignment. */
  contributors?: string[];
  assignment?: string;
}
export interface MeshData {
  positions: number[];
  normals: number[];
  indices: number[];
  uv: number[];
  uv1?: number[];
  tangents?: number[];
  /** One surface index per triangle. */
  surfaces: number[];
  /** Final physical-solid identity per triangle, independent of face ownership; empty for open patches. */
  solidIds?: string[];
  atlasPages?: number[];
  chartIds?: number[];
}
export interface FloorPatch {
  /** False permits terrain outside explicit playable-area coverage assertions. */
  navigationRequired?: boolean;
  area?: string;
  region: string;
  layer: string;
  points: V3[];
  triangles: number[][];
  loops: V3[][];
}
export interface AtlasPage {
  id: number;
  width: number;
  height: number;
}
export interface UVManifest {
  version: 1;
  geometryHash: string;
  uvHash: string;
  materialChannel: 0;
  lightmapChannel: 1;
  density: number;
  padding: number;
  safeMip: number;
  pages: AtlasPage[];
  charts: {
    id: number;
    page: number;
    triangles: number[];
    objects: string[];
  }[];
}
export interface ExportSolid {
  purpose?: "physical" | "visual";
  positions: V3[];
  triangles: number[][];
  surface: Surface;
  /** Final exposed material faces remain separate from the closed CSG operand topology. */
  materialFaces?: { points: V3[]; surface: Surface }[];
}
/** Native spatial metadata has world-space base geometry and an explicit world extrusion vector. */
export interface SpatialVolume {
  id: string;
  kind: "room" | "zone" | "volume" | "clearance";
  role?: string;
  movement?: "land" | "water";
  points: V3[];
  triangles: [number, number, number][];
  loops: V3[][];
  extrusion: V3;
  height: number;
  requireSupport?: boolean;
  properties?: Record<string, string>;
  source?: SourceLocation;
  bounds: { min: V3; max: V3 };
}

/** Deterministic spatial ownership of final physical terrain triangles; bounds include the complete triangles. */
export interface TerrainTile {
  id: string;
  terrain: string;
  index: [number, number];
  /** Triangle range in physicalMesh, before render partitions or collision filtering. */
  triangleStart: number;
  triangleCount: number;
  bounds: { min: V3; max: V3 };
  hash: string;
}

export interface CompiledLevel {
  terrainTiles?: TerrainTile[];
  spatialVolumes?: SpatialVolume[];
  /** Optional native-source lookup supplements the shared runtime semantic view. */
  provenance?: Record<
    string,
    {
      source?: SourceLocation;
      host?: string;
      assembly?: string;
      assemblies?: string[];
      instances?: string[];
      contributors?: string[];
    }
  >;
  /** Read-only authored profile sketches; labels identify their coordinate projection. */
  sourceProfiles?: {
    object: string;
    role: string;
    points: V3[];
    closed: boolean;
  }[];
  navigationSuggestionsStatus: "pending" | "complete" | "unavailable";
  suggestions: Suggestion[];
  repairs?: RepairRecord[];
  /** Non-solid water surfaces, separate from physical floor slabs. */
  water?: FloorPatch[];
  waterNavigation?: NavigationReport;
  /** Optional closed, pre-union solids for brush exporters. */
  exportSolids?: ExportSolid[];
  document: RuntimeContext;
  mesh: MeshData;
  /** Composed physical mesh retained before render-only material partitioning. */
  physicalMesh?: MeshData;
  /** Native continuous flight guides prevent legacy reconstruction of authored circulation. */
  flightGuides?: Record<string, FloorPatch>;
  parts: MeshPart[];
  surfaces: Surface[];
  floors: FloorPatch[];
  curves: Record<string, V3[]>;
  diagnostics: Diagnostic[];
  geometryHash: string;
  atlas?: UVManifest;
  navigation?: NavigationReport;
  semantic: { nodes: string[]; edges: [string, string][] };
  stats: Record<string, number>;
}
export interface CompileOptions {
  /** Host-controlled mesh I/O. The compiler never fetches an asset URL. */
  resolveAsset?: AssetResolver;
  retainExportSolids?: boolean;
  signal?: AbortSignal;
  onProgress?: (stage: string) => void;
  /** Called once the geometric shell is usable, before navigation and UV work. */
  onGeometry?: (level: CompiledLevel) => void;
  /** Navigation is built by default; false permits a geometry-only preview. */
  navigation?: boolean | NavigationOptions;
  /** Adjacent unsealed floor-height gaps warn by default; opt into errors or disable. */
  floorGaps?: false | "warning" | "error";
  /** Visible, same-facing coplanar overlaps are errors by default. */
  surfaceContacts?: false | "warning" | "error";
  uvs?: boolean;
  uv?: UVOptions;
}
export interface UVOptions {
  /** Maximum admitted source chart groups and resulting packed charts. Defaults to 16,384. */
  maximumCharts?: number;
  density?: number;
  resolution?: number;
  padding?: number;
  signal?: AbortSignal;
}
export interface NavigationOptions {
  onProgress?: (stage: string) => void;
  /** Observes reachable floor centroids; supplying it bypasses the report cache. */
  onReachableSample?: (position: V3, distance: number) => void;
  /** Observer-only origin. Does not add a seed or change validation reachability. */
  sampleOrigin?: V3;
  clippingLimits?: Partial<ClippingLimits>;
  movement?: "land" | "water";
  sealed?: boolean;
  signal?: AbortSignal;
  cell?: number;
  cellHeight?: number;
  sampleSpacing?: number;
}
export type NavigationBlockReason =
  "headroom" | "width" | "slope" | "step" | "disconnected" | "uncovered";
export interface NavigationCoverage {
  blockedCount?: number;
  blocked?: {
    region: string;
    position: V3;
    reason: NavigationBlockReason;
    clearance?: number;
  }[];
  blockedByReason?: Partial<Record<NavigationBlockReason, number>>;
  sampleSpacing: number;
  sampled: number;
  covered: number;
  excluded: number;
  uncoveredCount: number;
  /** Representative samples, capped at 2048; counts include every sample. */
  uncovered: {
    region: string;
    position: V3;
    reason: NavigationBlockReason;
    clearance?: number;
  }[];
  regions: {
    region: string;
    sampled: number;
    covered: number;
    excluded: number;
    uncovered: number;
    reasons: Partial<Record<NavigationBlockReason, number>>;
  }[];
}
/** A weakly connected walking network; area is horizontal footprint in square meters. */
export interface NavigationComponent {
  id: string;
  area: number;
  bounds: { min: V3; max: V3 };
  /** Representative point on the mesh, rather than the possibly unsupported bounds center. */
  position: V3;
  regions: string[];
  layers: string[];
}
export interface NavigationReport {
  componentDetails: NavigationComponent[];
  /** One component ID for each triangle of indices; empty means disabled polygon. */
  triangleComponents: string[];
  componentSeeds?: { id: string; position: V3 }[];
  repairs?: RepairRecord[];
  /** Navigation failures remain separate from geometry compilation diagnostics. */
  diagnostics: Diagnostic[];
  settings: {
    validation?: "premap" | "playable";
    clippingLimits?: ClippingLimits;
    movement?: "land" | "water";
    boat?: Boat;
    revision: number;
    geometryHash: string;
    cacheKey: string;
    player: Player;
    sealed: boolean;
    cell: number;
    cellHeight: number;
    sampleSpacing: number;
  };
  coverage: NavigationCoverage;
  passed: boolean;
  components: number;
  reachableRegions: string[];
  unreachableRegions: string[];
  unreachableMarkers: string[];
  positions: number[];
  indices: number[];
  routes: {
    id: string;
    reachable: boolean;
    distance: number;
    disjointRoutes: number;
    /** Copied Recast straight-path points in world Z-up meters; absent if unreachable. */
    path?: V3[];
  }[];
}
export interface ValidationReport {
  validation?: "premap" | "playable";
  gameplayReachabilityVerified?: boolean;
  waterNavigation?: NavigationReport;
  sealedWater?: NavigationReport;
  passed: boolean;
  diagnostics: Diagnostic[];
  navigation?: NavigationReport;
  sealed?: NavigationReport;
}
export const DEFAULT_PLAYER: Player = {
  radius: 0.25,
  height: 2,
  step: 0.45,
  slope: 42,
  crouch: 1.1,
  vault: 0,
  rappel: false,
  ladder: false,
};
export function createRuntimeContext(id = "untitled"): RuntimeContext {
  return {
    id,
    name: id,
    units: "meters",
    wallThickness: 0.22,
    wallHeight: 3,
    floorThickness: 0.2,
    curveTolerance: 0.01,
    player: { ...DEFAULT_PLAYER },
    layers: [],
    materials: [],
    lights: [],
    markers: [],
    routes: [],
    links: [],
    noSpawnLos: [],
    sky: { color: "#dce8f5", intensity: 0.5 },
  };
}
export function aborted(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new DOMException("Operation cancelled", "AbortError");
}
