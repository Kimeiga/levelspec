import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NavigationSurface } from '../review/navigation-surface.ts';

/** Two patches share a real edge subdivided only on the right-hand side. */
function patch(gap = 0, height = 0) {
  return { positions: [0,0,0, 1,0,0, 1,2,0, 0,2,0, 1+gap,0,height, 2,0,height, 2,1,height, 1+gap,1,height, 2,2,height, 1+gap,2,height], indices: [0,1,2, 0,2,3, 4,5,6, 4,6,7, 7,6,8, 7,8,9] };
}

test('inspection walking traverses actual partial shared navigation edges', () => {
  const surface = new NavigationSurface(patch(), [.5,.5,0]);
  let position: [number, number, number] = [.5,.5,0];
  for (let i = 0; i < 25; i++) position = surface.move(position, .04, 0);
  assert.ok(Math.abs(position[0] - 1.5) < 1e-5);
});

test('partial-edge adjacency never bridges an unsupported gap or different-height floor', () => {
  for (const data of [patch(.01), patch(0,.2)]) {
    const surface = new NavigationSurface(data, [.5,.5,0]);
    let position: [number, number, number] = [.5,.5,0];
    for (let i = 0; i < 25; i++) position = surface.move(position, .04, 0);
    assert.ok(position[0] <= 1.000001); assert.equal(position[2], 0);
  }
});

test('split-edge membership supports reverse movement and both halves without connecting near gaps', () => {
  for (const y of [.5, 1.5]) for (const direction of [-1, 1]) {
    const start: [number, number, number] = [direction > 0 ? .5 : 1.5, y, 0], surface = new NavigationSurface(patch(), start);
    let position = start;
    for (let i = 0; i < 25; i++) position = surface.move(position, direction * .04, 0);
    assert.ok(Math.abs(position[0] - (direction > 0 ? 1.5 : .5)) < 1e-5);
    assert.equal(surface.reachable.size, 6);
  }
  const surface = new NavigationSurface(patch(.0001), [.5, .5, 0]);
  assert.equal(surface.reachable.size, 2);
});

test('true sloped shared edges connect while noncollinear heights and vertex-only contacts do not', () => {
  const sloped = patch();
  for (let i = 0; i < sloped.positions.length; i += 3) sloped.positions[i + 2] = sloped.positions[i + 1] / 5;
  const connected = new NavigationSurface(sloped, [.5, .5, .1]); assert.equal(connected.reachable.size, 6);
  const folded = patch(); folded.positions[7 * 3 + 2] = .05;
  const separated = new NavigationSurface(folded, [.5, .5, 0]); assert.equal(separated.reachable.size, 2);
  const vertex = { positions: [0,0,0, 1,0,0, 1,1,0, 1,1,0, 2,1,0, 2,2,0], indices: [0,1,2, 3,4,5] };
  assert.equal(new NavigationSurface(vertex, [.5,.2,0]).reachable.size, 1);
});

test('sub-tolerance float noise cannot disconnect a diagonal shared edge by changing its dominant axis', () => {
  const data = { positions: [0,0,0, 2,2,0, 0,2,0, 0,0,0, 1,1.0000001,0, 1,0,0, 1,1.0000001,0, 2,2,0, 2,0,0], indices: [0,1,2, 3,4,5, 6,7,8] };
  assert.equal(new NavigationSurface(data, [.25,.5,0]).reachable.size, 3);
});
