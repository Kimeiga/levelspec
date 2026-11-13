# Phase three: CLI and authoring harness

Status: implemented. See [validation and limitations](../reviews/phase-three-validation.md).

Implement on `codex/xml-cli-harness-next-phase` in the main checkout.

## Agreed contract

Repository-local Node24 launcher and npm wrapper, not a standalone published install.
Commands: init creates a minimal XML project without overwriting; validate performs
geometry/runtime validation without artifacts or UV generation; build requires an
explicit source and --out and retains existing format/native/strict/UV options;
preview is read-only, loopback-only and watches source/companions. Authoring stays
in XML files. Browser editing and additional style redesign are out of scope.

Finite commands accept --json: exactly one schemaVersion1 result with command,
success, source/project, diagnostics, repairs, available stats/report, artifacts,
and stage/message errors. Progress goes to stderr. Exit0 success,1 runtime/input/
export failure,2 usage,130 SIGINT. Help/version are human stdout. Preview does not
accept --json; it prints readiness URL on stderr and closes watchers/server on SIGINT.

Keep shared pipeline services separate from parsing/process handling. Resolve assets
relative to XML. Propagate abort signals through validation/export, preserve prior
outputs with staging/rollback, reject symlinked publishing parents and report native
prerequisites. Synchronous WASM calls are not interruptible mid-call.

## Harness

Provide projects/corridor-overpass worked XML, source brief and review evidence.
init emits level.level.svgx plus references/schematics/reviews and command guidance.
Generated output remains ignored. Update repository skills with actual commands.

## Acceptance

Independent test review precedes production changes and independent implementation
review follows. Use subprocess tests for public JSON/exits/paths/assets, init refusal,
failed-output preservation, symlinks and cancellation/recovery. Browser-test real
reviewer preview loading/rebuild/stale-recovery/camera retention/shutdown. Run types,
root/site tests, both builds and worked-project validation/export; report optional
native skips and existing UI/test limitations honestly. No publication or commits
are implied by implementation authorization.
