import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {PNG} from 'pngjs';
import {parseLevelSvgx} from '../../src/vector/format.ts';
import {compile} from '../../src/vector/compiler.ts';
import {validateForRuntime} from '../../src/vector/validate.ts';

const root=resolve(import.meta.dirname,'../..');
const plan=`id: producer_room\ngrid: 1\nlayer ground z=0 height=4 roof=no\nlegend\n A room "Room" room\nend\nplan\nAAAAAAAAAAAA\nAAAAAAAAAAAA\nAAAAAAAAAAAA\nAAAAAAAAAAAA\nAAAAAAAAAAAA\nAAAAAAAAAAAA\nend\n`;
function command(tool:string,args:string[]) {
  return spawnSync(process.execPath,[join(root,'tools',tool+'.ts'),...args],{cwd:root,encoding:'utf8',timeout:120000});
}
async function valid(path:string) {
  const document=parseLevelSvgx(readFileSync(path,'utf8'));
  assert.equal(document.version,'2');
  assert.equal((await validateForRuntime(await compile(document))).passed,true);
}

test('plan publishing preserves prior output on failure and retains legacy output',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'levelspec-plans-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const src=join(dir,'src'),out=join(dir,'out');mkdirSync(src);mkdirSync(out);
  writeFileSync(join(src,'room.plan'),plan);
  let r=command('plans',['room','--src',src,'--out',out]);assert.equal(r.status,0,r.stderr);
  const path=join(out,'room.level.svgx');await valid(path);const before=readFileSync(path,'utf8');
  writeFileSync(join(src,'room.plan'),plan+'route absent nowhere 2\n');
  r=command('plans',['room','--src',src,'--out',out]);assert.notEqual(r.status,0);assert.equal(readFileSync(path,'utf8'),before);
  writeFileSync(join(src,'room.plan'),plan);
  r=command('plans',['room','--legacy','--src',src,'--out',out]);assert.equal(r.status,0,r.stderr);
  assert.equal(JSON.parse(readFileSync(join(out,'room.json'),'utf8')).schema_version,'1.1');
});

test('filtered finalization keeps unselected files and never overwrites with an invalid plan',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'levelspec-finalize-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const src=join(dir,'src'),out=join(dir,'out');mkdirSync(src);mkdirSync(out);
  writeFileSync(join(src,'selected.plan'),plan);writeFileSync(join(out,'unselected.plan'),'keep me');
  let r=command('finalize',['selected','--src',src,'--out',out]);assert.equal(r.status,0,r.stderr);
  const path=join(out,'selected.level.svgx');await valid(path);const before=readFileSync(path,'utf8');
  writeFileSync(join(src,'selected.plan'),plan+'route absent nowhere 2\n');
  r=command('finalize',['selected','--src',src,'--out',out]);assert.notEqual(r.status,0);
  assert.equal(readFileSync(path,'utf8'),before);assert.equal(readFileSync(join(out,'unselected.plan'),'utf8'),'keep me');
});

test('radar tracing publishes real v2 geometry and reports Python failures without writing',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'levelspec-trace-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const png=new PNG({width:40,height:40});
  for(let y=0;y<40;y++)for(let x=0;x<40;x++) {
    const i=(y*40+x)*4,value=x>=4&&x<36&&y>=4&&y<36?100:255;
    png.data.set([value,value,value,255],i);
  }
  const image=join(dir,'room.png'),out=join(dir,'room.level.svgx');writeFileSync(image,PNG.sync.write(png));
  let r=command('trace',[image,'--cells','12','--bands','1','--grid','1','--out',out]);assert.equal(r.status,0,r.stderr);
  await valid(out);const before=readFileSync(out,'utf8');
  r=command('trace',[image,'--python',join(dir,'missing-python'),'--out',out]);assert.notEqual(r.status,0);assert.equal(readFileSync(out,'utf8'),before);
  assert.ok(r.stderr.includes('Set PYTHON'));
});

test('Python compositions publish v2 and reject unsatisfied authored requirements',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'levelspec-author-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const spec=join(dir,'room.py'),out=join(dir,'room.level.svgx');
  const source=`ID='producer_composition'\nNAME='Room'\nDESCRIPTION='Producer test'\nWIDTH=12\nHEIGHT=12\nGRID=1\nAREAS=[{'id':'room','label':'Room','rects':[(0,0,12,12)],'ceiling':4}]\n`;
  writeFileSync(spec,source);
  let r=command('author',['room','--spec',spec,'--out',out]);assert.equal(r.status,0,r.stderr);await valid(out);
  const before=readFileSync(out,'utf8');writeFileSync(spec,source+`DIRECTIVES=['route absent nowhere 2']\n`);
  r=command('author',['room','--spec',spec,'--out',out]);assert.notEqual(r.status,0);assert.equal(readFileSync(out,'utf8'),before);
  assert.equal(existsSync(join(dir,'room.plan')),false);
});
