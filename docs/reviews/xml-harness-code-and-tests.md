# XML harness: phase-one code and test audit

Reviewed production revision: `0bd3d765e36fb9489e089d61d8aebf732b374aaf`.
Branch: `codex/xml-cli-harness-next-phase`. Node: `v24.12.0`.
Status: phase one complete. Baselines ran in the isolated `levelspec-pr12` worktree
at the reviewed revision; the documentation and skills were then transferred to
the main `levelspec` checkout on the same branch. No production changes intervened.
All phase-one changes are skills, agent instructions and review/plan documentation.
Production implementation, package interfaces, tests and discovery remain unchanged.

## Method and independent review

Read [phase-one scope](../plans/phase-one-skills-and-audit.md) and the
[parent roadmap](../plans/xml-cli-harness-next-phase.md). Four skills are installed
locally under `.agents/skills`; provenance records source commits and file hashes.
The modeling harness source has no Git metadata, so its snapshot is hash-identified.

Independent reviewers separately inspected implementation and test contracts without
being given desired findings. A browser reviewer owns production browser baselines
and architectural/art exercises. This is a bounded subsystem audit, not a proof of
all geometry algorithms or every line. Details, file-level evidence and limitations:

- [Implementation audit](implementation-audit.md): parser/compiler, clipping,
  movement/cache/resource ownership, assets/export/lighting, tools, CI and legacy dependencies.
- [Test audit](test-audit.md): all root/site test groups, browser scripts, ownership,
  keep/rewrite/merge/delete recommendations and independently derived expectations.
- [Browser audit](browser-audit.md): production acceptance, workbench state/rendering and lifecycle inspection.
- [Skill exercises](skill-exercises.md): independent architectural and preview guidance applied to actual XML, original fixture images and browser captures.

The implementation reviewer also independently reviewed all four skill packages
and root AGENTS.md: no blocking issue. A suggested testing-focused wording refinement
was applied: domain guidance now asks tests to assert cleanup/recovery and cache
invalidation instead of prescribing native implementation details.

## Prioritized repair backlog

P1: important reliability/correctness boundary. P2: tooling or maintainability.
These priorities do not imply externally exploitable security findings. Confirmed
means the specified evidence establishes the stated boundary, not every consequence.
No production repair is included in this phase.

| ID | Priority/status | Contract and evidence | Follow-up and acceptance |
| --- | --- | --- | --- |
| IA-01 | P1; isolated write probe confirmed | Export lexical containment follows existing destination directory symlinks outside output. Publish-path consequence is inspection-only. | Define and enforce symlink policy at write/promotion; verify nested outputs, unrelated file preservation, rollback and abort. |
| IA-02 | P1; call-site confirmed | CLI/service runtime validation omit caller AbortSignal while other stages receive it. | Propagate signal through validation; cancel without publishing and successfully invoke again. Distinguish synchronous WASM preemption limits. |
| IA-03 | P2; control-flow confirmed, native failure unprobed | Lighting bake writes final directory but failure cleanup removes only temporary inputs; retry rejects existing output. | Stage complete lighting results; inject native and metadata failures, preserve prior results, demonstrate retry. |
| IA-04 / T-03 | P2; configuration confirmed | Typecheck excludes current legacy public entrypoints and tests. | Account for public exports/shared helpers during retirement; verify all retained contracts enter typecheck. |
| IA-05 | P2; improvement proposal | Dense movement/clipping/native lifecycle expressions obscure ownership and tolerances; no numerical bug proven. | Expand meaningful steps/document contracts before extracting modules; preserve numerical and cancellation behavior. |
| IA-06 / T-01 | P2; future CLI prerequisite | Human build tool mixes progress/JSON stdout; subprocess test covers success only. | Implement documented command boundary and failures together; verify stderr/stdout, exits, paths, abort and recovery. |
| T-02 | P2; configuration confirmed | Local/reference CI root concurrency differs from bounded website CI. | Select one measured bounded command and reuse without changing discovery/guarantees. |
| T-05 | P2; evidence gap | Native BSP integration conditional; checked-in bake binding is not fresh Blender acceptance. | Explicit versioned native acceptance run for relevant releases; keep portable tests fast and report skips. |
| T-06 | P2; test-strength proposal | Reference fitting synthetic landmarks reuse the projection routine and can share convention errors. | Add analytically derived camera offsets/orientations while retaining inverse/multiview cases. |
| T-04 | Low; retirement dependency | XML volume tests import legacy signedVolume. | Preserve independent numerical oracle before removing core. |

| B-01 | P2; source-confirmed, no browser reproduction | Layer isolation filters physical geometry and coverage markers but not 3D navigation overlay. | Define consistent layer ownership and verify overlapping storeys in a real workbench browser case. |
| B-02 | P2; improvement proposal | Workbench combines build state, scene resources and UI with untyped worker replies. | Extract cohesive responsibilities when UI changes require them; type reply stages and preserve stale-preview behavior. |
| B-03 | Later-phase requirement | Both renderers use perspective and separate style engines. | Prove illustrated architectural slice first, then share actual common responsibilities while preserving walking mode. |

Detailed locations, consequences and verification live under each finding ID in the
independent reports. Deduplicated IDs above retain links to both review perspectives.

## Legacy retirement prerequisites

The XML BSP exporter still imports `boxMesh` from `src/core/mesh.ts`. XML exporter
tests import `signedVolume` there. Extract/replace shared functionality and preserve
its numerical coverage before deleting old directories. Runtime/report/bake JSON is
not authored JSON LevelSpec and must remain supported.

The test report inventories all groups and surviving guarantees. Keep navigation,
collision, clipping failure/retry, export rollback, reference and browser coverage.
Port selected old validity/headroom/route fixtures to XML before retiring old tests.
Delete concept-generation guarantees only when that generator is retired. Do not
merge similarly named scenarios without mapping distinct assertions first.

## Baseline and skill validation

| Check | Result |
| --- | --- |
| Full root Node suite | 420 passed, one skipped, zero failed; 51 suites, 255.310 seconds. |
| Website Node tests | 24 passed, zero failed/skipped; 145.784 seconds. |
| TypeScript | Passed; current legacy exclusion noted in IA-04/T-03. |
| Viewer build | Passed with bundle/dynamic-import warnings. |
| Website build (`SITE_BASE=/levelspec/`) | Passed with bundle/dynamic-import warnings. |
| Production website browser matrix | All five scripts passed, process exit 0 using existing local Chrome. |
| Rooftop reference acceptance | One passed, zero failed. |

Evidence logs are under `/tmp/levelspec-phase1-*.log`; screenshots/results under
`/tmp/levelspec-phase1-browser/`. These are temporary local evidence, not durable
artifacts. Website browser acceptance covers existing behavior, not the proposed
orthographic style or all workbench interactions. An initial preview invocation
omitted SITE_BASE and failed; the corrected production run passed. Expected failure
scenarios emit console errors. Repeated undefined material-map warnings are a
cleanup opportunity, not an observed rendering failure.

The Node command wrapper used a reserved zsh variable after npm finished; its
wrapper status is not the test status. The test runner summary is authoritative.


All four skill packages passed the bundled skill-creator `quick_validate.py` in a
throwaway Python environment (`/tmp/levelspec-skill-validation`). System Python lacked
PyYAML; installing it there changed no project dependency. Local Markdown links in
skills, AGENTS.md and plans resolve. The validator checks structure, not usefulness;
independent exercises supply behavioral evidence.

## Limits

No native Blender bake or BSP importer was independently executed for this audit.
Algorithm proofs, exhaustive mutation testing, repeated GPU/WASM leak testing and
all browser/platform combinations were not established. Production browser/style
results are distinct from source inspection and recorded in the linked browser
audit and independent skill exercises.

## Phase-two follow-up

Retained XML public exports and helpers now enter typecheck (IA-04/T-03).
The XML exporter no longer imports legacy box/volume helpers (T-04).
See [phase-two validation](phase-two-validation.md) for current evidence and limits.
Original phase-one observations above remain historical.
