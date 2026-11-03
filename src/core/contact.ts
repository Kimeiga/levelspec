import type { Box } from './types.ts';

/** Near-coincidence causes z-fighting; a millimetre nudge is not a repair. */
export const FACE_TOLERANCE = 0.01;

/** The same outward-facing or back-to-back contact rule used by validation. */
export function boxContact(A: Box, B: Box, overlap?: number[]): 'coplanar' | 'touching' | 'none' {
  const ov = overlap ?? A.min.map((a, i) => Math.min(A.max[i], B.max[i]) - Math.max(a, B.min[i]));
  let touching = false;
  for (let axis = 0; axis < 3; axis++) {
    if (ov[(axis + 1) % 3] <= FACE_TOLERANCE || ov[(axis + 2) % 3] <= FACE_TOLERANCE) continue;
    const sameMax = Math.abs(A.max[axis] - B.max[axis]) < FACE_TOLERANCE;
    const sameMin = Math.abs(A.min[axis] - B.min[axis]) < FACE_TOLERANCE;
    const backToBack = Math.abs(A.max[axis] - B.min[axis]) < FACE_TOLERANCE ||
      Math.abs(A.min[axis] - B.max[axis]) < FACE_TOLERANCE;
    if (sameMax || sameMin) return 'coplanar';
    if (backToBack) touching = true;
  }
  return touching ? 'touching' : 'none';
}
