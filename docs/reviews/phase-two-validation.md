# Phase-two validation and handoff

Branch: `codex/xml-cli-harness-next-phase`, main checkout.

## Results

- XML root Node suite: 179 discovered, 178 passed, zero failed, one optional native
  BSP integration skipped. Logs `/tmp/levelspec-phase2-tests.log` and independent
  `/tmp/levelspec-phase2-node.log` (duplicate run, same discovery/results).
- TypeScript: passed with all retained source/tools/tests plus review UI included.
- Viewer and site production builds: passed, existing chunk/dynamic-import warnings.
- Public-root API integration and analytic BSP box volume/winding: passed.
- Showcase and rooftop XML compile/export: passed with runtime/report/GLB/OBJ/SVG/UV
  artifacts under `/tmp/levelspec-phase2-showcase` and `-rooftop`.
- Website Node suite: 24 passed, zero failed/skipped; 107.490 seconds.
  Log `/tmp/levelspec-phase2-site.log`.
- Browser matrix: blocked at first experience-script readiness timeout waiting for
  `#playground[data-status="ready"]`; later four scripts not executed because the
  command chains them with &&. Current pre-existing website/main.ts mounts the new
  review/app.ts interface, not the older playground expected by existing acceptance.
  Those UI edits were present before phase-two implementation and were preserved.
  This run does not establish browser acceptance for the new UI. Log:
  `/tmp/levelspec-phase2-browser.log` (also records a resource 404, not diagnosed).

Main checkout dependencies were synchronized with npm ci before the recorded browser
attempt; an earlier invocation lacked Playwright. Existing port 48217 was left alone;
our production preview used 48218 with SITE_BASE=/levelspec/. Optional native Blender
and Quake tooling was not independently exercised. No release was published.

## Review and retirement

See [retirement ledger](phase-two-retirement-ledger.md),
[test disposition and independent oracle](phase-two-test-retirement.md), and
[independent implementation review](phase-two-implementation-review.md).
No compatibility readers/wrappers remain. Existing XML module layout and XML
subpaths remain supported. Typecheck coverage resolves IA-04/T-03 for retained
code; shared legacy helper dependency T-04 is removed with independent numerical
expectations preserved. Other phase-one defects remain separate repair work.

User-owned untracked maps/vector, review, .playwright-mcp and concurrent viewer/site
edits are preserved. Test counts drop because legacy-only suites are retired, not
because XML assertions were weakened. The ledger identifies continuing coverage.
All changes are local and uncommitted.
