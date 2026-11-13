/** Fits inspection cameras to actual supported feet without changing the source body or geometry. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile,parseAml} from '../../src/architecture/index.ts';
import {prepareInspectionWalk} from '../../review/walk.ts';
const output=process.argv[2]??'generated/galini/view-poses';
await mkdir(output,{recursive:true});
const source=await readFile(new URL('./level.aml',import.meta.url));
const level=await compile(parseAml(source.toString()),{navigation:{cell:.125},floorGaps:'error'});
const views=JSON.parse(await readFile(new URL('./views.json',import.meta.url),'utf8'));
const checks=[];
for(const view of views.slice(4)){
 const eye=view.id.includes('low-cover')?1.023:1.674;
 const requested=[view.position[0],view.position[1],view.position[2]-eye];
 let placement=prepareInspectionWalk(level,{feet:requested,yaw:0,pitch:0});
 if(!placement.ok){
  for(const offset of [.025,-.025,.05,-.05,.075,-.075,.1,-.1,.125,-.125,.15,-.15]){
   const feet=[requested[0],requested[1],requested[2]+offset];
   const candidate=prepareInspectionWalk(level,{feet,yaw:0,pitch:0});
   if(candidate.ok){placement=candidate;break;}
  }
 }
 checks.push({id:view.id,requested,eye,placement:placement.ok?placement.pose:placement.message,ok:placement.ok});
 if(placement.ok)view.position=[placement.pose.feet[0],placement.pose.feet[1],placement.pose.feet[2]+eye];
}
const identity=createHash('sha256').update(source).digest('hex');
await writeFile(output+'/views.json',JSON.stringify(views,null,2)+'\n');
await writeFile(output+'/report.json',JSON.stringify({sourceSha256:identity,player:level.document.player,checks,limitations:'Supported camera studies; low-eye captures are optical studies. Actual browser stance captures are recorded separately.'},null,2)+'\n');
console.log(JSON.stringify({sourceSha256:identity,output,checks:checks.length,failures:checks.filter(c=>!c.ok)}));
if(checks.some(c=>!c.ok))process.exitCode=1;
