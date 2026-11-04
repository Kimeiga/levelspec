import type { SceneProp, MeshAsset, AssetResolver } from "./props.ts";
import type { ReferenceView } from "./reference.ts";
/** LevelSpec 2. Canonical coordinates are right-handed Z-up metres. */
export type V2 = [number, number];
export type V3 = [number, number, number];
export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
  end?: number;
}
export interface Diagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  objects: string[];
  source?: SourceLocation;
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
  /** Stair body: filled to the lower landing by default, or a sloping slab. */
  underside?: "filled" | "sloped";
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
export interface LevelDocument extends Named {
  props?: SceneProp[];
  assets?: MeshAsset[];
  references?: ReferenceView[];
  validation?: "premap" | "playable";
  boat?: Boat;
  version: "2";
  name: string;
  description?: string;
  units: "meters";
  wallThickness: number;
  wallHeight: number;
  floorThickness: number;
  curveTolerance: number;
  player: Player;
  layers: Layer[];
  seams: Seam[];
  materials: Material[];
  lights: Light[];
  markers: Marker[];
  routes: Route[];
  links: Link[];
  covers: Cover[];
  noSpawnLos: [string, string][];
  sky: { color: string; intensity: number };
  expectFail?: boolean;
}
export type MeshKind = "wall" | "floor" | "stairs" | "ceiling" | "prop" | "water";
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
  /** Omitted means true, preserving legacy surface semantics. */
  collidable?: boolean;
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
  atlasPages?: number[];
  chartIds?: number[];
}
export interface FloorPatch {
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
  positions: V3[];
  triangles: number[][];
  surface: Surface;
}
export interface CompiledLevel {
  repairs?: RepairRecord[];
  /** Non-solid water surfaces, separate from physical floor slabs. */
  water?: FloorPatch[];
  waterNavigation?: NavigationReport;
  /** Optional closed, pre-union solids for brush exporters. */
  exportSolids?: ExportSolid[];
  version: "2";
  document: LevelDocument;
  mesh: MeshData;
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
  /** Coplanar, same-facing wall/floor overlaps warn by default. */
  surfaceContacts?: false | "warning" | "error";
  uvs?: boolean;
  uv?: UVOptions;
}
export interface UVOptions {
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
  | "headroom"
  | "width"
  | "slope"
  | "step"
  | "disconnected"
  | "uncovered";
export interface NavigationCoverage {
  blockedCount?: number;
  blocked?: { region: string; position: V3; reason: NavigationBlockReason; clearance?: number }[];
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
export interface NavigationReport {
  componentSeeds?: {id:string;position:V3}[];
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
export function createDocument(id = "untitled"): LevelDocument {
  return {
    version: "2",
    id,
    name: id,
    units: "meters",
    wallThickness: 0.22,
    wallHeight: 3,
    floorThickness: 0.2,
    curveTolerance: 0.01,
    player: { ...DEFAULT_PLAYER },
    layers: [],
    seams: [],
    materials: [],
    lights: [],
    markers: [],
    routes: [],
    links: [],
    covers: [],
    noSpawnLos: [],
    sky: { color: "#dce8f5", intensity: 0.5 },
  };
}
export function aborted(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new DOMException("Operation cancelled", "AbortError");
}
