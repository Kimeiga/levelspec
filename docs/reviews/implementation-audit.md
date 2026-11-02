# Independent implementation audit

Reviewed revision: `0bd3d765e36fb9489e089d61d8aebf732b374aaf`.
Scope: phase-one read-only production review, using SnapEngineJS's
`write-readable-typescript` guidance. No production code or tests changed.
This is a bounded audit of contracts and high-risk boundaries, not a claim that
every algorithm or line has been independently verified. Baseline execution is
owned by the coordinating review report, not duplicated here.

## Findings and proposed follow-ups

### IA-01 — Output containment follows directory symlinks

Priority: P1 reliability; confirmed with an isolated temporary-directory probe.

`src/export/vector/index.ts:43` checks lexical containment in `writeExportFiles`,
then calls `mkdir` and `writeFile`. An existing `textures` symlink inside the
destination redirects `textures/probe.txt` outside that destination. The publish
routine at line 83 similarly creates parent directories and renames entries
without validating those parent directories. Its documented promise to avoid
replacing unrelated files therefore needs a stronger filesystem boundary.

Probe run: create separate temporary `out` and `outside` directories, symlink
`out/textures` to `outside`, call the exported `writeExportFiles(out,
{'textures/probe.txt':'outside-write'})`, and read `outside/probe.txt`.
Observed `outside-write`; the temporary tree was removed afterward. Publish-path
impact follows code inspection and was not separately fault-injected.

Correction: define the supported symlink policy and enforce it at writing and
promotion boundaries, including existing parent components. Do not rely on lexical
path checks alone. Verification: existing-output symlink parents, normal nested
texture directories, unrelated files, promotion failure/rollback, and cancellation.
Do not describe the existing code as a general secure filesystem sandbox.

### IA-02 — Runtime validation drops the caller's cancellation signal

Priority: P1 reliability; confirmed by call-site inspection, latency not measured.

`tools/vector-build.ts:72` calls `validateForRuntime(level, {sealed:true})` after
passing an abort signal into compilation. `tools/export/service.ts:188` repeats
this omission despite its job owning an AbortController. Validation can perform
fresh land/water/sealed navigation bakes. The subsequent export observes the signal,
but the intermediate validation stage cannot cooperate with the caller's cancellation.

Correction: pass the caller's signal through every asynchronous stage and preserve
the project's abort classification. Verification: cancellation during validation,
no output promotion after cancellation, terminal cancelled service state, and a
successful next invocation. Synchronous WASM calls still cannot be preempted by an
event-loop signal; document that limit separately from missing propagation.

### IA-03 — Failed lighting bakes can leave an unretryable destination

Priority: P2 reliability; confirmed control-flow gap, native failure not reproduced.

`src/lighting/bake.ts:57` refuses an existing output directory. The Blender bake
receives the final output at line 137; the `finally` block at line 160 only removes
the temporary input/calibration directory. A native failure after creating output,
or failure while copying metadata at lines 146–156, can leave a partial destination
that a subsequent invocation refuses.

Correction: stage the complete lighting result and publish only on success, or
explicitly define recoverable incomplete revisions without deleting user data.
Verification: inject failure after output creation and during final metadata write;
assert existing successful revisions remain intact and retry is possible.

### IA-04 — The type-check command excludes active public legacy APIs

Priority: P2 tooling; confirmed configuration mismatch, not a demonstrated type error.

`package.json` exports the legacy root and generator while `tsconfig.json` includes
only XML/lighting/browser/export paths and selected tools/tests. A successful
`npm run check` does not establish type correctness of all current public APIs.
The retirement work should resolve this deliberately rather than claiming a
whole-package check already exists.

Correction: make the post-cutover public entrypoints and their retained callers
part of type-check discovery; until cutover, describe the current boundary honestly.
Verification: inspect compiler file discovery against each public package export
and run the retained acceptance matrix after retirement.

### IA-05 — Numerical pipelines are compressed and underdocumented

Priority: P2 maintainability; improvement proposal, no numerical defect established.

`src/vector/movement.ts` combines spatial indexing, water precision repair,
depth inference/exclusion, movement clipping and temporary collision semantics.
`src/vector/clipping.ts:44` compresses repair aggregation into dense statements;
`src/vector/navigation-build.ts` compresses native resource creation/release and
tiled error handling. The compiler and validator are respectively 1,330 and 736
lines, but length alone is not evidence that they need splitting.

Correction: expand dense expressions first; document coordinate spaces, tolerances,
mutation and ownership at meaningful declarations. Extract only independently
cohesive responsibilities. Preserve allocation guards, atomic repair commits and
native destruction paths. Verification: geometry/navigation/cancellation regression
coverage, independent expected results, and review for unchanged numerical semantics.

### IA-06 — Current build tool is not yet a machine-readable CLI contract

Priority: P2 future CLI prerequisite; confirmed design gap, not a regression.

`tools/vector-build.ts` sends progress via `console.log` and later sends JSON on
the same stream. Argument parsing and format validation occur outside its main
error handler; cancellation ends with the same exit code as other errors. There
is no package `bin`. This works as a human tool but cannot satisfy the planned
single-result stdout and stable exit-code interface.

Correction: implement the planned CLI boundary around reusable compile/validate/
export services. Verification: spawned process tests for help, malformed invocation,
clean JSON stdout, stderr progress, validation failures, cancellation and recovery.

## Positive evidence worth preserving

- `format.ts:54` explicitly rejects DOCTYPE/entity declarations and reports XML
  errors with source locations. Parser review covered entry construction and
  diagnostic routing, not every XML attribute branch.
- `precision.ts` clones caller-owned documents before normalization and describes
  millimeter authoring versus derived mesh precision.
- `clipping.ts` checks safe integer budgets and bounds allocations; repair records
  retain source/object ownership. Algorithmic proof of all clipping cases was not
  attempted in this audit.
- `compiler.ts:1236` releases tracked Manifold objects in a finally block;
  `uv.ts:246` destroys the atlas; navigation tiled intermediates have explicit
  destruction paths. Exception safety across every native allocation remains a
  focused future review rather than a blanket pass.
- `movementLevel` copies water surface metadata for temporary boat support,
  preserving non-solid compiled water. Collision selection uses explicit surface
  metadata; geometry hashing incorporates collision and visibility semantics.
- Export orchestration stages files, locks promotion and attempts rollback;
  process output is bounded, optional tools have timeouts and signal handling.
- Lighting manifests fingerprint geometry, UVs, materials, lights and revisions.
  Their existence does not establish physical lighting accuracy or native importer
  parity; those require renderer-specific acceptance evidence.

## Legacy dependency inventory

| Path/group | Current role | Retirement action |
| --- | --- | --- |
| `src/index.ts` | Public legacy compile, plan parser, navmesh and exports | Replace public surface and migrate callers together. |
| `src/core`, `src/authoring`, `src/generate` | Old geometry/DSL/generation | Remove exclusive functionality after retention inventory. |
| `src/export/vector/bsp.ts:7` | XML BSP imports legacy `boxMesh` | Extract or replace shared box geometry before deleting core. |
| `tests/vector-export.test.ts:28` | XML exporter tests import legacy `signedVolume` | Retain an independent numerical oracle; move the relevant utility or derive expected values independently. |
| `tools/build.ts`, `author.ts`, `concept.ts`, `plans.ts`, `finalize.ts`, `generate.ts` | Legacy production authoring/compilation | Retire with npm commands or migrate explicitly retained workflows. |
| `tools/migration/convert.ts`, `tools/vector-migrate.ts` | One-shot legacy conversion/comparison | Finish retention review before removing adapters. |
| `src/lighting`, `src/export/vector`, `tools/export` | XML-supported bake/export services | Retain; do not delete based on historical directory names. |
| `tests/core`, `gates`, `levels`, `navmesh`, `concept` | Legacy guarantees | Inventory contracts before retirement; retained XML behaviors need continuing coverage. |
| Runtime/report/lighting/export JSON | Transport/artifact/configuration | Keep; not legacy JSON level authoring. |

## Review coverage and limitations

Detailed inspection: XML parser entry/error handling; preflight dimension/material
checks; compiler setup, water surfaces, geometry hash and cleanup; clipping budgets
and repair aggregation; movement ownership; navigation cache inputs, bake handoff
and tiled lifecycle; collision filtering; prop transforms/validation; export asset
resolution, Node staging/publishing/process and dev service; lighting bake/manifest;
UV ownership and cleanup; root/public exports, TypeScript config, package scripts,
reference-authoring workflow and legacy import inventory.

Sampled: BSP conversion and box utility dependency; native geometry and asset
validation. Not independently proven: every triangulation/stair/wall construction
branch, Recast ownership internals, all UV precision branches, FBX/BSP destination
importer behavior, Blender calibration accuracy, renderer/worker lifecycle and
browser style. Browser implementation and tests are separate review scopes.
No native exporter or lighting bake was executed by this reviewer. No material
numerical correctness defect beyond the listed boundary findings was established.
