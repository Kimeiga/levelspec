# Native containment implementation review

Status: accepted after oriented-crossing return review. The initial failure and its correction remain recorded below.

Independent implementation review covers `review/physical-walk.ts` and the new cavity/filter/legacy regressions in `tests/review-physical-step.test.ts`. No canonical map source was edited. Initial reviewed helper SHA-256: `3778da5aa5c4372e933821490b23ec1e1f06dda9a25d673475d0dbf04d34cb3e`.

The completeness boundary is sound. Native compilation assigns a final-solid identity independently of face material/contributor ownership. `collisionMesh` is a triangle subset of the unfiltered physical mesh, so matching selected/source counts and requiring every source face to be checked establishes that a native boundary remains complete. Complete native solids should retain all sheets, including cavity boundaries, without coordinate-edge revalidation. Partially filtered native solids retain actual face contact checks but cannot assert a filled interior. Unidentified runtime geometry keeps the existing exact oriented-edge closure check. The patch does not mutate source geometry, player settings, render data or navigation.

The final cavity fixture uses a real slab for the floor at Z=1 and preserves the intended 12×12×6 outer shell, empty room below Z=5 and edge-touching pillars. Its controls independently cover cavity emptiness, occupied shell/pillar, actual supported movement, partially filtered boundaries and unidentified closed runtime geometry. Expectations are geometric, not implementation-derived.

## Required correction found by baseline comparison

The initial patch introduces a Dust II `t_to_site_b` failure. A generated-only copy of the pre-fix helper completes the exact same compiled level in 2,539 movement steps and 101.8281059 m, ending at `[15.699999809,88.099998474,1.470000038]`. The initial patch stops at `[10.479996976,24.737457352,1.470000038]`. Therefore this is not a pre-existing suite failure.

At the nearby failing candidate `[10.479996976,24.747457352,1.470000038]`, containment sees four raw ray hits for `solid:60`: distances 9.467904145, 9.588380761 twice, and 9.824047100 m. The two coincident hits have exactly opposite normals, ±`[.707114728,.707098834,0]`. Distance-only deduplication treats them as one crossing, yielding false odd parity for a solid about 9.5 m away. The body has not contacted this remote solid.

Required behavior: coincident opposite entering/exiting faces cancel; duplicate hits of the same orientation at a triangulated face count once. This must preserve cavity/shell/partial-filter controls and the unchanged body. Disabling native containment would not satisfy the contract.

Evidence is in `generated/fusion/containment-review/dust-comparison.json` and `dust-debug.json`; reproducible generated-only helper copies and scripts are in that directory. Dust source SHA-256 `9745e91ae5e2c6b6574885136fdb4713213b57b732d25f3a5c441bcaba3fb36a`; physical geometry hash `342fb67345db9eda8c5dd603132d62a30e1e0b84db964346b1c1709859ddf3f2`.

## Accepted return review

The final repair groups hits by the same native solid and existing 1e−6 m distance tolerance. It tracks entering/leaving signs of `normal · ray.direction`; duplicate same-sign triangle hits count once, and simultaneous entering/leaving hits cancel. The normals need not be exact opposites. Actual capsule contact, standing body, support, step acquisition, navigation and rendering are unchanged. The change is local, keeps the containment ownership rule explicit and adds no fallback or geometry exception.

The focused tests now include an empty room probe whose ray passes through the edge shared by two pillars, neighboring ±1 mm controls, both occupied pillar interiors, and a body inside a box whose exit ray passes exactly through a same-orientation triangulation seam. Those independent geometric expectations protect cancellation and seam deduplication separately.

Independent replay of the seven saved Dust probes confirms all are clear after repair, including the four false positives from the initial implementation. The complete existing four-suite command subsequently passed **34/34 tests**, including all Dust II and Daiban required walks, real collision-GLB game walks, inspection movement and the new native regressions. Type checking completed without diagnostics. The separate cached Fusion checks report no direct physical failures and all four targeted routes passed: freight descent, lower west port, lower bypass and crown west ascent. These sampled routes do not replace the map's remaining compiled spatial, section, strategy and full-route reviews.

Validation output: `generated/fusion/walk-tests-oriented.txt`, `typecheck-oriented.txt`, `check-oriented-containment.jsonl`. Small baseline/raw-hit/repaired-probe evidence is retained under `reviews/evidence/containment-dust-*.json`.

Final reviewed `review/physical-walk.ts` SHA-256: `b55343df25c4303fcd6d838cefb711439f4375324a0ed1f53ce7d36b02b0116a`.

Final reviewed `tests/review-physical-step.test.ts` SHA-256: `75e50a12dd41f5e7b487615324a0c88d324f046c57bfed4b2a26929827e2818f`.
