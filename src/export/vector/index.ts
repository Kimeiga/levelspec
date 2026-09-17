/** Node-only export orchestration. Browser users import levelspec/vector instead. */
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
  readdir,
  rename,
  open,
  lstat,
} from "node:fs/promises";
import { dirname, resolve, join, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompiledLevel } from "../../vector/types.ts";
import { toGLB, toGLTF, toRuntime } from "../../vector/export.ts";
import {
  assertExportable,
  exportMetadata,
  exportName,
  resolveExportAssets,
  type ExportAsset,
  type ExportFiles,
  type ExportFormat,
} from "../../vector/export-assets.ts";
import { fbxTextures } from "./textures.ts";
import { blenderPath, runTool } from "./process.ts";
import { exportBSP, type BSPOptions } from "./bsp.ts";
export interface ExportLevelOptions extends BSPOptions {
  formats: ExportFormat[];
  output: string;
  sourceFile?: string;
  assets?: Record<string, ExportAsset>;
  blender?: string;
  /** Additional compile reports/legacy artifacts included in the same transaction. */
  additionalFiles?: ExportFiles;
}
export async function writeExportFiles(directory: string, files: ExportFiles) {
  for (const [name, data] of Object.entries(files)) {
    const file = resolve(directory, name),
      rel = relative(directory, file);
    if (isAbsolute(rel) || rel.startsWith("..") || !rel)
      throw new Error(`Unsafe export filename: ${name}`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
  }
}
async function listFiles(directory: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(join(directory, prefix), {
    withFileTypes: true,
  });
  const result: string[] = [];
  for (const entry of entries) {
    const name = join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...(await listFiles(directory, name)));
    else if (entry.isFile()) result.push(name);
  }
  return result;
}
/** Rollback on promotion failure; never replace unrelated files in an output folder. */
async function publish(
  stage: string,
  output: string,
  files: string[],
  backup: string,
  signal?: AbortSignal,
) {
  await mkdir(output, { recursive: true });
  const lock = join(output, ".levelspec-export.lock");
  let handle;
  try {
    handle = await open(lock, "wx");
  } catch {
    throw new Error(`Another export is publishing to ${output}.`);
  }
  const saved: string[] = [],
    installed: string[] = [];
  try {
    for (const name of files) {
      signal?.throwIfAborted();
      const dest = join(output, name),
        old = join(backup, name);
      await mkdir(dirname(dest), { recursive: true });
      await mkdir(dirname(old), { recursive: true });
      try {
        const existing = await lstat(dest);
        if (!existing.isFile() && !existing.isSymbolicLink())
          throw new Error(`Export would replace a directory: ${dest}`);
        await rename(dest, old);
        saved.push(name);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      await rename(join(stage, name), dest);
      installed.push(name);
    }
    signal?.throwIfAborted();
  } catch (error) {
    for (const name of installed.reverse())
      await rm(join(output, name), { force: true });
    for (const name of saved.reverse())
      await rename(join(backup, name), join(output, name));
    throw error;
  } finally {
    await handle.close();
    await rm(lock, { force: true });
  }
}
export async function exportLevel(
  level: CompiledLevel,
  options: ExportLevelOptions,
) {
  const formats = [...new Set(options.formats)];
  if (
    !formats.length ||
    formats.some((f) => !["glb", "gltf", "fbx", "bsp"].includes(f))
  )
    throw new Error("Choose glb, gltf, fbx, or bsp export formats.");
  options.signal?.throwIfAborted();
  const assets =
    options.assets ??
    (await resolveExportAssets(
      level,
      async (reference) => {
        if (/^[a-z]+:/i.test(reference))
          throw new Error("Use a local PNG/JPEG file, not a URL.");
        return readFile(
          resolve(
            options.sourceFile
              ? dirname(resolve(options.sourceFile))
              : process.cwd(),
            reference,
          ),
        );
      },
      options.signal,
    ));
  assertExportable(level, { assets });
  const output = resolve(options.output),
    name = exportName(level.document.id);
  await mkdir(dirname(output), { recursive: true });
  const work = await mkdtemp(join(dirname(output), ".levelspec-export-")),
    stage = join(work, "stage"),
    backup = join(work, "backup");
  await mkdir(stage);
  await mkdir(backup);
  const report: Record<string, unknown> = {
    version: 1,
    geometryHash: level.geometryHash,
    formats,
    warnings: [],
    textures: Object.fromEntries(
      Object.entries(assets).map(([ref, a]) => [
        ref,
        {
          sourceSha256: a.hash,
          gltfFile: formats.includes("gltf") ? a.file : undefined,
          embeddedInGLB: formats.includes("glb"),
        },
      ]),
    ),
  };
  try {
    const files: ExportFiles = { ...options.additionalFiles };
    if (formats.includes("glb")) {
      options.onProgress?.("Writing GLB");
      files[`${name}.glb`] = toGLB(level, { assets });
    }
    if (formats.includes("gltf")) {
      options.onProgress?.("Writing glTF");
      Object.assign(files, toGLTF(level, { assets }));
    }
    files[`${name}.levelspec.json`] = JSON.stringify(
      exportMetadata(level, formats),
      null,
      2,
    );
    await writeExportFiles(stage, files);
    if (formats.includes("fbx")) {
      const textures = fbxTextures(level, assets);
      await writeExportFiles(stage, textures.files);
      // The worker payload and textures share one directory so no user path enters Python.
      const payloadFile = join(stage, ".fbx-input.json");
      await writeFile(
        payloadFile,
        JSON.stringify({
          ...toRuntime(level),
          textureFiles: textures.textureFiles,
        }),
      );
      options.onProgress?.("Exporting FBX with Blender");
      const log = await runTool(
        options.blender ?? blenderPath(),
        [
          "--background",
          "--factory-startup",
          "--python-exit-code",
          "1",
          "--python",
          fileURLToPath(
            new URL("../../../tools/export/fbx.py", import.meta.url),
          ),
          "--",
          "--input",
          payloadFile,
          "--output",
          join(stage, `${name}.fbx`),
        ],
        options,
      );
      await rm(payloadFile);
      await writeFile(join(stage, `${name}.fbx.log`), log);
      const header = await readFile(join(stage, `${name}.fbx`));
      if (header.toString("ascii", 0, 19) !== "Kaydara FBX Binary ")
        throw new Error("Blender did not produce binary FBX.");
      report.fbx = {
        blender: log.match(/LEVELSPEC_FBX_COMPLETE (.+)/)?.[1],
        textureFiles: textures.textureFiles,
        warnings: [
          "Canonical normals and material tangent/binormal frames are serialized explicitly; destination importers may regenerate or quantize them.",
          "PBR roughness/metalness transport depends on the importer; authoritative values remain in the sidecar.",
        ],
      };
    }
    if (formats.includes("bsp"))
      report.bsp = await exportBSP(level, assets, stage, name, options);
    options.signal?.throwIfAborted();
    await writeFile(
      join(stage, `${name}.export.json`),
      JSON.stringify(report, null, 2),
    );
    const names = await listFiles(stage);
    await publish(stage, output, names, backup, options.signal);
    return { output, files: names, report };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
export type {
  ExportFormat,
  ExportAsset,
  ExportFiles,
} from "../../vector/export-assets.ts";
