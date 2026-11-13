/** Captures matched front, grazing, close, rear, distance and changed-light views. */
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {validateBytes} from 'gltf-validator';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
const [models,output]=process.argv.slice(2);
assert.ok(models&&output,'Supply models and capture output directories');
await mkdir(output,{recursive:true});
const names=['steel','timber-glass','painted-timber','gate','shutter'];
const hashes={};
for(const name of names){
 const bytes=await readFile(resolve(models,name+'.glb'));
 hashes[name]=createHash('sha256').update(bytes).digest('hex');
 const result=await validateBytes(new Uint8Array(bytes));
 assert.equal(result.issues.numErrors,0,JSON.stringify(result.issues));
}
const server=await createServer({configFile:false,root:process.cwd(),cacheDir:resolve(output,'.vite'),
 server:{host:'127.0.0.1',port:0,hmr:false,watch:null}});
let browser;const errors=[],captures=[];
try{
 await server.listen();browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1100,height:950}});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/projects/kowloon-doors/index.html?models=/${models}`);
 await page.waitForSelector('body[data-ready="true"]',{timeout:60000});
 for(const name of names){
  await page.selectOption('#asset',name);
  for(const view of ['front','oblique','hardware','lower','side','rear','distance','relight']){
   await page.selectOption('#view',view);await waitForFrames(page,3);
   await page.locator('canvas').screenshot({path:resolve(output,`${name}-${view}.png`)});
   captures.push(await page.evaluate(()=>window.doorStudy));
  }
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'capture.json'),JSON.stringify({hashes,captures,errors},null,2));
 console.log(JSON.stringify({output,captures:captures.length,errors}));
}finally{await browser?.close();await server.close();}
