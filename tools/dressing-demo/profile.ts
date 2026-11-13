import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Session } from "node:inspector/promises";
import type { Profiler } from "node:inspector";
import { cpus } from "node:os";
import { compileDemo } from "./compile.ts";
import type { RasterPoolReport } from "./parallel-raster.ts";
import { localMaterialImages } from "../../src/cli/material-images.ts";
import { DEMO_COMPILE_BUDGETS, prepareDemoPreset, type DemoPreset } from "./presets.ts";

interface ProgressInterval { stage: string; startMs: number; durationMs: number }
export interface DressingProfileOptions {
  sourceFile: string;
  preset: DemoPreset;
  /** Isolates one host's rule, omitting excluded building proxies while retaining native physical boundaries. */
  host?: string;
  /** Cooperative deadline in seconds. Synchronous compiler work can delay cancellation. */
  seconds: number;
  cpuProfile?: boolean;
  /** Total isolates including the main thread; omitted uses the memory-aware demo default. */
  workers?: number;
  onProgress?(stage: string, elapsedMs: number): void;
}

/** Aggregates sampled self time; these are CPU samples, not exact function timers. */
export function summarizeCpuProfile(profile: Profiler.Profile) {
  const nodes = new Map(profile.nodes.map(node => [node.id, node.callFrame]));
  const totals = new Map<string, number>();
  for (const [index, sample] of (profile.samples ?? []).entries()) {
    const frame = nodes.get(sample)!;
    const location = `${frame.functionName || "(anonymous)"} ${frame.url}:${frame.lineNumber + 1}`;
    totals.set(location, (totals.get(location) ?? 0) + (profile.timeDeltas?.[index] ?? 0));
  }
  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return [...totals].sort((a, b) => b[1] - a[1]).slice(0, 30)
    .map(([location, microseconds]) => ({ location, sampledMs: microseconds / 1000, percent: total ? microseconds / total * 100 : 0 }));
}

/**
 * Measures one compile, including navigation and audits, without exporting or
 * publishing presets. Uses the demo's persistent material cache; a fresh process
 * does not imply cold artifacts. Progress intervals include all work until the next marker.
 * Failed and cancelled runs retain partial evidence and never count as completion.
 */
export async function profileDressing(options: DressingProfileOptions) {
  if (!Number.isFinite(options.seconds) || options.seconds <= 0 || options.seconds > 86400)
    throw new Error("Profile seconds must be greater than zero and at most 86400.");
  if (options.preset !== "blockout" && options.preset !== "kowloon") throw new Error("Unknown demo preset.");
  const source = await readFile(options.sourceFile, "utf8");
  prepareDemoPreset(source, options.preset, options.host);
  const session = options.cpuProfile ? new Session() : undefined;
  const controller = new AbortController();
  const intervals: ProgressInterval[] = [];
  let profile: Profiler.Profile | undefined;
  let level: Awaited<ReturnType<typeof compileDemo>> | undefined;
  let failure: { name: string; message: string } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let elapsedMs = 0, cpuMs = 0;
  let rasterPool: RasterPoolReport | undefined;
  try {
    if (session) {
      session.connect();
      await session.post("Profiler.enable");
      await session.post("Profiler.start");
    }
    const start = performance.now(), cpu = process.cpuUsage();
    timer = setTimeout(() => controller.abort(), options.seconds * 1000);
    intervals.push({ stage: "Compile setup", startMs: 0, durationMs: 0 });
    try {
      level = await compileDemo(source, options.preset, {
        workers: options.workers, host: options.host,
        onRasterPool(value) { rasterPool = value; },
        resolveMaterialImage: localMaterialImages(options.sourceFile).load,
        signal: controller.signal,
        onProgress(stage) {
          const elapsed = performance.now() - start;
          const previous = intervals.at(-1)!;
          if (previous.stage === stage) return;
          previous.durationMs = elapsed - previous.startMs;
          intervals.push({ stage, startMs: elapsed, durationMs: 0 });
          options.onProgress?.(stage, elapsed);
        },
      });
    } catch (error) {
      failure = { name: (error as Error).name, message: (error as Error).message };
    } finally {
      clearTimeout(timer);
      elapsedMs = performance.now() - start;
      const used = process.cpuUsage(cpu);
      cpuMs = (used.user + used.system) / 1000;
      intervals.at(-1)!.durationMs = elapsedMs - intervals.at(-1)!.startMs;
    }
    if (session) ({ profile } = await session.post("Profiler.stop"));
  } finally {
    clearTimeout(timer);
    session?.disconnect();
  }
  const status = failure?.name === "AbortError" ? "cancelled"
    : failure || level?.diagnostics.some(diagnostic => diagnostic.severity === "error") ? "failed" : "completed";
  return {
    profile,
    report: {
      version: 1,
      createdAt: new Date().toISOString(),
      status,
      sourceFile: options.sourceFile,
      sourceSha256: createHash("sha256").update(source).digest("hex"),
      preset: options.preset, host: options.host,
      environment: { node: process.version, platform: process.platform, arch: process.arch, cpu: cpus()[0]?.model },
      compileOptions: { maximumTriangles: DEMO_COMPILE_BUDGETS.limits!.triangles, appearance: DEMO_COMPILE_BUDGETS.appearance,
        navigation: true, workers: options.workers ?? "auto", deadlineSeconds: options.seconds },
      elapsedMs, cpuMs, intervals, failure, rasterPool,
      peakProcessRssKiB: process.resourceUsage().maxRSS,
      triangles: level ? level.mesh.indices.length / 3 : undefined,
      vertices: level ? level.mesh.positions.length / 3 : undefined,
      physicalHash: level?.physicalHash, renderHash: level?.renderHash,
      surfaceAppearance: level?.surfaceAppearance, diagnostics: level?.diagnostics,
      cpuSamples: profile ? summarizeCpuProfile(profile) : undefined,
    },
  };
}
