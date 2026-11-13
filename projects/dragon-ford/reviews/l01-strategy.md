# Dragon Ford L01 — strategy / player-behaviour review

Scope: detailed-layout **strategy / player behaviour** review plus proactive macro proposals (territory and rotations, opposing plans and information). Revision **L01** (`layout-l01/`, AML sha256 `726e499a…85d6`). Independent of the author; no other L01 report was read.

**Stage verdict (this scope): changes required.** Two blocking items (ST-01, ST-02). The organization itself is sound for this scope: no site was found unretakeable or undefendable. Everything about utility, audio, penetration, spawn spread and actual play is unverified; nothing here is a balance claim.

## 0. Method and evidence levels

- Order of work: brief, packet, both plans, five sections, `layout-data.json`, `tech/verification.json`; first assessment written from those. Only then `s01-disposition.md` and `s02-interest.md` (first third read in full, the rest by keyword). Their statements are treated as claims.
- **Measured mechanic (M):** inspection-walker replays and optical eye-to-eye rays on the draft compile, from the packet's `verification.json` and from my own runs of `verify.mjs` (inputs and outputs in `generated/dragon-ford/review-strategy/`: `study.json`, `study2.json`, `study3.json`, `out*/verification.json`). Walk IDs `W*`, ray IDs `M*/N*/A*/B*` refer to those files. Ray posture code: observer→target as stand→stand, stand→crouch, crouch→stand, crouch→crouch (`YY--` = a standing observer sees standing and crouched targets; a crouched observer sees neither).
- **Plan estimate (E):** cumulative length along declared waypoints; typically 1–2 % under the measured walk.
- **Hypothesis (H):** predicted behaviour. Not observed.
- **Time conversion (assumption):** seconds = metres / 5.4 m/s, the brief's rifle-out figure. The harness walker uses 3.4 m/s. If the target engine uses real Source units (about 4.1–4.8 m/s) every figure grows 13–30 %; the *ratios* and leads in metres are unaffected. All times are from the single declared spawn anchors (see ST-01).
- Limits: rays are point samples between two eye positions, not sweeps; "blocked" for one pair does not prove a whole area hidden. No utility, audio, penetration, body blocking or play evidence exists.

## 1. Round-start timings and first contacts

| Team → place | Distance (m) | Time @5.4 | Source |
| --- | --- | --- | --- |
| T → Yamen gate `YGATE` | 34 | 6.3 s | E |
| T → top of hall steps `SY1` | 46 | 8.5 s | E |
| T → inner court behind the hall | 53–58 | 9.8–10.7 s | E |
| T → School gallery (top of `SW2`) | 53 | 9.8 s | E |
| T → foot of East lane `EL_LOW` | 54.9 | 10.2 s | M W2b |
| T → top of `SLE2` (East lane top) | 69.7 | 12.9 s | M W2a |
| T → terrace west via court / via gallery | 73.8 / 72.6 | 13.7 / 13.4 s | M J-T-mid, W7 |
| T → A east door `A_EAST` / SW mouth | 70 / 76 | 13.0 / 14.1 s | E |
| T → A plant (School / Sai Shing) | 83.2 / 88.7 | 15.4 / 16.4 s | M |
| T → Fishball street door `FB_ST` | 51–54 | 9.7 s | E |
| T → `FB_B` inside (Kwong / via front court + Rubbish yard) | 74 / 74.5 | 13.8 s | E / M W6 |
| T → foundry mouth (B wall line) | 72 | 13.3 s | E |
| T → B plant | 86.1 | 15.9 s | M |
| T → B mezzanine via East lane + Coffin lane | 98.8 | 18.3 s | M W2 |
| CT → East lane top north end | 33 | 6.1 s | E |
| CT → terrace west | 37.6 | 7.0 s | M |
| CT → gallery `BACKDOOR` / top of `SW2` | 42 / 53 | 7.8 / 9.8 s | E |
| CT → inside `A_EAST` via terrace, gallery, Slot yard | 57.1 | 10.6 s | M W4 |
| CT → A north mouth (outer / hub) | 46 / 49 | 8.5 / 9.1 s | E |
| CT → A plant (outer / hub) | 72.4 / 75.9 | 13.4 / 14.0 s | M |
| CT → B mezzanine / foot of `SB1` / plant | 55 / 63 / 71.9 | 10.2 / 11.7 / 13.3 s | E / E / M |
| CT → hall steps top through the court | 63.9 | 11.8 s | M W13 |
| CT → Fishball workshop down the East lane | 65.8 | 12.2 s | M W10 |
| CT → Fishball roof perch | 73.9 | 13.7 s | M W5 |

First contacts that follow (H, from the figures above):

- **Mid, Yamen:** attackers hold the roofed middle hall at 8.5 s; defenders are on the terrace parapet at about 7.4 s. The inner court is the no-man's-land. Rays agree with the intended asymmetry: parapet → court `YY--` (N15, N16), parapet → hall west bay `YY--` (M5e), parapet → hall steps top blocked (M5f), court and hall → terrace back and both stair tops blocked (M5a–d), front court hidden from the terrace (V-strip-front). Attackers stage unseen in the hall; defenders see the court but must stand to do so.
- **Gallery:** effectively a tie. Defenders enter by `BACKDOOR` about 2 s before attackers crest `SW2` at the other end of a 12 m room. Whoever is first at `SW2` top sees the whole two-flight School stair (N27, N28 `YYYY`, 5.6 and 11.2 m).
- **East lane:** defender-first by about 4 s, with a 24 m line from the north end down both flights to `EL_LOW` (M9a `YYY-`, M9b `Y---`, reverse M9d `YYYY`).
- **A:** defenders are at the north mouth 4–5 s before attackers reach either entry, and inside `A_EAST` 2.4 s before them. The fastest defender route into A's porch is *through mid* (57 m), not through the Dentist (72–76 m).
- **B:** defenders are on the mezzanine about 3 s before attackers reach either floor door. Attackers own the Fishball workshop (10 s against 12.2 s for a defender running the East lane).

## 2. What the Yamen compound gives each team

- **Front court (z 0)** — attackers' by timing, hidden from the terrace. Gives the hall, the East lane foot, and the low link to `FB_B` (W6: the same 74.5 m as the Kwong route). It gives no site entry of its own.
- **Middle hall (z 1.7)** — attackers' covered staging. From it the court can be entered either side of `SCREEN`.
- **Inner court + west wing (z 1.7)** — the attackers' fast lateral: `A_EAST` → gallery → `SW2` down → School landing → west wing → court → `MID_E` → `SLE1` down → Rubbish yard → `FB_B` is **90.2 m / 16.7 s** door to door (M W11). Exposed along its whole court leg to the parapet and to gallery window `GW1` (M7b `YY--` at 26 m, M12 court length `YYYY` 21.6 m).
- **Rear terrace (z 3.4)** — the defenders' fast lateral: A plant → B mezzanine **84.8 m / 15.7 s** (M J-CT-rot), exposed for 28.5 m (V-strip-length `YYYY`) and enfiladed from `GW2` (M7a `YY--` at 31.8 m).
- **Gallery** is the keystone (H): it overlooks both laterals, holds the School stair, is 12 m from `A_EAST` and opens on the terrace.

Defender rotations A plant → B mezzanine, measured:

| Route | Length | Time | Exposure |
| --- | --- | --- | --- |
| Terrace (J-CT-rot) | 84.8 m | 15.7 s | Whole terrace; `GW2`; both stair tops |
| Hub: Dentist → Clinic → Youth hall → `YOUTH_E` → East yard → Coffin lane (W1) | 101.3 m | 18.8 s | Two cut points only (below) |
| Street: NW lane → CT street → NE lane (W9 + 27 m) | ≈147 m | ≈27 s | None |

Attackers' ability to cut the hub — **confirmed by rays**:

- West: from the north end of `WL_TOP` (37.4, 64.5) the Clinic mouth inside the Youth hall is visible in all postures at 9.6 m (N1), and the hall's SW interior at 9 m (M3c). From the Back yard (39.5, 68.5) the inside of `YOUTH_N` is visible at 15.6 m (N5). The Back yard ↔ Youth opening is a 5.2 m undeclared gap, not a door.
- East: from the top of `SLE2` (65.3, 57.6) the East yard (M1a, 12.2 m) and the `EL_TOP` north crossing (M1b, 8.8 m) are visible in all postures. Not from the terrace itself (M2a, M2b blocked) — the cut needs the East lane ascent, not the terrace.
- Not cut: the Youth hall's east half from the west side (M3e, N3, N4 blocked).

Consequences (H): one attacker at `SLE2` top denies the hub's B leg; one at `WL_TOP` north denies its A leg and watches the defenders' spawn door. With both, defenders are reduced to the 147 m street. Attackers who hold the East lane top also gain the only attacker route to B *at mezzanine height* (W2, 98.8 m).

## 3. Findings

Classification: **OD** observed defect, **DR** design risk, **IP** improvement proposal, **IT** intentional tradeoff, **UC** unavailable check.

### ST-01 — Spawn clusters undeclared; every timing rests on two points (OD, **blocking**)

- Objects: `T_APRON` (54 × 8 m), `CT_STREET` (76 × 8 m), anchors `T` (52, 6), `CT` (46.2, 88.8).
- Evidence: J-TB-kwong and J-TB-fishball begin with a 22 m walk east along the apron to the Kwong mouth at x 73.5–76.4 (E). A T spawning near x 74 reaches the foundry mouth at about 50 m (9.3 s) and `FB_B` at about 52 m — *before* the anchor CT reaches the mezzanine (55 m, 10.2 s). Symmetrically a CT spawning at x ≈ 92 is about 29 m from the mezzanine by the NE lane (E from J-CT-B-outer).
- Consequence: the B first-contact order in §1 reverses inside the drawn spawn space; the gallery tie and the A leads move by the same mechanism.
- Repair: declare five spawn points per team in `layout-data.json`. Suggested clusters: T within x 46–58, y 3–8; CT within x 42–54, y 87–92. Re-quote the §1 table for the best and worst spawn of each team, and add the hub (W1), street (W9), court pivot (W11) and Coffin attack (W2) routes to `journeys`. If an east-leaning T spawn is wanted, say so and show B still gets a defender on the mezzanine first.

### ST-02 — Fishball roof perch and catwalk: resolve before blockout (DR, **blocking** as an open experiment)

- Objects: `FB_ROOF`, `FBR_W`, `CATWALK`, `G_CAT`.
- **Perch — remove.** Evidence: defenders arrive at 13.7 s (W5), after attackers have passed through the workshop (10–12 s). From the window it sees only the east edge of `EL_LOW` (B8a, N10 `YY--`); the Rubbish yard, `EL_MID`, the front court and the west half of `EL_LOW` are blocked (B8b, B8c, B8e, B8f, N7, N11). The East lane's north end already sees `EL_LOW` and `EL_MID` (M9a, M9b). One exit, 19 m from the mezzanine. It is a late, redundant dead end.
- **Catwalk — do not keep as drawn.** Evidence: from (77.6, 51.3) it sees the plant centre, the foundry mouth interior, the floor north of `SACKS` and the east floor (B5a, b, c, g, all `YY--` with feet), the tongue (B5f), the mezzanine NW corner and the Coffin arrival (B5e, N22 `YYYY`). It stands over `FB_B`. Neither attacker approach sees the upper level before stepping in (B10, B13, B14 blocked).
- Mechanism (H): without it, B has a clean cross — the boiler hides the mouth from the north rail and tongue (V-mezz-mouth, B3a) while the west rail watches it (B1c); the west rail cannot see `FB_B` (B1b, B4c) while the north rail and tongue can (B2b, B3b). The catwalk adds a fourth elevated front that covers both entries' exits from one spot, and after a plant becomes a one-way last-stand position watching the bomb and the Coffin arrival.
- Repair for L02: delete `FB_ROOF`, `FBR_W`, `CATWALK`, `G_CAT`; run `G_MS` across the whole south edge of `B_MEZZ_W`, (76.7, 55.8)–(81.1, 54.8).
- Alternative experiment (IP **P-CAT**), if an overhead relationship outside B is wanted: make the catwalk an *enclosed* bridge (solid wall on its east side, no foundry overlook) and give the roof a stair down into the Rubbish yard, e.g. a 1.2 m flight along the workshop's west wall from foot (71.9, 38.2, z 0) to head (73.3, 44.9, z 3.4), entering where `FBR_W` is. Known conflicts: `FB_YARD` door (y 41.7–44.3) sits under the upper half of that flight and must move south to about y 38–40; the yard is only 2–4 m wide. It would give defenders a flank into the low link and attackers a second high entry to B from the front court (about 90 m, E). That enlarges B's defended perimeter; compare against the removal version, do not adopt on argument.

### ST-03 — Terrace has no cover against its own long axis (DR)

- Objects: `Y_STRIP`, `PLANTER`, `GW2`, stair tops `SLW2`, `SY2b`, `SLE2`.
- Evidence: V-strip-length `YYYY` 28.5 m; `GW2` → terrace east end `YY--` 31.8 m (M7a); `PLANTER` (1.1 m) runs parallel to the strip, so it shields only against the court, which `G_STRIP` already does. Exits are `WL_TOP` and `EL_TOP`, 30 m apart.
- Consequence (H): a mid-terrace defender has information on the court but a 12–15 m retreat under enfilade the moment the gallery or either stair top is lost; the terrace is then abandoned rather than fought over, and its role shrinks to the two ends.
- Experiment: one tall mass about 1.2 × 1.4 m, h ≥ 2.3, centred near (44.0, 55.6), and turn the planter into two short cross-strip pieces near x 50 and x 56. Re-run V-gallery-strip, V-strip-length, M7a. Keep `GW2`'s view of the `SLW2` top (M7d).

### ST-04 — The hub rotation costs only 16 m more than the exposed terrace (IT, record needed)

- Evidence: 101.3 m against 84.8 m (§2). `s01-disposition.md` records T1/T2 as "defenders cross a strip", "no hidden A↔B bypass through [the Youth hall]"; L01 has `YOUTH_E`, the East yard and the Clinic corridor. I did not find the later decision in the files I read.
- Consequence (H): defenders will normally rotate through the hub; the terrace is fighting ground, not a rotation. Attackers standing in the court therefore learn nothing about rotations; they must reach `SLE2` top or `WL_TOP` north to read or cut them. That is a coherent design — mid control is paid for in height — but it is a different one from the recorded intent.
- Request: record the decision. Optional test at blockout if the east cut proves too cheap or the 24 m East lane line too strong: a tall screen across `EL_TOP` at about (62.3, 63.9)–(65.2, 64.2), leaving a 1.9 m gap on the east. It trades both effects at once; do not add it without the comparison.

### ST-05 — A has one defender-side door; both spawn-side routes merge before it (DR / IP **P-A2**)

- Objects: `A_NORTH`, `DENTIST`, `NW_LANE`, `CLINIC`, `A_EAST`, `GALLERY`.
- Evidence: J-CT-A and J-CT-A-outer share every waypoint from (18.5, 74.3) on. The only other defender approaches are `A_EAST` via the terrace and gallery (W4, 57.1 m) and the half-level flank to the SW mouth (W12, 100.4 m / 18.6 s).
- Scenario: bomb planted on the porch, attackers hold the gallery (12 m from `A_EAST`, watches `BACKDOOR`). Retake is then one 3.4 m door into a 3 m strip behind the cella, splitting to gaps of 3.5 and 4 m, plus an 18.6 s flank. Not unretakeable: the north mouth cannot be watched from the porch (A1 blocked) and the two gaps give two exits (A2a, A2c, A3b visible on exit).
- Experiment: a "Dentist back passage" at z 3.4, about 2.2 × 10.5 m, polygon near (25.6, 60.7), (27.8, 59.9), (28.6, 71.2), (26.4, 71.3), from the Dentist's SE corner to the Slot yard's north tip. Gain: a second independent retake line and pressure on `GAL_W`. Cost: the Slot yard becomes a three-way junction and attackers gain a path from A-east into the Dentist/Clinic. Compare with L01 in a 3-attacker post-plant.

### ST-06 — No covered position watches the A south-west arrival at range (IP, for the local reviewer)

- Evidence: SW mouth → plant `YYYY` at 8.3 m (V-A-sw-plant); west gap north → SW mouth blocked (A3a, N20); the only tested positions seeing the mouth are the SE corner at 13 m (A4c, N21), which stands 5 m from `A_EAST`, and `A_CRATES`, 4 m from the mouth.
- Consequence (H): the Sai Shing arrival is held either point-blank or from an exposed corner; a lone A anchor cannot hold it with a retreat.
- Experiment: tall cover about 1.4 × 1.6 m near (18.8, 52.6), giving a 10 m watch on the mouth with a retreat behind `A_SCREEN` to the east gap. Check it does not hide a planter from both attacker entries.

### ST-07 — B is a pit held from above; post-plant is held from off-site (IT, with risk)

- Evidence: every defender route arrives on the mezzanine behind a screen (B4a, B9a blocked to the plant). Standing at the north rail one defender sees `FB_B`'s interior and both sides of the boiler (B2b, B2c, B2d `YY--`); crouched behind the 1.05 m guard he is hidden. Floor defenders can only retreat up `SB1`/`SB2`.
- Plant spots differ usefully (rays to three samples): centre is seen from every rail; under the tongue (91.3, 58.3) is hidden from the NE rail, the mouth and `B_LAND` but seen from the west rail, the Coffin corner and `FB_B`; NW (85, 58.8) is hidden from the west rail and the mouth, seen from the NW rail and the tongue. No sample was hidden from all upper positions.
- Post-plant (H): attackers hold the bomb from behind the boiler (B6f `YYYY` 8.9 m) and from `FB_B` (B6e `YYYY` 11.3 m); retakers clear from above, then must descend one of two exposed stairs or flank through the East lane and workshop (about 42 m from `YOUTH_E`, E). Three qualitatively different retake lines. Not unretakeable.
- Risk: an execute faces 8 m of west rail, 20 m of north rail and the tongue, all with hidden crouchers. Whether a five-player utility set can cover that is an engine question (UC). Removing the catwalk (ST-02) is the cheap reduction.

### ST-08 — Gallery as single keystone (DR, test)

- Evidence: §2. Attackers have two ways in (`SW2`; `SLW2` then `BACKDOOR`, 4 m apart at the top), defenders two (`BACKDOOR`, `GAL_W`).
- Risk (H): one defender there does three jobs (School stair, court, terrace watch) with two safe exits; one attacker there cancels the terrace and threatens A-east. Both teams may send two players every round, making the first 10 s of every round the same fight.
- Test at blockout, both spawn extremes: who holds the windows at 10 s, and what the loser can still do. No geometry change proposed yet.

### ST-09 — Recorded dispositions that L01 no longer matches (record)

- T4 "Lung Chun Road E retired; attackers' inner rotation crosses the Yamen front court": L01 has `LUNG_E` and J-T-rot (42 m / 7.8 s), hidden from every defender position sampled (V-lung-through, V-tunnel-gate). Attackers can swap sides unseen; defenders learn of it only by absence. That is ordinary for the mode but should be the recorded choice.
- T2: see ST-04.

## 4. Scenarios (all H unless a ray or walk is cited)

**Defender defaults.** A workable 5: A-east gap (23.6, 65.5) — sees `A_EAST` inside and the SE corner (A2a, A2c), 5 m from the north mouth; A-SW — see ST-06; gallery — best information on the map, two exits; East lane top north end — 24 m line, exits to the hub and to the Coffin lane, 16 m from the mezzanine; B north rail — full information on both floor entries, NE lane 4 m behind. So 2 A, gallery, East lane, 1 B, with the gallery and East lane players as first rotators (12–16 m each). The Youth hall itself needs nobody. Weak spots: mid-terrace (ST-03), any B floor position, the catwalk.

**A execute.** Sai Shing and School split at the half level (Tooth shop), so the split is chosen at 52–56 m. The two arrivals cannot see each other until past `A_SCREEN` (A4b, A6a blocked) and meet on the porch; the east group arrives about 1 s earlier. Defenders fall back north round the cella. The east group's flank is the gallery behind them (`BACKDOOR`).

**B execute.** Mouth group is covered by the boiler from the north rail and tongue but seen by the west rail at 15.8 m (B1c; reverse B6a `Y-Y-`). `FB_B` group is unseen from the west rail and seen from the north. A plant at the south edge near `CRUCIBLE` is 3–5 m from the mouth. A third prong at mezzanine height through the Coffin lane arrives about 5 s later (W2) and needs the East lane.

**Fakes and plan changes.**

| Attacker move | Length / time | Defender answer | Length / time |
| --- | --- | --- | --- |
| A-east show, pivot through the court to `FB_B` (W11) | 90.2 m / 16.7 s | Hub, plant to mezzanine (W1) | 101.3 m / 18.8 s |
| Same, by the terrace and East lane (W3, plant to plant) | 118.9 m / 22.0 s | Terrace (J-CT-rot) | 84.8 m / 15.7 s |
| Outer: back through Cannon Court and Lung Chun E | ≈115 m from the gallery, ≈155 m plant to plant / 21–29 s | Street, if the hub is cut | ≈147 m / 27 s |

The two teams' laterals are of the same order, and which is quicker depends on who holds the terrace, gallery and East lane top. The low link is not redundant with `LUNG_E`: it is the only way from the Yamen to a B door without returning through Cannon Court, and the defenders' only floor-level flank.

**Post-plant A.** Attackers hold from the Sai Shing lane (12 m diagonal, A4a), the SE corner and the gallery. Retake: two cella gaps, plus `A_EAST` if mid is free, plus W12. See ST-05.

**Stress cases.**
- *5 attackers v 3 defenders:* a hub player is 54 m from A and 35 m from B; two attackers at the cut points (§2) isolate the remaining defenders from each other. Expect the three to stack one side and retake; B's three retake lines make it the better site to give up (H).
- *3 attackers v 5 defenders:* defenders can push the East lane into the front court, the School stair into Lung Chun W, or the low link into Kwong (12.2 s). Cannon Court (343 m², `RUIN`, `RUIN_WALL`) is the attackers' reset space; three approaches reach it.
- *1 defender, bomb at the other site:* hub rotation 18.8 s plus clearing fits a 40 s timer; the street route (27 s) does not leave time for a fight.
- *1 attacker with the bomb in the court:* `A_EAST` and `FB_B` are each about 35 m away (E) — a real late choice, both visible from the gallery window.
- *1 attacker post-plant at B:* off-site behind the boiler, or the catwalk if it survives (no exit).

## 5. Dominant strategies, dead or redundant space

- No dominant strategy demonstrated. Candidates to watch: the gallery fight every round (ST-08); a catwalk solo-B anchor (ST-02); east-spawn B rush (ST-01).
- Dead: `FB_ROOF`. The B floor strip under the north mezzanine is unusable for defenders (no retreat) and useful only as an attacker hiding place.
- Redundant: `NW_LANE` and `CLINIC` for arrival at A (they matter only when the hub is cut). `PLASTICS` is a single-opening staging pocket — acceptable quiet space.

## 6. Unavailable checks

Utility coverage of the B rails and the terrace; sound of stairs, mezzanine and the Coffin lane (which decides whether hub rotations are really hidden); penetration of `A_SCREEN`, `SCREEN`, guards and the gallery wall; spawn spread; continuous reachability; any play or bot evidence. Rays here are samples.

## 7. Blocking items for this scope

1. **ST-01:** declare spawn clusters and re-quote first contacts for best and worst spawns; add the four missing routes to `journeys`.
2. **ST-02:** close the perch/catwalk experiment — remove `FB_ROOF`, `FBR_W`, `CATWALK`, `G_CAT` (or adopt P-CAT explicitly as a compared alternative).

Non-blocking, in priority order: ST-03 terrace mass, ST-05 / P-A2 back passage, ST-06 A south-west cover, ST-04 and ST-09 records, ST-08 blockout test.
