/**
 * Build every LevelSpec in `levels/`, run the hard gates, and emit artifacts.
 *
 *   node tools/build.ts            build everything
 *   node tools/build.ts dust       build levels whose id contains "dust"
 *   node tools/build.ts --quiet    summary table only
 *
 * Exits non-zero when any level fails validation, so this is usable as CI.
 */

import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/core/compiler.ts';
import { compileNaive } from '../src/core/naive.ts';
import { checkGeometry, validate } from '../src/core/validate.ts';
import { bakeNavmesh } from '../src/core/navmesh.ts';
import { toQuakeMap } from '../src/export/quake.ts';
import { toCadQuery, toDXF, toOBJ, toOpenSCAD, toRuntime, toSVGPlan } from '../src/export/formats.ts';
import type { LevelSpec } from '../src/core/types.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = join(ROOT, 'levels');
const OUT = join(ROOT, 'generated');

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const filters = args.filter((a) => !a.startsWith('--'));

export function loadSpecs(): LevelSpec[] {
  return readdirSync(LEVELS)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(LEVELS, f), 'utf8')) as LevelSpec)
    .filter((s) => filters.length === 0 || filters.some((f) => s.id.includes(f)));
}

const C = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const specs = loadSpecs();
  if (!specs.length) {
    console.error('No LevelSpecs matched.');
    process.exit(1);
  }

  const rows: Record<string, string | number>[] = [];
  let failures = 0;

  for (const spec of specs) {
    const t0 = performance.now();
    const level = compile(spec);
    const report = validate(level);
    const naive = compileNaive(spec);
    const naiveGeom = checkGeometry(naive.solids);
    const brush = toQuakeMap(level);
    const mesh = bakeNavmesh(level);
    const sealedMesh = bakeNavmesh(level, { includeDynamic: true });
    const ms = performance.now() - t0;

    writeFileSync(join(OUT, `${spec.id}.map`), brush.text);
    writeFileSync(join(OUT, `${spec.id}.obj`), toOBJ(level));
    writeFileSync(join(OUT, `${spec.id}.scad`), toOpenSCAD(level));
    writeFileSync(join(OUT, `${spec.id}.cadquery.py`), toCadQuery(level));
    writeFileSync(join(OUT, `${spec.id}.dxf`), toDXF(level));
    writeFileSync(join(OUT, `${spec.id}.plan.svg`), toSVGPlan(level));
    writeFileSync(join(OUT, `${spec.id}.runtime.json`), JSON.stringify(toRuntime(level)));
    writeFileSync(
      join(OUT, `${spec.id}.report.json`),
      JSON.stringify({ ...report, naive: naiveGeom, navmesh: mesh, navmesh_sealed: sealedMesh }, null, 2),
    );

    const expectFail = spec.expect_fail === true;
    const outcome = expectFail ? !report.passed : report.passed && mesh.ok;
    if (!outcome) failures++;

    if (!quiet) {
      const label = expectFail
        ? outcome
          ? C.green('FAILS AS INTENDED')
          : C.red('SHOULD HAVE FAILED')
        : outcome
          ? C.green('PASS')
          : C.red('FAIL');
      const head = `${label}  ${C.bold(spec.name)} ${C.dim(`(${spec.id}, ${ms.toFixed(0)} ms)`)}`;
      console.log(`\n${head}`);
      console.log(
        `  compiled  ${report.geometry.solids} solids · ${report.geometry.triangles} tris · ` +
          `${report.geometry.zfight_pairs} z-fight · ${report.geometry.intersecting_pairs} intersecting · ` +
          `brush ${report.geometry.brush_tests_passed}/${report.geometry.brush_tests_total} · ` +
          `${report.geometry.runtime_ready ? C.green('runtime-ready') : C.red('not runtime-ready')}`,
      );
      console.log(
        `  naive     ${naiveGeom.solids} solids · ${naiveGeom.triangles} tris · ` +
          C.red(`${naiveGeom.zfight_pairs} z-fight`) +
          ' · ' +
          C.red(`${naiveGeom.intersecting_pairs} intersecting`) +
          ` · brush ${naiveGeom.brush_tests_passed}/${naiveGeom.brush_tests_total} · ` +
          `winding ${naiveGeom.winding_ok ? 'ok' : 'bad'}`,
      );
      console.log(
        `  nav       ${report.navigation.nodes} nodes · ${report.navigation.edges} edges · ` +
          `${report.navigation.components} component(s) · openings ≥ ${report.navigation.min_opening_width.toFixed(2)} m · ` +
          `slice ${(report.navigation.max_step * 100).toFixed(0)} cm · steepest ${report.navigation.max_gradient.toFixed(2)}:1`,
      );
      console.log(
        `  navmesh   ${mesh.samples.toLocaleString()} samples @ ${mesh.cell} m · ` +
          `${(mesh.playable_fraction * 100).toFixed(1)}% of playable floor reachable from spawn · ` +
          (mesh.playable_islands === 0
            ? C.green('no unreachable playable space')
            : C.red(`${mesh.playable_islands} playable island(s)`)) +
          ` · ${mesh.islands.length - mesh.playable_islands} off-mesh ledge(s) · ${mesh.ms.toFixed(0)} ms`,
      );
      console.log(
        C.dim(
          `            sealed state (barricades up, hatches closed, soft walls intact): ` +
            `${(sealedMesh.playable_fraction * 100).toFixed(1)}% reachable`,
        ),
      );
      for (const isl of mesh.islands.filter((i) => i.kind === 'playable').slice(0, 6))
        console.log(
          C.red(`    island  ${isl.size} samples at ${isl.at.map((v) => v.toFixed(1)).join(', ')} in ${isl.spaces.join('/')}`),
        );
      for (const sp of mesh.unreachable_spaces.slice(0, 8))
        console.log(C.red(`    unreachable space  ${sp}`));
      for (const sp of mesh.thin_spaces.slice(0, 8)) {
        const c = mesh.space_coverage.find((x) => x.space === sp)!;
        console.log(C.yellow(`    thin coverage  ${sp} ${(c.fraction * 100).toFixed(0)}% (${c.covered}/${c.total} cells)`));
      }
      for (const m of mesh.unreachable_markers) console.log(C.red(`    marker off navmesh  ${m}`));
      if (mesh.void_edges > 0) {
        console.log(
          C.red(`    void edge  ${mesh.void_edges} reachable sample(s) can step into nothing`),
        );
        for (const v of mesh.void_examples.slice(0, 4))
          console.log(
            C.red(
              `      from ${v.from.map((n) => n.toFixed(2)).join(', ')}  ->  ${v.to.map((n) => n.toFixed(2)).join(', ')}`,
            ),
          );
      }
      console.log(
        `  tactical  longest sightline ${report.tactical.longest_sightline.toFixed(1)} m · ` +
          `p95 ${report.tactical.p95_sightline.toFixed(1)} m · ${report.tactical.chokepoints} chokepoints · ` +
          `${report.tactical.soft_walls} soft · ${report.tactical.reinforcement_slots} reinforced · ` +
          `${report.tactical.hatches} hatches · ${report.tactical.vertical_links} vertical links`,
      );
      for (const r of report.navigation.routes) {
        const mark = r.ok ? C.green('ok') : C.red('FAIL');
        console.log(
          `    route ${r.id.padEnd(16)} ${mark}  ${r.distance === Infinity ? '∞' : r.distance.toFixed(1) + ' m'}` +
            `  ${r.seconds === Infinity ? '' : r.seconds.toFixed(1) + ' s'}  ${r.disjoint_routes} disjoint` +
            (r.note ? C.yellow(`  ${r.note}`) : ''),
        );
      }
      for (const d of report.diagnostics.slice(0, 14)) {
        const tag = d.severity === 'error' ? C.red(d.code) : C.yellow(d.code);
        console.log(`    ${tag} ${d.objects.join(', ')} — ${d.message}`);
      }
      if (report.diagnostics.length > 14)
        console.log(C.dim(`    …and ${report.diagnostics.length - 14} more diagnostics`));
    }

    rows.push({
      level: spec.id,
      passed: String(report.passed),
      expect_fail: String(expectFail),
      solids: report.geometry.solids,
      triangles: report.geometry.triangles,
      zfight_pairs: report.geometry.zfight_pairs,
      intersecting_pairs: report.geometry.intersecting_pairs,
      brush_tests: `${report.geometry.brush_tests_passed}/${report.geometry.brush_tests_total}`,
      runtime_ready: String(report.geometry.runtime_ready),
      naive_solids: naiveGeom.solids,
      naive_zfight_pairs: naiveGeom.zfight_pairs,
      naive_intersecting_pairs: naiveGeom.intersecting_pairs,
      naive_runtime_ready: String(naiveGeom.runtime_ready),
      nav_nodes: report.navigation.nodes,
      nav_edges: report.navigation.edges,
      nav_components: report.navigation.components,
      navmesh_samples: mesh.samples,
      navmesh_components: mesh.components,
      navmesh_reachable_pct: (mesh.playable_fraction * 100).toFixed(1),
      navmesh_sealed_pct: (sealedMesh.playable_fraction * 100).toFixed(1),
      navmesh_playable_islands: mesh.playable_islands,
      navmesh_void_edges: mesh.void_edges,
      navmesh_ok: String(mesh.ok),
      dynamic_solids: level.stats.dynamic_solids,
      longest_sightline_m: report.tactical.longest_sightline.toFixed(1),
      vertical_links: report.tactical.vertical_links,
    });
  }

  // Keep the research page's copies of the plans and docs in step with the
  // build, so nothing published there can drift from what the compiler emits.
  const research = resolve(ROOT, '..', 'game', 'public', 'research');
  mkdirSync(join(research, 'previews'), { recursive: true });
  mkdirSync(join(research, 'docs'), { recursive: true });
  for (const spec of specs)
    copyFileSync(join(OUT, `${spec.id}.plan.svg`), join(research, 'previews', `${spec.id}.plan.svg`));
  const repo = resolve(ROOT, '..', '..');
  copyFileSync(join(repo, 'README.md'), join(research, 'docs', 'README.md'));
  copyFileSync(join(repo, 'docs', 'LEVELSPEC-1.1.md'), join(research, 'docs', 'LEVELSPEC-1.1.md'));
  copyFileSync(join(OUT, 'benchmark_summary.csv'), join(research, 'benchmark_summary.csv'));

  const header = Object.keys(rows[0]);
  const csv = [header.join(','), ...rows.map((r) => header.map((h) => r[h]).join(','))].join('\n');
  writeFileSync(join(OUT, 'benchmark_summary.csv'), csv + '\n');
  writeFileSync(join(OUT, 'benchmark_summary.json'), JSON.stringify(rows, null, 2));

  console.log(`\n${C.bold('Summary')}`);
  const cols = ['level', 'passed', 'solids', 'zfight_pairs', 'intersecting_pairs', 'nav_components', 'navmesh_samples', 'navmesh_reachable_pct', 'navmesh_playable_islands'];
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c]).length)));
  console.log(cols.map((c, i) => c.padEnd(widths[i])).join('  '));
  for (const r of rows) console.log(cols.map((c, i) => String(r[c]).padEnd(widths[i])).join('  '));
  console.log(`\nArtifacts written to ${C.dim(OUT)}`);

  if (failures) {
    console.error(C.red(`\n${failures} level(s) failed validation.`));
    process.exit(1);
  }
  console.log(C.green(`\nAll ${specs.length} level(s) passed.`));
}

main();
