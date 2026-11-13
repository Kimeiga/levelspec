import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
const output=process.argv[2];
if(!output)throw new Error('Provide a new capture directory');
await mkdir(output,{recursive:false});
const bytes=await readFile('src/dressing/kowloon/shop/assets/grocer-props.json');
const catalog=JSON.parse(bytes), errors=[], captures=[];
const server=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port:0,hmr:false,watch:null}});
let browser;
try{
 await server.listen();browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:640,height:640}});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/projects/kowloon-liquor-props/`);
 await page.waitForSelector('body[data-ready="true"]');
 for(const name of Object.keys(catalog))for(const view of ['front','side','back']){
  await page.selectOption('#asset',name);await page.selectOption('#view',view);
  await waitForFrames(page,2);const state=await page.evaluate(()=>window.catalogState);
  assert.equal(state.asset,name);assert.equal(state.view,view);
  const file=`${name}-${view}.png`;await page.screenshot({path:resolve(output,file)});captures.push({file,...state});
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'capture.json'),JSON.stringify({catalogSha256:createHash('sha256').update(bytes).digest('hex'),captures,errors},null,2));
}finally{await browser?.close();await server.close();}
