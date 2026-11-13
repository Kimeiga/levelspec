# Focused visual review — r11

**Verdict: accepted for the latest grime, exposed-trim, shop-material, and crate-support scope.** r11 is a clear visual improvement over r07/r08. This does not claim photorealism, a fully rounded building, or approval of an unseen subsequent export.

## Evidence

Inspected actual r11 `hero.png`, `upper.png`, `balcony.png`, and `shops.png`, compared with the previously inspected matching r07/r08 views. Consulted frozen r11 `parts/shops.ts` for support placement and the shared molding/fittings implementations for the limited trim/material mechanism. Build and all capture entries identify GLB `96020ad2414d759aeded8003844639731b96480d23654bef90a500ab775ce726`; capture errors are empty. Acceptance is based on the images, with source checks supporting relationships obscured by crate walls.

## Findings

### Grime resolution and character — accepted

The upper facade now resolves into thinner, irregular runoff with differing widths, lengths, and intensity. This is especially clear below the parapet cap, beneath window sills, and along the balcony fascia. The r08 rows of broad soft cells are no longer the dominant pattern. Fine staining remains legible alongside the larger peeled-plaster shapes rather than replacing them. The balcony close view shows more credible directional streaks instead of broad smooth brown blobs.

Residual limitation: some long bands of parallel runoff and large gray peeled interiors remain visibly stylized and regular. Those are pattern/distribution limits, not the former coarse sampling appearance. The user's resolution complaint has been meaningfully addressed at the supplied inspection scale; unlimited close-up fidelity is not established.

### Small masonry-edge rounding — accepted for the implemented scope

Projecting cornices, parapet-cap edges, and balcony upstand/trim now carry narrow continuous edge transitions/highlights. The change is subtle and appropriately retains the masonry profile instead of inflating it. Shared molding source confirms small two-segment smooth profile fillets.

This is **horizontal exposed-trim rounding**. The building's approximately 24 cm clipped plan corner remains an architectural chamfer, and broad wall/piers have not all become rounded volumes. Describe that scope accurately; these images do not support a claim that every building corner is rounded.

### Counter, cartons, and wooden crates — accepted

The counter has readable wood grain, panels, and a distinct top, consistent with the stocked timber shelving. Cartons retain their improved printed faces and edge definition rather than the old featureless tan blocks. Street crates now read as wooden slatted containers with visible timber texture, edge wear, and coherent material variation. The effect is materially stronger than the former flat painted slats and counter.

The crate color change departs from the earlier mixed red/green concept crates, but follows the user's newer wooden-crate request; it is not a fidelity regression to repair against the old brief.

### Bottles and stacked contents — accepted in the inspected arrangement

Bottle bodies visibly descend into the open crates, with necks projecting above the rim. The visible crates sit together as contiguous stacks and meet the pavement. Cartons are concentrated on an empty stack with a visible timber lid, rather than hovering over bottle necks.

Frozen source corroborates these contacts: stacked crates advance by their actual 0.29 m height; bottle loads use the returned interior floor height; the carton stack rests on the lid's upper surface. The crate walls obscure some bottle bottoms in the screenshots, so the source relationship is useful evidence here. No obvious levitation or unsupported visible stack remains. This is a local visual/support review, not a general physics certification.

## Cost versus visible benefit

Manifest measurements are:

| Revision | Triangles | Channel texels | GLB bytes |
| --- | ---: | ---: | ---: |
| r07 | 261,190 | 25,103,226 | 136,200,004 |
| r08 | 545,086 | 25,103,226 | 193,870,368 |
| r11 | 203,221 | 33,945,282 | 134,391,344 |

r11 delivers a visible surface improvement while using fewer triangles and a slightly smaller export than r07. That resolves the poor visual tradeoff identified in r08. The higher texture allocation is a real cost; these figures are not a frame-rate or GPU-memory benchmark.

## Scope continuity and next revision

The prior foundational exterior acceptance and its documented art limits remain applicable to unaffected categories. This pass does not repeat night-lighting acceptance or reopen layout/sign/shop composition. r12's proposed fallback-robustness changes have not been visually inspected here; expected equivalence is not an observed result. Any visible-output change requires checking the affected captures before transferring this signoff.
