import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {parseLevelSvgx,serializeLevelSvgx} from '../../src/vector/format.ts';
import {traceToDocument} from '../../src/tracing/native.ts';
import {createSemantic} from '../../src/authoring/semantic.ts';

const root=resolve(import.meta.dirname,'../..');
const hook=`import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){const r=next(s,c);
if(['/core/compiler.ts','/authoring/plan.ts','/authoring/producers.ts','/authoring/legacy-convert.ts','/authoring/legacy-geometry.ts'].some(p=>r.url.endsWith(p)))throw new Error('Legacy semantic module loaded: '+r.url);return r;}});`;
function run(tool:string,args:string[],isolate:boolean|'source'=true) {
  const imports=isolate==='source'?hook.replace("'/authoring/plan.ts',",''):hook;
  return spawnSync(process.execPath,[...(isolate?['--import','data:text/javascript,'+encodeURIComponent(imports)]:[]),join(root,'tools',tool+'.ts'),...args],
    {cwd:root,encoding:'utf8',timeout:120000});
}
const raster={format:'levelspec-raster/1' as const,id:'trace',name:'Trace',sourceImage:'fixture.png',grid:1,colors:[[80,90,100] as [number,number,number]],rows:Array.from({length:10},()=>Array(16).fill(0))};
function directory(t:{after:(fn:()=>void)=>void}) {const dir=mkdtempSync(join(tmpdir(),'semantic-native-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}

test('native annotation CLI preserves source metadata IDs that share generated split prefixes',t=>{
  const dir=directory(t),spec=join(dir,'namespace.py'),source=join(dir,'source.svgx'),out=join(dir,'output.svgx');
  const d=createSemantic({format:'levelspec-semantic/2',id:'namespace',name:'Namespace',grid:1,layers:[{id:'ground',height:5}],areas:[{id:'west',rects:[[0,0,10,12]]},{id:'east',rects:[[10,0,10,12]],z:.3}],portals:[{id:'step_door',between:['west','east'],kind:'door',width:4}],markers:[{id:'split/seam',kind:'spawn',area:'west',position:[3,3]},{id:'split/edge',kind:'site',area:'east',position:[17,3]}],routes:[{id:'split/vertex',from:'split/seam',to:'split/edge',minRoutes:1}]});
  const original=serializeLevelSvgx(d);writeFileSync(source,original);
  writeFileSync(spec,"ID='namespace_annotation'\nNAME='Namespace annotation'\nGRID=1\nAREAS=[{'id':'west','seeds':[(0,0,10,12)]},{'id':'east','seeds':[(10,0,10,12)]}]\n");
  const result=run('author',['namespace','--spec',spec,'--traced',source,'--out',out]);assert.equal(result.status,0,result.stderr);
  const made=parseLevelSvgx(readFileSync(out,'utf8'));assert.deepEqual(made.markers.map(m=>m.id),['split/seam','split/edge']);assert.equal(made.routes[0].id,'split/vertex');assert.equal(made.routes[0].minRoutes,1);assert.equal(readFileSync(source,'utf8'),original);
});

test('native annotation rejects a hard wall conflicting with a source doorway before replacing output',t=>{
  const dir=directory(t),spec=join(dir,'wall.py'),source=join(dir,'source.svgx'),out=join(dir,'output.svgx');writeFileSync(out,'prior artifact');
  const d=createSemantic({format:'levelspec-semantic/2',id:'door_source',name:'Door source',grid:1,layers:[{id:'ground',height:4}],areas:[{id:'west',rects:[[0,0,10,12]]},{id:'east',rects:[[10,0,10,12]]}],portals:[{id:'door',between:['west','east'],kind:'door',width:2}]});writeFileSync(source,serializeLevelSvgx(d));
  writeFileSync(spec,"ID='wall_annotation'\nNAME='Wall annotation'\nGRID=1\nAREAS=[{'id':'west','seeds':[(4,5,1,1)]},{'id':'east','seeds':[(15,5,1,1)]}]\nDIRECTIVES=['wall west east']\n");
  const r=run('author',['wall','--spec',spec,'--traced',source,'--out',out]);assert.notEqual(r.status,0);assert.match(r.stderr,/conflicts.*boundary/);assert.equal(readFileSync(out,'utf8'),'prior artifact');
});

test('raw optional portal aliases never erase required low doorways or replace prior output',t=>{
  const dir=directory(t),spec=join(dir,'collision.py'),out=join(dir,'output.svgx');writeFileSync(out,'prior artifact');
  for(const active of [false,true]){
    const id=active?'door_west_east_1':'door_west_east_0',between=active?"('west','east')":"('west','far')";
    writeFileSync(spec,`ID='portal_alias'\nNAME='Portal alias'\nGRID=1\nAREAS=[{'id':'west','rects':[(0,0,10,12)]},{'id':'east','rects':[(10,0,10,12)]},{'id':'far','rects':[(20,0,10,12)]}]\nPORTALS=[{'id':'${id}','between':${between},'width':1}]\nDIRECTIVES=['door west east 3 head=1','mark spawn west','mark site east','route west east 1']\n`);
    const result=run('author',['collision','--spec',spec,'--out',out]);assert.notEqual(result.status,0);assert.match(result.stderr,/Duplicate semantic id/);assert.equal(readFileSync(out,'utf8'),'prior artifact');
  }
});

test('native annotation CLI places only omitted new markers around retained exact cover',t=>{
  const dir=directory(t),spec=join(dir,'covered.py'),source=join(dir,'source.svgx'),out=join(dir,'output.svgx');
  const d=createSemantic({format:'levelspec-semantic/2',id:'covered_source',name:'Covered source',grid:1,layers:[{id:'ground',height:5}],areas:[{id:'room',rects:[[0,0,12,12]]}],covers:[{id:'crate',rect:[5,5,2,2],height:2}],markers:[{id:'retained',kind:'site',area:'room',position:[3,3]}]});writeFileSync(source,serializeLevelSvgx(d));
  const prefix="ID='covered_annotation'\nNAME='Covered annotation'\nGRID=1\nAREAS=[{'id':'room','seeds':[(3,3,1,1)]}]\n";writeFileSync(spec,prefix+"DIRECTIVES=['mark spawn room']\n");
  const result=run('author',['covered','--spec',spec,'--traced',source,'--out',out]);assert.equal(result.status,0,result.stderr);const good=readFileSync(out,'utf8'),made=parseLevelSvgx(good);assert.notDeepEqual(made.markers.find(m=>m.id==='mark_spawn_room')!.position,[6.5,6.5,0]);assert.deepEqual(made.markers.find(m=>m.id==='retained')!.position,[3,3,0]);assert.deepEqual(made.covers[0].min,[5,5,0]);assert.deepEqual(made.covers[0].max,[7,7,2]);
  writeFileSync(spec,prefix+"GAMEPLAY={'markers':[{'id':'explicit','kind':'spawn','area':'room','position':[6,6]}]}\n");const blocked=run('author',['covered','--spec',spec,'--traced',source,'--out',out]);assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/NAV|MARKER/);assert.equal(readFileSync(out,'utf8'),good);
});

test('Python native annotation publishes a new physical ramp without legacy modules',t=>{
  const dir=directory(t),spec=join(dir,'ramp.py'),source=join(dir,'source.svgx'),out=join(dir,'output.svgx');
  const d=createSemantic({format:'levelspec-semantic/2',id:'flat_source',name:'Flat source',grid:1,layers:[{id:'ground',height:5}],areas:[{id:'west',rects:[[0,0,10,12]]},{id:'east',rects:[[10,0,10,12]],z:2}]});writeFileSync(source,serializeLevelSvgx(d));
  writeFileSync(spec,"ID='ramp_annotation'\nNAME='Ramp annotation'\nGRID=1\nLAYERS=[{'id':'ground','z':0,'height':5}]\nAREAS=[{'id':'west','z':0,'seeds':[(4,5,1,1)]},{'id':'east','z':2,'seeds':[(15,5,1,1)]}]\nRAMPS=[{'id':'slope','at':[(7,4,6,3)]}]\nCOVER=[{'id':'blocked','label':'Blocked','height':1,'at':[(7,4,1,1)]}]\nDIRECTIVES=['mark spawn west','mark site east','route west east 1']\n");
  const r=run('author',['ramp','--spec',spec,'--traced',source,'--out',out]);assert.equal(r.status,0,r.stderr);assert.match(r.stderr,/blocked: 0\/1/);const made=parseLevelSvgx(readFileSync(out,'utf8'));assert.equal(made.links.length,0);assert.ok(made.layers.flatMap(l=>l.regions).some(r=>r.fill==='ramp'));assert.equal(made.routes[0].minRoutes,1);
});
test('conflicting Python PLAYER cannot replace explicit plan or semantic source limits or prior output',t=>{
  const dir=directory(t),spec=join(dir,'labels.py'),out=join(dir,'output.svgx');writeFileSync(out,'prior artifact');
  writeFileSync(spec,"ID='labels'\nNAME='Labels'\nGRID=1\nPLAYER={'radius':0.35,'height':1.8,'step':0.45}\nAREAS=[{'id':'room','seeds':[(3,3,1,1)]}]\n");
  const legacy='id: body\ngrid: 1\nradius: 0.42\nheight: 1.9\nstep: 0.3\nlayer ground z=0 height=5 roof=no\nlegend\n A room "Room" lane\nend\nplan\n'+Array(12).fill('AAAAAAAAAAAA').join('\n')+'\nend\n';
  const semantic={format:'levelspec-semantic/2',id:'body',name:'Body',grid:1,player:{radius:.42,height:1.9,step:.3},layers:[{id:'ground',height:5}],areas:[{id:'room',rects:[[0,0,12,12]]}]};
  for(const [extension,text] of [['plan',legacy],['json',JSON.stringify(semantic)]]){
    const source=join(dir,'body.'+extension);writeFileSync(source,text);const r=run('author',['labels','--spec',spec,'--traced',source,'--out',out],extension==='plan'?'source':true);
    assert.notEqual(r.status,0);assert.match(r.stderr,/preserve.*PLAYER/i);assert.equal(readFileSync(out,'utf8'),'prior artifact');
  }
});
test('finalization preflights suffix collisions without replacing prior output and respects filtering',t=>{
  const dir=directory(t),src=join(dir,'src'),out=join(dir,'out');mkdirSync(src);mkdirSync(out);
  const native=serializeLevelSvgx(traceToDocument(raster));
  const legacy='id: legacy_source\ngrid: 1\nlayer ground z=0 height=5 roof=no\nlegend\n A room "Room" lane\nend\nplan\n'+Array(10).fill('A'.repeat(16)).join('\n')+'\nend\n';
  for(const names of [['shared.json','shared.svgx'],['foo.svgx','foo.level.svgx'],['mixed.plan','mixed.json']]){
    for(const name of names)writeFileSync(join(src,name),name.endsWith('.svgx')?native:name.endsWith('.plan')?legacy:JSON.stringify(raster));
    const destination=join(out,names[0].split('.')[0]+'.level.svgx');writeFileSync(destination,'prior artifact');
    const r=run('finalize',[names[0].split('.')[0],'--src',src,'--out',out]);assert.notEqual(r.status,0);assert.match(r.stderr,/collision/i);for(const name of names)assert.ok(r.stderr.includes(name));assert.equal(readFileSync(destination,'utf8'),'prior artifact');
  }
  const filtered=run('finalize',['shared.svgx','--src',src,'--out',out]);assert.equal(filtered.status,0,filtered.stderr);assert.equal(readFileSync(join(out,'foo.level.svgx'),'utf8'),'prior artifact');
  if(process.platform==='win32'){
    const caseSrc=join(dir,'case');mkdirSync(caseSrc);writeFileSync(join(caseSrc,'Case.svgx'),native);writeFileSync(join(caseSrc,'case.json'),JSON.stringify(raster));
    const r=run('finalize',['--src',caseSrc,'--out',out]);assert.notEqual(r.status,0);assert.match(r.stderr,/collision/);assert.match(r.stderr,/Case.svgx/);assert.match(r.stderr,/case.json/);
  }
});
test('finalizer permits native in-place publication but rejects aliases of other selected inputs',t=>{
  const dir=directory(t),native=serializeLevelSvgx(traceToDocument(raster)),path=join(dir,'foo.level.svgx');writeFileSync(path,native);
  let r=run('finalize',['--src',dir,'--out',dir]);assert.equal(r.status,0,r.stderr);assert.equal(readFileSync(path,'utf8'),native);
  writeFileSync(join(dir,'foo.svgx'),native);r=run('finalize',['--src',dir,'--out',dir]);assert.notEqual(r.status,0);assert.match(r.stderr,/collision/i);assert.equal(readFileSync(path,'utf8'),native);
});

test('finalizer canonical path reuse preserves legitimate in-place publication through a directory alias',t=>{
  const dir=directory(t),src=join(dir,'real'),alias=join(dir,'alias');mkdirSync(src);symlinkSync(src,alias,process.platform==='win32'?'junction':'dir');
  const text=serializeLevelSvgx(traceToDocument(raster)),source=join(src,'map.level.svgx');writeFileSync(source,text);
  const result=run('finalize',['--src',src,'--out',alias]);assert.equal(result.status,0,result.stderr);assert.equal(readFileSync(source,'utf8'),text);
  writeFileSync(join(src,'map.svgx'),text);const collision=run('finalize',['--src',src,'--out',alias]);assert.notEqual(collision.status,0);assert.match(collision.stderr,/collision/);assert.equal(readFileSync(source,'utf8'),text);
});
test('direct native author and finalizer retain an enabled authored ladder',async t=>{
  const {createGameplay}=await import('../../src/gameplay/index.ts');
  const d=createGameplay({format:'levelspec-gameplay/2',id:'native_ladder',name:'Ladder',player:{ladder:true},spaces:[{id:'low',rect:[0,0,12,12]},{id:'high',rect:[0,0,12,12],z:4}],connections:[],markers:[{id:'s',space:'low',kind:'spawn'},{id:'t',space:'high',kind:'site'}],routes:[{id:'climb',from:'s',to:'t',minRoutes:1}]});
  d.links.push({id:'ladder',kind:'ladder',ability:'ladder',bidirectional:true,from:[6,6,0],to:[6,6,4],fromArea:'low',toArea:'high'});
  const dir=directory(t),src=join(dir,'src'),out=join(dir,'out');mkdirSync(src);const path=join(src,'ladder.svgx'),text=serializeLevelSvgx(d);writeFileSync(path,text);
  const finalized=run('finalize',['--src',src,'--out',out]);assert.equal(finalized.status,0,finalized.stderr);assert.equal(readFileSync(join(out,'ladder.level.svgx'),'utf8'),text);
  const authored=run('author',['ladder','--spec',path,'--out',join(out,'author.svgx')]);assert.equal(authored.status,0,authored.stderr);assert.equal(readFileSync(join(out,'author.svgx'),'utf8'),text);
});

test('default author loads Python declarations directly without legacy semantic modules',t=>{
  const dir=directory(t),spec=join(dir,'room.py'),out=join(dir,'room.svgx');
  writeFileSync(spec,`ID='composition'\nNAME='Composition'\nDESCRIPTION='native'\nGRID=1\nWIDTH=16\nHEIGHT=10\nAREAS=[{'id':'room','label':'Room','rects':[(0,0,16,10)],'ceiling':4}]\n`);
  const result=run('author',['room','--spec',spec,'--out',out]);assert.equal(result.status,0,result.stderr);
  const d=parseLevelSvgx(readFileSync(out,'utf8'));assert.equal(d.player.radius,.35);assert.equal(d.floorThickness,.25);assert.equal(d.links.length,0);
});

test('default finalize publishes native raster and SVGX without loading compatibility modules',t=>{
  const dir=directory(t),src=join(dir,'src'),out=join(dir,'out');mkdirSync(src);
  writeFileSync(join(src,'raster.json'),JSON.stringify(raster));writeFileSync(join(src,'native.level.svgx'),serializeLevelSvgx(traceToDocument(raster)));
  const result=run('finalize',['--src',src,'--out',out]);assert.equal(result.status,0,result.stderr);
  for(const id of ['raster','native'])assert.equal(parseLevelSvgx(readFileSync(join(out,id+'.level.svgx'),'utf8')).version,'2');
});
test('Python seed annotations accept native SVGX, raster and an explicit legacy footprint boundary',t=>{
  const dir=directory(t),spec=join(dir,'labels.py'),out=join(dir,'labels.svgx');
  writeFileSync(spec,`ID='labels'\nNAME='Labels'\nGRID=1\nAREAS=[{'id':'west','label':'West Hall','seeds':[(2,3,1,1)],'ceiling':5},{'id':'east','label':'East Hall','seeds':[(12,3,1,1)],'ceiling':5}]\nDIRECTIVES=['mark attacker_spawn west attack "West Spawn"','mark site east neutral "East Site"','route west east 1 minDistance=2 maxDistance=40']\n`);
  const plan=`id: trace\ngrid: 1\nlayer ground z=0 height=5 roof=no\nlegend\n A room "Room" room\nend\nplan\n${Array(10).fill('A'.repeat(16)).join('\n')}\nend\n`;
  for(const [extension,source] of [['json',JSON.stringify(raster)],['svgx',serializeLevelSvgx(traceToDocument(raster))],['plan',plan]]){
    const path=join(dir,`trace.${extension}`);writeFileSync(path,source);
    const r=run('author',['labels',`--spec=${spec}`,`--traced=${path}`,`--out=${out}`],extension==='plan'?'source':true);assert.equal(r.status,0,r.stderr);
    const d=parseLevelSvgx(readFileSync(out,'utf8'));assert.equal(d.markers[0].label,'West Spawn');assert.equal(d.routes[0].minDistance,2);assert.equal(d.routes[0].maxDistance,40);assert.equal(d.routes[0].minRoutes,1);
  }
});
test('author rejects missing Python, unknown and abbreviated output options while preserving output',t=>{
  const dir=directory(t),spec=join(dir,'room.py'),out=join(dir,'room.svgx');writeFileSync(out,'previous');
  writeFileSync(spec,`ID='room'\nNAME='Room'\nAREAS=[{'id':'floor','rects':[(0,0,12,12)],'ceiling':4}]\n`);
  for(const args of [['--python',join(dir,'missing-python')],['--ou',out],['--output='+out],['--out'],['--mystery']]){
    const r=run('author',['room','--spec',spec,'--out',out,...args]);assert.notEqual(r.status,0);assert.equal(readFileSync(out,'utf8'),'previous');
  }
});
test('SVGX annotation without explicit grid and invalid seeds fail with actionable diagnostics',t=>{
  const dir=directory(t),spec=join(dir,'labels.py'),source=join(dir,'source.svgx'),out=join(dir,'labels.svgx');writeFileSync(out,'previous');
  writeFileSync(source,serializeLevelSvgx(traceToDocument(raster)));
  const body=`ID='labels'\nNAME='Labels'\nAREAS=[{'id':'absent','label':'Absent','seeds':[(40,40,1,1)],'ceiling':5}]\n`;
  writeFileSync(spec,body);let r=run('author',['labels','--spec',spec,'--traced',source,'--out',out]);assert.notEqual(r.status,0);assert.match(r.stderr,/requires explicit GRID/);
  writeFileSync(spec,body+'GRID=1\n');r=run('author',['labels','--spec',spec,'--traced',source,'--out',out]);assert.notEqual(r.status,0);assert.match(r.stderr,/seed missed the floor entirely; nearest floor/);assert.equal(readFileSync(out,'utf8'),'previous');
});
test('explicit legacy author and finalize retain plan output and raw Python draft APIs',t=>{
  const dir=directory(t),spec=join(dir,'room.py'),out=join(dir,'room.plan'),src=join(dir,'src'),dst=join(dir,'dst');mkdirSync(src);
  writeFileSync(spec,`ID='legacy_room'\nNAME='Room'\nDESCRIPTION='Legacy'\nGRID=1\nAREAS=[{'id':'floor','label':'Floor','rects':[(0,0,12,12)],'ceiling':4}]\n`);
  let r=run('author',['room','--spec',spec,'--legacy','--out',out],false);assert.equal(r.status,0,r.stderr);assert.match(readFileSync(out,'utf8'),/\r?\nlegend\r?\n/);
  const raw=spawnSync(process.env.PYTHON??'python3',[join(root,'tools/compose.py'),spec],{encoding:'utf8'});assert.equal(raw.status,0,raw.stderr);assert.equal(raw.stdout,readFileSync(out,'utf8'));
  writeFileSync(join(src,'room.plan'),raw.stdout);r=run('finalize',['room','--legacy','--src',src,'--out',dst],false);assert.equal(r.status,0,r.stderr);assert.match(readFileSync(join(dst,'room.plan'),'utf8'),/\r?\nlegend\r?\n/);
  const annotation=join(dir,'annotation.py');writeFileSync(annotation,`ID='raw_annotation'\nNAME='Room'\nDESCRIPTION='Legacy'\nAREAS=[{'id':'floor','label':'Floor','seeds':[(2,2,1,1)],'ceiling':4}]\n`);
  const annotated=spawnSync(process.env.PYTHON??'python3',[join(root,'tools/annotate.py'),out,annotation],{encoding:'utf8'});assert.equal(annotated.status,0,annotated.stderr);assert.match(annotated.stdout,/\r?\nplan\r?\n/);
});
test('an impossible optional Python composition portal is reported while its hard route survives',t=>{
  const dir=directory(t),spec=join(dir,'optional.py'),out=join(dir,'optional.svgx');
  writeFileSync(spec,`ID='optional_source'\nNAME='Optional source'\nDESCRIPTION='Three rooms'\nGRID=1\nWIDTH=24\nHEIGHT=10\nAREAS=[{'id':'a','label':'A','rects':[(0,0,8,10)],'ceiling':4},{'id':'c','label':'C','rects':[(8,0,8,10)],'ceiling':4},{'id':'b','label':'B','rects':[(16,0,8,10)],'ceiling':4}]\nPORTALS=[{'between':('a','b'),'width':2}]\nDIRECTIVES=['mark spawn a','mark site b','route a b 1']\n`);
  const legacy=run('author',['optional','--spec',spec,'--legacy','--out',join(dir,'optional.plan')],false);assert.equal(legacy.status,0,legacy.stderr);assert.match(legacy.stdout,/Omitted optional portal proposals: 0/);
  const native=run('author',['optional','--spec',spec,'--out',out]);assert.equal(native.status,0,native.stderr);assert.match(native.stderr,/optional Python portal omitted before validation.*no shared boundary/);
  assert.equal(parseLevelSvgx(readFileSync(out,'utf8')).routes[0].minRoutes,1);
});
test('public semantic API and JSON authoring require neither Python nor any legacy modules',t=>{
  const dir=directory(t),spec=join(dir,'source.json'),out=join(dir,'source.svgx');
  const p={format:'levelspec-semantic/2',id:'json_source',name:'JSON source',grid:1,layers:[{id:'ground',height:4}],areas:[{id:'room',rects:[[0,0,12,12]]}]};
  writeFileSync(spec,JSON.stringify(p));const r=run('author',['json','--spec',spec,'--python','unavailable-python','--out',out]);assert.equal(r.status,0,r.stderr);
  const code=`import assert from 'node:assert/strict';const {produceSemantic}=await import('levelspec/semantic');const r=await produceSemantic(${JSON.stringify(p)});assert.equal(r.report.passed,true);`;
  const api=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(hook),'--input-type=module','--eval',code],{cwd:root,encoding:'utf8',env:{...process.env,PYTHON:'unavailable-python'}});assert.equal(api.status,0,api.stderr);
  const gameplay=run('author',['gameplay','--spec',join(root,'examples/gameplay/floodgate.gameplay.json'),'--out',out]);assert.equal(gameplay.status,0,gameplay.stderr);assert.equal(parseLevelSvgx(readFileSync(out,'utf8')).routes[0].minRoutes,2);
});

test('native trace annotation raises areas across original material bands and retains grounded authored requirements',t=>{
  const dir=directory(t),spec=join(dir,'raised.py'),path=join(dir,'trace.svgx'),out=join(dir,'raised.svgx');
  const source=traceToDocument({...raster,colors:[[80,90,100],[150,160,170]],rows:Array.from({length:10},(_,y)=>Array(16).fill(y<5?0:1))});
  for(const layer of source.layers)for(const v of layer.vertices)v.z=2;
  source.markers=[{id:'old_spawn',kind:'spawn',layer:'ground',position:[3,3,2]},{id:'old_site',kind:'site',layer:'ground',position:[13,3,2]}];
  source.routes=[{id:'old_route',from:'old_spawn',to:'old_site',minRoutes:1,maxDistance:40}];source.covers=[{id:'old_box',layer:'ground',min:[2,6,2],max:[3,7,3]}];
  writeFileSync(path,serializeLevelSvgx(source));
  writeFileSync(spec,`ID='raised'\nNAME='Raised'\nGRID=1\nAREAS=[{'id':'west','seeds':[(2,3,1,1)]},{'id':'east','seeds':[(12,3,1,1)],'z':0.28}]\n`);
  const result=run('author',['raised','--spec',spec,'--traced',path,'--out',out]);assert.equal(result.status,0,result.stderr);
  const d=parseLevelSvgx(readFileSync(out,'utf8'));assert.deepEqual(d.player,source.player);assert.equal(d.routes[0].id,'old_route');assert.equal(d.routes[0].minRoutes,1);assert.equal(d.routes[0].maxDistance,40);assert.deepEqual(d.covers[0].min,source.covers[0].min);assert.deepEqual(d.covers[0].max,source.covers[0].max);
  assert.equal(d.markers.find(m=>m.id==='old_spawn')!.position[2],2);assert.equal(d.markers.find(m=>m.id==='old_site')!.position[2],2.28);
  assert.equal(new Set(d.layers.flatMap(l=>l.regions.filter(r=>r.area==='west').map(r=>r.material))).size,2);
  assert.ok(d.seams.length>0);assert.equal(d.links.length,0);for(const material of source.materials)assert.ok(d.materials.some(m=>m.id===material.id));
});

test('unknown optional Python portal references reject composition and annotation without replacing artifacts',t=>{
  const dir=directory(t),spec=join(dir,'typo.py'),out=join(dir,'typo.svgx'),traced=join(dir,'trace.json');writeFileSync(out,'prior artifact');writeFileSync(traced,JSON.stringify(raster));
  for(const annotation of [false,true])for(const pair of ["('typo','east')","('west','typo')"]){
    const areas=annotation?"[{'id':'west','seeds':[(2,3,1,1)]},{'id':'east','seeds':[(12,3,1,1)]}]":"[{'id':'west','rects':[(0,0,8,10)]},{'id':'east','rects':[(8,0,8,10)]}]";
    writeFileSync(spec,`ID='typo'\nNAME='Typo'\nGRID=1\nAREAS=${areas}\nPORTALS=[{'between':${pair},'width':2}]\nDIRECTIVES=['mark spawn west','mark site east','route west east 1']\n`);
    const result=run('author',['typo','--spec',spec,'--traced',traced,'--out',out]);assert.notEqual(result.status,0);assert.match(result.stderr,/portal\/0: unknown area typo/i);assert.equal(readFileSync(out,'utf8'),'prior artifact');
  }
});
