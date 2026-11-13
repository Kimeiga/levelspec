/** Read-only browser smoke: real form placement and keyboard movement on frozen Fusion. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';

const output=process.argv[2]??'generated/fusion/browser-b05-final';
const base=process.argv[3]??'http://127.0.0.1:48355/?nav-cell=0.125&appearance=full-render';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=await readFile(new URL('./level.aml',import.meta.url));
await mkdir(output,{recursive:true});
const browser=await launchBrowser(), errors=[], placements=[];
let movement,loadedHash;
try {
  const page=await browser.newPage({viewport:{width:1500,height:1100},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));
  const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/source'));
  await page.goto(base);
  loadedHash=hash((await(await response).json()).text);
  assert.equal(loadedHash,hash(source));
  await page.locator('#status[data-state="ready"]').waitFor({timeout:240000});
  await page.locator('#roofs').check();
  const state=()=>page.locator('#model').evaluate(el=>JSON.parse(el.dataset.walk));
  for(const [id,feet,yaw,pitch] of [
    ['torus-deck',[0,-3.2,0],90,8],
    ['lower-work-arc',[-5.471648,.309327,-3.2],-40,0],
    ['a-mezzanine',[-34,14,3.2],-30,-7],
    ['b-under-service-deck',[35,17,-3.2],-50,0],
    ['crown',[12.389251,21.693684,6.4],-145,-10],
    ['attacker-start',[-14,-35,0],90,0],
  ]) {
    if(!await page.locator('#walk-controls').evaluate(el=>el.open))await page.locator('#walk-controls > summary').click();
    await page.locator('#walk-feet').fill(feet.join(' '));
    await page.locator('#walk-yaw').fill(String(yaw));
    await page.locator('#walk-pitch').fill(String(pitch));
    await page.locator('#walk-form button').click();
    await page.waitForFunction(expected=>{
      const s=JSON.parse(document.querySelector('#model').dataset.walk);
      return s.active&&s.feet.every((n,i)=>Math.abs(n-expected[i])<.12);
    },feet);
    assert.equal(await page.locator('#walk-error').textContent(),'');
    await waitForFrames(page,3);
    const actual=await state();
    assert.equal(actual.collision,'physical');assert.equal(actual.height,1.8);assert.equal(actual.radius,.35);
    placements.push({id,requested:feet,actual});
    await page.locator('#model canvas').screenshot({path:`${output}/${id}.png`});
  }
  const before=await state();
  await page.locator('#model canvas').focus();
  await page.keyboard.down('w');
  try {
    await page.waitForFunction(y=>JSON.parse(document.querySelector('#model').dataset.walk).feet[1]>y+.3,before.feet[1],{timeout:15000});
  } finally {await page.keyboard.up('w');}
  const after=await state();
  assert.ok(Math.abs(after.feet[0]-before.feet[0])<.05);assert.equal(after.grounded,true);
  await page.keyboard.down('Control');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).stance==='crouching');
  const crouching=await state();assert.equal(crouching.height,1.1);
  await page.keyboard.up('Control');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).stance==='standing');
  movement={before,after,crouching};
  assert.equal(hash(await readFile(new URL('./level.aml',import.meta.url))),hash(source));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,placements:placements.length,displacement:after.feet[1]-before.feet[1],errors}));
}finally{
  await writeFile(`${output}/report.json`,JSON.stringify({sourceSha256:hash(source),loadedHash,physicalInspectorSha256:hash(await readFile('review/physical-walk.ts')),scope:'Real reviewer form placements, keyboard movement and crouch; sampled inspection only.',placements,movement,errors},null,2));
  await browser.close();
}
