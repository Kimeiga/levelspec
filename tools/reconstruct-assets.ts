/** Frozen local companion bytes shared by evaluation, feedback and archival output. */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { createGLBAssetResolver, parseLevelSvgx, serializeLevelSvgx,
  type LevelDocument } from "../src/vector/index.ts";

type CompanionKind = "asset" | "texture" | "reference";
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
function companions(document: LevelDocument): Companion[] {
  return [
    ...(document.assets ?? []).map(asset => ({ kind: "asset" as const,
      path: asset.src, replace: (path: string) => { asset.src = path; } })),
    ...document.materials.filter(material => material.texture).map(material => ({
      kind: "texture" as const, path: material.texture!,
      replace: (path: string) => { material.texture = path; } })),
    ...(document.references ?? []).map(reference => ({ kind: "reference" as const,
      path: reference.image, replace: (path: string) => { reference.image = path; } })),
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
export function createCompanionStore(baseDirectory: string) {
  const base = resolve(baseDirectory);
  const cache = new Map<string, Promise<Buffer>>();
  const read = (reference: string, signal?: AbortSignal): Promise<Buffer> => {
    signal?.throwIfAborted();
    if (/^[a-z][a-z0-9+.-]*:/i.test(reference))
      return Promise.reject(new Error(`Reconstruction requires a local companion: ${reference}`));
    const path = resolve(base, reference);
    let bytes = cache.get(path);
    if (!bytes) {
      bytes = readFile(path);
      cache.set(path, bytes);
    }
    return bytes.then(value => { signal?.throwIfAborted(); return Buffer.from(value); });
  };
  /** Bind explicitly supplied photo bytes when the source has only a logical filename. */
  async function bind(reference: string, bytes: Buffer): Promise<void> {
    try {
      if (!(await read(reference)).equals(bytes))
        throw new Error(`Different companion bytes share the reference ${reference}.`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      cache.set(resolve(base, reference), Promise.resolve(Buffer.from(bytes)));
    }
  }
  const resolveAsset = createGLBAssetResolver(read);

  /** Preserve dependencies before output cleanup, including a previous best input. */
  async function capture(source: string): Promise<void> {
    let document: LevelDocument;
    try { document = parseLevelSvgx(source); } catch { return; }
    await Promise.allSettled(companions(document).map(item => read(item.path)));
  }

  /**
   * Archives available bytes and rewrites a separate editable copy. Missing files
   * remain explicit in the manifest; geometry asset failures are compilation errors.
   */
  async function archive(source: string, out: string, stem: string): Promise<string | null> {
    const records: CompanionRecord[] = [];
    let portable: string | null = null;
    let parseError: string | undefined;
    let document: LevelDocument | undefined;
    try { document = parseLevelSvgx(source); }
    catch (error) { parseError = error instanceof Error ? error.message : String(error); }
    if (document) {
      for (const item of companions(document)) {
        const record: CompanionRecord = { kind: item.kind, source: item.path };
        records.push(record);
        let bytes: Buffer;
        try { bytes = await read(item.path); }
        catch (error) {
          record.error = error instanceof Error ? error.message : String(error);
          continue;
        }
        record.sha256 = companionHash(bytes);
        const suffix = extname(item.path).toLowerCase();
        record.snapshot = `companions/${record.sha256}${/^\.[a-z0-9]+$/.test(suffix) ? suffix : ".bin"}`;
        await mkdir(join(out, "companions"), { recursive: true });
        const path = join(out, record.snapshot);
        try { await writeFile(path, bytes, { flag: "wx" }); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
          if (companionHash(await readFile(path)) !== record.sha256)
            throw new Error(`Companion snapshot does not match its content hash: ${path}`);
        }
        item.replace(record.snapshot);
      }
      portable = serializeLevelSvgx(document);
    }
    await writeFile(join(out, `${stem}.companions.json`), JSON.stringify({
      sourceBaseDirectory: base, sourceSha256: companionHash(Buffer.from(source)),
      portableComplete: !parseError && records.every(record => !record.error),
      parseError, companions: records,
    }, null, 2));
    return portable;
  }
  return { read, bind, resolveAsset, capture, archive };
}
export type CompanionStore = ReturnType<typeof createCompanionStore>;
