# Phase-three CLI and harness validation

Branch: `codex/xml-cli-harness-next-phase`, main checkout. All work remains local
and uncommitted. Repository-local Node24 CLI; no standalone installation/publication
or browser file-writing endpoint was added.

## Checks

- Final root Node suite:187 discovered,186 passed,zero failed,one optional native
  BSP integration skipped;13.279 seconds. Log `/tmp/levelspec-phase3-tests-final.log`.
- Focused CLI/asset suite:9 passed, including low-ceiling failed-output preservation,
  missing/native failure recovery, deterministic SIGINT130 and structured JSON,
  output/ancestor/nested destination symlink checks, occupied preview port.
- TypeScript passed. Viewer/site production builds passed with existing bundle and
  dynamic-import warnings. Logs `/tmp/levelspec-phase3-build-{viewer,site}.log`.
- Worked corridor-overpass project validates and builds successfully (five meshes,
  1013 triangles,four regions). Artifacts under ignored generated/corridor-overpass.
- Standalone preview browser passes real companion GLB load, missing-asset recovery,
  XML edits, camera retention, malformed/stale recovery, atomic replacement,
  coalesced latest writes and shutdown/restart. Log `/tmp/levelspec-phase3-preview.log`.
  This establishes latest-write behavior, not guaranteed mid-worker supersession.
- Website Node suite:24 passed,zero failed/skipped;135.868 seconds.
  Log `/tmp/levelspec-phase3-site.log`.
- Current general reviewer browser suite partially passes but fails a wording
  assertion at website/tests/review-browser.mjs:425: expects /validation/i while
  displayed text is 'playable / Needs attention. Navigation checks do not establish
  building-code compliance.' The focused preview contract passes independently.
  This general suite was concurrently replaced during the work; no assertion was
  weakened to hide its failure. Log `/tmp/levelspec-phase3-review-browser.log`.

Temporary evidence logs are not durable checked-in artifacts. Optional real Blender
and Quake tool integrations were not newly exercised. Synchronous WASM stages may
postpone signal processing. Destination checks prevent ordinary symlink parent
redirection, not concurrent hostile filesystem races. macOS /tmp and /var aliases
are accepted platform roots. Direct writeExportFiles leaf symlinks are outside the
parent-directory policy; publication promotes files by rename.

## Independent review

Test reviewer assessed contracts before production implementation and authored real
process tests; see [test review](phase-three-test-review.md). Coordinator separately
reviewed tests including the low-ceiling failure/recovery assertions and found no
blocking issue. CLI builder independently reviewed coordinator's destination checks
and export-service signal propagation, then preview adapter/server/browser coverage:
no blocking finding. Coordinator reviewed CLI implementation and requested readable
stage boundaries, human source locations and preview startup signal propagation;
corrections applied. Preview close idempotency and startup abort race were corrected
and browser checks passed afterward. No review claims all native algorithms proven.

## Usage

`npm run levelspec -- init projects/my-building`
`npm run levelspec -- validate projects/my-building/level.level.svgx --json`
`npm run compile -- projects/my-building/level.level.svgx --out generated/my-building --json`
`npm run levelspec -- preview projects/my-building/level.level.svgx`

Keep XML/references/schematics/review evidence as source and reproducible outputs
under generated. The standalone preview remains read-only; edit with agent/editor.
