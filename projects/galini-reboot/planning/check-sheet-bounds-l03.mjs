import {readdir,readFile,writeFile} from 'node:fs/promises';
import {launchBrowser} from '../../../tests/browser/support/browser.mjs';
const dir='projects/galini-reboot/planning/l03',browser=await launchBrowser(),rows=[];
try{for(const f of await readdir(dir)){if(!f.endsWith('.svg'))continue;const svg=await readFile(dir+'/'+f,'utf8'),w=Number(svg.match(/width="([0-9]+)"/)[1]),h=Number(svg.match(/height="([0-9]+)"/)[1]);const page=await browser.newPage({viewport:{width:w,height:h}});await page.setContent(svg);const bad=await page.evaluate(({w,h})=>Array.from(document.querySelectorAll('text')).filter(t=>!t.closest('g[clip-path]')).map(t=>{const b=t.getBBox();return{text:t.textContent,x:b.x,y:b.y,w:b.width,h:b.height};}).filter(b=>b.x<0||b.y<0||b.x+b.w>w||b.y+b.h>h),{w,h});rows.push({sheet:f,outsideSheetText:bad});await page.close();}}finally{await browser.close();}
await writeFile(dir+'/sheet-bounds.json',JSON.stringify({scope:'SVG text extents outside sheet, excluding intentionally clipped map insets. Does not replace visual inspection.',sheets:rows},null,2));
console.log(JSON.stringify(rows.filter(r=>r.outsideSheetText.length),null,2));
