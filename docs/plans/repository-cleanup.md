# Repository cleanup plan

Status: executed; see [cleanup record](../CLEANUP.md) for dispositions, validation and limitations. The inventory below records the starting state. Apply the requested [untangle-codebase skill](https://github.com/caldoai/skills/tree/main/skills/untangle-codebase), scoped to planning. Include both optional comment and test cleanup. Execution must preserve current supported behavior; retired content is a deliberate removal, recorded separately.

## Target

LevelSpec is an AML compiler, repository-local CLI and read-only reviewer, with native generation/tracing, exports and explicit SVGX migration. Make those responsibilities obvious. `examples/` contains exactly the two maintained examples: Daiban (the current repository spelling of the user's Daibon) and Dust II. Small feature demonstrations belong to their tests or documentation, not the example gallery. Keep legitimate runtime JSON, reports and manifests.

Retain `src/`, `review/`, thin `viewer/` and `website/` adapters, `tests/`, `tools/`, current `docs/`, `schema/`, and `examples/`. Keep user work in `projects/`, source evidence in `reference/`, and reproducible output in ignored `generated/`. Avoid a wholesale directory rename alongside semantic refactoring.

## Evidence and decisions

### 1. Separate maintained examples, test inputs and retired experiments

- Hidden links: `examples/` has eight AML sources, four SVGX sources and concept/gameplay inputs (15 tracked files total). CAD, terrain, starter, showcase and rooftop files are consumed by tests, tools and docs. Deleting them directly breaks coverage and commands. Consumers include `tests/aml-schema.test.ts`, `tests/preview-browser.mjs`, `tests/vector-export.test.ts`, `tests/aml-terrain-course.test.ts`, `tools/vector-bake.ts`, and `tools/reconstruct-openai.ts`.
- Move retained feature samples and their companions into named `tests/fixtures/` packages; move migration-only SVGX into migration fixtures. For documentation snippets, use minimal inline AML or link to the fixture where a full source is necessary. Update every consumer in the same change.
- Keep `examples/daiban.aml` and `examples/dust2.aml` as the only gallery sources, with a short index explaining scope, references and validation limits. Preserve the Daiban bounded-study/fidelity limitations.
- Historical candidates: `authored/` (9 Python files), `levels/` (9 JSON files), `maps/` (382 tracked files), retired concept/gameplay inputs, and the broad `reference/cs-maps/` collection (about 418 MB). Establish a complete consumer and provenance manifest, retain any required test input, then remove obsolete content from the active tree. Git preserves tracked history; avoid merely relocating the entire dumping ground into an in-repository archive.
- `tools/vector-dust2.py` still writes SVGX and `tools/dust2-overlay.py` audits a generated legacy runtime path. Retire them if historical-only; if they protect current Dust II fidelity, port that useful check to AML and retain its independent reference oracle.

### 2. Give shared reviewer behavior one owner

- Needless links: `review/scene.ts` imports navigation, walk input and clock from `website/`; `review/walk.ts` imports site navigation. `website/main.ts` imports the worker from `viewer/`. Shared behavior depends on adapters.
- Move active walking/navigation utilities and the compile-worker protocol/handler under their shared owner in `review/`. Keep adapter entry points responsible only for initial source, asset policy, local/server capabilities and worker construction. Update tests and all consumers without forwarding aliases.
- Surplus candidate: `website/main.ts` now mounts `review/app.ts`, while the previous `website/scene.ts` renderer, worker, state-driven playground and effects remain. `LevelScene` has no instantiations found, and the old worker has no callers found. Tests and bake tools still reference portions of that system. Classify each member as active product, reusable domain fixture, asset-build input or obsolete before deletion. Preserve unique geometry/navigation/asset coverage at the supported public boundary.
- Audit both legacy and `aml-v1` site bake sets and their manifests before pruning. Keep only assets consumed by the resulting supported surface/build tooling. Do not remove the site or game solely because they are separate adapters; preserve supported game exports and movement behavior, and keep any retained game harness explicitly scoped.

### 3. Delete dead generated code and repair provenance

- Surplus: `src/generate/looks.ts` is 11,342 lines with no consumers found in the audit. Its header names missing `tools/build_palettes.ts` and `maps/cs/curated.json` paths. Confirm no dynamic/package/build consumers, then delete it and associated unused look data, rather than refactor dead data into a new subsystem.
- Audit `.fallowrc.json` entries against real package exports, CLI/tool commands, workers, browser entries and tests. Declaring every tool an entry can conceal obsolete tools. Use a dependency inventory as evidence; do not treat analyzer output alone as deletion authority.

### 4. Split large modules by responsibility, preserving invariants

- `src/architecture/compiler.ts` is about 2,233 lines; `compile` owns resolution, primitive dispatch, assembly CSG, emission, audits and runtime processing. Extract cohesive geometry construction/emission and compile-stage responsibilities, leaving a readable orchestration pipeline. Keep native allocation ownership, cancellation, diagnostics and geometry/navigation separation explicit. Do not introduce a generic plugin registry or a helper per branch.
- `review/app.ts` is about 968 lines and `review/scene.ts` about 862. Separate source/worker lifecycle, camera controls, walk lifecycle and appearance/render resources where they have independent ownership. Keep coupled state together; extract only boundaries that reduce what a normal change must touch.
- Preserve recent contracts explicitly: Flat retains contours, ordinary dragging preserves tilt/roll, rotation orbits a screen-center model point, explicit review poses can tilt, and URL replay reproduces the pose.
- Map every catch, retry, sleep, magic threshold and one-value branch to its actual requirement. Remove compensating branches when their cause is removed. Retain justified debounce, polling, optional dependency handling, tolerances and resource recovery with concise contract documentation.

### 5. Make tests and comments protect current contracts

- Create a keep/rewrite/merge/delete ledger with surviving coverage for every removed case. Keep geometry math deterministic and independently derived; use browser tests for real rendering, pointer input and lifecycle.
- Audit legacy `website/tests/*browser.mjs` scripts against the current mounted UI and package/CI discovery. Promote unique current guarantees into supported acceptance; remove tests only when their behavior is retired or covered elsewhere.
- The old experience and worlds suites compile 175 and 350 curve/elevation configurations respectively. Retire unsupported playground permutations after preserving current compiler boundary guarantees. Consolidate overlapping expensive compile matrices in `website/tests/state.test.ts` and `experience.test.ts`; retain independent state, geometry, region and navigation expectations. Do not replace them with implementation-shaped assertions.
- Remove the unrelated migration dependency from active browser tests: `tests/fixtures/aml-source.mjs` migrates SVGX strings for inspection, contours, frame-aspect, overlaps, suggestions and site review. Author those fixtures in native AML and keep historical decoding in migration suites.
- Consolidate exact duplicate Dust II expectations (for example Goose elevation samples in `aml-dust2.test.ts` and `vector-dust2.test.ts`), preserving independent clearance, movement, route-budget, export and migration guarantees.
- Move genuinely shared browser launch/readiness support from `website/tests/browser-helpers.mjs` to neutral test support; keep old playground diagnostics and synthetic repeat-key workarounds out of that shared contract.
- Standardize browser server/readiness/artifact cleanup only where runners actually repeat the same protocol. Preserve stable fixtures, isolated ports/output directories, failure evidence and retries-disabled timing checks. Replace settling sleeps with observable completion where available; retain gesture pacing when elapsed input is the contract.
- Remove comments that restate implementation. Keep units, coordinate contracts, ownership, numerical rationale and externally imposed constraints. Repair stale generated-file/provenance comments by correcting or removing their underlying artifacts.
- Align test discovery, package scripts and CI. Record the test inventory before and after moves; no test should silently disappear because its filename or folder changed.

### 6. Keep local history and current documentation distinct

- Local inventory: `generated/` is about 12 GB; `projects/dai2-daiban/` about 5.7 GB with roughly 13,671 files. These are working evidence and outputs, not proof that all content is disposable. `CURRENT.json` points to both project studies and ignored generated frozen sources, so blanket deletion can destroy the only referenced source package.
- Before local cleanup, resolve current pointers, inventory unique source/reference/freeze files, and preserve a self-contained current source package. Consolidate current AML projects separately from historical SVGX study trees. Historical project evidence can move to an external archive with a manifest; verify hashes and links before deleting originals.
- Treat `.playwright-mcp/`, `ALTERNATIVES-WORKING.json`, untracked review records and project/reference folders individually. Do not use `git clean` or discard untracked files as cleanup.
- Reduce current docs to supported workflows; retire obsolete plans/reviews from normal navigation. Retain useful historical evidence with explicit revision scope. Update README, AGENTS, examples index, commands and CI together so removed paths stop being taught.

## Execution order and gates

1. **Baseline and disposition:** record dirty/untracked state, tracked and local inventories, import graph, public exports, entry points, test discovery and behavior baselines. Produce a path-by-path keep/move/delete ledger. No deletion until references and unique data are resolved.
2. **Tree cleanup:** relocate fixtures and companions, reduce examples to two, update references, remove verified obsolete tracked inputs/tools. Keep this mechanically reviewable and separate from compiler changes.
3. **Reviewer cutover:** move shared utilities/worker ownership; retire disconnected site code and assets after consumer/test migration. Validate both adapters and game/export boundaries that remain.
4. **Core readability:** remove dead generated data; refactor compiler and reviewer responsibility boundaries in bounded commits. Independently review tests before production edits and implementation afterward, as required by repository skills.
5. **Tests, comments and docs:** consolidate coverage last, after it has protected the structural changes. Finish path/documentation cleanup and command/CI alignment.
6. **Independent final audit:** agents search for hidden links, needless links, surplus and unexplained special cases. Resolve material findings and repeat affected validation. Keep the decision log updated; do not claim the whole repository is clean from file counts alone.

For the baseline and final state, run `npm run check`, `npm test`, `npm run test:producers`, `npm run test:site`, viewer/site builds, and supported browser acceptance (shared preview plus capture, CAD, circulation, terrain and production site as applicable). Check game build/export/movement if retained or touched. Validate and build both maintained examples; preserve independent route/collision/export and reference expectations. Record unavailable optional native tools and pre-existing failures separately. Compare test discovery, package exports, browser commands, retained asset manifests and unresolved import/path references.

Done means exactly two maintained examples; every retained fixture/tool/asset has a current owner; active reviewer code does not depend on adapter internals; removed tests have a documented disposition; source evidence survives local cleanup; and supported behavior passes the acceptance matrix. This planning audit identifies the highest-confidence problems and requires a complete disposition/dependency pass before execution; it is not a claim that every special case has already been exhaustively reviewed.
