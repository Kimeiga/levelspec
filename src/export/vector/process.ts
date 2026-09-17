import { spawn } from "node:child_process";
export interface ProcessOptions {
  signal?: AbortSignal;
  onProgress?: (line: string) => void;
  timeoutMs?: number;
}
export async function runTool(
  executable: string,
  args: string[],
  options: ProcessOptions = {},
  cwd?: string,
): Promise<string> {
  options.signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      signal: options.signal,
    });
    let output = "",
      timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMs ?? 600_000);
    const stop = () => {
      child.kill("SIGKILL");
    };
    options.signal?.addEventListener("abort", stop, { once: true });
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (chunk) => {
        const text = String(chunk);
        output = (output + text).slice(-2_000_000);
        const line = text
          .replace(/\r/g, "\n")
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s && !/^[.\d% ]+$/.test(s))
          .at(-1);
        if (line) options.onProgress?.(line.slice(-400));
      });
    const clean = () => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", stop);
    };
    child.on("error", (error) => {
      clean();
      reject(
        new Error(`Cannot run ${executable}: ${error.message}`, {
          cause: error,
        }),
      );
    });
    child.on("close", (code) => {
      clean();
      if (options.signal?.aborted)
        reject(options.signal.reason ?? new Error("Export cancelled"));
      else if (timedOut)
        reject(new Error(`${executable} timed out.\n${output.slice(-6000)}`));
      else if (code !== 0)
        reject(
          new Error(`${executable} exited ${code}.\n${output.slice(-6000)}`),
        );
      else resolve(output);
    });
  });
}
export const blenderPath = () =>
  process.env.BLENDER_PATH ??
  (process.platform === "darwin"
    ? "/Applications/Blender.app/Contents/MacOS/Blender"
    : "blender");
