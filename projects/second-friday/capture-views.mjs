/** Freeze and capture the project in the repository browser renderer, including canopy roofs. */
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { startPreview } from '../../src/cli/preview.ts';
import { launchBrowser,waitForFrames } from '../../tests/browser/support/browser.mjs';
const source=resolve('projects/second-friday/level.aml'),output=resolve(process.argv[2]??'generated/second-friday/R01-views');
const bytes=await readFile(source),hash=b=>createHash('sha256').update(b).digest('hex'),views=JSON.parse(await readFile(process.argv[3]??new URL('./views.json',import.meta.url)));
await mkdir(output,{recursive:false});
let server,browser;const errors=[],captures=[];
try{
 server=await startPreview(source,{port:0,navigationCell:.125});browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1,reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 let frozen;await page.route('**/__levelspec/*/source',async route=>{frozen??=route.fetch().then(r=>r.json());await route.fulfill({json:await frozen});});
 const url=new URL(server.url);url.searchParams.set('appearance','materials');url.searchParams.set('frame-aspect','1.4');
 await page.goto(url.href);await page.locator('#status[data-state="ready"]').waitFor({timeout:120000});
 const loaded=await frozen;assert.equal(hash(Buffer.from(loaded.text)),hash(bytes));
 await page.locator('#dimensions').uncheck();await page.locator('#roofs').check();
 await page.locator('#camera-controls').evaluate(e=>e.open=true);
 for(const view of views){
  const viewURL=new URL(server.url);
  const settings={camera:view.position.join(' '),target:view.target.join(' '),projection:view.projection??'perspective',fov:view.fov??80,'view-height':view.viewHeight??145,roll:0,appearance:view.appearance??'materials','frame-aspect':1.4};
  for(const [key,value] of Object.entries(settings))viewURL.searchParams.set(key,String(value));
  await page.goto(viewURL.href);await page.locator('#status[data-state="ready"]').waitFor({timeout:120000});
  await page.locator('#dimensions').uncheck();await page.locator('#roofs').check();await waitForFrames(page,4);
  const actual=await page.locator('#model').evaluate(e=>({...e.dataset}));
  const camera=JSON.parse(actual.view);
  for(const key of ['position','target'])assert.ok(Math.hypot(...camera[key].map((n,i)=>n-view[key][i]))<.01,`${view.id} wrong ${key}: ${JSON.stringify(camera)}`);
  assert.equal(camera.projection,view.projection??'perspective');assert.equal(camera.fov,view.fov??80);
  await page.locator('#model canvas').screenshot({path:`${output}/${view.id}.png`});
  captures.push({view,actual,roofs:await page.locator('#roofs').isChecked()});
 }
 assert.deepEqual(errors,[]);assert.equal(hash(await readFile(source)),hash(bytes));await writeFile(`${output}/loaded.aml`,bytes);
 await writeFile(`${output}/capture.json`,JSON.stringify({source,sourceSha256:hash(bytes),viewport:[1600,1200],captures,errors},null,2));
 console.log(JSON.stringify({output,sourceSha256:hash(bytes),views:captures.length,errors}));
}finally{await browser?.close();await server?.close();}
