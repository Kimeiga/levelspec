import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm, access, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile, parseLevelSvgx } from "levelspec";
import { bakeLighting } from "levelspec/lighting";

test("failed native lighting publication preserves a retryable destination and successful revisions", async () => {
  const temp = await mkdtemp(join(tmpdir(), "levelspec-lighting-"));
  try {
    const marker = join(temp, "fail-once");
    await writeFile(marker, "fail");
    const executable = join(temp, "fake-blender");
    await writeFile(executable, `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
if (args.includes('--output-dir')) {
  fs.mkdirSync(value('--output-dir'), { recursive: true });
  fs.writeFileSync(path.join(value('--output-dir'), 'results.json'), '{}');
} else {
  const output = value('--output');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'partial.txt'), 'native output');
  if (fs.existsSync(${JSON.stringify(marker)})) {
    fs.unlinkSync(${JSON.stringify(marker)});
    process.exit(3);
  }
  const payload = JSON.parse(fs.readFileSync(value('--input'), 'utf8'));
  fs.writeFileSync(path.join(output, payload.id + '.lighting.json'), JSON.stringify({ id: payload.id, complete: true }));
}
`, { mode: 0o755 });
    const source = await readFile(new URL("../examples/cli-starter.level.svgx", import.meta.url), "utf8");
    const level = await compile(parseLevelSvgx(source));
    const output = join(temp, "revision");
    await assert.rejects(bakeLighting(level, { output, blender: executable }), /Blender exited 3/);
    await assert.rejects(access(output), { code: "ENOENT" });
    const result = await bakeLighting(level, { output, blender: executable });
    assert.equal(result.complete, true);
    const published = await readFile(join(output, "source.runtime.json"), "utf8");
    assert.equal(JSON.parse(published).id, level.document.id);
    assert.deepEqual(JSON.parse(await readFile(join(output, "calibration.json"), "utf8")), {});
    await assert.rejects(bakeLighting(level, { output, blender: executable }), /Output already exists/);
    assert.equal(await readFile(join(output, "source.runtime.json"), "utf8"), published);
    assert.deepEqual((await readdir(temp)).sort(), ["fake-blender", "revision"]);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
