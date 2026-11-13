import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compile,parseAml,generateUVs,auditUVs,collisionMesh} from 'levelspec';

const values=[0,.2,.1,.4,.1,.5,.2,.3,.3,.1,.6,.2,0,.4,.2,.5];
async function terrain(heights:number[]){return compile(parseAml(`<architecture version="1" id="uv-terrain" validation="premap"><terrain id="ground" columns="4" rows="4" heights="${heights.join(' ')}"/></architecture>`),{navigation:false});}

test('terrain atlas grouping retains connected planar charts while varied heightfields pass strict UV audit',async()=>{
  for(const heights of [Array(16).fill(0),values]){
    const level=await terrain(heights),before=structuredClone(collisionMesh(level,true)),source=structuredClone(level.architecture);assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);
    await generateUVs(level);assert.deepEqual(auditUVs(level),[]);
    level.mesh.uv1=Array.from(new Float32Array(level.mesh.uv1!));assert.deepEqual(auditUVs(level),[]);
    if(heights.every(z=>z===0))assert.ok(level.atlas!.charts.length<18/2,'Coplanar terrain remains connected rather than one chart per triangle');
    assert.deepEqual(collisionMesh(level,true),before);assert.deepEqual(level.architecture,source);
  }
});

test('atlas chart budgets reject varied terrain without corrupting geometry and permit the next bounded attempt',async()=>{
  const level=await terrain(values),mesh=structuredClone(level.mesh),physical=structuredClone(collisionMesh(level,true)),source=structuredClone(level.architecture);
  await assert.rejects(generateUVs(level,{maximumCharts:1}),/chart|budget|limit/i);
  assert.deepEqual(level.mesh,mesh);assert.deepEqual(collisionMesh(level,true),physical);assert.deepEqual(level.architecture,source);
  await generateUVs(level,{maximumCharts:64});assert.deepEqual(auditUVs(level),[]);assert.ok(level.atlas!.charts.length>1&&level.atlas!.charts.length<=64);
  assert.deepEqual(collisionMesh(level,true),physical);
});
