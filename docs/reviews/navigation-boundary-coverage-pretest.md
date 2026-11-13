# Navigation boundary coverage: independent pre-test assessment

Reviewed 2026-11-01 before production changes. Applied `maintain-tests` and
`write-readable-typescript`; no production or test files changed in this assessment.

## Finding

The ten `NAV_UNCOVERED` samples in the local lower-route trial are a coverage
boundary classification defect, not evidence that the main stair-to-ground path
is absent. This conclusion is limited to those ten samples; it does not certify
the whole architectural model or gameplay reachability.

The actual XML was recompiled through the public `src/vector/index.ts` API with
the real GLB asset resolver, `floorGaps: "error"`, and `surfaceContacts: "error"`.
It reproduces the saved report: no geometry diagnostics, one navigation component,
no unreachable markers, 91 covered samples, 15 excluded samples, ten uncovered
samples, and three independently width-blocked samples. Main flight, high landing,
broad landing, right flight, and right upper landing have no uncovered samples.
The three width-blocked lower-ground samples remain material report information.

All ten unexplained samples lie on the finite lower-ground outer edge
`(-4.1,-6.25,-1.87) → (1.88,-6.25,-1.87)`, with x from -3.25 through 1.25 in
0.5 m increments. Their shortest XY displacement to that edge is exactly zero.
The navigation mesh's lowest Y is -5.813026428, an inset of 0.436973572 m.
That exceeds the coverage lookup radius of 0.375 m (`player.radius + cell`) but
is within the existing 0.5 m boundary margin (`radius + 2 * cell`). The source
edge is discarded by `near.d < EPS`; the remaining edges are too far away to
establish a margin at these samples. They consequently fall through as uncovered.

An added disposable route probe between `LH-start` and `L1-ground-end` finds a
physical nav path of 13.6366 m. Its semantic `disjointRoutes` is zero, so this
probe must **not** be described as successful route-requirement validation.
The unmodified trial declares no explicit routes, and premap success would still
leave gameplay reachability unverified.

## Independent public repro

Run `node generated/navigation-boundary-pretest/repro.mjs` with Node 24.
It writes disposable XML fixtures and `baseline.json` under that directory.
All compilation imports come from the public XML API; no classifier helper is
mocked or copied.

| Fixture | Public result before correction |
| --- | --- |
| Open 6 × 6 m square, bounds [0,6] on both axes | Passes, 144 covered |
| Same square, bounds [-0.25,5.75] on both axes | Four exact corners uncovered; one component and reachable spawn |
| Same corner fixture with reversed authored winding | Same four failures |
| Open 6 × 6 m floor, x [0,6], y [-0.25,5.75], remote 0.2 × 0.2 × 1 m box centered at (10,6.05,0) | Ten exact bottom-edge samples uncovered; one component and reachable spawn |
| Same remote-box fixture, box Y changed to 6, 6.1, or 6.15 | No uncovered samples |
| Actual-edge rectangle without the rest of the trial | Passes; its raster phase does not expose the straight-edge omission |

The remote box never intersects the floor or route. Its contribution to the
global raster bounds changes the surviving navigation edge from a 0.375 m inset
to about 0.4 m, exposing the classification omission. These variations diagnose
the defect; changing the authored floor or moving model edges is not a repair.
The four-corner rectangle is the smallest robust public regression fixture.
The remote-box case separately protects exact points in a straight edge interior.

## Required behavioral coverage before implementation

1. Add public compiler regressions for the corner rectangle in both windings and
   for the straight-edge fixture. Require no geometry diagnostics, nonempty
   connected navigation, a reachable interior spawn, covered interior floor,
   no uncovered samples, and a passing navigation report. Assert that exposed
   margins are excluded where the lookup cannot cover them, without fixing the
   exact total sample or triangle count. Both cases currently fail for the
   intended reason. A test of only `near.d === 0` would mirror an implementation.
2. Preserve unexplained **interior** missing-navigation detection. The existing
   shoreline test in `vector-repairs.test.ts` already supplies real compiled
   floor geometry and an independent missing-navigation callback. Keep its
   interior-failure assertion and ensure a boundary-only correction cannot
   exclude the floor wholesale. A direct pure audit test is appropriate for this
   distinction, alongside public compilation acceptance.
3. Preserve width failures in both the existing narrow dead-end branch and the
   entirely eroded 0.4 m corridor. Include an edge-aligned 0.4 m corridor if
   zero-distance directions participate in the fix. Baseline y [-0.25,0.15]
   already excludes eight exact-edge samples and relies on a triangle-centroid
   fallback for its width failure. Require an actual width failure and failed
   strict validation, not merely an unreachable spawn. Do not require every
   physically marginal sample to have the same classification.
4. Retain the excessive physical stair-riser test (`NAV_STEP`), partial/low beam
   headroom tests, and the overlapping slab underside-clearance tests. Margin
   handling must not bypass checks that run before navigation lookup. Existing
   sharp triangular-tip acceptance must also survive.
5. Keep disconnected-island/explicit-route failure behavior. A physical gap
   between otherwise navigable platforms must continue to fail an explicit
   route; premap mode does not waive explicit routes. Maintain the independent
   strict `FLOOR_EDGE_GAP` suite: an edge-margin classification cannot substitute
   for geometric closure or erase a real authored slab gap.
6. Recompile the unchanged actual trial as acceptance evidence: the ten
   unexplained boundary failures should disappear, interior coverage and marker
   reachability should survive, and the three width-blocked samples should stay
   blocked. Do not turn the entire detailed project into a unit-test fixture.

Do not accept a blanket rule excluding every point on every loop. Boundary
classification must distinguish exposed outer/hole edges from supported shared
edges, and retain excessive-step and opposing-side width checks. A finite
direction for an exact point needs support probing; silently skipping the edge
or dividing by its zero distance does not establish the contract. No numerical
threshold or configured player clearance should be relaxed to obtain success.

## Baseline verification

`node --test tests/vector-navigation.test.ts tests/vector-repairs.test.ts`:
31 tests passed, no failures. Output is retained at
`generated/navigation-boundary-pretest/test-baseline.txt`.
The existing public tests pass while the new disposable compiler cases fail,
confirming a meaningful regression gap. No production correction has been tested
or endorsed by this pre-test review.
