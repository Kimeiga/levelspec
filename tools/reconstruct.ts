#!/usr/bin/env node
/** Local photo reconstruction CLI. Originals remain local unless model mode is selected. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import { toGLB, toRuntime } from "../src/vector/index.ts";
import { runReconstruction, type ReconstructionReviser,
  type ReconstructionAttempt, type ReconstructionLoopResult } from "../src/reconstruction/loop.ts";
import type { PhotoEvidence, ReconstructionThresholds } from "../src/reconstruction/evaluate.ts";
import { createOpenAIReviser, type InputPhoto } from "./reconstruct-openai.ts";

interface Args {
  images: string[];
  source?: string;
  model?: string;
  evidence?: string;
  out: string;
  revisions: number;
}
const usage = `LevelSpec photo reconstruction
  node tools/reconstruct.ts --image view1=/path/to/cropped-photo.jpg
    [--image view2=/path/to/cropped-oblique.png] [--model VISION_MODEL]
    [--source existing.level.svgx] [--evidence annotations.json]
    [--max-revisions 4] [--out generated/reconstruction]

With --model, supply OPENAI_API_KEY as an environment variable.
Without --model, --source performs read-only evaluation (no model calls).
Photographs stay local except when explicitly sent to the model API.
`;
function requireSource(args: Args) {
  if (!args.source && !args.model)
    throw new Error("Specify --source for evaluation or --model to generate a model.");
}
function requireImagesForModel(args: Args) {
  if (args.model && !args.images.length)
    throw new Error("Model reconstruction requires at least one --image.");
}
function setOption(argv: string[], index: number, setters: Record<string, (value: string) => void>) {
  const flag = argv[index], setter = setters[flag];
  if (!setter) throw new Error(`Unknown option ${flag}\n${usage}`);
  const value = argv[index + 1];
  if (!value) throw new Error(`Missing value for ${flag}`);
  setter(value);
}
function parseArgs(argv: string[]): Args | null {
  const args: Args = { images: [], out: "generated/reconstruction", revisions: 4 };
  const setters: Record<string, (value: string) => void> = {
    "--image": value => { args.images.push(value); },
    "--source": value => { args.source = value; },
    "--model": value => { args.model = value; },
    "--evidence": value => { args.evidence = value; },
    "--out": value => { args.out = value; },
    "--max-revisions": value => { args.revisions = Number(value); },
  };
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === "--help" || argv[i] === "-h") return null;
    setOption(argv, i, setters);
  }
  requireSource(args);
  requireImagesForModel(args);
  return args;
}

interface Decoded {
  width: number;
  height: number;
  rgba: Uint8Array;
  mime: string;
}
function decodeImage(bytes: Buffer, filename: string): Decoded {
  const suffix = extname(filename).toLowerCase();
  if (suffix === ".png") {
    const decoded = PNG.sync.read(bytes);
    return { width: decoded.width, height: decoded.height, rgba: new Uint8Array(decoded.data),
      mime: "image/png" };
  }
  if (suffix === ".jpg" || suffix === ".jpeg") {
    const decoded = jpeg.decode(bytes, { useTArray: true });
    return { width: decoded.width, height: decoded.height, rgba: decoded.data, mime: "image/jpeg" };
  }
  throw new Error(`Unsupported image type ${suffix}. Use PNG or JPEG.`);
}
function parseImageArg(value: string, index: number) {
  const equals = value.indexOf("=");
  const referenceId = equals > 0 ? value.slice(0, equals) : `view${index + 1}`;
  const path = equals > 0 ? value.slice(equals + 1) : value;
  if (!/^[A-Za-z_][\w.-]*$/.test(referenceId))
    throw new Error(`Invalid reference id ${referenceId}.`);
  return { referenceId, path };
}
async function loadPhoto(value: string, index: number) {
  const { referenceId, path } = parseImageArg(value, index);
  const bytes = await readFile(path);
  if (bytes.length > 16 * 1024 * 1024) throw new Error(`Image ${path} exceeds 16 MB.`);
  const decoded = decodeImage(bytes, path);
  const input: InputPhoto = { referenceId, filename: basename(path),
    width: decoded.width, height: decoded.height,
    dataUrl: `data:${decoded.mime};base64,${bytes.toString("base64")}` };
  const evidence: PhotoEvidence = { referenceId, imageFilename: basename(path), photo: {
    width: decoded.width, height: decoded.height, rgba: decoded.rgba,
  } };
  return { input, evidence };
}
async function loadPhotos(paths: string[]) {
  const records = await Promise.all(paths.map((value, index) => loadPhoto(value, index)));
  const inputs = records.map(r => r.input), evidence = records.map(r => r.evidence);
  if (new Set(inputs.map(v => v.referenceId)).size !== inputs.length)
    throw new Error("Duplicate reference image id.");
  return { inputs, evidence };
}
interface ManifestView {
  referenceId: string;
  /** Trusted, independently measured 3D-to-image point correspondences. */
  landmarks?: { id: string; position: [number, number, number]; image: [number, number] }[];
  /** Only externally supplied masks can exclude evidence from acceptance. */
  masks?: { id: string; points: [number, number][] }[];
  strokes?: { id: string; points: [number, number][] }[];
  silhouettePath?: string;
}
interface Manifest {
  thresholds?: ReconstructionThresholds;
  views?: ManifestView[];
}
async function loadSilhouette(filename: string) {
  const bytes = await readFile(filename), decoded = decodeImage(bytes, filename);
  return { width: decoded.width, height: decoded.height,
    pixels: Uint8Array.from({ length: decoded.width * decoded.height }, (_, i) => {
      const j = 4 * i;
      return decoded.rgba[j + 3] > 127 &&
        (decoded.rgba[j] + decoded.rgba[j + 1] + decoded.rgba[j + 2]) / 3 > 127 ? 1 : 0;
    }) };
}
async function attachView(view: ManifestView, manifestPath: string, evidence: PhotoEvidence[]) {
  let item = evidence.find(e => e.referenceId === view.referenceId);
  if (!item) {
    item = { referenceId: view.referenceId };
    evidence.push(item);
  }
  if (view.landmarks) item.landmarks = view.landmarks;
  if (view.masks) item.masks = view.masks;
  if (view.strokes) item.strokes = view.strokes;
  if (view.silhouettePath)
    item.silhouette = await loadSilhouette(resolve(dirname(manifestPath), view.silhouettePath));
}
async function attachAnnotations(filename: string | undefined, evidence: PhotoEvidence[]) {
  if (!filename) return undefined;
  const source = JSON.parse(await readFile(filename, "utf8")) as Manifest;
  if (!Array.isArray(source.views)) throw new Error("Evidence manifest needs a views array.");
  for (const view of source.views) await attachView(view, filename, evidence);
  return source.thresholds;
}
async function resolveReviser(args: Args, photos: InputPhoto[]): Promise<ReconstructionReviser> {
  if (!args.model) return async () => null;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required to call the chosen vision model.");
  return createOpenAIReviser({ model: args.model, apiKey: key, photos });
}
async function recordAttempt(out: string, attempt: ReconstructionAttempt) {
  const stem = `iteration-${String(attempt.iteration).padStart(2, "0")}`;
  await writeFile(join(out, stem + ".level.svgx"), attempt.source);
  await writeFile(join(out, stem + ".json"), JSON.stringify({
    iteration: attempt.iteration, valid: attempt.valid, accepted: attempt.accepted,
    diagnostics: attempt.diagnostics, report: attempt.report,
  }, null, 2));
  console.log(`${stem}: ${attempt.valid ? "geometry/navigation passed" : "invalid"}; ${attempt.accepted ? "accepted" : "not accepted"}`);
}
function portableExportable(result: ReconstructionLoopResult) {
  return Boolean(result.level && result.report?.geometryPassed && result.report.navigationPassed);
}
async function writePortableExports(out: string, result: ReconstructionLoopResult) {
  if (!portableExportable(result)) return;
  const level = result.level!;
  await writeFile(join(out, "best.glb"), toGLB(level));
  await writeFile(join(out, "best-collision.glb"), toGLB(level, { purpose: "collision" }));
  await writeFile(join(out, "best.runtime.json"), JSON.stringify(toRuntime(level)));
}
async function recordResult(out: string, result: ReconstructionLoopResult) {
  await writeFile(join(out, "result.json"), JSON.stringify({
    accepted: result.accepted, status: result.status,
    attempts: result.attempts.map(a => ({ iteration: a.iteration, valid: a.valid,
      accepted: a.accepted, score: a.score, diagnostics: a.diagnostics })),
    report: result.report,
  }, null, 2));
  if (result.source) {
    await writeFile(join(out, "best.level.svgx"), result.source);
    console.log(`Saved best candidate: ${join(out, "best.level.svgx")}`);
  }
  await writePortableExports(out, result);
  console.log(`Status: ${result.status}. Independently verified reference views: ${result.report?.verifiedViews ?? 0}.`);
}
async function execute(args: Args) {
  const { inputs, evidence } = await loadPhotos(args.images);
  const thresholds = await attachAnnotations(args.evidence, evidence);
  const revise = await resolveReviser(args, inputs);
  const source = args.source ? await readFile(args.source, "utf8") : "";
  await mkdir(args.out, { recursive: true });
  const result = await runReconstruction(source, evidence, revise, {
    maxRevisions: args.model ? args.revisions : 0, thresholds,
    onAttempt: attempt => recordAttempt(args.out, attempt),
  });
  await recordResult(args.out, result);
  process.exitCode = Number(!result.accepted);
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) { console.log(usage); return; }
  await execute(args);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
