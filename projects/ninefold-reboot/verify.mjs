/** Project-local replay of accepted journeys through the existing physical inspection walker. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile,parseAml} from '../../src/architecture/index.ts';
import {prepareInspectionWalk} from '../../review/walk.ts';
import {physicalWalk} from '../../review/physical-walk.ts';
import {VisibilityGeometry} from '../../tools/fps/visibility-geometry.ts';

const output=process.argv[2];if(!output)throw new Error('Expected new output directory');
await mkdir(output);const bytes=await readFile(new URL('./level.aml',import.meta.url));
const plan=JSON.parse(await readFile(new URL('./production-layout/layout-data-r08.json',import.meta.url),'utf8'));
const level=await compile(parseAml(bytes.toString()),{navigation:{cell:.125},floorGaps:'error'});
const hash=createHash('sha256').update(bytes).digest('hex');
const physical=physicalWalk(level), optical=new VisibilityGeometry(level), player=level.document.player;
const routes=plan.journeys.map(j=>({id:j.id,kind:'accepted journey',points:j.waypoints}));
for(const s of plan.stairs){
 const ux=(s.b[0]-s.a[0])/12,uy=(s.b[1]-s.a[1])/12;
 for(const lateral of [-1.3,0,1.3]){
  const p=(distance,z)=>[s.a[0]+ux*distance-uy*lateral,s.a[1]+uy*distance+ux*lateral,z];
  routes.push({id:`${s.id}-width-${lateral}`,kind:'foot, quarter, mid, three-quarter, crest, receiving landing',points:[p(-2.5,s.low),p(0,s.low),p(3,s.low+.8),p(6,s.low+1.6),p(9,s.low+2.4),p(12,s.high),p(14.5,s.high)]});
 }
}
for(const y of [56.5,58,59.5])routes.push({id:`under-S3-landing-${y}`,kind:'ground crossing across the full landing',points:[[65,y,0],[72,y,0]]});
for(const y of [51,61.5])routes.push({id:`under-S5-${y}`,kind:'Boiler ground below School flight',points:[[30,y,0],[39,y,0]]});
for(const x of [57.5,59,60.8])routes.push({id:`under-S6-${x}`,kind:'Water corridor width beneath Reservoir flight',points:[[x,66,0],[x,75,0]]});
routes.push({id:'west-S4-ground',kind:'A ground beside Sign flight',points:[[84.7,58,0],[84.7,46,0]]});
const portals=[
 ['D-BUTCHER',[[12,29,0],[12,33,0]]],['D-PAPER',[[22,38.5,0],[26,38.5,0]]],
 ['D-UNDER-W',[[40,34,0],[46,34,0]]],['D-UNDER-N',[[52,37,0],[52,43,0]]],
 ['D-DYE-S',[[52.5,49.5,0],[52.5,54,0]]],['D-DYE-W',[[47.5,58,0],[53.5,58,0]]],
 ['D-DYE-E',[[62,58,0],[66,58,0]]],['D-DYE-N',[[59,63,0],[59,68,0]]],
 ['D-A-S',[[78,39,0],[78,45,0]]],['D-A-W',[[70,57.5,0],[76,57.5,0]]],
 ['D-A-N',[[82.5,65,0],[82.5,59,0]]],['D-B-W',[[40,36,3.2],[45,36,3.2]]],
 ['D-B-E',[[64,41,3.2],[60,41,3.2]]],['D-B-N',[[50,61,3.2],[50,57,3.2]]],
 ['D-NORTH',[[44,54,3.2],[44,50,3.2]]],['D-SIGN',[[78,49.25,3.2],[82,49.25,3.2]]],
 ['CT-ground-A',[[78,78,0],[80.5,73,0],[80.5,69,0],[82.5,65,0],[82.5,59,0]]],
];
for(const[id,points]of portals)routes.push({id:'portal-'+id,kind:'direct claimed interface; no alternate graph route',points});
const results=[];
for(const route of routes)for(const reverse of [false,true]){
 const points=reverse?route.points.toReversed():route.points;
 const prepared=prepareInspectionWalk(level,{feet:points[0],yaw:0,pitch:0});
 if(!prepared.ok){results.push({id:route.id,kind:route.kind,reverse,ok:false,error:prepared.message,start:points[0]});continue;}
 let feet=prepared.pose.feet,requests=0,distance=0,failure;const trace=[{requested:points[0],actual:feet}];
 for(const target of points.slice(1)){
  const start=[...feet],steps=Math.max(1,Math.ceil(Math.hypot(target[0]-start[0],target[1]-start[1])/.035));
  for(let n=1;n<=steps;n++){
   const x=start[0]+(target[0]-start[0])*n/steps,y=start[1]+(target[1]-start[1])*n/steps;
   const previous=feet;feet=prepared.surface.move(feet,x-feet[0],y-feet[1]);requests++;distance+=Math.hypot(...feet.map((v,i)=>v-previous[i]));
   if(Math.hypot(feet[0]-x,feet[1]-y)>.12){failure={target,request:[x,y],feet};break;}
  }
  trace.push({requested:target,actual:feet});if(failure)break;
 }
 const end=points.at(-1),endError=Math.hypot(...feet.map((v,i)=>v-end[i]));
 results.push({id:route.id,kind:route.kind,reverse,ok:!failure&&endError<.18,requests,actualTraveledDistance:distance,endError,trace,failure});
}

const poses=[];
function place(id,p){
 for(const dz of [0,.01,.08,.16,-.08,-.16]){
  const requested=[p[0],p[1],p[2]+dz],r=prepareInspectionWalk(level,{feet:requested,yaw:0,pitch:0});
  if(r.ok){const actual=r.pose.feet;const row={id,planned:p,actual,placementHeightAdjustment:actual[2]-p[2],standingClear:!physical.blocked(actual,player),crouchingClear:!physical.blocked(actual,{...player,height:1.1})};poses.push(row);return actual;}
 }
 poses.push({id,planned:p,error:'No physical standing placement within one native riser of planned feet'});return null;
}
const views=[];
for(const v of plan.views){
 const a=place(v.id,v.feet),b=place(v.id+'-target',v.targetFeet);if(!a||!b)continue;
 const postures=[];
 for(const [an,ah] of [['stand',1.86],['crouch',1.023]])for(const [bn,bh] of [['stand',1.86],['crouch',1.023]])postures.push({observer:an,target:bn,visible:optical.visible([a[0],a[1],a[2]+ah],[b[0],b[1],b[2]+bh])});
 views.push({...v,actualFeet:a,actualTargetFeet:b,postures});
}
const apertureOffsets=[];
for(const aperture of [{id:'well',upper:[57,48.6,3.2],lower:[50,49,0],axis:1},{id:'sign',upper:[80.75,52,3.2],lower:[76,52,0],axis:1}]){
 for(const offset of [-.5,0,.5]){
  const p=[...aperture.upper];p[aperture.axis]+=offset;const a=place(`${aperture.id}-offset-${offset}`,p);if(!a)continue;
  for(const [name,target] of aperture.id==='well'?[['underpass',[52,40,0]],['well',[50,49,0]],['Dye',[52,54,0]]]:[['shoulder',[76,52,0]],['plant',[87,43.8,0]],['south',[78,43,0]]]){
   const b=place(`${aperture.id}-${name}-target`,target);if(!b)continue;
   for(const [stance,h] of [['stand',1.86],['crouch',1.023]])apertureOffsets.push({aperture:aperture.id,offset,target:name,observerFeet:a,targetFeet:b,targetStance:stance,visible:optical.visible([a[0],a[1],a[2]+1.86],[b[0],b[1],b[2]+h])});
  }
 }
}
const roofChecks=[],spawnChecks=[];
const roofPos=[[36,64,6.4],[46,71,6.4],[54,73,6.4],[66,77,6.4]];
const lowerPos=[['Boiler',[30,60,0]],['Dye',[59,63,0]],['Water',[59,74,0]],['CT-center',[78,78,0]],['CT-west',[77,75,0]],['T',[11,14,0]],['Well',[50,49,0]],['Well-south',[52,43,0]],['Well-north',[52,50,0]],['Pocket',[57,48.6,3.2]],['Underpass',[52,40,0]],['B-mouth',[44.5,39.7,3.2]]];
for(let i=0;i<roofPos.length;i++){
 const a=place('roof-residual-'+i,roofPos[i]);if(!a)continue;
 for(const[name,p]of lowerPos){const b=place('roof-'+name,p);if(b)roofChecks.push({observerFeet:a,target:name,targetFeet:b,standing:optical.visible([a[0],a[1],a[2]+1.86],[b[0],b[1],b[2]+1.86]),crouchedObserver:optical.visible([a[0],a[1],a[2]+1.023],[b[0],b[1],b[2]+1.86])});}
}
const spawnPositions={T:[[11,14,0],[8,12,0],[8,16,0],[11,11,0],[11,18,0]],CT:[[78,78,0],[77,75,0],[79.5,75,0],[77,80,0],[79.5,80,0]]};
for(const[team,pp]of Object.entries(spawnPositions))for(let i=0;i<pp.length;i++){
 const a=place(`${team}-spawn-${i}`,pp[i]);if(!a)continue;
 for(const[name,target]of team==='T'?[['Butcher',[15,33,0]],['Awning',[36,23,0]]]:[['A-rear',[82,61,0]],['Dye-exit',[59,69,0]]]){const b=place(team+'-'+name,target);if(b)spawnChecks.push({team,offset:i,feet:a,target:name,targetFeet:b,visible:optical.visible([a[0],a[1],a[2]+1.86],[b[0],b[1],b[2]+1.86])});}
}
const report={sourceSha256:hash,physicalHash:level.physicalHash,renderHash:level.renderHash,player,diagnostics:level.diagnostics,navigation:{passed:level.navigation?.passed,components:level.navigation?.components,coverage:level.navigation?.coverage,unreachableMarkers:level.navigation?.unreachableMarkers,routes:level.navigation?.routes},results,poses,views,apertureOffsets,roofChecks,spawnChecks,opticalScope:{opaqueFaces:optical.opaqueFaces,unknownMaterials:optical.unknownMaterials,omittedDynamicFaces:optical.omittedDynamicFaces},limitations:'Existing eroded navigation with physical support/step/headroom checks at <=0.035m requested substeps, not continuous capsule sweep. Optical finite mesh segments, not weapons/ballistics, audio, utility, body blocking or observed player behavior. Posture rays are optical; browser stance captures verify actual placement separately.'};
await writeFile(output+'/verification.json',JSON.stringify(report,null,2)+'\n');
await writeFile(output+'/loaded.aml',bytes);
await writeFile(output+'/compiled.json',JSON.stringify(level));
console.log(JSON.stringify({output,sourceSha256:hash,navPassed:level.navigation?.passed,passed:results.filter(r=>r.ok).length,total:results.length,failures:results.filter(r=>!r.ok),placementFailures:poses.filter(p=>p.error),diagnostics:level.diagnostics}));
if(results.some(r=>!r.ok)||poses.some(p=>p.error)||level.diagnostics.some(d=>d.severity==='error'))process.exitCode=1;
