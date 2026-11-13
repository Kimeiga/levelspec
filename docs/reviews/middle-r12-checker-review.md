# Independent R12 middle-family checker review

Date: 2026-11-03. Reviewer: `h2_test_review`.

**Current verdict: revision02 approved for fresh full verification runs; final output review pending.** The initial findings below are preserved as history and are resolved for the bounded scope described in the follow-up. This is not candidate/model acceptance. No checker, compiler or model code was changed by this reviewer.

Reviewed `contract.py`, `verify.py`, `retained.py`, `cuts.py`, `negative_controls.py` and README against the frozen R05/R06 verification contract. Inspected targeted actual development03 results and lower-room, closed202 and return-depth section PNGs. Used small targeted counterexamples rather than rerunning the complete expensive suite. Final model/source/FPS acceptance remains outside this checker-code review.

## Material findings

### 1. Known-but-wrong semantics inside released masks can pass

`retained.py` computes `changedSurfaceContracts` but does not include those differences in its pass condition. Instead, changed material inside a released mask passes if that surface-contract tuple exists anywhere in the parent. This permits substitution of an existing masonry material for a changed closed leaf. Geometry-only interval checks cannot distinguish same-volume substitution.

Demonstrated with a targeted subset of actual development03 G303 and return triangles, retaining their real vertices, surface attributes and document. The unchanged subset passes. Changing G303's material from `door` to `structure` also passes, although `changedSurfaceContracts` identifies the changed leaf. Evidence: `generated/middle-r12-checker-review/g303-material-counterexample.json`. This is a demonstrated blind spot in the retained gate, not a claim that the entire current candidate suite was run with the mutation.

Require independent spatial/physical-opening expectations for G303 and retained lower door/window/infill families affected by rebuilt hosts, including closed collision and material/role semantics. Do not simply veto all prefix-level differences: harmless ownership reassignment can legitimately produce those differences. Do not rely on an owner-name lookup as the only identity of a physical leaf. Add the small G303 material counterexample as a discriminating control alongside D202.

`verify.face_contracts` also collapses every object's surfaces to the last tuple in a dictionary. A valid multi-surface object can carry different face materials; this loses the identity of the triangle actually hit. The targeted helper example in `targeted-helper-counterexamples.json` demonstrates that changing an earlier same-owner surface can leave the observed result unchanged. Preserve actual per-triangle surface semantics at extraction/hit time. Owner aliases or surface ordering must not change the answer.

### 2. The claimed finite standing-body prism omits the body fringe

The current XY prism `[7.8,8.65] × [6.25,7.15]` covers center-lane space, not the radius-.25 body footprint at its edge. At center `(8.65,6.7)`, feet5.145, height1.8, radius.25, an obstacle box X8.79..8.81/Y6.69..6.71/Z6.84..6.86 intersects the upper capsule. Its central point is about .215697m from the upper-cap center, less than the .25m radius. Yet `intersecting_triangles` reports zero intersections with the checker prism. The fixed branch rays also stop before that X fringe. Evidence: `generated/middle-r12-checker-review/targeted-helper-counterexamples.json`.

This demonstrates the clearance gate's incomplete footprint; it does not assert that arbitrary new geometry outside released masks would escape the companion retained check. Existing retained obstacles can also matter when a route/roof claim changes. Add explicit full-footprint/swept-body coverage for nominated standing poses and transitions, including perimeter and neighboring tread/soffit edges. Preserve normal body dimensions and actual nav-feet offset as a separate measured FPS requirement. A conservative geometric envelope is acceptable if its limits are stated and false positives are adjudicated geometrically. A few extra center rays are insufficient. Include the fringe obstacle as a targeted negative control.

### 3. D202's expected face set must include the released roof boundary

Independently inspected development03 visual and collision reports. Their fifteen blocking flags per purpose compare parent door faces at X8.90/9.08 with those same faces plus a `floor` face at X8.90 in the lowered roof interval. The R05/R06 contract expressly places the roof end at the closed leaf's host plane. The actual D02 and lower-room cuts are consistent with that zero-volume boundary contact.

Correct the oracle to retain the exact parent closed-leaf faces and additionally permit the independently released roof-boundary face only at its specified plane and overlapping Y/Z extent. Preserve per-face semantics; never permit arbitrary extra faces or `structure` refill by accepting supersets. Material-volume/multiplicity checks remain independent: a duplicate host behind a leaf cannot be waived as an acceptable face. Retain the changed-leaf-material control and a bounded omission of the new upper-host opening where needed to establish both semantic and physical detection.

### 4. Signed-zero string keys create false retained-patch differences

The development03 retained reports contain six differences comprising three otherwise equal patch pairs separated only by signed-zero spelling in stringified rounded plane keys. Independently canonicalizing `-0.0` to `0.0` in these reported keys makes the baseline/candidate contour maps identical; all29 exterior sections already match. This is evidence for a representation correction, not permission to ignore six arbitrary differences.

Canonicalize signed zero when constructing numeric plane keys, without increasing geometric tolerances, dropping plane components, or merging unlike material/orientation contracts. Add a small positive equivalent-plane case and retain a nearby physically shifted/reversed/material-changed negative case so canonicalization cannot erase real changes. No full new geometry framework is necessary.

## What the current design establishes

The oracle reads pinned R05/R06 and old drawing inputs rather than importing model author helpers. It applies explicit whole-owner replacement regions, native old/new N profiles, retired closures, fixed opening envelopes and protected retained contributions. It tests material and air against actual saved visible/static-collision triangles. Complete mesh groups retain ray pairing; native support is separately observed rather than inferred from rendered floors. Triple corner, old floating band, shared D202 depth and complete finite circle rays are explicit.

The expected-only old-boundary fix is appropriately scoped in principle: closed containment removes the exact nominal boundary of a replaced parent solid after submicrometer parent endpoint normalization. It does not move the candidate station or broaden candidate gap tolerance. The initial real .5mm wall/native-stair duplicates must remain preserved as failures; this change is not a blanket explanation for them. Development03 reports no remaining such blocking multiplicity failures under the current checker.

The five nominal-circle mismatches remain explicitly classified inherited HOLDs only when the actual candidate matches sampled parent occupancy. Separate retained-aperture comparisons must continue to block new refill or removal. This is conditional preservation of a known parent approximation, not ideal-circle or source acceptance. Do not convert those rows to passes or loosen radius/endpoint tolerances.

The exterior comparison is materially stronger than the earlier prefix-only diagnostic: it clips complete oriented patches outside released masks and retains physical semantics independent of triangle diagonals. Its29 cuts are supplementary, not a substitute for full exterior comparison. Masks remain an exemption for changed geometry, so the inside-mask semantic gap above must be closed by independent feature expectations. Retessellated normals/UV limitations are stated appropriately.

Negative controls generally have meaningful positive-before-negative preconditions and reject odd-ray/parser-only failures as insufficient evidence. Old profiles, old raised slabs, missing physical support with walking metadata retained, duplicates, stale return base, stale G303 bottom, circle refill and collision-only barriers are useful discriminators. Saved-package reload/missing/changed-asset controls and actual normal FPS remain separate required integrations. The current in-memory controls must not be described as those integrations.

## Evidence identity and next review

Final evidence must bind the corrected checker revision, all local imported helpers, frozen input ledgers and their R05/R06 packet identities, parent compiled bytes and exact candidate saved/reloaded bytes. Existing `inputsUnchangedDuringRun` fields are narrower than their label: verify currently rechecks candidate/code/helper identities but not every frozen ledger and parent input at exit; retained/cuts identity lists omit some indirectly used check/probe helpers. Complete the final identity record or explicitly narrow the flags and use an independently verified before/after freeze. Never attach new checker hashes to old report outcomes.

After coherent corrections, request follow-up review of the changed code and targeted controls before rerunning the complete final suite. Preserve development01's real duplicate failures, the old-boundary oracle diagnostic, and development03's current semantic/signed-zero reports. Run fresh outputs for the final subject. This first verdict neither accepts the model nor demands unrelated production tests, source edits, or architectural infill.

## Revision02 follow-up: approved for full runs

Independently read the corrected extraction, feature expectations, branch envelopes, retained-plane canonicalization, identity collection and control integration. Verified all nine code hashes in `middle-r12-checks/REVISION02-REVIEW-INPUTS.json`. Independently checked all215 identities in the stable targeted report against current bytes, and all512 positive rows plus26 discriminating control rows across visual and collision purposes. Report SHA: `1f5bac33dfe6dd6a12b570603437d351070b228cfb0a8dc8d72f51aa7ec04dcd`. Actual subject remains development03 compiled SHA `5dd49af2e429ce2744094bc4796ffac41c4bdd99466f0ed8875e9659aa83c182`.

Repeated two targeted checks independently, without the broad suite: G303's original actual collision faces pass their frozen spatial expectation, while changing the leaf to masonry fails; the original reviewer fringe obstacle is detected by the corrected standing envelope. No geometry/source changes were needed for these outcomes.

The semantic fix uses actual triangle surface IDs and records facing, kind, role, material and physical flags per hit. G303 and affected lower leaf/window families have spatial feature expectations inside released masks; a globally known material tuple no longer substitutes for those feature checks. D202 retains its complete parent leaf and requires only the exact released +X roof-boundary floor face. The controls reject missing leaf, arbitrary extra face and wrong roof material. The same-owner/multiple-surface control detects the former last-surface lookup defect. This resolves the demonstrated semantic gap for the sampled features; it does not claim every possible sub-grid material defect is exhaustively proven absent.

The standing-domain clarification is acceptable: centers X8.05..8.65/Y6.25..7.15 have their complete radius-.25 rectangular footprint bounded by X7.80..8.90/Y6.00..7.40, physical feet5.145 and top6.945. The former X8.65 fringe blind spot is included. Thirty support witnesses cover that footprint. Raw boundary contacts are retained, with the existing1e−6 positive-interior criterion distinguishing float32 tangency; body dimensions and model coordinates are unchanged. This is conservative finite-volume clearance plus sampled support for a flat supported domain, not continuous support proof at every point.

Earlier center positions straddle the final tread and are now explicitly excluded from the flat-support assertion. The adjoining X6.10..8.05/Y6.00..7.40/Z5.395..6.945 box checks **overhead only**. It does not test the lower body, support transfer, every intermediate capsule configuration or controller stair negotiation. This narrowed statement resolves the misleading coverage claim only because the unchanged full normal-body approach/return remains a mandatory separate FPS/collision gate. Final acceptance must include that route, actual navigation-resolved feet, and its lower-body/transition inspection. The checker pass alone cannot close that gate or the1.840m usability concern.

Signed zero now has one canonical numeric representation at the same six-place plane-key precision. Positive signed-zero equivalence and negative2µm shift, reversed orientation and material cases pass. This supports correcting the known six flags without a broad plane/mismatch waiver. The full exterior comparison still needs a fresh final run.

Identity snapshots now include local/transitive checker code, pinned packet contents, release/preplan, parent/candidate compiled data and available candidate SUBJECT/source/companions, with before/after checks. Final negative-control prerequisites require the same current snapshot as conformance. Preserve the intentionally failed in-progress run whose identities changed; it is not acceptance evidence.

**No material revision02 code blockers remain for the declared bounded checks.** Proceed with fresh full conformance, retained comparison, cuts and prerequisite-gated mutation controls. Inspect final cuts and identity records before freezing checker evidence. The five inherited nominal-circle HOLDs, actual FPS/PR13/source results and overall architectural acceptance remain separate. This follow-up does not turn earlier real .5mm overlaps or current inherited/source concerns into passes.
