# Daiban coupled-route tools: independent implementation review

**Final bounded tool disposition: accepted at the final identities recorded below.** The original findings and intermediate revise decisions remain preserved as historical evidence. The packet, primitive wrapper and assessment-v3 repairs pass independent follow-up. This does not release GD/GD2, accept a merged architectural model or resolve source/clearance blockers.

Applied readable-TypeScript guidance to the project-local MJS and reference-level-authoring/test guidance to the geometric boundary. Read the independent pre-test assessment and `STRUCTURAL-RESPONSE-v2`. No production, core, canonical, frozen packet or server edits were made. Reviewer-only evidence is under `generated/daiban-global-route-tools-implementation-review/`.

## Reviewed identities

- `global-route-construction-v1/packet.py`: SHA256 `89a1620505a43574ee4ce1fe19f63c101d74a05f7a5db75c5692539c943976a0`.
- `global-route-actual-assessment-v1/audit.mjs`: SHA256 `dc4841aef3f78fb0cf1858769c3031e6eb9b28dddd417309e7416e756e9b059c`.
- `global-route-actual-assessment-v1/geometry.mjs`: SHA256 `448cf59c07de3d30e5874ae8a9a80914d28af2278412e9ffa4b0c6fc2a5742d7`.
- `global-route-actual-assessment-v1/controls.mjs`: SHA256 `f49ecba3cb570e2b95043e8cc9b33daf9f4a181fa2918aa79de5f28c23a65276`.

## Material findings

### P1 — normalized companion aliases can overwrite retained bytes

The packet records ownership by the original reference string but writes through `Path`, which normalizes aliases. A retained texture at `assets/shared.bin` and a study texture at `assets/./shared.bin` with different bytes are accepted as separate keys; both write the same output file. The merge succeeds and the retained baseline reference silently resolves to the study bytes. This violates conflicting-byte rejection and retained companion ownership even though both source trees remain unchanged.

Reproducer: [packet-alias-probe.py](../../generated/daiban-global-route-tools-implementation-review/packet-alias-probe.py). Actual result: [packet-alias-da9ttwil/RESULT.json](../../generated/daiban-global-route-tools-implementation-review/packet-alias-da9ttwil/RESULT.json).

### P2 — companion can claim the output XML filename

A study companion referenced as `level.level.svgx` is copied and its held hash recorded. The final XML write then overwrites that file. Merge returns success while the archived file disagrees with its recorded companion hash. Reserve output ownership and apply it to actual normalized/aliased destination paths; do not merely add a string comparison for one spelling. An existing output must remain rejected, and failed staging must never be presented as a complete packet.

Reproducer: [packet-probes.py](../../generated/daiban-global-route-tools-implementation-review/packet-probes.py). Actual result: [packet-a9ne_aph/RESULT.json](../../generated/daiban-global-route-tools-implementation-review/packet-a9ne_aph/RESULT.json).

### G1 — summed support areas can accept a half-unsupported footprint

`sweptSupportArea` sums clipped triangle areas over the entire admitted Z band, rather than measuring unique supported XY coverage. Two supports can overlap in XY at distinct allowed heights without being coplanar duplicates. Two left-half supports at Z 0 and 0.1, admitted by step 0.2, produce actual area `0.1964196624778356` versus expected disk area `0.19641966247783546`. The audit's area expression passes within tolerance even though the entire right half has no support at any admitted height.

This is a concrete false acceptance by the full-footprint support operation. It is not a demonstrated whole-audit PASS: other checks may reject a particular complete fixture. However, passing cell/probe checks cannot establish the claimed full swept-disk support when this operation counts overlapping support twice. Preserve a meaningful negative control alongside a coherent positive and legitimate adjacent-step support; do not shrink the body or relax void coverage.

Reproducer: [probes.mjs](../../generated/daiban-global-route-tools-implementation-review/probes.mjs). Actual result: [SUPPORT-OVERCOUNT.json](../../generated/daiban-global-route-tools-implementation-review/SUPPORT-OVERCOUNT.json). Producer and root notified; frozen v1 preserved.

## Additional coverage boundary under discussion

Additional actual/retained stairs in `extraIds` are represented by one centroid standing pose per Z. They are appended after the main/right/white vertical-transition construction. Consequently these extra stairs do not receive between-tread continuous sweeps or vertical-transition sweeps. This is narrower than a full traversal check of every proposed occupied stair. The producer has been asked to clarify or repair this boundary in a successor. No whole-audit false PASS is claimed from this observation alone.

## Checks that are sound within their stated boundary

The upright-cylinder surface method clips actual triangles to the world-Z body slab and computes projected polygon-to-segment distance, covering off-center collisions across the complete circular radius without radial spokes. It includes rendered `collision="none"` geometry. Per-triangle support exclusions leave taller faces/other retained owners as obstacles. Verified closed groups receive containment tests, preventing the basic body-wholly-inside-a-closed-box escape. Closedness is only recognized for welded, oppositely paired mesh edges; unverified/open groups do not receive a solid-containment claim.

Actual profiles are compared to frozen nominee expectations, rather than generated guides; portal probes and strict geometry diagnostics supplement area checks. Actual XML and GLB bytes used by compilation are held and archived; a changed input at final hash verification fails. Baseline retained-owner checks compare actual declared transforms/material/collision and asset bytes. Geometry-only results remain separate from runtime/navigation and source fidelity. The default GD identity is pinned; explicit successors are data inputs, not architectural approval.

The packet uses a fresh output, verifies the caller-nominated freeze, deep-copies study XML, rejects absent retirement targets and conflicting IDs, and preserves input trees. Those useful controls do not cover P1/P2.

## Independent execution

- Packet exercise passed: `global-route-packet-controls/run-t1hp5nwy/result.json`.
- Three audit control families passed: `global-route-actual-assessment-v1/controls-vV7uqB/controls.json`.
- Archived GD retained control confirmed the actual higher-flight obstruction: `gd-control-ymod82/gd-retained-control.json`; minimum conditional headroom **1.539999933 m**, owner `C-Rail-lower-flight-fragment`, foot `(4.518103375, 2.168181818, 2.28)`. This is a failing-control success, not architectural acceptance.
- The old local r02 XML against global GD correctly exited 1 with `ACTUAL_GEOMETRY_FAILED` and 238 failed checks: `actual-bnBH4n/audit.json`.
- An explicit isolated contract with an incorrect nominee hash correctly exited 1, recording `AUDIT_FAILED_NO_PASS`: `plan-E0nlw5/failure.json`. No plan/geometry PASS was emitted.

All execution paths above live under ignored `generated/dai2-daiban-review/` unless linked otherwise. Required successor follow-up is confined to the reported ownership/support boundaries, meaningful regression controls, and a fresh independent review. GD remains unreleased; no merged model was generated or approved.

## Bounded successor follow-up, 2026-11-01

**Original P1/P2 and G1 are repaired at the reviewed successor identities below. Final acceptance remains pending the newly reproduced output-root ID and empty proposed traversal cases.** Frozen assessment v1 is preserved. Frozen assessment v2 SHA256 is `2dc81e4d4941b386006124460d74b2d1dc8b5eb8f24a7859aa43f1c058172cfa`; every listed file matches.

### Packet corrections checked

Reviewed helper SHA256 `f35ccb2188b3877138157e74b3a8e10312e69b9b026c07eadadd43938420f1de` and exercise SHA256 `258979ac8b250847db95d36b9d69c663c62dd5f70e0cb286eec484ddc468ef81`. Independently reran all 24 control groups at `global-route-packet-controls/run-5rinb3gi/result.json`.

Normalized portable case-folded destination ownership now rejects conflicting `assets/./shared.bin` and `ASSETS/shared.bin` aliases. Literal, `./` and case aliases of the output XML are rejected before copying. Backslash paths reject. Successful companion writes use the held bytes that were hashed. Deep copies preserve the caller XML tree. Baseline duplicate IDs reject before retirement; study duplicate/conflicting IDs reject; all unretired asset declarations and their companions now remain, including preexisting unused assets. Cleanup requires explicitly retiring an asset ID. These are coherent corrections at the original ownership boundary, without geometric scope expansion.

Independent forward probes confirm all original alias/reserved cases now reject and preserve both input trees. See [followup/packet-7in24gaq/RESULTS.json](../../generated/daiban-global-route-tools-implementation-review/followup/packet-7in24gaq/RESULTS.json).

**P3, remaining:** the fixed output root ID is assigned after duplicate checking. A retained baseline child with `id="daiban-coupled-global-study"` passes all checks, then the output root is renamed to the same ID. The successful output contains duplicate IDs. The same result file reproduces this. Reserve/validate the resulting root's ownership as part of global ID checking; preserving an existing valid child cannot silently make the final document invalid.

### Unique support repair checked

V2's uncovered-region subtraction is mathematically appropriate. Starting from a convex circumscribed capsule, each admitted triangle partitions each remaining convex piece into disjoint outside pieces; subsequent triangles cannot count covered XY twice. Positive-area residuals are then tested against the true circular capsule. Thus polygon excess outside the true radius need not fail, while an internal slit cannot be erased by a total-area tolerance. The explicit one-micrometre boundary tolerance and positive-area cutoff remain numerical limits, not source metric confidence.

I reran my original two-left-half/different-height case directly against v2. It now rejects and measures only `0.0982098312389177 m²` unique support. Five producer control families independently passed at `global-route-actual-assessment-v2/controls-KGxYJ9/controls.json`, including reversed order, full support, legitimate adjacent steps, a 0.2 mm interior slit and true-circle boundary contact. See [followup/GEOMETRY-PROBES.json](../../generated/daiban-global-route-tools-implementation-review/followup/GEOMETRY-PROBES.json).

### Occupied-use scope and remaining traversal omission

Explicit frozen owner/use roles are a sound scope correction. Proposed walking paths, required owners and native classifications are checked independently from construction priors. Actual top-boundary splitting now creates between-tread intervals and actual vertical transitions rather than only centroid standing poses. Native portals/tread levels and independently required middle intervals guard partial-path omissions. Construction-prior diagnostics are labeled non-gating, while their material remains an obstacle. This is bounded route acceptance, not a declaration that every retained mass is inhabitable.

**G2, remaining:** zero-XY legs are silently skipped by `actualTraversal`. With the actual compiled GLB asset control and a required proposed path `(-2, 0.5, 0.6) → (-2, 0.5, 0.4)`, `occupiedTraversals` returns `passed:true`, no issues and zero segments. That required proposed use receives no support/body check. Another ordinary valid use can satisfy the global nonempty-segment condition. Native coverage may catch the analogous native case, but this asset case has no FloorPatch and bypasses it. A requested degenerate/vertical-only path must either resolve into checked supported poses/transitions or fail explicitly; zero checked extent cannot be reported as passed occupancy. Frozen v2 remains unchanged and producer/root were notified. Reproducer: [followup/geometry-probes.mjs](../../generated/daiban-global-route-tools-implementation-review/followup/geometry-probes.mjs).

The independently rerun archived GD retained control still reports the known `1.539999933 m` blocker: `global-route-actual-assessment-v2/gd-control-8a31X8/gd-retained-control.json`. No actual successor trial or architecture is accepted.

### Primitive emitter boundary

Reviewed the new project-local `geometry.py` at SHA256 `061f7ab9d9221077fa57b1da208fb33f9859c0b0ca475b3f1ca9ae02dc792e52`. Its coordinate transforms reuse the repository GLB/domain path; no axis conversion was moved into the compiler. `cross_section` now has an independent actual public-compile mathematical check: bounds X `[7,8]`, Y `[-1,-0.5]`, Z `[2,3]`, volume `0.5 m³`, no geometry diagnostics. This closes the stated syntax-only coverage gap, without generating architectural geometry.

One material contract needs a bounded decision: `unite` accepts two shared-material white prisms and successfully unions them, but then `self.mesh(result_name,path)` silently emits tile. The docstring says tile solids; if that restriction is intentional, reject non-tile nominations. Otherwise retain the validated shared material. Do not silently change an accepted material. Evidence: [followup/primitives-55429kau/RESULT.json](../../generated/daiban-global-route-tools-implementation-review/followup/primitives-55429kau/RESULT.json) and [PUBLIC-GEOMETRY.json](../../generated/daiban-global-route-tools-implementation-review/followup/primitives-55429kau/PUBLIC-GEOMETRY.json). Root notified; emitter code untouched by this review.


## Final bounded adjudication — all reported tool findings closed

**Accepted for the reviewed project-local tool contracts. No material implementation finding remains from this review.** This is not an actual architectural-trial PASS. Original failing probes and frozen v1/v2 are preserved.

### Final identities

| Tool | SHA256 |
| --- | --- |
| `global-route-construction-v1/packet.py` | `8d189f6221c3df7a8fd5fbe0bf25e6dfa1fd435d68bf6a308b4d78e285e65026` |
| `global-route-construction-v1/packet.exercise.py` | `b7e0ae3214d46548f3d4b9f5781a59a94e63ce1779d28d07e3a1efb17ef4b4cc` |
| `global-route-construction-v1/geometry.py` | `e5f15d65e3cb8e40f051e0701d84781a6e702b4bcffc73c26a4b0f30a03c8977` |
| `global-route-actual-assessment-v3/FREEZE.json` | `7dbdf8a831a4ad59fab3dc7cc98349c7ee4e5f179d88cba8eb76dd28ffb5270d` |
| v3 `traversal.mjs` | `372f52872735ba92a3c763b07b0ddea7b953f6bb645a6e8ba2f1c1e7aea9cfe9` |
| v3 `geometry.mjs` (byte-identical to v2) | `d8187127db278dec70f289e5b5b6a06ddccab1f99af281c502fa0ea29c3eeb29` |

All v1/v2/v3 frozen file entries match. [Final freeze checks](../../generated/daiban-global-route-tools-implementation-review/final/FREEZE-CHECKS.json) retain identities and per-file hashes. No frozen revision was edited during review.

### Packet P3 closure

The resulting level ID is checked against every surviving child declaration after merge but before output creation. This covers both retained baseline declarations and new study declarations. My original baseline-child case and the additional study-child case now reject with the intended `ValueError`; neither creates an output directory. Both inputs remain unchanged. Ordinary merges and a baseline whose root already has the resulting level ID still succeed with globally unique IDs. See [final packet probes](../../generated/daiban-global-route-tools-implementation-review/final/packet-tg39cezw/RESULTS.json) and [reproducer](../../generated/daiban-global-route-tools-implementation-review/final/packet-probes.py).

I independently reran the complete expanded packet exercise: all **27 control groups pass**, `global-route-packet-controls/run-ec4vcu_1/result.json`. I inspected the test reviewer's final additional root-already-owning-ID positive and no-output/input-preservation assertions before this run. The earlier normalized/case alias, reserved filename, explicit retirement, unretired asset and input-preservation contracts remain protected. Failed partial staging is still not transactional cleanup; success records belong only to completed calls and reusing an existing output remains rejected.

### Primitive material/shared-asset closure

`GeometryStudy.unite` retains the input material after the subprocess has validated that every nominated solid shares it. It still requires one successful physical component. Retired asset declarations are removed only when no remaining prop refers to them. The change belongs at the caller's asset/material ownership boundary; it does not modify compiler collision behavior or geometry semantics.

My independent control repeats the two overlapping white unit prisms. The actual compiled union keeps white material and solid collision, with volume **1.5 m³**. A remaining translated instance of the selected first asset keeps its exact declaration/transform, shares the retained asset, and compiles with expected bounds `[4,0,0]..[5,1,1]`, volume **1 m³**. The now-unused second asset declaration is retired. Cross-section bounds `[7,-1,2]..[8,-0.5,3]`, volume **0.5 m³**, remain correct. Public geometry compilation has no diagnostics. This is a mathematical fixture, not architectural generation.

Evidence: [primitive XML ownership result](../../generated/daiban-global-route-tools-implementation-review/final/primitive-l7lgijge/RESULT.json), [combined actual geometry results](../../generated/daiban-global-route-tools-implementation-review/final/GEOMETRY-PROBES.json) and [primitive reproducer](../../generated/daiban-global-route-tools-implementation-review/final/primitive-probes.py).

### Assessment G2 closure

V3 explicitly records an issue for a zero-XY input leg with changed Z. Actual riser transitions continue to be derived from resolved top geometry, not from accepting a caller's vertical teleport. True duplicate XYZ waypoints are skipped without erasing the ordinary traversal. Independently, every proposed use must resolve at least one actual audited segment; a second valid use can no longer mask an empty one. Diagnostic priors remain explicitly non-gating and are not mislabeled as clear proposed routes.

I reran the exact original required-asset path `(-2,0.5,0.6) → (-2,0.5,0.4)` with another valid route present. It now fails with per-use issues, including the unsupported vertical leg and zero actual audited traversal. A duplicates-only requested path also fails. The ordinary GLB route with duplicate waypoints passes and preserves its **two actual-derived vertical transitions**. The original half-support counterexample continues to fail under the unchanged unique-coverage math. See [final geometry probes](../../generated/daiban-global-route-tools-implementation-review/final/GEOMETRY-PROBES.json) and [reproducer](../../generated/daiban-global-route-tools-implementation-review/final/geometry-probes.mjs).

I independently ran all six v3 control families: `global-route-actual-assessment-v3/controls-nuqdCX/controls.json`. The archived GD retained test still confirms minimum conditional headroom **1.539999933 m**, owner `C-Rail-lower-flight-fragment`, at foot `(4.518103375,2.168181818,2.28)`: `gd-control-xcKCXc/gd-retained-control.json`. This confirms preservation of the failing control, not a successful coupled trial.

### Remaining limits

The tools assess explicit nominated paths, finite contract profiles and actual loaded geometry. They do not select architectural depths, confer source approval on role labels, search every possible route, prove all-building inhabitability, establish gameplay reachability or replace actual frozen model captures. Geometry audit textures are outside its geometry-only input contract; body-boundary and Float32/authoring tolerances remain explicit. Missing source-backed upper-apron/context and stacked-clearance adjudication retain their independent release authority. No canonical/core/server changes were made by this review, and no architectural family or merged model is released by this tool acceptance.
