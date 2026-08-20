/**
 * Biomes.
 *
 * The compiler stays theme-agnostic — it emits semantic roles, not colours. A
 * theme is two things: a palette the renderer reads, and a set of decoration
 * rules the generator reads. That split is what lets the same layout come out
 * as a foundry or an ice station without touching a single coordinate.
 *
 * Everything visual here is built from the primitives the compiler already
 * has: boxes with a role, spaces with an elevation, covers with a lift. A
 * colonnade is an arc of covers. A catwalk is a layer with a railing. A
 * hanging beam is a cover with `z_offset` above head height.
 */

export interface ThemePalette {
  /** Per-role colour overrides, keyed by `SolidRole`. */
  roles: Record<string, number>;
  fog: number;
  fogNear: number;
  fogFar: number;
  sky: number;
  sun: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  /** Roles drawn with emission, for strip lighting and hazard glow. */
  emissive?: Record<string, { color: number; intensity: number }>;
  grid: { line: number; alpha: number };
}

export interface ThemeDecor {
  /** Chance a room gets a colonnade of pillars round its edge. */
  colonnade: number;
  /** Chance a room gets a hanging beam grid overhead. */
  beams: number;
  /** Chance a lane gets a low cover run down the middle. */
  centreCover: number;
  /** Density of scattered crates, 0..1. */
  clutter: number;
  /** Chance the level grows floating platforms you can fight from. */
  floaters: number;
  /** Chance an open boundary becomes an arch of pillars rather than nothing. */
  arches: number;
  pillarHeight: [number, number];
  crateHeight: [number, number];
}

/** A single map's look, as produced by tools/build_palettes.ts. */
export interface MapLook {
  roles: Record<string, number>;
  sky: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  sun: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  grid: { line: number; alpha: number; scale: number };
  surface: { roughness: number; metalness: number };
  daylight: boolean;
  /** One line on what the place is made of, for the hand-authored entries. */
  look?: string;
  /**
   * What stands on this map's horizon, by name.
   *
   * The one part of the surroundings the floorplan cannot imply: no
   * arrangement of the space around Nuke will ever produce a cooling tower.
   * See LANDMARKS in the game's scenery for the names that build something.
   */
  skyline?: string[];
  /**
   * How the surrounding buildings are fenestrated.
   *
   * `punched` is small dark openings in a solid wall — an old town. `banded`
   * is continuous glazing — offices, control rooms, anything post-war.
   * `industrial` is ribbed cladding with hardly any openings at all. It is the
   * single cheapest thing that stops two maps of the same colour reading as
   * the same place.
   */
  facade?: 'punched' | 'banded' | 'industrial';
  /** Whether the surrounding roofs are flat or tiled and pitched. */
  roofs?: 'flat' | 'pitched';
  /**
   * Which building types the surrounding town is made of.
   *
   * Names from the game's building vocabulary — `setback`, `tower`, `drum`,
   * `chamfer`, `curved`, `pagoda`, `sawtooth`, `barrel`, `signboard`,
   * `helipad`, `gable`, `arcade`. A hill town and a rail yard and a Tokyo
   * street corner are different lists, which is most of what stops them
   * reading as the same place in different colours.
   */
  blocks?: string[];
  /** The colour signage, glazing bands and roof tiles are picked out in. */
  accent?: number;
  curated?: boolean;
}

export interface Theme {
  id: string;
  name: string;
  blurb: string;
  palette: ThemePalette;
  decor: ThemeDecor;
  /** Wall thickness and storey height read differently per biome. */
  wallThickness: number;
  ceiling: [number, number];
  /** How surfaces are finished. Set per map from its own look. */
  surface?: { roughness: number; metalness: number };
  /** Size of a masonry unit in metres — what makes stone read unlike panelling. */
  gridScale?: number;
  /** What stands on the horizon; see MapLook.skyline. */
  skyline?: string[];
  /** How the surrounding buildings are fenestrated; see MapLook.facade. */
  facade?: 'punched' | 'banded' | 'industrial';
  /** Whether the surrounding roofs are flat or tiled and pitched. */
  roofs?: 'flat' | 'pitched';
  /** Which building types the surrounding town is made of; see MapLook.blocks. */
  blocks?: string[];
  /** The colour signage, glazing bands and roof tiles are picked out in. */
  accent?: number;
  /** Whether this map is lit by the sun; signage only glows when it is not. */
  daylight?: boolean;
}

const base = (over: Partial<ThemePalette>): ThemePalette => ({
  roles: {},
  fog: 0x121824,
  fogNear: 30,
  fogFar: 150,
  sky: 0x121824,
  sun: 0xfff4e2,
  sunIntensity: 2.0,
  hemiSky: 0xd6e6ff,
  hemiGround: 0x3b352c,
  hemiIntensity: 2.1,
  grid: { line: 0x000000, alpha: 0.2 },
  ...over,
});

export const THEMES: Theme[] = [
  {
    id: 'foundry',
    name: 'Foundry',
    blurb: 'Rolling mills and slag. Everything is hot and orange and too loud.',
    wallThickness: 0.3,
    ceiling: [4.2, 5.4],
    palette: base({
      roles: {
        floor: 0x4a4038,
        roof: 0x322b26,
        static_hard: 0x8a6f56,
        exterior_wall: 0x6d5340,
        riser: 0x5d4736,
        stair: 0x7a6350,
        ramp: 0x7a6350,
        cover: 0x9c5a2a,
        soft_panel: 0xc47a35,
        glass: 0xffb066,
      },
      fog: 0x1d1209,
      sky: 0x1d1209,
      fogNear: 22,
      fogFar: 110,
      sun: 0xffb066,
      sunIntensity: 2.2,
      hemiSky: 0xffb37a,
      hemiGround: 0x2a1608,
      hemiIntensity: 1.7,
      emissive: { glass: { color: 0xff7a1a, intensity: 1.6 } },
      grid: { line: 0x000000, alpha: 0.26 },
    }),
    decor: { colonnade: 0.5, beams: 0.6, centreCover: 0.5, clutter: 0.8, floaters: 0.15, arches: 0.4, pillarHeight: [3.2, 4.4], crateHeight: [0.9, 1.6] },
  },
  {
    id: 'cryo',
    name: 'Cryo Station',
    blurb: 'Frost on the glass and not enough light. Long sightlines, cold floors.',
    wallThickness: 0.24,
    ceiling: [3.6, 4.6],
    palette: base({
      roles: {
        floor: 0x60707e,
        roof: 0x44525d,
        static_hard: 0x9fb4c4,
        exterior_wall: 0x7e93a3,
        riser: 0x738696,
        stair: 0x8ea3b3,
        ramp: 0x8ea3b3,
        cover: 0x5f8296,
        soft_panel: 0xa8c8dc,
        glass: 0xbfeaff,
      },
      fog: 0x0d1720,
      sky: 0x0d1720,
      fogNear: 26,
      fogFar: 130,
      sun: 0xd8f0ff,
      sunIntensity: 1.9,
      hemiSky: 0xcfe8ff,
      hemiGround: 0x1b2b38,
      hemiIntensity: 2.3,
      emissive: { glass: { color: 0x8fdcff, intensity: 0.9 } },
      grid: { line: 0x001428, alpha: 0.22 },
    }),
    decor: { colonnade: 0.35, beams: 0.4, centreCover: 0.45, clutter: 0.55, floaters: 0.3, arches: 0.5, pillarHeight: [2.8, 3.6], crateHeight: [0.9, 1.4] },
  },
  {
    id: 'sandstone',
    name: 'Sandstone',
    blurb: 'Sun-bleached courtyards and thick shade. You can see a long way here.',
    wallThickness: 0.36,
    ceiling: [4.5, 6.0],
    palette: base({
      roles: {
        floor: 0xb8a684,
        roof: 0x9c8a69,
        static_hard: 0xd8c39a,
        exterior_wall: 0xc9b088,
        riser: 0xbfa87f,
        stair: 0xcbb894,
        ramp: 0xcbb894,
        cover: 0x9d7f52,
        soft_panel: 0xe0c9a0,
        glass: 0xcfe6ff,
      },
      fog: 0xd9c9a6,
      sky: 0xd9c9a6,
      fogNear: 50,
      fogFar: 220,
      sun: 0xfff1cf,
      sunIntensity: 2.6,
      hemiSky: 0xfff0d0,
      hemiGround: 0x8a7550,
      hemiIntensity: 2.4,
      grid: { line: 0x3a2c14, alpha: 0.16 },
    }),
    decor: { colonnade: 0.65, beams: 0.2, centreCover: 0.4, clutter: 0.5, floaters: 0.05, arches: 0.7, pillarHeight: [3.4, 5.0], crateHeight: [1.0, 1.5] },
  },
  {
    id: 'overgrown',
    name: 'Overgrown',
    blurb: 'Something used to run here. Now it is roots and standing water.',
    wallThickness: 0.28,
    ceiling: [3.8, 5.0],
    palette: base({
      roles: {
        floor: 0x4a5442,
        roof: 0x333c30,
        static_hard: 0x6f7c5e,
        exterior_wall: 0x5c6a4c,
        riser: 0x55624a,
        stair: 0x66735a,
        ramp: 0x66735a,
        cover: 0x5c7a3c,
        soft_panel: 0x84955f,
        glass: 0x9fd6a0,
      },
      fog: 0x121a12,
      sky: 0x121a12,
      fogNear: 20,
      fogFar: 100,
      sun: 0xd6f0b0,
      sunIntensity: 1.7,
      hemiSky: 0xbfe3a8,
      hemiGround: 0x1d2618,
      hemiIntensity: 2.0,
      emissive: { glass: { color: 0x7fffa0, intensity: 0.7 } },
      grid: { line: 0x0a1408, alpha: 0.24 },
    }),
    decor: { colonnade: 0.45, beams: 0.5, centreCover: 0.6, clutter: 0.9, floaters: 0.25, arches: 0.35, pillarHeight: [2.6, 4.2], crateHeight: [0.8, 1.6] },
  },
  {
    id: 'void',
    name: 'Void Terminal',
    blurb: 'Platforms hanging in nothing, joined by light. Mind the edges.',
    wallThickness: 0.26,
    ceiling: [4.0, 5.5],
    palette: base({
      roles: {
        floor: 0x2a2540,
        roof: 0x1c1830,
        static_hard: 0x554a80,
        exterior_wall: 0x3f3763,
        riser: 0x483e6e,
        stair: 0x5b4f8c,
        ramp: 0x5b4f8c,
        cover: 0x7a5ab8,
        soft_panel: 0x8f6fd0,
        glass: 0xc9a7ff,
      },
      fog: 0x07060f,
      sky: 0x07060f,
      fogNear: 24,
      fogFar: 140,
      sun: 0xc0a8ff,
      sunIntensity: 1.5,
      hemiSky: 0xa992ff,
      hemiGround: 0x120c22,
      hemiIntensity: 1.9,
      emissive: { glass: { color: 0xb98cff, intensity: 2.0 }, riser: { color: 0x6a4fd0, intensity: 0.5 } },
      grid: { line: 0x120a28, alpha: 0.3 },
    }),
    decor: { colonnade: 0.3, beams: 0.35, centreCover: 0.35, clutter: 0.4, floaters: 0.75, arches: 0.3, pillarHeight: [3.0, 5.0], crateHeight: [0.9, 1.5] },
  },
  {
    id: 'bunker',
    name: 'Bunker',
    blurb: 'Poured concrete, low ceilings, and corners you should check twice.',
    wallThickness: 0.34,
    ceiling: [3.3, 4.0],
    palette: base({
      roles: {
        floor: 0x5a5a5a,
        roof: 0x3e3e3e,
        static_hard: 0x8d8d8d,
        exterior_wall: 0x6f6f6f,
        riser: 0x676767,
        stair: 0x7c7c7c,
        ramp: 0x7c7c7c,
        cover: 0x6d6a5e,
        soft_panel: 0xa89a7d,
        glass: 0xa8c4c4,
      },
      fog: 0x0f1113,
      sky: 0x0f1113,
      fogNear: 16,
      fogFar: 80,
      sun: 0xf0efe6,
      sunIntensity: 1.5,
      hemiSky: 0xbfc6cc,
      hemiGround: 0x22221f,
      hemiIntensity: 1.7,
      emissive: { glass: { color: 0xffd98a, intensity: 1.2 } },
      grid: { line: 0x000000, alpha: 0.28 },
    }),
    decor: { colonnade: 0.55, beams: 0.7, centreCover: 0.55, clutter: 0.75, floaters: 0.05, arches: 0.45, pillarHeight: [3.0, 3.6], crateHeight: [0.9, 1.5] },
  },
];

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
