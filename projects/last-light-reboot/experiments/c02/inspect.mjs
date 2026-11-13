import{readFile,writeFile,mkdir}from'node:fs/promises';import{deserialize}from'node:v8';import{createHash}from'node:crypto';
import{prepareInspectionWalk}from'../../../../review/walk.ts';import{WalkMotion}from'../../../../review/walk-motion.ts';import{physicalWalk}from'../../../../review/physical-walk.ts';
const dir=process.argv[2]??'generated/last-light-reboot-c02-native';const level=deserialize(await readFile(`${dir}/level.v8`));
const P=JSON.parse(await readFile(new URL('../../planning/stair-comparison-p01.json',import.meta.url))),D=JSON.parse(await readFile(new URL('../../planning/developed-l02.json',import.meta.url)));
const arc=(t,r=13)=>[46.5+r*Math.cos((180-80*t)*Math.PI/180),39.5+r*Math.sin((180-80*t)*Math.PI/180),Math.min(24,Math.floor(t*24)+1)*.15];
P.positions['C-INFO']=[43,49,3.6];P.paths['observation-pocket']=[[47,49,3.6],[44,49,3.6],P.positions['C-INFO']];
const routes={...D.walk_routes,...P.paths};
const curve=[];for(let n=0;n<24;n++)curve.push(arc((n+.5)/24));
routes['west-public']=P.paths['west-public'].slice(0,11).concat(curve,[[46.2,52.65,3.6],[46.2,51,3.6],[49,51,3.6],[56.5,51,3.6]]);
for(const offset of[-1.2,0,1.2])routes[`curve-width-${offset}`]=[[33.5-offset,37.5,0],...Array.from({length:24},(_,n)=>arc((n+.5)/24,13+offset)),[46.2,52.65,3.6]];
routes['direct-north-switch']=[[37,58,3.6],[43,73,3.6],[63,73,3.6],[67,62,3.6]];
routes['landing-to-direct-north-switch']=[...P.paths['receiving-retreat'],...routes['direct-north-switch'].slice(1)];
routes['lower-underflight']=[[41,39,0],[41,42,0],[42,52,0],[45,52,0]];
routes['information-offset']=[[41,39,0],[37.5,39,0],[41,39,0],[41,42,0],[42,52,0]];
routes['point-ingress']=[[46.2,52.65,3.6],[46.2,51,3.6],[49,51,3.6],[56.5,51,3.6]];
routes['curve-retreat-home']=routes['west-public'].slice(0,-1).reverse();
function follow(id,route,direction){const points=direction==='forward'?route:[...route].reverse();const start=prepareInspectionWalk(level,{feet:points[0],yaw:0,pitch:0});if(!start.ok)return{id,direction,passed:false,error:start.message};const motion=new WalkMotion(level,start.pose.feet);let failure,elapsed=0;const samples=[motion.state],trace=[];
for(const goal of points.slice(1)){let steps=0,stall=0;while(Math.hypot(goal[0]-motion.state.feet[0],goal[1]-motion.state.feet[1])>.055&&steps++<4000){const before=motion.state.feet;const dist=Math.hypot(goal[0]-before[0],goal[1]-before[1]);const dt=Math.min(1/30,dist/3.4);motion.advance({forward:1,right:0,yaw:Math.atan2(goal[1]-before[1],goal[0]-before[0]),jump:false,crouch:false},dt);elapsed+=dt;if(Math.hypot(motion.state.feet[0]-before[0],motion.state.feet[1]-before[1])<1e-5)stall++;else stall=0;if(steps%8===0)samples.push(motion.state);if(stall>30)break;}
const onStraight=D.stairs.filter(x=>x.id!=='X1').some(x=>Math.abs(goal[0]-x.start[0])<=3&&goal[1]>=Math.min(x.start[1],x.end[1])-.06&&goal[1]<=Math.max(x.start[1],x.end[1])+.06);const tolerance=onStraight||goal[2]>0&&goal[2]<3.6?.18:.025;if(steps>=4000||stall>30||Math.abs(goal[2]-motion.state.feet[2])>tolerance){failure={goal,actual:motion.state.feet,reason:stall>30?'stalled':steps>=4000?'budget':'height'};break;}trace.push({goal,actual:motion.state.feet,elapsed});samples.push(motion.state);}
return{id,direction,passed:!failure,failure,elapsed,start:start.pose.feet,end:motion.state.feet,trace,samples};}
const rows=[];for(const[id,path]of Object.entries(routes))for(const direction of['forward','reverse']){rows.push(follow(id,path,direction));}
await writeFile(`${dir}/walking.json`,JSON.stringify({sourceSha256:createHash('sha256').update(await readFile(new URL('../../level-c02.aml',import.meta.url))).digest('hex'),physicalHash:level.physicalHash,body:level.navigation.settings.player,rows,routeDefinitions:routes,limits:'Unmodified WalkMotion; no teleport, seeds, jumping or body changes; finite controller proof only. Flat endpoints height tolerance.025; stair in-flight waypoint adjacent riser tolerance.18.'},null,2));console.log(JSON.stringify(rows.map(({samples,trace,...r})=>r),null,2));
