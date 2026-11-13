# Shelf contact wear

The procedural timber mapper now gives handled front shelf lips irregular lighter
wood within an 8 mm band. Upright front corners receive a weaker 3 mm treatment.
Seeded coverage varies along each member and matches across its top/front edge.
Protected interiors, backs, undersides, broad backing panels and bulky boxes keep
their original tint. Long grain crops and surface positions remain unchanged.

- [Before](../../generated/shelf-uv/natural-r01.png)
- [After, same close-up camera](../../generated/shelf-uv/edge-wear-final.png)
- [Whole restaurant](../../generated/restaurant-props/shelf-edge-wear-final/wide-store.png)
- [Six-view capture and frozen input hashes](../../generated/restaurant-props/shelf-edge-wear-final/capture.json)

These are actual renderer captures. The brighter bands retain the wood grain and
vary in coverage instead of forming a uniform pale outline. Only the narrow bands
receive the extra subdivisions needed to interpolate their tint. The isolated
shelf and sample board now contain 344 triangles; the full restaurant has 21,872
prop triangles, narrow 8,050 and alternate 23,098. Existing fixture budgets pass.

## Material and export contract

The initial preview used vertex multipliers above one, which GLB validation
correctly rejected. The final atlas reserves **linear albedo gain 2**, with an
explicit bake-time check against clipping. The mapper divides base vertex colors
by the same metadata gain and bounds worn colors to [0,1]. This preserves the
unworn appearance while allowing edges to brighten portably. Consumers must use
the matching atlas metadata and vertex scale; the brightened albedo is not a
standalone replacement without that compensation. Normal and roughness maps,
atlas dimensions and material count are unchanged.

## Verification

The focused tests sample surface colors rather than only vertices: contact edges
brighten unevenly, adjacent top/front faces agree, protected areas retain their
base color, and rotated/mirrored redraws remain deterministic. Existing coverage
checks retain surface shape, UV proportions, crop continuity, stock and budgets.
UV-distance checks account for the emitter's 10 µm coordinate precision on narrow
bands instead of inverting poorly conditioned tiny triangles.

All 15 focused tests and typecheck passed. The exported timber GLB has zero validator errors or warnings; normalized color
accessors are checked directly. Six restaurant captures completed without browser
errors. Independent test and implementation reviews cover the localized wear and
the final portable color treatment. Logs are in `generated/shelf-edge-wear/`.
