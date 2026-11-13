/** Profiles compilation without changing the published demo bundle. */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { profileDressing } from "./dressing-demo/profile.ts";
import { demoFingerprint } from "./dressing-demo/cache.ts";

const { values } = parseArgs({ options: {
  source: { type: "string", default: "projects/dressing-demo/level.aml" },
  preset: { type: "string", default: "kowloon" },
  host: { type: "string" },
  seconds: { type: "string", default: "120" },
  out: { type: "string", default: "generated/kowloon-profile" },
  workers: { type: "string" },
  cpu: { type: "boolean", default: false },
} });
if (values.preset !== "kowloon" && values.preset !== "blockout") throw new Error("Preset must be blockout or kowloon.");
const fingerprintBefore = await demoFingerprint(process.cwd());
const { report, profile } = await profileDressing({
  sourceFile: resolve(values.source), preset: values.preset, host: values.host,
  seconds: Number(values.seconds), cpuProfile: values.cpu, workers: values.workers === undefined ? undefined : Number(values.workers),
  onProgress(stage, elapsed) { process.stderr.write(`${(elapsed / 1000).toFixed(3)}s ${stage}\n`); },
});
const fingerprintAfter = await demoFingerprint(process.cwd());
const sourceSha256After = createHash("sha256").update(await readFile(resolve(values.source))).digest("hex");
const output = resolve(values.out);
await mkdir(output, { recursive: true });
await writeFile(join(output, "report.json"), JSON.stringify({ ...report, fingerprintBefore, fingerprintAfter, sourceSha256After,
  sourceChangedDuringRun: fingerprintBefore !== fingerprintAfter || report.sourceSha256 !== sourceSha256After }, null, 2) + "\n");
if (profile) await writeFile(join(output, "compile.cpuprofile"), JSON.stringify(profile));
else await rm(join(output, "compile.cpuprofile"), { force: true });
console.log(JSON.stringify({ status: report.status, elapsedMs: report.elapsedMs, report: join(output, "report.json") }));
if (report.status !== "completed") process.exitCode = 1;
