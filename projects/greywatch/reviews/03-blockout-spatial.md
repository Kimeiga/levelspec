# Independent spatial / structural blockout review — model r2

Verdict: **accepted for the blockout stage within the declared LevelSpec inspection scope**. No supported structural repair remains open in this review. Target-engine movement, combat and multiplayer acceptance remain unperformed.

Source SHA-256: `d976e48cb2564af26159594320232e98fa739d29309a4fc1386d0c75b4de04f6`. Physical hash: `604e2096ea2166357d5b55159c215a2c21ba0baeb7888ad9d4ea05d90f215bdb`. Compared the frozen source, accepted layout r5, actual compiled captures and source-matched physical/navigation evidence. This independent review covers whole-volume composition and physical topology, with detailed A / ward / stairs / lower-mid / bridge assessment. Tactical behavior and the dedicated optical audit have their own independent verdicts.

## Evidence inspected

All 15 actual `generated/greywatch/capture-r2/` images: overview, reverse, plan, T gate, paired A entry/retake, bridge west/east/crouch, paired underpass views, chapel entry/retake and west/east stair views. `capture.json` confirms the frozen source identity and recorded cameras; the capture cameras are inspection views. In particular, `bridge-crouch.png` is a low optical viewpoint, not evidence that the live capsule entered a crouched stance.

Read `build-r2/greywatch.report.json`: playable validation passes with no diagnostics; navigation uses cell0.125 m, coverage spacing0.5 m, 15,404 samples, 15,373 covered, 31 excluded and zero uncovered. The declared playable floor/stair/landing regions form one reachable component. Numerous isolated unassigned samples exist on scenic wall/cap/tower tops; these are not authored playable destinations or evidence of access onto those tops. Sampling is not continuous reachability proof.

Read the unchanged route runner and `walk-r2b/report.json`: all 24 directed checks pass (12 routes each way), including four stair flights, wall walk, underpass, gate/ward approach, repaired mid-to-B transfer, ambulatory, both CT site approaches and rear rotation. This uses radius0.30 m, standing height2 m, step0.25 m and bounded1/120 s capsule/support samples. The report's point-to-point steering measures one-body passage, not multiplayer throughput, combat timing or continuous collision sweeps.

Independently exercised actual stance changes at eight preparation positions against the exported r2 physical mesh/navigation: W bench, A bench/fountain, M well/chest and all three upper low refuges. Unchanged `WalkMotion` and `physicalWalk` admit standing placement, actual crouch height1.1 m and stand release at every spot. Results: `generated/greywatch/spatial-r2/stance.json`. The skin offset raises actual feet to0.01/3.01 m and actual crouch eyes to1.033/4.033 m, leaving0.117 m below cover tops. These checks establish body fit and stance transition only, not concealment or bullet protection.

## Observed result against the layout

The four stairs, separate upper crossing and lower passage survive compilation as the intended spatial relationships. The underpass has a real soffit and side support piers; the two opposing views show its open floor continuing beneath the bridge. The route evidence checks both directions with the unchanged standing body. Stair perspectives show actual horizontal treads, guards, continuous receiving floors and open landings; the route evidence verifies the four rises/descents rather than inferring passage from endpoints.

The formerly blocked east transfer now goes around the E-fall ground end at y54–58. It no longer depends on walking through a filled stair volume. The west stair lower pad receives its first tread. The widened support piers close unused side pockets while retaining the lower-mid throat. No extra seed or weakened body setting was used to manufacture a pass.

`W-court-east` meets the W-fall west edge; S-L01's accidental slit is closed in source and actual plan. The broad intended court arch remains separate. A's outer-ward entry, short arrival and stair arrival retain their distinct directions. Paired court views show the fountain/bench as lower refuges and the eastern stone as a full-height reset, with room to move around their exposed sides. Elevated exposure is conditional: ground refuges cannot be treated as protection from every stair position, and the tall court wall screens some diagonals. This agrees with the qualified layout prediction rather than a blanket cover claim.

The wall-walk pair shows alternating edge merlons and three low refuges, with a clear central route and space to choose either side of the next obstruction. The low view confirms that low obstacles and parapets materially change optical exposure. The stance checks establish that a capsule can duck at the corresponding refuges. Opposing player/weapon models and actual trades have not been tested.

The plan and two oblique views preserve the retained keep, wall thickness, floor rims, stair supports, attached curtain/tower composition and the roofless chapel. Added masses occupy the planned non-floor voids; they do not replace an intended walking branch. Native arch thresholds read as openings with real reveals rather than floating decoration. Both new ambulatory openings remain present; the route runner crosses them in each direction. No surviving exterior wall blocks the revised east entry.

## Investigated apparent floating caps — closed

Bridge perspectives make some battlement caps appear detached from side masses. Checked the actual compiled union mesh rather than approving from intended coordinates. All 165 crown/crenel/merlon boxes have positive buried bottom contact, minimum0.8 m². For bridge-facing `MASS-03-crown-3-0` and `MASS-04-crown-3-0`, the cap bottoms and actual mass tops both lie at z6.5 m; approximately0.845 m² of each cap footprint is buried in contact and0.845 m² remains exposed underneath as an overhang. The visible white region is beneath the cantilevered portion at an oblique angle, not a vertical separation. Retained measurement: `generated/greywatch/spatial-r2/cap-contact.json`. This is physical-contact inspection, not structural-engineering certification.

## Remaining limits

The independent visibility verdict owns the finer rays, spawn offsets and section-by-section exposure results. Stance fit does not establish that arms, feet, weapons or the whole player model remain concealed. There are no human 5v5 results, teammate body blocking, grenade trajectories, penetration, planting/defusing, sound, fall damage or target-engine movement checks. Any map balance or strategy-diversity statement remains a playtest hypothesis. The accepted result is a coherent, inspectable geometry blockout with the declared one-body routes exercised in both directions.

## Final camera / live-stance addendum — same frozen source

Rechecked the final 65° vertical / 90° horizontal FOV views in `generated/greywatch/capture-final/`: bridge west/east, west stair and A entry/retake. `capture.json` retains the same source SHA and frame aspect approximately1.5697. These supersede the earlier wider diagnostic perspectives for FOV-dependent interpretation. The spatial verdict is unchanged; no cone-of-attention or exact combat-FOV acceptance was inferred from the wider views.

Also visually inspected all12 actual browser stance images in `generated/greywatch/stances-r2b/` and read their report: paired standing/crouching at ward bench, mid well, A fountain, B sarcophagus, bridge refuge and aisle bench. The report confirms active physical walking state, actual height2→1.1 m, radius0.3 m, grounded placement, eyes at93% of active height and no errors. Each pair shows standing views over its low object and a materially occluded forward view when crouching; side exposure remains position-dependent. This supplies actual runtime stance evidence in addition to the independent eight-position body-fit checks. It does not imply third-person whole-body concealment, projectile resistance or safe trades.
