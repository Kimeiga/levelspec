import { bindLibraryMaterial, type MaterialRole } from "../materials/catalog.ts";
import { WALL_TILE_BED, WALL_TILE_GRIME, wallTileMaterial, tilePlasterMaterial } from "./wall-materials.ts";
import { Matrix4, Vector3 } from "three";
import { Rng } from "../generate/rng.ts";
import type {
  CompiledArchitecture,
  GroundPlan,
  V3,
} from "../architecture/types.ts";
import type { ArchitectureResolution } from "../architecture/resolve.ts";
import { aborted } from "../vector/types.ts";
import { KitGeometry, triangle, type KitBudget } from "./geometry.ts";
import type { TriangleSurvey } from "./triangle-survey.ts";
import type { Dressing, DressingRule } from "./types.ts";
import { seamDistance, type Seam } from "./seams.ts";
import { weatherColor } from "./weather.ts";
import {
  groundLayout,
  groundPours,
  type GroundLayout,
  type GroundPour,
} from "./ground-layout.ts";
import { groundExposure, type GroundWall } from "./ground-context.ts";
import { latticeHash, valueNoise } from "./finish/noise.ts";
import { GroundSurfaceField } from "./ground-surface.ts";
import { materialRecipeKey } from "./surface/material.ts";
import { registerSurfaceChart } from "./surface/plans.ts";
import {
  clipGround,
  groundArea,
  groundEdgeDistance,
  groundRectangle,
  intersectGround,
  splitGround,
} from "./ground-field.ts";

/** Resolved ground amounts; patch size and maximum surface relief are in meters. */
export interface GroundSettings {
  patchSize: number;
  materialSize: number;
  relief: number;
  wetness: number;
  litter: number;
  repairs: number;
  tileShare: number;
  timberShare: number;
  joinedPours: number;
  asphalt: number;
  manholes: number;
  breakup: number;
}
const defaults: GroundSettings = {
  patchSize: 1.9,
  materialSize: 7,
  relief: 0.028,
  wetness: 0.45,
  litter: 0.35,
  repairs: 0.6,
  tileShare: 0.1,
  timberShare: 0.025,
  joinedPours: 0.65,
  asphalt: 0.18,
  manholes: 0.35,
  breakup: 0.5,
};

/** Validates both XML and native API callers before any render geometry is replaced. */
export function groundRuleError(
  rule: DressingRule,
  hostKind: string,
): string | undefined {
  const hasOptions =
    rule.asphaltMaterial !== undefined ||
    Object.keys(defaults).some(
      (key) =>
        !(rule.kind === "wall" && key === "tileShare") &&
        rule[key as keyof GroundSettings] !== undefined,
    );
  if (rule.ground === undefined)
    return hasOptions ? "Ground controls require ground=patched." : undefined;
  if (
    rule.ground !== "patched" ||
    rule.kind !== "floor" ||
    !["slab", "landing"].includes(hostKind)
  )
    return "Patched ground requires a horizontal slab or landing floor; stairs, ramps, walls, and buildings are excluded.";
  const settings = groundSettings(rule);
  for (const [key, value] of Object.entries(settings)) {
    const low = key === "patchSize" ? 0.5 : key === "materialSize" ? 3 : 0;
    const high =
      key === "patchSize"
        ? 4
        : key === "materialSize"
          ? 24
          : key === "relief"
            ? 0.04
            : 1;
    if (!Number.isFinite(value) || value < low || value > high)
      return `${key} must be between ${low} and ${high}.`;
  }
  if (settings.tileShare + settings.timberShare > 1)
    return "tile-share plus timber-share must not exceed 1.";
}

/** Applies defaults without adding inferred controls to the caller's AML document. */
function groundSettings(rule: DressingRule): GroundSettings {
  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [
      key,
      rule[key as keyof GroundSettings] ?? value,
    ]),
  ) as unknown as GroundSettings;
}

/** One exposed receiving triangle, retaining the original material assignment boundary. */
export interface GroundFace {
  points: V3[];
  surface: number;
}
/** A receiving triangle in the layout frame. */
interface ReceivingFace {
  points: V3[];
}
type Finish =
  | "concrete"
  | "repair"
  | "tile"
  | "timber"
  | "grout"
  | "substrate"
  | "asphalt"
  | "manhole-rim"
  | "manhole-cover"
  | "manhole-slot";
type Paint = "crack" | "joint" | "spall" | "chip";
interface Damage {
  polygon: V3[];
  center: V3;
  radius: number;
}
interface Manhole {
  center: V3;
  outer: V3[];
  inner: V3[];
}
interface Patch {
  id: string;
  polygon: V3[];
  center: V3;
  kind: Finish;
  tone: V3;
  phase: number;
  wet: boolean;
  angle: number;
  cracks: V3[][];
  wornEdges: boolean[];
  pour: GroundPour;
  asphalt?: V3[];
  damage: Damage[];
  manhole?: Manhole;
}

/** How finely an AML floor is sampled for relief, water and tone, meters. */
const STREET_SAMPLING = 0.18;

/**
 * Returns the length over which one stretch of a pour joint keeps a single
 * worn width, meters: 0.35 m on street paving, and about two samples on
 * coarsely sampled floors, where shorter stretches could not be told apart.
 */
function jointRun(sampling: number): number {
  return Math.max(0.35, sampling * 1.9);
}
/** Edge length of the glazed paving tiles of an AML floor, meters. */
const STREET_TILE = 0.40;

/**
 * One receiving floor, described without reference to how it was authored, so
 * AML slabs and generated decks share one ground pass. World meters.
 */
export interface GroundSite {
  /** Collects world triangle corners instead of render output; geometric finish decisions remain active. */
  survey?: TriangleSurvey;
  /** AML object the generated geometry descends from. */
  host: string;
  /** Seed path that distinguishes this floor within the level. */
  seed: string;
  layout: GroundLayout;
  /** Exposed horizontal receiving triangles, all at one elevation. */
  faces: V3[][];
  /** Finite contacts that guide litter placement. */
  seams: Seam[];
  /** Wall contacts by owner, for passage widths and clearances. */
  walls: GroundWall[];
  options: GroundSettings;
  grime: number;
  wear: number;
  finishes: GroundFinishes;
  /** Spacing at which relief, water and tone are sampled, meters. */
  sampling: number;
  /** Edge length of the square tiles in tiled zones, meters. */
  tileSize: number;
  tileAspect?: number;
  tileWear?: number;
  tileGrime?: number;
  textureDensity?: number;
  /** Close-view asphalt density; distant generated decks retain their ordinary resolution. */
  asphaltTextureDensity?: number;
  /**
   * Adds worn construction joints and hairline cracks. Distant roof decks
   * can omit these marks while retaining the same pours, material zones,
   * unit-aware tile damage and water placement.
   */
  fineMarks: boolean;
  /**
   * Draws the surface flat at the receiving elevation, so walls enclosing a
   * deck meet it flush. The relief field still decides where water pools and
   * ground darkens; only the drawn height is leveled.
   */
  flush: boolean;
  /** Layer of loose debris. */
  layer: string;
  /**
   * Returns a render surface in `material` for a finish. `ground` surfaces
   * replace the floor itself; `detail` surfaces are loose parts lying on it.
   * Called once per finish and kind.
   */
  surface(finish: string, kind: "ground" | "detail", material: string): number;
  /** Receives the chosen pours for diagnostic top-down views, when the site keeps a plan. */
  plan?: GroundPlan;
}

/** Linear-space look of one generated finish: sRGB color, roughness, metalness and whether it takes the base texture. */
type FinishLook = [color: string, roughness: number, metalness: number, textured: boolean];

const FINISH_LOOKS: Record<string, FinishLook> = {
  concrete: ["#c4c1b5", 0.94, 0, true],
  repair: ["#bbb9af", 0.96, 0, true],
  grout: ["#58584d", 1, 0, true],
  substrate: ["#96917e", 0.98, 0, true],
  joint: ["#626153", 1, 0, true],
  edge: ["#9c998c", 0.96, 0, true],
  tile: ["#a4b2a6", 0.78, 0, true],
  timber: ["#897055", 0.92, 0, true],
  "water-film": ["#2f3936", 0.1, 0, false],
  crack: ["#36392e", 1, 0, false],
  paper: ["#c9baa0", 0.96, 0, false],
  brick: ["#796451", 0.98, 0, true],
  can: ["#a5a394", 0.4, 0.7, false],
  asphalt: ["#535550", 0.98, 0, true],
  spall: ["#777465", 1, 0, true],
  chip: ["#b5b0a0", 0.98, 0, true],
  "manhole-rim": ["#494940", 0.75, 0.65, false],
  "manhole-cover": ["#68665b", 0.72, 0.7, true],
  "manhole-slot": ["#292b26", 0.95, 0.2, false],
};

/**
 * The PBR finishes of one kind of ground. A generated finish is an ordinary
 * material named `$ground/<scope>/<finish>` that keeps the base texture,
 * normal map and repeat, so texture assets stay portable through the existing
 * exporters. Floors that share a scope share its materials, so one scope
 * must always be given the same base, declared finishes and colors.
 */
export class GroundFinishes {
  private readonly level: CompiledArchitecture;
  private readonly scope: string;
  private readonly base: string;
  private readonly declared: Record<string, string>;
  private readonly colors: Record<string, string>;
  private readonly materials = new Map<string, string>();

  /**
   * `base` is the declared material every generated finish derives from.
   * `declared` names finishes drawn in an author's own material instead, by
   * finish name; such a material keeps its color, textures, surface response
   * and repeat untouched. `colors` replaces the sRGB color of generated
   * finishes, for floors whose tiles or pours are not street pavement.
   */
  constructor(
    level: CompiledArchitecture,
    scope: string,
    base: string,
    declared: Record<string, string> = {},
    colors: Record<string, string> = {},
  ) {
    this.level = level;
    this.scope = scope;
    this.base = base;
    this.declared = declared;
    this.colors = colors;
  }

  /** Returns the material id of a finish, declaring a generated one on first use. */
  material(name: string): string {
    if (this.declared[name] !== undefined) return this.declared[name];
    const sharedTile = { tile: "$kowloon/wall-ceramic", "tile-bed": WALL_TILE_BED,
      "tile-grime": WALL_TILE_GRIME }[name];
    const role: MaterialRole | undefined = { asphalt: "asphalt", timber: "timber" }[name] as MaterialRole | undefined;
    const sharedId = sharedTile ?? (role ? bindLibraryMaterial(this.level.document.materials, role) : undefined);
    const shared = this.level.document.materials.find(material => material.id === sharedId);
    const colorOverride = this.colors[name] ?? (name === "tile" ? "#58635e" : undefined);
    if (shared && colorOverride === undefined) return shared.id;
    const existing = this.materials.get(name);
    if (existing) return existing;
    const base = this.level.document.materials.find(
      (m) => m.id === this.base,
    )!;
    const id = `$ground/${this.scope}/${name}`;
    if (this.level.architecture.materials.some((m) => m.id === id))
      throw new Error(`Reserved ground material ${id} is already declared.`);
    this.materials.set(name, id);
    // Another floor of the same scope has already declared this finish.
    if (this.level.document.materials.some((m) => m.id === id)) return id;
    if (shared) {
      this.level.document.materials.push({ ...shared, id, color: colorOverride });
      return id;
    }
    const [color, roughness, metalness, texture] = FINISH_LOOKS[name];
    this.level.document.materials.push({
      id,
      color: colorOverride ?? color,
      repeat: base.repeat,
      roughness,
      metalness,
      ...(name === "water-film" ? { opacity: 0.16 } : {}),
      ...(texture && base.texture ? { texture: base.texture } : {}),
      ...(texture && base.metallicRoughnessTexture ? { metallicRoughnessTexture: base.metallicRoughnessTexture } : {}),
      ...(texture && base.heightTexture ? { heightTexture: base.heightTexture, heightScale: base.heightScale, heightOffset: base.heightOffset } : {}),
      ...(texture && name !== "edge" && base.normalTexture
        ? {
            normalTexture: base.normalTexture,
            normalScale:
              (base.normalScale ?? 1) *
              (["tile", "timber"].includes(name)
                ? 0.25
                : ["asphalt", "spall"].includes(name)
                  ? 1.8
                  : 1),
          }
        : {}),
    });
    return id;
  }
}

/**
 * Dresses one AML slab or landing: plans its pours from the architecture
 * around it and generates render-only ground on the exact exposed footprint.
 * Physical surfaces stay untouched.
 */
export function dressGround(
  level: CompiledArchitecture,
  rule: DressingRule,
  faces: GroundFace[],
  seams: Seam[],
  settings: Dressing,
  budget: KitBudget,
  resolution: ArchitectureResolution,
  wallContacts: Map<string, Seam[]>,
): void {
  if (!faces.length) return;
  const options = groundSettings(rule);
  const receiving = faces.map((face) => face.points);
  const layout = groundLayout(
    resolution,
    rule.host,
    receiving,
    wallContacts,
    options.patchSize,
    options.materialSize,
    budget.signal,
  );
  const finishes = new GroundFinishes(
    level,
    rule.host,
    rule.material,
    {
      ...(rule.asphaltMaterial === undefined ? {} : { asphalt: rule.asphaltMaterial }),
      ...(rule.tileColor === undefined ? {} : { tile: wallTileMaterial(rule.host) }),
      ...(rule.tilePlasterColor === undefined ? {} : { "tile-bed": tilePlasterMaterial(rule.host) }),
    },
  );
  const template = level.surfaces[faces[0].surface];
  const plan: GroundPlan = { host: rule.host, anchors: [], regions: [] };
  (level.groundPlans ??= []).push(plan);
  dressGroundSite(
    level,
    {
      host: rule.host,
      seed: `${settings.seed}/${rule.host}/ground`,
      layout,
      faces: receiving,
      seams,
      walls: [...wallContacts].flatMap(([host, contacts]) =>
        contacts.map((seam) => ({ host, seam })),
      ),
      options,
      grime: rule.grime ?? settings.grime,
      wear: rule.wear ?? settings.wear,
      finishes,
      sampling: STREET_SAMPLING,
      tileSize: rule.tileSize ?? STREET_TILE,
      tileAspect: rule.tileAspect,
      tileWear: rule.tileWear ?? 0.9,
      tileGrime: rule.tileGrime ?? rule.grime ?? settings.grime,
      textureDensity: rule.textureDensity,
      asphaltTextureDensity: 160,
      fineMarks: true,
      flush: false,
      layer: template.layer,
      surface: (finish, kind, material) => {
        const id = `${rule.host}/$dressing/ground/${kind}/${finish}`;
        if (level.provenance[id])
          throw new Error(`Generated ground identity is occupied: ${id}`);
        const ancestry = level.provenance[rule.host];
        level.provenance[id] = {
          id,
          host: rule.host,
          sourceId: ancestry?.sourceId ?? rule.host,
          source: rule.source ?? ancestry?.source,
          contributors: [rule.host],
          instances: [],
        };
        level.surfaces.push({
          ...template,
          id,
          object: kind === "ground" ? rule.host : id,
          mesh: rule.host,
          kind: kind === "ground" ? "floor" : "prop",
          role: `ground-${finish}`,
          material,
          collidable: false,
          closed: false,
          domain: "visualization",
          assignment: undefined,
        });
        return level.surfaces.length - 1;
      },
      plan,
    },
    budget,
  );
}

/** Generates the patched ground of one described floor into the level's render mesh. */
export function dressGroundSite(
  level: CompiledArchitecture,
  site: GroundSite,
  budget: KitBudget,
): void {
  if (!site.faces.length) return;
  new GroundBuilder(level, site, budget).build();
}

/** Owns one host's deterministic patchwork, water, and supported small debris. */
class GroundBuilder {
  private level: CompiledArchitecture;
  private site: GroundSite;
  private faces: ReceivingFace[];
  private seams: Seam[];
  private budget: KitBudget;
  private options: GroundSettings;
  private seed: number;
  /** Elevation of the receiving faces, which the layout frame shares with the world. */
  private elevation: number;
  private surfaces = new Map<string, number>();
  private patchFaces: V3[][] = [];
  private boundaries: V3[][];
  private pieces: { points: V3[]; finish: Finish }[] = [];
  private paints: { polygon: V3[]; material: Paint }[] = [];
  private work = 0;
  private surfaceRepeats = new Map<number, number>();
  private grime: number;
  private wear: number;
  private layout: GroundLayout;
  private walls: GroundWall[];
  private lastTone?: { point: V3; patch: Patch; color: V3 };

  constructor(level: CompiledArchitecture, site: GroundSite, budget: KitBudget) {
    this.level = level;
    this.site = site;
    this.budget = budget;
    this.options = site.options;
    this.layout = site.layout;
    const inverse = this.layout.world.clone().invert();
    const local = (p: V3) =>
      new Vector3(...p).applyMatrix4(inverse).toArray() as V3;
    this.faces = site.faces.map((points) => ({ points: points.map(local) }));
    this.elevation = this.faces[0].points[0][2];
    this.seams = site.seams.map((seam) => seam.map(local) as Seam);
    this.walls = site.walls.map(({ host, seam }) => ({
      host,
      seam: seam.map(local) as Seam,
    }));
    this.seed = new Rng(site.seed).int(1, 2147483647);
    this.grime = site.grime;
    this.wear = site.wear;
    const edges = new Map<string, { points: V3[]; count: number }>();
    for (const face of this.faces)
      for (let i = 0; i < 3; i++) {
        const points = [face.points[i], face.points[(i + 1) % 3]];
        const key = points
          .map((p) => p.map((v) => Math.round(v * 1e6)).join(","))
          .sort()
          .join("/");
        const edge = edges.get(key);
        if (edge) edge.count++;
        else edges.set(key, { points, count: 1 });
      }
    this.boundaries = [...edges.values()]
      .filter((edge) => edge.count === 1)
      .map((edge) => edge.points);
  }

  /** Shared emitted count includes kit geometry interleaved with this ground pass. */
  private get triangleCount(): number {
    return this.site.survey?.triangleCount ?? this.level.mesh.surfaces.length;
  }

  /** Bounds work independently of mesh output, including sparse or very large receiving regions. */
  private charge() {
    aborted(this.budget.signal);
    if (
      ++this.work > 2_000_000 ||
      this.triangleCount >= this.budget.maximumTriangles
    )
      throw new Error("Ground dressing budget exceeded.");
  }

  /** Shares surfaces by finish so patch variety does not create hundreds of draw calls. */
  private surface(name: string, kind: "ground" | "detail" = "detail"): number {
    const key = `${kind}/${name}`;
    const previous = this.surfaces.get(key);
    if (previous !== undefined) return previous;
    const material = this.site.finishes.material(name);
    const index = this.site.surface(name, kind, material);
    this.surfaceRepeats.set(
      index,
      this.level.document.materials.find((m) => m.id === material)!.repeat,
    );
    this.surfaces.set(key, index);
    return index;
  }

  /** Construction axes keep neighboring pours joined at authored architectural landmarks. */
  private corner(x: number, y: number): V3 {
    return [this.layout.columns[x], this.layout.rows[y], 0];
  }

  /** Selects a broad finish zone independently of the individual pour's color and damage. */
  private zone(x: number, y: number): "tile" | "timber" | "concrete" {
    if (
      x < 0 ||
      y < 0 ||
      x + 1 >= this.layout.columns.length ||
      y + 1 >= this.layout.rows.length
    )
      return "concrete";
    const a = this.corner(x, y),
      b = this.corner(x + 1, y + 1);
    const zoneX = this.layout.zonesX.findLastIndex(
      (value) => value <= (a[0] + b[0]) / 2,
    );
    const zoneY = this.layout.zonesY.findLastIndex(
      (value) => value <= (a[1] + b[1]) / 2,
    );
    const roll = latticeHash(zoneX, zoneY, this.seed + 24);
    if (roll < this.options.tileShare) return "tile";
    if (roll < this.options.tileShare + this.options.timberShare)
      return "timber";
    return "concrete";
  }

  /** Samples a patch from its coordinates, independent of host iteration and optional feature counts. */
  private patch(pour: GroundPour): Patch {
    const { x, y, endX, endY } = pour;
    const rng = new Rng(`${this.seed}/${x}/${y}`);
    const polygon = [
      this.corner(x, y),
      this.corner(endX, y),
      this.corner(endX, endY),
      this.corner(x, endY),
    ];
    const center = polygon.reduce(
      (a, p) => a.map((v, i) => v + p[i] / 4) as V3,
      [0, 0, 0] as V3,
    );
    const repair = rng.next() < this.options.repairs;
    const zone = this.zone(x, y);
    const kind = zone === "concrete" && repair ? "repair" : zone;
    const tone = rng.float(repair ? 0.84 : 0.89, 1);
    const patch: Patch = {
      id: `${x}/${y}`,
      polygon,
      center,
      kind,
      tone: [tone * rng.float(0.97, 1), tone, tone * rng.float(0.94, 1)],
      phase: rng.float(0, 100),
      wet: this.options.wetness > 0,
      angle: (rng.int(0, 3) * Math.PI) / 2,
      cracks: [],
      wornEdges: [
        [x, y - 1],
        [endX, y],
        [x, endY],
        [x - 1, y],
      ].map(([nx, ny]) => this.zone(nx, ny) !== "tile"),
      pour,
      damage: [],
    };
    if (
      zone === "concrete" &&
      latticeHash(x, y, this.seed + 119) < this.options.asphalt
    ) {
      // Extend beyond the full pour, leaving a margin even after edge erosion.
      patch.asphalt = polygon.map(p => [
        p[0] + Math.sign(p[0] - center[0]) * 0.30,
        p[1] + Math.sign(p[1] - center[1]) * 0.30,
        0,
      ] as V3);
    }
    if (kind === "repair" || kind === "concrete") {
      const edge = rng.int(0, 3),
        start = polygon[edge].map(
          (v, i) => v * 0.6 + polygon[(edge + 1) % 4][i] * 0.4,
        ) as V3;
      const size = this.options.patchSize;
      const end: V3 = [
        center[0] + rng.float(-0.25, 0.25) * size,
        center[1] + rng.float(-0.25, 0.25) * size,
        0,
      ];
      const crack = Array.from(
        { length: 7 },
        (_, i) =>
          [
            start[0] +
              ((end[0] - start[0]) * i) / 6 +
              (i ? rng.float(-0.06, 0.06) * size : 0),
            start[1] +
              ((end[1] - start[1]) * i) / 6 +
              (i ? rng.float(-0.06, 0.06) * size : 0),
            0,
          ] as V3,
      );
      if (rng.next() < 0.6) patch.cracks.push(crack);
      if (rng.next() < 0.3)
        patch.cracks.push([
          crack[3],
          [
            crack[3][0] + rng.float(-0.2, 0.2) * size,
            crack[3][1] + rng.float(-0.2, 0.2) * size,
            0,
          ],
          end,
        ]);
    }
    return patch;
  }

  /** The shared bed has shallow depressions; GroundSurfaceField owns tile and plank thickness. */
  private height(p: V3, patch: Patch): number {
    const edge = Math.min(
      ...patch.polygon.map((a, i) =>
        groundEdgeDistance(p, a, patch.polygon[(i + 1) % 4]),
      ),
    );
    const texture = valueNoise(p[0] * 7.7, p[1] * 7.7, this.seed + 5);
    let value =
      0.06 +
      valueNoise(p[0] * 0.43, p[1] * 0.43, this.seed) * 0.5 +
      valueNoise(p[0] * 1.72, p[1] * 1.72, this.seed + 7) * 0.15 +
      texture * 0.045 -
      Math.exp(-edge / 0.012) * 0.035;
    const boundaryFade = Math.min(1, edge / 0.08);
    if (patch.asphalt)
      value +=
        boundaryFade *
        (valueNoise(p[0] * 13, p[1] * 13, this.seed + 121) - 0.5) *
        0.2;
    for (const damage of patch.damage) {
      const influence = Math.max(
        0,
        1 -
          Math.hypot(p[0] - damage.center[0], p[1] - damage.center[1]) /
            damage.radius,
      );
      value +=
        influence *
        boundaryFade *
        (valueNoise(p[0] * 21, p[1] * 21, this.seed + 124) * 0.22 - 0.3);
    }
    return Math.max(0, Math.min(1, value)) * this.options.relief;
  }

  /** Shares relief and dampness evaluation among material layers sampled at the same point. */
  private tone(p: V3, patch: Patch): V3 {
    const prior = this.lastTone;
    if (prior?.patch === patch && prior.point.every((value, axis) => value === p[axis])) return prior.color;
    const noise = valueNoise(p[0] * 2.3, p[1] * 2.3, this.seed + 3);
    const water = this.options.relief * (0.13 + this.options.wetness * 0.16);
    const wetEdge = Math.max(
      0,
      Math.min(
        1,
        (water + this.options.relief * 0.15 - this.height(p, patch)) /
          Math.max(0.001, this.options.relief * 0.2),
      ),
    );
    const damp = patch.wet ? 1 - wetEdge * 0.35 : 1;
    const color = weatherColor(p, this.grime, this.wear, patch.phase).map(
      (value, axis) => value * patch.tone[axis] * (0.85 + noise * 0.15) * damp,
    ) as V3;
    this.lastTone = { point: [...p], patch, color };
    return color;
  }

  /** Adds broad finish tone and unit color; source PBR maps retain aggregate-scale detail. */
  private color(p: V3, patch: Patch, finish: Finish | Paint): V3 {
    let tone = 1;
    if (["asphalt", "spall", "chip"].includes(finish))
      tone *= 0.92 + valueNoise(p[0] * 2.8, p[1] * 2.8, this.seed + 126) * 0.08;
    if (finish === "timber")
      tone *= 0.7 + 0.3 * valueNoise(p[0] * 26, p[1] * 0.6, this.seed + 4);
    if (finish === "tile")
      tone *=
        0.8 +
        latticeHash(
          Math.floor(p[0] / this.site.tileSize),
          Math.floor(p[1] / this.site.tileSize),
          this.seed,
        ) *
          0.2;
    if (finish === "asphalt") return [tone, tone, tone];
    return this.tone(p, patch).map(value => value * tone) as V3;
  }

  /** Emits real triangle normals and offset/rotated texture coordinates in linear vertex color. */
  private emit(points: V3[], surface: number, patch: Patch, colors: V3[]) {
    this.charge();
    const a = new Vector3(...points[0]),
      b = new Vector3(...points[1]),
      c = new Vector3(...points[2]);
    const cross = b.sub(a).cross(c.sub(a));
    if (cross.lengthSq() < 1e-24) return;
    const world = points.map(p => new Vector3(...p).applyMatrix4(this.layout.world).toArray() as V3);
    if (this.site.survey) {
      for (const point of world) this.site.survey.positions.push(point[0], point[1], point[2]);
      return;
    }
    const normal = cross.normalize().toArray() as V3;
    const repeat = this.surfaceRepeats.get(surface)!;
    const cosine = Math.cos(patch.angle),
      sine = Math.sin(patch.angle);
    triangle(
      this.level.mesh,
      world,
      new Vector3(...normal)
        .transformDirection(this.layout.world)
        .toArray() as V3,
      points.map((p) => [
        (p[0] * cosine - p[1] * sine) * repeat + patch.phase,
        (p[0] * sine + p[1] * cosine) * repeat + patch.phase * 0.37,
      ]),
      colors,
      surface,
    );
  }

  /** Returns where a sampled surface point is drawn: displaced by the relief, or flush with the floor. */
  private drawn(point: V3): V3 {
    return this.site.flush ? [point[0], point[1], this.elevation] : point;
  }

  /** Retains the already-displaced receiving plane while dividing its visible material. */
  private queueFinish(polygon: V3[], finish: Finish) {
    this.charge();
    this.pieces.push({ points: polygon, finish });
  }

  /** A shared height lattice precedes native-face, tile, and paint cuts, eliminating T-junction gaps. */
  private terrain(patch: Patch, faces: ReceivingFace[], x: number, y: number) {
    const lo = this.corner(x, y),
      hi = this.corner(x + 1, y + 1);
    const step = this.site.sampling;
    const nx = Math.max(1, Math.ceil((hi[0] - lo[0] - 1e-6) / step)),
      ny = Math.max(1, Math.ceil((hi[1] - lo[1] - 1e-6) / step));
    const elevation = faces[0].points[0][2];
    const point = (x: number, y: number): V3 => {
      const p: V3 = [
        lo[0] + ((hi[0] - lo[0]) * x) / nx,
        lo[1] + ((hi[1] - lo[1]) * y) / ny,
        elevation,
      ];
      return [p[0], p[1], elevation + this.height(p, patch)];
    };
    for (let x = 0; x < nx; x++)
      for (let y = 0; y < ny; y++) {
        const a = point(x, y),
          b = point(x + 1, y),
          c = point(x + 1, y + 1),
          d = point(x, y + 1);
        for (const triangle of [
          [a, b, c],
          [a, c, d],
        ])
          for (const face of faces) {
            this.charge();
            const polygon = intersectGround(triangle, face.points);
            if (!polygon.length) continue;
            this.patchFaces.push(polygon);
            this.finishPolygon(polygon, patch);
          }
      }
  }

  /** Registers continuous material fields over the original opaque receiving bed. */
  private renderPatch(patch: Patch, elevation: number, asphalt: V3[][]) {
    const serviceEdges = patch.manhole?.outer.map((point, index, polygon) => [point, polygon[(index + 1) % polygon.length]]) ?? [];
    const localAsphalt = asphalt.filter(region => {
      const margin = 0.22;
      return Math.min(...region.map(p => p[0])) <= Math.max(...patch.polygon.map(p => p[0])) + margin
        && Math.max(...region.map(p => p[0])) >= Math.min(...patch.polygon.map(p => p[0])) - margin
        && Math.min(...region.map(p => p[1])) <= Math.max(...patch.polygon.map(p => p[1])) + margin
        && Math.max(...region.map(p => p[1])) >= Math.min(...patch.polygon.map(p => p[1])) - margin;
    });
    const field = new GroundSurfaceField({
      seed: this.seed, kind: patch.kind, polygon: patch.polygon,
      asphalt: localAsphalt,
      deposits: this.paints, tileSize: this.site.tileSize,
      tileAspect: this.site.tileAspect, tileWear: this.site.tileWear ?? 0.9,
      tileGrime: this.site.tileGrime ?? this.grime, wornEdges: patch.wornEdges,
      angle: patch.angle, phase: patch.phase, relief: !this.site.flush && this.options.relief > 0, wear: this.wear,
      receivingEdges: [...this.boundaries, ...serviceEdges],
      material: finish => {
        const id = this.site.finishes.material(patch.kind === "tile" && finish === "substrate" ? "tile-bed" : finish);
        const material = this.level.document.materials.find(material => material.id === id)!;
        return { id, repeat: material.repeat, roughness: material.roughness };
      },
      color: (p, finish) => this.color([p[0], p[1], elevation], patch, finish as Finish | Paint),
    });
    const materialKey = field.materialKey(materialRecipeKey("ground-pigment/v1", {
      seed: this.seed, elevation, grime: this.grime, wear: this.wear, tileSize: this.site.tileSize,
      relief: this.options.relief, wetness: this.options.wetness,
      polygon: patch.polygon, tone: patch.tone, phase: patch.phase, wet: patch.wet,
      asphalt: !!patch.asphalt, damage: patch.damage.map(({ center, radius }) => ({ center, radius })),
    }));
    const bins = new Map<string, { points: V3[]; finish: Finish }[]>();
    for (const piece of this.pieces) {
      if (piece.finish.startsWith("manhole-")) {
        for (let i = 1; i + 1 < piece.points.length; i++) {
          const face = [piece.points[0], piece.points[i], piece.points[i + 1]];
          this.emit(face.map(p => this.drawn(p)), this.surface(piece.finish, "ground"), patch, face.map(p => this.color(p, patch, piece.finish)));
        }
        continue;
      }
      const bin = bins.get("patch") ?? [];
      bin.push(piece);
      bins.set("patch", bin);
    }
    const origin = new Vector3(0, 0, elevation).applyMatrix4(this.layout.world).toArray() as V3;
    const direction = (p: V3) => new Vector3(...p).transformDirection(this.layout.world).toArray() as V3;
    let defaultDensity = patch.kind === "tile" ? 256 : 16;
    if (localAsphalt.length > 0 && this.site.asphaltTextureDensity !== undefined)
      defaultDensity = Math.max(defaultDensity, this.site.asphaltTextureDensity);
    const textureDensity = this.site.textureDensity ?? defaultDensity;
    const preserve = !field.materials.some(id => this.level.document.materials.find(material => material.id === id)?.heightTexture);
    const rasterized = preserve || patch.kind === "tile";
    for (const [key, pieces] of bins) {
      const points = pieces.flatMap(piece => piece.points);
      const bounds: [number, number, number, number] = [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
      const firstTriangle = this.triangleCount;
      for (const piece of pieces) for (let i = 1; i + 1 < piece.points.length; i++) {
        const face = [piece.points[0], piece.points[i], piece.points[i + 1]];
        this.emit(face.map(p => this.drawn(p)), this.surface(piece.finish, "ground"), patch, face.map(() => [1, 1, 1]));
      }
      const triangleCount = this.triangleCount - firstTriangle;
      if (triangleCount && !this.site.survey) registerSurfaceChart(this.level, {
        id: `${this.site.host}/ground/${this.site.seed}/${origin.join(",")}/${elevation}/${patch.id}/${key}`, host: this.site.host,
        firstTriangle, triangleCount, bounds, elevationRange: [0, this.site.flush ? 0 : this.options.relief],
        frame: { origin, u: direction([1, 0, 0]), v: direction([0, 1, 0]), normal: direction([0, 0, 1]) },
        materials: field.materials, layerElevations: preserve ? undefined : field.layerElevations,
        sample: (u, v) => preserve ? field.rasterSample(u, v, 1 / textureDensity) : field.sample(u, v, rasterized ? 1 / textureDensity : 0),
        raster: rasterized ? { geometry: preserve ? "preserve" : undefined,
          group: `${this.site.seed}/${patch.id}`, bounds, texelsPerMeter: textureDensity,
          bump: "sample", materialKey } : undefined,
        appearanceTint: preserve ? undefined : (u, v, layer) => field.tint(u, v, layer), geometryStep: 0.055,
        featureScale: field.featureScale(bounds),
        constructionCuts: field.constructionCuts(bounds),
        uniformCoverage: area => field.uniformCoverage(area),
      });
    }
    // A transparent film sits over a retained opaque bed, only where depth exceeds 1.5 mm.
    if (patch.wet && this.options.relief > 0 && !this.site.flush) {
      const waterLevel = elevation + this.options.relief * (0.13 + this.options.wetness * 0.16);
      // Authored height maps can raise the retained bed. Reserve their maximum possible rise
      // here so a shallow film cannot intersect relief that is decoded in the later compiler stage.
      const sourceRise = Math.max(0, ...field.materials.map(id => {
        const material = this.level.document.materials.find(entry => entry.id === id)!;
        return material.heightTexture ? (material.heightScale ?? 0.01) + (material.heightOffset ?? 0) : 0;
      }));
      const maximumFinishRise = preserve ? 0 : field.layerElevations ? Math.max(0, ...field.layerElevations) : undefined;
      for (const piece of this.pieces) {
        if (piece.finish.startsWith("manhole-")) continue;
        let finishRise = maximumFinishRise;
        if (!preserve && field.layerElevations) {
          const area: [number, number, number, number] = [Math.min(...piece.points.map(p => p[0])), Math.min(...piece.points.map(p => p[1])),
            Math.max(...piece.points.map(p => p[0])), Math.max(...piece.points.map(p => p[1]))];
          if (field.uniformCoverage(area)) {
            const sample = field.sample((area[0] + area[2]) / 2, (area[1] + area[3]) / 2);
            const maximumWeight = Math.max(...sample.layers.map(layer => layer.weight));
            finishRise = Math.max(0, ...sample.layers.flatMap((layer, index) =>
              layer.weight >= maximumWeight - 1e-9 ? [field.layerElevations![index]] : []));
          }
        }
        const water = clipGround(piece.points, p => {
          // A constant upper bound protects against raised islands between the piece's vertices.
          const bed = p[2] - elevation + (finishRise ?? field.renderedHeight(p[0], p[1])) + sourceRise;
          const boundedBed = elevation + Math.max(0, Math.min(this.options.relief, bed));
          return waterLevel - boundedBed - 0.0015;
        });
        for (let i = 1; i + 1 < water.length; i++) this.emit(
          [water[0], water[i], water[i + 1]].map(p => [p[0], p[1], waterLevel]),
          this.surface("water-film", "detail"), patch, [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
        );
      }
    }
  }

  /** Closes displaced outer and hole rims against their unchanged native slab sides. */
  private closeEdges(patch: Patch, elevation: number) {
    const waterLevel =
      elevation + this.options.relief * (0.13 + this.options.wetness * 0.16);
    for (const polygon of this.patchFaces)
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i],
          b = polygon[(i + 1) % polygon.length];
        if (
          !this.boundaries.some(
            (edge) =>
              groundEdgeDistance(a, edge[0], edge[1]) < 1e-7 &&
              groundEdgeDistance(b, edge[0], edge[1]) < 1e-7,
          )
        )
          continue;
        const points = [a, b];
        if (patch.wet && (a[2] - waterLevel) * (b[2] - waterLevel) < 0) {
          const t = (waterLevel - a[2]) / (b[2] - a[2]);
          points.splice(1, 0, a.map((v, axis) => v + (b[axis] - v) * t) as V3);
        }
        for (let n = 0; n + 1 < points.length; n++) {
          const top = points
            .slice(n, n + 2)
            .map(
              (p) =>
                [
                  p[0],
                  p[1],
                  patch.wet ? Math.max(p[2], waterLevel) : p[2],
                ] as V3,
            );
          const bottom = top.map((p) => [p[0], p[1], elevation] as V3);
          for (const face of [
            [top[0], bottom[0], bottom[1]],
            [top[0], bottom[1], top[1]],
          ])
            this.emit(
              face,
              this.surface("edge"),
              patch,
              face.map(() => [0.8, 0.8, 0.8]),
            );
        }
      }
  }

  /** Partitions tile and board repairs into finish and joint regions, without overlapping layers. */
  private finishPolygon(polygon: V3[], patch: Patch) {
    if (patch.manhole) {
      const outer = splitGround(polygon, patch.manhole.outer);
      for (const outside of outer.outside) this.finishPavement(outside, patch);
      if (outer.inside.length) this.finishManhole(outer.inside, patch.manhole);
      return;
    }
    this.finishPavement(polygon, patch);
  }

  /** Material ownership is resolved by the shared field after the exact receiving footprint is retained. */
  private finishPavement(polygon: V3[], patch: Patch) {
    this.queueFinish(polygon, patch.kind);
  }

  /** Cuts a flush iron ring, planar lid and tread slots from the terrain, without stacked surfaces. */
  private finishManhole(polygon: V3[], cover: Manhole) {
    const divided = splitGround(polygon, cover.inner);
    const height = this.faces[0].points[0][2] + this.options.relief;
    for (let i = 0; i < cover.inner.length; i++) {
      const next = (i + 1) % cover.inner.length;
      const a = cover.inner[i],
        b = cover.inner[next];
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        length = Math.hypot(dx, dy);
      const sector = [cover.outer[i], cover.outer[next], b, a];
      const shoulder = (p: V3) =>
        height + (dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / length;
      for (const ring of divided.outside) {
        this.charge();
        const portion = intersectGround(ring, sector);
        if (!portion.length) continue;
        const original = clipGround(portion, (p) => p[2] - shoulder(p));
        const raised = clipGround(portion, (p) => shoulder(p) - p[2]);
        if (Math.abs(groundArea(original)) > 1e-10)
          this.queueFinish(original, "manhole-rim");
        if (Math.abs(groundArea(raised)) > 1e-10)
          this.queueFinish(
            raised.map((p) => [p[0], p[1], shoulder(p)]),
            "manhole-rim",
          );
      }
    }
    if (!divided.inside.length) return;
    let regions: { points: V3[]; finish: Finish }[] = [
      {
        points: divided.inside.map((p) => [p[0], p[1], height]),
        finish: "manhole-cover",
      },
    ];
    const [x, y] = cover.center;
    const slots = Array.from({ length: 7 }, (_, i) =>
      groundRectangle(x - 0.36, y - 0.285 + i * 0.09, 0.72, 0.014),
    );
    slots.push(
      groundRectangle(x - 0.24, y - 0.035, 0.055, 0.07),
      groundRectangle(x + 0.185, y - 0.035, 0.055, 0.07),
    );
    for (const slot of slots) {
      const next: typeof regions = [];
      for (const region of regions) {
        this.charge();
        if (region.finish === "manhole-slot") {
          next.push(region);
          continue;
        }
        const cut = splitGround(region.points, slot);
        next.push(
          ...cut.outside.map((points) => ({ points, finish: region.finish })),
        );
        if (cut.inside.length)
          next.push({ points: cut.inside, finish: "manhole-slot" });
      }
      regions = next;
    }
    for (const region of regions)
      this.queueFinish(region.points, region.finish);
  }

  /** A convex circular footprint; irregularity stays small enough to preserve clipping validity. */
  private disk(center: V3, radius: number, count: number, rng?: Rng): V3[] {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i * Math.PI * 2) / count,
        r = radius * (rng?.float(0.93, 1) ?? 1);
      return [
        center[0] + Math.cos(angle) * r,
        center[1] + Math.sin(angle) * r,
        0,
      ];
    });
  }

  /** Plans service access only on complete supported footprints, clear of walls and pour boundaries. */
  private planManhole(patch: Patch, faces: ReceivingFace[]) {
    if (this.options.manholes === 0) return;
    const rng = new Rng(`${this.seed}/${patch.id}/manhole`);
    const [lo, , hi] = patch.polygon,
      width = hi[0] - lo[0],
      depth = hi[1] - lo[1];
    if (
      Math.min(width, depth) < 1.12 ||
      rng.next() > 1 - Math.exp((-width * depth * this.options.manholes) / 24)
    )
      return;
    for (let attempt = 0; attempt < 5; attempt++) {
      const center: V3 = [
        rng.float(lo[0] + 0.56, hi[0] - 0.56),
        rng.float(lo[1] + 0.56, hi[1] - 0.56),
        0,
      ];
      const outer = this.disk(center, 0.44, 32);
      if (
        !this.supported(this.disk(center, 0.56, 32), faces) ||
        this.walls.some(
          ({ seam }) => groundEdgeDistance(center, ...seam) < 0.56,
        )
      )
        continue;
      patch.manhole = { center, outer, inner: this.disk(center, 0.375, 32) };
      return;
    }
  }

  /** Locates larger spalls in confined passages and beside contacts, using actual finite wall pairs. */
  private planDamage(patch: Patch) {
    if (
      this.options.breakup === 0 ||
      patch.asphalt ||
      !["concrete", "repair"].includes(patch.kind)
    )
      return;
    const { x, y, endX, endY } = patch.pour;
    for (let cx = x; cx < endX; cx++)
      for (let cy = y; cy < endY; cy++) {
        const rng = new Rng(`${this.seed}/${cx}/${cy}/breakup`);
        const lo = this.corner(cx, cy),
          hi = this.corner(cx + 1, cy + 1);
        let best: { point: V3; bias: number } | undefined;
        for (let sample = 0; sample < 4; sample++) {
          const point: V3 = [
            rng.float(lo[0] + 0.06, hi[0] - 0.06),
            rng.float(lo[1] + 0.06, hi[1] - 0.06),
            0,
          ];
          const exposure = groundExposure(point, this.walls, () =>
            this.charge(),
          );
          const wall = Math.max(0, 1 - exposure.wallDistance / 0.9);
          const narrow = Math.max(
            0,
            Math.min(1, (3 - exposure.corridorWidth) / 2),
          );
          const bias = wall * 0.45 + narrow * 0.5;
          if (!best || bias > best.bias) best = { point, bias };
        }
        if (!best || rng.next() > this.options.breakup * (0.04 + best.bias))
          continue;
        const radius = rng.float(0.18, 0.32) + best.bias * 0.48;
        const aspect = rng.float(0.7, 0.9);
        patch.damage.push({
          center: best.point,
          radius,
          polygon: [
            [-1, -0.45],
            [-0.65, -0.9],
            [0.55, -0.8],
            [1, -0.3],
            [0.82, 0.72],
            [-0.45, 0.9],
            [-0.95, 0.35],
          ].map(
            ([x, y]) =>
              [
                best!.point[0] + x * radius,
                best!.point[1] + y * radius * aspect,
                0,
              ] as V3,
          ),
        });
      }
  }

  /** Checks the complete footprint area, so litter cannot bridge a hole or cross an assigned face. */
  private supported(polygon: V3[], faces: ReceivingFace[]): boolean {
    const area = Math.abs(groundArea(polygon));
    const covered = faces.reduce(
      (sum, face) =>
        sum + Math.abs(groundArea(intersectGround(polygon, face.points))),
      0,
    );
    return area > 1e-8 && Math.abs(area - covered) < 1e-7;
  }

  /** Records material footprints; they are split into the pavement rather than floated above it. */
  private detail(polygon: V3[], patch: Patch, name: Paint) {
    const clipped = intersectGround(polygon, patch.polygon);
    if (clipped.length) this.paints.push({ polygon: clipped, material: name });
  }

  /** Straight pour divisions retain narrow, irregularly worn edges instead of razor-sharp color changes. */
  private joints(patch: Patch) {
    for (let edge = 0; edge < 4; edge++) {
      const a = patch.polygon[edge],
        b = patch.polygon[(edge + 1) % 4];
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        length = Math.hypot(dx, dy);
      const count = Math.ceil(length / jointRun(this.site.sampling));
      for (let n = 0; n < count; n++) {
        const p = a.map((v, i) => v + ((b[i] - v) * n) / count) as V3;
        const q = a.map((v, i) => v + ((b[i] - v) * (n + 1)) / count) as V3;
        const inset = (point: V3): V3 => {
          const width =
            0.004 +
            valueNoise(point[0] * 9, point[1] * 9, this.seed + 68) * 0.011;
          return [
            point[0] - (dy / length) * width,
            point[1] + (dx / length) * width,
            0,
          ];
        };
        this.detail([p, q, inset(q), inset(p)], patch, "joint");
      }
    }
  }

  /** Adds localized chips, construction joints and fine cracks. */
  private aging(patch: Patch) {
    for (let i = 0; i < patch.damage.length; i++) {
      const damage = patch.damage[i],
        rng = new Rng(`${this.seed}/${patch.id}/chips/${i}`);
      this.detail(damage.polygon, patch, "spall");
      const cutX = rng.float(-0.25, 0.25) * damage.radius + damage.center[0];
      const cutY = rng.float(-0.25, 0.25) * damage.radius + damage.center[1];
      const xs = [
        damage.center[0] - damage.radius,
        cutX,
        damage.center[0] + damage.radius,
      ];
      const ys = [
        damage.center[1] - damage.radius,
        cutY,
        damage.center[1] + damage.radius,
      ];
      for (let x = 0; x < 2; x++)
        for (let y = 0; y < 2; y++) {
          if (rng.next() < 0.2) continue;
          const fragment = intersectGround(
            damage.polygon,
            groundRectangle(xs[x], ys[y], xs[x + 1] - xs[x], ys[y + 1] - ys[y]),
          );
          if (!fragment.length) continue;
          const center = fragment.reduce(
            (a, p) => a.map((v, i) => v + p[i] / fragment.length) as V3,
            [0, 0, 0] as V3,
          );
          const remaining = rng.float(0.72, 0.91);
          const chip = fragment.map(
            (p) =>
              p.map((v, i) => center[i] + (v - center[i]) * remaining) as V3,
          );
          this.detail(chip, patch, "chip");
        }
    }
    const jointed = patch.kind === "concrete" || patch.kind === "repair";
    if (this.site.fineMarks && jointed) this.joints(patch);
    for (const crack of this.site.fineMarks ? patch.cracks : [])
      for (let i = 0; i + 1 < crack.length; i++) {
        const a = crack[i],
          b = crack[i + 1];
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const dx = ((b[1] - a[1]) / length) * 0.004,
          dy = ((a[0] - b[0]) / length) * 0.004;
        this.detail(
          [
            [a[0] + dx, a[1] + dy, 0],
            [a[0] - dx, a[1] - dy, 0],
            [b[0] - dx * 0.25, b[1] - dy * 0.25, 0],
            [b[0] + dx * 0.25, b[1] + dy * 0.25, 0],
          ],
          patch,
          "crack",
        );
      }
  }

  /** Places small litter on fully supported footprints, with denser clusters beside contacts. */
  private debris(patch: Patch, faces: ReceivingFace[]) {
    if (this.options.litter === 0) return;
    const rng = new Rng(`${this.seed}/${patch.id}/litter`);
    const size = this.options.patchSize;
    for (let i = 0; i < 9; i++) {
      const p: V3 = [
        patch.center[0] + rng.float(-0.45, 0.45) * size,
        patch.center[1] + rng.float(-0.45, 0.45) * size,
        faces[0].points[0][2],
      ];
      if (
        patch.manhole &&
        Math.hypot(
          p[0] - patch.manhole.center[0],
          p[1] - patch.manhole.center[1],
        ) < 0.65
      )
        continue;
      const edge = this.seams.reduce((distance, seam) => Math.min(distance, seamDistance(p, seam)), Infinity);
      if (
        rng.next() > this.options.litter * (edge < 0.8 ? 0.8 : 0.17) ||
        edge < 0.12
      )
        continue;
      const width = rng.float(0.055, 0.2),
        depth = rng.float(0.06, 0.21),
        angle = rng.float(0, Math.PI * 2);
      const transform = new Matrix4()
        .makeRotationZ(angle)
        .setPosition(p[0], p[1], 0);
      const footprint = groundRectangle(
        -width / 2,
        -depth / 2,
        width,
        depth,
      ).map(
        (point) =>
          new Vector3(...point).applyMatrix4(transform).toArray() as V3,
      );
      if (
        !this.supported(footprint, faces) ||
        Math.abs(
          groundArea(intersectGround(footprint, patch.polygon)) -
            groundArea(footprint),
        ) > 1e-7
      )
        continue;
      const supported = this.patchFaces.flatMap((face) =>
        intersectGround(face, footprint),
      );
      const base =
        Math.max(...supported.map((point) => this.drawn(point)[2])) + 0.001;
      const name = `ground/litter/${patch.id.replaceAll("/", "-")}/${i}`;
      const type = rng.next();
      if (type < 0.6) {
        const points = footprint.map(
          (point, n) =>
            [
              point[0],
              point[1],
              base + (n === 1 ? rng.float(0.004, 0.02) : 0),
            ] as V3,
        );
        const center: V3 = [p[0], p[1], base + rng.float(0.004, 0.012)];
        for (let n = 0; n < 4; n++)
          this.emit(
            [center, points[n], points[(n + 1) % 4]],
            this.surface("paper"),
            patch,
            [
              [1, 1, 1],
              [0.8, 0.8, 0.8],
              [1, 1, 1],
            ],
          );
      } else {
        transform.setPosition(p[0], p[1], base);
        const kit = new KitGeometry(
          this.level,
          this.site.host,
          this.layout.world.clone().multiply(transform),
          this.site.layer,
          this.budget,
          this.site.survey,
        );
        const height = rng.float(0.018, 0.045);
        kit.box(
          name,
          [-width / 2, -depth / 2, 0],
          [width, depth, height],
          this.site.finishes.material(type < 0.85 ? "brick" : "can"),
          [0.8, 0.8, 0.8],
          "ground-litter",
        );
      }
    }
  }

  /** Processes bounded spatial cells, preserving holes, elevations and explicit face assignments. */
  build() {
    const world = (point: V3) =>
      new Vector3(...point).applyMatrix4(this.layout.world).toArray() as V3;
    const plan = this.site.plan;
    plan?.anchors.push(
      ...this.layout.anchors.map((anchor) => ({
        ...anchor,
        point: world(anchor.point),
      })),
    );
    const patches = groundPours(
      this.layout,
      this.seed,
      this.options.joinedPours,
    ).map(pour => this.patch(pour));
    const asphalt = patches.flatMap(patch => patch.asphalt ? [patch.asphalt] : []);
    for (const patch of patches) {
      this.charge();
      const pour = patch.pour;
      this.patchFaces = [];
      this.pieces = [];
      this.paints = [];
      const faces: ReceivingFace[] = [];
      const footprint: V3[][] = [];
      for (const face of this.faces) {
        this.charge();
        const clipped = intersectGround(face.points, patch.polygon);
        if (!clipped.length) continue;
        faces.push(face);
        footprint.push(clipped.map(world));
      }
      if (!faces.length) continue;
      plan?.regions.push({
        id: patch.id,
        kind: patch.asphalt ? "asphalt" : patch.kind,
        bounds: patch.polygon.map((p) =>
          world([p[0], p[1], faces[0].points[0][2]]),
        ),
        footprint,
      });
      this.planManhole(patch, faces);
      this.planDamage(patch);
      for (let x = pour.x; x < pour.endX; x++)
        for (let y = pour.y; y < pour.endY; y++)
          this.terrain(patch, faces, x, y);
      this.aging(patch);
      this.renderPatch(patch, faces[0].points[0][2], asphalt);
      // A flush surface has no displaced rim to close against the slab sides.
      if (!this.site.flush) this.closeEdges(patch, faces[0].points[0][2]);
      this.debris(patch, faces);
    }
  }
}
