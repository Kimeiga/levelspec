import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { PNG } from "pngjs";
import {
  compile,
  parseAml,
  renderReference,
  validateForRuntime,
} from "../src/architecture/index.ts";

// Reference evidence is historical. New compiler captures belong in a fresh run.
const output = resolve(
  process.argv[2] ?? `generated/rooftop-reference-${Date.now()}`,
);
await mkdir(output, { recursive: true });
const source = "tests/fixtures/aml/rooftop-reference.aml";
const document = parseAml(await readFile(source, "utf8"));
const level = await compile(document, {
  floorGaps: "error",
  surfaceContacts: "error",
});
const report = await validateForRuntime(level, { sealed: true });
if (!report.passed)
  throw new Error(JSON.stringify(report.diagnostics, null, 2));
for (const view of document.references) {
  const rendered = renderReference(level, view);
  const png = new PNG({ width: rendered.width, height: rendered.height });
  png.data.set(rendered.rgba);
  await writeFile(resolve(output, basename(view.image)), PNG.sync.write(png), {
    flag: "wx",
  });
}
const acceptance = {
  version: 1,
  source,
  views: document.references.map((view) => view.id),
  stats: level.stats,
  validationPassed: report.passed,
};
await writeFile(
  resolve(output, "acceptance.json"),
  JSON.stringify(acceptance, null, 2) + "\n",
  { flag: "wx" },
);
console.log(JSON.stringify({ output, ...acceptance }, null, 2));
