# Dragon Ford S01 — independent design proposals: local encounters and movement/vertical interfaces

Reviewer scope: the two bomb sites and their approaches, the stepped yamen as a fight, stairs, the works mezzanine, the roof route, spawn exits and long sightlines.
Inspected revision: `planning/s01-a/layout-data.json` revision `S01-A`, its five drawings, `brief.md`, `references/study.md`, four reference images (`plan-streets-1980s`, `alley-covered-1993`, `yamen-front-courtyard`, `section-panorama-detail-tai-chang-street`) and `planning/alternatives-s01.md`.

Independence: I read no file under `reviews/` and no author rationale. `alternatives-s01.md` contains short descriptive claims about A ("CT's shortest A↔B rotation crosses its rear terrace", "roof route … overlooks the yamen", "windows overlook the yamen courts"); I treated them as hypotheses and checked them against the polygons.

Evidence level: sketch stage. Everything below is a prediction from plan polygons and sections, not compiled geometry. No balance claim is made. Path lengths are centre-line plan metres, not times.

## 0. How the sightlines were measured

I rasterised the layout into a 0.25 m × 0.25 m × 0.1 m voxel grid (spaces carved from floor to ceiling minus a 0.3 m slab, sky spaces open, stairs as ramps, apertures with their sill/head, guards as 1.05 m solids, mezzanine slabs solid). Standing points were sampled on a 1–2 m grid in every space plus three points per stair. A line counts when eye (floor + 1.86 m) sees eye. "Full body" means the eye also sees the other player at floor + 1.0 m; "head-only" means it does not.

Limits: sampled, so thin tangent gaps can be missed; ±0.1–0.25 m voxel tolerance makes grazing lines (noted as such) uncertain; the walker body, crouch and engine FOV were not simulated. Features named in labels but absent from `covers` and the polygons (open pavilion, spirit screen, gate ruin stumps, debris net, squatter sheds) block nothing in this scan because they have no geometry yet.

I also re-ran the scan with the proposed solids of L1–L9 inserted as boxes, to check that each claimed line is actually cut. Those results are quoted per proposal as "scan after".

## 1. Which organization gives the best local fights

**A, developed, with two grafts.** Reasons, from the local-encounter side only:

- A is the only candidate where the three kinds of place produce three different fights: a stepped open-sky court read from below and above (z 0 / 1.7 / 3.4), an enclosed double-height hall fought floor-against-gallery, and a hemmed court at the upper grade. B and C each repeat one relationship many times.
- B (ring around a non-traversable void) would make almost every fight a corridor or gallery duel along the ring, with the opponent's flank always arriving from directly behind, and a 35 × 50 m void that generates 35–50 m cross-shots from every arcade bay. The middle would supply information but no close fight. Its good idea is the corner stair shaft shared by two levels.
- C (three stacked east–west streets, end spawns) has the richest vertical interfaces, but each double-height workshop is seen from three levels at once, so one doorway presents low, middle and high threats together; and streets running the 100 m length of the envelope between end spawns invite the longest straight lines of the three. Its good idea is the workshop that several levels look into.

Grafts worth carrying into A: from B, treat stairs as shafts with turns and landings rather than straight flights laid in the lane (L2, L3, L7), and use bounded windows across the void as a deliberate relationship (L3, L4). From C, let the works be read from two levels with defined bays rather than one continuous rail (L6, L7).

A as drawn does not yet deliver these fights. Its spaces are bare rectangles reached by straight tubes, all eight stairs are straight single flights, and several accidental lines run 60–70 m (section 4). The proposals below are about that gap.

## 2. Observed defects of the sketch (S01-A as drawn)

These are facts of the polygons, separate from the opportunities in section 3.

| ID | Observation | Evidence |
| --- | --- | --- |
| D1 | `NW_LANE` does not touch `CT_STREET`. The lane is x 20–23.5 and ends at y 82; the street polygon starts at x 26. There are 2.5 m of mass between them, so A's north mouth is a dead end and every defender reaches A through the terrace and `NL_W`. | polygons; visible in `plan-1.png` |
| D2 | `covers` is empty and five labelled features have no geometry (pavilion, spirit screen, gate ruin stumps, debris net, sheds). Both sites and all three yamen courts are bare rectangles. | `layout-data.json` |
| D3 | One level band at z 3.4, y 58.5–62, runs unobstructed from `ALAND` (x 5.6) through `A_COURT`, `NL_W`, `Y_REAR`, `NL_E` and `B_MEZZ_W` to the mezzanine rail (x 70.5): 64 m full-body, and it continues across the works void. A site sees B site. | `section-EW.png` shows it as one floor line; scan |
| D4 | The yamen axis is a straight channel from `T_APRON` through `GATE`, `YGATE` and the `SY1` slot (all x 48–52) and, at the upper grade, `N_LANE` (x 48–51.5) to `CT_STREET`. Attackers standing in spawn are in full-body view from `Y_MID` (51 m) and from the terrace (60 m). | scan |
| D5 | All eight stairs are straight single flights without landings; the five storey-height ones are 20 risers in a 6.8 m run. Leader and follower are in one line with no place to stop. | `stairs` |
| D6 | The roof is a loop, not a route. `SW2` starts at `RLAND`, 0.3 m from A's east door; `SR` ends at `ALAND` on A's west wall. Both ends are inside A's own precinct on the upper grade. The `RW_A` overlook is 14 m wide and sits directly above and behind the attackers' main mouth (`STEP_HI`, x 14–17.5). | polygons |
| D7 | Both defender entries to B arrive on the mezzanine and one stair (`SB`) is the only way down. The strip under `B_MEZZ_N` (24 × 5 m, headroom 3.1 m) cannot be seen from anywhere on the mezzanine. | polygons, `section-EW.png` |
| D8 | `GW1`/`GW2` are cut through a 2 m thick wall (x 36–38), so their view cones are narrow, and `GW2` (y 54–57) faces the west wing steps and the terrace's front strip rather than a court. | apertures |
| D9 | Door pairs line up through rooms: `WINGPASS` (y 33–36) with `WINGDOOR` (y 34–37) across `Y_FRONT`, and `WING_S` (x 66–69) with `WING_N` (x 66.5–69.5) through `E_WING` into B. | scan: 40 m and 44 m full-body |

## 3. Proposals

Format per proposal: type; affected IDs; physical change; before; after; follower support and opponent response; sacrifice; evidence and test. "Tall" means opaque to a standing player from the stated observer; "low" means 1.0–1.2 m.

### L1 — Site A: put the temple in the temple court

Type: opportunity (also repairs D2, part of D3).
Affects: `A_COURT` (x 8–26, y 54–72, z 3.4), anchor A, `NL_W` door (x 26, y 60–63.5), `NW_LANE` mouth (x 20–23.5, y 72), `ALAND` door (x 8, y 58.5–61), `RW_A`.

Change:
- Temple cella, solid full-height mass: x 8–17, y 66–72, against the north and west walls.
- Porch in front of it: x 8–17, y 63–66, roofed (underside z 6.4), open to the south, two 0.4 m columns at x 11 and x 14, east end open at x 17.
- Plant zone: the porch plus its apron, x 8.5–17, y 60.5–66. Move anchor A to about (13, 63.5).
- Screen wall facing the east door: tall (2.6 m), x 22–22.5, y 59.5–64, standing 3.5 m inside the door. Pass it at the south end (toward the court) or the north end (toward the north-east yard).
- Incense burner: low (1.1 m), 1.4 × 1.4 m at x 12.3–13.7, y 58.8–60.2.
- This leaves an L-shaped court (south strip y 54–63, east strip x 17–26) and a north-east yard x 17–26, y 64–72 in front of the north mouth.

Before: the bomb at (15, 64) lies in a bare 18 × 18 m square. All four doors and the 14 m roof overlook see the anchor within 13 m, and no spot in the court is hidden from more than two of them. An attacker stepping out of `STEP_HI` and a defender in `NL_W` or the north mouth simply duel across open ground; the defender in `NL_W` also sees clean through to `ALAND`.

After: the planter works inside the porch, hidden from the north mouth and from most of the north-east yard, visible from the south strip, the west door and the roof gap. Defenders arriving at the east door are covered by the screen and choose south end (12 m view to the south mouth) or north end (join the yard). Defenders from the north mouth hold the porch's open east end at x 17. The fight becomes south-west (attackers) against north-east (defenders) around the cella corner.

Support and response: an attacker's follower can hold the burner against the east door while the leader clears the porch end; a second attacker through `ALAND` enters 4 m from the plant zone. After a plant, defenders retake around the cella corner and around either end of the screen, and can take the roof gap (L3) for a view into the porch — the porch roof does not hide the bomb from the roof gap at this distance (eave at z 6.4, gap eye at z 8.66 about 10 m south).

Sacrifice: A loses its openness and its reading as one square; both defender entries sit on the east and north-east, so a retake comes from one quadrant unless the roof is used; the screen wall is a close-range corner next to a door.

Evidence and test: scan after — `ALAND`/`A_COURT` to the terrace falls from 53–64 m to about 35–39 m (a diagonal through the north end of the screen), and `STEP_HI` to `NW_LANE` (39 m) is cut. Compare against a variant with the cella central (ring court) once blocked out; check the porch from the roof gap, the burner standing and crouched from the east door, and the 1.5 m porch column gaps for body fit.

### L2 — Sai Shing steps: two short flights with a jogged landing

Type: defect repair (D5) and opportunity.
Affects: `STEP_LO`, `SL1`, `STEP_HI`, A's south mouth.

Change (offset two-flight stair with landing):
- `STEP_LO` shortened to y 25.5–34.
- Lower flight: x 14–17.5, y 34 → 37.4, z 0 → 1.7 (10 risers).
- Landing: x 9.5–17.5, y 37.4–41, z 1.7 (8 × 3.6 m), lit from above as a junction slot.
- 1 m pier of mass at x 13–14 north of the landing.
- Upper flight: x 9.5–13, y 41 → 44.4, z 1.7 → 3.4 (10 risers).
- `STEP_HI` moves to x 9.5–13, y 44.4–54. A's south mouth becomes x 9.5–13 at y 54.

Before: one 3.5 m tube runs straight for 50 m from `SPINE_W` (y 22) to A's north wall (y 72). A defender at (15.75, 71) sees attackers' heads over the stair crest from the moment they turn into `STEP_LO` (44 m, grazing), and their full bodies on the upper half of the flight and all of `STEP_HI`. Leader and follower walk in single file for 29 m with nothing to stop behind.

After: from A only the upper flight and 9.6 m of lane are visible. An attacker on the east half of the landing is hidden from A; stepping west to the foot of the upper flight puts their eye at z 3.56, 0.16 m above A's floor, so the first exchange with a defender inside A is head against head. The follower waits 3–4 m away on the landing's east half or the lower flight and can swing out to trade.

Support and response: the defender can push to the head of the upper flight (y 44.4) to look down into the landing, at the cost of standing 10 m outside the site with A behind them; or stay in A and use the burner. The landing is an enclosed 8 × 3.6 m box, so utility thrown into it is the natural counter (grenade behaviour not verified in this harness).

Sacrifice: the south mouth moves next to the west door (1.5 m of wall between), concentrating attacker entries in A's south-west corner; the lane is no longer legible end to end; the landing can trap a stack.

Evidence and test: scan after — `SPINE_W` to `A_COURT` drops from 44 m to a 30 m head-only graze from the south end of `STEP_LO`. I first tried the upper flight at x 10.5–14 (no pier) and a diagonal still threaded both flights for 43 m; the pier is what closes it. The jog must go west: jogging east to x 17.5–21 would align the lane with the north mouth (x 20–23.5). Reference: alley kinks that widen at a lit junction (`alley-sai-shing-7th-lane`, study finding 4). Test in blockout from A's north wall, from the flight head, and from both teammates on the landing.

### L3 — School core: arrival vestibule, a second flight to the roof, and a bounded overlook

Type: defect repair (D6, D8) plus experiment.
Affects: `SW1`, `GALLERY`, `GW1`, `GW2`, `SCHOOL_ROOF`, `PIGEON`, `SW2`, `RLAND`, `SR`, `RW_A`, `G_SR`.

Change:
- Vestibule: tall partition at y 49.8–50.2 from x 29 to x 33.5, door gap x 33.5–36 (2.5 m). The stair now arrives in a 7 × 3.2 m room (y 46.8–50) holding the south part of `GW1`.
- Thin the window wall to 0.4 m (gallery to x 37.6) so `GW1` (y 47.5–51.5) and `GW2` are real openings; keep sill 1.1 m, head 2.3 m. The crouch body (1.1 m) equals the sill, so a crouched player is hidden.
- New return flight `SW3`: x 31.6–34, from the vestibule strip at y 46.8 (z 3.4) south to y 40 (z 6.8), 20 risers, emerging through a roof bulkhead with tall side walls. With `SW1` this makes a half-turn stair core: ground → gallery northbound, gallery → roof southbound.
- Keep `SW2`/`RLAND` as the north access to the roof.
- `RW_A`: reduce the open overlook from x 10–24 to a 4 m gap at x 19–23; the rest becomes tall pigeon cages (2.2 m).
- `G_SR` (roof edge over the yamen): tall caged parapet except a 4 m gap at y 44–48.

Before: `SW1` delivers the leader, head first, into the long axis of a 13 m gallery; a defender at the north end sees the stair head and the follower sees only the leader's back. The roof can be reached only from the upper grade beside A (plan path from CT anchor about 57 m), so it works as a defender perch 3.4 m above and directly behind attackers entering A from the south, with a 1.1 m sill for cover.

After: the leader tops the stair inside a room nobody in the gallery can see, holds `GW1`'s south half onto the middle court, and enters the gallery through one door. The roof gets an attacker-side entrance (plan path from T anchor about 65 m against about 57 m for defenders by `SW2`), the two arrivals are 12 m apart with the bulkhead between them, and the overlook onto A is a single 4 m bay that looks north-west across the court rather than straight down on the south mouth.

Support and response: whoever holds the gallery covers the west wing steps and the terrace front through `GW2`; attackers who take it make `SY2a` usable (see L5). Defenders can contest the gallery from `NL_W` through the partition door, or the roof from `SW2`. A roof player reaching `SR` arrives at `ALAND` about 95 m of path from T spawn — a late second entry, not a rush.

Sacrifice: the school becomes a three-level core that pulls players west; the roof is one more thing both teams must account for; an attacker-held roof gap watches the A plant. If that proves too much, the fallback is to delete `SW3` and keep only the narrowed gap.

Evidence and test: scan after — pigeon/school roof to `B_MEZZ_N` falls from 58–65 m to a 46 m head-only graze; `GALLERY` to `B_MEZZ_N` (64 m through `GW1`) is cut with L5. Test the vestibule door from the gallery's north end, both teammates on `SW1`, the bulkhead exit, and what the 4 m gap sees of the porch in L1.

### L4 — Middle court: build the open hall over the stair head

Type: defect repair (D2, D4) and opportunity.
Affects: `SY1`, `Y_MID` (x 38–62, y 43.4–54, z 1.7), `G_YR`, `GW1`, views from `Y_REAR` and `SCHOOL_ROOF`.

Change (after the hall in `yamen-front-courtyard.jpg`: open columned front, closed carved screen at the centre of the rear):
- Hall roof over x 43–57, y 43.4–48.4 (14 × 5 m), eave underside at z 4.7.
- Four 0.4 m columns on the south line at x 44, 47.5, 52.5, 56.
- Rear screen wall, full height to the roof: x 46.5–53.5, y 48.0–48.4.
- Open bays either side of the screen: x 43–46.5 (west) and x 53.5–57 (east).
- No low cover in the north strip (y 48.4–54). It stays a deliberate exposed crossing to the wing steps.

Before: `SY1` is a 5 m slot climbing into a bare 24 × 10.6 m court. An attacker at the stair head is seen at once from the whole 18 m terrace balcony (1.7 m higher, behind a 1.05 m guard that leaves only head and shoulders of a standing defender visible from below), from `GW1` on the flank and from the school roof. There is nowhere in the court to stop, and both exits (`SY2a`, `SY2b`) lie under the balcony.

After: attackers climb `SY1` into a roofed staging pocket. The centre of the terrace cannot see the stair head at all (the eave cuts the downward line); terrace corners see obliquely into one bay each; `GW1` still sees under the eave from the side. Attackers choose the west bay (toward `SY2a`, under `GW2`) or the east bay (toward `SY2b`), then cross 5.6 m of open strip.

Support and response: the follower can hold the opposite bay or the stair head while the leader commits. Defenders answer by holding the two terrace corners and the gallery window rather than one rail, which costs them three positions to cover both bays; low cover would not help attackers here because the balcony looks down over anything 1.1 m high.

Sacrifice: the processional view up the axis is closed at the middle hall; the centre of the balcony loses its command of the court; the pocket (14 × 5 m with one stair behind) concentrates attackers for utility.

Evidence and test: with L8, scan after shows no line from `T_APRON` to `Y_MID` or `Y_REAR`. Flat-box roof approximation; a pitched tiled roof changes the eave line, so recheck terrace-corner and `GW1` views in blockout from standing and crouched eyes.

### L5 — Rear terrace: a through-hall with an altar screen

Type: defect repair (D3, D4) and opportunity.
Affects: `Y_REAR`, `N_LANE` arrival (x 48–51.5, y 63), `NL_W`, `NL_E`, `G_YR`, `SY2a`, `SY2b`.

Change:
- Rear hall on the terrace: interior x 45–55, y 55.5–63; side walls (0.4 m, full height) at x 44.6–45 and x 55–55.4 from y 55.5 to 63; roof over x 44–56, y 54–63, underside z 6.6.
- Open colonnaded front at y 55.5 (columns at x 48.3 and 51.7), leaving a 1.5 m balcony strip behind the existing guard `G_YR`.
- Altar screen, full height: x 46.5–53.5, y 60.2–60.6. `N_LANE` now arrives in a 2.4 m back aisle behind it.
- Side doors 2.4 m wide, staggered: west door y 57.8–60.2, east door y 60.4–62.8.
- Terrace wings x 38–45 and x 55–62 stay open to the sky.

Before: a defender leaving `N_LANE` stands on a bare terrace in a 35 m line from their own spawn street, on the 64 m A-to-B band, and under the school roof. The balcony is one 18 m rail. Rotating between sites means walking that band in view of both site doors.

After: defenders arrive behind the altar screen and pick the colonnade (balcony over the court), the west door (to `NL_W` and A) or the east door (to `NL_E` and B). The band is cut into three pieces; the spawn street no longer sees the balcony edge.

Support and response: attackers who reach the terrace by a wing stair meet a hall door 5–6 m away rather than an open terrace, and a teammate in `GW2` covers the west door and the colonnade front from the side. `SY2b` has no such support (the east wing has no upper window); that asymmetry is worth keeping as a choice unless playtests say otherwise. Wing-stair interface as drawn: 3 m wide, 10 risers, the follower at the foot sees only heads over the crest toward the hall door.

Sacrifice: rotation between sites gains two doorways and a screen; the terrace loses its openness as the map's upper square; the hall is a small enclosed room next to the defenders' main lane.

Evidence and test: scan after — `CT_STREET` to `Y_REAR` shortens from 35 m to 29 m, ending at the altar screen; the 64 m band is gone. A 43 m head-only thread from `Y_MID`'s north-east corner through the colonnade and west door into A remains; moving the west door to y 60.6–63 should close it. Test door staggering and the 1.5 m gaps at the screen ends for body fit.

### L6 — Site B floor and its two attacker approaches

Type: defect repair (D2, D9) and opportunity.
Affects: `KWONG`, `E_WING`, `WING_S`, `WING_N`, `B_FLOOR` (x 66–90, y 50–70), anchor B.

Change:
- Boiler block: tall, 3.0 m, x 80–84.5, y 53–55, three metres inside the Kwong mouth. It must be 3.0 m, not 2.4 m: observers on `B_MEZZ_N` are 3.4 m higher and see the head of a standing player behind a 2.4 m block.
- Plant zone: x 74–82, y 58–66.5. Most of it is open double-height floor; its north 1.5 m lies under the mezzanine lip.
- Flour-sack stack: low (1.1 m), x 76–78.4, y 57–58.2, on the plant zone's south edge.
- Workshop recess off Kwong Ming Street: x 77–80.5, y 40–45, open front, as a staging pocket 5–10 m short of the mouth.
- Dormitory partition in `E_WING`: tall wall y 39–39.4, x 64–67.5, gap x 67.5–70.

Before: `KWONG` is a 3.5 m tunnel aimed at the anchor; a player at the south end of `SPINE_E` sees to B's north wall (44 m, full body) and a defender under the mezzanine sees 21.5 m of lane with no recess. The wing route is three aligned doors: 44 m from `SPINE_E` to B's north wall. On the floor the planter is visible from all 32 m of rail.

After: the lane ends at the boiler. Attackers stage in the recess, then split west of the boiler (toward the stair and plant zone) or east (5.5 m passage along the east wall). The wing route bends once and enters B under `B_MEZZ_W`. The plant is a choice: in the open, where attackers can watch it from the Kwong mouth and recess side, or under the lip, hidden from the mezzanine so defenders must come down.

Support and response: leader west and follower east of the boiler check different rail bays (L7). Defenders can come down early and play the north face of the boiler or the sack stack, or stay up. Plan paths for context: T anchor to `WING_N` about 54 m, to the Kwong mouth about 71 m; CT anchor to either mezzanine door about 38–40 m.

Sacrifice: the factory street loses its uninterrupted run into the hall; the boiler hides the mouth from mezzanine defenders; an under-lip plant may be hard to retake (depends on L7).

Evidence and test: scan after — Kwong/`SPINE_E` to B falls from 44 m to about 33–37 m (from mid-lane past the boiler's east side); a 3 m wide boiler left a 0.5 m sliver, hence 4.5 m. The wing-door line was not re-scanned with the partition. Reference: double-height ground-floor workshops with deep interiors (study finding 8).

### L7 — Works mezzanine: bays instead of a rail, a turned stair and a second descent

Type: defect repair (D5, D7, part of D3) and experiment.
Affects: `B_MEZZ_N`, `B_MEZZ_W`, `SB`, `G_BN`, `G_BW`, `NL_E` door, `NE_LANE` arrival.

Change:
- `SB` becomes a quarter-turn stair with a landing: upper flight x 70.8–73.2 from the mezzanine edge at y 65 south to y 61.6 (z 3.4 → 1.7); landing x 70.8–73.2, y 59.2–61.6 at z 1.7 with a solid 1.05 m parapet; lower flight turning east, x 73.2 → 76.6 at y 59.2–61.6 (z 1.7 → 0). Solid store beneath.
- Second descent `SE`: straight flight against the east wall, x 87.6–90, from y 65 south to y 58.2, with a solid 1.05 m balustrade on its west side.
- Louvre wall, full height, replacing `G_BW` at x 70.5 from y 57 to y 63.5, in front of the `NL_E` door.
- Works office wall, full height, replacing `G_BN` at y 65 from x 75 to x 81, in front of the `NE_LANE` arrival.
- Remaining open rail: south-west bay (x 70.5, y 54–57), stair head (x 70.8–75), east rail (x 81–87.6).

Before: defenders arrive on a continuous L-shaped rail and see the whole open floor with only head and shoulders exposed. After a plant, attackers under `B_MEZZ_N` are invisible from above and the only way to reach them is one 6.8 m straight flight in full view, or about 70 m around through the yamen and wing.

After: attackers entering B read three bays instead of 32 m of rail. Defenders have two descents at opposite ends of the under-mezzanine strip, and the landing at z 1.7 (eye 3.56) looks under the north mezzanine's 3.1 m soffit, so a retaker can see into the pocket before committing.

Support and response: a defender on the landing and one on `SE` approach the pocket from both ends; attackers answer by holding the stair foot from the sack stack or the boiler's north face, or by planting in the open to keep the fight long. Arrival from either lane is screened, so a defender must step into a bay to see the floor.

Sacrifice: the works reads less as one hall watched from a gallery; the post-plant pocket is weaker for attackers; two screens and two stairs add checks; `SE` gives defenders a quick drop beside the Kwong mouth.

Evidence and test: scan after — `B_FLOOR`/`KWONG` to `NE_LANE` and `CT_STREET` (33–44 m, head-only) are cut by the office wall. The landing's view under the soffit is a section calculation only (from (72, 60.4, 3.56) to chest height at y 67 the line passes y 65 at z 2.1). Jumping the 3.4 m rail is an optional move needing engine verification and is not assumed.

### L8 — T spawn exit and Cannon Court: a T-shaped gate ruin

Type: defect repair (D2, D4) and opportunity.
Affects: `T_APRON`, `GATE`, `CANNON` (x 38–62, y 18–30), `YGATE`, `SPINE_W`, `SPINE_E`, `W_SLOT`.

Change:
- Keep `GATE` on the axis.
- South Gate ruin as a T in plan, 3.6 m tall (old footing with later concrete frame on it): bar x 45.5–54.5, y 26–26.6, standing 3.4 m in front of `YGATE`; stem x 49.7–50.3, y 20.5–26.
- Height matters: at 2.6 m an attacker's eye in spawn still sees over it to heads on the higher courts.
- Cannon on carriage: low (1.1 m), 2.4 × 1.0 m at about (56, 28).
- Optional: widen the `W_SLOT`/`SPINE_W` junction to a 6 × 6 m lit well (x 23–29, y 21–27) as a place to stack before choosing `STEP_LO` or `ARCADE`.

Before: all three spawn exits rejoin within 12–18 m on one east–west line: `SPINE_W` – `CANNON` – `SPINE_E`, 69 m full body. The centre exit is also the axis in D4: attackers in spawn are visible from `Y_MID` at 51 m and from the terrace at 60 m, and a grazing head-only line runs 65 m from Cannon Court to the CT street.

After: the bar closes the axis for anyone coming through `GATE`; they walk round either end to reach `YGATE`. The stem cuts the spine line in two (about 45 m each side), and Cannon Court becomes two half-courts with a low cannon position watching `YGATE` and the east spine door.

Support and response: a team crossing between the west and east routes is hidden for the middle of the crossing; a defender who has pushed through the yamen gate gets the bar as cover and can hold one half-court but not both.

Sacrifice: the gate-to-hall processional view is lost at ground level; the court is less of a plaza; players rotating along the spine must round the stem.

Evidence and test: scan after — `SPINE_W` to `SPINE_E` (69 m) and every `T_APRON`/`GATE` line into `Y_MID`, `Y_REAR` and `N_LANE` are gone. I first tried offsetting `GATE` to x 42–46 without a ruin: a 58 m diagonal from the apron still threaded `YGATE` and the `SY1` slot, so the offset alone does not work. Reference: gate footings with later column bases in front of the forecourt, cannon at its edge (study finding 3).

### L9 — CT spawn exits: connect the north-west lane with a dogleg

Type: defect repair (D1).
Affects: `CT_STREET`, `NW_LANE`, A's north mouth. (The other two exits are handled by L5 and L7.)

Change:
- Remove the dead-end `NW_LANE`.
- Leg a: x 26–29.5, y 76.5–82, south from the west end of the frontage.
- Leg b: x 20–29.5, y 73–76.5, west.
- Mouth: x 20–23.5, y 72–73 into A's north-east yard.

Before: as drawn, defenders cannot use A's north mouth, so the only way to A is `N_LANE` – terrace – `NL_W` (about 47 m to the east door), a 3.5 m corridor shared with attackers coming through the gallery. Had the lane simply been extended straight, the spawn street would look 36 m down it into the site.

After: defenders choose the dogleg (about 41 m to the north mouth) or the terrace (about 47 m to the east door). The two arrivals are 10 m apart around the screen wall of L1. Nothing in the street sees into A.

Support and response: two defenders can enter A from two doors at once. Attackers who took the gallery can cut the terrace route but not the dogleg.

Sacrifice: a second defender route makes A quicker to reinforce and the gallery flank less decisive; the dogleg is a blind double corner for anyone pushing toward the CT street.

Evidence and test: scan after — longest line into the new lane from A is 28 m; none reaches `CT_STREET`. Compare the two routes with the unchanged walker once compiled.

## 4. Longest straight sightlines in S01-A as drawn

Eye-to-eye, standing, sampled at 1–2 m. Coordinates are (x, y) with floor z where it differs.

| # | Endpoints | Length | Exposure | Flag | Keep? |
| --- | --- | --- | --- | --- | --- |
| 1 | `SPINE_W` (14.5, 22.5) – `SPINE_E` (83.5, 28) through `CANNON` | 69 m | full body | >35 m | No. Halve it (L8); the halves (43–47 m, `CANNON` to either spine end or `STEP_LO`) can stay as deliberate lanes. |
| 2 | `T_APRON` (51.5, 2.5) – `N_LANE` (48.5, 68, z 3.4) | 66 m | head-only, grazing the terrace guard | spawn, >35 m | No (L8, L4, L5). |
| 3 | `CANNON` (48.5, 24.5) – `CT_STREET` (51.5, 89.5, z 3.4) | 65 m | head-only, grazing | spawn, >35 m | No (same repairs). Marginal at voxel tolerance. |
| 4 | `PIGEON` (23, 44.5, z 6.8) – `B_MEZZ_N` (83.5, 68.5) | 65 m | head-only | >35 m | No; accidental (L3, L5). |
| 5 | `GALLERY` (29.5, 47.3) through `GW1` and `NL_E` – `B_MEZZ_N` (89.5, 69.5) | 64 m | gallery player's body visible | >35 m | No; accidental (L5, L7). |
| 6 | `ALAND` (6.1, 60) – `B_MEZZ_W` (70, 61.5), all at z 3.4 | 64 m | full body | site to site, >35 m | No (L1, L5, L7). Includes `A_COURT`–`B_MEZZ_W` 62 m, `A_COURT`–`NL_E` 57 m, `A_COURT`–`Y_REAR` 53 m. |
| 7 | `T_APRON` (47, 2.5) – `Y_REAR` (55, 62.5, z 3.4) | 61 m | terrace player sees full body; attacker sees head only | spawn, >35 m | No (L8). |
| 8 | `SCHOOL_ROOF` (26.8, 46.5, z 6.8) – `B_MEZZ_N` (80.5, 67.5) | 58 m | head-only | >35 m | No (L3, L5). |
| 9 | `T_APRON` (51.5, 2.5) – `Y_MID` (47.5, 53.5, z 1.7) | 51 m | full body | spawn, >35 m | No (L8). |
| 10 | `SPINE_E` (80.5, 25.5) – `B_FLOOR` (86, 69.5) through `KWONG` | 44 m | full body | into site, >35 m | Shorten to about 35 m (L6). |
| 11 | `SPINE_E` (67, 25.5) – `B_FLOOR` (71, 69.5) through `WING_S`, `E_WING`, `WING_N` | 44 m | full body | into site, >35 m | No; break with the partition (L6). |
| 12 | `SPINE_W` (14.5, 22.5) – `A_COURT` (18.5, 66.5, z 3.4) over `SL1` | 44 m | head-only over the stair crest | into site, >35 m | No (L2). |
| 13 | `KWONG` (83.5, 45.5) – `CT_STREET` (76, 88.5) through B and `NE_LANE` | 44 m | head-only | spawn, >35 m | No (L7). `B_FLOOR`–`CT_STREET` is 33 m. |
| 14 | `ARCADE` (29.5, 34) – `E_WING` (69.5, 35.5) across `Y_FRONT` | 40 m | full body | >35 m | Reduce: shift `WINGDOOR` to y 37–40 so the doors stop facing each other; the front court diagonal (about 32 m) can stay. |
| 15 | `Y_FRONT` (60.5, 31.5) – `NL_W` (32.5, 60.5, z 3.4) through the `SY1` slot and `GW2` | 40 m | head-only | >35 m | Incidental; recheck after L3/L4. |
| 16 | `STEP_HI` (14.5, 43.3) – `NW_LANE` (23, 81.5) across A | 39 m | full body | >35 m | No (L1, L9). |
| 17 | `SCHOOL_ROOF` (31, 38.5, z 6.8) – `Y_REAR` (61.5, 62.5) | 39 m | head-only | >35 m | Bound it to one 4 m parapet gap (L3). |
| 18 | `CT_STREET` (52, 89.5) – `Y_REAR` (47.5, 54.5) through `N_LANE` | 35 m | full body | spawn | No (L5). |
| 19 | `T_APRON` and `CT_STREET` end to end | 54 m each | full body | inside spawn | Harmless; both strips are bare. |

Lines 2, 3, 7 and 9 would also be affected by the undrawn pavilion and spirit screen, whatever form the author intends; until those have geometry the axis is open.

## 5. Coverage and what remains open

Covered: both sites and their approaches (L1, L2, L6, L7, L9), the yamen middle (L4, L5, L8), stair interfaces `SL1`, `SW1`/roof, `SB` and the wing steps (L2, L3, L7, L5), both spawn exits (L8, L9), and a whole-map sightline scan.

Not covered: crouched and moving-body exposure, `Y_FRONT` and `E_WING` as fights in their own right, `SY1` itself, timing in Counter-Strike speeds, utility, audio, and anything about B or C beyond their text descriptions (they have no drawings).

Dependencies: L4, L5 and L8 together close the axis; L1, L5 and L7 together close the upper band; L1 assumes L9's mouth position; L3's `GW2` support claim assumes L5's hall. L2 is independent. L3's `SW3` and L7's `SE` are the two changes I would treat as experiments to compare against retention.
