/** Project-specific read-only replay of authored routes through the existing inspection walker. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile,parseAml} from '../../src/architecture/index.ts';
import {VisibilityGeometry} from '../../tools/fps/visibility-geometry.ts';
import {prepareInspectionWalk} from '../../review/walk.ts';
const output=process.argv[2]??'generated/galini/walk';
await mkdir(output,{recursive:true});
const bytes=await readFile(new URL('./level.aml',import.meta.url));
const level=await compile(parseAml(bytes.toString()),{navigation:{cell:.125},floorGaps:"error"});
const results=[];
const spawnPlacements=level.document.markers.filter(m=>m.kind.includes('spawn')).map(marker=>({id:marker.id,...prepareInspectionWalk(level,{feet:marker.position,yaw:0,pitch:0})})).map(({surface,...result})=>result);
for(const route of level.navigation?.routes??[]){
 for(const reverse of [false,true]){
  const points=reverse?route.path?.toReversed():route.path;
  if(!points?.length){results.push({id:route.id,reverse,ok:false,error:'No authored navigation path'});continue;}
  const prepared=prepareInspectionWalk(level,{feet:points[0],yaw:0,pitch:0});
  if(!prepared.ok){results.push({id:route.id,reverse,ok:false,error:prepared.message});continue;}
  let feet=prepared.pose.feet,requests=0,failure;
  const trace=[feet];
  for(const target of points.slice(1)){
   const start=[...feet],steps=Math.max(1,Math.ceil(Math.hypot(target[0]-start[0],target[1]-start[1])/.035));
   for(let n=1;n<=steps;n++){
    const x=start[0]+(target[0]-start[0])*n/steps,y=start[1]+(target[1]-start[1])*n/steps;
    feet=prepared.surface.move(feet,x-feet[0],y-feet[1]);requests++;
    if(Math.hypot(feet[0]-x,feet[1]-y)>.12){failure={target,request:[x,y],feet};break;}
   }
   trace.push(feet);if(failure)break;
  }
  const end=points.at(-1),error=Math.hypot(...feet.map((v,i)=>v-end[i]));
  results.push({id:route.id,reverse,ok:!failure&&error<.18,distance:route.distance,requests,endError:error,trace,failure});
 }
}
const optics=new VisibilityGeometry(level);
const eye=(feet,height)=>[feet[0],feet[1],feet[2]+height];
const spawns=level.document.markers.filter(m=>m.kind.includes('spawn'));
const spawnSightlines=[];
for(const a of spawns.filter(m=>m.kind.startsWith('attacker')))for(const b of spawns.filter(m=>m.kind.startsWith('defender')))for(const ah of [1.674,1.023])for(const bh of [1.674,1.023])spawnSightlines.push({from:a.id,to:b.id,eyes:[ah,bh],visible:optics.visible(eye(a.position,ah),eye(b.position,bh))});
const offsets=[-.6,0,.6];
const offsetPlacements=[];
for(const marker of spawns)for(const dx of offsets)for(const dy of offsets){
 const requested=[marker.position[0]+dx,marker.position[1]+dy,marker.position[2]];
 const placement=prepareInspectionWalk(level,{feet:requested,yaw:0,pitch:0});
 offsetPlacements.push({id:marker.id,team:marker.team,offset:[dx,dy],requested,ok:placement.ok,...(placement.ok?{feet:placement.pose.feet}:{error:placement.message})});
}
let offsetQueries=0;const offsetLeaks=[];
for(const a of offsetPlacements.filter(p=>p.ok&&p.team==='attack'))for(const b of offsetPlacements.filter(p=>p.ok&&p.team==='defend'))for(const ah of [1.674,1.023])for(const bh of [1.674,1.023]){
 offsetQueries++;
 if(optics.visible(eye(a.feet,ah),eye(b.feet,bh)))offsetLeaks.push({from:a,to:b,eyes:[ah,bh]});
}
const scale=1.3;
const opticalPairs=[['B-market',[83,65,0],[73,58,0]],['B-harbor',[83,65,0],[81,51,0]],['B-upper',[83,65,0],[78.3,77.4,4]],['Gate-west',[56,68,4],[38,41,0]],['Gate-east',[56,68,4],[57,45,0]],['A-low',[31,70.5,4],[28,57,4]],['B-low',[77,62.5,0],[83,53,0]]].map(([id,a,b])=>{
 const from=[a[0]*scale,a[1]*scale,a[2]],to=[b[0]*scale,b[1]*scale,b[2]];
 const fromPlacement=prepareInspectionWalk(level,{feet:from,yaw:0,pitch:0}),toPlacement=prepareInspectionWalk(level,{feet:to,yaw:0,pitch:0});
 return {id,from,to,supported:fromPlacement.ok&&toPlacement.ok,fromPlacement:fromPlacement.ok?fromPlacement.pose:fromPlacement.message,toPlacement:toPlacement.ok?toPlacement.pose:toPlacement.message,standing:optics.visible(eye(from,1.674),eye(to,1.674)),lowEyeToStanding:optics.visible(eye(from,1.023),eye(to,1.674))};
});
const report={optical:{offsetGrid:offsets,offsetPlacements,offsetQueries,offsetLeaks,unknownMaterials:optics.unknownMaterials,omittedDynamicFaces:optics.omittedDynamicFaces,spawnSightlines,opticalPairs},sourceSha256:createHash('sha256').update(bytes).digest('hex'),physicalHash:level.physicalHash,renderHash:level.renderHash,spawnPlacements,player:level.document.player,diagnostics:level.diagnostics,navigation:{passed:level.navigation?.passed,components:level.navigation?.components,coverage:level.navigation?.coverage,diagnostics:level.navigation?.diagnostics},results,limitations:'Bounded eroded-navigation/physical support samples; not continuous capsule sweeps, crowd simulation or target-engine combat.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,diagnostics:level.diagnostics,spawnPlacements:spawnPlacements.map(({id,ok,message})=>({id,ok,message})),passed:results.filter(r=>r.ok).length,total:results.length,failures:results.filter(r=>!r.ok)}));
if(offsetQueries!==8100||offsetLeaks.length||offsetPlacements.some(p=>!p.ok)||spawnPlacements.some(r=>!r.ok)||!level.navigation?.passed||level.diagnostics.some(d=>d.severity==='error')||results.some(r=>!r.ok))process.exitCode=1;
