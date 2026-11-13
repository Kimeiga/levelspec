/** Archive validated cameras incrementally; recover only from observed live-preview navigation. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
import {startPreview} from '../../src/cli/preview.ts';

const output=resolve(process.argv[2]);
const sourceFile=resolve('projects/fusion/level.aml');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=await readFile(sourceFile),source=hash(bytes);
const helperSha256=hash(await readFile(new URL('./capture.mjs',import.meta.url)));
const viewsPath=process.argv[3]?resolve(process.argv[3]):new URL('./views.json',import.meta.url);
const views=JSON.parse(await readFile(viewsPath,'utf8'));
await mkdir(output,{recursive:false});
const preview=await startPreview(sourceFile,{port:0,navigationCell:.125});
const initialURL=new URL(preview.url);
initialURL.searchParams.set('appearance',views[0]?.appearance??'materials');
const browser=await launchBrowser();
const errors=[],captures=[],reloads=[];
const companions={};
let lastCamera,expectedRenderHash;

/** Save completed frames even if a later camera fails; incomplete batches stay explicitly incomplete. */
async function checkpoint(complete){
 await writeFile(join(output,'capture.json'),JSON.stringify({source,sourceFile,helperSha256,companions,
  complete,requestedViews:views.length,method:'Frozen source and render identity; UI camera/frame controls; per-frame state saved; bounded retry only after a changed document token.',
  views:captures,errors,reloads},null,2)+'\n');
}
/** Match actual camera state, including after screenshot capture. */
function matches(actual,view){
 return actual.projection===view.projection&&actual.position.every((n,i)=>Math.abs(n-view.position[i])<1e-3)
  &&actual.target.every((n,i)=>Math.abs(n-view.target[i])<1e-3)&&Math.abs(actual.fov-(view.fov??73))<1e-4;
}
try{
 const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1,reducedMotion:'reduce'});
 await page.addInitScript(()=>{window.__fusionCaptureDocument=crypto.randomUUID();});
 /** Wait for a document identity that survives camera URL edits and changes on replacement. */
 async function documentToken(){
  await page.waitForFunction(()=>typeof window.__fusionCaptureDocument==='string',null,{timeout:240000});
  return page.evaluate(()=>window.__fusionCaptureDocument);
 }
 page.on('pageerror',error=>errors.push(error.message));
 const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/source'),{timeout:240000});
 response.catch(()=>{}); // Await below still reports failure; avoid an unhandled rejection during slow navigation.
 await page.goto(initialURL.href);
 const sourceResponse=await response,sourceURL=sourceResponse.url(),loaded=await sourceResponse.json();
 if(hash(loaded.text)!==source)throw new Error('Loaded source mismatch');
 await writeFile(join(output,'loaded.aml'),bytes);
 for(const[name,data]of Object.entries(loaded.files)){
  const dataBytes=Buffer.from(data),id=hash(dataBytes);
  await writeFile(join(output,id+'.bin'),dataBytes);companions[name]=id;
 }
 await page.locator('#status[data-state="ready"]').waitFor({timeout:240000});
 expectedRenderHash=await page.locator('#model').getAttribute('data-render-hash');
 if(!expectedRenderHash)throw new Error('Compiled render identity unavailable');
 await checkpoint(false);
 for(const view of views){
  for(let attempt=0;attempt<3;attempt++){
   const generation=await documentToken();
   try{
    await page.locator('#status[data-state="ready"]').waitFor({timeout:240000});
    const served=await(await fetch(sourceURL)).json();
    if(hash(served.text)!==source||hash(await readFile(sourceFile))!==source)throw new Error('Source changed');
    await page.locator('#dimensions').uncheck();
    if(await page.locator('#projection').inputValue()!==view.projection)await page.locator('#projection').selectOption(view.projection);
    const appearance=view.appearance??'materials';
    if(await page.locator('#appearance').inputValue()!==appearance)await page.locator('#appearance').selectOption(appearance);
    for(const id of ['camera-controls','frame-controls']){
     if(!await page.locator('#'+id).evaluate(element=>element.open))await page.locator('#'+id+' > summary').click();
    }
    const roofs=view.projection==='perspective';
    await page.locator('#roofs').setChecked(roofs);
    await page.locator('#frame-mode').selectOption('custom');
    await page.locator('#frame-aspect').fill(String(view.frameAspect??4/3));
    await page.locator('#frame-form button').click();
    await page.evaluate(v=>{
     const fields={'camera-position':v.position.join(' '),'camera-target':v.target.join(' '),'camera-fov':String(v.fov??73),'camera-height':String(v.viewHeight??96),'camera-roll':String(v.roll??0)};
     for(const[id,value]of Object.entries(fields))document.getElementById(id).value=value;
     document.getElementById('camera-form').requestSubmit();
    },view);
    lastCamera={requested:view,actual:await page.locator('#model').evaluate(element=>JSON.parse(element.dataset.view))};
    await page.waitForFunction(v=>{const s=JSON.parse(document.querySelector('#model').dataset.view);return s.projection===v.projection&&s.position.every((n,i)=>Math.abs(n-v.position[i])<1e-3)&&s.target.every((n,i)=>Math.abs(n-v.target[i])<1e-3)&&Math.abs(s.fov-(v.fov??73))<1e-4;},view);
    const cameraError=await page.locator('#camera-error').textContent();
    if(cameraError)throw new Error('Camera error: '+cameraError);
    await waitForFrames(page,5);
    await page.locator('#model canvas').screenshot({path:join(output,view.id+'.png')});
    const state=await page.locator('#model').evaluate(element=>({...element.dataset}));
    if(generation!==await documentToken())throw new Error('Navigation interrupted capture');
    if(state.renderHash!==expectedRenderHash||!matches(JSON.parse(state.view),view))throw new Error('Captured view identity changed');
    if(hash(await readFile(sourceFile))!==source)throw new Error('Source changed');
    captures.push({id:view.id,requested:view,roofsVisible:roofs,state,canvas:await page.locator('#model canvas').boundingBox()});
    await checkpoint(false);
    break;
   }catch(error){
    const currentDocument=await documentToken();
    if(generation===currentDocument||attempt===2)throw error;
    reloads.push({view:view.id,attempt:attempt+1,error:String(error),previousDocument:generation,currentDocument});
   }
  }
 }
 if(errors.length)throw new Error(errors.join('; '));
 await checkpoint(true);
 console.log(JSON.stringify({source,views:captures.length,errors,reloads:reloads.length,output}));
}catch(error){
 await checkpoint(false);
 await writeFile(join(output,'failure.json'),JSON.stringify({error:String(error),errors,lastCamera,completedViews:captures.length},null,2));
 throw error;
}finally{await browser.close();await preview.close();}
