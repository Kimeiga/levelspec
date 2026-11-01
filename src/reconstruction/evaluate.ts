/** Evidence-based comparison of compiled LevelSpec geometry with reference images. */
import type { CompiledLevel, V2 } from "../vector/types.ts";
import type { ReferenceView } from "../vector/reference.ts";
import { compareReference, pointInMask } from "../vector/reference.ts";
import { renderReference } from "../vector/reference-raster.ts";

export interface PhotoPixels {
  width: number;
  height: number;
  rgba: Uint8Array;
}
export interface AnnotatedStroke {
  id: string;
  /** Points along an observed structural edge, normalized to the photo. */
  points: V2[];
}
export interface PhotoEvidence {
  referenceId: string;
  /** Optional original photo (not a texture or a synthetic rendering). */
  photo?: PhotoPixels;
  /** Optional binary foreground segmentation, width*height of the photo. */
  silhouette?: { width: number; height: number; pixels: Uint8Array };
  /** Independent observations, NOT edges extracted from the generated model. */
  strokes?: AnnotatedStroke[];
}
export interface ReconstructionThresholds {
  /** Maximum landmark RMS in pixels at source photograph resolution. */
  landmarkRmsPixels?: number;
  /** Minimum independently supplied silhouette intersection-over-union. */
  silhouetteIoU?: number;
  /** Maximum annotated structural-stroke error in evaluation pixels. */
  strokeErrorPixels?: number;
  /** Number of views with independent landmarks, strokes, or masks. */
  minimumVerifiedViews?: number;
}
export interface ReconstructionViewReport {
  referenceId: string;
  size: [number, number];
  landmarks: ReturnType<typeof compareReference>;
  silhouette: { iou: number; precision: number; recall: number; targetPixels: number; renderedPixels: number } | null;
  strokeErrorPixels: number | null;
  /** Unsupervised photo edges are noisy (tiles, shadows); diagnostic only. */
  photoEdgeErrorPixels: number | null;
  verified: boolean;
  passed: boolean;
  issues: string[];
}
export interface ReconstructionReport {
  passed: boolean;
  views: ReconstructionViewReport[];
  verifiedViews: number;
  navigationPassed: boolean;
  geometryPassed: boolean;
  issues: string[];
}

function resizedDimensions(reference: ReferenceView, limit: number): [number, number] {
  if (!Number.isInteger(limit) || limit < 32 || limit > 4096)
    throw new Error("Evaluation maximum dimension must be an integer from 32 to 4096.");
  const scale = Math.min(1, limit / Math.max(reference.width, reference.height));
  return [Math.max(1, Math.round(reference.width * scale)), Math.max(1, Math.round(reference.height * scale))];
}
function validatePixels(image: PhotoPixels | { width: number; height: number; pixels: Uint8Array }, channels: number) {
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) ||
      image.width <= 0 || image.height <= 0 ||
      image.width * image.height > 20_000_000 ||
      (("rgba" in image ? image.rgba : image.pixels).length !== image.width * image.height * channels))
    throw new Error("Image data dimensions or buffer length are invalid.");
}
function resizeMask(mask: { width: number; height: number; pixels: Uint8Array }, width: number, height: number) {
  validatePixels(mask, 1);
  const result = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      result[y * width + x] = mask.pixels[Math.min(mask.height - 1, Math.floor((y + 0.5) * mask.height / height)) * mask.width +
        Math.min(mask.width - 1, Math.floor((x + 0.5) * mask.width / width))] ? 1 : 0;
  return result;
}
function excludeMask(reference: ReferenceView, width: number, height: number) {
  const result = new Uint8Array(width * height);
  if (!reference.masks.length) return result;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const point: V2 = [(x + 0.5) / width, (y + 0.5) / height];
      if (reference.masks.some(mask => pointInMask(point, mask.points)))
        result[y * width + x] = 1;
    }
  return result;
}
function compareMasks(rendered: Int32Array, target: Uint8Array, exclude: Uint8Array) {
  let intersection = 0, union = 0, targetCount = 0, renderedCount = 0;
  for (let i = 0; i < target.length; i++) {
    if (exclude[i]) continue;
    const a = rendered[i] >= 0, b = target[i] !== 0;
    if (a) renderedCount++;
    if (b) targetCount++;
    if (a && b) intersection++;
    if (a || b) union++;
  }
  return {
    iou: union ? intersection / union : 0,
    precision: renderedCount ? intersection / renderedCount : 0,
    recall: targetCount ? intersection / targetCount : 0,
    targetPixels: targetCount,
    renderedPixels: renderedCount,
  };
}
function visibleEdges(surfaceIds: Int32Array, depth: Float64Array, width: number, height: number) {
  const result = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x, s = surfaceIds[i];
      if (s < 0) continue;
      const neighbors = [i - 1, i + 1, i - width, i + width];
      if (neighbors.some(j => surfaceIds[j] !== s ||
          (Number.isFinite(depth[j]) && Math.abs(depth[j] - depth[i]) > 0.02 * Math.max(1, depth[i]))))
        result[i] = 1;
    }
  return result;
}
function distanceField(edges: Uint8Array, width: number, height: number) {
  const result = new Float32Array(width * height);
  const diagonal = Math.SQRT2;
  let found = false;
  for (let i = 0; i < edges.length; i++) { result[i] = edges[i] ? 0 : 1e6; found ||= Boolean(edges[i]); }
  if (!found) return result;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x) result[i] = Math.min(result[i], result[i - 1] + 1);
      if (y) {
        result[i] = Math.min(result[i], result[i - width] + 1);
        if (x) result[i] = Math.min(result[i], result[i - width - 1] + diagonal);
        if (x + 1 < width) result[i] = Math.min(result[i], result[i - width + 1] + diagonal);
      }
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x + 1 < width) result[i] = Math.min(result[i], result[i + 1] + 1);
      if (y + 1 < height) {
        result[i] = Math.min(result[i], result[i + width] + 1);
        if (x) result[i] = Math.min(result[i], result[i + width - 1] + diagonal);
        if (x + 1 < width) result[i] = Math.min(result[i], result[i + width + 1] + diagonal);
      }
    }
  return result;
}
function trimmedMean(values: number[]) {
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  const keep = Math.max(1, Math.ceil(values.length * 0.8));
  return values.slice(0, keep).reduce((a, b) => a + b, 0) / keep;
}
function strokeError(strokes: AnnotatedStroke[], field: Float32Array, width: number, height: number, excluded: Uint8Array) {
  const errors: number[] = [];
  for (const stroke of strokes) {
    if (!stroke.points.length || stroke.points.some(p => p.length !== 2 || !p.every(n => Number.isFinite(n) && n >= 0 && n <= 1)))
      throw new Error(`Stroke ${stroke.id} has invalid normalized image points.`);
    for (let j = 0; j < stroke.points.length; j++) {
      const a = stroke.points[j], b = stroke.points[Math.min(j + 1, stroke.points.length - 1)];
      const steps = Math.max(1, Math.ceil(Math.hypot((b[0] - a[0]) * width, (b[1] - a[1]) * height)));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        const x = Math.min(width - 1, Math.floor((a[0] + (b[0] - a[0]) * t) * width));
        const y = Math.min(height - 1, Math.floor((a[1] + (b[1] - a[1]) * t) * height));
        if (!excluded[y * width + x]) errors.push(Math.min(64, field[y * width + x]));
      }
    }
  }
  return trimmedMean(errors);
}
/** Diagnostic edge sample, not a proof that the photograph and geometry agree. */
function photoEdges(photo: PhotoPixels, width: number, height: number) {
  validatePixels(photo, 4);
  const lum = new Float32Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const sx = Math.min(photo.width - 1, Math.floor((x + 0.5) * photo.width / width));
      const sy = Math.min(photo.height - 1, Math.floor((y + 0.5) * photo.height / height));
      const i = (sy * photo.width + sx) * 4, a = photo.rgba[i + 3] / 255;
      lum[y * width + x] = ((0.2126 * photo.rgba[i] + 0.7152 * photo.rgba[i + 1] + 0.0722 * photo.rgba[i + 2]) * a + 255 * (1 - a));
    }
  const gradient = new Float32Array(width * height);
  const values: number[] = [];
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = lum[i - width + 1] + 2 * lum[i + 1] + lum[i + width + 1] -
        lum[i - width - 1] - 2 * lum[i - 1] - lum[i + width - 1];
      const gy = lum[i + width - 1] + 2 * lum[i + width] + lum[i + width + 1] -
        lum[i - width - 1] - 2 * lum[i - width] - lum[i - width + 1];
      gradient[i] = Math.hypot(gx, gy);
      if (gradient[i] > 24) values.push(gradient[i]);
    }
  values.sort((a, b) => a - b);
  const threshold = values.length ? Math.max(80, values[Math.floor(values.length * 0.78)]) : Infinity;
  const edges = new Uint8Array(width * height);
  for (let i = 0; i < edges.length; i++) edges[i] = gradient[i] >= threshold ? 1 : 0;
  return edges;
}

export function evaluateReconstruction(
  level: CompiledLevel,
  evidence: PhotoEvidence[],
  options: { maxDimension?: number; thresholds?: ReconstructionThresholds; navigationPassed?: boolean } = {},
): ReconstructionReport {
  const references = level.document.references ?? [];
  const byId = new Map(evidence.map(e => [e.referenceId, e]));
  if (byId.size !== evidence.length) throw new Error("Reference evidence IDs must be unique.");
  const known = new Set(references.map(r => r.id));
  for (const item of evidence)
    if (!known.has(item.referenceId)) throw new Error(`Unknown reference ${item.referenceId}.`);
  const bounds = options.thresholds ?? {};
  const views: ReconstructionViewReport[] = references.map(reference => {
    const annotation = byId.get(reference.id);
    const [width, height] = resizedDimensions(reference, options.maxDimension ?? 512);
    const issues: string[] = [];
    const landmarks = compareReference(reference);
    const independentLandmarks = landmarks.compared >= 3 && landmarks.clipped === 0;
    const hasSilhouette = Boolean(annotation?.silhouette);
    const hasStrokes = Boolean(annotation?.strokes?.length);
    const verified = independentLandmarks || hasSilhouette || hasStrokes;
    const needsRender = hasSilhouette || hasStrokes || Boolean(annotation?.photo);
    const render = needsRender ? renderReference(level, reference, { width, height }) : null;
    const excluded = needsRender ? excludeMask(reference, width, height) : new Uint8Array(0);
    const field = render ? distanceField(visibleEdges(render.surfaceIds, render.depth, width, height), width, height) : null;
    const silhouette = render && annotation?.silhouette ?
      compareMasks(render.surfaceIds, resizeMask(annotation.silhouette, width, height), excluded) : null;
    const strokeDistance = field && annotation?.strokes?.length ?
      strokeError(annotation.strokes, field, width, height, excluded) : null;
    const photoDistance = field && annotation?.photo ?
      (() => {
        const edges = photoEdges(annotation.photo!, width, height);
        const values: number[] = [];
        const stride = Math.max(1, Math.floor((width * height) / 10000));
        for (let i = 0; i < edges.length; i += stride)
          if (edges[i] && !excluded[i]) values.push(Math.min(64, field[i]));
        return trimmedMean(values);
      })() : null;
    if (!verified) issues.push("No independent landmarks, outline mask, or structural strokes; visual fit is unverified.");
    if (landmarks.clipped) issues.push(`${landmarks.clipped} landmark(s) lie outside the calibrated view.`);
    if (landmarks.compared > 0 && (landmarks.rmsPixels ?? Infinity) > (bounds.landmarkRmsPixels ?? 8))
      issues.push(`Landmark error ${landmarks.rmsPixels?.toFixed(1)} px exceeds limit.`);
    if (silhouette && silhouette.iou < (bounds.silhouetteIoU ?? 0.8))
      issues.push(`Silhouette IoU ${silhouette.iou.toFixed(3)} is below limit.`);
    if (strokeDistance !== null && strokeDistance > (bounds.strokeErrorPixels ?? 5))
      issues.push(`Structural stroke mismatch ${strokeDistance.toFixed(1)} px exceeds limit.`);
    return { referenceId: reference.id, size: [width, height], landmarks, silhouette,
      strokeErrorPixels: strokeDistance, photoEdgeErrorPixels: photoDistance,
      verified, passed: verified && issues.length === 0, issues };
  });
  const geometryPassed = !level.diagnostics.some(d => d.severity === "error");
  const navigationPassed = options.navigationPassed ?? (level.navigation?.passed ?? false);
  const verifiedViews = views.filter(v => v.verified).length;
  const requiredViews = bounds.minimumVerifiedViews ?? Math.min(2, references.length);
  const issues = views.flatMap(v => v.issues.map(issue => `${v.referenceId}: ${issue}`));
  if (!geometryPassed) issues.push("Geometry compilation contains errors.");
  if (!navigationPassed) issues.push("Walkable navigation has not passed validation.");
  if (verifiedViews < Math.max(1, requiredViews))
    issues.push(`Only ${verifiedViews} verified view(s); ${Math.max(1, requiredViews)} required.`);
  return { views, verifiedViews, navigationPassed, geometryPassed, issues,
    passed: issues.length === 0 && views.length > 0 };
}
