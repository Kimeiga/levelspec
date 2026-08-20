/**
 * LevelSpec — the AI-facing semantic representation.
 *
 * Canonical source coordinate system: right-handed, Z-up, meters, integer XY
 * planning grid, explicit storey elevations. Engine adapters convert once.
 *
 * The rule that governs this whole file: the model edits semantic intent.
 * It never writes a vertex, a plane, a winding order or an engine axis.
 */

// ---------------------------------------------------------------------------
// Spec (authored by a human or a model, stored as JSON)
// ---------------------------------------------------------------------------

/** `[x, y, width, depth]` in grid cells. */
export type Rect = [number, number, number, number];

/** `[x, y]` in grid cells. */
export type Cell = [number, number];

export const OUTSIDE = '__outside__';

export type SpaceRole =
  | 'room'
  | 'corridor'
  | 'lane'
  | 'stairwell'
  | 'site'
  | 'spawn'
  | 'exterior'
  | 'balcony'
  | 'roof';

export interface SpaceSpec {
  id: string;
  label?: string;
  rect: Rect;
  role?: SpaceRole;
  /** Extra cells added to the space beyond `rect` (unions of rectangles). */
  extra?: Rect[];
  /** Cells cut out of the space (courtyards, shafts, pillars). */
  subtract?: Rect[];
  /** Floor offset relative to the layer elevation, in meters (mezzanines, pits). */
  z_offset?: number;
  /** Ceiling height override for this space, in meters. */
  height?: number;
  /** No wall is generated between this space and any space listed here. */
  open_to?: string[];
  /** Exterior runs owned by this space are emitted at this height (balconies). */
  railing?: number;
}

export type PortalKind =
  | 'door'
  | 'open'
  | 'arch'
  | 'breach'
  | 'window'
  | 'rappel_window'
  | 'rappel_door'
  | 'hatch_frame';

export interface PortalSpec {
  id: string;
  /** `[spaceA, spaceB]`, where either may be `__outside__`. */
  between: [string, string];
  kind: PortalKind;
  /** Opening width in grid cells, or `"full"` to open the whole shared run. */
  width_cells?: number | 'full';
  /** Preferred location. The compiler picks the nearest legal cut. */
  hint?: Cell;
  /** For `__outside__` portals: which face of the building. */
  side?: 'N' | 'S' | 'E' | 'W';
  /** Overrides the default sill/head heights for the kind, in meters. */
  sill?: number;
  head?: number;
  /** Marks the portal as barricadable / breachable (R6-style runtime state). */
  barricade?: boolean;
}

export type WallType = 'hard' | 'soft' | 'reinforced' | 'open' | 'glass';

export interface WallOverrideSpec {
  /** `[spaceA, spaceB]`, where either may be `__outside__`. */
  between: [string, string];
  type: WallType;
  /** Restrict the override to runs overlapping this rect (optional). */
  within?: Rect;
}

export type VerticalKind = 'stairs' | 'ladder' | 'hatch' | 'ramp' | 'rappel' | 'shaft';

export interface VerticalConnectionSpec {
  id: string;
  label?: string;
  from_layer: string;
  to_layer: string;
  from_cell: Cell;
  to_cell: Cell;
  kind: VerticalKind;
  /** Width in meters (stairs, ramps) — snapped to whole cells by the compiler. */
  width?: number;
  /** Explicit run direction. Derived from the two cells when they differ. */
  direction?: 'N' | 'S' | 'E' | 'W';
  /** Hatches only: hole size in cells. */
  size_cells?: [number, number];
  /** Destructible floor hatch (R6-style) vs. a permanently open shaft. */
  destructible?: boolean;
}

export interface CoverSpec {
  id: string;
  layer: string;
  rect: Rect;
  height: number;
  label?: string;
  material?: 'cover' | 'crate' | 'planter' | 'vehicle' | 'desk' | 'barrel';
  /** Elevation of the cover base above the layer floor, in meters. */
  z_offset?: number;
}

export interface LayerSpec {
  id: string;
  label?: string;
  /** Elevation of the walking surface, in meters. */
  z: number;
  /** Floor-to-ceiling clearance, in meters. */
  height: number;
  /** Emit walls on interior shared boundaries (default true). */
  internal_walls?: boolean;
  /** Emit a roof slab where nothing is stacked above (default true). */
  roof?: boolean;
  /** Exterior runs are emitted at this height instead of `height` (railings). */
  railing?: number;
  /** Deliberate unions such as broad outdoor route bands. */
  allow_space_overlap?: boolean;
  spaces: SpaceSpec[];
  portals?: PortalSpec[];
  wall_overrides?: WallOverrideSpec[];
  floor_holes?: Rect[];
}

export interface MarkerSpec {
  id: string;
  layer: string;
  cell: Cell;
  kind: 'attacker_spawn' | 'defender_spawn' | 'site' | 'objective' | 'poi' | 'drone_hole';
  team?: 'attack' | 'defend' | 'neutral';
  label?: string;
}

export interface RouteRequirement {
  id: string;
  from: string;
  to: string;
  /** Minimum number of edge-disjoint routes that must exist. */
  min_routes?: number;
  /** Path-length window in meters at the canonical movement speed. */
  min_distance?: number;
  max_distance?: number;
}

export interface GameplaySpec {
  mode?: string;
  markers?: MarkerSpec[];
  required_routes?: RouteRequirement[];
  /** Marker id pairs that must NOT see each other at spawn. */
  no_spawn_los?: [string, string][];
  /** Canonical movement speed used to turn distances into seconds. */
  move_speed?: number;
}

export interface LevelSpec {
  schema_version: string;
  id: string;
  name: string;
  description?: string;
  units?: 'meters';
  coordinate_system?: 'right-handed Z-up';
  /** Cell size in meters. */
  grid?: number;
  wall_thickness?: number;
  floor_thickness?: number;
  voxel_pitch?: number;
  /**
   * How a flight is realised. `ramp` (the default) slices it finely enough
   * that the surface is a slope you walk up; `stepped` emits treads you climb
   * one at a time. The spec says two storeys are connected by stairs; how
   * that becomes geometry is the compiler's decision, not the author's.
   */
  stair_style?: 'ramp' | 'stepped';
  /** Set on levels that are meant to fail, to demonstrate the error path. */
  expect_fail?: boolean;
  /** Player capsule used by the clearance validators. */
  player?: PlayerSpec;
  layers: LayerSpec[];
  vertical_connections?: VerticalConnectionSpec[];
  covers?: CoverSpec[];
  gameplay?: GameplaySpec;
}

/**
 * What the body walking this map can do.
 *
 * Traversal is an ability, not a height. An opening with a 0.9 m sill is a
 * route for a player who can vault and a wall for one who cannot, and the
 * navigation graph has to know which — otherwise the validator proves a map
 * connected through a window that the game will never let anyone climb.
 *
 * `vault` is the highest sill that can be climbed over, and it is zero by
 * default: nothing is assumed about the controller beyond walking and
 * stepping, because assuming more is how a route ends up gated on a move
 * nobody implemented.
 */
export interface PlayerSpec {
  radius: number;
  height: number;
  /** Highest lip that can be walked straight up. */
  step: number;
  crouch?: number;
  /** Highest sill that can be climbed over. Zero means no vault. */
  vault?: number;
  /**
   * Whether this body can come down a rope through an exterior opening.
   *
   * A separate ability from vaulting, and false by default: a rappel window is
   * a way in for an attacker with a rope and a wall for everybody else, and
   * the navigation graph should only carry the route when someone can use it.
   */
  rappel?: boolean;
}

/** How an opening is got through, once the player's abilities are known. */
export type TraversalAction = 'walk' | 'step' | 'crouch' | 'vault' | 'rappel' | 'blocked';

// ---------------------------------------------------------------------------
// Compiled output (owned entirely by the deterministic compiler)
// ---------------------------------------------------------------------------

export type SolidRole =
  | 'static_hard'
  | 'soft_panel'
  | 'reinforcement_slot'
  | 'glass'
  | 'window_barricade'
  | 'door_panel'
  | 'lintel'
  | 'sill'
  | 'floor'
  | 'roof'
  | 'stair'
  | 'ramp'
  | 'ladder'
  | 'hatch'
  | 'cover'
  | 'riser'
  | 'exterior_wall';

/** Axis-aligned box in canonical meters. `min`/`max` are Z-up. */
export interface Box {
  min: [number, number, number];
  max: [number, number, number];
}

export interface Solid {
  id: string;
  role: SolidRole;
  box: Box;
  layer: string;
  /** Semantic owner(s). A shared wall has exactly one boundary record. */
  spaces: string[];
  /** Boundary run this solid was derived from, when applicable. */
  boundary?: string;
  /** Dynamic surfaces are never fused into the immutable static shell. */
  dynamic: boolean;
  label?: string;
}

export interface BoundaryRun {
  id: string;
  layer: string;
  axis: 'x' | 'y';
  /** World coordinate of the boundary plane on `axis`. */
  coord: number;
  /** Run extent along the perpendicular axis, in meters (grid extents). */
  start: number;
  end: number;
  /** Extent actually emitted, after junction squares are assigned an owner. */
  emitStart: number;
  emitEnd: number;
  /** `[left, right]` space ids relative to the +axis normal; may be `__outside__`. */
  sides: [string, string];
  type: WallType;
  openings: Opening[];
  exterior: boolean;
}

export interface Opening {
  portal: string;
  kind: PortalKind;
  /** Interval along the run, in meters. */
  t0: number;
  t1: number;
  /** Vertical extent relative to the layer floor, in meters. Always finite. */
  sill: number;
  head: number;
  /** How the player gets through it, given what the player can do. */
  action: TraversalAction;
}

export interface NavNode {
  id: number;
  layer: string;
  cell: Cell;
  space: string;
  /** World position of the cell center, Z-up. */
  pos: [number, number, number];
}

export interface NavEdge {
  a: number;
  b: number;
  cost: number;
  kind: 'walk' | 'portal' | 'vertical';
  via?: string;
}

export interface NavGraph {
  nodes: NavNode[];
  edges: NavEdge[];
  index: Map<string, number>;
  adjacency: number[][];
}

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  code: string;
  objects: string[];
  message: string;
  measured?: number;
  required?: number;
  suggestions?: string[];
}

export interface CompiledLevel {
  spec: LevelSpec;
  solids: Solid[];
  boundaries: BoundaryRun[];
  nav: NavGraph;
  /** Per-layer occupancy, for the minimap and the validators. */
  occupancy: Map<string, Map<string, string>>;
  markers: (MarkerSpec & { pos: [number, number, number] })[];
  verticals: CompiledVertical[];
  diagnostics: Diagnostic[];
  stats: Record<string, number>;
  /** One record per boundary edge on the lattice, keyed `layer|V:ix:iy`. */
  edges: Map<string, EdgeRecord>;
}

/** The single source of truth for "is there a wall between these two cells". */
export interface EdgeRecord {
  layer: string;
  axis: 'x' | 'y';
  /** Grid-line index on `axis`, cell index on the other. */
  line: number;
  cross: number;
  left: string;
  right: string;
  type: WallType;
  exterior: boolean;
  run?: string;
  open: boolean;
  sill: number;
  /** Always finite: the layer ceiling stands in for an unbounded opening. */
  head: number;
  /** How the player gets through, given what the player can do. */
  action: TraversalAction;
  portal?: string;
}

export interface CompiledVertical {
  spec: VerticalConnectionSpec;
  fromNode?: number;
  toNode?: number;
  footprint: Rect;
  steps: number;
  rise: number;
  /** Tread depth in meters; a staircase with no room to run is not walkable. */
  tread: number;
  /** Rise over run. The style-independent measure of whether it is climbable. */
  gradient: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULTS = {
  grid: 1.0,
  wall_thickness: 0.22,
  floor_thickness: 0.2,
  voxel_pitch: 0.25,
  player: { radius: 0.35, height: 1.8, step: 0.45, crouch: 1.1, vault: 0 },
  move_speed: 4.6,
} as const;

/**
 * Default sill/head heights per portal kind, in meters above the layer floor.
 *
 * `head: null` means "as high as the wall goes" and is resolved against the
 * layer's own ceiling during compilation. It is not `Infinity`: this table and
 * everything derived from it get serialised — cached builds, worker messages,
 * saved levels — and `JSON.stringify(Infinity)` is `null` on the way out and
 * stays `null` on the way back in, which turns an unbounded opening into a
 * zero-height one somewhere far from here.
 */
export const PORTAL_PROFILE: Record<PortalKind, { sill: number; head: number | null }> = {
  door: { sill: 0, head: 2.1 },
  open: { sill: 0, head: null },
  arch: { sill: 0, head: 2.4 },
  breach: { sill: 0, head: 2.1 },
  window: { sill: 0.9, head: 2.05 },
  rappel_window: { sill: 0.9, head: 2.05 },
  rappel_door: { sill: 0, head: 2.1 },
  hatch_frame: { sill: 0, head: null },
};
