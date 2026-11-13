/** Capture actual roof-enabled review views with source identity and visible layer state. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startPreview} from '../../src/cli/preview.ts';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
const [output,manifest]=process.argv.slice(2);
if(!output||!manifest)throw new Error('Usage: node capture-roofs.mjs NEW_OUTPUT VIEWS.json');
await mkdir(output);
const file=new URL('./level.aml',import.meta.url).pathname,bytes=await readFile(file);
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const views=JSON.parse(await readFile(manifest,'utf8'));
let server,browser;const captures=[],errors=[];
try{
 server=await startPreview(file,{port:0,navigationCell:.125});browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1280,height:1024},deviceScaleFactor:1,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));let payload;
 await page.route('**/__levelspec/*/source',async route=>{payload??=route.fetch().then(r=>r.json());await route.fulfill({json:await payload});});
 for(const view of views){
  const url=new URL(server.url);
  const settings={camera:view.position.join(' '),target:view.target.join(' '),projection:view.projection,fov:view.fov??65,'view-height':view.viewHeight??40,appearance:view.appearance??'materials','frame-aspect':view.frameAspect??1.25};
  for(const [key,value] of Object.entries(settings))url.searchParams.set(key,String(value));
  await page.goto(url.href);await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});
  assert.equal(hash(Buffer.from((await payload).text)),hash(bytes));
  await page.locator('#dimensions').uncheck();await page.locator('#roofs').check();
  await waitForFrames(page,3);
  const state=await page.locator('#model').evaluate(e=>({...e.dataset}));
  assert.equal(await page.locator('#roofs').isChecked(),true);
  await page.locator('#model canvas').screenshot({path:output+'/'+view.id+'.png'});
  captures.push({id:view.id,view,state,roofs:true,url:url.href});
 }
 assert.equal(hash(await readFile(file)),hash(bytes));assert.deepEqual(errors,[]);
 await writeFile(output+'/loaded.aml',bytes);
 await writeFile(output+'/capture.json',JSON.stringify({source:hash(bytes),sourceFile:file,views:captures,roofs:true,errors},null,2)+'\n');
 console.log(JSON.stringify({output,source:hash(bytes),views:captures.map(c=>c.id),roofs:true,errors}));
}finally{await browser?.close();await server?.close();}
