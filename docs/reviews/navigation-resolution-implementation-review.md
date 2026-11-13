# Navigation resolution: independent implementation review

Date: 2026-11-03. Scope: the navigation-cell harness change only. Applied local
TypeScript and test-maintenance skills and the independent preimplementation review.
This review made no production changes and did not start or mutate a server.

## Material finding

**NR-01 — Terminal geometry failure can retain a rebuilding grid label.**
Source-confirmed control flow, browser reproduction not performed by this reviewer.
`review/app.ts` initializes `nav-cell-status` to “Rebuilding…” in `load()`, and only
replaces it with an applied value when a worker reply contains `next.navigation`.
`viewer/worker.ts` can terminate with “Geometry needs attention” and a usable partial
mesh but no navigation. That reply bypasses the empty-mesh error branch, then the
reviewer marks the result ready without replacing the rebuilding label. Walking
is disabled correctly, but the displayed navigation lifecycle remains misleading.

Correction: at terminal completion without navigation, explicitly report that the
current source/settings have no usable navigation. Do not claim the requested cell
was applied. A failing source followed by valid source/retry should recover the
actual applied value. This was sent to the coordinator; resolution is recorded below.

## Positive review evidence

- The public parser rejects empty/nonfinite/out-of-range values and preserves
  decimals such as 0.0625. It is applied at CLI, preview, browser and worker input
  boundaries. The low-level reconstruction API only requires finite positive
  values; core navigation remains unrestricted by the public product bounds.
- CLI compile and runtime validation receive the same cell. Runtime/export reports
  keep the actual generated settings. Preview carries the selected cell in its URL.
  Suggestion URLs and argument arrays retain explicit cell settings for replay.
- Worker compilation and runtime validation receive the same cell. Shared reviewer
  source refresh/retry reuse applied configuration; valid changes invalidate old
  workers, mark previews stale, exit walking and disable both walk entry buttons.
  Invalid control input is parsed before changing the applied value or model.
- Camera/share links start from the current URL and therefore preserve nav-cell;
  walking replay continues to validate support against newly generated navigation.
- Reconstruction compile and runtime validation use the same cell. Its portable
  export wraps the existing validated level with the archived document rather than
  recompiling at defaults, preserving the selected navigation data.
- PR13 parsing happens before output reset, so invalid public values preserve prior
  output. Valid invocations reset old run-owned artifacts and write run-config.json
  even if source loading/capture fails. Iteration/result records also carry cell;
  run config distinguishes omitted/default from explicit configuration. Existing
  failure-reset policy is retained, not introduced by the grid setting.
- No change to player dimensions, physical geometry, image-evidence acceptance,
  vertical resolution, sampling or navigation tolerances was found in this feature.
  Core option spreading retains cell through open/water/closed bakes and cache keys.

## Coverage and limitations

Read full new public parser, changed CLI/preview/worker call sites, reviewer setting,
load/failure/share/terminal state, reconstruction options/compile/runtime/export
flow, run-output cleanup/configuration and current documentation additions. Inspected
focused process/walk/reconstruction tests and their independently specified doorway
expectations. Root coordinator reports 29 focused process/domain and 28 loop tests
passing; these are not represented as independently rerun by this reviewer. Browser
execution and applied-status evidence belong to the separate browser reviewer.

No proof is claimed for all WASM internals, all Recast grids, or every existing
reviewer lifecycle branch. Finer cells remain subject to existing complexity/time
limits. The document's requested cell and actual successful report must remain
separate concepts; failed configuration cannot be represented as successful baking.

## NR-01 follow-up: resolved

Independently rechecked the terminal `Ready`/`Geometry needs attention` branch in
`review/app.ts`: when the completed level has no navigation, it now replaces the
busy/applied label with an explicit unavailable message before marking loading
complete. Existing walk buttons still depend on actual navigation, so this fixes
status without manufacturing a successful bake or enabling movement.

Inspected the added real-browser regression in `tests/navigation-cell-browser.mjs`:
it introduces coincident wall faces into the source, waits for terminal readiness,
asserts a nonempty physical mesh and `SURFACE_COPLANAR`, requires unavailable status
without “Rebuilding” or “Applied”, and checks both walk buttons disabled. Restoring
valid source then requires the actual applied 0.0625 m status and walk recovery.
This covers the specific no-navigation partial-result branch rather than merely
renaming a generic network error. The test reviewer reports a successful browser
run; stable final-run execution evidence is owned by that reviewer/coordinator.

No remaining material implementation finding in the reviewed navigation-cell
feature. This does not expand the review to unrelated changes in the dirty tree.
