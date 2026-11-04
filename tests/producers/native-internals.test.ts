import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateLevelV2} from '../../src/generate/vector.ts';
import {proposeNative,NATIVE_ARCHETYPES} from '../../src/generate/native-archetypes.ts';
import {produceDocument} from '../../src/authoring/native-producer.ts';

const hook=`import {registerHooks} from 'node:module';
    registerHooks({resolve(s,c,next){const r=next(s,c);
      if(['/core/compiler.ts','/generate/index.ts','/generate/archetypes.ts','/generate/builder.ts','/authoring/producers.ts','/authoring/legacy-convert.ts','/authoring/legacy-geometry.ts'].some(p=>r.url.endsWith(p)))
        throw new Error('Legacy implementation loaded: '+r.url);
      return r;}});`;
function nativeProcess(args:string[]) {
  return spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(hook),...args],{encoding:'utf8',timeout:110000});
}
test('native procedural generation and native authored loading need no legacy implementation',{timeout:120000},()=>{
  const code=`import assert from 'node:assert/strict';
    const {generateLevelV2,loadAuthoredV2}=await import(${JSON.stringify(new URL('../../src/generate/vector.ts',import.meta.url).href)});
    const made=await generateLevelV2({seed:'native-imports',archetype:'three_lane',minRoutes:3,attempts:3});
    assert.ok(made.ok,JSON.stringify(made));assert.equal(made.legacy,undefined);
    assert.ok(made.disjointRoutes>=3);assert.equal(made.report.passed,true);
    const loaded=await loadAuthoredV2({id:'native',text:made.text},{seed:'native-load'});
    assert.equal(loaded.report.passed,true);assert.equal(loaded.legacy,undefined);`;
  const r=nativeProcess(['--input-type=module','--eval',code]);
  assert.equal(r.status,0,r.stderr);
});

test('native CLI generation needs no legacy implementation',{timeout:120000},t=>{
  const dir=mkdtempSync(join(tmpdir(),'native-generator-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const r=nativeProcess([fileURLToPath(new URL('../../tools/generate.ts',import.meta.url)),'1','--keep','--out',dir]);
  assert.equal(r.status,0,r.stderr);
  assert.equal(readdirSync(dir).filter(p=>p.endsWith('.level.svgx')).length,1);
});

test('every native family preserves depth progression without scaling the player',()=>{
  for(const a of NATIVE_ARCHETYPES) {
    const early=proposeNative('depth-progression',1,2,a.id),late=proposeNative('depth-progression',8,2,a.id);
    const width=(d:typeof early.document)=>Math.max(...d.layers.flatMap(l=>l.vertices.map(v=>v.x)))-Math.min(...d.layers.flatMap(l=>l.vertices.map(v=>v.x)));
    assert.ok(width(late.document)>width(early.document),a.id);
    assert.deepEqual(late.document.player,early.document.player);
  }
});

test('closing native lane mouths fails the unchanged required route count',async()=>{
  const {document:d}=proposeNative('route-negative',4,3,'three_lane');
  assert.equal(d.links.length,0,'connectivity comes from real shared floor boundaries');
  assert.equal((await produceDocument(d)).report.passed,true);
  const layer=d.layers[0],muster=layer.regions.find(r=>r.id==='plan/muster')!;
  for(const name of ['plan/lane0.entry','plan/lane1.entry']) {
    const entry=layer.regions.find(r=>r.id===name)!;
    const shared=muster.boundary.map(s=>s.replace(/^-/,''))
      .filter(id=>entry.boundary.some(s=>s.replace(/^-/,'')===id));
    assert.equal(shared.length,1,'one physical mouth must count as one connection');
    const edge=layer.edges.find(e=>e.id===shared[0])!;edge.kind='wall';edge.height=d.wallHeight;
  }
  await assert.rejects(()=>produceDocument(d),/ROUTE_REQUIREMENT/);
  assert.equal(d.routes[0].minRoutes,3);
});

test('native generated geometry and furniture reproduce exactly',async()=>{
  const options={seed:'repeatable-native',archetype:'bridges',depth:4,attempts:4,minRoutes:3};
  const a=await generateLevelV2(options),b=await generateLevelV2(options);
  assert.ok(a.ok,JSON.stringify(a));assert.ok(b.ok,JSON.stringify(b));
  assert.equal(a.text,b.text);assert.deepEqual(a.pickups,b.pickups);assert.deepEqual(a.enemyPosts,b.enemyPosts);
  assert.ok(a.pickups.some(p=>p.kind==='weapon'&&p.variant));
});

test('the explicit legacy generator CLI still writes v1 artifacts',{timeout:120000},t=>{
  const dir=mkdtempSync(join(tmpdir(),'legacy-generator-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const r=spawnSync(process.execPath,[fileURLToPath(new URL('../../tools/generate.ts',import.meta.url)),'1','--legacy','--keep','--out',dir],{encoding:'utf8',timeout:110000});
  assert.equal(r.status,0,r.stderr);assert.ok(readdirSync(dir).some(p=>p.endsWith('.json')));
  const file=readdirSync(dir).find(p=>p.endsWith('.json'))!;
  assert.equal(JSON.parse(readFileSync(join(dir,file),'utf8')).schema_version,'1.1');
  assert.ok(readdirSync(dir).some(p=>p.endsWith('.plan.svg')));
});

test('native proposals retain the generator player and route requirements',async()=>{
  const r=await generateLevelV2({seed:'native-requirements',archetype:'three_lane',minRoutes:3,attempts:4});
  assert.ok(r.ok,JSON.stringify(r));
  assert.equal(r.legacy===undefined,true);
  assert.equal(r.document.player.radius,0.35);assert.equal(r.document.player.height,1.8);
  assert.equal(r.document.player.step,0.45);assert.equal(r.document.player.crouch,1.1);
  assert.equal(r.document.routes[0].minRoutes,3);assert.ok(r.disjointRoutes>=3);
});
