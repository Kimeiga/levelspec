import type { PosterOptions } from "./posters.ts";
import type { SourceLocation } from "../vector/types.ts";

/** Explicit visual recipes. Host references use resolved AML object IDs. */
export interface DressingRule {
  kind: "wall" | "floor" | "building";
  host: string;
  material: string;
  face: "front" | "back" | "left" | "right" | "top" | "side";
  grime?: number;
  wear?: number;
  /** Building-component corrosion, independent of dirt and paint loss. */
  rust?: number;
  windows: boolean;
  stories?: number;
  /** Building-only chance, 0–1, that an eligible bay of a large building opens onto a stocked shop. */
  shops?: number;
  /** Floor, building, or plain-wall appearance maps in texels per meter. */
  textureDensity?: number;
  /** Native ground-floor wall replaced visually by this building envelope. */
  baseWall?: string;
  /** Opt-in patchwork ground; only horizontal slabs and landings receive this recipe. */
  ground?: "patched";
  patchSize?: number;
  /** Broad finish-zone scale, independent of individual concrete pours. */
  materialSize?: number;
  /** Maximum upward visual displacement in meters; collision remains authored. */
  relief?: number;
  wetness?: number;
  litter?: number;
  repairs?: number;
  /** Probability of joining optional pour subdivisions; architectural seams remain. */
  joinedPours?: number;
  asphalt?: number;
  /** Optional declared asphalt PBR finish, including its own textures and UV repeat. */
  asphaltMaterial?: string;
  manholes?: number;
  /** Broken concrete, biased toward wall contacts and narrow passages. */
  breakup?: number;
  tileShare?: number;
  /** Ceramic width in meters; floors default to 0.4 m, walls use seeded dimensions. */
  tileSize?: number;
  /** Tile width divided by height; floors default to square, walls use the seeded pattern's ratio. */
  tileAspect?: number;
  /** Ceramic-only weathering, 0–1; floors default to 0.9, walls inherit wear. */
  tileWear?: number;
  /** Ceramic-only dirt and dulling, 0–1; defaults to rule grime, then dressing grime. */
  tileGrime?: number;
  /** Wall/floor ceramic base color as six-digit sRGB hex; source texture detail remains. */
  tileColor?: string;
  /** Exposed tile bedding color as six-digit sRGB hex, independent of ceramic pigment. */
  tilePlasterColor?: string;
  timberShare?: number;
  source?: SourceLocation;
}

/**
 * Parts strung from one wall face to another, of two hosts or of one:
 * utility cables, clotheslines and street signs. Family amounts are 0–1 densities and 0
 * disables a family; lengths are meters.
 */
export interface SpanRule {
  /** Wall or building recipe hosts that may carry anchors; omitted means all of them. */
  hosts?: string[];
  cables: number;
  clotheslines: number;
  signs: number;
  /**
   * Least height above the walking surface beneath it of anything hanging
   * between anchors: cables, lines, washing and sign boards. Wall fittings
   * stay within 0.15 m of their wall and may reach lower.
   */
  clearance: number;
  /** Longest horizontal distance between the two anchors of one span. */
  reach: number;
  source?: SourceLocation;
}

/** Explicit poster center measured screen-right/up from the planar face's lower-left bounds. */
export interface PosterRule extends Omit<PosterOptions, "seed"> {
  id: string;
  host: string;
  face: "front" | "back" | "left" | "right";
  at: [number, number];
  source?: SourceLocation;
}

/** Kowloon kit revision 1. Amounts are normalized, dimensions remain in meters. */
export interface Dressing {
  theme: "kowloon-street@1";
  seed: string;
  grime: number;
  wear: number;
  /** Optional component corrosion amount; defaults to wear. */
  rust?: number;
  detail: "low" | "medium" | "high";
  /** Window occupancy lighting and the reviewer's exterior rig; defaults to day. Geometry remains identical. */
  timeOfDay?: "day" | "night";
  /**
   * Prefix of the author's kit finish materials: `<prefix>-signboard`, `-lettering`,
   * `-metal`, `-sheet`, `-timber` and `-roofing`. Missing ones fall back to
   * plain kit colors. Plain-wall roles use `<prefix>-wall-ceramic`, `-wall-edge`,
   * `-wall-metal`, `-wall-rust`, `-wall-cable`, `-wall-paper`, `-wall-posters`, and
   * `-wall-tile-plaster` (intrinsic color/normal/roughness maps beneath missing ceramic).
   * The posters material is the padded 4×4 atlas described in posters.ts.
   */
  finishes?: string;
  /** Declared substrate finishes for plain walls and building tenements; texture and physical repeat are retained. */
  wallMaterials?: string[];
  rules: DressingRule[];
  /** Explicit span recipes in authored order. Absent enables automatic building connections; empty disables them. */
  spans?: SpanRule[];
  /** Explicit paper decals, independent of wall finish rules. */
  posters?: PosterRule[];
  source?: SourceLocation;
}
