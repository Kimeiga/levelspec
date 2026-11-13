# Navigation resolution browser acceptance

Date: 2026-11-03. Applied `maintain-tests`; reviewed the independent preimplementation acceptance brief. Scope: new `tests/navigation-cell-browser.mjs` and registration in `test:preview:browser`. No production edits.

## Behavioral evidence

Executed `node tests/navigation-cell-browser.mjs` in existing local Chrome, with retries disabled. Final run passed (exit 0). Evidence: `generated/navigation-cell-browser-8tW5Ih/results.json` and `fine-doorway-crossed.png`; console log `/tmp/levelspec-navigation-cell-browser.log`.

The real worker compiles the shared small doorway fixture. It has an 8 × 6 m deck, a 0.30 m wall, a centered 0.70 m clear opening, and the unchanged 0.25 m radius / 1.8 m high standing body. Actual WASD movement starts at [3,3,0], facing +X:

- Default 0.125 m grid: continued forward input settles before X=3.85, sampled for 90 animation frames after forward motion is observable. This is intentional contact observation, not a settling sleep.
- Fine 0.0625 m grid: the same ordinary movement crosses X=5 on the opposite side, with Y remaining within 0.02 m of 3. The effective applied status still reports the normal standing body.
- Changing the resolution through the visible form synchronously exits walking, marks the previous preview stale, disables walk placement, and enters busy state before the worker finishes. Readiness waits for the actual applied setting, rather than interpreting premap validation success as doorway traversal.
- Invalid zero input preserves the applied resolution, ready/nonstale model, camera and active walk pose, and reports a visible range error.
- Camera and walking links retain `nav-cell`; walking URL navigation and reload restore supported feet/orientation from actual runtime state.
- A real source file edit rebuilds with the selected value. Malformed source disables placement; Retry retains the selected input rather than claiming unavailable navigation is applied. Restoring source and retrying yields a new fine-resolution result that again admits the normal walk.
- Malformed `nav-cell=NaN` URL gives visible configuration failure with disabled placement. A valid input recovers and permits actual crossing.
- The actual website adapter mounts the same reviewer and worker: a focused smoke test loads explicit fine resolution, then uses the visible control to rebuild at 0.125. It does not inject a fake renderer, worker, DOM state or navigation result.
- Inspection never rewrites the XML fixture; the final source bytes match the original.

## Isolation and scope

CLI preview uses `startPreview(..., {port:0})` and a temporary source directory. Website smoke uses its own ephemeral Vite port/cache with HMR and filesystem watching disabled. Browser/server handles close in `finally`; temporary sources/caches are removed and evidence remains in ignored `generated/`. Root-owned ports 5217/5219 were untouched. The browser run generated no page errors and installed no dependencies or browsers.

An initial development run failed a test assertion expecting the unavailable-navigation error status to repeat the selected value. That was an incorrect test expectation: failure must not advertise navigation as applied. The assertion now checks the retained configuration input, and the subsequent successful actual walk proves recovery. This was a test correction, not a production workaround.

Domain tests separately own sub-body-width and low-headroom rejection, unchanged physical mesh, vertical cell height, sampling and cache identity. This browser test does not duplicate those permutations or claim that fine resolution resolves all building navigation failures. It verifies the new public configuration and real movement, not photo accuracy or structural adequacy. Rapid superseded-worker-result isolation remains primarily covered by the existing preview/browser lifecycle cases; this focused test checks the immediate stale transition and actual resulting setting.

## Independent test review and terminal-geometry regression

A second reviewer checked the browser scenario's boundaries, waits, and assertions. Native `requestSubmit()` observes the real form's synchronous invalidation before the worker can finish; it does not mutate application-owned DOM or substitute navigation. Ordinary movement uses keyboard input and actual published runtime feet. The coarse contact observation starts after movement is observable and samples rendered frames; readiness checks distinguish applied navigation from worker progress. Invalid-input assertions preserve the previously applied body/model state. These checks exercise behavior rather than implementation spelling.

Added a real XML error case by duplicating a visible jamb at the same transform with a distinct object ID. Independent compilation confirmed 48 mesh triangles, a `SURFACE_COPLANAR` error, and no navigation. The actual browser worker reaches terminal partial-geometry readiness, where the test now requires an unavailable-navigation status (neither rebuilding nor applied), both walk buttons disabled, a nonstale rendered partial mesh, the real diagnostic, and the selected 0.0625 m input retained. Restoring valid source must rebuild and again permit ordinary WASD crossing. This protects the terminal `Geometry needs attention` branch that the malformed-XML test does not reach.

The extended complete browser test passed twice without retries: `generated/navigation-cell-browser-6ehqkT/results.json` and `generated/navigation-cell-browser-Gy9G0W/results.json`. The second run began after the terminal-status production fix was present. Both runs reported no page errors and retained screenshots. No production files were changed by this test reviewer; the unused `waitForFrames` import was removed. These runs cover the fixture and shared website adapter, not the full R14 model or photographic fidelity.
