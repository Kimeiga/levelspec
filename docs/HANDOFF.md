# Engineering handoff

Running log for autonomous engineering sessions. Update it before a session
ends so the next one can continue from facts, not memory.

## 2026-11-03: PR #15 review follow-up

[PR #15](https://github.com/Kimeiga/levelspec/pull/15) publishes the continuation
below. Independent review found two additional cases, now fixed with regressions:

- A still-held movement key could auto-repeat after pointer unlock and rearm
  movement. Repeated keydown events now return before changing held state.
  All three reset regressions fail before this fix; browser pointer unlock
  followed by repeated W events now remains stationary until a fresh press.
- A cap only millimetres from a tread edge produced near-coincident parallel
  faces. The baseline-valid reproduction uses grid 1.6, wall thickness 0.2 and
  rise 0.8. Same-layer flight side bands now normalize the exact union of wings,
  guards and static wall bases. `src/core/flight-rectangles.ts` preserves valid
  columns and repartitions only conflicting pairs using their existing planes.
  A candidate must strictly reduce the unchanged face-contact conflict count,
  including neighboring geometry, and may not introduce degenerate boxes.
  The bounded repair leaves unresolved findings visible to final validation.
  Central tread heights stay intact; dynamic panels and other layers remain
  separate. Static walls retain their complete run/height columns: clipping
  them at the flight's endpoint elevation could itself create a thin remnant.
  Neighbor scoring covers the expanded source bounds. Multi-storey flight
  normalization is unchanged.
- Review also caught an intermediate horizontal-strata decomposition that cut
  valid bridge columns into 5 mm (or sub-micrometre) height layers. Regressions
  cover valid columns, compound flights with a conflict on the opposite side,
  exact occupied volume and nonzero elevations. The shared contact predicate
  was extracted unchanged into `src/core/contact.ts`: 2,000 comparison cases
  produce exactly the original validator's geometry reports, including its
  0.01 m tolerance boundaries. No validator thresholds or baselines changed.
  Final independent review cleared all findings after 80 focused tests and the
  1,728-case sweep. The high-rise cap regression covers N/S; E/W already had
  four minimum-height cap/floor coplanar findings on the base commit, and still
  reports those four rather than hiding them.

The eight added compass/parameter regressions, exact-volume and raised-elevation
checks, dynamic-panel separation, existing navigation and physical/exported
collision tests pass. An expanded old-versus-new geometry
sweep finds **zero regressions in 1,728 cases** (the reviewed version had 60).
Typecheck, game build and Fallow's full `origin/main` comparison pass. Kiln was
regenerated and its six exported collision tests pass. The final full-suite,
corpus and remote CI outcome for this follow-up is attached to PR #15; the
earlier local-only verification below predates this review correction.

## 2026-11-03: ramp landing coverage and Kiln spatial review

Starting checkout: `main` at `e1c8dfb` (merged PR #14), with only the user's
untracked `.claude/` directory. Work is on `fix/ramp-landing-coverage`.

### Ramp repair

- Reproduced the exact `twoRooms` narrow-strip fixture. A tread crossed a
  concave room corner, but any overlap with the adjoining wall inset the whole
  tread. The floor hole was still full width, leaving an unsupported 16 cm
  strip before the wall cap. Both landings can be affected. This was a real
  omission in the solids, not merely a navigation graph disagreement.
- Flight treads now partition at cell boundaries and resolved wall ends before
  deciding their side insets. Pieces retain their original tread height/rise.
  Adjacent pieces with identical sections coalesce. Guards retain the supporting
  height of the original tread, avoiding a thin full-depth stringer where a cap
  starts millimetres from a tread boundary. Existing wall ownership and geometry
  tolerances remain in force; no diagnostic or validator was weakened.
- The first implementation's unnecessary tiny pieces failed the existing Dust
  benchmark and Archive concept coplanar checks. Coalescing fixed those. A
  map-by-map corpus comparison then caught Riser's stacked guard/cap case even
  though the overall v2 failure count was unchanged. That now has a specific
  failing-before/fixed-after regression in `tests/plan-pipeline.test.ts`.
- The shared literal fixture moved to `tests/fixtures/ramp.ts`. Plan regressions
  cover 2/3/4-cell strips, all four compass directions, stepped flights and
  same-width landings. `tests/game-ramp.test.ts` independently probes legacy
  triangles and exported collision GLBs at both landing edges, then physically
  walks uphill/downhill beside both walls: 192 support rays and 96 traversals.
  All 24 collision cases failed against the original compiler, including the
  exported cases; restoring the fix made them pass. One original orientation
  passed the sampled void diagnostic despite its missing solid, which is why
  the independent collision probes are retained.
- A separate deterministic 288-case sweep varied grid (1/1.6 m), rise
  (0.3/0.6/1/1.2 m), wall thickness (0.2/0.32/0.5 m), width and direction.
  All passed unchanged legacy runtime validation. This is finite regression
  coverage, not a continuous-safety proof for arbitrary geometry/controllers.
- Kiln's game artifacts were regenerated. Both GLBs have zero Khronos errors
  and warnings; a repeated export reproduces both GLBs and metadata byte for
  byte. Existing wall, ceiling and four spawn-to-site collision tests pass.

### Kiln spatial review

The recovered handoff's location for the longest sightline was inaccurate.
`checkTactical` reports 81.8506 m between cells `[2,39]` and `[53,43]`: Long
Corner through the northern site/office/loading side. The attacker-side road
has a separate 78.4653 m line between `[3,5]` and `[52,7]`. Independent eye-level
rays through the exported collision GLB confirm both lines are unobstructed.

Both directions were inspected in the actual Three.js game at a 90-degree FOV,
with the normal fog/lighting. The north line is framed by the Long Corner door;
the south line is an open attacker rotation lane. Keep the current layout for
now: length alone does not establish a balance defect. The sample has no
weapons or opponents, so this is a solo spatial/traversal review, not a combat
balance playtest. Future testing should specifically measure northern cross-site
holds/retakes and the southern rotation's exposure with opponents.

Browser execution of the production controller against the exported GLB reached
A/B from T in **15.45/16.10 s**, and from CT in **6.58/7.42 s**, at 5 m/s run
speed. Route planning and arrival were checked, not just semantic connectivity.

### Game controls found during review

- Holding movement and losing focus continued moving the player (about 2.1 m
  over the next 0.4 s in the browser reproduction).
- `game/input.ts` now clears held keys on Window blur and Document visibility
  and pointer-lock changes. The actual browser unlock check caught an initial
  Window-only listener mistake; pointer-lock changes do not bubble to Window.
  Tests use distinct event sources to retain that regression.
- View/spawn actions fire once per press, including after focus loss; keyboard
  repeat no longer repeatedly toggles overhead view or teleports. Four input
  regressions and actual browser blur, pointer-unlock and repeated-O checks pass.

### Verification and continuation

- `node --test --test-concurrency=2 'tests/*.test.ts'`: **531 pass, 1 skip,
  0 fail** (532 tests, 324.3 s). The 170-test focused geometry/navigation/game
  suite also passed; the final regenerated Kiln collision passed its six tests.
- `npm run check`, viewer/site/game production builds, and Fallow 3.23.0 audit
  with CI's `--gate new-only --health-baseline
  fallow-baselines/reference-authoring-health.json --fail-on-issues`: pass.
  Fallow's inherited findings were not waived or added to the baseline.
- Fresh migration runs before and after: **391 converted, 390 legacy-valid,
  319 v2-valid, 71 legacy-valid maps failing v2**. The 391 total includes one
  intentional failure; the historical "391 legacy-valid" denominator was
  inaccurate. Every map's pass/fail status and error-code set matches baseline,
  including Riser. The command still exits 1 for the open parity gate.
- `generated/migration-report.json` contains the final run. Additional evidence
  is retained locally under `generated/ramp-landing-qa`; screenshots, raw playtest
  results and a human-readable report accompany this Codex chat's outputs.

Local commits and independent revert points:

- `2a60f9b` — ramp/guard geometry, regressions and regenerated Kiln assets.
  `git revert 2a60f9b` restores the former geometry and assets together.
- `3203fef` — game focus/capture/repeat handling and its input regressions.
  `git revert 3203fef` restores the old input behavior independently.
- `dc7c7ac` — Windows fixture comparison described below.
  `git revert dc7c7ac` removes that portability change.

These are local commits on `fix/ramp-landing-coverage`; no new PR or merge was
performed. The user's untracked `.claude/` directory remains untouched.

The website's fixture identity check initially failed on this Windows checkout
solely because Git supplied CRLF while the serializer emits LF. Its assertion
now normalizes CRLF and still compares all XML content. Website unit tests pass
24/24, and all five production browser scripts pass, including offline edits,
exports, accessibility/responsiveness, walking and graphics fallbacks. Build
and preview must both receive `SITE_BASE=/levelspec/`; a CLI `--base` alone does
not configure the offline manifest plugin.

One concrete future migration audit: for JSON specs with an omitted player,
the adapter currently keeps v2 defaults (radius 0.25 m, height 2 m), while v1
defaults are radius 0.35 m and height 1.8 m. Plans already declare the legacy
player explicitly. Reconcile the JSON case deliberately against the corpus;
do not silently change the player or loosen navigation thresholds. Live paid
reconstruction remains unverified and was not invoked during this work.

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
