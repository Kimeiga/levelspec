/** Validated AML radar tracing. */
import { join } from "node:path";
import { produceTrace } from "../src/tracing/native.ts";
import {
  argumentsFor,
  python,
  writeArtifact,
  canonicalArtifactPath,
} from "./producers/io.ts";

const forwarded = [
  "--id",
  "--name",
  "--cells",
  "--bands",
  "--grid",
  "--span",
  "--fill",
  "--white-cut",
  "--bg-tol",
  "--alpha-cut",
  "--smooth",
  "--min-band",
];
const { values, rest } = argumentsFor(process.argv.slice(2), [
  "--out",
  "--evidence",
  "--python",
  ...forwarded,
]);
const evidence = values.get("--evidence"),
  out = values.get("--out");
if (
  out &&
  evidence &&
  canonicalArtifactPath(out) === canonicalArtifactPath(evidence)
)
  throw new Error("--out and --evidence must resolve to different paths.");
const noCrop = rest.includes("--no-crop");
const args = rest.filter((a) => a !== "--no-crop");
if (args.length !== 1 || args[0].startsWith("-"))
  throw new Error(
    "usage: node tools/trace.ts <image> [tracer options] [--out path]",
  );
if (noCrop) args.push("--no-crop");
for (const name of forwarded)
  if (values.has(name)) args.push(name, values.get(name)!);
const script = join(import.meta.dirname, "trace_radar.py");
let text: string, rasterEvidence: string | undefined;
const raster = python(
  script,
  [...args, "--format", "raster"],
  values.get("--python"),
);
text = (await produceTrace(JSON.parse(raster))).text;
rasterEvidence = raster;
// Both sources have passed parsing and strict native publication before either write.
if (evidence) writeArtifact(evidence, rasterEvidence!);
if (out) {
  writeArtifact(out, text);
  console.log(`PASS ${out}`);
} else process.stdout.write(text);
