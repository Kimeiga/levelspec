# Dragon Ford R01 — strategy / player-behaviour review (compiled blockout; return review of L01 ST-01…ST-09)

Revision **R01**, `projects/dragon-ford/level.aml`, sha256 `19787b07…85f5a3` (matches `evidence/r01/source.sha256`). Independent of the author; no other R01 report was read.

**Stage verdict (this scope): accepted** at blockout evidence level. Both L01 blocking items are closed. No site was found unretakeable or undefendable. What remains are labelled risks and playtest questions (§6), one record correction (R-01) and one unresolved visual item passed to the spatial reviewer (R-09). No balance claims.

## 0. Method

- Order: packet; R01 plans and `layout-data.json` (diffed against L01); overviews 03–08; eye-level captures e07, e08, e09, e10, e11, e12, e15, e16, e20, e21, e23, e26, e31, e32; packet `verification.json` and `sightlines.txt`; my own runs. Only then `l01-disposition.md`.
- **Measured (M):** inspection-walker walks and optical rays on `level.aml`, from the packet and from my runs in `generated/dragon-ford/review-strategy-r01/` (`study.json` → `out/`, `study2.json` → `out2/`; walk IDs `R*`, ray IDs `H*/E*/T*/C*/A*/B*/G*`). Posture code as in L01: stand→stand, stand→crouch, crouch→stand, crouch→crouch.
- **Spawn spread (E):** I walked from the anchors only. Best/worst figures add the straight-line difference from each declared spawn to the route's first shared waypoint — (48, 9) for west/mid, (74.5, 6) for Kwong, (49.6, 86.7) for the Youth hall door. The apron and frontage are open there, so this is a small plan estimate on top of a measured walk.
- **Time (assumption):** metres / 5.4 m/s (brief's rifle figure). Ratios and leads in metres do not depend on it.
- Rays are point samples. No utility, audio, penetration, body-blocking or play evidence exists.

## 1. First contacts, best and worst declared spawns

Spawn offsets (E): T west/mid T4 −2.9 m, T3 +5.3 m; T to Kwong T3 −4.9 m, T2 +5.1 m; CT via Youth door CT3 −2.5 m, CT2 +4.5 m.

| Place | Anchor walk (m) | Best – worst (m) | Best – worst @5.4 |
| --- | --- | --- | --- |
| T → hall steps top (R2) | 46.6 | 43.7 – 51.9 | 8.1 – 9.6 s |
| CT → terrace west (J-CT-mid) | 41.9 | 39.4 – 46.4 | 7.3 – 8.6 s |
| T → gallery, crest of `SW2` (R1) | 51.7 | 48.8 – 57.0 | 9.0 – 10.6 s |
| CT → `BACKDOOR` (R13) / `SW2` head (R4) | 39.8 / 54.7 | 37.3 – 44.3 / 52.2 – 59.2 | 6.9 – 8.2 / 9.7 – 11.0 s |
| T → `EL_LOW` (R3a) / `SLE2` top (R3b) | 57.5 / 71.4 | 54.6 – 62.8 / 68.5 – 76.7 | 10.1 – 11.6 / 12.7 – 14.2 s |
| CT → East lane top north (R5a) | 35.0 | 32.5 – 39.5 | 6.0 – 7.3 s |
| T → inside `A_EAST` (R1b) / SW mouth (R1c) | 72.2 / 77.3 | 69.3 – 77.5 / 74.4 – 82.6 | 12.8 – 14.4 / 13.8 – 15.3 s |
| CT → inside `A_EAST` via mid (R4b) | 55.9 | 53.4 – 60.4 | 9.9 – 11.2 s |
| CT → A north mouth via hub (R5c) | 49.3 | 46.8 – 53.8 | 8.7 – 10.0 s |
| T → `FB_ST` (R3d) / foundry mouth (R3f) / inside `FB_B` (R3e) | 55.5 / 74.1 / 74.7 | 50.6 – 60.6 / 69.2 – 79.2 / 69.8 – 79.8 | 9.4 – 11.2 / 12.8 – 14.7 / 12.9 – 14.8 s |
| CT → B mezzanine (R5b) | 57.0 | 54.5 – 61.5 | 10.1 – 11.4 s |
| T → B mezzanine via East lane + Coffin (R3c) | 102.9 | 100 – 108 | 18.5 – 20.0 s |
| CT → Fishball workshop down the East lane (R9) | 72.7 | 70 – 77 | 13.0 – 14.3 s |

Reading (H):
- **B:** the slowest defender is on the mezzanine (11.4 s) before the fastest attacker reaches either floor door (12.8 s). The L01 order flip is gone.
- **A:** the slowest defender is inside `A_EAST` (11.2 s) before the fastest attacker (12.8 s); defenders reach A's porch faster through mid (69 m) than through the Dentist (73–77 m).
- **Gallery:** spawn-dependent tie. Defenders enter the north door 0.8–3.7 s before attackers crest `SW2`; attackers crest before defenders can reach the stair head in every pairing except worst-T against best-CT.
- **East lane:** defenders first by 3–5 s at the top; attackers own the workshop.
- **Mid:** attackers in the hall 8.1–9.6 s, defenders on the terrace 7.3–8.6 s.

## 2. Return of L01 items

| L01 item | R01 status | Evidence |
| --- | --- | --- |
| ST-01 spawn clusters (blocking) | **Closed** | Five spawns per team in `anchors`; §1. Four added journeys walk (packet). |
| ST-02 perch / catwalk (blocking) | **Closed** | `FB_ROOF`, `FBR_W`, `CATWALK`, `G_CAT` absent; `G_MS` spans the west arm (data; captures 04, 08). |
| ST-03 terrace cover | **Closed, residual noted (R-04)** | From `GW2` at the window only the west third is visible (T1a–h); from the `SLW2` top the stele hides the first 13 m (T3a, T3b); crouched targets behind the planters are hidden from the east end (T2a, T2c `Y-Y-`). Capture e10. |
| ST-04 / ST-09 records | **Closed, one figure wrong (R-01)** | Disposition records the hub and `LUNG_E` as intended. |
| ST-05 second defender door into A | **Deferred by author; accepted as playtest item** | Unchanged geometry; R10 flank now 104.7 m. |
| ST-06 A south-west watch | **Closed** | West gap north → SW mouth now `YYYY` at 12.3 m (A10; crates moved to the wall), retreat to the north mouth. `A_SW_BLOCK` NE corner also sees the mouth at 11 m (A2) but is open to `A_EAST` at 5.5 m (A3). |
| ST-07 B held from above | **Unchanged identity; coverage reduced (R-05)** | §3. |
| ST-08 gallery keystone | **Timing part resolved; remains a playtest question (R-03)** | §1. |

## 3. Findings on R01

Classification: **OD** observed defect, **DR** design risk, **IP** improvement proposal, **IT** intentional tradeoff, **UC** unavailable check.

### R-01 — Hub rotation is 113 m, not the recorded 101 m (OD, record only)

- Evidence: R6, A plant → Clinic → Youth hall north of `YOUTH_PART_W`, round `YOUTH_PART_E` → `YOUTH_E` → East yard → Coffin → mezzanine: **112.8 m / 20.9 s** (M). Terrace J-CT-rot 86.7 m / 16.1 s. Street ≈149 m / 27.5 s (R7 120.9 m from the north mouth + 28 m, E).
- Consequence (H): the exposed terrace now saves 26 m (4.8 s) instead of 16 m, so it is a real choice again — closer to the original intent. The cost: a lone defender without a kit going A → B by the hub has about 9 s left of a 40 s timer after a 10 s defuse, before any descent or fight.
- Action: correct the figure in `l01-disposition.md`; add the hub rotation to `journeys`.

### R-02 — Hub cut is now one-sided (IT, with risk)

- West: closed. From `WL_TOP` north the Clinic mouth is hidden (H1) and the north door is hidden from the Back yard (H3). What is visible from the terrace west end is only the south aisle behind `YOUTH_SW` (V-hub-strip `YYYY` 13.7 m; H2, H4), which the A↔B rotation does not use. Capture e31.
- East: intact and slightly cheaper. The `EL_TOP` crossing and East yard are visible from the `SLE2` top (H7–H9, 9–12.6 m) and now also from the terrace east end (H10, 8 m); `EL_TOP` north sees inside `YOUTH_E` (H12). The East yard no longer sees into the hall (H11).
- Consequence (H): an attacker on the East lane top isolates B from the hub while A stays connected; B's reinforcement is then the NE lane only (about 145 m from A, E). This favours "take the East lane, then hit B on two levels" as a plan. The price is real: defenders are at that stair top 3–5 s first, attackers arrive at 12.7–14.2 s, and the mezzanine prong lands at 18.5–20 s.
- Playtest question, no change requested: does the East lane become the default attacker opening?

### R-03 — Gallery remains the keystone (DR, playtest)

- Evidence: §1 timing; from deep inside the gallery a standing observer sees standing players on the terrace's east half and `EL_TOP` at 29–38 m (G1b, c, d, f; scan: `GALLERY`↔`Y_STRIP` 243 pairs, ↔`EL_TOP` 269), the hall's east rear door at 27–30 m (C9, G2e) and `EL_MID` through `MID_E` at 31–35 m (C10, G2d). Crouched terrace targets are hidden (`Y-Y-`).
- Consequence (H): the room decides the terrace, the court and the School route for whoever wins a spawn-dependent 12 m fight at about 9 s. Both teams have two ways in and two ways out, so the loser is not trapped.
- Test: who holds the windows at 10 s across spawn pairings, and whether rounds are still open after the gallery is lost.

### R-04 — Terrace: standing exposure from the gallery interior persists (IT)

- Evidence: R-03 rays; planters are 1.25 m. The author records this as the intended window-to-terrace relation. Accepted: a terrace defender now has crouch cover every 6 m and a tall stele at the west stair.

### R-05 — B after the boiler, moulds and stair wall (IT; coverage verified)

- Upper coverage of the floor is now split, by rays from three positions:
  - West rail (80.4, 58.5): mouth, `FB_B`, plant centre all blocked (B1, B3, B4); only a standing head west of the boiler (B2 `Y---`). The west arm is a passage, not a hold.
  - North rail (88.3, 62.1): west of the boiler and plant centre `YY--` (B6, B8); east of the boiler and `FB_B` blocked (B5, B7).
  - Tongue (91.3, 58.0): `FB_B` interior, east of the boiler, plant SW `YY--` (B9–B11); foundry mouth blocked (V-tongue-mouth).
- The mouth doorway itself is unseen from above. The two attacker entries see each other (B13 `YYYY` 13.3 m) and the plant (B12, B14). Capture e20, e21, e23.
- Plant samples: under the tongue south (91.3, 56.8) is hidden from the west rail, tongue and NE rail; NW (85.6, 58.6) from the west rail, tongue and `FB_B`; south behind the moulds (86.5, 53.6) from east of the boiler and the NE rail. Each is seen by at least one off-site attacker angle and at least one upper position. The Coffin corner sees no plant sample (B16, B17).
- Reading (H): executes are easier to start than in L01 (two covered doorways, one upper front per side); the tongue is the defenders' key spot and has a 3 m retreat. Retakers must use the north rail and tongue to see anything, then descend. Three retake lines remain (two stairs, East lane → workshop at 72.7 m from spawn). Site identity is unchanged and still a playtest question (author's B-06).

### R-06 — Hall as a room: the court is entered through two watched doors (DR)

- Evidence: parapet → outside the west rear door `YY--` at 5 m, east door `YY--` at 14.6 m (C1, C2); `SY2b` top → east door `YYYY` 7.5 m (C17); `GW1` → east door 26.8 m (C9). Hall interior is hidden from the parapet (C4). The front court stays hidden from the terrace (V-strip-front, V-terrace-front-grid). Capture e07, e08.
- Consequence (H): the court is no longer a lateral for attackers. The court pivot (R8, 90.6 m) is the same length as the hidden front-court pivot (J-T-pivot, 90.9 m), so it is dominated. The hall's remaining job is a second approach to each side stair: east door → `MID_E` is a 2–3 m hop onto the East lane landing; west door → `SLW2` foot about 5 m.
- Not a defect: the Yamen still gives staging, the gate, and both side pincers. Watch in play whether the hall and court are simply skipped for the School stair and East lane.
- The roofed porches look onto the front court (C11, C13 `YY--`). Defenders reach them at 68 m (R11) against 47 m for attackers, so they are a late-round information post on the attackers' pivot, not an opening position.

### R-07 — East lane without an axis (IT, accepted)

- Evidence: `EL_TOP` north → `SLE1` blocked (E2, E3), → `SLE2` foot standing only (E1); `SLE1` foot ↔ `SLE2` top `YYYY` at 13 m (E7, E8); V-front-eltop blocked. Capture e26.
- The 24 m defender line is gone; the lane is fought at 13 m across the side-step. A defender who steps down to `EL_MID` sees the front court's east strip (E5 `YYYY` 14.3 m) at about the time attackers cross it.

### R-08 — Other adopted changes (accepted)

- **Youth partitions and 2.4 m back-yard door:** the hub is compartmented; an attacker entering by `YOUTH_SW` gets a 7 m aisle and nothing else (H5, H6). Defender exits are no longer watchable from one outside point. Cost: CT → terrace grew from 37.6 to 41.9 m.
- **Kwong Ming piers:** the street cannot be watched end to end (V-kwong-length, K1 blocked). About 1.5 m added. Makes a defender lurk in Kwong a close-range fight; no effect on timing order.
- **Lung Chun W turn / smaller Well Court:** Sai Shing route 88.8 m, unchanged in practice; no through-line to Cannon Court (V-well-cannon).
- **`A_SW_BLOCK`, bedded crates, Dentist partition:** see ST-06 above; the north mouth is now hidden from the Dentist's east half (A8).

### R-09 — Light patch beside the east stair in capture 08 (UC, for the spatial reviewer)

- `08-site-b-roofs-off.png` shows a background-coloured quad beside the foot of `SB2a` on the east wall line. I could not place a probe outside the envelope (rays S1–S4 failed placement) and my floor walk stopped at the wall as expected, so I cannot say whether it is a wall or floor gap or a roofs-off artefact. Needs a close capture before handoff.

### R-10 — Thin cross-map threads in the scan (DR, low)

- `EL_TOP`↔`S_LAND` 37 m (5 pairs) and `SW1`↔`Y_STRIP` 35 m (4 pairs): a terrace-east defender can glimpse the School landing through the west wing door. Information leak of a few sample pairs; note for the visibility reviewer, no change requested.

## 4. Scenarios re-run on R01 (H unless cited)

- **Defender default:** A east gap; A west gap north (now sees the SW mouth); gallery; East lane top; B tongue or north rail. Hub empty. All five have a covered retreat.
- **A execute:** unchanged in structure; the two arrivals still meet on the porch unseen by each other; a west-gap defender now contests the Sai Shing arrival at 12 m.
- **B execute:** §R-05. Third prong by Coffin at 18.5–20 s if the East lane is won.
- **Fakes:** A-east show then front-court pivot 90.9 m / 16.8 s, hidden from every upper defender position sampled; defenders answer by terrace 86.7 m / 16.1 s or hub 112.8 m / 20.9 s. Inner rotation J-T-rot 42 m unchanged and unseen.
- **Post-plant A:** as L01; retake by the two cella gaps, `A_EAST` if mid is free, or the half-level flank (R10, 104.7 m / 19.4 s). ST-05 stays in the queue.
- **Post-plant B:** three off-site attacker angles; under-tongue plant is watchable from above only at the north rail.
- **5 attackers v 3 defenders:** one attacker on the East lane top splits B from the rest (R-02); three defenders are better grouped A-side and retaking B.
- **3 attackers v 5 defenders:** defenders can take the hall and porches (68 m) to watch the front-court pivot; attackers keep Cannon Court and Lung Chun as an unseen reset.
- **1 defender, bomb at B, from A:** terrace 16 s leaves time; hub 21 s is marginal without a kit (R-01).
- **1 attacker with the bomb in the hall:** both rear doors are watched; the practical choices are back through the front court to either side.

## 5. Dominant strategies, dead space

- None demonstrated. Candidates to watch: East lane opening into a split B (R-02); the gallery fight every round (R-03).
- Under-used (H): B west rail as a hold; the inner court as a route (R-06); `PLASTICS` unchanged.

## 6. Open items carried to playtest (none blocking)

1. R-03 gallery: outcome across spawn pairings, and what the loser can still do.
2. R-02 East lane then B: frequency and counter.
3. R-06: is the hall/court used at all.
4. ST-05 / P-A2 second defender door into A, tested in a 3-attacker post-plant with the gallery lost.
5. B-06 / R-05: retake from above; utility needed to cover the tongue and north rail (engine).
6. Record: R-01 figure; R-09 capture.

Unavailable throughout: utility, audio (decides whether hub rotations are really hidden), penetration, continuous reachability, play or bot evidence.

---

# Return review — R02

Same reviewer, strategy / player behaviour only, limited to what changed. Source `level.aml` sha256 `6a521fac…962a3ef` (matches `evidence/r02/source.sha256`). My R01 acceptance stands for everything not listed.

**Verdict on R02: accepted.** No blocking item. Four additions to the playtest queue (end of section). No balance claims; behaviour statements are hypotheses (H).

## Method

- Data diff R01 → R02 and captures 08, e05, e20, e21 first; then `r01-disposition.md` and the two spatial "Return review — R02" sections for their measured counts. I read the disposition before finishing my own rays, so the B and front-court questions were framed by the author's and reviewers' figures; my rays below test them rather than rediscover them.
- Own run on `level.aml`: 3 walks and 924 ray pairs, `generated/dragon-ford/review-strategy-r02/` (`study.json`, `out/verification.json`). View IDs are `group|observer|target`; posture code as before. Coordinates of the named sample points are in `study.json`.
- Times at 5.4 m/s (assumption). Rays are point samples; where a spatial reviewer's full-grid count is quoted it is marked (S).

## 1. Site B after the boiler extension

Measured:

- **Mouth corridor is blind both ways.** From the corridor (89.5, 45.0) and just inside (89.8, 47.2): no plant sample of seven, no stair, and no upper position sees them (`B|Hm|*`, `B|Hi|*`, `B|*|Hm`, `B|*|Hi` all `----`). Agrees with the sites count of 0 % (S).
- **The corridor has two exits.** West: the 2.0 m slot between `BOILER` and `MOULDS`; east: round the boiler's east end (Q3 walks, 13.3 m mouth → east plant edge). T spawn → south plant edge by the slot is 83.8 m (Q2).
- **Attacker positions that see the bomb are now inside the foundry:**

| Hold (sample) | Plant samples seen (of 7) | Stairs seen | Seen from above by |
| --- | --- | --- | --- |
| Boiler west end (85.4, 49.6) | 4 | `SB1` mid | north rail, tongue, Coffin corner; west rail head only |
| Slot exit (85.6, 52.1) | 7 (two head-only) | both feet, `SB1` mid | north rail, tongue; west rail and Coffin corner head only |
| Boiler east end (94.9, 48.6) | 5 | `SB2a` foot, `B_LAND` | north rail west, tongue, `SB1` head; Coffin corner head only |
| Inside `FB_B` (78.3, 52.6) | 5 | `SB1` foot and mid, `SB2a` foot | tongue only |
| `FB_B` threshold (77.2, 47.5) | 2 | `SB1` foot | north rail, tongue |
| Workshop (77.0, 44.5) | 0 | `SB1` mid | none |
| Under the west arm (80.3, 57.5) | 6 | both feet, `SB1` mid | north rail west, tongue |
| Under the north mezzanine (86.5, 61.0) | 6 | none | **none** |

- **From above:** north rail sees 5–6 plant samples; tongue 3; west rail 2–3; `SB1` head 3; NE rail and the Coffin corner none. The under-tongue sample (91.3, 56.8) is seen from above only by the north rail and only as a crouched target (`-Y--`), while five attacker holds see it.
- Every upper view is standing-observer only (`YY--`): a crouched defender behind a rail sees nothing below and is unseen.

Reading (H):

- **Execute:** safer to arrive, no easier to finish. Five attackers can stack unseen in a 7 × 2.5 m pocket two metres from the plant zone; leaving it means a 2 m slot watched by the north rail and tongue, or the east end watched by the tongue and north rail west. The plant itself at the south edge is in view of the north rail and tongue at 7–9 m. Two upper fronts to deal with, not four as in L01.
- **Post-plant:** the hold has moved from the doorways to peek positions 2–8 m inside. Not too hard to hold: each boiler-end position has full cover one step back, `FB_B` inside is exposed to the tongue only, and the floor under the north mezzanine sees six of seven plant samples and is seen by no upper sample. The under-tongue plant is the attackers' natural choice.
- **Retake:** not solvable from the rails alone. Retakers can see the boiler-end holds and most plants when standing, but not the under-mezzanine floor or a bomb under the tongue; both stair feet are watched by three to five attacker holds. They must come down, or flank through the East lane and workshop (72.7 m from spawn, R01). I do not find B "too easy to retake from above"; the risk runs slightly the other way for a bomb under the tongue with a player under the north mezzanine.
- `SB1_WALL`, `SB2_WALL`, taller `FURNACE_S`: the upper flights are sheltered; descents are exposed only on the lower halves, which is where the holds above look. `MEZZ_SCR_W` to the wall: Coffin arrival unchanged for strategy.
- R-05 stands with these corrections: the west rail now sees a little (two east plant samples and the east exit); the Coffin corner sees the west boiler end.

## 2. `EL_PIER` and R-02

Measured: front court east and `EL_LOW` → `SLE2` top, `EL_TOP`, East yard: all blocked (`E|fcE|*`, `E|ELl|*`); agrees with 0 of 255 cells (S). `SLE1` top → `SLE2` top blocked; `EL_TOP` north → landing east side `Y-Y-` only; `MID_E` → both sides of the landing `YYYY`. Front court east ↔ landing west side still `YYYY`. T → `SLE2` top is now 75.0 m (Q1; R01 71.4 m): 13.4–14.9 s across spawns.

- Correction to my R01 text: R01 still had front-court lines onto the hub crossing (37 % of `EL_TOP` cells (S)); my single rays missed them. They are closed now, so the hub's B leg is hidden from everything below the East lane top.
- R-02 is unchanged in kind: the cut still exists from the `SLE2` top and the terrace east end (geometry there is unchanged; not re-rayed). It costs attackers 3.6 m more, and the lane is now three separate short fights (flight, pier landing, flight) with no line longer than the landing. A defender at the `SLE2` top can no longer be engaged from the `SLE1` foot at 13 m; attackers are unseen until they are on the landing. The second approach to the landing through `MID_E` matters more (H).
- The East-lane-then-B plan remains available and remains a playtest question; R02 neither removes it nor makes it cheaper.

## 3. Yamen hall and R-06

Measured: parapet → outside both rear doors `YY--`, hall exits past the return walls hidden (`Y|P*|Wex`, `Eex`). `SLW2` top → inside the west door pocket `YYYY`; `SY2b` top → inside the east pocket and outside the east door `YYYY`. `GW1` → outside both doors `YY--`. `COURT_URN`: crouched north of it, hidden from the parapet but seen from `GW1`; crouched east, hidden from `GW1` but seen from the parapet; no side is hidden from both. J-T-mid 74.2 m.

- R-06 stands. The return walls make each rear door a dog-leg: attackers gain a covered pocket to stage in, defenders at the stair tops gain a line into that pocket, and the door-to-front-court lines are gone. The court is still crossed under the parapet and `GW1`; the urn is a one-direction stop, useful mainly against a single watcher.
- Porch parapet returns: no strategic change found; the porches remain a late-round information post.

## 4. Kwong piers

1.3 m gap beside `KW_PIER_W` (with the Plastics yard open alongside) and 1.9 m beside `KW_PIER_E`; packet walk J-TB-kwong passes at 89.3 m (R01 87.7 m, part of the difference is the boiler detour). Timing order at B is unaffected: fastest attacker at the mouth about 13 s against slowest defender on the mezzanine 11.4 s (E from R01 offsets). The 1.9 m gap is the one place five attackers going to B by Kwong must file through; the front-court route to `FB_B` (74.5 m) avoids it. Throughput and body blocking are unverified.

## 5. Residual long views into the front court

- Recorded (S): terrace → front court, 100 of 591 terrace cells see 11 % of the court, standing only, ≤ 32.6 m; gallery / West lane top → 11 front-court cells and the gate threshold, 17 observer cells, standing only, ≤ 40.1 m.
- My sample: 29 observers (17 terrace points on a 2 m grid, north and middle rows; 6 at the east end; 3 gallery; 4 West lane top — one further point failed placement) against 17 targets (the front-court pivot line at y ≈ 37–39 every 4 m, a southern line, the gate, the Cannon threshold, the hall steps foot): **0 visible pairs**. So the lines are narrow fans, not areas, and a 2 m sample does not find them.
- Consequence (H): they are information, not holds. A standing defender who knows the spot can glimpse a standing attacker at the gate at about the moment both arrive (≈ 6 s), or part of a front-court pivot. That qualifies my R01 statement that the pivot is "hidden from every upper position sampled": true of the samples, not of the whole terrace. It slightly weakens the front-court pivot's advantage over the court pivot (R-06) and gives defenders a repeatable "they went mid" read. Acceptable at this stage; goes to the queue.

## 6. Status of R01 items

R-01 corrected by the author. R-09 closed by the sites reviewer (plinth under `SB2b`; the remaining light wedge is outside play space). R-02, R-03, R-05, R-06 remain recorded tradeoffs / playtest questions as amended above. R-10 threads still present in the R02 scan (5, 4 and 2 pairs).

## 7. Additions to the playtest queue

1. **B post-plant:** bomb under the tongue with attackers under the north mezzanine and at the boiler ends — can a retake succeed without the workshop flank; and does the blind corridor behind the boiler become a utility trap for a stacked execute.
2. **East lane landing:** outcome of the close fight round `EL_PIER`, and whether `MID_E` becomes the preferred way onto it.
3. **Front-court glimpses:** how much rotation and opening information defenders actually take from the terrace and West-lane-top fans; whether a sniper holds the gate from there (engine).
4. **Kwong 1.9 m gap:** five-player throughput and trading through the chicane.
