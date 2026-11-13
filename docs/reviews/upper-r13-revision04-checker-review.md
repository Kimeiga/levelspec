# Independent revision04 checker review

**Decision: REVISE before full candidate runs.** The directional boundary correction resolves the original ten failures and preserves the earlier discriminators. Two material issues remain: retained Boolean operations lose the physical contract for newly exposed faces, and structured arrangement extraction failures can be reported as complete extraction. Neither finding requires changing R13 or its drawings.

## Exact intake

Reviewed `REVISION04-REVIEW-INPUTS.json`, SHA256 `160551cbb3b9dbe91d0430fe7ed08ef68d50e9c5d9c864769e6c40825dd4129b`. Independently verified all 22 files and 192 input identities before and after the probes, with no mismatch. Read the complete `directional.py` and `shared_query.py`, arrangement and run integration changes, and targeted controls against the frozen proposal review. Revision03, its failed full runs, the revision04 snapshot and the frozen verification plan remain unchanged.

## R4-F1 — retained Boolean boundaries lose semantic provenance

In `shared_query.expected`, baseline spans lose their mesh/material provenance when merged before subtraction and island restoration. `exterior_contracts` then assigns a retained endpoint only by finding an original baseline face at that exact endpoint. A legitimate newly exposed cut boundary has no such old face, leaving its expected contract empty.

The [independent sector probes](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-checker-independent-review/REVISION04-SECTOR-PROBES.json) demonstrate two positives rejected in all eight sectors:

1. Baseline: a homogeneous structure box with X=[0,2], Y/Z=[0,1]. Remove the old mask X=[0,1]. Actual subject: the correct retained box X=[1,2].
2. Same baseline; remove X=[0,2], then restore an island X=[1,2]. Actual subject: the same correct retained box.

Actual and expected intervals are exactly `[1,2]`, with no missing material, extra material, overlap or extraction error. Both fail at X=1 because the expected outward face has `contracts=[]`; the actual face correctly has `prop/prop/structure`, visible, collidable and static. The X=2 retained face is assigned correctly.

This is an incomplete expected-material contract, not a defect in the supplied positive geometry. The approved proposal explicitly carries physical contracts through sector-wise old-material subtraction and retained-island restoration. No released limitation currently excludes such boundaries. The oracle uses finite removal masks and retained islands, so silently assuming every surviving endpoint was an original exterior face is unsafe.

**Correction:** preserve independently established baseline material/physical provenance through retained interval subtraction and restoration. Assign exposed faces from the surviving material under an explicit rule, preserving native-floor priority and orientation. Do not infer the expected contract from the candidate, accept every nearby material, or skip faces with an empty contract. Where heterogeneous baseline evidence cannot establish the exposed-face contract, report an unresolved expected-contract condition with provenance rather than a candidate defect. An explicit released exclusion would need proof that these boundaries cannot arise in the bounded oracle; it must not be fitted to candidate failures.

Use the two homogeneous positives above, wrong-material negatives, and an ambiguous-material case that remains explicitly unresolved if unsupported. This is a focused ownership correction, not a request for a general solid-modeling rewrite.

## R4-F2 — structured arrangement extraction failure misses the run summary

`SharedQuery.query` deliberately converts extraction exceptions/errors into a failed structured result. `arrangement.inspect` retains that result under `differences[].failures[].sectorEvidence` and returns normally. In `verify.run`, however, only a raised arrangement exception is added to `extraction-diagnostics.json`; returned extraction failures are not propagated. If witness extraction completes, the final status can say `EXTRACTION COMPLETE` despite failed arrangement extraction.

The independent probe supplies a closed actual cube and an immutable baseline with its exit face missing. `inspect` returns normally with structured extraction failures, no top-level extraction completeness field, and a failed conformance result. Inspection of `verify.py` lines 120–129 confirms that this return path does not enter the extraction-failure summary. Overall conformance remains false, but the stage diagnosis is misleading and violates the approved requirement to distinguish extraction failure from physical mismatch.

**Correction:** propagate arrangement extraction completeness and incident evidence explicitly into the run-level diagnostic status, including normally returned failures. Preserve completed independent reports. Add a focused reporting-path control in which witnesses complete and only the arrangement stage encounters a structured extraction failure; it must finish with failed/incomplete extraction and the exact failing scope/station evidence.

## Independently confirmed improvements

All ten original immutable R12 witness queries now pass unchanged through the shared-sector extractor, with complete extraction. Box Y-min and Y-max boundaries use a consistent convention. Opposite-side material with the same closed ray union is rejected. Actual 2µm and 0.5mm junction gaps remain missing material.

The implementation includes exact rational projected incidence, equal-limit derivative-order fan cuts, positive angular sectors without epsilon merging, shared directional Boolean evaluation, and approach-polygon restriction at arrangement vertices. Inspection confirms the proposal's affine depth-order refinement is implemented. The constructor's controls also retain tangency, concave/hole, native-floor and narrow-sector cases.

The [independent prior-regression rerun](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-checker-independent-review/REVISION04-PRIOR-PROBES.json) preserves encoded/float32 feature positives and rejection of off-sample wrong material, wrong kind/role, reversed faces, same-mesh duplicates and unbound subjects. Exact-scope wrong materials fail on all three axes, and structure-only material cannot replace a shared native floor. These fixes should remain intact while resolving the findings above.

## Next gate

Preserve this checkpoint and failed positive evidence. Prepare a coherent corrected checkpoint with targeted positive/negative results, then obtain independent rereview before another full run. No R13 source or compiled candidate was read by these probes, no full candidate run was performed, and no checker/model/runtime code or frozen plan was edited. Source fidelity, circulation/FPS, body clearance and strict PR13 remain separate acceptance gates.
