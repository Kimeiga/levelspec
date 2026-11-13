import type { Material } from "../../vector/types.ts";
import { aborted } from "../../vector/types.ts";
import { imageSample, type SurfaceImage } from "./images.ts";
import type { SurfaceChart } from "./types.ts";

const byte = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 255);

/** Maps height derivatives per source UV unit into unit tangent/bitangent slopes per meter. */
export interface HeightUVMetric {
  uScale: number;
  /** Contribution of the source U derivative along the bitangent for a sheared mapping. */
  shear: number;
  vScale: number;
}

/** Derives one stable metric from a layer's affine UV map in an orthonormal receiver frame. */
export function heightUVMetric(chart: SurfaceChart, layerIndex: number, material: string): HeightUVMetric {
  const [left, bottom, right, top] = chart.bounds;
  const u = (left + right) / 2, v = (bottom + top) / 2;
  const epsilon = Math.min(0.01, (right - left) / 4, (top - bottom) / 4);
  const uvAt = (x: number, y: number): [number, number] => {
    const layer = chart.sample(x, y).layers[layerIndex];
    if (!layer || layer.material !== material || !layer.uv.every(Number.isFinite))
      throw new Error(`Surface ${chart.id} has an invalid height-layer UV mapping.`);
    return layer.uv;
  };
  const center = uvAt(u, v), east = uvAt(u + epsilon, v), west = uvAt(u - epsilon, v);
  const north = uvAt(u, v + epsilon), south = uvAt(u, v - epsilon);
  const a = [(east[0] - west[0]) / (2 * epsilon), (north[0] - south[0]) / (2 * epsilon)];
  const b = [(east[1] - west[1]) / (2 * epsilon), (north[1] - south[1]) / (2 * epsilon)];
  const determinant = a[0] * b[1] - a[1] * b[0], length = Math.hypot(...b);
  if (![...a, ...b, determinant, length].every(Number.isFinite) || length === 0 || determinant === 0)
    throw new Error(`Surface ${chart.id} requires a nondegenerate affine UV mapping for height material ${material}.`);
  for (const x of [left, u, right]) for (const y of [bottom, v, top]) {
    const actual = uvAt(x, y);
    const expected = [center[0] + a[0] * (x - u) + a[1] * (y - v), center[1] + b[0] * (x - u) + b[1] * (y - v)];
    if (actual.some((value, axis) => Math.abs(value - expected[axis]) > 1e-6))
      throw new Error(`Surface ${chart.id} requires an affine UV mapping for height material ${material}.`);
  }
  const stable = (value: number) => Number(value.toPrecision(8));
  const uScale = Math.abs(determinant) / length, shear = (a[0] * b[0] + a[1] * b[1]) / length;
  // Orthogonal mappings acquire tiny apparent shear when translated UVs are differentiated.
  const metric = { uScale: stable(uScale), shear: Math.abs(shear) < Math.max(uScale, length) * 1e-8 ? 0 : stable(shear), vScale: stable(length) };
  if (!Object.values(metric).every(Number.isFinite)) throw new Error(`Surface ${chart.id} has a non-finite height UV metric.`);
  return metric;
}

/** Converts authored linear-red height into one shared tileable source normal, without resampling albedo. */
export async function sourceHeightNormal(material: Material, height: SurfaceImage, normal: SurfaceImage | undefined, signal?: AbortSignal,
  metric: HeightUVMetric = { uScale: material.repeat, shear: 0, vScale: material.repeat }): Promise<SurfaceImage> {
  if (!Object.values(metric).every(Number.isFinite)) throw new Error("Height UV metric must be finite.");
  const width = Math.max(height.width, normal?.width ?? 0), rows = Math.max(height.height, normal?.height ?? 0);
  const output = { width, height: rows, data: new Uint8Array(width * rows * 4) };
  const pixel = (u: number, v: number) => imageSample(height, u, v)[0];
  const strength = material.heightScale ?? 0.01;
  for (let y = 0; y < rows; y++) {
    if (y % 64 === 0) { await new Promise<void>(resolve => setTimeout(resolve, 0)); aborted(signal); }
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width, v = 1 - (y + 0.5) / rows;
      const source = normal ? imageSample(normal, u, v) : [0.5, 0.5, 1];
      const nz = Math.max(0.1, source[2] * 2 - 1);
      const du = (pixel(u + 1 / height.width, v) - pixel(u - 1 / height.width, v)) * height.width * strength / 2;
      const dv = (pixel(u, v + 1 / height.height) - pixel(u, v - 1 / height.height)) * height.height * strength / 2;
      const nx = (source[0] * 2 - 1) * (material.normalScale ?? 1) / nz - du * metric.uScale;
      const ny = (source[1] * 2 - 1) * (material.normalScale ?? 1) / nz - du * metric.shear - dv * metric.vScale;
      const length = Math.hypot(nx, ny, 1);
      output.data.set([byte(nx / length * 0.5 + 0.5), byte(ny / length * 0.5 + 0.5), byte(1 / length * 0.5 + 0.5), 255], (y * width + x) * 4);
    }
  }
  return output;
}
