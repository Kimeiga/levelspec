import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArchitectureBuilder,compile,parseAml,serializeAml,toRuntime,exportMetadata,collisionMesh } from 'levelspec';

test('native terrain, grading, spatial volume, and shared-edge builders agree with public XML',async()=>{
  const builder=new ArchitectureBuilder('helpers');builder.document.validation='premap';
  builder.terrain('ground',{columns:3,rows:3,heights:Array(9).fill(0)});
  builder.terrain('right',{points:[[2,0,0],[4,0,0],[4,2,0],[2,2,0]],triangles:[[0,1,2],[0,2,3]]});
  builder.path('road',[[0,1,0],[2,1,0]]);builder.grade('road-grade','ground','road',{width:.5,transition:.2});
  builder.profile('plan',[[0,0,0],[2,0,0],[2,2,0],[0,2,0]]);builder.spatialVolume('zone','storage','plan',{role:'storage'});
  builder.path('seam',[[2,0,0],[2,2,0]]);builder.sharedEdge('join','ground','right','seam');
  const source=serializeAml(builder.document),roundTrip=parseAml(source),before=structuredClone(builder.document);
  const built=await compile(builder.document,{navigation:false}),parsed=await compile(roundTrip,{navigation:false});
  assert.deepEqual(built.diagnostics.filter(d=>d.severity==='error'),[]);assert.deepEqual(parsed.diagnostics.filter(d=>d.severity==='error'),[]);
  assert.deepEqual(collisionMesh(built),collisionMesh(parsed));assert.equal(built.physicalHash,parsed.physicalHash);
  const geometryOnly=(volumes:typeof built.spatialVolumes)=>volumes?.map(({source,...volume})=>volume);
  assert.deepEqual(geometryOnly(built.spatialVolumes),geometryOnly(parsed.spatialVolumes));
  assert.deepEqual(builder.document,before);
  assert.equal(toRuntime(built).version,'4');assert.equal(exportMetadata(built,['glb']).version,3);assert.equal(builder.document.version,'1');
  assert.deepEqual(toRuntime(built).terrainTiles,built.terrainTiles);assert.deepEqual(toRuntime(built).spatialVolumes,built.spatialVolumes);
});
