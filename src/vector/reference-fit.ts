import type { V2, V3 } from "./types.ts";
import {
  compareReference,
  pointInMask,
  projectReference,
  type ReferenceView,
} from "./reference.ts";

export interface ReferenceFitOptions {
  /** Maximum coordinate-descent passes. */
  maxIterations?: number;
  /** Stop once the reprojection objective reaches this many pixels. */
  tolerancePixels?: number;
  /** Override the initial translation step in metres. */
  positionStep?: number;
  /** Override the initial look-at target step in metres. */
  targetStep?: number;
  /** Override the initial vertical-FOV step in degrees. */
  fovStep?: number;
}

export interface ReferenceFitResult {
  reference: ReferenceView;
  initialRmsPixels: number;
  rmsPixels: number;
  inFrameRmsPixels: number | null;
  iterations: number;
  evaluations: number;
  improved: boolean;
}

function copyV2(value: V2): V2 {
  return [value[0], value[1]];
}

function copyV3(value: V3): V3 {
  return [value[0], value[1], value[2]];
}

function cloneReference(reference: ReferenceView): ReferenceView {
  return {
    ...reference,
    camera: {
      ...reference.camera,
      position: copyV3(reference.camera.position),
      target: copyV3(reference.camera.target),
      up: copyV3(reference.camera.up),
    },
    landmarks: reference.landmarks.map((landmark) => ({
      ...landmark,
      position: copyV3(landmark.position),
      image: copyV2(landmark.image),
    })),
    masks: reference.masks.map((mask) => ({
      ...mask,
      points: mask.points.map(copyV2),
    })),
  };
}

function observations(reference: ReferenceView) {
  return reference.landmarks.filter(
    (landmark) =>
      !reference.masks.some((mask) => pointInMask(landmark.image, mask.points)),
  );
}

/**
 * Reprojection objective used while fitting. Off-frame points still contribute
 * their projected pixel distance so the optimizer has a gradient back toward
 * the image. Points behind the camera receive a large finite penalty.
 */
function fitScore(reference: ReferenceView): number {
  const points = observations(reference);
  if (points.length < 3)
    throw new Error(
      "Camera fitting needs at least three unmasked reference landmarks.",
    );
  const behindPenalty = Math.hypot(reference.width, reference.height) * 2;
  let squared = 0;
  for (const landmark of points) {
    let projection;
    try {
      projection = projectReference(reference, landmark.position);
    } catch {
      return Number.POSITIVE_INFINITY;
    }
    if (!projection.image) {
      squared += behindPenalty * behindPenalty;
      continue;
    }
    const dx = (projection.image[0] - landmark.image[0]) * reference.width;
    const dy = (projection.image[1] - landmark.image[1]) * reference.height;
    squared += dx * dx + dy * dy;
  }
  return Math.sqrt(squared / points.length);
}

type CameraVectorKey = "position" | "target";
type Parameter =
  | { kind: CameraVectorKey; axis: 0 | 1 | 2 }
  | { kind: "fov" };

const PARAMETERS: readonly Parameter[] = [
  { kind: "position", axis: 0 },
  { kind: "position", axis: 1 },
  { kind: "position", axis: 2 },
  { kind: "target", axis: 0 },
  { kind: "target", axis: 1 },
  { kind: "target", axis: 2 },
  { kind: "fov" },
];

function mutateCamera(
  source: ReferenceView,
  parameter: Parameter,
  delta: number,
): ReferenceView {
  const candidate = cloneReference(source);
  if (parameter.kind === "fov")
    candidate.camera.fov = Math.max(5, Math.min(150, candidate.camera.fov + delta));
  else candidate.camera[parameter.kind][parameter.axis] += delta;
  return candidate;
}

function cameraDistance(reference: ReferenceView) {
  const { position, target } = reference.camera;
  return Math.max(
    0.1,
    Math.hypot(
      target[0] - position[0],
      target[1] - position[1],
      target[2] - position[2],
    ),
  );
}

function initialSteps(reference: ReferenceView, options: ReferenceFitOptions) {
  const distance = cameraDistance(reference);
  const position = options.positionStep ?? distance * 0.06;
  const target = options.targetStep ?? distance * 0.045;
  return [
    position,
    position,
    position,
    target,
    target,
    target,
    options.fovStep ?? 3,
  ];
}

interface Candidate {
  reference: ReferenceView;
  score: number;
  evaluations: number;
}

function improveParameter(
  current: ReferenceView,
  parameter: Parameter,
  step: number,
  incumbent: number,
): Candidate {
  let reference = current;
  let score = incumbent;
  let evaluations = 0;
  for (const direction of [-1, 1]) {
    const candidate = mutateCamera(current, parameter, direction * step);
    const candidateScore = fitScore(candidate);
    evaluations++;
    if (candidateScore + 1e-9 >= score) continue;
    reference = candidate;
    score = candidateScore;
  }
  return { reference, score, evaluations };
}

function improvePass(
  current: ReferenceView,
  incumbent: number,
  steps: readonly number[],
): Candidate {
  let reference = current;
  let score = incumbent;
  let evaluations = 0;
  for (let i = 0; i < PARAMETERS.length; i++) {
    const result = improveParameter(reference, PARAMETERS[i], steps[i], score);
    reference = result.reference;
    score = result.score;
    evaluations += result.evaluations;
  }
  return { reference, score, evaluations };
}

function shrinkSteps(steps: number[]) {
  for (let i = 0; i < steps.length; i++) steps[i] *= 0.55;
}

function stepsConverged(steps: readonly number[]) {
  return Math.max(...steps.slice(0, 6)) < 1e-5 && steps[6] < 1e-4;
}

/**
 * Fits camera translation, look-at target and vertical FOV to authored
 * 3D-to-image landmark correspondences. Camera up/roll and scene geometry are
 * deliberately held fixed, so this is a calibration helper rather than an
 * image-to-geometry solver.
 */
export function fitReferenceCamera(
  reference: ReferenceView,
  options: ReferenceFitOptions = {},
): ReferenceFitResult {
  let current = cloneReference(reference);
  let best = fitScore(current);
  const initial = best;
  let evaluations = 1;
  let iterations = 0;
  const steps = initialSteps(current, options);
  const maxIterations = options.maxIterations ?? 80;
  const tolerance = options.tolerancePixels ?? 0.5;

  while (iterations < maxIterations && best > tolerance) {
    const result = improvePass(current, best, steps);
    evaluations += result.evaluations;
    iterations++;
    if (result.score + 1e-9 < best) {
      current = result.reference;
      best = result.score;
      continue;
    }
    shrinkSteps(steps);
    if (stepsConverged(steps)) break;
  }

  return {
    reference: current,
    initialRmsPixels: initial,
    rmsPixels: best,
    inFrameRmsPixels: compareReference(current).rmsPixels,
    iterations,
    evaluations,
    improved: best + 1e-9 < initial,
  };
}
