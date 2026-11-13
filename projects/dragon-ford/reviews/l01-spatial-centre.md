# Dragon Ford L01 — spatial / visibility review, centre scope

Independent reviewer. Stage: developed layout, revision **L01** (`layout-l01/layout-data.json`, draft compile `tech/level-l01-draft.aml`, source sha `726e499a…`). Scope: T apron and exits, Cannon Court / Lung Chun W+E / Well Court, the Yamen compound, the Free School, and their interfaces (Tooth shop, Slot yard door, Rubbish yard door, Back yard / Youth SW opening, East yard). Includes construction, circulation and local-encounter proposals for these sections.

**Stage verdict for this scope: CHANGES REQUIRED.** Four blocking items (B1–B4, section 2). Walks, stair geometry, headroom and door clearances are sound; the failures are visibility through the compound's long axes and one unguarded edge.

## 1. How this was assessed

Order: brief → packet → both plans, five sections, `layout-data.json`, `verification.json` → my own rays on the draft compile → only then `s01-disposition.md` and `s02-interest.md`. No other L01 report was read.

Own studies (scripts and raw output in `generated/dragon-ford/review-centre/`):

- **All-pairs optical study** (`s1-long.mjs`): 1 m grid of standing positions in every space polygon (4,321 points, cover footprints +0.25 m excluded, three points per flight), standing eye 1.86 → standing eye 1.86, every centre-scope observer against every point on the map.
- **Exposure studies at 0.5 m** (`s2.mjs`) for the spawns, tunnel, Cannon Court and front court.
- **Body-part studies** (`s3.mjs`): target top 1.97 / eye 1.86 / chest 1.2 / crouch top 1.08 / crouch eye 1.023 / feet 0.1 at stair foot, mid, 4/5 and crest, behind each low cover, and at the gallery windows and doors. Leader/follower: of the cells that see the leader's head, how many the follower at each lower position can also see.
- **Physical probes** (`s7-phys.mjs`): inspection-walker attempts at edges, doors and slots; vertical clearance along every stair line (centre and both edges); ceiling probes.
- **Repair experiments** (`vA…vH*.aml`, copies of the draft with one change each, same rays).

Limits. Rays are optical segments on a draft compile, not the production blockout. A 1 m or 0.5 m grid can miss gaps narrower than the spacing, so "0 pairs" means none sampled. Crouch values are eye offsets only. Nothing here establishes bullets, utility, audio, body blocking, trades or timing in a target engine. The walker follows eroded navigation; it is not a continuous capsule sweep. Walk distances quoted are the packet's (3.4 m/s inspection speed).

Evidence classes used below: **[ray]** my rays on the draft compile; **[walk]** walker/probe; **[data]** read from `layout-data.json`/AML profiles; **[hyp]** drawing-level reasoning not yet tested.

## 2. Blocking items

### B1 — observed defect: T spawn apron and tunnel are seen from the hall, inner court and rear terrace over `RUIN_WALL`

- **Evidence [ray].** `RUIN_WALL` is 2.6 m high; the hall floor is +1.7 and the terrace +3.4, so lines from there clear it by 0.1–0.6 m, pass through `YGATE` (no lintel), the 6 m `SY1` opening, under the hall canopy and east of `SCREEN`.
  - `T_APRON` ↔ `Y_STRIP`: 1,812 pairs at 0.5 m, 111/1598 apron cells (x 44–48.5, y 2–9.5), longest **61.2 m** (60,61,3.4)↔(44,2,0).
  - `T_APRON` ↔ `Y_COURT`: 873 pairs, longest 53.4 m. `T_APRON` ↔ `Y_HALL`: 2,931 pairs, longest 48.8 m.
  - `GATE` tunnel ↔ `Y_STRIP`: 69% of tunnel cells, longest 54.9 m. `GATE` ↔ `Y_HALL`: 37%, 42.5 m.
  - Point check (45,4,0)→(60,60.5,3.4), 58.6 m: head and eye visible, chest not. It is a head-only line in both directions.
- **Why it matters.** `V-spawn` and `V-tunnel-gate` pass at their single points, but a standing T inside the apron can hold a head line onto the east end of the defenders' crossing and the `SY2b` crest from spawn, and a defender there sees heads in the apron and 69% of the tunnel. `RUIN_WALL`'s declared role ("screening the Yamen gate from the tunnel mouth") holds only for same-level observers.
- **Repair (tested, `vA-ruin34`).** Raise `RUIN_WALL` to 3.4 m (same footprint). Result: `T_APRON` and `GATE` ← `Y_HALL`/`Y_COURT`/`Y_STRIP` all 0 pairs. `CANNON` ← `Y_STRIP` keeps only the gate threshold strip (x 51–57, y 27–30, ≤35.3 m), which B2 removes.

### B2 — observed defect: the roofed hall does not hide the front court; the Yamen is see-through on both diagonals

- **Evidence [ray].** `Y_HALL` and `Y_COURT` share their whole north edge with no declared aperture, so the hall rear is open for 6.0 m west and 6.4 m east of the 7 m `SCREEN`. `SLW2` and `SY2b` stand directly behind those gaps.
  - `Y_FRONT` ← `Y_STRIP`: 33,818 pairs at 0.5 m; **57% of front-court cells** seen from 63% of terrace cells; longest 39.1 m (36,58,3.4)↔(65.5,32.5,0). Point check from the top of `SLW2` (37,56.5) to (64,34): head, chest and crouch eye visible at 35.3 m.
  - `Y_FRONT` ← `EL_TOP` 42.2 m, ← `EAST_YARD` 41.8 m, ← `COFFIN` 42.7 m (through the hall east gap and `SY2b`, as well as down the East lane).
  - `Y_FRONT` ← `GALLERY` 47.0 m: (28.5,59)→(67.5,33) through `GW2`, over `SLW2`, the hall west gap and the `SY1` opening.
  - `SY1` (all three sampled steps) ← 37 terrace cells (22.8 m) and 13 `EL_TOP` cells (29.9 m). `CANNON` ← `Y_STRIP` 14% of cells up to 47.4 m.
  - The author's `V-strip-front` and `V-steps-strip` are blocked exactly as recorded: they sample one point at the parapet centre, behind the screen. Even the parapet's middle third (x 46–54, 0.5 m grid) is not clean: 16 of 56 cells see a 12% strip of the court (x 51–57.5) at up to 24.9 m past the screen ends; none of them sees `SY1`. Over-the-roof lines (eye 5.26 against canopy top 5.1) are too flat to reach a 2 m body; every visible line passes under the canopy.
- **Why it matters.** Both declared predictions ("hall roof should hide the front court", "hall and screen should block") fail for the two terrace ends, which are where players arrive. Defenders reach the terrace at 38 m of walking; attackers reach `YGATE` at about 34 m. The gate, the whole east and centre of the court and the hall steps are therefore under 30–40 m fire from the terrace ends, East lane top and Coffin lane mouth before an attacker has cleared anything, with followers at the gate unable to see those positions.
- **Repair (tested, `vD-screen146`, with B1).** Lengthen `SCREEN` to 14.6 m: Yamen-frame rectangle (45.229,47.195) (59.833,48.473) (59.781,49.071) (45.177,47.793), height 3.1 to the canopy. This leaves end doors of about 2.4 m (west, against `HALL_W`) and 2.6 m (east). Result at 1 m: `Y_FRONT` ← `Y_COURT` 3 pairs (was 1,651); ← `GALLERY` 0 (was 56); ← `SLW2` 0; ← `SY2b` 1; `SY1` ← anything north 7 pairs (was 106); `CANNON` ← terrace/court 0. Remaining `Y_FRONT` ← `Y_STRIP`/`EL_TOP` lines are only the East lane axis (x 63–69, ≤35.9 m; see R2). The hall stays visible from terrace (42% of hall cells) and court (64%) through the end doors, so it is contestable, not sealed.
  - A 13.0 m screen (`vB-screen13`) clears terrace and court but leaves the 46 m gallery thread; 14.6 m is the tested minimum.
  - Also **declare** the `Y_HALL`↔`Y_COURT` apertures (S02 already asked; still undeclared at L01).
  - Walker passes the present west gap and must be re-run on the 2.4 m doors.

### B3 — observed defect: CT spawn street is visible from the gallery, West lane top and East lane top

- **Evidence [ray].** `BACK_STEPS`↔`YOUTH` is an undeclared 5.2 m full-height opening (x 37.5–42.7 at y≈70), aligned with `YOUTH_N` (3 m).
  - `CT_STREET` ← `GALLERY` interior: 1,048 pairs at 0.5 m, longest **49.5 m** (29.5,49)→(54,92), through `BACKDOOR`, `WL_TOP`, `BACK_STEPS`, the Youth hall and `YOUTH_N`; full body visible (point check 48.4 m).
  - `CT_STREET` ← `WL_TOP` 2,951 pairs, 43% of lane cells, 37.5 m. ← `BACK_STEPS` 79% of cells, 32.1 m.
  - `CT_STREET` ← `EL_TOP` 511 pairs, **40.1 m** (67,62)→(41.5,93), through `EAST_YARD`, `YOUTH_E`, the hall and `YOUTH_N`.
  - Seen street cells are x 41.5–57.5, y 85–93: the strip outside `YOUTH_N`. The CT anchor point itself (46.2,88.8) is not seen from any sampled cell of these spaces.
- **Why it matters.** `V-hub-strip` and `V-ct-youth` (expect null) were sampled blocked; the lanes exist one or two metres to the side. An attacker who takes the gallery or either lane top watches defenders leaving spawn through their main door from 32–50 m.
- **Repair (tested; the wall belongs to the north-hub reviewer's hall, the opening is this scope's interface).**
  - `vE-youthsw`: close the east 2.8 m of the opening (wall (39.9,69.85)–(42.75,69.7), leaving a 2.4 m door x 37.5–39.9). `CT_STREET` ← `GALLERY` 0, ← `WL_TOP` 0, ← `BACK_STEPS` 16 pairs. It does not touch R6 (`Y_COURT`→`YOUTH` stays 1,198 pairs).
  - `vE2`: door at the east end instead (x 40.3–42.7). Kills R6 (`Y_COURT`/`SLW2` → `YOUTH` 0) but leaves the spawn-street lines (153 and 58 pairs). So neither single door solves both; use the west door plus an offset inside the hall, to be chosen with the hub reviewer.
  - The `EL_TOP`→`YOUTH_E`→`YOUTH_N` line needs a hub-side answer (shift `YOUTH_E` or an interior baffle); untested here.

### B4 — observed defect: terrace edge along `SY2b` has no guard

- **Evidence [data, walk, ray].** `Y_STRIP` edge (58.995,53.921)→(58.699,57.308) borders the `SY2b` slot, whose treads run from z 1.7 to 3.4 below it. Storey-1 mass exists only on the stair's east side (`mass-1-4`); `G_STRIP` stops at (59.055,53.926). The west stair, by contrast, has `G_STRIP_W`. `checks.drops` lists only the B-site drop. The walker stops at the edge (58.50,55.48) because eroded navigation ends there, not because anything stands there; a ray from (57.5,55.2) sees a player's feet at the stair foot.
- **Consequence.** A 3.4 m long, 0–1.7 m undeclared drop at the junction of the defenders' crossing and the east flight. The brief requires any drop to be optional and flagged.
- **Repair.** Add guard `G_SY2B` from (58.995,53.921) to (58.70,57.31), 1.05 m, matching `G_STRIP_W`; or declare it as an optional drop and flag it for engine verification. Fix the drop check so stair-slot edges are tested.

## 3. Section findings

### 3.1 T spawn apron and exits

- **Accepted.** Apron 54 × 8 m, sheds `SHED_W`/`SHED_E` 2.6 m. `V-spawn` holds: no apron cell sees `CT_STREET` [ray]. Tunnel `GATE` 4 × 10 m, ceiling 3.45 [walk]. Cannon Court sees 21% of apron cells (x 40.5–56) through the tunnel, at most 29 m: expected for the attackers' own exit.
- **B1** above.
- **R5 — design risk: Kwong Ming south end is a 31 m straight tube visible from spawn [ray].** `T_APRON` ↔ `KWONG` 40.1 m, ↔ `KW_JOG` 38.7 m (134 apron cells x 71–76.5); `KWONG` internal 31.0 m; the kink at y 19.5 is 0.25 m. Width 3.0–3.5 m, the only side step is the Plastics yard. Defenders cannot be at `KW_JOG` early (≥90 m walk against 25 m), so this is a late-round and retake line, not a spawn kill. Repair for the east reviewer to weigh: a real offset of ≥2.5 m at the Plastics yard.
- **Two exits only** (4 m tunnel, 3 m street), 26 m apart [data]. Not a visibility defect; strategy reviewer's question.

### 3.2 Cannon Court, ruin, Lung Chun W/E, Well Court

- **Accepted.** `V-lung-through` and `V-lung-slit` hold; the court's own longest line is 25.1 m. `RUIN` leaves 2.15 m to the south wall; `RUIN_WALL` overlaps `YGATE` by 2.6 m west and 3.4 m east with a 3.3 m passage in front of the gate. From the hall only the gate strip of the court (x 51–57.5, y 27–30) is visible. `J-T-rot` passes [packet walk].
- **R3 — design risk: the Lung Chun W jog does not break diagonals [ray].** `WELL` ↔ `CANNON` **40.9 m**, 761 pairs at 1 m, full body, (17,31)↔(55,16). `GATE` ↔ `WELL` 34.9 m; `LUNG_W` ↔ `CANNON` 35.1 m. The jog offset (3 m) equals the corridor width, so any line 10–15° off the road axis threads it. Repair: offset ≥5 m, or lengthen the overlap leg at x 30–34 so the two reaches do not see each other's far end; re-ray from Well Court.
- **`STUMP_W`/`STUMP_E` (1.1 m) [ray].** Crouch eye hidden from the tunnel and Lung Chun E behind the correct face; crouch top shows to 28/40 tunnel cells behind `STUMP_W` north. Height equals crouch height exactly, zero margin. Raise to 1.2 m or confirm in engine.
- **`RUIN_WALL` north side:** a player in front of the gate is seen full-body from 27 hall cells and the three `SY1` steps (20.7 m). Intended gate contest; accepted.
- **Lung Chun E:** `CANNON` ↔ `LUNG_E` 33.1 m, ↔ `KWONG` 34.0 m, `GATE` ↔ `KWONG` 32.0 m (12 pairs through the 2.15 m gap south of the ruin). Under 35 m; noted, no change requested.

### 3.3 Yamen compound

**Gate and front court (`YGATE`, `Y_FRONT`, lions, cannon)**

- Entrant exposure [ray]: standing at the foot of `SY1` a player is seen from `Y_FRONT` 276 cells, `COLONNADE` 34 (24 m), hall 35, inner court 21, terrace 20 (23.6 m), `EL_TOP` 10 (31.2 m), `SY2b` 3. Threat directions span more than 180° (colonnade west, hall north, East lane and Rubbish yard east). B2 removes the north-high group.
- **R4 — design risk: the court is 32 × 9 m with one low cover and two long diagonal threads [ray].** `COLONNADE` ↔ `Y_FRONT` 39.7 m; `COLONNADE` ↔ `EL_LOW` 39.8 m; ↔ `RUBBISH` 44.0 m (6 pairs through `COL_E1` and `EL_YARD`); ↔ `FB_ROOF` 47.2 m and `CATWALK` 46.9 m (thin). `RUBBISH` sees 69% of court cells (37.9 m). The experimental perch sees 27% of court cells up to 41.1 m through `FBR_W` and `EL_YARD`; pass to the east reviewer as a cost of the perch.
- **`CANNON_GUN` 1.0 m — observed [ray]:** lower than crouch height. Crouched behind it (north side) the crouch eye is visible from 21 Cannon Court cells and 31 colonnade cells. It hides feet only. Raise to 1.2 m.
- **`LION_W`/`LION_E` 1.8 m — design risk (head-glitch) [ray, walk]:** in the 1.0 m slot south of `LION_W` a standing player shows top and eye but no chest to the hall (24 cells), inner court, terrace, `SY2b` and `EL_TOP` (40 m). Standing eye clears the plinth by 0.06 m. The walker passes both slots. Choose 2.1 m (full block) or ≤1.3 m (crouch cover).
- West half of the court has no cover between the colonnade portals and the gate.

**Hall steps, middle hall, screen, columns**

- `SY1`: rise 0.17, going 0.34, 26.6°, 6 m wide, headroom clear on three lines, walker passes both ways [walk]. It lies outside the canopy.
- Leader/follower on `SY1` [ray]: leader at the crest is seen by 70 hall cells (followers at 4/5, mid, foot see 52/42/35 of them), 49 inner-court cells (46/30/4), 20 gallery cells via `GW1`/`GW2` and the hall west gap (8/0/0), 8 terrace cells. The 6 m width allows two abreast. The gallery line on the crest (27.5 m) goes with B2.
- **Compiled hall vs label [data].** The "open front" is a solid wall (storey-0 and storey-1 mass, x 37.2–50.2 and 55.9–64.1) with one 6 m opening. Canopy z 4.8–5.1 over the whole hall; `SCREEN`, `HALL_W` and columns reach it. Probe: ceiling at +3.15 in the hall, open sky in the wing. Plan-0 draws this correctly; only the label misleads.
- **Columns — observed [data, walk]:** all four `HALL_COL*` stand 0.55 m off that front wall, none in the opening. The walker cannot be placed in the 0.55 m slots. They duplicate a wall structurally and leave pockets 0.05 m wider than the body. Engage them as pilasters or move them ≥1.0 m into the room (they could then give real cover at the `SY1` crest).
- Canopy support: north edge spans 6.0 m and 6.4 m between `HALL_W`, `SCREEN` and the east wall with no rear columns. Plausible as beams; the long screen in B2 supports it fully.

**West wing and inner court (`Y_COURT`)**

- Open-sky L-shaped court at +1.7 ("west wing" is not a building). Longest internal line 25.7 m. `LAND_E` 2.0 m wide, lintel at +2.55; `MID_E` 2.4 m; walker passes both.
- **R6 — design risk: Youth hall interior looks down the West lane into the wing [ray].** `Y_COURT` ↔ `YOUTH` **39.2 m**, 1,199 pairs, (37,43,1.7)↔(40,82,3.4). The `SLW2` crest is seen from 35 Youth cells at 26 m; followers on the flight see 33/32/27 of them. A defender 10–12 m from spawn holds the wing's north approach. See B3 for the two door options.
- `Y_COURT` ↔ `EL_MID` 31.6 m through `MID_E`: a level east–west line along the court. Accepted as the half-level lateral's cost.

**The two flights up (`SLW2`, `SY2b`)**

- Both: rise 0.17 / going 0.34, widths 5 m and 3 m, headroom clear, walker passes.
- `SLW2` leader at crest: terrace 167 cells (followers 166/165/42), wing 60, hall 45, Youth 35, `WL_TOP` 34, `EL_TOP` 22 (29.4 m; followers 20/19/0), gallery 20 via `GW2`/`BACKDOOR` (11/5/1). Good follower support except against the gallery.
- `SY2b` leader at crest: terrace 167 (159/151/67), hall 48, gallery 43 at 31.8 m along the strip (35/34/14), `EL_TOP` 36 (27/13/0), Coffin lane 5. The 3 m slot is single-file-plus; the foot follower loses the `EL_TOP` threat entirely.
- B4 applies to `SY2b`'s west side.

**Rear terrace, parapet, planter**

- Parapet `G_STRIP` 1.05 m [ray]: standing at it, head seen from 115 court cells and chest from 56; crouched, nothing is visible from the court or hall (crouch top 0 cells). Crouch top is nominally 0.05 m above the guard: engine check. Walker stops at `G_STRIP` and `G_STRIP_W`.
- **`PLANTER` — observed [ray]:** it runs parallel to the crossing. Crouched on its north side a player is still seen (crouch eye) from 152 of 167 terrace cells, all 23 `EL_TOP` cells and 22 gallery cells. Against the court and hall the parapet already does the work. It gives no cover against any end-on threat (`SLW2` crest, `SY2b` crest, `BACKDOOR`, `GW2`, `EL_TOP`). See P4.
- Terrace length line 31.4 m (`V-strip-length`, intended). `Y_STRIP` ↔ `GALLERY` 39.2 m and `EL_TOP` ↔ `GALLERY` 39.9 m through `GW1`/`GW2`: see 3.4.
- Clearances: planter to parapet 3.1 m, to rear wall 3.0 m; east and west parts 3.6 m deep.

**East lane (`EL_LOW`, `SLE1`, `EL_MID`, `SLE2`, `EL_TOP`)**

- My assignment lists an "East lane ladder": **L01 has none**. It is two straight 4 m flights with a 5 × 3.6 m landing; no ladder is required anywhere [data, walk].
- Geometry: rise 0.17 / going 0.34, walls both sides of both flights, headroom clear.
- **R2 — design risk: one straight tube from the front court to the lane top [ray].** `EL_LOW` ↔ `EL_TOP` 27.1 m with 96% of `EL_LOW` cells seen; `Y_FRONT` ↔ `EL_TOP` 35.9 m and ↔ `EAST_YARD` 38.8 m on the lane axis alone (values with B2's screen in place); `EL_TOP` ↔ `B_MEZZ_N` 35.9 m along Coffin lane (east reviewer). A climber is in view of the top for the whole 3.4 m rise with no cover. Followers see every lane-top threat the leader sees (58/58/58), so trades are possible, but there is nowhere to stop.
- `EL_MID` landing: the leader is seen by 51 inner-court cells through `MID_E` and 87 terrace cells; followers see 6/3/0 and 35/20/19 of them. Side-door crossfire on the landing; accepted as an intentional tradeoff if R2 is addressed.
- A single 2.0 × 0.8 m block on `EL_TOP` (`vF`) cut pairs by 27% but not the longest line: a prop is not enough.

### 3.4 Free School

- Geometry [data, walk]: `SW1` and `SW2` are 2.6 m wide, rise 0.17 / going 0.34, **in line** (centrelines 0.5 m apart) with a 6.0 × 2.6 m landing. Not a dog-leg. Headroom: open to z 6.85 above both flights; colonnade ceiling 3.45. `S_LAND` and `TOOTH` are declared `ceil 4.8` but compile open to 6.85: reconcile the data. The "colonnade" has no columns; it is an empty 6 × 9 m room with a 1.0 × 1.5 m pier between its two 2.5 m portals.
- **R1 — design risk (highest non-blocking): the school stair is a 39 m single-file axis with blind lateral threats [ray].**
  - Axis: `GALLERY` ↔ `LUNG_W` **39.5 m** (176 pairs), ↔ `SCHOOL_LANE` 37.5 m (every lane cell), ↔ `COLONNADE` 30.5 m. A defender on the gallery axis sees an attacker from the Lung Chun jog to the crest.
  - `SW1` crest: 22 inner-court cells through `LAND_E` and 6 Tooth-shop cells see the leader; followers see 5/0/0 and 2/0/0.
  - `SW2` crest: **136 terrace cells (to 36.8 m), 19 `EL_TOP` cells (37.5 m) and 34 court cells see the leader through `GW1`**, whose south jamb is 0.5 m past the top riser. Followers see 30/0/0, 0 and 0.
  - Timing [packet walks]: defenders reach the gallery by `BACKDOOR` at about 42 m; attackers reach the `SW2` crest at 54 m.
  - `vH` (fill the south 1.6 m of `GW1`): terrace cells seeing the crest fall 136 → 9, `EL_TOP` 19 → 0; the gallery keeps 78% of inner-court cells. `vG` (one 0.9 m pier on the axis in the colonnade): pairs −30%, longest line unchanged.
- **Gallery windows [ray].** Standing at `GW1`: terrace 139 cells (34 m), inner court 117, hall 30, `EL_MID` 15 (33.4 m), `EL_TOP` 20 (34.6 m). Standing at `GW2`: terrace 151 (33.4 m), court 59, hall 32. Crouched at either sill: hidden (crouch eye 0 cells; sill 1.1 against eye 1.023). Neither window sees the front court from the window position; only the deep diagonal in B2 does. Walker cannot cross the sill. They work as declared; reach of 33–35 m at the window and up to 39.9 m from deeper in the room is the price, accepted as an intentional tradeoff.
- **R7 — design risk: window-and-door thread across the gallery [ray].** `GAL_W` (y 54.2–56.5) overlaps `GW2` (y 52.8–54.9): `SLOT_YARD` ↔ `Y_HALL` 38.9 m (59 pairs), ↔ `Y_COURT` 37.1 m, ↔ `Y_STRIP` 34.0 m. A site-A defender in the Slot yard sees the hall's east end without entering the school. Slide `GAL_W` north to y 56.0–58.2, or accept and document.
- Doors: `GAL_W` 2.2 m, `BACKDOOR` 2.2 m, lintels at +2.55; walker passes both.

### 3.5 Interfaces

| Interface | Finding |
| --- | --- |
| Tooth shop | Walker passes `SS_LAND`→`TOOTH`→`S_LAND`. Both joins are still coincident edges (3.2 m, 2.2 m) with no aperture, lintel or wall thickness (S02 item, open). `WELL` ↔ `TOOTH` 21.3 m; `S_LAND` ↔ `SS_LAND` 14.8 m straight through the shop. |
| Slot yard door | `GAL_W` fine physically; R7. `GALLERY` ↔ `A_COURT` 19.1 m (128 pairs) through `GAL_W` and `A_EAST`. |
| Rubbish yard door | `EL_YARD` 2.6 m, walker passes. Yard sees 69% of the front court. South tip of the yard polygon (71.67,37.41) is an acute sliver under 0.5 m wide: square it off. |
| Back yard / Youth SW | B3, R6. Undeclared 5.2 m opening. |
| East yard | `YOUTH_E` 2.2 m, walker passes. `EAST_YARD` ↔ `DENTIST` 49.6 m and ↔ `B_MEZZ_N` 38.1 m [ray]: both lie in the other reviewer's sections; passed on. |

## 4. Improvement proposals (local encounters)

- **C-P1 — hall as a room with end doors (adopt with B2).** Before: an attacker on `SY1` is shot from the terrace ends and East lane top by players the gate group cannot see. After: `SY1` and the hall are a protected staging step; the fight moves to two 2.4–2.6 m doors watched from the parapet (4.6 m away, above) and from `SLW2`/`SY2b`. Attackers choose west door → wing → `SLW2` or east door → `SY2b`/`MID_E`; defenders hold the parapet or drop into the court. Cost: defenders lose early information on the front court. Tested optically (`vD`).
- **C-P2 — west-wing overlook onto the front court (experiment).** Replace the lost diagonals with one bounded, short, two-way view: a 2.5 m window, sill 1.1, through the front wall of the wing at about x 39–41.5 (Yamen frame), from the +1.7 wing floor down onto the court's west half and the colonnade portals. The wall is 3.4 m thick, so the cone is about ±20°. Reachable by attackers from `S_LAND` via `LAND_E` and by defenders via `SLW2`, so either side can own it. Risk: adds another angle onto the gate. [hyp] — needs rays.
- **C-P3 — school stair as a real turn.** Move `SW1` to the west side of `S_LAND` and `SW2` to the east (centrelines ≥2.9 m apart), widen both to ≥3.2 m, and start `GW1` ≥1.6 m north of the top riser (`vH` shows the window part works). Add two real piers in the colonnade. Expected: the 39.5 m axis ends at the landing wall and the crest gets a 1.6 m set-up zone. [hyp] for the stair move.
- **C-P4 — planters across the crossing, not along it.** Replace `PLANTER` with two 2.4 × 0.8 m planters, 1.2 m high, perpendicular to the strip and staggered: one against the parapet near x 46.5, one against the rear wall near x 53.5, each leaving ≥2.5 m to pass. Gives a crouch stop against each end. [hyp].
- **C-P5 — East lane chicane.** Two full-height returns on `EL_TOP`: 3.0 m from the east wall at y≈62.5 and 3.0 m from the west wall at y≈65.5, 2.0 m passages. Cuts lane-top views to the junction and slows the defender rotation by a few metres. [hyp]; the single block was insufficient.
- **C-P6 — front court furniture.** `CANNON_GUN` 1.2 m; lions 2.1 m or 1.3 m; one tall object (stele, about 1.2 × 1.2 × 2.3 m) near (43.5,35.5) so a colonnade exit has a first step.
- **C-P7 — Lung Chun jog** as in R3.

## 5. Intentional tradeoffs accepted

Standing exposure on the parapet crossing; `RUIN_WALL` as a gate screen (once raised); `MID_E` and `LAND_E` side doors on the landings; gallery windows with crouch-proof sills; the terrace's view into the inner court; Cannon Court's view of the apron through the tunnel.

## 6. Unavailable or unperformed checks

- Target-engine crouch body, bullets through 0.16 m guards and 0.6 m screens, utility, audio.
- Continuous capsule sweep; the `SY2b` edge as a real drop.
- Gaps narrower than the 0.5–1 m sampling; observers other than standing or crouch eye.
- Production blockout: everything here is the draft compile.
- Repairs C-P2 to C-P7 and the hub-side fix for the `EL_TOP` spawn line are untested.

## 7. Required to clear this scope

1. **B1** `RUIN_WALL` ≥3.4 m; re-ray apron and tunnel against hall, court, terrace.
2. **B2** enclose the hall rear (14.6 m screen or equivalent), declare the `Y_HALL`↔`Y_COURT` apertures; re-ray `Y_FRONT`, `SY1`, `CANNON` from terrace, `EL_TOP`, `EAST_YARD`, `COFFIN`, `GALLERY` over full grids, not single points.
3. **B3** declare and narrow the `BACK_STEPS`↔`YOUTH` opening and resolve the `EL_TOP`→`YOUTH_E`→`YOUTH_N` line with the hub reviewer; `CT_STREET` must show 0 sampled pairs from `GALLERY`, `WL_TOP`, `EL_TOP`.
4. **B4** guard or declare the `SY2b` west edge; fix the drop check.

R1 (school stair) needs a written disposition, revise or defend, before blockout. R2–R7 and C-P* are the author's to adopt, test or decline.
