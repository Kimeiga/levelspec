import assert from "node:assert/strict";
import { test } from "node:test";
import { compile, parseAml, serializeAml, validateForRuntime } from "levelspec";
import { rayBlocked } from "../src/vector/validate.ts";

const roofs = `
<profile id="ground-plan" points="0 0; 10 0; 10 6; 0 6"/>
<profile id="low-plan" points="0 0; 5 0; 5 6; 0 6"/>
<profile id="high-plan" points="5 0; 10 0; 10 6; 5 6"/>
<slab id="floor" profile="ground-plan"/>
<roof id="low" profile="low-plan" elevation="3" thickness="0.25" playable="false"/>
<roof id="high" profile="high-plan" elevation="6" thickness="0.25" playable="false"/>`;

/** Uses public XML compilation; unrelated surface-contact policy is outside this heuristic. */
async function inspect(body: string) {
  return compile(parseAml(`<architecture version="1" id="envelope" validation="premap">\n${body}\n</architecture>`), { navigation: false, surfaceContacts: false });
}

test("an exposed roof step warns with source and spatial evidence; anchored closure removes it", async () => {
  const open = await inspect(roofs);
  const warning = open.diagnostics.find(diagnostic => diagnostic.code === "ROOF_STEP_OPEN")!;
  assert.equal(warning.severity, "warning");
  assert.deepEqual(warning.objects, ["low", "high"]);
  assert.ok(warning.relatedSources?.every(entry => entry.source?.line));
  assert.ok(warning.review?.position.every(Number.isFinite));
  assert.ok(warning.review!.bounds.min[2] >= 3 && warning.review!.bounds.max[2] <= 5.75);
  assert.ok(warning.review!.bounds.max[2] > warning.review!.bounds.min[2]);
  assert.equal(rayBlocked(open, [4.5, 3, 4], [5.5, 3, 4]), false, 'A warning must not fill the authored open step');
  assert.equal((await validateForRuntime(open)).passed, true);
  const closed = await inspect(roofs + `<path id="step" points="5 0 0; 5 6 0"/>
<wall id="closure" path="step" thickness="0.3" base-floor="low" top-floor="high" span-floors="true"/>`);
  assert.ok(!closed.diagnostics.some(diagnostic => diagnostic.code === "ROOF_STEP_OPEN"));
  assert.ok(!closed.diagnostics.some(diagnostic => diagnostic.severity === "error"));
  assert.equal(rayBlocked(closed, [4.5, 3, 4], [5.5, 3, 4]), true);
  const flat = await inspect(roofs.replace('elevation="6"', 'elevation="3"'));
  assert.ok(!flat.diagnostics.some(diagnostic => diagnostic.code === "ROOF_STEP_OPEN"));
});

test("wall overshoots warn while normal parapets and roof anchors remain quiet", async () => {
  const room = `<profile id="plan" points="0 0; 10 0; 10 6; 0 6"/>
<path id="axis" points="1 3 0; 9 3 0"/>
<slab id="floor" profile="plan"/>
<roof id="roof" profile="plan" elevation="6.9" thickness="0.25" playable="false"/>`;
  for (const [attributes, expected] of [
    ['height="9.5"', true],
    ['height="8"', false],
    ['base-floor="floor" top-floor="roof" span-floors="true"', false],
  ] as const) {
    const level = await inspect(room + `<wall id="wall" path="axis" thickness="0.3" ${attributes}/>`);
    const finding = level.diagnostics.find(diagnostic => diagnostic.code === "WALL_ABOVE_ROOF");
    assert.equal(!!finding, expected);
    if (finding) {
      assert.equal(finding.severity, "warning");
      assert.deepEqual(finding.objects, ["wall", "roof"]);
      assert.match(finding.message, /2\.60 m/);
      assert.equal(rayBlocked(level, [5, 2.5, 9], [5, 3.5, 9]), true, 'A warning must not trim the authored 9.5 m wall');
    }
  }
});

test("architectural acknowledgments suppress warnings without changing source geometry and expire on edits", async () => {
  const initial = await inspect(roofs), finding = initial.suggestions.find(finding => finding.code === "ROOF_STEP_OPEN")!;
  const document = parseAml(serializeAml(initial.architecture));
  document.reviewSuppressions.push({ suggestion: finding.id, fingerprint: finding.fingerprint, reason: "Intentional ventilation slot" });
  const source = serializeAml(document);
  const acknowledged = await compile(document, { navigation: false, surfaceContacts: false });
  assert.equal(serializeAml(document), source);
  assert.equal(acknowledged.physicalHash, initial.physicalHash);
  assert.deepEqual(acknowledged.mesh, initial.mesh);
  assert.ok(!acknowledged.diagnostics.some(diagnostic => diagnostic.code === "ROOF_STEP_OPEN"));
  const changed = await compile(parseAml(source.replace('elevation="6"', 'elevation="7"')), { navigation: false, surfaceContacts: false });
  assert.ok(changed.diagnostics.some(diagnostic => diagnostic.code === "ROOF_STEP_OPEN"));
  assert.equal(changed.suggestions.find(suggestion => suggestion.id === finding.id)?.suppression?.stale, true);
});

test("many unrelated walls cannot make heuristic review reject valid geometry", async () => {
  const walls = Array.from({ length: 900 }, (_, i) => `<path id="p${i}" points="${i * 3} 20 0; ${i * 3 + 1} 20 0"/><wall id="w${i}" path="p${i}" height="3" thickness="0.2"/>`).join("\n");
  const level = await inspect(roofs.replace('elevation="6"', 'elevation="3"') + walls);
  assert.ok(level.mesh.indices.length > 0);
  assert.ok(!level.diagnostics.some(diagnostic => diagnostic.severity === "error"), JSON.stringify(level.diagnostics));
});
