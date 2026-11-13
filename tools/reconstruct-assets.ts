import { readBoundedFile } from "../src/cli/local-binary.ts";
/** Frozen local companion bytes shared by evaluation, feedback and archival output. */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import {
  createGLBAssetResolver,
  parseAml,
  serializeAml,
  type ArchitectureDocument,
  type ArchitectureElement,
} from "../src/architecture/index.ts";

type CompanionKind = "asset" | "texture" | "reference" | "heightmap";
interface Companion {
  kind: CompanionKind;
  path: string;
  replace: (path: string) => void;
}
interface CompanionRecord {
  kind: CompanionKind;
  source: string;
  snapshot?: string;
  sha256?: string;
  error?: string;
}

/** Enumerates declared files without changing geometry or the original source. */
function companions(document: ArchitectureDocument): Companion[] {
  const native: Companion[] = [];
  const visit = (element: ArchitectureElement): void => {
    if (element.kind === "visual-mesh")
      native.push({
        kind: "asset",
        path: element.src,
        replace: (path) => {
          element.src = path;
        },
      });
    if (element.kind === "terrain" && element.heightmap)
      native.push({
        kind: "heightmap",
        path: element.heightmap,
        replace: (path) => {
          element.heightmap = path;
        },
      });
    if ("children" in element) element.children.forEach(visit);
  };
  document.elements.forEach(visit);
  document.definitions.forEach((definition) =>
    definition.children.forEach(visit),
  );
  return [
    ...native,
    ...document.materials.flatMap((material) => (["texture", "normalTexture"] as const)
      .filter((key) => material[key])
      .map((key) => ({
        kind: "texture" as const,
        path: material[key]!,
        replace: (path: string) => {
          material[key] = path;
        },
      }))),
    ...(document.references ?? []).map((reference) => ({
      kind: "reference" as const,
      path: reference.image,
      replace: (path: string) => {
        reference.image = path;
      },
    })),
  ];
}

/** Hashes original file bytes, including image metadata, for capture identity. */
export function companionHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Captures each absolute local path once per run. Rejected reads remain rejected;
 * later source edits cannot change bytes already used by the compiler.
 */
export interface CompanionLimits {
  maximumBytes?: number;
  maximumFiles?: number;
  maximumHeightmapBytes?: number;
}
export function createCompanionStore(
  baseDirectory: string,
  limits: CompanionLimits = {},
) {
  const maximumBytes = limits.maximumBytes ?? 256 * 1024 * 1024;
  const maximumFiles = limits.maximumFiles ?? 1024;
  const maximumHeightmapBytes =
    limits.maximumHeightmapBytes ?? 16 * 1024 * 1024;
  for (const value of [maximumBytes, maximumFiles, maximumHeightmapBytes])
    if (!Number.isSafeInteger(value) || value < 1)
      throw new RangeError("Companion budgets must be positive safe integers.");
  let retainedBytes = 0;
  let readQueue = Promise.resolve();
  const base = resolve(baseDirectory);
  const cache = new Map<string, Promise<Buffer>>();
  const heightmapPaths = new Set<string>();
  const archivedPaths = new Map<string, string>();
  let heightmapBytes = 0;
  let heightmapQueue = Promise.resolve();
  /** Serializes PNG admission across capture, compiler loading, and model previews. */
  const readHeightmap = async (
    reference: string,
    signal?: AbortSignal,
  ): Promise<Buffer> => {
    const path = resolve(base, reference);
    const pending = heightmapQueue.then(async () => {
      signal?.throwIfAborted();
      const remaining = maximumHeightmapBytes - heightmapBytes;
      if (!heightmapPaths.has(path) && remaining < 1)
        throw new Error("Reconstruction heightmap byte budget exceeded.");
      const bytes = await read(
        reference,
        signal,
        heightmapPaths.has(path) ? maximumHeightmapBytes : remaining,
      );
      if (!heightmapPaths.has(path)) {
        if (heightmapBytes + bytes.byteLength > maximumHeightmapBytes)
          throw new Error("Reconstruction heightmap byte budget exceeded.");
        heightmapBytes += bytes.byteLength;
        heightmapPaths.add(path);
      }
      return bytes;
    });
    heightmapQueue = pending.then(
      () => {},
      () => {},
    );
    return pending;
  };
  const read = (
    reference: string,
    signal?: AbortSignal,
    fileLimit = maximumBytes,
  ): Promise<Buffer> => {
    signal?.throwIfAborted();
    if (/^[a-z][a-z0-9+.-]*:/i.test(reference))
      return Promise.reject(
        new Error(`Reconstruction requires a local companion: ${reference}`),
      );
    const path = resolve(base, reference);
    let bytes = cache.get(path);
    if (!bytes) {
      if (cache.size >= maximumFiles)
        return Promise.reject(
          new Error("Reconstruction companion file budget exceeded."),
        );
      bytes = readQueue.then(async () => {
        signal?.throwIfAborted();
        const remaining = Math.min(fileLimit, maximumBytes - retainedBytes);
        if (remaining < 1)
          throw new Error("Reconstruction companion byte budget exceeded.");
        const snapshot = Buffer.from(
          await readBoundedFile(path, remaining, signal),
        );
        retainedBytes += snapshot.byteLength;
        return snapshot;
      });
      readQueue = bytes.then(
        () => {},
        () => {},
      );
      cache.set(path, bytes);
    }
    return bytes.then((value) => {
      signal?.throwIfAborted();
      if (value.byteLength > fileLimit)
        throw new Error("Reconstruction companion byte budget exceeded.");
      return Buffer.from(value);
    });
  };
  /** Bind explicitly supplied photo bytes when the source has only a logical filename. */
  async function bind(reference: string, bytes: Buffer): Promise<void> {
    try {
      if (!(await read(reference)).equals(bytes))
        throw new Error(
          `Different companion bytes share the reference ${reference}.`,
        );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const snapshot = Buffer.from(bytes);
      const admitted = readQueue.then(() => {
        if (retainedBytes + snapshot.byteLength > maximumBytes)
          throw new Error("Reconstruction companion byte budget exceeded.");
        retainedBytes += snapshot.byteLength;
        return snapshot;
      });
      readQueue = admitted.then(
        () => {},
        () => {},
      );
      cache.set(resolve(base, reference), admitted);
      await admitted;
    }
  }
  const resolveAsset = createGLBAssetResolver(read);

  /** Preserve dependencies before output cleanup, including a previous best input. */
  async function capture(source: string): Promise<void> {
    let document: ArchitectureDocument;
    try {
      document = parseAml(source);
    } catch {
      return;
    }
    for (const item of companions(document)) {
      try {
        await (item.kind === "heightmap"
          ? readHeightmap(item.path)
          : read(item.path));
      } catch {
        /* Retain failed snapshots for source-linked compiler and archive findings. */
      }
    }
  }

  /**
   * Archives available bytes and rewrites a separate editable copy. Missing files
   * remain explicit in the manifest; geometry asset failures are compilation errors.
   */
  async function archive(
    source: string,
    out: string,
    stem: string,
  ): Promise<string | null> {
    const records: CompanionRecord[] = [];
    let portable: string | null = null;
    let parseError: string | undefined;
    let document: ArchitectureDocument | undefined;
    try {
      document = parseAml(source);
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }
    if (document) {
      for (const item of companions(document)) {
        const record: CompanionRecord = { kind: item.kind, source: item.path };
        records.push(record);
        let bytes: Buffer;
        try {
          bytes = await (item.kind === "heightmap"
            ? readHeightmap(item.path)
            : read(item.path));
        } catch (error) {
          record.error = error instanceof Error ? error.message : String(error);
          continue;
        }
        record.sha256 = companionHash(bytes);
        const suffix = extname(item.path).toLowerCase();
        record.snapshot = `companions/${record.sha256}${/^\.[a-z0-9]+$/.test(suffix) ? suffix : ".bin"}`;
        await mkdir(join(out, "companions"), { recursive: true });
        const path = join(out, record.snapshot);
        try {
          await writeFile(path, bytes, { flag: "wx" });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
          if (companionHash(await readFile(path)) !== record.sha256)
            throw new Error(
              `Companion snapshot does not match its content hash: ${path}`,
            );
        }
        archivedPaths.set(resolve(base, item.path), record.snapshot);
        item.replace(record.snapshot);
      }
      portable = serializeAml(document);
    }
    await writeFile(
      join(out, `${stem}.companions.json`),
      JSON.stringify(
        {
          sourceBaseDirectory: base,
          sourceSha256: companionHash(Buffer.from(source)),
          portableComplete:
            !parseError && records.every((record) => !record.error),
          parseError,
          companions: records,
        },
        null,
        2,
      ),
    );
    return portable;
  }
  return {
    read,
    bind,
    resolveAsset,
    archivedReference: (reference: string) => {
      const snapshot = archivedPaths.get(resolve(base, reference));
      if (!snapshot)
        throw new Error(`Companion was not archived: ${reference}`);
      return snapshot;
    },
    resolveHeightmap: (asset: { src: string }, signal?: AbortSignal) =>
      readHeightmap(asset.src, signal),
    capture,
    archive,
  };
}
export type CompanionStore = ReturnType<typeof createCompanionStore>;
