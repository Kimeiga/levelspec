import { buildCourtyard } from "./architecture.ts";
/** Bounded, shareable demo inputs. These never execute visitor-supplied code. */
export interface DemoState {
  curve: number;
  height: number;
  blocked: boolean;
  look: "clay" | "chalk" | "night";
  step: number;
  present: boolean;
}
export const DEFAULT_CURVE = 3;
export const MIN_CURVE = 0;
export const MAX_CURVE = 6;
export function normalizeCurve(value: number): number {
  return Number.isFinite(value)
    ? Math.round(Math.max(MIN_CURVE, Math.min(MAX_CURVE, value)) * 4) / 4
    : DEFAULT_CURVE;
}
export function readState(search: string): DemoState {
  const params = new URLSearchParams(search);
  const rawCurve = params.get("curve");
  const rawStep = Number(params.get("step") ?? 0);
  return {
    curve:
      rawCurve === null || rawCurve.trim() === ""
        ? DEFAULT_CURVE
        : normalizeCurve(Number(rawCurve)),
    step: Number.isFinite(rawStep)
      ? Math.max(0, Math.min(3, Math.floor(rawStep)))
      : 0,
    present: params.get("present") === "1",
    height: normalizeHeight(
      params.get("height")?.trim() ? Number(params.get("height")) : 3,
    ),
    blocked: params.get("blocked") === "1",
    look:
      params.get("look") === "chalk"
        ? "chalk"
        : params.get("look") === "night"
          ? "night"
          : "clay",
  };
}
export function sourceForCurve(template: string, curve: number): string {
  const value = normalizeCurve(curve);
  const marker = 'control="4 -3; 10 -3"';
  if (template.split(marker).length !== 2)
    throw new Error("Demo fixture must have exactly one courtyard curve.");
  const coord = value === 0 ? "0" : `-${value}`;
  return template.replace(marker, `control="4 ${coord}; 10 ${coord}"`);
}
export function writeState(url: URL, state: DemoState): URL {
  const result = new URL(url);
  result.searchParams.set("curve", String(normalizeCurve(state.curve)));
  result.searchParams.set(
    "step",
    String(Math.max(0, Math.min(3, Math.floor(state.step)))),
  );
  if (state.present) result.searchParams.set("present", "1");
  else result.searchParams.delete("present");
  result.searchParams.set("height", String(normalizeHeight(state.height)));
  result.searchParams.set("look", state.look);
  if (state.blocked) result.searchParams.set("blocked", "1");
  else result.searchParams.delete("blocked");
  return result;
}

export function normalizeHeight(value: number): number {
  return Number.isFinite(value)
    ? Math.round(Math.max(3, Math.min(6, value)) * 2) / 2
    : 3;
}
/** Raise shared vertices together. Stairs and ramp are rebuilt by LevelSpec. */
export function sourceForState(state: DemoState): string {
  return sourceForCurve(
    buildCourtyard({
      height: normalizeHeight(state.height),
      blocked: state.blocked,
      look: state.look,
    }),
    state.curve,
  );
}
