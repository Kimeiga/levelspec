/** Project-scoped movement and optical evidence; does not change compiler settings or source. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { compile, parseAml } from '../../src/architecture/index.ts';
import { prepareInspectionWalk } from '../../review/walk.ts';
import * as THREE from 'three';
const source = new URL('./level.aml', import.meta.url);
const bytes = await readFile(source);
const level = await compile(parseAml(bytes.toString()), {uvs:false, navigation:{cell:.125}});
assert.deepEqual(level.diagnostics.filter(d=>d.severity==='error'), []);
const directory = new URL('./reviews/evidence/R01-checks/',import.meta.url);
await mkdir(directory,{recursive:true});
const identity = {sourceSha256:createHash('sha256').update(bytes).digest('hex'), physicalHash:level.physicalHash, renderHash:level.renderHash, player:level.navigation.settings.player, navigationCell:.125};
const results=[];
const localWalks=[
 {id:'repair-alley-local',reachable:true,path:[[106,40,0],[106.5,42.5,0],[112,50,0],[114,52,0]]},
 {id:'rag-alley-local',reachable:true,path:[[20,54,0],[20,60,0],[21,63,0],[24,68,0]]},
 {id:'copper-gap-local',reachable:true,path:[[66,35,0],[70,36,0],[76,38,0],[78,44,0]]},
 {id:'west-toe-ground-bypass',reachable:true,path:[[54,60.8,0],[66,60.8,0]]},
 {id:'east-toe-ground-bypass',reachable:true,path:[[96,82,0],[96,94,0]]},
 {id:'clothes-canopy-walk',reachable:true,path:[[24,78,0],[24,69,0]]},
];
for (const route of [...level.navigation.routes,...localWalks]) {
  assert.ok(route.reachable && route.path?.length, route.id);
  const prepared=prepareInspectionWalk(level,{feet:route.path[0],yaw:0,pitch:0});
  assert.ok(prepared.ok,`${route.id} placement`);
  let position=prepared.pose.feet, distance=0;
  const trace=[[...position]];
  for (const target of route.path.slice(1)) {
    let iterations=0;
    while(Math.hypot(position[0]-target[0],position[1]-target[1])>1e-7) {
      assert.ok(++iterations<20000,`${route.id} bounded advancement`);
      const dx=target[0]-position[0],dy=target[1]-position[1],remaining=Math.hypot(dx,dy),scale=Math.min(.04,remaining)/remaining;
      const next=prepared.surface.move(position,dx*scale,dy*scale),moved=Math.hypot(...next.map((v,i)=>v-position[i]));
      assert.ok(moved>1e-8,`${route.id} physically stalled at ${position} toward ${target}`);
      distance+=moved;position=next;if(iterations%10===0)trace.push([...position]);
    }
  }
  assert.ok(Math.hypot(...position.map((v,i)=>v-route.path.at(-1)[i]))<.15,route.id);
  trace.push([...position]);
  results.push({id:route.id,passed:true,distance,estimateAt5_5MetersPerSecond:distance/5.5,trace});
}
await writeFile(new URL('walk-report.json',directory),JSON.stringify({...identity,scope:'Existing navigation with physical capsule support/step/headroom at .04m requested motion; not continuous capsule sweep or multiplayer physics.',routes:results},null,2));
// Actual standing-body placements for opposing camera and crouch optical studies.
const poses=[['point',[86,64,0]],['roof-west',[64,78.6,3.2]],['roof-east',[76,78.6,3.2]],['W-close',[14,82,0]],['E-close',[131,20,0]],['W-follow',[60,68.5,1.45]],['W-mid',[60,70.9,1.93]],['E-mid',[85.9,88,1.77]],['book-counter',[86,76,0]],['carpet',[50,64,0]],['clock-crouch',[78.5,59,0]],['books-crouch',[88,66.8,0]]];
const placements=poses.map(([id,feet])=>{const p=prepareInspectionWalk(level,{feet,yaw:0,pitch:0});return{id,requested:feet,ok:p.ok,pose:p.ok?p.pose:undefined,message:p.ok?undefined:p.message};});
await writeFile(new URL('placements.json',directory),JSON.stringify({...identity,placements},null,2));
// All material colors in this revision are opaque. Include visible noncolliding cloth/stock.
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(level.mesh.positions,3));geometry.setIndex(level.mesh.indices);
const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
function optical(a,b){const origin=new THREE.Vector3(...a),delta=new THREE.Vector3(...b).sub(origin),distance=delta.length();const hit=new THREE.Raycaster(origin,delta.normalize(),.015,distance-.015).intersectObject(mesh)[0];return{visible:!hit,distance,firstHit:hit?.point.toArray()};}
const eyes=[1.674,1.023], markers=level.architecture.markers.filter(m=>/^[WE][1-5]$/.test(m.id));
const observers=[];
for(let x=76.7;x<90;x+=3)for(let y=56.7;y<70;y+=3){const p=prepareInspectionWalk(level,{feet:[x,y,0],yaw:0,pitch:0});if(p.ok)observers.push({id:`point-${x}-${y}`,feet:p.pose.feet});}
observers.push({id:'roof-west-front',feet:[64,78.6,3.2]},{id:'roof-west-rear',feet:[64,80,3.2]},{id:'roof-east-front',feet:[76,78.6,3.2]},{id:'roof-east-rear',feet:[76,81,3.2]});
const protectedRays=[];
for(const from of observers)for(const to of markers)for(const offset of [[0,0],[.25,0],[-.25,0],[0,.25],[0,-.25]])for(const eyeA of eyes)for(const eyeB of eyes){
 const a=[from.feet[0],from.feet[1],from.feet[2]+eyeA],b=[to.position[0]+offset[0],to.position[1]+offset[1],to.position[2]+eyeB];
 const result=optical(a,b);protectedRays.push({from:from.id,to:to.id,offset,eyeA,eyeB,...result});
}
const closePairs=[['W-close',[14,82,1.674],'W-south',[10,80,1.674]],['W-close',[14,82,1.674],'W-north',[10,104,1.674]],['E-close',[131,20,1.674],'E-west',[116,10,1.674]],['E-close',[131,20,1.674],'E-north',[133,20,1.674]],['roof-west',[64,78.6,4.874],'point',[86,64,1.674]],['point',[86,64,1.674],'roof-west',[64,78.6,4.874]],['book',[86,76,1.674],'roof-east',[76,78.6,4.874]]].map(([from,a,to,b])=>({from,to,a,b,...optical(a,b)}));
await writeFile(new URL('targeted-optics.json',directory),JSON.stringify({...identity,scope:'Finite opaque render-triangle rays; no bullet, sound, alpha, utility or multiplayer behavior. Lower eye offsets are optical comparisons, not crouch locomotion.',settings:{eyes,markerOffsetsMeters:.25,pointSpacingMeters:3},protectedRayCount:protectedRays.length,visibleProtectedRays:protectedRays.filter(r=>r.visible),closePairs},null,2));
assert.deepEqual(await readFile(source),bytes);
console.log(JSON.stringify({routes:results.length,placements,visibleProtectedRays:protectedRays.filter(r=>r.visible).length,closePairs},null,2));
