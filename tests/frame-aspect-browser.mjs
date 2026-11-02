/** Real composition, framing and input acceptance for reviewer-owned image aspect. */
import assert from 'node:assert/strict';
import { mkdir,mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import * as THREE from 'three';
import { startPreview } from '../src/cli/preview.ts';
import { launchBrowser,waitForFrames } from '../website/tests/browser-helpers.mjs';

await mkdir('generated',{recursive:true});
const output=await mkdtemp(join('generated','frame-aspect-browser-'));
const directory=await mkdtemp(join(tmpdir(),'levelspec-frame-'));
const file=join(directory,'level.level.svgx');
const image=new PNG({width:2,height:2});image.data.fill(255);
await writeFile(join(directory,'reference.png'),PNG.sync.write(image));
await writeFile(file,`<level version="2" id="frame-calibration" name="Frame calibration" validation="premap">
 <material id="blue" color="#508090"/><material id="red" color="#c85040"/>
 <layer id="ground">
  <vertex id="a" x="-3" y="-3" z="0"/><vertex id="b" x="3" y="-3" z="0"/>
  <vertex id="c" x="3" y="3" z="0"/><vertex id="d" x="-3" y="3" z="0"/>
  <edge id="ab" from="a" to="b" kind="open"/><edge id="bc" from="b" to="c" kind="open"/>
  <edge id="cd" from="c" to="d" kind="open"/><edge id="da" from="d" to="a" kind="open"/>
  <region id="floor" boundary="ab bc cd da" fill="floor" material="blue"/>
  <vertex id="w" x="-1" y="0" z="0"/><vertex id="e" x="1" y="0" z="0"/>
  <edge id="wall" from="w" to="e" kind="wall" height="2" thickness=".3" material="red"/>
 </layer>
 <marker id="spawn" layer="ground" region="floor" kind="attacker_spawn" position="2 -2 0"/>
 <reference id="portrait" image="reference.png" width="600" height="800" position="8 -12 9" target="0 0 .6" up="0 0 1" fov="47" near=".05" far="100" scale="assumed" scale-note="Frame fixture portrait"/>
 <reference id="landscape" image="reference.png" width="800" height="600" position="8 -12 9" target="0 0 .6" up="0 0 1" fov="47" near=".05" far="100" scale="assumed" scale-note="Frame fixture landscape"/>
</level>`);
let server,browser;
const errors=[],measurements=[];
const initial={projection:'perspective',position:[8,-12,9],target:[0,0,.6],fov:47,viewHeight:9,roll:31,appearance:'inspection'};
const landmarks=[[2,-1,0],[-2,-2,0],[0,-.15,1]];

/** Publishes fractional CSS geometry and actual delivered camera/backing-store state together. */
async function state(page) {
 return page.locator('#model').evaluate(host=>{
  const rect=host.getBoundingClientRect(),bounds=host.parentElement.getBoundingClientRect(),canvas=host.querySelector('canvas');
  return {frame:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},workspace:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},view:JSON.parse(host.dataset.view),matrix:host.dataset.viewMatrix.split(',').map(Number),projection:host.dataset.projectionMatrix.split(',').map(Number),backing:[canvas.width,canvas.height],dpr:Math.min(devicePixelRatio,2)};
 });
}

/** Waits for the contained layout, ResizeObserver projection and matching rendered state rather than a delay. */
async function frameReady(page,ratio,pixelTolerance=.05) {
 await page.waitForFunction(({ratio,pixelTolerance})=>{
  const host=document.querySelector('#model'),canvas=host?.querySelector('canvas');if(!host?.dataset.view||!canvas)return false;
  const rect=host.getBoundingClientRect(),bounds=host.parentElement.getBoundingClientRect();
  if(!rect.width||!rect.height)return false;
  const view=JSON.parse(host.dataset.view),aspect=rect.width/rect.height,projection=host.dataset.projectionMatrix.split(',').map(Number);
  if(view.projection!==document.querySelector('#projection').value)return false;
  const expectedWidth=ratio===null?bounds.width:Math.min(bounds.width,bounds.height*ratio),expectedHeight=ratio===null?bounds.height:expectedWidth/ratio;
  const scale=view.projection==='perspective'?1/Math.tan(view.fov*Math.PI/360):2/view.viewHeight;
  return Math.abs(rect.width-expectedWidth)<pixelTolerance&&Math.abs(rect.height-expectedHeight)<pixelTolerance&&Math.abs(projection[0]-scale/aspect)<1e-6&&Math.abs(projection[5]-scale)<1e-6&&Math.abs(view.frameAspect-aspect)<1e-6&&Math.abs(canvas.width-rect.width*Math.min(devicePixelRatio,2))<1.1&&Math.abs(canvas.height-rect.height*Math.min(devicePixelRatio,2))<1.1;
 },{ratio:ratio??null,pixelTolerance},{timeout:15000});
 return state(page);
}

/** Compares actual camera values without accepting camera compensation for incorrect frame geometry. */
function sameCamera(a,b) {
 for(const field of['position','target'])for(let i=0;i<3;i++)assert.ok(Math.abs(a.view[field][i]-b.view[field][i])<1e-6,field+' changed');
 for(const field of['fov','roll','viewHeight'])assert.ok(Math.abs(a.view[field]-b.view[field])<1e-6,field+' changed');
 for(let i=0;i<16;i++)assert.ok(Math.abs(a.matrix[i]-b.matrix[i])<1e-6,'View matrix changed');
 assert.equal(a.view.appearance,b.view.appearance);
}

/** Known world points are projected independently into normalized image coordinates. */
function projected(state,point) {
 const matrix=new THREE.Matrix4().fromArray(state.projection).multiply(new THREE.Matrix4().fromArray(state.matrix));
 const p=new THREE.Vector3(...point).applyMatrix4(matrix);
 return[(p.x+1)/2,(1-p.y)/2];
}

/** Samples known rendered authored-color interiors, independently of reported DOM ratio. */
async function pixels(page,name,s) {
 const image=PNG.sync.read(await page.locator('#model canvas').screenshot({path:join(output,name+'.png'),scale:'css'}));
 const samples=landmarks.map((point,index)=>{
  const uv=projected(s,point),x=Math.round(uv[0]*image.width),y=Math.round(uv[1]*image.height),rgb=[0,0,0];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   assert.ok(x+dx>=0&&x+dx<image.width&&y+dy>=0&&y+dy<image.height,'Landmark outside frame');
   const offset=((y+dy)*image.width+x+dx)*4;for(let c=0;c<3;c++)rgb[c]+=image.data[offset+c]/9;
  }
  const expected=index===2?[200,80,64]:[80,128,144];assert.ok(rgb.every((v,c)=>Math.abs(v-expected[c])<5),`Known patch ${index} has wrong rendered position/color: ${rgb}`);
  return {point,uv,rgb};
 });
 measurements.push({name,...s,samples});return samples;
}

/** Enforces maximal containment and centering in both axes, allowing fractional CSS pixel rounding. */
function contained(s,ratio) {
 const f=s.frame,w=s.workspace;
 assert.ok(Math.abs(f.width/f.height-ratio)<1e-5);
 assert.ok(Math.abs((f.x-w.x)*2-(w.width-f.width))<.1&&Math.abs((f.y-w.y)*2-(w.height-f.height))<.1,'Frame is not centered');
 assert.ok(f.width<=w.width+.05&&f.height<=w.height+.05);
 assert.ok(Math.abs(f.width-w.width)<.05||Math.abs(f.height-w.height)<.05,'Frame is not maximally contained');
}

/** Checks normalized image composition across different pixel sizes. */
function sameLandmarks(a,b) {
 for(const point of landmarks){const x=projected(a,point),y=projected(b,point);for(let i=0;i<2;i++)assert.ok(Math.abs(x[i]-y[i])<1e-5,'Normalized landmark moved');}
}

try {
 server=await startPreview(file,{port:0,view:initial});browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 const invalidURL=new URL(server.url);invalidURL.searchParams.set('frame-aspect','1e-300');
 await page.goto(invalidURL.href);await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});
 assert.match(await page.locator('#camera-error').textContent(),/frame-aspect/);
 assert.equal((await frameReady(page)).view.frameAspectLock,undefined);
 assert.equal(await page.locator('#appearance').inputValue(),'illustrated','Invalid initial group retains a usable default');
 await page.goto(server.url);await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});
 const responsiveWide=await frameReady(page);assert.equal(responsiveWide.view.frameAspectLock,undefined);
 await page.setViewportSize({width:800,height:1000});const responsiveNarrow=await frameReady(page);sameCamera(responsiveWide,responsiveNarrow);
 assert.ok(Math.abs(responsiveWide.view.frameAspect-responsiveNarrow.view.frameAspect)>.2,'Viewport control must expose real responsive framing difference');
 assert.ok(Math.abs(responsiveWide.projection[0]-responsiveNarrow.projection[0])>.1);
 await page.setViewportSize({width:1400,height:1000});await frameReady(page);
 await page.locator('#frame-controls > summary').click();
 assert.equal(await page.locator('#frame-reference').isDisabled(),true);
 await page.locator('#frame-mode').selectOption('0.75');const wide=await frameReady(page,.75);contained(wide,.75);sameCamera(wide,responsiveWide);await pixels(page,'portrait-wide',wide);
 await page.setViewportSize({width:800,height:1000});const narrow=await frameReady(page,.75);contained(narrow,.75);sameCamera(wide,narrow);sameLandmarks(wide,narrow);await pixels(page,'portrait-narrow',narrow);
 assert.ok(Math.abs(wide.frame.height-wide.workspace.height)<.05&&Math.abs(narrow.frame.width-narrow.workspace.width)<.05,'Resize must exercise both limiting axes');
 await page.locator('#frame-aspect').fill('0');await page.locator('#frame-form button').click();assert.match(await page.locator('#frame-error').textContent(),/0.1 through 10/);sameCamera(await state(page),narrow);contained(await state(page),.75);
 await page.locator('#frame-aspect').fill('1e-300');await page.locator('#frame-form button').click();assert.match(await page.locator('#frame-error').textContent(),/0.1 through 10/);contained(await state(page),.75);
 await page.locator('#frame-aspect').fill('1.2');await page.locator('#frame-form button').click();await frameReady(page,1.2);assert.equal(await page.locator('#frame-error').textContent(),'');
 await page.locator('#references > summary').click();await page.locator('#reference').selectOption('portrait');
 assert.equal(await page.locator('#frame-reference').isEnabled(),true);await frameReady(page,1.2);
 await page.locator('#frame-reference').click();const referenceFrame=await frameReady(page,.75);assert.equal(referenceFrame.view.frameAspectLock,.75);
 await page.locator('#reference').selectOption('landscape');await frameReady(page,.75);await page.locator('#reference').selectOption('');assert.equal(await page.locator('#frame-reference').isDisabled(),true);await frameReady(page,.75);
 const replay=await browser.newPage({viewport:{width:1500,height:850}});await replay.goto(await page.locator('#view-link').getAttribute('href'));await replay.locator('#status[data-state="ready"]').waitFor({timeout:60000});const replayed=await frameReady(replay,.75);sameCamera(referenceFrame,replayed);sameLandmarks(referenceFrame,replayed);await pixels(replay,'reference-link-replay',replayed);await replay.close();
 await page.locator('#frame-mode').selectOption('viewport');const released=await frameReady(page);assert.equal(released.view.frameAspectLock,undefined);assert.equal(new URL(page.url()).searchParams.has('frame-aspect'),false);sameCamera(released,narrow);
 const responsiveLink=await page.locator('#view-link').getAttribute('href');assert.ok(Math.abs(Number(new URL(responsiveLink).searchParams.get('frame-aspect'))-released.view.frameAspect)<1e-6);
 const copied=await browser.newPage({viewport:{width:1500,height:850}});await copied.goto(responsiveLink);await copied.locator('#status[data-state="ready"]').waitFor({timeout:60000});const copiedState=await frameReady(copied,released.view.frameAspect);sameCamera(released,copiedState);sameLandmarks(released,copiedState);await pixels(copied,'responsive-link-lock',copiedState);await copied.close();
 await page.reload();await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});assert.equal((await frameReady(page)).view.frameAspectLock,undefined);
 await page.locator('#frame-controls > summary').click();await page.locator('#frame-mode').selectOption('1.3333333333333333');const landscape=await frameReady(page,4/3);contained(landscape,4/3);await pixels(page,'landscape',landscape);
 // Letterboxing must not offset pointer coordinates from the actual rendered object.
 const uv=projected(landscape,[0,-.15,1]);await page.locator('#model canvas').click({position:{x:uv[0]*landscape.frame.width,y:uv[1]*landscape.frame.height}});assert.equal(await page.locator('#selection').textContent(),'wall');
 const floorUV=projected(landscape,[2,-1,0]);await page.locator('#model canvas').click({position:{x:floorUV[0]*landscape.frame.width,y:floorUV[1]*landscape.frame.height}});assert.equal(await page.locator('#selection').textContent(),'floor');
 const canvas=await page.locator('#model canvas').boundingBox();const beforeOrbit=(await state(page)).matrix;
 await page.mouse.move(canvas.x+canvas.width*.5,canvas.y+canvas.height*.5);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.6,canvas.y+canvas.height*.55,{steps:8});await page.mouse.up();await page.waitForFunction(before=>document.querySelector('#model').dataset.viewMatrix!==before,beforeOrbit.join(','));
 const beforeWheel=await page.locator('#model').getAttribute('data-camera');await page.locator('#model canvas').hover();await page.mouse.wheel(0,-120);await page.waitForFunction(before=>document.querySelector('#model').dataset.camera!==before,beforeWheel);await frameReady(page,4/3);
 await page.locator('#frame-mode').selectOption('0.75');await frameReady(page,.75);
 for(const projection of['orthographic','perspective']){
  await page.locator('#projection').selectOption(projection);await frameReady(page,.75);const roll=(await state(page)).view.roll;
  const fitFrame=Number(await page.locator('#model').getAttribute('data-frames'));measurements.push({name:'before-fit-'+projection,...await state(page),ui:await page.locator('.reviewer').getAttribute('data-view')});await page.locator('#fit').click();await page.waitForFunction(before=>Number(document.querySelector('#model').dataset.frames)>before,fitFrame);const fitted=await frameReady(page,.75);measurements.push({name:'fit-'+projection,...fitted});assert.ok(Math.abs(fitted.view.roll-roll)<1e-6);for(const x of[-3,3])for(const y of[-3,3])for(const z of[-.2,2]){const p=projected(fitted,[x,y,z]);assert.ok(p.every(v=>v>.03&&v<.97),'Fit clipped known fixture bounds '+JSON.stringify({projection,point:[x,y,z],p}));}
 }
 const overview=await state(page);await page.locator('#view-2d').click();assert.equal(await page.locator('#plan').isVisible(),true);await page.setViewportSize({width:1100,height:950});await page.locator('#view-3d').click();const back=await frameReady(page,.75);sameCamera(overview,back);
 await page.locator('#walk').click();await page.locator('#model[data-mode="walk"]').waitFor();await page.setViewportSize({width:950,height:1000});await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#model').dataset.mode!=='walk');await page.waitForFunction(expected=>document.querySelector('#model').dataset.viewMatrix.split(',').map(Number).every((value,index)=>Math.abs(value-expected[index])<1e-6),back.matrix);const exited=await frameReady(page,.75);sameCamera(back,exited);
 await page.close();
 const dense=await browser.newPage({viewport:{width:1000,height:1000},deviceScaleFactor:2});const denseURL=new URL(server.url);denseURL.searchParams.set('frame-aspect','0.75');await dense.goto(denseURL.href);await dense.locator('#status[data-state="ready"]').waitFor({timeout:60000});const dpr=await frameReady(dense,.75);contained(dpr,.75);await pixels(dense,'portrait-dpr2',dpr);await dense.close();
 // Endpoints use an explicit one-CSS-pixel inward layout policy; projection still owns measured fractions.
 for(const ratio of[.1,10]) {
  const endpoint=await browser.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:1});
  const url=new URL(server.url);url.searchParams.set('frame-aspect',String(ratio));
  url.searchParams.set('projection',ratio===.1?'orthographic':'perspective');
  await endpoint.goto(url.href);await endpoint.locator('#status[data-state="ready"]').waitFor({timeout:60000});
  await frameReady(endpoint,ratio,1.02);
  const beforeFit=Number(await endpoint.locator('#model').getAttribute('data-frames'));
  await endpoint.locator('#fit').click();await endpoint.waitForFunction(before=>Number(document.querySelector('#model').dataset.frames)>before,beforeFit);
  const original=await frameReady(endpoint,ratio,1.02);
  const check=s=>{
   const desiredWidth=Math.min(s.workspace.width,s.workspace.height*s.view.frameAspectLock),desiredHeight=desiredWidth/s.view.frameAspectLock;
   assert.ok(Math.abs(s.frame.width-desiredWidth)<=1.02&&Math.abs(s.frame.height-desiredHeight)<=1.02,'Endpoint correction exceeds one CSS pixel');
   assert.ok(s.frame.width<=s.workspace.width+.02&&s.frame.height<=s.workspace.height+.02,'Endpoint escaped workspace');
   assert.ok(Math.abs((s.frame.x-s.workspace.x)*2-(s.workspace.width-s.frame.width))<.1&&Math.abs((s.frame.y-s.workspace.y)*2-(s.workspace.height-s.frame.height))<.1,'Endpoint lost centering');
   assert.ok(s.view.frameAspect>=.1&&s.view.frameAspect<=10,'Supported endpoint produced an unsupported measured ratio');
   assert.ok(Math.abs(s.projection[5]/s.projection[0]-s.frame.width/s.frame.height)<1e-9,'Projection must own fractional CSS aspect, not rounded client/backing size');
  };
  check(original);await pixels(endpoint,'endpoint-'+ratio+'-original',original);
  const href=await endpoint.locator('#view-link').getAttribute('href');assert.ok(href,'Supported endpoint lost exact-view link');
  const encoded=Number(new URL(href).searchParams.get('frame-aspect'));assert.ok(Math.abs(encoded-original.view.frameAspect)<1e-12,'Link concealed actual projection aspect');
  await endpoint.setViewportSize({width:1100,height:900});const resized=await frameReady(endpoint,ratio,1.02);check(resized);sameCamera(original,resized);await pixels(endpoint,'endpoint-'+ratio+'-resized',resized);
  const bounded=(a,b)=>{for(const point of landmarks){const x=projected(a,point),y=projected(b,point);assert.ok(Math.abs(x[1]-y[1])<1e-6);assert.ok(Math.abs(x[0]-y[0])<1/Math.min(a.frame.width,b.frame.width),'Endpoint landmark exceeded one horizontal CSS pixel of normalized quantization');}};
  bounded(original,resized);
  const linked=await browser.newPage({viewport:{width:1000,height:850}});await linked.goto(href);await linked.locator('#status[data-state="ready"]').waitFor({timeout:60000});const replayed=await frameReady(linked,encoded,1.02);check(replayed);sameCamera(original,replayed);bounded(original,replayed);await pixels(linked,'endpoint-'+ratio+'-replayed',replayed);
  assert.ok(await linked.locator('#view-link').getAttribute('href'),'Endpoint replay must retain a subsequent usable link');
  await linked.close();await endpoint.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS real frame aspect containment, responsive/locked projection, normalized pixels/replay, reference/custom/release, input, fit, 2D/walk and DPR');
} finally {
 await writeFile(join(output,'results.json'),JSON.stringify({measurements,errors},null,2)+'\n');await browser?.close();await server?.close();await rm(directory,{recursive:true,force:true});console.log('Frame evidence: '+output);
}
