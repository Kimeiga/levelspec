# Floor-gap solid seals: independent test review

Status: **RELEASE for bounded implementation**. Actual proposed tests inspected before production; no unresolved material test-design finding remains. This is not implementation or final-validation approval.

Reviewer: `sol_primary_camera`. Applied `maintain-tests` and `write-readable-typescript`. Scope is the floor-gap audit contract and test expectations; no courtyard changes or production edits by this reviewer.

## Defect and independent oracle

The bounded correction is warranted. The existing audit collects only static wall cap triangles as vertical sealing spans. Other floor patches participate in a separate lower-floor underpass continuation rule, which deliberately requires material toward the higher floor. That rule cannot account for a real intervening slab on the low floor's occupied side.

The frozen court's `compile-03/diagnostics.json` reports a 1.400 m long, .165 m high gap between `mv/mv-f-pkt` and `mv/floor-union-z1485/part0` at Y7.4. Independently inspected `compiled.json`: the low floor is Z1.485; the stepped flight's lower guide is Z4.485, actual rise .165, thickness .200, so its first tread underside is Z4.450. The intermediate `mv/floor-union-z4485/part0` is an actual .200 m slab at Z4.485, spanning Z4.285..4.485 and X5.2..6.6 at this boundary. With the lower wall reaching Z4.285, the occupied intervals meet and extend .035 m beyond the required Z4.450. The slab is a physical seal, not a layer-name exception or arbitrary height waiver.

A minimal independent oracle is a four-meter shared edge between low floor Z0 and high floor Z1 with .200 thickness (required seal Z0...800), a wall Z0...600, and a third slab on the low side spanning Z.600...900. Removing the slab leaves .200 m open; raising its bottom to .650 leaves .050 m open; sealing only half the edge leaves 2.000 m of exposed length. Tests should assert this real occupied union rather than a minimum/maximum bounding prism or an underpass exemption.

## Baseline and required boundaries

Independently ran `node --test tests/vector-floor-gaps.test.ts`: **23 passed, 0 failed** before this correction. Preserve existing short-wall, above-gap wall, separated wall-span, partial-length, door opening, two-millimeter opening, sloped/stepped stair and underpass controls.

New coverage should exercise actual signed cap crossings per physical mesh, static and collidable selection independent of visibility, partial horizontal coverage and a genuine residual vertical opening. A hidden collision solid can seal; dynamic or explicitly noncollidable geometry cannot. Neither an unrelated layer/storey nor merely declaring a floor whose occupied shape misses the required interval should suppress a gap. Where native floors cannot author visibility/collision states, a narrowly documented compiled-surface mutation is a valid test of this pure audit boundary, not a new authoring feature.

## Actual proposed tests and release

Inspected the four new tests in `tests/vector-floor-gaps.test.ts`, starting at the `intermediateSeal` fixture. The successful slab and native stepped-stair fixtures compile real geometry with strict surface contacts. The same-side slab spans .600...900, physically closing the short wall's remaining .200 m interval. The stair fixture's boundary first tread top is .900 and its thickness .300, independently giving the same .600 lower cap. Neither success relies on another floor continuing toward the upper side.

The numeric negative controls retain the original low/high diagnostic pair and assert actual residual dimensions: no slab gives .200 m over 4 m; raising the slab bottom to .650 gives .050 m over 4 m; lowering its top to .750 gives .050 m over 4 m; a half-length slab leaves .200 m over 2 m. These reject a height-range waiver, counting only one cap, or treating any slab somewhere on the edge as complete closure. Existing separated-wall-span and tiny-opening cases remain unchanged and protect real empty intervals and exact horizontal partitioning.

The flag cases clone real compiled geometry, assert that target slab surfaces exist, and modify all surfaces for that object. Hidden static collidable material must still seal; noncollidable or dynamic material must not. This isolates the audit's public compiled-surface contract without inventing native floor collision/visibility syntax. The intended bounded selection is static collidable wall/floor/stairs caps; props, water and ceilings are not added to this feature.

Independently ran the expanded suite before production: **23 existing tests pass, 4 new tests fail** for the expected wall-only false positives/wrong residual dimensions. New test file SHA256 at preimplementation release: `7b701f6a6f855c4360d8bac0afb7f160a3af1cf4e94fc4bfe5a35a947f70718f`.

Implementation may proceed with the bounded geometric cap selection. Preserve signed per-mesh occupied spans and the exact boundary partition; do not replace them with bounding heights, layer exceptions, new model fillers, or suppressing diagnostics. Final acceptance requires these tests and relevant existing suites to pass and a separate independent implementation review. Material assertion changes should return for review. No production or courtyard source was changed by this reviewer.
