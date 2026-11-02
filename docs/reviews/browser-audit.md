# Browser implementation audit

Reviewed production baseline: `0bd3d76`, Node v24.12.0, macOS, existing local Chrome via the repository Playwright launcher. No production changes. Review scope is sampled implementation inspection plus the production website acceptance matrix; it is not an exhaustive shader or browser-platform audit.

## Baseline evidence

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run check` | Passed | `/tmp/levelspec-phase1-check.log` |
| `npm run build:viewer` | Passed | `/tmp/levelspec-phase1-viewer.log` |
| `SITE_BASE=/levelspec/ npm run build:site` | Passed | `/tmp/levelspec-phase1-site-build.log` |
| Production website browser suite | Passed, exit 0; all five scripts completed | `/tmp/levelspec-phase1-browser.log`, `/tmp/levelspec-phase1-browser/` |
| Rooftop reference acceptance | 1 passed, 0 failed | `/tmp/levelspec-phase1-reference.log` |

Both builds report ineffective dynamic imports and large chunks; these are build warnings, not failed acceptance. No tools or browsers were installed. The browser server uses port 48217 and `SITE_BASE=/levelspec/` for both build and preview. An initial invocation omitted the preview environment and timed out after a 404; that was an audit-runner configuration error, corrected before the recorded acceptance run, not a repository defect.

Browser coverage passed walking/input release, real geometry changes, failed navigation/export gating, rapid-edit stale-result isolation, presets/share links, mobile framing, reduced motion, offline recompilation/export, downloaded Khronos GLB/glTF validation, worker-network failure/retry, unavailable WebGL, walk stability, enhanced graphics, baked lighting, and corrupt-lightmap fallback. Intentional failure scenarios log unavailable WebGL, blocked service-worker registration, or checksum failure; those do not indicate unexpected suite failures. Repeated Three.js `normalMap`/`roughnessMap` undefined-parameter warnings also appear during graphics checks; avoid passing undefined material options in a later focused cleanup so genuine warnings are easier to diagnose. No visual/runtime failure was established from those warnings alone.

The temporary logs and screenshots are session evidence, not durable checked-in artifacts. The report records relevant observations; rerunning commands regenerates evidence.

## Findings

### B-01 — Medium: selected layer does not constrain the 3D navigation overlay

Evidence: `viewer/main.ts:500` filters physical triangles by `layers.value`. `visibleCoverage()` at lines 55–64 likewise filters coverage markers. However, `renderModel()` at lines 553–561 builds the overlay from the entire navigation report positions/indices, with no layer filtering. This is a source-confirmed inconsistency; a separate browser screenshot reproduction was not performed.

Impact: isolating a storey can retain navigation geometry from other storeys, confusing inspection of stacked spaces. This matters to the proposed architectural cutaway workflow.

Correction: define whether layer isolation applies to navigation surfaces, then consistently select the relevant navigation triangles using actual floor ownership/elevation rather than blindly filtering vertices by Z. Preserve cross-layer connections when all layers are shown. Add a real-browser case with overlapping storeys that verifies both physical and navigation visibility after selecting a layer, including coverage markers.

### B-02 — Low: workbench responsibilities are concentrated in one module

Evidence: `viewer/main.ts` contains 1,542 lines spanning asset selection, references, material/shader configuration, mesh construction, plan interaction, coverage/repair UI, worker state, camera controls and disposal. Worker replies are read as untyped `e.data` at line 1166 while the website declares a `BuildReply` union in `website/worker.ts`.

Impact: the upcoming preview overhaul must coordinate loosely typed worker stages, rendering ownership and UI state through a single module. This is maintainability debt, not evidence of an existing runtime failure.

Correction: separate cohesive worker/build state, scene-resource ownership and plan/reference interaction as the UI changes require them. Establish a discriminated reply type and preserve stale-result handling and partial-UV failure semantics. Avoid an arbitrary file-size refactor or shared generic controller for unrelated page behavior.

### B-03 — Later-phase requirement: shared illustrated renderer does not exist yet

Evidence: `viewer/main.ts:165` and `website/scene.ts:42` independently create perspective cameras. Workbench `materials()` at lines 431–490 configures standard/checker/chart/density/lightmap treatments; website scene/rendering uses separate style, environmental, pool and postprocessing modules. The website already has illustrated material treatments, but neither surface establishes the proposed common orthographic grayscale/feature-ink contract.

Impact: blindly copying SuperRec into one page will leave two different renderer behaviors and duplicate lifecycle/style decisions. This is a planned design change, not a failure against the current product contract.

Correction: first prove the architectural slice with the adapted art skill. Extract the actually shared camera/style/resource responsibilities, preserve the website's walking camera as a distinct supported mode, and keep authored/export materials authoritative. Verify both surfaces at normal size, close-up, mobile and reduced motion.

## Positive evidence and review coverage

- Inspected compile/reply/cancel/edit state in both main modules and both workers. Workbench revisions invalidate replies immediately on edits; website revisions and worker replacement prevent stale results and exports.
- Inspected scene `clear()`, `dispose()`, texture-load abort handling, bake token handling and movement busy state; inspected workbench model/lightmap/environment disposal. These have concrete ownership mechanisms. No blanket resource-leak claim is supported by this review.
- Inspected `viewer/export.ts` snapshot selection, companion inputs, cancellation and local capabilities; inspected website export handling and navigation display. Exporting invalid/stale state has explicit guards.
- Inspected `website/framing.ts`, `navigation.ts`, `geometry-change.ts`, scene drawing entry points and the website CI/browser runner. Website overview fit handles empty bounds, and walking is explicitly a constrained inspection walk rather than a physics claim.
- Confirmed no direct legacy-core/authoring/generator imports in `viewer`, `website` or `tools/export` through a source search. Shared XML library helpers still require broader dependency tracing before removal.
- Inspected the SuperRec source art skill and the adapted art skill. Art-direction exercise is recorded separately in `skill-exercises.md`.

Not exhaustively reviewed: every material shader, lighting calibration, performance at maximum level sizes, every native export integration, all reference-camera fitting branches, long-duration GPU allocation behavior, and non-Chromium graphics behavior. Existing website acceptance is not workbench-browser coverage; add focused workbench cases during the UI phase.
