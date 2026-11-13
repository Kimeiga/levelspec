/** Compiled body admission, posture, and finite sample visibility for actual capture requests. */
import {readFile,writeFile,mkdir}from'node:fs/promises';
import {createHash}from'node:crypto';
import {compile,parseAml}from'../../src/architecture/index.ts';
import {prepareInspectionWalk}from'../../review/walk.ts';
import {WalkMotion}from'../../review/walk-motion.ts';
import {physicalWalk}from'../../review/physical-walk.ts';
import {VisibilityGeometry}from'../../tools/fps/visibility-geometry.ts';
const output=process.argv[2];await mkdir(output,{recursive:true});
const source=await readFile(new URL('./level.aml',import.meta.url),'utf8');
const level=await compile(parseAml(source),{uvs:false,navigation:{cell:.125}});
const optical=new VisibilityGeometry(level);
const views=JSON.parse(await readFile(new URL('./views-c01.json',import.meta.url),'utf8'));
const rows=[];
for(const view of views.filter(v=>v.feet)){
 const placed=prepareInspectionWalk(level,{feet:view.feet,yaw:0,pitch:0});
 if(!placed.ok){rows.push({id:view.id,passed:false,error:placed.message,feet:view.feet});continue;}
 const motion=new WalkMotion(level,placed.pose.feet);
 motion.advance({forward:0,right:0,yaw:0,jump:false,crouch:view.stance==='crouching'},1/60);
 const state=motion.state;
 const samples=[];
 // Named vertical/lateral body points complement eye-only rays; they do not model ballistic damage.
 const target=view.targetFeet;const targetHeight=view.target[2]-target[2]>.9&&view.target[2]-target[2]<1.2?1.15:2;
 const dx=view.position[0]-target[0],dy=view.position[1]-target[1],length=Math.hypot(dx,dy)||1;
 for(const lateral of [-.3,0,.3])for(const z of [.2,targetHeight*.55,targetHeight*.93]){
  const point=[target[0]-dy/length*lateral,target[1]+dx/length*lateral,target[2]+z];
  samples.push({lateral,z,point,visible:optical.visible(view.position,point)});
 }
 rows.push({id:view.id,passed:true,requestedFeet:view.feet,actual:state,cameraEyeError:Math.hypot(...state.eye.map((v,i)=>v-view.position[i])),eyeVisible:optical.visible(view.position,view.target),targetBodySamples:samples});
}
const edgeProbes=[];const physical=physicalWalk(level),body=level.navigation.settings.player;
for(const x of [34.65,34.9,37,39.1,39.35])for(const y of [37.8,38.3,40,47.375,55.625,56.2]){
 const along=y-38;const z=along<0?0:along>=18?3.6:(Math.floor(along/.75)+1)*.15;
 const feet=[x,y,z];const placed=prepareInspectionWalk(level,{feet,yaw:0,pitch:0});
 edgeProbes.push({feet,physicallyBlocked:physical.blocked(feet,body),admitted:placed.ok,error:placed.ok?undefined:placed.message});
}
const result={sourceSHA256:createHash('sha256').update(source).digest('hex'),physicalHash:level.physicalHash,renderHash:level.renderHash,body,rows,edgeProbes,limits:'Actual body admission and repository crouch state; cameras are explicitly placed at authored eyes, with <=.010001 m supported-floor offset. Target body samples are finite opaque render-mesh rays, not weapon/heal reach, actor rendering or combat proof. Glass skylights are above all rays.'};
await writeFile(`${output}/views-inspection.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({source:result.sourceSHA256,failures:rows.filter(r=>!r.passed),edgeProbes},null,2));
