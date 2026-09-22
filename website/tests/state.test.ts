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
  parseLevelSvgx,
  validateForRuntime,
} from "../../src/vector/index.ts";
const template = readFileSync(
  new URL("../demo.level.svgx", import.meta.url),
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
test("the fixture changes only one attribute", () => {
  assert.equal(sourceForCurve(template, 3), template);
  assert.equal(
    sourceForCurve(template, 6),
    template.replace('control="4 -3; 10 -3"', 'control="4 -6; 10 -6"'),
  );
  assert.ok(sourceForCurve(template, 0).includes('control="4 0; 10 0"'));
  assert.throws(() => sourceForCurve("no marker", 2));
  assert.throws(() => sourceForCurve(template + template, 2));
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
      parseLevelSvgx(sourceForCurve(template, curve)),
    );
    const result = await validateForRuntime(level, { sealed: true });
    assert.equal(
      result.passed,
      true,
      `curve=${curve}: ${JSON.stringify(result.diagnostics)}`,
    );
    assert.ok(level.mesh.indices.length > 0);
    assert.equal(
      level.document.layers.reduce(
        (sum, layer) => sum + layer.regions.length,
        0,
      ),
      15,
    );
  }
});
