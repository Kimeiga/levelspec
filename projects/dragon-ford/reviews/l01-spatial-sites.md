# L01 detailed layout review — spatial / visibility (sites, climbs, defenders' side)

Revision **L01** (`layout-l01/`, draft compile `tech/level-l01-draft.aml`, physical hash `0e8cba27…` — identical to the packet's `verification.json` in every run below). Independent reviewer; also local-encounter proposer for these sections. Not covered here: T spawn, Cannon Court, Yamen compound, Free School (another reviewer). Other reviewers' L01 reports were not read. Raw artifacts and my own rays were assessed first; `s01-disposition.md` and `s02-interest.md` were read afterwards (section 9).

## 0. Stage verdict for this scope: **changes required**

Blocking items (each has evidence and a focused repair below):

1. **B-01** Tongue east edge is an unguarded 3.4 m drop, and the pit / furnace slots beside it are standable hiding pockets.
2. **B-02** The boiler does not screen the foundry mouth or the Kwong jog from the tongue and the mezzanine rail (head lines of 19–31 m into the attackers' only staging space).
3. **CT-01** The Youth Centre hall is see-through in four directions: door-aligned lines of 40–59 m, three of them ending in the CT street within 3–9 m of the spawn anchor or on the defenders' only hub crossings. Repair, or record an explicit reason to keep each.
4. **B-03** `MEZZ_SCR_W` does not screen the Coffin lane arrival from East lane top (attacker-reachable); 153 mezzanine cells are visible past both ends of the screen.
5. **B-04** Mezzanine, west arm, tongue and catwalk have no drawn supports. Posts are gameplay masses on the plant floor and must be drawn before blockout.

Everything else is a design risk, proposal, tradeoff or cross-scope note and does not block. The Fishball roof perch stays **pending** a strategy decision; evidence for it is in E-03.

## 1. Method and evidence levels

- **Drawing**: plans, five sections, `layout-data.json`, `layout_l01.py` (district frames `Y`(38,30,+5°), `W`(12,26,−9°), `E`(76,14,−12°), `N`(24,86,−3°); coordinates below are frame `(u,v)` unless marked world).
- **Packet measurements**: `tech/verification.json` — 102/102 walks pass, 22 views. I did not re-run walks.
- **My compiled rays** (scripts under `generated/dragon-ford/review-sites/`): optical segments on the draft compile, standing eye 1.86 / crouch eye 1.023 to target head 1.86, chest 1.2, knee 0.5, feet 0.12, crouch head 1.023. Exposure maps on 0.5 m cells; cell validity = inside a space polygon at that level and a clear 0.25 m × 2.0 m capsule. Whole-map long-line scan: 4,092 cells at 1 m, 6.2 M pairs ≥ 28 m. Zone-to-zone counts at 0.5 m. What-if tests edit the AML in memory only.
- **Limits**: optical only (no weapons, penetration, utility, audio, trades). 0.5–1 m sampling misses thin gaps and tangent lines; counts are lower bounds. Stair sample points use a linear ramp height, so feet rays on flights are unreliable. The capsule test reports the interiors of some cover solids and filled stairs as free; those cells are unreachable and were ignored. Drops, fall behaviour, crouch body fit and CS speeds were not exercised. A concurrent edit under `src/dressing/` needed `--experimental-transform-types`; the compiled hash and 8,494 opaque faces were unchanged.

Classes: **OD** observed defect, **DR** design risk, **IP** improvement proposal, **IT** intentional tradeoff, **UC** unavailable check.

## 2. Bombsite B — Kwong Ming Foundry (E frame)

Geometry as compiled: floor u −8..13, v 34..54, ceiling 6.8. Mezzanine N v 49..54 (5 m deep, 21 m long), west arm u −8..−3.5 × v 41..49, tongue u 4.5..7.2 × v 45.6..49, catwalk u −8..−5.5 × v 31..41. Headroom under every slab 3.10 m; `FB_B` door 2.50; mouth corridor 3.40. All stairs rise 0.170 / going 0.340 (26.6°), minimum headroom 3.35 m.

### What the rays show

| Observer (standing unless noted) | Result |
| --- | --- |
| Mezz N rail, hugging (1, 49.4) | Whole floor south of v ≈ 47 full-body; plant centre full-body at 5.5 m. Legs only under the west arm and catwalk; nothing under mezz N. Crouched: sees nothing, is seen by nothing on the floor. |
| Tongue (5.8, 46) | Almost the whole floor incl. under the catwalk; **heads and chests in the mouth corridor from v ≈ 31.7 back to v 26 and legs/chest in the jog (19–22 m)**. |
| West arm rail (−3.9, 45) | Floor east of SB1 and the **east undercroft** (v 49..54, u 1..8) full-body. |
| Catwalk (−5.9, 37) | Whole floor and undercroft; nothing directly below (the Fishball door exit is hidden at 3.7 m). |
| Coffin exit (−7.5, 51.5), NE lane exit (1.75, 53.6) | No floor cell visible, and neither is visible from any sampled floor position except a head-only line from the SB2a foot past the south end of `MEZZ_SCR_W` (21 m). Arrivals are screened **from the floor**. |
| Mouth inside (7.25, 33) | West arm, catwalk and SB1 crest (heads; full body in the SB1 gap); mezz N east of u −1 and the tongue hidden by the boiler. |
| Mouth exit W of boiler (4.4, 35.6) | Head-only defenders along 35 m of rail: catwalk (due west) → west arm → SB1 gap → mezz N u −1..4.5 → tongue. Sector ≈ 110° plus elevation. |
| Fishball door exit (−5.75, 34.6) | Mezz N u 0..7 and tongue (heads); catwalk and west arm hidden (directly overhead). |
| Behind `SACKS` / `CRUCIBLE`, crouched | Crouch head and chest visible from mezz N, west arm and tongue. These covers hide legs only against the mezzanine. |

Packet views `V-mezz-plant` and `V-mezz-mouth` read 0000 only because their observers stand 0.62 m back from the rail and, for the first, behind the tongue. At v 49.34–49.6 the plant centre is fully visible; do not read them as "plant hidden from the mezzanine".

**Plant zone** (u −1..7.2, v 40..47). Open part: watched from mezz N rail (to v ≈ 46.7), west arm, catwalk, tongue, whole floor, undercroft; hidden from inside both ground entries. Under-tongue strip (u 4.5..7.2, v 45.6..47): hidden from mezz N and from the tongue itself; visible from the west arm rail (10 m) and catwalk rail (14 m), all floor and undercroft. North of `CRUCIBLE` (4.6, 41.8): hidden from the whole south (both entries). That is a real three-way planting choice and should be kept.

**Stairs, leader and follower.**
- **SB1** (20 risers, one flight, 2.4 wide, both sides open below slab level): a body at foot, quarter, mid and three-quarter is visible head-to-knee from the mouth (13–19 m), mouth exit W, Fishball door, sacks, plant centre, under the tongue, the east undercroft and, at 4 m, from under the west arm through the open west flank. Support from above is complete (mezz N rail, west arm rail, tongue and crest all see the whole flight). A descending defender faces south with the undercroft behind.
- **SB2** (quarter turn): tongue arrival is hidden from mouth, plant and undercroft (head only from mouth exit W, door, sacks). SB2b mid is hidden from mouth, plant centre, under-tongue, undercroft mid; visible from the boiler's north face, sacks, door (19 m) and, at 5 m from below, from the slot west of the furnace (see B-01). `B_LAND` is visible from undercroft mid, sacks, door. SB2a is open to the plant and the boiler side. The turn does separate leader and follower from the mouth; it does not from the west floor.
- Defenders reach the floor only by these two flights; there is no drop edge by intent and no ground-level defender door.

### Findings

**B-01 (OD, blocking) — open tongue edge, pit and furnace slots.** The tongue's east edge is open for v 45.6..49: 45.6..48 is the SB2b arrival, **48..49 is a 1 m unguarded 3.4 m drop** (horizontal probes at +0.1 and +0.5 m pass; the layout's own `checks.drops` lists `{z 3.4, at world (93.1, 59.82), length 0.75}` and the packet does not mention it). Below it the floor forms standable pockets: the pit u 7.2..10.6 × v 48..49 between the filled SB2b flight and the mezzanine face, the 1 m passage west of `FURNACE` (u 7.2..8.2, v 49..54) and a 0.8 m dead-end slot north of it (v 53.2..54, 4.4 m long). Capsule fits standing in all three; east of the furnace (0.4 m) and south (0.5 m) do not fit. From (7.6, 51) an attacker sees SB2b mid-flight at 5 m. `FURNACE` is labelled "closes the dead strip" and does not. `B_LAND`'s north edge is also open to a 0.5 m × 1.7 m gap.
*Repair:* enlarge `FURNACE` to `E.r(7.2, 49, 13, 54)` (or 8.2..13 and a second mass 7.2..8.2); fill the pit by moving SB2b north to axis v 47.8 (flight v 46.6..49 against the mezzanine face) with `G_BL` moved to u 10.6, v 45.6..46.6, **or** keep the stair and add a solid plinth `E.r(7.2, 48, 10.6, 49)` to z 3.4 with a guard on its south edge; add a guard on the tongue east edge wherever it is not stair.

**B-02 (OD, blocking) — boiler too low and too narrow for the lines it is meant to cut.** `BOILER` is 3.0 m at v 36.5..38.5; tongue eye is 5.26 at v 46. Measured: tongue → corridor back (7.25, 27) head+chest at 19.4 m; tongue → jog (7.25, 24) chest/legs at 22.3 m; mezz N east rail (9, 49.4) → jog head+chest at 25.7 m; zone count `KW_JOG,KW_N → B_MEZZ_N` 287 cells, tongue 29/29, farthest 31.8 m. Attackers are seen from above before they reach the last corner of their approach, while the first 2.5 m inside the mouth is the only shadow.
*What-if (in-memory):* `BOILER` height 4.2 m removes every tongue line and cuts mezz N cells seen from jog+mouth from 287 to 163; the remainder pass the boiler's east side (boiler u 5.2..9.3 against corridor u 5.5..9).
*Repair:* boiler with flue to ≥ 4.2 m and footprint `E.r(5.0, 36.5, 9.8, 38.5)`; re-run the same zone query. Keep the 2.3 m gap between mouth and boiler.

**B-03 (OD, blocking with CT-01) — Coffin arrival is open to East lane top.** From `EL_TOP` (reachable by attackers up SLE1/SLE2 and from the rear terrace) 153 of ~470 mezz N + west-arm cells are visible down Coffin lane past both ends of `MEZZ_SCR_W` (screen v 50.2..53 against a mouth v 50..53, set 1.7 m in), farthest 36.9 m; from the East yard 77 cells; from the Youth hall 34 rail cells (see CT-01). *What-if:* screen `E.r(−6.3, 49.4, −5.9, 53.4)` leaves 20 cells (u −8..−6.6, i.e. the pocket behind the screen) and 18.4 m. *Repair:* that screen, or a 15° kink in Coffin lane's last 4 m.

**B-04 (OD, blocking for handoff) — unsupported slabs.** Mezz N is a 21 × 5 m slab, the west arm cantilevers 4.5 m, the tongue projects 3.4 m, the catwalk 2.5 m; none has a post, bracket or beam. Only `FURNACE` (3.1 m, exactly slab soffit) reads as support. *Repair:* draw 0.4–0.5 m posts now, e.g. at v 49: u −3.5, −1.1, 4.5, 7.2, 10.6; tongue tip (4.5, 45.6) and (7.2, 45.6); west arm east edge (−3.5, 41) and (−3.5, 45); catwalk bracket line at u −5.5. The tongue-tip posts stand in the plant zone and will be thin cover; re-run the plant-zone maps with them.

**B-05 (DR) — floor low cover does not work against the gallery.** `SACKS` 1.1 and `CRUCIBLE` 1.2 hide legs only from every mezzanine position; a crouched attacker behind either is head-and-chest visible from mezz N, west arm and tongue. Real shadows against the gallery are the boiler lee, the undercroft and directly under the catwalk / west arm. With defenders arriving about 30 m of travel earlier (packet walks 55 vs 86 m) and able to duck fully behind a 1.05 m guard along 35 m of rail, pre-plant B is a pit under a jack-in-the-box gallery. *Focused options:* (a) one tall mass on the west floor, e.g. a casting mould stack `E.r(−0.8, 37.6, 1.6, 39)` at 2.4 m replacing `SACKS`, giving a stand-up stop between the door and SB1; (b) raise `CRUCIBLE` to 1.3 m (see X-01). Predict: door → stack is 5 m exposed to tongue and mezz N; stack → undercroft 10 m exposed to tongue only if the west arm is unoccupied.

**B-06 (DR, for the strategy reviewer) — retake is from above only.** Both descents deliver defenders to v ≈ 42 facing south; attackers in the undercroft are invisible from mezz N and the tongue. The L-shape partly answers this: west arm and catwalk see the east undercroft, the tongue sees under the west arm, and SB2 is a sheltered descent. No change requested here; scenario test needed with 2 and 3 defenders alive.

**B-07 (IP) — SB1 east side guard.** A 1.05 m guard on SB1's open east side from v 44.5 to 49 would give a descending or climbing player crouch cover from the plant, mouth and east undercroft on the upper two thirds while leaving the foot open, and removes the walk-off (drop up to 3 m, UC for fall behaviour). Cost: weaker rail support onto the upper flight from the tongue. Not tested.

**B-08 (DR, minor) — legs-only slits.** Mezz N rail sees legs but not heads of players under the west arm / catwalk (u −8..−6, v 34..47); the Fishball door exit gets a feet-level sliver up the SB1 well to the stair head. One-way, low-value targets. Recheck at blockout once posts and B-07 exist.

## 3. East approach (E frame)

**E-01 (DR) — Kwong Ming Street is a bare 31 × 3.5 m tube.** From the jog corner (0, 24.2) every one of 364 street cells is visible, plus 128 T-apron cells (world x 71.3..76.3) at up to 38.4 m; the T anchor itself is not. Only `PLASTICS` (38 of its cells visible; the rest and the crates' lee hidden) and `FB_ST` break the run. Defenders cannot be there early (floor route), so this is a late-round and post-plant line. *Proposal:* a 0.9 m pier or stair-foot projection on the west wall at v 14..15.5 (opposite the yard's north end) so that v 6..19 becomes two hops; or keep and record as an intentional long lane.

**E-02 (DR) — door-aligned diagonals through the Rubbish yard and workshop.** `EL_YARD` (full height to sky), `FB_YARD` and `FB_B` line up closely enough that: Rubbish yard sees 724 front-court cells (36.8 m), 230 workshop cells and **297 B-floor cells** (33.3 m, through two doors); the workshop sees 705 B-floor cells and 4 NE-lane cells at 36.5 m; workshop interior ↔ B north wall is a straight 35.5 m. Thin, but they let an attacker watch the plant zone's north edge from inside the workshop and let a defender on the B floor watch the Rubbish yard door. *Repair if unwanted:* move `FB_YARD` 3 m south to `E.r(−9.1, 23.5, −8.5, 26)` so the two yard doors no longer face each other, then re-run `RUBBISH → B_FLOOR`.

**E-03 (evidence for the pending perch) — Fishball roof.** Parapet `FBR_W` is open above 1.1 m for v 23..30 (7 m, no head). Standing at it: 308 front-court cells (27 % of the court, u 0.1..28.3), 85 East-lane-foot cells, 29 E-landing cells, 48 rear-terrace cells (Y u 18.3..23, v 23.2..28.6), 41 colonnade cells, farthest **47.6 m**; only 10 Rubbish-yard cells (the parapet hides the yard below). Crouched: nothing in, nothing out. From its north end through the catwalk tunnel: 202 mezz N cells, 163 B-floor cells, 20 NE-lane cells (39.6 m). Access and exit are one 32 m straight (roof 9 + catwalk 10 + west arm 8 + mezz 5) seen end to end from mezz N. Spatial opinion: as drawn it is a head-only long-range nest over the attackers' mid approach, not a Rubbish-yard overlook. If kept, cut the parapet to about 2.5 m (`E.r(−9.1, 26, −8.5, 28.5)`) aimed at the East lane foot and re-measure; the front-court view exists because `EL_YARD` is an open slot rather than a door with a head.

**E-04 (IT) — the jog.** Two right angles in 18 m, blocks street → B (packet `V-kwong-B`), body fits everywhere, boiler 2.3 m inside the mouth with 3.7 m east and 13 m west of it. Good, subject to B-02.

## 4. Bombsite A — Tin Hau lot (W frame)

Lot u −9..6.5 × v 26..44; cella u −5.5..2.5 × v 34.5..41 (4.2 m); gaps W 3.5, N 3.0, E 4.0 m; south court 15.5 × 8.5 m.

- **SW elbow (−7.2, 25.6)**: whole south court, plant porch full-body at 8.3 m, the west gap east of the crates to the north wall (18.3 m). From 0.9 m further in (v 26.5) the Sai Shing diagonal is already hidden by the lot's south-wall corner, so the elbow is a true peek corner for a defender.
- **East door sill (6.8, 33.6)**: east strip to both end walls and a wedge of the south court; plant porch fully hidden by `A_SCREEN` (agrees with `V-A-east-plant`).
- **North mouth (−1.5, 43.4)**: north strip only. NW corner: west gap to the elbow and 4 m into the diagonal (20.4 m). NE corner: east strip (16.9 m) and a slit, see A-02.
- **Plant centre**: sees and is seen by the whole south court, the elbow and the first metres of `SS_UP`; hidden from north mouth, both north corners and the east door.
- A planted bomb is watchable from the elbow / diagonal, the court, `S of screen`, and by defenders only after they pass a cella corner. Retake entries: north mouth (then W or E gap) and the Slot yard door.

**A-01 (OD, minor) — sight slit behind `A_CRATES`.** Crates stand 0.4 m off the west wall. A body cannot enter (capsule blocked) but the ray from the elbow's west wall (−8.75, 25.8) to a player tucked north of the crates (−8.72, 33.2) is full-body both ways at 7.4 m. *Repair:* `W.r(−9, 30.5, −7.6, 32.5)`.

**A-02 (DR) — 1.1 m slot between cella and `A_SCREEN`.** The screen (u 3.6..4.1, v 31..36) overlaps the cella's east face by 1.5 m at 1.1 m clear. A capsule fits standing, so it is an unlabelled single-file route from the east gap to the porch, and from the NE corner it is a ≈ 9° slit onto the court along (2.4, 32.5) → (1.1, 27), touching the plant zone's east margin. *Decide:* close it (screen `W.r(2.5, 31, 3.0, 36)` against the cella corner) or make it a real 1.8 m passage (screen v 31..34.5).

**A-03 (DR) — one bare room feeds the defenders' only site door.** Both CT routes end in `DENTIST` (12.5 × 5.5 m, no cover) and leave by `A_NORTH` (3.3 m). From the lot 186 Dentist cells and 28 NW-lane cells are visible through the mouth. After a plant, attackers at the two north corners hold a crossfire on one door at < 9 m, and can see defenders arriving inside the shop before they reach any mass. *Proposal A-P1:* a tall partition in the shop, `N.r(−1.6, −14.5, −1.2, −11)` (dentist's screen / cabinet line, 2.3 m), so arrivals from Clinic and NW lane stage unseen east of it. Predict: Dentist cells visible from the lot drop to the western third. Cost: 3.9 m of extra clearing for attackers pushing through the shop. Not tested.

**A-04 (IT)** — porch exposure to the south court with `INCENSE` and `A_CRATES` as the only court cover, the 12–15 m coverless Sai Shing diagonal ending at the elbow, and the 18–20 m west-gap duel are coherent commitments. `INCENSE` gives no crouch shadow against a standing eye at the elbow (crouch head visible at 8.3 m); see X-01.

Thin lines out of A, recorded only: lot east strip (4.66, 34.06) → middle hall through `A_EAST`, `GAL_W` and a gallery window, 36.7 m, 11 hall cells; lot → gallery 115 cells. `V-A-B` blocked agrees.

## 5. West climb (W frame)

SS1 3.5 m wide, SS2 3.0 m wide, 4 m lateral offset on a 3.6 m deep landing; headroom ≥ 3.35 m; both flanks walled.

- A defender at the SS2 crest (4.5, 19.4) sees SS1's foot (12.8 m, head to knee), loses the climber on SS1 mid and crest, then sees the landing and all of SS2. From the bend (2, 21) only the crest; from the lot nothing. A climber is therefore exposed in three stages, and the follower at the SS1 foot can see the crest defender. Good.
- Zone counts: Well Court + Lung Chun W mouth see 38 `SS_UP` cells (u 1.4..5.1), farthest **24.3 m** from the tunnel mouth (13.75, 1.78); `SS_UP` sees 100 Well cells (east half). The dogleg does not break the diagonal for a defender standing on the crest; that position is itself exposed to the whole landing.
- `TOOTH` sees SS1's crest and the landing at 4–8 m and nothing of SS2: a real half-level flank. Its two thresholds are still open polygon edges (3.2 m and 2.2 m) with no declared head.

**W-01 (IT)** accepted as drawn. **W-02 (IP, optional):** a 1.2 m well-head in Well Court at about `W.r(7.2, 3.6, 8.6, 5)` to give the east half a duck against the 24 m crest line.

## 6. Defenders' side (N frame unless noted)

Spawn street 76 × 8 m; exits NW lane (3.5 m, 18 m from the anchor), `YOUTH_N` (3.0 m, 2–5 m from the anchor), NE lane (3.5 m, 46 m). No congestion for five bodies. Spawn-to-spawn blocked (packet).

**CT-01 (OD/DR, blocking as a set) — the hub is transparent.** `YOUTH` (22 × 12.5 m, two 0.6 m columns, a 1.0 m table) has four openings whose axes cross the room:

| Line | Measured | Why it matters |
| --- | --- | --- |
| Gallery (Y −6.7, 19.63, top of the School stair) → `BACKDOOR` → West lane top → Back yard → hall → `YOUTH_N` → CT street (N 28.9, 7.3) | **48.9 m**, full body both ways; 91 street cells (u 25.3..31.9) from gallery/West-lane/terrace/Back yard | Attacker route position sees into the spawn street 3–9 m from the anchor. |
| East lane top (Y 31.68, 29.26) → East yard → `YOUTH_E` → hall → `YOUTH_N` → CT street (N 17.4..24.8) | **39.9 m**, 35 cells straddling the anchor (the anchor point itself is not hit at 0.25 m sampling) | Attacker-reachable; spawn-adjacent. |
| Dentist west end (N −6.5, −9.4) → Clinic → hall → `YOUTH_E` → East yard (N 42.4, −14.8) | **49.2 m**, full body; 982 hall cells (nearly all) visible from Dentist+Clinic, 35 East-yard cells | One player in the Dentist watches every hub crossing. |
| Hall west wall (N 14.46, −9.37) → `YOUTH_E` → East yard → Coffin lane → mezz N rail (E 8.54, 49.33) | **58.7 m**, head+chest; 91 hall cells from mezz N / tongue | Whoever owns the B gallery sees into the hub. |

*What-if (in-memory, 0.5 m cells):* partition `N.r(32.3, −15, 32.7, −8.5)` full height (pass round its north end) + screen `N.r(15, −11.6, 21, −11.2)` 2.3 m + the B-03 screen → lines 1–3: **0 cells**; line 4: 7 hall cells at 24 m. Detour for `J-CT-B` ≈ 1.5 m. Alternatives: move `YOUTH_E` north to v −9..−6.8, or turn the table into a 2.3 m stacked-furniture mass. Re-run the long-line scan after whichever is chosen.

**CT-02 (DR) — the hub → B crossing is watched from the Yamen front court.** From `Y_FRONT`, `EL_LOW`, `EL_MID`: all 213 East-lane-top cells, 37 East-yard cells and 8 Coffin-mouth cells, farthest 42.3 m (Y 8.5, 0.5 → Coffin west end). `J-CT-B` crosses 4–5 m of that with no object in `EL_TOP` or `EAST_YARD`. A watched crossing may be intended; if so give it one duck, e.g. a 1.3 m stall at `Y.r(27.3, 30.5, 29.8, 31.3)`, or record it as deliberate.

**CT-03 (IT/DR)** — spawn street 75.4 m end to end with five columns and one 1.1 m stall; NE lane 19 × 3.5 m straight and fully visible from the street (69.6 m corner to corner) and from the mezzanine pocket north of `MEZZ_SCR_N` (160 street cells, u 66.5..73). From the street only that pocket (28 cells) is visible, so the NE arrival screen works toward the floor. Acceptable for a spawn; a bay or kink at the NE lane head would shorten both.

**CT-04 (note for the strategy reviewer)** — with `YOUTH_E` and the Clinic corridor the hub now gives defenders a fully hidden A ↔ B rotation (Dentist → Clinic → hall → East yard → Coffin, ≈ 80 m by plan), which the S01 disposition (T2/S8) said the hall would not provide.

## 7. Cross-cutting

**X-01 (DR) — "low" cover equals or undercuts crouch height.** `SACKS`, `INCENSE`, `STALL`, `PLANTER`, stumps are 1.1 m = crouch body height; `PINGPONG` and `CANNON_GUN` are 1.0 m, below the crouch eye (1.023). Against a standing eye at 7–8 m a crouched head top shows over 1.1 m (measured at `INCENSE`). Use 1.25–1.3 m where crouch cover is the intent and say so per object.

**X-02 (cross-scope, for the other reviewer) —** the 1 m scan found `T_APRON` (44.5, 2.5) ↔ rear terrace east end (60.0, 59.9): **59.5 m**, 91 pairs, through the Gate tunnel, over `RUIN_WALL`, through `YGATE` and the open hall east of the spirit screen; also Gate ↔ terrace 53 m, apron ↔ inner court 52 m, apron ↔ hall 46 m. `V-strip-front` tests one blocked pair only. Not assessed further here.

**X-03 (UC)** — `Tooth` thresholds, `BACK_STEPS` ↔ `YOUTH` (5.2 m) and `PLASTICS` ↔ `KWONG` (8 m) are still openings by coincident polygon edges with no head or jamb; wall thickness there cannot be judged. `checks.thin` is empty; the thinnest declared walls in scope are 0.6 m.

## 8. Checks not performed

Weapons, penetration, grenades, audio, trade timing, CS movement speeds; continuous capsule sweeps; falls from SB1/SB2 flanks and the tongue edge; crouch body collision; rays finer than 0.25 m; any view with the proposed repairs except the three what-ifs stated; walks (packet results reused); Yamen-side sections.

## 9. Author claims read afterwards

- S01 disposition "arrival screens to be detailed at L01": done for the floor (confirmed), not for East lane top (B-03).
- "Youth hall connects CT street to the west lane top only … no hidden A↔B bypass": superseded by L01 geometry (CT-04).
- S02/S03 review items in scope: `G_MS` no longer blocks the catwalk (walk passes); catwalk east edge guarded; the earlier 60 m A→B line stays blocked (`V-A-B`); the remaining open edge at B is B-01.

## 10. Proposal register (IDs for disposition)

| ID | Class | One line |
| --- | --- | --- |
| B-01 | OD blocking | Guard tongue east edge; fill pit and furnace slots. |
| B-02 | OD blocking | Boiler ≥ 4.2 m, `E.r(5.0, 36.5, 9.8, 38.5)`. |
| B-03 | OD blocking | `MEZZ_SCR_W` → `E.r(−6.3, 49.4, −5.9, 53.4)` or kink Coffin lane. |
| B-04 | OD blocking | Draw mezzanine / tongue / arm / catwalk posts. |
| CT-01 | OD/DR blocking | Two hub partitions (or door move); re-scan. |
| B-05 | DR | Tall stop on the west floor; crucible 1.3 m. |
| B-06 | DR | Scenario-test the from-above retake. |
| B-07 | IP | SB1 east guard v 44.5..49. |
| A-01 | OD minor | Crates flush to wall. |
| A-02 | DR | Close or open the cella/screen slot. |
| A-P1 | IP | Dentist partition. |
| E-01 | DR | Pier in Kwong Ming Street or record as intended. |
| E-02 | DR | Offset `FB_YARD`. |
| E-03 | pending | Perch: narrow parapet to 2.5 m or drop; strategy decision. |
| CT-02 | DR | Duck on the East-lane-top crossing or record. |
| X-01 | DR | Low cover 1.25–1.3 m where crouch cover is meant. |
| X-02 | cross-scope | 59.5 m apron ↔ terrace line. |
