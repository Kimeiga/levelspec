/** Captures the real GLB with two reflection directions and a close material view. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {validateBytes} from 'gltf-validator';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
const output='generated/modular-metal';
await mkdir(output,{recursive:true});
const glb=await readFile(`${output}/study.glb`);
const validation=await validateBytes(new Uint8Array(glb));
assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues));
const server=await createServer({configFile:false,root:process.cwd(),cacheDir:resolve(output,'.vite'),server:{host:'127.0.0.1',port:0,hmr:false,watch:null}});
let browser;const errors=[];
try{
 await server.listen();browser=await launchBrowser();const page=await browser.newPage({viewport:{width:1400,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/projects/modular-metal/index.html`);
 await page.waitForSelector('body[data-ready="true"]');await waitForFrames(page,3);
 await page.screenshot({path:`${output}/overview.png`});
 await page.click('#light');await waitForFrames(page,3);await page.screenshot({path:`${output}/relit.png`});
 await page.evaluate(()=>{const{camera,controls}=window.metalStudy;camera.position.set(1.7,2.2,1);controls.target.set(.98,1,-1.13);controls.update()});
 await waitForFrames(page,3);await page.screenshot({path:`${output}/detail.png`});
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/capture.json`,JSON.stringify({glbSha256:createHash('sha256').update(glb).digest('hex'),validationErrors:validation.issues.numErrors,errors,views:['overview','relit','detail']},null,2));
 console.log('PASS shared-metal GLB validation and browser captures');
}finally{await browser?.close();await server.close()}
