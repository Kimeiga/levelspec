import type { Diagnostic, Named, V2, V3 } from "./types.ts";
import { cross, dot, norm, sub } from "./geometry.ts";

export interface ReferenceCamera {
  position: V3;
  target: V3;
  up: V3;
  /** Vertical field of view in degrees. */
  fov: number;
  near: number;
  far: number;
}
export interface ReferenceLandmark extends Named {
  position: V3;
  /** Normalized image coordinates, origin at the top left. */
  image: V2;
}
export interface ReferenceMask extends Named {
  /** Polygon in normalized, top-left image coordinates. */
  points: V2[];
}
export interface ReferenceView extends Named {
  /** A local image reference. Compiling a level never fetches this image. */
  image: string;
  width: number;
  height: number;
  camera: ReferenceCamera;
  scale: "assumed" | "measured";
  scaleNote: string;
  landmarks: ReferenceLandmark[];
  masks: ReferenceMask[];
}
const finite = (v: number[], n: number) => v.length === n && v.every(Number.isFinite);
const inImage = (p: V2) => finite(p, 2) && p.every((v) => v >= 0 && v <= 1);

export function validateReference(reference: ReferenceView): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const fail = (o: Named, message: string) => diagnostics.push({
    severity: "error", code: "REFERENCE", message, objects: [o.id], source: o.source,
  });
  const c = reference.camera;
  if (![reference.width, reference.height].every((n) => Number.isSafeInteger(n) && n > 0 && n <= 16384))
    fail(reference, "Reference width and height must be integers between 1 and 16384.");
  if (!reference.image.trim()) fail(reference, "A reference needs an image name.");
  if (!["assumed", "measured"].includes(reference.scale) || !reference.scaleNote.trim())
    fail(reference, "Reference scale must be assumed or measured, with a scale-note explaining its basis.");
  if (![c.position, c.target, c.up].every((v) => finite(v, 3)) ||
      ![c.fov, c.near, c.far].every(Number.isFinite) || c.fov <= 0 || c.fov >= 179 ||
      c.near <= 0 || c.far <= c.near) {
    fail(reference, "Invalid camera: finite vectors, 0 < fov < 179 and 0 < near < far are required.");
  } else {
    const forward = sub(c.target, c.position);
    if (Math.hypot(...forward) < 1e-8 || Math.hypot(...c.up) < 1e-8 ||
        Math.hypot(...cross(norm(forward), norm(c.up))) < 1e-6)
      fail(reference, "Camera target must differ from position; up must not be parallel to the viewing direction.");
  }
  for (const l of reference.landmarks)
    if (!finite(l.position, 3) || !inImage(l.image))
      fail(l, "Landmarks need a finite XYZ position and normalized image coordinates in [0, 1].");
  for (const mask of reference.masks) {
    const p = mask.points;
    if (p.length < 3 || p.length > 1024 || p.some((v) => !inImage(v))) {
      fail(mask, "A mask needs 3 to 1024 normalized image-coordinate pairs in [0, 1].");
      continue;
    }
    const area = p.reduce((sum, a, i) => {
      const b = p[(i + 1) % p.length];
      return sum + a[0] * b[1] - b[0] * a[1];
    }, 0);
    if (Math.abs(area) < 1e-10) fail(mask, "Mask polygon has zero area.");
    const turn = (a: V2, b: V2, c: V2) =>
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    let crossed = false;
    for (let i = 0; i < p.length; i++) {
      if (Math.hypot(p[i][0] - p[(i + 1) % p.length][0], p[i][1] - p[(i + 1) % p.length][1]) < 1e-10)
        crossed = true;
      for (let j = i + 2; j < p.length; j++) {
        if (i === 0 && j === p.length - 1) continue;
        const a = p[i], b = p[(i + 1) % p.length], c = p[j], d = p[(j + 1) % p.length];
        if (turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0) crossed = true;
      }
    }
    if (crossed) fail(mask, "Mask polygons must have distinct consecutive points and must not self-intersect.");
  }
  return diagnostics;
}
function assertReference(reference: ReferenceView) {
  const diagnostics = validateReference(reference);
  if (diagnostics.length) throw new Error(diagnostics.map((d) => d.message).join("\n"));
}

/** Perspective projection matching a Z-up camera, without a renderer dependency. */
function project(reference: ReferenceView, position: V3) {
  const c = reference.camera, forward = norm(sub(c.target, c.position));
  const right = norm(cross(forward, c.up)), up = cross(right, forward);
  const delta = sub(position, c.position), depth = dot(delta, forward);
  if (depth <= 0) return { image: null, depth, inFrame: false };
  const halfHeight = Math.tan(c.fov * Math.PI / 360) * depth;
  const image: V2 = [0.5 + dot(delta, right) / (2 * halfHeight * reference.width / reference.height),
    0.5 - dot(delta, up) / (2 * halfHeight)];
  return { image, depth, inFrame: depth >= c.near && depth <= c.far && inImage(image) };
}
export function projectReference(reference: ReferenceView, position: V3) {
  assertReference(reference);
  if (!finite(position, 3)) throw new Error("A projected point must contain three finite coordinates.");
  return project(reference, position);
}
export function pointInMask(point: V2, polygon: V2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    const area = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
    if (Math.abs(area) < 1e-10 && point[0] >= Math.min(a[0], b[0]) - 1e-10 &&
        point[0] <= Math.max(a[0], b[0]) + 1e-10 && point[1] >= Math.min(a[1], b[1]) - 1e-10 &&
        point[1] <= Math.max(a[1], b[1]) + 1e-10) return true;
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
        point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function compareReference(reference: ReferenceView) {
  assertReference(reference);
  const landmarks = reference.landmarks.map((landmark) => {
    const projection = project(reference, landmark.position);
    const masked = reference.masks.some((mask) => pointInMask(landmark.image, mask.points));
    const clipped = !projection.image || projection.depth < reference.camera.near || projection.depth > reference.camera.far;
    const errorPixels = masked || clipped ? null : Math.hypot(
      (projection.image![0] - landmark.image[0]) * reference.width,
      (projection.image![1] - landmark.image[1]) * reference.height,
    );
    return { id: landmark.id, expected: landmark.image, ...projection,
      status: masked ? "masked" : clipped ? "clipped" : "compared", errorPixels };
  });
  const errors = landmarks.flatMap((l) => l.errorPixels === null ? [] : [l.errorPixels]);
  return {
    id: reference.id, landmarks, compared: errors.length,
    masked: landmarks.filter((l) => l.status === "masked").length,
    clipped: landmarks.filter((l) => l.status === "clipped").length,
    /** No observations is not a zero-error fit. This is geometry alignment, not image similarity. */
    rmsPixels: errors.length ? Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length) : null,
    maxPixels: errors.length ? Math.max(...errors) : null,
  };
}
/** The same letterbox is used for the render and the image overlay. */
export function referenceViewport(width: number, height: number, aspect: number) {
  if (![width, height, aspect].every((n) => Number.isFinite(n) && n > 0))
    throw new Error("Viewport dimensions and aspect must be finite and positive.");
  const w = Math.min(width, height * aspect), h = w / aspect;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
