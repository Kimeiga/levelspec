import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
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
