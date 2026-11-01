/** Optional image-capable OpenAI adapter. The core reconstruction loop has no model dependency. */
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import { compile, parseLevelSvgx, renderReference } from "../src/vector/index.ts";
import type { ReconstructionReviser, RevisionRequest } from "../src/reconstruction/loop.ts";
import type { ReconstructionViewReport } from "../src/reconstruction/evaluate.ts";

export interface InputPhoto {
  referenceId: string;
  filename: string;
  width: number;
  height: number;
  dataUrl: string;
}
export interface OpenAIReviserConfig {
  model: string;
  apiKey: string;
  photos: InputPhoto[];
  apiUrl?: string;
}
function dataPng(width: number, height: number, pixels: Uint8Array): string {
  const png = new PNG({ width, height });
  png.data.set(pixels);
  return "data:image/png;base64," + PNG.sync.write(png).toString("base64");
}
function renderedLevelViews(level: Awaited<ReturnType<typeof compile>>, ids: Set<string>) {
  const result: { id: string; url: string }[] = [];
  for (const reference of level.document.references ?? []) {
    if (!ids.has(reference.id)) continue;
    const scale = Math.min(1, 512 / Math.max(reference.width, reference.height));
    const width = Math.max(1, Math.round(reference.width * scale));
    const height = Math.max(1, Math.round(reference.height * scale));
    const rendered = renderReference(level, reference, { width, height });
    result.push({ id: reference.id, url: dataPng(width, height, rendered.rgba) });
  }
  return result;
}
async function renderedViews(source: string, ids: Set<string>): Promise<{ id: string; url: string }[]> {
  try {
    const level = await compile(parseLevelSvgx(source),
      { navigation: false, floorGaps: false, surfaceContacts: false });
    return renderedLevelViews(level, ids);
  } catch {
    return [];
  }
}

interface ResponsePayload {
  error?: { message?: string };
  status?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
}
function viewFeedback(view: ReconstructionViewReport) {
  return { referenceId: view.referenceId, landmarkRmsPixels: view.landmarks.rmsPixels,
    silhouetteIoU: view.silhouette?.iou ?? null,
    annotatedStrokeErrorPixels: view.strokeErrorPixels,
    photographicEdgesDiagnosticPixels: view.photoEdgeErrorPixels, issues: view.issues };
}
function correctionFeedback(request: RevisionRequest) {
  const previous = request.lastAttempt;
  if (!previous) return null;
  const report = previous.report;
  return { iteration: previous.iteration, diagnostics: previous.diagnostics.slice(0, 75),
    views: report ? report.views.map(viewFeedback) : [], navigationPassed: report?.navigationPassed ?? false };
}

function candidatePrompt(request: RevisionRequest, photos: InputPhoto[]) {
  const referenceDeclarations = photos.map(p =>
    `${p.referenceId}: image="${p.filename}", width=${p.width}, height=${p.height}`).join("\n");
  const feedback = correctionFeedback(request);
  return [
    `Iteration ${request.iteration}. Model these photographs as one shared 3D scene.`,
    `Use these reference declarations exactly:\n${referenceDeclarations}`,
    feedback ? "Measured correction feedback:\n" + JSON.stringify(feedback) :
      "Start from a defensible, approximate structural blockout.",
    request.previousSource ? "Previous SVGX, revise instead of restarting:\n" +
      request.previousSource.slice(0, 90000) : "",
    "Output a new complete SVGX document and preserve reference IDs.",
  ].filter(Boolean).join("\n\n");
}
async function userContent(request: RevisionRequest, photos: InputPhoto[], ids: Set<string>) {
  const content: Array<Record<string, unknown>> =
    [{ type: "input_text", text: candidatePrompt(request, photos) }];
  for (const photo of photos) {
    content.push({ type: "input_text", text: `Original photograph: ${photo.referenceId}` });
    content.push({ type: "input_image", image_url: photo.dataUrl, detail: "high" });
  }
  const previews = request.previousSource ? await renderedViews(request.previousSource, ids) : [];
  for (const render of previews) {
    content.push({ type: "input_text", text: `CURRENT COMPILED RENDER (not ground truth): ${render.id}` });
    content.push({ type: "input_image", image_url: render.url, detail: "high" });
  }
  return content;
}
type OutputPart = { type?: string; text?: string; refusal?: string };
function responseParts(payload: ResponsePayload): OutputPart[] {
  return (payload.output ?? []).filter(item => item.type === "message")
    .flatMap(message => message.content ?? []);
}
function rejectRefusal(parts: OutputPart[]) {
  const refusal = parts.find(part => part.type === "refusal");
  if (refusal) throw new Error(`Model refused reconstruction: ${refusal.refusal ?? "no detail"}`);
}
function requireOutputText(parts: OutputPart[], status?: string) {
  const output = parts.find(part => part.type === "output_text")?.text;
  if (!output) throw new Error(`Model returned no structured SVGX (${status ?? "unknown status"}).`);
  return output;
}
function parseCandidateText(text: string) {
  const result = JSON.parse(text) as { svgx?: unknown; rationale?: unknown };
  if (typeof result.svgx !== "string" || !result.svgx.trim())
    throw new Error("Model response did not include SVGX text.");
  return result.svgx;
}
function extractSvgx(payload: ResponsePayload) {
  const parts = responseParts(payload);
  rejectRefusal(parts);
  return parseCandidateText(requireOutputText(parts, payload.status));
}
function requireApiSuccess(response: Response, payload: ResponsePayload) {
  if (!response.ok)
    throw new Error(`OpenAI request failed (${response.status}): ${payload.error?.message ?? "unknown error"}`);
}

async function queryModel(config: OpenAIReviserConfig, instructions: string,
  content: Array<Record<string, unknown>>) {
  const response = await fetch(config.apiUrl ?? "https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model, store: false, max_output_tokens: 30000,
      instructions, input: [{ role: "user", content }],
      text: { format: { type: "json_schema", name: "levelspec_candidate", strict: true,
        schema: { type: "object", additionalProperties: false,
          properties: { svgx: { type: "string" }, rationale: { type: "string" } },
          required: ["svgx", "rationale"] } } },
    }),
  });
  const payload = await response.json() as ResponsePayload;
  requireApiSuccess(response, payload);
  return extractSvgx(payload);
}
export async function createOpenAIReviser(config: OpenAIReviserConfig): Promise<ReconstructionReviser> {
  if (!config.apiKey.trim()) throw new Error("An OpenAI API key is required for model revision.");
  if (!config.model.trim()) throw new Error("Specify a vision-capable model explicitly.");
  if (!config.photos.length) throw new Error("At least one reference photograph is required.");
  // The same source format used by the deterministic compiler is given to the model.
  const guide = (await readFile("docs/SVGX.md", "utf8")).slice(0, 24000);
  const example = (await readFile("examples/rooftop-reference.level.svgx", "utf8")).slice(0, 5500);
  const ids = new Set(config.photos.map(p => p.referenceId));
  const instructions = [
    "You are reconstructing a navigable architectural environment from reference photographs.",
    "Return a complete LevelSpec 2 SVGX document, not code fences, not JSON fragments.",
    "The API response wrapper is structured JSON with fields svgx and rationale.",
    "Only the reference photos are evidence about the building. Treat a previous generated render as a hypothesis.",
    "Preserve observed floor-to-wall and stair-to-landing relationships; don't invent shortcuts to pass navigation.",
    "Construct irregular floor regions, correctly oriented wall edges, actual openings and separate stair regions.",
    "Never use large filled box props to represent an enterable courtyard or entire occupied building.",
    "Use right-handed Z-up metres. Explicitly label uncertain dimensions as assumed in each reference scale-note.",
    "Keep object identifiers stable as you revise the scene. Avoid decorative detail until the major volumes agree.",
    "Always declare each supplied image as a root-level reference with exactly the specified id/image/width/height.",
    "Reference camera poses are estimates; do not fabricate independent world/image landmarks to claim a fit.",
    "Include at least one playable region and a spawn marker on it. Give floors real thickness and walls physical height.",
    "Do not claim that construction is verified unless the compiler and independent evidence say so.",
    "The following is the LevelSpec 2 source grammar and a partial working fixture:",
    guide,
    "PARTIAL SVGX EXAMPLE:", example,
  ].join("\n\n");
  return async function revise(request: RevisionRequest) {
    const content = await userContent(request, config.photos, ids);
    return queryModel(config, instructions, content);
  };
}
