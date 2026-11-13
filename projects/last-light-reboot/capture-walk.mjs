/** Native browser walk/stance evidence using only the reviewer's public forms and controls. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir}from'node:fs/promises';
import {createHash}from'node:crypto';
import {startPreview}from'../../src/cli/preview.ts';
import {launchBrowser,waitForFrames}from'../../tests/browser/support/browser.mjs';
const output=process.argv[2];await mkdir(output);
const sourceFile=new URL('./level.aml',import.meta.url).pathname;
const source=await readFile(sourceFile,'utf8'),hash=s=>createHash('sha256').update(s).digest('hex');
const layout=JSON.parse(await readFile(new URL('./planning/developed-l02.json',import.meta.url),'utf8'));
let server,browser;const errors=[],walks=[],poses=[];
try{
 server=await startPreview(sourceFile,{port:0,navigationCell:.125});browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1450,height:1100},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 let payload;await page.route('**/__levelspec/*/source',async route=>{payload??=route.fetch().then(r=>r.json());await route.fulfill({json:await payload});});
 await page.goto(server.url);await page.locator('#status[data-state="ready"]').waitFor({timeout:90000});assert.equal(hash((await payload).text),hash(source));
 await page.locator('#walk-controls').evaluate(e=>e.open=true);await page.locator('#frame-controls').evaluate(e=>e.open=true);
 await page.locator('#frame-mode').selectOption('1.3333333333333333');await page.locator('#appearance').selectOption('materials');await page.locator('#roofs').check();await page.locator('#dimensions').uncheck();
 const state=()=>page.locator('#model').evaluate(e=>JSON.parse(e.dataset.walk));
 /** Public form placement verifies support without teleporting any route's intermediate stages. */
 async function place(feet,yaw,pitch=0){
  await page.evaluate(({feet,yaw,pitch})=>{for(const[id,value]of Object.entries({'walk-feet':feet.join(' '),'walk-yaw':yaw,'walk-pitch':pitch}))document.getElementById(id).value=String(value);document.getElementById('walk-form').requestSubmit();},{feet,yaw,pitch});
  await page.waitForFunction(()=>JSON.parse(document.getElementById('model').dataset.walk).active);assert.equal(await page.locator('#walk-error').textContent(),'');return state();
 }
 for(const stair of layout.stairs){
  const sign=Math.sign(stair.end[1]-stair.start[1]);const feet=[stair.start[0],stair.start[1]-sign*1.4,0];
  const start=await place(feet,sign*90);await page.locator('#model canvas').focus();await page.keyboard.down('w');
  await page.waitForFunction(({target,sign})=>{const s=JSON.parse(document.getElementById('model').dataset.walk);return sign*(s.feet[1]-target)>=0;},{target:stair.end[1]+sign*1.4,sign},{timeout:16000});
  await page.keyboard.up('w');const top=await state();assert.ok(Math.abs(top.feet[2]-3.6)<.025);
  await waitForFrames(page,3);await page.screenshot({clip:await page.locator('#model canvas').boundingBox(),path:`${output}/${stair.id}-arrival.png`});
  await page.keyboard.down('s');await page.waitForFunction(({target,sign})=>{const s=JSON.parse(document.getElementById('model').dataset.walk);return sign*(s.feet[1]-target)<=0;},{target:feet[1],sign},{timeout:16000});await page.keyboard.up('s');const back=await state();assert.ok(Math.abs(back.feet[2])<.025);walks.push({id:stair.id,start,top,back});await page.keyboard.press('Escape');
 }
 const studies=[['west-follower',[37,52.625,3],[43,55,5.46]],['east-follower',[87,49.375,3],[80,49,5.46]],['west-aperture',[41,39,0],[41,50,5.46]],['east-aperture',[83,67,0],[83,54,5.46]],['west-over-under',[40.7,43,0],[45,49,4.06]],['east-over-under',[83.3,59,0],[78,50,4.06]]];
 for(const[id,feet,target]of studies){
  const dx=target[0]-feet[0],dy=target[1]-feet[1];const yaw=Math.atan2(dy,dx)*180/Math.PI;const pitch=Math.atan2(target[2]-feet[2]-1.86,Math.hypot(dx,dy))*180/Math.PI;
  const standing=await place(feet,yaw,pitch);await waitForFrames(page,3);await page.screenshot({clip:await page.locator('#model canvas').boundingBox(),path:`${output}/${id}-standing.png`});
  await page.locator('#walk-helper').selectOption('crouch');await page.waitForFunction(()=>JSON.parse(document.getElementById('model').dataset.walk).stance==='crouching');const crouching=await state();assert.equal(crouching.height,1.15);assert.ok(Math.abs(crouching.eye[2]-crouching.feet[2]-1.0695)<1e-5);await waitForFrames(page,3);await page.screenshot({clip:await page.locator('#model canvas').boundingBox(),path:`${output}/${id}-crouching.png`});poses.push({id,standing,crouching});await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);assert.equal(hash(await readFile(sourceFile,'utf8')),hash(source));
 await writeFile(`${output}/loaded.aml`,source);await writeFile(`${output}/walk-capture.json`,JSON.stringify({sourceSHA256:hash(source),walks,poses,errors,protocol:'After-ready public walk form; actual dataset.walk assertions; roofs on; native standing/crouch body; no source modifications.'},null,2)+'\n');
}catch(error){await writeFile(`${output}/failure.json`,JSON.stringify({error:String(error),errors,walks,poses},null,2));throw error;}
finally{await browser?.close();await server?.close();}
console.log(output);
