/**
 * A concept still turns into a map.
 *
 * The pipeline's failure mode is quiet and total: a change to the slicer, the
 * flight geometry or the compiler's own gates and every candidate for every
 * concept stops compiling — which looks, from outside, exactly like nobody
 * having run it. The four concepts in the library were generated once and are
 * now files on disk, so nothing downstream would notice either.
 *
 * These are deliberately cheap. Eight attempts per concept rather than forty,
 * and the only claim is that a concept still produces *something* valid, which
 * is the thing that breaks. How good it is, is what the scorer is for.
 *
 *   node --test tests/concept.test.ts
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { compile } from '../src/core/compiler.ts';
import { planToSpec } from '../src/authoring/plan.ts';
import { draw, flightCells, linkFits } from '../src/authoring/concept.ts';
import { score } from '../src/authoring/score.ts';
import { CONCEPTS } from '../src/authoring/concepts.ts';

describe('a flight needs room', () => {
  it('twice its rise, plus a cell of clearance at each end', () => {
    // A four-metre drop on a one-point-seven-metre grid is five cells of run
    // and two of clearance. Getting this wrong is a stair through a wall, and
    // the compiler says so in a message about a placed solid rather than about
    // a stair being too steep.
    assert.equal(flightCells(4, 1.7), 7);
    assert.equal(flightCells(-4, 1.7), 7, 'a descent is a climb the other way up');
  });

  it('and a rectangle that holds all of it', () => {
    // Seven cells of run needs nine along, and two of width needs four across.
    assert.equal(linkFits([0, 0, 10, 10], [0, 0, 10, 10], 7, 2), true);
    assert.equal(linkFits([0, 0, 10, 8], [0, 0, 3, 8], 7, 2), false, 'three cells is not four');
    assert.equal(linkFits([0, 0, 10, 8], [0, 0, 10, 3], 7, 2), false, 'and a strip is not a stairwell');
  });
});

describe('every concept still becomes a map', () => {
  for (const concept of CONCEPTS) {
    it(`${concept.name}: at least one of eight layouts compiles and bakes clean`, () => {
      const failures: string[] = [];
      let best = -Infinity;
      for (let i = 0; i < 8; i++) {
        const made = draw(concept, `t${i}`);
        if (made.missing.length) {
          failures.push(`no room for ${made.missing.join(', ')}`);
          continue;
        }
        let s;
        try {
          s = score(concept, compile(planToSpec(made.text)));
        } catch (e) {
          failures.push(String(e).slice(0, 80));
          continue;
        }
        if (!s.compiles || !s.reachable) {
          failures.push(s.problems[0] ?? 'unknown');
          continue;
        }
        best = Math.max(best, s.total);
      }
      assert.ok(best > -Infinity, `nothing valid in eight tries: ${[...new Set(failures)].slice(0, 3).join(' | ')}`);
    });

    it(`${concept.name}: the section survives being laid out`, () => {
      /*
       * The whole reason a concept is written as a section. A layout that
       * satisfies every proportion and puts ninety per cent of the walkable
       * floor on one band has quietly thrown the idea away, and it will
       * compile, bake and look fine in a screenshot.
       */
      let bestSpread = 0;
      let bestVertical = 0;
      for (let i = 0; i < 8; i++) {
        const made = draw(concept, `t${i}`);
        if (made.missing.length) continue;
        let s;
        try { s = score(concept, compile(planToSpec(made.text))); } catch { continue; }
        if (!s.reachable) continue;
        bestSpread = Math.max(bestSpread, s.spread);
        bestVertical = Math.max(bestVertical, s.verticality);
      }
      assert.ok(bestSpread > 0.7, `bands ended up ${(bestSpread * 100).toFixed(0)}% evenly used`);
      assert.ok(bestVertical > 0.25, `only ${(bestVertical * 100).toFixed(0)}% of the floor is off the ground band`);
    });
  }
});

describe('a concept says what kind of place it is', () => {
  it('in a sentence, with a function and an incident and a contrast', () => {
    for (const c of CONCEPTS) {
      assert.ok(c.thesis.length > 40, `${c.id}: "${c.thesis}" is not a thesis`);
      assert.ok(c.built.length > 4 && c.incident.length > 10, `${c.id} is missing its history`);
      assert.notEqual(c.contrast[0], c.contrast[1], `${c.id}'s contrast pair is one thing twice`);
      assert.ok(c.bands.length >= 2, `${c.id} has no section`);
      assert.ok(c.bands.some((b) => b.zones.some((z) => z.id === c.spawn)), `${c.id} spawns nowhere`);
      assert.ok(c.bands.some((b) => b.zones.some((z) => z.id === c.objective)), `${c.id} is about nowhere`);
    }
  });

  it('and every band it declares can be reached from the one below', () => {
    for (const c of CONCEPTS) {
      const ordered = [...c.bands].sort((a, b) => a.z - b.z);
      for (let i = 1; i < ordered.length; i++) {
        const need = c.links.some(
          (l) => !l.optional && l.from === ordered[i - 1].id && l.to === ordered[i].id,
        );
        assert.ok(need, `${c.id}: nothing required joins ${ordered[i - 1].id} to ${ordered[i].id}`);
      }
    }
  });

  it('and no band reaches into the one above it', () => {
    for (const c of CONCEPTS) {
      const ordered = [...c.bands].sort((a, b) => a.z - b.z);
      for (let i = 1; i < ordered.length; i++) {
        const below = ordered[i - 1];
        assert.ok(
          below.z + below.height <= ordered[i].z + 1e-6,
          `${c.id}: ${below.id} tops out at ${(below.z + below.height).toFixed(1)} and ${ordered[i].id} starts at ${ordered[i].z}`,
        );
      }
    }
  });
});
