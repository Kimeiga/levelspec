# Implemented AML compiler fixes

The compiler changes implement the requested severity policy: definite invalid input
and demonstrated requirement violations are errors; incomplete evidence and
potentially intentional architectural issues are inspectable warnings. The three
map reboots remain paused. Their source geometry was not edited by this work.

## Behavior

- Supplied missing or degenerate connection paths fail with source-linked AML
  errors, including geometry-only compilation and documents without routes.
- Compilation, CLI validation and producer publication share physical entrance
  resource analysis. Duplicate, reversed, overlapping or contiguous mouths cannot
  inflate the count. A blocked local mouth fails even if a remote endpoint detour
  remains reachable.
- Reachable endpoint paths establish one route. Additional sampled resource counts
  are lower bounds; shortages fail only when the optimistic bound proves them.
  Missing samples, off-center passages, raised/lowered prop bypasses and support
  outside authored floors remain inconclusive where appropriate. Current body
  settings invalidate incompatible proof evidence.
- Explicit route/connection requirements also apply to requested sealed analysis.
  Generic closed-state floor coverage remains a separate report.
- Active architecture/navigation suggestions appear in normal warning diagnostics.
  Review rows and CLI JSON provide source identities, bounds and inspection links;
  geometry-specific acknowledgments suppress the warning and expire after edits.
- Roof-step openings and tall wall overshoots produce warnings. Existing anchored
  closures remove those findings. The checks do not construct or repair geometry.
  Incomplete bounded architecture review is itself an inspectable warning.
- Navigation clearance errors identify blocking objects and measured clearance.
  Each failed region/reason retains a representative inspection target even after
  the detailed sample list reaches its cap. Cached source locations refresh.
- Failed/cancelled physical analysis clears stale navigation and supports recovery.
  Spatially indexed component queries keep maintained maps within the existing
  work budget rather than increasing the limit.

## Review and validation

Independent [test review](fix-test-review.md) and
[implementation review](fix-implementation-review.md) include the counterexamples
and follow-up checks. The task baseline and focused logs are retained under
`generated/compiler-fixes-baseline/`; the final task diff is `final-task.patch`.
The original audit evidence remains under `generated/reboot-compiler-audit/`.

- `npm test`: **523 passed, 0 failed, 1 skipped** (optional native BSP tooling).
  Localhost access was enabled for preview and mocked HTTP-server tests.
- `npm run check` and `npm run build:viewer`: passed. Vite retains its existing
  large-chunk advisory.
- `node tests/suggestions-browser.mjs`: passed real browser/CLI warning links,
  late navigation-warning framing, component highlighting, clipboard, cutaway,
  acknowledgments, stale links and live recovery.
- Producer suite: 48/50 passed initially; the two Python tracing failures were
  missing dependencies in the default interpreter. All four native tracing tests
  passed using the existing `generated/dust2-venv/bin/python` (NumPy/Pillow).
  No dependencies were installed. Independent maintained-map/physical/admission
  follow-up passed 24/24 at the unchanged default budget.
- Focused regressions include exact blocked/duplicate mouths, positive separated
  entrances, off-center crossings, ascent/descent and same-height bypasses,
  source-cache refresh, body edits, bounded review, sample caps and failure recovery.

## Limits

The roof/wall heuristics cover flat adjoining roofs and wall midpoint overshoots;
they do not certify complete enclosure, arbitrary curved roofs or architectural
intent. A whole-building shell declaration, automatic fascia construction and an
ordered movement-itinerary assertion remain future authoring contracts. Existing
floor/roof anchors and explicit clearance volumes remain the tools for required
construction and passage assertions. Navigation sampling is not continuous gameplay
proof, and successful publication with warnings still requires review.
