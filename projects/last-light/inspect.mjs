/** Revision-scoped checks using the repository's unchanged inspection walker. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile,parseAml,validateForRuntime} from '../../src/architecture/index.ts';
import {prepareInspectionWalk} from '../../review/walk.ts';
import {WalkMotion} from '../../review/walk-motion.ts';
import {physicalWalk} from '../../review/physical-walk.ts';
const source=await readFile(new URL('./level.aml',import.meta.url),'utf8');
const level=await compile(parseAml(source),{uvs:false,navigation:{cell:.125}});
const report=await validateForRuntime(level,{sealed:true,cell:.125});
const output=process.argv[2]??'generated/last-light/physical-r05';
await mkdir(output,{recursive:true});
const rot=p=>[80-p[0],72-p[1],p[2]];
const paths=[
 {id:'A-south-to-point',points:[[7,7,0],[17,7,0],[17,13,0],[22,13,0],[23,11,0],[32,11,0],[39,16,0],[39,21,0],[37,24,0],[38,29,0],[38,32,0],[36,33,0],[36,36,0]]},
 {id:'A-arcade-to-point',points:[[7,7,0],[8,16,0],[8,21,0],[18,21,0],[18,33,0],[25,36,0],[30,36,0],[36,36,0]]},
 {id:'west-stair-and-loft-return',points:[[13,21,0],[13,35,3],[25,38,3],[13,35,3],[13,21,0]]},
 {id:'west-low-mouth-under-loft',points:[[18,33,0],[24,36,0],[30,36,0],[24,36,0],[18,33,0]]},
 {id:'court-around-lift',points:[[36,36,0],[36,33,0],[44,33,0],[44,39,0],[36,39,0],[36,36,0]]}
];
paths.push(...paths.slice(0,4).map(p=>({id:p.id.replace(/^A-/,'B-').replace('west','east'),points:p.points.map(rot)})));
const results=[];
for(const route of paths){
 const start=prepareInspectionWalk(level,{feet:route.points[0],yaw:0,pitch:0});
 if(!start.ok){results.push({id:route.id,passed:false,error:start.message});continue;}
 const motion=new WalkMotion(level,start.pose.feet);const samples=[motion.state];let failure;
 for(const goal of route.points.slice(1)){
  let count=0;
  while(Math.hypot(goal[0]-motion.state.feet[0],goal[1]-motion.state.feet[1])>.075&&count++<2400){
   const p=motion.state.feet;const yaw=Math.atan2(goal[1]-p[1],goal[0]-p[0]);
   const dt=Math.min(1/60,Math.hypot(goal[0]-p[0],goal[1]-p[1])/3.4);
   motion.advance({forward:1,right:0,yaw,jump:false,crouch:false},dt);
   if(count%10===0)samples.push(motion.state);
  }
  if(count>=2400||Math.abs(goal[2]-motion.state.feet[2])>.16){failure={goal,actual:motion.state.feet,reason:count>=2400?'stalled':'wrong height'};break;}
  samples.push(motion.state);
 }
 results.push({id:route.id,passed:!failure,failure,start:start.pose.feet,end:motion.state.feet,samples});
}
const physical=physicalWalk(level),player=level.navigation.settings.player;
const clearances=[];
for(const [id,feet] of [['west-under',[24,36,0]],['east-under',[56,36,0]],['west-counter-front',[20,38,3]],['east-counter-front',[60,34,3]]])clearances.push({id,feet,blocked:physical.blocked(feet,player)});
const blocked=[];
for(const [id,feet] of [['lift-west-face',[38.3,36,0]],['A-service-core-face',[11.8,15,0]],['B-service-core-face',[68.2,57,0]],['west-rear-counter-slot',[20,41.5,3]],['east-rear-counter-slot',[60,30.5,3]]])blocked.push({id,feet,blocked:physical.blocked(feet,player)});
const solidPlacements=[[40,36,0],[14,15,0],[66,57,0]].map(feet=>({feet,result:prepareInspectionWalk(level,{feet,yaw:0,pitch:0})}));
const result={solidPlacements,sourceSHA256:createHash('sha256').update(source).digest('hex'),physicalHash:level.physicalHash,renderHash:level.renderHash,navigationCell:.125,player,validationPassed:report.passed,diagnostics:report.diagnostics,results,clearances,blocked,limitations:'Bounded collision/headroom/support samples using unchanged WalkMotion on standing-eroded navigation; not continuous sweeps, target hero mechanics or multiplayer playtest.'};
await writeFile(`${output}/routes.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({source:result.sourceSHA256,validationPassed:report.passed,routes:results.map(({id,passed,failure})=>({id,passed,failure})),clearances,blocked}));
if(!report.passed||results.some(r=>!r.passed)||clearances.some(r=>r.blocked)||blocked.some(r=>!r.blocked)||solidPlacements.some(r=>r.result.ok))process.exitCode=1;
