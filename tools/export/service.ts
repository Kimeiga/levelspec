/** Vite dev-only loopback service. No client-supplied commands or filesystem paths. */
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";
import { randomUUID } from "node:crypto";
import { zipSync } from "fflate";
import {
  compile,
  parseLevelSvgx,
  validateForRuntime,
  resolveExportAssets,
} from "../../src/vector/index.ts";
import {
  exportLevel,
  type ExportFormat,
} from "../../src/export/vector/index.ts";
import { blenderPath } from "../../src/export/vector/process.ts";
interface Job {
  abort: AbortController;
  state: "running" | "done" | "failed" | "cancelled";
  progress: string;
  error?: string;
  bytes?: Uint8Array;
  created: number;
}
async function executable(path: string) {
  for (const candidate of path.includes("/")
    ? [path]
    : (process.env.PATH ?? "").split(delimiter).map((p) => join(p, path))) {
    try {
      await access(candidate, constants.X_OK);
      return true;
    } catch {
      /* keep searching */
    }
  }
  return false;
}
export async function exportCapabilities() {
  const fbx = await executable(blenderPath());
  const bsp =
    Boolean(process.env.QUAKE_PALETTE_PATH) &&
    (
      await Promise.all([
        executable(process.env.QBSP_PATH ?? "qbsp"),
        executable(process.env.VIS_PATH ?? "vis"),
        executable(process.env.LIGHT_PATH ?? "light"),
        access(process.env.QUAKE_PALETTE_PATH!).then(
          () => true,
          () => false,
        ),
      ])
    ).every(Boolean);
  return {
    fbx,
    bsp,
    instructions: {
      fbx: "Set BLENDER_PATH before npm run dev.",
      bsp: "Set QBSP_PATH, VIS_PATH, LIGHT_PATH and QUAKE_PALETTE_PATH before npm run dev.",
    },
  };
}
function json(res: ServerResponse, code: number, value: unknown) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage) {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024 * 1024)
      throw new Error("Export request exceeds 64 MB.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function vectorExportService(): Plugin {
  const jobs = new Map<string, Job>();
  const clean = () => {
    for (const [id, job] of jobs)
      if (job.state !== "running" && Date.now() - job.created > 600_000)
        jobs.delete(id);
  };
  return {
    name: "levelspec-local-export",
    apply: "serve",
    configureServer(server) {
      server.httpServer?.once("close", () => {
        for (const job of jobs.values()) job.abort.abort();
        jobs.clear();
      });
      server.middlewares.use("/api/exports", async (req, res) => {
        try {
          const host = req.headers.host ?? "",
            origin = req.headers.origin;
          const remote = req.socket.remoteAddress ?? "";
          if (
            !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote) ||
            !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ||
            (origin && new URL(origin).host !== host)
          ) {
            json(res, 403, { error: "Local same-origin requests only." });
            return;
          }
          clean();
          const path = (req.url ?? "/").split("?")[0];
          if (req.method === "GET" && path === "/capabilities") {
            json(res, 200, await exportCapabilities());
            return;
          }
          if (req.method === "POST" && (path === "/" || path === "")) {
            if (req.headers["content-type"] !== "application/json") {
              json(res, 415, { error: "Expected application/json." });
              return;
            }
            if ([...jobs.values()].some((j) => j.state === "running")) {
              json(res, 429, {
                error: "An export is already running. Wait or cancel it.",
              });
              return;
            }
            const input = await body(req);
            if (
              typeof input.source !== "string" ||
              input.source.length > 5_000_000 ||
              !Array.isArray(input.formats) ||
              !input.formats.length ||
              input.formats.some(
                (f: unknown) =>
                  !["glb", "gltf", "fbx", "bsp"].includes(String(f)),
              )
            )
              throw new Error("Invalid source or format selection.");
            if ([...jobs.values()].some((j) => j.state === "running")) {
              json(res, 429, { error: "An export is already running." });
              return;
            }
            while (jobs.size >= 8) jobs.delete(jobs.keys().next().value!);
            const id = randomUUID(),
              job: Job = {
                abort: new AbortController(),
                state: "running",
                progress: "Starting",
                created: Date.now(),
              };
            jobs.set(id, job);
            json(res, 202, { id });
            void (async () => {
              const temp = await mkdtemp(
                join(tmpdir(), "levelspec-export-service-"),
              );
              try {
                const options = {
                  signal: job.abort.signal,
                  onProgress: (line: string) => {
                    job.progress = line.slice(-2000);
                  },
                };
                const level = await compile(parseLevelSvgx(input.source), {
                  ...options,
                  uvs: Boolean(input.uvs),
                  retainExportSolids: input.formats.includes("bsp"),
                });
                if (
                  input.geometryHash &&
                  level.geometryHash !== input.geometryHash
                )
                  throw new Error(
                    "Source no longer matches the preview. Recompile before exporting.",
                  );
                const validation = await validateForRuntime(level, {
                  sealed: true,
                });
                if (!validation.passed)
                  throw new Error(
                    `Validation failed: ${validation.diagnostics
                      .filter((d) => d.severity === "error")
                      .map((d) => d.message)
                      .join("; ")}`,
                  );
                const assets = await resolveExportAssets(
                  level,
                  async (ref) => {
                    const encoded = input.assets?.[ref];
                    if (typeof encoded !== "string")
                      throw new Error(
                        "Select the referenced companion image in the export dialog.",
                      );
                    return Buffer.from(encoded, "base64");
                  },
                  options.signal,
                );
                const result = await exportLevel(level, {
                  ...options,
                  formats: input.formats as ExportFormat[],
                  assets,
                  output: join(temp, "output"),
                  quakePalette: process.env.QUAKE_PALETTE_PATH,
                });
                const files: Record<string, Uint8Array> = {};
                for (const file of result.files)
                  files[file.replaceAll("\\", "/")] = await readFile(
                    join(result.output, file),
                  );
                job.abort.signal.throwIfAborted();
                job.bytes = zipSync(files);
                job.state = "done";
                job.progress = "Ready to download";
              } catch (error) {
                job.state = job.abort.signal.aborted ? "cancelled" : "failed";
                job.error = (error as Error).message;
              } finally {
                await rm(temp, { recursive: true, force: true });
              }
            })().catch((error) => {
              job.state = "failed";
              job.error = String(error);
            });
            return;
          }
          const match = /^\/([a-f0-9-]+)(\/download)?$/.exec(path),
            job = match && jobs.get(match[1]);
          if (!job) {
            json(res, 404, { error: "Export not found or expired." });
            return;
          }
          if (req.method === "DELETE") {
            job.abort.abort(new Error("Export cancelled"));
            if (job.state === "done") jobs.delete(match![1]);
            json(res, 200, { cancelled: true });
            return;
          }
          if (req.method !== "GET") {
            json(res, 405, { error: "Method not allowed." });
            return;
          }
          if (match![2]) {
            if (job.state !== "done" || !job.bytes) {
              json(res, 409, { error: "Export is not ready." });
              return;
            }
            res.writeHead(200, {
              "Content-Type": "application/zip",
              "Cache-Control": "no-store",
              "Content-Disposition":
                'attachment; filename="levelspec-export.zip"',
            });
            res.end(job.bytes);
            return;
          }
          json(res, 200, {
            state: job.state,
            progress: job.progress,
            error: job.error,
          });
        } catch (error) {
          if (!res.headersSent)
            json(res, 400, { error: (error as Error).message });
        }
      });
    },
  };
}
