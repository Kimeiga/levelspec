# Layout reviewer acceptance coverage

The review-only browser interface intentionally replaces the chapter-based
editing/export demo. `website/tests/review-browser.mjs` exercises the frozen
production viewer and website through their shared user interface.

## Existing browser suite disposition

| Existing suite | Retained behavior | Retired behavior |
| --- | --- | --- |
| `browser.mjs` | Real geometry, local runtime assets, service-worker offline reload, mobile layout, keyboard controls and WebGL fallback move to reviewer acceptance. | Source changes, parameter links, browser exports and chapter navigation are superseded. |
| `experience-browser.mjs` | Measured walking, key release and Escape move to reviewer acceptance. Compiler/navigation Node suites retain actual route validity checks. | Terrace/curve editing, block/repair buttons, parameter presets and chapter presentation controls are superseded. |
| `walk-stability-browser.mjs` | Walking remains available from either review mode; overview camera survives walking. Surface-audit and navigation Node coverage remains. | Entry from four chapters, source editing during walks and exports per theme are superseded. |
| `graphics-browser.mjs` | Actual visible geometry, appearance comparison, sections, fitting, mobile captures and console/shader failures move to reviewer acceptance. | Mandatory loading of the previous presentation's calibrated bake presets and its graphics toggles is superseded by illustrated preview rendering. Bake integrity Node tests remain where those assets are retained. |
| `walk-timing-browser.mjs` | Independent elapsed-time, release and suspension checks remain in `walk-clock.test.ts` and the reviewer browser suite; the latter measures 600 ms × 3.4 m/s = 2.04 m in the new renderer. | Selectors/readiness tied to the old texture/bake renderer are superseded. |

The five superseded browser entry files have been removed from the active
acceptance command and source tree; their retained behaviors are mapped above.
Their historical success is not evidence that the new interface passes those scenarios.
Preserve compiler/export/NavigationSurface/walk-clock tests whose underlying
contracts remain supported; do not delete them simply because UI entry points
changed. Current architecture-generator parameter matrices remain useful while
the generator is retained, independently of whether visitors can edit parameters.

## New browser coverage

Run production site at `BASE_URL` (default
`http://127.0.0.1:48217/levelspec/`) and production viewer at `VIEWER_URL`
(default `http://127.0.0.1:48218/`). Then run:

```sh
node website/tests/review-browser.mjs
```

Each surface exercises initial compiler readiness, visible rendered geometry,
local font loading, 2D/3D camera preservation, floor and keyboard selection,
plan framing, navigation and issue overlays, visible cutaways/material changes,
dimensions, native walking, Escape, mobile framing and reduced motion. Website
coverage reloads the production bundle offline. Local coverage independently
checks dimensions against a 4 m × 3 m floor with a 0.2 m slab, malformed XML with
stale-preview retention and successful valid-file recovery, and worker
cancellation followed by retry. WebGL-unavailable coverage checks that 2D and
validation remain usable. A real `WEBGL_lose_context` scenario checks plan
fallback, disabled walking, and restored usable 3D. WCAG A/AA Axe audits cover
both surfaces at desktop and mobile sizes. Desktop layout assertions require
a header at most 40 px high, at least 80% viewport height for architecture,
compact toolbar controls, and no page scrolling.

Screenshots, scenario results and console failures are saved under `QA_OUTPUT`
(default `website-qa/reviewer`). Pixel comparisons establish that a control
changes the actual preview; they do not prove geometry or navigation correctness.
Appearance review still needs independent human/agent judgment at delivered size.

## Remaining verification boundaries

- Source companion assets need dedicated successful local-reference and missing-
  asset recovery scenarios when representative assets are retained.
- The current browser suite checks long-duration input against the authored
  curved courtyard wall, but does not exhaustively prove void confinement
  or browser pointer-lock recovery. Navigation and clock Node checks supplement but do not
  replace those integration boundaries.
- Revision rejection is covered through cancelled worker transport and recovery,
  not an exhaustive adversarial sequence of file-read and worker replies.

## Verified production run

The frozen production builds on `codex/xml-cli-harness-next-phase` (base revision
`0bd3d76` plus the working-tree reviewer changes) passed all 20 scenarios with
four empty WCAG A/AA Axe violation reports. The authoritative run used:

```sh
BASE_URL=http://127.0.0.1:48219/levelspec/ VIEWER_URL=http://127.0.0.1:48218/ node website/tests/review-browser.mjs
```

This run includes actual screen-space outlines from visible depth, normal and
authored-object ID buffers. Ink uses the latest `#444444` tone and 0.75 CSS-pixel
neighbor radius; dither retains 2 CSS-pixel cells and seven tones. The superseded
world-space feature/intersection-line approach is not part of this acceptance.
Strict console/GL diagnostics were empty, including actual context loss and
restoration. The deliberately unavailable-WebGL scenario emits Three.js's
expected context-creation error while verifying usable 2D fallback; this injected
failure is separate from the normal/context-recovery diagnostic collection.

At a 1440 × 1000 desktop viewport, retained Dust II loaded from a local XML file
through actual worker completion in **1,181 ms**. Its source summary reports
53 floor regions and 8,964 compiled triangles; the renderer reports 25,801
renderer triangles across color/geometry/shadow passes and the composite quad.
This frame-wide count differs from the compiled triangle count. This is one observed
source-to-ready latency on this machine, not a performance guarantee or frame-rate
benchmark. Actual source identity is awaited before timing completion so a prior
Ready state cannot count as the new document finishing.

Evidence is under `website-qa/reviewer/`, including `results.json`,
`accessibility-{site,viewer}-{desktop,mobile}.json`, preset views, section views,
mobile plans, offline rendering, the known-size room, large Dust II, restored
context, and unavailable-WebGL screenshots. Pixel checks require visible geometry
and clear canvas margins in fitted views; aesthetic quality remains independently
reviewed.

## Screen-space outline acceptance

`website/tests/outlines-browser.mjs` adds an isolated, compiler-verified
48-triangle architectural fixture with two overlapping opaque box volumes. Their
centerlines do not cross without a junction; the valid overlap has a known
visible front contact at `y=0.5`, `z=2`, `x=-1..1` meters. Test projection uses
observable camera diagnostics, independently of the contour detector.

Both DPR 1 and DPR 2 passed actual screenshot pixel checks at two zoom settings.
Measured transverse dark runs were 2.5/2.5 CSS pixels at DPR 1 and 2/2 CSS pixels
at DPR 2; nearest-pixel sampling and antialiasing affect these measurements. The
checks establish stable apparent width across zoom/density, visible intersection
ink, clean flat interiors without triangulation/dither contours, occlusion of
underlying contacts, and no outline ghosts after full clipping. Runtime and GL
diagnostics were empty. Evidence is under `website-qa/outlines/`.

Run against the production local viewer:

```sh
VIEWER_URL=http://127.0.0.1:48218/ node website/tests/outlines-browser.mjs
```

The main 20-scenario suite additionally verifies that an invalid XML layout whose
wall centerlines cross without a junction reports `EDGE_CROSSING`, retains the
previous stale preview, disables walking, emits no uncaught exception, and
recovers after opening valid XML. This covers compiler-failure results with
empty geometry/stats in addition to malformed XML parsing.
