# Architectural preview tooling acceptance

2026-11-01. Added while authoring the reference-driven Dai-2 Daiban courtyard
study. Existing website redesign and unrelated modernization changes were preserved.

The CLI and shared reviewer now accept explicit Z-up camera position/target,
orthographic or perspective projection, vertical field of view and orthographic
view height. The browser can apply a pose, share its actual framing in a URL,
and show selected/layout XYZ extents inside the viewport. Visibility filtering
excludes collision proxies and hidden roofs; section clipping does not redefine
full geometry bounds. These are estimated/authored geometry extents, not surveyed
clear widths or building-code measurements.

The camera form/URL validates before scene mutation. Projection switching keeps
pose, active-camera Fit frames the model, and walking retains its independent
navigation-constrained perspective camera. Source watching and stale/error recovery
continue to preserve the overview.

## Independent review and corrections

- An independent test reviewer assessed observable requirements before production
  edits, then reviewed final assertions and failure coverage.
- A separate implementation reviewer checked ownership, scope, numerical framing,
  camera/control lifecycle and docs. They found that perspective automatic fitting
  overwrote an explicit inactive orthographic span. Fit now changes only its active
  projection's framing. The reviewer independently confirmed a 14 m span survives
  no-pose perspective loading and a subsequent orthographic switch.
- The added positive real-CLI test exposed a prior SIGINT exit issue: the one-shot
  CLI handler was removed before Rolldown's signal-exit ownership check, causing
  a re-sent signal instead of exit 130. The CLI keeps its handler registered until
  its existing final cleanup. The separate implementation reviewer accepted this
  source correction; actual subprocess shutdown now returns 130.

## Verification

- `npm run check`: passed.
- `node --test tests/vector-cli.test.ts`: 10 passed, including malformed camera
  rejection and a real launch that forwards all valid view options into its URL,
  serves that URL and shuts down with exit 130.
- `npm run test:preview:browser`: passed. Real Chrome checks asymmetric Z-up pose,
  perspective/orthographic projection matrices, URL replay with actual framing,
  invalid-form state preservation, explicit inactive-span preservation, independent
  4 × 3 × 0.2 m viewport bounds, dimensions visibility and camera preservation after
  a changed GPU frame. Existing watch/asset/error/disconnect/recovery cases pass.
- Both production builds: passed with existing size/dynamic-import warnings.
- Full production reviewer browser acceptance: 20 scenarios passed, exit 0;
  `errors: []`. Covers both adapters, preset fit, selection/plan/camera retention,
  walk input, mobile, accessibility, offline, context recovery and no-WebGL fallback.
  The deliberate no-WebGL case emits its expected renderer creation message.

Final production browser evidence is in
`/tmp/levelspec-daiban-tools-browser-final/results.json` and its sibling PNGs.
Servers for that run used isolated ports 48327/48328 and were closed afterward.
The user's live project preview on port 5186 was preserved.

These checks establish the supported browser/CLI workflow, not exhaustive proof
for every numeric camera input, every browser/GPU or reference reconstruction.
A shared view URL contains camera state, not source files, section/floor filters
or appearance; compare the same source at the same viewport aspect.
