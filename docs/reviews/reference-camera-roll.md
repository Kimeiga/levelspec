# Reference camera roll tooling review

Date: 2026-11-01. Disposition: implemented and independently accepted for the
documented camera-roll contract. This review does not accept architectural fidelity.

## Resulting contract

The shared view API, camera form, preview CLI and replay URL accept finite roll in
degrees, positive by the right-hand rule about camera-to-target forward. Default
roll is zero. The getter derives effective roll from the actual camera quaternion
after orbiting; replay preserves orientation rather than whole-turn counts.
Projection changes and watched source edits preserve overview orientation. Fit
retains effective roll while using its established default isometric direction;
named presets reset roll to zero. Walking keeps its separate Z-up camera. Suggestion
links clear explicit roll, and restoring an inspection restores the saved orientation.

`data-view-matrix` reports the active rendered camera's world-to-camera matrix;
`data-view` continues to report the overview state, including during walking.

## Validation

All of the following passed:

- `npm run check`.
- `node --test tests/review-view.test.ts tests/vector-cli.test.ts`: 13 tests.
- `npm run test:preview:browser`: both live-preview and suggestion browser suites.
- `npm run build:viewer` and `npm run build:site`. Builds emitted nonblocking
  Vite externalization, dynamic-import and chunk-size warnings.

Browser assertions inspect actual rendered matrices: cardinal +90° sign,
non-cardinal orientation, real orbit followed by URL replay, projection changes,
roll-only automatic Fit, FOV Apply and invalid-input recovery, preset reset,
nonzero watched-edit retention, upright walking and numeric overview restoration.
Suggestion restoration exercises a saved −23° view, an inspection changed to +57°,
then restoration of the original full matrix; copied semantic links remove roll.

The independent [test review](reference-camera-roll-tests.md) passed after its
material assertion findings were resolved. The separate
[implementation review](reference-camera-roll-implementation.md) accepted the
implementation with no material finding and independently checked replay, Fit
frustum corners in both projections and the specialist camera basis. These are
retained copies of the reviewers' completed reports.

## Diagnostic reference-pose verification

The specialist's [overhead capture](../../projects/dai2-daiban/studies/r02/camera-review/capture.json)
uses an internal sign opposite the public forward-axis convention. Public roll
`+21.490674804749°`, with the recorded position/target/FOV, reproduces its expected
image-up `[-0.3947349998446703, 0.8466292460542664, 0.3569358480500555]` in an actual
browser with Euclidean vector residual `2.78e-16`. The implementation reviewer
independently obtained `2.48e-16` using actual Three cameras and OrbitControls.

The browser verification used a separate ephemeral preview server and retained
metadata/screenshot under ignored `generated/roll-reference-camera-verification/`.
Its viewport differs from the photograph's frame: this verifies orientation only,
not camera-fit or model fidelity. No project geometry was modified for this tooling
work; the user preview on port 5186 was not operated.
