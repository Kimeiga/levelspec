import { dirname, resolve } from "node:path";
import { readBoundedFile } from "./local-binary.ts";
import { withBuiltinMaterialImages } from "../materials/images.ts";

/**
 * Loads immutable local material image snapshots for one compile/export command.
 * Source references remain relative to AML; the compiler owns image decoding.
 */
export function localMaterialImages(sourceFile: string, maximumBytes = 16 * 1024 * 1024) {
  const snapshots = new Map<string, Uint8Array>();
  const read = withBuiltinMaterialImages(async (reference, signal) => {
    if (/^[a-z]+:/i.test(reference))
      throw new Error("Material images must be local files, not URLs.");
    return readBoundedFile(resolve(dirname(sourceFile), reference), maximumBytes, signal);
  });
  const load = async (reference: string, signal?: AbortSignal): Promise<Uint8Array> => {
    signal?.throwIfAborted();
    const prior = snapshots.get(reference);
    if (prior) return prior;
    const bytes = await read(reference, signal);
    snapshots.set(reference, bytes);
    return bytes;
  };
  return { load, snapshots };
}
