# R01 compiled-blockout review — spatial / visibility / construction, centre scope

Revision **R01** (`level.aml`, sha256 `19787b07…`, compiled physical hash `db9d7082…` = the packet's `verification.json`). Swapped assignment: I reviewed the sites at L01; here I assess the T apron and exits, Cannon Court and Lung Chun W/E, the Yamen compound, the Free School and their interfaces, including the repairs designed by the L01 centre reviewer. No other R01 report was read. Order: packet → plans, section NS, captures `05`, `06`, `e01`, `e04`, `e05`, `e07`, `e09`, `e12`, `sightlines.txt`, layout data → my own studies → `l01-spatial-centre.md` and `l01-disposition.md`.

## 0. Stage verdict for these sections: **changes required** (two small blocking items)

1. **N1** Both porches open sideways onto the hall steps with no guard: an undeclared 0–1.7 m step-off on each side of `SY1`.
2. **N2** The open porch fronts re-open part of L01 B2 through the hall's end doors: front court and gate threshold are again visible from the gallery / West lane top (42.2 m, 38.3 m), the terrace (12 % of the court) and the inner court (35 %). Fix, or record each as retained with a reason; a tested partial fix is given.

L01 blocking items: **B1, B3, B4 closed; B2 closed for the hall steps and the high lines, partly re-opened by N2.** Everything else below is non-blocking.

## 1. Method and limits

Scripts and raw output: `generated/dragon-ford/review-centre-r01/` (same harness as my L01 review, pointed at `level.aml` and `layout-r01/layout-data.json`).

- Optical rays on the compiled mesh, standing eye 1.86 / crouch eye 1.023 to head 1.86, chest 1.2, knee 0.5, feet 0.12, crouch head 1.023.
- All-pairs scan, 1 m cells, pairs ≥ 28 m (the author's scan stops at 32 m). Zone counts and exposure maps at 0.5–1 m. Spawn study: every 0.5 m cell on the map against all ten spawn points.
- Capsule (0.25 × 2.0 and × 1.1) placement at doors, slots and gaps; vertical headroom probes; horizontal probes at edges, lintels and canopies; stair pitch/headroom audit.
- Three what-ifs compiled in memory only.
- Packet walks (106/106 pass) were reused, not re-run.
- Limits: optical only; 0.5–1 m sampling gives lower bounds and misses thin gaps; stair sample heights are linear, so feet rays on flights are unreliable; no weapons, utility, audio, falls, crouch collision or timing. Plain `node` needed `--experimental-transform-types` (another session is editing `src/`).

Classes: **OD** observed defect, **DR** design risk, **IP** improvement proposal, **IT** intentional tradeoff, **UC** unavailable check. Coordinates are Yamen frame `Y(u,v)` unless marked.

## 2. Return check of the L01 centre items

| L01 item | R01 result on compiled geometry | Status |
| --- | --- | --- |
| **B1** apron / tunnel seen over `RUIN_WALL` | Hall, porches, inner court, terrace, `EL_TOP`, `EL_MID`, gallery → `T_APRON` + `GATE`: **0 of 1,938 cells** from 2,118 observer cells. Wall is 3.4 m. | Closed |
| **B2** hall does not hide the front court | `SY1` foot, mid, crest and hall centre: not visible from terrace parapet, `SLW2` / `SY2b` crests, `GW1`. Terrace parapet → front court: 0. Hall rear closed to the canopy (probe at z 4.7 blocked; lintels bear on wall both ends). Residual lines through the end doors: see N2. | Closed for steps and parapet; **partly re-opened** |
| **B3** CT street seen from gallery / lane tops | Gallery, `WL_TOP`, `EL_TOP`, Back yard, terrace, inner court, East yard → `CT_STREET`: **0 of 2,137 cells**. No CT spawn point is seen from outside `YOUTH`, `NW_LANE`, `NE_LANE` (CT3 from 3 NE-lane cells at 42.6 m). | Closed |
| **B4** terrace edge at `SY2b` | `G_STRIP_E` blocks at +0.5 m, open above 1.05 m; edge audit finds no open terrace edge. | Closed |
| **R1** school stair axis and crest | Gallery → `LUNG_W` and `SCHOOL_LANE`: 0 (was 39.5 m). `SW2` crest not visible from terrace, `EL_TOP`, `BACKDOOR`; seen from gallery north (10.4 m), gallery west, `GAL_W` (9.1 m). School lane sees `SW1` foot-to-crest (17.7 m) and nothing past the landing. Flights 2.6 m, 3.0 m lateral offset, headroom 3.35 m. | Closed |
| **R2** East lane straight tube | No on-axis line (front-court axis sees `SLE1` only). A diagonal survives: `EL_LOW` → 68 of 207 `EL_TOP` cells, 27.1 m; front court SE strip (u 25.1..28.8) ↔ `EL_TOP` east half 76 cells and East yard, **36.4 m**; `SLE2` crest full-body from front court (26,4) at 21.4 m. The 2.6 m side-step is smaller than the lane is long. See N4. | Improved, not closed |
| **R3** Lung Chun W diagonals | `WELL` → `CANNON`, `GATE`: 0 cells (was 40.9 m). | Closed |
| **R4** front-court cover | `STELE` 2.3 m hides its east side from `COL_E1`; lion slots not visible from hall or porch; crouched north of `CANNON_GUN` hidden from `YGATE` (visible side-on from the arcade and from the porch above). | Closed |
| **R6** Youth hall into the west wing | `Y_COURT` → `YOUTH` 14 cells (was 1,199 pairs). | Closed |
| **R7** Slot yard thread | `SLOT_YARD` → `Y_HALL` 7 cells, 38.4 m (was 59 pairs); → `Y_COURT` 95 cells. Thin, still > 35 m. | Reduced; DR |
| Low cover, planters | All 1.25 m. Crouched east of `PLANTER_W`: hidden from `GW2`, `BACKDOOR`, `SLW2` crest. Crouched west of `PLANTER_E`: hidden from `EL_TOP` and `SY2b` crest. Crouched at the parapet: hidden from the inner court. | Closed |
| Hall columns in 0.55 m slots | Columns now on the front line; 1.9 m clear to `HALL_W`; capsule fits everywhere. | Closed |
| `S_LAND` declared ceil 4.8 | Compiled headroom 5.08 m (open to z 6.8). | Still unreconciled (minor) |

## 3. New findings on R01

**N1 (OD, blocking) — porch inner edges are open to the hall steps.** `PODIUM_W` edge u 13 and `PODIUM_E` edge u 19, v 9..12.4: horizontal probes at +0.3 and +0.9 m pass along the whole edge; the porch floor is +1.7 and `SY1`'s treads fall from 1.7 to 0 beside it. Each is a 3.4 m unguarded step-off of 0–1.7 m that `checks.drops` does not list. It is also what makes the porches flank the stair: a player on either porch sees a climber full-body at foot, mid and crest from 3.6–7.1 m, both sides, behind the crest. *Repair:* mass parapet returns `Y.r(12.84, 9.16, 13, 12.4)` and `Y.r(19, 9.16, 19.16, 12.4)`, or declare the two step-offs as optional drops and flag them for engine verification. With parapets the porch still sees the stair over 1.05 m (head and chest of a climber) and a crouched porch player is hidden from it; decide which is wanted.

**N2 (OD/DR, blocking until fixed or recorded) — end doors + open porch fronts re-open the Yamen diagonals.** At L01 the hall front compiled as a wall with one 6 m opening; R01 opens it to both porches along 20 m, so lines through the 2.1 m and 2.6 m rear doors now leave over the steps and porch parapets.

| Observer set | Front-court cells seen (of ~1,150) | Longest |
| --- | --- | --- |
| Gallery + `WL_TOP` (34 of 384 cells see) | 115, plus 7 gate-threshold cells in Cannon Court | **42.2 m** gallery Y(−6.32, 29.63) → court Y(24.11, 0.65); 38.3 m `WL_TOP` → Cannon Y(15.66, −2.72) |
| Terrace (56 of 591 cells see) | 138 (u 13.7..31.7) | 31.9 m |
| Inner court / west wing (243 of 543 cells see) | 406, plus 87 Cannon cells | 37.0 m from the `SLW2` foot corner |
| Gallery → hall interior | 20 hall cells, the hall's full length | 33.8 m |

These are standing lines (crouch-to-crouch 16 for the gallery set). The author's `V-terrace-front-grid` tests one blocked pair on the east. The disposition lists `GALLERY`↔`Y_FRONT` as a 2–15 pair thread; at 0.5 m it is 115 court cells.
*What-if (in memory):* door returns `Y.r(8.4, 14.2, 9.0, 16.5)` and `Y.r(22.8, 14.2, 23.4, 16.5)`, 3.1 m → inner court → front court **406 → 0** (84 gate-threshold cells remain, grazing over the porch parapet); terrace + gallery + `WL_TOP` 253 → 100 cells with the 38.3 m line still present. So returns fix the same-level view and not the high diagonal. *Repair options:* returns lengthened to v 13.4, or a spirit baffle in the wing 2 m north of the west door, or move the west door into `HALL_W`; then re-run `GALLERY,WL_TOP,Y_STRIP,Y_COURT → Y_FRONT,CANNON` on the full grid. If the door views from the inner court are wanted as the hall's contest, record that and fix only the gallery / lane-top line.

**N3 (OD, minor) — hall rear doors are 2.08 m clear** (probe; every other door is 2.48 m) against a 2.0 m body. The walker passes. If the low head was chosen to cut high lines, say so; otherwise 2.5 m, and re-check N2 afterwards because a taller door lengthens the terrace line.

**N4 (DR) — East lane diagonal.** As R2 above. *What-if:* one full-height pier on the landing, `Y.r(29.2, 18.7, 29.9, 19.5)`, leaves 2.2 m and 2.1 m passages and takes `Y_FRONT + EL_LOW → EL_TOP + EAST_YARD` to **0 cells**. Leader/follower as built: `EL_TOP` above `SLE2` sees the whole of `SLE2`, the landing and the `SLE1` foot (12.9 m); `EL_TOP` north and the Coffin mouth see `SLE2` head-and-chest only; the court side of `MID_E` sees the `SLE1` crest and landing at 3.7–5.9 m. Flights are 2.4 m between full-height walls: two bodies fit, nowhere to step aside.

**N5 (DR) — the porches are the strongest positions in the compound and belong to whoever holds the hall.** Standing at either parapet: 1,004 front-court cells (87 %), 153 Cannon cells, 147 arcade cells, the Lung Chun W mouth, to 34 m; crouched, 15 cells. From the court a standing porch player shows head only (head and chest at the parapet). They are dead-end pockets reached only through the hall. They do not over-close the front (the hall centre is visible from `YGATE` at 15.5 m through the stair gap and 98 % of hall + porch cells are seen from somewhere in the court / arcade / Cannon set); they open it (N2). Scenario question for strategy: attackers reach the hall first by the measured walks, so the porches mostly serve a defender retake or an attacker rear-guard.

**N6 (OD, construction, minor) — porch canopies have no support at the stair-side front corners.** Probes along the porch front edge (v 9.4) and the stair-side edge (u 12.9) at z 4.0 are clear from `PORCH_COL0` to the hall column: a 7 × 3.4 m slab carried on one outer column, the side wall and the hall column line, cantilevering 3.4 m at (13, 9) and (19, 9). Visible in capture `e04`. *Repair:* columns `Y.r(12.4, 9.05, 13, 9.76)` and `Y.r(19, 9.05, 19.6, 9.76)`; they would also give the stair foot a first cover against the porches. Lintels and the hall canopy bear on mass (probes at z 3.9 and 4.85 blocked).

**N7 (DR) — inner court has no object.** 26 × 4.6 m plus the wing, entirely visible from a standing parapet player (dead zone about 1 m at the wall foot; nothing visible when crouched). Each rear door opens 4–6 m from its stair foot (`SLW2` foot 6.1 m from the west door, `SY2b` foot 3.7 m from the east door), full-body both ways, and `MID_E` sees the whole court (26 m). Tight and legible; no change requested, but it is a commit-or-stay threshold with no stop.

**N8 (IT, recorded) — spawn exposure.** T, T2, T4 stand on the Gate tunnel's fan: seen from 55 / 286 / 340 Cannon Court cells (west third, to 25.2 m) and from the Lung Chun W mouth (to 19.8 m); T3 from 11 Kwong cells (20 m); T5 from the tunnel only. No spawn is seen from any defender-first space. Apron → Kwong 209 cells to the pier chicane; apron internal 53.6 m; `KWONG` ↔ apron 40.2 m (40 pairs). Fences 3.2 m, tunnel headroom 3.40 m.

**N9 (IT / DR, recorded long lines ≥ 35 m in scope).** Gallery ↔ terrace 38.9 m (540 pairs), ↔ `EL_TOP` 38.7 m, ↔ `EL_MID` 37.9 m: the intended window relation, now standing-only behind 1.1 m sills, with planters giving crouch stops. Arcade ↔ front court 38.8 m (1,394 pairs), ↔ `EL_LOW` 38.3 m, ↔ hall 35.5 m, ↔ porch E 33.8 m. `LUNG_W` → Cannon Court 36.7 m (the road's own reach). Door threads: arcade ↔ Rubbish yard 42.4 m (4 pairs), `LUNG_W` ↔ Rubbish 39.0 m (11), Rubbish ↔ front court 37.0 m (54), Cannon ↔ Rubbish 35.9 m (24), `EL_TOP` ↔ `SW1` 38.8 m (1). Cannon ↔ Kwong 33.4 m (38 pairs) passes the 2.1 m lane south of `RUIN`; `V-lung-slit` tests one blocked pair.

## 4. Other checks

- **Stairs.** All seven: rise 0.170, going 0.340, 26.6°. Headroom: `SY1` 3.05 m (under the canopy at the crest), `SW1`/`SW2` 3.35 m, others open. Both flanks walled on every flight.
- **`SLW2` / `SY2b` leader and follower.** Crest of `SLW2`: full body to stele north side (5.8 m), `BACKDOOR` (4.8 m), `GW2` (4.4 m), `WL_TOP` north (9.4 m), terrace mid and east end (25.6 m). Crest of `SY2b`: terrace east (3.8 m), `EL_TOP` (7.4 m), head-and-chest from stele, `BACKDOOR`, terrace mid. Followers at the foot are covered from the inner court side by door-side teammates (full-body lines both ways).
- **Terrace use.** Capsule passes north of `PLANTER_E` (1.0 m), south of `PLANTER_W` (0.84 m), round the stele. Standing line along the strip persists to 30–32 m (head and chest beyond a planter): intended.
- **Clearances.** Capsule fits standing at every door, portal and slot tested (hall doors, `MID_E`, `LAND_E`, `BACKDOOR`, `GAL_W`, `YOUTH_SW`, lion slot, ruin south lane, gate passage, column bays).
- **Plan versus model.** Porches, parapets, rear wall, lintels, planters, stele, side-stepped flights and staggered gallery openings all compile as drawn. Only the `S_LAND` ceiling differs from its declared value.
- **Interfaces.** Tooth shop not re-studied optically (walk reused). Slot yard: R7. Rubbish yard door: threads in N9. Back yard / `YOUTH_SW`: 2.4 m door, 56 Youth cells visible from gallery + lane top + terrace, ≤ 25.6 m. East yard: N4.

## 5. Not performed

Weapons, penetration, utility, audio, trades, timing; falls at N1; crouch collision; continuous capsule sweeps; rays finer than 0.5 m except the listed probes; any walk; repairs other than the three what-ifs.

## 6. Required to clear this scope

1. **N1** guard or declare the two porch / stair edges.
2. **N2** cut or explicitly retain the end-door diagonals; re-ray the four observer sets on the full grid and report cells and longest line, not single points.

Recommended in the same pass: N4 pier, N6 corner columns, N3 door head, `S_LAND` ceiling.

---

# Return review — R02

Same reviewer, centre sections only. Source `level.aml` sha256 `6a521fac…` (matches `evidence/r02/source.sha256`), compiled physical hash `e48911b3…` (= packet `verification.json`, 106/106 walks pass, reused). Geometry was probed first with the R01 studies (`generated/dragon-ford/review-centre-r02/`); `r01-disposition.md` was read afterwards. Scope limited to N1, N2, the changed interfaces and the full-grid re-ray; everything else accepted at R01 is reused. Limits unchanged: optical rays at 0.5 m cells, capsule placement, no weapons / utility / audio / falls / timing.

## Verdict for the centre sections on R02: **accepted**

No blocking item remains. Two residual line sets are retained as recorded below; one new minor note.

## Item status

| Item | R02 evidence | Status |
| --- | --- | --- |
| **N1** porch sides onto `SY1` | `G_POD_WR/ER`: probes porch → stair blocked at +0.5 m on both porches for v 9.5..12.2, open above 1.05 m. Corner columns `PORCH_COL_SW/SE` present (porch-front probe at z 4.0 now blocked). A climber at mid-flight shows head and chest to a standing porch player (6.5 m); a crouched porch player is hidden from the flight. | **Closed** |
| **N2** end-door lines, same level | `HALL_RET_W/E`: inner court + west wing → front court **0 cells** (was 406). 84 gate-threshold cells in Cannon Court remain on a line grazing the porch parapet, ≤ 29.6 m. | **Closed** |
| **N2** gallery / West lane top diagonal | 17 of 384 observer cells see 11 front-court cells (u 11.1..15.6, v 0.4..1.5) and 15 gate-threshold cells; longest **40.1 m** `WL_TOP` Y(0.42, 32.23) → Cannon Y(16.53, −4.3). Standing only (crouch-to-crouch 0). Was 115 + 7 cells, 42.2 m. | **Retained as recorded** (thin; author's disposition records it) |
| **N2** terrace → front court | 100 of 591 terrace cells see 126 front-court cells (11 %, u 6.5..31.7), longest 32.6 m; crouch-to-crouch 2. Not reduced from R01 (138 cells from 56): the 2.2 m door head admits flatter lines from the terrace's north side, which leave over the porch parapets and through the stair gap as head-level lines. Terrace parapet → `SY1` and hall centre stay hidden. Under 35 m, standing only. | **Open as a design risk, not blocking**: add it to the recorded residuals (the disposition names only the gallery / lane-top line) |
| N2 dependence on the roof | Identical counts with `HALL_ROOF` and `HALL_RIDGE` removed in memory: none of the above relies on the non-colliding slabs. | Confirmed |
| **N3** door clearance | Rear doors 2.19 m clear (probe), against 2.48 m elsewhere and a 2.0 m body. | **Closed** (adjusted; margin 0.19 m) |
| **N4** East lane diagonal | `EL_PIER`: front court + `EL_LOW` → `EL_TOP` + East yard **0 of 255 cells**. Capsule fits west (28, 19.1), east (31, 19.1), north and south of the pier. | **Closed** |
| **N6** canopy corners | Columns present, see N1. | **Closed** |
| **N7** `COURT_URN` | 1.25 m. Crouched north of it: hidden from the parapet above (2.8 m); crouched east: hidden from the west door's court side; crouched west: hidden from `MID_E` (15 m). 1.6 m passes north and south, capsule fits. | **Closed** |
| Rear-door passability | Capsule fits standing and crouched at both thresholds, in both door pockets, at the pocket exits and in the 1.2 m gaps between each return tip and its hall column; east of `HALL_RET_W` likewise. | Passes |
| Gallery → hall interior | 58 hall cells from gallery + lane top + terrace, longest 33.8 m (gallery → hall east end through the west door). Unchanged in kind. | Retained (R01 N2 table, < 35 m) |

## New note

**R02-1 (design risk, minor) — optical and collision disagree at the roofs.** `HALL_ROOF` / `HALL_RIDGE` are opaque to rays and non-colliding (a capsule placed at roof level is not blocked; ray through the slab is blocked). The eave overhangs the inner court by 0.5 m at z 5.1–5.35, about terrace eye height (5.26). No studied line depends on them (see above), but any later claim of cover from these slabs would be false for bullets and utility in an engine that honours the flag. Either keep them out of visibility arguments, as now, or make the eaves solid. Same applies to `TINHAU_ROOF` outside this scope.

No new sliver, overhang into a walked volume, or blocked route was found in the changed areas: headroom under the south eave 5.09 m, under the north eave 3.39 m, hall and porches 3.09 m; `SY1` edge beside the new returns passes the packet's stair-line walks.

## Not re-checked

Spawns, Cannon Court, Lung Chun, Free School, terrace cover and all R01 accepted items (unchanged geometry per the data diff, apart from the plinth rule under half-level flights, which I did not study). Weapons, utility, audio, falls, crouch collision, timing.
