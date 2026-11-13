# Stepped stair underside: independent implementation review

Status: **RELEASE for the native stepped-underside feature**. No material correctness finding remains in the reviewed implementation. This is a compiler/API release verdict, not architectural acceptance of a courtyard model or proof of continuous gameplay traversal.

Reviewer: `stepped_implementation_review`. Applied the repository guidance, `write-readable-typescript`, and `maintain-tests`. Read the separate preimplementation [test review](stepped-underside-test-review.md), actual changes in `src/vector/{types,format,architecture,flights,floor-gaps,compiler}.ts`, the new stair suite, surrounding flight/seam/gap/contact contracts, and current SVGX documentation. No production or courtyard files were edited by this reviewer.

## Semantic assessment

- The flight builder changes the physical bottom of each tread to its actual top minus vertical thickness. It emits underside risers and inserts the neighboring bottom stations into the rail faces, preserving closure at tread transitions instead of leaving T-junctions or substituting a smooth guide. Existing filled and sloped branches retain their intended geometry.
- Validation uses the actual equalized rise and existing `EPS` (1e-7 m), not the requested maximum rise or an added 1 mm material-overlap rule. The independently meaningful .334 m thickness versus 1/3 m rise case passes. Equality and thinner material fail with source-linked `FLIGHT` diagnostics. The helper does not silently enlarge its default thickness.
- The compiler's floor-volume overlap, retained export prisms, and floor-gap audit use tread height minus thickness for stepped regions. The tests inspect occupied material and voids, exported and retained underside elevations, closed Float32 geometry, and independently derived volume; these assertions would reject a filled or sloped substitution with the same outer top surface.
- Open retaining seams partition the actual piecewise floor profile on either side. Their tops use the upper tread bottom and their bases use the lower tread top. Existing shallow-gap clipping and endpoint-junction handling still operate on these actual heights. Explicit wall seam semantics remain unchanged.
- The API/XML addition is bounded and coherent. The native tread-cell convention and omitted filled / helper sloped defaults are preserved. The feature does not claim conventional N-riser/N-minus-one-going authoring conversion; that remains an authoring responsibility.

The shared floor-boundary interval calculation is an appropriate reuse of the existing exact triangle slicing rule. The implementation fixes the physical representation and its consumers rather than modifying navigation to conceal incorrect geometry. No compatibility shim or new wall-anchor capability was introduced. Requested clarification of the new seam interval declarations and oversized comment block was applied; docs now explain the thickness rule and unchanged tread convention. Dense formatting in the new test file was noted as a maintainability improvement, not a semantic release blocker.

## Independent verification

Executed successfully on Node 24.12.0:

```sh
node --test --test-concurrency=2 tests/vector-stepped-stairs.test.ts tests/vector-flights.test.ts tests/vector-floor-gaps.test.ts tests/vector-seams.test.ts tests/vector-surface-contacts.test.ts
npm run check
```

The focused run passed all **77 tests**, including all nine new stepped cases. The significance is their checks of real shape, closed solids, actual material overlap, both seam roles, retained/GLB export, reversed and curved rails, and underpass headroom; the count itself is not the acceptance criterion.

Additional independent public-API probes passed:

1. A quarter-annular stepped flight (inner radius 2 m, outer radius 4 m, climb .6 m above a .5 m lower landing, .25 m thickness) next to a lower annular floor with a curved retaining seam. Both normal and reversed flight boundaries compile with strict surface-contact and floor-gap checks and no diagnostics.
2. A straight raised stepped flight with a retaining seam along its side and another along its lower landing, meeting at a 90-degree exterior corner. Strict compilation has no diagnostics. A downward ray through the exterior junction at (-.05, -.05) hits .449999988 m, matching the independently expected first-tread underside .7 − .25 = .45 m. This checks the endpoint fill, beyond the straight seam interior assertions in the new suite.

The builder reports a broader relevant regression/export run and viewer/site builds; those are separate evidence and were not counted as this reviewer's independent executions. Optional native export prerequisites and browser behavior were not exercised by this review. Navigation assertions establish the documented sampled runtime behavior, not continuous traversal safety. No courtyard geometry or visual correspondence was adjudicated.
