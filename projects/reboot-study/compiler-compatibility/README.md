# Compiler compatibility during reboot work

**Current return:** the reduced route case passes ordinary CLI validation with zero diagnostics. Last Light C02 passes ordinary strict CLI build, and Ninefold R08 passes a fresh strict CLI validation. Galini C11 still exceeds the ordinary CLI's default physical-work budget before publication. Its public-API run with explicit 50M budget completes geometry/navigation but retains two sub-millimetre boundary-width findings; strict mode adds six individually reviewed floor-gap candidates. Final Galini independent reviews accept the bounded map-design scopes while retaining these publication/navigation limits. These are separate outcomes, not a successful Galini build. This map task did not edit shared compiler code. Earlier reproductions below remain historical evidence.

## Galini C11 remaining tool limitations

Frozen source SHA-256: `5ec0bdb6c187e15c2c38a1ce830cff74af514bca5201bdef39860818070f78a6`.
The retained [C11 evidence](../../galini-reboot/reviews/evidence/c11/) separates:

- **Ordinary build budget:** `galini-reboot-c11-build.json` stops before publication with `AML_GEOMETRY` / physical-route work budget exceeded; no build artifacts are reported. The CLI currently has no physical-work-budget option. The source-locked API run explicitly uses 50M and completes the native geometry.
- **Coverage boundary remnants:** the API still reports two `NAV_WIDTH` points near `(126.739586,51.481017,4)` and `(131.755895,51.564195,4)`. Independent native-triangle inspection finds sub-millimetre slivers along the Customs outer guard/perimeter. The public navigation result remains failed. Successful adjacent continuous routes do not erase those diagnostics.
- **Exact-point support/admission:** four off-centre Customs ramp attempts stop at exact cap waypoints; continuous centre/offset lines pass when those artificial stops are omitted. Some A-site starting/target points also trigger a distant M09 facade-corner containment inconsistency despite no local capsule-triangle obstruction. Exact failed traces and separately labeled supplemental paths are retained; neither the body nor the shared engine was changed.
- **Strict floor-gap classification:** six School/Bell candidates remain errors in strict mode. The [independent architecture report](../../galini-reboot/reviews/compiled-architecture-c11.md) distinguishes a physically sealed support, actual stair/landing joins and separate-storey well adjacencies. These dispositions do not turn the strict report into a pass.

For visual inspection, `node projects/galini-reboot/preview.mjs` serves the exact
frozen artifact through the unmodified reviewer and retains its failed report.
Its browser check confirms source identity and rendering, not valid publication.
These findings are follow-up compiler/navigation work; the map team has not
implemented engine fixes or moved architectural features to hide them.

## Historical failed runs


A fresh default Last Light C01 validation failed during concurrent compiler changes outside the map-authoring task. The unchanged C01 source is `7a31f5a513d49f8f6f45899c48dfb40ff67e96475e7a35a349b0607cab833069`. The retained result is `last-light-c01-default-validation.json`: error `AML_GEOMETRY`, "Physical route work budget exceeded." This is not a demonstrated geometric obstruction.

Command: `NODE_OPTIONS=--experimental-transform-types node bin/levelspec.mjs validate projects/last-light-reboot/level.aml --json --nav-cell 0.125`. The temporary Node flag handles parameter-property syntax in the concurrently edited compiler. No shared compiler file was changed by this map continuation.

`engine-snapshot-after-failure.json` records relevant compiler/reviewer files after this observation; it is not a claim that every byte was frozen throughout the earlier run. R08/C01 retained native evidence records its own source and physical/render identities. Fresh checks and any public-API larger-work-budget runs must be reported separately from those earlier successful default CLI runs. Do not remove map declarations, reduce the body, or erase collision to force current validation success.

The active native map experiments continue independently of the separate compiler work. Update this note when a later ordinary default replay demonstrates resolution.

## Reduced route-count contradiction

`touching-slabs-route-one.aml` contains only two touching coplanar slabs, two markers and a `min-routes="1"` requirement. Current native navigation finds a straight 16 m route, yet the physical resource report gives `disjointRoutes: 0`, `maximumDisjointRoutes: 0`; ordinary CLI validation rejects it with `PHYSICAL_ROUTE_REQUIREMENT`. Exact source, native output and CLI output are retained here. This isolates the issue from any reboot layout or combat assumption. The missing declared mouth-resource graph does not describe all physically connected slab transitions. No production compiler edit has been made by the map task.

A second ordinary Last Light default replay (after the Node syntax correction) still fails the work budget; `generated/last-light-reboot-current-cli-recheck-02.json` retains it. Galini author inspection narrowed an additional non-configurable budget to the new envelope-suggestion pass. Diagnostic walking can use the public `bakeNavmesh` API on the exact produced geometry while preserving the original failure and failed validation status. Such evidence must not be relabeled as a successful compiler build.
