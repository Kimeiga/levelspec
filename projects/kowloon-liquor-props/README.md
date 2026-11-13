# Kowloon liquor/provisions props

[Whole store with procedural walls, floors, weathered shelves and ambient occlusion](../../generated/liquor-props/store-surfaces/capture-ao-final/wide-store.png).

The production `grocer` trade uses this catalog for textured shop goods and
fittings. The study is an invented Kowloon-themed store informed by
[real shop photographs](references.md), not a reconstruction. The generated
scale, crates, cabinets, packaging and worn materials replace the former simple
props. Shelf stock keeps product groups while varying spacing, setback, yaw and
quantity, with occasional quarter-turned facings. Sacks and scales use independent
seeded rotations; placement reserves each rotated footprint. Entire crate stacks
and their bottle loads turn together. Hanging chips use different upper seam vertices, angles and gaps;
clips and connectors remain attached to the actual mesh.

## Hybrid decisions

- The fridge retains the generated cabinet, with fused stock removed. Procedural
  liners and shelves support separately arranged reusable bottles and tins.
- The basket retains its generated weave, with its raised closing surface
  replaced by a recessed floor and inner walls. Eight simple modeled eggs lie
  inside the rim on that floor and use a separate matte material. The failed AI egg was rejected.
- Lights and ceiling fans retain scripted geometry for consistent symmetry and
  attachment. The three generated lighting candidates were not adopted.
- Bottle crates use a combined twelve-bottle load with hidden bottom faces
  removed. Shelf bottles use a rounded-shoulder profile; the mostly concealed
  crate load retains a simpler shoulder.
- Tins, jars and bottles use authored geometry with continuous body UVs, flat
  cap charts and generated label art. Their side normals are smooth; caps stay flat.
- Shelves, room surfaces, cords and clips remain procedural. The counter adapts
  its rectangular case to the bay and a 0.9 m working height. Regular shipping
  boxes fit their required rectangular envelope; other props fit
  uniformly to preserve their source proportions.

These lessons are recorded in the optional
[level-prop-assets skill](../../.agents/skills/level-prop-assets/SKILL.md).
Ordinary AML compilation uses baked JSON and textures; it never contacts Tripo
or requires Blender.

## Assets and cost

The approved fifteen-model batch cost 750 credits. The separately approved
single-egg attempt cost 50 credits and produced an unsuitable cylindrical form.
**Original batch and egg attempt: 800 credits.** The subsequent v3.1 egg dry run
was never submitted; procedural eggs superseded it. A later three-model lower-poly
pilot cost 150 credits and was not adopted. **Total billed: 950 credits.**
[Billing](billing.json) records task IDs and actual charges. Provider `success`
means task completion, not visual acceptance.

[Concept prompts](assets.json), [original concept images](concepts/),
[concept provenance](concepts/provenance.json), [generation plan](generation-plan.json)
and [source model paths](models.json) retain the generation evidence. The source
manifest includes rejected lighting candidates for provenance. The production
catalog is `src/dressing/kowloon/shop/assets/grocer-props.json`.

| Production prop | Triangles |
| --- | ---: |
| Scale | 854 |
| Empty bottle crate | 648 |
| Twelve-bottle load | 840 |
| Shelf bottle | 108 |
| Rice sack | 598 |
| Basket with eight modeled eggs | 976 |
| Garlic braid | 456 |
| Food tin / tissue roll | 44 / 62 |
| Tea carton | 30 |
| Seasoning jar | 76 |
| Small dry-goods bag | 94 |
| Printed shipping box | 12 |
| Stool | 398 |
| Counter | 380 |
| Fridge shell, before procedural interior and stock | 426 |

The repaired snack packet uses a sealed 96-triangle pouch with four printed labels
in one padded 1024 × 1024 texture. The crate uses a regular lattice with the original
worn red material. Both repairs avoid the damaged generated geometry. The regular
containers now use authored profiles; no further Tripo generation was billed. [Production metrics](production-metrics.json)
include final composed counts and dimensions. [Bake report](bake-report.json)
records intermediate source reductions, including the separate bottle reduction
used for the load; its basket count precedes the cavity repair and modeled eggs.

Three shared 2560 × 2048 atlases retain color, tangent normals and packed
metallic/roughness. Original sources occupy padded tiles; seven spare tiles hold
eight appearances for jars/bottles and four for other products. Small bags reuse
the sack appearances; crate bottle loads reuse the expanded bottle palette.
Labels vary without duplicating geometry or adding material bindings.
Eight-variant rectangles use 120 × 248 content texels plus replicated gutters;
four-variant rectangles use 248 × 248. The atlas allocation remains unchanged.
The runtime currently batches placed triangles by material rather than GPU
instancing. Sampled diffuse vertex colors remain available without the atlas.
The authored containers use opaque brown glass materials with flat generated
label art. Some other generated props retain lighting in their albedo. These are
environment props, not physically accurate transparent glass or legible product
labels at extreme close range.

## Reproduce and inspect

From the repository root, with Blender and Python/Pillow installed:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python tools/bake-liquor-props.py
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python tools/bake-kowloon-stock.py
node projects/kowloon-liquor-props/capture-catalog.mjs generated/liquor-props/catalog-review
node projects/kowloon-liquor-props/capture-store.mjs generated/liquor-props/store-review
```

Use a new capture directory each time. The bake requires the retained raw GLBs
at the paths in `models.json`; these are ignored generated outputs. It welds
coincident vertices before reduction, retains UV seams, fixes inconsistent corner
normals, packs all PBR channels together and composes the simple egg geometry.
The crate lattice is rebuilt locally using a selected strip from the existing
material maps. `tools/bake-kowloon-stock.py` separately rebuilds the sealed pouch
and bakes the original label without lighting; it also welds the fruit mesh before
reducing the reusable 24-apple pile. `tools/refine-shop-materials.py`, called by the
main bake, maps the new worn-wood and scuffed-plastic materials onto the stool and
crates and adds a 196-triangle produce crate. Wide displays use two uniformly
scaled crates and piles. The new normal/roughness maps are albedo-derived art
approximations, not measured materials.

`tools/bake-stock-appearances.py`, called by the main bake, projects generated
label art onto irregular package UVs and keeps matching normal/property tiles aligned.
It also creates the printed shipping box, pouch appearances and bag contact profiles,
then runs `tools/bake-clean-stock.py` for the authored containers. The packet-only
bake uses `--pouches-only` and leaves unrelated stock unchanged.

The catalog capture covers front, side and back for all seventeen production
entries. The storefront study calls the actual grocer generator with its real
materials, under neutral lighting in a simple room. It is visual prop evidence,
not a substitute for full AML, collision or navigation validation.

- [Four supported street displays](../../generated/liquor-props/clean-stock/showroom-r01/street-displays.png)
- [Retextured stool](../../generated/liquor-props/catalog-packed-r01/shop-stool-front.png)
- [Produce crate](../../generated/liquor-props/catalog-packed-r01/produce-crate-front.png)
- [Current storefront](../../generated/liquor-props/clean-stock/showroom-r01/storefront.png)
- [Scale and counter](../../generated/liquor-props/clean-stock/showroom-r01/counter.png)
- [Packet attachment variation](../../generated/liquor-props/clean-stock/showroom-r01/chips.png)
- [Wider store and hybrid fridge](../../generated/liquor-props/clean-stock/showroom-r01/wide-store.png)
- [Modeled eggs in generated basket](../../generated/liquor-props/catalog-r04/egg-basket-front.png)
- [Showroom capture hashes and counts](../../generated/liquor-props/clean-stock/showroom-r01/capture.json)

The narrow 2.4 m study contains 29,878 prop triangles, including 2,406 in its frontage; the 3.6 m study contains
39,306, including 4,892 in its frontage. The prior store image is retained as `before.png`, but its camera and
lighting differ, so it is not a controlled before/after comparison.

The production consumers are `projects/dressing-demo/level.aml` and
`projects/dressing-demo/storefronts.aml`, with the `kowloon-grocer-props` material.
Open the latter using `npm run --silent levelspec -- preview
projects/dressing-demo/storefronts.aml` when the full compiler is available.

## Verification boundary

The focused grocer tests cover mesh integrity, bottle/divider clearance, supported
rotations and seeded shelf variety, as well as suspension contact,
mirrored placement, per-prop and per-shop triangle budgets, containment, unchanged
physical geometry and valid GLB exports with shared PBR images. Type checking
passes. The catalog and showroom browser captures report no page/network errors.
The showroom also exercises rapid view changes. Independent production review
found no remaining placement blocker. Broader dressing verification is recorded
in `verification.md`; source changes in the concurrent surface task initially
blocked compilation, and no surface files were changed to bypass that blocker.

## Reference-led density and frontage

The original Chiu Fat and Bo Kee photographs informed tighter shelf spacing,
closer product runs, supported stacks, and more closely grouped fixtures. The
frontage now offers produce on stools, stacked-box stands, crate-supported shelves,
and two-tier carts. Seeded differences preserve those support relationships.
Street displays occupy a separate render-only part; sampled flat support,
collision/solid clearance and a central opening gate their placement. Existing
room furnishing bounds and physical/navigation geometry remain separate.

The additional local work spends no Tripo credits. Small stands stay below
3,000 triangles; two-crate shelves/carts below 4,500. Focused dense-interior
acceptance uses 35,000 triangles for the compact 2.2 m fixture and 45,000 for the
3.6 m fixture. Material images are shared; repeated fruit remains a baked clump.

## Seeded store layouts

The grocer generator now chooses one of three fixture arrangements: a front
service counter, a counter along a side wall, or a recessed counter with the
cooler near the entrance. Each can switch sides. Shelves, bulk-stock zones,
stools, hanging stock and lighting follow the chosen arrangement; stocking uses
separate random streams. Very narrow rooms use the compact front-counter family.

- [Front counter](../../generated/liquor-props/clean-stock/showroom-r01/layout-front-right.png)
- [Side counter](../../generated/liquor-props/clean-stock/showroom-r01/layout-side-left.png)
- [Recessed counter](../../generated/liquor-props/clean-stock/showroom-r01/layout-recessed-left.png)

The showroom dropdown includes all six combinations. Shelf-line instances omit
flat bottom caps covered by their support, retaining density within the existing
budgets. Free-standing catalog props remain closed. These are render-only shop
arrangements; collision and navigation do not change.


## Concept-guided merchandise pass

The [packed-store concept](concepts/packed-store-target.png) combines the previous
store render with the original Chiu Fat and Bo Kee references. Its exact prompt,
input paths and hash are in [the concept record](concepts/packed-store-target.json).
It guides density, product scale and color; it is not an achieved photorealistic render.

The current generator uses mixed small/large tins and jars, smaller bottles,
reduced dry-goods bags and printed shipping boxes on the shelves. Packed runs
use mostly full stacks and millimeter gaps while respecting rotated footprints.
Low tabletop/street displays use several close rows; hanging strings pack by
measured pouch bounds. Eight jar/bottle appearances cover red, burgundy, rust,
amber, yellow, green, blue and teal; other stock keeps four appearances.
Sack cloth and contents retain their neutral material colors. Smaller
repeated bags and pouches were reduced to keep existing triangle budgets.

[Generated label art](materials/packaging-labels.png) and its exact prompt/hash
are retained in [material provenance](materials/provenance.json). This pass spent
no additional Tripo credits. It changes visual dressing only.

## Closely packed bags

Floor sacks and miniature shelf/counter bags form tightly packed three-bag groups.
Four arrangements vary each bag's uniform scale, facing, depth and printed label.
The height differences are deliberate and visible; shelf groups cycle through
arrangements and labels deterministically rather than repeating one pose.

`tools/bake-bag-clusters.py` packs overlapping footprints and locally flattens the
contacting sides into thin bands beside shared separating planes. The remainder
of each body stays unchanged, including every vertex's height. The bake retains
source UVs and face counts, repairs affected normals, and writes regular/mirrored
profiles atomically to `assets/bag-clusters.json`. It runs at the end of the
appearance bake. This is a static contact deformation, not cloth simulation.

A floor triple remains 1,794 triangles; a miniature triple remains 282. The
existing shared textures supply different printed labels without new materials.

[Close-up of tightly packed bags](../../generated/liquor-props/clean-stock/showroom-r01/bags.png).

## Lower-polygon regeneration pilot

The local reduction experiment distorted labels and caps, so its meshes were
rejected and the production baseline restored. A separately approved 150-credit
Tripo pilot regenerated the original jar, bottle and tin concepts directly at
lower requested budgets with P1 and v3.5 standard PBR textures.

| Prop | Requested triangles | Actual triangles | Production at pilot | Decision |
| --- | ---: | ---: | ---: | --- |
| Jar | 64 | 92 | 94 | Reject: missing lid shape and label |
| Bottle | 80 | 126 | 110 | Retain candidate for reference; no polygon saving |
| Tin | 50 | 76 | 62 | Reject: blurred label and higher count |

Actual GLB index counts exceed all three requested limits. The server task records
confirm the intended parameters; a successful task is not budget or art acceptance.
The bottle's texture is cleaner, but this pilot did not produce a useful lower-poly
replacement. At the end of that pilot, production geometry, textures, placement
and bag contact were restored; the authored-container pass below supersedes them.

Matched comparisons use the same light and camera, uniform height normalization
and unchanged native candidate materials, with front/side/back and shelf-group
views. [Jar](../../generated/liquor-props/lowpoly-regeneration/compare-final/seasoning-jar-front.png),
[bottle](../../generated/liquor-props/lowpoly-regeneration/compare-final/drink-bottle-front.png),
and [tin](../../generated/liquor-props/lowpoly-regeneration/compare-final/food-tin-front.png).
[Results](lowpoly-regeneration-results.json) retain decisions, task IDs, actual
counts and model paths; [the approved plan](lowpoly-regeneration-plan.json) retains
exact commands and dry runs. No rerolls or paid conversions were submitted.

## Authored containers and clean UVs

The adopted replacement models the simple tin, jar and bottle directly, with
continuous upright wrap UVs, a rear seam and separate planar top/bottom islands.
The bottle's curved shoulder blends smoothly into its body and neck. Side faces
use smooth normals; top/bottom faces stay flat and cap rims remain sharp.

| Prop | Previous triangles | Current triangles |
| --- | ---: | ---: |
| Tin | 62 | 44 |
| Jar | 94 | 76 |
| Bottle | 110 | 108 |
| Twelve-bottle load | 864 | 840 |

The three source materials are 256 × 256. A new generated flat tin label and the
existing packaging artwork supply the print; glass, paper and metal regions get
separate authored roughness/metalness. Eight jar/bottle color variants and four tin
variants reuse the existing shared atlases. [Art and provenance](materials/clean-stock/provenance.json)
retain the exact prompt and hashes. No additional Tripo credits were spent.

Default narrow/wide studies drop from 33,862/44,332 to 29,878/39,306 triangles
(11.8%/11.3% fewer). Every placement call across seven layout studies is identical,
including size, facing and appearance selection; bag contact profiles are unchanged.

The editable [Blender file](materials/clean-stock/clean-stock.blend) has welded
geometry, UV seams, split normals and packed 256px maps. Rebuild the production
assets with `python3 tools/bake-clean-stock.py`; regenerate the Blender file with
Blender's `--background --factory-startup --python-exit-code 1 --python
projects/kowloon-liquor-props/open-clean-stock.py` options.

[Rounded bottle](../../generated/liquor-props/clean-stock/catalog-r03/drink-bottle-front.png),
[counter](../../generated/liquor-props/clean-stock/showroom-r01/counter.png) and
[wide store](../../generated/liquor-props/clean-stock/showroom-r01/wide-store.png)
show the final adopted assets under the same review lighting.

## Procedural enclosure screenshot

`build-store-surfaces.ts` fits the production wall and ground recipes around the
3.6 × 2.9 × 2.6 m store study. It includes chipped plaster, the current 80 texels/m
weathering/repair raster path, eroded 24 cm ceramic floor tiles and a concrete
street apron. The enclosure is a visual cutaway; the stock, room dimensions,
layout seed and review lighting retain their existing values.

```sh
node --experimental-transform-types projects/kowloon-liquor-props/build-store-surfaces.ts generated/liquor-props/store-surfaces/final
node projects/kowloon-liquor-props/capture-store-surfaces.mjs generated/liquor-props/store-surfaces/capture-final generated/liquor-props/store-surfaces/final/enclosure.glb
```

Use a fresh capture directory on subsequent runs. Open `store.html` through Vite
with `?enclosure=/generated/liquor-props/store-surfaces/final/enclosure.glb` to
inspect the finished enclosure and the six wide layout variations. Plain mode
remains available for controlled prop comparisons. The enclosure replaces the
placeholder room completely and has its own mesh budget; the 39,306 prop-triangle
count excludes it. The capture checks actual rendered prop attributes/materials,
camera equality, loaded maps, GLB validity and stable live capture inputs. The
enclosure is the baked snapshot identified by its report; later changes to offline
recipes are recorded as source drift rather than silently attributed to that GLB.

## Concept-guided shelf timber

The [material study](materials/shelf-weathering/observations.md) uses the actual
store screenshot, the Tripo wooden counter and the Bo Kee photograph to guide a
Kowloon/Ghost in the Shell–inspired ImageGen concept. A second ImageGen pass derives
four flat timber fields. Exact prompts and source hashes are retained beside them.

`node tools/bake-shop-timber.ts` combines those fields with the production
component-patina/noise functions to make sixteen padded wear variants. The shared
1024 × 1024 albedo, normal and roughness/metalness images add stains, localized edge
wear, joint dirt and sparse paper remnants. A first overly blotchy pass was
rejected; the adopted pass keeps broad panels restrained and grain readable.

The `shop-timber` finish role opts shelving and street support planks into this
bank. Without a distinct textured role, they retain the ordinary timber's UVs and
tints. The scoped adapter aligns grain with each member and chooses variants
without consuming the stocking RNG. Positions, normals, omissions, shelf
reservations and triangle counts stay unchanged. Both dressing-demo AML consumers
and the showroom bind the new three-channel material. The Tripo counter and other
generated assets remain the material reference.

The final wide view still has **39,306 prop triangles**; its separate baked wall/
floor enclosure has **290,628**. The focused material tests pass 5/5, with 21/21
existing support, layout and budget checks. No additional Tripo credits were used.

## Store ambient occlusion

The store viewer enables full-resolution GTAO by default, with a 0.22 m radius
and denoising for small shelf and stock contacts. The Ambient occlusion checkbox
compares the same HDR, 4× MSAA and tone-mapped view with the AO pass disabled.
The neutral page background stays outside tone mapping. This is a viewer effect;
exported meshes, materials, stock placement and triangle counts are unchanged.

The surface capture command also records matched AO-on/off renders, restored
output, an alternate layout and a resized view. Final evidence is in
`generated/liquor-props/store-surfaces/capture-ao-final/`.
