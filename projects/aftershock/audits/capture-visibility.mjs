/** Archive cameras through the reviewer UI without recompiling the same frozen source for each view. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {launchBrowser,waitForFrames} from '../../../tests/browser/support/browser.mjs';
const output=resolve(process.argv[2]);
const base=process.argv[3]??'http://127.0.0.1:48391/';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=await readFile(new URL('../level.aml',import.meta.url));
const views=JSON.parse(await readFile(new URL('./visibility-views-r06.json',import.meta.url),'utf8'));
await mkdir(output,{recursive:false});
const browser=await launchBrowser();const errors=[],captures=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/source'));
 await page.goto(base);
 const loaded=await(await response).json();
 if(hash(loaded.text)!==hash(bytes))throw new Error('Loaded source mismatch');
 await page.locator('#status[data-state="ready"]').waitFor({timeout:120000});
 await page.locator('#dimensions').uncheck();
 await page.locator('#camera-controls').evaluate(e=>e.open=true);
 await page.locator('#frame-controls').evaluate(e=>e.open=true);
 for(const view of views){
  await page.locator('#projection').selectOption(view.projection);
  await page.locator('#appearance').selectOption(view.appearance??'materials');
  const roofs=view.projection==='perspective';
  await page.locator('#roofs').setChecked(roofs);
  await page.locator('#frame-mode').selectOption('custom');
  await page.locator('#frame-aspect').fill(String(view.frameAspect??1.3333333333333333));
  await page.locator('#frame-form button').click();
  await page.evaluate(view=>{for(const[id,value]of [['camera-position',view.position.join(' ')],['camera-target',view.target.join(' ')],['camera-fov',String(view.fov??73)],['camera-height',String(view.viewHeight??96)],['camera-roll',String(view.roll??0)]])document.getElementById(id).value=value;document.getElementById('camera-form').requestSubmit();},view);
  if(await page.locator('#camera-error').textContent())throw new Error('Camera error: '+await page.locator('#camera-error').textContent());
  await waitForFrames(page,5);
  const actual=await page.locator('#model').evaluate(e=>JSON.parse(e.dataset.view));
  if(actual.projection!==view.projection||view.position.some((v,i)=>Math.abs(v-actual.position[i])>1e-4)||view.target.some((v,i)=>Math.abs(v-actual.target[i])>1e-4))throw new Error('Camera state mismatch: '+view.id+' '+JSON.stringify(actual));
  await page.locator('#model canvas').screenshot({path:join(output,view.id+'.png')});
  captures.push({id:view.id,requested:view,roofsVisible:roofs,state:await page.locator('#model').evaluate(e=>({...e.dataset})),canvas:await page.locator('#model canvas').boundingBox()});
 }
 if(hash(await readFile(new URL('../level.aml',import.meta.url)))!==hash(bytes))throw new Error('Source changed');
 if(errors.length)throw new Error(errors.join('; '));
 await writeFile(join(output,'loaded.aml'),bytes);
 const companions={};for(const[name,data]of Object.entries(loaded.files)){const b=Buffer.from(data);const id=hash(b);await writeFile(join(output,id+'.bin'),b);companions[name]=id;}
 await writeFile(join(output,'capture.json'),JSON.stringify({source:hash(bytes),sourceFile:resolve('projects/aftershock/level.aml'),companions,method:'One frozen live-preview input; UI camera/frame/projection/appearance forms; roofs visible in perspectives, hidden for cutaway overviews.',views:captures,errors},null,2)+'\n');
 console.log(JSON.stringify({source:hash(bytes),views:captures.length,errors,output}));
}catch(e){await writeFile(join(output,'failure.json'),JSON.stringify({error:String(e),errors},null,2));throw e;}finally{await browser.close();}
