# Independent fidelity review — r01

**Verdict: changes required.** This is a recognizable first composition of the intended four-story tong lau, but it does not yet recreate the source's visual identity. The largest gap is the combination of almost clean pale architecture, nearly white tile, uniform windows, and orderly exposed shop fittings. The source reads as an old, heavily adapted building; r01 reads as a relatively new regular building furnished with selected old props.

## Inspected evidence and scope

- Source-only baseline: `review/source-inventory.md`, established from the original before seeing the candidate.
- Original: `projects/kowloon-building-polish/concepts/01-building.png`, including all three detail insets.
- Candidate: `generated/reference-building/r01/{comparison,hero,front,side,balcony,shops,roof}.png`.
- Frozen source: `r01/building-source.ts`, `r01/parts/{composition,structure,fixtures,shops}.ts`.
- `capture.json` reports the same loaded GLB SHA-256 for every inspected view: `ffd196df7ed0b594a3cd57400fb7620e3aaad8502e3d7a538892744fdda29ee2`; `build.json` identifies that export. The verdict applies only to this revision.
- Scope: visible exterior resemblance, material/detail hierarchy, and readable assembly relationships. Hidden interiors and rear/left completion are outside fidelity scope. This is not a structural, collision, navigation, or performance approval.

## What is established and should be retained

- Correct count: ground shops plus three residential floors. Rooftop equipment does not become an additional occupied story.
- Broad three-bank front facade, substantial right return, clipped corner, stacked cornices, and a parapet establish a credible coarse envelope. I do not have evidence for a wholesale width/depth change at this stage.
- The balcony has a shallow left part and deeper main projection, low solid upstand, tubular rails, radial fan, and real underside supports. These are useful starting assemblies, not yet a visual pass.
- Distinct closed left gate and open central shop, the red/cream canopy, the three principal traditional-character signs, off-white fan condensers plus older grille-front ACs, and asymmetric roof hut/tank are recognizably related to the source.
- Recessed shop depth and stocked shelves exist. This is more than a flat facade decal.
- No visible moss issue was found. Do not add moss to supply missing age.

## Highest-priority repairs

### R1 — Restore the large material blocks and material-specific age

**Evidence:** In `hero.png`, `front.png`, and `side.png`, the upper corner tile bands are pale ivory, almost the same value/color as the plaster. The source has conspicuous desaturated blue-green square tile fields. Most plaster, cornices, balcony fascia, roof parapet, and dark base in r01 remain broadly clean, with weak pale patches. The source shows strong gray exposed substrate, irregular flaking, dark runoff, corner/ledge dirt, and broken-up dark base paint. Small scratches on r01 metal cannot compensate for these missing facade-scale patterns.

**Repair target:** `parts/composition.ts` color/finish choices and `parts/structure.ts` `drawFace`, cornices, parapet, balcony surfaces, and plinth. Make the existing tile regions visibly blue-green in the actual render, with legible grout and uneven aged tiles. Keep the plaster mostly warm light cream but introduce coherent medium/large gray flaked areas, dark runoff beneath caps and ledges, damaged corner patches, and strong base scuffing. Cornices and fascia need their own aging rather than remaining clean trim around aged walls. Preserve brighter surviving paint amid the damage. Inspect the result at hero size as well as close up; adding finer noise alone will not close this finding.

**Priority:** highest. Color and wear affect most visible pixels and currently dominate the mismatch. Do not use baked scene shadows to solve this.

### R2 — Replace the uniform window-grid appearance and resolve the balcony door

**Evidence:** Every major r01 window repeats the same evenly divided dark rectangular grid. The source has narrow upper transoms over taller casement panes, differing open/tilted sections, screens/curtains, and more variation within banks. r01's first residential center bank has an opaque tall green rectangle pasted over part of an intact window, with another green rectangle below the sill; this reads as a panel/board, not the source's distinct recessed door between window groups. This is especially clear in `balcony.png` and `front.png`.

**Repair target:** `parts/structure.ts` `drawWindow` and `drawBalcony`, plus the first-story center opening in `parts/composition.ts`. Give the window banks a thin top transom band and predominantly tall lower panes, with a small selected set of open/tilted panes or differentiated curtains/screens. Make the first-story center group a coherent smaller window plus an actual framed balcony doorway with a visible inset/screen or glass panel; remove the overlapping window-grid/opaque-board appearance. Retain dark glass, but break up the identical charcoal rectangles.

**Priority:** highest. This changes the building's face and use, not merely decoration.

### R3 — Expose the balcony's weight and separate its supports from the shop canopy

**Evidence:** The source main view and balcony inset show a substantial weathered fascia and clearly separate concrete corbels beneath an exposed underside. In r01, the red/cream awning attaches almost directly against the slab, with the bracket bottoms entering/visually merging into its top. The frozen source confirms the very small wall-side gap: slab underside at `3.08`, canopy root at `3.03`, while brackets extend to `2.62`. The hero's higher camera hides more underside, but the overlapping vertical ranges are a real assembly/composition issue. The source's fan divider also has a stronger curved perimeter, radial bars, and a conspicuous wall hinge; r01's fan reads as sparse thin wire. Balcony pots are not legible at hero scale.

**Repair target:** `parts/structure.ts` balcony assembly and `parts/shops.ts` canopy placement. Establish an open band below the slab so the corbels can be seen as independent supports above the canopy. Retain the low upstand/open rails and stepped plan. Give the fan a clearer arched frame, thicker radial bars, and wall hinge/anchor, and position the few pots where their upper silhouettes show above the low wall. Strong fascia deterioration is also required under R1.

**Priority:** high. Recheck with a lower balcony detail camera as well as the hero before deciding whether further depth changes are needed.

### R4 — Recompose the main storefront as layered, accumulated street commerce

**Evidence:** `shops.png` shows a broad, evenly lit view of very tidy shelves, a neat repeated line of grain sacks, several evenly spaced empty crates, and large clear foreground floor area. The source has a darker recess, tall narrow wire display racks at its threshold, hanging cloth/stock beneath the canopy, more irregular stacked crates and pale cartons, and partial occlusion through multiple layers. The source does not read as a display of identical grain sacks. r01's awning stripes are comparatively strong and fresh; the left canopy is a small taut sheet rather than a fuller drooping patched fabric silhouette.

**Repair target:** `parts/shops.ts` central shop composition and canopy surfaces. Add a tall narrow stocked wire rack at the right jamb, hanging cloth/long goods on the left/inside, and denser varied-height crates/cartons concentrated around the opening; preserve a believable entry gap. Break up the repeated sack row and use the existing shelf stock behind those layers. Achieve a shaded recess through canopy depth/occlusion and runtime lighting, not a painted shadow. Desaturate/age the striped canopy, and give the left canopy more visible sag/irregular edge depth. Add restrained side-shop layering visible in hero.

**Priority:** high. The goal is the source's density pattern, not simply a larger prop count.

## Secondary but consequential repairs

### R5 — Complete the attached facade-service layer

**Evidence:** Source AC units have projecting external cages/side returns, connections, and clustered cables/conduit along nearby piers and around the corner. r01 has convincing individual fan/grille parts but much simpler attachments and mostly straight isolated downpipes; the right return remains unusually orderly and bare between them. The source's windows, hood edges, brackets, and wiring create a substantially richer silhouette.

**Repair target:** `parts/fixtures.ts`: add selected exterior AC cages with sides and support depth; route restrained connected cable/conduit bundles around the corner condensers and along actual piers; add a few irregular service/hood attachments to the visible return. Do not blanket every window with identical cages or add an arbitrary cable lattice. Relative AC body sizes are broadly plausible after comparison against their window banks; blanket enlargement is not supported.

### R6 — Make roof equipment match its reference role and material

**Evidence:** The source tank is a sizeable metallic silver cylinder with strong horizontal rings and a relatively flat top. r01's `roof.png` shows a small-looking white rounded plastic tank. The source roof hut has a dark green louvered door and heavily aged cream walls; r01 has a plain metal door and largely clean masonry. The source also has a sparse rooftop pipe/rail run and a more irregular skyline beyond the hut/tank.

**Repair target:** `parts/fixtures.ts` roof equipment: use the existing tank with an appropriate metal material and, where needed, straighter cylindrical/less domed silhouette; judge apparent size against the hut in the same view before changing dimensions. Add the door's visible louver detail and age the hut/parapet. A small pipe/rail run is useful; do not fill the roof with unrelated clutter.

### R7 — Present the large right sign as a broad readable face

**Evidence:** In the source, the brick-red vertical sign presents a substantial pale-lettered face in the main view. In r01 hero it becomes a narrow strongly foreshortened strip. Its words and approximate story-level range are already appropriate. Camera angle contributes, but the sign plane/projection relative to the corner also deserves an explicit comparison.

**Repair target:** `parts/fixtures.ts` hardware sign plane and bracket orientation, coordinated with the hero camera. Make a source-like broad face readable from the main view without floating it or inventing a different support. Do not arbitrarily move all signs vertically: normalized against floor levels, their ranges are broadly supported. The smaller repair sign and pharmacy sign should retain their distinct hierarchy.

### R8 — Remove the presentation pedestal and improve base contact

**Evidence:** The source ends in a modest worn curb/road edge. r01 hero/front show a conspicuous broad light-gray rectangular display slab around the pavers. The repeated very clean curb blocks and regular gaps also attract attention. The source corner/base inset specifically emphasizes chipped charcoal paint, dirty rounded paving, and a flush drain.

**Repair target:** Ground/stage presentation and `parts/structure.ts` `drawGroundContact`. Reduce or remove the exposed outer slab as a visible pedestal, retain the narrow sidewalk/curb, and differentiate/scuff the paving and dark base. Keep the existing corner drain. Large ground expansion is unnecessary.

## Camera/comparison findings, separate from model repair

- The comparison board retains the complete original and labels the camera approximate, which is appropriate. However, the source building occupies substantially more panel height than the candidate. Equalize roof-parapet-to-curb height and use a consistent crop so prop size, wear density, and silhouette can be compared without mentally rescaling.
- The current hero is elevated enough to hide much of the balcony underside and show more of horizontal ledges. The source emphasizes those undersides. A lower approximate hero or an additional lower front-right balcony detail is needed; do not claim absent geometry merely because this camera hides it.
- The exact source perspective is concept art and may not be internally camera-calibratable. Pixel-perfect alignment is not required. Current evidence does not support a wholesale building aspect-ratio change or blanket AC/sign height corrections.

## Re-review request

Next pass should close R1–R4 visibly, then address the compact R5–R8 details. Provide equal-scale hero comparison, a low balcony/detail view, shop view, upper-facade crop, and roof view from the frozen revised export. Technical presence of a part or a material ID is not closure; the actual rendered relationship/color/density must be visible. No art-locking tests are requested.
