import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, parseAml, toRuntime } from 'levelspec';

test('reported route paths are copied world coordinates and preserve actual path distance', async () => {
  const level = await compile(parseAml('<architecture version="1" id="path" validation="premap"><profile id="p" points="0 0; 10 0; 10 10; 0 10"/><slab id="floor" profile="p" elevation="1"/><marker id="a" kind="spawn" element="floor" position="2 3 1"/><marker id="b" kind="objective" element="floor" position="8 7 1"/><route id="walk" from="a" to="b" min-routes="1" max-distance="8"/><route id="missing" from="a" to="absent" min-routes="1"/></architecture>'));
  const route = level.navigation!.routes.find(r => r.id === 'walk')!;
  assert.ok(route.path && route.path.length >= 2);
  assert.ok(Math.hypot(...route.path[0].map((n, i) => n - [2, 3, 1][i])) < .1);
  assert.ok(Math.hypot(...route.path.at(-1)!.map((n, i) => n - [8, 7, 1][i])) < .1);
  const distance = route.path.slice(1).reduce((sum, p, i) => sum + Math.hypot(...p.map((n, axis) => n - route.path![i][axis])), 0);
  assert.ok(Math.abs(distance - route.distance) < 1e-6); assert.ok(Math.abs(distance - Math.sqrt(52)) < .1);
  assert.equal(level.navigation!.routes.find(r => r.id === 'missing')!.path, undefined);
  assert.deepEqual(toRuntime(level).navigation!.routes.find(r => r.id === 'walk')!.path, route.path);
});


test('a physical barrier breaks a required local route and emits no successful path', async () => {
  const level = await compile(parseAml('<architecture version="1" id="blocked" validation="premap"><profile id="p" points="0 0; 10 0; 10 6; 0 6"/><slab id="floor" profile="p"/><box id="barrier" width="0.5" depth="6" height="3" position="4.75 0 0"/><marker id="a" kind="spawn" element="floor" position="2 3 0"/><marker id="b" kind="objective" element="floor" position="8 3 0"/><route id="walk" from="a" to="b" min-routes="1" max-distance="8"/></architecture>'));
  const route = level.navigation!.routes.find(r => r.id === 'walk')!;
  assert.equal(route.reachable, false); assert.equal(route.path, undefined);
});
