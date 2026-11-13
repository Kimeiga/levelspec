import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArchitectureBuilder,compile,bakeNavmesh,validateForRuntime,parseAml,serializeAml,toRuntime,type V3} from 'levelspec';
import {auditNavigationCoverage} from '../src/vector/navigation-coverage.ts';
import {floor as addFloor,rectangle} from './fixtures/physical-architecture.ts';

function floor(b:ArchitectureBuilder,id:string,x:number,y:number,w:number,h:number,z=0,walls=false){const slab=addFloor(b,id,rectangle(x,y,w,h,z));slab.group='shared';if(walls){for(let i=0;i<4;i++){const points=rectangle(x,y,w,h,z);b.path(id+':wall-'+i+':path',[points[i],points[(i+1)%4]]);b.wall(id+':wall-'+i,id+':wall-'+i+':path',{height:3,thickness:.22,group:'shared'});}b.assembly(id+':shell',[...b.document.elements]);}return slab;}
function spawn(b:ArchitectureBuilder,id:string,position:V3){b.document.markers.push({id,layer:'shared',position,kind:'spawn'});}
function room(){const b=new ArchitectureBuilder('navigation');floor(b,'room',0,0,6,6,0,true);spawn(b,'start',[1,1,0]);return b;}
function wall(b:ArchitectureBuilder,id:string,a:V3,c:V3,height:number,thickness:number){b.path(id+':path',[a,c]);return b.wall(id,id+':path',{height,thickness,group:'shared'});}
function box(b:ArchitectureBuilder,id:string,min:V3,max:V3,dynamic=false){return b.box(id,{position:min,width:max[0]-min[0],depth:max[1]-min[1],height:max[2]-min[2],dynamic,group:'shared'});}
function ceiling(b:ArchitectureBuilder,height:number){const p=b.profile('ceiling-plan',rectangle(0,0,6,6));b.add({kind:'canopy',id:'ceiling',profile:p.id,elevation:height+.2,thickness:.2});}

test('native capsule navigation delivers geometry first and reuses only exact settings caches',async()=>{
  const stages:string[]=[];let early=false;const level=await compile(room().document,{onGeometry:l=>{early=!!l.mesh.indices.length&&!l.navigation;stages.push('geometry');},onProgress:s=>stages.push(s)});assert.ok(early);assert.equal(level.navigation!.passed,true);assert.ok(stages.indexOf('geometry')<stages.indexOf('Navigation'));
  assert.deepEqual([level.navigation!.settings.player.height,level.navigation!.settings.player.radius,level.navigation!.settings.cell,level.navigation!.settings.cellHeight],[2,.25,.0625,.01]);
  const cached=level.navigation!;assert.equal((await validateForRuntime(level)).navigation,cached);assert.equal(await bakeNavmesh(level),cached);level.document.player.height=2.1;assert.notEqual(await bakeNavmesh(level),cached);
  const geometry=await compile(room().document,{navigation:false});assert.equal(geometry.navigation,undefined);assert.equal((await validateForRuntime(geometry)).passed,true);assert.ok(geometry.navigation);
});

test('native headroom findings retain exact source identity through runtime and cache location refresh',async()=>{
  const b=room();ceiling(b,1.8);const slab=b.document.elements.flatMap(e=>'children'in e?e.children:[e]).find(e=>e.id==='room')!;if(slab.kind!=='slab')throw new Error('slab');slab.area='logical-room';const document=parseAml(serializeAml(b.document)),level=await compile(document),nav=level.navigation!,finding=nav.diagnostics.find(d=>d.code==='NAV_HEADROOM')!;assert.ok(finding);assert.deepEqual(finding.objects,['room','ceiling']);assert.ok(finding.relatedSources?.find(entry=>entry.object==='ceiling')?.source);assert.ok(finding.review?.position.every(Number.isFinite));assert.ok(finding.review!.bounds.max[0]<=6);assert.match(finding.message,/1\.800 m/);assert.deepEqual(finding.source,document.elements.flatMap(e=>'children'in e?e.children:[e]).find(e=>e.id==='room')!.source);assert.ok(finding.source!.line>0);assert.deepEqual(toRuntime(level).navigation!.diagnostics,nav.diagnostics);assert.equal(await bakeNavmesh(level),nav);
  const source={...finding.source!,line:999};level.provenance.room.source=source;assert.equal(await bakeNavmesh(level),nav);assert.deepEqual(nav.diagnostics.find(d=>d.code==='NAV_HEADROOM')!.source,source);level.provenance.ceiling.source={...source,line:1001};await bakeNavmesh(level);assert.equal(nav.diagnostics.find(d=>d.code==='NAV_HEADROOM')!.relatedSources?.find(entry=>entry.object==='ceiling')?.source?.line,1001);
});

test('native occupied footprints and ordinary capsule boundary margins do not invent narrow passages',async()=>{
  const b=room();box(b,'crate',[2,2,0],[3,3,1]);const nav=(await compile(b.document)).navigation!;assert.equal(nav.coverage.uncoveredCount,0);assert.ok(nav.coverage.excluded>0);assert.equal(nav.passed,true);
  for(const reversed of [false,true]){const b=new ArchitectureBuilder('corners');floor(b,'floor',-.25,-.25,6,6);if(reversed)b.document.profiles[0].outer.points!.reverse();spawn(b,'start',[2,2,0]);const nav=(await compile(b.document)).navigation!;assert.equal(nav.components,1);assert.equal(nav.coverage.uncoveredCount,0);assert.ok(nav.coverage.excluded>0);}
  const remote=new ArchitectureBuilder('phase');floor(remote,'floor',0,-.25,6,6);spawn(remote,'start',[3,2,0]);box(remote,'remote',[9.9,5.95,0],[10.1,6.15,1]);assert.equal((await compile(remote.document)).navigation!.coverage.uncoveredCount,0);
});

test('retaining walls preserve ordinary margins while an explicit climb remains blocked',async()=>{
  const b=new ArchitectureBuilder('retaining');b.document.player.radius=.35;b.document.player.height=1.8;floor(b,'low',0,0,4,6);floor(b,'high',4,0,2,6,.84);spawn(b,'low-start',[1,3,0]);spawn(b,'high-start',[5,3,.84]);wall(b,'retaining',[4,.05,0],[4,5.95,0],.83,.32);assert.equal((await compile(b.document)).navigation!.passed,true);b.document.routes.push({id:'cannot-climb',from:'low-start',to:'high-start',minRoutes:1});assert.ok((await validateForRuntime(await compile(b.document))).diagnostics.some(d=>d.code==='ROUTE_REQUIREMENT'));
});

test('actual floating wall and beam undersides retain headroom rather than being classified as floor margins',async()=>{
  const b=new ArchitectureBuilder('floating');b.document.player={...b.document.player,radius:.35,height:1.8,step:.3};floor(b,'room',0,0,6,6);wall(b,'sloped',[0,2.35,0],[6,2.35,.6],1.5,.2);const coverage=auditNavigationCoverage(await compile(b.document,{navigation:false}),{},()=>undefined);assert.ok(coverage.uncovered.some(s=>s.reason==='headroom'&&s.position[0]===5.25&&s.position[1]===2.25&&Math.abs(s.clearance!-.525)<.001));
  for(const base of [1.8,.46]){const b=room();box(b,'beam',[2,2,base],[4,4,base+.4]);const level=await compile(b.document);assert.ok(level.navigation!.coverage.uncovered.some(s=>s.reason==='headroom'));assert.ok((await validateForRuntime(level)).diagnostics.some(d=>d.code==='NAV_HEADROOM'));}
  const low=room();wall(low,'overhang',[3,2,.18],[3,4,.18],.8,.6);const nav=(await compile(low.document)).navigation!;assert.equal(nav.passed,true);assert.ok(nav.coverage.excluded>0);
});

test('same-position native storeys retain distinct support and use the upper slab underside for clearance',async()=>{
  for(const upper of [3,2.1]){const b=new ArchitectureBuilder('bridge');floor(b,'lower',0,0,6,6);floor(b,'upper',2,0,2,6,upper);spawn(b,'lowerSpawn',[1,3,0]);spawn(b,'upperSpawn',[3,3,upper]);const nav=(await compile(b.document)).navigation!;if(upper===3){assert.equal(nav.components,2);assert.equal(nav.coverage.uncoveredCount,0);assert.ok(nav.coverage.regions.every(r=>r.covered>0));}else{const bad=nav.coverage.uncovered.filter(s=>s.region==='lower'&&s.reason==='headroom');assert.ok(bad.length);assert.ok(bad.every(s=>Math.abs(s.clearance!-1.9)<.01));assert.ok(!nav.coverage.uncovered.some(s=>s.region==='upper'&&s.reason==='headroom'));}}
});

test('narrow branches and completely eroded floors fail actual width without a geometry bake error',async()=>{
  const b=new ArchitectureBuilder('branch');addFloor(b,'narrow',[[0,0,0],[4,0,0],[4,1.8,0],[7,1.8,0],[7,2.2,0],[4,2.2,0],[4,4,0],[0,4,0]]);spawn(b,'start',[2,2,0]);const nav=(await compile(b.document)).navigation!;assert.equal(nav.passed,false);assert.ok(nav.coverage.uncovered.some(s=>s.region==='narrow'&&s.reason==='width'));
  const narrow=new ArchitectureBuilder('eroded');floor(narrow,'hall',0,0,4,.4);spawn(narrow,'start',[1,.2,0]);spawn(narrow,'end',[3,.2,0]);narrow.document.routes.push({id:'blocked',from:'start',to:'end',minRoutes:1});const level=await compile(narrow.document);assert.equal(level.navigation!.indices.length,0);const report=await validateForRuntime(level);assert.ok(report.diagnostics.some(d=>d.code==='NAV_WIDTH'));assert.ok(report.diagnostics.some(d=>d.code==='ROUTE_REQUIREMENT'));assert.ok(!report.diagnostics.some(d=>d.code==='NAV_BAKE'));
  const beams=new ArchitectureBuilder('beams');beams.document.player.radius=.35;beams.document.player.height=1.8;floor(beams,'room',0,0,4,4);floor(beams,'branch',4,1.85,3,.8);spawn(beams,'start',[2,2,0]);box(beams,'south',[4,1.85,.6],[7,2.05,3]);box(beams,'north',[4,2.45,.6],[7,2.65,3]);
  const widthReport=await validateForRuntime(await compile(parseAml(serializeAml(beams.document))));
  const finding=widthReport.diagnostics.find(d=>d.code==='NAV_WIDTH')!;
  assert.deepEqual(new Set(finding.objects),new Set(['branch','south','north']));
  assert.ok(finding.relatedSources?.every(entry=>entry.source?.line));
  assert.match(finding.message,/0\.400 m/);
  assert.ok(finding.review!.bounds.min[0]>=4&&finding.review!.bounds.max[0]<=7);
});

test('sharp triangular tips are boundary margins rather than manufactured corridors',async()=>{
  const b=new ArchitectureBuilder('tip');addFloor(b,'triangle',[[0,0,0],[8,2,0],[0,4,0]]);spawn(b,'start',[1,2,0]);const nav=(await compile(b.document,{navigation:{cell:.125}})).navigation!;assert.equal(nav.passed,true);assert.ok(nav.coverage.excluded>0);
});

test('source stair risers above player step limits and steep surfaces remain physical traversal failures',async()=>{
  const stairs=new ArchitectureBuilder('step');stairs.path('axis',[[1.5,0,0],[1.5,4,3]]);stairs.stairs('flight',{path:'axis',width:3,count:4});const level=await compile(stairs.document);assert.ok(level.navigation!.coverage.uncovered.some(s=>s.reason==='step'));assert.ok((await validateForRuntime(level)).diagnostics.some(d=>d.code==='NAV_STEP'));
  const b=new ArchitectureBuilder('slope');floor(b,'start',0,0,4,4);floor(b,'island',8,0,4,4);addFloor(b,'steep',[[0,8,0],[2,8,4],[2,10,4],[0,10,0]]);spawn(b,'start',[1,1,0]);const nav=(await compile(b.document)).navigation!;assert.ok(nav.coverage.uncovered.some(s=>s.reason==='slope'));assert.ok(nav.unreachableRegions.includes('island'));
});

test('exact shared boundaries retain independent step and unexplained-support classifications',async()=>{
  for(const [rise,reason]of [[0,'uncovered'],[.8,'step']]as const){const b=new ArchitectureBuilder('seam');floor(b,'left',0,0,3.25,6);floor(b,'right',3.25,0,3.25,6,rise);const coverage=auditNavigationCoverage(await compile(b.document,{navigation:false}),{},()=>undefined);assert.ok(coverage.uncovered.some(s=>s.region==='right'&&s.position[0]===3.25&&s.position[1]===2.25&&s.reason===reason));assert.ok(coverage.uncovered.some(s=>s.region==='right'&&s.position[0]===4.25&&s.position[1]===2.25&&s.reason==='uncovered'));}
});

test('sealed dynamic reports, marker edits and cancellation remain separate from reusable open navigation',async()=>{
  const b=new ArchitectureBuilder('door');floor(b,'hall',0,0,8,2);spawn(b,'start',[1,1,0]);box(b,'door',[3.8,0,0],[4.2,2,3],true);const level=await compile(b.document),open=level.navigation!;assert.equal(open.passed,true);const sealed=await bakeNavmesh(level,{sealed:true});assert.equal(sealed.passed,false);assert.equal(level.navigation,open);assert.notEqual(sealed.settings.cacheKey,open.settings.cacheKey);
  level.document.markers[0].position=[50,50,0];const changed=await bakeNavmesh(level);assert.deepEqual(changed.unreachableMarkers,['start']);assert.notEqual(changed.settings.cacheKey,open.settings.cacheKey);assert.notEqual((await bakeNavmesh(level,{cell:.1})).settings.cacheKey,changed.settings.cacheKey);await assert.rejects(validateForRuntime(level,{signal:AbortSignal.abort()}),{name:'AbortError'});await assert.rejects(bakeNavmesh(level,{cell:0}),/positive/);
});

test('native declared traversal endpoint areas round-trip and unknown physical owners are rejected',async()=>{
  const b=new ArchitectureBuilder('link');floor(b,'a',0,0,4,4);floor(b,'b',6,0,4,4);b.document.links.push({id:'jump',kind:'jump',ability:'jump',bidirectional:true,from:[2,2,0],to:[8,2,0],fromArea:'a',toArea:'b'});const parsed=parseAml(serializeAml(b.document));assert.deepEqual(parsed.links.map(link=>[link.fromArea,link.toArea]),[['a','b']]);assert.ok(!(await compile(parsed,{navigation:false})).diagnostics.some(d=>d.code==='LINK_AREA'));parsed.links[0].toArea='missing';assert.ok((await compile(parsed,{navigation:false})).diagnostics.some(d=>d.severity==='error'&&(d.objects.includes('jump')||d.objects.includes('missing'))));
});

test('each failed region retains a blocker and inspection target after detailed samples reach their cap',async()=>{
  const b=new ArchitectureBuilder('many-clearance-failures');
  floor(b,'large',0,0,30,30);box(b,'large-ceiling',[0,0,1.7],[30,30,2]);
  floor(b,'later',40,0,3,3);box(b,'later-ceiling',[40,0,1.6],[43,3,2]);
  const level=await compile(parseAml(serializeAml(b.document)));
  assert.ok(level.navigation!.coverage.uncovered.length>0);
  assert.ok(level.navigation!.coverage.uncoveredCount>level.navigation!.coverage.uncovered.length,'The fixture must exhaust retained sample detail while preserving aggregate failures');
  const finding=level.navigation!.diagnostics.find(d=>d.code==='NAV_HEADROOM'&&d.objects.includes('later'))!;
  assert.ok(finding.objects.includes('later-ceiling'));
  assert.ok(finding.relatedSources?.every(entry=>entry.source?.line));
  assert.ok(finding.review!.bounds.min[0]>=40&&finding.review!.bounds.max[0]<=43);
});

test('failed physical analysis clears stale navigation and recovers with current body settings',async()=>{
  const level=await compile(room().document);
  const before=level.navigation;
  level.document.player.radius=.3;
  await assert.rejects(bakeNavmesh(level,{physicalWork:1}),/work budget/i);
  assert.equal(level.navigation,undefined);
  assert.equal(level.navigationSuggestionsStatus,'unavailable');
  assert.ok(!level.diagnostics.some(d=>d.code==='NAV_ISLAND'||d.code==='FLIGHT_NAV_MISSING'));
  const recovered=await bakeNavmesh(level);
  assert.notEqual(recovered,before);
  assert.equal(recovered.settings.player.radius,.3);
  assert.equal(recovered.passed,true);
});


test('sealed coverage stays informational unless a declared route or connection requires it',async()=>{
  const b=new ArchitectureBuilder('closed-state');
  floor(b,'hall',0,0,8,2);spawn(b,'start',[1,1,0]);spawn(b,'end',[7,1,0]);
  box(b,'door',[3.8,0,0],[4.2,2,3],true);
  const unrestricted=await validateForRuntime(await compile(b.document),{sealed:true});
  assert.equal(unrestricted.passed,true);
  b.document.routes.push({id:'required-crossing',from:'start',to:'end',minRoutes:1});
  const required=await validateForRuntime(await compile(b.document),{sealed:true});
  assert.equal(required.navigation!.routes[0].reachable,true);
  assert.equal(required.sealed!.routes[0].reachable,false);
  assert.equal(required.passed,false);
  assert.ok(required.diagnostics.some(d=>d.code==='ROUTE_REQUIREMENT'&&d.message.startsWith('Sealed:')));
});
