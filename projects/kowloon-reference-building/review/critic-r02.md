# Independent fidelity re-review — r02

**Verdict: meaningful progress, changes still required.** The building now has its key color blocks and more of the source's attached detail. Four concentrated repairs remain: aged masonry, window appearance, the main canopy/corbel composition, and ground contact. This is not a request to expand the project or reproduce hidden architecture.

## Evidence and scope

Inspected the original concept and r02 `comparison.png`, `hero.png`, `front.png`, `side.png`, `balcony.png`, `shops.png`, and `roof.png`. Consulted the frozen r02 part sources only to locate changed assemblies. `build.json` and all six `capture.json` entries identify GLB `a8fc2e1a546a94a6ab8ee15f6348943beff12bf8d094330e9b9aa627082bd4d3`; capture errors are empty. Those provenance records are consistent. They do not establish visual fidelity by themselves.

Scope remains visible exterior resemblance. No hidden interior, navigation, performance, or complete architectural validation is implied.

## Closed or substantially improved findings

- **R1 color blocks:** the two jade tile fields now visibly wrap the corner, and the dark charcoal base is clear. These are real improvements. The tile could eventually be slightly cooler/bluer, but color refinement is subordinate to the remaining masonry-age problem.
- **R2 doorway:** the opaque board-over-window defect is closed. The balcony now has a separate full-height screened door and neighboring narrow window. Keep this organization.
- **R3 assembly:** the lower balcony view now exposes the corbels; their existence is no longer in dispute. The fan has a clearer frame/hinges, and small pots read above the upstand. Keep those repairs.
- **R4 street stock:** the right threshold rack, hanging stock, varied merchandise, bottle crates, and less repetitive foreground improve the shop. Do not revert to the row of identical sacks.
- **R5 services:** projecting AC cages, connections, and selected return attachments make the facade more convincingly adapted. No further indiscriminate cage multiplication is requested.
- **R6 tank:** the tank now reads as metal and as a straighter cylinder. That material/silhouette repair is accepted for foundational recreation.
- **R7 right sign:** the red vertical sign now presents a broad readable face from hero. Its approximate size/story range is satisfactory. Do not keep rotating or resizing it merely to chase pixel alignment.
- **Camera:** larger hero framing is more useful, and the lower balcony camera answers the prior underside uncertainty. An exact camera solve is unnecessary.

## Four prioritized repairs

### 1. Put the age back on the architecture, and reduce the white-speckled metal emphasis

**Actual evidence:** In hero/front/side, the plaster piers and spandrels, parapet, hut walls, and balcony fascia remain dominated by broad smooth cream surfaces with a few pale, soft-edged patches or isolated repeated gray ovals. In the original, these same surfaces contain extensive irregular gray exposed substrate, flaking cream islands, runoff, dirty joints, and crumbling corner/fascia edges. The source's macro/medium-scale masonry damage is visible at whole-building size. r02 instead draws attention to bright white flecks on nearly every frame, cage, louver, and gate.

**Consequence:** The weathering hierarchy is inverted: the building still feels newly painted while its thin metal outlines look uniformly abraded. Adding more tiny noise will not fix the dominant mismatch.

**Concrete target:** Existing wall/parapet/cornice/balcony/plinth finish paths in `parts/structure.ts` and the shared finish system. Add substantial, irregular, connected gray flaked fields and dirt accumulation at ledges/corners/runoff paths, while retaining light surviving paint. Let deterioration cross nearby surface regions coherently rather than repeating isolated dots per story. Treat the balcony fascia and roof parapet as especially clear reference anchors. Break up/scuff the base so it is not a nearly solid clean black strip. Tone down the very bright repeated metal chips; retain green/brown/rust material readings. This is the largest remaining fidelity gap.

### 2. Give the windows visible occupation and source-like subdivision

**Actual evidence:** The narrow transom improvement is useful, but most r02 lower panes now read as uniformly tall near-black blanks repeated across the facade. The source combines transoms with additional sash/frame divisions, differing curtains or screens, dusty glass, and local open sections. It has richer muted brown/green/gray variation within the banks. r02 has some selected openings and curtains, but their effect is weak compared with the repeated dark voids and bright chipped frame edges.

**Concrete target:** Window assembly/material variation, preserving the current bank dimensions and separate doorway. Add restrained sash crosspieces where the source banks need them, differing translucent/dusty/screened lower panes, and a small readable selection of curtains or open sections. Avoid returning to the identical evenly spaced grid of r01. This is a refinement of the original R2 requirement, not a reversal to uniform grid windows or a demand for detailed rooms.

### 3. Restore the main shop canopy's red/cream identity and remove the unsupported red band

**Actual evidence:** The original has one broad faded red/cream striped shop canopy with a clearly hanging segmented/scalloped valance. r02 has become two brown/beige sagging fabric bays with no comparable hanging striped valance. A new large red chipped horizontal fascia sits directly behind the corbels; it is conspicuous in `balcony.png` and absent from the source. The concrete supports are now visible, but the red strip competes with them and makes the whole transition read differently.

**Concrete target:** `parts/shops.ts` main canopy and shared shop head/fascia composition. Keep the newly established space below the slab and visible corbels. Use neutral aged masonry/service attachments behind them, remove or suppress the broad red band, and restore a single broad faded salmon-red/cream striped roof and valance. Mild fabric unevenness is appropriate; the deep two-bay draped silhouette and muddy brown palette are the wrong hierarchy. The left canopy should remain a distinct muted green sagging fabric canopy.

**Shop-density status:** The threshold rack and added goods are accepted improvements. Some open foreground floor remains broader/brighter than the source; a modest hanging-cloth/stock layer can help, but it is lower priority than correcting the canopy and surfaces. Do not fill the access gap indiscriminately.

### 4. Ground the sidewalk again without restoring the display pedestal

**Actual evidence:** Removing the outer slab addressed its excessive display-base appearance, but r02 now exposes the thin sidewalk edge and repeated downward fins as a floating comb against the background. This is clear in hero/front and especially `shops.png`. The source has solid worn curb-to-road contact.

**Concrete target:** `drawGroundContact` and ground presentation. Supply a continuous solid curb edge and a restrained road/ground receiver at the proper level beneath/around it. Hide/seal the repeating open underside. Keep the narrow pavement, dark corner plinth, and drain. A broad raised rectangular pedestal is unnecessary. This is a visible grounding defect, separate from material fidelity.

## Small focused follow-up

The roof hut's new louver is readable but looks silvery/white, while the original door is muted green with a dark/brassy louver inset. Change that local appearance when adjusting metal wear; no roof redesign is needed. Roof-hut/parapet age belongs under repair 1. The rest of the accepted roof equipment, signs, massing, door, fan, cages, and props should be preserved unless the four repairs expose a specific conflict.

## Next acceptance pass

Provide the next frozen hero comparison plus balcony/shop and upper-facade/roof details. The acceptance question is whether the source's aged light masonry, occupied green-framed windows, distinctive red/cream shop canopy, and grounded street edge now dominate the image. The first three story count/massing gates remain accepted; they need no fresh design exploration. No new hidden-detail scope or art-locking tests are requested.
