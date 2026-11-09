import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeCurve,
  readState,
  sourceForCurve,
  writeState,
} from "../state.ts";
import {
  compile,
  parseAml,
  serializeAml,
  validateForRuntime,
} from "levelspec";
const template = readFileSync(
  new URL("../demo.aml", import.meta.url),
  "utf8",
);
test("URL inputs are bounded, finite and quantized", () => {
  assert.deepEqual(readState(""), {
    curve: 3,
    height: 3,
    blocked: false,
    look: "clay",
    step: 0,
    present: false,
  });
  assert.deepEqual(readState("?curve=6&step=2&present=1"), {
    height: 3,
    blocked: false,
    look: "clay",
    curve: 6,
    step: 2,
    present: true,
  });
  assert.deepEqual(readState("?curve=Infinity&step=Infinity&present=true"), {
    height: 3,
    blocked: false,
    look: "clay",
    curve: 3,
    step: 0,
    present: false,
  });
  assert.equal(readState("?curve=").curve, 3);
  assert.equal(readState("?curve=invalid").curve, 3);
  assert.equal(readState("?curve=900&step=999").curve, 6);
  assert.equal(readState("?curve=-900&step=-100").step, 0);
  assert.equal(normalizeCurve(2.63), 2.75);
  assert.equal(normalizeCurve(NaN), 3);
});
test("curve editing changes only the typed native courtyard control points",()=>{
  const original=parseAml(template),curve=original.paths.filter(path=>path.segments.some(segment=>segment.kind==='bezier'&&segment.controls.length===2&&segment.controls[0][0]===4&&segment.controls[1][0]===10));
  assert.equal(curve.length,1);
  const clean=(value:unknown)=>JSON.parse(JSON.stringify(value,(key,value)=>key==='source'?undefined:value));
  for(const value of [0,3,6]){
    const expected=structuredClone(original),path=expected.paths.find(path=>path.id===curve[0].id)!;
    const segment=path.segments.find(segment=>segment.kind==='bezier')!;assert.equal(segment.kind,'bezier');if(segment.kind!=='bezier')throw new Error('Expected authored Bezier');
    segment.controls=[[4,-value,0],[10,-value,0]];
    assert.deepEqual(clean(parseAml(sourceForCurve(template,value))),clean(expected));
  }
  const missing=structuredClone(original);missing.paths=missing.paths.filter(path=>path.id!==curve[0].id);
  assert.throws(()=>sourceForCurve(serializeAml(missing),2));
  const duplicate=structuredClone(original);duplicate.paths.push(structuredClone(curve[0]));assert.throws(()=>sourceForCurve(serializeAml(duplicate),2));
});
test("shared state round-trips without losing the base path", () => {
  const url = writeState(
    new URL("https://example.com/levelspec/?keep=1#playground"),
    {
      curve: 6,
      height: 3,
      blocked: false,
      look: "clay",
      step: 2,
      present: false,
    },
  );
  assert.equal(url.searchParams.get("keep"), "1");
  assert.equal(url.pathname, "/levelspec/");
  assert.equal(url.hash, "#playground");
  assert.deepEqual(readState(url.search), {
    height: 3,
    blocked: false,
    look: "clay",
    curve: 6,
    step: 2,
    present: false,
  });
});
test("all 25 slider positions pass unchanged runtime validation", async () => {
  for (let curve = 0; curve <= 6; curve += 0.25) {
    const level = await compile(
      parseAml(sourceForCurve(template, curve)),
    );
    const result = await validateForRuntime(level, { sealed: true });
    assert.equal(
      result.passed,
      true,
      `curve=${curve}: ${JSON.stringify(result.diagnostics)}`,
    );
    assert.ok(level.mesh.indices.length > 0);
    assert.equal(
      new Set(level.floors.map(floor=>floor.region)).size,
      15,
    );
  }
});
