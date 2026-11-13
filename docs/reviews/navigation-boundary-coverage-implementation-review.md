# Navigation exact-boundary coverage: independent implementation review

**Accepted: no material implementation finding.** The correction addresses the missing direction at an exact authored edge without excluding supported shared edges or relaxing agent, raster, clearance or step thresholds. This accepts the coverage classification change, not gameplay reachability or architectural fidelity.

Applied readable-TypeScript, maintain-tests and reference-authoring guidance. Read the independent pre-test assessment, complete classifier, its caller/cache ownership and final tests. No production or durable test-suite edits were made by this reviewer. Reviewer-only probes and execution evidence are under `generated/navigation-boundary-implementation-review/`.

## Reviewed identities and scope

| File | SHA256 |
| --- | --- |
| `src/vector/navigation-coverage.ts` | `fde5d3262d660f69497c36c399c985370eedf32da6fc33636699946e00defc62` |
| `src/vector/validate.ts` | `4ad5ed1c0a96ac467f5b4d39eaab66b957ea3e16e4f70ed4f18b7be5e6370cc2` |
| `tests/vector-navigation.test.ts` | `23967aefbd0c4ecabb1593394d67fdeab89ec58f6b3b1f3025ee2bd9b4ece779` |

The boundary correction is confined to coverage directions/normal probes and the navigation cache revision. The working-tree `validate.ts` diff also contains pre-existing component/suggestion changes; this review does not present those unrelated edits as part of this fix. `NAVIGATION_REVISION = 12` participates in the cache key and reported settings, so a report from the prior classifier cannot be reused by this version.

## Correctness and simplicity

For a nonzero nearest-edge displacement, `unitDirection * (distance + cell)` is algebraically the previous `nearDisplacement * (1 + cell / distance)`. It preserves the probe position and configured margin. A zero-distance sample has no such direction; the two normalized edge normals supply finite, winding-independent support probes. Degenerate XY edges are skipped rather than divided by zero.

A direction enters the margin limits only when no height-compatible floor supports its probe. An ordinary exposed outer edge therefore contributes its outward normal, while supported continuation across a shared edge contributes no limit. An incompatible adjacent height still sets the excessive-step flag. The later width comparison uses the explicit unit directions rather than dividing two zero distances. Its existing parallel-edge, opposite-side, interior-projection and total-width conditions remain intact. This is a focused repair at the classification boundary, not a global rule that accepts all loop points.

Physical occupancy, slope, headroom, excessive authored stair rise and successful actual-navigation lookup retain their earlier ordering. The patch neither edits floor/collision geometry nor invents navigation polygons; it only classifies samples that have already failed the lookup. The existing bounded sampling semantics remain: coverage is an audit, not continuous proof.

## Independent execution and failure preservation

I personally ran the final navigation, repairs and floor-gap suites together: **60/60 passed**, with `tsc --noEmit` passing. Retained logs are [final-tests.txt](../../generated/navigation-boundary-implementation-review/final-tests.txt) and [final-typecheck.txt](../../generated/navigation-boundary-implementation-review/final-typecheck.txt).

The new public compiler fixtures protect both authored windings, exact straight-edge margins with a remote raster-phase prop, positive interior coverage, and an aligned narrow corridor that must still fail as width. The final two added tests use actual compiled floor patches plus an intentionally absent navigation locator: a height-compatible shared boundary remains uncovered, an adjacent 0.8 m height difference remains a step failure, and a genuine interior sample remains uncovered. These tests exercise observable classification rather than private direction representation.

I additionally ran independently authored reviewer probes before reading those final added tests. At six exact shared-edge points, same-height neighbors remained `uncovered`; the same points on the high side of a 0.8 m drop remained `step`. Interior missing-navigation samples remained failures. See [PROBES.json](../../generated/navigation-boundary-implementation-review/PROBES.json) and [probes.mjs](../../generated/navigation-boundary-implementation-review/probes.mjs). The first reviewer fixture assumed no diagnostics for the raised unsealed edge and correctly encountered `FLOOR_EDGE_GAP`; the retained initial script records that fixture assumption. The corrected probe explicitly preserves that geometry warning rather than suppressing it.

Existing tests continue to reject the narrow dead-end and fully eroded corridor, excessive stair rise, partial/low-beam clearance loss, overlapping slab underside clearance and explicit disconnected-route requirements. The 23-case floor-gap suite passes independently of navigation margin classification. Sharp triangular-tip and shoreline-margin behavior also survive.

## Unchanged actual trial

I independently recompiled the unchanged `lower-route-local-v1-source-r02` XML through the public API with the real GLB resolver, `floorGaps: error` and `surfaceContacts: error`, then invoked runtime validation. XML SHA256 remained `9b1657a66fd39c3fe0bdbfe8a45ab1734072531cf616e60f79f99f3b9fe71691` throughout.

The result has **91 covered, 25 excluded, zero uncovered and three width-blocked samples**; all three blocked samples retain their width reason. The former ten boundary failures become exclusions while the covered count stays unchanged. Navigation retains one component and no unreachable markers. Geometry diagnostics are empty and runtime validation passes. See [ACTUAL-TRIAL.json](../../generated/navigation-boundary-implementation-review/ACTUAL-TRIAL.json) and [actual-trial.mjs](../../generated/navigation-boundary-implementation-review/actual-trial.mjs).

This trial is a static premap. The surviving blocked samples, source/CAD uncertainty, explicit route requirements and actual gameplay checks retain their own authority. No whole-building or global-route acceptance follows from eliminating this exact-boundary false failure.

## Subsequent reporting qualification

The architectural actual-model audit distinguished `components=1` from four entries in `componentDetails`: one named six-floor route and three unassigned collision-top components (service bed, column cap and a small lower cap). References above to one component describe the API floor-route count, not a single connected component across every physical prop top. This does not change the boundary-fix result or establish explicit-route/gameplay/source acceptance.
