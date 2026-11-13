import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { strToU8, zipSync } from "fflate";

/** Packages already exported assets; preview JSON stays outside the portable download. */
export async function packageDemoPreset(directory: string): Promise<void> {
  const files: Record<string, Uint8Array> = {};
  for (const entry of await readdir(directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    const name = relative(directory, path);
    if (name === "package.zip" || name === "preview.json") continue;
    files[name] = await readFile(path);
  }
  files["README.txt"] = strToU8(
    "Open dressing-demo.glb in a glTF viewer. Textures are embedded. level.aml and textures/ reproduce the source. All domain coordinates use meters and Z-up.\n",
  );
  await writeFile(join(directory, "package.zip"), zipSync(files, { level: 6 }));
}
