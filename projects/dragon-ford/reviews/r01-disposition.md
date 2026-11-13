# R01 compiled reviews — disposition (author record), realized in R02

Inputs: `r01-strategy.md` (accepted), `r01-spatial-centre.md` (changes required: N1, N2), `r01-spatial-sites.md` (changes required: N-01, N-02), `r01-architecture.md` (changes required: D1, D2). The two section reviewers swapped sections between L01 and R01, so each L01 repair was assessed by a reviewer who did not design it.

| Finding | Disposition | Change in R02 |
| --- | --- | --- |
| Arch D1 / Sites N-01 / Strategy R-09: hole under `SB2b` | Fixed (rule) | Every flight that starts at a half-level now stands on a solid plinth down to the storey base (`*-plinth`), which also covers `SLE2`, `SW2`, `SS2`, `SY2b`, `SLW2`. `SB2_WALL` closes the flight's south flank. |
| Sites N-02: frontage street floating | Fixed | `CT_PLINTH` solid ground z 0–3.1 under the whole street. |
| Arch D2: Tin Hau hall reads as a crate | Fixed | Own material, base course, tiled roof with eaves carried over the porch on two posts, upper roof tier, framed door. Roof, base and door are non-colliding; the posts are real. |
| Centre N1: porch sides open onto the hall steps | Fixed | Mass parapet returns `G_POD_WR/ER`, with corner columns that also carry the porch canopies (N6). |
| Centre N2: hall end doors re-open lines to the front court | Partly fixed, remainder recorded | Return walls `HALL_RET_W/E` inside both rear doors (reviewer's tested what-if: inner court → front court to 0). The residual high diagonal from the gallery/west lane top to the front court is retained as a thin long line; re-scan in `evidence/r02/sightlines.txt`. |
| Centre N3: hall rear doors 2.08 m clear | Adjusted | Lintels raised to 2.2 m clear. |
| Centre N4 / Sites CT-02: East lane diagonal | Fixed as tested | `EL_PIER` on the landing. |
| Centre N7: empty inner court | Adopted | `COURT_URN` (1.25 m). |
| Centre N8: T spawns seen through the Gate tunnel from Cannon Court's west third | Retained | Attackers' own forecourt; no defender-first space sees a spawn. |
| Arch R1: yamen hall roof reads as a shed | Adopted | Non-colliding tiled roof with eaves and an upper tier. |
| Arch R3: window bays on a 6.8 m pitch | Adopted | Bays on every 3.4 m storey. |
| Arch R2, R4, R5, R6 | Deferred to art pass | Rear-hall front, sliver lots, shopfront recesses, 6.8 m ledges. |
| Arch R7: unguarded foundry stair flanks | Partly adopted | `SB1_WALL` (0.3 m) and `SB2_WALL`; the lower halves stay open by intent. |
| Sites R-B1: mouth corridor watched from the gallery's west half | Adopted as tested | `BOILER` extended west to u 2.6; `MOULDS` moved 1 m west. |
| Sites R-B2, R-B3, C-1 | Adopted | Screen extended to the wall; `FURNACE_S` 4.6 m; `SB1_WALL` 0.3 m. |
| Sites R-E1: single 1.45 m gap at the Kwong pier | Adopted | Piers re-proportioned: 1.3 m and 1.9 m gaps with 0.3 m overlap. |
| Sites R-E2, R-A1, R-W1, frontage length | Retained / playtest | Recorded long lines; the frontage is the defenders' own street. |
| Strategy R-01: hub rotation is 112.8 m, not 101 m | Corrected here | Terrace 86.7 m, hub 112.8 m, street about 149 m (reviewer's walks). |
| Strategy R-02, R-03, R-05, R-06 | Tradeoffs / playtest queue | One-sided hub cut from the East lane; gallery keystone; split B upper coverage; hall/court possibly skipped for the hidden front-court pivot. |

Residuals recorded after the R02 centre return review (accepted): gallery / west lane top → front court, 17 observer cells, longest 40.1 m, standing only; rear terrace → front court through the hall rear doors, 100 of 591 terrace cells see 11 % of the court, longest 32.6 m, standing only (not reduced from R01; the 2.2 m door heads admit flatter lines). Both are retained as bounded long views into the attackers' first court and go to the playtest queue. `HALL_ROOF`/`HALL_RIDGE` are non-colliding and no visibility result depends on them.

Playtest queue (target engine): gallery outcome across spawns; how often attackers take the East lane before B; whether the hall and inner court are used; a second defender door into A (Dentist back passage); B retake from above; utility, audio and penetration everywhere.
