# Lower-route physical wall union: independent test review

**Final bounded test gate passed:** tool controls, actual wall-pair geometry, final caller retirement, unchanged compiled floors and public collision preservation all pass. This report does not accept whole-building construction, route clearance, global placement, navigation or photographic fidelity.

Read the [independent pre-test plan](lower-route-solid-union-pretest-review.md), actual helper and exercise; applied maintain-tests and reference-authoring guidance. No helper, builder, model or test-suite edits were made by this reviewer. Reviewer scripts and results are retained only as independent evidence.

## Reviewed identities and independent execution

- Helper `projects/dai2-daiban/union_masonry.mjs`: SHA256 `65310c10546153de6916fe15187184e719fb7d0813921c91031d83b5184de16f`.
- Exercise `projects/dai2-daiban/union_masonry.exercise.py`: SHA256 `5479ff82db26d78b6dc4c5a3ae1b1554d2f8e7767d16443e1712ed19e0a91453`.
- Personally ran `python3 projects/dai2-daiban/union_masonry.exercise.py`: **18/18 passed** at [run-w1elub66/RESULTS.json](../../generated/dai2-daiban-review/masonry-union/run-w1elub66/RESULTS.json). Helper hash remained fixed through execution.

All seven original default-mode cases remain, including the default solid-owner rejection, touching exterior-area control, transformed geometry, invalid closed-solid rejection and recovery. New controls exercise explicit-none, explicit-solid positive overlap, missing/opposite/mixed intent in both orders, malformed arguments and solid recovery. Success checks independently recompute emitted triangle signed volume, exposed area, nondegeneracy, welded oriented closed edges and bounds. They do not trust reported measures alone. Positive overlap expects volume1.5/area8 rather than concatenated input volume2/area12.

## Independent reviewer controls

[Reviewer controls](../../generated/dai2-daiban-review/masonry-union/run-w1elub66/REVIEWER-CONTROLS.json) and [reproducer](../../generated/dai2-daiban-review/masonry-union/run-w1elub66/reviewer-controls.py) additionally verify positional mode, repeated mode flags and explicit-none with solid owners reject without stdout geometry.

A controlled corrupted response doubles emitted X coordinates while keeping valid `status`, `collision`, reported volume1.5 and reported area8. The actual exercise's `checked_union` function correctly fails at **“Emitted triangles must enclose the expected signed volume.”** Thus a helper that reports correct metadata while returning wrong geometry cannot pass this oracle. The production helper/exercise were not changed for this control.

## Actual nominated wall pair

Independently extracted the actual two original wall props, declared solid collision, dedicated asset paths and exact XML TRS from the pre-union local trial. Called the stable helper in explicit-solid mode. [Input hashes, actual measured result](../../generated/dai2-daiban-review/masonry-union/run-w1elub66/ACTUAL-WALL-CHECK.json), [output mesh](../../generated/dai2-daiban-review/masonry-union/run-w1elub66/actual-two-walls-union.json) and [reproducer](../../generated/dai2-daiban-review/masonry-union/run-w1elub66/reviewer-actual-walls.py) are retained.

The result is one component,16 vertices/28 triangles, with positive nondegenerate faces and closed oriented welded edges. Independent emitted-triangle volume is **5.795941663227847m³**, versus analytic **5.795941546098754m³**. Independent area is **68.5815150919835m²**, versus analytic **68.58151764692816m²**. Maximum bound error is below1e−6m. These small discrepancies are consistent with the existing GLB/Manifold Float32 conversion; the geometry was not snapped, moved or dilated.

The area oracle separately derives the lower XY union polygon, its perimeter, the two footprints and unequal heights: `2*A_union + P_union*4.47 + P_Fan*1.80`. Volume subtracts only4.47m of overlap height. This protects the taller Fan wall and shorter return, rather than pretending the pair shares one top.

## Final rebuilt caller and public collision gate

Independently audited `generated/dai2-daiban-review/lower-route-local-v1-source-r02` against the original v1 source. The [integration result](../../generated/dai2-daiban-review/masonry-union/run-w1elub66/INTEGRATION-CHECK.json) and [reproducer](../../generated/dai2-daiban-review/masonry-union/run-w1elub66/reviewer-integration.mjs) retain23 source/asset/builder hashes, checked unchanged before/after the audit. Final XML SHA256 is `9b1657a66fd39c3fe0bdbfe8a45ab1734072531cf616e60f79f99f3b9fe71691`.

The two old wall props and their dedicated asset declarations are gone; one identity-transform tile/solid replacement remains. Unrelated props/assets are unchanged, with the separately authorized column-bottom extension excluded from that equality comparison. All native floor layers/vertices/edges/regions and all six **public compiled floor patches** are exactly unchanged. No floor entered the union.

Public `parseLevelSvgx`→`compile`, using actual GLB bytes and `surfaceContacts:error`, reproduces two old `SURFACE_COPLANAR` diagnostics and returns zero geometry-only diagnostics for r02. Navigation was explicitly disabled for this bounded geometry audit. Final replacement surfaces are collidable and absent old owners stay absent. Every actual compiled replacement render triangle is present identically in public `collisionMesh`.

Actual compiled collision has26 triangles after normal compiler retriangulation of the prepared28-triangle asset. Independent collision volume is **5.795941657226775m³**, area **68.58151509198319m²**, with the same analytic bounds within1e−6m. A fixed triangle count is not the preservation contract. Triangle ray-containment probes additionally confirm the tall Fan remains above2.40, the return exists below2.40 but not above it, positive overlap remains filled and no inward expansion occupies the nominated courtyard sample.

This closes the helper/caller/collision test gate. The separate [implementation review](lower-route-solid-union-implementation-review.md) owns implementation acceptance. Root reports `NAV_UNCOVERED` at the finite ground outer boundary under full validation; this review neither resolves nor waives it. Whole-trial navigation, route clearance, building construction and source fidelity remain outside this tool gate.
