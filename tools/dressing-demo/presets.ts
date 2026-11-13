import { parseAml } from "../../src/architecture/index.ts";
import type { ArchitectureCompileOptions } from "../../src/architecture/types.ts";

export const DEMO_PRESETS = ["blockout", "kowloon"] as const;
export type DemoPreset = typeof DEMO_PRESETS[number];

/** Shared build/profile budgets for the detailed experimental scene; these do not set visual resolution. */
export const DEMO_COMPILE_BUDGETS: Pick<ArchitectureCompileOptions, "limits" | "appearance"> = {
  limits: { triangles: 6_000_000 },
  appearance: { maximumTexels: 96 * 1024 * 1024, maximumBytes: 768 * 1024 * 1024, maximumCharts: 131072 },
};

/**
 * Parses an independent preset or isolated host, retaining native physical
 * boundaries and unrelated visual objects. Excluded building recipes lose
 * their visual proxy hosts, which otherwise overlap the exposed base walls.
 */
export function prepareDemoPreset(source: string, preset: DemoPreset, host?: string) {
  const document = parseAml(source);
  if (host && preset === "blockout") throw new Error("Host isolation requires the Kowloon preset.");
  const selected = host ? document.dressing?.rules.find(rule => rule.host === host) : undefined;
  if (host && !selected) throw new Error(`No dressing rule for host ${host}.`);
  if (preset === "blockout" || selected) {
    const buildings = new Set(document.dressing?.rules
      .filter(rule => rule.kind === "building" && rule !== selected).map(rule => rule.host));
    document.elements = document.elements.filter(element => !buildings.has(element.id));
  }
  if (preset === "blockout") {
    delete document.dressing;
  } else if (selected) {
    document.dressing!.rules = [selected];
    delete document.dressing!.spans;
  }
  return document;
}
