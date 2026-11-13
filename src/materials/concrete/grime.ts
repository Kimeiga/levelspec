import { ClampToEdgeWrapping, DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat } from "three";

let cachedMask: DataTexture | undefined;

/** Smooth periodic noise over one horizontal repeat, with a stable seed. */
function noise(u: number, cells: number, seed: number): number {
  const position = u * cells;
  const cell = Math.floor(position);
  const fraction = position - cell;
  const blend = fraction * fraction * (3 - 2 * fraction);
  const hash = (index: number): number => {
    const value = Math.sin(((index % cells + cells) % cells) * 127.1 + seed * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  return hash(cell) * (1 - blend) + hash(cell + 1) * blend;
}

/**
 * Returns the module-owned, immutable grime mask: eight meters across, one meter
 * below a top edge. Shared for this page lifetime; consumers must not dispose it.
 * This stores material coverage only, never illumination or shadows.
 */
export function topGrimeMask(): DataTexture {
  if (cachedMask) return cachedMask;
  const width = 512, height = 256;
  const data = new Uint8Array(width * height * 4);
  for (let x = 0; x < width; x++) {
    const u = (x + 0.5) / width;
    const broad = noise(u, 13, 7);
    const run = Math.pow(noise(u, 113, 31), 3);
    const length = 0.12 + 0.6 * noise(u, 37, 17);
    for (let y = 0; y < height; y++) {
      const depth = y / (height - 1);
      const grain = 0.72 + 0.28 * noise(u, 239, y + 53);
      const band = Math.exp(-depth / (0.045 + broad * 0.11)) * (0.42 + broad * 0.5);
      const drip = run * Math.exp(-depth / length) * 0.7;
      const fade = Math.max(0, Math.min(1, (1 - depth) / 0.2));
      const value = Math.round(Math.min(1, (band + drip) * grain * fade) * 255);
      const offset = (y * width + x) * 4;
      data.set([value, value, value, 255], offset);
    }
  }
  const mask = new DataTexture(data, width, height, RGBAFormat);
  mask.name = "Shared concrete top grime";
  mask.wrapS = RepeatWrapping;
  mask.wrapT = ClampToEdgeWrapping;
  mask.magFilter = LinearFilter;
  mask.minFilter = LinearMipmapLinearFilter;
  mask.generateMipmaps = true;
  mask.needsUpdate = true;
  cachedMask = mask;
  return mask;
}
