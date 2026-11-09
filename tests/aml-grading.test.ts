import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ray, Vector3 } from 'three';
import { compile, parseAml, collisionMesh } from 'levelspec';

/** Keeps a regular host grid so cross-sections have independently known sample coordinates. */
async function graded(declarations: string, placement = '') {
  return compile(parseAml(`<architecture version="1" id="grading" validation="premap"><terrain id="ground" columns="9" rows="9" heights="${Array(81).fill(0).join(' ')}" ${placement}/>${declarations}</architecture>`), { navigation: false });
}
/** Reads an authored grid station from final physical geometry without assuming index order. */
function height(level: Awaited<ReturnType<typeof graded>>, x: number, y: number): number {
  const positions = collisionMesh(level).positions, matches: number[] = [];
  for (let i = 0; i < positions.length; i += 3) if (Math.abs(positions[i] - x) < 1e-7 && Math.abs(positions[i + 1] - y) < 1e-7) matches.push(positions[i + 2]);
  assert.ok(matches.length, `Missing physical sample at ${x},${y}`);
  assert.ok(matches.every(z => Math.abs(z - matches[0]) < 1e-7)); return matches[0];
}
function valid(level: Awaited<ReturnType<typeof graded>>) { assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []); }
const road = '<path id="road" points="1 4 1; 7 4 4"/><grade id="road-grade" host="ground" path="road" width="2" cross-slope="0.25" transition="2"/>';

test('grading preserves the exact center profile and signed left cross-slope while leaving distant host unchanged', async () => {
  const level = await graded(road); valid(level);
  // At station x=4, longitudinal height is 2.5; the left side of +X is +Y.
  for (const [y, expected] of [[3, 2.25], [4, 2.5], [5, 2.75], [1, 0], [7, 0]]) assert.ok(Math.abs(height(level, 4, y) - expected) < 1e-7);
  assert.equal(height(level, 0, 0), 0); assert.equal(height(level, 8, 8), 0);
});

test('grading paths resolve in the terrain local frame before rotation and nonuniform scaling', async () => {
  const level = await graded(road, 'position="10 20 3" rotation="0 0 90" scale="2 1 2"'); valid(level);
  // Local (4,5,2.75) -> scaled(8,5,5.5), yaw90(-5,8,5.5), translated(5,28,8.5).
  assert.ok(Math.abs(height(level, 5, 28) - 8.5) < 1e-7);
});

test('crossing center profiles with contradictory elevations fail even when explicit order exists', async () => {
  const declarations = '<path id="east" points="1 4 1; 7 4 1"/><path id="north" points="4 1 2; 4 7 2"/><grade id="east-grade" host="ground" path="east" width="1" order="1"/><grade id="north-grade" host="ground" path="north" width="1" order="2"/>';
  const rejected = await graded(declarations);
  assert.ok(rejected.diagnostics.some(d => d.severity === 'error' && d.objects.includes('east-grade') && d.objects.includes('north-grade')));
  valid(await graded(road));
});

test('linear road transitions extend outside fixed endpoints and blend shoulders into the prior host', async () => {
  const level = await graded('<path id="road" points="2 4 2; 6 4 2"/><grade id="road-grade" host="ground" path="road" width="2" transition="2" start-transition="2" end-transition="2"/>'); valid(level);
  for (const [x, y, expected] of [[4,3,2], [4,2,1], [4,1,0], [4,6,1], [2,4,2], [1,4,1], [0,4,0], [6,4,2], [7,4,1], [8,4,0]]) assert.ok(Math.abs(height(level,x,y)-expected)<1e-7, `Transition at ${x},${y}`);
});

test('overlapping shoulders need unique explicit priorities and apply them independently of XML source order', async () => {
  const paths = '<path id="low" points="1 2 2; 7 2 2"/><path id="high" points="1 6 4; 7 6 4"/>';
  const low = '<grade id="low-grade" host="ground" path="low" width="2" transition="2" order="1"/>', high = '<grade id="high-grade" host="ground" path="high" width="2" transition="2" order="2"/>';
  const first = await graded(paths + low + high), reversed = await graded(paths + high + low); valid(first); valid(reversed);
  assert.ok(Math.abs(height(first,4,4)-2.5)<1e-7, 'Second half-strength shoulder blends its height4 into prior height1');
  assert.equal(first.physicalHash,reversed.physicalHash); assert.deepEqual(collisionMesh(first),collisionMesh(reversed));
  for (const declarations of [low.replace(' order="1"','') + high.replace(' order="2"',''), low + high.replace('order="2"','order="1"')]) {
    const rejected = await graded(paths + declarations);
    assert.ok(rejected.diagnostics.some(d => d.severity==='error' && d.objects.includes('low-grade') && d.objects.includes('high-grade')));
  }
});

/** Vertical ray measures the final collision surface, including non-grid road constraints. */
function rayHeight(level: Awaited<ReturnType<typeof graded>>, x: number, y: number): number {
  const mesh = collisionMesh(level), ray = new Ray(new Vector3(x,y,100),new Vector3(0,0,-1)); let z = -Infinity;
  for (let i=0;i<mesh.indices.length;i+=3) {
    const [a,b,c]=mesh.indices.slice(i,i+3).map(index=>new Vector3(...mesh.positions.slice(index*3,index*3+3)));
    const hit=ray.intersectTriangle(a,b,c,false,new Vector3()); if(hit) z=Math.max(z,hit.z);
  }
  return z;
}

test('off-grid grading preserves a single upward terrain cover with exact road heights', async () => {
  const level=await graded('<path id="road" points="1 4.25 1; 7 4.25 4"/><grade id="road-grade" host="ground" path="road" width="1.5" cross-slope="0.2"/>'); valid(level);
  for(const [x,y,z] of [[3,4.25,2],[4,4.25,2.5],[4,4.75,2.6],[4,3.75,2.4]]) assert.ok(Math.abs(rayHeight(level,x,y)-z)<.011);
  const mesh=collisionMesh(level); let area=0;const faces=new Set<string>();
  for(let i=0;i<mesh.indices.length;i+=3){
    const p=mesh.indices.slice(i,i+3).map(index=>mesh.positions.slice(index*3,index*3+3));
    const signed=((p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]))/2;
    assert.ok(signed>0); area+=signed;
    const key=p.map(point=>point.join(',')).sort().join(';');assert.ok(!faces.has(key));faces.add(key);
  }
  assert.ok(Math.abs(area-64)<1e-7);
});

test('a curved variable-width road retains its authored center and crossfall at the symmetric midpoint', async () => {
  const document=parseAml(`<architecture version="1" id="curve" validation="premap"><terrain id="ground" columns="9" rows="9" heights="${Array(81).fill(0).join(' ')}"/><path id="road" points="1 3 1"><quadratic controls="4 5 2.5" to="7 3 4"/></path><path id="widths" points="0 1 0; 10 3 0"/><grade id="road-grade" host="ground" path="road" width-profile="widths" cross-slope="0.2"/></architecture>`), before=structuredClone(document);
  const level=await compile(document,{navigation:false});valid(level);
  // Quadratic t=.5: center(4,4,2.5), tangent+X. At .2m left, crossfall adds .04m.
  assert.ok(Math.abs(rayHeight(level,4,4)-2.5)<.011);assert.ok(Math.abs(rayHeight(level,4,4.2)-2.54)<.011);
  assert.deepEqual(document,before);
});

test('grading a holed patch never creates support across its declared void', async () => {
  const level=await compile(parseAml('<architecture version="1" id="hole" validation="premap"><profile id="patch" points="0 0; 8 0; 8 8; 0 8"><hole points="3 3; 3 5; 5 5; 5 3"/></profile><terrain id="ground" profile="patch"/><path id="road" points="1 4 1; 7 4 1"/><grade id="road-grade" host="ground" path="road" width="1"/></architecture>'),{navigation:false});valid(level);
  assert.equal(rayHeight(level,4,4),-Infinity);assert.ok(Math.abs(rayHeight(level,2,4)-1)<.011);
});

test('invalid grading hosts and transitions are source-linked failures with useful recovery', async () => {
  for(const attributes of ['host="missing" transition="1"','host="ground" transition="0"','host="ground" transition="-1"']){
    const level=await graded(`<path id="road" points="1 4 1; 7 4 1"/><grade id="bad" ${attributes} path="road" width="1"/>`);
    assert.ok(level.diagnostics.some(d=>d.severity==='error'&&d.objects.includes('bad')&&d.source));
  }
  valid(await graded(road));
});

test('grading cancellation and work limits preserve source context and next-compile recovery', async () => {
  const document=parseAml(`<architecture version="1" id="bounded" validation="premap"><terrain id="ground" columns="9" rows="9" heights="${Array(81).fill(0).join(' ')}"/>${road}</architecture>`),before=structuredClone(document),controller=new AbortController();let entered=false;
  await assert.rejects(compile(document,{navigation:false,signal:controller.signal,onProgress:stage=>{if(stage==='Grading road-grade'){entered=true;controller.abort();}}}),{name:'AbortError'});
  assert.equal(entered,true);
  const rejected=await compile(document,{navigation:false,limits:{gradingWork:1}});
  assert.ok(rejected.diagnostics.some(d=>d.severity==='error'&&d.objects.includes('road-grade')&&d.source&&/budget|limit|work/i.test(d.message)));
  valid(await compile(document,{navigation:false}));assert.deepEqual(document,before);
});

test('grading validates deformed world coordinates and refuses a ribbon that overlaps itself',async()=>{
  const enormous=await graded('<path id="road" points="1 4 6000000; 7 4 6000000"/><grade id="bad" host="ground" path="road" width="1"/>','scale="1 1 2"');
  assert.ok(enormous.diagnostics.some(d=>d.severity==='error'&&d.source&&/bound|finite|million|coordinate/i.test(d.message)));
  const folded=await graded('<path id="road" points="2 2 1; 6 2 1; 6 4 1; 2 4 1"/><grade id="bad" host="ground" path="road" width="3" transition="0.1"/>');
  assert.ok(folded.diagnostics.some(d=>d.severity==='error'&&d.objects.includes('bad')&&/fold|overlap|revers/i.test(d.message)));
  valid(await graded(road));
});
