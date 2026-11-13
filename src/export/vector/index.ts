import { withBuiltinMaterialImages } from "../../materials/images.ts";
import { createHash } from "node:crypto";
/** Node-only export orchestration. Browser users import levelspec instead. */
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
import { dirname, resolve, join, relative, isAbsolute, parse } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompiledLevel } from "../../vector/types.ts";
import { toGLB, toGLTF, toRuntime } from "../../vector/export.ts";
import {
  assertExportable,
  exportMetadata,
  exportName,
  resolveExportAssets,
  usedExportMaterialIds,
  type ExportAsset,
  type ExportFiles,
  type ExportFormat,
} from "../../vector/export-assets.ts";
import { fbxTextures } from "./textures.ts";
import { blenderPath, runTool } from "./process.ts";
import { exportBSP, type BSPOptions } from "./bsp.ts";
import { materialTextures } from "../../vector/materials.ts";
export interface ExportLevelOptions extends BSPOptions {
  formats: ExportFormat[];
  output: string;
  sourceFile?: string;
  assets?: Record<string, ExportAsset>;
  blender?: string;
  /** Additional compile reports/legacy artifacts included in the same transaction. */
  additionalFiles?: ExportFiles;
  /** Immutable authoring heightmap snapshots retained by a host during compilation. */
  heightmaps?: Record<string, Uint8Array>;
}
/** Rejects redirected destination parents; this is not a concurrent filesystem sandbox. */
async function checkDestination(directory: string) {
  const absolute = resolve(directory);
  let current = parse(absolute).root;
  for (const part of relative(current, absolute).split(/[\\/]/).filter(Boolean)) {
    current = join(current, part);
    // macOS supplies these system aliases even for ordinary temporary directories.
    if (process.platform === "darwin" && ["/var", "/tmp"].includes(current)) continue;
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) throw new Error(`Export destination contains a symlink: ${current}`);
      if (!info.isDirectory()) throw new Error(`Export destination is not a directory: ${current}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
export async function writeExportFiles(directory: string, files: ExportFiles) {
  await checkDestination(directory);
  for (const [name, data] of Object.entries(files)) {
    const file = resolve(directory, name),
      rel = relative(directory, file);
    if (isAbsolute(rel) || rel.startsWith("..") || !rel)
      throw new Error(`Unsafe export filename: ${name}`);
    await checkDestination(dirname(file));
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
  await checkDestination(output);
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
      await checkDestination(dirname(dest));
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
  if (level.mesh.colors && formats.some(format => !["glb", "gltf"].includes(format))) throw new Error("Vertex-colored dressing currently exports through GLB or glTF.");
  const usedMaterials = usedExportMaterialIds(level, [...new Set(level.mesh.surfaces)].filter(index => level.surfaces[index].visible !== false));
  const visibleMaterials = level.document.materials.filter(material => usedMaterials.has(material.id));
  if (visibleMaterials.some(material => material.emissive && (material.emissiveStrength ?? 1) > 0) && formats.some(format => !["glb", "gltf"].includes(format)))
    throw new Error("Emissive materials currently export through GLB or glTF only.");
  if (visibleMaterials.some(material => material.normalTexture) && formats.some(format => !["glb", "gltf"].includes(format)))
    throw new Error("Normal-mapped materials currently export through GLB or glTF.");
  if (visibleMaterials.some(material => material.alphaCutoff !== undefined) && formats.some(format => !["glb", "gltf"].includes(format)))
    throw new Error("Materials with an alpha cutoff currently export through GLB or glTF.");
  if (visibleMaterials.some(material => material.metallicRoughnessTexture) && formats.some(format => !["glb", "gltf"].includes(format)))
    throw new Error("Metallic-roughness textures currently export through GLB or glTF.");
  if (visibleMaterials.some(material => (material.opacity ?? 1) < 1) && formats.some(format => !["glb", "gltf"].includes(format)))
    throw new Error("Alpha-blended materials currently export through GLB or glTF.");
  const assets = {
    ...level.generatedImages,
    ...(options.assets ??
    (await resolveExportAssets(
      level,
      withBuiltinMaterialImages(async (reference, signal) => {
        if (/^[a-z]+:/i.test(reference))
          throw new Error("Use a local PNG/JPEG file, not a URL.");
        return readFile(
          resolve(
            options.sourceFile
              ? dirname(resolve(options.sourceFile))
              : process.cwd(),
            reference,
          ),
          { signal },
        );
      }),
      options.signal,
    ))),
  };
  assertExportable(level, { assets });
  const output = resolve(options.output),
    name = exportName(level.document.id);
  await checkDestination(output);
  await mkdir(dirname(output), { recursive: true });
  const work = await mkdtemp(join(dirname(output), ".levelspec-export-")),
    stage = join(work, "stage"),
    backup = join(work, "backup");
  await mkdir(stage);
  await mkdir(backup);
  const heightmapSnapshots = Object.fromEntries(Object.entries(options.heightmaps ?? {}).map(([source,bytes]) => {
    const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
    return [source,{sourceSha256,file:`heightmaps/${sourceSha256}.png`,size:bytes.byteLength}];
  }));
  const visualMaterials = usedExportMaterialIds(level, [...new Set(level.mesh.surfaces)].filter(index => level.surfaces[index].visible !== false));
  const visualImageHashes = new Set(level.document.materials.filter(material => visualMaterials.has(material.id))
    .flatMap(material => materialTextures(material).map(reference => assets[reference].hash)));
  const gltfImageFiles = new Map<string, string>();
  const report: Record<string, unknown> = {
    version: 1,
    geometryHash: level.geometryHash,
    formats,
    warnings: [],
    heightmaps: heightmapSnapshots,
  };
  try {
    const files: ExportFiles = { ...options.additionalFiles };
    for (const image of Object.values(level.generatedImages ?? {})) files[image.file] = image.bytes;
    for (const [source, bytes] of Object.entries(options.heightmaps ?? {})) files[heightmapSnapshots[source].file] = bytes;
    if (formats.includes("glb")) {
      options.onProgress?.("Writing GLB");
      files[`${name}.glb`] = toGLB(level, { assets });
    }
    if (formats.includes("gltf")) {
      options.onProgress?.("Writing glTF");
      const gltfFiles = toGLTF(level, { assets });
      for (const asset of Object.values(assets)) {
        if (Object.hasOwn(gltfFiles, asset.file)) gltfImageFiles.set(asset.hash, asset.file);
      }
      Object.assign(files, gltfFiles);
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
    report.textures = Object.fromEntries(
      Object.entries(assets).map(([reference, asset]) => [reference, {
        sourceSha256: asset.hash,
        gltfFile: gltfImageFiles.get(asset.hash),
        embeddedInGLB: formats.includes("glb") && visualImageHashes.has(asset.hash),
      }]),
    );
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
