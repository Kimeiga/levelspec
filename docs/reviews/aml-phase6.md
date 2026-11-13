# AML phase 6: acceptance consolidation and viewer default

The local viewer now starts with native `examples/dust2.aml`. The curated website
continues to start with Lantern Court. Explicit file loading and CLI preview sources
retain their existing behavior; there is no new source selector or persistence.
AML and runtime/export versions and public APIs are unchanged.

## Acceptance coverage

| Requirement | Continuing verification |
| --- | --- |
| Native profiles, CAD, complete host openings, partitions and provenance | AML public API, CAD, composition and schema suites |
| Horizontal treads, independent soffits, enclosures and reusable modules | Circulation/enclosure suites and actual browser inspection |
| Dust II layout, elevations and sixteen local route contracts | Independent elevation/collision probes and production physical route replay |
| Daiban native features and four local routes | Aperture/support probes, filled-aperture and missing-landing negatives, physical replay |
| Permissive terrain and targeted defects | Terrain policy/course suites: intersections/open patches, exposure, winding, local CSG validity and required routes |
| Imported meshes excluded from physical checks | Asset, composition, route capacity and physical-output tests |
| Render/collision agreement, edits and cleanup | Composition, physical movement, terrain cache and live-preview recovery suites |
| Exports and lighting | Native mesh/atlas tests, strict packaged bake identity and missing-receiver controls |

The independent test reviewer found no domain coverage gap requiring duplicate
cases. Browser startup now asserts the actual Dust II title before any upload,
Flat appearance, walking readiness and substantial geometry. Existing camera,
section, navigation, desktop/mobile and keyboard checks run against the default.
Showcase remains explicitly loaded for recovery; reload must restore Dust II.

## Review and evidence

Independent test review preceded production changes; separate implementation review
found no material issues in adapter ownership, behavior or scope. An independent
20-case domain selection passed, including all sixteen Dust II and four Daiban
physical route replays. Complete command logs and browser results are retained under
`generated/aml-phase6/`.

A separate concurrent renderer update changed worker cleanup, horizontal orbit
behavior and the live-preview test. Those edits were preserved. Live source changes
made an intermediate orbit run unsuitable for final evidence; frozen-copy verification
isolates acceptance from hot reload. A separate exit-walk synchronization race was
corrected: walking frames can advance before Escape, while mode changes before the
overview camera is rendered. The test now waits for the rendered matrix transition
and retains its exact overview-matrix assertion. Both reviewers approved that change.

## Completed verification

- Core: 476 passed, zero failures, one optional Quake-toolchain skip.
- Producers: all 21 passed, including image tracing with the installed Python environment.
- Complete site suite: all 25 passed, including all 525 style/curve/elevation
  combinations, 25 slider positions, strict baked assets, physical walking and
  blocked-route recovery. The aggregate run finished with zero skips or failures.
- Independent physical/domain selection: all 20 passed.
- Production browser acceptance: all 20 scenarios passed with no recorded errors,
  including a frozen-build run isolated from live source edits.
- All eight live-preview scripts passed; the corrected focused camera/preview test
  additionally passed twice with retries disabled, plus an independent run.
- Architecture, circulation, terrain and capture browser commands passed.
- Type checking and viewer/site/game builds passed; native CLI publication of
  Dust II, Daiban and Terrain Course passed.
- All 38 historical SVGX/bake input hashes remain unchanged.

The frozen-copy live-preview server could not become ready in the nested generated
checkout; that harness result is not counted as a pass. Focused live-preview checks
instead passed against the stable original source. Source inventories and concurrent
edit deltas accompany the logs. The forced WebGL-unavailable scenario intentionally
logs renderer context creation failure; final browser results contain no errors.

## Limits

Daiban photographic fidelity remains HOLD; no reconstruction or camera matching was
performed. Sampled navigation and physical route replay are traversal evidence, not
continuous gameplay proof. Optional Quake native-toolchain acceptance is skipped.
Existing browser bundle-size warnings remain. Frozen SVGX sources, historical bakes
and user-owned studies are preserved.

Final verification confirmed all 284 inventoried source/configuration files unchanged
after the final snapshot, and all 38 historical source/bake hashes unchanged.
