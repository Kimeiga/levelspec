/** Real Chrome contracts for reproducible collision-constrained inspection starts. */
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,mkdir}from'node:fs/promises';
import{tmpdir}from'node:os';import{join}from'node:path';
import * as THREE from 'three';
import{ArchitectureBuilder,serializeAml}from'levelspec';
import{startPreview}from'../src/cli/preview.ts';
import{launchBrowser,waitForFrames}from'./browser/support/browser.mjs';
const directory=await mkdtemp(join(tmpdir(),'levelspec-inspection-walk-'));await mkdir('generated',{recursive:true});const output=await mkdtemp('generated/walk-inspection-browser-');const file=join(directory,'level.aml');
const scene = new ArchitectureBuilder('inspection-walk-browser');
scene.document.player.height = 1.8;
scene.document.materials.push({id:'stone',color:'#aaaaaa',repeat:1,roughness:1,metalness:0});
for (const [id,x] of [['left',-6],['right',1]]) {
  scene.profile(`${id}-plan`, [[x,-3,0],[x+5,-3,0],[x+5,3,0],[x,3,0]]);
  scene.slab(`rooms/${id}`, `${id}-plan`, {group:'rooms',material:'stone'});
}
scene.document.markers.push({id:'spawn',layer:'rooms',region:'rooms/left',position:[-3,0,0],kind:'attacker_spawn'});
const source=serializeAml(scene.document);await writeFile(file,source);
let server,browser;const errors=[];
/** Reads the published actual walk pose and rendered camera matrices. */
async function state(page){return page.locator('#model').evaluate(el=>({mode:el.dataset.mode,walk:JSON.parse(el.dataset.walk),projection:el.dataset.projectionMatrix.split(',').map(Number),view:el.dataset.viewMatrix.split(',').map(Number),player:el.dataset.player}));}
/** Verifies the visible caption describes the active camera, not the saved overview. */
async function assertViewCaption(page, mode) {
  if (mode === 'orthographic' || mode === 'perspective') {
    await page.waitForFunction(expected => document.querySelector('#model')?.dataset.projection === expected, mode);
  }
  assert.equal(await page.locator('#view-label').isVisible(), true);
  const caption = await page.locator('#view-label').textContent();
  if (mode === 'walk') {
    assert.match(caption, /FIRST PERSON.*PERSPECTIVE/i);
    assert.doesNotMatch(caption, /PLAN|ORTHOGRAPHIC/i);
  }
  else if (mode === 'plan') assert.match(caption, /PLAN.*METERS/i);
  else {
    assert.match(caption, new RegExp(mode, 'i'));
    assert.doesNotMatch(caption, /FIRST PERSON/i);
  }
}
try{
 server=await startPreview(file,{port:0});browser=await launchBrowser();const page=await browser.newPage({viewport:{width:1300,height:900}});page.on('pageerror',e=>errors.push(e.message));const badURL=new URL(server.url);badURL.searchParams.set('walk-feet','0 0 0');await page.goto(badURL.href);await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});assert.equal(await page.locator('#model').getAttribute('data-mode'),'overview');assert.match(await page.locator('#walk-error').textContent(),/surface|navigation/i);assert.equal(await page.locator('#walk-error').isVisible(),true,'Initial invalid placement feedback must be visible');await assertViewCaption(page, 'orthographic');const overview=await page.locator('#model').getAttribute('data-camera');if(!(await page.locator('#walk-controls').evaluate(el=>el.open)))await page.locator('#walk-controls > summary').click();await page.locator('#walk-feet').fill('3 0 1');await page.locator('#walk-form button').click();assert.equal(await page.locator('#model').getAttribute('data-mode'),'overview');assert.equal(await page.locator('#model').getAttribute('data-camera'),overview,'Overview rejection must preserve camera');await page.locator('#walk-feet').fill('3 0 0');await page.locator('#walk-form button').click();await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).active);await assertViewCaption(page, 'walk');assert.equal(await page.locator('#walk-error').textContent(),'');badURL.searchParams.set('walk-feet','3 NaN 0');await page.goto(badURL.href);await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});assert.equal(await page.locator('#model').getAttribute('data-mode'),'overview');assert.match(await page.locator('#walk-error').textContent(),/finite/i);const url=new URL(server.url);url.searchParams.set('walk-feet','3 0 0');url.searchParams.set('walk-yaw','90');url.searchParams.set('walk-pitch','10');await page.goto(url.href);await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});await page.waitForFunction(()=>document.querySelector('#model')?.dataset.mode==='walk');await waitForFrames(page);await assertViewCaption(page, 'walk');const initial=await state(page);assert.equal(initial.walk.yaw,90);assert.equal(initial.walk.pitch,10);assert.equal(initial.walk.collision,'physical');assert.ok(Math.abs(initial.walk.feet[0]-3)<1e-9);
 const canvas=await page.locator('#model canvas').boundingBox();const expected=new THREE.PerspectiveCamera(65,canvas.width/canvas.height,.08,10000);expected.up.set(0,0,1);expected.position.set(3,0,initial.walk.feet[2]+1.8*.93);expected.lookAt(expected.position.clone().add(new THREE.Vector3(0,Math.cos(Math.PI/18),Math.sin(Math.PI/18))));expected.updateMatrixWorld();for(let i=0;i<16;i++){assert.ok(Math.abs(expected.projectionMatrix.elements[i]-initial.projection[i])<1e-6,'FPS projection diagnostics must describe rendered camera');assert.ok(Math.abs(expected.matrixWorldInverse.elements[i]-initial.view[i])<1e-6,'FPS view must reproduce feet/orientation');}
 if(!(await page.locator('#walk-controls').evaluate(el=>el.open)))await page.locator('#walk-controls > summary').click();await page.locator('#walk-feet').fill('3 .5 0');await page.locator('#walk-yaw').fill('45');await page.locator('#walk-pitch').fill('-20');await waitForFrames(page,2);assert.equal(await page.locator('#walk-feet').inputValue(),'3 .5 0','Active walking must retain a coherent multi-field placement draft');assert.equal(await page.locator('#walk-yaw').inputValue(),'45');await page.locator('#walk-form button').click();await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('#model').dataset.walk);return s.feet[1]===.5&&s.yaw===45&&s.pitch===-20;});await page.locator('#walk-feet').fill('3 0 0');await page.locator('#walk-yaw').fill('90');await page.locator('#walk-pitch').fill('10');await page.locator('#walk-form button').click();await waitForFrames(page);await page.locator('#walk-feet').fill('0 0 0');await page.locator('#walk-form button').click();assert.match(await page.locator('#walk-error').textContent(),/surface|navigation/i);const rejected=await state(page);assert.deepEqual(rejected.walk,initial.walk,'Rejected placement preserves active pose');assert.equal(rejected.mode,'walk');await assertViewCaption(page, 'walk');await page.locator('#walk-feet').fill('3 0 0');await page.locator('#walk-form button').click();assert.equal(await page.locator('#walk-error').textContent(),'');
 const replayURL=await page.locator('#walk-link').getAttribute('href');const replay=await browser.newPage();await replay.goto(replayURL);await replay.locator('#status[data-state="ready"]').waitFor({timeout:60000});await replay.waitForFunction(()=>document.querySelector('#model')?.dataset.mode==='walk');await waitForFrames(replay);const copied=await state(replay);assert.deepEqual(copied.walk,initial.walk);await replay.close();

 // Real key and helper wiring, with observable intermediate poses rather than fixed input sleeps.
 for (const [yaw, key, axis, direction] of [[0,'d',1,-1],[0,'a',1,1],[90,'d',0,1],[90,'a',0,-1]]) {
   await page.locator('#walk-yaw').fill(String(yaw));
   await page.locator('#walk-form button').click();
   await page.locator('#model canvas').focus();
   const before = (await state(page)).walk.feet[axis];
   await page.keyboard.down(key);
   await page.waitForFunction(({axis,before,direction}) => direction * (JSON.parse(document.querySelector('#model').dataset.walk).feet[axis]-before) > .15, {axis,before,direction});
   await page.keyboard.up(key);
 }
 await page.locator('#walk-yaw').fill('90');await page.locator('#walk-form button').click();
 await page.locator('#model canvas').focus();
 const standing = (await state(page)).walk;
 await page.keyboard.down('Control');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).stance==='crouching');
 const crouching = await state(page);
 assert.equal(crouching.walk.height, 1.1);
 assert.deepEqual(crouching.walk.feet, standing.feet);
 const actualEye = new THREE.Matrix4().fromArray(crouching.view).invert();
 assert.ok(Math.abs(actualEye.elements[14] - crouching.walk.eye[2]) < 1e-6, 'Rendered crouch camera matches published eye');
 assert.ok(crouching.walk.eye[2] < standing.eye[2] - .5);
 await page.keyboard.up('Control');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).stance==='standing');
 for (const key of [' ', 'ArrowDown']) {
   const prevented = await page.locator('#model canvas').evaluate((canvas, key) => {
     const event = new KeyboardEvent('keydown', {key, repeat:true, bubbles:true, cancelable:true});
     canvas.dispatchEvent(event);
     return event.defaultPrevented;
   }, key);
   assert.equal(prevented, true, 'Held FPS keys prevent native scrolling');
 }
 await page.keyboard.down('Space');
 await page.waitForFunction(()=>!JSON.parse(document.querySelector('#model').dataset.walk).grounded);
 assert.ok((await state(page)).walk.feet[2] > standing.feet[2]);
 await page.keyboard.up('Space');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).grounded);
 assert.deepEqual((await state(page)).walk.feet, standing.feet);
 await page.evaluate(()=>{
   window.__fpsSamples=[];
   const sample=()=>{window.__fpsSamples.push(JSON.parse(document.querySelector('#model').dataset.walk));window.__fpsSampler=requestAnimationFrame(sample);};
   window.__fpsSampler=requestAnimationFrame(sample);
 });
 await page.locator('#walk-helper').selectOption('jump');
 // A landing and next launch can occur between display frames. Observe full
 // vertical cycles rather than requiring the exact grounded instant on screen.
 await page.waitForFunction(ground=>window.__fpsSamples.filter((s,i,a)=>i>0 && s.feet[2]>ground+.3 && a[i-1].feet[2]<=ground+.3).length>=2, standing.feet[2]);
 const jumpSamples = await page.evaluate(()=>window.__fpsSamples);
 assert.ok(jumpSamples.some(s=>s.feet[2]>standing.feet[2]+.5), 'Repeated jump reaches an observable apex');
 assert.ok(jumpSamples.some((s,i,a)=>i>0 && s.feet[2]<a[i-1].feet[2]-.01), 'Repeated jump includes observed descent');
 await page.locator('#walk-helper').selectOption('off');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).grounded);
 await page.evaluate(()=>cancelAnimationFrame(window.__fpsSampler));
 await page.locator('#walk-helper').selectOption('crouch');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).stance==='crouching');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('#model').dataset.walk);return s.helper==='off'&&s.stance==='standing';});
 assert.equal(await page.locator('#walk-helper').inputValue(),'off');
 const resetFeet = (await state(page)).walk.feet;
 await page.locator('#model canvas').evaluate(canvas=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'d',repeat:true,bubbles:true,cancelable:true})));
 await waitForFrames(page, 3);
 assert.deepEqual((await state(page)).walk.feet, resetFeet, 'Repeat cannot rearm held movement after focus loss');
 await page.locator('#walk-form button').click();
 const bounds=await page.locator('#model canvas').boundingBox();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2-1200);await page.mouse.up();await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).pitch===80);assert.equal(new URL(await page.locator('#walk-link').getAttribute('href')).searchParams.get('walk-pitch'),'80','Runtime look clamp must retain a replayable extreme');await page.locator('#walk-pitch').fill('10');await page.locator('#walk-form button').click();await waitForFrames(page);
 await page.locator('#model canvas').focus();await page.keyboard.down('w');await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).feet[1]>2.4,{},{timeout:10000});await waitForFrames(page,40);await page.keyboard.up('w');const moved=await state(page);assert.ok(moved.walk.feet[1]<3,'Existing nav collision keeps walker within floor');assert.ok(Math.abs(moved.walk.feet[0]-3)<.02,'Yaw90 walks along +Y');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#model')?.dataset.mode==='overview');await assertViewCaption(page, 'orthographic');await page.locator('#walk').click();await page.waitForFunction(()=>document.querySelector('#model')?.dataset.mode==='walk');await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).feet[0]<-1);assert.ok((await state(page)).walk.feet[0]<-1,'Default walk still uses authored spawn');await assertViewCaption(page, 'walk');
 await page.locator('#view-2d').click();assert.equal((await state(page)).walk.active,false,'Hidden viewport must publish inactive state without rendering');assert.equal(await page.locator('#model').getAttribute('data-mode'),'overview');await assertViewCaption(page, 'plan');await page.locator('#view-3d').click();await assertViewCaption(page, 'orthographic');
 await page.locator('#projection').selectOption('perspective');await assertViewCaption(page, 'perspective');
 await page.locator('#walk').click();await page.waitForFunction(()=>document.querySelector('#model')?.dataset.mode==='walk');await assertViewCaption(page, 'walk');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#model')?.dataset.mode==='overview');await assertViewCaption(page, 'perspective');
 await page.locator('#projection').selectOption('orthographic');await assertViewCaption(page, 'orthographic');await page.locator('#walk').click();await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).active);await page.locator('#model canvas').evaluate(canvas=>{window.__inspectionContextLoss=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');window.__inspectionContextLoss.loseContext();});await page.locator('#fallback').waitFor({state:'visible'});assert.equal((await state(page)).walk.active,false,'Context loss must publish inactive state');await page.evaluate(()=>window.__inspectionContextLoss.restoreContext());await page.waitForFunction(()=>!document.querySelector('#view-3d').disabled);await page.locator('#view-3d').click();await page.locator('#walk').click();await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).active);
 assert.equal(await (await import('node:fs/promises')).readFile(file,'utf8'),source,'Inspection never rewrites XML');await writeFile(file,'<broken>');await page.waitForFunction(()=>document.querySelector('#model').dataset.stale==='true'&&document.querySelector('#walk-start').disabled);await page.locator('#walk-form').evaluate(form=>form.requestSubmit());assert.match(await page.locator('#walk-error').textContent(),/Wait for a current layout/);assert.equal(await page.locator('#model').getAttribute('data-mode'),'overview');await writeFile(file, source);await page.locator('#status[data-state="ready"]').waitFor({timeout:60000});await page.locator('#walk-form button').click();await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).active);assert.equal(await page.locator('#walk-error').textContent(),'','Valid reload restores successful placement');await page.locator('#model canvas').screenshot({path:join(output,'authored-spawn.png')});assert.deepEqual(errors,[]);console.log('PASS inspection URL/form replay, invalid-placement recovery, orientation/matrices, constrained movement and authored spawn');
}finally{await writeFile(join(output,'results.json'),JSON.stringify({errors},null,2)+'\n');await browser?.close();await server?.close();await rm(directory,{recursive:true,force:true});console.log('Inspection walk evidence: '+output);}
