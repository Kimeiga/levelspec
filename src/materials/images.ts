/** Shipped image whitelist: no reference can escape the catalog directory. */
const IMAGES: Record<string, string> = {
  "levelspec-material:balcony-cloth-properties.png": new URL("./library/balcony-cloth-properties.png", import.meta.url).href,
  "levelspec-material:balcony-cloth-normal.png": new URL("./library/balcony-cloth-normal.png", import.meta.url).href,
  "levelspec-material:balcony-cloth.png": new URL("./library/balcony-cloth.png", import.meta.url).href,
  "levelspec-material:balcony-plants-properties.png": new URL("./library/balcony-plants-properties.png", import.meta.url).href,
  "levelspec-material:balcony-plants-normal.png": new URL("./library/balcony-plants-normal.png", import.meta.url).href,
  "levelspec-material:balcony-plants.png": new URL("./library/balcony-plants.png", import.meta.url).href,
  "levelspec-material:aircon.png": new URL("./library/aircon.png", import.meta.url).href,
  "levelspec-material:brushed-metal-normal.png": new URL("./library/brushed-metal-normal.png", import.meta.url).href,
  "levelspec-material:brushed-metal-properties.png": new URL("./library/brushed-metal-properties.png", import.meta.url).href,
  "levelspec-material:brushed-metal.png": new URL("./library/brushed-metal.png", import.meta.url).href,
  "levelspec-material:building-plaster-plain.png": new URL("./library/building-plaster-plain.png", import.meta.url).href,
  "levelspec-material:cloth.png": new URL("./library/cloth.png", import.meta.url).href,
  "levelspec-material:concrete-shared-normal.png": new URL("./library/concrete-shared-normal.png", import.meta.url).href,
  "levelspec-material:concrete-shared.png": new URL("./library/concrete-shared.png", import.meta.url).href,
  "levelspec-material:grocer-props-normal.png": new URL("./library/grocer-props-normal.png", import.meta.url).href,
  "levelspec-material:grocer-props-properties.png": new URL("./library/grocer-props-properties.png", import.meta.url).href,
  "levelspec-material:grocer-props.png": new URL("./library/grocer-props.png", import.meta.url).href,
  "levelspec-material:ground-asphalt-normal.png": new URL("./library/ground-asphalt-normal.png", import.meta.url).href,
  "levelspec-material:ground-asphalt.png": new URL("./library/ground-asphalt.png", import.meta.url).href,
  "levelspec-material:lettering.png": new URL("./library/lettering.png", import.meta.url).href,
  "levelspec-material:market-apple.png": new URL("./library/market-apple.png", import.meta.url).href,
  "levelspec-material:metal.png": new URL("./library/metal.png", import.meta.url).href,
  "levelspec-material:posters-atlas.jpg": new URL("./library/posters-atlas.jpg", import.meta.url).href,
  "levelspec-material:restaurant-food-normal.png": new URL("./library/restaurant-food-normal.png", import.meta.url).href,
  "levelspec-material:restaurant-food-properties.png": new URL("./library/restaurant-food-properties.png", import.meta.url).href,
  "levelspec-material:restaurant-food.png": new URL("./library/restaurant-food.png", import.meta.url).href,
  "levelspec-material:restaurant-surfaces-properties.png": new URL("./library/restaurant-surfaces-properties.png", import.meta.url).href,
  "levelspec-material:restaurant-surfaces.png": new URL("./library/restaurant-surfaces.png", import.meta.url).href,
  "levelspec-material:restaurant-tiles-normal.png": new URL("./library/restaurant-tiles-normal.png", import.meta.url).href,
  "levelspec-material:restaurant-tiles-properties.png": new URL("./library/restaurant-tiles-properties.png", import.meta.url).href,
  "levelspec-material:restaurant-tiles.png": new URL("./library/restaurant-tiles.png", import.meta.url).href,
  "levelspec-material:roofing.png": new URL("./library/roofing.png", import.meta.url).href,
  "levelspec-material:rust.png": new URL("./library/rust.png", import.meta.url).href,
  "levelspec-material:sheet.png": new URL("./library/sheet.png", import.meta.url).href,
  "levelspec-material:shop-timber-normal.png": new URL("./library/shop-timber-normal.png", import.meta.url).href,
  "levelspec-material:shop-timber-properties.png": new URL("./library/shop-timber-properties.png", import.meta.url).href,
  "levelspec-material:shop-timber.png": new URL("./library/shop-timber.png", import.meta.url).href,
  "levelspec-material:signboard.png": new URL("./library/signboard.png", import.meta.url).href,
  "levelspec-material:snack-packet.png": new URL("./library/snack-packet.png", import.meta.url).href,
  "levelspec-material:timber.png": new URL("./library/timber.png", import.meta.url).href,
  "levelspec-material:tarp.png": new URL("./library/tarp.png", import.meta.url).href,
  "levelspec-material:tarp-normal.png": new URL("./library/tarp-normal.png", import.meta.url).href,
  "levelspec-material:tarp-properties.png": new URL("./library/tarp-properties.png", import.meta.url).href,
  "levelspec-material:wall-ceramic-normal.png": new URL("./library/wall-ceramic-normal.png", import.meta.url).href,
  "levelspec-material:wall-ceramic-weathered.png": new URL("./library/wall-ceramic-weathered.png", import.meta.url).href,
  "levelspec-material:wall-metal-normal.png": new URL("./library/wall-metal-normal.png", import.meta.url).href,
  "levelspec-material:wall-metal-weathered.png": new URL("./library/wall-metal-weathered.png", import.meta.url).href,
};

export type MaterialImageReader = (reference: string, signal?: AbortSignal) => Promise<Uint8Array>;
const MAXIMUM_BYTES = 16 * 1024 * 1024;

/** Returns a packaged asset URL, or undefined for an authored companion; unknown library names fail. */
export function builtinMaterialURL(reference: string): string | undefined {
  if (!reference.startsWith("levelspec-material:")) return undefined;
  if (!Object.hasOwn(IMAGES, reference)) throw new Error(`Unknown library image ${reference}.`);
  return IMAGES[reference];
}

/** Reads a whitelisted local/bundled image with bounded allocation and cancellation. */
async function readBuiltinImage(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  signal?.throwIfAborted();
  if (url.startsWith("file:")) {
    // Browser bundles never execute the local-file branch.
    const module = "node:fs/promises";
    const { open } = await import(/* @vite-ignore */ module) as typeof import("node:fs/promises");
    const file = await open(new URL(url), "r");
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > MAXIMUM_BYTES) throw new Error("Library image exceeds its byte budget.");
      const bytes = new Uint8Array(stat.size + 1);
      let length = 0;
      while (length < bytes.length) {
        signal?.throwIfAborted();
        const read = await file.read(bytes, length, Math.min(65536, bytes.length - length), length);
        if (!read.bytesRead) break;
        length += read.bytesRead;
      }
      if (length > stat.size) throw new Error("Library image changed size during loading.");
      return bytes.subarray(0, length);
    } finally { await file.close(); }
  }
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) throw new Error(`Unable to load library image (${response.status}).`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAXIMUM_BYTES) throw new Error("Library image exceeds its byte budget.");
      chunks.push(chunk.value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

/**
 * Composes the shipped library with a host's authored-companion reader. Compose before
 * snapshotting: compiler callbacks are authoritative, so workers can replay frozen bytes.
 * Built-in names never use authored path/basename aliases. No network service is required.
 */
export function withBuiltinMaterialImages(authored?: MaterialImageReader): MaterialImageReader {
  return async (reference, signal) => {
    signal?.throwIfAborted();
    const url = builtinMaterialURL(reference);
    if (url) return readBuiltinImage(url, signal);
    if (!authored) throw new Error(`Material image ${reference} requires resolveMaterialImage.`);
    return authored(reference, signal);
  };
}
