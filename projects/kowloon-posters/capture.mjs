/** Records the actual GLB gallery and close wall views of production chicken-shop props. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
const out=process.argv[2]??'generated/poster-library/review';
await mkdir(out,{recursive:false});
const server=await createServer({root:process.cwd(),configFile:false,cacheDir:out+'/.vite',server:{host:'127.0.0.1',port:0,hmr:false,watch:null}});
const roots=['src/dressing','projects/kowloon-restaurant-props','projects/kowloon-posters','projects/kowloon-concrete-study','projects/dressing-demo/textures'];
const files=(await Promise.all(roots.map(async root=>(await readdir(root,{recursive:true})).filter(file=>/\.(ts|mjs|html|json|png|jpg)$/.test(file)).map(file=>root+'/'+file)))).flat();
files.push('generated/poster-library/gallery.glb','generated/restaurant-props/store-surfaces-texture-shared/enclosure.glb');
/** Freezes the art, geometry, shaders and viewer inputs actually used by this capture. */
async function hashes(){return Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));}
const before=await hashes();
const errors=[];let browser;
try{
 await server.listen();browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1600,height:950}});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 page.on('response',response=>{if(response.status()>=400)errors.push(response.url()+' '+response.status());});
 const base='http://127.0.0.1:'+server.httpServer.address().port;
 await page.goto(base+'/projects/kowloon-posters/gallery.html');
 await page.waitForSelector('body[data-ready="true"]');await waitForFrames(page,3);
 await page.screenshot({path:out+'/gallery.png'});
 await page.goto(base+'/projects/kowloon-restaurant-props/store.html?enclosure=/generated/restaurant-props/store-surfaces-texture-shared/enclosure.glb');
 await page.waitForSelector('body[data-ready="true"]',{timeout:60000});
 for(const view of ['wide-store','posters','poster-left','alternate','narrow']){
  await page.selectOption('#view',view);
  await page.waitForFunction(view=>window.storeState?.view===view&&document.body.dataset.ready==='true',view);
  await waitForFrames(page,3);await page.locator('canvas').screenshot({path:out+'/'+view+'.png'});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before,"Capture inputs changed");await writeFile(out+'/capture.json',JSON.stringify({hashes:before,errors,state:await page.evaluate(()=>window.storeState)},null,2));
 console.log(JSON.stringify({out,errors}));
}finally{await browser?.close();await server.close();}
