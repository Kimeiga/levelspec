import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { DEMO_PRESETS } from "./presets.ts";

/** Hashes source, assets, and build orchestration in stable path order; independent of mtimes. */
export async function demoFingerprint(root: string): Promise<string> {
  const hash = createHash("sha256");
  for (const directory of ["src", "projects/dressing-demo", "tools/dressing-demo"]) {
    const paths = (await readdir(join(root, directory), { recursive: true }))
      .filter(path => /\.(ts|aml|json|png|jpe?g)$/.test(path)
        && !(directory === "tools/dressing-demo" && path === "profile.ts")).sort();
    for (const path of paths)
      hash.update(`${directory}/${path}`).update(await readFile(join(root, directory, path)));
  }
  hash.update(await readFile(join(root, "tools/build-dressing-demo.ts")));
  return hash.digest("hex");
}

/** Accepts a cached bundle only when its fingerprint and required preview/download files exist. */
export async function demoCacheAvailable(output: string, fingerprint: string): Promise<boolean> {
  try {
    const cached = JSON.parse(await readFile(join(output, "manifest.json"), "utf8"));
    if (cached.fingerprint !== fingerprint) return false;
    for (const preset of DEMO_PRESETS) {
      for (const file of ["level.aml", "dressing-demo.glb", "package.zip"])
        await access(join(output, preset, file));
      const preview = JSON.parse(await readFile(join(output, preset, "preview.json"), "utf8"));
      if (preview.version !== 2) return false;
      for (const image of Object.values(preview.generatedImages ?? {}) as { file: string }[])
        await access(join(output, preset, image.file));
    }
    return true;
  } catch {
    return false;
  }
}
