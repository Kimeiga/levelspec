/** Revision-scoped physical and optical evidence; unchanged repository inspection controller. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile,parseAml,validateForRuntime} from '../../src/architecture/index.ts';
import {prepareInspectionWalk} from '../../review/walk.ts';
import {WalkMotion} from '../../review/walk-motion.ts';
import {rayBlocked} from '../../src/vector/validate.ts';
const output=process.argv[2]; if(!output)throw new Error('Output directory required');
await mkdir(output,{recursive:true});
const source=await readFile(new URL('./level.aml',import.meta.url),'utf8');
const layout=JSON.parse(await readFile(new URL('./planning/developed-l02.json',import.meta.url),'utf8'));
const level=await compile(parseAml(source),{uvs:false,navigation:{cell:.125}});
const validation=await validateForRuntime(level,{sealed:true,cell:.125});
const paths=Object.entries(layout.walk_routes).map(([id,points])=>({id,points}));
for(const portal of layout.portals.filter(p=>p.kind==='movement')){
 const dx=portal.b[0]-portal.a[0],dy=portal.b[1]-portal.a[1],length=Math.hypot(dx,dy);
 const mid=[(portal.a[0]+portal.b[0])/2,(portal.a[1]+portal.b[1])/2,portal.sill];
 paths.push({id:portal.id,points:[[-dy/length,dx/length],[dy/length,-dx/length]].map(offset=>[mid[0]+offset[0]*1.2,mid[1]+offset[1]*1.2,mid[2]])});
}
for(const stair of layout.stairs){
 const sign=Math.sign(stair.end[1]-stair.start[1]);
 for(const dx of [-2.1,0,2.1]){
  const x=stair.start[0]+dx;
  paths.push({id:`${stair.id}-width-${dx}`,points:[[x,stair.start[1]-sign*1.4,0],...[0,6,12,18,24].map(n=>[x,stair.start[1]+sign*n*.75,n*.15]),[x,stair.end[1]+sign*1.4,3.6]]});
 }
}
paths.push({id:'west-outside-switch',points:[[26,30,0],[22,30,0],[12,30,0]]});
paths.push({id:'east-outside-switch',points:[[94,74,0],[93,70,0],[94,64,0],[108,64,0],[108,74,0]]});
/** Tread-edge targets admit the adjacent .15 m riser tops; all flat targets use .025 m. */
function correctHeight(goal,feet){
 for(const stair of layout.stairs){
  if(Math.abs(feet[0]-stair.start[0])>3)continue;
  const along=(feet[1]-stair.start[1])*Math.sign(stair.end[1]-stair.start[1]);
  if(along<-.06||along>18.06)continue;
  const low=Math.max(0,Math.min(24,Math.floor((along-.06)/.75)+1))*.15;
  const high=Math.max(0,Math.min(24,Math.floor((along+.06)/.75)+1))*.15;
  return feet[2]>=low-.025&&feet[2]<=high+.025;
 }
 return Math.abs(goal[2]-feet[2])<.025;
}
/** Follow a complete polyline without teleporting at its intermediate waypoints. */
function follow(route,direction){
 const points=direction==='forward'?route.points:[...route.points].reverse();
 const start=prepareInspectionWalk(level,{feet:points[0],yaw:0,pitch:0});
 if(!start.ok)return {id:route.id,direction,passed:false,error:start.message};
 const motion=new WalkMotion(level,start.pose.feet);const samples=[motion.state];let failure;let elapsed=0;
 for(const goal of points.slice(1)){
  let steps=0,stall=0;
  while(Math.hypot(goal[0]-motion.state.feet[0],goal[1]-motion.state.feet[1])>.055&&steps++<4000){
   const before=motion.state.feet;const distance=Math.hypot(goal[0]-before[0],goal[1]-before[1]);
   const dt=Math.min(1/30,distance/3.4);
   motion.advance({forward:1,right:0,yaw:Math.atan2(goal[1]-before[1],goal[0]-before[0]),jump:false,crouch:false},dt);
   elapsed+=dt;
   if(Math.hypot(motion.state.feet[0]-before[0],motion.state.feet[1]-before[1])<1e-5)stall++;else stall=0;
   if(steps%8===0)samples.push(motion.state);
   if(stall>30)break;
  }
  if(steps>=4000||stall>30||!correctHeight(goal,motion.state.feet)){failure={goal,actual:motion.state.feet,reason:stall>30?'stalled':steps>=4000?'budget':'wrong height'};break;}
  samples.push(motion.state);
 }
 return {id:route.id,direction,passed:!failure,failure,elapsed,start:start.pose.feet,end:motion.state.feet,samples};
}
const results=paths.flatMap(route=>['forward','reverse'].map(direction=>follow(route,direction)));
const extraPositions={'W-DEEP':[26,16,0],'E-DEEP':[108,74,0],'W-IN-S':[15,27,0],'E-IN-P':[101,80,0]};
const positions={...layout.positions,...extraPositions};
const admission=Object.entries(positions).map(([id,feet])=>{
 const placed=prepareInspectionWalk(level,{feet,yaw:0,pitch:0});
 if(!placed.ok)return{id,feet,passed:false,error:placed.message};
 const motion=new WalkMotion(level,placed.pose.feet);const stand=motion.state;
 motion.advance({forward:0,right:0,yaw:0,jump:false,crouch:true},1/60);return{id,feet,passed:true,stand,crouch:motion.state};
});
const rays=layout.predicted_rays.map(ray=>({...ray,actual_visible:!rayBlocked(level,ray.eyes[0],ray.eyes[1],true)}));
const sourceSHA256=createHash('sha256').update(source).digest('hex');
const result={sourceSHA256,physicalHash:level.physicalHash,renderHash:level.renderHash,navigationCell:.125,body:level.navigation.settings.player,validation,results,admission,rays,limitations:'Bounded collision-aware inspection movement over standing-eroded navigation, not continuous sweeps or target-engine gameplay. No body, seed, jump or collision relaxation. Optical rays are named sample pairs only.'};
await writeFile(`${output}/inspection.json`,JSON.stringify(result,null,2)+'\n');
await writeFile(`${output}/navigation.json`,JSON.stringify(level.navigation,null,2)+'\n');
console.log(JSON.stringify({sourceSHA256,validation:validation.passed,routes:results.length,failed:results.filter(r=>!r.passed).map(({samples,...r})=>r),admission:admission.filter(p=>!p.passed),rayMismatches:rays.filter(r=>r.predicted_visible!==r.actual_visible)},null,2));
if(!validation.passed||results.some(r=>!r.passed)||admission.some(p=>!p.passed))process.exitCode=1;
