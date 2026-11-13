/** Archive actual browser standing/crouching poses using the unchanged movement helper. */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {launchBrowser, waitForFrames} from '../../../tests/browser/support/browser.mjs';
const output = resolve(process.argv[2] ?? 'generated/veilcrest/stances-r09');
const base = process.argv[3] ?? 'http://127.0.0.1:48523/';
await mkdir(output,{recursive:false});
const source = await readFile(new URL('../level.aml',import.meta.url));
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const browser = await launchBrowser();
const errors = [], poses=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:1024},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 const url=new URL(base);url.searchParams.set('appearance','materials');url.searchParams.set('fov','65');url.searchParams.set('frame-aspect','1.5696855771174902');
 const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/source'));
 await page.goto(url.href);
 const loaded=await (await response).json();
 if(createHash('sha256').update(loaded.text).digest('hex')!==sourceSha256)throw new Error('Loaded source mismatch');
 await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});
 await page.locator('#dimensions').uncheck();
 if(!(await page.locator('#walk-controls').evaluate(e=>e.open)))await page.locator('#walk-controls > summary').click();
 for(const[id,feet,yaw]of[
  ['garden-bench',[16,48.8,3],-63],['orangery-planter',[-.5,56.7,3],-36],['music-piano',[9,78.4,3],-82],['A-credenza',[29,74.5,3],-90],['B-chest',[81.5,61.5,0],-64],['cellar-low-rack',[118,70.6,0],-90]
 ]){
  await page.locator('#walk-feet').fill(feet.join(' '));await page.locator('#walk-yaw').fill(String(yaw));await page.locator('#walk-pitch').fill('0');await page.locator('#walk-form button').click();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).active);
  if(await page.locator('#walk-error').textContent())throw new Error(id+': '+await page.locator('#walk-error').textContent());
  for(const helper of ['off','crouch']){
   await page.locator('#walk-helper').selectOption(helper);
   await page.waitForFunction(s=>JSON.parse(document.querySelector('#model').dataset.walk).stance===s,helper==='off'?'standing':'crouching');
   await waitForFrames(page,3);
   const pose=await page.locator('#model').evaluate(e=>({walk:JSON.parse(e.dataset.walk),cameraState:{...e.dataset}}));
   const name=id+'-'+pose.walk.stance;
   await page.locator('#model canvas').screenshot({path:join(output,name+'.png')});poses.push({id:name,requestedFeet:feet,...pose});
  }
  await page.locator('#walk-helper').selectOption('off');
 }
 if(errors.length)throw new Error(errors.join('; '));
 if(createHash('sha256').update(await readFile(new URL('../level.aml',import.meta.url))).digest('hex')!==sourceSha256)throw new Error('Source changed');
 await writeFile(join(output,'report.json'),JSON.stringify({sourceSha256,viewport:[1280,1024],eyeFraction:.93,verticalFovDegrees:65,horizontalFovDegrees:90,frameAspect:1.5696855771174902,poses,errors,scope:'Actual helper stance/camera captures, stationary supported capsule. Not projectile or multiplayer proof.'},null,2)+'\n');
 console.log(JSON.stringify({sourceSha256,poses:poses.length,errors,output}));
}finally{await browser.close();}
