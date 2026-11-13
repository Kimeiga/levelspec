/** Capture one frozen browser compile through its public camera and walking forms. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {startPreview} from '../../src/cli/preview.ts';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
const sourceFile=new URL('./level.aml',import.meta.url).pathname;
const bytes=await readFile(sourceFile), hash=b=>createHash('sha256').update(b).digest('hex');
const output=process.argv[2]??'generated/last-light/capture-single-r05';
await mkdir(output,{recursive:true});
const views=JSON.parse(await readFile(new URL('./views.json',import.meta.url),'utf8'));
const errors=[],evidence=[],walks=[];let server,browser;
try{
 server=await startPreview(sourceFile,{port:0,navigationCell:.125});
 browser=await launchBrowser();const page=await browser.newPage({viewport:{width:1500,height:1100},deviceScaleFactor:1,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 let payload;
 await page.route('**/__levelspec/*/source',async route=>{payload??=route.fetch().then(r=>r.json());await route.fulfill({json:await payload});});
 const url=new URL(server.url);url.searchParams.set('appearance','materials');url.searchParams.set('nav-cell','.125');
 await page.goto(url.href);await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});
 const loaded=await payload;assert.equal(hash(Buffer.from(loaded.text)),hash(bytes));
 await page.locator('#dimensions').uncheck({force:true});
 await page.locator('#walk-controls').evaluate(e=>e.open=true);
 for(const view of views){
  await page.locator('#projection').selectOption(view.projection);
  await page.evaluate(v=>{
   for(const [id,value] of Object.entries({'camera-position':v.position.join(' '),'camera-target':v.target.join(' '),'camera-fov':v.fov??55,'camera-height':v.viewHeight??20,'camera-roll':v.roll??0}))document.getElementById(id).value=String(value);
   document.querySelector('#camera-form').requestSubmit();
  },view);
  await page.locator('#appearance').selectOption(view.appearance??'materials');
  await waitForFrames(page,4);
  const state=await page.locator('#model').evaluate(el=>({...el.dataset}));
  const actual=JSON.parse(state.view);assert.equal(actual.appearance,view.appearance??'materials');assert.ok(actual.position.every((n,i)=>Math.abs(n-view.position[i])<1e-4));
  await page.locator('#model canvas').screenshot({path:`${output}/${view.id}.png`});
  evidence.push({id:view.id,requested:view,state,canvas:await page.locator('#model canvas').boundingBox()});
 }
 // A simply lit overview gives a readable project thumbnail alongside the detailed review.
 await page.locator('#projection').selectOption('orthographic');await page.locator('#appearance').selectOption('materials');
 await page.evaluate(()=>{for(const [id,v]of Object.entries({'camera-position':'108 -76 104','camera-target':'40 36 1','camera-height':'86'}))document.getElementById(id).value=v;document.querySelector('#camera-form').requestSubmit();});
 await waitForFrames(page,4);await page.locator('#model canvas').screenshot({path:`${output}/overview-color.png`});
 const state=()=>page.locator('#model').evaluate(el=>JSON.parse(el.dataset.walk));
 async function place(feet,yaw){
  await page.evaluate(({feet,yaw})=>{document.querySelector('#walk-feet').value=feet.join(' ');document.querySelector('#walk-yaw').value=String(yaw);document.querySelector('#walk-pitch').value='0';document.querySelector('#walk-form').requestSubmit();},{feet,yaw});
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).active);
  assert.equal(await page.locator('#walk-error').textContent(),'');return state();
 }
 for(const [id,feet,yaw,axis,target,sign]of [['west-stair',[13,21,0],90,1,35,1],['east-stair',[67,51,0],-90,1,37,-1],['west-under',[24,36,0],0,0,30,1],['east-under',[56,36,0],180,0,50,-1]]){
  const start=await place(feet,yaw);await page.locator('#model canvas').focus();
  await page.keyboard.down('w');
  await page.waitForFunction(({axis,target,sign})=>{const p=JSON.parse(document.querySelector('#model').dataset.walk).feet;return sign*(p[axis]-target)>=0;},{axis,target,sign},{timeout:15000});
  await page.keyboard.up('w');const end=await state();
  assert.ok(Math.abs(end.feet[2]-(id.includes('stair')?3:0))<.12);
  await page.locator('#model canvas').screenshot({path:`${output}/walk-${id}.png`});
  let reverse;
  if(id.includes('stair')){
   await page.keyboard.down('s');await page.waitForFunction(({axis,target,sign})=>{const p=JSON.parse(document.querySelector('#model').dataset.walk).feet;return sign*(p[axis]-target)<=0;},{axis,target:feet[axis],sign},{timeout:15000});await page.keyboard.up('s');reverse=await state();assert.ok(Math.abs(reverse.feet[2])<.12);
  }
  walks.push({id,start,end,reverse});await page.keyboard.press('Escape');
 }
 await place([36,16.5,0],90);await page.locator('#walk-helper').selectOption('crouch');await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).stance==='crouching');
 const crouch=await state();assert.equal(crouch.height,1.15);await page.locator('#model canvas').screenshot({path:`${output}/walk-low-crouched.png`});
 await page.locator('#walk-helper').selectOption('off');await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).stance==='standing');walks.push({id:'south-low-posture',crouch,standing:await state()});
 assert.deepEqual(errors,[]);assert.equal(hash(await readFile(sourceFile)),hash(bytes));
 await writeFile(`${output}/loaded.aml`,bytes);
 await writeFile(`${output}/capture.json`,JSON.stringify({sourceFile,sourceSHA256:hash(bytes),companions:loaded.files,viewport:{width:1500,height:1100},navigationCell:.125,errors,views:evidence,walks},null,2)+'\n');
 console.log(JSON.stringify({source:hash(bytes),output,views:evidence.length,walks:walks.map(w=>w.id),errors}));
}catch(error){await writeFile(`${output}/failure.json`,JSON.stringify({message:String(error),errors},null,2));throw error;}
finally{await browser?.close();await server?.close();}
