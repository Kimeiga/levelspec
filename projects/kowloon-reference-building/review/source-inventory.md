# Source-only visual inventory

Reviewer: independent visual-fidelity critic. Intake: original concept only; no candidate render, source implementation, or author rationale inspected.

Source: `projects/kowloon-building-polish/concepts/01-building.png` (1536 × 1024). One dominant front/right three-quarter building view occupies the left portion; three detail insets at right depict the base corner, balcony, and fan-shaped balcony divider. These are views of intended design, not a measured photographic survey. The target is a four-story corner tong lau: ground-floor shops plus three residential floors.

## Defining structure and silhouette

- A substantial, fairly broad four-story masonry block. The main facade reads as roughly three broad residential window banks across; the visible right return is narrower in projection but has meaningful depth, repeated openings, awnings, and services. It must not become a flat facade prop.
- Ground level is visibly taller and more open than the residential levels. The first residential floor has the dominant projecting balcony. Two further residential floors have flush window banks and continuous horizontal bands. Roof equipment is subordinate to these four stories, not a fifth occupied floor.
- The front-right corner is softened/clipped and visibly wraps the cream masonry, blue-green tile bands, cornices, dark base, and pavement. Its exact radius/chamfer is ambiguous. A sharply isolated seam between two unrelated facades would lose the reference relationship.
- Strong horizontal concrete floor bands/cornices divide the residential levels; vertical cream piers divide long dark window banks. The facade has layered thickness, projecting ledges, recesses, and a weighty roof parapet.
- Residential windows are large, multi-pane, dark green metal assemblies: narrow upper transoms, multiple tall lower panes, occasional tilted/open sections, and uneven curtains/glass tones. They are not isolated little square holes on a blank wall.
- Blue-green square tile fields sit beneath the window banks of the top two occupied floors, most conspicuously on the front-right bank and wrapping around the corner. Other areas show worn cream/plaster with less intact tile. Do not distribute tile uniformly over the whole building.
- The first residential balcony is a defining assembly: broad center/right projection, shallower or stepped left portion, concrete fascia and low solid upstand, green tubular horizontal rails, upright posts, visible underside, and several heavy concrete brackets. Main view and balcony inset agree that brackets and fascia thickness matter.
- A large green fan-shaped metal divider/gate stands at the left side of the deeper balcony. Its curved top and radial spokes are a primary recognition feature, not ordinary rectangular railing.
- Flat rooftop, stained solid parapet with cap, small cream rooftop service hut and dark green louvered door, silver cylindrical water tank, exposed metal ladders/pipes, and sparse antenna/rail elements. The tank and hut make an asymmetric skyline.
- Ground contact is deliberate: very dark charcoal painted plinth rising to roughly knee/waist height, worn paving, a modest curb, and a drainage grate at the corner. No floating building or thick display pedestal.

## Surface and color hierarchy

- Dominant area: aged warm ivory/beige plaster/concrete, uneven and locally peeled to gray substrate. This is a light building despite extensive dirt.
- Second-order blocks: desaturated dark teal/green window frames and rails, muted blue-green tile, almost black ground plinth, dark storefront recesses. Avoid saturated emerald, pristine white, or evenly middle-gray surfaces.
- Accent hierarchy: faded red/cream striped shop awning and vertical red/ivory signage; smaller terracotta pots and mixed merchandise colors; metallic silver tank. Accents must remain secondary to the building mass.
- Wear is material- and location-specific: parapet/runoff streaks, chipped corners and fascia, peeling plaster fields, dirt under ledges, tile grout and missing/dirty tile variation, rust at brackets/fasteners/pipes, oxidized green metal. Large readable patches coexist with smaller detail. Uniform noise across every surface is insufficient.
- Window glass has dark, muted, varied values with visible frame depth; some curtains or screens sit behind it. It should not become a uniform bright mirror or black solid sheet.
- No moss is visible as a defining material. Per the brief, omit moss entirely. Weathering can be achieved with dirt, staining, flaking, rust, and dry discoloration.
- Lighting is soft and warm with directional shade under projections. The construction and material hierarchy should survive ordinary runtime lighting; this reference does not authorize baked scene illumination painted onto assets.

## Activity, props, signs, and shops

- Center/right ground-floor shop is a deep, dark, open shopfront beneath a broad faded red/cream striped awning with a scalloped/segmented valance. Dense but legible shelves, goods, hanging cloth, wire racks, stacked colorful crates, pale boxes, and a handcart concentrate around this opening.
- Left ground-floor frontage is largely closed by a metal accordion/security gate, sheltered by a sagging muted green canvas awning. It differs strongly from the central open shop; copying one identical storefront across all bays misses the source.
- The visible right return has narrower secondary storefronts, shutters/gates, smaller awnings, and localized goods. It continues the lived-in building rather than becoming an empty side wall.
- Large vertical hanging signs: faded ivory with dark red `永昌藥行` at left; faded brick-red with pale `興隆五金` on the right. A smaller horizontal ivory `電器修理` sign projects below the right vertical sign. Their brackets, depth, relative locations, and uneven aging are part of the composition. Exact character fidelity is lower priority than correct sign hierarchy, but gibberish or blank boards remain visible defects.
- Several external box air conditioners hang below/within upper window banks, including large off-white fan-front units near the front-right corner and older grated/caged units farther left. Brackets, cages, wiring, and pipe connections give them weight and function.
- Exterior downpipes, electrical conduits, cables, and supports run mostly along piers/corners and between equipment. Their pattern is irregular but attached and purposeful, not a uniform cable grid.
- The balcony has a few small pots/containers; dense shop goods stay mostly at street level. Roof props are sparse and large. Randomly scattering clutter uniformly upward would invert the source density hierarchy.
- Narrow corrugated metal sun/rain hoods occur over selected upper windows; they are shallow, slightly uneven strips, not huge repetitive awnings on every opening.

## Prioritized acceptance criteria

1. **Silhouette and story reading:** four occupied stories, substantial return depth, broad front, correct relative ground/residential heights, a dominant first-floor balcony, and subordinate asymmetric roof hut/tank. A detailed five-story block or narrow tower fails this gate.
2. **Facade organization:** long multi-pane green window banks, thick cream piers and ledges, two upper blue-green tile bands wrapping the corner, and a dark base. Correct prop count cannot repair missing facade organization.
3. **Balcony construction:** stepped/projecting deck, thick worn fascia, visible brackets and underside, low solid upstand plus open tubular rail, and a conspicuous radial fan divider. A thin floating platform or generic rectangular railing is a major mismatch.
4. **Ground-floor identity:** distinctly open dense central shop versus closed left gate; broad striped awning versus muted draped canopy; recessed storefront depth; connected sidewalk/curb. Goods should read as stocked commerce at overview scale, not a few decorative cubes.
5. **Surface hierarchy:** light aged plaster, restrained teal tile/frames, dark plinth, patchy location-specific weathering. Clean flat-color geometry with slight noise does not reproduce this concept's material age.
6. **Recognizable secondary silhouette:** correctly placed three major signs, box air conditioners/cages, pipes and small hoods, rooftop service hut/tank/antenna. These should enrich the architecture without obscuring it.
7. **Close-view credibility:** thin frames and rails, tile grout, stained/chipped junctions, brackets and connections, differentiated shop goods, believable curb and corner. These refine an already correct whole; do not spend the iteration budget here before criteria 1–5 pass.

## Uncertainty and review limits

- The concept gives no reliable metric scale, orthographic plan, interior layout, rear facade, or hidden rooftop arrangement. Exact dimensions are estimates; visible proportions and relationships are the test.
- The inset balcony may simplify or shift individual railing/post details relative to the main view. Preserve shared assembly logic and main-view placement rather than inventing a false exact measurement.
- The main view's peripheral dark side fragments may imply adjacent/rear structures. They do not justify adding extra occupied stories to the target building.
- Some small signs, shop goods, window mechanisms, wires, tile damage, and roof rails are ambiguous at source resolution. Match their visual role and density without claiming exact reconstruction.
- This inventory is not approval of any candidate. Later verdicts will name the actual render/revision inspected, distinguish camera mismatch from geometry, identify consequential repair targets, and state unexamined regions.
