# Dragon Ford R01 — compiled blockout review: spatial / visibility / construction (sites, climbs, defenders' side)

Independent reviewer; sections swapped from L01 (I reviewed the centre then). Revision **R01**, `projects/dragon-ford/level.aml`, sha256 `19787b07…5a4d85f5a3` (matches `evidence/r01/source.sha256`). Scope: Bombsite A and its three entrances; the west climb; Bombsite B and its ground entries; the east approach; the defenders' side.

**Stage verdict for these sections: CHANGES REQUIRED.** Two blocking items, both construction faults in the compiled model (N-01, N-02). All five L01 blocking items of this scope are closed or closed as specified; no repair opened a new spawn line.

## 1. Method

Order: packet → R01 plans, `layout-data.json`, captures `07`, `08`, `e18`, `e21`–`e24`, `e27`, `02`, `sightlines.txt` → my own studies on `level.aml` → then `l01-spatial-sites.md` and `l01-disposition.md`. No other R01 report read.

Studies (scripts and output in `generated/dragon-ford/review-sites-r01/`):

- All-pairs standing-eye rays, 1 m grid (4,230 points), every point of my sections against the whole map (`s1`).
- 0.5 m exposure studies per space pair, standing and crouch eye, head / chest / low targets (`q2`).
- Body-part exposure at 58 named positions: plant points, entries, rails, cover lees, spawns, hub doors (`q1`).
- Leader/follower on `SS1`, `SS2`, `SB1`, `SB2a`, `SB2b` (`stairs.txt`).
- Physical probes: floor continuity on a 0.25 m grid in all 27 spaces, edge-crossing rays along every mezzanine edge and stair side, headroom on three lines per stair, ceiling probes, compiled cover heights, walker runs through every door, screen and partition (`p1`–`p5`).

Limits: optical mesh rays and the eroded-navigation walker, not a capsule sweep; crouch is an eye offset; no bullets, utility, audio or play. Counts are grid cells, so gaps under 0.5 m can be missed. District coordinates use the layout frames: `E(u,v)` east, `W(u,v)` west, `N(u,v)` north.

Evidence tags: **[ray]**, **[walk]** (walker or physical probe), **[data]**.

## 2. Blocking items

### N-01 — observed defect: bottomless void under `SB2b`, open to the B floor; the flight's south side is an unguarded 1.7–3.4 m edge

- **Evidence [walk, ray].** Under the upper east flight, `E(7.2..10.6, 45.6..48)` (world x 92.75–96.25, y 56.5–59.25, about 8 m²), the z 0 floor is missing: 130 of 130 probed cells have no surface from z 0 down to −6. Clear height above z 0 is 1.55 m, so a crouched body (1.1 m) fits. The void has no wall on its west or south side: 153 crouch-eye and 166 standing-eye sample positions see into it; the walker stops at its rim at `E(6.84, 47.27)` and `(94.23, 56.33)` only because navigation ends there. It is the white patch at the stair foot in capture `08`.
- The floor profile keeps the L01 stair-footprint hole; the `SB2b` fill stops at the landing level (z 1.7) and `FURNACE_S` fills only the strip north of the flight (`v 48..48.9`).
- Same flight, south side: all ten treads are open with 1.9–3.5 m of air below the probe (floor at z 0), no guard or wall. The north side is closed by `FURNACE_S` and `G_T3`.
- **Consequence.** A player crouching under the stair, or pushed there, leaves the world. L01 B-01 ("fill the pit beside the east stair") is closed only for the strip north of the flight.
- **Repair.** Fill the flight to the ground: solid `E.r(7.2, 45.6, 10.6, 48.0)` from z 0 to the tread underside (or restore the z 0 floor and wall the cavity). Add a 1.05 m guard on the flight's south edge from `E(10.6, 45.6)` to `E(7.2, 45.6)` rising with the treads, or declare the edge an optional drop for engine verification. Re-run the floor probe.

### N-02 — observed defect: the CT frontage is a floating slab

- **Evidence [walk].** Downward rays from just under the `CT_STREET` slab at (60,89), (30,90) and (95,86) meet nothing for 12 m. The street lies north of the city-block envelope at z 3.4 with a 0.3 m slab, a 3.2 m fence on three sides and no plinth, wall or ground below. The z 1.7 platforms received plinths in R01; this deck did not.
- **Consequence.** A 76 × 8 m spawn deck hangs 3.1 m over empty space. Not visible from any play position, but it is an unsupported piece in a production blockout and will read wrongly in any exterior or art pass.
- **Repair.** Plinth extrusion under the `CT_STREET` polygon, z 0 to 3.1 (the frontage as a raised street on fill), with the fence standing on it.

## 3. Return review of L01 items in this scope

| Item | R01 result on the compiled geometry | Status |
| --- | --- | --- |
| **B-01** tongue edge, pit, pockets | `G_T3` holds: edge rays blocked for v 48..49, walker stops. Standing placement refused in the pit strip, west of the furnace and in the north slot. Under-stair void: see N-01. | Closed except N-01 |
| **B-02** boiler | From `B_TONGUE`: 0 cells of `KW_N` or `KW_JOG` at head or chest height (0.5 m grid). L01's two point lines (tongue → corridor back, east rail → jog) read 0 in all postures. Residual from the west half of the gallery: see R-B1. | Closed as specified |
| **B-03** Coffin screen | From `EL_TOP` only 21 mezzanine cells are visible, all in the arrival pocket (x 79–80.5), longest 18.6 m (was 153 cells, 36.9 m). `EAST_YARD` 18 pocket cells; `YOUTH` 6. West arm, tongue and floor: 0. | Closed |
| **B-04** supports | Four 0.4 m posts compile to the soffit (3.1 m); `FURNACE` (3.25 m) and `SB1_WALL` also carry the slab. Longest unsupported edge is the west arm's 8 m east side. Plausible. | Closed |
| **CT-01** hub see-through | Line 1 (gallery → street): 0 pairs from `GALLERY`, `WL_TOP`, `BACK_STEPS`. Line 2 (`EL_TOP` → street): 0. Line 3 (Dentist → East yard): 0; Dentist sees 3 hall cells. Line 4 (hall ↔ mezzanine): 1 pair. None of the five CT spawn points is seen from outside the street except from inside the Youth hall. | Closed |
| B-05 `MOULDS` | South lee: 0 visibility from the `B_MEZZ_N` rail and the west-arm rail in every posture; seen only from the floor west and 4 mouth cells. | Works |
| B-07 `SB1_WALL` | East side closed from run 2.0 m up. West side still open for 5.3 m of run (drop to 2.8 m into the undercroft). Wall is 0.16 m thick: see C-1. | Works; thin |
| A-01 crates | Elbow → tucked north of crates: 0 in all postures; walker stopped. | Closed |
| A-02 cella/screen slot | Walker stopped at (20.69, 59.13); NE corner → porch ray 0. | Closed |
| A-P1 `DENT_PART` | From the lot: 124 Dentist cells (47%, all x ≤ 23.5), 0 NW-lane, 0 Clinic cells (L01: 186 and 28). Arrivals east of the partition are unseen. Passage north of it 1.9 m, walker passes. | Works |
| E-01 chicane | `KWONG` longest internal line 20.6 m (was 31); `T_APRON` ← `KW_JOG` 0 cells (was 128). | Closed; see R-E1 |
| E-02 yard door, racks | `B_FLOOR` ← `RUBBISH`: 81 cells from 2 yard cells (was 297). `Y_FRONT` ← `FISHBALL` 0. Workshop ↔ site line remains: R-E2. | Mostly closed |
| CT-02 East-lane-top crossing | Still watched: 37% of `EL_TOP` cells (east strip x 65.5–67.5) from 109 front-court cells, to 36.2 m; 5 Coffin-mouth cells at 35.8 m. `V-front-eltop` samples one blocked pair. No duck object added. | Reduced, open |
| X-01 low cover | All crouch cover in scope compiles at 1.25 m. | Closed |
| R3 Lung Chun turn (my L01 item) | `WELL` ← `CANNON` 0 cells, ← `GATE` 0 (was 761 pairs, 40.9 m). | Closed |
| X-03 undeclared thresholds | Tooth joins, `PLASTICS`↔`KWONG`, `CLINIC`↔`YOUTH`, `CLINIC`↔`DENTIST` are still coincident edges with no aperture record. | Open (data) |

## 4. Section findings

### 4.1 Bombsite A

- **Entrances [ray].** SW arrival: seen by 125 lot cells, full body. East door: plant hidden behind `A_SCREEN` (0 in all postures); arrival seen from 69 lot cells and 19 gallery cells behind. North mouth: seen from 51 lot cells and 32 Dentist cells; plant hidden by the cella.
- **Plant zone [ray].** Crouched planter: 97% of cells seen from `SS_UP` (57 of its cells, the elbow and last 4 m of the diagonal, to 15.4 m); 0 from `SLOT_YARD`, `DENTIST`, `GALLERY`. Inside the lot 67% of cells see it. One open side (south-west), two blind arrivals. Intentional tradeoff as at L01.
- **Cover.** `INCENSE` (1.25): crouched on its north side, crouch eye seen from 2 of 7 `SS_UP` cells that see the head. `A_SW_BLOCK` north side: seen from 2 `SS_UP` cells and 6 Slot-yard cells; it does what its role says. `A_CRATES` bedded into the wall. Gaps: west 3.5, north 3.0, east 4.0 m; walker passes all three.
- **Longest lines.** `A_COURT` ↔ `SS_UP` 22.1 m; ↔ `SLOT_YARD` 20.1 m. `A_COURT` ← `Y_STRIP`: 16 east-gap cells at 22.8 m through `GW2`, `GAL_W` and `A_EAST` (thin).
- **R-A1 — design risk [ray].** `SLOT_YARD` ↔ `Y_HALL` 38.6 m (77 pairs), ↔ `Y_COURT` 35.5 m, ↔ `Y_STRIP` 34.5 m: the window-and-door thread through the school survives the staggering. A site-A defender in the yard sees the hall's east end. Thin; record or slide `GAL_W` further.
- No floating or thin pieces; `A_NORTH` and `A_EAST` have no lintel (open to sky, as drawn).

### 4.2 West climb

- **Geometry [walk].** `SS1` 3.5 m, `SS2` 3.0 m, rise 0.17 / going 0.34, minimum clear height 4.05 and 3.45 m, both sides walled. Void under `SS2` is fully enclosed (0 sample eyes). Walker passes the Lung Chun turn and both Tooth thresholds.
- **Leader/follower [ray].** `SS1` crest: Tooth shop 26 cells (followers at 4/5, mid, foot see 26/20/5), School landing 7 through the shop at 13 m (6/6/0), Sai Shing landing 29 (25/21/17). `SS2` crest: 49 `SS_UP` cells (16/14/13). Followers lose the diagonal lane but not the landing. Acceptable.
- **Crest line.** `SS_UP` (16.5,48.5) sees 41% of Well Court cells (23.6 m) and 19 Lung Chun cells at the turn (28.4 m) down both flights. Accepted at L01 (W-01); unchanged.
- **R-W1 — design risk [ray].** `LUNG_W` ↔ `CANNON` 38.5 m at 0.5 m sampling: (28,22) at the turn to (66.5,23.5) on the court's east side; 80% of Lung Chun cells are seen from 64% of Cannon Court cells. The packet scan (1 m) reports 34.1 m. Attackers' own lateral; matters only against a flanker at the turn. Record as intended or add one pier at about `W(24, 0.6)`.
- `SS_LAND`, `TOOTH`: declared `ceil 4.8`, compiled clear height 5.15 m (open to 6.85). Data/model mismatch, harmless.

### 4.3 Bombsite B

- **Ground entries [ray].**
  - Mouth, inside `E(7.25,33)`: seen by 28 west-arm cells (18 see the feet) at 21 m and 57 floor cells; hidden from mezz N east of the boiler and from the tongue.
  - Exit west of the boiler: mezz N 23 cells, west arm 21, tongue 7, floor 187. Exit east: mezz N 36, tongue 8, `B_LAND` 8.
  - Fishball door exit: mezz N 22 and tongue 8 (head and chest), floor 231.
- **Plant zone [ray].** Crouched planter, share of plant cells seen: mezz N 100%, west arm 95%, tongue 90%, `B_LAND` 78%, `SB2a` 93%. Also **`KW_N` 52% (to 21.9 m) and `FISHBALL` 46% (to 25.1 m)**: both ground entries watch about half the zone from outside the room. No plant cell is hidden from the whole gallery. Crouched defenders behind the 1.05 m guards see 0 plant cells from the west arm and tongue, 19 cells from mezz N through the unguarded `SB1` head.
- **Cover.** `CRUCIBLE` (1.25): a crouched player north of it is fully visible to a standing rail observer at 8.3 m; it works only against the floor. `MOULDS`: real lee (table above). Boiler lee north: seen by 34 mezz N cells.
- **Stairs [walk, ray].** All 0.17 / 0.34, 2.4 m wide, clear height ≥ 3.45 m.
  - `SB1` crest leader: floor 97 cells (followers 41/50/85), mezz N 73 (73/22/26), west arm 36 (36/7/2), `NE_LANE` 6 at 10.6 m past the west end of `MEZZ_SCR_N` (0/0/0).
  - `SB2b` mid-flight: head seen by 109 floor cells, chest by 99. L01 recorded this flight as sheltered from the plant; with its south side open it is not. The N-01 guard restores crouch cover.
  - Open stair sides: `SB1` west for 5.3 m of run (to 2.8 m), `SB1` east for the first 2.2 m, `SB2a` west for the whole flight (to 1.8 m). Walker stops at each. Declare as optional drops.
- **Guards [walk].** Edge-crossing rays every 0.25 m: `B_MEZZ_N` south edge open only at the `SB1` head and the tongue junction; west arm east and south edges closed; tongue closed except the `SB2b` arrival; `B_LAND` closed except its two stair heads.
- **R-B1 — design risk [ray]: the mouth corridor is still watched from the west half of the gallery.** `B_MEZZ_N` sees 63% of `KW_N` cells at head height (62% at chest) from 26% of its cells, to 29.7 m, and 13 `KW_JOG` cells at 30.6 m. `B_MEZZ_W` sees 37% of `KW_N` from 89% of its cells, to 24.6 m. Lines pass west of the boiler (west end at u 5.0, mouth jamb at u 5.5). L01 B-02 named the tongue and east rail, which are fixed; this is the same mechanism from the other side.
  - *Tested variant (`vB2-boiler-west.aml`):* `BOILER` extended west to `E.r(2.6, 36.5, 9.8, 38.5)` and `MOULDS` moved 1 m west to `E.r(-1.8, 37.6, 0.6, 39)`. Result: `KW_N` and `KW_JOG` ← `B_MEZZ_N` 0 cells; ← `SB1` 0; ← `B_MEZZ_W` 19% of corridor cells from 29% of arm cells, to 20.2 m. The exit west of the boiler is then seen by 7 west-arm cells only. The 2.0 m gap between boiler and racks accepts a standing placement. Cost: defenders lose the early read on the mouth from the north rail; the west arm keeps a reduced one.
- **R-B2 — observed, minor [walk].** 0.6 m slot between the north end of `MEZZ_SCR_W` (`v 53.4`) and the wall (`v 54`). The walker cannot pass; a 0.5 m engine body might. Extend the screen to the wall.
- **R-B3 — observed defect, minor [walk].** `FURNACE_S` top (z 3.25, 3.4 × 0.9 m, 3.6 m headroom) is a reachable ledge: the walker goes from the tongue over the top tread of `SB2b` onto it and stands at `E(7.9, 48.45)`, outside `G_T3` and against the mezzanine edge. It is an unplanned standing position with eye at 5.11 m beside the tongue. Raise `FURNACE_S` to at least 4.45 m (guard-top height) or to the ceiling as a flue.
- **Arrivals.** Coffin exit: seen from 17 `EL_TOP` cells down the lane, 0 from the floor. NE-lane exit: 0 from the plant. `NE_LANE` itself sees 78% of mezz N cells, 99% of the west arm, 81% of the tongue and 10% of the floor (31.3 m) past both ends of `MEZZ_SCR_N`; from `CT_STREET` only the 28-cell pocket. The mezzanine pocket sees 44 street cells at the east end (x 91–97, to 26.2 m), 40 m from the nearest spawn point.

### 4.4 East approach

- **Kwong Ming Street [ray, walk].** Chicane works for sight (E-01). Ceiling 3.45 m. `T_APRON` ↔ `KWONG` 39.6 m is the south mouth looking along the attackers' own apron.
- **R-E1 — design risk [data].** `KW_PIER_E` (`E(-0.3..2.2, 16..17)`) leaves one 1.45 m gap on the west side; `KW_PIER_W` leaves 1.45 m but the Plastics yard opens beside it. Every attacker bound for either B ground entry passes the 1.45 m gap single file (`FB_ST` is north of it). Shorten `KW_PIER_E` to end at u 0.3 (gap 2.05 m) and re-check `V-kwong-length`.
- **Plastics yard.** Behind `PL_CRATES`: seen only from 32 street cells. A 0.35 m sliver between crates and the east wall; no body fits. Push the crates to the wall.
- **Fishball workshop [ray, walk].** Walker passes both sides of `RACKS` and all three doors (lintels at +2.55).
- **R-E2 — design risk [ray].** `FISHBALL` ↔ `B_FLOOR` **36.2 m**, (71.5,33.5) to (84,67.5): 62% of workshop cells see 48% of B-floor cells through `FB_B`, passing west of the racks. From the mezzanine only 15 workshop cells at the door are visible. The staging room is hidden from above and open to the floor. If unwanted, move `RACKS` to `E.r(-8.2, 26.6, -5.4, 27.8)`.
- **Rubbish yard.** Sees 80% of workshop cells (15 m) and, in the centre scope, `Y_FRONT` to 36.4 m (669 pairs), `CANNON` 37.0 m, `LUNG_W` 39.8 m, `COLONNADE` 43.3 m (4 pairs): door threads through `EL_YARD` and `YGATE`. Passed to the centre reviewer.
- Jog: `KW_JOG` sees 13% of B-floor cells (32.0 m, east of the boiler to the north wall under the mezzanine).

### 4.5 Defenders' side

- **Spawns [ray].** CT, CT2–CT5: seen only from `CT_STREET` and from 11–70 Youth-hall cells through `YOUTH_N`. No attacker-route space sees the street except `NE_LANE`, `NW_LANE`, `DENTIST`, `CLINIC` and the mezzanine pocket.
- **Frontage.** Longest line 75.2 m end to end; `KIOSK_W`/`KIOSK_E` (2.6 m) do not shorten it. `NE_LANE` ↔ `CT_STREET` 69.1 m, 45% of street cells from the lane; `NW_LANE` ↔ `CT_STREET` 34.7 m. Accepted at L01 as a spawn street (CT-03); unchanged. A kiosk across the lane heads would cut both.
- **Youth hall [walk, ray].** Longest internal line 22.1 m. Doors: N 3.0, SW 2.4, E 2.2 m, lintels +2.55; Clinic mouth 2.6 m with no aperture record. South aisle 1.7 m wide behind `YOUTH_SW`; Clinic mouth opens into a 1.6 m pocket behind `YOUTH_PART_C`. Walker passes all four routes; the closed sides hold.
  - From the aisle a player sees 40 `Y_COURT` cells at 28.0 m down the West lane and `SLW2`. Reduced from L01 (95 pairs against 1,199); bounded.
  - `YOUTH` ← `EL_TOP`: 19 hall cells to 25.8 m through `YOUTH_E`. Bounded.
- **East yard and Coffin lane.** Crossing point (62.5,69.6): seen from all 59 `EL_TOP` cells, 19 terrace cells, 6 `EL_MID` cells. See CT-02 in the table.
- **Dentist, Clinic, NW lane.** Longest `CLINIC` ↔ `DENTIST` 20.4 m. Partition works (table). `DENTIST` ↔ `CT_STREET` 22.5 m through the NW lane.
- Headroom 3.45 m in all lanes and rooms.

## 5. Construction and plan-versus-model

- **C-1 — observed, minor.** `SB1_WALL` is 0.16 m thick, 4.5 m long, 4.45 m high, free-standing on the floor. The other 0.16 m elements are 1.05 m guards. Make it ≥ 0.3 m or build it as the stair's stringer wall.
- Spawn fences `F_T_*`, `F_C_*`: 0.24 m × 3.2 m. Acceptable as fences once N-02 gives the north one something to stand on.
- Floors: 0 unexplained gaps in 27 spaces apart from N-01. Compiled cover tops match declared heights (crossing rays 0.1 m below and above each top). `FURNACE` (3.25 m) runs 0.15 m into the mezzanine slab; fine.
- Declared `ceil 4.8` on `SS_LAND`, `TOOTH`, `B_LAND` against 5.15 m compiled.
- `checks.drops` reports one 0.75 m edge on `B_LAND` (closed by `FURNACE_S` in the model) and misses the `SB2b` side and the void: the check does not look at stair sides or under flights.

## 6. Unavailable or unperformed checks

- Studies stalled for a few minutes when another session's edit left `src/dressing/walls.ts` importing a missing export; they were re-run once the tree loaded again, against the same `level.aml` hash.
- `PINGPONG`, `STALL`, kiosks: heights confirmed, crouch exposure not rayed individually.
- Target-engine crouch, bullets through 0.16–0.4 m screens, utility, audio, fall behaviour on the open stair sides.
- Continuous collision; the 0.6 m and 0.35 m slots with a real engine body.

## 7. Required to accept these sections

1. **N-01** fill or floor the void under `SB2b` and guard (or declare) the flight's south edge; re-run the floor probe.
2. **N-02** support the `CT_STREET` deck.

Recommended in the same pass: C-1, R-B2, R-B3, R-E1. For written disposition: R-B1, R-E2, CT-02, R-A1, R-W1.

---

## Return review — R02

Same reviewer, same sections. Revision **R02**, `level.aml` sha256 `6a521fac…e9962a3ef` (matches `evidence/r02/source.sha256`), layout data `layout-r02/`. Geometry probed first (scripts and output in `generated/dragon-ford/review-sites-r02/`), then `r01-disposition.md` read. Everything accepted at R01 and not listed below is reused unchanged.

**Verdict for the sites sections on R02: ACCEPTED.** Both blocking items are closed, the changed interfaces behave as tested, and no new defect was found. Engine checks listed at R01 remain unperformed.

### Blocking items

| Item | R02 result | Status |
| --- | --- | --- |
| **N-01** void under `SB2b` | Upward rays from z −1 meet a base face under every sampled cell of all six half-level flights (`SLW2` 70, `SY2b` 42, `SLE2` 35, `SW2` 35, `SS2` 42, `SB2b` 35 cells; 0 open). No standing placement is accepted at z 0 inside any footprint. `SB2b` plinth: west face met at 1.40 m from `E(5.8, 46.8)` at z 0.2, 0.8 and 1.5, exactly where drawn; 1,400 rays from the open floor, the plant, the west-arm rail and the mezz N rail to interior points: 0 pass. `SB2_WALL` (`E(6.8..10.7, 45.3..45.75)`, 0.45 m thick) is solid from z 0 to 4.45; both flanks of the flight read closed at every tread. The white patch is gone from capture `08`. | Closed |
| **N-02** floating frontage | 609 of 609 street cells have a base face below; plinth faces solid on the north, west and east sides. Every other space above z 0 (including `NE_LANE`, `NW_LANE`, `EAST_YARD`, `BACK_STEPS`, `SLOT_YARD`, `A_COURT`) is supported at every 1 m cell. | Closed |

Method note: a first pass reported interior points under `SB2b` and `SLW2` as "seen". Every such observer was a grid point itself inside a solid (floor-grid points under the `B_LAND` plinth; terrace-edge points inside the mass parapet). No position in open air sees inside either plinth.

### Changed B interfaces

- **`BOILER` west to u 2.6, `MOULDS` moved (R-B1).** `KW_N` and `KW_JOG` ← `B_MEZZ_N`: 0 cells; ← `B_TONGUE` 0; ← `SB1` 0. ← `B_MEZZ_W`: 19% of corridor cells from 29% of arm cells, to 20.2 m. Matches the tested variant. Standing placement accepted in the 2.0 m gap between boiler and racks and in the 2.5 m passage south of the boiler; walker runs mouth → west of boiler → plant. `MOULDS` south lee still hidden from both rails. **Closed; the west-arm remainder is retained as recorded.**
- **`FURNACE_S` 4.6 m (R-B3).** No placement at z 3.25; the walker stops at the top tread and cannot step north. **Closed.**
- **`MEZZ_SCR_W` to the wall (R-B2).** Screen now `v 49.4..54.3`; the slot is gone; Coffin → south end of screen → mezz N walks. From `EL_TOP` the same 21 pocket cells as R01 (18.6 m). **Closed.**
- **`SB1_WALL` 0.3 m (C-1).** Compiled 0.3 m. **Closed.** The west flank and the lower flights stay open by the author's recorded intent: retained as recorded.
- **Kwong piers (R-E1).** `KW_PIER_W` `u -2.2..0.45` (1.3 m beside it, with the Plastics yard open alongside); `KW_PIER_E` `u 0.15..2.2`, leaving a 1.9 m gap on the west; 0.3 m overlap. Longest line inside the street still 20.6 m; `T_APRON` ← `KW_JOG` 0 cells; walker passes. **Closed.**
- **Plant zone B, crouched planter.** Unchanged from the gallery: mezz N 100%, west arm 95%, tongue 90% of plant cells. Changed from outside: `KW_N` 0% (was 52%), `FISHBALL` 25% (was 46%), `B_LAND` 56% (was 78%), `SB2b` 0%. No regression in exposure or clearance. Consequence to record for the strategy reviewer: attackers can no longer watch the planted bomb from the mouth corridor and see half as much from the workshop.
- `SB2b` mid-flight is now hidden from the floor (only gallery heads see it), which restores the sheltered quarter-turn L01 described.

### Site A dressing

- `TINHAU_POST_W/E`: 0.35 m square, 4.2 m, at `W(-5.5..-5.15, 31.3..31.65)` and `W(2.15..2.5, 31.3..31.65)`. Post E stands against `A_SCREEN`; post W on the cella's west line. 2.85 m clear between posts and cella, 7.3 m between posts. Standing placement accepted between the posts, between post W and the cella, and west of post W.
- Plant zone A, crouched planter: 96% of cells from `SS_UP` (57 cells, to 15.4 m; R01 97%); 0 from `SLOT_YARD`, `DENTIST`, `GALLERY`. Anchor exposure unchanged. **No regression.**
- Non-colliding, opaque dressing: `TINHAU_ROOF` and `TINHAU_RIDGE` start at z 7.6, above every eye in the lot. `TINHAU_DOOR` lies on the cella face. `TINHAU_BASE` is a 0.3 m skirt projecting 0.23 m; it can hide only feet within 0.23 m of the wall, where a 0.25 m body cannot stand anyway. Accepted. The other individually listed non-colliding props here (awnings, signs) sit at least 2.8 m above their floor; the contents of the `dressing` group were not inspected one by one.

### CT-02 with `EL_PIER`

`EL_TOP`, `EAST_YARD` and `COFFIN` ← `Y_FRONT`: **0 cells** (R01: 37% of `EL_TOP` to 36.2 m, 5 Coffin cells). ← `EL_LOW`: 5 lane-top cells at 14.7 m, nothing beyond. `EL_MID` still sees 91% of `EL_TOP` at up to 18.6 m, which is the landing's own fight. Placement accepted both sides of the pier; walker climbs `EL_LOW` → `SLE1` → round the pier → `SLE2` → `EL_TOP`. **Closed.**

### Regression checks

- `CT_STREET` ← `GALLERY`, `WL_TOP`, `EL_TOP`, `EAST_YARD`, `COFFIN`, `Y_STRIP`: 0 pairs. ← mezzanine pocket: 44 east-end cells, as R01.
- `B_FLOOR` ← `FISHBALL`: 43% of floor cells, 36.2 m (R-E2, retained as recorded).
- R02 scan lines above 35 m in these sections are the ones already recorded: frontage 74 m, `NE_LANE` ↔ street 68.5 m, `KWONG` ↔ `T_APRON` 39.6 m, Rubbish-yard door threads, `SLOT_YARD` ↔ `Y_HALL` 36.5 m (R-A1), workshop ↔ B floor (R-E2).

### Retained as recorded, open as data notes

- Retained by the author with reasons: R-E2, R-A1, R-W1, frontage length, open lower stair flanks, B-06.
- Data only, non-blocking: `checks.drops` still lists the `B_LAND` edge that `FURNACE_S` closes and does not test stair flanks; Tooth, Plastics and Clinic thresholds have no aperture records; `SS_LAND`, `TOOTH`, `B_LAND` declare `ceil 4.8` against 5.15 m compiled.
- Capture `08` still shows a light wedge outside B's east wall near the east stair. Rays from `B_LAND`, `SB2a`, the floor and the mezzanine meet the east wall at its drawn face (1.0–1.2 m) at every height tried, so it is not an opening into the site. Not identified; outside play space; passed to the architecture reviewer.

### Not checked

Target-engine crouch body, bullets, utility, audio, fall behaviour on the open stair flanks, continuous collision. Crouch exposure behind `PINGPONG`, `STALL` and the kiosks was again not rayed individually.
