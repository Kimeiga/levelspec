/** Freezes real GLB review inputs and records front, side, rear and changed-light evidence. */
import {createServer} from 'vite';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
const [model,out,mode='context']=process.argv.slice(2);if(!model||!out)throw new Error('model out [raw]');
await mkdir(out,{recursive:false});
const files=[model,'projects/kowloon-balcony-props/viewer.html','projects/kowloon-balcony-props/viewer.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const before=await hashes(),errors=[],states=[];
const server=await createServer({configFile:false,root:process.cwd(),cacheDir:out+'/.vite',server:{host:'127.0.0.1',port:0,hmr:false,watch:null}});
let browser;
try{await server.listen();browser=await launchBrowser();const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+' '+r.status());});
 const url='http://127.0.0.1:'+server.httpServer.address().port+'/projects/kowloon-balcony-props/viewer.html?model=/'+model+(mode==='raw'?'&raw=1':mode==='asset'?'&asset=1':'')+(process.env.DOUBLE_SIDED==='1'?'&double=1':'');
 await page.goto(url);await page.waitForSelector('body[data-ready="true"]',{timeout:60000});
 for(const view of mode!=='context'?['front','side','back','oblique','underside']:['front','oblique','plants','cloth']){await page.evaluate(view=>window.setView(view),view);await waitForFrames(page,3);await page.screenshot({path:out+'/'+view+'.png'});states.push(await page.evaluate(()=>window.studyState));}
 await page.evaluate(()=>{window.setView('oblique');window.reverseLight();});await waitForFrames(page,3);await page.screenshot({path:out+'/reverse-light.png'});
 await page.evaluate(()=>window.clay());await waitForFrames(page,3);await page.screenshot({path:out+'/clay.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);await writeFile(out+'/capture.json',JSON.stringify({hashes:before,states,errors,url,doubleSided:process.env.DOUBLE_SIDED==='1'},null,2));console.log(JSON.stringify({out,errors}));
}finally{await browser?.close();await server.close();await rm(out+'/.vite',{recursive:true,force:true});}
