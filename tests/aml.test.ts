import { test } from "node:test";
import assert from "node:assert/strict";
import { Ray, Triangle, Vector3 } from "three";
import { parseAml, serializeAml, compile, collisionMesh, toRuntime, validateForRuntime, ArchitectureBuilder, type CompiledArchitecture } from "levelspec";

/** Intersects final collision triangles, including all contributors and proxies. */
function hits(level: CompiledArchitecture, origin: number[], direction: number[]) {
  const mesh = collisionMesh(level);
  const ray = new Ray(new Vector3(...origin), new Vector3(...direction).normalize());
  const distances: number[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [a, b, c] = mesh.indices.slice(i, i + 3).map(index => new Vector3(...mesh.positions.slice(index * 3, index * 3 + 3)));
    const point = ray.intersectTriangle(a, b, c, false, new Vector3());
    if (point) distances.push(point.distanceTo(ray.origin));
  }
  return distances;
}

const room = `<architecture version="1" id="room" validation="premap">
  <path id="wall-path" points="0 0 0; 6 0 0"/>
  <profile id="footprint" points="0 0; 6 0; 6 4; 0 4"/>
  <assembly id="shell">
    <wall id="wall" path="wall-path" thickness="0.2" height="3"/>
    <slab id="floor" profile="footprint" thickness="0.2"/>
  </assembly>
  <opening id="window" host="wall" shape="circle" center="3 1.5" radius="0.6"/>
</architecture>`;

test("AML public XML round trip retains native objects and cuts final collision", async () => {
  const document = parseAml(room);
  assert.equal(document.version, "1");
  assert.equal(document.elements[0].kind, "assembly");
  const level = await compile(parseAml(serializeAml(document)), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === "error"), []);
  assert.equal(hits(level, [3, -1, 1.5], [0, 1, 0]).length, 0);
  assert.equal(hits(level, [3, 1, 1.5], [0, -1, 0]).length, 0);
  assert.ok(hits(level, [3.5, -1, 2], [0, 1, 0]).length > 0, "The bounding square's corner must remain solid");
  assert.ok(hits(level, [4, -1, 1.5], [0, 1, 0]).length > 0);
  assert.ok(hits(level, [3, 2, 1], [0, 0, -1]).some(distance => Math.abs(distance - 1) < 1e-6));
  assert.equal(level.provenance.wall.assembly, "shell");
  assert.ok(level.provenance.window.source?.line);
  assert.equal(toRuntime(level).version, "4");
});

test("a hosted cut spans all host members but leaves an unrelated crossing solid", async () => {
  const source = `<architecture version="1" id="host-example" validation="premap">
    <assembly id="host"><box id="front" width="4" depth="0.2" height="3"/>
      <box id="back" width="4" depth="0.2" height="3" position="0 0.2 0"/></assembly>
    <opening id="door" host="host" shape="rectangle" center="2 1" width="1" height="2"/>
    <box id="crossing" width="0.2" depth="2" height="1.5" position="3 -1 0.25"/>
  </architecture>`;
  const level = await compile(parseAml(source), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === "error"), []);
  assert.equal(hits(level, [2, -1, 1], [0, 1, 0]).length, 0);
  assert.ok(hits(level, [3.1, -2, 1], [0, 1, 0]).length > 0);
  const crossed = await compile(parseAml(source.replace('position="3 -1 0.25"', 'position="1.9 -1 0.25"')), { navigation: false });
  assert.ok(hits(crossed, [2, -2, 1], [0, 1, 0]).length > 0, "A hosted opening must not cut unrelated geometry crossing its void");
  const distant = await compile(parseAml(source.replace('<box id="front"', '<box id="front" position="0 100 0"').replace('position="0 0.2 0"', 'position="0 100.2 0"')), { navigation: false });
  assert.deepEqual(distant.diagnostics, []);
  assert.equal(hits(distant, [2, 99, 1], [0, 1, 0]).length, 0, "Through depth brackets translated complete-host members");
});

test("profiles retain annular holes through final slab composition", async () => {
  const level = await compile(parseAml(`<architecture version="1" id="hole" validation="premap">
    <profile id="ring" points="0 0; 4 0; 4 4; 0 4"><hole points="1 1; 1 3; 3 3; 3 1"/></profile>
    <slab id="ring-slab" profile="ring" thickness="0.2"/>
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics.filter(d => d.severity === "error"), []);
  assert.equal(hits(level, [2, 2, 1], [0, 0, -1]).length, 0);
  assert.ok(hits(level, [.5, 2, 1], [0, 0, -1]).length > 0);
});

test("invalid XML and unknown vocabulary retain source diagnostics", () => {
  for (const source of ["<level version=\"2\"/>", "<architecture version=\"2\" id=\"bad\"/>", "<!DOCTYPE architecture [<!ENTITY x '1'>]><architecture version=\"1\" id=\"bad\"/>", "<architecture version=\"1\" id=\"bad\"><box id=\"b\" width=\"NaN\" depth=\"1\" height=\"1\"/></architecture>", "<architecture version=\"1\" id=\"bad\"><wall id=\"w\" typo=\"1\"/></architecture>"]) {
    assert.throws(() => parseAml(source), (error: unknown) => {
      const caught = error as { diagnostics: { source?: { line: number } }[] };
      assert.ok(caught.diagnostics.length);
      assert.ok(caught.diagnostics.every(d => d.source?.line));
      return true;
    });
  }
});

test("compilation leaves caller objects unchanged and recovers after cancellation", async () => {
  const document = parseAml(room), before = structuredClone(document);
  const controller = new AbortController();
  await assert.rejects(compile(document, { signal: controller.signal, onProgress: stage => { if (stage === "Composing") controller.abort(); } }), { name: "AbortError" });
  const level = await compile(document, { navigation: false });
  assert.deepEqual(document, before);
  assert.ok(level.mesh.indices.length);
});

test("editing a shared definition changes physical identity and preserves distinct instance ancestry", async () => {
  const source = `<architecture version="1" id="instances" validation="premap">
    <definition id="module"><box id="body" width="1" depth="1" height="1"/></definition>
    <instance id="one" ref="module"/><instance id="two" ref="module" position="3 0 0"/>
  </architecture>`;
  const first = await compile(parseAml(source), { navigation: false });
  const second = await compile(parseAml(source.replace('height="1"', 'height="2"')), { navigation: false });
  assert.notEqual(first.physicalHash, second.physicalHash);
  assert.deepEqual(first.provenance["one/body"].instances, ["one"]);
  assert.deepEqual(first.provenance["two/body"].instances, ["two"]);
  for (const x of [.5, 3.5]) {
    assert.ok(hits(first, [x, .5, 3], [0, 0, -1]).some(distance => Math.abs(distance - 2) < 1e-6));
    assert.ok(hits(second, [x, .5, 3], [0, 0, -1]).some(distance => Math.abs(distance - 1) < 1e-6));
  }
});

test("builder objects compile equivalently after XML serialization and retain slab scale and datums", async () => {
  const builder = new ArchitectureBuilder("builder");
  builder.document.validation = "premap";
  builder.document.datums.push({ id: "ground", elevation: 1 });
  builder.profile("footprint", [[0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]]);
  builder.slab("floor", "footprint", { elevation: { datum: "ground", offset: .2 }, thickness: .2, scale: [2, 2, 2] });
  const direct = await compile(builder.document, { navigation: false });
  const roundTrip = await compile(parseAml(serializeAml(builder.document)), { navigation: false });
  assert.deepEqual(direct.diagnostics, []);
  assert.equal(roundTrip.physicalHash, direct.physicalHash);
  assert.ok(hits(direct, [1, 1, 0], [0, 0, 1]).some(distance => Math.abs(distance - 2) < 1e-6));
  assert.ok(hits(direct, [1, 1, 3], [0, 0, -1]).some(distance => Math.abs(distance - .6) < 1e-6));
});

test("references, frame cycles, and resource limits fail with diagnostics and allow the next compile", async () => {
  for (const inner of [
    '<wall id="w" path="missing"/>',
    '<coordinate-frame id="a" frame="b"/><coordinate-frame id="b" frame="a"/><box id="b1" frame="a"/>',
    '<definition id="d"><instance id="self" ref="d"/></definition><instance id="i" ref="d"/>',
  ]) {
    const level = await compile(parseAml(`<architecture version="1" id="bad">${inner}</architecture>`), { navigation: false });
    assert.ok(level.diagnostics.some(d => d.severity === "error" && d.source?.line));
  }
  const limited = await compile(parseAml(room), { navigation: false, limits: { elements: 1 } });
  assert.ok(limited.diagnostics.some(d => d.code === "AML_COMPLEXITY"));
  assert.deepEqual((await compile(parseAml(room), { navigation: false })).diagnostics, []);
});

test("vertical sweeps, reflected slabs, and interior wall profile stations retain physical shape", async () => {
  const level = await compile(parseAml(`<architecture version="1" id="geometry" validation="premap">
    <path id="vertical" points="0 0 0; 0 0 3"/>
    <path id="line" points="0 3 0; 6 3 0"/>
    <path id="top" points="0 1 0; 3 3 0; 6 1 0"/>
    <profile id="square" points="-0.2 -0.2; 0.2 -0.2; 0.2 0.2; -0.2 0.2"/>
    <column id="column" path="vertical" profile="square"/>
    <wall id="profiled" path="line" top="top" thickness="0.2"/>
    <slab id="mirrored" profile="square" position="-2 0 0" scale="-1 1 1"/>
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  assert.ok(hits(level, [0, 0, 4], [0, 0, -1]).some(distance => Math.abs(distance - 1) < 1e-6));
  assert.ok(hits(level, [3, 3, 4], [0, 0, -1]).some(distance => Math.abs(distance - 1) < 1e-6));
  assert.ok(level.floors.some(floor => floor.region === "mirrored"));
});

test("visualization meshes change rendering but neither physical identity nor overlap findings", async () => {
  const asset = { positions: [[0, 0, 0], [1, 0, 0], [0, 1, 0]] as [number, number, number][], triangles: [[0, 1, 2]] as [number, number, number][] };
  const source = (visual: string) => parseAml(`<architecture version="1" id="visual" validation="premap">${visual}<box id="body"/></architecture>`);
  const plain = await compile(source(""), { navigation: false });
  const decorated = await compile(source('<visual-mesh id="visual-one" src="a.glb"/><visual-mesh id="visual-two" src="a.glb"/>'), { navigation: false, resolveAsset: async () => asset });
  assert.deepEqual(decorated.diagnostics, []);
  assert.equal(decorated.physicalHash, plain.physicalHash);
  assert.notEqual(decorated.renderHash, plain.renderHash);
  const csg = await compile(parseAml('<architecture version="1" id="invalid"><union id="u"><box id="b"/><visual-mesh id="v" src="a.glb"/></union></architecture>'), { navigation: false, resolveAsset: async () => asset });
  assert.ok(csg.diagnostics.some(d => d.severity === "error"));
});

test("builder assemblies adopt roots and hosted apertures follow the complete instance transform", async () => {
  const builder = new ArchitectureBuilder("adoption");
  const box = builder.box("body"); builder.assembly("body-assembly", [box]);
  assert.equal(builder.document.elements.length, 1);
  assert.deepEqual((await compile(builder.document, { navigation: false })).diagnostics, []);
  assert.throws(() => builder.assembly("duplicate-owner", [box]), /already belongs/);
  const level = await compile(parseAml(`<architecture version="1" id="scaled-host">
    <path id="axis" points="0 0 0; 6 0 0"/>
    <definition id="module"><wall id="wall" path="axis" thickness="0.2" height="3"/>
      <opening id="hole" host="wall" shape="circle" center="3 1.5" radius="0.6"/></definition>
    <instance id="scaled" ref="module" scale="2 2 2" position="1 0 0"/>
  </architecture>`), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  assert.equal(hits(level, [7, -1, 3], [0, 1, 0]).length, 0);
  assert.ok(hits(level, [7.9, -1, 3.9], [0, 1, 0]).length, "Scaled circle keeps its bounding-square corner solid");
  assert.ok(hits(level, [4, -1, 1.5], [0, 1, 0]).length, "The old unscaled aperture position is solid");
});

test("strict architectural floor gaps remain enforceable and dependent errors identify the wall", async () => {
  const source = `<architecture version="1" id="gaps" validation="premap">
    <profile id="a" points="0 0; 2 0; 2 2; 0 2"/><profile id="b" points="2 0; 4 0; 4 2; 2 2"/>
    <slab id="low" profile="a"/><slab id="high" profile="b" elevation="1"/>
  </architecture>`;
  const strict = await compile(parseAml(source), { navigation: false, floorGaps: "error" });
  assert.ok(strict.diagnostics.some(d => d.code === "FLOOR_EDGE_GAP" && d.severity === "error"));
  const disabled = await compile(parseAml(source), { navigation: false, floorGaps: false });
  assert.ok(!disabled.diagnostics.some(d => d.code === "FLOOR_EDGE_GAP"));
  const invalid = await compile(parseAml(`<architecture version="1" id="anchors">
    <profile id="p" points="0 0; 4 0; 4 2; 0 2"/><path id="axis" points="0 0 0; 4 0 0"/>
    <path id="bad-top" points="0 -1 0; 4 -1 0"/>
    <wall id="wall" path="axis" base-floor="floor" top="bad-top"/><slab id="floor" profile="p"/>
  </architecture>`), { navigation: false });
  assert.ok(invalid.diagnostics.some(d => d.objects.includes("wall") && d.source?.line === 4));
});

test("floor/soffit wall spans survive serialization and reject a conflicting fixed height", async () => {
  const source = `<architecture version="1" id="span" validation="premap">
    <profile id="footprint" points="0 0; 4 0; 4 2; 0 2"/><path id="axis" points="0 1 0; 4 1 0"/>
    <wall id="spanning" path="axis" base-floor="lower" top-floor="upper" span-floors="true"/>
    <slab id="lower" profile="footprint"/><slab id="upper" profile="footprint" elevation="3" thickness="0.2"/>
  </architecture>`;
  const level = await compile(parseAml(serializeAml(parseAml(source))), { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  const heights = level.mesh.surfaces.flatMap((surface, triangle) => level.surfaces[surface].object === "spanning"
    ? level.mesh.indices.slice(triangle * 3, triangle * 3 + 3).map(index => level.mesh.positions[index * 3 + 2]) : []);
  assert.ok(Math.abs(Math.max(...heights) - 2.8) < .000001);
  const conflict = await compile(parseAml(source.replace('span-floors="true"', 'span-floors="true" height="4"')), { navigation: false });
  assert.ok(conflict.diagnostics.some(diagnostic => diagnostic.objects.includes("spanning") && /fixed wall height/.test(diagnostic.message)));
});

test("a visualization-only floor cannot support required traversal; a native proxy restores it", async () => {
  const source = `<architecture version="1" id="support">
    <profile id="footprint" points="0 0; 6 0; 6 3; 0 3"/>
    <visual-mesh id="drawing" src="floor.glb"/>
    <marker id="start" element="physical" position="1 1.5 0" kind="spawn"/>
    <marker id="finish" element="physical" position="5 1.5 0" kind="objective"/>
    <route id="crossing" from="start" to="finish" min-routes="1" max-distance="6"/>
  </architecture>`;
  const resolveAsset = async () => ({ positions: [[0, 0, 0], [6, 0, 0], [6, 3, 0], [0, 3, 0]] as [number, number, number][], triangles: [[0, 1, 2], [0, 2, 3]] as [number, number, number][] });
  const visual = await compile(parseAml(source), { resolveAsset });
  assert.equal((await validateForRuntime(visual)).passed, false);
  assert.equal(collisionMesh(visual).indices.length, 0);
  const physical = await compile(parseAml(source.replace('</architecture>', '<slab id="physical" profile="footprint" visible="false"/></architecture>')), { resolveAsset });
  assert.equal((await validateForRuntime(physical)).passed, true);
  assert.ok(physical.navigation!.routes.find(route => route.id === "crossing")?.reachable);
});
