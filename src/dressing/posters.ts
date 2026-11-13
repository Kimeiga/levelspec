import type { V3 } from "../architecture/types.ts";
import { Rng } from "../generate/rng.ts";
import type { Pen } from "./pen.ts";

/** Reading order of the shared 4×4 poster atlas; every printed sheet is portrait 2:3. */
export const POSTER_DESIGNS = [
  "calendar", "roast-menu", "tea-ad", "soda-ad", "no-smoking", "repairs", "room-rental", "hiring",
  "herbal-ad", "opera", "film", "laundry", "rice-ad", "clinic", "closure", "electrical-ad",
] as const;
export type PosterDesign = typeof POSTER_DESIGNS[number];

/** A sheet centered on a wall-local origin, in meters; rotation is in-plane degrees. */
export interface PosterOptions {
  design: PosterDesign;
  width: number;
  rotation?: number;
  /** Paper stacking order, integer 0–8; each layer adds 0.6 mm clearance. */
  layer?: number;
  /** Extra geometric corner loss, 0–1; the artwork already contains printed paper wear. */
  wear?: number;
  seed?: string;
}

/** Maps normalized upright artwork into a padded 512×768 cell of a 2048×3072 atlas. */
export function posterUv(design: PosterDesign, u: number, v: number): number[] {
  const cell = POSTER_DESIGNS.indexOf(design);
  if (cell < 0) throw new Error(`Unknown poster design: ${design}`);
  return [(cell % 4 * 512 + 16.5 + u * 479) / 2048,
    1 - (Math.floor(cell / 4) * 768 + 24.5 + (1 - v) * 719) / 3072];
}

/** Rejects invalid dimensions and art controls before geometry or materials are mutated. */
export function validatePoster(options: PosterOptions): void {
  if (!POSTER_DESIGNS.includes(options.design)) throw new Error(`Unknown poster design: ${options.design}`);
  if (!Number.isInteger(options.layer ?? 0) || (options.layer ?? 0) < 0 || (options.layer ?? 0) > 8)
    throw new Error("Poster layer must be an integer from 0 to 8.");
  if (!Number.isFinite(options.width) || options.width < .05 || options.width > 2)
    throw new Error("Poster width must be between 0.05 and 2 meters.");
  if (!Number.isFinite(options.rotation ?? 0) || Math.abs(options.rotation ?? 0) > 15)
    throw new Error("Poster rotation must be between -15 and 15 degrees.");
  if (!Number.isFinite(options.wear ?? .3) || (options.wear ?? .3) < 0 || (options.wear ?? .3) > 1)
    throw new Error("Poster wear must be between 0 and 1.");
}

/** Conservative rotated rectangle used for receiver coverage, including chipped-away corners. */
export function posterBounds(options: PosterOptions): { width: number; height: number } {
  validatePoster(options);
  const angle = (options.rotation ?? 0) * Math.PI / 180;
  const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
  return { width: options.width * (c + 1.5 * s), height: options.width * (1.5 * c + s) };
}

/**
 * Emits one six-triangle opaque paper decal onto any planar wall frame, +Y outward.
 * Center the pen on the receiving surface. The base sheet sits 2 mm forward plus
 * authored layer clearance, follows
 * its lighting, and retains readable UVs under reflected transforms. Callers own
 * coverage/obstacle fitting; no collision or navigation geometry is created.
 */
export function drawPoster(pen: Pen, options: PosterOptions): void {
  validatePoster(options);
  if (!pen.mesh.textured("posters")) throw new Error("Posters require the wall-posters atlas finish.");
  const rng = new Rng(options.seed ?? options.design);
  const cut = (.006 + (options.wear ?? .3) * .035) * rng.float(.7, 1);
  const outline = [[cut, 0], [1-cut*1.6, 0], [1, cut], [1, 1-cut*1.8],
    [1-cut, 1], [cut*1.3, 1], [0, 1-cut], [0, cut*1.5]];
  const angle = (options.rotation ?? 0) * Math.PI / 180;
  const c = Math.cos(angle), s = Math.sin(angle);
  const points: V3[] = outline.map(([u,v]) => {
    const x = (u-.5)*options.width, z = (v-.5)*options.width*1.5;
    return [x*c-z*s, .002 + (options.layer ?? 0) * .0006, x*s+z*c];
  });
  const reverse = pen.matrix.determinant() > 0;
  const uv = outline.map(([u,v]) => posterUv(options.design, reverse ? 1-u : u, v));
  pen.face("posters", points, [0,1,0], [1,1,1], uv);
}
