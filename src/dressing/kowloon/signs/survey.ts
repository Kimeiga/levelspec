import type { V3 } from "../../../architecture/types.ts";
import type { Obstructions } from "../../spans/scene.ts";
import { triangleTouchesBox } from "../clearance.ts";

/** A solid part of a sign: an oriented box in world meters. */
export interface SignSolid {
  center: V3;
  /** Orthonormal directions of the box's edges. */
  axes: [V3, V3, V3];
  /** Half the box's size along each of `axes`. */
  half: V3;
}

/** A rectangle of lettering as its reader sees it, in world meters. */
export interface SignFace {
  center: V3;
  /** Unit vectors to the reader's right, up the lettering, and toward the reader. */
  right: V3;
  up: V3;
  normal: V3;
  width: number;
  height: number;
  /** How far below level the reader stands, in radians; 0 for a reader at the sign's own height. */
  lookDown: number;
}

/** What the survey needs to know about one proposed sign. */
export interface SurveyedSign {
  /** Signs with higher priority are decided first; ties keep their listed order. */
  priority: number;
  /** The lettered panels' bodies. They must stand clear of the surface the sign is fixed to. */
  solids: SignSolid[];
  faces: SignFace[];
}

/**
 * The survey's decision: `clear` signs are kept; `crowded` ones touch
 * scenery, stand too near a kept sign, or would hide one from its readers;
 * `obstructed` ones have no lettered face anybody could read.
 */
export type SurveyVerdict = "clear" | "crowded" | "obstructed";

/** Kept signs stay at least this far apart, meters. */
const GAP = 0.06;
/** A face is readable when this share of it is in clear view from one reader position. */
const READABLE_SHARE = 0.6;
/** Sight lines start this far in front of a face, meters. */
const SAMPLE_LIFT = 0.06;
/** Largest spacing of sight-line samples across a face, meters. */
const SAMPLE_SPACING = 0.35;
/** Reader positions to either side of straight ahead, degrees. */
const VIEW_ANGLES = [0, 25, -25, 45, -45];
/** Solids are tested this much smaller, so parts that merely meet do not count as touching, meters. */
const CONTACT_TOLERANCE = 0.005;

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const subtract = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const along = (origin: V3, ...steps: [V3, number][]): V3 => {
  const point: V3 = [...origin];
  for (const [direction, distance] of steps)
    for (let axis = 0; axis < 3; axis++) point[axis] += direction[axis] * distance;
  return point;
};

/** World-axis bounds as low and high corners. */
interface Bounds {
  lo: V3;
  hi: V3;
}

/** Returns the bounds of a set of points grown by `margin` meters. */
function boundsOf(points: V3[], margin = 0): Bounds {
  const lo: V3 = [Infinity, Infinity, Infinity],
    hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const point of points)
    for (let axis = 0; axis < 3; axis++) {
      lo[axis] = Math.min(lo[axis], point[axis] - margin);
      hi[axis] = Math.max(hi[axis], point[axis] + margin);
    }
  return { lo, hi };
}

const overlapping = (a: Bounds, b: Bounds) =>
  [0, 1, 2].every((axis) => a.lo[axis] <= b.hi[axis] && a.hi[axis] >= b.lo[axis]);

/** Returns the eight corners of a solid. */
export function solidCorners(solid: SignSolid): V3[] {
  const corners: V3[] = [];
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1])
        corners.push(
          along(solid.center, [solid.axes[0], x * solid.half[0]], [solid.axes[1], y * solid.half[1]], [solid.axes[2], z * solid.half[2]]),
        );
  return corners;
}

/** Expresses a world point in a solid's own frame, relative to its center. */
function inSolid(solid: SignSolid, point: V3): V3 {
  const offset = subtract(point, solid.center);
  return [dot(offset, solid.axes[0]), dot(offset, solid.axes[1]), dot(offset, solid.axes[2])];
}

/** True when a scenery triangle passes through the solid. */
function touchesScenery(solid: SignSolid, scenery: Obstructions): boolean {
  const { lo, hi } = boundsOf(solidCorners(solid));
  const half = solid.half.map((value) => Math.max(0, value - CONTACT_TOLERANCE)) as V3;
  for (const offset of scenery.near(lo, hi)) {
    const triangle = [0, 3, 6].map((corner) =>
      inSolid(solid, [scenery.corners[offset + corner], scenery.corners[offset + corner + 1], scenery.corners[offset + corner + 2]]),
    );
    if (triangleTouchesBox(triangle, [0, 0, 0], half)) return true;
  }
  return false;
}

/** True when two solids come within `gap` meters of one another, by the separating-axis test. */
function solidsWithin(a: SignSolid, b: SignSolid, gap: number): boolean {
  const offset = subtract(b.center, a.center);
  const axes: V3[] = [...a.axes, ...b.axes];
  for (const u of a.axes)
    for (const v of b.axes) {
      const axis: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const length = Math.hypot(...axis);
      if (length > 1e-9) axes.push(axis.map((value) => value / length) as V3);
    }
  const reach = (solid: SignSolid, axis: V3) =>
    solid.half[0] * Math.abs(dot(solid.axes[0], axis)) +
    solid.half[1] * Math.abs(dot(solid.axes[1], axis)) +
    solid.half[2] * Math.abs(dot(solid.axes[2], axis));
  return axes.every((axis) => Math.abs(dot(offset, axis)) <= reach(a, axis) + reach(b, axis) + gap);
}

/** True when the segment from `a` to `b` passes through the solid. */
function segmentCrossesSolid(a: V3, b: V3, solid: SignSolid): boolean {
  const start = inSolid(solid, a),
    end = inSolid(solid, b);
  let enter = 0,
    leave = 1;
  for (let axis = 0; axis < 3; axis++) {
    const run = end[axis] - start[axis];
    if (Math.abs(run) < 1e-12) {
      if (Math.abs(start[axis]) > solid.half[axis]) return false;
      continue;
    }
    const first = (-solid.half[axis] - start[axis]) / run,
      second = (solid.half[axis] - start[axis]) / run;
    enter = Math.max(enter, Math.min(first, second));
    leave = Math.min(leave, Math.max(first, second));
    if (enter > leave) return false;
  }
  return true;
}

/** How far back from a face its readers stand, meters. */
function standoff(face: SignFace): number {
  return Math.min(6, Math.max(0.8, 0.8 * Math.max(face.width, face.height)));
}

/** Returns the positions a face is read from: straight ahead and to either side, lowered by its look-down angle. */
function readerPositions(face: SignFace): V3[] {
  const back = standoff(face);
  return VIEW_ANGLES.map((angle) =>
    along(
      face.center,
      [face.normal, back],
      [face.right, back * Math.tan((angle * Math.PI) / 180)],
      [face.up, -back * Math.tan(face.lookDown)],
    ),
  );
}

/** Returns the points of a face that sight lines start from, a little in front of it. */
function samplePoints(face: SignFace): V3[] {
  const count = (length: number) => Math.min(7, Math.max(3, Math.ceil(length / SAMPLE_SPACING) + 1));
  const columns = count(face.width),
    rows = count(face.height);
  const points: V3[] = [];
  for (let i = 0; i < columns; i++)
    for (let j = 0; j < rows; j++)
      points.push(
        along(
          face.center,
          [face.right, (0.1 + (0.8 * i) / (columns - 1) - 0.5) * face.width],
          [face.up, (0.1 + (0.8 * j) / (rows - 1) - 0.5) * face.height],
          [face.normal, SAMPLE_LIFT],
        ),
      );
  return points;
}

/** A sign with what the survey derives from it once. */
interface Subject {
  sign: SurveyedSign;
  /** Bounds of the solids, and of the solids together with every sight line. */
  body: Bounds;
  view: Bounds;
}

/** True when some face of `subject` is readable past the scenery and the given other signs' solids. */
function readable(subject: Subject, scenery: Obstructions, others: SignSolid[]): boolean {
  for (const face of subject.sign.faces) {
    const samples = samplePoints(face);
    const allowed = Math.floor(samples.length * (1 - READABLE_SHARE) + 1e-9);
    for (const reader of readerPositions(face)) {
      let hidden = 0;
      for (const sample of samples) {
        if (scenery.blocked(sample, reader) || others.some((solid) => segmentCrossesSolid(sample, reader, solid))) hidden++;
        if (hidden > allowed) break;
      }
      if (hidden <= allowed) return true;
    }
  }
  return false;
}

/**
 * Decides which proposed signs to keep. Signs are taken in descending
 * priority; each is judged against the scenery and the signs kept before it,
 * so the result does not depend on the order of `signs`. `scenery` is only
 * read. Returns one verdict per sign, in the order given.
 */
export function surveySigns(signs: SurveyedSign[], scenery: Obstructions): SurveyVerdict[] {
  const verdicts: SurveyVerdict[] = signs.map(() => "clear");
  const order = signs.map((_, index) => index).sort((a, b) => signs[b].priority - signs[a].priority || a - b);
  const kept: Subject[] = [];
  for (const index of order) {
    const sign = signs[index];
    const corners = sign.solids.flatMap(solidCorners);
    const subject: Subject = {
      sign,
      body: boundsOf(corners, GAP),
      view: boundsOf([...corners, ...sign.faces.flatMap((face) => [...samplePoints(face), ...readerPositions(face)])], GAP),
    };
    if (sign.solids.some((solid) => touchesScenery(solid, scenery))) {
      verdicts[index] = "crowded";
      continue;
    }
    /** The kept signs' solids that could stand in a subject's sight lines. */
    const inViewOf = (viewer: Subject) =>
      kept.filter((other) => other !== viewer && overlapping(other.body, viewer.view)).flatMap((other) => other.sign.solids);
    const tooNear = kept.some(
      (other) =>
        overlapping(other.body, subject.body) &&
        other.sign.solids.some((theirs) => sign.solids.some((ours) => solidsWithin(ours, theirs, GAP))),
    );
    if (tooNear) {
      verdicts[index] = "crowded";
      continue;
    }
    if (!readable(subject, scenery, inViewOf(subject))) {
      verdicts[index] = "obstructed";
      continue;
    }
    // A sign that would hide a kept sign from its readers gives way to it.
    const hides = kept.some(
      (other) => overlapping(other.view, subject.body) && !readable(other, scenery, [...inViewOf(other), ...sign.solids]),
    );
    if (hides) {
      verdicts[index] = "crowded";
      continue;
    }
    kept.push(subject);
  }
  return verdicts;
}
