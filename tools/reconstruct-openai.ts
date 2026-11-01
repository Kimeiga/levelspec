/** Optional image-capable OpenAI adapter. The core reconstruction loop has no model dependency. */
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import { compile, parseLevelSvgx, renderReference } from "../src/vector/index.ts";
import type { ReconstructionReviser, RevisionRequest } from "../src/reconstruction/loop.ts";

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
async function renderedViews(source: string, ids: Set<string>): Promise<{ id: string; url: string }[]> {
  try {
    const level = await compile(parseLevelSvgx(source), { navigation: false, floorGaps: false, surfaceContacts: false });
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
  } catch {
    return [];
  }
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
    const feedback = request.lastAttempt ? {
      iteration: request.lastAttempt.iteration,
      diagnostics: request.lastAttempt.diagnostics.slice(0, 75),
      views: request.lastAttempt.report?.views.map(v => ({
        referenceId: v.referenceId,
        landmarkRmsPixels: v.landmarks.rmsPixels,
        silhouetteIoU: v.silhouette?.iou ?? null,
        annotatedStrokeErrorPixels: v.strokeErrorPixels,
        photographicEdgesDiagnosticPixels: v.photoEdgeErrorPixels,
        issues: v.issues,
      })) ?? [],
      navigationPassed: request.lastAttempt.report?.navigationPassed ?? false,
    } : null;
    const imageDescriptions = config.photos.map(p =>
      `${p.referenceId}: image="${p.filename}", width=${p.width}, height=${p.height}`).join("\n");
    const prompt = `Iteration ${request.iteration}. Model these photographs as one shared 3D scene.
Use these reference declarations exactly:\n${imageDescriptions}
${feedback ? "\nMeasured correction feedback:\n" + JSON.stringify(feedback) : "\nStart from a defensible, approximate structural blockout."}
${request.previousSource ? "\nPrevious SVGX, revise instead of restarting:\n" + request.previousSource.slice(0, 90000) : ""}
Output a new, complete SVGX document; preserve the reference ids.`;
    const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];
    for (const photo of config.photos) {
      content.push({ type: "input_text", text: `Original photograph: ${photo.referenceId}` });
      content.push({ type: "input_image", image_url: photo.dataUrl, detail: "high" });
    }
    if (request.previousSource) {
      for (const render of await renderedViews(request.previousSource, ids)) {
        content.push({ type: "input_text", text: `CURRENT COMPILED RENDER (not ground truth): ${render.id}` });
        content.push({ type: "input_image", image_url: render.url, detail: "high" });
      }
    }
    const response = await fetch(config.apiUrl ?? "https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model, store: false, max_output_tokens: 30000,
        instructions,
        input: [{ role: "user", content }],
        text: { format: {
          type: "json_schema", name: "levelspec_candidate", strict: true,
          schema: { type: "object", additionalProperties: false,
            properties: { svgx: { type: "string" }, rationale: { type: "string" } },
            required: ["svgx", "rationale"] },
        } },
      }),
    });
    const payload = await response.json() as {
      error?: { message?: string }; status?: string;
      output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
    };
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status}): ${payload.error?.message ?? "unknown error"}`);
    const messages = payload.output?.filter(item => item.type === "message") ?? [];
    for (const part of messages.flatMap(message => message.content ?? []))
      if (part.type === "refusal") throw new Error(`Model refused the reconstruction request: ${part.refusal ?? "no detail"}`);
    const output = messages.flatMap(message => message.content ?? []).find(part => part.type === "output_text")?.text;
    if (!output) throw new Error(`Model returned no structured SVGX (${payload.status ?? "unknown status"}).`);
    const result = JSON.parse(output) as { svgx?: unknown; rationale?: unknown };
    if (typeof result.svgx !== "string" || !result.svgx.trim())
      throw new Error("Model response did not include SVGX text.");
    return result.svgx;
  };
}
