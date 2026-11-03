import { it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFlightBands } from '../src/core/flight.ts';
import { checkGeometry } from '../src/core/validate.ts';
import type { Box, Solid } from '../src/core/types.ts';

const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box =>
  ({ min: [x0, y0, z0], max: [x1, y1, z1] });
const solid = (id: string, role: Solid['role'], b: Box, dynamic = false): Solid =>
  ({ id, role, box: b, layer: 'raised', spaces: [], dynamic });
const volume = (solids: Solid[]) => solids.reduce((sum, { box: b }) =>
  sum + (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) * (b.max[2] - b.min[2]), 0);

it('preserves the exact raised flight and wall volume across a six-millimetre wing', () => {
  const walls = [
    solid('left', 'exterior_wall', box(0, 1, 10, 0.1, 2, 14)),
    solid('right', 'exterior_wall', box(1.9, 1, 10, 2, 2, 14)),
  ];
  const pieces = [
    solid('step0', 'ramp', box(0, 0, 10, 2, 0.994, 10.1)),
    solid('step1-wing', 'ramp', box(0, 0.994, 10, 2, 1, 10.2)),
    solid('step1-core', 'ramp', box(0.1, 1, 10, 1.9, 1.5, 10.2)),
    solid('step2', 'ramp', box(0.1, 1.5, 10, 1.9, 2, 10.3)),
  ];
  assert.ok(checkGeometry([...walls, ...pieces]).zfight_pairs > 0, 'fixture did not expose the sliver');
  normalizeFlightBands(walls, pieces, {
    id: 'flight', layer: 'raised', axis: 1, bounds: box(0, 0, 10, 2, 2, 10.3), wallThickness: 0.2,
  });
  assert.ok(Math.abs(volume(walls) - 1.4512) < 1e-9, `changed occupied volume: ${volume(walls)}`);
  const report = checkGeometry(walls);
  assert.equal(report.zfight_pairs, 0, JSON.stringify(report.zfight_examples));
  assert.equal(report.intersecting_pairs, 0, JSON.stringify(report.intersecting_examples));
  const top = (x: number, y: number) => Math.max(...walls.filter(({ box: b }) =>
    x > b.min[0] && x < b.max[0] && y > b.min[1] && y < b.max[1]).map((s) => s.box.max[2]));
  assert.equal(top(0.05, 0.997), 10.2, 'lost the landing wing');
  assert.equal(top(0.05, 1.1), 14, 'changed the wall cap');
  assert.equal(top(1, 1.1), 10.2, 'changed the original tread height');
});

it('leaves a dynamic side panel separate from the immutable flight shell', () => {
  const panel = solid('panel', 'exterior_wall', box(1.9, 1, 10, 2, 2, 14), true);
  const shell = [panel];
  normalizeFlightBands(shell, [solid('step', 'ramp', box(0.1, 0, 10, 1.9, 2, 10.2))], {
    id: 'flight', layer: 'raised', axis: 1, bounds: box(0, 0, 10, 2, 2, 10.2), wallThickness: 0.2,
  });
  assert.deepEqual(shell.find((s) => s.id === 'panel'), panel);
  assert.equal(checkGeometry(shell).intersecting_pairs, 0);
});

for (const height of [10.195, 10.1999995]) {
  it(`preserves valid bridging wall columns beside the ${height} tread`, () => {
    const shell = [
      solid('bridge', 'exterior_wall', box(0, 1, 10, 0.1, 2, 14)),
      solid('upper', 'exterior_wall', box(0, 2, 10.2, 0.1, 3, 14)),
    ];
    const pieces = [
      solid('low', 'ramp', box(0, 0, 10, 2, 1, height)),
      solid('high', 'ramp', box(0.1, 1, 10, 1.9, 3, 10.3)),
    ];
    assert.ok(checkGeometry([...shell, ...pieces]).runtime_ready);
    normalizeFlightBands(shell, pieces, {
      id: 'flight', layer: 'raised', axis: 1, bounds: box(0, 0, 10, 2, 3, 10.3), wallThickness: 0.2,
    });
    assert.ok(checkGeometry(shell).runtime_ready, JSON.stringify(checkGeometry(shell)));
  });
}

it('repairs one side without cutting a valid close-height bridge on the other', () => {
  const shell = [
    solid('left-bridge', 'exterior_wall', box(0, 1.5, 10, 0.1, 2.25, 14)),
    solid('left-upper', 'exterior_wall', box(0, 2.25, 10.105, 0.1, 3, 14)),
    solid('right-cap', 'exterior_wall', box(1.9, 2.25, 10, 2, 3, 14)),
  ];
  const pieces = [
    solid('step0', 'ramp', box(0, 0, 10, 2, 0.75, 10.05)),
    solid('step1', 'ramp', box(0, 0.75, 10, 2, 1.5, 10.1)),
    solid('step2-core', 'ramp', box(0.1, 1.5, 10, 1.9, 2.25, 10.15)),
    solid('step3', 'ramp', box(0.1, 2.25, 10, 1.9, 3, 10.2)),
    solid('right-wing', 'ramp', box(1.9, 2.244, 10, 2, 2.25, 10.15)),
  ];
  assert.equal(checkGeometry([...shell, ...pieces]).zfight_pairs, 1);
  normalizeFlightBands(shell, pieces, {
    id: 'flight', layer: 'raised', axis: 1, bounds: box(0, 0, 10, 2, 3, 10.2), wallThickness: 0.2,
  });
  assert.ok(checkGeometry(shell).runtime_ready, JSON.stringify(checkGeometry(shell)));
  assert.ok(Math.abs(volume(shell) - 1.589715) < 1e-9, 'changed the occupied union');
});

for (const height of [10.305, 10.3000005]) {
  it(`retains wall columns ending just above the flight at ${height}`, () => {
    const shell = [solid('wall', 'exterior_wall', box(0, 1, 10, 0.1, 2, height))];
    const pieces = [
      solid('low', 'ramp', box(0, 0, 10, 2, 1, 10.2)),
      solid('high', 'ramp', box(0.1, 1, 10, 1.9, 2, 10.3)),
    ];
    assert.ok(checkGeometry([...shell, ...pieces]).runtime_ready);
    normalizeFlightBands(shell, pieces, {
      id: 'flight', layer: 'raised', axis: 1, bounds: box(0, 0, 10, 2, 2, 10.3), wallThickness: 0.2,
    });
    assert.ok(checkGeometry(shell).runtime_ready, JSON.stringify(checkGeometry(shell)));
  });
}
