/** Render the two authored comparison SVGs; run from repository root. */
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {launchBrowser,waitForFrames} from '../../../tests/browser/support/browser.mjs';
const directory=dirname(fileURLToPath(import.meta.url));
const browser=await launchBrowser();
try {
  const page=await browser.newPage({viewport:{width:1800,height:1500},deviceScaleFactor:1});
  for(const variant of ['a','b']){
    const stem=join(directory,`complexity-organic-${variant}`);
    await page.setContent('<!doctype html><html><body style="margin:0">'+await readFile(stem+'.svg','utf8')+'</body></html>');
    await waitForFrames(page,2);
    await page.screenshot({path:stem+'.png',fullPage:true});
    console.log(stem+'.png');
  }
} finally {await browser.close();}
