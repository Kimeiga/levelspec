# Repository cleanup

Executed from the [cleanup plan](plans/repository-cleanup.md) using the requested [untangle-codebase skill](https://github.com/caldoai/skills/tree/main/skills/untangle-codebase). Comments and tests were included. This record describes the cleanup, not approval of unrelated geometry changes.

## Ownership and disposition

| Area | Disposition / surviving contract |
| --- | --- |
| `examples/` | Only `daiban.aml` and `dust2.aml`, plus their index. Geometry, real walking, local route budgets and exports remain covered. |
| Feature AML and terrain raster | Moved unchanged to `tests/fixtures/aml/`; source/companion relationships and schema/browser/export/reference acceptance retained. |
| CLI starter | Owned by `src/cli/templates/starter.aml`, used by `init` and focused acceptance. |
| Four SVGX examples | Moved unchanged to `tests/fixtures/migration/`, preserving explicit migration checks. |
| Browser fixtures | Native AML replaces runtime SVGX translation; independent coordinates, pixels and interaction assertions retained. |
| Shared browser support | `tests/browser/support/browser.mjs` owns common launch/context/frame utilities; obsolete walk injection/diagnostics removed. |
| `review/` | Owns shared compile worker, navigation surface, input/clock, overview camera and image frame. Adapters configure initial source/assets and worker construction. |
| Old website renderer chain | Removed unreachable renderer/worker, effects, shaders, framing, styles and unused detail/legacy bake assets. Active site still mounts the shared reviewer. Native bake evidence now belongs to `tests/fixtures/lighting/courtyard/`, outside runtime website assets. |
| Courtyard source variants | Native authoring/material builders moved to `tools/fixtures/courtyard/`; useful geometry, navigation, UV and real bake acceptance remain. Old slider/presentation URL implementation and tests retired. |
| Old browser playground scripts | Six uninvoked scripts removed. Current reviewer acceptance retains rendering, native input, accessibility, offline and recovery guarantees. |
| Historical compile matrices | Replaced exhaustive retired slider permutations with boundary/middle geometry and navigation cases. Duplicate Goose elevation samples are owned by `tests/vector-dust2.test.ts`; the redundant native samples and 25-position loop were removed; nonempty-mesh/15-region assertions survive in the canonical matrix. |
| Copied renderer invalidation logic | Removed `changedObjects` and its self-tests; actual stale-lighting rejection remains. Receiver page helper retained only as an independent stored-artifact integrity check. |
| `authored/`, `levels/`, tracked `maps/`, `looks/`, broad CS image corpus, old research previews | Removed verified obsolete tracked data. Earlier versions remain in Git history. Ignored map files were preserved in the external archive, not deleted. |
| Generated palette catalog | Removed unused 11,342-line `LOOKS`, its type and unused renderer configuration. Native theme/material generation remains. |
| Legacy Dust II generator/overlay | Removed historical SVGX-only tooling; maintained native geometry/reference and route expectations remain. |
| Core compiler | `walking-floors.ts` owns surviving walking support; `finalize.ts` owns audits/hashes/publication/navigation/UV completion. Construction and native resource/error ownership remain in `compiler.ts`. |
| Reviewer coordination | `camera.ts` owns projection/framing/screen-center horizontal orbit; `frame.ts` owns ratio controls/layout/replay measurement/disposal. App remains the cross-feature coordinator. |
| Retired authoring guides | CONCEPTS, GAMEPLAY, SEMANTIC, SVGX and HANDOFF moved under `docs/archive/`. Current docs index no longer presents old phase plans as workflow. |
| Game harness | Retained as a runtime integration boundary; docs now use AML export and label bundled Kiln as a historical collision/walk fixture. |

Removed commands/config entries have no retained supported consumer. Dead-code entry configuration now names supported APIs, workers and tools explicitly. No compatibility aliases or duplicate old/new code paths were added. Necessary units, precision, ownership and external-reference comments remain.

## Local evidence preservation

Historical Daiban project trees and their large generated study outputs are moved outside the active repository to `/Users/tomokif/code/levelspec-cleanup-archive/2026-11-08`, preserving original repository-relative paths. The archive includes a SHA-256 manifest for 51,862 files, reference copies and 898 retargeted symlinks, with no broken symlinks. It also preserves the ignored historical map scratch tree. Frozen source/reference contents are not rewritten. Current AML projects and companions stay under `projects/`; ignored outputs not included in that archival group stay under `generated/`.

`generated/repository-cleanup/` retains the initial dirty patch and tracked/test inventories, path-by-path disposition, archive summary, comparison evidence and validation logs. The archive is local evidence, not a published package or an in-repository duplicate archive. No `git clean`, blanket generated-file deletion or discard of unrelated edits was used.

## Validation

Final results:

- Typecheck, viewer/site/game production builds and whitespace checks passed.
- Core: 480 passed, 1 optional native BSP integration skipped (481 total). The initial core baseline passed 477 with the same optional skip; additional concurrent CAD cases are preserved.
- Site: all 19 tests passed after regenerating native bake evidence. Actual Blender 5.1.2 calibration and all three 32-sample bakes passed; no bake/hash assertion was weakened.
- Producers: 19 of 21 initially passed; two tracing cases failed because the default Python lacks NumPy. All four tracing cases then passed with the existing `generated/dust2-venv/bin/python` interpreter, which has NumPy/Pillow. No Python dependencies were installed or global interpreter state changed.
- Browser: preview/reload/error recovery, camera/orbit/frame replay, Flat/contour pixels, suggestions, overlap, walking, navigation-cell behavior, production site/viewer, capture, CAD, circulation and terrain coverage passed. Two failures in the concurrent run (circulation endpoint and curated navigation status) passed unchanged in isolated reruns with automatic retries disabled. Initial failing positions/diagnostics were not captured sufficiently to prove their cause; optimizer reload alone was not a demonstrated cause. This remains a test reliability limitation rather than a claimed fixed production defect.
- Both maintained AML examples passed CLI validate and build, with supported diagnostics/route/export expectations intact.
- All 77 Node test files remain discoverable. Removed browser scripts belong to the retired playground; current acceptance commands remain wired to their supported suites.
- Independent test and implementation reviews completed; their material findings were resolved and follow-up review found no remaining material cleanup issues.

Logs, before/after inventories, source-preserving archive details and compiler control comparisons are under `generated/repository-cleanup/`. The native BSP exporter integration was unavailable; it is not claimed to have passed.

The first bake integrity failure was isolated independently: construction code acquired a precision-warp change after the initial snapshot. A baseline compiler reproduces the stored geometry and corner hashes; both the extracted compiler and an inline control of the changed construction produce identical complete compiled JSON. The cleanup extraction itself does not change geometry. Stored baked evidence was regenerated through the real native pipeline, preserving all independent source, geometry, corner, UV, calibration and EXR checks. See `generated/repository-cleanup/compiler-bake-cause.json`.
