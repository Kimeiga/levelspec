/** Capture the live GLB gallery without regenerating meshes or textures. */
import {createServer} from 'vite';
import {launchBrowser} from '../../tests/browser/support/browser.mjs';
const server=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port:0}});await server.listen();
const browser=await launchBrowser();
try{const page=await browser.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:1});page.on('pageerror',e=>console.error(e.message));await page.goto(server.resolvedUrls.local[0]+'generated/tarp-study/index.html');await page.waitForFunction(()=>window.ready);const names=await page.locator('nav button').allTextContents();for(const name of names){await page.evaluate(name=>window.setView(name),name);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:`generated/tarp-study/${name}.png`});}console.log('Captured '+names.join(', '));}finally{await browser.close();await server.close();}
