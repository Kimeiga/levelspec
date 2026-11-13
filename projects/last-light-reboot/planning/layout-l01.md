# Last Light Galleria — developed layout L01

**Selected branch: B / Twin Atrium Exchange. Production AML gate remains pending.** Read the [original/user-constraint brief](../brief.md), then the raw [ground](layout-l01-ground.png), [upper](layout-l01-upper.png) and [roof](layout-l01-roof.png) plans before the author dispositions. SVG versions accompany all PNGs. Exact footprints, elevations, openings, positions and planned walk routes are in [developed-l01.json](developed-l01.json).

The user constraints and original body/game hypotheses are unchanged. In particular, body radius .40 m, standing 2 m / eye 1.86 m, crouch 1.15 m / eye 1.0695 m, step .30 m, slope 42°, 75° vertical FOV at 4:3. Harness movement is 3.4/1.7 m/s; 5.5 m/s is the provisional target-game run speed. No essential jump, crouch passage, ladder or ability is assumed. Scoring, team barriers, invulnerability, combat, healing and mobility abilities are unavailable target-engine mechanics.

## Geometry contract

The food court is an occupied +3.6 m floor above a real ground transfer. Ground never scores. The provisional control circle is `(63,51,3.6)`, radius 7 m, standing scoring band Z3.6–6.1; accessible POI `(65,49,3.6)`. Solid kitchen volumes are excluded physically. Zone logic still requires a destination engine.

| Assembly | Physical contract and intended relationship |
|---|---|
| F-G / F-U | Floor slabs 0.35 m thick, walking tops 0 / 3.6. Actual upper voids and stair holes are in the footprint JSON. |
| G1 / G-N / G-S | Transfer x42–80, y44–54; side walls to the +3.25 soffit; 10 m mouths at x42 and x80. Underpass and upper point are separate occupied layers. |
| G-BW / G-BE | Short 0.8 m-thick returns at x45.6–46.4/y44–50 and x73.6–74.4/y48–54; each leaves a nominal 4 m passage (3.8 m between the return tip and wall face). They interrupt the central horizontal shot, not every diagonal view. |
| C-W / C-E | Deep concession blocks screen public upper receiving territories from point holdings. Their footprints are 8×12 m and 8×12 m, floor3.6/top7.8. Public arrivals must move around them to contest. |
| C-NW / C-NE / C-IS / K0 | Food-stall, cold-store and integrated kitchen masses form a thick north edge. The clear prep passage at x64–70, y60–72 is occupied, roofed and leads through P-UN. It is not a row of low counters. |
| C-S | 10×10 m closed restaurant beside the south entry, top7.8; upper service movement remains to its east. |
| P-UW / P-UE / P-UN / P-US | Four final movement thresholds: west x48/y48–54 (6 m), east x78/y50–56 (6 m), north y60/x64–70 (6 m), south y42/x60–68 (8 m). All sill3.6/head6.8. |
| O-W / O-E | Observation-only apertures: y48/x40–44 and y56/x80–84. Both sill4.7/head6.4, width4 m, with full-height cheeks. They expose selected receiving edges to lower atrium positions; they are not movement connections. |
| LC-* | Integrated counters/planters 1.15 m high. Same-floor crouch-eye concealment is a prediction; standing eye is above their tops. Side exposure and elevated views remain review questions. |
| R-H / R-SK* | Actual +10.8 m roof underside over the shared tall hall, with two glazed skylight footprints and structural columns. R-L is +4.4 over low anchors; R-M/service/food-stall roofs are +7.8. Roof/ceiling boundaries are in the roof plan and coordinate sections. |

Wall thickness is 0.4 m unless specified. Upper void guards are 1.1 m, 0.24 m thick. The stair guards rise with the steps. Dark inaccessible volumes are closed architectural programs, not walkable regions. All geometry is intended to collide; opacity is separate, with skylight glazing visually transmissive. Ballistics, penetration, destruction and utility transmission are unknown, regardless of material names.

## Ascents and receiving spaces

All four stairs are nominally 6 m wide (5.76 m between the 0.24 m edge guards), 18 m run, rise3.6, 24×.15 m risers and .75 m treads. No upper floor crosses a flight. Full-width landing floor exists at both ends; the measured proposal footprints, exits and guards must be rechecked in compilation.

| Stair | Feet start → end | Top landing and onward/return choice |
|---|---|---|
| X1 public | `(37,38,0)` → `(37,56,3.6)` | Full 6 m width into U1; receiving region UG-W x34.6–45.4/y58–66. East/south toward P-UW; north through P-WN toward the service gallery; reverse down X1. |
| X2 service | `(27,58,0)` → `(27,76,3.6)` | Enclosed flight; top landing x22–34/y76–84, clear east doorway P-SX2-UP width8. U2 gives separate north staging UG-N and kitchen entry. Reverse descent uses the same full landing. |
| X3 public | `(87,64,0)` → `(87,46,3.6)` | Full 6 m width into U4; receiving region UG-E x79–91/y36–44. West/north toward P-UE; south toward service staging; reverse X3. X3 moved 2 m east from S01 so its side passage is a real 6 m width. |
| X4 service | `(97,46,0)` → `(97,28,3.6)` | Enclosed flight; top landing x92–104/y20–28, west doorway P-SX4-UP width8. U5 reaches UG-S and the distinct south threshold. |

Grand-stair leaders can be seen from their lower approach and followed by a teammate. Service ascents lose that broad atrium support in exchange for enclosure. A public upper pocket is contestable from its final threshold or connecting gallery; it is neither invulnerable nor a firing nest with point-wide coverage.

## Deliberate ground-network revision

S01's N1 ground north transfer and S1/E5 ground southern through-link are **retired**, not silently relabeled as useful routes. The long, mostly empty north belt became the closed cinema M-CIN/M-CIN-W with a lower service plinth and thick ticket frontage. The south belt became closed anchor stock M-STOCK beneath the occupied service gallery. W5 now names a cinema frontage, not an independent through-route. Remaining east service apron supports X4 and delivery movement locally.

The retained scheme uses G1 for ground cross-map relocation and the north/south galleries for upper re-entry changes. Both home districts still have separate public and service departures. This removes a redundant route into the other team's reinforcement district and gives the galleries architectural fronts. It also **concentrates ground crossing at G1**: if that crossing is lost, a team must change its own ascent or retreat rather than take a ground perimeter bypass. The detailed panel should recheck spatial interest and this strategic cost. Root's question concerned unearned space; removing both loops is the author's coherent choice, not a mandated rule.

## Bounded underpass/information experiment

[Variant drawing](variants-l01.png) compares V0 straight mouths/full low edges, V1 short returns/opaque observation fronts, and selected **V2 short returns/bounded apertures**. V2 retains local cross-level information without requiring a fully open upper ring. A lower player must leave G1 and occupy W-LOOK `(41,39,0)` or E-LOOK `(83,67,0)` to see a specific upper receiving edge. The opposing upper player is exposed reciprocally and may crouch behind the sill, move into the pocket, or contest that lower position after departing the point.

Analytic proposal-prism rays predict W-LOOK→W-STAGE and E-LOOK→E-STAGE standing-eye visibility; paired crouch-eye rays hit the sill. The named central point→lower observer rays hit the upper slab/core. The central horizontal underpass ray is blocked by the returns, while G-W→G-E still has an open diagonal. That retained diagonal preserves cross-support and an exposed clearing commitment; this is not a claim of a concealed tunnel. Exact offsets, whole-body exposure and compiled visibility remain pending.

## Concrete scenarios and later walk routes

`walk_routes` contains seven exact waypoint paths. Their 0.35 m-spaced proposal-footprint/headroom samples generated no warnings at the unchanged radius .40/height2 body; this is not continuous collision proof or an engine walk. Nominal path lengths/time division exclude contact, aim, crowding, doors and objective rules.

| Scenario | Positions and decision to test in both directions |
|---|---|
| Opening 5v5 / rush | All five use west-public or east-public and establish UG-W/UG-E before moving through P-UW/P-UE. One defender can leave POINT-W/POINT-E for W-ENEMY/E-ENEMY; that defender is outside the scoring circle and can be threatened from the upper connector. A follower at W-SUPPORT/E-SUPPORT must see the landing fight. |
| 3+2 split | Three take X1/X3; two take X2/X4 and UG-N/UG-S. Public group can delay in its upper pocket while the pair establishes a different final threshold. Service routes are longer: west public/service ≈109/140 m (19.8/25.5 s at hypothetical5.5); east ≈113/130 m (20.6/23.6 s). A split needs timing, not assumed simultaneous contact. |
| Tank + paired supports | Tank may occupy POINT-S, one support POINT-W and another POINT-E or a near threshold. Front-of-core support rays can remain open, but northern movement behind C-IS separates them. A support below cannot heal through F-U; no healing behavior is implemented. |
| Lost point / full regroup | Withdraw down the same ascent or through the upper connector. Ground assembly RG-W x26–38/y12–18 or RG-E x93–97/y78–94 supports a new public/service choice. These are actual clear footprints, not safe-zone flags. The next wave may seek UG-N/UG-S before scoring. Enemy pursuit must enter the corresponding district to contest a departure. |
| 2v5 stagger | Survivors retreat to the own-side approach/assembly rather than expecting to win point. G1 can change atrium, but is exposed at its mouths and cannot score. No retired north/south ground loop may be assumed as escape. |
| Contested 3v3 | One can delay on POINT-S while two use lower-change, sacrificing immediate support for a later ascent. Alternatively all three retreat into UG-W/UG-E and use the upper switch. West upper switch is ≈63 m; east ≈35 m, a material asymmetry for the independent panel. A lower transfer is not an automatic late touch. |

Exact planned routes include 109 m west-public, 140 m west-service, 113 m east-public, 130 m east-service, 73 m lower-change and the two upper switches. Reversed paths are planned retreats, not measured success. Actual physical walks must assert the intended endpoints rather than choose nearby seeds that hide a bad connection.

## Review evidence and limits

Sixteen actual coordinate sections cover the transfer, point, four stairs, both public and service spawn departures, north/south holds, lower information edges and public approach interfaces. [Section packet](section-packet-l01.md) maps them to opposing/follower positions. [Capture intentions](capture-intentions-l01.json) reserves roof-on, cutaway and interior opposing views.

Three reference images were revisited during development: Tower Place storefront recess, Rolling Acres food-court depth and Tower Place roof/gallery. Their source/credits remain in the original [study](../references/study.md). Exact dimensions, closures and tactical decisions remain invented.

Independent strategy and dedicated section-by-section spatial/visibility gates are pending, including the revised ground-network interest check. No production AML, collision-aware walk, compiled ray, multiplayer result or architectural acceptance is claimed.
