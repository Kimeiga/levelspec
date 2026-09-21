/** Bounded, shareable demo inputs. These never execute visitor-supplied code. */
export interface DemoState {
  curve: number;
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
  return result;
}
