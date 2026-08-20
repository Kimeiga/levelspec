/**
 * Compile every drawn plan, validate it, and say what came out.
 *
 *   node tools/plans.ts [name-filter]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { planToSpec, PlanError } from '../src/authoring/plan.ts';
import { compile } from '../src/core/compiler.ts';
import { validateForRuntime } from '../src/core/validate.ts';

const dir = join(import.meta.dirname, '../maps');
const out = join(import.meta.dirname, '../generated/maps');
mkdirSync(out, { recursive: true });
const filter = process.argv[2];

let ok = 0;
let bad = 0;
/**
 * Every plan under `maps/`, subdirectories included.
 *
 * The library the game actually ships lives in `maps/cs` and `maps/hand`; a
 * scan of the top level alone checked one smoke test and reported that
 * everything passed.
 */
function walk(root: string, prefix = ''): { rel: string; abs: string }[] {
  const out: { rel: string; abs: string }[] = [];
  for (const name of readdirSync(root).sort()) {
    const abs = join(root, name);
    if (statSync(abs).isDirectory()) out.push(...walk(abs, `${prefix}${name}/`));
    else if (name.endsWith('.plan')) out.push({ rel: `${prefix}${name}`, abs });
  }
  return out;
}

const files = walk(dir).filter((f) => !filter || f.rel.includes(filter));

for (const { rel: file, abs } of files) {
  const text = readFileSync(abs, 'utf8');
  try {
    const spec = planToSpec(text);
    const level = compile(spec);
    const report = validateForRuntime(level);
    const nav = report.breached;
    const errs = report.diagnostics.filter((d) => d.severity === 'error');
    const status = report.passed && nav.ok ? 'PASS' : 'FAIL';
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
    const artifact = join(out, file.replace('.plan', '.json'));
    mkdirSync(dirname(artifact), { recursive: true });
    writeFileSync(artifact, JSON.stringify(spec, null, 2));
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
