import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compile,parseAml,collisionMesh,generateUVs,auditUVs,toGLB,toRuntime,type V3} from 'levelspec';
import {prepareInspectionWalk} from '../review/walk.ts';

const source=await readFile(new URL('./fixtures/aml/terrain-course.aml',import.meta.url),'utf8');
const raster=await readFile(new URL('./fixtures/aml/terrain-course/hill.png',import.meta.url));
async function build(text=source){return compile(parseAml(text),{resolveHeightmap:async()=>raster});}

test('maintained terrain course routes traverse the actual physical road and tunnel with unchanged player dimensions',async()=>{
  const level=await build();assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'),[]);const player=structuredClone(level.document.player);
  for(const expected of [{id:'graded-walk',start:[2,6,.1],end:[10,6,.9],limit:10},{id:'tunnel-walk',start:[17,4,0],end:[23,4,0],limit:8}]){
    const route=level.navigation!.routes.find(r=>r.id===expected.id)!;assert.ok(route.reachable&&route.path?.length);
    assert.ok(Math.hypot(...route.path![0].map((n,i)=>n-expected.start[i]))<.15);assert.ok(Math.hypot(...route.path!.at(-1)!.map((n,i)=>n-expected.end[i]))<.15);
    for(const step of [.004,.01,.04]){
    const prepared=prepareInspectionWalk(level,{feet:route.path![0],yaw:0,pitch:0});assert.ok(prepared.ok);let feet:V3=prepared.pose.feet,distance=0;
    for(const target of route.path!.slice(1)){
      let iterations=0;
      while(Math.hypot(target[0]-feet[0],target[1]-feet[1])>1e-7){
        assert.ok(++iterations<5000);const dx=target[0]-feet[0],dy=target[1]-feet[1],scale=Math.min(step,Math.hypot(dx,dy))/Math.hypot(dx,dy);
        const next=prepared.surface.move(feet,dx*scale,dy*scale),moved=Math.hypot(...next.map((n,i)=>n-feet[i]));assert.ok(moved>1e-8,`${expected.id} step ${step} blocked at ${feet}`);distance+=moved;feet=next;
      }
    }
    assert.ok(distance<=expected.limit+1e-5);assert.ok(Math.hypot(...feet.map((n,i)=>n-expected.end[i]))<.15);assert.equal(prepareInspectionWalk(level,{feet,yaw:0,pitch:0}).ok,true);
    }
  }
  assert.deepEqual(level.document.player,player);assert.equal(level.waterNavigation!.routes.find(r=>r.id==='under-bridge')!.reachable,true);
});

test('course negative controls block routes rather than inventing support, depth, or overhead clearance',async()=>{
  const barrier=source.replace('</architecture>','<collision id="tunnel-barrier"><box id="plug" width="1" depth="3" height="3" position="19.5 2.5 0"/></collision></architecture>');
  const blocked=await build(barrier);if(blocked.navigation)assert.equal(blocked.navigation.routes.find(r=>r.id==='tunnel-walk')!.reachable,false);assert.ok(blocked.diagnostics.some(d=>d.severity==='error'&&d.objects.includes('tunnel-clearance')));
  const hole=source.replace(/<terrain id="courtyard"[^>]*\/>/,'<profile id="holed-ground" points="0 0; 12 0; 12 12; 0 12"><hole points="5 5; 5 7; 7 7; 7 5"/></profile><terrain id="courtyard" profile="holed-ground" material="earth"/>');
  assert.notEqual(hole,source);assert.equal((await build(hole)).navigation!.routes.find(r=>r.id==='graded-walk')!.reachable,false);
  for(const changed of [source.replace('position="0 0 -2"','position="0 0 -0.1"'),source.replace('elevation="3" thickness="0.25"','elevation="1" thickness="0.25"')]){
    assert.notEqual(changed,source);assert.equal((await build(changed)).waterNavigation!.routes.find(r=>r.id==='under-bridge')!.reachable,false);
  }
});

test('terrain course exports both render and collision GLB without UV changes to physical geometry',async()=>{
  const level=await build(),before=structuredClone(collisionMesh(level,true)),hash=level.physicalHash;
  await generateUVs(level);assert.deepEqual(auditUVs(level),[]);level.mesh.uv1=Array.from(new Float32Array(level.mesh.uv1!));assert.deepEqual(auditUVs(level),[]);
  assert.deepEqual(collisionMesh(level,true),before);assert.equal(level.physicalHash,hash);assert.deepEqual(toRuntime(level).collision,before);
  assert.ok(toGLB(level).byteLength>100);assert.ok(toGLB(level,{purpose:'collision'}).byteLength>100);
});
