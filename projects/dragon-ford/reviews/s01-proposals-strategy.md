# Dragon Ford S01 — independent design proposals: macro strategy

Perspective: territory and rotations; opposing plans and information.
Stage: first sketch (S01), alternatives open. Reviewer did not read author rationale or sibling reviews.

## Inspected and not inspected

- Read: `brief.md`, `references/study.md`, `planning/alternatives-s01.md`, `planning/s01-a/layout-data.json` (revision `S01-A`).
- Viewed: `plan-0.png`, `plan-1.png`, `plan-2.png`, `section-NS.png`, `section-EW.png`; reference images `plan-streets-1980s.jpg`, `aerial-1989.jpg`.
- Not viewed: the other twelve reference images (I relied on `study.md` for them).
- `projects/ninefold*`: only the first lines of the two READMEs, to check for repetition.
- Evidence level: hand-measured centreline polylines and simple eye-height geometry from the polygons. Nothing here is a walk, a ray study or play evidence. `journeys`, `views` and `covers` in the data are empty, so every sightline below is a prediction. No balance claims.

## 1. How candidate A actually organizes play

Reading the polygons rather than the labels, A is a ladder:

- **Three south-to-north feeds** from the T apron: `W_SLOT`, `GATE`, `E_SLOT`.
- **A T-side lateral** at y 22–28.5: `SPINE_W` – `CANNON` – `SPINE_E`.
- **A second T-side lateral** 10 m further north: `ARCADE` – `WINGPASS` – `Y_FRONT` – `WINGDOOR` – `E_WING`.
- **A CT-side lateral** at y 58–63: `NL_W` – `Y_REAR` – `NL_E`.
- **An outer CT lateral**: `CT_STREET` with `NW_LANE`, `N_LANE`, `NE_LANE`.

So yes, in plan it is three lanes plus laterals. What is not generic:

- The middle lane is a stepped compound (z 0 → 1.7 → 3.4), and its top step is also the defenders' rotation.
- The west lane is doubled: a committed stair alley (`STEP_LO`/`SL1`/`STEP_HI`) beside a building (`ARCADE`/`SW1`/`GALLERY`) whose windows `GW1`/`GW2` read the compound.
- The sites contrast: A is level with its defenders after an 11 m run-up, B is a pit under two galleries.

### Rough travel distances (candidate A as drawn)

Centreline polylines between the anchors, stairs counted at slope length (about 7.6 m per storey flight, 3.8 m per half flight). Times use the brief's assumed 6.3 / 5.4 m/s and ignore stairs, corners and clearing.

| Journey | Route | Distance | Time (assumption) |
| --- | --- | --- | --- |
| T → A anchor | `W_SLOT`, `SPINE_W`, Sai Shing | about 89 m (site edge at 79 m) | 14–17 s |
| T → A anchor | `W_SLOT`, `ARCADE`, `SW1`, `GALLERY`, `NL_W` | about 99 m (site edge at 87 m) | 16–18 s |
| T → A anchor | `GATE`, Yamen courts, `SY2a`, `NL_W` | about 85 m | 13–16 s |
| T → B anchor | `E_SLOT`, `SPINE_E`, `KWONG` | about 80 m (door at 73 m) | 13–15 s |
| T → B anchor | `E_SLOT`, `WING_S`, `E_WING`, `WING_N` | about 85 m (door at 69 m) | 13–16 s |
| T → B anchor | `GATE`, Yamen courts, `SY2b`, `NL_E`, mezzanine, `SB` | about 91 m | 14–17 s |
| CT → A anchor | `NW_LANE` | about 53 m (site edge at 42 m) | 8–10 s |
| CT → B mezzanine | `NE_LANE` | about 40 m | 6–7 s |
| CT → B anchor | `NE_LANE`, mezzanine, `SB` | about 65 m | 10–12 s |
| T → `YGATE` / top of `SY1` / `Y_REAR` | `GATE`, `CANNON` | 24.5 / 38 / 57 m | 4–5 / 6–7 / 9–11 s |
| CT → `G_YR` balustrade (50, 54) | `N_LANE` | about 33 m | 5–6 s |
| CT A anchor → B mezzanine | `NL_W`, `Y_REAR`, `NL_E` | about 51 m (78 m to B anchor) | 8–10 s |
| CT A anchor → B mezzanine | `NW_LANE`, `CT_STREET`, `NE_LANE` | about 91 m | 14–17 s |
| T west trunk (25.75, 23.75) → east trunk (73.75, 26.75) | `SPINE_W`, `CANNON`, `SPINE_E` | about 48 m | 8–9 s |
| T foot of `SL1` → `KWONG` door | same lateral | about 102 m | 16–19 s |

What the distances show:

- Defenders reach both sites 33–37 m ahead of attackers.
- Defenders reach the balustrade over `Y_MID` about 5 m before attackers reach the top of `SY1`.
- The mid route is the attackers' shortest route to A, not a longer alternative.
- The defenders' inner rotation is about 40 m shorter than their outer one.

### Observed characteristics of the sketch

Items O1 and O5 are observed defects at sketch level. The rest are observed relationships that I treat as opportunities.

- **O1 — spawn-to-spawn axis (defect, conditional).** `GATE`, `YGATE`, `SY1` and `N_LANE` all sit on x 48–52, and both spawn anchors are at x 50–52.
  - A defender's eye at the balustrade (50, 54.3, z 5.26) has a geometric line through `YGATE` into the `GATE` tunnel, about 44 m. It passes `YGATE` at z ≈ 3.25 and the tunnel mouth at z ≈ 2.2, under the 3.4 m ceiling.
  - Only the undrawn "open pavilion, spirit screen" in `Y_MID` and the unspecified `YGATE` head stop it.
- **O2 — the rear terrace is everything at once.** `Y_REAR` is:
  - the defenders' only fast rotation;
  - 4 m from B's west mezzanine via `NL_E` and 12 m from A via `NL_W`;
  - the top of the attackers' shortest A route;
  - reached first, and from above, by defenders.

  A defender who rotates along the north wall (y 60–63) is hidden from every position in `Y_MID` and `Y_FRONT`: the line over the 1.05 m guard from y 45 clears z 5.2 at y 62. The rotation is therefore fast, short and unread unless attackers hold `GALLERY` (`GW2`) or the terrace itself. This is the "overly important, overly connected middle" pattern in `strategic-patterns.md`.
- **O3 — the School roof is a defender-side double overwatch.** Both stairs to z 6.8 start in defender territory: `SW2` from `RLAND` beside `NL_W`, and `SR` from `ALAND` inside A.
  - Defenders reach the roof in about 54 m; attackers in about 91 m, and only by walking the whole gallery.
  - From `G_SR` one player overlooks the Yamen courts, and probably part of `CANNON` over the gatehouse.
  - 12 m away, `RW_A` looks down into A.
- **O4 — the attackers' rotation is free and doubled.** `SPINE_W`–`CANNON`–`SPINE_E` is 48 m, roofed except for the court, and visible to defenders only through a roughly 5 m wide cone through `YGATE`. The `Y_FRONT`/`E_WING` link repeats it 10 m north. Nothing a defender can reach in time reads an attacker switch.
- **O5 — one stair to the bomb at B (defect).** Defenders arrive on `B_MEZZ_N`/`B_MEZZ_W` at z 3.4, and the only walkable descent to `B_FLOOR` is `SB`, 2.4 m wide. The brief forbids relying on the 3.4 m drop. `KWONG` is a 21.5 m straight tunnel aimed at the B anchor (82, 57), so a planted bomb there is watched down the full length of the street.
- **O6 — one mouth at A's east side.** `NL_W` at (26, 60–63.5) carries the School route, the mid route, the defenders' inner rotation and the roof stair landing. A has two attacker arrival points, not three. I leave this to the A-site reviewer.
- **O7 — overlap risk with Ninefold.** The Ninefold README describes a z 0 street-level factory site called "Noodle Works" and a mid whose gallery is an observation perch. The brief describes a south-to-north three-feed. A has a south-to-north three-feed, a z 0 factory site named Noodle Works and a gallery perch over mid. The stepped Yamen and the east/west site placement differ, but the east half needs a different identity than a renamed factory floor. Checked against README summaries only.

## 2. Comparison of A, B and C

| | A — Stepped Yamen | B — Ring around the hollow | C — Factory street section |
| --- | --- | --- | --- |
| What territory control buys | Terrace control buys both site flanks and cuts the rotation: too much in one place (O2). School control buys a read of the rotation. | Little. A ring has no hub; taking a quadrant only shortens one direction. | A street level is a lane. Holding the stair shafts buys the switches. |
| Rotation decision | Defenders: inner terrace or outer street, currently no real cost. Attackers: none (O4). | The clearest of the three: direction and level, the same question for both teams. | Vertical, through three shafts. Sites can be close in distance and expensive in practice. |
| Information | Thin and one-sided: defenders own the roof, attackers get nothing cheaply. | Abundant: the void is seen from every side. The risk is that everything is read and fakes die. | Double-height workshops seen from three streets give real shared-volume information, but three levels to check at each. |
| Fakes and changes of plan | Attackers switch behind their front unseen; defenders answer over the terrace unseen. Both are free, so neither is a decision. | Fast for both teams by symmetry. With sites east/west and spawns north/south, each site is equidistant from both spawns. | A change of plan is a change of level, which is audible and committed. Interesting, but hard to read at sketch. |
| Generic or thin? | A ladder, redeemed by the stepped compound and the School. | A doughnut. The one diagonal path is the only middle. | Three lanes turned 90° into section. Closest to the Ninefold-reboot arrangement the brief excludes (factory over through-street with roof switch), and the Yamen is demoted to an end junction. |

**Verdict from this perspective.** Develop A, but not as drawn. A alone has an intermediate territory whose ownership changes what happens next. Its weakness is that both teams rotate for free and out of sight, and the terrace is over-connected. B's best idea — the void gives information while the built ring gives movement — is what A lacks. C is the weakest fit to the brief's non-repetition constraint and gives the reference's signature void the least work.

### Proposed hybrid: "two rotations through the Yamen" (A with B's reading void)

Keep A's sites, spawns and stepped compound. Give each team an inner rotation that must pass an open Yamen court and an outer rotation through its own spawn street.

- Attackers' inner rotation crosses `Y_FRONT` (z 0).
- Defenders' inner rotation crosses a narrow balustrade strip of `Y_REAR` (z 3.4).
- `Y_MID` (z 1.7) lies between as the court from which either team can read the other's switch.

Mid control then means information and a tax on the opponent's rotation, rather than a doorway into both sites. Proposals T1, T2 and T4 build this; T3, T5 and T6 address the roof, the B retake and the east approach.

## 3. Proposals

All refer to revision `S01-A`. Coordinates are meters; levels are floor z.

### T1 — Rear hall mass: force the defenders' inner rotation onto a balustrade strip (costs a rotation)

- **Type:** opportunity; addresses O2.
- **Affected:** `Y_REAR`, `G_YR`, `NL_W`, `NL_E`, `SY2a`, `SY2b`.
- **Physical change:**
  - Fill the north part of the terrace with the closed rear hall of the compound: solid mass, or a shuttered non-playable interior, at x 44.5–59, y 58.5–63, rising at least one storey above z 3.4.
  - What remains walkable at z 3.4:
    - a west bay, x 38–44.5, y 57.4–63, taking `NL_W` at x 38 and the head of `SY2a`;
    - a front strip, x 41–59, y 54–58.5, behind `G_YR`;
    - an east bay, x 59–62, y 57.4–63, taking `NL_E` and the head of `SY2b`.
  - Draw `G_YR` as a solid 1.05 m parapet.
- **Before:** a defender at A (15, 64) hears B called. They run `NL_W`, hug the terrace north wall and reach `B_MEZZ_W` in about 51 m. Two attackers standing in `Y_MID` at (50, 47) never see them. Nothing is decided.
- **After:** the same defender must cross 18 m of strip, 2 m behind the parapet. Predicted from (50, 47, eye z 3.56): a standing runner shows about 0.6–0.7 m of head above the parapet; a crouched one (top z 4.5) shows nothing but moves at crouch speed. The defender chooses between:
  - running and being read, possibly shot;
  - crouching and arriving late;
  - the outer street, about 91 m.

  Crossing lengthens to about 27 m, so A anchor to mezzanine is about 54 m.
- **Teammate use:** an attacker in `Y_MID` or at `GW2` calls the crossing, so a fake at one site can be confirmed as having drawn a rotation. A defender partner can smoke the parapet line to buy one clean crossing, spending utility that is then missing at the site.
- **Opponent response:** defenders can hold `Y_MID` from the strip to keep readers out. That costs a player at mid, which is the point.
- **Sacrifices:**
  - the terrace stops being a court with depth, so a mid defender has only the strip and the two bays to fall back through;
  - `Y_REAR` loses about 60 m² of floor;
  - the strip could become a shooting gallery from `SCHOOL_ROOF` (see T3).
- **Why it fits the place:** the study records "three halls, two courts", each hall higher than the last (images 8, 9). A is currently missing the third hall.
- **Later check:** an eye-height ray fan from `Y_MID`, the top of `SY1`, `GW1`/`GW2` and the roof to standing and crouched bodies along y 56.25. Compare a 1.05 m solid parapet with an open rail. Walk-time the strip against the street.

### T2 — Take `N_LANE` off the spawn axis and land it in the west bay

- **Type:** repair of O1 plus an experiment on how mid leans.
- **Affected:** `N_LANE`, `Y_REAR`, `CT_STREET`; depends on, or pairs with, T1.
- **Physical change:**
  - Move `N_LANE` from x 48–51.5 to x 41–44.5, y 63–82, so it enters the west bay at (41–44.5, 63).
  - The Youth Centre mass then stands on the axis north of the rear hall.
  - Keep `GATE`–`YGATE`–`SY1` on axis: that is the place's ceremonial line and it is all on the attackers' side.
- **Before:**
  - Defender route spawn → balustrade is about 33 m, straight down the axis, with a possible 44 m line into the `GATE` tunnel.
  - The mid defender stands equidistant from A's link (12 m) and B's link (4 m).
- **After:**
  - No continuous north–south opening exists north of `Y_MID`.
  - Defender route to the parapet at (42.75, 54.5) is about 38 m, against the attackers' 38 m to the top of `SY1`. Stated as distance only.
  - Defender mid presence arrives next to A's link and must cross the T1 strip to help B. Attackers who win the east bay are 4 m from `B_MEZZ_W`.
  - Mid now leans: it is the defenders' support for A and the attackers' lever on B.
  - Decision enabled for attackers: "take mid to open B's gallery level, or avoid mid and hit A, where the mid defender is closest".
- **Teammate use:** an attacker pair in `Y_MID` pins the west-bay defender while the east group times `KWONG`.
- **Opponent response:** defenders can answer with a B-heavy setup, leaving A to the mid player plus one.
- **Sacrifices:** symmetry and legibility of the compound from the north; B becomes structurally the more pressured site. That asymmetry is a hypothesis, not a claim.
- **Comparison to hold:** a mirrored variant with `N_LANE` in the east bay (x 55.5–59), and the baseline axis with a drawn spirit screen.
- **Later check:** spawn-to-spawn and balustrade-to-`GATE` ray study on both variants; walker timing of first contact at `Y_MID`.

### T3 — Move roof access into the School stair shaft; delete `SW2`

- **Type:** experiment; addresses O3.
- **Affected:** `SW2`, `RLAND`, `GALLERY`, `SCHOOL_ROOF`, `PIGEON`, `SR`, `RW_A`, `G_SR`.
- **Physical change:**
  - Remove `SW2` and `RLAND`.
  - Add a return flight `SW3` in the same shaft as `SW1`: from the gallery's south end at about (34.8, 46.8, z 3.4), running south to (34.8, 40, z 6.8), width 2.4 m, emerging on `SCHOOL_ROOF`.
  - `SR` and `RW_A` stay.
- **Before:** a defender walks `N_LANE` → `NL_W` → `RLAND` → `SW2` through their own back area (about 54 m). They then own a perch over the compound, the T1 strip, probably `CANNON`, and with a 12 m walk A through `RW_A`. Attackers can contest only after taking the entire gallery (about 91 m).
- **After:** the roof is reached from the top of the School stair, the contested point of the west building. Approximate distances to the roof head:
  - defenders about 63 m via `NL_W` and the length of the gallery;
  - attackers about 80 m via `SW1`;
  - defenders from A via `SR` and `PIGEON`, about 98 m to the east edge.

  Whoever wins the stair-head fight gets the roof. An attacker there reads and denies the T1 strip from above, and can continue across `PIGEON` and down `SR` as a slow, loud third arrival at A's west side.
- **Teammate use:** the roof player calls rotations and holds `RW_A` for a west-side entry.
- **Opponent response:** a defender in A climbs `SR` (about 10 m from the anchor) to meet them on `PIGEON`. Defenders can also concede the roof and keep off the strip, taking the outer street.
- **Sacrifices and risks:**
  - defenders lose their cheap overwatch of mid;
  - A gains an overhead attacker threat;
  - post-plant, an attacker at `RW_A` with only `SR` and `SW3` as approaches could be a lockout, so the retake path up `SR` needs checking;
  - a two-flight shaft is a grenade trap.
- **Comparison to hold:** keep `SW2` and add `SW3` (three stairs, roof as shared ground); delete the roof route altogether and keep only `GW1`/`GW2` as the School's read of mid.
- **Later check:** ray study from `G_SR` to the strip, `Y_FRONT` and `CANNON` with the gatehouse height drawn; walk timings to `SW3` head for both teams; retake walk up `SR` against a holder at `RW_A`.

### T4 — Close `SPINE_E`'s mouth onto `CANNON`: the attackers' inner rotation must pass `Y_FRONT` (removes a connection)

- **Type:** opportunity; addresses O4.
- **Affected:** `SPINE_E`, `CANNON`, `WING_S`, `E_WING`, `WINGDOOR`, `Y_FRONT`, `YGATE`.
- **Physical change:** wall off the opening at x 62, y 25–28.5; `SPINE_E` becomes x 64–84. Everything else stays. The east trunk now meets the middle only through `WING_S` → `E_WING` → `WINGDOOR` → `Y_FRONT`.
- **Before:** three attackers show at the foot of `SL1`, then turn and run `SPINE_W`–`CANNON`–`SPINE_E` to `KWONG`. The trunk-to-trunk leg is about 48 m and no defender position sees it. The `Y_FRONT`/`E_WING` link is a redundant copy.
- **After:**
  - The same switch runs `SPINE_W` → `CANNON` → `YGATE` → `Y_FRONT` → `WINGDOOR` → `E_WING` → `WING_S` → `SPINE_E`, about 57 m, crossing 12 m of open front court.
  - The fully hidden alternative is back through `T_APRON`, about 77 m.
  - Predicted from the parapet (eye z 5.26 at y 54.3), the `Y_FRONT` floor south of about y 38 is visible past the `Y_MID` edge, unless the pavilion blocks it. A defender in `Y_MID` sees all of it.
  - Attackers choose "fast and possibly read" or "slow and silent". This mirrors the defenders' choice in T1.
- **Teammate use:** an attacker holding `Y_MID` or smoking the top of `SY1` makes the inner rotation safe. Mid control is now worth something to a team that never intends to climb the terrace.
- **Opponent response:** a defender who pushes to the head of `SY1` learns the switch and can call the rotation early, at the price of standing in the middle court.
- **Sacrifices:**
  - `GATE` entrants lose the direct turn east;
  - `E_WING` becomes a busy three-door junction (rotation link plus B's south-west door), which may need simplifying (see T6);
  - the long east–west spine in front of the compound, study relationship 5, is interrupted. Scenically the tunnel can continue behind a grille.
- **Later check:** ray study from the parapet and from the head of `SY1` to a body walking `YGATE` → `WINGDOOR`, with the pavilion drawn; walker timing of inner against outer rotation.

### T5 — A second way down to the bomb at B

- **Type:** repair of O5.
- **Affected:** `B_MEZZ_N`, `G_BN`, `B_FLOOR`, `SB`.
- **Physical change:** add stair `SB2` at the east end of the north mezzanine, from (88.8, 65, z 3.4) down south to (88.8, 58.2, z 0), width 2.4 m. Shorten `G_BN` to end at x 87.6.
- **Before:** bomb planted at (82, 57); two attackers fall back into `KWONG` and one into `E_WING`. Retaking defenders arrive on the mezzanine with a full view, but all must descend the single stair `SB` at x 72, landing 10 m from the bomb. Its foot is a known point.
- **After:** defenders split `SB` (10 m to the bomb) and `SB2` (about 7 m). By plan geometry both stair feet are outside the view from deep inside `KWONG`: the door jambs at x 80.5 and x 84 cut lines from y 45. Attackers must come up to the doorway to deny a descent, where the mezzanine sees them.
- **Teammate use:** one defender holds the mezzanine rail over the bomb while another descends the far stair.
- **Opponent response:** attackers get a second route up to the mezzanine before the plant, so they can contest the height instead of only entering beneath it.
- **Sacrifices:** defenders on `B_MEZZ_N` gain a second flank to watch; floor area at the east wall is taken by the flight.
- **Later check:** ray study from `KWONG` at y 30, 40 and 49 to both stair feet and the anchor; retake walk from `NE_LANE` and from `NL_E` to the anchor by each stair.

### T6 — Jog Kwong Ming Street and give the east approach a staging workshop; drop `WING_N`

- **Type:** experiment; addresses the free early read at B and O7.
- **Affected:** `KWONG`, `B_FLOOR` south wall, `WING_N`, `E_WING`; cleaner with T4.
- **Physical change:**
  - End the straight street at y 40.
  - Continue it by a jog east: a new north leg at x 85.5–89, y 36.5–50, joined to the south leg through y 36.5–40. It enters B at the south-east corner.
  - Add a double-height workshop, z 0, ceiling 6.8, at x 73–80.5, y 38–48, with a door from the street at (80.5, 36–39) and a door into B's south wall at (74.5–77.5, 48–50).
  - Remove `WING_N`, so `E_WING` is only the Yamen's link (T4) and no longer a B door.
- **Before:**
  - A defender standing safely on `B_MEZZ_N` can look down the whole 21.5 m of `KWONG`. With an unspecified door head, legs are visible to about y 28.
  - Attackers enter the street at about 51 m of travel; that defender is in place at about 40 m. The east is read every round for free.
  - After a plant the same line makes `KWONG` a 30 m post-plant lane onto the bomb.
- **After:**
  - The choice between workshop door and street door is made at y 36–40, out of any line from the mezzanine.
  - The longest line into the approach is the 13.5 m north leg.
  - Routes become about 85 m (workshop) and 86 m (street) to the anchor, against 80 m now.
  - The two doors are about 10 m apart and can support each other.
  - A defender who wants early information must come down to the floor and peek, which is a risk taken on purpose.
- **Teammate use:** the workshop is a place to gather, wait for a mid call and throw utility before committing. The sketch currently has no such quiet staging on the east.
- **Opponent response:** defenders can hold the workshop door from under the west mezzanine, or push into the workshop early from the B floor (about 64 m from their spawn).
- **Sacrifices:**
  - the reference's straight factory street is shortened;
  - `GATE`/mid attackers can reach B only at gallery level via `NL_E` or the long way round through `WING_S`;
  - `SB2` (T5) sits near the new street door and the two must be drawn together.
- **Why it fits the place:** study relationship 8, a factory alley lined with deep double-height workshops, and "most north–south alleys jog".
- **Later check:** ray fan from both mezzanines through each south door with door heads specified; walker timings; compare with the straight street.

## 4. What I would keep unchanged

- **The stepped compound as the middle** (`Y_FRONT` 0 → `Y_MID` 1.7 → terrace 3.4), with `SY1` on axis and the two wing steps. It is the sketch's one original territory.
- **Sai Shing Lane as a committed route** with no cross-link to the School between y 25.5 and 54. The cost of choosing it is the point.
- **`WINGPASS`.** It is the defenders' only flank into the School's back and the School group's only late turn to mid. With T4 it also becomes part of the attackers' inner rotation.
- **Three separate slots from a wide apron.** The initial attacker split is unreadable, and that is acceptable because contact comes 50 m or more later.
- **The site contrast:** A level with its defenders after a climb, B below them.
- **Spawn sides** (attackers low and south, defenders high and north) and the defenders' outer street. I considered turning the attack axis east–west as in C and see no rotation or information gain that the hybrid does not get more cheaply.
- **Defender arrival margins at the sites** (33–37 m ahead). No change proposed before walker timings exist.

## 5. Conflicts, dependencies and open questions

- T1, T2 and T4 form one concept, the hybrid in section 2. T1 without T4 taxes only the defenders; T4 without T1 taxes only the attackers. Adopt or decline them as a pair.
- T3 changes who can see the T1 strip. If the roof stays defender-owned, T1 still works. If T3 gives it to attackers, the strip may be too costly, so test T1 first with the baseline roof.
- T4 loads `E_WING`. T6 unloads it by removing `WING_N`. T6 and T5 both touch B's south-east corner.
- After T1 and T2, `NL_E` still puts the east bay 4 m from `B_MEZZ_W`. Whether that link should lengthen or land on the north mezzanine instead is a question for the B-site reviewer.
- The pavilion and spirit screen in `Y_MID` now carry most of the information design. They need to be drawn as actual masses before any of the sightline predictions above can be tested.
- O6 and O7 are not answered by these proposals.
