import { it } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml, validateForRuntime, toRuntime, toGLB } from "levelspec";

it("authors, validates and exports an XML level through the package root", async () => {
  const document = parseAml(`<architecture version="1" id="public-room" validation="premap"><profile id="plan" points="0 0;6 0;6 6;0 6"/><slab id="floor" profile="plan"/></architecture>`);
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
