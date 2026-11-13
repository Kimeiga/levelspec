/** Real-browser acceptance for Wireframe, Materials, and the Ninefold full-render lighting. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import * as THREE from 'three';
import { startPreview } from '../src/cli/preview.ts';
import { launchBrowser, waitForFrames } from './browser/support/browser.mjs';

await mkdir('generated', { recursive: true });
const output = await mkdtemp(join('generated/', 'appearance-browser-'));
const directory = await mkdtemp(join(tmpdir(), 'levelspec-appearance-'));
const file = join(directory, 'level.aml');
const measurements = {}, errors = [];
const texture = new PNG({ width: 32, height: 32 });
const red = [220,80,70], blue = [70,130,220], tint = 191;
for (let y=0;y<32;y++) for(let x=0;x<32;x++) {
  const color=x<16?red:blue;
  for(let c=0;c<3;c++)texture.data[(y*32+x)*4+c]=color[c];
  texture.data[(y*32+x)*4+3]=255;
}
await writeFile(join(directory,'stripes.png'),PNG.sync.write(texture));
const source = `<?xml version="1.0" encoding="UTF-8"?>
<architecture version="1" id="appearance-calibration" name="Appearance calibration" units="meters" validation="premap" curve-tolerance="0.01">
  <path id="ab:path" closed="false" points="-6 -6 0; 6 -6 0"/>
  <path id="bc:path" closed="false" points="6 -6 0; 6 6 0"/>
  <path id="cd:path" closed="false" points="6 6 0; -6 6 0"/>
  <path id="da:path" closed="false" points="-6 6 0; -6 -6 0"/>
  <path id="shadow-wall:path" closed="false" points="-1 0 0; 1 0 0"/>
  <path id="window:path" closed="false" points="2 -2 0; 4 -2 0"/>
  <path id="behind-glass:path" closed="false" points="1 -3 0; 4 -3 0"/>
  <path id="p12:path" closed="false" points="-5 -4 0.05; -2 -4 0.05"/>
  <path id="p23:path" closed="false" points="-2 -4 0.05; -2 -1 0.05"/>
  <path id="p34:path" closed="false" points="-2 -1 0.05; -5 -1 0.05"/>
  <path id="p41:path" closed="false" points="-5 -1 0.05; -5 -4 0.05"/>
  <profile id="floor:profile" paths="ab:path bc:path cd:path da:path"/>
  <profile id="textured-floor:profile" paths="p12:path p23:path p34:path p41:path"/>
  <material id="gray" color="#708090" repeat="1" roughness="0.8" metalness="0"/>
  <material id="pattern" color="#bfbfbf" repeat="1" roughness="0.8" metalness="0" texture="stripes.png"/>
  <material id="glass" color="#80c0e0" repeat="1" roughness="0.8" metalness="0"/>
  <material id="red" color="#c83c28" repeat="1" roughness="0.8" metalness="0"/>
  <group id="ground">
    <slab id="floor" group="ground" material="gray" profile="floor:profile" thickness="0.2" elevation="0"/>
    <wall id="window" group="ground" path="window:path" thickness="0.04" height="2" material="glass" alignment="center" join="miter" dynamic="true" span-floors="false"/>
  </group>
  <group id="texture-patch">
    <slab id="textured-floor" group="texture-patch" material="pattern" profile="textured-floor:profile" thickness="0.02" elevation="0"/>
  </group>
  <assembly id="migration:static-walls" coincident-material="retained-face">
    <wall id="shadow-wall" group="ground" path="shadow-wall:path" thickness="0.4" height="3" material="gray" alignment="center" join="miter" dynamic="false" span-floors="false"/>
    <wall id="behind-glass" group="ground" path="behind-glass:path" thickness="0.1" height="2" material="red" alignment="center" join="miter" dynamic="false" span-floors="false"/>
  </assembly>
  <player radius="0.25" height="2" step="0.45" slope="42" crouch="1.1" vault="0" rappel="false" ladder="false"/>
  <sky color="#dce8f5" intensity="0.5"/>
</architecture>
`;
await writeFile(file, source);
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
 const page=await browser.newPage({viewport:{width:1400,height:1050},deviceScaleFactor:2});
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
 const choices=await page.locator('#appearance option').evaluateAll(options=>options.map(option=>[option.value,option.textContent]));
 assert.deepEqual(choices,[['wireframe','Wireframe'],['materials','Materials'],['full-render','Full render']]);
 let materials;
 // Compile readiness precedes image decoding; wait for actual red texture pixels.
 for(let frame=0;frame<30;frame++) {
  materials=await capture(page,'materials','materials');
  if(patch(materials,project([-4.75,-2.6,.05]))[0]>patch(materials,project([-4.75,-2.6,.05]))[2]+40)break;
  await waitForFrames(page);
 }
 measurements.materials=sample(materials);
 closeColor(measurements.materials.lit,[112,128,144],5,'Materials retains top-face authored color');
 closeColor(measurements.materials.shadow,measurements.materials.lit,3,'Materials has no cast shadow');
 closeColor(patch(materials,project([0,.35,0])),measurements.materials.lit,3,'Materials has no contact AO');
 closeColor(measurements.materials.red,tinted(red),7,'Tinted red texture');
 closeColor(measurements.materials.blue,tinted(blue),7,'Tinted blue texture');
 closeColor(measurements.materials.repeat,tinted(red),7,'Texture repeat placement');
 assert.ok(measurements.materials.glass[2]>measurements.materials.glass[0]+15,'Glass keeps blue tint over the red wall');
 const full=await capture(page,'full-render','full-render');
 measurements.full=sample(full);
 const skySamples=[[8,8],[full.width-8,8],[full.width-8,full.height-8],[8,full.height-8]].map(point=>patch(full,point));
 for(const sky of skySamples)assert.ok(Math.min(...sky)>100,'Full render sky covers every orthographic viewport corner');
 for(const sky of skySamples)closeColor(sky,skySamples[0],3,'Parallel orthographic rays show the same sky direction');
 const fullLit=patch(full,project([3,2,0]));
 const fullShadow=patch(full,project([1.5,.4,0]));
 assert.ok(fullLit.reduce((sum,v)=>sum+v,0)-fullShadow.reduce((sum,v)=>sum+v,0)>45,'Full render casts a real occluder shadow');
 assert.ok(fullLit[0]/fullLit[2]-fullShadow[0]/fullShadow[2]>.06,'Direct warm sun separates from cool shadow fill');
 const wire=await capture(page,'wireframe','wireframe');
 let linePixels=0,backgroundPixels=0;
 for(let i=0;i<wire.data.length;i+=4) {
  if(Math.max(wire.data[i],wire.data[i+1],wire.data[i+2])<160)linePixels++;
  if(Math.min(wire.data[i],wire.data[i+1],wire.data[i+2])>240)backgroundPixels++;
 }
 assert.ok(linePixels>500,'Wireframe draws visible mesh lines');
 assert.ok(backgroundPixels/(wire.width*wire.height)>.85,'Wireframe leaves triangle interiors unfilled');
 for(const appearance of ['wireframe','materials','full-render']) {
  await capture(page,appearance,appearance+'-before-cut');
  await page.locator('#cut').fill('0.45');await waitForFrames(page);
  await page.locator('#model canvas').screenshot({path:join(output,appearance+'-section.png'),scale:'css'});
  await page.locator('#cut').fill('0');await waitForFrames(page);
  const clipped=PNG.sync.read(await page.locator('#model canvas').screenshot({path:join(output,appearance+'-clipped.png'),scale:'css'}));
  const first=patch(clipped,project([0,.2,3])),second=patch(clipped,project([3,2,0]));
  if(appearance!=='full-render') {
   closeColor(first,[247,247,247],3,'Section removes every surface/line');
   closeColor(second,first,3,'Fully clipped viewport has no stale geometry');
  } else {
   const previous=patch(full,project([0,.2,3]));
   assert.ok(first.some((value,channel)=>Math.abs(value-previous[channel])>15),'Full-render section removes the visible wall');
   const centre=project([0,.2,3]);
   const left=patch(clipped,[centre[0]-5,centre[1]]),right=patch(clipped,[centre[0]+5,centre[1]]);
   closeColor(left,right,12,'Fully clipped sky has no ghost wall edge or AO silhouette');
  }
  await page.locator('#cut').fill('1');
 }
 const restored=sample(await capture(page,'materials','materials-restored'));
 for(const field of ['lit','shadow','wall','red','blue','repeat','glass'])closeColor(restored[field],measurements.materials[field],3,'Materials roundtrip '+field);
 assert.equal(await page.locator('#model').getAttribute('data-view-matrix'),originalMatrix,'Appearance keeps camera/framing');
 await page.locator('#appearance').selectOption('full-render');
 await page.locator('#projection').selectOption('perspective');await waitForFrames(page);
 await page.setViewportSize({width:960,height:720});await waitForFrames(page);
 assert.equal(await page.locator('#model').getAttribute('data-projection'),'perspective');
 await page.locator('#model canvas').screenshot({path:join(output,'perspective-resized.png'),scale:'css'});
 assert.deepEqual(errors,[]);
 console.log('PASS three appearances, authored texture/tint/repeat/transparency, no-shadow materials, full-render shadows, wireframe, sections, projection/resize and camera roundtrip');

} finally {
 await mkdir(output,{recursive:true});await writeFile(join(output,'results.json'),JSON.stringify({measurements,errors},null,2)+'\n');
 await browser?.close();await server?.close();await rm(directory,{recursive:true,force:true});console.log('Appearance evidence: '+output);
}
