import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {parseConcept,createConcept,produceConcept,selectConceptCandidates} from '../../src/authoring/native-concept.ts';
import {parseLevelSvgx} from '../../src/vector/format.ts';
import {CONCEPTS} from '../../src/authoring/concepts.ts';
import {layout as legacyLayout} from '../../src/authoring/concept.ts';
import {conceptOptions} from '../../tools/producers/concept-options.ts';
import {nativeConceptCommand} from '../../tools/producers/concept-native.ts';
import {produceSemantic} from '../../src/authoring/semantic.ts';

const root=resolve(import.meta.dirname,'../..');
const hook=`import {registerHooks} from 'node:module';registerHooks({resolve(s,c,next){const r=next(s,c);if(['/core/compiler.ts','/authoring/plan.ts','/authoring/producers.ts','/authoring/legacy-convert.ts','/authoring/legacy-geometry.ts','/authoring/concept.ts','/authoring/score.ts'].some(p=>r.url.endsWith(p)))throw new Error('Legacy concept module loaded: '+r.url);return r;}});`;
const custom={id:'custom:workshop/../hall',name:'Custom workshop',thesis:'An arrival hall beside a workshop.',built:'a workshop',incident:'the shift ended',verb:'cross',contrast:['arrival','work'],grid:1,size:[26,18],wall:.3,routes:1,bands:[{id:'ground',z:2,height:4,purpose:'work',roofed:false,extent:[1,1,24,16],zones:[{id:'arrival',label:'Arrival',role:'spawn',weight:1},{id:'work',label:'Workshop',role:'site',weight:1}]}],links:[],spawn:'arrival',objective:'work'};
function run(args:string[],isolate=true){return spawnSync(process.execPath,[...(isolate?['--import','data:text/javascript,'+encodeURIComponent(hook)]:[]),...args],{cwd:root,encoding:'utf8',timeout:120000});}
test('public native custom concept publishes without legacy modules',()=>{
  const code=`import assert from 'node:assert/strict';const {parseConcept,produceConcept}=await import('levelspec/concept');const c=parseConcept(${JSON.stringify(JSON.stringify(custom))});const p=await produceConcept(c,'v0');assert.equal(p.report.passed,true);assert.equal(p.document.links.length,0);assert.equal(p.document.routes[0].minRoutes,1);assert.equal(p.document.player.radius,.35);assert.equal(p.document.player.height,1.8);assert.equal(p.document.markers[0].position[2],2);`;
  const r=run(['--input-type=module','--eval',code]);assert.equal(r.status,0,r.stderr);
});
test('silo v0 retains its three source flights and publishes with real side guards',async()=>{
  const c=CONCEPTS.find(c=>c.id==='silo')!,proposal=createConcept(c,'v0');assert.deepEqual(proposal.placed,legacyLayout(c,'v0'));
  const result=await produceConcept(c,'v0');assert.equal(result.report.passed,true);assert.equal(result.plan.flights!.length,3);assert.equal(result.document.routes[0].minRoutes,1);assert.equal(result.document.links.length,0);
  assert.ok(result.plan.covers!.some(c=>c.label==='Flight side guard'));assert.ok(result.placementDiagnostics.some(d=>d.code==='FLIGHT_SIDE_GUARDS'));
  assert.equal((await produceSemantic(result.plan)).text,result.text,'the retained source reproduces all added geometry');
});
test('default catalog concept CLI builds native flights with legacy modules blocked',()=>{
  const r=run(['tools/concept.ts','silo','--attempts=1','--variants=1','--plan']);assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/levelspec-semantic\/2/);assert.match(r.stdout,/Flight side guard/);
});
test('native concept CLI accepts custom JSON and keeps namespace IDs inside output directory',t=>{
  const dir=mkdtempSync(join(tmpdir(),'concept-native-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const spec=join(dir,'custom.json');writeFileSync(spec,JSON.stringify(custom));
  const r=run(['tools/concept.ts',`--spec=${spec}`,`--out=${dir}`,'--attempts=2','--variants=1','--write','--plan']);
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/levelspec-semantic\/2/);
  assert.match(readFileSync(join(dir,encodeURIComponent(custom.id)+'.level.svgx'),'utf8'),/version="2"/);
});
test('custom proposals retain deterministic bands, voids, real flights, grid widths and hard player/routes',async()=>{
  const c=parseConcept(JSON.stringify(custom));c.id='stacked_custom';c.grid=1;c.routes=1;
  c.bands[0].zones=[{id:'arrival',label:'Arrival',role:'spawn',weight:1}];
  c.bands.push({id:'upper',z:6,height:4,purpose:'a gallery over the workshop',roofed:false,extent:[1,1,24,16],zones:[{id:'gallery',label:'Gallery',role:'site',weight:3},{id:'void',label:'Void',role:'exterior',weight:1,open:true}]});
  c.links=[{from:'ground',to:'upper',fromZone:'arrival',toZone:'gallery',width:2.6}];c.objective='gallery';
  const proposal=createConcept(c,'v0');assert.deepEqual(proposal,createConcept(c,'v0'));assert.equal(proposal.plan.areas.some(a=>a.id==='void'),false);assert.equal(proposal.plan.flights![0].width,3);assert.match(proposal.plan.placementDiagnostics![0].message,/requested 2.6m.*3m/);
  const result=await produceConcept(c,'v0');assert.equal(result.report.passed,true);assert.equal(result.document.links.length,0);assert.ok(result.document.layers.flatMap(l=>l.regions).some(r=>r.fill==='stairs'));assert.equal(result.physical.routes[0].physicalDisjointRoutes,1);assert.deepEqual(result.document.player,{radius:.35,height:1.8,step:.45,crouch:1.1,slope:42,vault:0,rappel:false,ladder:false});
  c.links.push({...c.links[0],width:100,optional:true});assert.ok(createConcept(c).plan.placementDiagnostics!.some(d=>d.code==='OPTIONAL_LINK_OMITTED'));
  c.links[1].optional=false;assert.throws(()=>createConcept(c),/required link.*has no room/);
});
test('two real circulation branches satisfy hard routes and door seals remain physical openings',async()=>{
  const c=parseConcept(JSON.stringify(custom));c.id='cycle';c.routes=2;c.size=[30,30];c.bands[0].extent=[1,1,28,28];c.bands[0].zones=['a','b','c','d'].map(id=>({id,label:id,role:'room',weight:1}));c.spawn='a';c.objective='d';
  const result=await produceConcept(c,'v0');assert.equal(result.document.routes[0].minRoutes,2);assert.ok(result.physical.routes[0].physicalDisjointRoutes>=2);
  const door=parseConcept(JSON.stringify(custom));door.bands[0].zones[0].seal={work:'door'};
  const d=await produceConcept(door,'v0'),openings=d.document.layers.flatMap(l=>l.edges.flatMap(e=>e.openings));assert.equal(openings.length,1);assert.equal(openings[0].kind,'door');assert.equal(openings[0].end-openings[0].start,2);
  door.routes=2;await assert.rejects(produceConcept(door,'v0'),/ROUTE_REQUIREMENT/);
  door.routes=1;door.bands[0].zones[0].seal={work:'arch'};const arch=await produceConcept(door,'v0');assert.ok(arch.document.layers.flatMap(l=>l.edges.flatMap(e=>e.openings)).some(o=>o.kind==='arch'&&o.end-o.start===3));
});
test('failed candidates cannot rank or win; impossible route counts remain unchanged',async()=>{
  const c=parseConcept(JSON.stringify(custom));c.routes=100;
  const r=await selectConceptCandidates(c,{attempts:2,variants:1});assert.equal(r.winners.length,0);assert.equal(c.routes,100);
  for(const candidate of r.candidates){assert.equal(candidate.valid,false);assert.equal('score' in candidate,false);assert.equal('result' in candidate,false);assert.match(!candidate.valid?candidate.diagnostics.join(''):'',/ROUTE_REQUIREMENT/);}
});
test('selection is deterministic, bounded and physically diverse with distinct canonical variant IDs',async()=>{
  const c=parseConcept(JSON.stringify(custom)),a=await selectConceptCandidates(c,{attempts:4,variants:3}),b=await selectConceptCandidates(c,{attempts:4,variants:3});
  assert.deepEqual(a.winners.map(w=>[w.seed,w.score,w.result.text]),b.winners.map(w=>[w.seed,w.score,w.result.text]));assert.ok(a.winners.length>1);
  assert.equal(new Set(a.winners.map(w=>w.result.document.id)).size,a.winners.length);assert.equal(new Set(a.winners.map(w=>w.signature.join('|'))).size,a.winners.length);
  for(const w of a.winners){assert.equal(parseLevelSvgx(w.result.text).id,w.result.plan.id);assert.equal(w.result.report.passed,true);assert.match(w.score.label,/Advisory estimate/);assert.ok(w.score.floorArea>0);assert.equal((await produceSemantic(w.result.plan)).text,w.result.text);}
  await assert.rejects(selectConceptCandidates(c,{attempts:257}),/attempts/);await assert.rejects(selectConceptCandidates(c,{variants:6}),/variants/);
});
test('custom JSON rejects malformed fields, references, boolean values and constraints before layout',()=>{
  const mutations=[(c:any)=>{c.unknown=1;},(c:any)=>{c.bands[0].zones[0].typo=true;},(c:any)=>{c.grid=0;},(c:any)=>{c.routes=1.5;},(c:any)=>{c.spawn='absent';},(c:any)=>{c.bands[0].zones[0].seal={absent:'door'};},(c:any)=>{c.bands[0].roofed='no';},(c:any)=>{c.links=[{from:'ground',to:'unknown',fromZone:'arrival',toZone:'work',width:2,optional:true}];},(c:any)=>{c.bands[0].zones[0].cover={label:'Box',height:1,as:'crate',count:-1};}];
  for(const mutate of mutations){const c=structuredClone(custom);mutate(c);assert.throws(()=>parseConcept(JSON.stringify(c)));}
  assert.throws(()=>parseConcept('{'));assert.throws(()=>parseConcept('null'));
});
test('cancellation escapes candidate search and never becomes a ranked failure',async()=>{
  const c=parseConcept(JSON.stringify(custom)),controller=new AbortController();controller.abort();
  await assert.rejects(produceConcept(c,'v0',{signal:controller.signal}),/abort/i);await assert.rejects(selectConceptCandidates(c,{signal:controller.signal}),/abort/i);
  const during=new AbortController();await assert.rejects(selectConceptCandidates(c,{signal:during.signal,onProgress:()=>during.abort()}),/abort/i);
});
test('CLI rejects bad options and invalid candidates without replacing previous artifacts',t=>{
  const dir=mkdtempSync(join(tmpdir(),'concept-options-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const spec=join(dir,'custom.json'),out=join(dir,encodeURIComponent(custom.id)+'.level.svgx');writeFileSync(spec,JSON.stringify(custom));writeFileSync(out,'previous');
  for(const bad of [['--mystery'],['--attempts=NaN'],['--variants=6'],['--write=true'],['--out',dir],['--attempts=1','--attempts=2'],['unknown_catalog_id'],['--legacy']]){
    const r=run(['tools/concept.ts',`--spec=${spec}`,`--out=${dir}`,'--write',...bad]);assert.notEqual(r.status,0);assert.equal(readFileSync(out,'utf8'),'previous');
  }
  writeFileSync(spec,JSON.stringify({...custom,routes:100}));const r=run(['tools/concept.ts',`--spec=${spec}`,`--out=${dir}`,'--write','--attempts=1']);assert.notEqual(r.status,0);assert.match(r.stdout,/ROUTE_REQUIREMENT/);assert.equal(readFileSync(out,'utf8'),'previous');
});
test('command options preserve defaults and direct native command writes only selected canonical variants',async t=>{
  const defaults=conceptOptions([]);assert.equal(defaults.attempts,24);assert.equal(defaults.variants,3);
  const dir=mkdtempSync(join(tmpdir(),'concept-command-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const spec=join(dir,'custom.json');writeFileSync(spec,JSON.stringify(custom));
  const messages:string[]=[];t.mock.method(console,'log',(s:string)=>messages.push(s));
  await nativeConceptCommand(conceptOptions(['--spec',spec,'--out',dir,'--attempts','2','--variants','1','--write','--why','--plan']));
  assert.ok(messages.some(m=>m.includes('1 map(s) written')));assert.match(readFileSync(join(dir,encodeURIComponent(custom.id)+'.level.svgx'),'utf8'),/version="2"/);
  await assert.rejects(nativeConceptCommand(conceptOptions(['missing_catalog'])),/Unknown concept/);
});
test('explicit legacy concept CLI retains draw/score and dual-validated plan output',t=>{
  const dir=mkdtempSync(join(tmpdir(),'concept-legacy-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const r=run(['tools/concept.ts','silo','--legacy','--attempts=1','--variants=1','--write','--plan',`--out=${dir}`],false);
  assert.equal(r.status,0,r.stderr);const plan=readFileSync(join(dir,'silo.plan'),'utf8');assert.match(plan,/id: og_silo/);assert.match(plan,/\nplan\n/);assert.match(r.stdout,/rhythm.*mystery/);assert.match(plan,/route hardstand launch_floor 1/);
});
