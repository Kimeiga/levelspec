import { hash as geometryHash } from "../src/vector/geometry.ts";
import { validateReceiverPages } from "./bake-bindings.ts";
import * as THREE from "three";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { gunzipSync } from "fflate";
import type { CompiledLevel, UVManifest } from "../src/vector/types.ts";
import {
  validateLightingManifest,
  sha256Bytes,
} from "../src/lighting/manifest.ts";
import { materialAssets } from "./materials.ts";
import catalog from "./assets/bakes/catalog.json";
const files = import.meta.glob<string>("./assets/bakes/*/*", {
  eager: true,
  query: "?url",
  import: "default",
});
export interface BakedLighting {
  uv1: number[];
  pages: number[];
  textures: THREE.DataTexture[];
  scale: number;
  samples: number;
  revision: string;
  liveFallbackFaces: number;
  dispose: () => void;
}
const textHash = (text: string) =>
  sha256Bytes(new TextEncoder().encode(text).buffer);
async function bytes(path: string) {
  const url = files[`./assets/bakes/${path}`];
  if (!url) throw new Error("Baked asset is missing from this build.");
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Baked asset unavailable (${response.status})`);
  return response.arrayBuffer();
}
export async function loadBakedLighting(
  level: CompiledLevel,
  source: string,
): Promise<BakedLighting | undefined> {
  const hash = await textHash(source),
    entry = catalog.find((e) => e.sourceHash === hash);
  if (!entry) return;
  const data = new Uint8Array(await bytes(entry.binding));
  const binding = JSON.parse(
    new TextDecoder().decode(
      data[0] === 31 && data[1] === 139 ? gunzipSync(data) : data,
    ),
  );
  if (
    binding.sourceHash !== hash ||
    binding.geometryHash !== level.geometryHash
  )
    throw new Error("Baked geometry does not match the compiled source.");
  const corners = level.mesh.indices.flatMap((v) =>
    level.mesh.positions.slice(v * 3, v * 3 + 3),
  );
  if ((await textHash(JSON.stringify(corners))) !== binding.cornerHash)
    throw new Error("Baked triangle mapping does not match.");
  if (
    binding.uv1.length !== level.mesh.indices.length * 2 ||
    binding.pages.length !== level.mesh.indices.length / 3 ||
    !binding.uv1.every((v: number) => Number.isFinite(v) && v >= 0 && v <= 1)
  )
    throw new Error("Invalid baked UV binding.");
  if (
    (await geometryHash({ uv: binding.uv1, pages: binding.pages })) !==
    binding.atlas.uvHash
  )
    throw new Error("Baked UV checksum failed.");
  await validateLightingManifest(
    { ...level, atlas: binding.atlas as UVManifest },
    binding.manifest,
  );
  const assets = await materialAssets(level);
  for (const [ref, asset] of Object.entries(assets))
    if (binding.manifest.materialAssets[ref] !== asset.hash)
      throw new Error("Baked texture albedo is stale.");
  const textures: THREE.DataTexture[] = [];
  try {
    for (const page of binding.manifest.pages) {
      const parse = async (image: { file: string; sha256: string }) => {
        if (!/^[\w.-]+$/.test(image.file))
          throw new Error("Invalid lightmap filename.");
        const data = await bytes(`${entry.style}/${image.file}`);
        if ((await sha256Bytes(data)) !== image.sha256)
          throw new Error("Lightmap checksum failed.");
        return new EXRLoader().parse(data);
      };
      const image = await parse(page),
        expected = binding.atlas.pages[page.id];
      if (
        !image.data ||
        typeof image.width !== "number" ||
        typeof image.height !== "number" ||
        image.width !== expected.width ||
        image.height !== expected.height
      )
        throw new Error("Lightmap dimensions are invalid.");
      const texture = new THREE.DataTexture(
        image.data,
        image.width,
        image.height,
        THREE.RGBAFormat,
        image.type,
      );
      textures.push(texture);
      texture.colorSpace = THREE.LinearSRGBColorSpace;
      texture.channel = 1;
      texture.flipY = false;
      const mipmaps = [
        { data: image.data, width: image.width, height: image.height },
      ];
      for (let i = 0; i < page.mips.length; i++) {
        const mip = await parse(page.mips[i]);
        if (
          !mip.data ||
          mip.type !== image.type ||
          mip.width !== Math.max(1, image.width >> (i + 1)) ||
          mip.height !== Math.max(1, image.height >> (i + 1))
        )
          throw new Error("Invalid padded lightmap mip.");
        mipmaps.push({
          data: mip.data,
          width: mip.width!,
          height: mip.height!,
        });
      }
      texture.mipmaps = mipmaps;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
    }
    const liveFallbackFaces = validateReceiverPages(
      level,
      binding.pages,
      textures.length,
    );
    return {
      liveFallbackFaces,
      uv1: binding.uv1,
      pages: binding.pages,
      textures,
      scale: binding.manifest.irradianceScale,
      samples: binding.manifest.samples,
      revision: binding.manifest.revision,
      dispose: () => textures.forEach((t) => t.dispose()),
    };
  } catch (error) {
    textures.forEach((t) => t.dispose());
    throw error;
  }
}
