import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { aborted } from "../../src/vector/types.ts";
import type { SurfaceMaterialArtifact, SurfaceMaterialCache } from "../../src/dressing/surface/material-cache.ts";

interface StoredImage { bytes: string; hash: string }
interface StoredArtifact {
  version: number;
  key: string;
  layers: { source: string; color: StoredImage; metallicRoughness: StoredImage; normal?: StoredImage }[];
}

/**
 * Stores complete encoded material artifacts with atomic file replacement.
 * The namespace must identify the loaded compiler/generators. A best-effort disk
 * quota evicts oldest artifacts across namespaces; simultaneous processes may
 * temporarily exceed it. No decoded textures or scene geometry are retained.
 */
export function createDiskMaterialCache(directory: string, namespace: string, maximumBytes = 256 * 1024 * 1024): SurfaceMaterialCache {
  if (!Number.isFinite(maximumBytes) || maximumBytes <= 0) throw new Error("Material cache budget must be finite and positive.");
  const prefix = createHash("sha256").update(namespace).digest("hex");
  let writes = Promise.resolve();
  let inventory: Map<string, { bytes: number; time: number }> | undefined;
  /** Initializes bounded-write accounting once; cache files are optional and may disappear concurrently. */
  async function files(): Promise<Map<string, { bytes: number; time: number }>> {
    if (inventory) return inventory;
    await mkdir(directory, { recursive: true });
    inventory = new Map();
    for (const name of await readdir(directory)) {
      if (!/^[a-f0-9]{64}-[a-f0-9]{64}\.json$/.test(name)) continue;
      try { const info = await stat(join(directory, name)); inventory.set(name, { bytes: info.size, time: info.mtimeMs }); } catch { /* Another compiler may evict it. */ }
    }
    return inventory;
  }
  /** Restricts artifact addresses to compiler-produced digests rather than caller-controlled paths. */
  function filename(key: string): string {
    if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Material cache keys must be SHA-256 digests.");
    return `${prefix}-${key}.json`;
  }
  return {
    async read(key, signal) {
      aborted(signal);
      try {
        const path = join(directory, filename(key));
        const info = await stat(path);
        if (info.size > maximumBytes) return undefined;
        const text = await readFile(path, { encoding: "utf8", signal });
        aborted(signal);
        const value = JSON.parse(text) as StoredArtifact;
        if (value.version !== 1 || value.key !== key || !Array.isArray(value.layers)) return undefined;
        const image = (channel: StoredImage) => {
          if (typeof channel.bytes !== "string" || channel.bytes.length > 44 * 1024 * 1024) throw new Error("Invalid cached image.");
          const decoded = Buffer.from(channel.bytes, "base64");
          return { bytes: new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength), hash: channel.hash };
        };
        return { version: 1, key, layers: value.layers.map(layer => ({ source: layer.source,
          color: image(layer.color), metallicRoughness: image(layer.metallicRoughness),
          ...(layer.normal ? { normal: image(layer.normal) } : {}) })) };
      } catch (error) {
        if (error && typeof error === "object" && "name" in error && error.name === "AbortError") throw error;
        aborted(signal);
        return undefined;
      }
    },
    async write(artifact: SurfaceMaterialArtifact, signal) {
      aborted(signal);
      const name = filename(artifact.key);
      const image = (channel: typeof artifact.layers[number]["color"]) => ({ hash: channel.hash,
        bytes: Buffer.from(channel.bytes.buffer, channel.bytes.byteOffset, channel.bytes.byteLength).toString("base64") });
      const text = JSON.stringify({ version: artifact.version, key: artifact.key,
        layers: artifact.layers.map(layer => ({ source: layer.source, color: image(layer.color),
          metallicRoughness: image(layer.metallicRoughness), ...(layer.normal ? { normal: image(layer.normal) } : {}) })) });
      const size = Buffer.byteLength(text);
      if (size > maximumBytes) return;
      const pending = writes.then(async () => {
        aborted(signal);
        const entries = await files();
        let used = [...entries.values()].reduce((sum, value) => sum + value.bytes, 0) - (entries.get(name)?.bytes ?? 0);
        if (used + size > maximumBytes) {
          for (const [other, info] of [...entries].sort((a, b) => a[1].time - b[1].time)) {
            if (used + size <= maximumBytes) break;
            if (other === name) continue;
            aborted(signal);
            await rm(join(directory, other), { force: true }); entries.delete(other); used -= info.bytes;
          }
        }
        const temporary = join(directory, `${name}.${randomUUID()}.tmp`);
        try {
          await writeFile(temporary, text, { signal });
          aborted(signal);
          await rename(temporary, join(directory, name));
          entries.set(name, { bytes: size, time: Date.now() });
        } finally { await rm(temporary, { force: true }); }
      });
      writes = pending.catch(() => {});
      await pending;
    },
  };
}
