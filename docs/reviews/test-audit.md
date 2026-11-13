# Independent test audit

Reviewed baseline: `0bd3d76`, branch `codex/xml-cli-harness-next-phase`.
Guidance applied: SnapEngineJS `maintain-tests`, then the adapted local skill; review performed independently of
implementation audit conclusions. Production code and tests were not changed.

## Coverage and method

Inventoried all 22 root Node test files, six website Node test files, five browser
scripts and their helper. Read test discovery, TypeScript configuration, both
acceptance workflows, and representative bodies across every group. Detailed reads
focused on XML compilation/navigation, clipping failure/retry, collision semantics,
export preservation, CLI execution, website parameter matrices, reference fitting,
bake binding and browser readiness/input helpers. This is a subsystem audit with
sampled assertions, not a line-by-line correctness proof of all 7,849 test lines.

Not independently established here: mutation-testing effectiveness, actual renderer
fidelity to original architectural photographs, native Blender/Quake execution,
all browser/platform combinations, or allocation leakage under repeated GPU/WASM
operations. Browser execution is owned by the phase coordinator; source inspection
here does not establish its results.

## Discovery and execution

- `npm test` discovers `tests/*.test.ts` only; `test:vector` selects the XML subset.
- `npm run test:site` separately discovers website Node suites, concurrency two.
- `test:site:browser` runs experience, walk timing, general browser, walk stability,
  then graphics scripts sequentially. Each uses a real Chromium browser.
- The website workflow runs all three layers and production builds. Reference
  authoring workflow runs Node tests/typecheck/viewer build, not browser acceptance.
- Root test/website baselines were launched for this audit; final results below.

## Findings

### T-01 — Medium: CLI integration coverage is success-only

Confirmed coverage gap, not a demonstrated CLI defect. `tests/vector-glb-cli.test.ts:31`
contains a single successful local GLB resolution case. It spawns the actual tool,
uses a temporary project, and checks output magic, which is a good boundary. It
has no subprocess assertions for invalid invocation, malformed XML, validation
failure, cancellation, missing native tool, or output preservation. Lower-level
export coverage does not establish process exit status or terminal output.

Follow-up: preserve this scenario and add a command-level matrix when the new CLI
contract lands. Assert documented exit codes, diagnostics, stdout/stderr separation,
paths with spaces, and success after a failed/cancelled run. Do not impose future
CLI JSON behavior on the current tool before its contract changes.

### T-02 — Medium: test execution concurrency differs between local and CI paths

Confirmed configuration inconsistency. `package.json` runs root tests with default
Node concurrency; `.github/workflows/website.yml` explicitly uses concurrency two
for native/WASM cost, while `reference-authoring.yml` invokes unbounded `npm test`.
This can make performance/resource behavior depend on the entry point. No specific
out-of-memory failure was reproduced in this audit.

Follow-up: choose one bounded root test command and reuse it in both workflows.
Measure before/after runtime; retain discovery and assertions. Do not remove slow
behavioral cases merely to speed the suite.

### T-03 — Medium: legacy production and tests are outside the TypeScript check

Confirmed coverage boundary. `tsconfig.json` includes vector tests and XML/browser
paths but excludes `src/core`, `src/generate`, `src/authoring`, and the five legacy
root test files. Node executes these via type stripping, so a green runtime run
and `npm run check` do not establish their static contracts.

Follow-up: label the limitation during transition; decide whether any shared
helpers survive XML retirement before deletion. Ensure every retained helper and
its tests enter the final typecheck. Avoid broad legacy type cleanup immediately
before intentionally removing those APIs.

### T-04 — Low: an XML export test still imports a legacy mathematical helper

Confirmed retirement dependency: `tests/vector-export.test.ts:28` imports
`signedVolume` from `src/core/mesh.ts` to independently check brush volume. Removing
legacy directories without accounting for this will break retained coverage.

Follow-up: keep the analytic volume expectation, relocate the required pure helper
or use a test-local independently specified calculation, then remove the old module
only after checking production consumers. The test is not legacy merely because
one helper is.

### T-05 — Medium: optional native integration remains conditional evidence

`tests/vector-export.test.ts:520` skips actual BSP2 compilation unless QBSP, LIGHT
and VIS paths are configured. Retain the skip and report it; portable export and
fake-process failure tests cannot establish real native compatibility. Bake checks
in `website/tests/bakes.test.ts` validate checked-in artifacts/checksums rather than
running Blender anew.

Follow-up: provide a separately named native integration job/run with explicit tool
versions when releasing affected exporters. Keep fast package/manifest tests local.

### T-06 — Low: camera-fitting synthetic expectations share the projection routine

`tests/vector-reference-fit.test.ts:39` generates landmarks with `projectReference`
and then fits them. This valid inverse-consistency check could accept a convention
error shared by projection and fitting. It is not proof of an independently
calibrated camera convention.

Follow-up: keep the inverse case and add a small analytically projected landmark
fixture (known center/right/up pixel offsets), including axis orientation and
intrinsic bounds, or retain calibrated external observations with provenance.
Do not replace the useful multi-view raster acceptance case with this test.

## Ownership and disposition inventory

All dispositions are recommendations for later work; nothing was deleted.

| Files/group | Disposition | Continuing guarantees / condition |
| --- | --- | --- |
| `core.test.ts` | Keep now; split then delete legacy-only cases at retirement | Box winding/volume/half-spaces and shared pure math survive where XML still uses them; naive compiler and grid DSL contracts may become obsolete. |
| `gates.test.ts`, `navmesh.test.ts` | Rewrite retained scenarios as XML; delete obsolete legacy-only paths afterward | Failed gates must not claim runtime validity; traversal abilities, actual headroom, disconnected surfaces, storeys and serialization precision remain meaningful. XML navigation tests cover several but not all special traversal expectations. |
| `levels.test.ts` | Rewrite selected acceptance fixtures, then delete legacy corpus loop | Preserve positive/negative runtime validity, finite geometry, route requirements, and export validity for retained levels. Naive comparison and removed CAD output assertions become obsolete. |
| `concept.test.ts` | Delete only with retired ASCII/concept generator | Its seeded generation success and section-spread promises belong to that generator. If an XML generator is retained, replace its end-to-end guarantees before removal. |
| `vector.test.ts` | Keep; reorganize by feature when touched | Parsing/source locations, geometry, corner treatment, spanning/anchored walls, UVs and revision contracts. Mixed concerns merit separation without arbitrary file quotas. |
| `vector-navigation.test.ts`, `vector-water.test.ts` | Keep | Clearance, steps/slopes, route reachability, cache invalidation, sealed/open separation, non-solid water and boat support. Water collision checks protect a continuing contract. |
| `vector-repairs.test.ts` | Keep; split numerical clipping from integration if expanded | Independent square/strip areas, endpoint/sliver behavior, complexity limits, abort, partial-cache rejection, retry and premap distinction. Direct pure clipping imports are appropriate. |
| `vector-floor-gaps.test.ts`, `vector-surface-contacts.test.ts`, `vector-seams.test.ts` | Keep | Separate geometric predicates: open vertical gaps versus same-facing overlap versus actual seam construction. Similar fixtures do not make these redundant. |
| `vector-flights.test.ts`, `vector-halfturn.test.ts` | Keep; consider merging halfturn into flight owner | Curved/tapered/reversed flights, tread shape, wall continuity, UV preservation and real routes. Preserve the halfturn's distinct geometric assertions during any move. |
| `vector-dust2.test.ts`, `vector-dust2-refinement.test.ts`, `vector-uv.test.ts` | Keep selected fixture coverage; group by spatial/export/UV contract | Named-map regressions encode real architecture, routes and precision. Merge only duplicated scenarios after mapping their exact expectations; do not keep an entire map solely for historical coverage if a smaller fixture proves the same contract. |
| `vector-reference.test.ts`, `vector-reference-fit.test.ts`, `vector-reference-acceptance.test.ts` | Keep | Camera math, scene props/collision/assets, construction helpers, cancellation and multi-view raster agreement are complementary; strengthen independent camera oracle per T-06. |
| `vector-export.test.ts` | Keep; split portable/native ownership when expanding | Real glTF validator and loader, texture orientation, volume/brush checks, process abort/timeout, atomic preservation and successful recovery. Native skip remains explicit. |
| `vector-glb-cli.test.ts` | Keep and expand | Real executable/local asset resolution; missing command-level failures described in T-01. |
| Website `state.test.ts`, `experience.test.ts`, `worlds.test.ts` | Keep; merge overlapping grid runs only after equivalence proof | URL bounds/roundtrip, actual geometry changes, blocked-route failure/repair, constrained walking, and style-dependent architecture. The 25-curve, 175-height/curve, and 350-other-style matrices overlap but differ in source generation and added assertions. |
| Website `courtyard.test.ts` | Keep | Canonical XML/authoring agreement, texture availability and structure validity. Serialized equality is an intentional fixture synchronization contract, not a source scan. |
| Website `bakes.test.ts` | Keep | Source/corner/material checksum coherence, usable atlas coverage and stale-bake rejection. Checksums prove binding consistency, not visual quality or fresh Blender correctness. |
| Website `walk-clock.test.ts` | Keep | Analytically expected displacement at multiple frame rates, sparse input, suspension boundaries and actual nav boundary. |
| Five website browser scripts and `browser-helpers.mjs` | Keep; consolidate common drivers only when repeated needs justify it | Browser input, responsiveness, downloads, offline/error recovery, context loss, visual style/bakes and animation sampling need real browser evidence. Existing readiness/frame helpers are preferable to arbitrary sleeps. |

## Strengths and limits

Meaningful failure and recovery already exist: exporter failure/cancellation preserves
old files and successfully exports afterward (`vector-export.test.ts:250`); clipping
budget failure clears its cache and retries (`vector-repairs.test.ts:93`); reference
asset cancellation is tested before/after host resolution (`vector-reference.test.ts:206`).
These should not be removed as historical bug checks. Most fixtures use real compiler
components, narrow numeric inputs, and seeded generation rather than fake engines.

The website parameter matrices offer broad deterministic coverage but cannot prove
unrestricted architectural inputs. The raster acceptance case uses real compiled
geometry and checked-in reference images; provenance and visual source fidelity need
human/reference review, not just low error scores. No blanket test-count reduction
or new test framework is recommended.

## Local skill exercise

Independently read the adapted `.agents/skills/maintain-tests/SKILL.md` and applied
its LevelSpec guidance to the existing water collision case, clipping failure/retry,
cache-change tests and test-disposition inventory. It correctly distinguishes runtime
JSON from authoring and movement support from exported collision. Its recovery guidance
selects observable successful retries already present rather than demanding private
allocation counters. No corrective change to the adapted guidance was needed. This
exercise establishes usefulness for these cases, not universal skill effectiveness.

## Baseline results

- Website Node suite: 24 tests passed, zero failed/skipped, 145.784 seconds.
- Root Node suite: 421 tests discovered; 420 passed, zero failed, one skipped
  (optional real BSP integration), 51 suites, 255.310 seconds.
- Logs: `/tmp/levelspec-phase1-node.log`, `/tmp/levelspec-phase1-site.log`.

The shell capture wrapper attempted to assign zsh's reserved `status` variable after
npm completed. Its resulting shell error is separate from the test runner summary;
both result counts above come from complete Node summaries in the saved logs.

