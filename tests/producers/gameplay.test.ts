import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync,mkdirSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const fixture=resolve('examples/gameplay/floodgate.gameplay.json');
const cli=fileURLToPath(new URL('../../tools/gameplay.ts',import.meta.url));
const hook=`import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){const r=next(s,c);
if(['/src/core/','/src/generate/','/src/authoring/producers.ts','/src/authoring/legacy-'].some(p=>r.url.includes(p)))throw new Error('Legacy implementation loaded: '+r.url);
return r;}});`;
function run(args:string[]) {
  return spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(hook),...args],{encoding:'utf8',timeout:110000});
}

test('gameplay and trace reject aliased artifact destinations before replacing source or outputs',t=>{
  const dir=mkdtempSync(join(tmpdir(),'gameplay-alias-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const real=join(dir,'real'),alias=join(dir,'alias');mkdirSync(real);symlinkSync(real,alias,process.platform==='win32'?'junction':'dir');
  const input=join(real,'plan.json'),text=JSON.stringify({format:'levelspec-gameplay/2',id:'alias_room',name:'Alias room',spaces:[{id:'room',rect:[0,0,8,8]}],connections:[],markers:[{id:'spawn',space:'room',kind:'spawn'}]});writeFileSync(input,text);
  for(const flag of ['--out','--report']){
    const result=run([cli,input,flag,join(alias,'plan.json')]);assert.notEqual(result.status,0);assert.match(result.stderr,/distinct paths/);assert.equal(readFileSync(input,'utf8'),text);
  }
  const output=join(real,'nested','output.svgx'),report=join(alias,'nested','output.svgx');
  const result=run([cli,input,'--out',output,'--report',report]);assert.notEqual(result.status,0);assert.match(result.stderr,/distinct paths/);assert.equal(existsSync(output),false);assert.equal(readFileSync(input,'utf8'),text);
  mkdirSync(join(real,'nested'));writeFileSync(output,'prior artifact');const existing=run([cli,input,'--out',output,'--report',report]);assert.notEqual(existing.status,0);assert.match(existing.stderr,/distinct paths/);assert.equal(readFileSync(output,'utf8'),'prior artifact');
  if(process.platform==='win32'){const result=run([cli,input,'--out',join(alias,'PLAN.JSON')]);assert.notEqual(result.status,0);assert.match(result.stderr,/distinct paths/);assert.equal(readFileSync(input,'utf8'),text);}
  const good=run([cli,input,'--out',join(alias,'map.svgx'),'--report',join(real,'report.json')]);assert.equal(good.status,0,good.stderr);assert.equal(readFileSync(input,'utf8'),text);assert.match(readFileSync(join(real,'map.svgx'),'utf8'),/version="2"/);
  const trace=fileURLToPath(new URL('../../tools/trace.ts',import.meta.url)),collision=join(real,'evidence.json');writeFileSync(collision,'prior artifact');
  const traced=run([trace,'unused.png','--out',collision,'--evidence',join(alias,'evidence.json'),'--python','unavailable-python']);assert.notEqual(traced.status,0);assert.match(traced.stderr,/different paths/);assert.equal(readFileSync(collision,'utf8'),'prior artifact');
});
test('gameplay API and CLI publish with all legacy generators and compatibility producers blocked',{timeout:120000},t=>{
  const dir=mkdtempSync(join(tmpdir(),'gameplay-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const out=join(dir,'map.level.svgx'),report=join(dir,'report.json');
  const result=run([cli,fixture,'--out',out,'--report',report]);
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.stdout,'');
  assert.match(readFileSync(out,'utf8'),/version="2"/);
  const assessment=JSON.parse(readFileSync(report,'utf8'));
  assert.equal(assessment.advisory,true);assert.ok(assessment.routes.every((r:{disjointRoutes:number})=>r.disjointRoutes>=2));
  const code=`import {readFileSync} from 'node:fs';
    const {parseGameplayPlan,produceGameplay}=await import('levelspec/gameplay');
    const p=parseGameplayPlan(readFileSync(${JSON.stringify(fixture)},'utf8'));
    const points=[];const stages=[];const result=await produceGameplay(p,{onProgress:s=>stages.push(s),onReachableSample:p=>points.push(p),sampleOrigin:[5,3,0],resolveAsset:()=>{throw new Error('Unexpected asset');}});
    if(!result.report.passed||!points.length||!stages.length)throw new Error('Native observations were not propagated');`;
  const native=run(['--input-type=module','--eval',code]);assert.equal(native.status,0,native.stderr);
});

test('stdout remains canonical SVGX when an advisory report is requested',{timeout:120000},t=>{
  const dir=mkdtempSync(join(tmpdir(),'gameplay-stdout-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const report=join(dir,'report.json'),result=run([cli,fixture,'--report',report]);
  assert.equal(result.status,0,result.stderr);
  assert.ok(result.stdout.startsWith('<?xml'));
  assert.equal(JSON.parse(readFileSync(report,'utf8')).advisory,true);
  assert.ok(!result.stdout.includes('"advisory"'));
});

test('invalid publication or flags leave previous map/report intact',{timeout:120000},t=>{
  const dir=mkdtempSync(join(tmpdir(),'gameplay-preserve-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const out=join(dir,'map.level.svgx'),report=join(dir,'report.json'),bad=join(dir,'bad.json');
  writeFileSync(out,'previous map');writeFileSync(report,'previous report');
  const plan=JSON.parse(readFileSync(fixture,'utf8'));plan.routes[0].minRoutes=99;writeFileSync(bad,JSON.stringify(plan));
  for(const args of [[bad,'--out',out,'--report',report],[fixture,'--out',out,'--report',report,'--unknown'],[fixture,'--out',out,'--report'],[fixture,'--out',out,'--out',out]]) {
    const result=run([cli,...args]);assert.notEqual(result.status,0);assert.equal(result.stdout,'');
    assert.equal(readFileSync(out,'utf8'),'previous map');assert.equal(readFileSync(report,'utf8'),'previous report');
  }
  const missing=join(dir,'new.svgx');const result=run([cli,bad,'--out',missing]);assert.notEqual(result.status,0);assert.equal(existsSync(missing),false);
  const same=run([cli,fixture,'--out',out,'--report',out]);assert.notEqual(same.status,0);assert.equal(readFileSync(out,'utf8'),'previous map');
});
