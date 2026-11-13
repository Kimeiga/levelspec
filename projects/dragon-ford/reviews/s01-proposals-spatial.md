# Dragon Ford S01 — independent design proposals: spatial composition and architecture

Reviewer scope: shared volumes, route relationships, massing, enclosure, stepped site, Walled City identity through organization, substance against the size benchmarks, and avoidance of the three-lane template. Strategy, timing balance and utility are other reviewers' scopes; where a proposal touches them it is flagged, not judged.

## Independence and evidence

- Inspected, in order: `brief.md`; `references/study.md`; eight reference images opened directly (`plan-streets-1980s`, `aerial-1989`, `section-panorama-detail-lo-yan-street`, `section-panorama-detail-tai-chang-street`, `alley-covered-1993`, `yamen-front-courtyard`, `park-yamen-overview-2018`; the remaining images are relied on only through the study's descriptions); `planning/alternatives-s01.md`; all five S01-A drawings; every polygon, aperture, stair and guard in `planning/s01-a/layout-data.json`.
- Glanced at the two Ninefold READMEs for macro arrangement only. No author rationale and no sibling review was read.
- Stage: first sketch. Everything below is plan/section reasoning on provisional polygons. No compiled geometry, walk or ray evidence exists; sightline remarks are arithmetic on the drawn data, not demonstrated views. Coordinates in proposals are approximate drawing instructions (meters, +Y north, z up), not verified dimensions.
- Classification used: **Defect** (observed in the drawn data), **Opportunity**, **Experiment** (needs a drawn comparison before adoption).

## Verdict in brief

- **A has the right centre and thin, generic flanks.** The stepped yamen on the slope is a real, reference-grounded idea and worth developing. Everything around it is a box-and-tube ladder: three parallel entries, a lateral, three northward lanes, a second lateral, three defender lanes. That is the habitual template, and it is also a mirror of the macro the brief forbids repeating (Ninefold: south-to-north three-feed, ground factory on one side, upper site on the other).
- **B** best matches the aerial (one sheer-walled void) and the upper-corridor texts, but closing the compound to foot traffic throws away the best-evidenced spatial sequence in the packet and tends toward a symmetric doughnut of corridor.
- **C** best matches the drawn sections and breaks the south-to-north habit, but three stacked parallel streets tied by three shafts are the same three-lane diagram turned on its side, and a roof-terrace site repeats Ninefold's roof site.
- **Recommendation:** develop a hybrid, "A+": A's stepped compound made into a low building standing inside a wider void (S1), B's upper ring kept only as partial first-floor segments on the west and north faces (S2, S8), C's sectional factory street on the east (S5), with the west and north flanks rebuilt as districts rather than tubes (S3, S4, S9) and the three parallel tower-wall entries broken up (S7). S6 (roofscape) is optional.

## What A actually draws

Measured from `layout-data.json`:

- 30 spaces. 13 of them are straight, constant-width tubes 3.5 m wide (GATE 4.0 m) with a flat 3.4 m ceiling, 638 m2 in total: W_SLOT, GATE, E_SLOT, SPINE_W, SPINE_E, STEP_LO, STEP_HI, KWONG, NL_E, NL_W, N_LANE, NW_LANE, NE_LANE. Two more are 2.4 m landings.
- Places that are not tubes: the four yamen courts (CANNON, Y_FRONT, Y_MID, Y_REAR), ARCADE (itself a 4 x 14.5 m tube), E_WING, GALLERY, A_COURT, B_FLOOR with its mezzanines, and two roofs. About eight distinct places.
- Attacker journey to A by the west: W_SLOT, SPINE_W, STEP_LO, SL1, STEP_HI, A_COURT. Zero rooms, zero choices after the spine; STEP_LO + SL1 + STEP_HI is one dead-straight run at x 14-17.5 from y 25.5 to y 54 (28.5 m).
- Attacker journey to B by the east: E_SLOT, SPINE_E, KWONG, B_FLOOR. Zero rooms; KWONG is a 21.5 m straight tube labelled "factories" with no factory drawn on it. E_WING is the only alternative.
- Defender journeys: three bare tubes of 10 m (NW_LANE), 19 m (N_LANE) and 12 m (NE_LANE) from an 8 x 54 m blank street. The whole north third of the map (y 63-90) contains no place at all.
- Every route gains the storey in the same band (SL1 y 36-42.8, SW1 y 40-46.8, SY1 y 40-43.4, SY2 y 54-57.4). The "stepped site" is two flat plates with one terrace line, plus a flat 3.4 m band 85 m long from ALAND to the B mezzanine (section EW).

Against the benchmarks (Spillway 19 named spaces / 25 connections with developed intermediate approaches; Ninefold a dense winding network in 53 x 75 m): A's 100 x 92 m envelope is ample, but the amount of developed place is clearly smaller. The shortfall is intermediate spaces and choices on the flanks and in the north, not extent.

### Is it the Walled City through organization?

Partly. Grounded: a central sky void holding the yamen; a long east-west alley across its front; a school block on its west; tunnel alleys; a ground floor that meets the next block's first floor at B. Not yet present, and each is a signature in the references:

| Reference condition | Evidence | In A |
| --- | --- | --- |
| Low tiled compound standing as an object at the bottom of a void, alleys on all four sides, tower walls sheer above | `plan-streets-1980s`, `aerial-1989` | Courts fill the void wall to wall; no compound building, no side alleys |
| Halls are roofed, open-fronted buildings between courts, flanked by wings | `yamen-front-courtyard`, `park-yamen-overview-2018` | Three open rectangles; no hall; one wing, detached by a 2 m wall |
| Alleys jog, kink and widen at lit junctions; spurs dead-end | `plan-streets-1980s`, study items 4-5 | Every alley straight and constant; no junction place; no spur |
| Corridor at an upper floor crossing over an alley; shared stair shaft between buildings | `section-panorama-detail-lo-yan-street`, `-tai-chang-street` | None |
| Blocks 15-40 m deep, threaded by interior passages | `plan-streets-1980s` (red threads) | Blocks are undifferentiated solid; two through-building routes only |
| Roofs at four or more levels, low pit roofs between towers | sections, `aerial-1989` | One flat L of 320 m2 at z 6.8 |

### Architectural implausibility in A (defects at sketch level)

1. **Straight tubes**: STEP_LO-SL1-STEP_HI 28.5 m, SPINE_W 24 m, SPINE_E 22 m, KWONG 21.5 m, N_LANE 19 m, all one width and one ceiling. The reference alleys change width and kink within a few meters.
2. **Walls several meters thick**: WINGPASS is a 3 m wide portal through 5 m of solid (x 33-38). WING_N passes through 3 m, WING_S through 2.5 m, WINGDOOR and both gallery windows GW1/GW2 through 2 m. RW_A is a 14 m wide "window" 2.3 m deep. These read as leftover gaps between independently placed boxes, not as party walls.
3. **The yamen has no building.** Y_MID is named "middle hall + court (open pavilion, spirit screen)" but is one sky-open rectangle; the band between Y_FRONT and Y_MID is 3.4 m of solid 24 m wide with a 5 m stair notch. Neither the pavilion nor the screen is drawn.
4. **Axial line through the map.** GATE, YGATE, SY1 and N_LANE all sit on x 48-52. From the attacker anchor (50, 6, eye 1.86) to the defender anchor (52, 86, eye 5.26) the only drawn obstruction is the terrace edge and guard G_YR at y 54 (top about z 4.45 against a sight height of about 3.9 there). If that guard is a railing rather than a wall, the line is open for 80 m. Inconclusive at this stage; the undrawn hall roofs and screen are what should close it (S1).
5. **Halls with no enclosure logic.** B_FLOOR is a column-free 24 x 20 m room 6.8 m high under an implied ten storeys of tower. A_COURT is an 18 x 18 m blank square called a temple court with no temple.
6. **Site names without site form.** T_APRON ("squatter sheds") and CT_STREET ("dentist arcade") are blank 54 x 8 m rectangles.
7. **Repetition of earlier maps.** B is again called "Noodle Works" (Ninefold's A), and "School" plus a committed roof bypass echoes the reboot. Beyond names, the macro is Ninefold's mirrored. Renaming will not fix this; S3, S5, S7 and S9 change the graph.

## Comparison of the three organizations

| Question | A Stepped Yamen | B Ring around the hollow | C Factory street section |
| --- | --- | --- | --- |
| Reference fit | Compound sequence and slope (images 8, 9, 12) | Void and upper corridors (image 2, texts) | Stacked section, workshops (images 13, 14) |
| What it wastes | Section and upper circulation; alley texture | The walkable stepped compound; the slope | The yamen (one end junction); the alley grid |
| Shared volumes | One real (B hall); gallery is two windows | The void itself, seen from two ring levels | Two workshops seen from three streets |
| Template risk | High: three-feed ladder, mirror of Ninefold | Medium: symmetric doughnut, clockwise/anticlockwise only | Medium: three lanes stacked vertically; roof site repeats Ninefold |
| Corridor monotony | 13 identical tubes | Roughly 250-300 m of ring corridor at two levels unless broken into rooms | Three long parallel streets |
| Orientation | Clear (uphill = defenders) | Weak without strong corner identities | Clear (level = street) |

Hybrid "A+" keeps A's legible uphill axis and walkable compound, takes from B the idea that the void is a shared volume watched from an upper level on more than one face, and from C the idea that the factory street is a section (street, workshop floor, bridge, mezzanine) rather than a tube ending at a door.

A more radical fourth option, noted for the author but not developed here: rotate the team axis onto the diagonal (attackers wrapping the south-west squatter corner, defenders on a north-east corner frontage along Tung Tsing Road, which is where `plan-streets-1980s` and the study place the dentists). Routes would then be two arcs round the void plus the compound, not parallel lanes. It requires moving B to the south-east and re-timing everything, so it should be a separate drawn alternative judged by the territory reviewer, not a patch to A.

## Proposals

All refer to revision S01-A.

### S1 — Yamen as a building standing in the void (Defect + Opportunity)

- **Affected:** CANNON north edge, YGATE, Y_FRONT, Y_MID, Y_REAR, E_WING, WINGPASS, WINGDOOR, SY1, SY2a/b, G_YR.
- **Change:** widen the sky void to x 35-67, y 30-64. Inside it place a compound x 39.5-62.5:
  - side wings, roofed single storey, x 39.5-43 and x 59-62.5, stepping with the floor; doors into the courts and out to the side lanes. E_WING (64-70, 31-47) is deleted and becomes the east wing.
  - gatehouse with recessed porch y 30-32 (roofed); front court x 43-59, y 32-40, z 0; steps y 40-42.
  - **middle hall**, roofed and open-fronted on columns, y 42-47, floor z 1.7, ridge about z 6.5, with a spirit screen 6 m wide at y 44 forcing a pass to either side.
  - rear court y 47-54, z 1.7; steps y 54-57 at the two sides (keep SY2a/b positions, moved to x 43-46 and 56-59).
  - **rear hall**, roofed, open-fronted, y 57-63, floor z 3.4, with a back door to the north at x 49-52.
  - two **side lanes** open to the sky between compound wall and tower face: west x 35-39.5, east x 62.5-67, each climbing z 0, 1.7, 3.4 by short flights at about y 38-41 and y 52-55, deliberately offset from the compound's own steps.
- **Before:** a player in Y_FRONT stands in a 24 x 9 m open box; the next court is another open box up a stair; the only lateral exits are a 5 m deep slot west and a 2 m deep door east. Whoever holds the Y_REAR edge looks down two bare courts.
- **After:** the player chooses court axis (through a roofed hall, round a screen) or either side lane (tower wall on one hand, compound wall and eaves on the other, sky above). Wings are short covered links between the two. From any upper opening on the tower faces the compound reads as tiled roofs with courts between: the halls hide the courts from each other and from the axial line noted above.
- **Sacrifices:** courts narrow from 24 m to 16 m; the middle gains many more angles and three parallel north-south strips 30 m long that need their own sightline work; more geometry to build. The centre becomes richer than either flank unless S3 and S5 follow.
- **Support:** `plan-streets-1980s` (compound with alleys on all sides), `aerial-1989` (low roof inside sheer void), `yamen-front-courtyard` (three-bay court, two-storey-height wings, open columned hall up a second flight), `park-yamen-overview-2018` (three halls, two courts, wings).
- **Check:** draw section EW at y 50 through School, west lane, wing, court, wing, east lane; confirm hall roofs close the x 48-52 axis.

### S2 — Free School as a loggia block on the void, with a half-turn stair on the terrace line (Opportunity)

- **Affected:** ARCADE, WINGPASS, SW1, GALLERY, GW1, GW2, NL_W.
- **Change:** move the school block east to abut the west side lane: x 29-35, y 26-60. Ground (z 0, y 26-40): a colonnade open along its east face straight onto the lane, replacing the 5 m WINGPASS. At y 40-46 a half-turn stair in a 6 x 6 m well whose **mid-landing at z 1.7 has a doorway east onto the side lane's z 1.7 terrace**. First floor (z 3.4): run the gallery the full length y 26-60 as a loggia, open between piers from sill height along the void face for y 44-58 instead of two windows; closed room with shutters for y 26-44.
- **Before:** ARCADE and GALLERY are sealed boxes; the yamen is glimpsed through two holes 4 m and 3 m wide in a 2 m wall; the stair is a blind straight flight.
- **After:** the school is one journey along the edge of the void at three heights, and the landing is an occupied half-level where the building's stair and the site's step meet: a player can leave the building mid-climb. From the loggia the view is across the compound roofs to the east tower face, down into the rear court and the west lane, but not into the front court (hidden by the middle hall roof).
- **Sacrifices:** a long elevated firing gallery over the centre; whether it dominates is for the visibility reviewer, and pier spacing and sill height are the tuning handles. Loses the separation that made the arcade a quiet route.
- **Support:** `plan-streets-1980s` (long narrow school block directly on the compound's west side); study relationship 6 (one block's ground floor meets the next block's first floor); `section-panorama-detail-lo-yan-street` (stair shaft between buildings).

### S3 — West district: jogged Sai Shing lane, a lit well junction, a shop cut-through, a corridor crossing overhead (Defect)

- **Affected:** W_SLOT, SPINE_W, STEP_LO, SL1, STEP_HI, the solid between x 17.5 and 29, PIGEON access.
- **Change:**
  - STEP_LO shortened to y 25.5-33, narrowed to 2.5 m.
  - **Well junction**: an irregular five-sided widening about x 11-20, y 33-40 (for example vertices (13,33) (18,33) (20,37) (17,40) (11,39)), z 0, open to a narrow shaft of sky, with a standpipe. This is the lit landmark between dark tunnels.
  - From its north-west corner a quarter-turn stair: 10 risers north to a landing at z 1.7 (x 10-13, y 41-43.5), turn, 10 risers to z 3.4, arriving in a re-aligned STEP_HI at x 9.5-12.5, y 46-54. The lane therefore enters A at its south-west corner, not its south centre.
  - **Cut-through shop** x 20-29, y 34.5-39 (a clinic or bakery with a counter making the path an S), linking the junction to the school colonnade at (29, 36).
  - **Bridge corridor** at z 3.4, x 13-29, y 30-32.5, 2.2 m wide, crossing over STEP_LO (alley ceiling drops to about 3.0 m beneath it) from the school first floor to a small shared stair shaft at x 9.5-13, y 28-33 serving z 0, 3.4 and the roof at 6.8.
  - One dead-end spur north-east off the junction, about 5 m, ending at a shuttered front (scenic, with a recess a body can stand in).
- **Before:** 28.5 m of straight tube with one decision (enter or not), parallel to and sealed from the arcade 11.5 m away.
- **After:** tunnel, lit junction with three onward choices (stair to A, shop to the school, shaft to the bridge), a turning climb that reveals the upper lane gradually, and a first-floor corridor visibly spanning the alley. The two west routes become one district with a cross-link at ground and one at first floor. It is possible to go from y 28 to A's flank without touching north-grade ground.
- **Sacrifices:** the west becomes the most intricate part of the map and slower to read; an early upper route for attackers changes A's defence (strategy reviewers to judge); the 2.2 m bridge is a deliberate squeeze. If too much, drop the shaft's ground access and keep the bridge as school-to-roof only.
- **Support:** `alley-covered-1993` (narrow alley, slight step, shopfronts flush), study image 5 (alley kinks and widens at a junction lit from above), `section-panorama-detail-lo-yan-street` ("corridor connecting to the next building", alleys as one-storey slots under bridging floors), `plan-streets-1980s` (jogs, spurs, red interior threads).

### S4 — A: a temple in the lot, not an empty square (Defect)

- **Affected:** A_COURT, STEP_HI, NL_W, NW_LANE, ALAND, RW_A, anchor A.
- **Change:** keep the lot at about x 8-26, y 54-72 but make it a notched outline (cut a 4 x 5 m corner at the north-east for a neighbouring tower; push a 3 x 6 m bay out at the south-west where the re-aligned lane arrives). Stand a single-storey **Tin Hau hall** in it at x 12-21, y 62-70: roofed, open-fronted to the south, three bays, floor raised three steps (z 3.85), ridge about z 8. A paved forecourt y 54-62 in front; gaps of 3-4 m on the west, north and east sides between temple and towers (north gap takes NW_LANE's arrival, east gap takes NL_W's). Objective zone: forecourt plus the hall's front bay.
- **Before:** 324 m2 of open square with four mid-wall doorways; from the Pigeon roof a 14 m wide opening looks down on all of it.
- **After:** the site has a front (forecourt, seen from the south lane and the roof), an inside (the hall, hidden from the roof by its own tiles) and a back (the hemmed gaps, where defenders arrive unseen and sky is a slit). Circulating round the building is the retake and rotation geometry.
- **Sacrifices:** smaller open plant area; the gaps are tight and may favour close weapons; the roof overlook loses value (reduce RW_A to two 3 m openings in a parapet). The debris net stays an invention.
- **Support:** `plan-streets-1980s` (temple as its own lot hemmed by blocks), study finding 3 (about 15 x 15 m lot; small temple with sky nearly invisible), `yamen-front-courtyard` for the open-fronted hall type.

### S5 — Kwong Ming as a factory street in section: oblique, lined, bridged, passing through the works (Defect + Opportunity)

- **Affected:** SPINE_E, KWONG, E_WING (retired by S1), WING_N, B_FLOOR, B_MEZZ_W, B_MEZZ_N, SB, NL_E, NE_LANE.
- **Change:**
  - Run Kwong Ming obliquely, centreline from about (83, 28.5) to (77, 50), width varying 2.8-4.5 m.
  - West side: a **fish-ball workshop** x 68-77, y 34-45, z 0, single storey, deep interior with vats, doors to the east side lane (x 67) and to the street: the ground cross-link that replaces E_WING.
  - East side: a shallow plastics shop bay x 84-89, y 36-44 open to the street across a raised sill (standing room and cover, no through-route).
  - A **bridge room** at z 3.4 spanning the street at y 45-48, x 68-86, joining the east lane's upper terrace to a stair at the east end that descends into the works.
  - Reshape the works as a trapezoid following the street (south wall on the skew), with a 6 m column grid. The street continues **through** the hall as a cartway along its east wall and leaves by a quarter-turn stair in the north-east corner up to NE_LANE at z 3.4. Replace the mid-floor straight flight SB with that corner stair plus the bridge-room stair. Keep the L mezzanine; let its west arm be the continuation of the bridge room.
- **Before:** 21.5 m of tube, then a door into a box; the mezzanine is reachable only from the defenders' level.
- **After:** the approach passes lit shop mouths, under a bridging room, and widens into the double-height hall without a doorway; the bridge room, mezzanine and cartway are three heights of one journey that keep seeing each other. An attacker can commit low along the street or climb in the bridge room and arrive level with defenders.
- **Sacrifices:** attackers gain mezzanine access, which changes B fundamentally (strategy reviewers must weigh it; the bridge-room stair could instead be made defender-side only). Skewed walls cost modelling effort; coherent only if the skew is carried by the whole block.
- **Support:** `plan-streets-1980s` (Kwong Ming is not parallel to the compound and is lined with factory dots), `section-panorama-detail-tai-chang-street` ("passage linking three buildings", double-height ground floors, extensions built into the gap), study relationship 8.

### S6 — Roofscape as unequal terraces with a pit (Opportunity, optional)

- **Affected:** SCHOOL_ROOF, PIGEON, SW2, SR, RW_A, G_SR.
- **Change:** break the flat 320 m2 L into three: school roof z 6.8 (x 29-35, y 38-52); a **pit roof** z 5.1 (x 17-29, y 44-52) between higher neighbours, entered by 10 risers down and 10 up; pigeon roof z 6.8 (x 6-17, y 44-52) with loft cages forming a staggered path. Keep SW2 and SR. Reduce the overlook of the void to one 4 m gap in a parapet.
- **Before / after:** a flat deck with a 13.7 m rail over the yamen and a 14 m rail over A, versus a crossing that dips out of sight and offers two bounded looks.
- **Sacrifices:** slower, less legible roof route; more stairs. Skip if the roof is meant to stay a simple committed bypass.
- **Support:** `aerial-1989`, both section details (roofs at four or more levels; low rubbish-covered roof between towers).

### S7 — South edge: break the three parallel entries; sunken gate ruin (Defect)

- **Affected:** T_APRON, W_SLOT, GATE, E_SLOT, SPINE_W, CANNON.
- **Change:**
  - Wrap the apron round the south-west corner: add x 2-10, y 10-30 as a west yard of squatter sheds (three shed masses drawn as solids, lanes between). Delete W_SLOT. Extend SPINE_W west to x 10 so Lung Chun Road opens through the tower wall onto the west yard: the spine becomes a through-street entered end-on.
  - Kink E_SLOT: north to y 17, 3 m jog east, then north to y 25.
  - In CANNON, sink a **gate-ruin pit** x 43-57, y 20-27 to z -1.7 with brick retaining walls, a ramp at the west end and steps at the east end, old footings and later column stumps in it; forecourt remains at z 0 around it, cannon at the pit's north-east lip. The pit is an optional lower crossing, never the only way.
- **Before:** three identical slots 24 m apart off one rectangle, each reaching the spine in 12-15 m; Cannon Court is a flat 24 x 12 m pad.
- **After:** attackers leave from two faces of the city; one entry is a street end, one a gate tunnel onto a court with a hole in it, one a kinked slot. The forecourt has a low level that crosses beneath the spine's east-west view.
- **Sacrifices:** a larger, L-shaped spawn; the west entry lengthens slightly; the pit needs its drop edges flagged for engine verification (no mandatory drop).
- **Support:** study finding 5 and image 3 (squatter village abutting south and west); `park-yamen-overview-2018` (sunken gate excavation in front of the forecourt); study images 10-11 (cannon, pit about 2 m deep).

### S8 — North of the void: Youth Centre hall instead of lane-terrace-lane (Defect)

- **Affected:** N_LANE, NL_W, NL_E, Y_REAR north edge.
- **Change:** build the Youth Centre as a room, x 41-61, y 64-75, z 3.4, 4.2 m ceiling, with a column row and a low stage at the east end. The rear hall's back door (S1) opens into it; it has doors west (to a shortened NL_W at x 26-41, kinked once at x 33) and east (to NL_E, lengthened and stepped down 5 risers toward the B mezzanine if S5's levels allow). N_LANE becomes a 7 m lane from the hall's north-east door, offset to x 56-59, so it no longer sits on the x 48-52 axis.
- **Before:** defenders' rotation is a flat strip: lane, open terrace, lane; the centre arrival is a 19 m straight tube on the map's axis.
- **After:** the rotation passes through an occupied interior directly behind the rear hall, with the choice of crossing inside (covered, heard) or on the rear-hall terrace (open, seen from the loggia). The upper ring exists on two faces of the void (school loggia, youth centre) without becoming a full circuit.
- **Sacrifices:** a strong defender hub one door from the centre; slightly longer and less direct central arrival.
- **Support:** `plan-streets-1980s` (youth centre drawn directly on the compound's north side, inside the same void).

### S9 — Defender edge: frontage with depth and a jogged north-west approach (Defect)

- **Affected:** CT_STREET, NW_LANE, NE_LANE.
- **Change:** give the frontage a real section: pavement z 3.4 sloping gently, an arcade strip 3 m deep under a projecting first-floor terrace along y 79-82, and two **through-shops** (dentist x 30-38, y 74-82; shuttered clinic x 66-74, y 72-82) as alternatives to the lanes. NW_LANE: enter at x 24-27, run south to y 76, jog west 4 m at a small lit widening, arrive in the temple's north gap (S4). NE_LANE keeps its position but takes the works' corner stair (S5) on its west side.
- **Before:** an 8 m blank strip and three plain tubes; A is 10 m of straight lane from the spawn street.
- **After:** defenders leave through a recognizable shop wall, each exit different, with a turn before either site.
- **Sacrifices:** adds a few seconds to defender arrivals (possibly desirable at A, where the drawn distance is roughly half the attackers'; timing is another reviewer's call).
- **Support:** study images 6-7 (continuous shop and dentist frontage, projecting first-floor terrace, sloping pavement).

## Keep unchanged

- The stepped compound on the slope, with its half-storey (1.7 m) increments, as the map's centre and orientation device.
- Lung Chun Road as one east-west alley across the compound's front, with its two halves offset (y 22-25.5 against y 25-28.5) so it is not one 70 m line.
- B's level inversion: attackers arrive on a dug-in floor at z 0, defenders on the mezzanine at north grade. This is the best use of the stepped site in the sketch.
- The school overlooking the compound, as an idea (S2 changes its form, not its role).
- Tunnel alleys with a 3.4 m ceiling as the default enclosure, and the yamen void as the only large sky.
- Overall envelope (about 100 x 92 m) and three occupied elevations. More extent is not needed.

## Dependencies and conflicts

- S1 retires E_WING and WINGPASS; S2 and S5 supply their replacements, so adopt S1 with at least one of them.
- S3's bridge and shaft and S6's pit both alter the roof route; choose S3 alone if the roof should stay simple.
- S4 assumes S3's re-aligned lane; without S3, shift the temple 2 m east.
- S5 gives attackers upper access at B and S3 gives it at A: adopting both changes the map's vertical character and deserves an explicit strategy comparison.
- S8 moves N_LANE off axis; with S1 this closes the 80 m axial line by two independent means.
- If the diagonal fourth option is drawn, S1, S2, S4 and S5 carry over; S7-S9 would be redesigned.

## Open questions for later stages

- Whether the loggia (S2) and the three north-south strips of S1 produce acceptable sightline lengths: needs the drawn section and height-aware visibility prediction.
- Whether 2.2-2.8 m passages are acceptable for the target engine's five-player movement; the references show 1.5 m, the sketch uses 3.5 m everywhere, and variation between about 2.5 and 4.5 m is the proposal.
- All timing consequences of S7-S9.
