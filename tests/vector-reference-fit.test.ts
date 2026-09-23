import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fitReferenceCamera,
  projectReference,
  type ReferenceView,
  type V3,
} from "../src/vector/index.ts";

function calibratedReference(): ReferenceView {
  const camera = {
    position: [3, -12, 6] as V3,
    target: [0, 1, 2] as V3,
    up: [0, 0, 1] as V3,
    fov: 52,
    near: 0.05,
    far: 2000,
  };
  const points: V3[] = [
    [-4, -1, 0],
    [4, -1, 0],
    [-4, 5, 0],
    [4, 5, 0],
    [-3, 0, 4],
    [3, 0, 4],
    [-2, 4, 8],
    [2, 4, 8],
  ];
  const reference: ReferenceView = {
    id: "calibration",
    image: "reference.png",
    width: 1500,
    height: 1000,
    scale: "measured",
    scaleNote: "Synthetic metric fixture.",
    camera,
    landmarks: [],
    masks: [],
  };
  reference.landmarks = points.map((position, i) => ({
    id: "p" + i,
    position,
    image: projectReference(reference, position).image!,
  }));
  return reference;
}

describe("reference camera fitting", () => {
  it("recovers a low-error camera from a rough manual framing", () => {
    const reference = calibratedReference();
    reference.camera = {
      ...reference.camera,
      position: [3.8, -11.2, 6.5],
      target: [0.6, 1.3, 2.3],
      fov: 58,
    };

    const result = fitReferenceCamera(reference);
    assert.ok(result.initialRmsPixels > 40);
    assert.ok(result.rmsPixels < 3, String(result.rmsPixels));
    assert.ok(result.rmsPixels < result.initialRmsPixels * 0.1);
    assert.ok(result.inFrameRmsPixels !== null && result.inFrameRmsPixels < 3);
    assert.equal(result.improved, true);

    // Input remains reusable for alternate fitting strategies.
    assert.deepEqual(reference.camera.position, [3.8, -11.2, 6.5]);
    assert.equal(reference.camera.fov, 58);
  });

  it("requires enough unmasked correspondences to constrain a perspective camera", () => {
    const reference = calibratedReference();
    reference.landmarks = reference.landmarks.slice(0, 2);
    assert.throws(
      () => fitReferenceCamera(reference),
      /at least three unmasked reference landmarks/,
    );
  });
});
