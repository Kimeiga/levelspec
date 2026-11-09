import { readBoundedFile } from "./local-binary.ts";
import { dirname, resolve } from "node:path";

/**
 * Loads a local immutable PNG snapshot with a hard read bound. The host owns I/O;
 * the compiler owns PNG decoding and dimensional admission. Repeated references
 * share the same bytes for the lifetime of one command.
 */
export function localHeightmaps(
  sourceFile: string,
  maximumBytes = 16 * 1024 * 1024,
) {
  const snapshots = new Map<string, Uint8Array>();
  const load = async (
    asset: { src: string },
    signal?: AbortSignal,
  ): Promise<Uint8Array> => {
    signal?.throwIfAborted();
    const prior = snapshots.get(asset.src);
    if (prior) return prior;
    if (/^[a-z]+:/i.test(asset.src))
      throw new Error("Heightmap assets must be local files, not URLs.");
    const bytes = await readBoundedFile(
      resolve(dirname(sourceFile), asset.src),
      maximumBytes,
      signal,
    );
    snapshots.set(asset.src, bytes);
    return bytes;
  };
  return { load, snapshots };
}
