import type { CompiledLevel } from "./types.ts";
import type { ReferenceView } from "./reference.ts";
import { projectReference } from "./reference.ts";

export interface ReferenceRaster {
  width: number;
  height: number;
  rgba: Uint8Array;
  surfaceIds: Int32Array;
  depth: Float64Array;
}
export interface ReferenceRenderOptions {
  width?: number;
  height?: number;
  background?: string;
}
function rgb(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Invalid render color ${hex}.`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
const edge = (a: number[], b: number[], p: number[]) =>
  (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

/** Deterministic flat-material render of the compiled visible mesh through a saved reference camera. */
export function renderReference(
  level: CompiledLevel,
  reference: ReferenceView,
  options: ReferenceRenderOptions = {},
): ReferenceRaster {
  const width = options.width ?? reference.width,
    height = options.height ?? reference.height;
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 4096 ||
    height > 4096
  )
    throw new Error("Reference render dimensions must be integers from 1 to 4096.");
  const rgba = new Uint8Array(width * height * 4),
    surfaceIds = new Int32Array(width * height).fill(-1),
    depth = new Float64Array(width * height).fill(Infinity),
    background = rgb(options.background ?? "#e6eef3");
  for (let i = 0; i < width * height; i++)
    rgba.set([...background, 255], i * 4);
  const materials = new Map(
      level.document.materials.map((material) => [material.id, rgb(material.color)]),
    ),
    projected = new Map<number, ReturnType<typeof projectReference>>();
  const projection = (index: number) => {
    let value = projected.get(index);
    if (!value) {
      const p = level.mesh.positions.slice(index * 3, index * 3 + 3) as [
        number,
        number,
        number,
      ];
      value = projectReference(reference, p);
      projected.set(index, value);
    }
    return value;
  };
  for (let t = 0; t < level.mesh.surfaces.length; t++) {
    const surfaceIndex = level.mesh.surfaces[t],
      surface = level.surfaces[surfaceIndex];
    if (surface.visible === false) continue;
    const indices = level.mesh.indices.slice(t * 3, t * 3 + 3),
      points = indices.map(projection);
    if (
      points.some(
        (point) =>
          !point.image ||
          point.depth < reference.camera.near ||
          point.depth > reference.camera.far,
      )
    )
      continue;
    const p = points.map((point) => [
        point.image![0] * width,
        point.image![1] * height,
      ]),
      area = edge(p[0], p[1], p[2]);
    if (Math.abs(area) < 1e-9) continue;
    const minX = Math.max(0, Math.floor(Math.min(...p.map((v) => v[0])))),
      maxX = Math.min(width - 1, Math.ceil(Math.max(...p.map((v) => v[0])))),
      minY = Math.max(0, Math.floor(Math.min(...p.map((v) => v[1])))),
      maxY = Math.min(height - 1, Math.ceil(Math.max(...p.map((v) => v[1])))),
      color = materials.get(surface.material) ?? rgb("#b9c7d1");
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const sample = [x + 0.5, y + 0.5],
          w0 = edge(p[1], p[2], sample) / area,
          w1 = edge(p[2], p[0], sample) / area,
          w2 = 1 - w0 - w1;
        if (Math.min(w0, w1, w2) < -1e-9) continue;
        const inverseDepth =
            w0 / points[0].depth + w1 / points[1].depth + w2 / points[2].depth,
          z = 1 / inverseDepth,
          pixel = y * width + x;
        if (!(z < depth[pixel])) continue;
        depth[pixel] = z;
        surfaceIds[pixel] = surfaceIndex;
        rgba.set([...color, 255], pixel * 4);
      }
  }
  return { width, height, rgba, surfaceIds, depth };
}

export function compareReferenceRasters(
  actual: Uint8Array,
  expected: Uint8Array,
  channels = 4,
) {
  if (actual.length !== expected.length || actual.length % channels)
    throw new Error("Reference raster buffers must have equal channel-aligned lengths.");
  let differentPixels = 0,
    absoluteError = 0,
    maxChannelError = 0;
  for (let i = 0; i < actual.length; i += channels) {
    let different = false;
    for (let c = 0; c < channels; c++) {
      const error = Math.abs(actual[i + c] - expected[i + c]);
      absoluteError += error;
      maxChannelError = Math.max(maxChannelError, error);
      different ||= error !== 0;
    }
    if (different) differentPixels++;
  }
  const pixels = actual.length / channels;
  return {
    pixels,
    differentPixels,
    differentFraction: differentPixels / pixels,
    meanAbsoluteChannelError: absoluteError / actual.length,
    maxChannelError,
  };
}
