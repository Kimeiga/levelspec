import type { CompiledLevel } from "../src/vector/types.ts";
import { resolveExportAssets } from "../src/vector/export-assets.ts";
const images = import.meta.glob<string>("./assets/textures/*-*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
export const materialURLs: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(images).map(([file, url]) => [
      file.replace("./assets/", ""),
      url,
    ]),
  ),
);
async function imageBytes(url: string): Promise<Uint8Array> {
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Texture download failed (${result.status})`);
  return new Uint8Array(await result.arrayBuffer());
}
/** Preview and exports consume the same original image bytes. */
export async function materialAssets(level: CompiledLevel) {
  return resolveExportAssets(level, async (reference) => {
    const url = materialURLs[reference];
    if (!url) throw new Error(`Unknown authored texture: ${reference}`);
    return imageBytes(url);
  });
}
export async function originalMaterialFiles(
  source?: string,
): Promise<Record<string, Uint8Array>> {
  const referenced = Object.entries(materialURLs).filter(
    ([name]) => !source || source.includes(`texture="${name}"`),
  );
  return Object.fromEntries(
    await Promise.all(
      referenced.map(async ([name, url]) => [name, await imageBytes(url)]),
    ),
  );
}
