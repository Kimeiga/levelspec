/** Capture fixed real-time views of an already exported study, without recompiling it. */
import {createServer} from 'vite';
import {launchBrowser} from '../../tests/browser/support/browser.mjs';
const name=process.argv[2]??'after';
const server=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port:0}});await server.listen();
let browser;
try{browser=await launchBrowser();const page=await browser.newPage({viewport:{width:1400,height:1100},deviceScaleFactor:1});page.on('pageerror',e=>console.error(e.message));await page.goto(server.resolvedUrls.local[0]+`generated/building-polish/${name}/index.html`);await page.waitForFunction(()=>window.ready);for(const view of ['overview','roof','base','balcony','ac','posters']){await page.evaluate(name=>window.setView(name),view);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:`generated/building-polish/${name}/${view}.png`});}console.log('captured '+name);}finally{await browser?.close();await server.close()}
