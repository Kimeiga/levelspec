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
    ? Math.round(Math.max(2, Math.min(5, value)) * 2) / 2
    : 3;
}
/** Raise shared vertices together. Stairs and ramp are rebuilt by LevelSpec. */
export function sourceForState(template: string, state: DemoState): string {
  const height = normalizeHeight(state.height);
  let source = sourceForCurve(template, state.curve);
  const ids = [
    "ramp.v1",
    "ramp.v2",
    "stairs.v1",
    "stairs.v2",
    ...Array.from({ length: 6 }, (_, i) => `bridge.v${i}`),
  ];
  source = source
    .split("\n")
    .map((line) =>
      ids.some((id) => line.includes(`id="${id}"`))
        ? line.replace('z="3"', `z="${height}"`)
        : line,
    )
    .join("\n");
  source = source.replace('position="25 5 3"', `position="25 5 ${height}"`);
  if (state.blocked) {
    source = source
      .split("\n")
      .map((line) => {
        if (line.includes('id="east.door"'))
          return line.replace('kind="door"', 'kind="wall"');
        if (line.includes('id="east.stairs"'))
          return line.replace('kind="open"', 'kind="wall"');
        return line;
      })
      .join("\n");
  }
  const palettes = {
    clay: ["#b77c59", "#dfceb0", "#427b72", "#c0aa86"],
    chalk: ["#b9c5c0", "#e8e0cb", "#748e9c", "#c4b398"],
    night: ["#596773", "#b7b8a8", "#bd794f", "#7d9694"],
  };
  palettes.clay.forEach((color, i) => {
    source = source.replace(
      `color="${color}"`,
      `color="${palettes[state.look][i]}"`,
    );
  });
  return source;
}
