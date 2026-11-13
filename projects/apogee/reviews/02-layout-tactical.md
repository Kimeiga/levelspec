# Apogee L01 — independent strategy / player-behavior review

Verdict: **accepted for layout**, with the timing and mechanic questions below retained for blockout/target-engine testing. This is drawing-based acceptance, not a balance claim.

Inspected the user brief, `brief.md`, rendered `generated/apogee/layout-L01.png`, `layout.svg`, `inventory.md` and `plan-data.json` before author rationale or other reviewers' verdicts. Scope: whole map and focused Cleanroom / Data / B Control interfaces. Target 5v5 one-life, two-site defusal; provisional conventional rifle and smoke/flash tactics; body and speed are harness values, not verified CS parity.

## Relationships and responses

- **5v5 default:** two A defenders can separate the south-front sightlines from the rear/bridge route. Two B defenders can cover Airlock/Data pressure from Cryo-side and Control/Decon-side positions. The remaining defender is an **Archive/Data flex holding Mid exits**. Calling this player an early Calibration occupant would imply an unsupported timing claim: Ts reach central Calibration well before a CT coming through the north descent and Data. The author accepted this role clarification.
- **T 2–1–2 probe / 4+1 execute:** Calibration can turn west onto the Optics stair or east into Cleanroom, then Data. These are real intermediate decisions, unlike a forced return through Cable. A main group can stage in Airlock while an Optics partner changes the front; B main can use Airlock while a Data partner enters from the west. A lone lurker must cross real contested space to reach Archive/CT rotation; the upper crossing grants no magical transfer.
- **Five-player rush:** the 4–6 m declared thresholds offer usable approach widths on paper, with adjacent rooms for a follower. They do not prove multiplayer throughput. CT B-front setup appears earlier than the shortest T Airlock contact. A is likewise not shown to be lost to a spawn race. A Rim journey spends substantially more time than Mid→Optics; a learned slow route may become situational, which is acceptable pending play evidence.
- **B loss and retake:** Cryo divides east plant space from the west-side entry, but does not protect the holder from both Airlock and Data together. B Control reaches both the west/north site entry and Decon's eastern site entry, making a paired retake spatially possible. A lone retaker has to choose an entry and clear the corresponding Cryo side; no geometry implies effortless solo retake. An opponent controlling Archive can interrupt the common CT descent path and force a slower response.
- **A 2v2 postplant / 1v2 retake:** the telescope pier prevents a single continuous front/rear sweep. Control's north entry and Skybridge's east entry approach the plant from distinct sides; attackers have to divide attention or move. Front Airlock/Optics openings remain relatively close and can be held as a front, but Ts can coordinate their approach without every defender position automatically covering both through the central pier. The exact pier silhouette and rear bench exposure require compiled opposing views.
- **3v5 / casualties:** a CT loss near Archive has a map-wide cost: B reinforcement and the northern rotation become threatened. CTs may concede Calibration rather than spreading three survivors across every room. Ts taking Data get a B split and the next decision of pressuring Archive, rather than a free line into CT spawn. These are plausible choices to test, not observed player behavior.

## Timing limits

Doorway-polyline estimates use 3.4 m/s with no acceleration, collision, utility, aiming or clearing cost. They are not measured movement results.

- CT initial B-front setup is approximately 12–15 s; T Airlock first contact is approximately 18–22 s. Different spawn slots and exact cover paths may change these estimates. No demonstrated first-contact defect warrants moving a spawn on this evidence.
- The full A plant→B plant northern journey is approximately 100–110 m, or **29–33 s before clearing**. This is a material late-retake risk with an unspecified bomb clock. Describe it as a protected/costly rotation, not a proven quick rotation. A late full-site anchor cannot be assumed to arrive and clear/defuse in time. An Archive flex rotates from a closer starting position, and earlier information can change the response.
- Holding B Control does not instantly cover Decon: moving through P37 and preparing the east entry takes additional travel and attention. Synchronization remains a team task.

## Reconciled findings

1. Initial packet's P14/P15 graph-to-line mapping was swapped: x44/y94..99 belongs to A Control9↔CT Ops10, while x42/y78..82 belongs to A8↔Skybridge12. Author corrected current `plan-data.json` by swapping the coordinates: current P14 is A8↔Skybridge12 at x42/y78..82, and current P15 is A Control9↔CT Ops10 at x44/y94..99. Labels follow that mapping; the drawn spatial interfaces did not move. Closed at layout scope.
2. “1mid” default implied an unsupported early central CT arrival. Author accepted Archive/Data-flex interpretation. Closed as brief clarification; first contact remains a blockout measurement.
3. The costly full-site rotation remains an explicit risk for timing/playtests. No target clock or target-engine motion calibration is available, so it is **not** a fabricated pass or a supported reason for an arbitrary geometry repair.

## Required next evidence

Blockout: replay each approach, CT descent and both B retake entries; inspect paired Airlock/Data→Cryo views, A pier front/rear exposure, spawn offsets, standing/crouching cover and support from the following player. Measure actual harness route distances/times and confirm IDs survive modeling. Collision-aware single-body replay cannot establish team throughput.

Target engine / participants: five-T rush setup margin at each site; 4+1 B execute with an adaptive defender; 2v2 A rear/bridge retake; 3v5 site loss; measured rotation **plus clearing plus defuse** against the chosen clock; sniper holds after opponents learn Transit and A rear. Weapon penetration, smoke shapes, sound, economy, utility and multiplayer body blocking remain unavailable. These limits do not close through compilation or a screenshot.

## Focused L03 Optics / Mid interface amendment

**Accepted for layout.** Independently inspected current L03 `plan-data.json`, relevant P09/P11/P12 entries, and rendered `generated/apogee/layout-L03-spatial-check.png`. The Optics floor now follows [(26,48),(38,48),(38,50),(42,50),(42,60),(26,60)] at Z4, removing the southeast 4×2 m overlap over Calibration/Mid while retaining the stair exit at x33..37/y48. The eastward widening occurs north of y50. None of the Airlock, A-front or stair connections move; OP-S1 and OP-L1 remain in the retained room footprint.

This is a construction-interface correction. It creates no new route, removes no player choice and does not change the previously reviewed tactical route sequence or timing conclusions. No tactical rework is supported. Compiled support/headroom and body passage at the inside corner remain the spatial blockout check; prior multiplayer and timer limits remain open.

## Focused L04 bridge / CT stair repair proposal

**Accepted for local tactical layout.** Inspected actual R03 source/captures (`capture-r03/skybridge.png`, `CT-ascent.png`, `overview.png`) and the exact proposed coordinate changes before dependent modeling. SK-L1 moves from y78.5 to78.18, meeting the south bridge wall; SK-L2 moves from y82 to82.32, meeting the north wall. Their 3×1.5 m footprints, base4/top5.25, alternating sides and cover roles remain fixed. Filling each0.32 m wall-side strip removes space too narrow for the0.60 m body and preserves approximately4.14 m clear passage past each refuge. It adds no hiding angle or new approach, and keeps the intended retreat/preparation sequence.

Move the CT stair west enclosure0.30 m into the6 m flight to exclude the shoulder-clipping strip at the neighboring bridge/spine slab. More than5 m clear width remains, sufficient on the drawing to preserve the same route and ability to follow/support; actual multiplayer passing is not proven. This addresses an unusable fringe rather than changing the stair's tactical commitment, entries or destination. Source/plan/inventory should record these exact edits; final compiled collision evidence is still required.

Adding semantic metadata for the37 real portals and the existing Optics landing is accepted as a plan/model handoff repair, provided no phantom connection or weaker route assertion is introduced. It does not create a new tactical edge. The unchanged route assertions and actual physical paths must remain in the final evidence. Full blockout tactical acceptance remains pending final revision-matched views and checks.

L04 drawing follow-up: visually inspected `generated/apogee/layout-L04.png` and checked current L04 plan coordinates. The two cover footprints and labeled CT stair offset match the accepted proposal; acceptance stands. Northward flight's negative left-side offset moves the west enclosure east/inward; intended inner face68.45 and approximately5.25 m clear width do not alter this tactical judgment.

## Focused L05 physical stair refinement

**Accepted for local tactical layout.** Visually inspected `generated/apogee/layout-L05.png` and checked the R05 source's S-CT axis/width and unchanged P17/P36. The actual flight is narrowed to x68.30..74, center71.15, width5.70 m, with guards on the actual edges and approximately5.1 m clear. This removes the outer tread fringe left by the earlier guard-only offset; it retains both x69..73 entrances, the same level transfer and all previously reviewed tactical choices. No player-body or route requirement was relaxed. Compiled R05 evidence is evaluated separately below/in the blockout review.

## Focused L06 Intake / T-pocket visibility repair

**Accepted for local tactical layout.** Inspected `generated/apogee/layout-L06.png` and current L06 plan data. IT-S1 extends west from x44 to42 and widens from2 to4 m, retaining y20..26, base0/top3.2. The14 m Intake width retains nominal4 m west and6 m east circulation bands, plus6 m above the screen before P19. No threshold, level transfer or room connection changes. This is a proportionate repair to the64 observed Mid→T-pocket offset leaks including actual T anchors; fixing the center ray alone would not suffice. Final compiled optical checks must close those exact pairs and recheck body passage around the expanded screen.

Retain the separate69.26 m Transit(57,78)→Boot(36,12) channel as an intentional rifle/sniper study for playtesting. It passes P22/P19/P05 and ends in Boot exit territory, rather than an actual T-spawn anchor. A Transit occupant must first obtain that territory and commits attention to the channel; Ts can prepare outside its line behind Intake/Mid screens, change route at Calibration to Optics or Cleanroom, and use Data→Archive pressure to threaten the Transit position from the east. These are geometrically supported options, not proven utility/trade outcomes. Do not add an arbitrary crate solely because the sampled distance is long; test whether this hold actually dominates rushes, probes and late rotations before further repair.
