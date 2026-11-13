# Navigation boundary coverage: independent test review

Reviewed 2026-11-01 after the exact-boundary correction and navigation cache
revision 12. This review applies `maintain-tests` and `write-readable-typescript`.
It accepts the navigation coverage correction within the scope below; it is not
overall architectural acceptance of the lower-route trial.

## Outcome

No unresolved material test findings. Public compiler reproductions now accept
ordinary exact outer-edge and corner margins without relaxing player clearance.
The unchanged local structural trial retains its existing covered samples,
reachable markers, connected navigation and physically demonstrated width limits.
Tests continue to detect missing interior navigation, supported shared-boundary
coverage failures, excessive steps, narrow passages, low headroom and real floor
gaps.

The four added public compiler cases are useful, independently derived feature
regressions: forward/reversed corner winding, a straight-edge raster-phase
fixture, and an edge-aligned 0.4 m passage. They exercise real compilation and
Recast rather than returning synthetic success from a navigation callback.
The positive cases check nonempty connected navigation, reachable interior spawn,
covered floor, absence of uncovered samples and successful navigation. The
straight-edge case also requires excluded margin samples. Exact triangle counts
or total coverage sample counts are not asserted.

The aligned passage requires a width failure **at the exact edge**. This is
stronger than checking only an unreachable spawn or the old incidental triangle
centroid fallback; it would reject a correction that simply excluded every
zero-distance point.

## Gaps resolved during independent review

The existing excessive-stair test protects the early physical-riser check, which
runs before the modified boundary logic. It does not exercise adjacent-height
step detection in that logic. Two small additional cases now protect the actual
boundary distinction using real compiled geometry and the pure coverage audit:

- Two equal-height floors meet at x=3.25 m. With missing navigation, an exact
  shared-edge sample at (3.25,2.25) remains `uncovered`, because support continues
  across the edge. A blanket exact-boundary exemption cannot satisfy this case.
- Raising the right floor by 0.8 m makes that exact right-floor sample a `step`
  failure. This is independently above the configured 0.25 m step limit and does
  not depend on the authored-stair riser precheck.

Both cases also require a right-floor interior sample at (4.25,2.25) to remain
`uncovered`. The callback deliberately supplies no navigation; geometry remains
real, and the expected samples/reasons come from the input dimensions. A pure
algorithm test is appropriate alongside the public compiler acceptance cases.
Positive compiler tests were also strengthened to require covered interior floor,
excluded straight-edge margins, and clean narrow-fixture geometry.

No production files were edited by this test review.

## Unchanged trial and independent reproductions

`generated/navigation-boundary-pretest/repro.mjs` recompiles the original
`generated/dai2-daiban-review/lower-route-local-v1-source-r02/level.level.svgx`
with its actual GLB files, strict floor-gap diagnostics and error-level surface
contacts. No authored coordinates, edges, props or player settings were changed.

| Observation | Before correction | After correction |
| --- | --- | --- |
| Geometry diagnostics | None | None |
| Navigation components | 1 | 1 |
| Unreachable markers | None | None |
| Covered samples | 91 | 91 |
| Excluded samples | 15 | 25 |
| Unexplained uncovered samples | 10 | 0 |
| Physically width-blocked samples | 3 | 3 |
| Navigation report passes | No | Yes |

The removed failures are exactly the ten finite outer-ground-edge samples
identified in the pre-test assessment. The actual nav geometry remains inset
from the authored finite edge; coverage now recognizes that existing margin.

Both winding versions of the minimal corner rectangle pass. All four remote-box
Y variants (6, 6.05, 6.1, 6.15 m) pass; the formerly failing straight-edge version
retains 144 covered samples and excludes 12 margin samples. The edge-aligned
0.4 m corridor now reports all nine sampled points as width failures rather than
excluding eight and relying on one fallback sample. It still has no usable
navigation and fails as required.

The disposable original-trial route probe still finds a physical path from
`LH-start` to `L1-ground-end`, approximately 13.6366 m. Its semantic disjoint-route
count remains zero, and the explicit route probe still fails its requirement.
This review does not turn that into route acceptance. The original XML declares
no explicit route, and its premap result does not verify gameplay reachability.

## Verification

- `node --test tests/vector-navigation.test.ts tests/vector-repairs.test.ts tests/vector-floor-gaps.test.ts`: **60 passed**, no failures/skips.
- `npm run check`: passed.
- `node generated/navigation-boundary-pretest/repro.mjs`: public minimal cases,
  raster-phase variations, unchanged actual source/assets and negative narrow
  fixtures exercised.

The passing focused suites retain partial headroom/underside checks, excessive
stair risers, narrow branches and fully eroded floors, disconnected islands,
explicit blocked routes, missing interior audit coverage, shoreline margins and
strict physical floor-edge-gap detection. The current cache revision distinguishes
reports produced before this changed coverage classification; no test hard-codes
the revision number as a behavioral expectation.

Review evidence is retained under `generated/navigation-boundary-pretest/`:
`post-fix-baseline.json`, `post-output.json`, `post-tests.txt`,
`post-typecheck.txt`, and the small `adjacent-probe.mjs`/`.json` investigation.
Sampling remains a conservative navigation audit, not a continuous capsule proof.

## Subsequent reporting qualification

The architectural actual-model audit distinguished `components=1` from four entries in `componentDetails`: one named six-floor route and three unassigned collision-top components (service bed, column cap and a small lower cap). References above to one component describe the API floor-route count, not a single connected component across every physical prop top. This does not change the boundary-fix result or establish explicit-route/gameplay/source acceptance.
