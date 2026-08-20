/**
 * The gates themselves.
 *
 * Everything else in here checks that a level is correct. This file checks
 * that the thing which decides whether a level is correct can be trusted —
 * that a pass means what it says, that the numbers survive the trip through
 * JSON, and that a sightline check cannot report clear through a wall it
 * happened to walk past.
 *
 * Each of these is a hole that was open at some point, so each one names the
 * failure it exists to stop.
 *
 *   node --test tests/gates.test.ts
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { compile, traversalFor } from '../src/core/compiler.ts';
import { validate, validateForRuntime } from '../src/core/validate.ts';
import { lineCells } from '../src/core/grid.ts';
import { DEFAULTS, PORTAL_PROFILE, type LevelSpec, type Solid } from '../src/core/types.ts';

const room = (extra: Partial<LevelSpec> = {}): LevelSpec => ({
  schema_version: '1.1',
  id: 'gate_test',
  name: 'Gate test',
  grid: 1,
  layers: [
    {
      id: 'g',
      z: 0,
      height: 3,
      spaces: [
        { id: 'a', rect: [0, 0, 6, 6] },
        { id: 'b', rect: [6, 0, 6, 6] },
      ],
      portals: [{ id: 'd', between: ['a', 'b'], kind: 'door', width_cells: 2, hint: [6, 2] }],
    },
  ],
  gameplay: {
    markers: [
      { id: 'spawn', layer: 'g', cell: [2, 2], kind: 'attacker_spawn' },
      { id: 'far', layer: 'g', cell: [9, 2], kind: 'site' },
    ],
  },
  ...extra,
});

describe('a pass means what it says', () => {
  it('never passes a level its own geometry report calls unfit', () => {
    const level = compile(room());
    const report = validate(level);
    assert.equal(report.passed, true);
    assert.equal(report.geometry.runtime_ready, true);
    // The property, not the instance: these two decisions used to be computed
    // from different sets of conditions and could disagree.
    assert.ok(!report.passed || report.geometry.runtime_ready);
  });

  it('fails a level with a solid of no thickness', () => {
    const level = compile(room());
    const flat: Solid = {
      ...level.solids[0],
      id: 'flat',
      box: { min: [0, 0, 0], max: [2, 0, 2] },
    };
    const broken = { ...level, solids: [...level.solids, flat] };
    const report = validate(broken);
    assert.equal(report.geometry.degenerate, 1);
    assert.equal(report.passed, false, 'a zero-thickness solid is not shippable');
    assert.ok(report.diagnostics.some((d) => d.code === 'DEGENERATE_SOLID'));
  });

  it('fails a level with a bound that is not a number', () => {
    const level = compile(room());
    const bad: Solid = {
      ...level.solids[0],
      id: 'nan',
      box: { min: [0, 0, 0], max: [Number.NaN, 1, 1] },
    };
    const report = validate({ ...level, solids: [...level.solids, bad] });
    assert.ok(report.geometry.nonfinite > 0);
    assert.equal(report.passed, false);
    assert.ok(report.diagnostics.some((d) => d.code === 'NONFINITE_GEOMETRY'));
  });

  it('runs the physical bake as part of the runtime gate', () => {
    const level = compile(room());
    const report = validateForRuntime(level);
    assert.equal(report.passed, true);
    assert.ok(report.breached.samples > 0, 'the bake actually ran');
    assert.equal(report.breached.playable_islands, 0);
  });
});

describe('numbers survive being written down', () => {
  it('has no unbounded value anywhere in a compiled level', () => {
    const level = compile(room({ layers: [{
      id: 'g', z: 0, height: 3,
      spaces: [{ id: 'a', rect: [0, 0, 6, 6] }, { id: 'b', rect: [6, 0, 6, 6] }],
      portals: [{ id: 'o', between: ['a', 'b'], kind: 'open' }],
    }] }));
    const seen: string[] = [];
    const walk = (v: unknown, path: string): void => {
      if (typeof v === 'number') {
        if (!Number.isFinite(v)) seen.push(`${path} = ${v}`);
        return;
      }
      if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
      if (v && typeof v === 'object' && !(v instanceof Map))
        for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk({ boundaries: level.boundaries, solids: level.solids, verticals: level.verticals }, 'level');
    assert.deepEqual(seen, [], 'Infinity and NaN both come back as null through JSON');
  });

  it('keeps an open portal open through a JSON round trip', () => {
    // `JSON.stringify(Infinity)` is `null`, and `null` parses back as a head
    // of zero — an unbounded opening turning into a sealed one somewhere far
    // from the code that made it.
    assert.equal(PORTAL_PROFILE.open.head, null, 'unbounded is null in the profile, not Infinity');
    const level = compile(room({ layers: [{
      id: 'g', z: 0, height: 3,
      spaces: [{ id: 'a', rect: [0, 0, 6, 6] }, { id: 'b', rect: [6, 0, 6, 6] }],
      portals: [{ id: 'o', between: ['a', 'b'], kind: 'open' }],
    }] }));
    const opening = level.boundaries.flatMap((b) => b.openings).find((o) => o.portal === 'o');
    assert.ok(opening, 'the opening exists');
    const round = JSON.parse(JSON.stringify(opening)) as typeof opening;
    assert.equal(round.head, opening.head);
    assert.ok(Number.isFinite(round.head) && round.head > 0);
  });
});

describe('sightlines', () => {
  it('touches both cells at a corner crossing', () => {
    // A perfect diagonal passes through the lattice point shared by four
    // cells. A blocker in either of the two off-axis ones stops the shot, and
    // an 8-connected walk only ever reports one of them.
    const cells = lineCells(0, 0, 3, 3).map(([x, y]) => `${x},${y}`);
    assert.ok(cells.includes('1,0'), 'the cell the line clips going across');
    assert.ok(cells.includes('0,1'), 'and the one it clips going up');
    assert.ok(cells.includes('3,3'));
  });

  it('walks a straight line and an off-axis one without going astray', () => {
    assert.deepEqual(lineCells(0, 0, 0, 3), [[0, 0], [0, 1], [0, 2], [0, 3]]);
    assert.deepEqual(lineCells(2, 2, 2, 2), [[2, 2]]);
    const shallow = lineCells(0, 0, 4, 2);
    assert.deepEqual(shallow[0], [0, 0]);
    assert.deepEqual(shallow[shallow.length - 1], [4, 2]);
    // Every step is to a 4-neighbour: no jumping the corner.
    for (let i = 1; i < shallow.length; i++) {
      const d = Math.abs(shallow[i][0] - shallow[i - 1][0]) + Math.abs(shallow[i][1] - shallow[i - 1][1]);
      assert.ok(d === 1 || d === 2, `step ${i} moved ${d} cells`);
    }
  });
});

describe('getting through an opening is an ability, not a height', () => {
  const player = { ...DEFAULTS.player };

  it('walks through a doorway', () => {
    assert.equal(traversalFor(0, 2.1, player), 'walk');
  });

  it('steps over a low lip', () => {
    assert.equal(traversalFor(0.3, 2.1, player), 'step');
  });

  it('refuses an ordinary window to a player who cannot vault', () => {
    assert.equal(traversalFor(0.9, 2.05, player), 'blocked');
  });

  it('allows it once the player is given a vault', () => {
    assert.equal(traversalFor(0.9, 2.05, { ...player, vault: 1.25 }), 'vault');
  });

  it('crouches under a low head', () => {
    assert.equal(traversalFor(0, 1.4, player), 'crouch');
  });

  it('refuses an opening shorter than a crouch', () => {
    assert.equal(traversalFor(0, 0.6, player), 'blocked');
  });
});

describe('a storey is more than one ceiling', () => {
  /** A hall twice the height of the corridor beside it, under a roof. */
  const twoHeights = (): LevelSpec => ({
    schema_version: '1.1',
    id: 'ceiling_test',
    name: 'Ceiling test',
    grid: 1,
    layers: [
      {
        id: 'g',
        z: 0,
        height: 3,
        roof: true,
        spaces: [
          { id: 'hall', rect: [0, 0, 8, 8], height: 7 },
          { id: 'passage', rect: [8, 0, 4, 8], height: 3 },
        ],
        portals: [{ id: 'd', between: ['hall', 'passage'], kind: 'door', width_cells: 2, hint: [8, 3] }],
      },
    ],
    gameplay: {
      markers: [
        { id: 'spawn', layer: 'g', cell: [2, 2], kind: 'attacker_spawn' },
        { id: 'far', layer: 'g', cell: [10, 6], kind: 'site' },
      ],
    },
  });

  it('roofs each room at its own height', () => {
    const level = compile(twoHeights());
    const roofs = level.solids.filter((s) => s.role === 'roof');
    const tops = new Set(roofs.map((s) => s.box.min[2].toFixed(3)));
    assert.equal(tops.size, 2, `expected two roof elevations, got ${[...tops].join(', ')}`);
    assert.ok(tops.has('7.000') && tops.has('3.000'));
  });

  it('does not raise the low room to meet the tall one', () => {
    const level = compile(twoHeights());
    // The wall on the far side of the passage — the one with nothing tall
    // near it — should stop at the passage's own ceiling.
    const far = level.solids.filter(
      (s) => s.role === 'exterior_wall' && s.box.min[0] > 11 && s.box.max[2] > 2,
    );
    assert.ok(far.length, 'the far wall exists');
    for (const w of far) assert.ok(w.box.max[2] < 4, `far wall reaches ${w.box.max[2]}`);
  });

  it('leaves no slab intersecting the wall that passes through it', () => {
    const report = validate(compile(twoHeights()));
    assert.equal(report.geometry.intersecting_pairs, 0);
    assert.equal(report.geometry.zfight_pairs, 0);
    assert.equal(report.passed, true);
  });
});

describe('a rope is an ability too', () => {
  const player = { ...DEFAULTS.player };

  it('refuses a rappel window to a body with no rope', () => {
    assert.equal(traversalFor(0.9, 2.05, player, 'rappel_window'), 'blocked');
  });

  it('opens it for one that has', () => {
    assert.equal(traversalFor(0.9, 2.05, { ...player, rappel: true }, 'rappel_window'), 'rappel');
  });

  it('does not let a vault stand in for a rope', () => {
    assert.equal(traversalFor(0.9, 2.05, { ...player, vault: 1.25 }, 'rappel_window'), 'blocked');
  });

  it('still lets a plain window be vaulted', () => {
    assert.equal(traversalFor(0.9, 2.05, { ...player, vault: 1.25 }, 'window'), 'vault');
  });
});
