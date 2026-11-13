/** Project-local evidence using the unmodified physical inspection walker and native compiler. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile,parseAml,bakeNavmesh} from '../../src/architecture/index.ts';
import {prepareInspectionWalk} from '../../review/walk.ts';
import {physicalWalk} from '../../review/physical-walk.ts';
import {VisibilityGeometry} from '../../tools/fps/visibility-geometry.ts';
const output=process.argv[2];if(!output)throw new Error('Expected new output directory');await mkdir(output,{recursive:true});
const source=await readFile(new URL('./level.aml',import.meta.url));
const layout=JSON.parse(await readFile(new URL('./planning/l03/layout.json',import.meta.url),'utf8'));
const encounters=JSON.parse(await readFile(new URL('./production/encounters-c01.json',import.meta.url),'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const enginePaths=['src/architecture/compiler.ts','src/architecture/connection-domains.ts','src/architecture/envelope-suggestions.ts','src/architecture/flights.ts','src/architecture/finalize.ts','src/vector/floor-gaps.ts','src/vector/navigation-build.ts','src/vector/route-domains.ts','src/vector/physical-work.ts','review/physical-walk.ts','review/walk.ts'];
const engine={};for(const p of enginePaths)engine[p]=hash(await readFile(p));
const reuse=process.argv.find(a=>a.startsWith('--artifact='))?.slice(11);
if(reuse&&hash(await readFile(reuse+'/loaded.aml'))!==hash(source))throw new Error('Artifact source differs from current AML');
const level=reuse?JSON.parse(await readFile(reuse+'/compiled.json','utf8')):await compile(parseAml(source.toString()),{navigation:{cell:.0625,physicalWork:50000000},floorGaps:'warning'});
const incompleteCompile=!level.navigation&&level.mesh.indices.length>0;
if(incompleteCompile){console.log('Diagnostic navigation on retained incomplete compiler geometry; original errors preserved');await bakeNavmesh(level,{cell:.0625,physicalWork:50000000});}

await writeFile(output+'/compiled.json',JSON.stringify(level));await writeFile(output+'/loaded.aml',source);
console.log('compiled',level.mesh?.positions?.length,level.diagnostics.filter(d=>d.severity==='error'));
if(process.argv.includes('--compile-only'))process.exit(0);
const physical=physicalWalk(level),optical=new VisibilityGeometry(level),player=level.document.player;
const routes=encounters.routes.map(r=>({id:r.id,kind:'accepted full journey',points:r.waypoints}));
if(!process.argv.includes('--journeys-only')){
 for(const s of layout.stairs){
  const length=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]),ux=(s.b[0]-s.a[0])/length,uy=(s.b[1]-s.a[1])/length;
  for(const lateral of [-s.width/2+.65,0,s.width/2-.65]){
   const p=(t,z)=>[s.a[0]+ux*t-uy*lateral,s.a[1]+uy*t+ux*lateral,z];
   routes.push({id:`${s.id}-width-${lateral}`,kind:'full flight and end landings; quarter/mid/crest',points:[p(s.id==='S5a'?-.4:-.7,s.a[2]),p(0,s.a[2]),p(1.5,s.a[2]+(s.b[2]-s.a[2])*.25),p(3,(s.a[2]+s.b[2])/2),p(4.5,s.a[2]+(s.b[2]-s.a[2])*.75),p(6,s.b[2]),p(6.7,s.b[2])]});
  }
 }
 for(const door of layout.doors){
  const dx=door.b[0]-door.a[0],dy=door.b[1]-door.a[1],length=Math.hypot(dx,dy),x=(door.a[0]+door.b[0])/2,y=door.id==='D02'?45:(door.a[1]+door.b[1])/2;
  routes.push({id:'portal-'+door.id,kind:'direct movement opening, normal crossing',points:[[x+dy/length*.65,y-dx/length*.65,door.z],[x-dy/length*.65,y+dx/length*.65,door.z]]});
 }
 for(const[id,points]of [['SS01',[[92,84,4],[98,84,4]]],['SS02',[[107,58,4],[108,65,4],[108,68,4]]],['SS03',[[116,83,4],[125.5,83,4],[126,77,4]]],['School-arcade',[[96,84,4],[112,84,4]]]])routes.push({id:'passage-'+id,kind:'suspended support / lower occupation',points});
}
const results=[];
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
for(const route of routes.filter(r=>!only||r.id.includes(only)))for(const reverse of [false,true]){
 const points=reverse?route.points.toReversed():route.points;let prepared=prepareInspectionWalk(level,{feet:points[0],yaw:0,pitch:0});if(!prepared.ok){for(const dz of[.08,.16,.2,-.08,-.16]){prepared=prepareInspectionWalk(level,{feet:[points[0][0],points[0][1],points[0][2]+dz],yaw:0,pitch:0});if(prepared.ok)break;}}
 if(!prepared.ok){results.push({id:route.id,kind:route.kind,reverse,ok:false,error:prepared.message,start:points[0]});continue;}
 let feet=prepared.pose.feet,requests=0,distance=0,failure;const trace=[{requested:points[0],actual:feet}],motionSamples=[{feet:[...feet],horizontalDistance:0}];let horizontalDistance=0;
 for(const target of points.slice(1)){
  const start=[...feet],steps=Math.max(1,Math.ceil(Math.hypot(target[0]-start[0],target[1]-start[1])/.035));
  for(let n=1;n<=steps;n++){
   const x=start[0]+(target[0]-start[0])*n/steps,y=start[1]+(target[1]-start[1])*n/steps,previous=feet;feet=prepared.surface.move(feet,x-feet[0],y-feet[1]);requests++;distance+=Math.hypot(...feet.map((v,i)=>v-previous[i]));horizontalDistance+=Math.hypot(feet[0]-previous[0],feet[1]-previous[1]);if(requests%10===0&&['R03','R04','R05','R06','R09','R10'].includes(route.id))motionSamples.push({feet:[...feet],horizontalDistance});
   if(Math.hypot(feet[0]-x,feet[1]-y)>.12){failure={target,request:[x,y],feet};break;}
  }
  trace.push({requested:target,actual:feet});if(failure)break;
 }
 console.log('walked',route.id,reverse,failure?'FAILED':'completed');
 const endError=Math.hypot(...feet.map((v,i)=>v-points.at(-1)[i]));results.push({id:route.id,kind:route.kind,reverse,ok:!failure&&endError<.23,requests,actualTraveledDistance:distance,inspectionMotionEstimate:horizontalDistance/3.4,horizontalDistance,endError,trace,motionSamples,failure});
}
const poses=[];
function place(id,p){
 for(const dz of [0,.08,.16,.2,-.08,-.16]){
  const r=prepareInspectionWalk(level,{feet:[p[0],p[1],p[2]+dz],yaw:0,pitch:0});if(!r.ok)continue;
  const actual=r.pose.feet;poses.push({id,planned:p,actual,standingClear:!physical.blocked(actual,player),crouchingClear:!physical.blocked(actual,{...player,height:1.1})});return actual;
 }
 poses.push({id,planned:p,error:'No valid physical standing placement within one native riser'});return null;
}
const views=[];
if(!process.argv.includes('--journeys-only')){
 for(const scope of [...encounters.sections,...encounters.turningTransfers])for(const pose of scope.poses){
  const a=place(scope.id+'-'+pose.id,pose.p);if(!a)continue;const target=pose.look??[pose.p[0]+1,pose.p[1],pose.p[2]],b=place(scope.id+'-'+pose.id+'-target',target);if(!b)continue;
  const postures=[];for(const[stance,eye]of[['standing',1.674],['crouching',1.023]])for(const[targetStance,targetEye]of[['standing',1.674],['crouching',1.023]])postures.push({stance,targetStance,visible:optical.visible([a[0],a[1],a[2]+eye],[b[0],b[1],b[2]+targetEye])});
  views.push({id:scope.id+'-'+pose.id,role:pose.role,actualFeet:a,actualTargetFeet:b,postures});
 }
 for(const s of layout.spawns)for(let i=0;i<s.positions.length;i++)place(s.id+'-spawn-'+(i+1),[...s.positions[i],s.z]);
 for(const s of layout.objectiveFootprints){const xs=s.p.map(p=>p[0]),ys=s.p.map(p=>p[1]);for(let x=Math.min(...xs)+.35;x<Math.max(...xs);x+=.5)for(let y=Math.min(...ys)+.35;y<Math.max(...ys);y+=.5)place(`plant-${s.id}-${x}-${y}`,[x,y,s.z]);}
}
const engineAfter={};for(const p of enginePaths)engineAfter[p]=hash(await readFile(p));
const report={engineAfterSha256:engineAfter,engineFilesUnchanged:JSON.stringify(engine)===JSON.stringify(engineAfter),incompleteCompile,reusedArtifact:reuse,physicalMeshSha256:hash(JSON.stringify(level.physicalMesh)),sourceSha256:hash(source),physicalHash:level.physicalHash,renderHash:level.renderHash,engineSha256:engine,compileOptions:{navigation:{cell:.0625,physicalWork:50000000},floorGaps:'warning'},player,diagnostics:level.diagnostics,navigation:{passed:level.navigation?.passed,components:level.navigation?.components,unreachableMarkers:level.navigation?.unreachableMarkers,routes:level.navigation?.routes},results,poses,views,opticalScope:{opaqueFaces:optical.opaqueFaces,unknownMaterials:optical.unknownMaterials,omittedDynamicFaces:optical.omittedDynamicFaces},limitations:'Unmodified eroded-navigation inspection walker with physical support/step/headroom checks at <=.035m requested increments; not a continuous capsule sweep or target-game physics. Optical point segments on actual opaque geometry, not weapon/utility/audio/body blocking or human play. Strict-floor-gap output retained separately. Explicit50M physical route budget because current default is work-limited.'};
await writeFile(output+'/verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,passed:results.filter(r=>r.ok).length,total:results.length,failures:results.filter(r=>!r.ok),placementFailures:poses.filter(p=>p.error),diagnostics:level.diagnostics.filter(d=>d.severity==='error')},null,2));
