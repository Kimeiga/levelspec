# Neutral inspection — implementation handoff and validation

Implemented the bounded third presentation appearance after reading the independent pre-change assessment in `neutral-inspection-test-review.md`. Default UI remains illustrated; omitted capture appearance remains materials. No geometry/compiler/export behavior, canonical project XML, source CAD, camera manifest or author.py changed. User5186 was not stopped or navigated. Shared edits were paused during root's m10 capture and resumed only after release.

## Cohesive behavior change

- `review/view.ts` owns the explicit `Appearance` union/parser and composed `ReviewViewOptions`/`ReviewViewState`. Camera-only types remain separate. URL parsing retains caller-specific omitted defaults; invalid initial option groups reject atomically. Serialization replaces stale appearance while preserving unrelated URL context.
- `review/app.ts` owns selected appearance, composes it with the actual camera in `currentView`, publishes it with view diagnostics/current-view links, and retains it through file-watch updates. Selecting an appearance updates that URL field for reload and copied suggestion links. Camera classes do not store presentation state.
- `review/scene.ts` replaces the binary materials flag with the appearance union. Inspection uses unlit authored colors/maps with sRGB texture handling, double-sided transparency, existing selection tint and clipping. Structural outlines and existing mesh/material/texture cleanup paths remain in use. Illustrated and lit authored materials remain separate supported branches. No new light controls, dependencies or export settings.
- CLI `--appearance` validates through the shared parser and reaches the preview URL. The project capture helper accepts inspection via that parser and includes appearance in its recorded URL, resolving the previous URL-versus-selected-appearance mismatch. Default capture data is unchanged.
- Documentation explains the three appearances and exact URL replay scope. This is neutral unlit inspection, not photographic color calibration.

## Meaningful verification

Passed `npm run check`;15 parser/CLI tests; both viewer/site builds; and the complete invoked `npm run test:preview:browser` command (preview lifecycle, suggestions and new calibrated inspection scenario). Build warnings remain the existing native/WASM browser externalization, ineffective dynamic import and bundle-size notices. The new pixel test is wired into the existing browser command/CI, not left dormant.

Parser/CLI assertions cover valid/omitted/invalid appearance, stale URL replacement, unrelated URL context and real emitted live CLI URL. Preview assertions cover direct inspection URL initialization, generated link after switching back to materials, actual replay/reload with fixed camera matrix, invalid initial URL diagnostic/usable atomic fallback, and selected appearance through an existing watched source update. Existing lifecycle/recovery checks still pass.

The isolated real-browser fixture in `tests/inspection-browser.mjs` contains analytically placed floor/shadow wall, perpendicular same-color surface, two-color local PNG with independent linear-sRGB tint expectations, and glass over a red wall. Images/results from the full invoked suite are retained in `generated/inspection-browser-DkoTSh/` and were personally inspected:

| Patch | Lit materials RGB | Neutral inspection RGB |
|---|---|---|
| lit floor |113,128,143|112,128,144|
| shadowed floor |46,56,64|112,128,144|
| perpendicular wall |64,73,83|112,128,144|

Inspection texture samples are red(164,59,50), blue(50,96,164), with the repeated red cell matching; these agree with independently computed authored texture×tint sRGB expectations. Glass sample(152,169,196) retains the red rear contribution. A projected structural top edge carries ink, flat interiors remain clean, section clipping removes the upper surface/ink while keeping lower floor, and full clipping removes both geometry and ink. Switching inspection→materials→illustrated→inspection restores shadows/grayscale/neutral colors and retains the exact camera matrix. Page/WebGL errors are empty. Texture readiness waits on the delivered source response and bounded actual texture pixels, rather than fixed sleeps.

Early fixture-only runs are retained: one exposed an invalid overlapping floor fixture (corrected with explicit thin raised patch), and another used Playwright's malformed range value`.45` (corrected to`0.45`). No supported visual assertion was relaxed.

The existing focused capture exercise gained one explicit inspection view, a deliberate authored-color branch for inspection, and requested URL-appearance assertions. Full43/43 cases passed without skips/retries at `generated/dai2-daiban-review/capture-manifest/run-mANrCy/exercise.json`, including the prior dynamic output/manifest mutation/alias/claim scenarios. Helper SHA256 is `711b16b8297f382025a72379ba664712841574aa670d5076d65e2731480c423b`; default manifest remains `6d8354a7d153f83d97e579ac3d4f4b35c92dca88cd0f911cc2a29197c09b0b55`; focused exercise SHA256 is `213027dffff73f96c362752351f05266755aef0997de11bdbe9bdcb5096f74da`. The unchanged14-case source/companion suite was not rerun for this bounded enum/URL addition; its last result remains separately revision-scoped in the capture-integrity report.

## Review status

Independent pre-change test assessment completed before implementation. Follow-up test review and a separate implementation review have been requested from root and remain pending at handoff. This is implementation/test evidence, not self-approval or architectural/camera/gameplay acceptance. No capture/browser process remains running from these checks.
