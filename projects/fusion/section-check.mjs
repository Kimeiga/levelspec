/** Supplemental B04 views, grounded in the compiled walking surface. */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile, parseAml} from '../../src/architecture/index.ts';
import {prepareInspectionWalk} from '../../review/walk.ts';
import * as THREE from 'three';

const output=process.argv[2];
await mkdir(output,{recursive:false});
const source=await readFile(new URL('./level.aml',import.meta.url));
const level=await compile(parseAml(source.toString()),{uvs:false,navigation:{cell:.125}});
const identity={sourceSha256:createHash('sha256').update(source).digest('hex'),physicalHash:level.physicalHash,renderHash:level.renderHash};
const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute(level.mesh.positions,3));
geometry.setIndex(level.mesh.indices);
const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
mesh.updateMatrixWorld();
function sight(origin,target){
 const a=new THREE.Vector3(...origin),delta=new THREE.Vector3(...target).sub(a),distance=delta.length();
 const hit=new THREE.Raycaster(a,delta.normalize(),.015,distance-.015).intersectObject(mesh)[0];
 return {visible:!hit,distance,firstHit:hit?.point.toArray()};
}
function placement(feet){
 const placed=prepareInspectionWalk(level,{feet,yaw:0,pitch:0});
 return placed.ok?{ok:true,feet:placed.pose.feet}:{ok:false,error:placed.message};
}
function eye(feet,height=1.674){return [feet[0],feet[1],feet[2]+height];}

/** Keep camera poses on actually traversed treads, rather than a smooth ramp approximation. */
function replay(id,points){
 const prepared=prepareInspectionWalk(level,{feet:points[0],yaw:0,pitch:0});
 if(!prepared.ok)return {id,ok:false,error:prepared.message,trace:[]};
 let feet=prepared.pose.feet,distance=0;const trace=[[...feet]];
 for(const target of points.slice(1)){
  const start=[...feet],steps=Math.max(1,Math.ceil(Math.hypot(target[0]-start[0],target[1]-start[1])/.04));
  for(let i=1;i<=steps;i++){
   const x=start[0]+(target[0]-start[0])*i/steps,y=start[1]+(target[1]-start[1])*i/steps;
   const next=prepared.surface.move(feet,x-feet[0],y-feet[1]);
   distance+=Math.hypot(...next.map((v,k)=>v-feet[k]));feet=next;trace.push([...feet]);
   if(Math.hypot(feet[0]-x,feet[1]-y)>.12)return {id,ok:false,distance,trace,failure:{request:[x,y],feet}};
  }
 }
 const endError=Math.hypot(...feet.map((v,i)=>v-points.at(-1)[i]));
 return {id,ok:endError<.18,distance,endError,trace};
}
const southwest=[[0,-2.5,.01],[-4.596,-.596,.01],[-6.5,4,.01],[-12,4,.01]];
const supplementalWalks=[replay('southwest-arc',southwest),replay('southwest-arc-reverse',southwest.toReversed())];
const stairWalks=new Map();
for(const id of ['gallery-ascent','gallery-a-descent']){
 const route=level.navigation.routes.find(r=>r.id===id);
 const walked=replay(id,route.path);supplementalWalks.push(walked);stairWalks.set(id,walked);
}

// Feet, target eye, and optional low observation eye. Low observations are not crouch movement tests.
const requests=[
 ['t-center',[-14,-33,0],[-7,-20,1.674]],
 ['t-cleanlock-offset',[-20,-33,0],[-27,-24,1.674]],
 ['t-cooling-offset',[-2,-32,0],[24,-21,1.674]],
 ['cleanlock-reverse',[-27,-17,0],[-27,-28,1.674]],
 ['cask-approach',[-31,-9,0],[-31,6,1.674]],
 ['d-center',[0,30,0],[10,30,1.674]],
 ['d-switchboard-turn',[10,31.5,0],[31,30,1.674]],
 ['west-port-to-gallery',[-12,4,0],[-19,2,4.874]],
 ['east-port-reverse',[13,4.5,0],[0,-2.5,1.674]],
 ['south-arc-to-west',[-4,-.8,0],[-12,4,1.674]],
 ['gallery-in-leader',[-22.5,-7,2.8],[-12,4,1.674]],
 ['gallery-in-follower',[-22.5,-8.5,2.2],[-12,4,1.674]],
 ['gallery-out-leader',[-23.5,12.5,2.514],[-34,18,1.674]],
 ['gallery-out-follower',[-23.5,11,1.829],[-34,18,1.674]],
 ['gallery-a-support',[-26,16,3.2],[-30,8,1.674]],
 ['a-low-standing',[-34,20.5,0],[-31,5,1.674]],
 ['a-low-crouched-eye',[-34,20.5,0],[-31,5,1.674],1.023],
 ['a-rear-arrival',[-26,24,0],[-34,14,1.674]],
 ['a-rear-west-offset',[-27.2,22.2,0],[-34,14,1.674]],
 ['a-plant-reverse',[-34,14,0],[-26,24,1.674]],
 ['b-low-standing',[24.5,20.5,0],[24,8,1.674]],
 ['b-low-crouched-eye',[24.5,20.5,0],[24,8,1.674],1.023],
 ['b-rear-arrival',[35.5,25,0],[35,17,1.674]],
 ['b-rear-east-offset',[38,22.8,0],[35,17,1.674]],
 ['b-plant-reverse',[35,17,0],[35.5,25,1.674]],
 ['trench-north-leader',[35.5,4.5,-.6],[35,17,1.674]],
 ['trench-north-follower',[35.5,3,-.96],[35,17,1.674]],
 ['trench-south-descent',[35.5,-14.5,-.6],[35.5,5,1.194]],
 ['b-entry-grounded',[35.5,5,-.48],[30,18,1.674]],
 ['ground-bypass',[23.5,-6,0],[23,8,1.674]],
 ['east-port-to-bypass',[23,6,0],[23.5,-6,1.674]],
];
const views=[],placements=[];
for(const[id,requested,target,height=1.674]of requests){
 const stairId=id.startsWith('gallery-in-')?'gallery-ascent':id.startsWith('gallery-out-')?'gallery-a-descent':undefined;
 const walked=stairId?stairWalks.get(stairId):undefined;
 const actual=walked?.ok?walked.trace.reduce((best,point)=>Math.hypot(point[0]-requested[0],point[1]-requested[1])<Math.hypot(best[0]-requested[0],best[1]-requested[1])?point:best):requested;
 const p=placement(actual);placements.push({id,requested,placementBasis:stairId?'nearest performed standing-walk pose':'direct supported placement',...p});
 if(p.ok)views.push({id,position:eye(p.feet,height),target,projection:'perspective',fov:75,appearance:'full-render',standingBodyFeet:p.feet,eyeHeight:height});
}
const spawnChecks=[];
for(const marker of level.document.markers.filter(m=>m.kind==='attacker_spawn'||m.kind==='defender_spawn')){
 const p=placement(marker.position);
 const targets=[[-34,14,1.674],[35,17,1.674],[-19,2,4.874],[0,-2.5,1.674],[-12,4,1.674],[13,4.5,1.674]];
 spawnChecks.push({id:marker.id,requested:marker.position,...p,rays:p.ok?targets.map(target=>({target,...sight(eye(p.feet),target)})):[]});
}
const galleryChecks=[];
for(const x of [-21.4,-20.6,-19.8,-19])for(const y of [0,2,4,6,7.5,9,11.5,13,15,17]){
 const p=placement([x,y,3.2]);if(!p.ok)continue;
 const origin=eye(p.feet);
 const targets={westPort:[-12,4,1.674],aPlant:[-34,14,1.674],aSouth:[-31,5,1.674],aNorth:[-34,18,1.674],aEast:[-26,19,1.674]};
 const rays=Object.fromEntries(Object.entries(targets).map(([id,target])=>[id,sight(origin,target)]));
 galleryChecks.push({feet:p.feet,rays});
}
await writeFile(output+'/views.json',JSON.stringify(views,null,2)+'\n');
await writeFile(output+'/report.json',JSON.stringify({...identity,scope:'Grounded standing body placements, camera-height variants, finite opaque optical rays and bounded .04m walking replays. No multiplayer occlusion, ballistic, crouch locomotion or utility simulation.',placements,spawnChecks,galleryChecks,supplementalWalks},null,2)+'\n');
console.log(JSON.stringify({output,views:views.length,placementFailures:placements.filter(p=>!p.ok),walkFailures:supplementalWalks.filter(p=>!p.ok).map(({trace,...p})=>p),spawnFailures:spawnChecks.filter(p=>!p.ok),visibleSpawnRays:spawnChecks.flatMap(p=>p.rays.filter(r=>r.visible).map(r=>({id:p.id,...r}))),gallerySamples:galleryChecks.length,galleryBothPlantAndPort:galleryChecks.filter(p=>p.rays.westPort.visible&&p.rays.aPlant.visible).length},null,2));
if(placements.some(p=>!p.ok)||spawnChecks.some(p=>!p.ok)||supplementalWalks.some(p=>!p.ok))process.exitCode=1;
