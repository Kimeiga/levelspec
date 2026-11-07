import { it } from "node:test";
import assert from "node:assert/strict";
import { compile, parseLevelSvgx, validateForRuntime, toRuntime, toGLB } from "levelspec/vector";

it("authors, validates and exports an XML level through the package root", async () => {
  const document = parseLevelSvgx(`<level version="2" id="public-room" validation="premap">
    <layer id="ground">
      <vertex id="a" x="0" y="0" z="0"/>
      <vertex id="b" x="6" y="0" z="0"/>
      <vertex id="c" x="6" y="6" z="0"/>
      <vertex id="d" x="0" y="6" z="0"/>
      <edge id="ab" from="a" to="b" kind="open"/>
      <edge id="bc" from="b" to="c" kind="open"/>
      <edge id="cd" from="c" to="d" kind="open"/>
      <edge id="da" from="d" to="a" kind="open"/>
      <region id="floor" boundary="ab bc cd da" fill="floor"/>
    </layer>
  </level>`);
  const level = await compile(document);
  const report = await validateForRuntime(level);
  assert.deepEqual(report.diagnostics.filter(diagnostic => diagnostic.severity === "error"), []);
  assert.equal(report.passed, true);
  assert.ok(level.mesh.indices.length > 0);
  assert.ok(level.navigation!.indices.length > 0);
  const runtime = JSON.parse(JSON.stringify(toRuntime(level)));
  assert.equal(runtime.id, "public-room");
  assert.equal(runtime.validation, "premap");
  assert.deepEqual(runtime.mesh.indices, level.mesh.indices);
  const glb = toGLB(level);
  assert.equal(new DataView(glb.buffer, glb.byteOffset, glb.byteLength).getUint32(0, true), 0x46546c67);
});
