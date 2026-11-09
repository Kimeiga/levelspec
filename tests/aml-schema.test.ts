import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseAml } from "levelspec";

test("published AML schema validates maintained sources and rejects unknown vocabulary", async context => {
  const available = spawnSync("xmllint", ["--version"]);
  if ((available.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
    context.skip("Optional xmllint XML Schema validator is unavailable."); return;
  }
  const schema = fileURLToPath(new URL("../schema/aml.xsd", import.meta.url));
  for (const file of ["examples/terrain-course.aml", "examples/circulation.aml", "examples/daiban.aml", "examples/cli-starter.aml", "examples/architecture-cad.aml", "examples/showcase.aml", "examples/dust2.aml", "examples/rooftop-reference.aml", "website/demo.aml"]) {
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
