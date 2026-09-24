import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import {
  compile,
  compareReference,
  compareReferenceRasters,
  parseLevelSvgx,
  renderReference,
  validateForRuntime,
} from "../src/vector/index.ts";

describe("rooftop multi-view reference acceptance", () => {
  it("matches all checked-in views using the actual compiled mesh", async () => {
    const source = await readFile("examples/rooftop-reference.level.svgx", "utf8"),
      level = await compile(parseLevelSvgx(source), {
        navigation: false,
        floorGaps: "error",
        surfaceContacts: "error",
      });
    assert.deepEqual(
      level.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
      [],
    );
    const runtime = await validateForRuntime(level, { sealed: true });
    assert.equal(runtime.passed, true, JSON.stringify(runtime.diagnostics));
    assert.equal(level.document.references?.length, 3);
    for (const reference of level.document.references ?? []) {
      const alignment = compareReference(reference);
      assert.equal(alignment.compared, reference.landmarks.length);
      assert.ok((alignment.rmsPixels ?? Infinity) < 0.01);
      const expected = PNG.sync.read(
          await readFile(`reference/rooftop/${reference.image}`),
        ),
        actual = renderReference(level, reference);
      assert.equal(expected.width, reference.width);
      assert.equal(expected.height, reference.height);
      const comparison = compareReferenceRasters(
        actual.rgba,
        new Uint8Array(
          expected.data.buffer,
          expected.data.byteOffset,
          expected.data.byteLength,
        ),
      );
      assert.ok(
        comparison.differentFraction <= 0.001,
        `${reference.id}: ${JSON.stringify(comparison)}`,
      );
      assert.ok(
        comparison.meanAbsoluteChannelError <= 0.1,
        `${reference.id}: ${JSON.stringify(comparison)}`,
      );
      const visible = actual.surfaceIds.reduce(
        (count, surface) => count + (surface >= 0 ? 1 : 0),
        0,
      );
      assert.ok(
        visible > reference.width * reference.height * 0.08,
        `${reference.id}: render is unexpectedly empty`,
      );
    }
  });
});
