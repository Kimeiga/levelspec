/** Calibrated shared-reviewer pixels for neutral authored-color inspection. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import * as THREE from 'three';
import { startPreview } from '../src/cli/preview.ts';
import { launchBrowser, waitForFrames } from '../website/tests/browser-helpers.mjs';

await mkdir('generated', { recursive: true });
const output = await mkdtemp(join('generated/', 'inspection-browser-'));
const directory = await mkdtemp(join(tmpdir(), 'levelspec-inspection-'));
const file = join(directory, 'level.level.svgx');
const measurements = {}, errors = [];
const texture = new PNG({ width: 32, height: 32 });
const red = [220,80,70], blue = [70,130,220], tint = 191;
for (let y=0;y<32;y++) for(let x=0;x<32;x++) {
  const color=x<16?red:blue;
  for(let c=0;c<3;c++)texture.data[(y*32+x)*4+c]=color[c];
  texture.data[(y*32+x)*4+3]=255;
}
await writeFile(join(directory,'stripes.png'),PNG.sync.write(texture));
const source=`<level version="2" id="inspection-calibration" name="Inspection calibration" validation="premap">
 <material id="gray" color="#708090"/><material id="pattern" color="#bfbfbf" texture="stripes.png" repeat="1"/>
 <material id="glass" color="#80c0e0"/><material id="red" color="#c83c28"/>
 <layer id="ground">
  <vertex id="a" x="-6" y="-6" z="0"/><vertex id="b" x="6" y="-6" z="0"/>
  <vertex id="c" x="6" y="6" z="0"/><vertex id="d" x="-6" y="6" z="0"/>
  <edge id="ab" from="a" to="b" kind="open"/><edge id="bc" from="b" to="c" kind="open"/>
  <edge id="cd" from="c" to="d" kind="open"/><edge id="da" from="d" to="a" kind="open"/>
  <region id="floor" boundary="ab bc cd da" fill="floor" material="gray"/>
  <vertex id="w" x="-1" y="0" z="0"/><vertex id="e" x="1" y="0" z="0"/>
  <edge id="shadow-wall" from="w" to="e" kind="wall" height="3" thickness=".4" material="gray"/>
  <vertex id="g1" x="2" y="-2" z="0"/><vertex id="g2" x="4" y="-2" z="0"/>
  <edge id="window" from="g1" to="g2" kind="glass" height="2" thickness=".04" material="glass"/>
  <vertex id="r1" x="1" y="-3" z="0"/><vertex id="r2" x="4" y="-3" z="0"/>
  <edge id="behind-glass" from="r1" to="r2" kind="wall" height="2" thickness=".1" material="red"/>
 </layer>
 <layer id="texture-patch">
  <vertex id="p1" x="-5" y="-4" z=".05"/><vertex id="p2" x="-2" y="-4" z=".05"/>
  <vertex id="p3" x="-2" y="-1" z=".05"/><vertex id="p4" x="-5" y="-1" z=".05"/>
  <edge id="p12" from="p1" to="p2" kind="open"/><edge id="p23" from="p2" to="p3" kind="open"/>
  <edge id="p34" from="p3" to="p4" kind="open"/><edge id="p41" from="p4" to="p1" kind="open"/>
  <region id="textured-floor" boundary="p12 p23 p34 p41" fill="floor" material="pattern" thickness=".02"/>
 </layer>
</level>`;
await writeFile(file,source);
let server,browser;

/** Projects independently known world coordinates using the actual rendered camera diagnostics. */
async function projection(page) {
 const state=await page.locator('#model').evaluate(host=>({width:host.clientWidth,height:host.clientHeight,view:host.dataset.viewMatrix.split(',').map(Number),projection:host.dataset.projectionMatrix.split(',').map(Number)}));
 const matrix=new THREE.Matrix4().fromArray(state.projection).multiply(new THREE.Matrix4().fromArray(state.view));
 return point=>{const p=new THREE.Vector3(...point).applyMatrix4(matrix);return[(p.x+1)*state.width/2,(1-p.y)*state.height/2];};
}

/** Samples a small interior patch, away from boundaries, aliasing and texture transitions. */
function patch(image, point, radius=2) {
 const [x,y]=point.map(Math.round),rgb=[0,0,0];let count=0;
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++) {
  assert.ok(x+dx>=0&&x+dx<image.width&&y+dy>=0&&y+dy<image.height,'Calibration sample outside image');
  const i=((y+dy)*image.width+x+dx)*4;for(let c=0;c<3;c++)rgb[c]+=image.data[i+c];count++;
 }
 return rgb.map(value=>value/count);
}

/** Channel distance in output sRGB is bounded by a few integer levels for uniform authored patches. */
function closeColor(actual,expected,tolerance,message) {
 assert.ok(actual.every((value,index)=>Math.abs(value-expected[index])<=tolerance),`${message}: ${actual} versus ${expected}`);
}

/** Computes texture×tint in linear sRGB, independently of the renderer's material builder. */
function tinted(color) {
 const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
 const srgb=v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
 return color.map(value=>255*srgb(linear(value/255)*linear(tint/255)));
}

/** Detects structural ink near its projected geometric segment without requiring exact raster alignment. */
function ink(image,point,radius=3) {
 let count=0;const[x,y]=point.map(Math.round);
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++) {
  const i=((y+dy)*image.width+x+dx)*4;
  if(Math.max(image.data[i],image.data[i+1],image.data[i+2])<95)count++;
 }
 return count;
}

/** Renders a selected appearance with a frozen camera, retaining images for failures and review. */
async function capture(page,appearance,name) {
 await page.locator('#appearance').selectOption(appearance);
 await page.waitForFunction(appearance=>JSON.parse(document.querySelector('#model').dataset.view).appearance===appearance,appearance);
 await waitForFrames(page);
 return PNG.sync.read(await page.locator('#model canvas').screenshot({path:join(output,name+'.png'),scale:'css'}));
}

try {
 server=await startPreview(file,{port:0,view:{projection:'orthographic',position:[9,12,10],target:[0,0,1],viewHeight:12,appearance:'materials'}});
 browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1400,height:1050},deviceScaleFactor:1});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if((message.type()==='error'&&!/favicon\.ico/.test(message.location().url))||/INVALID_OPERATION|GL_INVALID/.test(message.text()))errors.push(message.text());});
 // Texture companions arrive inside the verified source response, then decode through a browser blob URL.
 const sourceResponse=page.waitForResponse(response=>/\/__levelspec\/[^/]+\/source$/.test(new URL(response.url()).pathname));
 await page.goto(server.url);assert.ok((await sourceResponse).ok());
 await page.waitForFunction(()=>['ready','error'].includes(document.querySelector('#status')?.dataset.state),null,{timeout:60000});
 assert.equal(await page.locator('#status').getAttribute('data-state'),'ready',await page.locator('#status').textContent()+' '+await page.locator('#diagnostics').textContent());
 const project=await projection(page);
 const sample=image=>({lit:patch(image,project([3,2,0])),shadow:patch(image,project([-.7,1.3,0])),wall:patch(image,project([0,.2,2])),red:patch(image,project([-4.75,-2.6,.05])),blue:patch(image,project([-4.25,-2.6,.05])),repeat:patch(image,project([-3.75,-2.6,.05])),glass:patch(image,project([3,-1.98,1]))});
 const originalMatrix=await page.locator('#model').getAttribute('data-view-matrix');
 const materials=await capture(page,'materials','materials-control');measurements.materials=sample(materials);
 assert.ok(measurements.materials.lit.reduce((s,v)=>s+v,0)-measurements.materials.shadow.reduce((s,v)=>s+v,0)>45,'Materials positive control must expose a real lit/shadow difference');
 let inspection;
 // Wait on genuinely delivered texture pixels, rather than assuming compile-ready means decode-ready.
 for(let frame=0;frame<30;frame++) {
  inspection=await capture(page,'inspection','inspection');
  if(patch(inspection,project([-4.75,-2.6,.05]))[0]>patch(inspection,project([-4.75,-2.6,.05]))[2]+40)break;
  await waitForFrames(page);
 }
 measurements.inspection=sample(inspection);
 for(const field of['lit','shadow','wall'])closeColor(measurements.inspection[field],[112,128,144],4,'Unlit authored color '+field);
 closeColor(measurements.inspection.red,tinted(red),7,'Tinted red texture');
 closeColor(measurements.inspection.blue,tinted(blue),7,'Tinted blue texture');
 closeColor(measurements.inspection.repeat,tinted(red),7,'Texture repeat placement');
 const corner=project([0,.2,3]);assert.ok(ink(inspection,corner)>2,'Known wall top must retain structural ink');
 assert.equal(ink(inspection,project([3,2,0])),0,'Flat neutral interior must remain clean');
 // Two .48-opacity glass faces over the red wall yield this linear-light composite.
 // Both the bare red wall and opaque blue glass differ substantially from it.
 closeColor(measurements.inspection.glass,[152,169,196],7,'Glass composite retains front tint and rear color');
 await page.locator('#cut').fill('0.45');await waitForFrames(page);
 const section=PNG.sync.read(await page.locator('#model canvas').screenshot({path:join(output,'section.png'),scale:'css'}));
 assert.equal(ink(section,corner),0,'Clipped upper surface must not leave ghost structural ink');
 closeColor(patch(section,project([3,2,0])),[112,128,144],4,'Section retains lower floor');
 await page.locator('#cut').fill('0');await waitForFrames(page);
 const clipped=PNG.sync.read(await page.locator('#model canvas').screenshot({path:join(output,'fully-clipped.png'),scale:'css'}));
 closeColor(patch(clipped,corner),[247,247,247],3,'Fully clipped surface and outline disappear');
 await page.locator('#cut').fill('1');
 const restoredMaterials=sample(await capture(page,'materials','materials-restored'));
 assert.ok(restoredMaterials.lit.reduce((s,v)=>s+v,0)-restoredMaterials.shadow.reduce((s,v)=>s+v,0)>45,'Materials shadowing must restore');
 const illustrated=sample(await capture(page,'illustrated','illustrated'));assert.ok(Math.max(...illustrated.lit)-Math.min(...illustrated.lit)<3,'Illustrated restores grayscale');
 const restored=sample(await capture(page,'inspection','inspection-restored'));for(const field of['lit','shadow','wall','red','blue','repeat'])closeColor(restored[field],measurements.inspection[field],3,'Inspection roundtrip '+field);
 assert.equal(await page.locator('#model').getAttribute('data-view-matrix'),originalMatrix,'Appearance must not change camera/framing');
 assert.deepEqual(errors,[]);
 console.log('PASS calibrated neutral inspection shadows/normals, authored texture/tint/repeat, structural ink/section, transparency and appearance roundtrip');
} finally {
 await mkdir(output,{recursive:true});await writeFile(join(output,'results.json'),JSON.stringify({measurements,errors},null,2)+'\n');
 await browser?.close();await server?.close();await rm(directory,{recursive:true,force:true});console.log('Inspection evidence: '+output);
}
