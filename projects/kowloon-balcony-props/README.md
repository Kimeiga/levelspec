# Kowloon balcony props

Six approved Tripo models are integrated into the production balcony, window cage,
sill, rooftop and clothesline emitters. Plants use three silhouettes with uniform
size variation and rotation. Washing mixes imported button shirts, trousers and
folded sheets with distinct plain procedural tees, vests, shorts and towels.
The old patterned long-sleeved shirt was removed at the user's request. Shirts and
sheets now use plain ImageGen cotton; there are no floral, striped or checked
laundry prints in the current selection.

## Assets and budget

| Prop | Source triangles | Adopted triangles | Local changes |
| --- | ---: | ---: | --- |
| Rubber plant | 772 | 529 | Separated near-coincident leaf skins; rebuilt missing pot wall with 24 triangles |
| Trailing pothos | 691 | 291 | Thin-leaf separation; grounded pot axis |
| Snake plant | 560 | 376 | Thin-leaf separation; grounded pot axis |
| Button shirt | 830 | 332 | Collapsed empty fabric depth, aligned actual shoulder anchors, plain cotton albedo |
| Trousers | 625 | 250 | Collapsed empty fabric depth, aligned waistband anchors |
| Folded bedsheet | 575 | 171 | Collapsed fabric depth, aligned anchors, replaced floral albedo/normal detail |

Counts exclude procedural clips, hangers and support lines. The six adopted meshes
total **1,949 triangles**, down from 4,101 before local optimization (52.5% fewer).
The populated comparison balcony now has **6,082 triangles**, down from 12,483
before optimization (51.3% fewer), including enclosure, rails, seven plants and
two rows of washing. The older procedural-only baseline has 4,596 triangles.

Offline Blender collapse preserves corner UVs after welding imported seam
vertices. Pots and foliage are reduced separately: reducing each plant as one
object was rejected because it collapsed the small containers. Foliage uses a
0.5 ratio; pots use at least 96 triangles or a 0.35 ratio, whichever is larger.
Cloth uses 0.4 for shirts/trousers and 0.3 for sheets, with rebuilt smooth normals.
These are requested ratios, not promised counts; actual measurements are above.
The repaired rubber-pot wall has 12 sides and smooth radial normals (24 triangles).
The packer repairs opposing interpolated normals; pot bases are regrounded and
actual cloth suspension vertices are rediscovered after reduction. The six atlas
image hashes are unchanged. Close silhouettes are more angular; this is accepted
for repeated balcony dressing at the demonstrated scene distance.

See [optimization measurements](optimization.json). No paid provider steps were
used for this pass. The original approved source meshes remain unchanged.

Two shared 1024×1024 atlas sets carry albedo, tangent normal, and packed roughness/
metalness. Each has four 512px cells with 8px gutters and extruded edge pixels.
All channels use the same UV transform. The fourth plant cell holds repaired
terracotta; the fourth cloth cell holds plain cotton for procedural garments.
Six decoded RGBA images with full mips total approximately 32 MiB. Geometry and
materials are shared source data, but the compiler expands triangles into its
combined mesh; this is not GPU instancing.

## Inspect

- [Final balcony, production double-sided materials](../../generated/kowloon-balcony-props/reduced-context/front.png)
- [Close laundry](../../generated/kowloon-balcony-props/reduced-context/cloth.png)
- [Close plants](../../generated/kowloon-balcony-props/reduced-context/plants.png)
- [Original matched baseline](../../generated/kowloon-balcony-props/review-final/before/front.png)
- [Actual native building source](level.aml)

The native source uses default built-in library materials and no AI/network service
at compile time. `balcony-cloth` and `balcony-plants` are whole-material finish
overrides; existing `cloth` still belongs to architectural cloth such as curtains.

Plants are grounded on their actual pot base. Mesh fitting scales uniformly in
meters after the recorded GLB Y-up → Z-up/front +Y conversion. A local offline
depth collapse makes empty laundry less inflated, with inverse-transpose normals;
suspension shear aligns actual shoulder/waist vertices. Runtime slope and sway
preserve these anchors and transform smooth normals correctly. Clips and hangers
remain procedural. Folded sheets are **clipped below clotheslines only**, because
the generated crease cannot fit a rigid pole. Tees, vests and towels retain their
appropriate procedural support behavior. Garments that cannot fit at a sensible
uniform scale are not selected.

Source meshes are deliberately low-poly: leaves look angular at close range, and
some plant/denim albedo retains generated shading. These are repeated environment
props rather than close-up hero plants. No paid rerolls, conversions or retextures
were used. Collision remains unchanged by dressing; visual checks do not establish
gameplay or navigation validity.

## Provenance and reproduction

[Concept prompts](concepts/prompts.json), [image provenance](concepts/provenance.json),
[approved dry-run plans](generation-plan.json), [source measurements](bake-report.json),
[adopted catalog and hashes](production.json), and [actual costs](costs.json) retain
the complete chain. Original concepts and plain-cotton texture were generated with
built-in ImageGen and saved here. The original floral sheet concept is historical;
it is not the adopted print.

Raw GLBs and provider previews are under
`generated/kowloon-balcony-props/tripo-out/<name>-<task-prefix>/`.
Source snapshots and hashes under `evidence/baseline/` preserve the previous
emitters. Generated artifacts may be removed by normal workspace cleanup; restore
approved task artifacts with the Tripo CLI's free task-download command before
rebuilding. The scripts require all six completed models and maps and never submit
a paid generation automatically.

From repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python tools/bake-balcony-props.py
python3 tools/pack-balcony-props.py
node projects/kowloon-balcony-props/build-assets.mjs generated/kowloon-balcony-props/assets-new
node projects/kowloon-balcony-props/build-context.mjs generated/kowloon-balcony-props/context-new
DOUBLE_SIDED=1 node projects/kowloon-balcony-props/capture.mjs generated/kowloon-balcony-props/context-new/context.glb generated/kowloon-balcony-props/review-new
```

The capture requires a new directory and checks frozen GLB/viewer hashes plus
browser errors. The build record hashes the actual emitter, catalog and all six
maps. Front-side captures inspect thin geometry; the final scene also uses the
production reviewer's double-sided opaque-material behavior.

## Actual Tripo cost

All six steps were `image_to_model`, alias `tripo-p1`, wire model `P1-20260311`,
standard PBR textures. One generation per concept, no further paid steps.

| Asset | Task | Credits |
| --- | --- | ---: |
| Rubber plant | `0f7c8dcc-0838-44af-904b-3a1c746fac8a` | 50 |
| Pothos | `320ba622-1e4b-42c7-bd52-bd55e315a722` | 50 |
| Snake plant | `da79f4e3-8a8f-429d-b5ea-807c1ec782f1` | 50 |
| Shirt | `19b1683e-3675-4881-bb7a-2c52c3ae8e45` | 50 |
| Trousers | `d40c3e76-2979-4fc3-901a-58f27368630c` | 50 |
| Bedsheet | `20cf40a4-3927-44bd-9ba4-dc2662c7939b` | 50 |

**Total: 300 credits. Remaining balance: 4,450; frozen: 0.**
ImageGen concepts/plain fabric did not use Tripo credits.

## Verification

See [independent test review](test-review.md) and
[independent implementation review](implementation-review.md).
The focused tests cover real triangle winding/normals, grounding, uniform fitting,
actual clip/cloth/cord contact, sheet clearance, reflected/sloping placements,
plain chart selection, repeated output, shared embedded PBR images and physics.
The separate old alley span fixture fails before laundry assertions because of
its existing surface-chart budget (30137/16384); its baseline log is retained.

Final verification: 10/10 focused balcony and material-library tests pass; `npm run check` and strict targeted TypeScript checking pass. The native building validates with zero diagnostics at 31,242 triangles (previously 34,256); the result is recorded in `generated/kowloon-balcony-props/optimized-validation.json`. Both incomplete-input rebuild checks reject safely without touching adopted asset hashes.

Final accepted captures are in `generated/kowloon-balcony-props/review-final/`, with individual front/back/side/underside, clay and reversed-light views for all six props. Double-sided mode and shadow parameters are recorded; earlier captures with shadow-map acne are superseded.

The reduction pass reruns the 10 focused tests and typecheck. The earlier independent reviews cover the original integration; they do not constitute independent review of this later asset reduction. Final reduced context/cloth captures are in `generated/kowloon-balcony-props/reduced-*`; reduced plant captures are in `optimized-snake`, `optimized-pothos`, and `optimized-rubber`.
