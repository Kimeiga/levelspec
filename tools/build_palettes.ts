/**
 * Build the per-map look table.
 *
 * Two sources, merged. `palettes.json` is derived from each map's screenshot
 * and covers everything; `curated.json` is hand-authored for the maps people
 * recognise, and wins wherever it has an opinion. The point of the split is
 * that a k-means over a photograph gets an unfamiliar map plausibly close and
 * gets a famous one wrong in a way you notice immediately — a screenshot of
 * Dust II is mostly sky and shadow, so the automatic answer for its floor was
 * blue-grey.
 *
 * Two corrections are applied to the automatic entries, because "the colours
 * in the photograph" and "colours you can fight in" are not the same set:
 * floor and wall are pushed apart until they are actually distinguishable, and
 * anything desaturated toward grey is nudged back toward its own hue so a
 * hundred maps do not converge on beige.
 *
 *   node tools/build_palettes.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Sources live apart from generated maps, so a rebuild cannot eat them.
const dir = join(import.meta.dirname, '../looks');

type Rgb = [number, number, number];

const toRgb = (hex: string | number): Rgb => {
  const n = typeof hex === 'number' ? hex : parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c: Rgb): number =>
  ((Math.round(clamp(c[0])) << 16) | (Math.round(clamp(c[1])) << 8) | Math.round(clamp(c[2]))) >>> 0;
const clamp = (v: number): number => Math.max(0, Math.min(255, v));

function toHsl([r, g, b]: Rgb): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = 0;
  if (mx === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
  else if (mx === G) h = ((B - R) / d + 2) / 6;
  else h = ((R - G) / d + 4) / 6;
  return [h, s, l];
}

function fromHsl(h: number, s: number, l: number): Rgb {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

const lightness = (hex: number): number => toHsl(toRgb(hex))[2];

/** Push a colour's lightness and saturation, keeping its hue. */
function tune(hex: number, dl: number, ds: number): number {
  const [h, s, l] = toHsl(toRgb(hex));
  return toHex(fromHsl(h, Math.max(0, Math.min(1, s * ds)), Math.max(0.05, Math.min(0.95, l + dl))));
}

interface Palette {
  roles: Record<string, number>;
  sky: number; fog: number; fogNear: number; fogFar: number;
  sun: number; sunIntensity: number;
  hemiSky: number; hemiGround: number; hemiIntensity: number;
  grid: { line: number; alpha: number; scale: number };
  surface: { roughness: number; metalness: number };
  daylight: boolean;
  look?: string;
  skyline?: string[];
  facade?: 'punched' | 'banded' | 'industrial';
  roofs?: 'flat' | 'pitched';
  blocks?: string[];
  accent?: number;
  curated?: boolean;
}

const auto = JSON.parse(readFileSync(join(dir, 'palettes.json'), 'utf8')) as Record<string, any>;
const curated = JSON.parse(readFileSync(join(dir, 'curated.json'), 'utf8')) as Record<string, any>;

/** Building kits for the maps nobody has looked at yet. */
const KITS: string[][] = [
  ['gable', 'arcade', 'chamfer'],
  ['setback', 'tower', 'chamfer'],
  ['sawtooth', 'barrel', 'helipad'],
  ['chamfer', 'curved', 'setback'],
  ['gable', 'barrel', 'arcade'],
  ['helipad', 'sawtooth', 'drum'],
  ['tower', 'curved', 'signboard'],
];

/** Fenestration for the maps nobody has looked at yet. */
const FACADES: ('punched' | 'banded' | 'industrial')[] = ['punched', 'punched', 'banded', 'industrial'];

/** Horizons for the maps nobody has looked at yet. */
const GENERIC: string[][] = [
  ['water_tank', 'chimney'],
  ['chimney', 'silo'],
  ['water_tank', 'campanile'],
  ['silo', 'crane'],
  ['campanile', 'water_tank'],
  ['crane', 'chimney'],
];


const out: Record<string, Palette> = {};

for (const [id, a] of Object.entries(auto)) {
  if (id.startsWith('_')) continue;
  const roles: Record<string, number> = {};
  for (const [k, v] of Object.entries(a.roles)) roles[k] = typeof v === 'number' ? v : parseInt(String(v), 16);

  // Floor and wall out of a photograph are often within a few percent of each
  // other, which reads as one continuous material and makes a room impossible
  // to parse. Drive them apart around their midpoint until they are not.
  const fl = lightness(roles.floor);
  const wl = lightness(roles.static_hard);
  const gap = Math.abs(fl - wl);
  if (gap < 0.16) {
    const push = (0.16 - gap) / 2 + 0.02;
    const floorDown = fl <= wl;
    roles.floor = tune(roles.floor, floorDown ? -push : push, 1);
    roles.static_hard = tune(roles.static_hard, floorDown ? push : -push, 1);
    roles.exterior_wall = tune(roles.static_hard, -0.05, 1);
    roles.riser = tune(roles.floor, 0.08, 1);
    roles.stair = tune(roles.static_hard, 0.04, 1);
    roles.ramp = tune(roles.static_hard, 0.02, 1);
  }
  // A washed-out palette is the failure mode of averaging. Give every map back
  // some of its own hue so the library does not converge on grey-beige.
  for (const k of Object.keys(roles)) roles[k] = tune(roles[k], 0, k === 'cover' || k === 'soft_panel' ? 1.5 : 1.25);

  // Then hold every surface inside a band you can actually fight on. A floor
  // sampled from a night screenshot lands near black and a snow map lands near
  // white; both are faithful to the photograph and neither is a room you can
  // read an enemy against. Hue and relative shading survive, the extremes do
  // not.
  const band = (hex: number, lo: number, hi: number): number => {
    const [h, s, l] = toHsl(toRgb(hex));
    return toHex(fromHsl(h, s, Math.max(lo, Math.min(hi, l))));
  };
  // Night maps come out of their screenshots almost black. The band keeps a
  // usable minimum; a map is allowed to be dark, not unreadable.
  // A night map is banded higher than a day one. Both are allowed to be dark;
  // only one of them has a sun to help, and a floor at 0.28 under a black sky
  // is a floor you cannot see the edge of.
  const night = !a.daylight;
  const lo = night ? 0.06 : 0;
  roles.floor = band(roles.floor, 0.28 + lo, 0.68);
  roles.static_hard = band(roles.static_hard, 0.34 + lo, 0.78);
  roles.exterior_wall = band(roles.exterior_wall, 0.3 + lo, 0.74);
  roles.roof = band(roles.roof, 0.16, 0.55);
  for (const k of ['riser', 'stair', 'ramp']) roles[k] = band(roles[k], 0.28 + lo, 0.76);
  for (const k of ['cover', 'soft_panel']) roles[k] = band(roles[k], 0.26, 0.68);

  /*
   * And a turn of the hue between floor and wall.
   *
   * Averaging a screenshot gives every surface the same hue, so a brown map is
   * brown floor, brown wall, brown ceiling, brown crate — one material with
   * the lights turned down. Rotating the walls a few degrees off the floor,
   * deterministically per map, is enough for the eye to read two materials
   * without inventing a colour the photograph never had.
   */
  const turn = ((hash(id + 'hue') % 9) - 4) / 220;
  for (const k of ['static_hard', 'exterior_wall', 'riser', 'stair']) {
    const [h, sat, l] = toHsl(toRgb(roles[k]));
    roles[k] = toHex(fromHsl((h + turn + 1) % 1, sat, l));
  }
  {
    const [h, sat, l] = toHsl(toRgb(roles.roof));
    roles.roof = toHex(fromHsl((h - turn * 2 + 1) % 1, sat, l));
  }

  out[id] = {
    roles,
    sky: a.sky, fog: a.fog, fogNear: a.fogNear, fogFar: a.fogFar,
    sun: a.sun, sunIntensity: a.sunIntensity,
    hemiSky: a.hemiSky, hemiGround: a.hemiGround, hemiIntensity: a.hemiIntensity,
    grid: { line: a.grid.line, alpha: a.grid.alpha, scale: 1 + (hash(id) % 14) / 10 },
    surface: { roughness: 0.86 + (hash(id + 'r') % 12) / 100, metalness: (hash(id + 'm') % 9) / 100 },
    daylight: a.daylight,
    // Nothing in a screenshot says what is on the horizon, so a derived map
    // draws two shapes from a generic set — enough that the distance is not the
    // same flat roofline on all two hundred of them, and honest about the fact
    // that only the hand-authored maps know what they are actually looking at.
    skyline: GENERIC[hash(id + 'sky') % GENERIC.length],
    facade: FACADES[hash(id + 'fac') % FACADES.length],
    roofs: hash(id + 'roof') % 3 === 0 ? 'pitched' : 'flat',
    blocks: KITS[hash(id + 'blk') % KITS.length],
    // Signage takes the map's own most saturated role rather than a fixed
    // colour, so a green map does not sprout orange neon.
    accent: tune(roles.cover, 0.06, 1.5),
  };
}

for (const [id, c] of Object.entries(curated)) {
  if (id.startsWith('_')) continue;
  const roles: Record<string, number> = {};
  for (const [k, v] of Object.entries(c.roles)) roles[k] = parseInt(String(v), 16);
  out[id] = {
    roles,
    sky: parseInt(c.sky, 16), fog: parseInt(c.fog, 16), fogNear: c.fogNear, fogFar: c.fogFar,
    sun: parseInt(c.sun, 16), sunIntensity: c.sunIntensity,
    hemiSky: parseInt(c.hemiSky, 16), hemiGround: parseInt(c.hemiGround, 16), hemiIntensity: c.hemiIntensity,
    grid: { line: parseInt(c.grid.line, 16), alpha: c.grid.alpha, scale: c.grid.scale },
    surface: c.surface,
    daylight: lightness(parseInt(c.sky, 16)) > 0.42,
    look: c.look,
    skyline: c.skyline,
    facade: c.facade,
    roofs: c.roofs,
    blocks: c.blocks,
    accent: c.accent ? parseInt(c.accent, 16) : undefined,
    curated: true,
  };
}

/*
 * Architecture, laid over whatever produced the colours.
 *
 * A screenshot gives a map its palette and nothing else — it cannot say that
 * Chinatown is signage and drums while Monastery is cloisters and pitched
 * tile. That has to be written down, but writing down a whole palette for
 * every map to say it is a rail yard is wasted work when the screenshot
 * already got the colours right. So this file carries only the architecture
 * and merges over the top, and a map can have a hand-chosen skyline without
 * anyone having to hand-choose its ten role colours as well.
 */
const arch = JSON.parse(readFileSync(join(dir, 'architecture.json'), 'utf8')) as Record<string, any>;
let tagged = 0;
for (const [id, a] of Object.entries(arch)) {
  const e = out[id];
  if (id.startsWith('_') || !e) continue;
  // A curated entry has already had someone look at that particular map, so a
  // family rule never overwrites it — it only fills gaps.
  const keep = e.curated === true;
  if (a.skyline && !(keep && e.skyline)) e.skyline = a.skyline;
  if (a.facade && !(keep && e.facade)) e.facade = a.facade;
  if (a.roofs && !(keep && e.roofs)) e.roofs = a.roofs;
  if (a.blocks && !(keep && e.blocks)) e.blocks = a.blocks;
  if (a.accent && !(keep && e.accent)) e.accent = parseInt(a.accent, 16);
  tagged++;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Emitted as a module inside the package rather than a JSON file beside the
// maps: it is data the library owns and the game consumes across a package
// boundary, so it should travel through the package's exports like everything
// else rather than by a relative path reaching into another directory.
const header = `/**
 * How each map looks — generated by tools/build_palettes.ts, do not edit.
 *
 * Derived from each map's own screenshot, with hand-authored entries in
 * maps/cs/curated.json taking precedence. Re-run the tool after changing
 * either source.
 */
import type { MapLook } from './themes.ts';

export const LOOKS: Record<string, MapLook> = `;
writeFileSync(
  join(import.meta.dirname, '../src/generate/looks.ts'),
  `${header}${JSON.stringify(out, null, 1)};\n`,
);

const curatedCount = Object.values(out).filter((p) => p.curated).length;
const day = Object.values(out).filter((p) => p.daylight).length;
console.log(`${Object.keys(out).length} looks -> src/generate/looks.ts`);
console.log(`  ${curatedCount} hand-authored, ${Object.keys(out).length - curatedCount} from screenshots`);
console.log(`  ${tagged} with hand-chosen architecture`);
console.log(`  ${day} daylight, ${Object.keys(out).length - day} dark`);

// How much variety actually came out, measured rather than hoped for.
const hues = new Set(Object.values(out).map((p) => Math.round(toHsl(toRgb(p.roles.floor))[0] * 12)));
const lights = Object.values(out).map((p) => lightness(p.roles.floor));
console.log(`  floor hues across ${hues.size}/12 sectors, lightness ${Math.min(...lights).toFixed(2)}–${Math.max(...lights).toFixed(2)}`);
