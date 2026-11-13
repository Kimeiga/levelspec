import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { createGLBAssetResolver } from "../vector/glb.ts";
import { migrateSvgx } from "../architecture/migration.ts";
import { parseAml, serializeAml } from "../architecture/format.ts";
import type { ArchitectureElement } from "../architecture/types.ts";

/** Content-addressed companion snapshot, shared by migration and the emitted source package. */
interface Companion { source: string; destination: string; sha256: string; bytes: Uint8Array }

/** Hashes exact source bytes rather than normalized XML or decoded geometry. */
function digest(bytes: Uint8Array): string { return createHash("sha256").update(bytes).digest("hex"); }

/**
 * Publishes a new portable AML project without touching the source or overwriting a destination.
 * Failure/cancellation removes only the directory exclusively created by this invocation.
 */
export async function migrateProject(input: string, destination: string, options: { signal?: AbortSignal } = {}): Promise<{ artifacts: string[] }> {
  const source = resolve(input), output = resolve(destination), signal = options.signal;
  signal?.throwIfAborted();
  const bytes = await readFile(source, { signal }), snapshots = new Map<string, Companion>();
  const snapshot = async (reference: string): Promise<Companion> => {
    if (/^[a-z][a-z\d+.-]*:/i.test(reference)) throw new Error(`Migration requires local companions, not URLs: ${reference}`);
    const file = resolve(dirname(source), reference), existing = snapshots.get(file);
    if (existing) return existing;
    const bytes = await readFile(file, { signal }), sha256 = digest(bytes), extension = extname(file).toLowerCase();
    const companion = { source: file, destination: `companions/${sha256}${/^\.[a-z\d]+$/.test(extension) ? extension : ""}`, sha256, bytes };
    snapshots.set(file, companion); return companion;
  };
  const resolveAsset = createGLBAssetResolver(async reference => (await snapshot(reference)).bytes);
  const document = await migrateSvgx(bytes.toString("utf8"), { resolveAsset, signal });
  const rewrite = async (element: ArchitectureElement): Promise<void> => {
    signal?.throwIfAborted();
    if (element.kind === "visual-mesh") element.src = (await snapshot(element.src)).destination;
    if ("children" in element) for (const child of element.children) await rewrite(child);
  };
  for (const element of document.elements) await rewrite(element);
  for (const material of document.materials) if (material.texture) material.texture = (await snapshot(material.texture)).destination;
  for (const reference of document.references) reference.image = (await snapshot(reference.image)).destination;
  const text = serializeAml(document); parseAml(text);
  const manifest = {
    version: 1, authoringFormat: "aml", authoringVersion: "1", source, sourceSha256: digest(bytes),
    translation: "mechanical-source", architecturalIntentInferred: false,
    companions: [...snapshots.values()].map(({ bytes, ...entry }) => ({ ...entry, size: bytes.byteLength })),
  };
  signal?.throwIfAborted();
  await mkdir(dirname(output), { recursive: true });
  await mkdir(output);
  const artifacts = [join(output, "level.aml"), join(output, "migration.json")];
  try {
    if (snapshots.size) await mkdir(join(output, "companions"));
    const written = new Set<string>();
    for (const companion of snapshots.values()) {
      signal?.throwIfAborted();
      const file = join(output, companion.destination);
      if (written.has(file)) continue;
      await writeFile(file, companion.bytes, { flag: "wx", signal }); written.add(file); artifacts.push(file);
    }
    await writeFile(artifacts[0], text, { flag: "wx", signal });
    await writeFile(artifacts[1], `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", signal });
    signal?.throwIfAborted();
    return { artifacts };
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  }
}
