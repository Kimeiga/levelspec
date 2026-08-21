/**
 * Realise a spatial concept: diverge, compile, score, keep the best.
 *
 * A concept is a paragraph and a section, not a drawing. This is the part that
 * turns one into the other — and the reason it generates twenty of them and
 * throws nineteen away is that a slicer is not a designer. It will produce a
 * layout that satisfies the proportions and has lost the point: a band with
 * four per cent of the floor in it, an objective you can see from the spawn, a
 * route that never changes width. Nineteen of those and one that kept
 * everything is a much better deal than one attempt and an argument.
 *
 *   node tools/concept.ts                       every concept, dry run
 *   node tools/concept.ts terminus              one of them
 *   node tools/concept.ts --attempts 40         look harder
 *   node tools/concept.ts --write               write the winners to maps/hand/
 *   node tools/concept.ts terminus --plan       print the winning drawing
 */

import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/core/compiler.ts';
import { checkGeometry } from '../src/core/validate.ts';
import { planToSpec } from '../src/authoring/plan.ts';
import { apart, draw } from '../src/authoring/concept.ts';
import { score, type Score } from '../src/authoring/score.ts';
import { CONCEPTS } from '../src/authoring/concepts.ts';
import type { SpatialConcept } from '../src/authoring/concept.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (k: string, d: number): number => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const ATTEMPTS = flag('attempts', 24);
/** How many genuinely different layouts of one concept to keep. */
const VARIANTS = flag('variants', 3);
const write = args.includes('--write');
const showPlan = args.includes('--plan');
const WHY = args.includes('--why');
const only = args.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));

interface Attempt {
  seed: string;
  text: string;
  score: Score;
  signature: string[];
}

/**
 * How far apart two layouts have to be to count as two maps.
 *
 * Half the zones somewhere else. Below that they are the same building with a
 * wall moved, and shipping both is padding the library rather than filling it.
 */
const APART = 0.5;

const dead = (why: string): Score => ({
  compiles: false, reachable: false, problems: [why],
  verticality: 0, spread: 0, journey: 0, rhythm: 0, mystery: 0, cost: 1, total: -1,
});

function realise(concept: SpatialConcept): Attempt[] {
  const out: Attempt[] = [];
  for (let i = 0; i < ATTEMPTS; i++) {
    const seed = `v${i}`;
    let text: string;
    let signature: string[] = [];
    try {
      const made = draw(concept, seed);
      text = made.text;
      signature = made.signature;
      if (made.missing.length) {
        out.push({ seed, text, signature, score: dead(`layout: no room for ${made.missing.join(', ')}`) });
        continue;
      }
    } catch (e) {
      out.push({ seed, text: '', signature: [], score: dead(`draw: ${String(e).slice(0, 80)}`) });
      continue;
    }
    try {
      const level = compile(planToSpec(text));
      out.push({ seed, text, signature, score: score(concept, level) });
    } catch (e) {
      out.push({ seed, text, signature, score: dead(`compile: ${String(e).slice(0, 110)}`) });
    }
  }
  return out;
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;

let wrote = 0;
for (const concept of CONCEPTS) {
  if (only.length && !only.includes(concept.id)) continue;
  const tries = realise(concept);
  const good = tries.filter((t) => t.score.compiles && t.score.reachable).sort((a, b) => b.score.total - a.score.total);

  console.log(`\n${concept.name} — ${concept.thesis}`);
  console.log(`  ${concept.verb} · ${concept.contrast[0]} against ${concept.contrast[1]} · ${concept.bands.length} bands`);
  console.log(`  ${good.length}/${tries.length} candidates compiled and baked clean`);

  /*
   * Why the rest failed, deduplicated and always printed.
   *
   * Twenty copies of one message is one problem, and a run where nineteen
   * candidates died of the same thing is a concept with a structural fault
   * rather than a slicer having a bad day — which is exactly the finding
   * worth having, and it is invisible if the failures are only shown when
   * every single attempt failed.
   */
  const seen = new Map<string, number>();
  for (const t of tries) {
    for (const p of t.score.problems) {
      const key = p.slice(0, 96);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  }
  for (const [k, n] of [...seen].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    console.log(`    ! ${String(n).padStart(2)}x  ${k}`);
  }
  if (!good.length && !WHY) continue;

  console.log('    seed   score  vertical  spread  journey  rhythm  mystery  samples');
  for (const t of good.slice(0, 5)) {
    const s = t.score;
    console.log(
      `    ${t.seed.padEnd(6)} ${s.total.toFixed(2).padStart(5)}  ` +
      `${pct(s.verticality).padStart(8)}  ${pct(s.spread).padStart(6)}  ` +
      `${pct(s.journey).padStart(7)}  ${pct(s.rhythm).padStart(6)}  ${pct(s.mystery).padStart(7)}  ` +
      `${Math.round(s.cost * 70000).toString().padStart(7)}`,
    );
  }

  if (WHY) {
    /*
     * The first candidate that failed on geometry, with the two solids named.
     *
     * "Twenty coplanar pairs" locates a fault in a number; the pair of boxes
     * locates it in the concept. Every geometry failure this generator has had
     * so far has been one band's walls reaching into the band above, and that
     * is a thing you can only see by looking at the two boxes.
     */
    for (const t of tries) {
      if (t.score.reachable || !t.text) continue;
      let level;
      try { level = compile(planToSpec(t.text)); } catch { continue; }
      const geo = checkGeometry(level.solids);
      if (!geo.zfight_pairs && !geo.intersecting_pairs) continue;
      const byId = new Map(level.solids.map((x) => [x.id, x]));
      console.log(`    why (${t.seed}): ${geo.zfight_pairs} coplanar, ${geo.intersecting_pairs} intersecting`);
      for (const [a, b] of [...(geo.zfight_examples ?? []), ...(geo.intersecting_examples ?? [])].slice(0, 3)) {
        for (const id of [a, b]) {
          const sol = byId.get(id);
          if (sol) console.log(`      ${sol.layer ?? '-'} ${sol.role} ${id} ${JSON.stringify(sol.box)}`);
        }
        console.log('      --');
      }
      break;
    }
  }

  /*
   * The best layout, and then the best ones that are not it.
   *
   * A concept is a place, and a place can have more than one map — the traced
   * half of this library has two cuts of Dust and three of Nuke. What makes a
   * second layout worth shipping is that it is genuinely a different building:
   * different rooms adjacent to different rooms, so different routes, different
   * sightlines and a different room to arrive in. Half the zones somewhere
   * else is the line, and it is measured rather than hoped for.
   */
  const keep: Attempt[] = [];
  for (const candidate of good) {
    if (keep.length >= VARIANTS) break;
    if (keep.some((k) => apart(k.signature, candidate.signature) < APART)) continue;
    keep.push(candidate);
  }

  if (!keep.length) continue;
  if (showPlan) console.log(`\n${keep[0].text}`);
  if (write) {
    keep.forEach((k, i) => {
      const suffix = i ? `_${'bcde'[i - 1]}` : '';
      // Redrawn with its variant number so its id and its name plate differ
      // from the first one's; the library files by name and keeps one of any
      // two that share it.
      const text = draw(concept, k.seed, i).text;
      writeFileSync(join(ROOT, 'maps', 'hand', `${concept.id}${suffix}.plan`), text);
      wrote++;
      console.log(`    written: maps/hand/${concept.id}${suffix}.plan (seed ${k.seed}, score ${k.score.total.toFixed(2)})`);
    });
  } else {
    console.log(`    would keep ${keep.length}: ${keep.map((k) => `${k.seed}@${k.score.total.toFixed(2)}`).join(' ')}`);
  }
}

if (write) console.log(`\n${wrote} map(s) written`);
else console.log('\ndry run — pass --write to keep the winners');
