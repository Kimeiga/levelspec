/** Captures real production restaurant views with frozen inputs and browser error checks. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {PNG} from 'pngjs';
import {validateBytes} from 'gltf-validator';
import {createServer} from 'vite';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';

const output=process.argv[2];
assert.ok(output,'Provide a new output directory');await mkdir(output,{recursive:false});
const roots=['src/dressing','projects/kowloon-restaurant-props','projects/dressing-demo/textures','projects/kowloon-concrete-study'];
const files=(await Promise.all(roots.map(async root=>(await readdir(root,{recursive:true}))
 .filter(file=>/\.(ts|json|mjs|html|png)$/.test(file)).map(file=>root+'/'+file)))).flat();
/** Identifies every live generator, viewer and material input for this capture. */
async function hashes(){return Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));}
const enclosure=process.argv[3];
if(enclosure){
 files.push(enclosure);
 const validation=await validateBytes(new Uint8Array(await readFile(enclosure)));
 assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues));
 const report=JSON.parse(await readFile(enclosure.replace(/enclosure.glb$/,'report.json'),'utf8'));
 assert.equal(createHash('sha256').update(await readFile(enclosure)).digest('hex'),report.glbSha256);
}
const before=await hashes();
const server=await createServer({configFile:false,root:process.cwd(),cacheDir:resolve(output,'.vite'),
 optimizeDeps:{include:['three','three/addons/loaders/GLTFLoader.js','three/addons/environments/RoomEnvironment.js',...['EffectComposer','RenderPass','GTAOPass','OutputPass'].map(name=>`three/addons/postprocessing/${name}.js`)]},
 server:{host:'127.0.0.1',port:0,hmr:false,watch:null}});
const errors=[],captures=[];let browser;
try{
 await server.listen();browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const url=`http://127.0.0.1:${server.httpServer.address().port}/projects/kowloon-restaurant-props/store.html`+(enclosure?'?enclosure=/'+enclosure:'');
 await page.goto(url);await page.waitForSelector('body[data-ready="true"]',{timeout:60000});
 for(const view of ['wide-store','counter','food','work-details','elevated','narrow','alternate']){
  await page.selectOption('#view',view);
  await page.waitForFunction(view=>window.storeState?.view===view&&document.body.dataset.ready==='true',view);
  await waitForFrames(page,3);await page.mouse.move(1279,899);
  const state=await page.evaluate(()=>window.storeState);
  assert.equal(state.ambientOcclusion,true);
  if(enclosure&&view!=='narrow') {assert.ok(state.enclosureTriangles>0);assert.ok(state.hiddenWallMeshes>0,'Old enclosure walls still visible');assert.equal(state.placeholderRoom,false);}assert.ok(state.triangles>1000&&state.triangles<45000);
  assert.ok(state.taskLights.length>=1&&state.taskLights.length<=2);
  for(const light of state.taskLights){
   assert.ok(light.position.every(Number.isFinite)&&light.position[2]>1.5&&light.position[2]<2.6);
   assert.ok(light.intensity>0&&light.color==='#ffc17b');
  }
  assert.equal(state.wallFinish,'live-concrete-study + production-ceramic-field');
  captures.push(state);await page.locator('canvas').screenshot({path:resolve(output,view+'.png')});
 }
 await page.selectOption('#view','counter');
 await page.waitForFunction(()=>window.storeState?.view==='counter'&&document.body.dataset.ready==='true');
 await page.uncheck('#ao');
 for(const enabled of [false,true]){
  await page.evaluate(enabled=>window.setTaskLights(enabled),enabled);await waitForFrames(page,3);
  await page.locator('canvas').screenshot({path:resolve(output,enabled?'task-lights-on.png':'task-lights-off.png')});
 }
 const off=PNG.sync.read(await readFile(resolve(output,'task-lights-off.png')));
 const on=PNG.sync.read(await readFile(resolve(output,'task-lights-on.png')));
 const change=[0,0,0];let changedPixels=0,count=0;
 for(let y=50;y<on.height*.6;y++)for(let x=on.width*.1|0;x<on.width*.9;x++){
  const i=(y*on.width+x)*4;let difference=0;
  for(let c=0;c<3;c++){const delta=on.data[i+c]-off.data[i+c];change[c]+=delta;difference+=Math.abs(delta);}
  if(difference>3)changedPixels++;count++;
 }
 const lighting={ao:false,changedPixels,meanChannelIncrease:change.map(value=>value/count)};
 assert.ok(changedPixels>1000&&lighting.meanChannelIncrease[0]>.1,'Task lamps do not illuminate the actual food view');
 assert.ok(lighting.meanChannelIncrease[0]>lighting.meanChannelIncrease[2],'Task-light effect is not warmer than base lighting');
 await writeFile(resolve(output,'lighting.json'),JSON.stringify(lighting,null,2));
 const aoComparisons=[];
 for(const view of ['counter','work-details']){
  await page.selectOption('#view',view);
  await page.waitForFunction(view=>window.storeState?.view===view&&document.body.dataset.ready==='true',view);
  const states=[];
  for(const enabled of [false,true]){
   await page.locator('#ao').setChecked(enabled);await waitForFrames(page,3);
   states.push(await page.evaluate(()=>window.storeState));
   await page.locator('canvas').screenshot({path:resolve(output,`${view}-ao-${enabled?'on':'off'}.png`)});
  }
  assert.equal(states[0].propHash,states[1].propHash,'AO toggle rebuilt scene props');
  assert.ok(states[1].aoSettings.excludedGlassMeshes>0,'Transparent display still occludes AO');
  const off=PNG.sync.read(await readFile(resolve(output,`${view}-ao-off.png`)));
  const on=PNG.sync.read(await readFile(resolve(output,`${view}-ao-on.png`)));
  let changedPixels=0,darkening=0;
  for(let i=0;i<on.data.length;i+=4){
   const delta=(off.data[i]+off.data[i+1]+off.data[i+2]-on.data[i]-on.data[i+1]-on.data[i+2])/3;
   if(delta>1)changedPixels++;darkening+=delta;
  }
  assert.ok(changedPixels>1000,'AO produced no visible contact shading');
  aoComparisons.push({view,changedPixels,meanDarkening:darkening/(on.width*on.height),settings:states[1].aoSettings});
 }
 await writeFile(resolve(output,'ao.json'),JSON.stringify(aoComparisons,null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before,'Live inputs changed during capture');
 await writeFile(resolve(output,'capture.json'),JSON.stringify({hashes:before,captures,errors},null,2));
 console.log(JSON.stringify({output,views:captures.map(({view,triangles})=>({view,triangles})),errors}));
}finally{await browser?.close();await server.close();}
