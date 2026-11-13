import {test} from 'node:test';
import type {CompiledLevel} from '../src/vector/types.ts';
import {rayBlocked} from '../src/vector/validate.ts';
import assert from 'node:assert/strict';
import {ArchitectureBuilder,compile,parseAml,serializeAml,type V3} from 'levelspec';

function wall(b:ArchitectureBuilder,id:string,a:V3,c:V3){b.path(id+':path',[a,c]);return b.wall(id,id+':path',{height:3,thickness:.22,group:id+'.layer'});}
function walls(offset=.05){const b=new ArchitectureBuilder('alignment');wall(b,'first',[0,0,0],[2,0,0]);wall(b,'second',[2.1,offset,0],[4.1,offset,0]);return b;}
function flight(kind:'stairs'|'ramp'='stairs'){const b=new ArchitectureBuilder('flight-review');b.path('axis',[[1,0,0],[1,4,1.2]]);if(kind==='stairs')b.stairs('flight',{path:'axis',width:2,count:7});else b.ramp('flight',{path:'axis',width:2});return b;}
async function inspect(b:ArchitectureBuilder,onGeometry?:(level:CompiledLevel)=>void){const level=await compile(b.document,{navigation:false,floorGaps:false,surfaceContacts:false,onGeometry});assert.ok(level.diagnostics.every(d=>d.severity==='warning'));return level;}
function alignment(level:CompiledLevel){const findings=level.suggestions.filter(s=>s.code==='WALL_ALIGNMENT');assert.equal(findings.length,1);return findings[0];}
const suppress=(b:ArchitectureBuilder,s:CompiledLevel['suggestions'][number])=>b.document.reviewSuppressions.push({suggestion:s.id,fingerprint:s.fingerprint,reason:'Intentional architectural offset'});

test('native wall alignment reports measured source-linked faces before geometry-ready',async()=>{
  const b=walls();let early=false;const level=await inspect(b,level=>{early=level.suggestions.some(s=>s.code==='WALL_ALIGNMENT');});const finding=alignment(level);assert.equal(early,true);assert.equal(level.diagnostics.filter(d=>d.suggestion?.id===finding.id&&d.severity==='warning'&&d.review?.id===finding.id).length,1);assert.ok(Math.abs(finding.evidence.offset!-.05)<1e-7);assert.deepEqual([...finding.objects].sort(),['first','second']);assert.ok(finding.bounds&&finding.position&&finding.direction);
});
test('alignment measures wall faces and retains the exclusive2mm inclusive10cm bounds',async()=>{
  for(const [offset,expected]of [[.002,0],[.003,1],[.1,1],[.101,0]])assert.equal((await inspect(walls(offset))).suggestions.filter(s=>s.code==='WALL_ALIGNMENT').length,expected);
  const b=walls(0);const second=b.document.elements.find(e=>e.id==='second')!;if(second.kind!=='wall')throw new Error('wall');second.thickness=.32;assert.ok(Math.abs(alignment(await inspect(b)).evidence.offset!-.05)<.001);
});
test('alignment handles rotated and reversed native path directions without joining unrelated runs',async()=>{
  const b=walls();for(const p of b.document.paths.flatMap(path=>path.points)){const x=p[0];p[0]=-p[1];p[1]=x;}b.document.paths[1].points.reverse();assert.ok(Math.abs(alignment(await inspect(b)).evidence.offset!-.05)<1e-7);
  for(const mode of ['overlap','distant','stacked']){const b=walls(),points=b.document.paths[1].points;if(mode==='overlap'){points[0][0]=0;points[1][0]=2;}else for(const p of points)if(mode==='distant')p[0]+=1;else p[2]=4;assert.deepEqual((await inspect(b)).suggestions,[]);}
});
for(const kind of ['stairs','ramp']as const)test(`native ${kind} side reviews exclude entrances and measure actual nearby wall faces`,async()=>{
  const b=flight(kind),open=(await inspect(b)).suggestions.filter(s=>s.code==='FLIGHT_OPEN_SIDE');assert.equal(open.length,2);assert.ok(open.every(s=>s.evidence.length>=4&&s.evidence.length<4.3));
  wall(b,'left-wall',[-.21,0,0],[-.21,4,1.2]);wall(b,'right-wall',[2.11,0,0],[2.11,4,1.2]);const findings=(await inspect(b)).suggestions;const gaps=findings.filter(s=>s.code==='FLIGHT_WALL_GAP');assert.equal(gaps.length,1);assert.ok(Math.abs(gaps[0].evidence.offset!-.1)<.001);assert.equal(findings.filter(s=>s.code==='FLIGHT_OPEN_SIDE').length,0);
});
test('native flight side review respects partial spans, other storeys and inclusive25cm proximity',async()=>{
  const partial=flight();wall(partial,'partial',[-.11,0,0],[-.11,2,.6]);wall(partial,'upstairs',[2.11,0,10],[2.11,4,11.2]);const findings=(await inspect(partial)).suggestions.filter(s=>s.code==='FLIGHT_OPEN_SIDE');assert.equal(findings.length,2);assert.ok(findings.some(s=>s.evidence.length<3));
  for(const [x,code]of [[-.36,'FLIGHT_WALL_GAP'],[-.361,'FLIGHT_OPEN_SIDE']]as const){const b=flight();wall(b,'right',[2.11,0,0],[2.11,4,1.2]);wall(b,'left',[x,0,0],[x,4,1.2]);assert.equal((await inspect(b)).suggestions[0].code,code);}
});
test('exact review suppressions serialize without changing geometry and reactivate only on relevant changes',async()=>{
  const b=walls(),before=structuredClone(b.document),initial=await inspect(b),finding=alignment(initial);assert.deepEqual(b.document,before);suppress(b,finding);
  const parsed=parseAml(serializeAml(b.document));const suppressed=await compile(parsed,{navigation:false,floorGaps:false,surfaceContacts:false});assert.equal(alignment(suppressed).state,'suppressed');assert.ok(!suppressed.diagnostics.some(d=>d.suggestion?.id===finding.id));assert.equal(suppressed.geometryHash,initial.geometryHash);assert.deepEqual(suppressed.mesh,initial.mesh);
  b.document.materials.push({id:'paint',color:'#aabbcc',repeat:1,roughness:1,metalness:0});b.document.elements[0].material='paint';b.document.elements[0].label='Reviewed';wall(b,'unrelated',[50,50,0],[55,50,0]);assert.equal(alignment(await inspect(b)).fingerprint,finding.fingerprint);
  b.document.paths[1].points.forEach(p=>p[1]=.06);const changedLevel=await inspect(b),changed=alignment(changedLevel);assert.ok(changedLevel.diagnostics.some(d=>d.suggestion?.id===finding.id));assert.equal(changed.id,finding.id);assert.notEqual(changed.fingerprint,finding.fingerprint);assert.equal(changed.state,'active');assert.equal(changed.suppression?.stale,true);
});
test('flight gap and open-side suppressions invalidate after a nearby physical barrier changes',async()=>{
  const b=flight();wall(b,'nearby',[-.21,0,0],[-.21,4,1.2]);const initial=(await inspect(b)).suggestions.find(s=>s.code==='FLIGHT_WALL_GAP')!;assert.ok(initial);suppress(b,initial);b.document.paths[1].points.forEach(p=>p[0]-=.03);const changed=(await inspect(b)).suggestions.find(s=>s.id===initial.id)!;assert.equal(changed.state,'active');assert.notEqual(changed.fingerprint,initial.fingerprint);
  const open=flight(),side=(await inspect(open)).suggestions.find(s=>s.position[0]===0)!;assert.ok(side);suppress(open,side);wall(open,'partial',[-.11,0,0],[-.11,2,.6]);const partial=(await inspect(open)).suggestions.find(s=>s.id===side.id)!;assert.equal(partial.state,'active');assert.ok(partial.evidence.length<side.evidence.length);
});
test('native XML rejects missing suppression reasons and duplicate findings; cancellation leaves later review usable',async()=>{
  const source=serializeAml(walls().document);assert.throws(()=>parseAml(source.replace('</architecture>','<review-suppression suggestion="finding" fingerprint="first" reason=" "/></architecture>')),/reason/i);
  const note='<review-suppression suggestion="finding" fingerprint="first" reason="Intentional"/>';assert.throws(()=>parseAml(source.replace('</architecture>',note+note+'</architecture>')),/duplicate.*suppression/i);
  await assert.rejects(compile(walls().document,{signal:AbortSignal.abort()}),{name:'AbortError'});assert.equal(alignment(await inspect(walls())).state,'active');
});

test('opt-in native parapets and railings cover their flight sides without inventing entrance barriers',async()=>{
  for(const construction of ['parapet','railing']as const){const b=flight();b.profile('bar',[[ -.02,-.02,0],[.02,-.02,0],[.02,.02,0],[-.02,.02,0]]);for(const side of ['left','right']as const)b.enclosure(side,'flight',{side,construction,height:1,...(construction==='railing'?{rails:[{profile:'bar',topOffset:0}],posts:{profile:'bar',maximumSpacing:1}}:{})});assert.equal((await inspect(b)).suggestions.filter(s=>s.code==='FLIGHT_OPEN_SIDE').length,0);}
});

test('native side apertures frame their actual partial open span while separate sub-threshold slits stay separate',async()=>{
  for(const tiny of [false,true]){const b=flight();wall(b,'left',[-.11,0,0],[-.11,4,1.2]);wall(b,'right',[2.11,0,0],[2.11,4,1.2]);for(const [i,start]of (tiny?[1,2,3]:[1]).entries())b.opening('cut-'+i,'left',{mode:'notch',center:[start+(tiny?.0005:1),1.5],width:tiny?.001:2,height:3});const findings=(await inspect(b)).suggestions.filter(s=>s.code==='FLIGHT_OPEN_SIDE');if(tiny)assert.deepEqual(findings,[]);else{assert.equal(findings.length,1);assert.ok(Math.abs(findings[0].evidence.length-2)<.02);assert.ok(Math.abs(findings[0].bounds.min[1]-1)<.02&&Math.abs(findings[0].bounds.max[1]-3)<.02);}}
});


test('partial native railing spans leave only their actual uncovered lengths and keep flight entrances open',async()=>{
  const b=flight('ramp');b.document.paths[0].points[1][2]=0;b.profile('bar',[[ -.02,-.02,0],[.02,-.02,0],[.02,.02,0],[-.02,.02,0]]);
  b.enclosure('partial','flight',{side:'left',construction:'railing',height:1,start:1,end:3,rails:[{profile:'bar',topOffset:0}],posts:{profile:'bar',maximumSpacing:1}});b.enclosure('right','flight',{side:'right',construction:'parapet',height:1});
  const level=await inspect(b),findings=level.suggestions.filter(s=>s.code==='FLIGHT_OPEN_SIDE');assert.equal(findings.length,1);const uncovered=4-(3-1)-2*.02;assert.ok(Math.abs(findings[0].evidence.length-uncovered)<1e-5,'Endpoint posts extend 2cm beyond each authored span end');
  assert.equal(rayBlocked(level,[-.3,.5,1],[.3,.5,1]),false);assert.equal(rayBlocked(level,[-.3,2,1],[.3,2,1]),true);assert.equal(rayBlocked(level,[-.3,3.5,1],[.3,3.5,1]),false);
  assert.equal(rayBlocked(level,[1,-.2,.5],[1,.3,.5]),false);assert.equal(rayBlocked(level,[1,3.7,.5],[1,4.2,.5]),false);
});
