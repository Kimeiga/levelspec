/**
 * Compile every drawn plan, validate it, and say what came out.
 *
 *   node tools/plans.ts [name-filter]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { planToSpec, PlanError } from '../src/authoring/plan.ts';
import { compile } from '../src/core/compiler.ts';
import { validate } from '../src/core/validate.ts';
import { bakeNavmesh } from '../src/core/navmesh.ts';

const dir = join(import.meta.dirname, '../maps');
const out = join(import.meta.dirname, '../generated/maps');
mkdirSync(out, { recursive: true });
const filter = process.argv[2];

let ok = 0;
let bad = 0;
const files = readdirSync(dir).filter((f) => f.endsWith('.plan')).filter((f) => !filter || f.includes(filter));

for (const file of files.sort()) {
  const text = readFileSync(join(dir, file), 'utf8');
  try {
    const spec = planToSpec(text);
    const level = compile(spec);
    const report = validate(level);
    const nav = bakeNavmesh(level);
    const errs = report.diagnostics.filter((d) => d.severity === 'error');
    const status = errs.length === 0 && nav.ok ? 'PASS' : 'FAIL';
    if (status === 'PASS') ok++; else bad++;
    const area = level.solids.length;
    console.log(
      `${status}  ${file.padEnd(30)} ${String(spec.layers.length)}L ` +
        `${String(spec.layers.reduce((a, l) => a + l.spaces.length, 0)).padStart(3)} areas ` +
        `${String(area).padStart(5)} solids  nav ${String(Math.round(nav.playable_fraction * 100)).padStart(3)}% ` +
        `islands ${nav.playable_islands} void ${nav.void_edges}`,
    );
    for (const d of errs.slice(0, 6)) console.log(`      ! ${d.code}: ${d.message}`);
    if (!nav.ok && errs.length === 0) {
      for (const i of (nav.islands ?? []).filter((x) => x.kind === 'playable').slice(0, 3))
        console.log(`      ! island of ${i.size} at ${i.at.map((n) => n.toFixed(1)).join(',')} in ${i.spaces.join('/')}`);
      for (const v of (nav.void_examples ?? []).slice(0, 3))
        console.log(`      ! walk off at ${v.from.map((n) => n.toFixed(1)).join(',')} -> ${v.to.map((n) => n.toFixed(1)).join(',')}`);
    }
    writeFileSync(join(out, file.replace('.plan', '.json')), JSON.stringify(spec, null, 2));
  } catch (e) {
    bad++;
    if (e instanceof PlanError) {
      console.log(`FAIL  ${file}`);
      for (const i of e.issues.slice(0, 8)) console.log(`      ! line ${i.line}: ${i.message}`);
    } else {
      console.log(`FAIL  ${file}: ${(e as Error).message}`);
    }
  }
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
