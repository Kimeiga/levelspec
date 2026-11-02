# Documentation

Use [the repository quickstart](../README.md) and [agent instructions](../AGENTS.md)
first. Current guides describe supported behavior; archived records describe their
original revision and are not current acceptance claims.

## Current guides

| Task | Guide |
| --- | --- |
| XML syntax, geometry, navigation, premaps and water | [XML authoring](SVGX.md) |
| Architectural construction helpers, references and props | [Reference authoring](REFERENCE_AUTHORING.md) |
| Formats, textures and optional native exporters | [Exports](EXPORTS.md) |
| Non-blocking geometry suggestions and review suppressions | [Suggestions](SUGGESTIONS.md) |
| Orthographic reviewer and browser acceptance setup | [Reviewer](WEBSITE.md) |
| Implemented capabilities and remaining limits | [Implementation](IMPLEMENTATION.md) |
| End-to-end sample | [Corridor and overpass project](../projects/corridor-overpass/README.md) |

## Commands and contracts

Use `npm run --silent levelspec -- --help` for authoritative CLI flags. `init`
creates XML/projects without overwriting, `validate` writes no artifacts, `build`
requires `--out`, and `preview` is read-only and long-running. Finite `--json`
commands return one stdout result with diagnostics/report and available artifact
paths; progress is stderr. Exit codes: 0 success, 1 operation failure, 2 usage,
130 SIGINT. Synchronous WASM work can delay cancellation delivery.

Validation failure is not an instruction to weaken a route or clearance assertion.
Inspect source-linked diagnostics, repair XML, and retry. Inspect reports as well
as meshes. Premap validity does not verify gameplay reachability. Optional native
prerequisites and unavailable checks must be reported explicitly.

## Historical evidence and plans

- [Archived implementation/visual verification records](archive/README.md).
- [Phase roadmap](plans/xml-cli-harness-next-phase.md) and [final review plan](plans/final-harness-review.md).
- [Review records](reviews/): revision-scoped audits, test dispositions and validation.
- [Phase-three validation](reviews/phase-three-validation.md) records its run, not a promise about later edits.

The [final harness review](reviews/final-harness-review.md) records current findings,
corrections, validation and limitations. Plans do not supersede the commands and
contracts in the current guides.
