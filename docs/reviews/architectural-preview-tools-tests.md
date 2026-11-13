# Architectural preview tooling — independent test review

Reviewed current `src/cli/main.ts`, preview server/client, shared reviewer/scene,
`tests/vector-cli.test.ts`, `tests/preview-browser.mjs`, and production reviewer browser
coverage before implementation. Applied maintain-tests and write-readable-typescript.

The requested behavior changes warrant focused tests. Existing camera checks protect
orthographic presets and watch preservation but cannot catch silently ignored CLI
camera coordinates, a perspective selector that leaves an orthographic projection,
or dimensions that exist only in an aside rather than the delivered viewport.

## Observable acceptance contracts

1. Real launcher rejects malformed/nonfinite vectors, invalid projection names,
   missing required paired position/target (if paired is the chosen contract), and
   coincident position/target with exit 2 before starting a server. A negative XYZ
   coordinate must parse as a vector value, not an option. Existing no-option
   preview, loopback binding, strict occupied port and shutdown contracts survive.
2. A real preview opened using CLI/server-supported position/target and perspective
   displays those exact canonical Z-up meter coordinates after compile and a GPU
   frame. The test should use asymmetric coordinates (e.g. position `11 -17 8`,
   target `2 3 1`) to detect swapped axes and wrong defaults. Assert numerical
   values with tolerance; do not derive the expected vector from implementation.
3. Projection switching changes actual geometric projection. Expose deliberate
   camera telemetry (projection plus matrix/FOV/frustum) if useful to LLM review,
   and verify e.g. matrix bottom-right 0 for perspective, 1 for orthographic. A
   selector value/label alone is insufficient. Render remains nonblank and presets
   remain usable after a switch; picking must use the active camera.
4. A user-applied camera survives normal XML file changes and 2D/3D view switching.
   Tests should wait for source-ready and a changed GPU frame before asserting.
   Existing stale/error/recovery checks remain unchanged.
5. Known independent small geometry (4m by 3m floor, 0.2m slab) yields X/Y/Z bounds
   `4.00 × 3.00 × 0.20 m`. Visible viewport measurement/legend is actually inside
   viewport, respects the dimensions toggle and uses meters and axis labels.
   Do not recompute expectations using renderer's own bounds helper. Existing
   selected bounds and floor filtering should still work as documented; avoid
   implying extents are measured corridor clear width, stair headroom or survey.
6. If camera sharing/copy is added, a serialized view should recreate projection,
   pose and effective framing (orthographic span/zoom or FOV), not merely position.
   Use a UI/native clipboard or URL roundtrip rather than mocking internal state.
7. Walk mode retains its navigation-constrained perspective camera and exits to
   the unchanged review projection/pose. Current shared browser suite owns existing
   walk input coverage; extend only if camera ownership changes at that boundary.

## Coverage allocation

- CLI argument validation: `tests/vector-cli.test.ts` parameter cases through real
  process. No source-text assertions or fake parser.
- Real preview startup, pose/projection, dimensions and edit retention:
  `tests/preview-browser.mjs`, same controlled source and real worker/GPU.
- Shared reviewer production suite: existing presets/layout/walk/accessibility,
  plus a projection assertion if local-only focused coverage cannot prove shared
  ownership. Avoid duplicating all pure parsing cases in browser tests.
- TypeScript and both builds; repeat changed browser tests with retries disabled
  against frozen source. Preserve cleanup in `finally` on assertion failure.

This is a preimplementation review, not approval of unseen implementation or final
coverage. Send final diff and results for independent test re-review.

## Compiler regression discovered while authoring

A separate independent investigation minimized the model's exception to three
floor regions: a 1.5×1.4m lower landing, northbound sloped-soffit stairs rising
1.6m over3.5m, and westbound sloped-soffit stairs rising1m over1.6m. The flights
meet only at a single lower corner. A west upper landing establishes the proper
join as well. The continuation slice of the west stairs is expanded past its
real triangular support; guide height lookup then fails despite valid geometry.
A flight plus its upper landing alone does not reproduce it.

Added focused public-compile regressions in `tests/vector-floor-gaps.test.ts`:

- The shared-corner architectural layout must compile under strict floor-gap
  audit after translation and yaw0,31,90,180. Assert real tread geometry remains.
- The existing genuine sloped stair-side exposed gap remains a strict error after
  independent31-degree rotation and translation; expected open height1.7–1.9m.

Before production fix:23 discovered,22 passed, new positive regression threw the
reported exception. After the scoped crossing-plane clipping fix:23/23passed.
Existing curved boundary,2mm opening, underpass, wall-span and slab tolerance
assertions remain unchanged. No audit was disabled and no dimensions were relaxed.

## Final tooling test re-review

Inspected the implemented CLI and browser acceptance cases after the independent
preimplementation review. Initial minor gaps were corrected: numerical vector
checks now verify length; edit retention waits for a new delivered GPU frame;
a real valid CLI invocation asserts the loopback URL's camera/target/projection,
FOV and orthographic span, successfully fetches queried HTML, and shuts down with
SIGINT130. The invalid argument cases fail with exit2 before filesystem access.

The actual browser checks asymmetric pose, actual perspective/orthographic
projection-matrix values, unchanged pose on a projection switch, rejected
coincident camera form without mutation, URL replay including effective framing,
and perspective auto-fit preserving explicitly supplied inactive orthographic
span. The4×3×0.2m independent fixture protects viewport dimensions and toggle.
Existing watch, stale HTTP/SSE, asset failure/recovery and shutdown tests remain.
Viewport labels now state XYZ explicitly while preserving the old sidebar text.

No blocking test-design finding remains. Screenshot/DOM measurements establish
preview presentation, not navigation correctness or reference-photo accuracy.
Shared reviewer production acceptance still owns layout, presets, accessibility
and walking; implementation review and final acceptance results belong to the
root/tooling agent report.
