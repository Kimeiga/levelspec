import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { compile, parseAml } from "../src/architecture/index.ts";
import { localHeightmaps } from "../src/cli/heightmaps.ts";
import { auditVisibility, type VisibilityConfig, type VisibilityReport } from "./fps/visibility.ts";

/** Renders sampled floors separately by actual elevation; arrows end at supported target positions. */
function diagram(report: VisibilityReport): string {
  const samples = report.samples;
  const minX = Math.min(...samples.map(p => p.feet[0])) - 2, minY = Math.min(...samples.map(p => p.feet[1])) - 2;
  const maxX = Math.max(...samples.map(p => p.feet[0])) + 2, maxY = Math.max(...samples.map(p => p.feet[1])) + 2;
  const scale = Math.min(640 / (maxX - minX), 680 / (maxY - minY));
  const x = (v: number) => 40 + (v - minX) * scale, y = (v: number) => 780 - (v - minY) * scale;
  const parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="880" viewBox="0 0 1440 880">', '<rect width="1440" height="880" fill="#f1f4f4"/><g font-family="Arial,sans-serif" fill="#203842">', '<text x="40" y="36" font-size="25">Sampled visibility — review flags, not gameplay certification</text>'];
  for (const elevated of [false, true]) {
    parts.push(`<g transform="translate(${elevated ? 720 : 0} 0)"><text x="40" y="70" font-size="17">${elevated ? "Elevated feet Z ≥ 2 m" : "Ground / lower feet Z &lt; 2 m"}</text>`);
    for (const sample of samples.filter(p => (p.feet[2] >= 2) === elevated)) {
      const color = sample.maxVisibleDistance >= report.settings.longDistance ? "#d47d2d" : "#83aaa9";
      parts.push(`<circle cx="${x(sample.feet[0])}" cy="${y(sample.feet[1])}" r="2" fill="${color}"/>`);
    }
    for (const line of report.longLines.slice(0, 20).filter(l => ((l.from[2] - l.eyeHeight) >= 2) === elevated)) parts.push(`<path d="M ${x(line.from[0])} ${y(line.from[1])} L ${x(line.to[0])} ${y(line.to[1])}" stroke="#b64e37" stroke-width=".8" opacity=".45"/>`);
    parts.push('</g>');
  }
  parts.push(`<text x="40" y="825" font-size="14">${samples.length} supported samples · spacing ${report.settings.spacing} m · orange: visible supported target ≥ ${report.settings.longDistance} m</text>`);
  parts.push(`<text x="40" y="852" font-size="14">Complete within declared sampled scope: ${report.complete} · portal/100° candidates and omissions are in report.json</text></g></svg>`);
  return parts.join("\n");
}

/** Runs an opt-in audit without modifying authoring source or compiler gameplay contracts. */
export async function runVisibilityAudit(source: string, configuration: string, output: string) {
  const text = await readFile(source, "utf8"), configText = await readFile(configuration, "utf8");
  const config: VisibilityConfig = JSON.parse(configText);
  const level = await compile(parseAml(text), { navigation: { cell: .125 }, resolveHeightmap: localHeightmaps(source).load });
  if (level.diagnostics.some(d => d.severity === "error")) throw new Error("Visibility input has geometry errors");
  const report = auditVisibility(level, config);
  const identity = { source: resolve(source), sourceSha256: createHash("sha256").update(text).digest("hex"), configurationSha256: createHash("sha256").update(configText).digest("hex"), physicalHash: level.physicalHash, renderHash: level.renderHash };
  await mkdir(output, { recursive: false });
  const json = join(output, "report.json"), svg = join(output, "report.svg");
  await writeFile(json, JSON.stringify({ ...identity, ...report }, null, 2) + "\n");
  await writeFile(svg, diagram(report));
  return { success: true, complete: report.complete, sourceSha256: identity.sourceSha256, samples: report.samples.length, queries: report.queryCount, maximumVisibleDistance: report.longLines[0]?.distance ?? null, report: resolve(json), diagram: resolve(svg) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [source, config, output, ...extra] = process.argv.slice(2);
    if (!source || !config || !output || extra.length) throw new Error("Usage: node tools/vector-visibility.ts SOURCE.aml CONFIG.json NEW_OUTPUT_DIRECTORY");
    const result = await runVisibilityAudit(source, config, output);
    process.stdout.write(JSON.stringify(result) + "\n");
    if (!result.complete) process.exitCode = 1;
  } catch (error) {
    process.stdout.write(JSON.stringify({ success: false, error: (error as Error).message }) + "\n");
    process.exitCode = 1;
  }
}
