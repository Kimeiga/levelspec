# R16 RC3 independent test-contract review

Date: 2026-11-03. Applied `maintain-tests` and the bounded architectural verification contract. No model, retained source, drawings, runtime, camera or server edits by this reviewer.

## Preimplementation decision

The bounded approach in `reviews/roof-context-r03-author-response.md` is suitable for the exact coordinator release: ten complete rebuilds, two additions and one retirement over effective R15, before upper selection. Independently verified the specified release SHA `caff11cc93f44d4c7059398f5a39f0791d9f6629ceed2e87fbf676e11afec04a`, response SHA `68499bbc9824ae8f117064e03265c96d464df9b49b280f6f3734b28d04e5e895`, and the seven direct drawing/ledger/delta/baseline/review bindings. This does not substitute for transitive package verification or actual R16 inspection.

Reuse final R15 input-integrity, immutable-delta, exact-ID, native-encoding, managed-resource and finite-patch machinery. Do not write a broad duplicate checker. A first saved/reloaded package with bounded integrity and complete changed-solid checks can go promptly to unchanged main/M05/M15/A20 diagnostic captures. Those captures need not wait for every retained/global conformance domain; label unfinished domains and strict findings honestly.

## Narrow behavioral contract

1. **Effective selection and retirement.** Snapshot effective R15 before RC3. After IDs must equal before IDs minus `HOME-ENTRY-PANEL-CONTINUATION` plus only `RC-HIGH-COURSED-TRANSITION` and `RC-REAR-LOW-TRANSITION`, with no duplicates. Compare all retained records and the exact changed-record set against the frozen operations, and assert the frozen delta remains unchanged. The retired free-roof remainder must be absent in final source/assets and actual saved geometry, including an accidentally renamed contribution. Missing the old alias alone does not prove retirement. Preserve only the exact old roof-owned HOME-right slice authorized by the subsequently bound ownership clarification below.
2. **Unchanged native geometry.** Compare complete before/after native schedules, not just counts/endpoints; retain FE2's nine equalized cells at high 12.418, all N12/FE1/N-MID geometry, common floor top 11/soffit 10.58 and receiving floor 12.418. Actual native visual/collision patch equality and retained physical fingerprints remain the saved-model check. No new inclined floor, occupied roof, camera or player-body change is authorized.
3. **High assembly and actual keeper priority.** Verify the entire rebuilt frame/pane/opaque/band union and finite contacts using independently encoded RC3 geometry minus the *actual holed* HOME-left/right and side-return contributions. The host owns overlapping material; it must retain its own geometry, holes and semantics. Check visual and collision domains independently and preserve material multiplicity. Metadata priority order alone cannot show that the final intersection is correct.
4. **Rear family.** Compare the complete actual new rear wall union, after native and opening subtraction, to the complete bound R15 union plus X7.8..7.98/Y6..6.4/Z12.1..17.2. Its nominal added volume is .3672 m³, but volume equality alone would permit an equal-sized loss elsewhere. The base X7.8..7.98/Y6..6.4/Z6.985..8.4425 must remain, with every applicable retained cut. Preserve separate frames/glass/leaf children and lower aliases. Do not regenerate baseline material from nominal envelopes.
5. **Lifecycle and persistence.** The success and injected-failure paths must allocate both new contributors, exercise the real keeper partition/emission, dispose owned handles once, and preserve borrowed handles. Bind saved XML, companions and fresh public-compiler reload. Captured evidence must refer to those bytes rather than the pre-export author representation.

## Focused controls, without a new framework

| Potential false pass | Minimal negative control and expected observation |
| --- | --- |
| Old roof removed by name but retained as geometry | Add the copied old free-roof remainder under another alias to an isolated candidate. Full affected union/patch comparison must report its extra material; an alias-only assertion is inadequate. Exclude only the explicitly authorized HOME-right shared transfer. |
| New low base exists in the map but is absent physically | Omit the complete base in a copied subject. Finite rear-union comparison must show the full missing lower material, even if the tall added box and overall bounds remain correct. |
| New base bypasses retained cut path | Use an actual retained opening intersecting the base or an explicitly isolated cut at its height. The real emitter must remove the complete cut volume; suppress that cut and require missing void/extra material to fail. A dummy cut wholly above the base cannot exercise this behavior. |
| Nominal keeper box silently replaces actual holed host | Give the real emitter an actual finite host with a hole intersecting the high-family domain. Assert host material remains, high-family material is removed only where host material exists, and the hole is not treated as solid. Invert/omit priority in a copied test subject and require a geometry/material mismatch. |
| Opposed or same-facing sheets cancel in union-only check | Reuse existing complete oriented-patch/multiplicity controls, including reversed faces, duplicate patches and wrong material. Preserve raw positive residuals rather than widening tolerances. |

These controls belong beside the existing adapter/finite geometry tests. Run them on isolated copies or small real contributors, never mutate released plans or published model bytes. A common geometry extractor may be reused; expected dimensions and changed domains must come from frozen RC3/R15 authorities rather than the adapter under test. Existing exact patch checks already cover harmless retessellation; do not add triangle-count requirements.

## Initial code-test review findings

The in-progress `model-r16-author-contract-checks.ts` carries forward the corrected exact before/after ID set and frozen-delta assertion. Its lifecycle traverses `selected.build()`, adds the new lower family, applies high-family priority and checks exported asset presence. These establish useful preflight coverage, not final architectural geometry.

Sent the author three concrete refinements before claiming that test complete:

- Assert exact four HOME keeper IDs and complete high-family record IDs before evaluating priority. `hosts.every(...)` passes vacuously if the relevant hosts disappear.
- The lifecycle fixture's dummy cut at Z9.5..10.8 does not intersect the new base at Z6.985..8.4425. Add the intersecting cut behavior above; asset/record presence does not protect it.
- Compare complete effective R15 versus R16 native schedule data; count and terminal-coordinate assertions alone permit interior stair changes.

## Limits and handoff

Do not interpret nominal .3672 m³, declaration counts, a selected surface subset, plan bounds, center rays or one successful route as complete-domain proof. The finite checker covers only its declared prisms/planes; nonorthogonal or unresolved extraction remains explicitly unresolved. Keep actual high-roof visible-edge ownership, approximately 24 px M05 residual, hidden support/luminous mechanism, lower headroom/H6 restrictions, static leaf obstruction, opposite frontage and six inherited strict gap findings separate from this contract.

At this initial checkpoint no finished R16 adapter, author-test result or frozen R16 package was inspected. Code/results follow-up and a review freeze will be recorded separately once the author supplies its checkpoint.

## Ownership clarification intake

The later `reviews/model-r16-ownership-clarification.json` binds the actual baseline evidence and authorizes one finite transfer: old roof material inside X5.45..6.6/Y10.1..10.4/Z15.2..15.38 becomes HOME-right structure material (nominal volume .0621 m³). Retirement means removal of the free-roof remainder, not cutting this existing wall band out of the building. Require complete actual HOME-right equality to its R15 actual contribution plus exactly that intersection, and preserve the other three actual HOME keepers and all holes. Nominal whole-host regrowth remains prohibited.

Read the new `preserveActualHome()` path and requested that the author lifecycle test invoke it before `prioritizeHighRoof()`, matching production. Without that call, the test would miss the new actual-mesh import/transfer allocations and could pass against obsolete nominal keeper geometry. The exact clarification/evidence identities must join the input mutation checks and review freeze. Actual host-transfer patches remain a separate saved-geometry check.

## Completed code and author-test review

Reviewed `preparation/CODE-CHECKPOINT-01.json` and verified all 13 source/test hashes. The author-test SHA is `3b90b92eb1ceb6a6d1f75c9283280661b51da2757ebba4eb7558c62dc0307974`. The final test now asserts the exact four keeper IDs and complete high-family IDs, full before/after N12/FE2/middle schedules, an actual cut intersecting the new lower base, and the production `preserveActualHome()` allocation/transfer path before emission. It checks high-family/actual-host overlap after successful emission. The clarification SHA `850cac47e1856dc29431a71b5fcce099b073dc8918f93fec972af3a538b0d325` and bound baseline evidence both verify.

Independently executed:

`node projects/dai2-daiban/studies/multiview-restart/reviews/model-r16-author-contract-checks.ts generated/model-r16-test-review-author-contract.json`

Exit 0: 263 inputs bound, 100 individual nonasset/nonreference byte mutations rejected before author output, unchanged native schedules, and all owned resources released exactly once on success (2180 handles) and injected export failure (2105 handles), with the borrowed solid preserved. These handle totals describe this run; they are not fixed-count assertions. The output JSON is separate from the author's report.

No remaining preflight-test blocker prevents the safe saved-package diagnostic handoff. The author checks deliberately do not prove complete saved geometry. In particular zero pairwise intersection, approximate transfer volume, asset presence and the synthetic cut probe do not establish the complete retained wall/void union. Old free-roof ghosts, omitted lower base, filled real apertures, complete actual-host transfer and visual/collision semantics still require the finite saved-model comparisons listed above. No R16 fidelity, continuous route, strict-validation or full construction acceptance is asserted here.
