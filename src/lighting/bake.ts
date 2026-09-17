/** Node-only optional baking backend. Never imported by the browser compiler. */
import { spawn } from "node:child_process";
import {
  mkdtemp,
  writeFile,
  readFile,
  access,
  mkdir,
  rm,
} from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { generateUVs } from "../vector/uv.ts";
import { toRuntime } from "../vector/export.ts";
import { hash } from "../vector/geometry.ts";
import { lightingStateHash, COMPILER_REVISION } from "./manifest.ts";
import { REVISION } from "three";
import { aborted, type CompiledLevel } from "../vector/types.ts";
export interface BakeOptions {
  output: string;
  blender?: string;
  samples?: number;
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
  if (!level.atlas) await generateUVs(level, { signal: options.signal });
  aborted(options.signal);
  const temp = await mkdtemp(join(tmpdir(), "levelspec-bake-"));
  try {
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
      lightingStateHash: stateHash,
      compilerRevision: COMPILER_REVISION,
      rendererRevision: REVISION,
      lightingRevision: await hash({ stateHash, samples, seed: 17 }),
    };
    const input = join(temp, "input.json");
    await writeFile(input, JSON.stringify(payload));
    await mkdir(dirname(output), { recursive: true });
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
        output,
        "--calibration",
        join(calibration, "results.json"),
        "--samples",
        String(samples),
      ],
      options,
    );
    await writeFile(
      join(output, "calibration.json"),
      await readFile(join(calibration, "results.json")),
    );
    await writeFile(
      join(output, "source.runtime.json"),
      JSON.stringify(payload),
    );
    return JSON.parse(
      await readFile(
        join(output, `${level.document.id}.lighting.json`),
        "utf8",
      ),
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
