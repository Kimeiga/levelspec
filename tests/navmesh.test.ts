/**
 * The navmesh is a second, independent derivation. These tests check that it
 * agrees with the spec where it should — and, more importantly, that it is
 * capable of disagreeing.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/core/compiler.ts';
import { validate } from '../src/core/validate.ts';
import { bakeNavmesh } from '../src/core/navmesh.ts';
import type { LevelSpec } from '../src/core/types.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPECS: LevelSpec[] = readdirSync(join(ROOT, 'levels'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(ROOT, 'levels', f), 'utf8')) as LevelSpec);

describe('navmesh sensitivity', () => {
  /** Two rooms, joined only by an opening with a sill too high to walk over. */
  const highSill = (sill: number): LevelSpec => ({
    schema_version: '1.1',
    id: 'sill_test',
    name: 'Sill test',
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
        portals: [
          { id: 'w', between: ['a', 'b'], kind: 'window', width_cells: 2, hint: [6, 2], sill, head: 2.4 },
        ],
      },
    ],
    gameplay: {
      markers: [
        { id: 'spawn', layer: 'g', cell: [2, 2], kind: 'attacker_spawn' },
        { id: 'far', layer: 'g', cell: [9, 2], kind: 'site' },
      ],
    },
  });

  it('agrees with the spec when the opening is walkable', () => {
    const level = compile(highSill(0));
    const report = validate(level);
    const mesh = bakeNavmesh(level);
    assert.equal(report.navigation.components, 1, 'spec graph: connected');
    assert.equal(mesh.playable_islands, 0, 'navmesh: connected');
    assert.equal(mesh.unreachable_spaces.length, 0);
    assert.ok(mesh.ok);
  });

  it('closes an opening nobody can climb through', () => {
    // A 1.2 m sill and a player who cannot vault: the opening is a window to
    // look through, not a way in. The spec graph used to call it traversable
    // on a bare height comparison and hand back a connected map that the
    // geometry disagreed with; it now asks what the player can actually do.
    const level = compile(highSill(1.2));
    const report = validate(level);
    const mesh = bakeNavmesh(level);

    assert.equal(report.navigation.components, 2, 'spec graph: two rooms, no route');
    assert.ok(
      level.diagnostics.some((d) => d.code === 'OPENING_NOT_TRAVERSABLE'),
      'and says which opening it was',
    );
    assert.ok(mesh.playable_islands > 0, 'navmesh agrees');
    assert.ok(mesh.unreachable_spaces.includes('b'));
  });

  it('opens it again for a player who can vault, and the navmesh still objects', () => {
    // Declaring the vault is what makes the route real to the spec graph. The
    // bake walks and steps and nothing else, so it still refuses — which is
    // the whole point of deriving it twice: two derivations, two answers, and
    // the difference visible rather than assumed away.
    const spec = highSill(1.2);
    spec.player = { radius: 0.35, height: 1.8, step: 0.45, crouch: 1.1, vault: 1.25 };
    const level = compile(spec);
    const report = validate(level);
    const mesh = bakeNavmesh(level);

    assert.equal(report.navigation.components, 1, 'spec graph: connected, by vaulting');
    assert.ok(mesh.playable_islands > 0, 'navmesh finds an island the spec graph missed');
    assert.ok(mesh.unreachable_spaces.includes('b'), 'and names the room you cannot walk to');
    assert.ok(mesh.unreachable_markers.includes('far'));
    assert.equal(mesh.ok, false);
  });

  it('does not count a crate top as an unreachable room', () => {
    const spec = highSill(0);
    spec.covers = [{ id: 'crate', layer: 'g', rect: [2, 2, 2, 2], height: 1.4, material: 'crate' }];
    const mesh = bakeNavmesh(compile(spec));
    assert.ok(mesh.islands.length > 0, 'the crate top is its own component');
    assert.equal(mesh.playable_islands, 0, 'but it is a ledge, not an unreachable space');
    assert.ok(mesh.ok);
  });

  it('walks a staircase rather than eroding it away', () => {
    const spec: LevelSpec = {
      schema_version: '1.1',
      id: 'stair_mesh',
      name: 'Stair mesh',
      grid: 1,
      layers: [
        { id: 'l0', z: 0, height: 3.2, spaces: [{ id: 'a', rect: [0, 0, 10, 10] }] },
        { id: 'l1', z: 3.4, height: 3.2, spaces: [{ id: 'b', rect: [0, 0, 10, 10] }] },
      ],
      vertical_connections: [
        { id: 'st', from_layer: 'l0', to_layer: 'l1', from_cell: [4, 2], to_cell: [4, 8], kind: 'stairs', width: 2, direction: 'N' },
      ],
      gameplay: { markers: [{ id: 'spawn', layer: 'l0', cell: [1, 1], kind: 'attacker_spawn' }] },
    };
    const mesh = bakeNavmesh(compile(spec));
    assert.equal(mesh.playable_islands, 0, 'the upper storey is reachable on foot');
    assert.equal(mesh.unreachable_spaces.length, 0);
    assert.ok(mesh.playable_fraction > 0.9, `only ${(mesh.playable_fraction * 100).toFixed(0)}% covered`);
  });
});

describe('navmesh over the shipped levels', () => {
  for (const spec of SPECS) {
    const expectFail = spec.expect_fail === true;
    it(`${spec.id} — ${expectFail ? 'has the islands it was built to have' : 'has no unreachable playable space'}`, () => {
      const level = compile(spec);
      const mesh = bakeNavmesh(level);
      if (expectFail) {
        assert.ok(mesh.playable_islands > 0);
        assert.ok(mesh.unreachable_spaces.length > 0);
        return;
      }
      assert.equal(
        mesh.playable_islands,
        0,
        `islands: ${mesh.islands
          .filter((i) => i.kind === 'playable')
          .map((i) => `${i.spaces.join('/')}@${i.at.map((v) => v.toFixed(1)).join(',')}`)
          .join('; ')}`,
      );
      assert.deepEqual(mesh.unreachable_spaces, [], 'every declared space is reachable on foot');
      assert.deepEqual(mesh.unreachable_markers, [], 'every gameplay marker is on the navmesh');
      assert.equal(mesh.playable_fraction, 1, 'all playable floor is reachable from a spawn');
      assert.ok(mesh.samples > 1000, 'the bake actually produced a mesh');
    });
  }
});
