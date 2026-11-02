# Final independent test and CI review

Scope: retained Node suites, CLI process tests, reviewer/preview browser contracts,
TypeScript discovery and GitHub acceptance workflows. This is a subsystem review
with sampled assertions, not exhaustive mutation testing or a numerical proof.
No test count or coverage percentage was used as a quality target.

## Corrections and continuing contracts

- FT-01: reviewer WebGL-fallback test required incidental word 'validation'. Replaced
  it with visible plan/mode availability and a controlled low-ceiling XML input
  producing actual diagnostics, then repaired XML producing usable non-stale plan.
  A valid fixture is allowed to have no diagnostics. No user contract was relaxed.
- FT-02: added `vector-lighting.test.ts` before accepting lighting staging changes.
  A narrow fake executable represents the external native-tool boundary; geometry
  and UV generation remain real. Partial native output then failure leaves no final
  revision, retry publishes runtime/calibration metadata and manifest, and refusing
  an existing successful revision preserves bytes. This is orchestration evidence,
  not Blender-renderer fidelity.
- FT-03: added held real HTTP source response across actual preview SSE shutdown.
  The pre-disconnect response must not clear stale/error state, sampled for bounded
  animation frames while that response is processed. A fresh server session on the
  same port then loads successfully. Test does not claim same-token automatic
  reconnection across server replacement. Browser offline mode did not reliably
  sever existing SSE; that failed driver strategy was replaced, not retried away.
- FT-04: website CI now explicitly runs `test:preview:browser`; reference-authoring
  triggers include launcher, shared review, fixtures/projects and instruction/docs
  changes. Existing bounded Node command remains authoritative. Current public
  exports and retained modules/tests enter TypeScript discovery.
- FT-05: independently reviewed `.fallowrc.json` entry changes: deleted worker/export
  paths removed; actual bin and public XML/export/lighting entrypoints added. Audit
  baseline unchanged. No static source-text absence tests were introduced.

Root independently reviewed the new lighting/recovery and held-response regression
assertions; no blocking issue in their intended observable boundaries. Production
review remains separately owned by the implementation reviewer.

## Coverage ownership/disposition

All retained tests stay; no gratuitous consolidation or framework change.

| Group | Owner and assessment |
| --- | --- |
| XML parser/compiler, flights/seams/floor-gaps/surface-contact | Domain invariants; keep independent finite/area/height/winding and actual route assertions. Similar fixtures protect different predicates. |
| Navigation/water/repairs | Keep clearance, submerged terrain, non-solid collision, clipping budgets, cancellation/cache and successful recovery. Direct pure clipping tests are appropriate. |
| Export/lighting | Keep portable real loaders/validators, independent volume oracle, transaction failure/retry and narrow process controls. Native BSP skip stays explicit. New lighting test fills prior failure/retry gap. |
| Reference fitting/acceptance/UV | Keep inverse math and retained multi-view raster fixtures; inverse fitting alone cannot establish externally calibrated camera convention. Analytic oracle strengthening remains a proposal, not proven defect. |
| CLI/public-root/GLB | Real executable and package imports, source-relative companions, JSON/exit status, filesystem redirection rejection, native cancellation/recovery. No private helper spelling assertions. |
| Website Node | Keep bake/source bindings, authored architecture, navigation parameter matrices and frame-rate walking calculations. Checked-in bake checks are not fresh native-render evidence. |
| Reviewer browser | Actual production builds, desktop/mobile, accessibility, selection/camera/navigation, invalid XML, walking/input, graphics loss/fallback. Replaces old page assumptions; no arbitrary settling sleeps added. |
| Preview browser | Temporary source and actual GLB, watch/atomic replacement, malformed/missing recovery, camera retention, latest coalesced write, stale HTTP after disconnect, close/restart. No fake EventSource engine. |

## Final execution

- Root Node:201 discovered,200 passed,zero failed,one optional native BSP skipped;
  9.619 seconds. `/tmp/levelspec-final-node.log`.
- Website Node:24 passed,zero failed/skipped;107.977 seconds.
  `/tmp/levelspec-final-site.log`.
- TypeScript and both production builds passed. Build warnings remain bundle size
  and ineffective dynamic import notices, not acceptance failures.
- Focused preview browser passed including the disconnect regression.
  `/tmp/levelspec-final-preview.log`.
- General production reviewer browser:20 scenarios passed, process exit0. Includes
  both production surfaces, accessibility, mobile, walking, invalid XML, context
  loss/restoration and controlled no-WebGL diagnostic/repair. Log
  `/tmp/levelspec-final-browser.log`, artifacts `/tmp/levelspec-final-browser/`.
  An initial run exposed transient context-restoration GL deletion warnings; these
  did not reproduce in subsequent frozen-build runs. The implementation reviewer
  inspected lifecycle handling without inventing an unsupported fix. Intentional
  unavailable-WebGL scenario logs its expected context creation error. No warning
  filter was weakened. A later failed run revealed the test driver clicked an
  already-open diagnostics details element shut; it now clicks only if closed and
  waits for actual visible diagnostic paragraphs.

Logs/screenshots are temporary local evidence. Only Chromium/local Chrome was
exercised here; optional real Blender/Quake invocation, GPU leak soak tests and all
platform/browser combinations remain outside this run's evidence.
