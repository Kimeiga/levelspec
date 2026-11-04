import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import {parseLevelSvgx} from '../../src/vector/format.ts';
import {parseRasterTrace,produceTrace} from '../../src/tracing/native.ts';
import {python} from '../../tools/producers/io.ts';

const hook=`import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){const r=next(s,c);
  if(['/core/compiler.ts','/authoring/plan.ts','/authoring/producers.ts','/authoring/legacy-convert.ts','/authoring/legacy-geometry.ts','/authoring/legacy-crossings.ts'].some(p=>r.url.endsWith(p)))
    throw new Error('Legacy tracing implementation loaded: '+r.url);
  return r;}});`;

function roomImage(path:string) {
  const png=new PNG({width:32,height:32});
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const value=x>=4&&x<28&&y>=4&&y<28?100:255;png.data.set([value,value,value,255],(y*32+x)*4);
  }
  writeFileSync(path,PNG.sync.write(png));
}

function evidenceImage(path:string,background:string) {
  const png=new PNG({width:128,height:96});
  const inRange=(n:number,min:number,max:number)=>n>=min&&n<max;
  const courtyard=(x:number,y:number)=>inRange(x,6,10)&&inRange(y,5,7);
  const bite=(x:number,y:number)=>x<4&&y>=8;
  const inFloor=(x:number,y:number)=>inRange(x,2,14)&&inRange(y,2,10)&&!courtyard(x,y)&&!bite(x,y);
  const pixel=(cx:number,cy:number)=>{
    const floor=inFloor(cx,cy);
    const rgb=floor?(cx<8?[80,100,120]:[160,180,200]):Array(3).fill(background==='white'?255:0);
    return [...rgb,!floor&&background==='transparent'?0:255];
  };
  for(let y=0;y<96;y++)for(let x=0;x<128;x++)
    png.data.set(pixel(Math.floor(x/8),Math.floor(y/8)),(y*128+x)*4);
  writeFileSync(path,PNG.sync.write(png));
}

test('default radar tracing constructs native v2 without loading a legacy plan implementation',{timeout:120000},t=>{
  const dir=mkdtempSync(join(tmpdir(),'native-trace-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const image=join(dir,'room.png'),out=join(dir,'room.level.svgx');roomImage(image);
  const r=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(hook),
    fileURLToPath(new URL('../../tools/trace.ts',import.meta.url)),image,'--cells=12','--bands=1','--grid=1',`--out=${out}`],
    {encoding:'utf8',timeout:110000});
  assert.equal(r.status,0,r.stderr);
  const d=parseLevelSvgx(readFileSync(out,'utf8'));
  assert.equal(d.version,'2');assert.equal(d.player.radius,0.35);assert.equal(d.player.height,1.8);
  assert.equal(d.links.length,0,'adjacent traced floors must connect through real shared boundaries');
});

test('native raster evidence matches the legacy draft footprint for opaque and transparent radars',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'trace-evidence-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const script=fileURLToPath(new URL('../../tools/trace_radar.py',import.meta.url));
  const letters='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  for(const background of ['white','black','transparent']){
    const image=join(dir,`${background}.png`);evidenceImage(image,background);
    for(const noCrop of [true,false]){
      const args=[image,'--cells','16','--bands','2','--grid','1','--smooth','0','--min-band','0',...(noCrop?['--no-crop']:[])];
      const trace=parseRasterTrace(python(script,[...args,'--format','raster']));
      const legacy=python(script,args),lines=legacy.trim().split(/\r?\n/),start=lines.indexOf('plan')+1;
      const rows=lines.slice(start,lines.indexOf('end',start));
      assert.deepEqual(trace.rows.map(row=>row.map(b=>b===null?'.':letters[b]).join('')),rows,`${background}/${noCrop}`);
      assert.equal((await produceTrace(trace)).report.passed,true,`${background}/${noCrop}`);
      if(noCrop){
        assert.equal(trace.rows.length,12);assert.equal(trace.rows[0].length,16);
        assert.equal(trace.rows[5][7],null,'the courtyard remains void');
        assert.equal(trace.rows[8][2],null,'the concave corner remains void');
      }
    }
  }
});

test('the public native tracing API needs no legacy modules or Python interpreter',{timeout:120000},()=>{
  const code=`import assert from 'node:assert/strict';
    const {produceTrace}=await import('levelspec/trace');
    const r=await produceTrace({format:'levelspec-raster/1',id:'public_trace',name:'Public trace',sourceImage:'test.png',grid:1,
      colors:[[80,90,100]],rows:Array.from({length:8},()=>Array(12).fill(0))});
    assert.equal(r.report.passed,true);assert.equal(r.legacy,undefined);`;
  const r=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(hook),'--input-type=module','--eval',code],
    {cwd:fileURLToPath(new URL('../..',import.meta.url)),env:{...process.env,PYTHON:'unavailable-python'},encoding:'utf8',timeout:110000});
  assert.equal(r.status,0,r.stderr);
});

test('legacy trace publication still produces a validated plan draft',{timeout:120000},t=>{
  const dir=mkdtempSync(join(tmpdir(),'legacy-trace-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const image=join(dir,'room.png'),out=join(dir,'room.plan');roomImage(image);
  const r=spawnSync(process.execPath,[fileURLToPath(new URL('../../tools/trace.ts',import.meta.url)),image,
    '--legacy','--cells','12','--bands','1','--grid','1','--out',out],{encoding:'utf8',timeout:110000});
  assert.equal(r.status,0,r.stderr);assert.match(readFileSync(out,'utf8'),/\r?\nlegend\r?\n[\s\S]*\r?\nplan\r?\n/);
});
