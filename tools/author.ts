/**
 * Build an annotated map, keeping only the openings that survive the gates.
 *
 * A portal is "close this boundary, then cut a hole in it", and whether that
 * strands a pocket of floor behind the closure depends on the exact shape of
 * the boundary the flood produced — which is not something you can eyeball from
 * a seed layout, and not something the annotate step can predict without
 * running the compiler. So this runs it: try the whole set, and if the navmesh
 * bake finds islands, drop portals one at a time until it passes, keeping as
 * many as the geometry allows.
 *
 *   node tools/author.ts dust2 dust_ii
 *   node tools/author.ts mirage
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { planToSpec } from '../src/authoring/plan.ts';
import { compile } from '../src/core/compiler.ts';
import { validate } from '../src/core/validate.ts';
import { bakeNavmesh } from '../src/core/navmesh.ts';

const here = import.meta.dirname;
const name = process.argv[2];
const traced = process.argv[3] ?? name;
if (!name) {
  console.error('usage: node tools/author.ts <spec-name> [traced-plan-name]');
  process.exit(1);
}

const specPath = join(here, `../authored/${name}.py`);
const tracedPath = join(here, `../maps/cs/${traced}.plan`);
const outPath = join(here, `../maps/hand/${name}.plan`);

/** Run the annotate step, optionally with some portals suppressed. */
function annotate(skip: number[]): { text: string; notes: string } {
  const args = [join(here, 'annotate.py'), tracedPath, specPath];
  if (skip.length) args.push('--skip-portals', skip.join(','));
  let notes = '';
  const text = execFileSync('python3', args, {
    encoding: 'utf8',
    maxBuffer: 1 << 24,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { text, notes };
}

interface Verdict {
  ok: boolean;
  why: string;
  areas: number;
  portals: number;
  solids: number;
  heights: number;
}

function check(text: string): Verdict {
  try {
    const spec = planToSpec(text);
    const level = compile(spec);
    const rep = validate(level);
    const nav = bakeNavmesh(level);
    const errs = rep.diagnostics.filter((d) => d.severity === 'error');
    const walls = level.solids.filter((s) => s.role === 'static_hard' || s.role === 'exterior_wall');
    const heights = new Set(walls.map((w) => (w.box.max[2] - w.box.min[2]).toFixed(1))).size;
    const why = errs.length
      ? `${errs[0].code}`
      : nav.ok
        ? ''
        : `${nav.playable_islands} island(s), ${nav.void_edges} void edge(s)`;
    return {
      ok: errs.length === 0 && nav.ok,
      why,
      areas: spec.layers.reduce((a, l) => a + l.spaces.length, 0),
      portals: spec.layers.reduce((a, l) => a + (l.portals?.length ?? 0), 0),
      solids: level.solids.length,
      heights,
    };
  } catch (e) {
    return { ok: false, why: (e as Error).message.split('\n')[0].slice(0, 90), areas: 0, portals: 0, solids: 0, heights: 0 };
  }
}

const total = (readFileSync(specPath, 'utf8').match(/\{"between":/g) ?? []).length;

let skip: number[] = [];
let best = annotate(skip);
let verdict = check(best.text);

// Greedy: while it fails, drop whichever single remaining portal fixes the
// most. Trying them one at a time is enough — the failures are local to a
// boundary, so they do not interact.
for (let round = 0; !verdict.ok && round < total; round++) {
  let fixed = false;
  for (let i = 0; i < total; i++) {
    if (skip.includes(i)) continue;
    const trial = annotate([...skip, i]);
    const v = check(trial.text);
    if (v.ok || v.why !== verdict.why) {
      skip = [...skip, i];
      best = trial;
      verdict = v;
      fixed = true;
      break;
    }
  }
  if (!fixed) break;
}

writeFileSync(outPath, best.text);
console.log(`${name}: ${verdict.ok ? 'PASS' : `FAIL — ${verdict.why}`}`);
console.log(
  `  ${verdict.areas} areas, ${verdict.portals}/${total} openings, ` +
    `${verdict.solids} solids, ${verdict.heights} wall heights`,
);
if (skip.length) console.log(`  dropped openings ${skip.join(', ')} — they stranded floor behind the closure`);
console.log(`  -> maps/hand/${name}.plan`);
