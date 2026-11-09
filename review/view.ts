import type { V3 } from "../src/vector/types.ts";

export const FRAME_ASPECT_MIN = 0.1;
export const FRAME_ASPECT_MAX = 10;

export const DEFAULT_APPEARANCE: Appearance = "flat";

export type Appearance = "flat" | "illustrated" | "materials" | "inspection";
export type Projection = "orthographic" | "perspective";
export interface ViewOptions {
  projection?: Projection;
  position?: V3;
  target?: V3;
  fov?: number;
  viewHeight?: number;
  /** Finite degrees, right-hand positive about camera-to-target; zero uses Z-up. */
  roll?: number;
}
export interface ViewState {
  projection: Projection;
  position: V3;
  target: V3;
  fov: number;
  viewHeight: number;
  roll: number;
}

/** Presentation state belongs to the reviewer; camera classes retain only pose/framing. */
export interface ReviewViewOptions extends ViewOptions {
  appearance?: Appearance;
  /** Width/height lock; omission follows the available viewport. */
  frameAspect?: number;
}
export interface ReviewViewState extends ViewState {
  appearance: Appearance;
  /** Actual nonzero rendered frame width/height, including responsive mode. */
  frameAspect: number;
  frameAspectLock?: number;
}

/** Reads an explicit supported appearance without applying a caller-specific default. */
export function parseAppearance(value: string): Appearance {
  if (value !== "flat" && value !== "illustrated" && value !== "materials" && value !== "inspection")
    throw new Error("appearance must be flat, illustrated, materials or inspection.");
  return value;
}

/** Bounds live frames to 1:10 through 10:1, excluding unrenderable numerical extremes. */
export function parseFrameAspect(value: string): number {
  const ratio = Number(value);
  if (!value.trim() || !Number.isFinite(ratio) || ratio < FRAME_ASPECT_MIN || ratio > FRAME_ASPECT_MAX)
    throw new Error("frame-aspect must be a width/height ratio from 0.1 through 10.");
  return ratio;
}

/** Reads a finite XYZ position in right-handed Z-up meters. */
function vector(value: string, name: string): V3 {
  const values = value.trim().split(/[\s,]+/).map(Number);
  if (values.length !== 3 || !values.every(Number.isFinite))
    throw new Error(`${name} requires three finite coordinates in Z-up meters.`);
  return values as V3;
}

/** Validates shared CLI, URL and camera-form options before any view changes. */
export function parseViewOptions(parameters: URLSearchParams): ReviewViewOptions {
  const options: ReviewViewOptions = {};
  const projection = parameters.get("projection");
  if (projection !== null) {
    if (projection !== "orthographic" && projection !== "perspective")
      throw new Error("projection must be orthographic or perspective.");
    options.projection = projection;
  }
  const camera = parameters.get("camera"), target = parameters.get("target");
  if ((camera === null) !== (target === null))
    throw new Error("camera and target must be supplied together.");
  if (camera !== null && target !== null) {
    options.position = vector(camera, "camera");
    options.target = vector(target, "target");
    if (Math.hypot(...options.position.map((n, i) => n - options.target![i])) < 0.000001)
      throw new Error("camera and target must be distinct positions.");
  }
  for (const [parameter, property] of [["fov", "fov"], ["view-height", "viewHeight"]] as const) {
    const value = parameters.get(parameter);
    if (value === null) continue;
    const number = Number(value);
    if (!value.trim() || !Number.isFinite(number) || number <= 0 || (parameter === "fov" && number >= 150))
      throw new Error(`${parameter} must be ${parameter === "fov" ? "between 0 and 150 degrees" : "a positive finite height in meters"}.`);
    options[property] = number;
  }
  const roll = parameters.get("roll");
  if (roll !== null) {
    if (!roll.trim() || !Number.isFinite(Number(roll)))
      throw new Error("roll must be finite degrees.");
    options.roll = Number(roll);
  }
  const appearance = parameters.get("appearance");
  if (appearance !== null) options.appearance = parseAppearance(appearance);
  const frameAspect = parameters.get("frame-aspect");
  if (frameAspect !== null) options.frameAspect = parseFrameAspect(frameAspect);
  return options;
}

/** Encodes the actual overview pose, framing and appearance, preserving unrelated URL parameters. */
export function viewURL(base: string, state: ReviewViewState): string {
  const url = new URL(base);
  url.searchParams.set("projection", state.projection);
  url.searchParams.set("camera", state.position.join(" "));
  url.searchParams.set("target", state.target.join(" "));
  url.searchParams.set("fov", String(state.fov));
  url.searchParams.set("view-height", String(state.viewHeight));
  url.searchParams.set("roll", String(state.roll));
  url.searchParams.set("appearance", state.appearance);
  url.searchParams.set("frame-aspect", String(parseFrameAspect(String(state.frameAspect))));
  return url.href;
}
