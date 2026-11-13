import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, parseAml } from "../src/architecture/index.ts";
import { kitFinishes } from "../src/dressing/kit.ts";

test("structural concrete binding is independent of wall paint and respects the declared finish", async () => {
  const level = await compile(parseAml(`<architecture version="1" id="concrete-binding">
    <material id="paint" color="#ffffff"/>
    <material id="substrate" color="#808080"/>
    <material id="kit-concrete" color="#ffffff" repeat="0.125" roughness="0.73" metalness="0.12" texture="authored.png" normal-texture="authored-normal.png" normal-scale="0.6" metallic-roughness-texture="authored-pbr.png"/>
    <path id="axis" points="0 0 0; 4 0 0"/>
    <wall id="wall" path="axis" thickness="0.2" height="3" material="paint"/>
  </architecture>`), { navigation: false });
  const before = structuredClone(level.document.materials);
  for (const [prefix, substrates, expected] of [
    ["kit", ["substrate"], "kit-concrete"],
    [undefined, ["substrate"], "builtin:concrete"],
    [undefined, [], "builtin:concrete"],
  ] as const) {
    const { materials } = kitFinishes(level, prefix, "paint", [...substrates]);
    assert.equal(materials.concrete, expected);
    assert.equal(materials.wall, "paint");
  }
  assert.deepEqual(level.document.materials.filter(material => !material.id.startsWith("builtin:")), before, "binding must not alter authored materials or UV scale");
});
