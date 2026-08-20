/**
 * Core invariants: winding, half-spaces, boundary ownership, portal cuts.
 *
 *   node --test tests/
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { compile } from '../src/core/compiler.ts';
import { compileNaive } from '../src/core/naive.ts';
import { checkGeometry, validate } from '../src/core/validate.ts';
import { boxMesh, brushContains, brushPlanes, boxCenter, signedVolume, windingConsistent } from '../src/core/mesh.ts';
import { decomposeToRects, key } from '../src/core/grid.ts';
import { OUTSIDE, type Box, type LevelSpec } from '../src/core/types.ts';

const twoRooms = (): LevelSpec => ({
  schema_version: '1.1',
  id: 'test_two_rooms',
  name: 'Two rooms',
  grid: 1,
  wall_thickness: 0.22,
  floor_thickness: 0.2,
  layers: [
    {
      id: 'ground',
      z: 0,
      height: 3,
      spaces: [
        { id: 'a', rect: [0, 0, 6, 5] },
        { id: 'b', rect: [6, 0, 5, 5] },
      ],
      portals: [{ id: 'd1', between: ['a', 'b'], kind: 'door', width_cells: 1, hint: [6, 2] }],
    },
  ],
});

describe('mesh', () => {
  it('emits outward-facing, consistently wound boxes', () => {
    const box: Box = { min: [1, 2, 3], max: [4, 7, 5] };
    const m = boxMesh(box);
    assert.equal(m.indices.length, 36, 'twelve triangles');
    assert.ok(windingConsistent(m), 'winding agrees with the stored normals');
    assert.ok(Math.abs(signedVolume(m) - 3 * 5 * 2) < 1e-9, 'signed volume equals +volume');
  });

  it('detects inverted winding', () => {
    const m = boxMesh({ min: [0, 0, 0], max: [1, 1, 1] });
    for (let i = 0; i < m.indices.length; i += 3) {
      const t = m.indices[i];
      m.indices[i] = m.indices[i + 2];
      m.indices[i + 2] = t;
    }
    assert.ok(signedVolume(m) < 0, 'reversing every triangle inverts the volume');
    assert.ok(!windingConsistent(m));
  });

  it('brush half-spaces contain the interior and exclude the exterior', () => {
    const box: Box = { min: [-2, 3, 0], max: [5, 9, 4] };
    assert.equal(brushPlanes(box).length, 6);
    assert.ok(brushContains(box, boxCenter(box)), 'centroid is inside all six half-spaces');
    assert.ok(!brushContains(box, [100, 100, 100]), 'a far point is outside');
    assert.ok(!brushContains(box, [-2.5, 6, 2]), 'a point just past a face is outside');
  });

  it('the Three.js basis change preserves handedness', () => {
    // (x, y, z) -> (x, z, -y); determinant must be +1 or winding flips.
    const m = [
      [1, 0, 0],
      [0, 0, 1],
      [0, -1, 0],
    ];
    const det =
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    assert.equal(det, 1);
  });
});

describe('grid', () => {
  it('decomposes a cell set into disjoint rectangles covering every cell', () => {
    const cells = new Set<string>();
    for (let x = 0; x < 7; x++) for (let y = 0; y < 4; y++) cells.add(key(x, y));
    cells.delete(key(3, 1));
    cells.delete(key(3, 2));
    const rects = decomposeToRects(cells);
    const covered = new Set<string>();
    let total = 0;
    for (const [x, y, w, d] of rects) {
      total += w * d;
      for (let i = 0; i < w; i++)
        for (let j = 0; j < d; j++) {
          const k = key(x + i, y + j);
          assert.ok(!covered.has(k), `cell ${k} covered twice`);
          assert.ok(cells.has(k), `cell ${k} is not in the set`);
          covered.add(k);
        }
    }
    assert.equal(total, cells.size, 'rectangles cover exactly the cell set');
  });
});

describe('compiler', () => {
  it('gives a shared boundary exactly one record', () => {
    const level = compile(twoRooms());
    const shared = level.boundaries.filter(
      (b) => b.sides.includes('a') && b.sides.includes('b'),
    );
    assert.equal(shared.length, 1, 'one boundary run between the two rooms, not two walls');
    assert.equal(shared[0].coord, 6);
    assert.equal(shared[0].openings.length, 1, 'the door was cut into that one record');
  });

  it('cuts a door and leaves a lintel above it', () => {
    const level = compile(twoRooms());
    const wall = level.solids.filter((s) => s.boundary?.includes('x6'));
    const lintels = wall.filter((s) => s.role === 'lintel');
    assert.equal(lintels.length, 1);
    assert.ok(lintels[0].box.min[2] > 2.0, 'lintel starts at the door head');
    const spans = wall.filter((s) => s.role === 'static_hard');
    assert.equal(spans.length, 2, 'wall is split into two segments beside the opening');
    for (const s of spans) assert.ok(s.box.max[1] <= 2 + 1e-9 || s.box.min[1] >= 3 - 1e-9);
  });

  it('reports a portal between spaces that do not touch', () => {
    const spec = twoRooms();
    spec.layers[0].spaces[1].rect = [9, 0, 5, 5]; // pull room b away
    const level = compile(spec);
    const d = level.diagnostics.find((x) => x.code === 'PORTAL_NOT_ADJACENT');
    assert.ok(d, 'the impossible door is reported');
    assert.ok(d!.suggestions!.length > 0, 'with actionable suggestions');
  });

  it('produces geometry with no duplicate or overlapping surfaces', () => {
    const g = checkGeometry(compile(twoRooms()).solids);
    assert.equal(g.zfight_pairs, 0);
    assert.equal(g.intersecting_pairs, 0);
    assert.ok(g.runtime_ready);
  });

  it('assigns every junction square a single owner', () => {
    // A four-room pinwheel puts a full cross junction in the middle.
    const spec: LevelSpec = {
      schema_version: '1.1',
      id: 'cross',
      name: 'Cross',
      grid: 1,
      layers: [
        {
          id: 'g',
          z: 0,
          height: 3,
          spaces: [
            { id: 'nw', rect: [0, 5, 5, 5] },
            { id: 'ne', rect: [5, 5, 5, 5] },
            { id: 'sw', rect: [0, 0, 5, 5] },
            { id: 'se', rect: [5, 0, 5, 5] },
          ],
          portals: [
            { id: 'p1', between: ['nw', 'ne'], kind: 'door', width_cells: 1, hint: [5, 7] },
            { id: 'p2', between: ['sw', 'se'], kind: 'door', width_cells: 1, hint: [5, 2] },
            { id: 'p3', between: ['nw', 'sw'], kind: 'door', width_cells: 1, hint: [2, 5] },
          ],
        },
      ],
    };
    const g = checkGeometry(compile(spec).solids);
    assert.equal(g.intersecting_pairs, 0, 'no wall claims the same corner as another');
    assert.equal(g.zfight_pairs, 0);
  });

  it('opens the floor above a staircase and keeps the treads walkable', () => {
    const spec: LevelSpec = {
      schema_version: '1.1',
      id: 'stairs',
      name: 'Stairs',
      grid: 1,
      layers: [
        { id: 'l0', z: 0, height: 3.2, spaces: [{ id: 'a', rect: [0, 0, 10, 10] }] },
        { id: 'l1', z: 3.4, height: 3.2, spaces: [{ id: 'b', rect: [0, 0, 10, 10] }] },
      ],
      vertical_connections: [
        {
          id: 'st',
          from_layer: 'l0',
          to_layer: 'l1',
          from_cell: [4, 2],
          to_cell: [4, 8],
          kind: 'stairs',
          width: 2,
          direction: 'N',
        },
      ],
    };
    const level = compile(spec);
    const report = validate(level);
    const v = level.verticals[0];
    // Compiled as a ramp by default: many thin slices, so the surface is a
    // slope the controller never has to step up.
    assert.ok(Math.abs(v.rise) / v.steps <= 0.06, `slice rise ${Math.abs(v.rise) / v.steps} is not ramp-fine`);
    assert.ok(v.gradient < 0.9, `gradient ${v.gradient} is too steep to walk`);
    assert.ok(v.steps > 30, 'a 3.4 m rise should be sliced finely');
    assert.equal(report.geometry.intersecting_pairs, 0, 'stairs do not cut into the slabs');

    // The upper slab must be missing over the stair footprint.
    const upper = level.solids.filter((s) => s.role === 'floor' && s.layer === 'l1');
    for (const slab of upper) {
      const overlapsHole =
        slab.box.min[0] < 6 && slab.box.max[0] > 4 && slab.box.min[1] < 8 && slab.box.max[1] > 2;
      assert.ok(!overlapsHole, `slab ${slab.id} covers the stairwell`);
    }
    assert.equal(report.navigation.components, 1, 'both storeys are one connected space');
  });

  it('keeps dynamic surfaces out of the static shell', () => {
    const spec = twoRooms();
    spec.layers[0].wall_overrides = [{ between: ['a', 'b'], type: 'soft' }];
    const level = compile(spec);
    const shared = level.solids.filter((s) => s.boundary?.includes('x6') && s.role !== 'lintel');
    assert.ok(shared.length > 0);
    for (const s of shared) {
      assert.equal(s.role, 'soft_panel');
      assert.equal(s.dynamic, true);
    }
    // No static wall is emitted behind the panel — that is the whole point.
    const statics = level.solids.filter((s) => s.role === 'static_hard' && s.boundary?.includes('x6'));
    assert.equal(statics.length, 0);
  });

  it('marks an outside boundary as exterior and honours the requested side', () => {
    const spec = twoRooms();
    spec.layers[0].portals!.push({
      id: 'w1',
      between: ['b', OUTSIDE],
      kind: 'window',
      width_cells: 2,
      side: 'E',
    });
    const level = compile(spec);
    const run = level.boundaries.find((b) => b.openings.some((o) => o.portal === 'w1'))!;
    assert.ok(run.exterior);
    assert.equal(run.axis, 'x');
    assert.equal(run.coord, 11, 'the window landed on the east face');
    const o = run.openings.find((x) => x.portal === 'w1')!;
    assert.ok(o.sill > 0, 'a window has a sill');
    const sills = level.solids.filter((s) => s.role === 'sill');
    assert.equal(sills.length, 1);
  });
});

describe('naive control condition', () => {
  it('produces individually valid boxes that are collectively broken', () => {
    const spec = twoRooms();
    const naive = compileNaive(spec).solids;
    const g = checkGeometry(naive);

    // Every primitive passes on its own...
    assert.ok(g.winding_ok, 'every box is consistently wound');
    assert.equal(g.brush_tests_passed, g.brush_tests_total, 'every box passes its half-space test');
    assert.equal(g.degenerate, 0);

    // ...and the collection is still unusable.
    assert.ok(g.zfight_pairs > 0, 'coplanar same-normal pairs exist');
    assert.ok(g.intersecting_pairs > 0, 'volumes overlap');
    assert.equal(g.runtime_ready, false);

    const compiled = checkGeometry(compile(spec).solids);
    assert.equal(compiled.zfight_pairs, 0);
    assert.equal(compiled.intersecting_pairs, 0);
    assert.ok(compiled.runtime_ready);
  });
});
