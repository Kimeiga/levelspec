import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseAml, serializeAml } from "levelspec";

test("published AML schema validates maintained sources and rejects unknown vocabulary", async context => {
  const available = spawnSync("xmllint", ["--version"]);
  if ((available.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
    context.skip("Optional xmllint XML Schema validator is unavailable."); return;
  }
  const schema = fileURLToPath(new URL("../schema/aml.xsd", import.meta.url));
  for (const file of ["projects/dressing-demo/level.aml", "tests/fixtures/aml/terrain-course.aml", "tests/fixtures/aml/circulation.aml", "examples/daiban.aml", "src/cli/templates/starter.aml", "tests/fixtures/aml/architecture-cad.aml", "tests/fixtures/aml/showcase.aml", "examples/dust2.aml", "tests/fixtures/aml/rooftop-reference.aml", "website/demo.aml", "tests/fixtures/aml/span-dressing.aml", "tests/fixtures/aml/shop-dressing.aml"]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    parseAml(source);
    const result = spawnSync("xmllint", ["--nonet", "--noout", "--schema", schema, "-"], { input: source, encoding: "utf8" });
    assert.equal(result.status, 0, `${file}: ${result.stderr}`);
  }
  for (const source of ['<architecture id="missing-version"/>', '<level version="2" id="wrong-root"/>', '<architecture version="1" id="unknown"><box id="b" typo="true"/></architecture>']) {
    assert.throws(() => parseAml(source));
    assert.notEqual(spawnSync("xmllint", ["--nonet", "--noout", "--schema", schema, "-"], { input: source }).status, 0);
  }
});

test("published AML schema accepts normal-map materials with explicit or default strength", context => {
  const available = spawnSync("xmllint", ["--version"]);
  if ((available.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
    context.skip("Optional xmllint XML Schema validator is unavailable."); return;
  }
  const schema = fileURLToPath(new URL("../schema/aml.xsd", import.meta.url));
  for (const strength of ["", ' normal-scale="1.7"']) {
    const source = `<architecture version="1" id="normal-material"><material id="ground" normal-texture="textures/normal.png"${strength}/></architecture>`;
    const document = parseAml(source);
    assert.equal(document.materials[0].normalTexture, "textures/normal.png");
    for (const xml of [source, serializeAml(document)]) {
      const result = spawnSync("xmllint", ["--nonet", "--noout", "--schema", schema, "-"], { input: xml, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
  }
  const unknown = '<architecture version="1" id="normal-typo"><material id="ground" normal-textures="normal.png"/></architecture>';
  assert.throws(() => parseAml(unknown));
  const rejected = spawnSync("xmllint", ["--nonet", "--noout", "--schema", schema, "-"], { input: unknown });
  assert.equal(typeof rejected.status, "number");
  assert.notEqual(rejected.status, 0);
});

test("published AML schema accepts the default dressing theme and ground controls", context => {
  const available = spawnSync("xmllint", ["--version"]);
  if ((available.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
    context.skip("Optional xmllint XML Schema validator is unavailable."); return;
  }
  const schema = fileURLToPath(new URL("../schema/aml.xsd", import.meta.url));
  const source = '<architecture version="1" id="ground-defaults"><material id="concrete"/><dressing seed="layout"><floor host="floor" material="concrete" ground="patched" patch-size="2" material-size="7" relief="0.02" wetness="0.4" litter="0.2" repairs="0.5" tile-share="0.1" timber-share="0"/></dressing></architecture>';
  const document = parseAml(source);
  assert.equal(document.dressing!.theme, "kowloon-street@1");
  for (const xml of [source, serializeAml(document)]) {
    const result = spawnSync("xmllint", ["--nonet", "--noout", "--schema", schema, "-"], {input: xml, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
  }
});
