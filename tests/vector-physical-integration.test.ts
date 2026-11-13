import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArchitectureBuilder,bakeNavmesh,compile,parseAml,serializeAml,validateForRuntime,type V3} from 'levelspec';
import {produceDocument} from 'levelspec/producers';
import {boxGeometry} from '../src/vector/props.ts';
import {floor,mouth,route,rectangle} from './fixtures/physical-architecture.ts';

function ladder(){
  const builder=new ArchitectureBuilder('ladder');floor(builder,'a',rectangle(0,0,12,12));floor(builder,'b',rectangle(0,0,12,12,4));route(builder,[6,6,0],[6,6,4],'a','b');builder.document.player.ladder=true;
  builder.document.links.push({id:'ladder',kind:'ladder',ability:'ladder',bidirectional:true,from:[6,6,0],to:[6,6,4],fromArea:'a',toArea:'b'});return builder.document;
}
test('native ability links retain their direction and coincident duplicate links share one capacity',async()=>{
  const d=ladder(),made=await produceDocument(d);assert.equal(made.text,serializeAml(d));assert.equal(made.physical.routes[0].physicalDisjointRoutes,1);
  d.links.push({...d.links[0],id:'duplicate'});assert.equal((await produceDocument(d)).physical.routes[0].physicalDisjointRoutes,1);
  d.links.push({...d.links[0],id:'reverse',from:d.links[0].to,to:d.links[0].from,fromArea:'b',toArea:'a'});assert.equal((await produceDocument(d)).physical.routes[0].physicalDisjointRoutes,1);
});
test('disabled abilities and reversed one-way native traversal remain rejected',async()=>{
  const d=ladder();d.player.ladder=false;await assert.rejects(produceDocument(d),/NAV|ROUTE|UNREACHABLE/);
  d.player.ladder=true;d.links[0].ability='unsupported';await assert.rejects(produceDocument(d),/NAV|ROUTE|UNREACHABLE|ability/i);
  d.links[0].ability='ladder';d.links[0].bidirectional=false;assert.equal((await produceDocument(d)).physical.routes[0].physicalDisjointRoutes,1);
  const made=await produceDocument(d);made.level.document.routes[0]={...d.routes[0],from:'end',to:'start'};
  const reversed=await validateForRuntime(made.level);
  assert.equal(reversed.navigation!.routes[0].reachable,false);
  assert.equal(reversed.navigation!.routes[0].disjointRoutes,0);
  assert.equal(reversed.passed,false);
});
function divided(){
  const builder=new ArchitectureBuilder('divided');floor(builder,'a',[[0,0,0],[8,0,0],[8,8,0],[16,8,0],[16,16,0],[0,16,0]]);floor(builder,'b',rectangle(8,0,8,8));floor(builder,'t',rectangle(16,0,8,16));
  mouth(builder,'ab-low','a','b',[[8,0,0],[8,8,0]]);mouth(builder,'ab-high','a','b',[[8,8,0],[16,8,0]]);mouth(builder,'at','a','t',[[16,8,0],[16,16,0]]);mouth(builder,'bt','b','t',[[16,0,0],[16,8,0]]);
  route(builder,[4,4,0],[20,4,0],'a','t',2);return builder;
}
test('native solids split intra-area route components while a visualization mesh cannot remove physical capacity',async()=>{
  const baseline=divided();assert.equal((await produceDocument(baseline.document)).physical.routes[0].physicalDisjointRoutes,2);
  for(const kind of ['box','wall','collision']){
    const b=divided();
    if(kind==='wall'){b.path('divider-axis',[[0,7.5,0],[8,7.5,0]]);b.wall('divider','divider-axis',{height:3,thickness:1});}
    else {const solid=b.box('divider',{position:[0,7,0],width:8,depth:1,height:3});if(kind==='collision')b.compose('collision','proxy',[solid]);}
    await assert.rejects(produceDocument(b.document),/PHYSICAL_ROUTE_REQUIREMENT/);assert.equal(b.document.routes[0].minRoutes,2);
  }
  const decorative=divided();decorative.add({kind:'visual-mesh',id:'drawing',src:'divider.glb'});
  assert.equal((await produceDocument(decorative.document,{resolveAsset:async()=>boxGeometry([0,7,0],[8,8,3])})).physical.routes[0].physicalDisjointRoutes,2);
});
test('an unrelated enabled link cannot excuse a blocked physical approach',async()=>{
  const b=divided();b.box('divider',{position:[0,7,0],width:8,depth:1,height:3});b.document.player.ladder=true;b.document.links.push({id:'unrelated',kind:'ladder',ability:'ladder',bidirectional:true,from:[18,3,0],to:[21,3,0],fromArea:'t',toArea:'t'});
  await assert.rejects(produceDocument(b.document),/PHYSICAL_ROUTE_REQUIREMENT/);
});
test('disconnected native floors sharing one logical area cannot alias physical components',async()=>{
  const b=new ArchitectureBuilder('disconnected-area');floor(b,'a-low',rectangle(0,0,8,8),'a');floor(b,'a-high',rectangle(8,8,8,8),'a');floor(b,'b',rectangle(8,0,8,8));floor(b,'t',rectangle(16,0,8,16));
  mouth(b,'ab-low','a-low','b',[[8,0,0],[8,8,0]]);mouth(b,'ab-high','a-high','b',[[8,8,0],[16,8,0]]);mouth(b,'at','a-high','t',[[16,8,0],[16,16,0]]);mouth(b,'bt','b','t',[[16,0,0],[16,8,0]]);route(b,[4,4,0],[20,4,0],'a-low','t',2);
  await assert.rejects(produceDocument(b.document),/ROUTE_REQUIREMENT/);b.document.markers[0].region='b';b.document.markers[0].position=[12,4,0];assert.equal((await produceDocument(b.document)).physical.routes[0].physicalDisjointRoutes,2);
});

/** Two supported areas share a long boundary; mouths declare only local crossing spans. */
function adjoining() {
  const builder = new ArchitectureBuilder('adjoining');
  floor(builder, 'a', rectangle(0, 0, 8, 16));
  floor(builder, 'b', rectangle(8, 0, 8, 16));
  route(builder, [4, 6.4, 0], [12, 6.4, 0], 'a', 'b');
  return builder;
}

test('supplied missing mouth paths are source errors even without navigation or routes', async () => {
  const builder = adjoining();
  builder.document.routes = [];
  builder.document.connections.push({ id: 'entrance', from: 'a', to: 'b', path: 'absent' });
  const document = parseAml(serializeAml(builder.document));
  const level = await compile(document, { navigation: false });
  const finding = level.diagnostics.find(diagnostic => diagnostic.severity === 'error' && diagnostic.objects.includes('entrance'));
  assert.ok(finding, 'A supplied nonexistent path is invalid source, independently of navigation');
  assert.deepEqual(finding.source, document.connections[0].source);
  assert.ok(finding.source!.line > 0);
  assert.equal(level.navigation, undefined);
});

test('omitted optional mouth paths remain inspectable nonblocking uncertainty', async () => {
  const builder = adjoining();
  builder.document.connections.push({ id: 'entrance', from: 'a', to: 'b' });
  const made = await produceDocument(builder.document);
  assert.equal(made.report.passed, true);
  const finding = made.report.diagnostics.find(diagnostic => diagnostic.code === 'CONNECTION_UNVERIFIED');
  assert.equal(finding?.severity, 'warning');
  assert.ok(finding?.objects.includes('entrance'));
  assert.ok(finding?.source?.line);
  assert.ok(finding?.review?.bounds);
  assert.ok(finding?.review?.position.every(Number.isFinite));
  assert.equal(made.report.navigation!.routes[0].reachable, true);
});

test('equivalent mouth declarations cannot inflate the required route count', async () => {
  const variants: V3[][] = [
    [[8, 1, 0], [8, 4, 0]],
    [[8, 4, 0], [8, 1, 0]],
    [[8, 3, 0], [8, 6, 0]],
  ];
  for (const duplicate of variants) {
    const builder = adjoining();
    mouth(builder, 'entrance', 'a', 'b', [[8, 1, 0], [8, 4, 0]]);
    mouth(builder, 'duplicate', 'a', 'b', duplicate);
    builder.document.routes[0].minRoutes = 2;
    const level = await compile(builder.document);
    assert.equal(level.navigation!.routes[0].reachable, true);
    assert.equal(level.navigation!.routes[0].disjointRoutes, 1);
    assert.equal(level.navigation!.routes[0].maximumDisjointRoutes, 1);
    assert.ok((await validateForRuntime(level)).diagnostics.some(diagnostic => diagnostic.code === 'PHYSICAL_ROUTE_REQUIREMENT' && diagnostic.severity === 'error'));
    await assert.rejects(produceDocument(builder.document), /PHYSICAL_ROUTE_REQUIREMENT/);
  }
  const separate = adjoining();
  mouth(separate, 'lower', 'a', 'b', [[8, 1, 0], [8, 4, 0]]);
  mouth(separate, 'upper', 'a', 'b', [[8, 12, 0], [8, 15, 0]]);
  separate.document.routes[0].minRoutes = 2;
  assert.equal((await produceDocument(separate.document)).physical.routes[0].physicalDisjointRoutes, 2);
});

test('a remote endpoint detour cannot satisfy a fully blocked local mouth', async () => {
  const builder = adjoining();
  mouth(builder, 'lower', 'a', 'b', [[8, 2, 0], [8, 4, 0]]);
  mouth(builder, 'upper', 'a', 'b', [[8, 12, 0], [8, 15, 0]]);
  builder.box('divider', { position: [7.5, 0, 0], width: 1, depth: 10, height: 3 });
  const level = await compile(builder.document);
  assert.equal(level.navigation!.routes[0].reachable, true, 'The endpoints still connect through the upper passage');
  const report = await validateForRuntime(level);
  const finding = report.diagnostics.find(diagnostic => diagnostic.code === 'CONNECTION_BLOCKED');
  assert.equal(finding?.severity, 'error');
  assert.ok(finding?.objects.includes('lower'));
  assert.ok(finding?.objects.includes('divider'));
  assert.ok(finding?.review?.bounds);
  assert.equal(report.passed, false);
});

test('a usable off-center mouth is verified or warned without a false physical failure', async () => {
  const builder = adjoining();
  mouth(builder, 'entrance', 'a', 'b', [[8, 0, 0], [8, 16, 0]]);
  // The 1.2 m gap leaves 0.7 m of center clearance for a 0.5 m diameter body.
  builder.box('lower-jamb', { position: [7.5, 0, 0], width: 1, depth: 5.8, height: 3 });
  builder.box('upper-jamb', { position: [7.5, 7, 0], width: 1, depth: 9, height: 3 });
  const made = await produceDocument(builder.document);
  const actual = made.report.navigation!.routes[0];
  assert.equal(actual.reachable, true);
  assert.equal(made.report.passed, true);
  if (actual.disjointRoutes < 1) {
    const finding = made.report.diagnostics.find(diagnostic => diagnostic.code === 'PHYSICAL_ROUTE_UNVERIFIED');
    assert.equal(finding?.severity, 'warning');
    assert.ok(finding?.review?.position.every(Number.isFinite));
  }
});

/** Native collision props provide a real ascent absent from authored floor guide elevations. */
function propSteps(builder: ArchitectureBuilder, first: number, increment: number, count: number) {
  for (let i = 0; i < count; i++) {
    builder.box(`up-${i}`, { position: [3, 7 - count + i, 0], width: 2, depth: 1, height: first + i * increment });
    builder.box(`down-${i}`, { position: [3, 8 + i, 0], width: 2, depth: 1, height: first + (count - 1 - i) * increment });
  }
}

test('flat source floors do not prove a route shortage when collision props provide ascent', async () => {
  const builder = divided();
  builder.document.markers[0].position = [2, 4, 0];
  builder.box('divider', { position: [0, 7, 0], width: 8, depth: 1, height: 1.4 });
  propSteps(builder, .2, .2, 6);
  builder.document.markers.push({ id: 'north', kind: 'poi', layer: 'architecture', region: 'a', position: [4, 15, 0] });
  builder.document.routes.push({ id: 'over-props', from: 'start', to: 'north', minRoutes: 1, maxDistance: 18 });
  const level = await compile(builder.document);
  const report = await validateForRuntime(level);
  assert.equal(report.navigation!.routes.find(actual => actual.id === 'over-props')!.reachable, true);
  assert.equal(report.passed, true);
  const actual = report.navigation!.routes.find(actual => actual.id === 'walk')!;
  if (actual.disjointRoutes < 2) assert.ok(report.diagnostics.some(diagnostic => diagnostic.code === 'PHYSICAL_ROUTE_UNVERIFIED'));
});

test('flat source floors do not prove a route shortage when lower support provides an underpass', async () => {
  const builder = divided();
  builder.document.profiles.find(profile => profile.id === 'a:profile')!.holes = [{ points: rectangle(3, 3, 2, 9) }];
  builder.document.markers[0].position = [2, 4, 0];
  builder.box('lintel', { position: [0, 7, .9], width: 8, depth: 1, height: 2.1 });
  builder.box('left-fill', { position: [0, 7, 0], width: 3, depth: 1, height: .9 });
  builder.box('right-fill', { position: [5, 7, 0], width: 3, depth: 1, height: .9 });
  // Four 0.3 m steps descend through the slab hole; the soffit has 2.1 m clearance below.
  for (let i = 0; i < 4; i++) {
    builder.box(`down-${i}`, { position: [3, 3 + i, -2], width: 2, depth: 1, height: 2 - .3 * (i + 1) });
    builder.box(`up-${i}`, { position: [3, 8 + i, -2], width: 2, depth: 1, height: 2 - .3 * (4 - i) });
  }
  builder.box('underpass', { position: [3, 7, -2], width: 2, depth: 1, height: .8 });
  builder.document.markers.push({ id: 'north', kind: 'poi', layer: 'architecture', region: 'a', position: [4, 14, 0] });
  builder.document.routes.push({ id: 'under-props', from: 'start', to: 'north', minRoutes: 1, maxDistance: 18 });
  const level = await compile(builder.document);
  const report = await validateForRuntime(level);
  const underpass = report.navigation!.routes.find(actual => actual.id === 'under-props')!;
  assert.equal(underpass.reachable, true);
  assert.ok(underpass.path!.some(point => point[2] < -.2), 'The endpoint path uses support below the source floor elevation');
  assert.equal(report.passed, true);
  assert.ok(!report.diagnostics.some(diagnostic => diagnostic.code === 'PHYSICAL_ROUTE_REQUIREMENT'));
});

test('same-height prop support outside authored floors can bypass an intra-area divider', async () => {
  const builder = divided();
  builder.box('divider', { position: [0, 7, 0], width: 8, depth: 1, height: 3 });
  builder.box('flat-detour', { position: [-2, 5, -.2], width: 2, depth: 5, height: .2 });
  builder.document.markers.push({ id: 'north', kind: 'poi', layer: 'architecture', region: 'a', position: [4, 12, 0] });
  builder.document.routes.push({ id: 'local-detour', from: 'start', to: 'north', minRoutes: 1 });
  const report = await validateForRuntime(await compile(builder.document));
  const detour = report.navigation!.routes.find(actual => actual.id === 'local-detour')!;
  assert.equal(detour.reachable, true);
  assert.ok(detour.path!.some(point => point[0] < 0), 'The endpoint path uses the prop beyond the authored floor boundary');
  assert.equal(report.passed, true);
  const actual = report.navigation!.routes.find(actual => actual.id === 'walk')!;
  if (actual.disjointRoutes < 2) {
    assert.ok(report.diagnostics.some(diagnostic => diagnostic.code === 'PHYSICAL_ROUTE_UNVERIFIED' && diagnostic.severity === 'warning'));
  }
});

test('body edits invalidate previously proven physical route cuts', async () => {
  const builder = divided();
  builder.document.markers[0].position = [2, 4, 0];
  builder.box('divider', { position: [0, 7, 0], width: 8, depth: 1, height: 1.6 });
  propSteps(builder, .6, .4, 3);
  const level = await compile(builder.document);
  const before = level.navigation!;
  assert.ok(before.diagnostics.some(diagnostic => diagnostic.code === 'PHYSICAL_ROUTE_REQUIREMENT'));
  level.document.player.step = .65;
  const after = await bakeNavmesh(level);
  assert.notEqual(after, before);
  assert.equal(after.routes[0].reachable, true);
  assert.equal(after.passed, true, 'The larger step can reach raised support, so the earlier flat-domain cut is no longer conclusive');
  assert.ok(!after.diagnostics.some(diagnostic => diagnostic.code === 'PHYSICAL_ROUTE_REQUIREMENT'));
  assert.equal(await bakeNavmesh(level), after);
});

test('a raised crossing at the declared mouth is not a proven local obstruction', async () => {
  const builder = new ArchitectureBuilder('raised-mouth');
  floor(builder, 'a', rectangle(0, 0, 8, 7.5));
  floor(builder, 'b', rectangle(0, 7.5, 8, 8.5));
  mouth(builder, 'entrance', 'a', 'b', [[0, 7.5, 0], [8, 7.5, 0]]);
  route(builder, [4, .5, 0], [4, 15, 0], 'a', 'b');
  builder.box('divider', { position: [0, 7, 0], width: 8, depth: 1, height: 1.4 });
  propSteps(builder, .2, .2, 6);
  const level = await compile(builder.document);
  assert.equal(level.navigation!.routes[0].reachable, true, 'The only endpoint passage climbs over this same mouth');
  const report = await validateForRuntime(level);
  assert.equal(report.passed, true);
  assert.ok(!report.diagnostics.some(diagnostic => diagnostic.code === 'CONNECTION_BLOCKED'));
});
