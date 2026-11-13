import type { Material, V3 } from "../../vector/types.ts";
import { aborted } from "../../vector/types.ts";
import type { SurfaceChart, SurfaceSample } from "./types.ts";
import { imageSample, type SurfaceImage } from "./images.ts";
import { Color } from "three";
import { surfaceTint } from "./sample.ts";
import { SurfaceWorkSlice } from "./work-slice.ts";

/** A continuous appearance field shared by receivers in the same meter-based frame. */
export interface SurfaceRasterSettings {
  /** Preserves receiver triangles and blends all sampled materials into one map set. Requires zero geometric displacement. */
  geometry?: "preserve";
  /** UV mode binds appearance to existing mesh UVs and preserves all geometry and vertex normals. */
  coordinates?: "uv";
  /** Equal keys promise equal source layers, UV mappings and full appearance (including appearanceTint) throughout bounds. */
  group: string;
  /** Scene scope shares identical UV-bound appearance across hosts within this compile. Default is host-local. */
  scope?: "scene";
  /** Periodic canonical bounds, independent of receiver extent. Requires preserved geometry and seamless fields. */
  repeat?: boolean;
  /** Explicit versioned identity of every intrinsic field/tint dependency, resolved after assembly; enables artifact caching. */
  materialKey?: string;
  bounds: [number, number, number, number];
  /** Pigment resolution, independent of geometry tessellation. */
  texelsPerMeter: number;
  /** Normal-only relief in meters. "sample" shares SurfaceSample.bump with color evaluation; callbacks supply independent fields. */
  bump?: "sample" | ((u: number, v: number) => number);
}

export interface SurfaceRasterLayout {
  width: number;
  height: number;
  bounds: SurfaceRasterSettings["bounds"];
  /** Maps wall/floor meter coordinates to the padded image's lower-left UV convention. */
  uv(u: number, v: number): [number, number];
}

export interface SurfaceRasterLayer {
  source: string;
  color: SurfaceImage;
  metallicRoughness: SurfaceImage;
  normal?: SurfaceImage;
}

/** Geometry keeps source UVs for displacement; finished render vertices use this independent appearance binding. */
export interface SurfaceRasterBinding {
  layout: SurfaceRasterLayout;
  materials: string[];
}

const PADDING = 2;
const byte = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 255);
const linear = (value: number): number => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const LINEAR_BYTES = Float64Array.from({ length: 256 }, (_, value) => linear(value / 255));
const srgb = (value: number): number => value <= 0.0031308 ? value * 12.92 : 1.055 * Math.max(0, value) ** (1 / 2.4) - 0.055;
const wrap = (value: number, size: number): number => ((value % size) + size) % size;

/** Checks the complete fixed-size UV/tint contract without allocating a combined validation array. */
function finiteUV(uv: readonly number[]): boolean {
  return uv.length === 2 && Number.isFinite(uv[0]) && Number.isFinite(uv[1]);
}

/** Linear RGB may exceed one before encoding; signed values are checked by the owning field contract. */
function finiteRGB(rgb: readonly number[]): boolean {
  return rgb.length === 3 && Number.isFinite(rgb[0]) && Number.isFinite(rgb[1]) && Number.isFinite(rgb[2]);
}

/** Decodes color texels before interpolation into caller-owned RGBA scratch; alpha remains linear. */
function colorSample(image: SurfaceImage, u: number, v: number, result: number[]): void {
  const x = u * image.width - 0.5, y = (1 - v) * image.height - 0.5;
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const left = wrap(ix, image.width) * 4, right = wrap(ix + 1, image.width) * 4;
  const top = wrap(iy, image.height) * image.width * 4, bottom = wrap(iy + 1, image.height) * image.width * 4;
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
  for (let channel = 0; channel < 3; channel++) {
    result[channel] = w00 * LINEAR_BYTES[image.data[top + left + channel]]
      + w10 * LINEAR_BYTES[image.data[top + right + channel]]
      + w01 * LINEAR_BYTES[image.data[bottom + left + channel]]
      + w11 * LINEAR_BYTES[image.data[bottom + right + channel]];
  }
  result[3] = w00 * (image.data[top + left + 3] / 255) + w10 * (image.data[top + right + 3] / 255)
    + w01 * (image.data[bottom + left + 3] / 255) + w11 * (image.data[bottom + right + 3] / 255);
}

/** Computes allocation and UVs before raster work, so callers can enforce aggregate memory budgets. */
export function surfaceRasterLayout(settings: SurfaceRasterSettings): SurfaceRasterLayout {
  const [u0, v0, u1, v1] = settings.bounds, density = settings.texelsPerMeter;
  if (!settings.bounds.every(Number.isFinite) || u1 <= u0 || v1 <= v0
    || !Number.isFinite(density) || density <= 0) throw new Error("Surface raster requires finite ordered bounds and positive density.");
  const columns = Math.max(1, Math.ceil((u1 - u0) * density));
  const rows = Math.max(1, Math.ceil((v1 - v0) * density));
  if (settings.repeat && settings.geometry !== "preserve") throw new Error("Repeating materials require preserved geometry.");
  const padding = settings.repeat ? 0 : PADDING;
  const width = columns + 2 * padding, height = rows + 2 * padding;
  if (width > 8192 || height > 8192 || width * height > 16 * 1024 * 1024)
    throw new Error("Surface raster exceeds the 16 Mi-texel image limit.");
  return { width, height, bounds: [...settings.bounds], uv: (u, v) => [
    (padding + (u - u0) / (u1 - u0) * columns) / width,
    (padding + (v - v0) / (v1 - v0) * rows) / height,
  ] };
}

/** Allocates an RGBA image after the caller's aggregate resource checks. */
function rasterImage(layout: SurfaceRasterLayout): SurfaceImage {
  return { width: layout.width, height: layout.height, data: new Uint8Array(layout.width * layout.height * 4) };
}

/** Expresses source tangent and bitangent in the receiver's UV basis, including reflected mappings. */
function normalBasis(chart: SurfaceChart, uvAt: (u: number, v: number) => [number, number], bounds: SurfaceRasterSettings["bounds"]): [number, number, number, number] {
  const [left, bottom, right, top] = bounds, u = (left + right) / 2, v = (bottom + top) / 2;
  const epsilon = Math.min(0.01, (right - left) / 4, (top - bottom) / 4);
  const origin = uvAt(u, v);
  const east = uvAt(u + epsilon, v);
  const north = uvAt(u, v + epsilon);
  const a = (east[0] - origin[0]) / epsilon, b = (north[0] - origin[0]) / epsilon;
  const c = (east[1] - origin[1]) / epsilon, d = (north[1] - origin[1]) / epsilon;
  const determinant = a * d - b * c;
  if (![a, b, c, d, determinant].every(Number.isFinite) || Math.abs(determinant) < 1e-12)
    throw new Error(`Surface ${chart.id} requires nondegenerate affine UVs for raster normals.`);
  for (const x of [left, u, right]) for (const y of [bottom, v, top]) {
    const actual = uvAt(x, y);
    const expected = [origin[0] + a * (x - u) + b * (y - v), origin[1] + c * (x - u) + d * (y - v)];
    if (actual.some((value, axis) => Math.abs(value - expected[axis]) > 1e-6))
      throw new Error(`Surface ${chart.id} requires affine UVs for raster normals.`);
  }
  const sign = Math.sign(determinant), length = Math.hypot(c, d);
  const tx = sign * d / length, ty = -sign * c / length;
  return [tx, ty, -sign * ty, sign * tx];
}

/** Looks up an authored or already-derived image; missing PBR inputs must never silently disappear. */
function sourceImage(images: Map<string, SurfaceImage>, reference?: string): SurfaceImage | undefined {
  if (!reference) return undefined;
  const image = images.get(reference);
  if (!image) throw new Error(`Missing raster source image ${reference}.`);
  return image;
}

interface RasterSource {
  material: Material;
  factor: number[];
  color?: SurfaceImage;
  packed?: SurfaceImage;
  normal?: SurfaceImage;
  basis: number[];
  pixel: { color: number[]; packed: number[]; normal: V3 };
  rgba: number[];
}

/** Resolves one PBR source without changing its authored images or material. */
function rasterSource(chart: SurfaceChart, id: string, uvAt: (u: number, v: number) => [number, number],
  settings: SurfaceRasterSettings, materials: Map<string, Material>, images: Map<string, SurfaceImage>): RasterSource {
  const material = materials.get(id);
  if (!material || !chart.materials.includes(id)) throw new Error(`Unknown raster material ${id}.`);
  const normal = sourceImage(images, material.normalTexture);
  return { material, factor: new Color(material.color).toArray(), color: sourceImage(images, material.texture),
    packed: sourceImage(images, material.metallicRoughnessTexture), normal,
    basis: normal ? normalBasis(chart, uvAt, settings.bounds) : [1, 0, 0, 1],
    pixel: { color: [0, 0, 0, 0], packed: [0, 0, 0], normal: [0, 0, 1] }, rgba: [0, 0, 0, 0] };
}

/** Samples intrinsic PBR into source-owned scratch, valid until this source is sampled again. */
function sourcePixel(source: RasterSource, uv: [number, number], roughness?: number): RasterSource["pixel"] {
  const { material, pixel, rgba } = source, { color, packed, normal } = pixel;
  if (source.color) colorSample(source.color, uv[0], uv[1], color);
  else color.fill(1);
  for (let axis = 0; axis < 3; axis++) color[axis] *= source.factor[axis];
  const alpha = material.alphaCutoff === undefined ? color[3] : Number(color[3] >= material.alphaCutoff);
  color[3] = alpha * (material.opacity ?? 1);
  if (source.packed) imageSample(source.packed, uv[0], uv[1], rgba);
  else rgba.fill(1);
  packed[0] = rgba[0]; packed[1] = rgba[1] * (roughness ?? material.roughness); packed[2] = rgba[2] * material.metalness;
  if (source.normal) {
    imageSample(source.normal, uv[0], uv[1], rgba);
    const nx = (rgba[0] * 2 - 1) * (material.normalScale ?? 1), ny = (rgba[1] * 2 - 1) * (material.normalScale ?? 1);
    const nz = Math.max(0.01, rgba[2] * 2 - 1), [tx, ty, bx, by] = source.basis;
    const x = tx * nx + bx * ny, y = ty * nx + by * ny, length = Math.hypot(x, y, nz);
    normal[0] = x / length; normal[1] = y / length; normal[2] = nz / length;
  } else { normal[0] = 0; normal[1] = 0; normal[2] = 1; }
  return pixel;
}

/** Copies an optional tint into owned storage, clearing it when the producer omits it. */
function retainedTint(source: V3 | undefined, target?: V3): V3 | undefined {
  if (!source) return undefined;
  target ??= [0, 0, 0];
  target[0] = source[0]; target[1] = source[1]; target[2] = source[2];
  return target;
}

/** Owns sampled arrays while neighboring rows remain live; expired row snapshots can be overwritten. */
function retainedSample(sample: SurfaceSample, target: SurfaceSample = { height: 0, layers: [] }): SurfaceSample {
  target.height = sample.height; target.bump = sample.bump; target.roughness = sample.roughness;
  target.heightWeight = sample.heightWeight; target.layerElevationWeight = sample.layerElevationWeight;
  target.depositRetention = sample.depositRetention;
  for (let index = 0; index < sample.layers.length; index++) {
    const source = sample.layers[index];
    const layer = target.layers[index] ??= { material: source.material, weight: 0, uv: [0, 0] };
    layer.material = source.material; layer.weight = source.weight; layer.roughness = source.roughness; layer.role = source.role;
    layer.uv[0] = source.uv[0]; layer.uv[1] = source.uv[1];
    layer.tint = retainedTint(source.tint, layer.tint);
    if (source.coatings) {
      const coatings = layer.coatings ??= [];
      for (let coating = 0; coating < source.coatings.length; coating++) {
        const input = source.coatings[coating];
        const output = coatings[coating] ??= { material: input.material, opacity: 0, uv: [0, 0] };
        output.material = input.material; output.opacity = input.opacity; output.roughness = input.roughness;
        output.uv[0] = input.uv[0]; output.uv[1] = input.uv[1];
        output.tint = retainedTint(input.tint, output.tint);
      }
      coatings.length = source.coatings.length;
    } else layer.coatings = undefined;
  }
  target.layers.length = sample.layers.length;
  return target;
}

/** Conservative transient row-storage charge, separate from generated image and mip allocation. */
export function rasterScratchBytes(width: number, sample: SurfaceSample): number {
  const sampleBytes = 256 + sample.layers.reduce((bytes, layer) => bytes + 256 + (layer.coatings?.length ?? 0) * 256, 0);
  return (width + 2) * 3 * (sampleBytes + 8);
}

/**
 * Bakes intrinsic appearance only. Color includes the source material's color factor;
 * generated MR pixels contain scalar factors, and generated normals contain normalScale.
 * Binding materials therefore use white color and roughness/metalness/normalScale 1.
 * Ordinary charts retain separate layer maps. Geometry-preserving charts normalize
 * coverage into one map set; source triangles retain openings and silhouettes.
 */
export async function rasterizeSurface(
  chart: SurfaceChart,
  settings: SurfaceRasterSettings,
  materials: Map<string, Material>,
  images: Map<string, SurfaceImage>,
  signal?: AbortSignal,
  work = new SurfaceWorkSlice(signal),
): Promise<{ layout: SurfaceRasterLayout; layers: SurfaceRasterLayer[] }> {
  aborted(signal);
  const layout = surfaceRasterLayout(settings), [u0, v0, u1, v1] = layout.bounds;
  const padding = settings.repeat ? 0 : PADDING;
  const du = (u1 - u0) / (layout.width - 2 * padding), dv = (v1 - v0) / (layout.height - 2 * padding);
  const reference = retainedSample(chart.sample((u0 + u1) / 2, (v0 + v1) / 2));
  const sources = reference.layers.map((layer, index) => ({
    base: rasterSource(chart, layer.material, (u, v) => chart.sample(u, v).layers[index].uv, settings, materials, images),
    coatings: (layer.coatings ?? []).map((coat, coating) => rasterSource(chart, coat.material,
      (u, v) => chart.sample(u, v).layers[index].coatings![coating].uv, settings, materials, images)),
  }));
  const preserve = settings.geometry === "preserve";
  const outputs = preserve ? [sources[0]] : sources;
  const hasNormal = sources.some(({ base, coatings }) => base.normal || coatings.some(coat => coat.normal));
  const layers = outputs.map(({ base, coatings }) => ({ source: base.material.id,
    color: rasterImage(layout), metallicRoughness: rasterImage(layout),
    normal: (preserve ? hasNormal : base.normal || coatings.some(coat => coat.normal)) || settings.bump ? rasterImage(layout) : undefined }));
  const us = Array.from({ length: layout.width + 2 }, (_, column) => u0 + (column - padding - 0.5) * du);
  const sampleBump = settings.bump === "sample";
  /** A bounded row owns both field samples and the heights used by neighboring derivatives. */
  const fieldRow = async (row: number, recycled?: { heights: Float64Array; samples?: SurfaceSample[] }): Promise<{ heights: Float64Array; samples?: SurfaceSample[] }> => {
    const heights = recycled?.heights ?? new Float64Array(us.length);
    const samples: SurfaceSample[] | undefined = sampleBump ? recycled?.samples ?? [] : undefined;
    const v = v1 - (row - padding + 0.5) * dv;
    const iterator = sampleBump && chart.sampleRow ? chart.sampleRow(us, v)[Symbol.iterator]() : undefined;
    try {
      for (let column = 0; column < us.length; column++) {
        if (column % 128 === 0) { const pending = work.checkpoint(); if (pending) await pending; }
        if (sampleBump) {
          const next = iterator?.next();
          if (next?.done) throw new Error(`Incomplete raster row ${chart.id}.`);
          const value = next ? next.value : chart.sample(us[column], v);
          if (value.layers.length !== sources.length || value.layers.some((layer, index) =>
            layer.uv.length !== 2 || (layer.tint && layer.tint.length !== 3)
            || (layer.coatings?.length ?? 0) !== sources[index].coatings.length
            || layer.coatings?.some(coat => coat.uv.length !== 2 || (coat.tint && coat.tint.length !== 3))))
            throw new Error(`Invalid raster row shape ${chart.id}.`);
          const sample = retainedSample(value, samples![column]);
          samples![column] = sample;
          heights[column] = sample.bump!;
        } else heights[column] = (settings.bump as (u: number, v: number) => number)(us[column], v);
        if (!Number.isFinite(heights[column])) throw new Error(`Invalid raster bump field ${chart.id}.`);
      }
      if (iterator && !iterator.next().done) throw new Error(`Oversized raster row ${chart.id}.`);
    } finally {
      iterator?.return?.();
    }
    return { heights, samples };
  };
  let previousRow = settings.bump ? await fieldRow(-1) : undefined;
  let currentRow = settings.bump ? await fieldRow(0) : undefined;
  let nextRow = settings.bump ? await fieldRow(1) : undefined;
  const mixed = { color: [0, 0, 0, 0], packed: [0, 0, 0], normal: [0, 0, 0] };
  for (let row = 0; row < layout.height; row++) {
    const pending = work.checkpoint();
    if (pending) await pending;
    for (let column = 0; column < layout.width; column++) {
      const u = u0 + (column - padding + 0.5) * du;
      const v = v1 - (row - padding + 0.5) * dv;
      if (column % 128 === 0) { const pending = work.checkpoint(); if (pending) await pending; }
      const sample = currentRow?.samples?.[column + 1] ?? chart.sample(u, v), offset = (row * layout.width + column) * 4;
      if (settings.coordinates === "uv" && (sample.height !== 0 || sample.layers.length !== 1 || sample.layers[0].weight !== 1))
        throw new Error(`UV appearance ${chart.id} requires one full-coverage layer without displacement.`);
      if (sample.layers.length !== sources.length || (sample.roughness !== undefined && !Number.isFinite(sample.roughness)))
        throw new Error(`Invalid raster field ${chart.id}.`);
      let total = 0;
      for (let index = 0; index < sample.layers.length; index++) {
        const weight = sample.layers[index].weight;
        if (!Number.isFinite(weight) || weight < 0) throw new Error(`Invalid raster coverage at ${chart.id}.`);
        total += weight;
      }
      if (!(total > 0) || !Number.isFinite(total))
        throw new Error(`Invalid raster coverage at ${chart.id}.`);
      if (preserve && sample.height !== 0) throw new Error(`Preserved surface ${chart.id} cannot displace geometry.`);
      if (preserve) { mixed.color.fill(0); mixed.packed.fill(0); mixed.normal.fill(0); }
      let bumpU = 0, bumpV = 0;
      if (currentRow) {
        bumpU = (currentRow.heights[column + 2] - currentRow.heights[column]) / (2 * du);
        bumpV = (previousRow!.heights[column + 1] - nextRow!.heights[column + 1]) / (2 * dv);
        if (!Number.isFinite(bumpU) || !Number.isFinite(bumpV)) throw new Error(`Invalid raster bump field ${chart.id}.`);
      }
      for (let index = 0; index < sources.length; index++) {
        const source = sources[index];
        const layer = sample.layers[index], target = layers[preserve ? 0 : index];
        if (layer.material !== source.base.material.id || !finiteUV(layer.uv)
          || (layer.roughness !== undefined && (!Number.isFinite(layer.roughness) || layer.roughness < 0 || layer.roughness > 1)))
          throw new Error(`Surface ${chart.id} must keep stable finite raster layers.`);
        if (preserve && layer.weight === 0) continue;
        const tint = surfaceTint(chart, u, v, index, layer);
        if (!finiteRGB(tint) || tint[0] < 0 || tint[1] < 0 || tint[2] < 0 || (layer.coatings?.length ?? 0) !== source.coatings.length)
          throw new Error(`Surface ${chart.id} must keep stable finite raster layers.`);
        const composed = sourcePixel(source.base, layer.uv, layer.roughness ?? sample.roughness);
        for (let coating = 0; coating < source.coatings.length; coating++) {
          const coat = layer.coatings![coating];
          const overlay = source.coatings[coating], coatTint = coat.tint ?? [1, 1, 1];
          if (coat.material !== overlay.material.id || !finiteUV(coat.uv) || !finiteRGB(coatTint)
            || !Number.isFinite(coat.opacity) || !Number.isFinite(coat.roughness ?? 0)
            || coat.opacity < 0 || coat.opacity > 1) throw new Error(`Invalid raster coating in ${chart.id}.`);
          if (coat.opacity === 0) continue;
          const top = sourcePixel(overlay, coat.uv, coat.roughness), coverage = coat.opacity * top.color[3];
          for (let axis = 0; axis < 3; axis++) {
            composed.color[axis] = composed.color[axis] * (1 - coverage) + top.color[axis] * coatTint[axis] * coverage;
            composed.packed[axis] = composed.packed[axis] * (1 - coverage) + top.packed[axis] * coverage;
            if (overlay.normal) composed.normal[axis] = composed.normal[axis] * (1 - coverage) + top.normal[axis] * coverage;
          }
          const length = Math.hypot(...composed.normal);
          for (let axis = 0; axis < 3; axis++) composed.normal[axis] /= length;
        }
        for (let axis = 0; axis < 3; axis++) composed.color[axis] *= tint[axis];
        if (preserve) {
          const weight = layer.weight / total;
          for (let axis = 0; axis < 4; axis++) mixed.color[axis] += composed.color[axis] * weight;
          for (let axis = 0; axis < 3; axis++) {
            mixed.packed[axis] += composed.packed[axis] * weight;
            mixed.normal[axis] += composed.normal[axis] * weight;
          }
        } else writePixel(target, composed, offset, bumpU, bumpV);
      }
      if (preserve) writePixel(layers[0], mixed, offset, bumpU, bumpV);
    }
    if (settings.bump && row + 1 < layout.height) {
      const recycled = previousRow;
      previousRow = currentRow; currentRow = nextRow; nextRow = await fieldRow(row + 2, recycled);
    }
  }
  aborted(signal);
  return { layout, layers };
}

/** Encodes one linear PBR sample; normal-only relief never changes the receiving geometry. */
function writePixel(target: SurfaceRasterLayer, pixel: { color: number[]; packed: number[]; normal: number[] }, offset: number, bumpU: number, bumpV: number): void {
  for (let axis = 0; axis < 3; axis++) {
    target.color.data[offset + axis] = byte(srgb(pixel.color[axis]));
    target.metallicRoughness.data[offset + axis] = byte(pixel.packed[axis]);
  }
  target.color.data[offset + 3] = byte(pixel.color[3]);
  target.metallicRoughness.data[offset + 3] = 255;
  if (target.normal) {
    const [nx, ny, nz] = pixel.normal;
    const x = nx - bumpU * nz, y = ny - bumpV * nz;
    const length = Math.hypot(x, y, nz);
    target.normal.data[offset] = byte(x / length * 0.5 + 0.5);
    target.normal.data[offset + 1] = byte(y / length * 0.5 + 0.5);
    target.normal.data[offset + 2] = byte(nz / length * 0.5 + 0.5);
    target.normal.data[offset + 3] = 255;
  }
}
