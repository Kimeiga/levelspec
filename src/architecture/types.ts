import type { AssetResolver, AssetGeometry } from "../vector/props.ts";
import type { ReferenceView } from "../vector/reference.ts";
import type {
  Named, V2, V3, Material, Player, Boat, Light, Marker, Route, Link,
  ReviewSuppression, CompileOptions, CompiledLevel, SourceLocation,
} from "../vector/types.ts";

/** AML domain coordinates and linear dimensions are right-handed Z-up meters. */
export type { V2, V3, Material, Player, Boat, SourceLocation };

/** Extrinsic XYZ rotations are degrees; scale is dimensionless and nonzero. */
export interface Placement {
  frame?: string;
  position?: V3;
  rotation?: V3;
  scale?: V3;
}

export interface CoordinateFrame extends Named, Placement {}
export interface ElevationDatum extends Named { elevation: number; datum?: string }
export interface ArchitectureConnection extends Named { from: string; to: string; path?: string }
export type Elevation = number | { datum: string; offset: number };

/** Plan curves optionally carry a distance-based elevation independently of control points. */
export type PathSegment =
  | { kind: "line"; to: V3 }
  | { kind: "bezier"; controls: V3[]; to: V3 }
  | { kind: "arc"; center: V3; radii: V2; start: number; sweep: number; rotation: number };

export interface ArchitecturePath extends Named, Placement {
  points: V3[];
  paths?: string[];
  segments: PathSegment[];
  closed: boolean;
  elevation?: [number, number];
}

export interface ProfileLoop { points?: V3[]; paths?: string[] }
export interface ArchitectureProfile extends Named, Placement {
  outer: ProfileLoop;
  holes: ProfileLoop[];
  interior: V3[];
  breaklines: V3[][];
}

export interface ElementBase extends Named, Placement {
  material?: string;
  group?: string;
  visible?: boolean;
  collidable?: boolean;
  dynamic?: boolean;
}

export interface Collection extends ElementBase {
  kind: "assembly" | "group" | "union" | "subtract" | "intersect" | "collision";
  children: ArchitectureElement[];
  /** Preferred descendant for conflicting exposed coincident materials only. */
  materialOwner?: string;
  /** Explicitly preserves the compositor-retained source face on coincident regions. */
  coincidentMaterial?: "error" | "retained-face";
}

/** Paints existing host faces; optional profile partitions never create physical shells. */
export interface FaceMaterial extends ElementBase {
  kind: "face-material";
  host: string;
  face: "all" | "top" | "bottom" | "front" | "back" | "left" | "right" | "side" | "reveal";
  profile?: string;
  projection: "xy" | "xz" | "yz";
  material: string;
}

export interface Wall extends ElementBase {
  kind: "wall";
  path: string;
  thickness: number;
  height?: number;
  alignment: "center" | "left" | "right";
  base?: string;
  top?: string;
  baseFloor?: string;
  contactFloor?: string;
  /** Optional local foot fitting where this floor meets the wall; does not declare full support. */
  fitFloor?: string;
  topFloor?: string;
  spanFloors?: boolean;
  join: "miter" | "round";
}

export interface Slab extends ElementBase {
  kind: "slab" | "landing" | "roof" | "canopy";
  profile: string;
  elevation: Elevation;
  thickness: number;
  ceiling?: number;
  area?: string;
  flat?: boolean;
  playable?: boolean;
}

export interface Aperture extends ElementBase {
  kind: "opening";
  host: string;
  shape: "rectangle" | "circle" | "ellipse" | "arch" | "profile";
  mode: "through" | "recess" | "notch";
  center: V2;
  width: number;
  height: number;
  radius: number;
  radii: V2;
  profile?: string;
  depth?: number;
  offset: number;
  revealMaterial?: string;
}

export interface OpeningDetail extends ElementBase {
  kind: "panel" | "glazing" | "infill" | "frame";
  opening: string;
  depth: number;
  offset: number;
  border: number;
}

export interface Primitive extends ElementBase {
  kind: "box" | "wedge" | "cylinder" | "cone" | "sphere";
  width: number;
  depth: number;
  height: number;
  radius: number;
  topRadius: number;
  segments?: number;
  anchor?: "corner" | "bottom-center";
}

export interface Extrusion extends ElementBase { kind: "extrusion"; profile: string; distance: number }
export interface Sweep extends ElementBase { kind: "sweep" | "beam" | "column"; profile: string; path: string }

/** Walking tops and longitudinal underside construction have separate contracts. */
export interface Flight extends ElementBase {
  kind: "stairs" | "ramp";
  path?: string;
  width?: number;
  widthProfile?: string;
  left?: string;
  right?: string;
  count?: number;
  maximumRiser?: number;
  thickness: number;
  underside: "filled" | "sloped" | "stepped" | "custom" | "separate";
  undersideProfile?: string;
  area?: string;
}

export interface SideEnclosure extends ElementBase {
  kind: "enclosure";
  host: string;
  side: "left" | "right" | "start" | "end";
  loop?: number;
  edge?: number;
  startReturn?: number;
  endReturn?: number;
  rails?: { profile: string; topOffset: number }[];
  posts?: { profile: string; maximumSpacing: number };
  construction: "wall" | "parapet" | "curb" | "railing";
  start: number;
  end?: number;
  offset: number;
  thickness: number;
  height: number;
  top?: string;
}

/** Explicit contact between two source paths; used by mechanical migration and native retaining construction. */
export interface RetainingWall extends ElementBase {
  kind: "retaining-wall";
  lower: string;
  upper: string;
  lowerFloor?: string;
  upperFloor?: string;
  thickness: number;
  height: number;
  mode: "open" | "wall";
}

export interface VisualMesh extends ElementBase { kind: "visual-mesh"; src: string }
/** Explicit native facets are physical geometry, never imported visualization assets. */
export interface FacetedGeometry extends ElementBase {
  kind: "faceted-solid" | "collision-surface";
  geometry: AssetGeometry;
}

export interface Instance extends ElementBase { kind: "instance"; ref: string }
export interface AssemblyDefinition extends Named { children: ArchitectureElement[] }

export interface Terrain extends ElementBase {
  kind: "terrain";
  profile?: string;
  heightmap?: string;
  tileSize?: number;
  minHeight?: number;
  maxHeight?: number;
  flipY?: boolean;
  points: V3[];
  triangles: [number, number, number][];
  columns?: number;
  rows?: number;
  heights: number[];
  cellSize: V2;
  base?: number;
  orientation: "up" | "down" | "authored" | "unknown";
  playable: boolean;
}

export interface SharedEdge extends ElementBase { kind: 'shared-edge'; from: string; to: string; path: string }

export interface TerrainGrade extends ElementBase {
  kind: 'grade';
  host: string;
  path: string;
  width: number;
  widthProfile?: string;
  crossSlope: number;
  transition: number;
  startTransition?: number;
  endTransition?: number;
  order?: number;
}

export interface WaterSurface extends ElementBase { kind: "water"; profile: string; elevation: Elevation }
export interface MetadataVolume extends ElementBase {
  kind: "zone" | "room" | "volume" | "clearance";
  profile: string;
  elevation: Elevation;
  height: number;
  role?: string;
  movement?: 'land' | 'water';
  requireSupport?: boolean;
  properties?: Record<string,string>;
}

export type ArchitectureElement = Collection | FaceMaterial | Wall | Slab | Aperture | OpeningDetail | Primitive |
  Extrusion | Sweep | Flight | SideEnclosure | VisualMesh | FacetedGeometry | Instance | Terrain | TerrainGrade | SharedEdge |
  WaterSurface | MetadataVolume | RetainingWall;

/** Source objects remain architectural throughout compilation; no SVGX authoring graph is constructed. */
/** Native authoring input may omit recipe materials; normalization fills semantic library defaults. */
export type ArchitectureInput = Omit<ArchitectureDocument, "dressing"> & {
  dressing?: Omit<import("../dressing/types.ts").Dressing, "rules"> & {
    rules: (Omit<import("../dressing/types.ts").DressingRule, "material"> & { material?: string })[];
  };
};

export interface ArchitectureDocument extends Named {
  dressing?: import("../dressing/types.ts").Dressing;
  version: "1";
  name: string;
  description?: string;
  units: "meters";
  validation: "premap" | "playable";
  curveTolerance: number;
  frames: CoordinateFrame[];
  datums: ElevationDatum[];
  paths: ArchitecturePath[];
  profiles: ArchitectureProfile[];
  definitions: AssemblyDefinition[];
  elements: ArchitectureElement[];
  materials: Material[];
  player: Player;
  boat?: Boat;
  lights: Light[];
  markers: Marker[];
  routes: Route[];
  links: Link[];
  connections: ArchitectureConnection[];
  references: ReferenceView[];
  reviewSuppressions: ReviewSuppression[];
  noSpawnLos: [string, string][];
  sky: { color: string; intensity: number };
}

export interface ArchitectureProvenance {
  id: string;
  sourceId: string;
  source?: SourceLocation;
  instances: string[];
  host?: string;
  assembly?: string;
  assemblies?: string[];
  contributors: string[];
}

/** The retained source document and physical identities supplement shared runtime geometry. */
export interface CompiledArchitecture extends CompiledLevel {
  architecture: ArchitectureDocument;
  provenance: Record<string, ArchitectureProvenance>;
  physicalHash: string;
  renderHash: string;
  /** Intrinsic image content identity and bounded chart statistics; contains no lighting. */
  surfaceAppearance?: import("../dressing/surface/types.ts").SurfaceAppearanceManifest;
  /** Generated ground inspection geometry in world meters; not collision or navigation. */
  groundPlans?: GroundPlan[];
  /** Every sign the building kit proposed, in proposal order, with what its survey decided. */
  signPlans?: SignPlan[];
}

/** One generated sign: what it is, what it says, where it stands and whether it was built. */
export interface SignPlan {
  /** `<host>/<seed path>`, unique in the level and stable for a dressing seed. */
  id: string;
  host: string;
  /** How the sign is carried: square to the wall, hung from a bracket, flat on a wall, over a shopfront, on a balcony front, or on a roof. */
  mount: "blade" | "hung" | "wall" | "fascia" | "balcony" | "roof";
  /** What the sign is made of or arranged as. */
  form: "board" | "lightbox" | "tiles" | "ladder" | "plaque" | "painted";
  /** The lettered lines in reading order, one entry per block of lettering. */
  lines: string[];
  /** World bounds of the sign's lettered panels, meters; its steelwork may reach beyond them. */
  bounds: { min: V3; max: V3 };
  /**
   * `built` signs are in the render mesh. `withheld` signs passed the survey
   * but only show at a higher detail. `crowded` signs touched scenery or a
   * kept sign, or hid one; `obstructed` signs had no readable face.
   */
  status: "built" | "withheld" | "crowded" | "obstructed";
  /** Triangles the sign added to the render mesh; 0 unless built. */
  triangles: number;
}

/** Exact receiving footprints and chosen pour rectangles retained for diagnostic plan views. */
export interface GroundPlan {
  host: string;
  anchors: { point: V3; kind: "floor" | "wall" | "floor-connection" | "connection" }[];
  regions: { id: string; kind: string; bounds: V3[]; footprint: V3[][] }[];
}

/** All budgets are enforced before or during expansion, never by silently dropping geometry. */
export interface ArchitectureCompileOptions extends CompileOptions {
  /** Complete source-image reader, authoritative when supplied (including replay snapshots).
   * Compose host readers with withBuiltinMaterialImages; omission loads only shipped library images. */
  resolveMaterialImage?: (reference: string, signal?: AbortSignal) => Promise<Uint8Array>;
  /** Optional host PNG codec for source images and cached maps; omission uses the browser-safe decoder. */
  decodeMaterialPng?: import("../dressing/surface/images.ts").SurfacePngDecoder;
  appearance?: import("../dressing/surface/types.ts").SurfaceAppearanceLimits;
  /** Optional host executor for deduplicated appearance jobs; the compiler retains validation and atomic publication. */
  rasterExecutor?: import("../dressing/surface/raster-execution.ts").SurfaceRasterExecutor;
  /** Optional finished-material artifact storage; only explicit reusable recipes are eligible. */
  materialCache?: import("../dressing/surface/material-cache.ts").SurfaceMaterialCache;
  /**
   * Defaults to full PNG decoding. Integrity-only validation trusts compiler-written
   * local artifacts and checks dimensions/digests without pixels; not for untrusted caches.
   * Source images always decode. This host policy is never read from stored metadata.
   */
  materialCacheValidation?: import("../dressing/surface/material-cache.ts").MaterialCacheValidation;
  /** Reuses bounded derived tile normals across compilations; source bytes are always reread. */
  terrainCache?: import("./terrain-cache.ts").TerrainTileCache;
  resolveAsset?: AssetResolver;
  /** Host-owned bounded byte loading; the compiler performs PNG validation and sample conversion. */
  resolveHeightmap?: (asset: { id: string; src: string }, signal?: AbortSignal) => Promise<Uint8Array>;
  limits?: { elements?: number; curveSegments?: number; profileVertices?: number; triangles?: number; booleanDepth?: number; terrainSamples?: number; heightmapBytes?: number; spatialQueries?: number; terrainTiles?: number; gradingWork?: number; terrainDependencies?: number };
}
