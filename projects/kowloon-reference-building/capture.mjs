/** Capture only a frozen GLB revision, checking the exact bytes loaded by the browser. */
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
const revision=process.argv[2]??'r01';if(!/^[a-z0-9-]+$/.test(revision))throw new Error('Invalid revision.');
const root=resolve(`generated/reference-building/${revision}`);
const manifest=JSON.parse(await readFile(`${root}/build.json`));
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const path=resolve(root,'.'+(name==='/'?'/index.html':name));if(!path.startsWith(root+sep))throw new Error('Outside revision.');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.glb':'model/gltf-binary','.json':'application/json'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{console.error(`Missing capture resource: ${req.url}`);res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await launchBrowser();const views=[];const errors=[];
try{const page=await browser.newPage({viewport:{width:1400,height:1500},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.ready,{},{timeout:90000});
await page.addStyleTag({content:'header, nav, #light, #time { display:none !important; }'});
for(const name of ['hero','front','side','balcony','upper','shops','roof']){await page.evaluate(name=>window.setView(name),name);await waitForFrames(page,3);const state=await page.evaluate(()=>window.reviewState());assert.equal(state.loadedHash,manifest.glbSha256);await page.locator('canvas').screenshot({path:`${root}/${name}.png`});views.push({name,...state});}
await page.evaluate(()=>window.setTimeOfDay('night'));
for(const name of ['hero','shops']){await page.evaluate(name=>window.setView(name),name);await waitForFrames(page,3);const state=await page.evaluate(()=>window.reviewState());assert.equal(state.loadedHash,manifest.glbSha256);await page.locator('canvas').screenshot({path:`${root}/${name}-night.png`});views.push({name:`${name}-night`,...state});}
assert.deepEqual(errors,[]);await writeFile(`${root}/capture.json`,JSON.stringify({revision,glbSha256:manifest.glbSha256,errors,views},null,2));console.log(`Captured ${revision}: ${views.length} verified views.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
