/**
 * Generate levels and check they hold up.
 *
 *   node tools/generate.ts            50 levels across the depth curve
 *   node tools/generate.ts 300        a bigger sweep
 *   node tools/generate.ts 50 --keep  also write specs + plans to generated/
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { generateLevel } from "../src/generate/vector.ts";
import { writeArtifact, argumentsFor } from "./producers/io.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { values, rest: args } = argumentsFor(process.argv.slice(2), ["--out"]);
const positional = args.filter((a) => !a.startsWith("--"));
if (positional.length > 1)
  throw new Error(
    "usage: node tools/generate.ts [count] [--keep] [--out directory]",
  );
const count = Number(positional[0] ?? 50);
if (!Number.isSafeInteger(count) || count < 1)
  throw new Error("count must be a positive integer.");
const keep = args.includes("--keep");
if (args.some((a) => a.startsWith("--") && a !== "--keep"))
  throw new Error("Unknown generation option.");

const C = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const byArch = new Map<string, number>();
const byTheme = new Map<string, number>();
let failures = 0;
let totalAttempts = 0;
let totalMs = 0;
let minRoutes = Infinity;
let solids = 0;
let samples = 0;
const failReasons: string[] = [];

const out = values.get("--out") ?? join(ROOT, "generated", "vector/levels");

for (let i = 0; i < count; i++) {
  const depth = 1 + (i % 8);
  const options = { seed: `sweep-${i}`, depth };
  const r = await generateLevel(options);
  if (!r.ok) {
    failures++;
    failReasons.push(...r.reasons.slice(0, 2));
    continue;
  }
  byArch.set(r.archetype, (byArch.get(r.archetype) ?? 0) + 1);
  byTheme.set(r.theme.id, (byTheme.get(r.theme.id) ?? 0) + 1);
  totalAttempts += r.attempts;
  totalMs += r.ms;
  minRoutes = Math.min(minRoutes, r.disjointRoutes);
  solids += r.level.parts.length;
  samples += r.report.navigation!.indices.length / 3;
  if (keep && i < 12) {
    writeArtifact(join(out, `${r.document.id}.aml`), r.text);
  }
}

const ok = count - failures;
console.log(`\n${C.bold("Generated")} ${ok}/${count} levels`);
console.log(
  `  ${C.dim("mean")} ${(totalAttempts / Math.max(1, ok)).toFixed(2)} attempts · ` +
    `${(totalMs / Math.max(1, ok)).toFixed(0)} ms · ${Math.round(solids / Math.max(1, ok))} solids · ` +
    `${Math.round(samples / Math.max(1, ok)).toLocaleString()} navmesh samples`,
);
console.log(
  `  ${C.dim("archetypes")} ${[...byArch].map(([k, v]) => `${k} ${v}`).join(" · ")}`,
);
console.log(
  `  ${C.dim("themes")} ${[...byTheme].map(([k, v]) => `${k} ${v}`).join(" · ")}`,
);
console.log(
  `  ${C.dim("routes")} every level had at least ${minRoutes === Infinity ? "-" : minRoutes} edge-disjoint ways to the exit`,
);
if (failures) {
  console.log(C.red(`  ${failures} level(s) could not be generated`));
  for (const r of failReasons.slice(0, 8)) console.log(C.red(`    ${r}`));
  process.exit(1);
}
console.log(
  C.green(
    "  every generated level compiled clean, baked clean, and has a loop.",
  ),
);
