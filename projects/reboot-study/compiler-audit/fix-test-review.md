# Compiler fixes — preimplementation test review

Reviewer: `/root/compiler_fixes_test_review`. Applied `write-readable-typescript` and `maintain-tests`. This review was performed before production implementation. It does not accept an implementation diff. No map or production source was changed by this review.

The proposed fixes are warranted. The key test boundary is the user's diagnostic policy: invalid source and demonstrated requirement violations are errors; suspicious geometry or incomplete sampled evidence produces an inspectable, non-blocking warning. Existing producer rejection on every conservative physical-count shortfall must not simply be copied into the compiler.

## Required observable behavior

| Scope | Minimum meaningful coverage |
| --- | --- |
| Connection references | A supplied nonexistent path errors with the connection ID and its XML source location, including `navigation:false` and no route declarations. A valid path remains accepted. An omitted currently optional path is distinct from an invalid supplied reference. Invalid `from`/`to` owners and a degenerate/nonhorizontal mouth should receive the declared contract's appropriate result. |
| Shared physical counts | One continuous mouth supports one entrance resource. Two declarations of that same mouth cannot satisfy `min-routes=2`, including reversed or partially overlapping equivalent spans. Two genuinely separated mouths are a positive two-resource control. Keep compile, runtime validation, finite CLI validation, and producer outcomes consistent. |
| Blocked declared crossing | In a divided two-floor room, block the lower declared mouth while retaining an upper passage. The endpoint route remains reachable and may detour; a local declared-mouth failure or two-resource shortfall must not be concealed by that detour. A full blocking solid spanning the entire mouth is a useful demonstrated-error fixture. A supported, sufficiently wide local crossing is the control. |
| Inconclusive physical analysis | A physically usable off-center passage must not become an error just because a fixed set of crossing samples misses it. Successful stronger analysis is allowed; if the evidence remains incomplete, require a warning with the specific mouth and inspection target. A positive lower bound does not prove there are no additional routes. |
| Mouth margins | A mouth denotes a span through which a body can cross, not a centerline itinerary or a demand that every span endpoint be walkable. Guard/jamb margins may reduce its usable width while a valid crossing remains. Test width just above/below a documented threshold without relying on accidental voxel alignment. |
| Coordinate and movement contracts | Preserve world-equivalent framed/rotated paths, stacked floors with the same XY footprint, body-size changes, one-way/disabled links, and collision-vs-visual geometry separation. Existing tests cover several of these; extend the authoritative shared boundary rather than duplicating every internal helper test. |
| Nav diagnostic attribution | A low beam/lintel produces a headroom diagnostic containing the floor and actual obstruction IDs, valid source locations, a measured clearance, finite bounds around the failed region, and a useful inspection target. A narrow passage bounded by two objects identifies the relevant boundaries. Floor-edge-only narrow geometry may legitimately have the floor as its source rather than inventing a blocker. |
| Cached/exported attribution | Runtime/report serialization retains new attribution and review data. Cache reuse refreshes source locations when only source provenance changes, while geometry/body/navigation changes invalidate relevant analysis. Do not lose the existing primary-floor source contract when adding related blocker locations. |
| Shell warnings | An unclosed roof step and an anomalously tall wall remnant produce warnings even without a declared envelope. Warnings name the involved roofs/walls and local bounds; validate/build/producer remain successful when no actual error exists. The physical wall retains its authored height and the omitted fascia remains absent—warnings never repair geometry. |
| Shell controls | An explicitly anchored fascia closes the tested interval; a wall anchored below its roof does not trigger the corresponding protrusion warning. Include unrelated higher buildings, ordinary parapets and intentional open courts/clerestories as controls against broad false-positive severity. A heuristic may request review of ambiguous intent; it must never turn that ambiguity into an error. |
| Warning discoverability | Active findings occur in normal diagnostics, not only a separate suggestions payload. The reviewer exposes the warning and Inspect/Cutaway/link controls. Suppression acknowledges the exact geometry; relevant changes reactivate the warning. Source/comment/appearance changes must not erase or duplicate it. |

A concrete off-center fixture can use a long shared boundary with most of it blocked and a body-wide opening between the old sampler's fractional stations. The assertion should be about avoiding a false error and reporting any remaining uncertainty, not about preserving those exact sample fractions forever. Pair it with the fully blocked control so an implementation that warns on every actual violation cannot pass.

For the shared count contract, distinguish a verified lower bound from a proven upper bound. A duplicate declaration cannot add a resource; a demonstrated full-span obstruction can remove one. Merely failing to locate a crossing, or a conservative physical-component approximation returning fewer routes, does not prove impossibility. Tests need both definite and inconclusive cases. Numerical report fields must not label an unverified semantic count as physically established.

## Existing coverage and ownership

- `tests/aml-route-path.test.ts` owns actual endpoint path coordinates/distances and a barrier removing every route. Preserve detour semantics; local itinerary assertions are additional behavior.
- `tests/vector-physical-integration.test.ts` already exercises physical mouth resources, duplicate/one-way ability links, split floor components and visual-only blockers. Its current blanket producer rejection expectations may need targeted updates for the new uncertainty distinction; do not weaken demonstrable barrier cases.
- `tests/producers/native-internals.test.ts` already protects world-equivalent framed connection paths and required route counts.
- `tests/vector-navigation.test.ts` owns sampled headroom/width, stacked support, source identity/cache refresh and dynamic sealed/open reports. The existing exact `objects: ['room']` expectation should evolve to include the ceiling while retaining the primary floor source.
- `tests/aml-volumes.test.ts` already proves exact floor/soffit contact, a 1 cm intrusion, closed-solid interiors, holes and required support. No second generic clearance suite is needed.
- `tests/vector-suggestions.test.ts` owns geometry findings, thresholds, source links and geometry-fingerprinted suppression. Its helper currently expects `diagnostics: []`; this is intentionally superseded when active findings become warnings.
- `tests/vector-nav-suggestions.test.ts` currently explicitly requires no `NAV_ISLAND` diagnostic. Update this to the user's new warning policy, preserving non-blocking behavior and component inspection.
- `tests/vector-cli.test.ts` owns real finite command outcomes and JSON transport. Add representative error and warning cases rather than repeating every domain fixture through the CLI.
- `tests/suggestions-browser.mjs` and the existing diagnostic inspection browser coverage are the right place to verify actual controls, selected object framing and copied links. Node assertions alone cannot establish browser interaction.

## Scope recommendation

Bound the architectural work in this fix to diagnostic heuristics for suspicious roof seams and tall wall remnants, with existing anchors/clearances documented as current construction mechanisms. Automatic whole-shell construction requires a new ownership/opening contract; no currently inspected test establishes that arbitrary walls or roofs should be rewritten. A future explicit closed-envelope assertion can make a demonstrated forbidden opening an error. Current missing intent should produce a useful warning where a heuristic has evidence, not silence.

Keep the current physical resource algorithm's useful coverage, resource semantics, budgets and cancellation, but move shared validation ownership cleanly. Do not retain separate producer-only acceptance rules that contradict ordinary validation, or add a second competing count calculation without a distinct documented bound.

## Baseline performed

Ran:

```sh
node --test --test-concurrency=2 tests/aml-route-path.test.ts tests/aml-volumes.test.ts tests/vector-physical-integration.test.ts tests/producers/native-internals.test.ts tests/vector-navigation.test.ts tests/vector-suggestions.test.ts tests/vector-nav-suggestions.test.ts tests/vector-cli.test.ts
```

Result: **76/78 passed**. Both failures were existing localhost-server cases in the restricted environment: the preview launcher could not bind `127.0.0.1:5173` (`listen EPERM`), and the occupied-port test's cleanup reported `ERR_SERVER_NOT_RUNNING` after its server could not start. All selected domain tests and finite CLI validate/build cases passed. Exact log: `generated/reboot-compiler-fixes-review/baseline-tests.log`. These environment failures are not evidence against the compiler fixes and must not be hidden by weakening assertions.

Preimplementation disposition: proceed with these boundaries. Re-review the actual new/updated tests and their results after implementation, especially the lower-bound/upper-bound distinction, warning visibility and stable inspection data.

## Follow-up: upper-bound authority during route implementation

Reviewed the first implementation in `src/vector/physical-routes.ts` and `src/vector/connection-clearance.ts` after the parent reported that the existing full-divider tests now warn. The physical upper bound currently collapses all components of each logical area. This is safely optimistic but loses definite intra-area cuts, so it cannot distinguish the whole-width native wall in `tests/vector-physical-integration.test.ts` from merely uncertain navigation connectivity.

Enumerating every mouth-span intersection with the floor-clipped baked navigation would remove fixed-mouth-sampling uncertainty. It would **not** make the resulting count an upper bound on physically possible routes: Recast erosion, rasterization and clipping can omit a physically usable narrow connection. Its result can be described as exact within the baked-navigation model, but must not be labeled a proven physical maximum or used as the sole basis of a physical-impossibility error.

Keep the existing full-width wall/box/collision-proxy cases as error expectations. They describe a real closed-solid barrier spanning the entire flat floor leg, not an incidental sample miss. A bounded independent cut witness can preserve those guarantees: for supported flat native domains, split an optimistic planar domain only where closed collision demonstrably blocks a common body-interior height. Retain uncertain connectivity, alternate height layers and enabled traversals rather than excluding them by absent navigation samples. This is a possible proof boundary, not a requirement to implement a general exact character-controller solver.

The useful paired tests are: (a) the existing whole-leg divider reduces the required two physical resources to one and errors; (b) a physically body-wide slit that falls between conservative samples or is lost by a coarse bake cannot become a proven physical shortfall merely because its nav fragments are disconnected. A stronger analysis may verify that slit; otherwise warning is appropriate. Preserve independent geometry controls for the divider and slit so changing the graph algorithm cannot make the expected outcomes self-fulfilling.

## Follow-up: standing-domain proof guards and focused tests

A flat source-floor guide alone does not bound actual support height. Native collision props can form steps over a divider, so a single horizontal solid slice is not a valid upper-bound cut unless the implementation excludes undeclared ascent. The same issue applies to a local mouth: two flat adjacent floors with six 0.2 m box steps can cross a 1.4 m divider at the mouth itself. This is a local crossing, not an endpoint detour. The implementation now treats possible raised support conservatively for both proofs. The common standing-body plane also requires `step < height`.

Proof evidence depends on the body settings used to establish it. A first prop at 0.6 m is inaccessible at the default 0.45 m step but accessible after a public `bakeNavmesh` call with the compiled document's step changed to 0.65 m. Cached domain evidence must be discarded for that change. The added test observes an initial demonstrated route shortfall and subsequent nonblocking report, not the internal partition representation.

Added eight cases to the existing `tests/vector-physical-integration.test.ts` owner: missing supplied paths without navigation/routes; omitted-path warning and producer success; identical/reversed/overlapping mouth capacity with separated-mouth positive control; blocked local mouth with reachable remote endpoint detour; usable off-center slit; raised support over an intra-area divider; body-setting invalidation; raised support crossing the local mouth. All exercise public compilation, runtime validation, baking, or producer outcomes. The usable slit allows either stronger verification or a warning if the physical lower count is still short.

Latest focused result: **13/13 passed**. Combined with AML route and native producer tests: **21/22 passed**. The remaining existing producer case, `closing native lane mouths fails the unchanged required route count`, no longer rejects after the deliberately conservative raised-support guard. This needs an authority review before any expectation change; no assertion in that producer file was weakened by this reviewer.

An additional observed limitation is recorded for implementation review: in the off-center slit fixture, the navigation report contains disconnected ground-height islands inside tall jamb footprints, alongside separate islands on their tops. The endpoint lower count remains zero and the report warns correctly, but ground-height witnesses cause the individual mouth status to be `verified`. Floor clipping already filters height, so the origin of the extra islands is not established by this review. Review whether crossing witnesses must reject actual occupied samples and whether such islands can inflate lower counts in connected configurations. Do not claim continuous proof from these witnesses.

## Final focused review

The raised-support, lower-support and same-height support bypass controls now pass. The last control uses a real flat collision prop outside the authored floor footprint to walk around a full-width divider; an optimistic physical bound cannot discard that support. Existing whole-divider and generated closed-mouth rejection controls also pass. Crossing witnesses now exclude occupied body-interior samples. The original lower/upper-bound findings are resolved within this deliberately conservative proof scope.

Reviewed the new envelope, navigation attribution/lifecycle, warning suppression and browser-warning tests. Added direct collision rays proving that an open roof step remains physically open until an authored closure is added, and that a warned 9.5 m wall retains its height. Allowed inspection bounds to include actual seam endpoints. The sample-cap test now independently establishes that aggregate failures exceed retained detail rather than requiring a particular storage cap. The existing width fixture additionally requires both physical blockers, XML sources, the measured 0.400 m clearance and local bounds.

The warning browser flow checks CLI transport, the diagnostic deep link's camera target, suppression XML, copied review links and actual cutaway-control state. Warning projection adds a second restore control, so old suggestion-flow clicks were scoped to the suggestions panel; no product assertion was removed. The complete browser script passed after that driver correction.

The old one-way traversal test supplied an obsolete forward navigation report after mutating the route to run backward. Since endpoint reachability now establishes one verified route, it was changed to revalidate through the public API. It still requires the reversed one-way route to be unreachable, have zero physical routes and fail validation, while also exercising cache invalidation.

Focused acceptance: **62/62 domain tests passed** in `generated/reboot-compiler-fixes-review/final-reviewed-tests.log`; the generated closed-mouth producer control passed separately in `final-producer-mouth-test.log`; `npm run check` passed; the real browser script passed in `warning-browser.log`. The initial combined run's envelope-module import failure was introduced by this reviewer's test edit, corrected immediately, and replaced by successful envelope and clean focused runs.

Full-suite follow-up updated only intentionally superseded expectations: stepped/half-turn stair geometry tests permit `FLIGHT_OPEN_SIDE` warnings while still rejecting every error and unrelated diagnostic. The tracing publication test now requires a warning for unproven two-route multiplicity inside one undeclared area, then uses an impossible 6 m maximum distance between markers 7 m apart to preserve the negative publication gate; its independent spawn-LOS rejection remains. No geometry, closure, thickness, navigation or export assertions were weakened.

Test-review disposition: the reviewed compiler-fix contracts and focused tests are accepted. This is not a substitute for the separate implementation review or the parent's complete repository acceptance run.

## Final browser follow-up

Reviewed the diagnostic-link navigation-island regression added after the initial browser acceptance. It requires the late navigation warning to select `tinyfloor`, frame the exact finding position, highlight only the detached component, and restore navigation through the diagnostics controls. Its first run failed because a geometry-only reply treated the not-yet-produced warning as permanently missing and cleared the URL. The corrected panel now waits until validation is complete before treating an absent diagnostic as stale, and consumes its initial framing flag only after successful inspection. The regression was retained unchanged; a separate `?diagnostic=missing` case preserves the final missing-link notice.

Final browser acceptance is confirmed by `generated/compiler-fixes-baseline/browser-final-2.log`: the real CLI/browser script passed. The parent also reported its complete Node acceptance at 523 passed, 1 skipped, 0 failed, with typecheck and viewer build passing. No outstanding test-review blocker remains.
