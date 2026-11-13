# Reference-camera precision: preimplementation test review

Date: 2026-11-03. Independent reviewer: `h2_test_review`.

Status: **PASS for preimplementation test design and the proposed test diff.** The final follow-up below resolves the material coverage and range questions. This review does not approve the courtyard geometry, photograph match, camera calibration, or PR13 score.

## Scope and evidence

Applied `maintain-tests` and `write-readable-typescript`, with repository AGENTS guidance. Inspected `precision.ts`, reference validation/projection, XML parse/serialize, compiler normalization, reference preflight, existing reference tests, core XML tests, and current SVGX/reference-authoring documentation.

The intended contract is calibrated reference-camera metadata surviving public XML parse, serialize, and compilation at JavaScript number precision. Geometry retains its millimeter lattice. This is a correction at the public metadata boundary, not a saved-XML postprocessing workaround.

`normalizeCoordinates` currently clones the document and snaps reference-camera position and target on all three paths. Existing camera roundtrip tests use integer coordinates; existing independent Three.js projection coverage exercises only unsaved in-memory references. Both pass despite this defect. Existing primitive-coordinate tests protect part of the unrelated geometry contract. The focused baseline command `node --test --test-name-pattern='reference views|snaps primitive dimensions' tests/vector-reference.test.ts` passed all 7 selected tests.

A read-only reproduction established that position `[0,0,0]`, target `[0,.0001,0]`, up `[0,0,1]` passes reference validation. Serialization changes the target to the position; reparsing rejects it and direct compilation produces a `REFERENCE` error. This is a legal short viewing vector, not a geometry dimension or near-plane distance.

## Material requirements before implementation

1. **Exercise each public normalization boundary.** A small generic scene and a fractional, off-axis, rolled camera should establish exact preservation of position, target, up, FOV, near, and far through direct compilation and serialize/reparse. Include raw XML containing the exact pose, so a serializer that still rounds cannot hide a parser defect. Preserve source dimensions, image identity, masks, and scale provenance. Assert a second serialization is identical to the first and caller-owned input remains unchanged. Do not compare entire parsed documents with authored ones: parsed source locations are legitimate additions.

2. **Use independent world-to-image expectations.** Project several fixed world points spread across a well-conditioned visible frame using an independently configured Three.js perspective camera from the original full-precision pose. Check positive depth safely beyond the near plane, `inFrame`, and pixel agreement for parsed and compiled references. Use points independent of the serialized reference's stored landmarks and do not generate expected pixels from `projectReference` on the roundtripped camera. State the pixel tolerance; roughly `1e-8` pixels is ample for ordinary coordinates and must be far below the known millimeter-quantization error. Existing Three.js coverage already owns general projection mathematics; extend that coverage across persistence rather than duplicating the entire projection suite.

3. **Protect the valid short-baseline case.** A target differing by about `.0001` m must retain direction and pass parse/compile. The existing `<1e-8` degenerate-direction rejection must remain. Also preserve zero/parallel-up and nonfinite camera, invalid FOV, and invalid near/far rejection at the appropriate public boundaries. A serializer historically does not perform all semantic camera validation; do not accidentally expand this change into a wholesale serializer-validation rewrite.

4. **Retain magnitude rejection without quantizing the camera.** Calling `snapCoordinate` currently also rejects nonfinite values and position/target magnitudes exceeding `(Number.MAX_SAFE_INTEGER - 1) / 1000`. Simply deleting the camera assignments silently removes that rejection from serializer/compiler paths. `validateReference` alone does not substitute for it: a position at `Number.MAX_VALUE` and opposite target currently passes its finite/degeneracy checks but yields NaN projection; normalization presently rejects it. Keep the existing accepted magnitude domain and test an ordinary precise accepted value plus oversize/nonfinite rejection. Preserve error behavior sufficiently for callers; source-linked reference diagnostics should remain available on parse. Widening this domain would require separate numerical design and is unnecessary for calibrated building cameras.

5. **Keep geometry and landmarks scoped.** Verify at least one ordinary authored vertex/dimension and a fractional landmark position still snap to the independently specified millimeter values on parse/serialize/compile. Existing primitive tests additionally cover primitive dimensions and dimensionless asset scale. Leave landmark world-position behavior unchanged in this bounded correction: it is separate from camera pose, and no camera-persistence requirement forces changing it. State this distinction in documentation so full-precision camera preservation is not misread as full-precision survey-landmark preservation.

6. **Preserve identity semantics.** The original scene with only camera metadata changed should retain geometry hash and geometry output. If asserting persisted whole-source identity, use the public compiled/source representation that actually contains metadata; `geometryHash` deliberately excludes camera values. Do not invent a new camera-specific cache or output format for this fix.

## Minimal coverage and documentation

Keep tests under the existing reference feature ownership, using the small real scene fixture and public imports. A handful of focused cases can cover persistence/projection, the short baseline, scoped snapping, and table-driven invalid values; do not replicate the complete runtime, navigation, browser, or reconstruction suites. Running the existing projection, XML, and primitive tests plus relevant type checks is appropriate after the fix. A pure metadata normalization correction does not require a browser test to prove camera math.

The authoritative camera declaration and reference-authoring guide should explain that calibrated pose values preserve number precision while authored geometry and currently landmark world positions retain their existing lattice. Update the broad normalization comment if it would otherwise imply all linear-valued metadata is snapped. The FOV remains vertical degrees; domain coordinates remain meters and right-handed Z-up. Do not claim calibration or photographic acceptance from precision preservation.

## Review boundary

No production, checker, model, frozen ledger, or saved candidate was changed by this reviewer. The independent implementation review remains a separate requirement after the fix.

## Final proposed-test follow-up

Reviewed the three new cases in `tests/vector-reference.test.ts` before production changes. The public raw-XML parse, serializer/reparse, and direct compilation paths are represented. Exact camera fields, visible-point projection, source immutability, serialization idempotence, unchanged reference evidence, landmark/vertex snapping, and camera-independent geometry identity have meaningful assertions. The separate legal `.0001` m target and finite/safe-range cases cover the changed contract without repeating the whole reference suite.

One material test issue was corrected before signoff: parsed masks legitimately gain `source` locations, so comparison now strips that metadata while retaining all semantic mask fields. This avoids a test that rejects a correct parser. No production change was needed for it.

Independently projected the four proposed fixed points using the original camera and Three.js: all lie in-frame, with depths from `12.438751891855798` to `16.71277500377709` m. Maximum observed disagreement is below `2.3e-13` pixels. The proposed `1e-8` pixel tolerance is well-conditioned and materially tighter than millimeter camera quantization. `projectReference` exposes the tested `depth` field directly.

Executed `node --test --test-name-pattern='preserves calibrated|keeps legal submillimetre|retains finite and safe-range' tests/vector-reference.test.ts` against unchanged production code. All three fail for their intended reasons: rounded pose, collapsed legal direction, and altered accepted near-range coordinate. Existing semantic validation and primitive snapping coverage remains in place. The proposed private finite/range validation shared with the existing millimeter conversion, while checking camera coordinates without assigning rounded values, addresses the identified range consequence without broadening the accepted domain.

**No material test-design findings remain.** Proceed with the bounded production fix and documentation, then run the proposed tests and relevant existing checks. This signoff is preimplementation coverage review, not a claim that the fix already passes.
