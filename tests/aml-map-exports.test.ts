import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, parseAml, generateUVs, auditUVs, collisionMesh, toRuntime, toGLB } from 'levelspec';

for (const name of ['daiban', 'dust2']) {
  test(`${name} native geometry exports a valid connected atlas without changing physical surfaces`, async () => {
    const level = await compile(parseAml(await readFile(new URL(`../examples/${name}.aml`, import.meta.url), 'utf8')), { navigation: false });
    assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []);
    const before = collisionMesh(level, true), hash = level.physicalHash, render = structuredClone(level.mesh);
    await generateUVs(level);
    assert.deepEqual(auditUVs(level), []);
    level.mesh.uv1 = Array.from(new Float32Array(level.mesh.uv1!));
    assert.deepEqual(auditUVs(level), [], 'GPU float32 UVs retain overlap and density checks');
    for (const field of ['positions', 'normals', 'indices', 'uv', 'surfaces'] as const) assert.deepEqual(level.mesh[field], render[field]);
    assert.ok(level.stats.uvPrecisionMaxAdjustmentTexels <= .125);
    const overlapping = structuredClone(level);
    const first = overlapping.mesh.indices.slice(0,3);
    for (let k = 0; k < 3; k++) { const target = overlapping.mesh.indices[3+k]; overlapping.mesh.uv1!.splice(target*2,2,...first.flatMap(i => overlapping.mesh.uv1!.slice(i*2,i*2+2)).slice(k*2,k*2+2)); }
    overlapping.mesh.atlasPages![1] = overlapping.mesh.atlasPages![0];
    assert.ok(auditUVs(overlapping).some(d => d.code === 'UV_OVERLAP'));
    assert.deepEqual(collisionMesh(level, true), before); assert.equal(level.physicalHash, hash);
    assert.deepEqual(toRuntime(level).collision, before);
    assert.ok(toGLB(level).byteLength > 100);
    assert.ok(level.atlas!.charts.length < level.mesh.surfaces.length / 2, 'Connected construction cannot degrade to per-triangle islands');
    const collapsed = structuredClone(level); collapsed.mesh.uv1 = collapsed.mesh.uv1!.map(v => v * .1);
    assert.ok(auditUVs(collapsed).some(d => d.code === 'UV_DENSITY'));
  });
}
