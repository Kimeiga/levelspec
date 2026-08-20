/**
 * Turn traced drafts into finished maps.
 *
 * A trace gets the footprint right and nothing else. What makes a map worth
 * walking is the third dimension — Inferno's apartments over its arch, Nuke's
 * two storeys, the drop into Dust's pit — and a radar already encodes most of
 * that in how it shades the floor. Brighter is higher, near enough, so the
 * colour bands the tracer found become elevations here.
 *
 * "Near enough" is doing real work in that sentence, so nothing is trusted:
 * every profile is compiled, validated and navmesh-baked, and a map keeps the
 * most interesting elevation it can while staying fully connected with no
 * islands and no way to walk off the world. If a map cannot take elevation at
 * all it ships flat, which is still its real footprint.
 *
 *   node tools/finalize.ts [filter]
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { planToSpec, PlanError } from '../src/authoring/plan.ts';
import { compile } from '../src/core/compiler.ts';
import { validate } from '../src/core/validate.ts';
import { bakeNavmesh } from '../src/core/navmesh.ts';

const src = join(import.meta.dirname, '../maps/traced');
const dst = join(import.meta.dirname, '../maps/cs');
mkdirSync(dst, { recursive: true });
// Clear only what this tool produces. Wiping the directory wholesale is how a
// build step eats hand-written source that happens to live beside its output —
// which is a good reason for the two never to share a directory, and a better
// reason not to reach for rm -rf in a generator.
for (const f of readdirSync(dst)) if (f.endsWith('.plan')) rmSync(join(dst, f));
const filter = process.argv[2];

/** Deterministic per-map jitter, so two maps never feel identically built. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

/**
 * Elevation profiles, most interesting first. Each maps a band index to a
 * height; the first that survives the gates is the one that ships.
 */
/**
 * Elevation profiles, most interesting first.
 *
 * Anything taller than the player's step (0.45 m) needs a ramp to stay
 * walkable, and a trace has no idea where a ramp belongs — so the bands become
 * terrain you walk up rather than storeys you cannot reach. Each adjacent pair
 * stays inside a step, but across five bands that still stacks to nearly two
 * metres of relief, which is the difference between a floorplan and a place.
 * The shape of it comes off the radar's own shading, so no two maps terrace
 * the same way.
 */
const PROFILES: { name: string; step: (i: number, n: number) => number }[] = [
  { name: 'stepped', step: (i) => i * 0.44 },
  { name: 'terrace', step: (i) => i * 0.42 },
  { name: 'basin', step: (i) => (i === 0 ? -0.42 : (i - 1) * 0.4) },
  { name: 'plateau', step: (i, n) => (i >= n - 2 ? 0.42 * (i - (n - 3)) : 0) },
  { name: 'kerb', step: (i) => i * 0.28 },
  { name: 'lip', step: (i, n) => (i >= n - 1 ? 0.4 : 0) },
  { name: 'flat', step: () => 0 },
];

interface Result {
  id: string;
  profile: string;
  areas: number;
  solids: number;
  cells: number;
  bands: number;
  reason?: string;
}

/**
 * Ceiling height per area.
 *
 * Without this every wall in a map is the same slab from floor to ceiling,
 * because one layer with one height is all a trace produces — and a hundred
 * maps of identically tall boxes read as one map recoloured. The hand-authored
 * levels never looked like that: they had storeys of different heights, low
 * corridors opening into tall halls, and that variation is most of what makes
 * a space feel built rather than extruded.
 *
 * The shape comes off the same colour bands as the elevation. Darker, lower
 * ground reads as open yard and gets height; the brighter, raised bands read
 * as interior and get less of it. Each map also has its own overall scale, so
 * one is cramped throughout and the next is cavernous.
 */
function ceilingFor(i: number, n: number, scale: number): number {
  if (n <= 1) return 5.0 * scale;
  // Lowest band tallest, top band lowest, with the middle interpolated.
  const t = i / (n - 1);
  const base = 7.6 - t * 4.0;
  return Math.round(base * scale * 10) / 10;
}

/** Rewrite the legend's z values for a given profile. */
function withProfile(
  text: string,
  letters: string[],
  z: (i: number) => number,
  extra: Record<string, string>,
  ceiling?: (i: number) => number,
): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let inLegend = false;
  for (const line of lines) {
    if (/^legend\s*$/.test(line)) {
      inLegend = true;
      out.push(line);
      continue;
    }
    if (inLegend && /^end\s*$/.test(line)) {
      inLegend = false;
      out.push(line);
      continue;
    }
    if (inLegend) {
      const t = line.replace(/^\s+/, '');
      const ch = t[0];
      const idx = letters.indexOf(ch);
      if (idx >= 0) {
        const h = z(idx);
        const body = line.split('//')[0].replace(/\s[+-][\d.]+(?=\s|$)/g, '').replace(/\sh=[\d.]+/g, '').trimEnd();
        const comment = line.includes('//') ? '  //' + line.split('//')[1] : '';
        const ceil = ceiling ? `  h=${ceiling(idx).toFixed(1)}` : '';
        out.push(`${body}${h ? `  ${h > 0 ? '+' : ''}${h.toFixed(2)}` : ''}${ceil}${comment}`);
        continue;
      }
    }
    const kv = /^([a-z_]+):/.exec(line);
    if (kv && extra[kv[1]] !== undefined) {
      out.push(`${kv[1]}: ${extra[kv[1]]}`);
      delete extra[kv[1]];
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

const files = readdirSync(src).filter((f) => f.endsWith('.plan')).filter((f) => !filter || f.includes(filter)).sort();
const results: Result[] = [];
const failed: { id: string; why: string }[] = [];

for (const file of files) {
  const id = file.replace('.plan', '');
  const raw = readFileSync(join(src, file), 'utf8');

  // Which band letters the trace actually used.
  const letters: string[] = [];
  let inLegend = false;
  for (const line of raw.split('\n')) {
    if (/^legend\s*$/.test(line)) { inLegend = true; continue; }
    if (inLegend && /^end\s*$/.test(line)) break;
    if (inLegend) {
      const t = line.replace(/^\s+/, '');
      if (t && !t.startsWith('//')) letters.push(t[0]);
    }
  }

  // Per-map build character, so the library does not feel machine-stamped.
  const h = hash(id);
  const extra = {
    wall_thickness: (0.26 + h * 0.16).toFixed(2),
  };

  // How tall this map builds, overall. Some are cramped, some are cavernous.
  const scale = 0.78 + hash(`${id}:ceiling`) * 0.5;

  let shipped: { text: string; result: Result } | null = null;
  for (const p of PROFILES) {
    const text = withProfile(
      raw,
      letters,
      (i) => p.step(i, letters.length),
      { ...extra },
      (i) => ceilingFor(i, letters.length, scale),
    );
    try {
      const spec = planToSpec(text);
      if (process.env.WHY && p.name !== 'flat') {
        const lvl = compile(spec);
        const rp = validate(lvl);
        const nv = bakeNavmesh(lvl);
        const errs = rp.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
        if (errs.length || !nv.ok)
          console.log(`   why ${id}/${p.name}: ${errs.join(',') || `nav islands=${nv.playable_islands} void=${nv.void_edges}`}`);
      }
      // A storey height that varies with the map, clamped to something a
      // player can actually fight in.
      const level = compile(spec);
      const rep = validate(level);
      if (!rep.passed) continue;
      const nav = bakeNavmesh(level);
      if (!nav.ok) continue;
      const cells = spec.layers.reduce((a, l) => a + l.spaces.length, 0);
      shipped = {
        text,
        result: {
          id, profile: p.name, areas: cells, solids: level.solids.length,
          cells: Math.round(nav.playable_samples ?? 0), bands: letters.length,
        },
      };
      break;
    } catch (e) {
      if (!(e instanceof PlanError)) throw e;
    }
  }

  if (!shipped) {
    failed.push({ id, why: 'no profile survived the gates' });
    continue;
  }
  writeFileSync(join(dst, file), shipped.text);
  results.push(shipped.result);
}

const byProfile = new Map<string, number>();
for (const r of results) byProfile.set(r.profile, (byProfile.get(r.profile) ?? 0) + 1);

console.log(`${results.length}/${files.length} maps finished\n`);
console.log('elevation profiles used:');
for (const p of PROFILES) {
  const n = byProfile.get(p.name) ?? 0;
  if (n) console.log(`  ${p.name.padEnd(10)} ${String(n).padStart(4)}  ${'█'.repeat(Math.round((n / results.length) * 40))}`);
}
const withHeight = results.filter((r) => r.profile !== 'flat').length;
console.log(`\n${withHeight}/${results.length} have real elevation (${Math.round((withHeight / results.length) * 100)}%)`);
console.log(`median areas per map: ${results.map((r) => r.areas).sort((a, b) => a - b)[results.length >> 1]}`);
console.log(`median solids per map: ${results.map((r) => r.solids).sort((a, b) => a - b)[results.length >> 1]}`);
if (failed.length) {
  console.log(`\n${failed.length} could not be finished:`);
  for (const f of failed.slice(0, 12)) console.log(`  ${f.id}: ${f.why}`);
}
