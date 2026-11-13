/** Actual browser stances and continuous WASD stairs using the unchanged authoring body. */
import {readFile,writeFile,mkdir}from'node:fs/promises';
import {createHash}from'node:crypto';
import assert from'node:assert/strict';
import {resolve}from'node:path';
import {startPreview}from'../../src/cli/preview.ts';
import {launchBrowser,waitForFrames}from'../../tests/browser/support/browser.mjs';
const source=resolve('projects/second-friday/level.aml'),bytes=await readFile(source),sha=createHash('sha256').update(bytes).digest('hex'),output=resolve(process.argv[2]??'projects/second-friday/reviews/evidence/R01-browser');await mkdir(output,{recursive:false});
let server,browser;const errors=[],postures=[],walks=[];
try{
 server=await startPreview(source,{port:0,navigationCell:.125});browser=await launchBrowser();const page=await browser.newPage({viewport:{width:1600,height:1200},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 let frozen;await page.route('**/__levelspec/*/source',async route=>{frozen??=route.fetch().then(r=>r.json());await route.fulfill({json:await frozen});});
 async function start(feet,yaw,pitch=0){
  const url=new URL(server.url);url.searchParams.set('appearance','materials');url.searchParams.set('frame-aspect','1.4');
  await page.goto(url.href);await page.locator('#status[data-state="ready"]').waitFor({timeout:120000});
  await page.locator('#dimensions').uncheck();await page.locator('#roofs').check();
  if(!(await page.locator('#walk-controls').evaluate(e=>e.open)))await page.locator('#walk-controls > summary').click();
  await page.locator('#walk-feet').fill(feet.join(' '));await page.locator('#walk-yaw').fill(String(yaw));await page.locator('#walk-pitch').fill(String(pitch));
  await page.locator('#walk-start').click();await page.waitForFunction(expected=>{const s=JSON.parse(document.querySelector('#model').dataset.walk);return s.active&&Math.hypot(...s.feet.map((v,i)=>v-expected[i]))<.1;},feet);
  await waitForFrames(page,3);
 }
 const state=()=>page.locator('#model').evaluate(e=>({walk:JSON.parse(e.dataset.walk),view:JSON.parse(e.dataset.view),player:e.dataset.player}));
 for(const[id,feet,target,stance]of[
  ['clocks-south-standing',[78.5,55.3,0],[64,78.6,4.884],'standing'],['clocks-south-crouch',[78.5,55.3,0],[64,78.6,4.884],'crouching'],
  ['books-standing',[88,66.8,0],[76,78.6,4.884],'standing'],['books-crouch',[88,66.8,0],[76,78.6,4.884],'crouching'],
  ['roof-west-standing',[64,78.6,3.2],[86,64,1.684],'standing'],['roof-west-crouch',[64,78.6,3.2],[86,64,1.684],'crouching'],
  ['east-follower',[88.3,88,1.29],[86,76,1.684],'standing'],['east-one-tread-follower',[86.7,88,1.61],[86,76,1.684],'standing'],['west-one-tread-follower',[60,70.1,1.77],[86,64,1.684],'standing']
 ]){
  const dx=target[0]-feet[0],dy=target[1]-feet[1],yaw=Math.atan2(dy,dx)*180/Math.PI,pitch=Math.atan2(target[2]-(feet[2]+1.8*.93),Math.hypot(dx,dy))*180/Math.PI;
  await start(feet,yaw,pitch);await page.bringToFront();await page.locator('#model canvas').focus();if(stance==='crouching')await page.keyboard.down('Control');
  try{await page.waitForFunction(expected=>JSON.parse(document.querySelector('#model').dataset.walk).stance===expected,stance,{timeout:10000});}catch(error){console.error(id,await state());throw error;}await waitForFrames(page,3);
  const actual=await state();assert.equal(actual.walk.height,stance==='crouching'?1.1:1.8);await page.locator('#model canvas').screenshot({path:`${output}/${id}.png`});postures.push({id,requested:feet,stance,actual});if(stance==='crouching')await page.keyboard.up('Control');
 }
 for(const[id,feet,yaw,axis,threshold,increasing,z]of[
  ['W-ascent',[60,60.5,0],90,1,80,true,3.2],['W-descent',[60,80,3.2],-90,1,60.5,false,0],['E-ascent',[95.5,88,0],180,0,76,false,3.2],['E-descent',[76,88,3.2],0,0,95.5,true,0]
 ]){
  await start(feet,yaw);await page.locator('#model canvas').focus();
  await page.evaluate(()=>{window.__routeSamples=[];const sample=()=>{window.__routeSamples.push(JSON.parse(document.querySelector('#model').dataset.walk));window.__routeFrame=requestAnimationFrame(sample);};window.__routeFrame=requestAnimationFrame(sample);});
  await page.keyboard.down('w');try{await page.waitForFunction(({axis,threshold,increasing})=>{const p=JSON.parse(document.querySelector('#model').dataset.walk).feet;return increasing?p[axis]>=threshold:p[axis]<=threshold;},{axis,threshold,increasing},{timeout:20000});}finally{await page.keyboard.up('w');}
  const actual=await state();assert.ok(Math.abs(actual.walk.feet[2]-z)<.05,id);const trace=await page.evaluate(()=>{cancelAnimationFrame(window.__routeFrame);return window.__routeSamples;});
  await page.locator('#model canvas').screenshot({path:`${output}/${id}.png`});walks.push({id,start:feet,end:actual.walk.feet,trace});
 }
 assert.equal(createHash('sha256').update(Buffer.from((await frozen).text)).digest('hex'),sha);assert.deepEqual(await readFile(source),bytes);assert.deepEqual(errors,[]);
 await writeFile(`${output}/loaded.aml`,bytes);await writeFile(`${output}/browser-report.json`,JSON.stringify({sourceSha256:sha,viewport:[1600,1200],postures,walks,errors,limits:'Inspection WASD uses standing-eroded navigation plus sampled physical support/headroom, not destination-engine multiplayer physics.'},null,2));console.log(JSON.stringify({postures:postures.length,walks:walks.length,errors,sourceSha256:sha}));
}finally{await browser?.close();await server?.close();}
