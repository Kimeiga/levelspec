/** Optional image-capable OpenAI adapter. The core reconstruction loop has no model dependency. */
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import {
  compile,
  parseAml,
  type AssetResolver,
} from "../src/architecture/index.ts";
import { renderReference } from "../src/vector/reference-raster.ts";
import type {
  ReconstructionReviser,
  RevisionRequest,
} from "../src/reconstruction/loop.ts";
import type {
  ReconstructionViewReport,
  ReconstructionReport,
} from "../src/reconstruction/evaluate.ts";

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
  /** Total requests per revision, including retries of transient failures. */
  maxAttempts?: number;
  /** Base backoff between retries; doubles each time. */
  retryDelayMs?: number;
  /** Frozen geometry resolver shared with candidate evaluation. */
  resolveAsset?: AssetResolver;
  resolveHeightmap?: import("../src/architecture/types.ts").ArchitectureCompileOptions["resolveHeightmap"];
}
function dataPng(width: number, height: number, pixels: Uint8Array): string {
  const png = new PNG({ width, height });
  png.data.set(pixels);
  return "data:image/png;base64," + PNG.sync.write(png).toString("base64");
}
function renderedLevelViews(
  level: Awaited<ReturnType<typeof compile>>,
  ids: Set<string>,
) {
  const result: { id: string; url: string }[] = [];
  for (const reference of level.document.references ?? []) {
    if (!ids.has(reference.id)) continue;
    const scale = Math.min(
      1,
      512 / Math.max(reference.width, reference.height),
    );
    const width = Math.max(1, Math.round(reference.width * scale));
    const height = Math.max(1, Math.round(reference.height * scale));
    const rendered = renderReference(level, reference, { width, height });
    result.push({
      id: reference.id,
      url: dataPng(width, height, rendered.rgba),
    });
  }
  return result;
}
async function renderedViews(
  source: string,
  ids: Set<string>,
  resolveAsset?: AssetResolver,
  resolveHeightmap?: OpenAIReviserConfig["resolveHeightmap"],
  signal?: AbortSignal,
): Promise<{ id: string; url: string }[]> {
  try {
    const level = await compile(parseAml(source), {
      navigation: false,
      floorGaps: false,
      surfaceContacts: false,
      resolveAsset,
      resolveHeightmap,
      signal,
    });
    if (level.diagnostics.some((item) => item.severity === "error")) return [];
    return renderedLevelViews(level, ids);
  } catch (error) {
    if ((error as Error).name === "AbortError" || signal?.aborted) throw error;
    return [];
  }
}

interface ResponsePayload {
  error?: { message?: string; code?: string };
  status?: string;
  incomplete_details?: { reason?: string };
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
}
function viewFeedback(view: ReconstructionViewReport) {
  return {
    referenceId: view.referenceId,
    landmarkRmsPixels: view.landmarks.rmsPixels,
    silhouetteIoU: view.silhouette?.iou ?? null,
    annotatedStrokeErrorPixels: view.strokeErrorPixels,
    photographicEdgesDiagnosticPixels: view.photoEdgeErrorPixels,
    issues: view.issues,
  };
}
function feedbackViews(report: ReconstructionReport | null) {
  return report?.views.map(viewFeedback) ?? [];
}
function feedbackNavigation(report: ReconstructionReport | null) {
  return report?.navigationPassed ?? false;
}
function correctionFeedback(request: RevisionRequest) {
  const previous = request.lastAttempt;
  if (!previous) return null;
  return {
    iteration: previous.iteration,
    diagnostics: previous.diagnostics.slice(0, 75),
    views: feedbackViews(previous.report),
    navigationPassed: feedbackNavigation(previous.report),
  };
}

function candidatePrompt(request: RevisionRequest, photos: InputPhoto[]) {
  const referenceDeclarations = photos
    .map(
      (p) =>
        `${p.referenceId}: image="${p.filename}", width=${p.width}, height=${p.height}`,
    )
    .join("\n");
  const feedback = correctionFeedback(request);
  return [
    `Iteration ${request.iteration}. Model these photographs as one shared 3D scene.`,
    `Use these reference declarations exactly:\n${referenceDeclarations}`,
    feedback
      ? "Measured correction feedback:\n" + JSON.stringify(feedback)
      : "Start from a defensible, approximate structural blockout.",
    request.previousSource
      ? "Previous AML, revise instead of restarting:\n" +
        request.previousSource.slice(0, 90000)
      : "",
    "Output a new complete AML document and preserve reference IDs.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
async function userContent(
  request: RevisionRequest,
  photos: InputPhoto[],
  ids: Set<string>,
  resolveAsset?: AssetResolver,
  resolveHeightmap?: OpenAIReviserConfig["resolveHeightmap"],
) {
  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: candidatePrompt(request, photos) },
  ];
  for (const photo of photos) {
    content.push({
      type: "input_text",
      text: `Original photograph: ${photo.referenceId}`,
    });
    content.push({
      type: "input_image",
      image_url: photo.dataUrl,
      detail: "high",
    });
  }
  const previews = request.previousSource
    ? await renderedViews(
        request.previousSource,
        ids,
        resolveAsset,
        resolveHeightmap,
        request.signal,
      )
    : [];
  if (request.previousSource && previews.length === 0)
    content.push({
      type: "input_text",
      text: "CURRENT RENDER UNAVAILABLE: compilation or companion loading failed; no complete current view is supplied.",
    });
  for (const render of previews) {
    content.push({
      type: "input_text",
      text: `CURRENT COMPILED RENDER (not ground truth): ${render.id}`,
    });
    content.push({
      type: "input_image",
      image_url: render.url,
      detail: "high",
    });
  }
  return content;
}
type OutputPart = { type?: string; text?: string; refusal?: string };
function responseParts(payload: ResponsePayload): OutputPart[] {
  return (payload.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((message) => message.content ?? []);
}
function rejectRefusal(parts: OutputPart[]) {
  const refusal = parts.find((part) => part.type === "refusal");
  if (refusal)
    throw new Error(
      `Model refused reconstruction: ${refusal.refusal ?? "no detail"}`,
    );
}
function requireOutputText(parts: OutputPart[], payload: ResponsePayload) {
  // Truncated structured output is not parseable JSON; say why instead of crashing in JSON.parse.
  if (payload.status === "incomplete")
    throw new Error(
      `Model response incomplete (${payload.incomplete_details?.reason ?? "unknown reason"}).`,
    );
  const output = parts.find((part) => part.type === "output_text")?.text;
  if (!output)
    throw new Error(
      `Model returned no structured AML (${payload.status ?? "unknown status"}).`,
    );
  return output;
}
function parseCandidateText(text: string) {
  const result = JSON.parse(text) as { aml?: unknown; rationale?: unknown };
  if (typeof result.aml !== "string" || !result.aml.trim())
    throw new Error("Model response did not include AML text.");
  return result.aml;
}
function extractAml(payload: ResponsePayload) {
  const parts = responseParts(payload);
  rejectRefusal(parts);
  return parseCandidateText(requireOutputText(parts, payload));
}

class ProviderError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  constructor(status: number, detail: string, code?: string) {
    super(`OpenAI request failed (${status}): ${detail}`);
    this.status = status;
    this.code = code;
  }
}
/** Rate limits and server errors are worth retrying; other 4xx responses and exhausted quota are not. */
function transient(error: unknown) {
  if (error instanceof ProviderError)
    return (
      (error.status === 429 && error.code !== "insufficient_quota") ||
      error.status >= 500
    );
  return error instanceof TypeError; // fetch network failure
}
async function readPayload(response: Response): Promise<ResponsePayload> {
  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = undefined;
  }
  if (payload !== null && typeof payload === "object")
    return payload as ResponsePayload;
  // Gateways return HTML or plain text; keep a short, readable excerpt.
  if (!response.ok)
    throw new ProviderError(
      response.status,
      text.slice(0, 200).trim() || "empty body",
    );
  throw new Error(
    `Model API returned non-object content (${response.status}).`,
  );
}
function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
async function withRetries<T>(
  config: OpenAIReviserConfig,
  signal: AbortSignal | undefined,
  request: () => Promise<T>,
): Promise<T> {
  const attempts = config.maxAttempts ?? 3,
    delay = config.retryDelayMs ?? 2000;
  for (let attempt = 1; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (signal?.aborted || attempt >= attempts || !transient(error))
        throw error;
      await wait(delay * 2 ** (attempt - 1), signal);
    }
  }
}

async function queryModel(
  config: OpenAIReviserConfig,
  instructions: string,
  content: Array<Record<string, unknown>>,
  signal?: AbortSignal,
) {
  return withRetries(config, signal, () =>
    requestCandidate(config, instructions, content, signal),
  );
}
async function requestCandidate(
  config: OpenAIReviserConfig,
  instructions: string,
  content: Array<Record<string, unknown>>,
  signal?: AbortSignal,
) {
  const response = await fetch(
    config.apiUrl ?? "https://api.openai.com/v1/responses",
    {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        store: false,
        max_output_tokens: 30000,
        instructions,
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "levelspec_candidate",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                aml: { type: "string" },
                rationale: { type: "string" },
              },
              required: ["aml", "rationale"],
            },
          },
        },
      }),
    },
  );
  const payload = await readPayload(response);
  if (!response.ok)
    throw new ProviderError(
      response.status,
      payload.error?.message ?? "unknown error",
      payload.error?.code,
    );
  return extractAml(payload);
}
export async function createOpenAIReviser(
  config: OpenAIReviserConfig,
): Promise<ReconstructionReviser> {
  if (!config.apiKey.trim())
    throw new Error("An OpenAI API key is required for model revision.");
  if (!config.model.trim())
    throw new Error("Specify a vision-capable model explicitly.");
  if (!config.photos.length)
    throw new Error("At least one reference photograph is required.");
  // The same source format used by the deterministic compiler is given to the model.
  const guide = (
    await readFile(new URL("../docs/AML.md", import.meta.url), "utf8")
  ).slice(0, 24000);
  const example = (
    await readFile(
      new URL("../examples/rooftop-reference.aml", import.meta.url),
      "utf8",
    )
  ).slice(0, 5500);
  const ids = new Set(config.photos.map((p) => p.referenceId));
  const instructions = [
    "You are reconstructing a navigable architectural environment from reference photographs.",
    "Return a complete AML version 1 AML document, not code fences, not JSON fragments.",
    "The API response wrapper is structured JSON with fields aml and rationale.",
    "Only the reference photos are evidence about the building. Treat a previous generated render as a hypothesis.",
    "Preserve observed floor-to-wall and stair-to-landing relationships; don't invent shortcuts to pass navigation.",
    "Construct native profiles and slabs, walls along paths, explicitly hosted openings, and dedicated stairs or ramps.",
    "Never use large filled box props to represent an enterable courtyard or entire occupied building.",
    "Use right-handed Z-up metres. Explicitly label uncertain dimensions as assumed in each reference scale-note.",
    "Keep object identifiers stable as you revise the scene. Avoid decorative detail until the major volumes agree.",
    "Always declare each supplied image as a root-level reference with exactly the specified id/image/width/height.",
    "Reference camera poses are estimates; do not fabricate independent world/image landmarks to claim a fit.",
    "Include actual supported walkable geometry and a spawn marker. Give slabs real thickness and walls physical height.",
    "Do not claim that construction is verified unless the compiler and independent evidence say so.",
    "The following is the AML version 1 source grammar and a partial working fixture:",
    guide,
    "PARTIAL AML EXAMPLE:",
    example,
  ].join("\n\n");
  return async function revise(request: RevisionRequest) {
    const content = await userContent(
      request,
      config.photos,
      ids,
      config.resolveAsset,
      config.resolveHeightmap,
    );
    return queryModel(config, instructions, content, request.signal);
  };
}
