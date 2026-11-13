#!/usr/bin/env node
/**
 * Prints the current compiler's geometry hash for level.aml so the art pass can
 * confirm that the retained accepted R08 build is still the same geometry.
 *
 *   node projects/ninefold-reboot/production/export-source.ts
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile, parseAml } from "../../../src/architecture/index.ts";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../level.aml");
const level = await compile(parseAml(await readFile(source, "utf8")), { surfaceContacts: "error" });
console.log(JSON.stringify({
  geometryHash: level.geometryHash,
  errors: level.diagnostics.filter((d) => d.severity === "error").map((d) => d.message),
}));
