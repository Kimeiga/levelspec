#!/usr/bin/env node
/**
 * Local-file reconstruction CLI. Model calls are opt-in; no photos or secrets
 * are ever sent to GitHub by this program.
 *
 * node tools/reconstruct.ts --image view1=photo1.jpg --image view2=photo2.jpg \\
 *   --model <vision-model> --out generated/reconstruction
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import { runReconstruction, type ReconstructionReviser } from "../src/reconstruction/loop.ts";
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
const usage = `LevelSpec image reconstruction
  node tools/reconstruct.ts --image view1=/path/to/cropped-photo.jpg
    [--image view2=/path/to/another-photo.png] [--model VISION_MODEL]
    [--source existing.level.svgx] [--evidence annotations.json]
    [--max-revisions 4] [--out generated/reconstruction]

With --model, supply OPENAI_API_KEY as an environment variable.
Without --model, --source performs read-only evaluation (no model calls).
All original photos remain local; model mode sends them to the configured API.
Annotate multiple views independently for a meaningful acceptance verdict.
`;
function parseArgs(argv: string[]): Args | null {
  const args: Args = { images: [], out: "generated/reconstruction", revisions: 4 };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--help" || flag === "-h") return null;
    if (!["--image", "--source", "--model", "--evidence", "--out", "--max-revisions"].includes(flag))
      throw new Error(`Unknown option ${flag}\n${usage}`);
    const value = argv[++i];
    if (!value) throw new Error(`Missing value for ${flag}`);
    if (flag === "--image") args.images.push(value);
    if (flag === "--source") args.source = value;
    if (flag === "--model") args.model = value;
    if (flag === "--evidence") args.evidence = value;
    if (flag === "--out") args.out = value;
    if (flag === "--max-revisions") args.revisions = Number(value);
  }
  if (!args.source && !args.model)
    throw new Error("Specify --source for evaluation or --model to generate a model.");
  if (args.model && !args.images.length)
    throw new Error("Model reconstruction requires at least one --image.");
  return args;
}
function decodeImage(bytes: Buffer, filename: string): { width: number; height: number; rgba: Uint8Array; mime: string } {
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
async function loadPhotos(paths: string[]): Promise<{ inputs: InputPhoto[]; evidence: PhotoEvidence[] }> {
  const inputs: InputPhoto[] = [], evidence: PhotoEvidence[] = [];
  for (let i = 0; i < paths.length; i++) {
    const value = paths[i], equals = value.indexOf("=");
    const id = equals > 0 ? value.slice(0, equals) : `view${i + 1}`;
    const path = equals > 0 ? value.slice(equals + 1) : value;
    if (!/^[A-Za-z_][\\w.-]*$/.test(id)) throw new Error(`Invalid reference id ${id}.`);
    if (inputs.some(v => v.referenceId === id)) throw new Error(`Duplicate reference id ${id}.`);
    const bytes = await readFile(path), decoded = decodeImage(bytes, path);
    if (bytes.length > 16 * 1024 * 1024) throw new Error(`Image ${path} exceeds 16 MB.`);
    const filename = basename(path);
    inputs.push({ referenceId: id, filename, width: decoded.width,
      height: decoded.height, dataUrl: `data:${decoded.mime};base64,${bytes.toString("base64")}` });
    evidence.push({ referenceId: id, photo: { width: decoded.width, height: decoded.height, rgba: decoded.rgba } });
  }
  return { inputs, evidence };
}
interface ManifestView {
  referenceId: string;
  strokes?: { id: string; points: [number, number][] }[];
  silhouettePath?: string;
}
interface Manifest {
  thresholds?: ReconstructionThresholds;
  views?: ManifestView[];
}
async function attachAnnotations(filename: string | undefined, evidence: PhotoEvidence[]) {
  if (!filename) return undefined;
  const source = JSON.parse(await readFile(filename, "utf8")) as Manifest;
  if (!Array.isArray(source.views)) throw new Error("Evidence manifest needs a views array.");
  for (const view of source.views) {
    let item = evidence.find(v => v.referenceId === view.referenceId);
    if (!item) {
      item = { referenceId: view.referenceId };
      evidence.push(item);
    }
    if (view.strokes) item.strokes = view.strokes;
    if (view.silhouettePath) {
      const bytes = await readFile(resolve(dirname(filename), view.silhouettePath));
      const mask = decodeImage(bytes, view.silhouettePath);
      item.silhouette = { width: mask.width, height: mask.height,
        pixels: Uint8Array.from({ length: mask.width * mask.height }, (_, i) => {
          const j = 4 * i;
          return mask.rgba[j + 3] > 127 &&
            (mask.rgba[j] + mask.rgba[j + 1] + mask.rgba[j + 2]) / 3 > 127 ? 1 : 0;
        }) };
    }
  }
  return source.thresholds;
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) { console.log(usage); return; }
  const { inputs, evidence } = await loadPhotos(args.images);
  const thresholds = await attachAnnotations(args.evidence, evidence);
  if (args.model && !process.env.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY is required to call the chosen vision model.");
  const revise: ReconstructionReviser = args.model ?
    await createOpenAIReviser({ model: args.model, apiKey: process.env.OPENAI_API_KEY!, photos: inputs }) :
    async () => null;
  const source = args.source ? await readFile(args.source, "utf8") : "";
  await mkdir(args.out, { recursive: true });
  const result = await runReconstruction(source, evidence, revise, {
    maxRevisions: args.model ? args.revisions : 0, thresholds,
    onAttempt: async attempt => {
      const stem = `iteration-${String(attempt.iteration).padStart(2, "0")}`;
      await writeFile(join(args.out, stem + ".level.svgx"), attempt.source);
      await writeFile(join(args.out, stem + ".json"), JSON.stringify({
        iteration: attempt.iteration, valid: attempt.valid, accepted: attempt.accepted,
        diagnostics: attempt.diagnostics, report: attempt.report,
      }, null, 2));
      console.log(`${stem}: ${attempt.valid ? "geometry/navigation passed" : "invalid"}; ${attempt.accepted ? "accepted" : "not accepted"}`);
    },
  });
  await writeFile(join(args.out, "result.json"), JSON.stringify({
    accepted: result.accepted, status: result.status,
    attempts: result.attempts.map(a => ({ iteration: a.iteration, valid: a.valid,
      accepted: a.accepted, score: a.score, diagnostics: a.diagnostics })),
    report: result.report,
  }, null, 2));
  if (result.source) {
    await writeFile(join(args.out, "best.level.svgx"), result.source);
    console.log(`Saved best candidate: ${join(args.out, "best.level.svgx")}`);
  }
  console.log(`Reconstruction status: ${result.status}. Verified reference views: ${result.report?.verifiedViews ?? 0}.`);
  if (!result.accepted) process.exitCode = 1;
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
