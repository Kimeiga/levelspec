import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCourtyard } from "../../tools/fixtures/courtyard/architecture.ts";
import {
  compile,
  parseAml,
  validateForRuntime,
} from "levelspec";
import { NavigationSurface } from "../../review/navigation-surface.ts";
const fixture = readFileSync(
  new URL("../demo.aml", import.meta.url),
  "utf8",
);
test("the default AML matches the live architectural authoring document", () => {
  const authored=(source:string)=>JSON.parse(JSON.stringify(parseAml(source),(key,value)=>key==="source"?undefined:value));
  assert.deepEqual(authored(fixture),authored(buildCourtyard({height:3})));
});
test("rooms, overhead bridge and details survive real compilation", async () => {
  const level = await compile(parseAml(fixture));
  const report = await validateForRuntime(level, { sealed: true });
  assert.equal(report.passed, true);
  assert.deepEqual(report.diagnostics, []);
  const names = [
    "entrance",
    "west-arcade",
    "north-arcade",
    "reading-room",
    "exhibition-room",
    "bridge",
    "skybridge",
    "west-balcony",
    "north-balcony",
    "studio",
    "library",
  ];
  for (const name of names) {
    assert.ok(level.floors.some((f) => f.region === name));
    assert.ok(report.navigation!.reachableRegions.includes(name));
  }
  const nav = new NavigationSurface(report.navigation!, [2, 2, 0]);
  const samples: [number, number, number][] = [
    [-9, 4, 0],
    [-3, 8, 0],
    [2, 16, 0],
    [2, 21, 0],
    [12, 21, 0],
    [10, 10.25, 3],
    [-3, 8, 3],
    [2, 16, 3],
    [2, 21, 3],
    [12, 21, 3],
  ];
  for (const point of samples)
    assert.ok(nav.locate(point), `Walkable location ${point}`);
  assert.ok(level.surfaces.some((s) => s.object === "bridge.hand.front"));
  assert.ok(level.surfaces.some((s) => s.object.startsWith("reading.shelf.")));
  assert.ok(level.surfaces.some((s) => s.role === "roof"));
  assert.equal(new Set(level.document.materials.map((m) => m.texture)).size, 6);
  for (const m of level.document.materials) {
    assert.ok(
      readFileSync(new URL("../assets/" + m.texture, import.meta.url)).length >
        0,
    );
  }
});
