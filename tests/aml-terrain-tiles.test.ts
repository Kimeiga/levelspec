import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { compile, parseAml, collisionMesh, type CompiledArchitecture } from 'levelspec';

/** A numeric plane has independently known positions, normals, and 516 triangles. */
function plane(tileSize = 64) {
  const heights = Array.from({ length: 130 * 3 }, (_, index) => index % 130).join(' ');
  return parseAml(`<architecture version="1" id="tiles" validation="premap"><terrain id="ground" columns="130" rows="3" heights="${heights}" tile-size="${tileSize}"/></architecture>`);
}

/** Requires successful native geometry without relying on navigation coverage. */
function valid(level: CompiledArchitecture): void { assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []); }

/** Preserves winding while ignoring harmless triangle/vertex ordering across tile sizes. */
function triangleSet(level: CompiledArchitecture): string[] {
  const mesh = collisionMesh(level), result: string[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const points = mesh.indices.slice(i, i + 3).map(index => mesh.positions.slice(index * 3, index * 3 + 3));
    const [a, b, c] = points;
    assert.ok((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0, 'Heightfield top winding remains upward');
    const rotations = [0, 1, 2].map(start => JSON.stringify([points[start], points[(start + 1) % 3], points[(start + 2) % 3]]));
    result.push(rotations.sort()[0]);
  }
  return result.sort();
}

test('numeric terrain tiles keep indexed geometry and deterministic physical triangle ranges', async () => {
  const document = plane(), before = structuredClone(document), level = await compile(document, { navigation: false }); valid(level);
  assert.equal(level.mesh.indices.length / 3, 516);
  assert.ok(level.mesh.positions.length / 3 <= 410, '390 samples plus bounded tile seam duplicates, never 1548 per-triangle corners');
  const tiles = level.terrainTiles!;
  assert.equal(tiles.length, 3); assert.equal(new Set(tiles.map(tile => tile.id)).size, 3);
  assert.deepEqual(tiles.map(tile => tile.terrain), ['ground', 'ground', 'ground']);
  assert.deepEqual(tiles.map(tile => tile.index), [[0, 0], [1, 0], [2, 0]]);
  assert.deepEqual(tiles.map(tile => [tile.triangleStart, tile.triangleCount]), [[0, 256], [256, 256], [512, 4]]);
  assert.deepEqual(tiles.map(tile => tile.bounds), [
    { min: [0, 0, 0], max: [64, 2, 64] }, { min: [64, 0, 64], max: [128, 2, 128] }, { min: [128, 0, 128], max: [129, 2, 129] },
  ]);
  assert.ok(tiles.every(tile => tile.hash.length > 0));
  for (const x of [64, 128]) {
    const rows = new Set<number>();
    for (let i = 0; i < level.mesh.positions.length; i += 3) if (level.mesh.positions[i] === x) {
      rows.add(level.mesh.positions[i + 1]); assert.equal(level.mesh.positions[i + 2], x);
      assert.ok(Math.abs(level.mesh.normals[i] + 1 / Math.sqrt(2)) < 1e-7);
      assert.ok(Math.abs(level.mesh.normals[i + 1]) < 1e-7);
      assert.ok(Math.abs(level.mesh.normals[i + 2] - 1 / Math.sqrt(2)) < 1e-7);
    }
    assert.deepEqual([...rows].sort(), [0, 1, 2]);
  }
  const repeated = await compile(document, { navigation: false }); valid(repeated);
  assert.deepEqual(repeated.terrainTiles, tiles); assert.deepEqual(document, before);
});

test('changing tile size preserves the exact physical triangle set and editing a sample invalidates only affected tiles', async () => {
  const document = plane(), original = await compile(document, { navigation: false }), smaller = await compile(plane(32), { navigation: false }); valid(original); valid(smaller);
  assert.deepEqual(triangleSet(smaller), triangleSet(original));
  const edited = structuredClone(document), terrain = edited.elements[0]; assert.equal(terrain.kind, 'terrain');
  if (terrain.kind !== 'terrain') throw new Error('Fixture terrain expected');
  terrain.heights[130 + 10] += .25;
  const changed = await compile(edited, { navigation: false }); valid(changed);
  assert.notEqual(changed.terrainTiles![0].hash, original.terrainTiles![0].hash);
  assert.equal(changed.terrainTiles![1].hash, original.terrainTiles![1].hash);
  assert.equal(changed.terrainTiles![2].hash, original.terrainTiles![2].hash);
  assert.notEqual(changed.physicalHash, original.physicalHash);
});

test('tile admission and mid-tile cancellation preserve source and allow the next useful compile', async () => {
  const document = plane(), before = structuredClone(document);
  for (const limits of [{ terrainSamples: 389 }, { triangles: 515 }]) {
    const rejected = await compile(document, { navigation: false, limits });
    assert.ok(rejected.diagnostics.some(d => d.severity === 'error' && d.objects.includes('ground') && /budget|limit|sample|triangle/i.test(d.message)));
  }
  const controller = new AbortController(); let seenSecondTile = false;
  await assert.rejects(compile(document, { navigation: false, signal: controller.signal, onProgress: stage => {
    if (stage === 'Terrain tile ground:1,0') { seenSecondTile = true; controller.abort(); }
  } }), { name: 'AbortError' });
  assert.equal(seenSecondTile, true, 'Cancellation occurs after an admitted first tile, before the second tile completes');
  const recovered = await compile(document, { navigation: false }); valid(recovered);
  assert.equal(recovered.mesh.indices.length / 3, 516); assert.deepEqual(document, before);
});

test('external million-sample terrain uses bounded indexed tiles without expanding every triangle corner', async () => {
  // This observable preflight prevents an unimplemented expanded-mesh baseline from allocating millions of corners.
  const preflight = await compile(parseAml(`<architecture version="1" id="preflight"><terrain id="ground" columns="5" rows="5" heights="${Array(25).fill(0).join(' ')}"/></architecture>`), { navigation: false });
  valid(preflight); assert.ok(preflight.mesh.positions.length / 3 <= 25);
  const image = new PNG({ width: 1000, height: 1000 }); image.data = Buffer.alloc(1_000_000, 64);
  const bytes = Uint8Array.from(PNG.sync.write(image, { colorType: 0, inputColorType: 0, inputHasAlpha: false, filterType: 0 }));
  const level = await compile(parseAml('<architecture version="1" id="million" validation="premap"><terrain id="ground" heightmap="million.png" min-height="0" max-height="255" tile-size="64"/><profile id="play" points="1 1; 10 1; 10 10; 1 10"/><zone id="playable" profile="play" elevation="64" height="2" role="playable"/><marker id="a" kind="spawn" position="2 5 64"/><marker id="b" kind="objective" position="8 5 64"/><route id="inside" from="a" to="b" min-routes="1" max-distance="8"/></architecture>'), {
    navigation: true, resolveHeightmap: async () => bytes,
  });
  valid(level);
  assert.equal(level.mesh.indices.length / 3, 1_996_002);
  assert.ok(level.mesh.positions.length / 3 <= 1_050_000, 'At most 5% seam overhead for one million samples');
  assert.equal(level.navigation!.routes.find(route => route.id === 'inside')!.reachable, true);
  assert.equal(level.terrainTiles!.length, 256);
  assert.ok(level.terrainTiles!.every(tile => tile.triangleCount <= 8192));
  for (let i = 2; i < level.mesh.positions.length; i += 3) assert.equal(level.mesh.positions[i], 64);
  assert.ok(level.mesh.positions.every(Number.isFinite));
});

test('explicit terrain patches emit referenced vertices without inventing normals for unused points', async () => {
  const level = await compile(parseAml('<architecture version="1" id="unused"><terrain id="ground" points="0 0 0; 2 0 0; 0 2 0; 100 100 100" triangles="0 1 2" orientation="unknown"/></architecture>'), { navigation: false });
  valid(level); assert.equal(level.mesh.positions.length / 3, 3); assert.equal(level.mesh.indices.length, 3);
  assert.deepEqual([...level.mesh.positions].sort((a, b) => a - b), [0, 0, 0, 0, 0, 0, 0, 2, 2]);
  assert.ok(level.mesh.normals.every(Number.isFinite));
});

test('opposed authored patch normals split a shared GPU vertex while retaining both physical triangles', async () => {
  const level = await compile(parseAml('<architecture version="1" id="normals"><terrain id="ground" points="0 0 0; 1 0 0; 0 1 0; 0 -1 0; -1 0 0" triangles="0 1 2; 0 3 4" orientation="unknown"/></architecture>'), { navigation: false });
  valid(level); assert.equal(level.mesh.indices.length, 6);
  assert.ok(level.mesh.normals.every(Number.isFinite));
  const directions: number[] = [];
  for (let i = 0; i < level.mesh.positions.length; i += 3) {
    const normal = level.mesh.normals.slice(i, i + 3); assert.ok(Math.abs(Math.hypot(...normal) - 1) < 1e-7);
    if (level.mesh.positions.slice(i, i + 3).every(n => n === 0)) directions.push(normal[2]);
  }
  assert.ok(directions.some(n => Math.abs(n - 1) < 1e-7)); assert.ok(directions.some(n => Math.abs(n + 1) < 1e-7));
  const triangles: number[][] = [];
  for (let i = 0; i < level.mesh.indices.length; i += 3) triangles.push(level.mesh.indices.slice(i, i + 3).flatMap(index => level.mesh.positions.slice(index * 3, index * 3 + 3)));
  const oriented = (triangle: number[]) => [0, 3, 6].map(offset => [...triangle.slice(offset), ...triangle.slice(0, offset)].join(',')).sort()[0];
  assert.deepEqual(triangles.map(oriented).sort(), [[0,0,0,1,0,0,0,1,0], [0,0,0,0,-1,0,-1,0,0]].map(oriented).sort());
});

test('aggregate terrain tile admission rejects metadata runaway before producing a partial map', async () => {
  const document = plane(1), before = structuredClone(document);
  const rejected = await compile(document, { navigation: false, limits: { terrainTiles: 200 } });
  assert.ok(rejected.diagnostics.some(d => d.severity === 'error' && d.objects.includes('ground') && /budget|limit|tile/i.test(d.message) && d.source));
  const recovered = await compile(document, { navigation: false }); valid(recovered);
  assert.equal(recovered.terrainTiles!.length, 258); assert.deepEqual(document,before);
});
