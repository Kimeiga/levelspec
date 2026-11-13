/** Read-only, revision-matched movement and optical inspection for Fusion. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compile, parseAml } from '../../src/architecture/index.ts';
import { prepareInspectionWalk } from '../../review/walk.ts';
import * as THREE from 'three';

const output = process.argv[2] ?? 'generated/fusion/checks';
await mkdir(output, {recursive:true});
const bytes = await readFile(new URL('./level.aml', import.meta.url));
const level = await compile(parseAml(bytes.toString()), {uvs:false, navigation:{cell:.125}});
const identity = {sourceSha256:createHash('sha256').update(bytes).digest('hex'), physicalHash:level.physicalHash, renderHash:level.renderHash, player:level.document.player, navigationCell:.125};

/** Follow each requested XY displacement through the existing physical walker without teleporting. */
function replay(id, points) {
  const prepared = prepareInspectionWalk(level, {feet:points[0],yaw:0,pitch:0});
  if (!prepared.ok) return {id,ok:false,error:prepared.message};
  let feet = prepared.pose.feet, requests = 0, distance = 0;
  const trace = [[...feet]];
  for (const target of points.slice(1)) {
    const start = [...feet];
    const steps = Math.max(1, Math.ceil(Math.hypot(target[0]-start[0],target[1]-start[1])/.04));
    for (let n=1;n<=steps;n++) {
      const x=start[0]+(target[0]-start[0])*n/steps, y=start[1]+(target[1]-start[1])*n/steps;
      const next=prepared.surface.move(feet,x-feet[0],y-feet[1]);
      distance+=Math.hypot(...next.map((v,i)=>v-feet[i]));feet=next;requests++;
      if (requests%10===0) trace.push([...feet]);
      if (Math.hypot(feet[0]-x,feet[1]-y)>.12) return {id,ok:false,distance,requests,trace,failure:{target,request:[x,y],feet}};
    }
  }
  trace.push([...feet]);
  const endError = Math.hypot(...feet.map((v,i)=>v-points.at(-1)[i]));
  return {id,ok:endError<.18,distance,requests,endError,trace,estimatedSecondsAt5MetersPerSecond:distance/5};
}
const walks=[];
for (const route of level.navigation?.routes??[]) {
  if (!route.reachable || !route.path?.length) {walks.push({id:route.id,ok:false,error:'No reachable declared route'});continue;}
  walks.push(replay(route.id,route.path));
  walks.push(replay(route.id+'-reverse',route.path.toReversed()));
}
const placements = [
 ['south-bridge',[0,-11,0]],['open-arc',[0,-2.5,0]],['north-arc',[0,10.5,0]],['west-port',[-12,4,0]],['east-port',[13,4.5,0]],
 ['gallery-port',[-19,2,3.2]],['gallery-a',[-26,16,3.2]],['a-entry',[-31,5,0]],['a-plant',[-34,14,0]],['a-rear',[-26,24,0]],
 ['b-port-entry',[23,8,0]],['b-plant',[35,17,0]],['b-rear',[35.5,25,0]],['trench',[35.5,-5,-1.2]],['bypass',[23.5,-6,0]],
 ['t-spawn',[-14,-33,0]],['d-spawn',[0,30,0]],['a-low',[-34,20.5,0]],['b-low',[24,21,0]],
].map(([id,feet])=>{const p=prepareInspectionWalk(level,{feet,yaw:0,pitch:0});return {id,requested:feet,ok:p.ok,pose:p.ok?p.pose:undefined,error:p.ok?undefined:p.message};});

const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(level.mesh.positions,3));geometry.setIndex(level.mesh.indices);
const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
/** Sample opaque rendered triangles, separately from body fit and collision. */
function ray(from,to) {
 const a=new THREE.Vector3(...from), delta=new THREE.Vector3(...to).sub(a), distance=delta.length();
 const hit=new THREE.Raycaster(a,delta.normalize(),.015,distance-.015).intersectObject(mesh)[0];
 return {visible:!hit,distance,firstHit:hit?.point.toArray()};
}
const byId = new Map(placements.map(p=>[p.id,p]));
const pairNames=[['gallery-port','west-port'],['gallery-port','a-plant'],['gallery-a','a-plant'],['gallery-a','west-port'],['a-rear','a-plant'],['b-rear','b-plant'],['west-port','open-arc'],['east-port','open-arc'],['north-arc','open-arc'],['b-port-entry','b-plant'],['bypass','b-port-entry']];
const optics=[];
for(const [from,to] of pairNames)for(const eyeA of [1.674,1.023])for(const eyeB of [1.674,1.023]) {
 const a=byId.get(from), b=byId.get(to);
 if(!a.ok||!b.ok) {optics.push({from,to,unavailable:'One body placement failed'});continue;}
 const origin=a.pose.feet.map((v,i)=>v+(i===2?eyeA:0));const target=b.pose.feet.map((v,i)=>v+(i===2?eyeB:0));
 optics.push({from,to,eyeA,eyeB,...ray(origin,target)});
}
const spawnRays=[];
for(const spawn of ['t-spawn','d-spawn'])for(const target of ['a-plant','b-plant','gallery-port','open-arc'])for(const offset of [[0,0],[.7,0],[-.7,0],[0,.7],[0,-.7]]) {
 const a=byId.get(spawn).requested,b=byId.get(target).requested;
 spawnRays.push({spawn,target,offset,...ray([a[0]+offset[0],a[1]+offset[1],a[2]+1.674],[b[0],b[1],b[2]+1.674])});
}
await writeFile(output+'/walk-report.json',JSON.stringify({...identity,scope:'26 directional replays through eroded nav with physical support and bounded .04m requests; not continuous sweeps or multiplayer physics.',navigation:level.navigation,walks},null,2));
await writeFile(output+'/view-checks.json',JSON.stringify({...identity,scope:'Body placements and finite opaque optical rays. Low eye heights do not prove crouch locomotion, bullet cover, audio or utility.',placements,optics,spawnRays},null,2));
await writeFile(output+'/diagnostics.json',JSON.stringify({identity,diagnostics:level.diagnostics},null,2));
console.log(JSON.stringify({output,passed:walks.filter(w=>w.ok).length,total:walks.length,failures:walks.filter(w=>!w.ok).map(({trace,...w})=>w),placementFailures:placements.filter(p=>!p.ok),visibleSpawnRays:spawnRays.filter(r=>r.visible),optics:optics.filter(r=>r.eyeA===1.674&&r.eyeB===1.674)},null,2));
if(walks.some(w=>!w.ok)||level.diagnostics.some(d=>d.severity==='error'))process.exitCode=1;
