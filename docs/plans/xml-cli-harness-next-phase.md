# XML-only LevelSpec CLI and authoring harness

Status: draft for elaboration and review. This document records the proposed next
phase; implementation has not started. Update it as decisions and evidence change.

Branch: `codex/xml-cli-harness-next-phase`, based on
`codex/levelspec-water-navigation-repairs` at `0bd3d76`.

## Goal and current state

Make this repository an agent authoring harness for architectural levels. Agents
write XML LevelSpec, invoke a local CLI to compile, validate, inspect, and export,
and iterate using diagnostics and an orthographic illustrated preview. Buildings,
corridors, stairs, bridges, overpasses, and connected indoor/outdoor spaces are the
primary subjects.

The sole authored level format will be XML (`.level.svgx`). Remove the ASCII plan
language and JSON level authoring, their production APIs, tools, examples, and
documentation. Runtime JSON, diagnostic reports, package manifests, bake metadata,
and other non-authoring JSON remain legitimate outputs or configuration.

Observed starting points:

- The package root still exports the legacy compiler and ASCII parser. The XML
  implementation is under `src/vector`; its exporters are under
  `src/export/vector`. Most old authoring and generation paths use separate
  `src/core`, `src/authoring`, and `src/generate` implementations.
- `tools/vector-build.ts` already compiles XML, validates runtime suitability, and
  exports meshes and reports. It is a useful CLI starting point, but mixes progress
  and JSON on stdout and is not a complete agent-facing command interface.
- `viewer` is the workbench; `website` is a separate interactive demo with its own
  renderer, tests, build, offline behavior, and CI. Both need explicit disposition.
- `docs/IMPLEMENTATION.md` records unresolved migration differences and an old
  requirement to keep legacy APIs until parity. This phase intentionally replaces
  that policy. Conversion success must still not be represented as validation success.
- PR #12's water collision fix and independent land/boat navigation are part of
  the baseline. Most recent validation: 420 Node tests passed, one skipped;
  TypeScript and the viewer build passed. Website acceptance was not rerun as
  part of that fix and needs its own baseline.

Phase-one detail: [skills and audit plan](phase-one-skills-and-audit.md).

## Workstreams and implementation order

### 1. Establish repository skills and review the existing system

Adapt these local sources into self-contained `.agents/skills` packages:

| Source | Destination | Adaptation |
| --- | --- | --- |
| `../SnapEngineJS/.agents/skills/write-readable-typescript` | `write-readable-typescript` | Preserve readable contracts, ownership, cohesive functions, source-level fixes, clean cutovers, and independent test/implementation review. Add geometry units, coordinate spaces, tolerances, WASM resource lifetime, cancellation, and cache validity concerns. |
| `../SnapEngineJS/.agents/skills/maintain-tests` | `maintain-tests` | Organize around compiler, geometry, navigation, CLI, exports, and browser contracts; favor independently derived geometric expectations and real integration boundaries. |
| `../3d-modeling-harness/.agents/skills/reference-3d-modeling` | `reference-level-authoring` | Replace the Blender-first canonical source with XML LevelSpec and CLI validation. Adapt reference collection, schematics, construction planning, and independent review to architectural spaces and circulation. |
| `../super-rec/.agents/skills/superrec-3d-art` | `level-preview-art` | Retain orthographic illustration, structural ink, pale grayscale, dithered shading/reflections, and directional/contact shadows. Replace category/product assumptions with architectural scale, openings, stacked spaces, water, and cutaways. |

Read source supporting documents before adapting them. Carry over only relevant
references and scripts, rewrite their links, and record source repository revisions
and modifications. No installed skill may depend on a sibling checkout at runtime.
Use the skill-creation workflow when implementing these packages. Add a root
`AGENTS.md` explaining when to use each skill, the XML contract, canonical commands,
artifact locations, and the architectural authoring/review loop. Do not transplant
product-specific assembly or animation requirements.

Apply the TypeScript and testing skills to a repository-wide audit before broad
refactoring. Review the retained compiler/parser, geometry and clipping, navigation,
asset/export pipeline, workers, both browser surfaces, tooling, and CI. Record
findings with severity, concrete evidence, affected contract, recommended correction,
and verification. Classify tests as keep, rewrite, merge, or delete; identify surviving
coverage or the obsolete contract before removing a test. Treat passing tests as
evidence rather than proof of sound design.

Deliver `docs/reviews/xml-harness-code-and-tests.md` with a prioritized backlog.
Use separate test and implementation reviewers as required by the adapted skill;
report any unavailable independent review honestly. Fix correctness and ownership
problems before stylistic cleanup. Split unrelated improvements into bounded changes.

### 2. Complete the XML-only cutover

Implementation detail: [phase-two plan](phase-two-xml-cutover.md).

Inventory entry points, imports, scripts, fixtures, generators, reference tools,
CI, docs, and public assets before deletion. Trace shared helpers by their consumers:
directory names alone do not establish that a module is obsolete.

- Make the package root expose the XML document/compiler/validator/export API.
  Remove obsolete exports, legacy subpaths, dual compilers, ASCII parsing, JSON
  level loading, naive comparison pipelines, and their exclusive dependencies.
  Retain the current XML module layout initially; avoid coupling removal to a
  cosmetic directory rename. Update every retained caller.
- Review the old corpus and any existing XML conversion candidates. Keep a curated,
  validated architectural acceptance set covering buildings, corridors, multistorey
  circulation, ramps/stairs, bridges/overpasses, references/props, and water.
  Convert valuable unique cases before deleting their sources. Do not retain the
  entire legacy library or require historical validator parity to finish retirement.
  Record omitted examples and unsupported semantics rather than silently changing
  routes, marker positions, traversal requirements, or validity claims.
- Remove old-only generators, migration adapters, scripts, tests, docs, generated
  assets, and npm commands once their retained consumers are migrated. Port a
  generator only if needed by a retained XML workflow. Audit lighting/export helpers
  individually; support code used by XML is not legacy merely because it is old.
- Replace README examples and the implementation ledger with XML-first commands and
  current guarantees. Remove obsolete parity gates, stale numeric claims, and
  compatibility promises. Update package exports, dependency lockfile, TypeScript
  inclusion, test discovery, and CI together. Treat the API removal as a breaking
  change and document it explicitly; choose the release version at release time.

No compatibility aliases, fallback readers, or migration flags are planned. A final
inventory review must account for remaining references to old authoring conventions.
Use searches as a cleanup aid, not as negative source-text regression tests.

### 3. Make LevelSpec an agent-facing CLI and repository harness

Implemented detail: [phase-three plan](phase-three-cli-harness.md) and
[validation](../reviews/phase-three-validation.md).

Implementation detail: [phase-three plan](phase-three-cli-harness.md).

Provide a local `levelspec` executable through the package `bin` and a documented
npm wrapper. Keep CLI parsing and filesystem/process concerns separate from the
reusable XML compiler. Support Node 24, matching current CI, without assuming a
globally installed TypeScript loader or sibling repository.

Proposed command surface:

- `levelspec init <project-dir>`: create a small XML architectural project and its
  working directories; reject overwriting an existing project.
- `levelspec validate <file.level.svgx> [--json]`: run document, geometry, and the
  authored playable/premap navigation contract without requiring optional exporters.
- `levelspec build <file.level.svgx> --out <dir> [--formats ...] [--json]`: compile,
  validate, and publish runtime/report/mesh artifacts using current export support.
- `levelspec preview <file.level.svgx>`: launch the local workbench for that source
  with file-change rebuilds and actionable compile diagnostics.
- Every command supports useful `--help`; the executable supports `--version`.

`--json` produces one structured result on stdout; progress goes to stderr.
Results identify success/failure, source-linked diagnostics, repairs, effective
validation mode, statistics, and artifact paths. Preserve land/boat reports and the
distinction between static premap validity and verified gameplay reachability.
Use stable exit codes: 0 success, 1 compile/validation/export failure, 2 invalid
invocation, 130 cancellation. Keep warnings distinct from errors.

Resolve authored asset paths relative to the source document. Keep optional native
exporter setup explicit and fail with actionable diagnostics when a requested tool
is absent. Preserve existing successful outputs on validation/export failure; use
the existing export staging mechanism where possible. Validate output destinations
before publishing. Cancellation must release workers/native/WASM resources and
leave the next invocation usable. Document deterministic versus tool-dependent
artifacts; do not promise byte-identical native exports without evidence.

Use `projects/<name>/` for authored XML, references, architectural schematics, and
review notes; place reproducible outputs in ignored `generated/<name>/`. Include
a small template and one end-to-end worked project. Generated meshes are outputs;
XML remains the editable source of truth.

The repository authoring skill should teach: interpret requirements and references;
establish dimensions/levels and circulation; review plans and sections; author XML;
invoke validation; inspect plan and orthographic views; repair diagnostics and
reference discrepancies; export; save evidence and known limitations. Construction
checks cover passage width/headroom, slab thickness, wall junctions, stairs/landings,
stacked spaces, overpass clearances, accessibility when requested, and shoreline/boat
constraints when water exists. Never claim real building-code compliance from game
navigation checks.

### 4. Shared read-only layout reviewer

Updated by user direction: both browser surfaces are review tools, with XML
editing, manual compilation, repairs and exports in external editor/CLI workflows.
Use the existing checkout on `codex/xml-cli-harness-next-phase`.

- Share one renderer and review UI between local-file and curated static entry
  points. Fill the browser width and height, with a small header, compact buttons,
  thin toolbar/status bar, main viewport and scrollable sidebar, like CAD software.
- Switch between full-size 2D and 3D views, preserving camera/selection/floor state.
  Include orthographic three-quarter and standard presets, quarter turns, pan,
  zoom, fit, roofs, floor isolation, sections and constrained first-person walking.
- Use very light gray surfaces, a strong modular grid and structural dividers,
  inspired by SuperRec and Snap Engine. Bundle Super Pixel Bitmap from font-maker.
  Use architectural feature edges, ordered dithering and directional/contact
  shadows; distinguish water/glass and preserve authored-material inspection.
- Offer read-only dimensions, references, navigation and spatial diagnostics.
  Keep progressive background loading, explicit stale state, cancellation/retry,
  keyboard/mobile access, reduced motion and WebGL fallback/recovery.
- Preserve source/material/export semantics and website deployment/offline support.
  Verify frozen production builds of both surfaces; retain evidence and independent
  test, implementation and appearance reviews. See `docs/WEBSITE.md` for controls
  and `docs/reviews/reviewer-test-disposition.md` for changed coverage.

## Validation and completion gates

Each workstream lands as a coherent change with its own focused checks and review.
Run affected tests first, then the relevant full acceptance matrix once stable.

- Skills: validate metadata and links, inspect adapted instructions for product
  assumptions, and exercise the workflow on the worked XML project.
- Cutover: every supported package entry point and CLI example uses XML; retained
  acceptance fixtures validate under their declared contracts. Account for test
  discovery changes and lost coverage. Build both browser surfaces and run their
  relevant existing acceptance checks while both remain supported.
- Geometry/navigation: preserve independent numerical checks, source diagnostics,
  determinism where guaranteed, cancellation/recovery, solid/render separation,
  land/boat routing, clearances, and validation semantics. Test observables rather
  than private helper wiring or implementation spelling.
- CLI: spawn the real executable in temporary projects; test help, malformed XML,
  invalid invocation, source diagnostics, success/failure exit codes, clean JSON
  stdout, paths with spaces, local assets, invalid destination, failed-output
  preservation, optional-tool failure, and cancellation/recovery. Native export
  integration runs explicitly where its prerequisites are installed.
- UI: use a frozen production browser build for interaction and visual review.
  Check camera fitting across building scales, cutaways/stacked floors, feature
  edges/dither/shadows at normal display size, water, selection, navigation,
  references, rebuild/cancel/error recovery, keyboard/mobile framing,
  reduced motion, and shader/console errors. Keep original reference, screenshot,
  revision, viewport, and review findings together; screenshots supplement
  behavioral assertions rather than replacing them.
- Finish with TypeScript, relevant Node suites, viewer/site builds and browser
  checks, package/CLI invocation verification, and independent reviews. Update CI
  paths and scripts to discover the new organization. Report known failures and
  incomplete checks separately; never loosen a contract to make the cutover green.

## Decisions to revisit during review

These are proposed defaults, not unresolved requirements hidden from implementation:

1. Keep `.level.svgx` and the current XML schema; do not invent another format or
   rename every vector module during this phase.
2. Retain representative XML fixtures rather than migrating every legacy map.
   Review the exact retention inventory before deleting corpus files.
3. Keep one workbench and one static presentation surface sharing rendering code.
   Revisit whether the separate website is still worth maintaining after the slice.
4. Use SuperRec's pale grayscale illustrated style as the default; review the slice
   before fixing line weights, dither scale, camera elevation, and shadow tuning.
5. Adopt the proposed CLI commands and project layout; refine their flags/result
   schema in the CLI milestone before production implementation.
6. Keep this phase scoped to the harness and preview. Do not add multiplayer,
   a general game engine, a building-code validator, or a Blender editing dependency.

Suggested delivery sequence: adapted skills and audit report; reviewed retention
inventory and XML cutover; CLI plus worked project; approved visual slice; shared
preview/UI integration; final acceptance and updated agent documentation.
