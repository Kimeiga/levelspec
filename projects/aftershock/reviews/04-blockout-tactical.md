# Independent strategy / player-behavior review — R06 / L03

**Accepted as a geometry blockout for engine integration and 5v5 playtesting.** No further tactical geometry repair is required by the inspected evidence. This is not competitive-balance acceptance or a claim that the harness implements combat. I inspected actual raw compiled images before considering the author's repair rationale, then compared the editable AML and L03 layout with movement, stance and optical evidence. I did not edit map geometry.

Source `level.aml` SHA-256: `3bbcb27ad9f1d32dbc107d84ba92e38f5d0465f53bbb5ddad4a0adb6ff2913e7`. Physical hash: `bef90ee7785c41cc7d8e0752fd88ee5a0e0cee56f0d6ae79d27f1d98c4df5c3e`; render hash: `f727ea5656854a9a75d3a67e41c136b3f849dadfb0b10fe4b11baa80ee5f9c4c`.

## Inspected evidence and capture correction

The valid final main views are `generated/aftershock/capture-verified-r06b/` (16 views); focused opposing/follower views are `capture-independent-r06b/` (12 views). Both manifests match R06 and report no browser errors. I visually inspected the A arrivals, B approaches/retake, S1/S3/S4 intermediate/follower views, upper-to-lower overwatch and reverse views. Actual helper standing/crouching captures in `stances-r06/` verify supported body/eye states at three low fixtures, A inner arrival and both western crests.

Earlier `capture-final-r06` and `capture-independent-r06` images were incorrectly identical distant overviews. I caught this by viewing the images and checking their actual camera state; their completion manifests are not accepted camera evidence. The corrected scripts assign camera fields atomically and verify the actual requested camera before capture. `capture-r06` stopped on a timeout after A-low and is only partial diagnostic evidence. None of those superseded runs substitutes for the verified final sets.

`walk-r06b/report.json` contains22 passing directed checks: six main deployment journeys, four stair journeys and the east site rotation, each in both directions. These use the unchanged radius.30m/standing2m/step.25m body, navigation plus bounded physical support/body checks at1/120s; they are not continuous sweeps or multiplayer body-blocking tests. The independent opening and inner-Red checks below use the same mechanics and frozen source.

## Opening and timing results

Recorded selected full journeys at3.4m/s harness walking speed:

| Journey | Seconds |
| --- | ---: |
| T Cable Seam to B plant |19.88|
| T outer Red to B plant |24.56|
| T outer ascent to A plant |23.06|
| T turning ascent to A plant |27.33|
| CT to A plant |16.75|
| CT to B plant |18.83|
| A→B east rotation / reverse |28.00 /28.03|

These are performed explicit steering paths, not shortest-path proofs or authenticated CS timings.

The L01 CT gate issue is now closed at blockout level for the tested setup. My additional `opening-r06/report.json` walks all five unchanged spawn offsets on each team, ten passing runs. CTs reach the east B contact corner `(80,51,0)` in11.65–13.41s; Ts reach service emergence `(54,50,0)` in14.69–15.92s. The slowest tested CT therefore arrives approximately1.28s before the fastest tested T on these paths. Independent optical probes confirm those two contact positions can see each other at both standing and crouching eye offsets. This is a modest but real setup opportunity, rather than a claim that CTs already own the attacker-side corner or can win the gunfight. Aim, equipment, acceleration, spawn release and simultaneous bodies remain engine checks.

## Local encounters and team behavior

**A's coupled western frontier works as a developed encounter.** The real car blocks the outer western journey's direct eastward view while the inner receiving strip arrives beside its southern nose. The CT reverse view can see the inner arrival and plant relationship, but the car hides the outer western arrival in the tested poses. This supports two teammates arriving around different sides of the wreck without claiming opposite-site flanks. The outer journey is approximately4.27s faster than the turning ascent, so a coordinated split needs a staging/wait decision. S1/S3 follower views retain room to climb, while guards and the gallery turn delay a follower's view of the leading player's next duel; they do not prove an automatic trade. A grouped staircase attack still needs team timing and the assumed utility.

**B's actual trains separate service and southern pressure.** Service emergence faces a closed train mass and nose, then opens toward the other car's flank; the Red arrival sees a different plant-side relationship. Fan's reverse view reaches the north side of the collision before the plant itself is exposed. CT can hold or retreat along the eastern receiving area, while a T service player can pressure that hold and a Red player later threatens its south side. Solid train bodies and cosmetic windows do not create underbody/window passage claims. The full short service route is only about4.68s faster than the selected outer Red route, so the southern option can participate in a timed split rather than being merely a theoretical distant flank.

**Retakes and defaults remain manpower decisions.** A2/B2/flex1 is plausible, but the flex cannot simultaneously cover both objectives and all transfers. A's train/Signal and B's two cars allow a pair to divide first appearances, reposition and regroup. In3v5 after site loss, maintaining both objectives and both transfer ends is not a credible coverage claim; defenders must choose the retake or remaining territory. In2v2 postplants, A attackers can divide the train wrap and inner preparation, while B attackers can divide Fan denial and the southern plant relationship. Those roles expose one another to different pushes rather than establishing one invulnerable position. An isolated1v2 player has local masses to change the next duel, but is not expected to hold every approach indefinitely.

The performed28s east rotation makes commitment consequential. It is not an emergency lateral shortcut. A late western or full site-to-site flank must not be credited as counterplay without sufficient remaining clock. Exact postplant and late-switch viability must be tested with the eventual mode clock and engine speed.

## Red overwatch return and counterplay

R06 genuinely exposes some outer Red track positions to long-range upper-tail/S4 overwatch. The scanner's longest sampled ray is approximately77.38m. My independent R06 probes confirm the east half of the selected outer Red journey is visible from some upper-tail/crest poses; its western half is hidden in the tested pairs. These perches do not see the tested A plant, A western/inner frontier, B plant or B service emergence. A CT spawn offset can separately see one standing Cable-preparation point; its crouched target is occluded. Consequently a universal two-site camp was not established, but the earlier idea of a wholly concealed Red journey must be qualified.

The supported inner-rim alternative provides concrete counterplay. I performed the unchanged standing-body path through `(44,21)→(50,22.5)→(55,25)→(60,28)→(64,30)` to B and back: both passed,22.98/23.09s. See `inner-red-r06/report.json` and `independent-tactical-r06/inner-red.mjs`. It does not require a jump, boost or reduced body and is faster than the outer track walk.

A focused optical study along25 performed inner-path samples tested five upper observer positions, body-height points.5/1.1/1.86/2m and.25m lateral offsets (2,500 rays). The central inner arc was occluded. Standing head/upper-body samples first become visible around `(57.24,26.30)` as the route opens toward B; all tested.5m and1.1m samples remain blocked in that sampled segment. Independent visibility review likewise identifies a protected inner journey with a final standing commitment near the B mouth. These are bounded static optical observations, not proof of uninterrupted ballistic safety.

I accept retaining this differentiation: choosing the exterior rail offers exposed distant overwatch; moving along the inner wall limits that information and reaches B from the south; the final arrival still commits. Occupying the upper lookout costs one defender's attention and body without covering either plant or A's attacking frontier. A localized screen remains a reasonable playtest experiment if that lookout dominates real rounds, but current evidence does not require it. Do not describe crouching alone, hypothetical smoke coverage or an untested late flank as the sole answer to the hold.

## Remaining limits and focused playtests

No observed ten-player matches, weapons, penetration, grenades, audio, network peeking, multiplayer collisions, economy or objective timers were tested. The structural reviewer owns the reported S4 edge-warning adjudication; tactical acceptance does not waive a supported physical defect.

Prioritize5-player service rushes against the measured B setup, timed A two-ascent splits, outer versus inner Red usage against a learned upper sniper hold,2v2 retakes around each train arrangement, and late rotations under the actual clock. Record whether defenders retain the setup margin with real movement and whether the long lookout consumes a meaningful role or suppresses the southern route too cheaply. Competitive balance remains open until those engine playtests exist.
