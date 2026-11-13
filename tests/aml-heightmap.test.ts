import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { PNG } from 'pngjs';
import { Vector3 } from 'three';
import { decodeHeightmapPng, compile, parseAml, serializeAml, architectureCompanions, collisionMesh, type CompiledArchitecture } from 'levelspec';

/** Uses an independent PNG encoder; 16-bit input is supplied in native host byte order. */
function grayscale(width: number, height: number, samples: number[], bitDepth: 8 | 16 = 8, filterType = 0): Uint8Array {
  assert.equal(samples.length, width * height);
  const image = new PNG({ width, height });
  image.data = bitDepth === 16 ? Buffer.from(Uint16Array.from(samples).buffer) : Buffer.from(samples);
  return Uint8Array.from(PNG.sync.write(image, { colorType: 0, inputColorType: 0, inputHasAlpha: false, bitDepth, filterType }));
}

/** Changes one IHDR field and recomputes its real CRC, preserving independent decoder admission tests. */
function header(bytes: Uint8Array, change: (data: DataView) => void): Uint8Array {
  const result = Uint8Array.from(bytes), view = new DataView(result.buffer);
  change(new DataView(result.buffer, 16, 13));
  view.setUint32(29, crc32(result.subarray(12, 29)), false);
  return result;
}

/** Replaces a small fixture's IDAT payload with valid PNG framing and a freshly computed CRC. */
function replaceData(bytes: Uint8Array, change: (compressed: Uint8Array) => Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = view.getUint32(offset), end = offset + length + 12;
    if (Buffer.from(bytes.subarray(offset + 4, offset + 8)).toString('ascii') === 'IDAT') {
      const payload = change(Uint8Array.from(bytes.subarray(offset + 8, end - 4))), chunk = new Uint8Array(payload.length + 12), chunkView = new DataView(chunk.buffer);
      chunkView.setUint32(0, payload.length); chunk.set([73, 68, 65, 84], 4); chunk.set(payload, 8);
      chunkView.setUint32(chunk.length - 4, crc32(chunk.subarray(4, chunk.length - 4)));
      return Uint8Array.from(Buffer.concat([bytes.subarray(0, offset), chunk, bytes.subarray(end)]));
    }
    offset = end;
  }
  throw new Error('The independent PNG fixture has no IDAT payload.');
}

/** Reads an authored grid vertex from final physical triangles, including tiled duplicates. */
function elevation(level: CompiledArchitecture, x: number, y: number): number {
  const mesh = collisionMesh(level), values: number[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    if (Math.abs(mesh.positions[i] - x) < 1e-7 && Math.abs(mesh.positions[i + 1] - y) < 1e-7) values.push(mesh.positions[i + 2]);
  }
  assert.ok(values.length > 0, `Physical grid vertex at ${x},${y}`);
  return Math.max(...values);
}

/** Measures actual closed collision volume without calling terrain construction helpers. */
function volume(level: CompiledArchitecture): number {
  const mesh = collisionMesh(level); let result = 0;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [a, b, c] = mesh.indices.slice(i, i + 3).map(n => new Vector3(...mesh.positions.slice(n * 3, n * 3 + 3)));
    result += a.dot(new Vector3().crossVectors(b, c)) / 6;
  }
  return result;
}

/** Verifies successful public compilation while permitting nonfatal review suggestions. */
function valid(level: CompiledArchitecture): void { assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []); }

const byteSamples = [0, 32, 64, 96, 128, 255];
const wordSamples = [0x0000, 0x0001, 0x0100, 0x1234, 0x8000, 0xffff];

for (const bitDepth of [8, 16] as const) {
  test(`PNG${bitDepth} non-square samples preserve row order and every standard row filter`, () => {
    const samples = bitDepth === 8 ? byteSamples : wordSamples;
    for (const filter of [0, 1, 2, 3, 4]) {
      const bytes = grayscale(2, 3, samples, bitDepth, filter), before = Uint8Array.from(bytes);
      const decoded = decodeHeightmapPng(bytes, { maxSamples: 6, maxBytes: bytes.length });
      assert.equal(decoded.width, 2); assert.equal(decoded.height, 3); assert.equal(decoded.bitDepth, bitDepth);
      assert.ok(decoded.samples instanceof Uint16Array);
      assert.deepEqual(Array.from(decoded.samples), samples, `PNG${bitDepth} filter ${filter}`);
      assert.deepEqual(bytes, before);
    }
  });
}

test('heightmap loading rejects damaged PNG data and unsupported representations', () => {
  const png = grayscale(2, 3, byteSamples), badCrc = Uint8Array.from(png); badCrc[29] ^= 1;
  const rgba = PNG.sync.write(new PNG({ width: 2, height: 3 }));
  for (const bytes of [
    png.subarray(0, 12), png.subarray(0, png.length - 5), badCrc, rgba,
    header(png, data => data.setUint8(12, 1)),
    header(png, data => data.setUint8(8, 1)),
    header(png, data => data.setUint8(10, 1)),
    header(png, data => data.setUint8(11, 1)),
  ]) assert.throws(() => decodeHeightmapPng(bytes), 'No partial samples from malformed/unsupported PNG');
});

test('heightmap byte and dimension limits reject before admitting an oversized raster', () => {
  const png = grayscale(2, 3, byteSamples);
  assert.throws(() => decodeHeightmapPng(png, { maxSamples: 5 }), /sample|dimension|limit|budget/i);
  assert.throws(() => decodeHeightmapPng(png, { maxBytes: png.length - 1 }), /byte|limit|budget/i);
  const bomb = header(png, data => { data.setUint32(0, 0x7fffffff, false); data.setUint32(4, 0x7fffffff, false); });
  assert.throws(() => decodeHeightmapPng(bomb, { maxSamples: 16 }), /sample|dimension|limit|budget/i);
  const controller = new AbortController(); controller.abort();
  assert.throws(() => decodeHeightmapPng(png, { signal: controller.signal }), { name: 'AbortError' });
  assert.deepEqual(Array.from(decodeHeightmapPng(png).samples), byteSamples, 'The next decode succeeds after limit/cancellation failures');
});

test('public heightmap compilation maps PNG rows and explicit Y flip onto numeric grid coordinates', async () => {
  const bytes = grayscale(2, 3, byteSamples), source = '<architecture version="1" id="rows"><terrain id="ground" heightmap="height.png" min-height="0" max-height="255" cell-size="2 3"/></architecture>';
  for (const flip of [false, true]) {
    const document = parseAml(flip ? source.replace('cell-size=', 'flip-y="true" cell-size=') : source), before = structuredClone(document);
    const level = await compile(document, { navigation: false, resolveHeightmap: async request => { assert.equal(request.id, 'ground'); assert.equal(request.src, 'height.png'); return bytes; } });
    valid(level);
    for (let row = 0; row < 3; row++) for (let column = 0; column < 2; column++) {
      assert.equal(elevation(level, column * 2, row * 3), byteSamples[(flip ? 2 - row : row) * 2 + column]);
    }
    assert.deepEqual(document, before);
    assert.ok(architectureCompanions(document).includes('height.png'));
    const roundTrip = await compile(parseAml(serializeAml(document)), { navigation: false, resolveHeightmap: async () => bytes });
    valid(roundTrip); assert.equal(roundTrip.physicalHash, level.physicalHash);
  }
});

test('heightmap sample conversion preserves 16-bit precision and normalizes authored dimensions only once', async () => {
  const words = grayscale(2, 3, wordSamples, 16);
  const precise = await compile(parseAml('<architecture version="1" id="words"><terrain id="ground" heightmap="word.png" min-height="0" max-height="1"/></architecture>'), { navigation: false, resolveHeightmap: async () => words });
  valid(precise);
  assert.ok(Math.abs(elevation(precise, 0, 1) - 256 / 65535) < 1e-8, '0x0100 must not truncate or swap its bytes');
  const fractional = await compile(parseAml('<architecture version="1" id="fractional"><terrain id="ground" heightmap="byte.png" min-height="0.0006" max-height="1.0006"/></architecture>'), { navigation: false, resolveHeightmap: async () => grayscale(2, 3, byteSamples) });
  valid(fractional);
  assert.ok(Math.abs(elevation(fractional, 0, 2) - (.001 + 128 / 255)) < 1e-7, 'Derived sample heights are not snapped to millimeters again');
});

test('external heightmap closures retain transformed local bases and outward reflected volume', async () => {
  const bytes = grayscale(2, 2, [255, 255, 255, 255]);
  for (const reflection of [1, -1]) {
    const level = await compile(parseAml(`<architecture version="1" id="closed"><terrain id="ground" heightmap="flat.png" min-height="0" max-height="1" cell-size="2 2" base="0" position="0 0 10" scale="${reflection} 1 2"/></architecture>`), { navigation: false, resolveHeightmap: async () => bytes });
    valid(level);
    const z = collisionMesh(level).positions.filter((_, i) => i % 3 === 2);
    assert.equal(Math.min(...z), 10); assert.equal(Math.max(...z), 12);
    assert.ok(Math.abs(volume(level) - 8) < 1e-6);
  }
});

test('companion discovery and same-path byte edits retain distinct physical identities', async () => {
  const document = parseAml('<architecture version="1" id="companions"><definition id="module"><terrain id="ground" heightmap="same.png" min-height="0" max-height="1"/></definition><instance id="one" ref="module"/></architecture>');
  assert.deepEqual(architectureCompanions(document), ['same.png']);
  const original = grayscale(2, 2, [0, 0, 0, 0]), changed = grayscale(2, 2, [0, 0, 0, 255]);
  const first = await compile(document, { navigation: false, resolveHeightmap: async () => original });
  const second = await compile(document, { navigation: false, resolveHeightmap: async () => changed });
  valid(first); valid(second);
  assert.notEqual(first.physicalHash, second.physicalHash);
  assert.notDeepEqual(collisionMesh(first).positions, collisionMesh(second).positions);
});

test('heightmap load failures stay source-linked and cancellation permits the next useful compile', async () => {
  const source = '<architecture version="1" id="failure"><terrain id="ground" heightmap="ground.png" min-height="0" max-height="1"/></architecture>', document = parseAml(source), before = structuredClone(document);
  for (const resolver of [undefined, async () => { throw new Error('Fixture file unavailable'); }, async () => Uint8Array.from([1, 2, 3])]) {
    const level = await compile(document, { navigation: false, resolveHeightmap: resolver });
    assert.ok(level.diagnostics.some(d => d.severity === 'error' && d.objects.includes('ground') && d.source?.line === 1));
  }
  const controller = new AbortController();
  await assert.rejects(compile(document, { navigation: false, signal: controller.signal, resolveHeightmap: async () => { controller.abort(); return grayscale(2, 2, [0, 0, 0, 255]); } }), { name: 'AbortError' });
  const recovered = await compile(document, { navigation: false, resolveHeightmap: async () => grayscale(2, 2, [0, 0, 0, 255]) });
  valid(recovered); assert.deepEqual(document, before);
});

test('compile admission counts unique decoded rasters and encoded bytes cumulatively', async () => {
  const first = grayscale(2, 2, [0, 0, 0, 255]), second = grayscale(2, 2, [0, 32, 64, 255]);
  const source = '<architecture version="1" id="aggregate"><terrain id="first" heightmap="one.png"/><terrain id="second" heightmap="two.png" position="5 0 0"/></architecture>';
  const document = parseAml(source), resolveHeightmap = async (request: { src: string }) => request.src === 'one.png' ? first : second;
  for (const limits of [{ terrainSamples: 7 }, { heightmapBytes: first.length + second.length - 1 }]) {
    const level = await compile(document, { navigation: false, limits, resolveHeightmap });
    assert.ok(level.diagnostics.some(d => d.severity === 'error' && d.objects.includes('second') && /sample|byte|budget|limit/i.test(d.message)));
  }
  const repeated = parseAml(source.replace('two.png', 'one.png')); let loads = 0;
  const reused = await compile(repeated, { navigation: false, limits: { terrainSamples: 4, heightmapBytes: first.length }, resolveHeightmap: async () => { loads++; return first; } });
  valid(reused); assert.equal(loads, 1, 'A repeated source is snapshotted and decoded once per compile');
  assert.equal(elevation(reused, 1, 1), 1); assert.equal(elevation(reused, 6, 1), 1);
  valid(await compile(document, { navigation: false, resolveHeightmap }));
});

test('open terrain validates final placed bounds and nondegeneracy before publishing geometry', async () => {
  for (const placement of ['scale="1e308 1 1"', 'position="1e8 0 0"', 'scale="1e-20 1e-20 1"']) {
    const level = await compile(parseAml(`<architecture version="1" id="bounds">\n<terrain id="ground" columns="2" rows="2" cell-size="2 2" heights="1 1 1 1" ${placement}/>\n</architecture>`), { navigation: false });
    assert.ok(level.diagnostics.some(d => d.severity === 'error' && d.objects.includes('ground') && d.source?.line === 2));
    assert.ok(collisionMesh(level).positions.every(Number.isFinite), 'Failed terrain cannot publish nonfinite physical coordinates');
  }
  valid(await compile(parseAml('<architecture version="1" id="recovered"><terrain id="ground" columns="2" rows="2" heights="0 0 0 0"/></architecture>'), { navigation: false }));
});


test('heightmap loading independently checks zlib checksum, decoded length, and row filters', () => {
  const png = grayscale(2, 3, byteSamples);
  const badChecksum = replaceData(png, compressed => { compressed[compressed.length - 1] ^= 1; return compressed; });
  assert.throws(() => decodeHeightmapPng(badChecksum), /checksum|zlib|adler/i);
  for (const excess of [false, true]) {
    const wrongLength = replaceData(png, compressed => {
      const raw = inflateSync(compressed);
      return deflateSync(excess ? Buffer.concat([raw, Buffer.from([0])]) : raw.subarray(0, raw.length - 1));
    });
    assert.throws(() => decodeHeightmapPng(wrongLength), /length|header/i);
  }
  const badFilter = replaceData(png, compressed => { const raw = inflateSync(compressed); raw[0] = 5; return deflateSync(raw); });
  assert.throws(() => decodeHeightmapPng(badFilter), /filter/i);
  assert.deepEqual(Array.from(decodeHeightmapPng(png).samples), byteSamples);
});
