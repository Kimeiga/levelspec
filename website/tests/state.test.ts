import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sourceForCurve } from "../../tools/fixtures/courtyard/variants.ts";
import { parseAml, serializeAml } from "levelspec";
const template = readFileSync(new URL("../demo.aml", import.meta.url), "utf8");
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
