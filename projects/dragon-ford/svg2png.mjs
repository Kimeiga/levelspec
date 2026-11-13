/** Rasterize SVG drawings for visual inspection: node projects/dragon-ford/svg2png.mjs in.svg out.png [width] */
import {readFile} from 'node:fs/promises';
import {launchBrowser} from '../../tests/browser/support/browser.mjs';
const args=process.argv.slice(2);const width=Number(args.length%2?args.pop():1600);
const browser=await launchBrowser();
try{
 for(let i=0;i<args.length;i+=2){
  const svg=await readFile(args[i],'utf8');const page=await browser.newPage({viewport:{width,height:1200}});
  await page.setContent(`<body style="margin:0;background:#fff">${svg.replace(/<\?xml[^>]*>/,'')}</body>`);
  await page.locator('svg').first().evaluate((e,w)=>{const b=e.viewBox.baseVal;e.setAttribute('width',w);e.setAttribute('height',b&&b.width?w*b.height/b.width:w);},width);
  await page.locator('svg').first().screenshot({path:args[i+1]});await page.close();
 }
}finally{await browser.close();}
