# Dragon Ford R01 — independent architectural review

Scope: architectural plausibility, enclosure, roofs/ceilings, volumes and environmental completeness
(`level-architecture-review`). Not gameplay, balance, navigation certification or renderer styling.

Revision reviewed: `projects/dragon-ford/level.aml`, sha256 `19787b07…f5a3` (matches the packet captures).

## Verdict

**Changes required.** One demonstrated construction defect (D1, a hole in the foundry floor open to the
outside of the world) and one landmark that does not read as a building (D2). Everything else is sound at
blockout level: enclosure, the stepped section, the void and the tower field are real geometry and read as
intended. Recommended items R1–R7 are not gating.

Required list:

1. **D1** — close the floor opening under foundry stair flight `SB2b`.
2. **D2** — give `TINHAU` a building reading (roof/eave, base, entrance face), distinct from cover.

## Evidence inspected

- Packet captures `reviews/evidence/r01/captures/`: all of `01`–`08`; eye-level `e01`–`e13`, `e15`, `e17`,
  `e19`, `e21`, `e24`, `e26`, `e30`, `e31` (21 views).
- Reference images: `aerial-1989`, `plan-streets-1980s`, `alley-covered-1993`, `yamen-front-courtyard`,
  `perimeter-street-night-1993`, `section-panorama-detail-lo-yan-street`; `references/study.md`.
- Layout: `layout-r01/plan-0.png`, `section-NS.png`, `layout-data.json` (space `sky`/`ceil` declarations).
- Source: element inventory, floor/plinth/stair/canopy/aperture/cover definitions (lines 26–132, 755–836).
- `levelspec validate --json`: success, 153 warnings (98 `NAV_ISLAND`, 31 `ROOF_STEP_OPEN`, 24 `FLIGHT_OPEN_SIDE`).
- Own captures, 41 views: `generated/dragon-ford/review-arch/c1/a01…a32`, `c2/b01…b09` (view definitions
  and hashes in each `capture.json`).

Limits: flat `materials` appearance without lighting, so thin offsets and coplanar seams are hard to read.
Optical inspection only; I did not run walks or rays. Volumes sealed inside masses (under lane stair upper
flights, the hollow core of storey 1) were not visible and are unverified.

## Defects (must fix at blockout)

### D1 — Foundry floor is missing under the upper east stair flight (`SB2b`)

- Where: B foundry, NE corner, about (92.5–96.3, 56.4–59.5), z 0. Roughly 3.3 × 2.4 m.
- Evidence: `c2/b02-hole-eye.png` and `c2/b03-hole-crouch.png` show the canvas background through the floor
  beneath the flight; also visible in `c1/a09-foundry-in.png`, `c1/a25-b-east-stair.png`,
  `c1/a31-foundry-cut.png` and packet `08-site-b-roofs-off.png`.
- Cause in source: `floor-0-0-plan` (line 829) notches out the `SB2b` footprint
  (`96.348 58.747; 93.023 59.454; 92.523 57.106; 95.849 56.399`). `SB2b` rises 1.7→3.4 with
  `underside="filled"`, which fills only down to its own base at 1.7. Nothing occupies z 0–1.7 there.
  `FURNACE_S` ("fills the pit beside the east stair") is a 0.9 m strip and `FURNACE` stops short, so the pit
  stays open on its south and west sides.
- Consequence: a visible opening to outside the world on a bomb site. The gap under the flight is 1.7 m
  high, above the 1.1 m crouch height, so it is an unsupported place a body could enter. I did not test
  collision there.
- Repair: add a solid plinth under the `SB2b` footprint from z 0 to 1.7 (as the `floor-1_7-*-plinth`
  extrusions do for the 1.7 platforms), or extend `FURNACE` to cover the whole footprint. Do not just patch
  the slab: a floored 1.7 m nook under the stair would be a new crouch position. Apply the same plinth rule
  to the other upper flights (`SLE2`, `SW2`, `SS2`, `SY2b`, `SLW2`); they are hidden between walls today but
  would be the same unsealed volume in an export. Local repair; recheck the B-site cover and sightline
  interface at the stair foot.

### D2 — Tin Hau hall (`TINHAU`) reads as a large crate, not a temple

- Where: site A, (12–21, 60–67), z 3.4–7.6.
- Evidence: `c2/b07-tinhau-south.png`, `c1/a08-a-wide.png`, `c1/a26-a-above.png`, packet `e15`, `07`.
- Observation: a single 4.2 m extrusion in the `tall` cover material, identical to `A_SCREEN`, `A_CRATES`
  and `A_SW_BLOCK` beside it. No roof slab or eave, no base, no door face or porch, although the labels
  speak of a "plant porch". `A_SCREEN` (2.6 m) abuts it and reads as a lean-to of the same object. This is
  the landmark of the site and the only free-standing building in the lot.
- Repair (non-colliding where possible, so play is unchanged): own material; a roof slab or shallow gable
  with 0.4–0.6 m eave overhang above 7.6; a 0.2–0.3 m base course; a recessed or framed closed door on the
  south face over the plant zone, with two porch posts if the eave is deepened there. Keep `A_SCREEN`
  visibly separate (gap or different height/material). Any colliding addition needs a local sightline recheck.

## Recommended improvements (not gating)

- **R1 Yamen hall roof form.** `Y_HALL-canopy`, `PODIUM_W/E-canopy` form one flat 0.3 m tin slab at 4.8–5.1,
  flush with the walls (`c1/a04-void-hall.png`, `c1/a30-void-bands.png`). It is properly carried: four hall
  columns, two porch columns, `HALL_W`, `SCREEN` and both lintels all meet its underside at 4.8. From the
  void it reads as a shed roof. Add a non-playable pitched or stepped roof mass above the canopy with eaves
  over the open front, and use the defined but unused `tile` material. This is the centre of the map and the
  reference's strongest image (`yamen-front-courtyard.jpg`).
- **R2 Rear hall is not expressed.** The terrace is labelled "closed rear hall behind", but its north side
  is the blank storey-1 band (`c2/b06-terrace-north.png`, `c1/a05-void-terrace.png`). Add a shallow closed
  hall front: eave line, pilasters or engaged columns, blind doors, within about 0.3 m of the wall.
- **R3 Window pitch gives the towers the wrong scale.** Facade bays sit at z 12.9, 19.7, 26.5, 33.3 only, a
  6.8 m pitch, so 24–31 m towers read as four giant storeys (`c1/a29-south-elev.png`, `c2/b08-west-elev.png`,
  `c1/a07-a-up.png`). Use the 3.4 m storey pitch. The 0–10.2 m bands are blank on every face; that is
  acceptable inside (no false openings) but see R5 for the street faces.
- **R4 Sliver towers.** The rotated district grids clipped by the envelope leave acute wedge towers, e.g.
  the west side of the void (`06-void-from-above.png`) and the NE corner (`c1/a03-east-low.png`, top left).
  Merge tower lots narrower than about 3 m into a neighbour.
- **R5 Perimeter frontage.** Both spawn streets work as world edges: 3.2 m solid fences (`F_T_*`, `F_C_*`)
  block the eye-level horizon, the CT street stands on solid mass (`c2/b04-ct-under.png`), and nothing beyond
  is visible from play. The CT "dentist arcade" is a blank wall with three thin awnings, five posts and seven
  signs (`c1/a19-ct-arcade.png`, `c1/a17-ct-west.png`); add shallow shopfront recesses or shutter panels per
  bay and a first-floor terrace slab. The T apron's "squatter sheds, ball court" is two plain boxes
  (`c1/a22-t-wall.png`); give the sheds lean-to roofs. A distant backdrop mass beyond each fence would help.
- **R6 Storey seams around the void.** The storey-1 and storey-2 outlines differ by small amounts, leaving
  ledges and notches under about 1 m at the 6.8 m line (`e09`, `e10`, `c1/a05-void-terrace.png`). Align them,
  or make the offsets deliberate cantilevers of 0.6 m or more.
- **R7 Foundry stair flanks.** `FLIGHT_OPEN_SIDE` on `SB1`, `SB2a`, `SB2b` is real: drops of up to 3.4 m with
  no guard (`c1/a31-foundry-cut.png`). Add guards or record the open flank as intended. The same warning on
  the lane stairs is a false positive where sampled: `SLE1` and `SY1` sit flush between walls
  (`c1/a14-sle1-slot.png`, `c1/a15-sy1-side.png`).

## Acceptable for the art pass

- Pipe and cable ceilings, tin sheet, lighting in the tunnels. `pipe`, `net`, `rust`, `court` materials are
  defined but unused. Tunnels are 3.1 m clear against 2.5–3 m in the reference, so there is room.
- Caged balconies, roof clutter, shop signage detail, shutters, the cannon and lion as recognisable objects.
- Kiosks, stall, ping-pong table, racks, moulds, boiler as plain boxes.
- East and west block faces and the ground outside the block: never visible from play.

## Checks that passed

- **Indoor enclosure.** Every indoor space sampled has a real ceiling with roofs shown: South Gate tunnel
  (`e01`), School arcade (`e06`), Kwong Ming Street (`e19`), Fishball workshop (`e21`), foundry at 6.8 m
  (`c1/a09`, `c1/a10`), Youth hall (`c1/a12`), gallery (`c1/a13`), dentist shop (`c1/a28`), middle hall
  (`c1/a06`), stair shafts at School and Sai Shing (`e12`, `c1/a24`). The roofs-off overviews are cutaways,
  not missing roofs. Not sampled: Tooth shop, Clinic corridor, NW lane, Coffin lane, NE lane, Lung Chun E.
- **Sky voids.** Yamen void, Tin Hau lot, Well Court, Plastics yard and the small yards are open shafts
  through storey 2 and the towers (`c1/a27-top-roofs.png`, `c1/a07-a-up.png`, `c1/a26-a-above.png`), with
  sheer faces and no arcade or setback, as in `aerial-1989.jpg`.
- **Tower field.** One solid block, unequal heights (five steps, 27.2–40.8 m), reads as one mass from
  outside (`01`, `02`, `c1/a01`–`a03`) and from inside the void.
- **Stepped section.** 0 / 1.7 / 3.4 is real structure: `floor-1_7-*-plinth` solids under the 1.7 slabs,
  `G_POD_*-sill` retaining faces with parapet (`e04`), solid storey-0 mass under the 3.4 terrace with
  `G_STRIP*` parapets (`e08`, `c1/a05`), filled stairs.
- **Supports and joints.** Mezzanine and tongue on four posts plus two walls (`c1/a11`, `c1/a31`); lintels
  (`GW1/2-head`, `BACKDOOR-head`, `FB_*-head`, `HALL_LINTEL_*`) span between walls (`e11`, `e31`, `e30`);
  awnings meet the wall and arcade columns; signs project from the wall. No floating piece found.
- **Warnings.** `ROOF_STEP_OPEN` is the presentation window bays against `mass-2`, not open roof steps.
  `NAV_ISLAND` patches are tower tops, the `TINHAU` top and cover tops; none is an occupied surface.

## Return review — R02

Revision: `level.aml` sha256 `6a521fac…a3ef` (matches `reviews/evidence/r02/source.sha256`). Inspected before
reading `r01-disposition.md`: packet captures `r02/captures/01`, `02`, `07`, `08`, `e04`, `e15`, `e18`,
`e22`; the new source elements and their profiles; `levelspec validate --json`; 15 own views in
`generated/dragon-ford/review-arch-r02/c1/r01…r15`. Scope limited to D1, D2, R1, R3, R7, `CT_PLINTH` and
new side effects. Optical inspection only; same limits as above.

**Verdict on R02: accepted.** Both defects are closed with real, supported geometry. Nothing new was found
floating, open or visibly z-fighting in the views sampled. Two non-gating notes (N1, N2) below.

| Item | Result | Evidence |
| --- | --- | --- |
| D1 hole under `SB2b` | **Closed.** `SB2b-plinth` (z 0–1.7) fills the exact footprint the floor notches out; `SB2_WALL` (0–4.45) closes the south flank. No background visible from the floor, the west side or the cutaway. `SLW2`, `SY2b`, `SLE2`, `SW2`, `SS2` have the same plinth in source (lines 112–127); those are hidden between walls and were checked in source only. | `r01-hole-eye`, `r02-hole-west`, `r03-foundry-cut`, packet `08` |
| `CT_PLINTH` | **Real.** Solid z 0–3.1 under the whole frontage slab (3.1–3.4), flush north face, continuous to the west end. | `r10-ct-under`, `r11-ct-west-end` |
| D2 Tin Hau hall | **Closed.** Reads as a small temple: own wall material, 0.3 m base course, tiled roof at 7.6 sitting on the cella top with eaves on all sides, carried south over the plant zone by two posts (3.4–7.6) that stand inside the roof outline, upper tier, red door. `A_SCREEN` now reads as a separate wall. | packet `e15`, `07`; `r04-door-side`, `r06-temple-north`, `r14-a-up` |
| R1 yamen hall roof | **Done.** `HALL_ROOF` (5.1–5.35) sits directly on the canopies with about 0.55 m eaves; `HALL_RIDGE` tier above. Corner columns `PORCH_COL_SW/SE` reach the canopy underside; parapet returns `G_POD_WR/ER` are full-height solids. Top view shows one clean roof surface. | packet `e04`; `r07-hall-void`, `r08-hall-corner`, `r09-hall-rear`, `r13-hall-top` |
| R3 window pitch | **Done.** Bays at every 3.4 m from 12.9 to 36.7; towers now read as 8–10 storeys. Faces are clean from the void and the streets. | packet `01`, `02`; `r07`, `r09`, `r14` |
| R7 foundry stair flanks | **Partly adopted, accepted.** `SB1_WALL` and `SB2_WALL` guard the upper halves; the lower halves (drop under 1.7 m) are recorded as open by intent. `FLIGHT_OPEN_SIDE` still lists all 24 sides, including these. | `r03-foundry-cut`, `r12-sb1` |

Non-gating notes:

- **N1 Temple door is a detached sheet.** `TINHAU_DOOR` is 0.08 m thick and stands about 0.22 m in front of
  the cella's south face, starting 0.02 m above the base course, with no frame modelled (the disposition
  says "framed"). From the front it reads correctly (`e15`); from the side it is a free panel with a gap
  behind it (`r04-door-side`). Repair: make it 0.25–0.3 m deep so it touches the wall, start it at z 3.7,
  and add a lintel/jamb surround if a frame is intended. Non-colliding, no gameplay recheck needed.
- **N2 The compiler's roof/wall check no longer completes.** Validation now reports
  `ARCHITECTURE_REVIEW_INCOMPLETE` in place of the 31 `ROOF_STEP_OPEN` items, after the bay count rose to
  929. That is an inconclusive check, not a demonstrated failure; my enclosure findings rest on the
  captures. Worth moving the presentation bays out of `roof` elements so the check can finish.

Deferrals: I accept **R2, R4, R5 and R6** as art-pass items. None affects enclosure, support or the world
edge now that the frontage street stands on solid ground. R4 (sliver towers) and R6 (ledges at the 6.8 m
line) should be picked up before any export that bakes tower meshes.

Not re-inspected in R02: indoor ceilings outside the foundry, the lane stairs, `EL_PIER`, `COURT_URN`,
`HALL_RET_W/E` and the re-proportioned Kwong piers (gameplay repairs outside this scope).
