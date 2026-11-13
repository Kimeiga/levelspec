/** Directly exercise the southern Laundry threshold in both directions on existing physical navigation. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile,parseAml} from '../../src/architecture/index.ts';
import {prepareInspectionWalk} from '../../review/walk.ts';
const output=process.argv[2]??'generated/galini/mouths-b09';await mkdir(output,{recursive:true});
const source=await readFile(new URL('./level.aml',import.meta.url));
const level=await compile(parseAml(source.toString()),{navigation:{cell:.125},floorGaps:'error'});
const results=[];
for(const [id,start,end] of [['laundry-south-in',[25,36,.01],[30,41,.01]],['laundry-south-out',[30,41,.01],[25,36,.01]]]){
 const walk=prepareInspectionWalk(level,{feet:start,yaw:0,pitch:0});
 if(!walk.ok){results.push({id,ok:false,message:walk.message});continue;}
 let feet=walk.pose.feet;const trace=[feet],steps=Math.ceil(Math.hypot(end[0]-start[0],end[1]-start[1])/.035);let failure;
 for(let n=1;n<=steps;n++){
  const x=start[0]+(end[0]-start[0])*n/steps,y=start[1]+(end[1]-start[1])*n/steps;
  feet=walk.surface.move(feet,x-feet[0],y-feet[1]);trace.push(feet);
  if(Math.hypot(feet[0]-x,feet[1]-y)>.12){failure={request:[x,y],feet};break;}
 }
 results.push({id,start,end,ok:!failure&&Math.hypot(...feet.map((v,i)=>v-end[i]))<.18,steps,trace,failure});
}
const report={sourceSha256:createHash('sha256').update(source).digest('hex'),player:level.document.player,results,limitations:'Direct bounded physical/nav movement; no teleport between endpoints or new navigation seeds.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,results:results.map(({trace,...result})=>result)}));
if(results.some(r=>!r.ok))process.exitCode=1;
