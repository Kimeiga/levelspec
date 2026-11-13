# Independent revision05 checker review

**Decision: approve bounded full runs of revision05 against unchanged R13 development-03/source-package-02.** The affected independent probes close both revision04 findings. This approves execution and review of the resulting evidence; it does not accept the model or predict that full conformance will pass.

## Exact checkpoint and scope

Reviewed `REVISION05-REVIEW-INPUTS.json`, SHA256 `17681cb085148addcb1be02f192615e7de3d7e5f436c9152e97822b55cdf71ff`. Independently verified all 23 files and 195 input identities before and after the probes, with zero mismatch. Read the changes to retained provenance, directional extraction metadata, arrangement failure propagation and run aggregation, plus the focused controls and documentation. Oracle geometry and tolerances are unchanged; its changes add provenance documentation and evidence pins.

The authorized candidate remains development-03, compiled SHA256 `bf53476e7c6fcde882ade7298d335c14ecd5c47427d9e6c7e3366ef62936b34b`, with frozen source-package-02 and exact fresh-reload identity checks. Preserve all prior snapshots, failed runs and review records.

## R4-F1 closed: retained material provenance

Each immutable baseline mesh interval now retains its identity and physical-contract evidence through subtraction and island restoration. Original endpoints use their own oriented source faces. Newly exposed endpoints inherit only a source mesh whose complete extracted triangle set has one physical contract. Candidate materials do not determine that expectation. A heterogeneous source produces an unresolved expected-contract result rather than an empty contract misreported as a model defect. Explicit native-floor priority remains visible in the provenance record.

The [independent sector probes](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-checker-independent-review/REVISION05-SECTOR-PROBES.json) rerun both original failing positives: cutting the homogeneous X=[0,2] box down to X=[1,2], and restoring the same residual as an island. Both now pass all eight sectors with the correct exposed-face material. Corresponding wrong-material candidates fail with complete extraction. Changing an off-ray source face to a different material makes both operations explicitly unresolved; it does not create a candidate semantic failure or pass by copying candidate material.

## R4-F2 closed: arrangement failure propagation

Arrangement reports now expose extraction completeness and full failure records for returned query failures and numerical degeneracy. `verify.run` aggregates that field after both normal returns and caught exceptions, preserves the report filename/scope/station/incident evidence, and prevents final conformance from passing when extraction is incomplete.

The independent original missing-exit-face probe still returns a structured arrangement failure normally. Feeding that report through the actual run aggregation/finalization functions now produces `FAILED / INCOMPLETE EXTRACTION` with its evidence, closing the earlier misleading complete status. The constructor's focused control additionally exercises complete witnesses followed by this arrangement-only failure path.

## Preserved behavior

All ten original immutable R12 boundary queries pass unchanged in the independent rerun. Consistent Y-min/Y-max boundary handling, rejection of opposite-side material with an identical closed ray union, and rejection of actual 2µm and 0.5mm junction gaps remain intact.

The [independent prior-regression probes](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-checker-independent-review/REVISION05-PRIOR-PROBES.json) retain float32/encoded feature positives; off-sample material, kind/role and reversed-face negatives; same-mesh duplicate detection; exact files-only subject binding; exact-scope material checks on all three axes; and full native-floor ownership over coincident masonry. All input identities remain unchanged.

## Authorized next execution

Run the exact revision05 checkpoint's complete visual and collision conformance, retained-union and physical mutation checks, and fresh-process source/asset reload checks against the bound subject. Review complete outputs, including raw cleanup qualifications and any unresolved expected-contract or numerical evidence. Do not treat an extraction failure as a physical model defect or silently change a threshold to complete the run. Further material checker changes require a new checkpoint and affected rereview.

The arch cleanup audit remains a qualifying subcheck coupled to full geometry, contact, semantic and multiplicity checks. Source fidelity, circulation/FPS, body clearance and strict PR13 remain separate gates. This reviewer performed only bounded synthetic/immutable-baseline probes and wrote review evidence: no R13 candidate full run, model/runtime/checker implementation edit, or frozen-plan change.
