import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ray, Vector3 } from 'three';
import { compile, parseAml, collisionMesh, validateForRuntime } from 'levelspec';

const source = await readFile(new URL('../examples/daiban.aml', import.meta.url), 'utf8');
const built = compile(parseAml(source));

/** Checks physical aperture/support geometry independently of source profiles and navigation. */
function hit(level: Awaited<typeof built>, origin: number[], direction: number[]): number {
  const mesh = collisionMesh(level), ray = new Ray(new Vector3(...origin), new Vector3(...direction).normalize());
  let nearest = Infinity;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = mesh.indices.slice(t, t + 3).map(i => new Vector3(...mesh.positions.slice(i * 3, i * 3 + 3)));
    const point = ray.intersectTriangle(a, b, c, false, new Vector3()); if (point) nearest = Math.min(nearest, point.distanceTo(ray.origin));
  }
  return nearest;
}

test('bounded Daiban keeps four local routes with unchanged standing body and explicit source limits', async () => {
  const level = await built, report = await validateForRuntime(level);
  assert.equal(level.document.player.height, 2); assert.equal(level.document.player.radius, .25);
  assert.equal(report.passed, true, JSON.stringify(report.diagnostics));
  assert.deepEqual(level.navigation!.routes.map(r => r.id), ['lower-flight-route', 'near-flight-route', 'middle-gallery-route', 'incline-route']);
  assert.ok(level.navigation!.routes.every(r => r.reachable && r.disjointRoutes >= 1));
  assert.equal((level.document.assets ?? []).length, 0, 'Native source has no imported physical shortcuts');
});

test('Daiban apertures retain intentional infill, open upper portions and backing inclined construction', async () => {
  const level = await built;
  const backing = hit(level, [2.8, 7, 6.6], [0, 1, 0]);
  assert.ok(Math.abs(backing - 1.965) < .001, "The aperture clears its screen and reaches the independently authored backing pocket");
  assert.ok(Math.abs(hit(level, [2.6, 7, 5.4], [0, 1, 0]) - .78) < .001);
  assert.equal(hit(level, [5.8, 4.6, 7.5], [1, 0, 0]), Infinity);
  assert.ok(Math.abs(hit(level, [5.8, 4.6, 7.8], [1, 0, 0]) - .8) < .001);
  const filled = await compile(parseAml(source.replace('</architecture>', '<box id="negative-filled-aperture" width="2.4" depth="0.1" height="2.4" position="1.6 7.6 4.8"/></architecture>')), { navigation: false });
  assert.ok(hit(filled, [2.8, 7, 6.6], [0, 1, 0]) < backing - 1);
});

test('actual lower-flight headroom and column/slab contact match the reviewed sections', async () => {
  const level = await built;
  assert.ok(Math.abs(hit(level, [.7, 5.7, 2.41], [0, 0, 1]) - 2.19) < .001);
  assert.ok(Math.abs(hit(level, [1.45, 3.4, 3], [0, 0, 1]) - 1.8) < .001, 'No buried column cap or air gap before the slab top');
  const missing = await compile(parseAml(source.replace('<slab id="lower-landing"', '<slab collidable="false" id="lower-landing"')));
  assert.ok(missing.diagnostics.some(d => d.severity === 'error' && d.code === 'AML_CONNECTION_SUPPORT' && ['lower-exit', 'lower-flight', 'lower-landing'].every(id => d.objects.includes(id))));
});
