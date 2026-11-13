/** Record actual browser stance and stair movement against the frozen authored map. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startPreview} from '../../src/cli/preview.ts';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
const output=process.argv[2]??'generated/galini/browser-b09';
await mkdir(output,{recursive:true});
const sourceFile=new URL('./level.aml',import.meta.url).pathname;
const source=await readFile(sourceFile);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
let server,browser;const errors=[],captures=[];
try{
 server=await startPreview(sourceFile,{port:0,navigationCell:.125});
 browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1280,height:1024},deviceScaleFactor:1,reducedMotion:'reduce'});
 page.on('pageerror',error=>errors.push(error.message));
 let payload;
 await page.route('**/__levelspec/*/source',async route=>{payload??=route.fetch().then(r=>r.json());await route.fulfill({json:await payload});});
 /** Places the real inspection walker at a supported source coordinate. */
 async function place(feet,yaw,pitch=0){
  const url=new URL(server.url);
  for(const [key,value] of Object.entries({'walk-feet':feet.join(' '),'walk-yaw':yaw,'walk-pitch':pitch,appearance:'materials','frame-aspect':1.25}))url.searchParams.set(key,String(value));
  await page.goto(url.href);
  await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#model')?.dataset.mode==='walk');
  assert.equal(hash(Buffer.from((await payload).text)),hash(source));
  if(!await page.locator('#walk-controls').evaluate(e=>e.open))await page.locator('#walk-controls > summary').click();
  await page.locator('#dimensions').uncheck();
  await waitForFrames(page,2);
 }
 /** Saves the real published body/camera state beside its rendered frame. */
 async function capture(id){
  await waitForFrames(page,2);
  const state=await page.locator('#model').evaluate(e=>({...e.dataset,walk:JSON.parse(e.dataset.walk)}));
  await page.locator('#model canvas').screenshot({path:output+'/'+id+'.png'});
  captures.push({id,state});return state.walk;
 }
 for(const [id,feet,target] of [['a',[40.3,91.65,4.01],[36.4,74.1]],['b',[100.1,81.25,.01],[107.9,68.9]]]){
  const yaw=Math.atan2(target[1]-feet[1],target[0]-feet[0])*180/Math.PI;
  await place(feet,yaw);
  const standing=await capture(id+'-standing');
  await page.locator('#walk-helper').selectOption('crouch');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).stance==='crouching');
  const crouched=await capture(id+'-crouched');
  assert.equal(crouched.height,1.1);assert.equal(standing.height,1.8);
  assert.deepEqual(crouched.feet,standing.feet);
  assert.ok(standing.eye[2]-crouched.eye[2]>.6);
  await page.locator('#walk-helper').selectOption('off');
 }
 const start=[42.38,57.85,.01],end=[35.62,74.75,4.01];
 const yaw=Math.atan2(end[1]-start[1],end[0]-start[0])*180/Math.PI;
 await place(start,yaw,10);await capture('bell-start');
 await page.locator('#model canvas').focus();
 await page.keyboard.down('w');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).feet[1]>66,{},{timeout:12000});
 await page.keyboard.up('w');await capture('bell-middle');
 await page.keyboard.down('w');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).feet[1]>74.5,{},{timeout:12000});
 await page.keyboard.up('w');
 const finish=await capture('bell-finish');assert.ok(Math.abs(finish.feet[2]-4.01)<.12);
 assert.deepEqual(errors,[]);assert.equal(hash(await readFile(sourceFile)),hash(source));
 await writeFile(output+'/report.json',JSON.stringify({sourceSha256:hash(source),captures,errors,limitations:'Actual harness crouch and keyboard movement; bounded nav/physical checks, not continuous capsule sweeps or multiplayer combat.'},null,2)+'\n');
 console.log(JSON.stringify({output,sourceSha256:hash(source),captures:captures.map(c=>c.id),errors}));
}finally{await browser?.close();await server?.close();}
