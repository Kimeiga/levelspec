/** Node-only optional baking backend. Never imported by the browser compiler. */
import { spawn } from "node:child_process";
import {
  mkdtemp,
  writeFile,
  readFile,
  access,
  mkdir,
  rm,
  rename,
} from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateUVs } from "../vector/uv.ts";
import { toRuntime } from "../vector/export.ts";
import { hash } from "../vector/geometry.ts";
import { lightingStateHash, COMPILER_REVISION } from "./manifest.ts";
import { assertExportable, type ExportAsset } from "../vector/export-assets.ts";
import { REVISION } from "three";
import { aborted, type CompiledLevel } from "../vector/types.ts";
export interface BakeOptions {
  output: string;
  blender?: string;
  samples?: number;
  assets?: Record<string, ExportAsset>;
  signal?: AbortSignal;
  onProgress?: (line: string) => void;
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
async function run(executable: string, args: string[], options: BakeOptions) {
  aborted(options.signal);
  await new Promise<void>((res, rej) => {
    const p = spawn(executable, args, {
      stdio: ["ignore", "pipe", "pipe"],
      signal: options.signal,
    });
    let tail = "";
    for (const stream of [p.stdout, p.stderr])
      stream.on("data", (chunk) => {
        const s = String(chunk);
        tail = (tail + s).slice(-6000);
        options.onProgress?.(s);
      });
    p.on("error", rej);
    p.on("close", (code) =>
      code === 0 ? res() : rej(new Error(`Blender exited ${code}: ${tail}`)),
    );
  });
}
/** Publishes a complete new lighting revision; failures leave its destination absent. */
export async function bakeLighting(level: CompiledLevel, options: BakeOptions) {
  if (level.diagnostics.some((d) => d.severity === "error"))
    throw new Error("Cannot bake invalid geometry.");
  const executable =
      options.blender ??
      process.env.BLENDER_PATH ??
      (process.platform === "darwin"
        ? "/Applications/Blender.app/Contents/MacOS/Blender"
        : "blender"),
    output = resolve(options.output),
    samples = options.samples ?? 64;
  if (!Number.isInteger(samples) || samples < 1)
    throw new Error("Samples must be a positive integer.");
  try {
    await access(output);
    throw new Error(
      `Output already exists: ${output}. Choose a new revision directory.`,
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  assertExportable(level, { assets: options.assets });
  if (!level.atlas) await generateUVs(level, { signal: options.signal });
  aborted(options.signal);
  await mkdir(dirname(output), { recursive: true });
  const temp = await mkdtemp(join(dirname(output), ".levelspec-bake-"));
  const stagedOutput = join(temp, "result");
  try {
    const resolvedImages: Record<string, string> = {};
    const materialAssets: Record<string, string> = {};
    for (const material of level.document.materials) {
      if (!material.texture || resolvedImages[material.texture]) continue;
      const asset = options.assets![material.texture];
      const bytes = new Uint8Array(asset.bytes);
      const digest = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (n) => n.toString(16).padStart(2, "0"),
      ).join("");
      if (digest !== asset.hash)
        throw new Error("Bake image checksum does not match its bytes.");
      const path = join(
        temp,
        digest + (asset.mimeType === "image/png" ? ".png" : ".jpg"),
      );
      await writeFile(path, bytes);
      resolvedImages[material.texture] = path;
      materialAssets[material.texture] = digest;
    }
    const calibration = join(temp, "calibration");
    await run(
      executable,
      [
        "--background",
        "--factory-startup",
        "--python-exit-code",
        "1",
        "--python",
        join(root, "tools/lighting/calibrate.py"),
        "--",
        "--output-dir",
        calibration,
      ],
      options,
    );
    const stateHash = await lightingStateHash(level);
    const payload = {
      ...toRuntime(level),
      resolvedImages,
      materialAssets,
      lightingStateHash: stateHash,
      compilerRevision: COMPILER_REVISION,
      rendererRevision: REVISION,
      lightingRevision: await hash({ stateHash, samples, seed: 17 }),
    };
    const input = join(temp, "input.json");
    await writeFile(input, JSON.stringify(payload));
    await run(
      executable,
      [
        "--background",
        "--factory-startup",
        "--python-exit-code",
        "1",
        "--python",
        join(root, "tools/lighting/bake.py"),
        "--",
        "--input",
        input,
        "--output",
        stagedOutput,
        "--calibration",
        join(calibration, "results.json"),
        "--samples",
        String(samples),
      ],
      options,
    );
    await writeFile(
      join(stagedOutput, "calibration.json"),
      await readFile(join(calibration, "results.json")),
    );
    await writeFile(
      join(stagedOutput, "source.runtime.json"),
      JSON.stringify({ ...payload, resolvedImages: undefined }),
    );
    const manifest = JSON.parse(
      await readFile(
        join(stagedOutput, `${level.document.id}.lighting.json`),
        "utf8",
      ),
    );
    aborted(options.signal);
    try {
      await access(output);
      throw new Error(`Output already exists: ${output}. Choose a new revision directory.`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await rename(stagedOutput, output);
    return manifest;
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
