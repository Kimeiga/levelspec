import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Triangle, Vector3 } from 'three';
import { compile, parseAml, serializeAml, collisionMesh, toRuntime, exportMetadata, validateForRuntime, type ArchitectureCompileOptions, type V3 } from 'levelspec';

/** Compiles public authoring XML with unrelated map assertions disabled unless requested. */
async function build(body: string, options: ArchitectureCompileOptions = {}) {
  return compile(parseAml(`<architecture version="1" id="volumes" validation="premap">${body}</architecture>`), { navigation: false, ...options });
}
/** Keeps advisory diagnostics separate from geometry/assertion failures. */
function valid(level: Awaited<ReturnType<typeof build>>): void { assert.deepEqual(level.diagnostics.filter(d => d.severity === 'error'), []); }
/** Measures a compiled footprint from its triangles, independently of source triangulation. */
function area(points: V3[], triangles: number[][]): number {
  return triangles.reduce((sum, triangle) => {
    const [a, b, c] = triangle.map(i => new Vector3(...points[i]));
    return sum + new Vector3().crossVectors(b.sub(a), c.sub(a)).length() / 2;
  }, 0);
}
const ground = '<profile id="floor" points="0 0; 30 0; 30 30; 0 30"/><slab id="floor-body" profile="floor"/>';
const square = '<profile id="square" points="0 0; 4 0; 4 4; 0 4"/>';
const slab = '<slab id="floor-body" profile="square" thickness="0.2"/>';

test('transformed holed rooms preserve world geometry and extrusion without inventing physical shells', async () => {
  const shape = '<profile id="room-plan" points="0 0; 4 0; 4 4; 0 4"><hole points="1 1; 1 3; 3 3; 3 1"/></profile>';
  const baseline = await build(ground); valid(baseline);
  for (const rotation of ['0 0 90', '90 0 0']) {
    const body = `${ground}${shape}<definition id="module"><room id="room" profile="room-plan" elevation="1" height="2"/></definition><instance id="placed" ref="module" position="10 20 3" rotation="${rotation}" scale="2 1 2"/>`;
    const document = parseAml(`<architecture version="1" id="volumes" validation="premap">${body}</architecture>`), before = structuredClone(document);
    const level = await compile(document, { navigation: false }); valid(level);
    const room = level.spatialVolumes!.find(volume => volume.id === 'placed/room')!; assert.ok(room);
    assert.equal(room.kind, 'room'); assert.equal(room.loops.length, 2); assert.ok(Math.abs(room.height - 4) < 1e-8);
    assert.ok(Math.abs(area(room.points, room.triangles) - 24) < 1e-7);
    const expected = rotation === '0 0 90' ? [0, 0, 4] : [0, -4, 0];
    room.extrusion.forEach((n, i) => assert.ok(Math.abs(n - expected[i]) < 1e-7));
    const hole = new Vector3(...(rotation === '0 0 90' ? [8, 24, 5] : [14, 18, 5]));
    assert.ok(room.triangles.every(triangle => !new Triangle(...triangle.map(i => new Vector3(...room.points[i])) as [Vector3, Vector3, Vector3]).containsPoint(hole)));
    if (rotation === '0 0 90') {
      assert.ok(room.points.every(point => Math.abs(point[2] - 5) < 1e-7));
      const bounds = [Math.min(...room.points.map(p => p[0])), Math.max(...room.points.map(p => p[0])), Math.min(...room.points.map(p => p[1])), Math.max(...room.points.map(p => p[1]))];
      bounds.forEach((bound, i) => assert.ok(Math.abs(bound - [6, 10, 20, 28][i]) < 1e-7));
    }
    assert.equal(level.physicalHash, baseline.physicalHash); assert.deepEqual(collisionMesh(level), collisionMesh(baseline));
    assert.deepEqual(level.provenance['placed/room'].instances, ['placed']); assert.deepEqual(document, before);
    const roundTrip = await compile(parseAml(serializeAml(document)), { navigation: false }); valid(roundTrip);
    const emitted = roundTrip.spatialVolumes!.find(volume => volume.id === 'placed/room')!;
    assert.deepEqual(emitted.points, room.points); assert.deepEqual(emitted.extrusion, room.extrusion);
  }
});

test('gameplay roles and named zones export as metadata while keeping physical and render identities unchanged', async () => {
  const base = `${square}${slab}`, baseline = await build(base); valid(baseline);
  const declarations = ['spawn', 'objective', 'trigger', 'out-of-bounds'].map(role => `<volume id="${role}" profile="square" height="2" role="${role}"/>`).join('');
  const level = await build(`${base}${declarations}<zone id="named-zone" profile="square" height="2" role="storage"/>`); valid(level);
  assert.deepEqual(level.spatialVolumes!.filter(volume => volume.kind === 'volume').map(volume => volume.role), ['spawn', 'objective', 'trigger', 'out-of-bounds']);
  assert.ok(level.spatialVolumes!.some(volume => volume.id === 'named-zone' && volume.kind === 'zone'));
  assert.equal(level.physicalHash, baseline.physicalHash); assert.equal(level.renderHash, baseline.renderHash);
  assert.deepEqual(toRuntime(level).spatialVolumes, level.spatialVolumes);
  assert.deepEqual(exportMetadata(level, ['glb']).spatialVolumes, level.spatialVolumes);
});

test('clearance allows exact floor and soffit contact but rejects physical interior intrusion', async () => {
  const base = `${square}${slab}<canopy id="bridge" profile="square" elevation="2.2" thickness="0.2"/>`;
  const clear = await build(`${base}<clearance id="passage" profile="square" elevation="0" height="2" require-support="true"/>`); valid(clear);
  const blocked = await build(`${base}<clearance id="passage" profile="square" elevation="0" height="2.01" require-support="true"/>`);
  assert.ok(blocked.diagnostics.some(d => d.severity === 'error' && d.objects.includes('passage') && d.objects.includes('bridge')));
  const barrier = await build(`${square}${slab}<collision id="barrier"><box id="barrier-body" width="0.2" depth="4" height="2" position="1.9 0 0"/></collision><clearance id="passage" profile="square" height="2"/>`);
  assert.ok(barrier.diagnostics.some(d => d.severity === 'error' && d.objects.includes('passage') && d.objects.some(id => id === 'barrier' || id === 'barrier-body')));
});

test('clearance holes exclude their voids and support assertions use only native physical floors', async () => {
  const ring = '<profile id="ring" points="0 0; 4 0; 4 4; 0 4"><hole points="1 1; 1 3; 3 3; 3 1"/></profile>';
  const holed = await build(`${square}${slab}${ring}<box id="in-void" width="1" depth="1" height="1" position="1.5 1.5 0"/><clearance id="annulus" profile="ring" height="2" require-support="true"/>`); valid(holed);
  const floorImage = { positions: [[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0]] as V3[], triangles: [[0, 1, 2], [0, 2, 3]] as [number, number, number][] };
  const body = `${square}<box id="far-support" width="1" depth="1" height="0.2" position="10 0 -0.2"/><visual-mesh id="floor-image" src="floor.glb"/><clearance id="passage" profile="square" height="2" require-support="true"/>`;
  const unsupported = await build(body, { resolveAsset: async () => floorImage });
  assert.ok(unsupported.diagnostics.some(d => d.severity === 'error' && d.objects.includes('passage')));
  const supported = await build(body + '<slab id="native-proxy" profile="square" visible="false"/>', { resolveAsset: async () => floorImage }); valid(supported);
});

test('visual ceilings do not obstruct a checked clearance but native invisible proxies do', async () => {
  const ceiling = { positions: [[0, 0, 1.5], [4, 0, 1.5], [4, 4, 1.5], [0, 4, 1.5]] as V3[], triangles: [[0, 1, 2], [0, 2, 3]] as [number, number, number][] };
  const body = `${square}${slab}<visual-mesh id="drawing" src="ceiling.glb"/><clearance id="passage" profile="square" height="2"/>`;
  const decorative = await build(body, { resolveAsset: async () => ceiling }); valid(decorative);
  const physical = await build(body + '<box id="native-proxy" width="4" depth="4" height="0.2" position="0 0 1.5" visible="false"/>', { resolveAsset: async () => ceiling });
  assert.ok(physical.diagnostics.some(d => d.severity === 'error' && d.objects.includes('passage') && d.objects.includes('native-proxy')));
});

test('playable zones bound required native coverage without requiring an unreachable outside hill', async () => {
  const body = '<terrain id="ground" columns="3" rows="2" cell-size="5 6" heights="0 0 8 0 0 8"/><profile id="play" points="0.5 0.5; 4.5 0.5; 4.5 5.5; 0.5 5.5"/><zone id="playable" profile="play" height="2" role="playable"/><marker id="start" kind="spawn" position="1 3 0"/><marker id="finish" kind="objective" position="4 3 0"/><route id="inside" from="start" to="finish" min-routes="1" max-distance="4"/>';
  const level = await build(body, { navigation: true });
  assert.equal((await validateForRuntime(level)).passed, true);
  assert.equal(level.navigation!.routes.find(route => route.id === 'inside')!.reachable, true);
  assert.ok(level.navigation!.positions.every((n, i) => i % 3 !== 0 || n <= 4.51));
  assert.ok(level.navigation!.positions.every((n, i) => i % 3 !== 2 || n < .1));
  assert.ok(Math.max(...collisionMesh(level).positions.filter((_, i) => i % 3 === 2)) >= 8, 'The outside hill remains physical geometry');
});

test('required route endpoints outside playable domains fail and disconnected domain unions cannot be bridged by physical floor', async () => {
  const floor = '<profile id="floor" points="0 0; 10 0; 10 6; 0 6"/><slab id="floor-body" profile="floor"/>';
  const markers = '<marker id="a" kind="spawn" position="2 3 0"/><marker id="b" kind="objective" position="8 3 0"/><route id="crossing" from="a" to="b" min-routes="1" max-distance="8"/>';
  const zones = '<profile id="left" points="0 0; 4 0; 4 6; 0 6"/><zone id="left-play" profile="left" height="2" role="playable"/>';
  const baseline = await build(floor + markers, { navigation: true }); assert.equal(baseline.navigation!.routes[0].reachable, true);
  const outside = await build(floor + markers + zones, { navigation: true });
  assert.equal(outside.navigation!.routes[0].reachable, false);
  const report = await validateForRuntime(outside);
  assert.ok([...outside.diagnostics, ...report.diagnostics].some(d => d.severity === 'error' && (d.objects.includes('b') || d.objects.includes('crossing'))));
  const separated = await build(floor + markers + zones + '<profile id="right" points="6 0; 10 0; 10 6; 6 6"/><zone id="right-play" profile="right" height="2" role="playable"/>', { navigation: true });
  assert.equal(separated.navigation!.routes[0].reachable, false, 'No invented navigation bridge through the excluded supported middle strip');
  assert.equal(collisionMesh(separated).indices.length, collisionMesh(baseline).indices.length);
});

test('land and water playable domains are independent metadata assertions', async () => {
  const body = '<profile id="bed" points="0 0; 10 0; 10 10; 0 10"/><slab id="bed-body" profile="bed"/><water id="lake" profile="bed" elevation="2"/><boat radius="1" draft="0.5" height="2"/><profile id="play" points="0 0; 4 0; 4 10; 0 10"/><slab id="dry-boardwalk" profile="play" elevation="5" thickness="0.2"/><zone id="land-play" profile="play" elevation="5" height="2" role="playable"/><marker id="a" kind="poi" position="2 5 2" movement="water"/><marker id="b" kind="poi" position="8 5 2" movement="water"/><route id="crossing" from="a" to="b" min-routes="1" max-distance="8" movement="water"/>';
  const independent = await build(body, { navigation: true }); assert.equal(independent.waterNavigation!.routes[0].reachable, true);
  const restricted = await build(body + '<zone id="water-play" profile="play" elevation="2" height="2" role="playable" movement="water"/>', { navigation: true });
  assert.equal(restricted.waterNavigation!.routes[0].reachable, false);
  assert.deepEqual(collisionMesh(restricted), collisionMesh(independent));
});

test('a closed solid containing a clearance is obstructing even without interior boundary faces', async () => {
  const level = await build('<profile id="inside" points="2 2; 3 2; 3 3; 2 3"/><box id="occupied" width="5" depth="5" height="5"/><clearance id="void" profile="inside" elevation="1" height="1"/>');
  assert.ok(level.diagnostics.some(d => d.severity === 'error' && d.objects.includes('void') && d.objects.includes('occupied')));
});

test('support around a clearance perimeter does not conceal an unsupported middle opening', async () => {
  const level = await build(`${square}<profile id="ring-floor" points="0 0; 4 0; 4 4; 0 4"><hole points="1.5 1.5; 1.5 2.5; 2.5 2.5; 2.5 1.5"/></profile><slab id="ring-body" profile="ring-floor"/><clearance id="passage" profile="square" height="2" require-support="true"/>`);
  assert.ok(level.diagnostics.some(d => d.severity === 'error' && d.code === 'AML_CLEARANCE_SUPPORT' && d.objects.includes('passage')));
});

test('playable volume tops never clip away a ceiling that obstructs the actual player body', async () => {
  const floor = '<profile id="floor" points="0 0; 10 0; 10 6; 0 6"/><slab id="floor-body" profile="floor"/>';
  const declarations = '<zone id="play" profile="floor" height="0.5" role="playable"/><marker id="a" kind="spawn" position="2 3 0"/><marker id="b" kind="objective" position="8 3 0"/><route id="crossing" from="a" to="b" min-routes="1" max-distance="8"/>';
  const baseline = await build(floor + declarations, { navigation: true });
  assert.equal(baseline.navigation!.routes[0].reachable, true);
  const blocked = await build(floor + '<box id="low-ceiling" width="10" depth="6" height="0.2" position="0 0 1.2"/>' + declarations, { navigation: true });
  assert.equal(blocked.navigation!.routes[0].reachable, false);
});

test('aggregate spatial query limits fail with source context and do not poison the next compile', async () => {
  const body = `${square}${slab}<clearance id="passage" profile="square" height="2" require-support="true"/>`;
  const document = parseAml(`<architecture version="1" id="bounded">${body}</architecture>`), before = structuredClone(document);
  const rejected = await compile(document, { navigation: false, limits: { spatialQueries: 1 } });
  assert.ok(rejected.diagnostics.some(d => d.severity === 'error' && d.objects.includes('passage') && /budget|limit|quer/i.test(d.message) && d.source));
  valid(await compile(document, { navigation: false })); assert.deepEqual(document,before);
});

test('empty spatial broad-phase queries still consume the shared bounded work budget', async () => {
  const perimeter = Array.from({ length: 40 }, (_, i) => `${1000 + 10 * Math.cos(i * Math.PI / 20)} ${1000 + 10 * Math.sin(i * Math.PI / 20)}`).join('; ');
  const patches = [0, 10, 20].map((x, i) => `<terrain id="patch-${i}" points="${x} 0 0; ${x + 1} 0 0; ${x} 1 0" triangles="0 1 2"/>`).join('');
  const body = `${patches}<profile id="far" points="${perimeter}"/><clearance id="distant" profile="far" height="1"/>`;
  const rejected = await build(body, { limits: { spatialQueries: 200 } });
  assert.ok(rejected.diagnostics.some(d => d.severity === 'error' && d.objects.includes('distant') && /budget|limit|quer/i.test(d.message) && d.source));
  valid(await build(body));
});
