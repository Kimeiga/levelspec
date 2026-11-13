import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Matrix4} from 'three';
import {startPreview} from '../../src/cli/preview.ts';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';

const source=resolve('projects/ninefold-reboot/level.aml'),output=process.argv[2],requested=process.argv[3]?.split(',');
if(!output)throw new Error('Usage: node projects/ninefold-reboot/capture.mjs NEW_DIR [view-id,...] [verification.json]');
await mkdir(output);const bytes=await readFile(source),hash=x=>createHash('sha256').update(x).digest('hex');
const views=[
 {id:'architecture-roofs',position:[140,-105,112],target:[49,43,4],projection:'orthographic',height:114,roofs:true,appearance:'full-render'},
 {id:'architecture-materials',position:[140,-105,112],target:[49,43,4],projection:'orthographic',height:114,roofs:true,appearance:'materials'},
 {id:'global-roof-off',position:[140,-105,112],target:[49,43,4],projection:'orthographic',height:114,roofs:false,appearance:'full-render'},
 {id:'top-roofs',position:[49,42.9,155],target:[49,43,0],projection:'orthographic',height:100,roofs:true,appearance:'full-render'},
 {id:'top-global-roof-off',position:[49,42.9,155],target:[49,43,0],projection:'orthographic',height:100,roofs:false,appearance:'full-render'},
 {id:'factory-roofs',position:[86,12,42],target:[51,45,3],projection:'orthographic',height:52,roofs:true,appearance:'materials'},
 {id:'factory-global-roof-off',position:[86,12,42],target:[51,45,3],projection:'orthographic',height:52,roofs:false,appearance:'full-render'},
];
let verification;
if(process.argv[4]){
 verification=JSON.parse(await readFile(process.argv[4],'utf8'));assert.equal(verification.sourceSha256,hash(bytes));
 for(const v of verification.views)for(const[stance,eye]of[['stand',1.86],['crouch',1.023]])views.push({id:v.id+'-'+stance,feet:v.actualFeet,targetFeet:v.actualTargetFeet,position:[v.actualFeet[0],v.actualFeet[1],v.actualFeet[2]+eye],target:[v.actualTargetFeet[0],v.actualTargetFeet[1],v.actualTargetFeet[2]+1.86],projection:'perspective',roofs:true,appearance:'materials',stance});
 for(const v of verification.apertureOffsets.filter(v=>v.targetStance==='stand'&&v.target===(v.aperture==='well'?'well':'shoulder'))){
  views.push({id:`${v.aperture}-offset-${v.offset}`,feet:v.observerFeet,targetFeet:v.targetFeet,position:[v.observerFeet[0],v.observerFeet[1],v.observerFeet[2]+1.86],target:[v.targetFeet[0],v.targetFeet[1],v.targetFeet[2]+1.86],projection:'perspective',roofs:true,appearance:'materials',stance:'stand'});
 }
 const more=[
  ['T-spawn',[11,14,0],[11,29,0]],['T-east-exit',[24,15,0],[36,23,0]],['CT-spawn',[78,78,0],[82,61,0]],['CT-west-exit',[68,76,0],[59,69,0]],
  ['underpass-west',[43,34,0],[52,39,0]],['underpass-reverse',[52,38,0],[43,34,0]],['boiler-ground',[30,60,0],[43,58,0]],['boiler-counter',[43,58,0],[30,60,0]],
  ['dye-west',[53,58,0],[63,58,0]],['A-low-cover',[86,47.5,0],[78,43,0]],['B-low-cover',[48,39.5,3.2],[44,49,3.2]],
  ['B-table-west',[48,39.5,3.2],[44,36,3.2]],['B-table-opposing',[44,36,3.2],[48,39.5,3.2]],
  ['roof-school',[36,64,6.4],[38,58,0]],['roof-reservoir',[66,77,6.4],[78,78,0]],['roof-fold',[54,73,6.4],[58,76,6.4]],
 ];
 for(const[id,feet,target]of more){
  views.push({id,feet,targetFeet:target,position:[feet[0],feet[1],feet[2]+1.87],target:[target[0],target[1],target[2]+1.87],projection:'perspective',roofs:true,appearance:'materials',stance:'stand'});
  if(id==='A-low-cover'||id==='B-low-cover'||id.startsWith('B-table-'))views.push({id:id+'-crouch',feet,targetFeet:target,position:[feet[0],feet[1],feet[2]+1.033],target:[target[0],target[1],target[2]+1.87],projection:'perspective',roofs:true,appearance:'materials',stance:'crouch'});
 }
 for(let stair=1;stair<=6;stair++){
  const run=verification.results.find(r=>r.id===`S${stair}-width-0`&&!r.reverse);assert.ok(run?.ok);
  for(const[name,index,targetIndex]of[['foot',0,6],['follow',2,6],['crest',5,6],['reverse',6,2]]){
   for(const stance of name==='follow'||name==='reverse'?['stand','crouch']:['stand']){
    const feet=run.trace[index].actual,target=run.trace[targetIndex].actual,eye=stance==='stand'?1.86:1.023;
    views.push({id:`S${stair}-${name}-${stance}`,feet,targetFeet:target,position:[feet[0],feet[1],feet[2]+eye],target:[target[0],target[1],target[2]+1.86],projection:'perspective',roofs:true,appearance:'materials',stance});
   }
  }
 }
}
if(requested?.some(id=>!views.some(v=>v.id===id)))throw new Error('Unknown requested view');
let browser,server;const captures=[],errors=[];
try{
 server=await startPreview(source,{port:0,navigationCell:.125});browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1600,height:1200},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 let payload;await page.route('**/__levelspec/*/source',async route=>{payload??=route.fetch().then(r=>r.json());const loaded=await payload;assert.equal(hash(loaded.text),hash(bytes));await route.fulfill({json:loaded});});
 await page.goto(server.url);await page.locator('#status[data-state="ready"]').waitFor({timeout:120000});
 await page.locator('#dimensions').uncheck();await page.locator('#camera-controls summary').click();await page.locator('#frame-controls summary').click();await page.locator('#frame-mode').selectOption('1.3333333333333333');
 for(const v of views){
  if(requested&&!requested.includes(v.id))continue;
  await page.locator('#appearance').selectOption(v.appearance);await page.locator('#roofs').setChecked(v.roofs);
  await page.evaluate(v=>{for(const[id,value]of Object.entries({projection:v.projection,'camera-position':v.position.join(' '),'camera-target':v.target.join(' '),'camera-height':String(v.height??35),'camera-fov':'60','camera-roll':'0'}))document.getElementById(id).value=value;document.getElementById('camera-form').requestSubmit();},v);
  await page.waitForFunction(v=>{const s=JSON.parse(document.getElementById('model').dataset.view??'{}');const same=(a,b)=>a?.every((n,i)=>Math.abs(n-b[i])<1e-5);return s.projection===v.projection&&same(s.position,v.position)&&same(s.target,v.target)&&Math.abs(s.fov-60)<1e-5&&Math.abs(s.frameAspect-4/3)<1e-5;},v);
  await waitForFrames(page,4);assert.equal(await page.locator('#camera-error').textContent(),'');
  const state=await page.locator('#model').evaluate(e=>({...e.dataset}));
  await page.locator('#model canvas').screenshot({path:resolve(output,v.id+'.png')});
  captures.push({...v,mode:'camera-form optical view',verticalFov:60,horizontalFov:2*Math.atan(Math.tan(Math.PI/6)*4/3)*180/Math.PI,frameAspect:4/3,actualRoofToggle:await page.locator('#roofs').isChecked(),state});
  if(v.feet&&v.stance){
   if(!await page.locator('#walk-controls').evaluate(e=>e.open))await page.locator('#walk-controls summary').click();
   const direction=v.target.map((n,i)=>n-v.position[i]);
   const yaw=Math.atan2(direction[1],direction[0])*180/Math.PI,pitch=Math.atan2(direction[2],Math.hypot(direction[0],direction[1]))*180/Math.PI;
   await page.evaluate(({feet,yaw,pitch})=>{for(const[id,value]of Object.entries({'walk-feet':feet.join(' '),'walk-yaw':String(yaw),'walk-pitch':String(pitch)}))document.getElementById(id).value=value;document.getElementById('walk-form').requestSubmit();},{feet:v.feet,yaw,pitch});
   assert.equal(await page.locator('#walk-error').textContent(),'');
   await page.locator('#walk-helper').selectOption(v.stance==='crouch'?'crouch':'off');
   await page.waitForFunction(stance=>{const s=JSON.parse(document.getElementById('model').dataset.walk??'{}');return s.active&&s.stance===(stance==='crouch'?'crouching':'standing');},v.stance);
   await waitForFrames(page,4);
   const walkState=await page.locator('#model').evaluate(e=>({...e.dataset})),walk=JSON.parse(walkState.walk),matrix=walkState.projectionMatrix.split(',').map(Number);
   const verticalFov=2*Math.atan(1/matrix[5])*180/Math.PI,horizontalFov=2*Math.atan(1/matrix[0])*180/Math.PI;
   const renderEye=new Matrix4().fromArray(walkState.viewMatrix.split(',').map(Number)).invert().elements.slice(12,15);
   assert.ok(Math.hypot(...renderEye.map((n,i)=>n-walk.eye[i]))<1e-6);
   assert.ok(Math.abs(verticalFov-65)<1e-4);assert.ok(Math.hypot(walk.feet[0]-v.feet[0],walk.feet[1]-v.feet[1])<.02);
   assert.ok(Math.abs(walk.yaw-yaw)<1e-5&&Math.abs(walk.pitch-pitch)<1e-5);
   await page.locator('#model canvas').screenshot({path:resolve(output,v.id+'-actualwalk.png')});
   captures.push({...v,id:v.id+'-actualwalk',mode:'actual physical inspection stance',verticalFov,horizontalFov,frameAspect:4/3,actualRoofToggle:await page.locator('#roofs').isChecked(),walk,state:walkState});
   await page.keyboard.press('Escape');await page.waitForFunction(()=>document.getElementById('model').dataset.mode==='overview');
  }
 }
 await page.locator('#view-2d').click();await waitForFrames(page,3);await page.locator('#plan').screenshot({path:resolve(output,'native-plan.png')});
 assert.deepEqual(errors,[]);assert.equal(hash(await readFile(source)),hash(bytes));
 await writeFile(resolve(output,'capture.json'),JSON.stringify({source,sourceSha256:hash(bytes),captures,errors,notes:'Global roof toggle only. Camera-form perspective views use vertical 60 degrees, horizontal 75.178 degrees, aspect 4:3. Paired actualwalk images assert physical stance and rendered eye; those use vertical 65 degrees and record actual horizontal FOV from the projection matrix.'},null,2));
 await writeFile(resolve(output,'loaded.aml'),bytes);
}catch(error){await writeFile(resolve(output,'failure.json'),JSON.stringify({error:String(error),errors},null,2));throw error;}
finally{await browser?.close();await server?.close();}
console.log(output);
