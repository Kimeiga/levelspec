import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, parseAml, collisionMesh } from 'levelspec';

test('terrain closure follows the authored local frame before placement', async () => {
  const document = parseAml('<architecture version="1" id="closure"><terrain id="ground" columns="2" rows="2" heights="1 1 1 1" cell-size="2 2" base="0" position="0 0 10" scale="1 1 2"/></architecture>');
  const before = structuredClone(document), level = await compile(document, { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  const mesh = collisionMesh(level), elevations = mesh.positions.filter((_,i) => i%3===2);
  assert.ok(elevations.length > 0);
  assert.equal(Math.min(...elevations),10); assert.equal(Math.max(...elevations),12);
  assert.deepEqual(document,before);
});

test('intentional open terrain does not require a closed shell or navigation coverage', async () => {
  const level = await compile(parseAml('<architecture version="1" id="open"><terrain id="ground" columns="2" rows="2" heights="0 0 1 1" cell-size="2 2"/></architecture>'), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
  assert.equal(collisionMesh(level).indices.length,6);
});
