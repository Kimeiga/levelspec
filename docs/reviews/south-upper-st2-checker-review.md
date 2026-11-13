# ST2 saved-geometry checker review

Date: 2026-11-03. Independent reviewer: `h2_test_review`.

Status: **PASS for the bounded checker revision and final saved-geometry evidence.** The three code findings below are resolved, and final outputs are independently verified. This is not source-photo, full-building, FPS, or strict compiler acceptance; seven strict compiler errors remain FAIL.

## Reviewed scope

Reviewed the six scripts in `projects/dai2-daiban/studies/multiview-restart/reviews/south-upper-st2-checks`, their H1 predecessors/diff, frozen-input bindings, and the imported `model-r09-checks/check.py`, `mesh_audit.py`, and `model-r06/probe.py` contracts. Applied repository test-review guidance. No scripts or model files were edited by this reviewer.

The selected drawing is SHA `fbc514bf94b9ccda80ae43956163c5945151bfe4961a231269b370e807d9de11`; retained r09 geometry is pinned to SHA `9e161685504b256818c60bfe7ae194952e61b8231eeb991e45a95b2fb3930f79`. The new model does not supply expected wall bounds or expected aperture depth.

## Structural coverage

The oracle combines actual pinned r09 context with analytic ST2 floor/wall/T intervals and removes the independently identified retired band. The old BR-S2 floor is contained by ST2 plus retained GW-ARR2, as established in the prior drawing review. Complete closed mesh groups are selected before ray pairing; faces are not truncated to the test window. Interval checks retain separate endpoint and interior-gap tolerances and reject positive overlap and odd mesh crossings.

Adding both old H1 and new ST2 boundaries to arrangement stations makes obsolete extents observable. Explicit checks distinguish removed north slab/flank/deep hanging wall from the required new fascia at Z8.6 and retained arrival support. Native-floor checks use compiled walking triangles instead of assuming a visible slab creates a walking surface. These remain sampled tests; they are not a continuous geometry or circulation proof.

The T window is consistently `[2.58,3.02]`, encompassing the frozen `[2.60,3.00]` finite depth with `.02` m margins. Saved-package extraction selects whole mesh groups touching that window. Both stem and foot receive full-depth and near-band refill controls, so the previous too-far-Y window cannot pass merely by overlooking new near material.

The 20 intended material controls require an unmodified witness to pass before a mutation counts as detected. Restored obsolete H1 cells additionally require occupancy in the actual pinned r10 predecessor. Actual old floor/guard restoration and duplicate actual floor faces are meaningful controls. Both visual and static-collision filtering are exercised. The saved collision-box control separately tests public XML/asset replay while requiring unchanged visual triangles and newly occupied collision apertures.

Retained-object fingerprints preserve triangle winding, geometry, normals, UVs, and surface semantics for exact matches, independent of owner names/order. Section comparison outside the bounded change window protects the shared native floor geometrically. Existing positive controls for owner rename and source offsets help avoid overfitting to incidental identifiers. Section images are inspection evidence, not numerical pass criteria by themselves.

## Material findings

1. **Stale checker reports could satisfy package acceptance.** The package adjudicator records the current loader SHA but initially did not compare each reload report's `checkerSHA256` with it. Require that comparison for all four runs. Conformance also originally recorded only its own source hash despite importing the operative ray/interval/audit code. Root has added identities and unchanged-during-run checks for all three local dependencies; the negative-control prerequisite must verify those identities, the unchanged flag, expected purpose, and baseline identity before consuming a claimed passing report. Recreate reports after these checker changes; recording current hashes beside old results is insufficient.

2. **Package success was broader in wording than in behavior.** `reload_subject.success` originally meant geometry hash present and no `ASSET` errors; other compiler errors remained in diagnostics without affecting that flag. This can be a legitimate package-integrity result, but it must be named/scoped accordingly, with strict compilation reported separately. Known strict errors must remain explicit FAIL, never waived by replay or aperture control success. Parent reports seven existing strict gaps; this bounded review does not request unrelated repairs or reinterpret them as PASS.

3. **The shared-floor fallback could hide retained material changes.** Read-only reproduction changed the material of actual development-01 owner `mv/floor-z8970/part17` to `default`. Its bounds extend to Y9.553, well beyond ST2, yet `compare_objects` and all visual/collision retained sections passed. The allowed shared-floor geometry fallback exempts its full attribute fingerprint, and section geometry cannot detect material changes. Protect unchanged outside-window surface semantics (material/role/visibility/collision/dynamic) with a scoped comparison and discriminating control. Do not claim full normals/UV preservation for retessellated exempt floors without corresponding evidence; narrowing that claim is preferable to unrelated infrastructure.

## Acceptance limits

Development-01 sampled conformance is preliminary; it predates corrected camera metadata and checker changes. Parent identifies final development/reload-02 compiled SHA `37b872405e7f59b7db84b7198a6f5cecfd5c5db41610e7245818376df5441536`, with unchanged geometry identity. Final reports must bind those exact compiled bytes and the corrected checker/dependency versions. PR13 diagnostics, reference-image agreement, body clearance/FPS, and strict compiler outcomes remain independent gates.

## Correction follow-up

Approved the exact checker/helper/drawing manifest SHA `de93ff20bb753bf1da8ca7720e2fffec4065f6dd870f6a0308c753ff84ab889c` for final execution. Independently verified all 11 entries against current files with zero mismatches.

The package consumer now requires each raw report to identify the current loader and declare `saved-package-integrity-only`; strict errors and a separate strict pass flag remain visible. The conformance prerequisite checks the expected purpose, pinned baseline, exact dependency hash map, and unchanged-during-run flag. The three operative local dependency files are covered.

The changed shared-floor fallback now requires the pinned baseline's uniform kind/role/material/visibility/collision/dynamic contract over the whole changed floor group. Exact normals/UV claims are explicitly limited to unchanged fingerprint matches. Independently repeated the original development-01 material mutation: unchanged candidate comparison passes; changing `mv/floor-z8970/part17` material is now rejected and identifies that owner. The saved seven-case retained-control result also passes, including the new shared-floor material case, with retained checker SHA `418001f2e7313d513cb3491f6f7625a8811125e7523c5a7bd1c95baf040fe6e3`.

No material code findings remain for this bounded checker revision.

## Final output review and evidence freeze

Independently verified final source-package freeze SHA `a96e0c7d3ab470405ac1f9f214e12986a2c2e17c59791cc61b209a084f864610`, all 145 contained file hashes, compiled SHA `37b872405e7f59b7db84b7198a6f5cecfd5c5db41610e7245818376df5441536`, and the current 11-file checker input manifest. Package baseline replay reads all 126 expected assets and reproduces those exact compiled bytes.

Checked row-level results and recorded current script/helper hashes, not just summary booleans:

- `conformance-01`: 3,856 visual and 3,856 static-collision checks pass, including native floor support, required fascia/front, obsolete H1 absence, and retained arrival support.
- `negative-controls-01`: all 20 visual/collision mutations are detected; the near-side T refills and obsolete material controls retain their positive preconditions.
- `retained-context-01`: 10,985 exact unchanged objects, unchanged retained materials/player, accepted shared-floor semantic contract, and all four retained contours pass. The unmatched groups are confined to the declared bay and shared floor.
- `retained-controls-02`: all seven cases pass, including the material-change counterexample, deletion/duplication, and collision removal. This uses the pinned r09 baseline; a prior wrong-baseline invocation is not counted as evidence.
- `package-controls-01`: all three failure controls pass and all four baseline replay flags are true. Raw report hashes match the adjudicator's inputs and every loader hash matches the reviewed loader. The report explicitly retains `strictGeometryBaselinePass: false`, seven errors, and `modelAcceptanceEvaluated: false`.

Personally inspected all ten final PNG cuts against their cyan frozen-drawing contours: P01, upper slab, lower bridge, S01-A/C/T, near/interior/far T planes, and retired-deep-fascia plane. Within the ST2 scope, black saved-mesh contours agree with the expected contours. The longitudinal cut keeps the lower bridge separate; the three T planes show consistent finite opening depth; Z8.30 has no obsolete front/hanging wall. The upper slab's retained western connection explains why the cyan nomination boundary is internal to the larger black floor footprint. Extra black context outside ST2 is actual retained geometry, not a contour mismatch. These selected cuts do not resolve photograph fidelity or establish unrestricted human traversal.

The review/evidence manifest is `projects/dai2-daiban/studies/multiview-restart/reviews/south-upper-st2-checks/CHECKER-REVIEW-FREEZE.json`. It binds this review, scripts/helpers/drawings, final reports, raw package inputs/results, and all ten PNG/SVG cuts. **No remaining material findings within this bounded checker review.** Source comparison, PR13 interpretation, whole-body/FPS checks, and the seven strict gaps remain separate gates.
