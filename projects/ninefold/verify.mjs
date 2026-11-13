/** Project-specific read-only replay of authored routes through the existing inspection walker. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile,parseAml} from '../../src/architecture/index.ts';
import {prepareInspectionWalk} from '../../review/walk.ts';
const output=process.argv[2]??'generated/ninefold/walk';
await mkdir(output,{recursive:true});
const bytes=await readFile(new URL('./level.aml',import.meta.url));
const level=await compile(parseAml(bytes.toString()),{navigation:{cell:.125},floorGaps:"error"});
const results=[];
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
const report={sourceSha256:createHash('sha256').update(bytes).digest('hex'),physicalHash:level.physicalHash,renderHash:level.renderHash,player:level.document.player,diagnostics:level.diagnostics,navigation:{passed:level.navigation?.passed,components:level.navigation?.components,coverage:level.navigation?.coverage,diagnostics:level.navigation?.diagnostics},results,limitations:'Bounded eroded-navigation/physical support samples; not continuous capsule sweeps, crowd simulation or target-engine combat.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,diagnostics:level.diagnostics,passed:results.filter(r=>r.ok).length,total:results.length,failures:results.filter(r=>!r.ok)}));
if(!level.navigation?.passed||level.diagnostics.some(d=>d.severity==='error')||results.some(r=>!r.ok))process.exitCode=1;
