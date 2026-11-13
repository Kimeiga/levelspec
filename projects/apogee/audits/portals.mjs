/** Local physical transitions and body stances; uses the unchanged inspection harness. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile,parseAml} from '../../../src/architecture/index.ts';
import {prepareInspectionWalk} from '../../../review/walk.ts';
import {WalkMotion} from '../../../review/walk-motion.ts';
import {physicalWalk} from '../../../review/physical-walk.ts';
import {rayBlocked} from '../../../src/vector/validate.ts';
const output=process.argv[2]??'generated/apogee/portal-walk';
await mkdir(output,{recursive:true});
const bytes=await readFile(new URL('../level.aml',import.meta.url));
const plan=JSON.parse(await readFile(new URL('../plan-data.json',import.meta.url),'utf8'));
const level=await compile(parseAml(bytes.toString()),{navigation:{cell:.125},floorGaps:'error'});
const physical=physicalWalk(level),player=level.document.player;
function height(x,y,z){
 if(x>=10&&x<=16&&y>32&&y<48)return(y-32)/4;
 if(x>=32&&x<=38&&y>36&&y<48)return Math.min(24,Math.floor((y-36)*2+1e-6)+1)/6+.001;
 if(x>=68.3&&x<=74&&y>74&&y<90)return Math.min(24,Math.floor((y-74)*1.5+1e-6)+1)/6+.001;
 return z;
}
const transitions=[];
for(const portal of plan.portals){
 const[a,b,c,d]=portal.line, length=Math.hypot(c-a,d-b);
 const mid=[(a+c)/2,(b+d)/2],normal=[-(d-b)/length,(c-a)/length];
 const original=[-1,1].map(sign=>{const x=mid[0]+normal[0]*sign,y=mid[1]+normal[1]*sign;return[x,y,height(x,y,portal.z)];});
 for(const reverse of[false,true]){
  const points=reverse?[...original].reverse():original;
  const supported=physical.resolve(points[0],points[0],player);
  const prepared=prepareInspectionWalk(level,{feet:supported??points[0],yaw:0,pitch:0});
  const record={id:portal.id,reverse,requested:points,ok:false};transitions.push(record);
  if(!prepared.ok){record.error=prepared.message;continue;}
  let feet=prepared.pose.feet;const start=[...feet],target=points[1];let failure;
  for(let i=1;i<=80;i++){
   const x=start[0]+(target[0]-start[0])*i/80,y=start[1]+(target[1]-start[1])*i/80;
   feet=prepared.surface.move(feet,x-feet[0],y-feet[1]);
   if(Math.hypot(feet[0]-x,feet[1]-y)>.12){failure={requested:[x,y],feet};break;}
  }
  record.finish=feet;record.failure=failure;
  record.ok=!failure&&Math.hypot(feet[0]-target[0],feet[1]-target[1])<.12&&!physical.blocked(feet,player);
 }
}
const stances=[];
for(const[id,feet,opponent]of[
 ['A-L1',[17.5,75.8,4],[22,64,4]],
 ['B-L3',[97.5,65.8,0],[98,50,0]],
 ['SK-L1',[48.2,79,4],[63,79,4]],
 ['SN-L1',[87,27.8,0],[81,22,0]],
]){
 const prepared=prepareInspectionWalk(level,{feet,yaw:0,pitch:0});
 const record={id,ok:false};stances.push(record);
 if(!prepared.ok){record.error=prepared.message;continue;}
 const motion=new WalkMotion(level,prepared.pose.feet),idle={forward:0,right:0,yaw:0,jump:false,crouch:false};
 record.standing=motion.state;
 motion.advance({...idle,crouch:true},1/60);record.crouching=motion.state;
 const eye=[...opponent];eye[2]+=1.86;
 record.standingRayBlocked=rayBlocked(level,record.standing.eye,eye);
 record.crouchingRayBlocked=rayBlocked(level,record.crouching.eye,eye);
 motion.advance(idle,1/60);record.restored=motion.state;
 record.ok=record.standing.height===2&&record.crouching.height===1.1&&record.crouching.stance==='crouching'&&record.restored.stance==='standing'&&!record.standingRayBlocked&&record.crouchingRayBlocked;
}
const report={sourceSha256:createHash('sha256').update(bytes).digest('hex'),physicalHash:level.physicalHash,player,transitions,stances,passed:transitions.every(r=>r.ok)&&stances.every(r=>r.ok),limitations:'Bounded physical/navigation samples with unchanged capsule; no continuous sweeps or multiplayer crowd/combat simulation. Ray occlusion uses physical triangles for these static visible native obstacles; no claim about bullet penetration.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,transitions:transitions.filter(r=>r.ok).length,total:transitions.length,failed:transitions.filter(r=>!r.ok),stances:stances.map(({id,ok,standingRayBlocked,crouchingRayBlocked,error})=>({id,ok,standingRayBlocked,crouchingRayBlocked,error})),report:output+'/report.json'}));
if(!report.passed)process.exitCode=1;
