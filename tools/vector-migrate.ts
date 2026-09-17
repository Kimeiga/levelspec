import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { validateForRuntime as validateLegacy } from "../src/core/validate.ts";
import { migrateText } from "./migration/convert.ts";
import { compile } from "../src/vector/compiler.ts";
import { validateForRuntime } from "../src/vector/validate.ts";
const args = process.argv.slice(2),
  filter = args.find((x) => !x.startsWith("--")) ?? "",
  check = args.includes("--validate"),
  rows: any[] = [];
async function walk(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const e of await readdir(root, { withFileTypes: true })) {
    const p = join(root, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else if (p.endsWith(".plan") || (root === "levels" && p.endsWith(".json")))
      files.push(p);
  }
  return files.sort();
}
for (const path of [...(await walk("maps")), ...(await walk("levels"))].filter(
  (p) => p.includes(filter),
)) {
  try {
    const { document, text, legacy } = migrateText(
        await readFile(path, "utf8"),
        path.endsWith(".json"),
      ),
      target = join(
        "maps/vector",
        path.replace(/\.(plan|json)$/, ".level.svgx"),
      );
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text);
    const row: any = {
      source: path,
      target,
      regions: document.layers.reduce((s, l) => s + l.regions.length, 0),
      legacyDiagnostics: legacy.diagnostics
        .filter((d) => d.severity === "error")
        .map((d) => d.code),
    };
    if (check) {
      const previous = validateLegacy(legacy, { skipSealed: true });
      row.legacyPassed = previous.passed;
      row.legacyDiagnostics = previous.diagnostics.filter(
        (d) => d.severity === "error",
      );
      const level = await compile(document),
        report = await validateForRuntime(level);
      row.passed = report.passed;
      row.diagnostics = report.diagnostics.filter(
        (d) => d.severity === "error",
      );
      row.expectedFailure = !!document.expectFail;
    }
    rows.push(row);
    console.log(
      `${rows.length} ${path}${check ? " " + (row.passed ? "PASS" : "FAIL") : ""}`,
    );
  } catch (error) {
    rows.push({ source: path, error: (error as Error).message });
    console.log(`FAIL ${path}: ${(error as Error).message}`);
  }
}
await mkdir("generated", { recursive: true });
await writeFile(
  "generated/migration-report.json",
  JSON.stringify(rows, null, 2),
);
console.log(
  JSON.stringify({
    converted: rows.filter((r) => !r.error).length,
    errors: rows.filter((r) => r.error).length,
    validationFailures: rows.filter(
      (r) => r.passed === false && !r.expectedFailure,
    ).length,
    regressions: rows.filter((r) => r.legacyPassed && r.passed === false)
      .length,
  }),
);
if (
  rows.some(
    (r) => r.error || (check && r.passed === false && !r.expectedFailure),
  )
)
  process.exitCode = 1;
