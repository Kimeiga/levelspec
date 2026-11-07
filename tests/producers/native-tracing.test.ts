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

test('native trace writes exact validated raster evidence without forwarding the output flag to Python',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'trace-retained-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const image=join(dir,'room.png'),out=join(dir,'room.svgx'),evidence=join(dir,'room.raster.json');roomImage(image);
  const script=fileURLToPath(new URL('../../tools/trace.ts',import.meta.url));
  const r=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(hook),script,image,'--cells=12','--bands=1','--grid=1',`--out=${out}`,`--evidence=${evidence}`],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);const raw=readFileSync(evidence,'utf8'),raster=parseRasterTrace(raw);assert.equal(raster.grid,1);
  const direct=python(fileURLToPath(new URL('../../tools/trace_radar.py',import.meta.url)),[image,'--cells','12','--bands','1','--grid','1','--format','raster']);assert.equal(raw,direct);assert.equal((await produceTrace(raster)).text,readFileSync(out,'utf8'));
});
test('trace rejects evidence conflicts, legacy combination and invalid source before either output write',t=>{
  const dir=mkdtempSync(join(tmpdir(),'trace-retained-failure-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const image=join(dir,'room.png'),out=join(dir,'room.svgx'),evidence=join(dir,'room.json');roomImage(image);writeFileSync(out,'old map');writeFileSync(evidence,'old evidence');
  const script=fileURLToPath(new URL('../../tools/trace.ts',import.meta.url));
  const aliases=process.platform==='win32'?[[image,'--out',out,'--evidence',join(dir,'ROOM.SVGX')]]:[];
  for(const args of [[image,'--out',out,'--evidence',join(dir,'.','room.svgx')],...aliases,[image,'--out',out,'--evidence',evidence,'--legacy'],[join(dir,'missing.png'),'--out',out,'--evidence',evidence]]){
    const r=spawnSync(process.execPath,[script,...args],{encoding:'utf8'});assert.notEqual(r.status,0);assert.equal(readFileSync(out,'utf8'),'old map');assert.equal(readFileSync(evidence,'utf8'),'old evidence');
  }
  const badRasters=['{"format":"wrong"}',JSON.stringify({format:'levelspec-raster/1',id:'disconnected',name:'Disconnected',sourceImage:'fixture',grid:1,colors:[[0,0,0]],rows:Array.from({length:8},()=>[...Array(8).fill(0),...Array(4).fill(null),...Array(8).fill(0)])})];
  for(const raster of badRasters){
    const mock=`import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';cp.execFileSync=()=>${JSON.stringify(raster)};syncBuiltinESMExports();`;
    const r=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(mock),script,image,'--out',out,'--evidence',evidence],{encoding:'utf8'});assert.notEqual(r.status,0);assert.equal(readFileSync(out,'utf8'),'old map');assert.equal(readFileSync(evidence,'utf8'),'old evidence');
  }
});
