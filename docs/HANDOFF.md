# Engineering handoff

Running log for autonomous engineering sessions. Update it before a session
ends so the next one can continue from facts, not memory.

## 2026-11-02: reconstruction PR (#13)

### Verified starting state

- `main` at `ac99308` (PR #12 merged). PR #13 head `d08fe27`, draft,
  `CONFLICTING`. All CI on that head was green.
- The only textual conflict was the export list in `src/vector/index.ts`.
  No other file was changed by both branches. The merged tree passed
  `tsc --noEmit` and the full unit suite (446 pass, 1 skipped, 0 fail)
  before any further changes.

### Changes on `feat/image-reconstruction-pipeline`

1. Merged `main`, keeping both export sets.
2. **Reviser failures no longer discard a run.** If the model adapter threw,
   `runReconstruction` used to reject, so the CLI wrote no `result.json`
   and lost the best valid candidate. It now returns `status: "failed"`
   with `error`, keeping all attempts and the best candidate.
3. **Cancellation.** The loop no longer asks for another revision after the
   signal aborts mid-inspection. The signal is passed to the reviser, the
   OpenAI adapter passes it to `fetch`, and the CLI wires Ctrl+C to it.
4. **OpenAI adapter robustness.** It makes up to 3 attempts with exponential
   backoff, only for 429, 5xx and network errors. Non-JSON gateway bodies
   now produce a readable error. Truncated `incomplete` responses report
   their reason. Prompt resources are loaded relative to the module, not
   the working directory.
5. **Candidate-authored cameras need independent calibration.** The SVGX
   (that is, the model) chooses each reference camera's pose and FOV. A
   silhouette or stroke match through an arbitrary camera can therefore
   certify crude geometry. A view is now `verified` only when at least
   `minimumCameraLandmarks` (default 4) trusted, in-frame, non-collinear
   landmarks pin the camera. Only the independent manifest can lower this.
   `reference/daiban2/annotations.json` has no landmarks, so it can no
   longer certify any view. That is intentional; see its README.

6. An independent review of items 2–5 found the following, all now fixed:
   - A cancel during the final inspection reported `exhausted`.
   - Two tests passed vacuously: three landmarks failed the count before
     the collinearity or single-point-stroke rule was ever reached. Mutation
     checks now show each rule is exercised.
   - `wait()` leaked abort listeners.
   - `insufficient_quota` 429s were retried.
   - Non-object JSON was misclassified as a network error.

### Not done / not verified

- **The live image-model path has not been run end to end.** No API key
  or legally redistributable architectural photographs were available in
  this session. Adapter behaviour is covered only against a local mock
  Responses server. Do not describe the live integration as working until
  a real run is recorded, with its model name, inputs (kept out of git)
  and outcome.
- The landmark rule checks count and non-collinearity, not full pose
  observability. Four coplanar points determine a homography, which is
  enough for this camera model. A proper PnP residual or conditioning check
  would be stronger.
- The Shibuya (daiban2) study has no survey, so it has no certifiable
  ground truth.
- LevelSpec 2 migration parity and the other release gates in
  `docs/IMPLEMENTATION.md` were not touched.

## 2026-11-02: first original map end to end in Three.js (Kiln)

The user's games run in Three.js. The goal is CS- and Siege-style maps,
proven by playing them in a Three.js game.

- `maps/hand/kiln.plan` is an original bomb-defusal blockout.
  `npm run game:export` converts it to v2, validates it, and writes a visual
  GLB, a collision GLB and `game.json` (Y-up markers) to `game/public/maps/kiln`.
  Output is deterministic.
- `game/` is a sample Three.js consumer: GLTFLoader, a sphere-stack
  controller with step-up and slopes, pointer-lock FPS controls, and an
  overhead view on O.
- `tests/game-walk.test.ts` independently probes the collision GLB, plans
  with A*, and physically walks all four spawn-to-site routes. It also checks
  that the player cannot walk through walls.
- LevelSpec bugs found by building Kiln, all fixed with regression tests in
  `tests/plan-pipeline.test.ts`:
  1. Even-width plan ramp strips put their flight one cell outside the
     strip. The fix changes only Dust II's A ramp across the corpus; it still
     passes.
  2. `no_spawn_los` in plans took area names, but validators expect marker
     ids, and v1 *silently skipped* unknown ids. Plans now resolve names, and
     v1 reports MARKER_REFERENCE.
  3. The v1→v2 converter made ramps their own areas and gave links no area
     identity. v2 route counting therefore saw every ramp and stair as a dead
     end. Fixed with `from-area`/`to-area` on `<link>`. v1→v2 regressions
     dropped from 153 to 71 maps.
- **Open:** a ramp strip narrower than the area at its low end leaves
  NAVMESH_VOID_EDGE at the concave corner (v1 compiler). Kiln avoids this with
  same-width landings. The plan test asserts only clipping for that reason.
- Kiln's longest sightline (82 m) runs along the attacker-side haul road
  through T spawn into the tunnels. It needs a playtest judgement.

### Suggested next steps

1. A real-model run with rights-cleared photos, ideally your own, kept
   locally. Record the result here.
2. A synthetic multi-view benchmark with known geometry, rendered views,
   generated silhouettes and landmarks, and deliberately wrong candidates.
   Use it to measure the evaluator's false-accept rate.
3. Continue the product audit in the original brief (geometry fuzzing,
   continuous-traversal navigation proofs, tactical metrics, editor UX).
