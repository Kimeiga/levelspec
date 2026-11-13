import { PNG } from "pngjs";
import type { SurfacePngDecoder } from "../dressing/surface/images.ts";

/** Node host decoder using native zlib; shared image admission and pixel ownership remain compiler-owned. */
export const decodeMaterialPng: SurfacePngDecoder = bytes => PNG.sync.read(Buffer.from(bytes));
