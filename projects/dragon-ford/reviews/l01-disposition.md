# L01 layout reviews — disposition (author record), realized in R01

Inputs: `l01-strategy.md` (ST-*), `l01-spatial-centre.md` (B1–B4, R*, C-P*), `l01-spatial-sites.md` (B-0*, CT-0*, A-*, E-*, X-*). All three returned **changes required**. R01 = the L01 layout with these changes, compiled as the production blockout (`level.aml`, layout data in `layout-r01/`). The layout drawing and the AML come from the same source (`layout.py`), so the R01 compiled review is also the return review of these findings.

| Finding | Disposition | Change in R01 |
| --- | --- | --- |
| ST-01 spawn clusters | Adopted | Five spawns per team declared (T x 47–57, y 4–7.5; CT on the frontage near the Youth hall door). Extra journeys: CT→A via mid, T→B mezzanine via East lane, attacker pivot A→B, both outer CT routes. |
| ST-02 / E-03 Fishball perch and catwalk | Adopted: removed | `FB_ROOF`, `FBR_W`, `CATWALK`, `G_CAT` deleted; `G_MS` closes the west arm. |
| ST-03 / C-P4 terrace cover | Adopted | `PLANTER` replaced by two transverse planters (1.25 m) and a tall stele at the west end. |
| ST-04 / ST-09 / CT-04 records | Recorded | The Youth hall is deliberately the defenders' hub with a hidden A↔B rotation (101 m) because measured walks showed defenders could not reach both sites in time from a street-only spawn; the exposed terrace remains the short rotation (85–87 m) and attackers can cut the hub from the west lane top and East lane. `LUNG_E` is retained: with the east apron feed moved to Kwong Ming's south end, Lung Chun is the attackers' lateral. This reverses S01 dispositions T2 (in part) and T4. |
| ST-05 / P-A2 Dentist back passage | Deferred experiment | A second defender door into A is not added in R01; playtest queue. |
| ST-06 cover watching A SW | Adopted | `A_SW_BLOCK` tall block inside the lot. |
| ST-08 gallery keystone | Open | To be tested at blockout/playtest. |
| B1 apron seen over ruin wall | Adopted | `RUIN_WALL` 3.4 m. |
| B2 hall does not hide front court | Adopted and extended | Hall rear wall 15 m with two end doors under 2.1 m lintels; roofed porches over both podiums (new `PODIUM_W/E` with mass parapets) so high lines over the front are cut. |
| B3 / CT-01 Youth hall see-through | Adopted | Back-yard door reduced to 2.4 m at the west end; partitions `YOUTH_PART_W/C/E`; south aisle behind the door. |
| B4 terrace edge at SY2b | Adopted | Mass parapet `G_STRIP_E`. All terrace/podium balustrades are now built as mass (exact faces). |
| R1 / C-P3 School stair | Adopted in modified form | Flights side-stepped (2.9 m lateral offset across the landing) instead of a half-turn, because the gallery must keep its void-side wall; `GW1` starts 2.4 m past the crest; `GAL_W`, `GW2`, `BACKDOOR` staggered. |
| R2 / C-P5 / CT-02 East lane axis | Adopted | The two flights are 2.4 m wide and side-stepped (west then east), so the lane has no straight axis. |
| R3 Lung Chun W diagonals | Adopted | The road now ends in a north turn into a smaller Well Court (no straight through-line). |
| R4 / C-P6 front court cover | Adopted | Stele (2.3 m) in the west half; cannon 1.25 m; lions 2.1 m. |
| R5 / E-01 Kwong Ming tube | Adopted | Two full-height piers form a chicane; Plastics yard retained. |
| R6 / R7 | Adopted | Covered by B3 partitions and door staggering. |
| X-01 low cover height | Adopted | All crouch cover is 1.25 m. |
| B-01 tongue edge, pit, pockets | Adopted | `G_T3`; `FURNACE` enlarged and `FURNACE_S` fills the pit. |
| B-02 boiler | Adopted | 4.2 m, 4.8 m wide. |
| B-03 Coffin lane screen | Adopted | `MEZZ_SCR_W` lengthened. |
| B-04 mezzanine supports | Adopted | Four posts drawn as cover; SB1 side wall. |
| B-05 west floor stop | Adopted | `MOULDS` tall rack replaces the sacks. |
| B-06 B retake from above only | Open (strategy) | Intentional identity of the site; playtest question. |
| B-07 SB1 guard | Adopted | `SB1_WALL`. |
| A-01, A-02, A-P1 | Adopted | Crates bedded into the wall; screen attached to the hall; Dentist partition. |
| E-02 yard/workshop door alignment | Adopted | Yard door moved south; drying racks across the workshop. |
| Colonnade has no columns | Accepted as naming | Renamed "Free School arcade" (two portals through the wall). |

Residual long lines in the R01 scan (≥32 m, standing eyes, 1 m grid) are listed in `evidence/r01/sightlines.txt`. Those above 35 m are: inside each spawn street; `GALLERY`↔`Y_STRIP`/`EL_TOP`/`EL_MID` 37–39 m (the intended window-to-terrace relation across the void); `COLONNADE`↔`Y_FRONT` 38 m (arcade opens onto the court); and door-to-door threads of 2–15 sample pairs (`COLONNADE`/`LUNG_W`↔`RUBBISH`, `GALLERY`↔`Y_FRONT`, `KWONG`↔`T_APRON`).
