import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repairPackedSeams } from '../src/vector/uv-seams.ts';
import { triangleOverlap } from '../src/vector/geometry.ts';
import type { MeshData, V3 } from '../src/vector/types.ts';

/** Two physical triangles share a diagonal half-edge at the T-junction (1,1). */
function fixture(penetration = .00002) {
  const source: MeshData = { positions: [0,0,0,2,0,0,0,2,0,1,1,0,2,0,0,2,2,0], normals: Array(18).fill(0), uv: Array(12).fill(0), indices: [0,1,2,3,4,5], surfaces: [0,0] };
  const result = { vertices: [[100,100],[300,100],[100,300],[200-penetration,200-penetration],[300,100],[300,300]].map(uv => ({ uv, chartIndex: 0 })), indices: [0,1,2,3,4,5] };
  return { source, result };
}

/** Measures strict overlap in normalized atlas coordinates, including GPU quantization. */
function overlap(result: ReturnType<typeof fixture>['result'], gpu = false): number {
  const points = result.vertices.map(v => v.uv.map(n => gpu ? Math.fround(n / 1024) : n / 1024));
  return triangleOverlap(points.slice(0,3).map(p => [...p,0] as V3), points.slice(3).map(p => [...p,0] as V3));
}

test('UV-only T-junction repair separates representational overlap and leaves world geometry unchanged', () => {
  const { source, result } = fixture(), before = structuredClone(source);
  assert.ok(overlap(result) > 1e-12); assert.ok(overlap(result,true) > 1e-12);
  const repair = repairPackedSeams(result, source, [0,1], 1024,1024,.125);
  assert.ok(repair.vertices > 0); assert.ok(repair.maxTexelDisplacement > 0 && repair.maxTexelDisplacement < .001);
  assert.ok(overlap(result) <= 1e-12); assert.ok(overlap(result,true) <= 1e-12);
  assert.deepEqual(source,before);
});

test('UV seam repair declines genuine folds and unrelated physical or chart geometry', () => {
  for (const kind of ['fold','other-chart','noncoplanar','same-side']) {
    const { source, result } = fixture(kind === 'fold' ? 20 : .00002);
    if (kind === 'other-chart') for (const vertex of result.vertices.slice(3)) vertex.chartIndex = 1;
    if (kind === 'noncoplanar') source.positions[17] = 1;
    if (kind === 'same-side') source.positions.splice(15,3,0,0,0);
    const before = structuredClone(result);
    assert.ok(overlap(result) > 1e-12);
    assert.equal(repairPackedSeams(result,source,[0,1],1024,1024,.125).vertices,0,kind);
    assert.deepEqual(result,before,kind); assert.ok(overlap(result) > 1e-12);
  }
});

test('T-junction seam updates reach every incident chart vertex alias', () => {
  const { source, result } = fixture();
  source.positions.push(1,1,0,2,2,0,0,2,0); source.normals.push(...Array(9).fill(0)); source.uv.push(...Array(6).fill(0));
  source.indices.push(6,7,8); source.surfaces.push(0);
  result.vertices.push({ uv: [199.99998,199.99998], chartIndex: 0 },{ uv: [300,300], chartIndex: 0 },{ uv: [100,300], chartIndex: 0 }); result.indices.push(6,7,8);
  const before = structuredClone(source);
  const repair = repairPackedSeams(result,source,[0,1,2],1024,1024,.125);
  assert.ok(repair.vertices >= 2); assert.deepEqual(result.vertices[3].uv,result.vertices[6].uv);
  for (let a=0;a<3;a++) for (let b=a+1;b<3;b++) {
    const uv = [a,b].map(t => result.vertices.slice(t*3,t*3+3).map(v => [...v.uv.map(n => Math.fround(n/1024)),0] as V3));
    assert.ok(triangleOverlap(uv[0],uv[1]) <= 1e-12);
  }
  assert.deepEqual(source,before);
});

test('atlas input float32 residue is distinguished from a meaningful physical seam gap', () => {
  for (const gap of [1e-7,1e-6,.01]) {
    const { source, result } = fixture(); source.positions[10] += gap;
    const before = structuredClone(source), repair = repairPackedSeams(result,source,[0,1],1024,1024,.125);
    assert.equal(repair.vertices > 0, gap < 1e-6);
    assert.deepEqual(source,before);
    assert.equal(overlap(result) <= 1e-12, gap < 1e-6);
  }
});

test('seam eligibility follows vector rounding and recorded per-vertex guard bounds', () => {
  const margin = 1024 * 2 ** -23;
  for (const factor of [3.9,4.1]) {
    const { source, result } = fixture(margin * factor);
    const repair = repairPackedSeams(result,source,[0,1],1024,1024,.125);
    assert.equal(repair.vertices > 0, factor < 4);
    assert.equal(overlap(result) <= 1e-12, factor < 4);
  }
  for (const guarded of [false,true,'unrelated']) {
    const { source, result } = fixture(.001);
    const displacements = guarded === true ? [0,0,0,.001,0,0] : guarded === 'unrelated' ? [0,0,0,0,0,.001] : [];
    const repair = repairPackedSeams(result,source,[0,1],1024,1024,.125,undefined,displacements);
    assert.equal(repair.vertices > 0, guarded === true);
    assert.equal(overlap(result) <= 1e-12, guarded === true);
  }
});

test('a thin real opposite-side face retains its side when atlas float32 collapses it', () => {
  const { source, result } = fixture(); source.positions.splice(15,3,1.00000001,1.00000001,0);
  const before = structuredClone(source);
  assert.equal(Math.fround(source.positions[15]), Math.fround(source.positions[9]));
  assert.equal(Math.fround(source.positions[16]), Math.fround(source.positions[10]));
  assert.ok(repairPackedSeams(result,source,[0,1],1024,1024,.125).vertices > 0);
  assert.ok(overlap(result,true) <= 1e-12); assert.deepEqual(source,before);
});

test('UV input identities merge only double roundoff and preserve real float32-collapsed vertices', async () => {
  const { uvVertexIdentities } = await import('../src/vector/uv-seams.ts');
  const midpoint = 1 + 2 ** -24;
  const positions = [87.9,64,2, 87.9+Number.EPSILON*64,64,2, 87.9+1e-6,64,2, midpoint-Number.EPSILON,0,0, midpoint+Number.EPSILON,0,0, 1,0,0, 1+1e-14,0,0];
  const before = [...positions], ids = uvVertexIdentities(positions);
  assert.equal(Math.fround(positions[0]),Math.fround(positions[6]));
  assert.notEqual(positions[0],positions[3]);
  assert.equal(ids[0],ids[1]); assert.notEqual(ids[0],ids[2]);
  assert.notEqual(Math.fround(positions[9]),Math.fround(positions[12]));
  assert.equal(ids[3],ids[4], 'Double-roundoff aliases across a float32 bucket boundary still join');
  assert.notEqual(ids[5],ids[6], 'A difference beyond the documented double-roundoff bound remains distinct');
  assert.deepEqual(positions,before);
});

test('UV vertex roundoff identity works near zero and across mixed coordinate scales', async () => {
  const { uvVertexIdentities } = await import('../src/vector/uv-seams.ts');
  const positions = [0,0,0, 1e-16,0,0, 100,0,0, 100,1e-14,0];
  const ids = uvVertexIdentities(positions);
  assert.equal(ids[0],ids[1]); assert.equal(ids[2],ids[3]);
});

test('a raw T-junction remains eligible when atlas float32 rounds its station to an endpoint', () => {
  const { source, result } = fixture();
  source.positions.splice(9,9,0,2,0,2.0000001,0,0,2,2,0);
  result.vertices[3].uv = [100,300]; result.vertices[4].uv = [299.99998,99.99998];
  const before = structuredClone(source);
  assert.equal(Math.fround(source.positions[12]), Math.fround(source.positions[3]));
  assert.ok(overlap(result) > 1e-12);
  assert.ok(repairPackedSeams(result,source,[0,1],1024,1024,.125).vertices > 0);
  assert.ok(overlap(result,true) <= 1e-12); assert.deepEqual(source,before);
});
