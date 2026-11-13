# Spillway — independent tactical blockout review

Scope: plausible strategic choices and player behavior, independently assessed against actual compiled geometry. Applied the FPS review, strategy and combat-geometry skills. This report does not replace the separate spatial/visibility assessment.

## Inspected evidence and disposition

The first blockout assessment inspected R03 `generated/spillway/capture-r03/loaded.aml` and its provenance-bearing `capture.json`, source SHA256 `31cb550a6e4dad577429319749c292ac3a893eefe327f4aca06796519cd2a60e`. Visually inspected overview/top and the standing/low bridge bay, reverse mid, underpass, both north stair directions, south stair approach, both ramp directions, A entry/holder/connector and B east/short/holder views plus east elbow. Read the R03 route replay and actual route paths. Current R04 removes buried ground beneath the filled ramp support; R04 final-view identity recheck is recorded below when available.

**R03 tactical blockout disposition: accepted for blockout delivery, with target-engine/playtest limitations.** No supported consequential tactical geometry defect requires repair based on this evidence. This accepts an inspectable prototype, not proven competitive quality. It does not certify crouch physics, live trades, utility, audio, bullets, multiplayer collision or objective rules.

## Actual geometry observations

| Relationship | Observed in compiled views | Implication and remaining limit |
|---|---|---|
| U-V / south mid | The standing bay view sees south mid and M-01's side, while the saved reverse view shows the bay opening above the bridge. The low-camera view at [49,59.2,5.05] is screened almost entirely by the parapet, with no useful ground view. | The saved low pose does not support the feared useful tiny-exposure crouch peek. The standing pose offers surveillance in one direction while the bridge ends remain separate threats. No player mesh or weapon is present, so visible body fraction, head exposure, backed-off peeks and hitbox fairness remain unverified. |
| Underpass / upper crossing | The lower view passes under the slab toward north mid. Screens bound the upper deck; the overview shows two distinct occupied elevations rather than one intersection. | Ground control does not immediately grant bridge control. Upper occupation does not see through U-N into defensive north-mid circulation. Clearance/route replay supports the modeled separation but is not continuous collision proof. |
| A gate / A-01 | The entry view opens onto the painted plant region, A-01 and low A-02, with S-02 on the right. The holder-side view is heavily screened by A-01/entry-side geometry and shows a restricted gate direction. | The crate enables a directional hold requiring a side peek or position change. It does not provide an omniscient view. A gate take still needs clearing and support; the imagery alone does not establish a follower's trade window. |
| A ground connector / S-02 | The actual connector view shows the filled stair side occupying the line into A. Both north-stair views show a long bounded climb/descent with an open end. | The clarified rear-flank interpretation is correct. A lower-mid teammate must reach the stair foot/rear circulation to contribute from that side; the teammate cannot instantly shoot across the flight into A. Upper and ground approaches have distinct commitments. |
| B east / B-short / B-01 | From east entry, B-02 creates a near check and much of the plant region is screened. From B-short, plant-side space and the other side of B-01 are visible. From the saved B holder pose [78,77,1.6], B-01 blocks the direct east-entry view. | Cover value changes with approach direction. A defender must expose a side peek or rely on another player for east information; a coordinated short/east approach can change that hold. This is a plausible split mechanism, not a demonstrated successful execute. |
| R-01 / upper ends | Ramp views show a bounded slope and open bridge connection at one end, with ordinary ground approach at the other. | The bridge reaches B's east approach rather than granting a protected route behind every B defender. Upper control can reposition a group but does not automatically capture B. Ascending-player versus defender body exposure and escape timing require engine tests. |
| E-01 / elbow | The elbow view is stopped by the baffle's near face, with a side path to continue. | A player can stage before a further check; a follower cannot be assumed to see through the same baffle. The space avoids a straight full-length approach view without proving utility coverage. |

## Action and response traces

**5v5 opening and commitment.** A distributed attacking default can probe west, lower mid and east, but T-01/M-01 prevent one central camera pose from resolving the whole defense. The defenders' shorter site setup routes give room for initial positions. If lower-mid attackers encounter a hold, they can prepare a split or investigate S-01 instead of automatically climbing. A defender holding a bridge end gives up coverage elsewhere. After an A commitment, a ground-mid partner must clear A rear around S-02; the gate group cannot rely on an immediate crossfire through the stairs. For B, the actual short view reaches plant-side space that the east view does not show, making timing two directions a plausible use of teammates. An opposing team can choose to concede upper control and hold its exits, challenging the intended bridge-first plan.

**5v5 rotations and fakes.** West or east contact can induce reinforcement, but contact does not identify the bomb. A site holder can retain coverage while another teammate seeks information or travels. Losing a site changes the value of rear circulation and its entrances. Taking mid creates a shorter contested ground continuation between sites; conceding it pushes defenders toward their rear network. No safe rotation or fake is guaranteed to complete before a live clock expires.

**A 2v2 post-plant.** A planter near the painted area and a partner watching gate/rear give distinct information, but A-01 and S-02 also separate the partners' views. Retakers entering from rear and gate can change which side of A-01 is protected, provided their arrival times and remaining clock allow coordination. The planted area is large enough that the chosen point matters: the saved center-region views do not prove every plant can be defended from the same hold. A remote west-long partner may be unable to assist a fight near the rear without moving.

**B 2v2 post-plant.** A player behind B-01 can conceal position from east, but the compiled short view exposes the plant side. A partner covering the opposite direction offers information at a manpower cost. Retakers can synchronize short/rear pressure or stay close enough to support one contact; the better choice depends on information and time. B-02 stages an extra east-side check, so live attempts should test whether entry/follower spacing produces useful support or serial deaths.

**1v2 post-plant, either site.** One survivor cannot observe all entrances. The meaningful options are to hold a chosen plant angle, isolate one approaching opponent, reposition after discovery or force retakers to interact with the bomb. Two retakers can coordinate different directions or protect the defusing player. A long bridge rotation must fit the remaining clock to count as an answer; its mere existence is insufficient. There is no claim of equal winning chances for the solo player.

## Distances and interpretation

R03 compiled navigation reports T→A 73.24 m, T→B 83.21 m, CT→A 34.13 m, CT→B 36.51 m and upper crossing 38.14 m. These are route distances, not measured player seconds. Standing replay distances differ slightly where the physical stair/ramp support is followed rather than a simplified navigation segment.

**The 64.60 m `A-B-rotation` is a contested-mid shortest route, not a rear-gallery-only route.** Its actual path runs around S-02's north foot, through A-short near [35.67,77.45], across north mid near [55.67,73.45], then B-short. Do not use this value to certify a safe defensive rotation. A separately constrained rear-gallery journey and target-engine travel should be checked if precise rotation timing is needed.

R03's thirteen standing inspection route replays and sixteen placement checks passed with the declared body. R04 replay also reports all thirteen routes passing with the same body. These are useful traversal evidence, not combat behavior or continuous capsule sweeps. The separate spatial review remains responsible for construction interfaces and inaccessible components.

## Open engine/playtest work

- Add actual player/weapon geometry and target-game eyes; compare over-parapet and side peeks from both sides, especially U-V and rising R-01/S-02 approaches. The saved low camera is a visibility study, not tested crouch movement.
- Exercise two-player entry/follower support at A gate and both B entries, then repeat against two coordinated defenders. Record successful and failed trades and fallback timing instead of inferring them from camera separation.
- Implement actual spawn sets, plant volumes, round/bomb clocks and defuse behavior. Markers and painted floor partitions currently communicate intent only. Test several points within each footprint.
- Test smoke, flash, incendiary/projectile clipping, penetration, audio, jump/boost access, body blocking and collisions in the intended game engine. No particular grenade is assumed to solve an observed check.
- Run 5v5 adaptations, including bridge concession, earlier site pressure and fakes; then 2v2 and 1v2 late-round cases with varied remaining clocks. Record time, utility, territory and player explanations. Balance and strategy diversity remain unobserved.

No multiplayer playtest, bot combat simulation or measured engine combat mechanic was performed by this reviewer.

## Final R04 identity, support and route recheck

**Final disposition: R04 accepted for tactical blockout delivery, with the engine/playtest limits above remaining open.** Independently checked that `projects/spillway/level.aml`, `generated/spillway/capture-r04/loaded.aml`, the main capture manifest, `capture-support-r04/loaded.aml`, the support capture manifest, `walk-r04.json` and `probes-r04.json` agree on source SHA256 `f8289e0063da85f3466b8124f13a439c9190acb891a7f7e517cda6ac35d9e784`.

Re-inspected R04 overview, standing bay, A connector, ramp-down and B holder images. Seventeen of the nineteen principal PNG files are byte-identical to R03; the remaining ramp-down and B-holder images were visually rechecked and preserve the same tactical relationships. The buried-floor removal introduces no new supported tactical objection. All thirteen standing route replay records have `passed: true`; all sixteen placement records have `ok: true` with the unchanged body. These records retain the sampling and movement limits stated above.

Visually inspected the four additional actual R04 support/rear views:

- **A follower [17,59,1.6]:** the follower sees the same front crate/plant-side region as the gate entry while gate blocks constrain the sides. This supplies a useful shared-forward-view relationship; it does not show every possible defender or prove an immediate trade. Side peeks and entry timing still matter.
- **B east follower [89,62,1.6]:** B-02 screens part of the site while the route continues beside it; the follower's view opens differently from the nearer entry pose. Teams must move/support deliberately rather than assume identical visibility through a baffle. No unavoidable serial-death claim is supported without opponents and mechanics.
- **A rear retake [22,84,1.6]:** low A-02 screens the immediate lower plant direction while higher/side site features and S-02 remain visible. A planter's exact point and body position change what can be observed or contested. The rear entrance does not automatically expose every possible plant from one stationary pose.
- **B rear retake [77,82,1.6]:** painted plant space is directly visible alongside B-01, with the ramp/entry-side geometry beyond. This corroborates the useful difference between rear and east views without proving the retake succeeds.

The additional source-matched in-memory geometry probes close the previously unmeasured route relationship: A-gallery [34,75,0]→A requires **22.46 m** around S-02's foot, and that replay passes; it does not cross through the stair body. A separately constrained A→[22,84]→[48,86]→[77,82]→B rear journey is **72.66 m**, with all four segment replays passing. It is distinct from the **64.60 m** contested-mid shortest route. These are geometry distances under the named route constraints, not measured travel seconds or guarantees of uncontested circulation.

No consequential tactical finding remains requiring a blockout geometry repair. The retained work is concrete target-engine mechanics and multiplayer evaluation, not an unperformed certification. The original action/response scenarios remain testable with this delivered geometry.
