# Independent implementation review

Scope: the compiler fixes approved after the AML audit, with definite invalid input and demonstrated requirement violations reported as errors, and uncertainty or architectural suspicion reported as nonblocking warnings. Comparison uses `generated/compiler-fixes-baseline/source.zip`, not the repository's large pre-existing Git diff. No map source was changed by this review.

Applied the repository TypeScript and test-maintenance review guidance. This review is separate from the preimplementation/test review.

## Findings raised during implementation

1. **A source-floor-only cut was not an optimistic physical bound.** A flat native box can extend support outside the source guide and connect around a divider without changing foot height. The reproduction in `generated/compiler-fixes-implementation-review/flat-prop-detour.mjs` adds a box with top z=0 alongside the divided-area fixture. A real navigation path reaches the other half through x=-0.25, but the first implementation still reported maximum one route and rejected a two-route requirement. The guard must account for unowned same-height support as well as raised support.
2. **Heuristic review could fail an otherwise valid compile.** `generated/compiler-fixes-implementation-review/envelope-scale.mjs` has 900 separated short walls and one roof (10,812 triangles). The new wall audit rescanned every triangle for every wall and exhausted its fixed budget, producing `AML_GEOMETRY: Physical route work budget exceeded` with navigation disabled. Indexing source geometry once and treating incomplete heuristic review explicitly avoids converting suspicion into a hard geometry failure.
3. **A failed physical-analysis refresh left stale success published.** After a successful public bake, changing the player radius and rebaking with `physicalWork:1` threw but retained the old passed navigation and complete suggestion status. `generated/compiler-fixes-implementation-review/failure-state.mjs` reproduces this. The physical phase belongs inside the same cleanup boundary as movement preparation and baking; recovery must remain usable.
4. **Closed dynamic-state coverage was being promoted into an undeclared acceptance requirement.** Appending all sealed-state diagnostics to runtime acceptance changes the existing dynamic-door contract even when no route requires that state. Keep generic sealed coverage separate, and document/enforce explicit physical route/connection requirements consistently.
5. **The detailed sample cap could erase inspection evidence.** The first 2,048 global uncovered samples do not guarantee a representative for every region/reason. A later failing region could have a count but no blockers, spatial bounds or inspection target. Retain a representative independent of the bounded detailed sample list.
6. **An uncertain elevation could create a disconnected optimistic node.** `RouteDomains.at` originally returned the bare area ID for an out-of-height point even when the same area otherwise used partition component IDs. This can reduce the supposed upper bound. Uncertain endpoint/mouth elevation must conservatively include all candidate components or disable the area's partition consistently.
7. **Verify crossing witnesses against actual collision.** The independent test reviewer observed ground-height Recast islands inside tall jambs. Calling a mouth verified from these polygons alone can retain an occupied station. Reject occupied witness positions without turning missed samples into proof of impossibility.

## Structural assessment

The hard cutover from producer-only physical checks to shared runtime validation addresses the ownership problem. Resolved world-space mouth geometry belongs on the compiled level; source offsets are formatted separately from reusable geometric evidence. Distinguishing verified resource counts from optimistic capacity is the correct contract, provided every pruning rule preserves that upper-bound invariant.

Geometry-specific acknowledgment continues to use existing suggestion fingerprints, with warnings projected into ordinary diagnostics. This is a coherent separation of review evidence from presentation, not a compatibility layer. Roof-step and wall-overshoot heuristics are appropriately framed as warnings; they do not authorize geometry edits or establish complete enclosure.

The new implementation is still dense in several geometry helpers. Prefer clear records and named stages for support evidence and source-object indexing; avoid duplicating repeated whole-mesh scans. No broad formatting rewrite is required for the pre-existing code.

## Follow-up status

The parent has reported fixes for the domain guard, cleanup boundary and sealed-state acceptance, and is addressing audit scaling, representatives and crossing occupancy. Final acceptance is pending independent reruns and review of those corrections. This document will be updated with the actual outcome.

## Correction review and independent validation

Re-read the corrected support-domain guards, standing-body height envelope, dynamic-state filtering, physical-analysis cleanup boundary, per-region/reason sample representatives, uncertain-elevation component fallback, collision checks for sampled crossing witnesses, and the CLI/reviewer inspection and acknowledgment controls.

Confirmed independently:

- The flat-prop detour now produces lower count 1 / optimistic count 2 and `PHYSICAL_ROUTE_UNVERIFIED` warning, rather than a false hard failure. The actual local detour remains reachable.
- A failed refresh now clears the old navigation and marks navigation suggestions unavailable; recovery uses the changed body settings.
- The 900-wall / 10,812-triangle fixture compiles with no diagnostics after per-object wall indexing.
- Physical-route integration plus native producer suites: **21/21 passed**, including the original closed-lane producer rejection. Log: `generated/compiler-fixes-implementation-review/route-followup.log`.
- Navigation, envelope review, geometry suggestions and navigation suggestions suites: **45/45 passed**. Log: `generated/compiler-fixes-implementation-review/diagnostics-followup.log`.
- Reduced construction reproduction gives an error for the blocked mouth despite its reachable remote detour, warnings for the literal tall wall and unclosed roof step, clean anchored controls, and an error for explicit lintel clearance. Evidence: `generated/compiler-fixes-implementation-review/construction/observations.json`.
- `npm run check` passed during the correction review.

The structural corrections satisfy the intended errors-versus-warnings boundary in these cases. One final inspectability polish was requested: the `ARCHITECTURE_REVIEW_INCOMPLETE` warning should carry document/source-object context and a finite target instead of empty object/point arrays. No other material correctness issue remains from this review. Architecture heuristics and sampled crossing witnesses remain bounded review evidence, not complete architectural or continuous gameplay proofs.

Final inspectability follow-up: the incomplete-review warning now includes the affected roof/wall IDs, source lookup through those IDs, and finite complete-mesh bounds. This resolves the final requested polish. **Implementation review accepted for the reviewed change.** Documentation and the parent's complete/browser acceptance runs remain the parent's final integration responsibility; this review does not claim those runs.

## Full-suite integration follow-up

Reviewed the later changes prompted by maintained-map integration failures:

- A reachable baked endpoint path supplies a lower bound of one route even when graph resource ownership is incomplete. Additional route counts still come from physical resources; an optimistic count that contradicts verified evidence is omitted. The revised one-way test revalidates the changed route through the public API instead of combining current route endpoints with a stale forward navigation report.
- `StandingSupports` extracts and sorts upward geometry once per physical analysis, caches conservative global reachable-height bounds by elevation, and retains local mouth height checks.
- Independent profiling of Dust II identified approximately 37.7 million work units before the final indexing fix: most were repeated whole-fragment searches, followed by broad side-bin candidate iteration. The correction adds a fragment-bounds location index, smaller spatial bins, geometric adjacency prechecks and union by size. Candidate completeness, height checks and deterministic source-order tie breaking remain intact; the default budget was not raised.
- Levels with no declared connection/link resources avoid unnecessary fragment graph construction while retaining endpoint reachability evidence.
- Producer progress callbacks again reach physical-analysis admission, with immediate abort checking and normal later recovery.

Independent maintained-map, producer-admission and physical-route follow-up: **24/24 passed at the default work budget**, including Daiban, Dust II, cancellation/recovery, reversed one-way traversal, real divider errors, raised/lowered/same-height bypass uncertainty and duplicate-mouth capacity. Log: `generated/compiler-fixes-implementation-review/integration-final.log` (18.7 seconds).

Re-read the updated AML, producer and suggestion documentation. It accurately distinguishes endpoint reachability, additional physical resources, optimistic bounds, uncertainty, sealed explicit requirements and warning acknowledgment. **Implementation review remains accepted; no material finding is unresolved.**

## Final progressive-diagnostics UI follow-up

Reviewed the final diagnostic-link fix and its browser acceptance. Moving the initial-framing flag into successful inspection was necessary but initially insufficient: a geometry-only update called `restore()` for an as-yet missing navigation diagnostic, which removed the diagnostic URL parameter before the final report arrived. The browser test exposed that loss of selection.

The corrected panel receives an explicit completeness flag from the presence of the worker's validation report. While a diagnostic is pending, it preserves the deep link and shows a waiting notice. Once the report is complete, a real finding is inspected and framed once; a genuinely missing finding restores the previous view. The worker also supplies a report for terminal geometry failures, so they do not remain indefinitely pending.

Reviewed passing browser evidence in `generated/compiler-fixes-baseline/browser-final-2.log`, including geometry warnings, a late `NAV_ISLAND` diagnostic with exact camera target and component overlay, acknowledgment XML, copied links, cutaway, restore and final missing-diagnostic handling. The parent's retained complete Node run reports **523 passed, 1 skipped, 0 failed** (`generated/compiler-fixes-baseline/full-tests-final.log`). These are reviewed integration results, distinct from the independent test runs recorded above.

**Final UI follow-up accepted. No material implementation finding remains unresolved.**
