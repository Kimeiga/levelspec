# Overpass and Inferno — complexity study

Independent reference review, 2026-11-09. Applied FPS strategy/review and reference-study skills. This studies published map artifacts and developer design accounts; it is not a playtest or a claim that each image matches the latest November 2026 patch. [Source identities](overpass-inferno-sources.json) record original URLs, credit, version and hashes. All images marked inspected were opened at full available resolution with `view_image`; search captions alone were not evidence. Sources are research reference, not exported game assets.

## Overpass: territories along journeys, with selective ways to change plans

![Overpass overview](overpass-gamemaps-cs2-radar.jpg)

The CS2-labeled GameMaps overview separates a park/long/restroom side from a canal/tunnel side. A journey toward A passes Fountain/Playground, then a choice of Long or the Mid/Toilets route, before A Short/Long and the objective. Toward B, the lower approach has a different sequence through tunnels/alley, Water/Short or Monster, then the bridge/pillar site. Connector is a consequential transfer between those approaches. Bank and the rear of A differ from the attack-side connector: routes are not interchangeable simply because they connect territory.

The significant visual evidence is the arrangement of multiple bends, enclosed intermediate spaces and external pockets before the site. The map can have a compact outline while containing several local contexts. The image is not a floor-height survey and cannot establish exact overlap, climbability, timing or current smoke behavior.

![Overpass CS2 lower tunnels](overpass-lower-tunnel-valve-cs2.jpg)

![Overpass CS2 restroom](overpass-restroom-valve-cs2.jpg)

Valve's CS2 launch images show occupied intermediate interiors, changes of width, off-axis exits and solid returns. The lower tunnel image does not reveal its next room in full. The restroom has an offset interior continuation and a separate outdoor opening. These are spatial stages inside an approach, not additional objectives. Their wall/door relationships can separate walking access from immediate visibility. That is an inference from the inspected geometry; an actual visibility test is still needed.

Valve's [2014 design account](https://blog.counter-strike.net/2014/04/9284/) is especially useful because it describes both adding and removing uncertainty. The team separated an overly open canal into more legible fronts with fallback space, simplified site cover, and added selected connectors because long rotations made players feel committed too early. Their [2013 account](https://blog.counter-strike.net/2013/12/8306/) distinguished the park's two ranges of engagement from the lower canal. These are historical design decisions, not evidence of today's exact geometry. They support selective route flexibility and legible local encounters, rather than maximizing random connection count.

The two inspected 2014 images, [canal](overpass-canal-valve-2014.jpg) and [connector](overpass-connector-valve-2014.jpg), show the mechanism: a service structure divides the water terrain, and an interior transfer is composed of a chamber, an off-axis doorway and another turn. A single abstract edge would conceal those stages.

## Inferno: a relatively legible macro layout can contain substantial local depth

![Inferno overview](inferno-refrag-cs2-radar.jpg)

The Refrag CS2-labeled overview (page updated March 2025) shows Banana as an extended, bending approach with several occupied sections before B. The A side has Mid, Second Mid, Apartments, Boiler/Short, and Arch/Library relationships. The apartment route occupies a distinct local layer near ground-level streets and ultimately arrives at Balcony/Pit/site relationships. A simple macro summary can describe few main approaches while omitting much of the player's actual sequence of choices and reveals.

An important comparison is not merely “more graph nodes.” Banana's local logs/wall/sandbags/top/entry distinctions are not all macro junctions. Conversely, Mid versus Second Mid/Apps offers actual route alternatives. A representation needs to distinguish a meaningful encounter stage from a regional route branch and from a cosmetic named spot. Counting every callout as an equivalent room would be another misleading abstraction.

![Inferno Banana, 2016](inferno-banana-valve-2016.jpg)

The inspected 2016 Banana image shows the street rising through a bend, with distinct masonry returns and cover at successive depths. The [apartment image](inferno-apartments-valve-2016.jpg) has a passage with openings toward another space, and the [A-site image](inferno-a-valve-2016.jpg) combines balcony, a lower pit, a raised site surface, and intermediate cover. These older screenshots explain spatial mechanisms; they are explicitly not latest-CS2 matching references.

Valve's [2016 Inferno account](https://www.counter-strike.net/inferno) focused on making group movement and position reading easier while retaining the map's core play. Some changes removed confusing defensive detail; other changes improved the ability to prepare utility before exposure. This is evidence against using visual clutter, arbitrary hidden corners or high-degree graphs as a proxy for strategic richness. Complexity can reside in the sequence and relationship of readable encounters.

## What the current generator misses

These observations are an assessment of the repository's current algorithm, not claims that the reference maps were generated this way.

1. **A four-node complete graph already has three cycles.** Minimum cycle and approach counts can be satisfied by a compact web with almost no journey depth. A random position or extra crossing does not create the intermediate play represented above.
2. **The graph has one uniform scale.** An `area` can stand for an entire district, a room, a landing, or a local corner, but the engine does not model that distinction. It therefore cannot tell “two districts with developed interiors” from “six isolated pads.”
3. **Pass 2 actively collapses structure.** `addSharedSpace` chooses every node at the most populated elevation, fills their convex hull and connects them to one common hub. That can erase newly generated local choices and separated approaches. A hall or court is useful when intentionally bounded; merging all same-height areas destroys the reference pattern of nested spaces and selective portals.
4. **Crossings only describe crossing route ribbons.** They do not capture two occupied regions sharing an XY footprint with carefully separated circulation, or an overlook that can observe a route without granting walking access. The Nuke study should own those specific relationships.
5. **Late failure checks do not establish adequate scope.** Walking and optical checks can validate a very thin map. The design-development gate needs to challenge whether meaningful journeys are sufficiently developed before accepting a whole-map result.

## Bounded improvements worth testing

The following are proposed algorithm contracts, not requirements to copy either map:

- **Retain route depth and regional organization as exploration axes.** Measure entry-to-key decision depth after collapsing ordinary degree-two subdivisions; compare local loop sizes and regional bottlenecks. Keep alternative profiles rather than declaring one highest-entropy winner. An attached dead-end or split edge must not manufacture score.
- **Add structural mutations.** Replace one connection with a fork/rejoin sequence, add a bypass between nonadjacent stages, or grow an internally connected cluster with limited external portals. Mix these with existing local moves. Bound area/connection density so a complete graph is not the easiest answer.
- **Separate encounter stages from macro junctions.** In realization, an approach can acquire a bent vestibule, widened staging pocket, interior passage or reveal around a mass without pretending each is an independent strategic route. Their contribution needs geometric/visibility evidence, not an extra-node reward.
- **Limit shared-space merging.** Choose a small connected local group, maintain several separate envelopes and preserve the portals between them. Report which intended branches collapse. The transformation should not automatically connect every same-height node through one floor.
- **Evaluate plan changes along a journey.** At selected intermediate states, compare viable remaining routes, overlap with another approach and approximate costs to another objective. Keep timing provisional. Shortcuts should change a real choice; a forty-second detour is not automatically useful counterplay.

For a first code change, I would prioritize subdivision-resistant route depth plus bounded connectivity and local shared-space grouping, then compare actual generated plans across seeds. A higher random temperature, more room shapes, or a higher edge target alone would preserve the current failure mode. Hierarchical territories, visibility-only relationships and specific traversal mechanics are a larger follow-up, and should remain explicit unsupported scope until represented and checked.
