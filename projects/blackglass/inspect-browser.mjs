/** Read-only actual harness stance/keyboard inspection; source is never rewritten. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
const output=process.argv[2]??'generated/blackglass/browser-r04';
await mkdir(output,{recursive:true});
const bytes=await readFile(new URL('./level.aml',import.meta.url));
const browser=await launchBrowser();const errors=[],results=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:1024},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:48247/?nav-cell=0.125&appearance=materials');
 await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});
 await page.locator('#dimensions').uncheck();
 if(!(await page.locator('#walk-controls').evaluate(e=>e.open)))await page.locator('#walk-controls > summary').click();
 const state=()=>page.locator('#model').evaluate(e=>JSON.parse(e.dataset.walk));
 async function place(feet,yaw){
  await page.locator('#walk-feet').fill(feet.join(' '));await page.locator('#walk-yaw').fill(String(yaw));await page.locator('#walk-pitch').fill('0');await page.locator('#walk-form button').click();
  assert.equal(await page.locator('#walk-error').textContent(),'');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).active);await waitForFrames(page,3);
 }
 for(const [id,feet,yaw] of [['a-low',[57,59.8,12],90],['b-low',[7,54.3,0],90],['q-low',[20,41.5,6],10.62],['r-low',[28.5,75.1,6],-90]]){
  await place(feet,yaw);const standing=await state();assert.equal(standing.stance,'standing');await page.locator('#model canvas').screenshot({path:output+'/'+id+'-standing.png'});
  await page.locator('#walk-helper').selectOption('crouch');await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).stance==='crouching');await waitForFrames(page,3);
  const crouching=await state();assert.equal(crouching.height,1.1);assert.ok(Math.abs(standing.eye[2]-crouching.eye[2]-.651)<.001);await page.locator('#model canvas').screenshot({path:output+'/'+id+'-crouching.png'});results.push({id,standing,crouching});
  await page.locator('#walk-helper').selectOption('off');await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).stance==='standing');
 }
 await place([41,23.3,0],90);await page.locator('#model canvas').focus();await page.keyboard.down('w');await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).feet[1]>36.6,{},{timeout:20000});await page.keyboard.up('w');const ascent=await state();assert.ok(ascent.feet[2]>5.9);
 await page.keyboard.down('s');await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).feet[1]<23.4,{},{timeout:20000});await page.keyboard.up('s');const descent=await state();assert.ok(descent.feet[2]<.1);results.push({id:'S1-real-keyboard',ascent,descent});
 assert.deepEqual(errors,[]);assert.equal(createHash('sha256').update(await readFile(new URL('./level.aml',import.meta.url))).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
 await writeFile(output+'/report.json',JSON.stringify({sourceSha256:createHash('sha256').update(bytes).digest('hex'),viewport:[1280,1024],actualWalkFov:65,errors,results,limitations:'Actual harness standing/crouching and keyboard movement; bounded physical/navigation sampling, not target-engine weapons, multiplayer or continuous collision proof.'},null,2)+'\n');
 console.log(JSON.stringify({output,stancePairs:4,keyboardStairs:'S1 both directions',errors}));
} finally {await browser.close();}
