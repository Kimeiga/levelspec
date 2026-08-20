/**
 * The shipped level suite, and the exporters that consume it.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/core/compiler.ts';
import { compileNaive } from '../src/core/naive.ts';
import { checkGeometry, validate } from '../src/core/validate.ts';
import { toQuakeMap } from '../src/export/quake.ts';
import { toCadQuery, toDXF, toOBJ, toOpenSCAD } from '../src/export/formats.ts';
import type { LevelSpec } from '../src/core/types.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPECS: LevelSpec[] = readdirSync(join(ROOT, 'levels'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(ROOT, 'levels', f), 'utf8')) as LevelSpec);

describe('level suite', () => {
  it('finds the shipped levels', () => {
    assert.ok(SPECS.length >= 5, `expected the level set, found ${SPECS.length}`);
  });

  for (const spec of SPECS) {
    const expectFail = spec.expect_fail === true;

    describe(spec.id, () => {
      const level = compile(spec);
      const report = validate(level);

      it(expectFail ? 'fails validation, as designed' : 'passes every hard gate', () => {
        if (expectFail) {
          assert.equal(report.passed, false);
          const codes = new Set(report.diagnostics.map((d) => d.code));
          for (const expected of ['PORTAL_NOT_ADJACENT', 'NAV_DISCONNECTED', 'SPACE_OVERLAP', 'SLOPE_TOO_STEEP'])
            assert.ok(codes.has(expected), `expected a ${expected} diagnostic`);
        } else {
          const errors = report.diagnostics.filter((d) => d.severity === 'error');
          assert.equal(
            report.passed,
            true,
            `failed: ${errors.map((d) => `${d.code}(${d.objects.join(',')})`).join('; ')}`,
          );
        }
      });

      it('emits finite, positively-sized solids', () => {
        assert.ok(level.solids.length > 0);
        for (const s of level.solids)
          for (let i = 0; i < 3; i++) {
            assert.ok(Number.isFinite(s.box.min[i]) && Number.isFinite(s.box.max[i]), `${s.id} non-finite`);
            assert.ok(s.box.max[i] > s.box.min[i], `${s.id} is degenerate on axis ${i}`);
          }
      });

      it('is consistently wound and passes every brush half-space test', () => {
        assert.ok(report.geometry.winding_ok);
        assert.equal(report.geometry.brush_tests_passed, report.geometry.brush_tests_total);
      });

      if (!expectFail) {
        it('has no duplicate or overlapping surfaces', () => {
          assert.equal(report.geometry.zfight_pairs, 0);
          assert.equal(report.geometry.intersecting_pairs, 0);
          assert.ok(report.geometry.runtime_ready);
        });

        it('is one connected navigable space', () => {
          assert.equal(report.navigation.components, 1);
          assert.equal(report.navigation.unreachable_markers.length, 0);
        });

        it('satisfies every declared route requirement', () => {
          for (const r of report.navigation.routes)
            assert.ok(r.ok, `route ${r.id}: ${r.note ?? 'unreachable'}`);
        });

        it('has climbable stairs and passable openings', () => {
          assert.ok(report.navigation.step_ok, `max step ${report.navigation.max_step}`);
          assert.ok(
            report.navigation.max_gradient < 0.9,
            `steepest flight ${report.navigation.steepest_stair} at ${report.navigation.max_gradient}:1`,
          );
          assert.ok(
            report.navigation.max_step <= 0.06,
            `flights should compile to ramp slices, got ${report.navigation.max_step} m`,
          );
          const need = (spec.player?.radius ?? 0.35) * 2;
          assert.ok(
            report.navigation.min_opening_width === 0 || report.navigation.min_opening_width >= need,
            `narrowest opening ${report.navigation.min_opening_width} < ${need}`,
          );
        });
      }

      it('is strictly better than the naive build of the same spec', () => {
        const naive = checkGeometry(compileNaive(spec).solids);
        assert.ok(naive.winding_ok, 'the naive boxes are individually well formed');
        assert.equal(naive.brush_tests_passed, naive.brush_tests_total);
        assert.ok(naive.zfight_pairs > report.geometry.zfight_pairs);
        assert.ok(naive.intersecting_pairs > report.geometry.intersecting_pairs);
        assert.equal(naive.runtime_ready, false);
      });

      it('round-trips through the Quake brush exporter', () => {
        const out = toQuakeMap(level);
        assert.equal(out.halfspaceTestsPassed, level.solids.length, 'every brush contains its centroid');

        // Reconstruct each worldspawn brush from its plane triples and check
        // the recovered bounds match the solid that produced them.
        // Dynamic surfaces are written as their own brush entities, so every
        // solid — static shell and runtime panel alike — must come back.
        const brushes = out.text.split('\n{\n').slice(1);
        assert.ok(brushes.length > 0);
        const all = level.solids;
        let checked = 0;
        for (const b of brushes) {
          const planes = [...b.matchAll(/^\( *(-?[\d.]+) +(-?[\d.]+) +(-?[\d.]+) *\)/gm)];
          if (planes.length < 6) continue;
          const xs: number[] = [];
          const ys: number[] = [];
          const zs: number[] = [];
          for (const p of b.matchAll(/\( *(-?[\d.]+) +(-?[\d.]+) +(-?[\d.]+) *\)/g)) {
            xs.push(Number(p[1]));
            ys.push(Number(p[2]));
            zs.push(Number(p[3]));
          }
          const box = {
            min: [Math.min(...xs) / 32, Math.min(...ys) / 32, Math.min(...zs) / 32],
            max: [Math.max(...xs) / 32, Math.max(...ys) / 32, Math.max(...zs) / 32],
          };
          const match = all.find(
            (s) =>
              Math.abs(s.box.min[0] - box.min[0]) < 0.02 &&
              Math.abs(s.box.min[1] - box.min[1]) < 0.02 &&
              Math.abs(s.box.min[2] - box.min[2]) < 0.02 &&
              Math.abs(s.box.max[0] - box.max[0]) < 0.02 &&
              Math.abs(s.box.max[1] - box.max[1]) < 0.02 &&
              Math.abs(s.box.max[2] - box.max[2]) < 0.02,
          );
          assert.ok(match, `no solid matches recovered brush ${JSON.stringify(box)}`);
          checked++;
        }
        assert.equal(checked, all.length, `recovered ${checked} of ${all.length} brushes`);
      });

      it('emits well-formed OBJ, OpenSCAD, CadQuery and DXF', () => {
        const obj = toOBJ(level);
        const verts = (obj.match(/^v /gm) ?? []).length;
        const faces = (obj.match(/^f /gm) ?? []).length;
        assert.equal(verts, level.solids.length * 24, 'four vertices per face, six faces per box');
        assert.equal(faces, level.solids.length * 12, 'two triangles per face');
        assert.ok(!/NaN|Infinity/.test(obj), 'no non-finite coordinates');

        const scad = toOpenSCAD(level);
        assert.equal((scad.match(/^\s*solid\(/gm) ?? []).length, level.solids.length);
        assert.ok(scad.includes('module static_shell()'));
        assert.ok(scad.includes('module dynamic_surfaces()'), 'dynamic surfaces stay separate');

        const py = toCadQuery(level);
        assert.ok(py.includes('cq.exporters.export'));
        assert.equal(
          (py.match(/^ {4}\(/gm) ?? []).length,
          level.solids.filter((s) => !s.dynamic).length,
        );

        const dxf = toDXF(level);
        assert.ok(dxf.startsWith('0\nSECTION'));
        assert.ok(dxf.trimEnd().endsWith('EOF'));
        assert.ok(!/NaN/.test(dxf));
      });
    });
  }
});
