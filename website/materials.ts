import plaster from "./assets/textures/plaster.png?url";
import stone from "./assets/textures/stone.png?url";
import brick from "./assets/textures/brick.png?url";
import paving from "./assets/textures/paving.png?url";
import tile from "./assets/textures/tile.png?url";
import wood from "./assets/textures/wood.png?url";
import type { CompiledLevel } from "../src/vector/types.ts";
import { resolveExportAssets } from "../src/vector/export-assets.ts";
export const materialURLs: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries({ plaster, stone, brick, paving, tile, wood }).map(
      ([id, url]) => [`textures/${id}.png`, url],
    ),
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
export async function originalMaterialFiles(): Promise<
  Record<string, Uint8Array>
> {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(materialURLs).map(async ([name, url]) => [
        name,
        await imageBytes(url),
      ]),
    ),
  );
}
