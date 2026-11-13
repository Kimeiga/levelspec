# Stepped stair underside: independent test review

Status: **FINAL TEST RELEASE**. Proposed tests were inspected before production; all material test-design findings and the three bounded implementation-stage oracle corrections below are resolved. This is a test review, separate from implementation approval.

Reviewer: `sol_primary_camera`. Scope is test design and independent expectations, not implementation approval or courtyard authoring. Applied `maintain-tests` and `write-readable-typescript`.

## Contract and baseline

Native `underside="stepped"` means each actual tread has a horizontal underside at its top minus vertical thickness, connected by physical vertical underside risers. Thickness must exceed the **equalized actual rise**, subject to existing numerical geometry tolerances. There is no additional 1 mm minimum overlap. For climb 1 and maximum rise .34, three actual risers are 1/3; thickness .334 has a valid positive overlap of about .000667 m. Equality and thinner material must fail with a source-linked `FLIGHT` diagnostic and failed output rather than silently changing thickness.

Native omitted/filled and explicit sloped modes retain their existing behavior. The `addStairFlight` default remains sloped with its current thickness. Explicit stepped mode does not silently enlarge the helper's default thickness.

Read the flight builder, XML/types, compiler volume and retained-solid paths, exact floor-gap and retaining-seam consumers, stair helper, collision distinction, and existing flight/gap/seam/contact/reference/reconstruction tests. The independent existing-suite baseline passed **118 tests in 17 suites**:

```sh
node --test --test-concurrency=2 tests/vector-flights.test.ts tests/vector-floor-gaps.test.ts tests/vector-seams.test.ts tests/vector-surface-contacts.test.ts tests/vector-reconstruction.test.ts tests/vector-reference.test.ts
```

## Proposed coverage

`tests/vector-stepped-stairs.test.ts` uses real compilation, geometry, export and runtime navigation. Its straight width-2/run-2/climb-.6/thickness-.25 fixture independently establishes tops .2/.4/.6, bottoms -.05/.15/.35, and volume 1 m³. Actual-rise versus authored maximum, the submillimeter positive overlap, source-linked rejection, XML/helper defaults, connected landings, strict geometry, actual stepped material overlap, extra rail stations, reversed boundaries, curved rails, and a filled-versus-stepped lower underpass are meaningful cases. Lower headroom intentionally differs; an isolated top route should retain its ordinary behavior. Navigation coverage remains evidence, not continuous collision proof.

## Test findings resolved before production

1. Replace finite-only exact retaining-riser hits with actual expected heights. In the proposed side-seam fixture the cap top at x=2/3 and 4/3 is .65 and .85 (closed union of adjacent caps). At the flight itself, an upward hit at a shared riser plane uses the lower of the adjoining bottoms, .45 and .65. Do not use the highest tread's bottom as a universal boundary oracle.
2. Check GLB and retained-solid shape, not only volume. A smooth/sloped underside can have the same volume as a stepped underside. Use the three independently known straight underside rays, or an independently justified occupied-solid comparison.
3. Add actual curved/reversed underside rays at independently located tread interiors. Top elevations and positive closed volume alone could accept a filled or smooth fallback.
4. Exercise a stepped flight as the lower side of an adjacent retaining seam, with a plain raised neighbor, strict geometry and a real missing-seam negative control. The existing proposed seam fixture only selects stairs as the upper side.
5. Dispose native Manifolds returned by the test helper's `decompose()`, including assertion failures.

The revised file now asserts these exact boundary heights, exported and retained-union underside rays, curved/reversed underside rays at radius 3 and angles 15/45/75 degrees, and both upper/lower stair seam cases with extra stations, reversed boundaries and missing-seam controls. Native decomposition allocations are released. A follow-up fixture typo was also corrected: the manually introduced `low.mid` vertex rises with the flat neighboring floor, without moving the shared layer's other geometry.

Independently ran the nine new cases before production: all nine are red because the current compiler/XML parser reject the unsupported stepped mode, as expected. This establishes red-phase coverage, not final correctness. The 118-test existing baseline is green. No production code was changed by this reviewer.

These requests concern the existing proposed feature boundary. No browser test, courtyard geometry change, hidden navigation seed, or new wall-anchor capability is required. Implementation may proceed. Final acceptance still requires the new and relevant existing suites, types, actual closed Float32/export geometry and runtime evidence to pass, plus a separate implementation review. Material test changes should return for review; do not weaken a meaningful assertion merely to obtain green results.

## Final oracle adjudication

Accepted three bounded corrections after inspecting the assertions and existing reporting/geometry contracts:

- `FLOOR_EDGE_GAP` is the actual source-linked exposed-floor-boundary diagnostic. Correcting the name preserves the missing-seam negative control; it does not accept successful compilation without the physical closure.
- Premap headroom failures belong to `coverage.blocked`, while region `reasons` counts uncovered failures. The test now requires every sampled filled-underpass point to be blocked with 1.35 m clearance (`3 - .25 - 1.4`), none covered; stepped mode must cover every sampled point and have no headroom block. Added a nonzero-sample assertion so these ratios cannot pass vacuously. It retains positive top-flight coverage.
- At a physical Float32 mesh riser, `Math.fround(2/3)` and `Math.fround(4/3)` are the actual boundary coordinates. The literal doubles lie slightly before those stations and can correctly hit the left band. Testing the actual output station keeps the independent closed-union max/min height expectations unchanged. The separate rays on both sides still establish each band's distinct height.

Independently reran `node --test tests/vector-stepped-stairs.test.ts` after the final nonzero-sample assertion: **9 passed, 0 failed**. Builder/root additionally report the complete suite at 313 passed/1 optional native BSP skip, passing types and viewer/site builds; those broader final runs were not repeated by this reviewer. The separate implementation review is recorded in `docs/reviews/stepped-underside-implementation-review.md`. No unresolved material test finding remains. The only test edit by this reviewer was the nonzero-sample assertion; no production code was changed.
