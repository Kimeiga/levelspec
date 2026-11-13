# Wall and floor weathering overhaul: reference study

Research date: 2026-11-11. Scope: the complete procedural wall/floor surface system, including tiled walls and floors, plaster loss, exposed substrates, asphalt repairs, concrete joints, grime, moss, paper residue, dampness and puddles. The user's screenshot is a diagnostic example, not the limit of the work. This document records research and a proposed implementation direction; no renderer changes are claimed.

Companion: [primary-source real-time rendering techniques](weathered-material-techniques-notes.md).

## Photograph study

The following images were opened and visually inspected, rather than relying on search captions. They inform material behavior, not an exact reconstruction of Kowloon. Reference photographs remain with their publishers and are not incorporated as production textures. Apparent colors include photographic lighting and grading; they are not measured albedo values.

### 1. Plaster remnants over brick

[Kanał 6: abandoned building at Kilińskiego Street, Słupsk](https://info.kanal6.pl/2021/04/23/opuszczony-budynek/) · [photograph](https://info.kanal6.pl/wp-content/uploads/2021/04/S_Opuszczony-budynek.2.jpg)

Observed: broad gray remnants sit over exposed brickwork. Large losses contain smaller recesses and surviving fragments. Some edges follow the masonry courses; other edges cross them. Fine fractures, granular rims and thin lighter flakes interrupt the larger shapes. Mortar recesses, damaged brick faces and the remaining coating have visibly different surface relief.

Implication: use an ordered finish stack. Losing paint, losing plaster and exposing masonry should produce different depths and surface responses. A bright polygon placed on the same plane does not communicate which layer is missing. Large-scale shapes can remain simple, but their perimeter needs local chips and a coherent thickness transition.

### 2. Old Hong Kong wall layers

[Yan Fong, Disappearing Memory Series](https://cultureurbanspace.interartive.org/disappearing-memory) · [gray wall photograph](https://cultureurbanspace.interartive.org/sites/default/files/disappearing%20memory%202.jpg) · [red wall photograph](https://cultureurbanspace.interartive.org/sites/default/files/disappearing%20memory%207.jpg)

Observed: an underlying square pattern remains readable through extensive surface damage. Wide losses coexist with narrow cracks, tiny holes, attached remnants and several surface colors. The red example has a broad pale opening with a broken perimeter; local white chips and dark recesses interrupt both sides. Damage does not have a uniform width or frequency around the entire boundary.

The series presents photographed Hong Kong walls as art prints. Use it for contour and layer relationships, not calibrated color or an assumed exact material composition. In the gray image, the photograph alone does not establish whether every square is surviving tile, coating or an imprint.

Implication: retain the construction grid beneath damage. Correlate wear over neighboring units, but allow isolated surviving pieces. Avoid a generic evenly toothed outline or independent random damage on every tile.

### 3. Asphalt/concrete junction

[Taiwan asphalt-repair product listing](https://www.ruten.com.tw/item/show?22147212998478) · [junction photograph](https://gcs.rimg.com.tw/g2/d/9f/4e/22147212998478_615.jpg)

Observed: a broadly diagonal junction remains legible. At close range it breaks around individual aggregate particles, with occasional larger notches. Small loose pieces cross onto the lighter surface. The edge alternates between comparatively intact stretches and locally crumbled sections. The rough material has depth at its margin, not just a different color inside a contour.

This photograph does not establish which material was installed first or the construction underneath.

Implication: preserve a broad repair boundary; refine it with correlated granular loss, sparse remnants and a shallow broken lip. Do not apply equally strong random displacement at every perimeter sample. Concrete/asphalt material height should help determine the fine boundary.

### 4. Documented pavement distress

[FHWA asphalt distress manual](https://www.fhwa.dot.gov/publications/research/infrastructure/pavements/ltpp/13092/001.cfm) · [high-severity patch photograph](https://www.fhwa.dot.gov/publications/research/infrastructure/pavements/ltpp/13092/images/image027.jpg)

The manual distinguishes repair deterioration, cracking and raveling. Raveling involves loss of binder and aggregate, progressing toward a rough, pitted surface. The inspected patch image shows a localized damaged repair rather than uniform wear over the entire roadway. Its small published image limits fine-grain visual conclusions.

[FHWA concrete distress manual](https://www.fhwa.dot.gov/publications/research/infrastructure/pavements/ltpp/13092/002.cfm) · [joint-spalling photograph](https://www.fhwa.dot.gov/publications/research/infrastructure/pavements/ltpp/13092/images/image070.jpg)

The joint image preserves a clear construction line with local loss alongside it. The manual separately describes joint spalling and shallow surface scaling. This supports maintaining geometric concrete pours while concentrating irregular damage around particular sections of their joints.

Implication: construction joints, structural cracks, shallow scaling and deep missing material need separate controls and profiles. Making every boundary organic would discard useful construction evidence.

### 5. Broken ceramic tile

[Trade Only Flooring Supplies: floor-material article](https://www.tradeonlyflooringsupplies.co.uk/blog/67/what-is-the-best-flooring-for-your-kitchen) · [fractured tile photograph](https://www.tradeonlyflooringsupplies.co.uk/images/cms/blog/kitchen-floor/floor-damage.jpg)

Observed: intact grout lines remain straight. A fracture crosses one tile and leaves a broad shard with visible thickness. The gap reveals ridged adhesive, small fragments and a different surface below. There are several thin crack branches around the missing section. The source does not establish whether the fragment was lifted during inspection or how the damage began.

Implication: ceramic damage should combine whole-unit loss, partial fractures, glaze/body separation and exposed adhesive. Fine roughness can coexist with long angular fracture faces. Natural damage is not synonymous with rounded or noisy edges everywhere.

### 6. Detached flooring in Hong Kong

[Kamal Mirwani: Caine Terrace photographs](https://www.hongkonghike.com/caine-terrace-abandoned-90s-hong-kong-apartments-in-wan-chai/) · [floor photograph](https://www.hongkonghike.com/media/images/A_lot_of_the_floor_tiles_ar.2e16d0ba.fill-2500x1666-c100.jpg)

Observed: detached narrow pieces retain grouped layout patterns while loose pieces collect nearby. Dust and the exposed bed preserve traces of the original arrangement. Although the caption calls them floor tiles, the visible strips appear consistent with parquet; material identification is uncertain, so this is not used as evidence of ceramic fracture.

Implication: removed material should leave installation traces and local debris, with some organized remnants. Dust can partially unify different layers without erasing their shapes.

## Placement should reflect causes

The [NPS historic-stucco brief](https://www.nps.gov/orgs/1739/upload/preservation-brief-22-stucco.pdf) describes moisture entering around roofs, openings and foundations, and loss of adhesion to the backing. For our procedural design, that supports damage fields tied to runoff, wall bases, ledges and openings. These are plausible art-direction rules, not a structural simulation or a claim about the cause of every photographed defect.

Use related but distinct fields for material loss, runoff, retained dirt and moisture. A stain can cross a surviving finish; a crack can continue into another region; a puddle can wet both sides of a joint. Their boundaries should not all coincide.

## What the current code explains

These are source-audit findings at the research date. The exact screenshot objects were not selected by ID, so visual correspondence is qualified.

| System | Current mechanism | Overhaul requirement |
| --- | --- | --- |
| Building plaster | `src/dressing/kowloon/skin.ts` samples damage over panels up to 0.9 m, clips linearly through triangles, and emits both finishes at the same depth. | Fine coverage independent of mesh tessellation; explicit lost-coat depth and rough rim. |
| Asphalt edges | `src/dressing/ground-asphalt.ts` makes piecewise-linear inward cuts every 2.5–6 cm; `ground.ts` assigns finishes on the same receiving plane. | Correlated multiscale breakup, fewer repetitive teeth, aggregate-aware edges and selective thickness. |
| Pale green ground islands | `ground.ts` water uses an untextured color and low roughness; water level is clipped through an 18 cm relief lattice. The screenshot strongly resembles these puddles. | Separate water from exposed substrate; refine shoreline, show damp surroundings and coherent reflection. |
| Floor tiles | Missing units and rectangle-corner cuts retain exact straight segments. | Fracture paths, chipped rims, adhesive remnants and local relief while preserving intact courses. |
| Wall tiles | Existing contours already sample multiscale fracture detail at about 4 mm and separate ceramic/glaze layers; the panel emitter lacks connecting fracture sidewalls. | Retain the useful contour work; complete side faces and edge shading rather than replacing it wholesale. |
| Contact grime | `weather.ts` is a vertex-color multiplier with a fixed-scale contact band, sampled on comparatively coarse wall triangles. | Surface-space variation plus appropriate roughness response and localized deposits. |
| Moss and cracks | Ground moss uses small polygonal footprints; cracks use tapered quadrilateral partitions. | Crevice-aware growth and fracture-specific depth/width, with fine masks at close range. |
| Runoff and notices | Some facade stains are six-vertex floated polygons; paper has coarse convex tears and flat offset layers. | Integrate stains with receiving material; reserve thin physical geometry for paper thickness and curled edges. |

The approved asphalt already has a normal map. Its missing cue is the boundary's depth and material response. Several wall finishes and the water regions lack comparable relief, so increasing asphalt normal strength would not fix the overall problem.

## Proposed shared system

1. **Surface context from AML.** Keep authored boundaries, construction regions, tile courses, contacts, orientation and stable meter-scaled coordinates. Include local exposure, drainage and proximity to fixtures where available.
2. **Ordered material layers.** Describe the finish, intermediate backing and substrate. Give each intrinsic color, normal/height and roughness, a physical texture scale and meaningful thickness.
3. **Independent condition fields.** Separate loss/fracture, repairs, deposits, wetness and vegetation. Generate coarse placement from context, refine it using material-specific patterns, then evaluate fine detail independently of the large mesh triangles.
4. **Coherent surface evaluation.** Use the same coverage and transforms across PBR channels. Height-aware masks reveal aggregate, adhesive and pores at the edge. Use normal composition appropriate to detail layers; do not blend normal RGB as if it were paint.
5. **Selective depth geometry.** Add recessed exposed beds, connecting rough lips, fractured sidewalls and occasional lifted fragments where visible. Keep one owned receiving surface and avoid competing coplanar opaque layers.
6. **Filtering and repetition controls.** Use stable sampling, appropriate mipmaps and consistent physical detail density. Randomize unstructured grit/plaster sampling while retaining tile and brick alignment.
7. **Portable delivery.** Define preview/export behavior before adopting a custom shader. Core GLB does not carry arbitrary layer shaders. Generated intrinsic material maps or reusable transition materials can be lit in real time; no baked illumination is proposed. Any offline map-compositing choice must be explicit in the implementation plan.

The accompanying technique note links verified primary references for height blending, eroded masks, normal composition, decals, wet surfaces, stochastic sampling and glTF constraints.

## Implementation order and acceptance

First establish the shared material/condition representation and preview/export contract. Then validate a compact material study containing plaster over masonry, a chipped tile frontier, an asphalt repair, a spalled concrete joint, a wall-floor contact with runoff, and a puddle. These are representative cases for the system, not the final scope.

Migrate the complete wall/floor dressing paths after the study succeeds. Preserve building massing, stairs, ramps, navigation and collision unless a separately authored physical change calls for them.

Acceptance should require:

- At standing distance, large construction regions and material identities remain legible; wear does not become a uniform quilt or noisy outline.
- At close and grazing angles, masks do not expose the coarse triangulation; visible layer loss has credible depth, rims and substrate detail.
- Straight grout/construction lines survive where intact; broken portions have distinct ceramic, plaster, concrete or aggregate character.
- A moving neutral light reveals coherent normals and roughness on both materials and their transition. There are no painted-in directional shadows.
- Camera movement does not reveal flicker, swimming patterns, disconnected layer fronts or coplanar overlap.
- Dampness, standing water and exposed solid substrate are visually distinguishable.
- GLB and the live preview preserve the agreed appearance contract, with any approximation explicitly recorded.

No production files were changed and no tests were run for this research-only step.
