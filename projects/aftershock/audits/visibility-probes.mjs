/** Independent optical/body-height studies over frozen compiled blockout. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compile,parseAml} from '../../../src/architecture/index.ts';
import {physicalWalk} from '../../../review/physical-walk.ts';
import {VisibilityGeometry} from '../../../tools/fps/visibility-geometry.ts';
const source=await readFile(new URL('../level.aml',import.meta.url),'utf8');
const level=await compile(parseAml(source),{navigation:{cell:.125}});
const physical=physicalWalk(level),player=level.navigation.settings.player,optical=new VisibilityGeometry(level);
const requests={
 'CT-long':[87.5,80,5], 'Red-long':[50,12.5,0], 'Red-crouch':[55,15,0],
 'A-hold':[52,93,5], 'A-east':[70,95,5], 'A-north':[60,98,5],
 'A-inner':[41,88,5], 'A-low':[52.4,91,5],
 'S1-crest':[20,69,5], 'S3-crest':[29,75,5],
 'S1-mid':[20,62,3.125], 'S1-follower':[20,59,2.1875],
 'S3-mid':[29,66,3.6667], 'S3-follower':[29,63,3.1667],
 'S2-mid':[32.5,48.5,1], 'S4-mid':[84,67,2.5], 'S4-follower':[84,70,3.5714],
 'Cable-floor':[40,46,0], 'Cable-low':[36.4,41,0], 'Cable-opponent':[52,46,0],
 'B-low':[65.4,34,0], 'B-east':[78,44,0], 'B-north':[75,50,0],
 'B-plant':[65,41,0], 'B-service':[54,50,0], 'B-south':[64,31,0], 'B-retake':[76,54,0], 'Fan-west':[80,54,0]
};
const walked=JSON.parse(await readFile('generated/aftershock/walk-r06/report.json'));
if(walked.sourceSha256!==createHash('sha256').update(source).digest('hex'))throw new Error('Walk source identity mismatch');
for(const[id,route,target]of[['S1-mid','S1-outer',[20,62,3.1]],['S1-follower','S1-outer',[20,59,2.2]],['S2-mid','S2-fan',[32.5,48.5,1]]]){const samples=walked.results.find(r=>r.id===route).samples;requests[id]=samples.map(s=>({feet:s.feet,d:Math.hypot(...s.feet.map((v,i)=>v-target[i]))})).sort((a,b)=>a.d-b.d)[0].feet;}
const poses={};
for(const[id,p]of Object.entries(requests)){
 const feet=physical.resolve(p,p,player);
 poses[id]={requested:p,feet,bodyFit:!!feet&&!physical.blocked(feet,player)};
}
const eye=(id,h)=>{const f=poses[id].feet;return[f[0],f[1],f[2]+h]};
const pairSpecs=[['CT-long','Red-long'],['CT-long','Red-crouch'],['CT-long','B-service'],['CT-long','B-plant'],['CT-long','B-south'],['CT-long','B-retake'],['A-hold','S1-crest'],['A-hold','S3-crest'],['A-hold','S1-mid'],['A-hold','S1-follower'],['A-hold','S3-mid'],['A-hold','S3-follower'],['A-hold','A-inner'],['A-east','A-low'],['A-north','A-low'],['Cable-opponent','Cable-low'],['B-east','B-low'],['B-north','B-low'],['B-retake','S4-mid'],['B-retake','S4-follower']];
const rays=[];
for(const[from,to]of pairSpecs){
 if(!poses[from].bodyFit||!poses[to].bodyFit)continue;
 for(const fromHeight of[1.86,1.023]){
  const samples=[];
  for(const toHeight of[.2,.6,1.023,1.3,1.86])samples.push({toHeight,visible:optical.visible(eye(from,fromHeight),eye(to,toHeight))});
  rays.push({from,to,fromHeight,samples});
 }
}
const focus=[
 ['CT-long-Red','CT-long','Red-long'],['Red-long-CT','Red-long','CT-long'],['CT-long-B','CT-long','B-plant'],
 ['A-hold-crests','A-hold','S3-crest'],['S1-mid-A','S1-mid','A-hold'],['S1-follower-A','S1-follower','A-hold'],
 ['S3-mid-A','S3-mid','A-hold'],['S3-follower-A','S3-follower','A-hold'],
 ['S4-mid-B','S4-mid','B-retake'],['S4-follower-B','S4-follower','B-retake'],
 ['Cable-floor-B','Cable-floor','B-service'],['Fan-west-B','Fan-west','B-retake']
].filter(([,a,b])=>poses[a].bodyFit&&poses[b].bodyFit).map(([id,a,b])=>({id,position:eye(a,1.86),target:eye(b,1.86),projection:'perspective',fov:73,frameAspect:4/3,appearance:'materials'}));
await mkdir('generated/aftershock/independent-visibility-r06b',{recursive:false});
const result={sourceSha256:createHash('sha256').update(source).digest('hex'),physicalHash:level.physicalHash,renderHash:level.renderHash,player,poses,rays,omissions:{unknownMaterials:optical.unknownMaterials,dynamicFaces:optical.omittedDynamicFaces},scope:'Optical point/body-height rays with independently resolved standing body feet. No target-engine combat, continuous sweep, multi-body or stance transition simulation.'};
await writeFile('generated/aftershock/independent-visibility-r06b/probes.json',JSON.stringify(result,null,2)+'\n');
await writeFile(new URL('./visibility-views-r06.json',import.meta.url),JSON.stringify(focus,null,2)+'\n');
console.log(JSON.stringify({poses,rays,views:focus.length}));
