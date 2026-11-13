import {readdir,readFile} from 'node:fs/promises';
import {launchBrowser} from '../../../tests/browser/support/browser.mjs';
const dir='projects/galini-reboot/planning/l02';
const browser=await launchBrowser();
try{for(const file of await readdir(dir)){if(!file.endsWith('.svg'))continue;const svg=await readFile(dir+'/'+file,'utf8');const width=Number(svg.match(/width="([0-9]+)"/)[1]),height=Number(svg.match(/height="([0-9]+)"/)[1]);const page=await browser.newPage({viewport:{width,height}});await page.setContent(svg);await page.screenshot({path:dir+'/'+file.replace('.svg','.png')});await page.close();}}finally{await browser.close();}
console.log('Rendered L02 sheets.');
