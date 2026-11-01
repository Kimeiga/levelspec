/** Prepare a reconstruction output directory without touching unrelated user files. */
import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const results = new Set([
  "best.level.svgx", "best.glb", "best-collision.glb",
  "best.runtime.json", "result.json",
]);

export function isRunArtifact(name: string): boolean {
  return results.has(name) || /^iteration-[0-9]+\.(?:json|level\.svgx)$/.test(name);
}

/** Clear stale success artifacts even when the next run fails before its first candidate. */
export async function prepareRunOutput(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries
    .filter(entry => isRunArtifact(entry.name) &&
      (entry.isFile() || entry.isSymbolicLink()))
    .map(entry => rm(join(directory, entry.name), { force: true })));
}
