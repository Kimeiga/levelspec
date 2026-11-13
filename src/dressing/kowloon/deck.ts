import type { CompiledArchitecture, V3 } from "../../architecture/types.ts";
import type { KitBudget } from "../geometry.ts";
import {
  GroundFinishes,
  dressGroundSite,
  type GroundSettings,
} from "../ground.ts";
import { footprintLayout } from "../ground-layout.ts";
import type { KitMesh } from "../kit-mesh.ts";
import type { Seam } from "../seams.ts";

/**
 * How a tenement roof terrace is paved: screed bays with repairs, felt laid
 * over leaking bays, an occasional tiled stretch, grime along the parapets
 * and ponding. Loose litter, service covers and traffic-broken concrete
 * belong to streets; the rooftop kit furnishes roofs.
 */
const TERRACE: GroundSettings = {
  patchSize: 2.4,
  materialSize: 6,
  relief: 0.03,
  wetness: 0.35,
  litter: 0,
  repairs: 0.6,
  tileShare: 0.12,
  timberShare: 0,
  joinedPours: 0.6,
  asphalt: 0.4,
  manholes: 0,
  breakup: 0,
};

/** Terrace tiles are quarry red, unlike the glazed tiles of street paving. */
const TERRACE_COLORS = { tile: "#a8674c" };

/** Finest and coarsest spacing at which a deck is sampled, meters; larger decks are sampled more coarsely. */
const DECK_SAMPLING = { finest: 0.7, coarsest: 1.3 };
/** Deck area sampled at the finest spacing, square meters. */
const SMALL_DECK = 40;
/** Edge length of terrace paving tiles, meters: larger than street tiles, which keeps a tiled deck affordable. */
const TERRACE_TILE = 0.5;

/** What the decks of one building share. */
export interface DeckSettings {
  /** AML object the building descends from. */
  host: string;
  layer: string;
  /** Seed path of the building. */
  seed: string;
  grime: number;
  wear: number;
  /** Declared material the paving derives its finishes from. */
  screed: string;
  /** Declared roofing material laid as felt patches, used as authored; the ground kit's own asphalt when omitted. */
  felt?: string;
  /** Adds joint lines, hairline cracks and tile grout to the same paving. */
  fineMarks: boolean;
}

/**
 * Paves the roof decks of one building with the shared ground pass, so decks
 * get the pours, patches and puddles of dressed street ground. Decks
 * paved in the same screed share their finish materials across buildings, and
 * all decks of a building share its `roof` render surfaces.
 */
export class Decks {
  private readonly level: CompiledArchitecture;
  private readonly mesh: KitMesh;
  private readonly settings: DeckSettings;
  private readonly budget: KitBudget;
  private readonly finishes: GroundFinishes;

  constructor(
    level: CompiledArchitecture,
    mesh: KitMesh,
    settings: DeckSettings,
    budget: KitBudget,
  ) {
    this.level = level;
    this.mesh = mesh;
    this.settings = settings;
    this.budget = budget;
    this.finishes = new GroundFinishes(
      level,
      `$deck/${settings.screed}`,
      settings.screed,
      settings.felt === undefined ? {} : { asphalt: settings.felt },
      TERRACE_COLORS,
    );
  }

  /**
   * Paves one convex deck. `corners` run around its perimeter in world
   * meters at one elevation; the deck is drawn
   * flat at that elevation so the walls around it meet it flush. `key` names
   * the deck within the building for seeding.
   */
  lay(key: string, corners: V3[]): void {
    const { settings } = this;
    const doubledArea = corners.reduce((sum, p, i) => {
      const q = corners[(i + 1) % corners.length];
      return sum + p[0] * q[1] - q[0] * p[1];
    }, 0);
    // A mirrored building lists its corners clockwise; the ground pass expects them counterclockwise.
    const loop = doubledArea < 0 ? [...corners].reverse() : corners;
    const edges = loop.map(
      (corner, i): Seam => [corner, loop[(i + 1) % loop.length]],
    );
    // Larger decks are seen from further off: their bays grow and they are sampled more coarsely.
    const scale = Math.sqrt(Math.abs(doubledArea) / 2 / SMALL_DECK);
    const sampling = Math.max(
      DECK_SAMPLING.finest,
      Math.min(DECK_SAMPLING.coarsest, DECK_SAMPLING.finest * scale),
    );
    const options: GroundSettings = {
      ...TERRACE,
      patchSize: Math.max(TERRACE.patchSize, Math.min(4, TERRACE.patchSize * scale)),
      materialSize: Math.max(TERRACE.materialSize, Math.min(10, TERRACE.materialSize * scale)),
    };
    dressGroundSite(
      this.level,
      {
        host: settings.host,
        seed: `${settings.seed}/${key}/deck`,
        layout: footprintLayout(
          [loop],
          options.patchSize,
          options.materialSize,
        ),
        faces: loop.slice(1, -1).map((point, i) => [loop[0], point, loop[i + 2]]),
        seams: edges,
        walls: edges.map((seam, i) => ({ host: `${key}/edge-${i}`, seam })),
        options,
        grime: settings.grime,
        wear: settings.wear,
        finishes: this.finishes,
        sampling,
        tileSize: TERRACE_TILE,
        fineMarks: settings.fineMarks,
        flush: true,
        survey: this.mesh.survey,
        layer: settings.layer,
        surface: (finish, _kind, material) =>
          this.mesh.finished("roof", `deck-${finish}`, material),
      },
      this.budget,
    );
  }
}
