/** Real reviewer overlays, collision-aware walks, and same-path PNG watcher recovery. */
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,readFile,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { startPreview } from '../src/cli/preview.ts';
import { launchBrowser,waitForFrames } from './browser/support/browser.mjs';
const output='generated/aml-phase4/browser';await mkdir(output,{recursive:true});
const directory=await mkdtemp(join(tmpdir(),'aml-terrain-'));let server,browser;
const errors=[],traces=[];
try {
  await mkdir(join(directory,'terrain-course'));
  await writeFile(join(directory,'course.aml'),await readFile('tests/fixtures/aml/terrain-course.aml'));
  const png=await readFile('tests/fixtures/aml/terrain-course/hill.png');await writeFile(join(directory,'terrain-course/hill.png'),png);
  server=await startPreview(join(directory,'course.aml'),{port:0});browser=await launchBrowser();
  const page=await browser.newPage({viewport:{width:1440,height:1100}});page.on('pageerror',error=>errors.push(error.message));
  const ready=()=>page.waitForFunction(()=>document.querySelector('#status')?.dataset.state==='ready',null,{timeout:60000});
  await page.goto(server.url);await ready();await page.locator('#appearance').selectOption('materials');
  assert.equal(await page.locator('[data-terrain-overlay]').count(),0);
  await page.locator('#view-2d').click();await page.locator('#issues').check();
  assert.ok(await page.locator('[data-terrain-overlay]').count()>10);
  const select=async id=>{await page.locator(`#plan [data-terrain-overlay][data-object="${id}"]`).first().focus();await page.keyboard.press('Enter');};
  await select('objective-area');assert.match(await page.locator('#architecture-inspection').textContent(),/Role: objective/);assert.match(await page.locator('#architecture-inspection').textContent(),/label: Road checkpoint/);
  await select('tunnel-space');assert.match(await page.locator('#architecture-inspection').textContent(),/Spatial declaration: room/);
  await select('main-road');assert.ok(await page.locator('#architecture-inspection svg').count()>1);
  await page.screenshot({path:`${output}/overlays.png`});
  await page.locator('#issues').uncheck();assert.equal(await page.locator('[data-terrain-overlay]').count(),0);
  await page.locator('#view-3d').click();
  const feet=()=>page.locator('#model').evaluate(element=>JSON.parse(element.dataset.walk).feet);
  for(const route of [{id:'graded-walk',start:[2,6,.1],end:10,z:.9},{id:'tunnel-walk',start:[17,4,0],end:23,z:0}]){
    await page.keyboard.press('Escape');
    if(!(await page.locator('#walk-controls').evaluate(element=>element.open)))await page.locator('#walk-controls > summary').click();
    await page.locator('#walk-feet').fill(route.start.join(' '));await page.locator('#walk-yaw').fill('0');await page.locator('#walk-pitch').fill('0');await page.locator('#walk-form button').click();
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#model').dataset.walk).active);
    const trace=[await feet()];await page.keyboard.down('w');
    try{await page.waitForFunction(end=>JSON.parse(document.querySelector('#model').dataset.walk).feet[0]>=end,route.end,{timeout:10000});}catch(error){console.error('Walk stalled',route.id,await feet(),await page.locator('#walk-error').textContent());throw error;}finally{await page.keyboard.up('w');}
    trace.push(await feet());assert.ok(Math.abs(trace.at(-1)[2]-route.z)<.12,route.id);
    await page.screenshot({path:`${output}/${route.id}.png`});traces.push({route:route.id,trace});
  }
  await page.keyboard.press('Escape');await page.locator('#view-2d').click();await page.locator('#issues').check();await select('heightmap-hill');
  assert.match(await page.locator('#architecture-inspection').textContent(),/36, 24, 4/);
  const changed=PNG.sync.read(png);for(let i=0;i<changed.data.length;i+=4)changed.data[i]=changed.data[i+1]=changed.data[i+2]=128;
  await writeFile(join(directory,'terrain-course/hill.png'),PNG.sync.write(changed,{colorType:0}));
  await page.waitForFunction(()=>document.querySelector('#status')?.dataset.state==='ready'&&document.querySelector('#architecture-inspection')?.textContent.includes('2.007843137254902'),null,{timeout:60000});
  await writeFile(join(directory,'terrain-course/hill.png'),Buffer.from('invalid PNG'));
  await page.waitForFunction(()=>document.querySelector('#status')?.dataset.state==='error',null,{timeout:60000});
  assert.match(await page.locator('#status').textContent(),/heightmap-hill.*PNG/i);
  await writeFile(join(directory,'terrain-course/hill.png'),png);
  await page.waitForFunction(()=>document.querySelector('#status')?.dataset.state==='ready'&&document.querySelector('#architecture-inspection')?.textContent.includes('36, 24, 4'),null,{timeout:60000});
  await waitForFrames(page,3);await page.screenshot({path:`${output}/recovered.png`});assert.deepEqual(errors,[]);
  console.log('PASS terrain overlays, two physical WASD walks, PNG edit/error/recovery');
}finally{await writeFile(`${output}/evidence.json`,JSON.stringify({errors,traces},null,2));await browser?.close();await server?.close();await rm(directory,{recursive:true,force:true});}
