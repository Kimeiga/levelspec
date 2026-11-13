import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {launchBrowser,waitForFrames} from '../../tests/browser/support/browser.mjs';
const output=process.argv[2];if(!output)throw new Error('Provide a new output directory');await mkdir(output,{recursive:false});
const server=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port:0,hmr:false,watch:null}});
const errors=[],captures=[];let browser;
const files=['tools/bake-shop-timber.ts','src/dressing/kowloon/shop/timber.ts','src/dressing/kowloon/shop/assets/shop-timber.json','src/dressing/kit.ts','src/dressing/kit-mesh.ts','tools/bake-clean-stock.py','projects/kowloon-liquor-props/materials/clean-stock/tin-label-source.png','tools/bake-bag-clusters.py','src/dressing/kowloon/shop/assets/bag-clusters.json','tools/bake-stock-appearances.py','src/dressing/kowloon/shop/assets/stock-appearances.json','projects/kowloon-liquor-props/materials/packaging-labels.png','src/dressing/kowloon/shop/grocer-layout.ts','src/dressing/kowloon/shop/grocer.ts','src/dressing/kowloon/shop/grocer-props.ts','src/dressing/kowloon/shop/snack-string.ts','src/dressing/kowloon/shop/assets/grocer-props.json','projects/kowloon-liquor-props/shop-preview.ts','projects/kowloon-liquor-props/store-viewer.mjs',
 'tools/refine-shop-materials.py','tools/bake-kowloon-stock.py','projects/kowloon-liquor-props/materials/worn-shop-wood.png','projects/kowloon-liquor-props/materials/worn-crate-plastic.png','src/dressing/kowloon/shop/frontage.ts','src/dressing/kowloon/shop/display-assemblies.ts','src/dressing/kowloon/ground-support.ts','src/dressing/kowloon/shop/goods.ts','src/dressing/kowloon/shop/fittings.ts','src/dressing/kowloon/shop/stock-mesh.ts','src/dressing/kowloon/shop/assets/snack-packet.json',
 ...['grocer-props.png','grocer-props-normal.png','grocer-props-properties.png','snack-packet.png','timber.png','shop-timber.png','shop-timber-normal.png','shop-timber-properties.png','metal.png','market-apple.png'].map(name=>'projects/dressing-demo/textures/'+name)];
const hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
try{
 await server.listen();browser=await launchBrowser();const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/projects/kowloon-liquor-props/store.html`);
 await page.waitForSelector('body[data-ready="true"]',{timeout:60000});
 await page.evaluate(()=>{const select=document.querySelector('#view');for(const view of ['counter','wide-store','chips','storefront']){select.value=view;select.dispatchEvent(new Event('change'));}});
 await page.waitForFunction(()=>window.storeState?.view==='storefront'&&document.body.dataset.ready==='true');
 for(const view of ['storefront','counter','chips','crates','bags','wide-store','street-displays','layout-front-left','layout-front-right','layout-side-left','layout-side-right','layout-recessed-left','layout-recessed-right']){
  await page.selectOption('#view',view);await page.waitForFunction(view=>window.storeState?.view===view&&document.body.dataset.ready==='true',view);await waitForFrames(page,3);
  const state=await page.evaluate(()=>window.storeState);await page.locator('canvas').screenshot({path:resolve(output,view+'.png')});captures.push(state);
 }
 for(const capture of captures.filter(c=>c.view.startsWith('layout-'))) {
  assert.equal(capture.layout.kind,capture.view.split('-')[1]+'-counter');
  assert.equal(capture.layout.mirrored,capture.view.endsWith('left'));
 }
 assert.deepEqual(errors,[]);for(const file of files)assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),hashes[file]);
 await writeFile(resolve(output,'capture.json'),JSON.stringify({kind:'production-grocer-prop-study',hashes,captures,errors},null,2));
}finally{await browser?.close();await server.close();}
