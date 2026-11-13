/** Captures a matched whole-store comparison and verifies that only its enclosure changed. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
import {createServer} from 'vite';
import {validateBytes} from 'gltf-validator';
import {PNG} from 'pngjs';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';

const output=process.argv[2];
assert.ok(output,'Provide a new capture directory');
await mkdir(output,{recursive:false});
const enclosure=process.argv[3]??'generated/liquor-props/store-surfaces/enclosure.glb';
const files=[enclosure,'projects/kowloon-liquor-props/store-surfaces.aml',
 join(dirname(enclosure),'report.json'),
 'projects/kowloon-liquor-props/build-store-surfaces.ts','projects/kowloon-liquor-props/shop-preview.ts',
 'projects/kowloon-liquor-props/store-viewer.mjs',
 'projects/kowloon-liquor-props/store.html',
 ...['kit.ts','kit-mesh.ts','pen.ts','geometry.ts','kowloon/kit.ts','kowloon/palette.ts','kowloon/ground-support.ts'].map(file=>'src/dressing/'+file),
 'src/generate/rng.ts',
 ...(await readdir('src/dressing/kowloon/shop',{recursive:true})).filter(file=>/\.(ts|json)$/.test(file)).map(file=>'src/dressing/kowloon/shop/'+file),
 ...['grocer-props.png','grocer-props-normal.png','grocer-props-properties.png','snack-packet.png','market-apple.png','timber.png','metal.png',
  'shop-timber.png','shop-timber-normal.png','shop-timber-properties.png'].map(file=>'projects/dressing-demo/textures/'+file)];
/** Freezes the geometry, recipe and image inputs that identify this visual comparison. */
async function hashes(){return Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));}
const before=await hashes();
const build=JSON.parse(await readFile(join(dirname(enclosure),'report.json'),'utf8'));
assert.equal(before[enclosure],build.glbSha256,'The enclosure does not match its build report');
assert.ok(build.inputs,'Rebuild the enclosure to record the consumed recipe inputs');
const bakedSourceDrift=[];
for(const [file,hash] of Object.entries(build.inputs)) {
 const current=createHash('sha256').update(await readFile(file)).digest('hex');
 if(current!==hash)bakedSourceDrift.push({file,baked:hash,current});
}
for(const [reference,hash] of Object.entries(build.materialInputs)) {
 const file=resolve('projects/kowloon-liquor-props',reference),current=createHash('sha256').update(await readFile(file)).digest('hex');
 if(current!==hash)bakedSourceDrift.push({file,baked:hash,current});
}
const validation=await validateBytes(new Uint8Array(await readFile(enclosure)));
assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues));
const server=await createServer({configFile:false,root:process.cwd(),cacheDir:resolve(output,'.vite'),
 optimizeDeps:{include:['three','three/addons/loaders/GLTFLoader.js',...['EffectComposer','RenderPass','GTAOPass','OutputPass'].map(name=>`three/addons/postprocessing/${name}.js`)]},
 server:{host:'127.0.0.1',port:0,hmr:false,watch:null}});
const errors=[],captures=[];let browser,aoComparison;
/** Counts scene changes below the overlaid controls, excluding UI hover and focus styling. */
function changedPixels(first,second){
 const a=PNG.sync.read(first),b=PNG.sync.read(second);
 assert.equal(a.width,b.width);assert.equal(a.height,b.height);
 let changed=0;
 for(let i=a.width*60*4;i<a.data.length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(a.data[i+c]-b.data[i+c])))>2)changed++;
 return changed;
}
try{
 await server.listen();browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 const url=`http://127.0.0.1:${server.httpServer.address().port}/projects/kowloon-liquor-props/store.html`;
 await page.goto(url);await page.waitForSelector('body[data-ready="true"]',{timeout:60000});
 await page.selectOption('#view','wide-store');
 await page.waitForFunction(()=>window.storeState?.view==='wide-store'&&document.body.dataset.ready==='true');
 await waitForFrames(page,3);
 const plain=await page.evaluate(()=>window.storeState);
 await page.locator('canvas').screenshot({path:resolve(output,'plain-store.png')});
 await page.goto(url+'?enclosure=/'+enclosure);
 await page.waitForSelector('body[data-ready="true"]',{timeout:120000});
 for(const view of ['wide-store','walls-floor']){
  await page.selectOption('#view',view);
  await page.waitForFunction(view=>window.storeState?.view===view&&document.body.dataset.ready==='true',view);
  await waitForFrames(page,3);
  const state=await page.evaluate(()=>window.storeState);
  assert.equal(state.ambientOcclusion,true,'AO must be enabled by default');
  assert.equal(state.propHash,plain.propHash,'Prop geometry or material bindings changed');
  assert.equal(state.placeholderRoom,false,'The old room still overlaps the new enclosure');
  assert.ok(state.enclosureTriangles>0,'No procedural enclosure was rendered');
  if(view==='wide-store')assert.deepEqual(state.camera,plain.camera,'Comparison camera changed');
  const enabled=await page.locator('canvas').screenshot({path:resolve(output,view+'.png')});captures.push(state);
  if(view==='wide-store'){
   await page.uncheck('#ao');await page.mouse.move(1279,899);await page.locator('#ao').blur();await waitForFrames(page,2);
   const disabled=await page.evaluate(()=>window.storeState);
   assert.deepEqual(disabled,{...state,ambientOcclusion:false},'AO changed scene state');
   const off=await page.locator('canvas').screenshot({path:resolve(output,'wide-store-no-ao.png')});
   for(const image of [enabled,off]){
    const png=PNG.sync.read(image),corner=(100*png.width+10)*4;
    assert.deepEqual([...png.data.slice(corner,corner+3)],[48,50,56],'Postprocessing changed the neutral backdrop');
   }
   const changed=changedPixels(enabled,off);
   assert.ok(changed>1000,'AO did not visibly affect the rendered scene');
   await page.check('#ao');await page.mouse.move(1279,899);await page.locator('#ao').blur();await waitForFrames(page,2);
   const restored=await page.locator('canvas').screenshot();
   assert.equal(changedPixels(enabled,restored),0,'AO toggle did not restore the original rendering');
   aoComparison={changedPixels:changed,restoredPixelsChanged:0};
  }
 }
 await page.selectOption('#view','layout-side-left');
 await page.waitForFunction(()=>window.storeState?.view==='layout-side-left'&&document.body.dataset.ready==='true');
 await page.locator('canvas').screenshot({path:resolve(output,'layout-side-left.png')});
 const alternate=await page.evaluate(()=>window.storeState);
 assert.equal(alternate.ambientOcclusion,true);
 await page.setViewportSize({width:960,height:720});
 await page.waitForFunction(()=>window.storeState?.viewport.width===960);
 const resized=await page.evaluate(()=>window.storeState);
 assert.equal(resized.propHash,alternate.propHash);
 assert.deepEqual(resized.viewport,{width:960,height:720,aspect:960/720});
 const resizedPng=PNG.sync.read(await page.locator('canvas').screenshot({path:resolve(output,'resized.png')}));
 assert.equal(resizedPng.width,960);assert.equal(resizedPng.height,720);
 assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before,'Inputs changed during capture');
 await writeFile(join(output,'capture.json'),JSON.stringify({hashes:before,plain,captures,errors,
  aoComparison,alternate,resized,build,bakedSourceDrift,glbValidation:validation.issues},null,2));
}finally{await browser?.close();await server.close();}
