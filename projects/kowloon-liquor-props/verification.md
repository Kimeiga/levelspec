# Liquor prop verification

## Independent reviews

The test reviewer designed and reviewed `tests/aml-grocer-props.test.ts` around
actual transformed meshes, room containment, physical invariance, PBR export,
shared image counts and total triangle budgets. Final focused run: **13/13 pass**.
The implementation reviewer inspected the production code and all five showroom
views. Findings about counter support/height, crate bottle height, normal repair,
atlas padding and fridge support were corrected. Final follow-up: **no remaining
material implementation findings**.

The showroom viewer also received independent review: hemisphere illumination
now follows domain +Z, pending texture loads are shared, and superseded async
renders dispose their candidate group. The browser capture exercises rapid
view changes before its five sequential captures. Final evidence is
`generated/liquor-props/showroom-r03/capture.json`; captured source and texture
hashes match the reviewed files. No browser page or network errors were recorded.

## Geometry and export

- Final catalog: 14 entries with measured combined bounds, centered footprint
  and bottom origin; triangle caps and matte egg materials pass.
- Representative production grocers: 23,299 and 24,364 triangles at
  2.2 × 2.6 × 2.4 m; 32,935 and 33,690 at 3.6 × 3.4 × 2.6 m.
  Actual dressing remains within the rooms, collision and physical hash unchanged.
- All tested seed/transform combinations preserve packet seam contact and
  spacing. Default shelf row behavior remains unchanged outside the grocer.
- GLB validator passes for the exported props with embedded shared PBR images.
- Catalog inspection: 42 front/side/back captures in `catalog-r03`.
- Showroom: 25,969 narrow / 31,067 wide prop triangles, all five views reviewed.
- `npm run check`: passes after concurrent surface compiler files were restored.

The full street capture and broader dressing suites are separate checks; their
results are recorded below when complete. The showroom evidence alone does not
validate full-map navigation or gameplay. The generated bottle material remains
opaque, and some albedo lighting remains visible at close range.

The full street capture retry `store-r04` timed out waiting 30 seconds for the
preview source response, with no recorded browser errors. Its `failure.json` is
retained; no full-street capture success is claimed. The standalone production
showroom provides the current visual evidence. The shared capture tool was not changed as part of this prop work.

The combined broader run of `aml-grocer-props`, `aml-shop-dressing`,
`aml-building-dressing` and `aml-dressing` was stopped after five minutes without
completion. Buffered output on termination reported 14 passing tests (including the 13
focused grocer cases), zero failures, and three canceled suite files at 327 seconds.
The broader suites are **incomplete**, not passing or demonstrated failing. The
separate focused grocer run also completed normally with 13 passing tests. No assertions were
weakened and no unrelated surface code was changed.

## Basket cavity correction

The user's follow-up identified that the eggs sat on the basket's generated
closing surface. The original 48-triangle raised fan is now replaced by a
recessed floor and inner walls meeting the retained outer lip. Eight eggs lie
horizontally on the actual interior, with contact calculated against its triangles.
The basket is now 496 textured plus 480 matte triangles, 976 total, with a
combined height of 0.042932 m. No new AI generation was submitted.

Independent implementation review inspected front/side/back in `catalog-r04`
and sampled all egg face corners, edge midpoints and centers against the cavity.
Every sampled footprint lies inside it, every egg makes contact, and sampled
penetration stays within coordinate rounding. No material findings remain.
An independent regression now checks a real central recess, each egg predominantly
below the rim, interior containment and supported contact. This complements the
existing material, catalog budget, room containment and export checks.

Final visual evidence for this correction: `catalog-r04` and `showroom-r04`, both
with zero recorded browser errors. The showroom contains 25,988 / 31,086 triangles
for the narrow / wide variants. These supersede the earlier basket captures.

After the cavity correction, the full focused grocer suite passes **14/14** and
`npm run check` passes. Contact checks are sampled geometric evidence, not a
continuous triangle-intersection proof.

## Packet/crate repair and stock variety

The user identified torn chips and warped red crates. The packet's original
96-triangle reduction had fragmented UV seams; welding alone improved topology
but stretched the label. The adopted repair is a sealed 192-triangle inflated
pouch with the original label rendered without lighting into a padded 512 px
texture. Every edge has exactly two incident faces. The complete front skin uses
the label; side seams and rear use matching cream paper, avoiding alternating
printed/plain triangles. Untextured use retains the caller's fallback tint.

The crate's warped webs originated in the generated source. It now uses 648
triangles of straight closed rails, beveled framing, deliberate hand openings,
floor slats and bottle dividers, with the original worn red material. Divider
pitch follows the actual fitted load; independent triangle checks find no bottle
shell crossing any of the five dividers, and every bottle touches a floor rail.
No additional AI generations were submitted.

Shelf grouping now varies from one to four facings, with broader seeded yaw,
occasional quarter turns, group and per-item setbacks, gaps and stack heights.
Exact rotated footprints reserve shelf space. The first fitting item remains
stocked, including a shelf with space for only one unit. Scale, basket and sack
rotations use reserved support footprints. Crates and their loads rotate as one
stack. The shared shelf improvement applies to other trades using `stockShelf`.

Independent implementation review inspected final `showroom-r09` chips, crates
and counter views and checked all recorded hashes: no remaining material findings.
The final showroom has 26,504 narrow / 31,190 wide prop triangles and no recorded
browser errors. `catalog-r06` records front/side/back views of the repaired crate.
The old tight-shelf regression passes. The old full-street texture fixture fails
before its stock assertions on an unrelated surface-appearance chart budget
(19,169 requested versus 16,384 allowed); that fixture and surface code were not
weakened or changed to bypass the failure.

Final focused result after all repairs: **20/20 passing**, with `npm run check`
also passing. New regressions cover sealed packet topology and front-only print,
crate openings, loaded bottle/divider crossings and floor contact, seeded shelf
variation without footprint overlap, and real scale/sack support across seeds.
Both independent reviewers approved the final implementation and tests. The
separate full-street surface-budget failure remains the only recorded limitation
for this revision.


## Packed storefront and material revision

Revisited the original Chiu Fat and Bo Kee images. The new production frontage
uses stool/tray stands, stacked boxes, crates supporting two shelf levels, and a
wheeled cart; the stocked interior uses tighter product runs and closer shelving.
Wide produce displays hold two crates with uniformly scaled fruit piles. The
apple bake now welds seam positions before decimation, retaining coherent fruit
instead of shards. A 24-apple clump is 1,356 triangles. New produce crates are
196 triangles each, including small metal fasteners; stool and red-crate geometry
remain 398 and 648 triangles. Their new material art shares existing atlas tiles.
Normal/roughness are restrained albedo-derived approximations.

Final visual evidence: `generated/liquor-props/showroom-r13` (six views) and
`generated/liquor-props/catalog-r08` (45 front/side/back views), both with zero
browser/network errors. Source/material hashes match the captured artifacts.
The narrow study is 40,974 triangles including 3,598 frontage triangles; the wide
study is 47,784 including 5,380 frontage triangles. The separate four-assembly
comparison totals 11,648; it is an inspection lineup, not a single storefront.

Frontage support reads the original visible render geometry, separately from
collision. This preserves support on visible noncollidable background streets.
Placement checks include a central 1 m opening, flat support samples, standing
space, authored collision, complete closed-solid enclosure, other buildings and
an allowance for opposing displays. These are conservative visual-placement
checks, not continuous navigation proof. No collision or navigation is added.

The broader shop suite was stopped after ten minutes without completing. A full
native dressing compile separately hit the concurrent surface appearance
resolution error on the tenement deck. No surface compiler changes or weakened
appearance diagnostics were used. Focused integration exercises the real dressing
phase against native compiled AML geometry before that later appearance stage.

Final focused validation: **`npm run check` passes; 33/33 tests pass** across
`tests/aml-grocer-props.test.ts` and `tests/aml-shop-frontage.test.ts`. Coverage
includes support/containment and per-assembly budgets, tight shelf occupancy with
seeded variation, coherent fruit proportions and two separate piles, material
export, unchanged physical/navigation output, original visible ground ownership,
enclosing solids and standing-space rejection. The overhead fixture sits above
the pre-existing shop-opening clearance so it tests empty-space classification
without suppressing shop creation. Independent test and implementation reviews
resolved their findings; no paid Tripo generation was added.


## Store-layout revision

Three arrangement families now produce genuinely different counter orientations
and positions, shelf runs, cooler positions and bulk displays; each also supports
left/right reflection. A separate layout stream keeps fixture choice independent
of stocking and detail. The pure plan reserves full occupied volumes; tests inspect
real emitted assets as well as those reservations. The production minimum room
width/depth and shallow side-counter boundary are included.

Review corrections moved the side-counter stool behind the front sack zone in
2.4 m-deep rooms, set the pendant clear of the high wall rack, and kept fan blades
clear of the back shelving. Supported shelf instances omit only their planar
contact caps; free placements retain the full mesh. Existing dense-stock and
35k/45k representative interior budgets remain in force.

Current visual evidence is `generated/liquor-props/showroom-layout-r02`: twelve
captures, including all three families on both sides, with zero browser errors.
The six wide views contain 37,596–41,024 interior triangles plus 3,598–7,108
frontage triangles. This revision reuses all approved models/materials and spends
no additional generation credits. The prior full appearance-compiler limitation
remains; this evidence does not claim a successful full-street render.

Final layout validation: **37/37 focused tests pass**, including the added
layout and overhead-clearance cases; `npm run check` passes. The complete run
is retained at `generated/liquor-props/layout-final-tests.log`. Independent
test and implementation reviews resolved their findings. Capture hashes match
current production sources and material assets.

## Concept-guided density and packaging pass

Generated `concepts/packed-store-target.png` from the previous front-right scene
and the original Chiu Fat/Bo Kee photographs, then used it to steer the actual
stock generator. Exact prompt, inputs and hash are retained beside the image.
Generated eight printed label designs; four package appearances share the same
three 2560 × 2048 PBR atlases, with copied matching normal/property regions and
replicated gutters. The independent pouch atlas is now 1024 × 1024 with four padded
labels. Labels and suitable colored regions vary; sack cloth and contents retain
neutral source colors. No additional Tripo credits were spent.

Added a 94-triangle miniature dry-goods bag and 12-triangle shipping box. Shelf
categories now include several tin/jar sizes and smaller bottles. Explicit packed
stocking fills almost all horizontal capacity with mostly full supported stacks,
while other trades retain the varied stocking mode. Visible low displays use
close rows in a single layer; wide boards use two rows to keep assembly costs
bounded. A 512-seed real-emission display audit measured maxima of 2,720 (stool),
2,346 (box stand), 4,448 (crate shelf) and 3,530 (cart), below the existing 3k/4.5k caps.
The audit record is `generated/liquor-props/display-budget-audit.json`.

Hanging rows use measured pouch and clip envelopes, retaining varied seam
attachments and close spacing. Independent review caught clip-to-neighbor
crossings when only the pouch bounds governed spacing; the final planner also
reserves clothespin and spring extents. The sealed pouch was reduced from 192 to 96
triangles while retaining its crimped seams and closed manifold. Main-store budgets
remain 35k/45k; no collision or navigation changes are part of this pass.

Independent implementation review also caught texture filtering at pouch-tile
boundaries and dense foreground displays exceeding their existing caps. Four-pixel
replicated gutters and a single layer of low-display merchandise resolve those
findings. The focused tests inspect actual atlas pixels and emitted geometry,
including local UV orientation, PBR correspondence, textureless fallback colors,
multiple observed variants, supported boxes on shelves, proportionate small stock,
packing/support, and physical geometry invariance.

The complete 51-view catalog review is `generated/liquor-props/catalog-packed-r01`
with no recorded browser/network errors. Small bag and box silhouettes were
checked from front/side/back. The production material files and hashes are in
`production-files.json`. These showroom/catalog checks do not remove the earlier
full appearance-compiler limitation or establish gameplay/navigation behavior.


Final showroom evidence is `generated/liquor-props/showroom-packed-r04`: twelve
views, zero page/network errors, and matching hashes for all captured source and
material inputs. The six wide layouts contain 36,244–40,292 interior triangles;
frontage adds 3,550–7,060. The default narrow study is 32,710 total including 2,622
frontage; the default wide study is 42,464 including 5,108 frontage. Independent
clip/spring geometry review found no neighboring-pouch crossings across 402 pairs
from 100 seeds in both handedness. All implementation-review findings are resolved.

Final validation: **46/46 focused tests pass**, with no skips, in
`generated/liquor-props/packed-final-tests.log`; `npm run check` passes. Independent
test and implementation reviews both close with no remaining findings. The prop
skill now records concept-first scene targets, multiple product sizes and label
palettes, PBR alignment and visible-density budgeting; its skill validator passes.

## Grounded leaning bag pairs

Added offline contact profiles for the existing floor sack and miniature dry bag.
Two source bodies bend toward one another with a linear horizontal shear; their
base heights, faces and texture coordinates stay intact, and shading normals use
the matching inverse transpose. The offline triangle-projection calculation
finds the first non-crossing X separation at shared YZ coordinates. Contact falls
at approximately 69–79% of bag height; a 0.5 mm source-scale gap prevents actual
mesh crossings. Mirrored profiles preserve legible labels and contact together.

Each floor pair is placed as one support-preserving group with seeded yaw/depth;
shelf/counter bags are paired stock units. Every complete pair fits uniformly into
its reserved envelope. The 598/94-triangle source bodies are reused without extra
faces, new textures or paid generation. Contact is an authored pose, not cloth
physics. The reproducible tool is `tools/bake-bag-clusters.py`, called by the
appearance bake; its small profile JSON is included in `production-files.json`.

The current browser evidence is `generated/liquor-props/showroom-lean-r02`, with
13 hash-verified views and no page/network errors. `bags.png` shows floor and
counter pairs close up. The six wide layouts contain 35,386–39,898 interior
triangles plus 3,550–7,060 frontage triangles. Type checking passes.

Independent implementation and surface-contact review passes: all four profiles
have no triangle crossings. A separate vertex/face and segment/segment distance
audit measures 0.482–0.494 mm nearest gaps at 68.9–78.7% of bag height. Reported
bounds, grounding, uniform fit, shading normals and reflected/yawed placements
also pass. The dedicated close-up confirms the intended shoulder contact.

## Three-bag groups and eight-color jars/bottles

The final bag groups contain three complete bodies. Both outer bags lean toward
the middle bag; the contact graph connects all three through upper-body contact.
The floor group is 1,794 triangles and the miniature group 282, reusing the
unchanged source meshes. Independently measured contacts lie at 58.9–80.1% of
group height, with no surface crossings. A 2 mm inner fitting margin prevents
floating-point rounding from rejecting the first group in a compact floor zone.

Jars, shelf bottles and crate bottle loads now have eight palette variants.
Jade, navy, mustard, cream, burgundy, teal, amber and charcoal appearances reuse
existing generated label designs. The shared atlas dimensions and material count
stay unchanged; these variants use padded 120×248 content rectangles, retaining
matching normal/property transforms and sampled fallback colors. Other products
retain four variants. Runtime stocking uses the asset's actual variant count.

Final evidence: `generated/liquor-props/showroom-triples-r02`, 13 error-free
views with matching source/profile/material hashes. `bags.png` shows the triples;
`counter.png` and the layout views show the expanded packaging colors. Wide
interiors contain 33,764–40,768 triangles; the default narrow study is 34,686 total
including 2,622 frontage, and default wide is 44,590 including 5,108 frontage.

Final focused validation: **53/53 tests pass**, zero skips, in
`generated/liquor-props/lean-final-tests.log`. Coverage includes upper-body contact
connecting at least three grounded bags, no actual mesh intersections, mirrored
and rotated placement, normal correction, whole-group shelf reservations,
eight jar/bottle artworks with at least six demonstrated in real stocking, PBR
alignment, supported shelves, all prior layouts and unchanged budgets/physical
geometry. Independent implementation and test-code reviews close without findings.

## Upright bags and visible warm packaging

User feedback supersedes the forced leaning pose. Removed the lean option,
position shear, special normal transform and profile lean fields. Each bag now
retains its exact original source shape under only uniform scale, yaw and
placement. Surface-based packing keeps three upright bags close together without
crossings or floating bases; contact naturally occurs near the broad lower cloth.
Independent reconstruction checks found <2e-16 m positional error relative to
rigid source transforms, and actual surface gaps of 0.470–0.497 mm at source scale.

The eight jar/bottle variants now favor red, burgundy, rust and amber alongside
yellow, green, blue and teal. Generated label artwork receives matching colored
ink and substantial border bands, so variety is present on the printed body
labels as well as lids. Normal/property maps, atlas dimensions, geometry and
material counts remain unchanged. Source-label prompts are retained; no new
Tripo generation was submitted.

Final visual evidence is `generated/liquor-props/showroom-upright-warm-r01`,
13 error-free captures with current hashes. `bags.png` shows original upright
silhouettes and warm merchandise colors; `counter.png` shows the stronger jar
palette. Independent implementation and test-code review reports no remaining
findings. The prop skill now favors close upright placement and requires visual
acceptance before adopting soft-body deformation.

Final validation: **52/52 focused tests pass**, zero skips/failures, in
`generated/liquor-props/upright-warm-final-tests.log`; TypeScript checking passes.
Tests verify rigid original-body identity, close grounded triples, actual warm
label pixels, distinct production-used variants and all existing geometry budgets.
Both required independent reviews close without unresolved findings.

## Varied bags with local contact flattening

The current request replaces rigid packing with localized contact deformation.
Four arrangements per bag type/reflection vary scale, yaw, depth and label order.
Three bags share each group; floor groups choose seeded arrangements, while
successive shelf groups cycle arrangements and label order. Only contact-side
vertices compress into thin separating bands. Every source Z coordinate, UV,
face and material assignment stays intact, with corrected shading normals.
The rest of each silhouette remains unchanged; there is no whole-body shear.

The offline bake retains 0.4% of penetrating thickness to avoid collapsed faces,
with 0.3 mm between shared contact limits at source scale. The miniature first
arrangement aligns its finite side patches in depth. Independent audits find
outward normals and no collapsed faces after runtime position/normal rounding,
unchanged ground contact and exact reported bounds. The shelf envelope is about
5% larger to keep the varied bags visible and maintain existing scene budgets.
No geometry faces, textures, materials or paid generations were added per bag.

Final visual evidence: `generated/liquor-props/showroom-contact-flat-r03`,
13 captures, zero page/network errors, all source hashes matching. `bags.png`
shows varied floor triples and `counter.png` shows the shelf groups. The default
narrow study has 33,862 triangles including 2,622 frontage; default wide has
44,332 including 5,108 frontage. The six wide interiors range from 35,572 to
42,052 triangles, with separately budgeted frontage. TypeScript checking and the
updated prop skill validator pass.

Final focused validation: **64/64 tests pass**, zero failures or skips, in
`generated/liquor-props/contact-flat-final-tests.log`. Tests independently recover
source-body correspondence through UVs and verify localized flattening, preserved
heights, visible size/yaw/label variation, actual close contact without crossings,
clean normals, mirrored host transforms and complete shelf reservations. Existing
layout, density, warm palette, physical-geometry and polygon limits remain covered.
Independent test-code review closes with no unresolved findings.
Independent implementation/visual review also closes without findings. Final
canonical neighbor gaps measure 0.301–0.569 mm. A separate 512-seed frontage audit
stays within all caps (maxima: stool 2,720; box stand 2,346; crate shelf 4,448;
cart 3,530 triangles). The final close-ups confirm tight groups with visible
size, facing and label differences and no exaggerated whole-body lean.

## Polygon reduction experiment — rejected, baseline restored

Compared conservative local reductions of repeated jars, bottles and tins against
`showroom-contact-flat-r03` and a new isolated catalog baseline. Aggressive Blender
reductions saved 13–14% in the default narrow/wide studies but visibly damaged
caps, label mapping and shading. Attribute-aware permissive mesh simplification
also crossed texture charts and was rejected. A smaller jar/bottle-only candidate
saved 3–4%, but user feedback still found the textures unsatisfactory.

Restored the catalog and appearance data from the frozen baseline. Every source,
profile and texture hash listed in `showroom-contact-flat-r03/capture.json` matches
again. Removed the experimental optimizer from the production bake; its source,
reports, inventory traces and comparison captures remain under ignored
`generated/liquor-props/polycount/`. No local reduction is adopted.

Prepared `lowpoly-regeneration-plan.json`: three independent P1 image-to-model
calls using the original jar/bottle/tin concepts, at 64/80/50 triangles respectively,
standard PBR textures with v3.5 texture generation. CLI dry runs are valid with no
warnings. The user approved the 150-credit batch; completed results are recorded below.


## Direct low-poly Tripo pilot — completed, not adopted

All three approved calls succeeded at 50 credits each, 150 total. Final balance
is 4,850 with no frozen credits. Actual GLB triangles are jar 92 (requested 64),
bottle 126 (requested 80), and tin 76 (requested 50); server task records confirm
those requested parameters. All three raw GLBs validate without errors.

`generated/liquor-props/lowpoly-regeneration/compare-final` contains 12 matched
front/side/back/context captures with zero browser errors. The jar loses the
distinct lid/neck and label; the tin loses printed detail; the bottle has cleaner
texturing but increases geometry relative to the current 110-triangle prop. No
candidate meets the combined optimization/fidelity objective, so none is adopted.

Every production source/material/profile hash from `showroom-contact-flat-r03`
again matches. The new topology regression and existing catalog checks pass 2/2
on restored production assets (`polycount/restored-tests.log`). Experimental
local reducers are archived only under `generated/`, with no production bake hook.
The required independent reviews of the reduction candidates found texture
regressions; those candidates were rejected. Independent reviewers subsequently
became unavailable due to their usage limit; the later Tripo comparison tool and
visual judgments were checked by the primary agent, not independently signed off.


## Authored containers and clean material mapping — adopted

Replaced the tin, jar, shelf bottle and crate bottle load with deterministic
profile geometry. Their exact declared dimensions are preserved. Body UVs are
continuous and upright with rear seams; caps use separate planar islands. Sides
shade smoothly around the circumference. The shelf bottle uses additional profile
rings and continuous shoulder normals to round the transition into the neck;
top/bottom caps remain flat and the cap lip stays sharp. The native Blender file
explicitly preserves those face shading flags and custom normals.

Final triangles: tin **44** (was 62), jar **76** (was 94), shelf bottle **108** (was 110),
and twelve-bottle load **840** (was 864). The load retains a compact shoulder below
its surrounding crate. Default narrow/wide totals are **29,878/39,306**, down from
33,862/44,332: **11.8%/11.3%** fewer triangles. Their frontage portions are 2,406/4,892.
Across seven matched layout studies, inventory calls are exactly identical:
instances, positions, envelopes, rotations, mirror transforms and variant choices.
The existing shop and display triangle caps remain unchanged.

Materials use 256 × 256 source maps, packed into the existing padded shared atlases.
New ImageGen tin label art and retained jar/bottle artwork have congruent color,
normal and packed material-property charts. Paper, opaque glass and metal regions
have authored roughness/metalness; jar/bottle bottoms correctly remain nonmetal.
Eight warm/cool jar/bottle variants and four tin variants remain available.
Exact prompts, provenance and final hashes are in materials/clean-stock/.
No additional Tripo credits were spent.

Evidence under generated/liquor-props/clean-stock/:

- catalog-r03: 51 front/side/back images; zero browser errors.
- showroom-r01: 13 actual production views; zero browser errors and stable source hashes.
- inventory-comparison.json: seven matching placement inventories and before/after counts.
- isolation.json:only the four intended catalog/appearance entries differ; all atlas
  pixels outside their padded tiles and all bag contact profiles are unchanged.
- bake-verification.json:clean bake idempotence, full appearance bake and pouch-only
  bake each reproduce byte-identical catalog, appearance, profile and texture files.
- blender.log:successful native file creation. Opened the saved file in Blender and
  visually verified the packed textures, rounded shoulder and flat cap surfaces.

Independent implementation review verified the final geometry, UVs, smooth/flat
shading, packed source images and matched store renders. Blender's saved normals
match production within its tiny storage quantization. The final file is
materials/clean-stock/clean-stock.blend; open-clean-stock.py regenerates it.
The prop skill now records the authored-profile/flat-label workflow and the
smooth-side/flat-cap distinction.

Final focused coverage: all **67 cases pass across the final runs**. The full
five-file matrix initially passed 66/67; the corrected appearance suite then
passed 5/5, superseding that file's earlier result. Evidence is
clean-stock/final-tests.log and clean-stock/appearance-tests.log. No palette,
contact, per-prop or per-shop tolerance was relaxed.

Two test assumptions needed correction: edge-only bottle/floor contact is not
interior penetration, and the default red artwork may occur once in a variant
list. A fixed physical front-ray grid now assesses actual label color independent
of mesh triangulation. The former sparse barycentric samples happened to miss the
blue ink on broad authored faces. Independent grids find 70/357 and 97/437 blue
samples, both well above the unchanged coverage threshold; all chromatic samples
are blue. No tint change was adopted; all production hashes match the reviewed
showroom-r01 capture exactly. The tests also explicitly protect flat cap normals
and continuous bottle-shoulder side normals.

Both independent implementation and test reviews are complete with no unresolved
prop findings. Python syntax checks and the prop skill validator pass. The first
repository TypeScript check passed; the final rerun is blocked by concurrent,
unrelated additions in tests/aml-window-interiors.test.ts at lines 69 and 74
(accessing materials/extensionsUsed on string | Uint8Array). Those files were
not modified for this task. The final error output is clean-stock/typecheck.log.


## Procedural enclosure and concept-guided shelf wear

The current adopted whole-store image is
`generated/liquor-props/store-surfaces/capture-aged-r02/wide-store.png`;
`walls-floor.png` is the close view. The neutral-room and enclosure captures use
identical cameras, lighting, stock geometry and material bindings. The old room
has zero emitted triangles in enclosure mode. Both captures load without browser
errors. The embedded enclosure GLB validates with zero errors and zero warnings.

The baked enclosure uses production drawSkin with the weathering/repair raster
path at 80 texels/m and the real tile/concrete ground fields. It contains 290,628
triangles under its separate 500,000 cap and 971,808 generated texels under 4M.
Its bounds are X[-.08,3.68], Y[-2,2.98], Z[-.08,2.6]. Exporter Y-up and viewer Z-up
conversion cancel exactly once. Wall thickness, inward faces and floor contacts
were independently inspected. The tile field varies from -1 to +3.5 mm; no
floating feet or double enclosure is visible. An independent precision audit
found microscopic inherited tile slivers (maximum reversed area 1.24e-10 m²),
not a visible screenshot defect; core surface/export precision was not changed.

The enclosure's build report records the actual recipe/image inputs and embedded
GLB hash. A stricter earlier capture was rejected when another active task changed
raster.ts after the bake. The accepted boundary checks the immutable GLB against
its report and records later offline recipe changes as bakedSourceDrift. It
strictly freezes live prop/viewer/map inputs during capture. No claim is made that
the frozen enclosure includes later concurrent recipe edits.

Built-in ImageGen produced a material concept from the actual store image, the
Tripo counter and the Bo Kee reference, then a neutral four-field timber source.
The project retains both prompts, images, source hashes and observations under
materials/shelf-weathering/. The reference photograph is not a production texture.
The first overly blotchy atlas was rejected. The adopted bank contains sixteen
restrained, padded albedo/normal/ORM variants with edge-localized wear, joint dirt,
subtle stains and sparse label remnants, reusing the production component-patina
and noise functions without modifying their shared source.

The new shop-timber role is opt-in and falls back to existing timber/plain behavior.
A scoped adapter changes only eligible board faces' UVs/material/tint. Stocking
randomness, every position/normal, triangle counts, shelf reservations and nonwood
attributes remain unchanged, including reflected hosts and street supports.
The wide store remains 39,306 prop triangles. Generated assets and bag contact
profiles remain unchanged. Both dressing-demo consumers and the showroom bind the
same three 1024 × 1024 maps; no new Tripo calls were made.

Validation: new timber suite **5/5**, existing support/layout/density/budget checks
**21/21**, independent test and implementation reviews passed. Logs are
`generated/liquor-props/shelf-timber-tests.log` and
`shelf-timber-existing-tests.log`. Runtime checks used Node's explicit
`--experimental-transform-types` flag for concurrent WeatheredPen syntax.
The latest `npm run check` and prop skill validation both pass; an intermediate
undefined dripNoise error in concurrent component-patina work was subsequently
resolved by its owner. Final typecheck evidence is
`generated/liquor-props/store-surfaces/final-typecheck.log`.

## Store ambient occlusion

Added default-on full-resolution GTAO to the local store viewer, with a comparison
checkbox, 0.22 m world radius, denoising and a shared HDR/MSAA/output pipeline.
Scene geometry, materials, stock and lighting are unchanged. The page background
stays outside tone mapping. No additional geometry or texture assets are created.

Final browser evidence: `generated/liquor-props/store-surfaces/capture-ao-final/`.
AO changes 123928 scene pixels by more than two channel levels; turning it back on
restores the original image with zero such differences. Camera, prop hashes and
triangle counts match across the toggle. Neutral backdrop is verified unchanged.
Wide, close, alternate and resized views were visually inspected. No browser,
network, shader-console or GLB validation errors. JavaScript syntax checks pass.
Independent test and implementation reviews passed with no material blockers.
This is screen-space contact shading in the viewer, not AO baked into exports.
