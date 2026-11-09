import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateLevel} from '../../src/generate/vector.ts';
import {proposeNative,NATIVE_ARCHETYPES} from '../../src/generate/native-archetypes.ts';
import {produceDocument} from '../../src/architecture/producer.ts';
import {compile,type ArchitectureDocument,type ArchitectureElement,type V3} from 'levelspec';
import {rayBlocked} from '../../src/vector/validate.ts';
import {prepareInspectionWalk} from '../../review/walk.ts';
import {THEMES} from '../../src/generate/themes.ts';

function nativeProcess(args:string[]) {
  return spawnSync(process.execPath,args,{encoding:'utf8',timeout:110000});
}
function elements(document:ArchitectureDocument):ArchitectureElement[]{const result:ArchitectureElement[]=[];const visit=(element:ArchitectureElement)=>{result.push(element);if('children' in element)element.children.forEach(visit);};document.elements.forEach(visit);return result;}
test('native procedural generation and authored loading publish validated AML',{timeout:120000},()=>{
  const code=`import assert from 'node:assert/strict';
    const {generateLevel,loadAuthored}=await import(${JSON.stringify(new URL('../../src/generate/vector.ts',import.meta.url).href)});
    const made=await generateLevel({seed:'native-imports',archetype:'three_lane',minRoutes:3,attempts:3});
    assert.ok(made.ok,JSON.stringify(made));
    assert.ok(made.disjointRoutes>=3);assert.equal(made.report.passed,true);
    const loaded=await loadAuthored({id:'native',text:made.text},{seed:'native-load'});
    assert.equal(loaded.report.passed,true);`;
  const r=nativeProcess(['--input-type=module','--eval',code]);
  assert.equal(r.status,0,r.stderr);
});

test('native CLI generation publishes AML',{timeout:120000},t=>{
  const dir=mkdtempSync(join(tmpdir(),'native-generator-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const r=nativeProcess([fileURLToPath(new URL('../../tools/generate.ts',import.meta.url)),'1','--keep','--out',dir]);
  assert.equal(r.status,0,r.stderr);
  assert.equal(readdirSync(dir).filter(p=>p.endsWith('.aml')).length,1);
});

test('every native family preserves depth progression without scaling the player',()=>{
  for(const a of NATIVE_ARCHETYPES) {
    const early=proposeNative('depth-progression',1,2,a.id),late=proposeNative('depth-progression',8,2,a.id);
    const width=(d:typeof early.document)=>{const x=d.profiles.flatMap(profile=>(profile.outer.points??[]).map(p=>p[0]));return Math.max(...x)-Math.min(...x);};
    assert.ok(width(late.document)>width(early.document),a.id);
    assert.deepEqual(late.document.player,early.document.player);
  }
});

test('native materials preserve every selected theme palette',()=>{
  for(const theme of THEMES) {
    const {document:d}=proposeNative('palette-parity',4,2,'three_lane',theme.id);
    for(const [id,role] of [['floor','floor'],['wall','static_hard'],['cover','cover']])
      assert.equal(d.materials.find(m=>m.id===id)!.color,'#'+theme.palette.roles[role].toString(16).padStart(6,'0'),`${theme.id}/${id}`);
    const walls=elements(d).filter(element=>element.kind==='wall');assert.ok(walls.length);assert.ok(walls.every(wall=>wall.thickness===theme.wallThickness));
  }
});

test('closing native lane mouths fails the unchanged required route count',async()=>{
  const {document:d}=proposeNative('route-negative',4,3,'three_lane');
  assert.equal(d.links.length,0,'connectivity comes from actual native floor support');
  d.frames.push({id:'connection-origin',position:[10,20,0]});
  for(const connection of d.connections){const path=d.paths.find(path=>path.id===connection.path)!;assert.ok(path.points);path.points=path.points.map(p=>[p[0]-10,p[1]-20,p[2]]);path.frame='connection-origin';}
  assert.equal((await produceDocument(d)).report.passed,true,'World-equivalent framed connection paths retain physical route evidence');
  const blockedMouths:V3[]=[];
  for(const [i,name] of ['plan/lane0.entry','plan/lane2.entry'].entries()) {
    const entry=elements(d).find(element=>element.id===name);assert.equal(entry?.kind,'slab');if(entry?.kind!=='slab')throw new Error('Expected flat native lane entry');
    const profile=d.profiles.find(profile=>profile.id===entry.profile)!;assert.ok(profile);assert.ok(profile.outer.points);const points=profile.outer.points.slice(0,2);
    blockedMouths.push([(points[0][0]+points[1][0])/2,points[0][1],points[0][2]+1]);
    const id=`blocked-mouth-${i}`;d.paths.push({id,points:structuredClone(points),segments:[],closed:false});
    const assembly=d.elements.find(element=>element.kind==='assembly');assert.ok(assembly?.kind==='assembly');
    assembly.children.push({kind:'wall',id:`wall-${i}`,path:id,thickness:.3,height:4,alignment:'center',join:'miter'});
  }
  const blocked=await compile(d);for(const p of blockedMouths)assert.equal(rayBlocked(blocked,[p[0],p[1]-.5,p[2]],[p[0],p[1]+.5,p[2]]),true,'The authored native wall really closes its mouth');
  await assert.rejects(()=>produceDocument(d),/ROUTE_REQUIREMENT/);
  assert.equal(d.routes[0].minRoutes,3);
});

test('native generated geometry and furniture reproduce exactly',async()=>{
  const options={seed:'repeatable-native',archetype:'bridges',depth:4,attempts:4,minRoutes:3};
  const a=await generateLevel(options),b=await generateLevel(options);
  assert.ok(a.ok,JSON.stringify(a));assert.ok(b.ok,JSON.stringify(b));
  assert.equal(a.text,b.text);assert.deepEqual(a.pickups,b.pickups);assert.deepEqual(a.enemyPosts,b.enemyPosts);
  assert.ok(a.pickups.some(p=>p.kind==='weapon'&&p.variant));
  assert.ok(a.enemyPosts.length<=96,'Enemy placement retains its bounded output');
  for(const position of [...a.pickups.map(p=>p.at),...a.enemyPosts.slice(0,5)]){
    assert.equal(rayBlocked(a.level,[position[0],position[1],position[2]+.02],[position[0],position[1],position[2]-.03]),true,'Placements retain actual physical support');
    assert.equal(prepareInspectionWalk(a.level,{feet:position,yaw:0,pitch:0}).ok,true,'Placed standing bodies retain physical clearance');
  }
});

test('native proposals retain the generator player and route requirements',async()=>{
  const r=await generateLevel({seed:'native-requirements',archetype:'three_lane',minRoutes:3,attempts:4});
  assert.ok(r.ok,JSON.stringify(r));
  assert.equal(r.document.player.radius,0.35);assert.equal(r.document.player.height,1.8);
  assert.equal(r.document.player.step,0.45);assert.equal(r.document.player.crouch,1.1);
  assert.equal(r.document.routes[0].minRoutes,3);assert.ok(r.disjointRoutes>=3);
});
