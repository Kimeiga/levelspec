# Tidebreak R04 — independent compiled spatial and local review

**Status: accepted as a bounded blockout prototype.** No required local geometry repair remains in the inspected revision. This is acceptance of the spatial experiment and its disclosed costs, not a finding of competitive balance or verified multiplayer trading.

Reviewer was independent of the author and of the reviewers who proposed the portal and G1 changes. I read the brief, editable source, compiled evidence and actual views before the earlier proposal rationale. Applied `fps-map-review` and `fps-combat-geometry`, including the visibility/cover guide. Other reviewers own strategy and architectural acceptance.

Source: `level.aml`, SHA256 `e1bcad31f8af49485acce4a10c4aa88c377979885ded9ef8bcda52adbe724e03`. Mechanics remain radius 0.35m, standing height 1.8m, crouch 1.1m, step 0.25m, maximum slope 42°, ordinary movement. Weapons, objective interaction footprint/duration, utility and round clock are unspecified.

## Evidence and a closed capture defect

I found that the original `generated/tidebreak-captures-r04/capture.json` recorded repeated actual camera poses: images labeled hall, gallery and D2 were still the dock approach. Requested coordinates and advancing frame counters did not prove the camera had changed. Those mislabeled captures are rejected as evidence for their named regions.

The author repaired camera application and added exact applied-pose assertions. I inspected `generated/tidebreak-captures-r04c/` — hall, gallery, D2-arrival, D2-threshold, D2-follower, D2-opponent, dock-head and top — plus the matching baseline D2-opponent image. Their actual poses and loaded-source hash now agree. **Capture finding closed.** The roof-on local views show the actual hulls, stairs, guards and overhead structure; the top image is explicitly a roof-hidden inspection view.

Other inspected evidence:

- `generated/tidebreak-evidence-r04/offset.json`, `baseline.json` and `comparison.json`, with `verify.mjs`: sealed native validation, declared physical-mouth routes, and 16 successful forward/reverse collision-aware walking journeys. These establish those sampled journeys with the unchanged body, not a continuous or multiplayer proof. The conservative physical report confirms one dock route per declared demand; both D1 and D2 were separately walked. Do not convert a semantic count of two into a stronger physical-route claim.
- Independent `generated/tidebreak-local-r04.json`: 39 physically supported positions and 5,928 finite optical queries on the same source hash. The reproducible source is retained as `reviews/probe-local.mjs`; run it from the repository root with a new output filename. Observer eyes are 1.674m standing / 1.023m crouching. Each target posture uses three body heights and three lateral offsets perpendicular to the sight direction. Unsupported points would be excluded and reported; none of these 39 were unsupported. These are static opaque visibility samples, not firing or collision protection tests. Source/evidence files allow the selected pairs to be audited; large query counts do not establish exhaustive coverage.

## Portal comparison: retain the offset variant

The experiment both moves the opening from west-wall y6..14 to y0..4 **and narrows it from 8m to 4m**. Its effects cannot be attributed to position alone. D2 and the remaining built geometry are held fixed.

The corrected opponent views show the old doorway exposing the dock-side arrival while the offset view faces a solid wall in that direction and an opening onto the southern apron. The author's identical-position samples corroborate this: hall hold `(16,2,0)` sees 9/9 standing body samples at D2-top in the control and 0/9 in the offset; it sees 0/9 then 9/9 at the southern apron. The gallery west-rail sample also loses its small D2-top view (2/9 → 0/9).

This stages the contest; it does not generally protect the climber. The arrival can turn toward the hall, remain outside, move north, or retreat down D2. Once it takes the southern turn, the hall hold acquires it. The north rim and the southern yard remain relevant exterior threats.

Independent lead/follower probes make the cost concrete:

| Positions, with unchanged standing body | View toward the same supported opponent | Consequence |
| --- | --- | --- |
| Apron lead `(10.8,3,0)` and follower `(10.8,5.5,0)` | Hall hold `(16,2,0)`: lead 9/9, follower 0/9 | At 2.5m spacing the first player can enter contact before the follower can see that opponent. The corrected threshold/follower images visibly show this wall occlusion. |
| Door lead `(13,2,0)` and following player `(10.8,3.2,0)` | Same hall hold: both 9/9 | Moving the follower to the portal approach restores a common local view. This is a spatial support opportunity, not proof of a timely trade. |
| Same door pair | G1 middle `(17,12,≈2.27)`: lead 9/9, follower 0/9 | A new elevated threat appears for the entrant while the follower still covers a narrower slice. Entering the hall remains a commitment. |
| D2 top and a follower 2.5m down the flight | Hall hold: both 0/9 | The revised door no longer makes that particular hold a direct ascent fight. Other exterior opponents remain possible. |

The performed D2-turn-G1 journey and reverse both pass, at about 8.62s along the selected waypoints. This is not a measured baseline travel delta or contact timing. The two-meter landing-to-wall interval and subsequent southern apron fit the body in those walks. Two simultaneous players, passing collisions, reactions and firing remain untested.

Retain this variant because it creates two legible decisions while preserving an opponent response and a way for the follower to rejoin the fight. Do not describe it as eliminating an ambush, guaranteeing a safe ascent, or improving every team situation.

## Section assessment

| Region | Compiled observation and local consequence | Disposition |
| --- | --- | --- |
| S1, west road and D1 | H1 and the dock construction divide the lower route from the yard. D1's descent, lower wrap and reverse were walked. The lower mouth `(-20,-20,-4)` has a long common view with the west shoulder `(-19,10,-4)` (9/9), while a follower still in the flight does not (0/9). This is a real first-player exposure cost. The existing dock-approach image shows a wide, legible hull-side passage, not an enclosed small room. | Retain direct D1 for this prototype. Do not call it automatically supported merely because the flight is 4m wide. D-M3 remains a bounded future comparison if this entry repeatedly fails under actual play. |
| Dock / A / rim | H1 is a tall continuous screen, and the dock-head image confirms a distinct bow space and recessed D2 throat. A has 0/9 view to D2-top and D1-bottom at the selected positions, so it is not a single hold watching both exits. Near north rim `(-12,28.7,0)` sees 9/9 of standing and crouching A; A sees only the standing rim player's upper samples (3/9), and none when that rim target crouches. Moving the rim observer back to y30 loses A entirely. | The close rim peek is strong and A occupation needs rim attention. It is a deliberate, contestable height relationship, not grounds to relocate A automatically. D-M2 remains deferred: moving A west would also favor D1 and alter macro access. |
| South bridge / hall arrival | The actual bridge is 4m wide, with a 20m water span and longer abutment deck; the selected whole journey and reverse pass. Independent samples show full end-to-end exposure even for a crouched target (9/9). The midpoint is hidden from sampled north rim/east dock-rim positions, while the hall's south-east apron can see the standing bridge player's upper body (3/9) and loses the crouched target (0/9). | Retain one exposed crossing. Guards provide some lateral optical separation; they do not shelter against an opponent along the deck. Both lead and follower can share that endwise opponent view. Retreat after crossing midpoint remains costly. No ballistic claim. |
| H2 shoulders / B | Roof-on hall and gallery views show one shared hall with two hull wraps, overhead territory and bounded doorways. Both ground approaches to B were walked. H2 prevents the west doorway from seeing the east approach. At gallery-front `(28,21.5,4)`, standing B exposes only 3/9 samples and crouched B 0/9; both bow shoulders are more exposed (9/9). The reverse B→standing gallery-front is likewise 3/9. | B is not simply fully exposed under a dominant balcony. Bow movement and occupied B are different states. Preserve this useful common-volume contest; objective interaction size/duration must later determine whether the sheltered state is too strong. |
| G1, G2 and gallery | Both ascents and the cross-gallery route pass in both directions. G1 now meets the gallery at its edge, not through the apse wall/slab. G2 equipment is separated from its flight. The central front position can observe portions of both stair feet (6/9 each), but the rear `(28,25,4)` loses both feet and B, and the stair landings produce additional upper approaches. Crouching behind the solid front guard also loses those lower views. | Retain the present shared gallery. Its front is powerful but requires exposure and attention; its rear trades information for concealment. The proposed central screen is an optional experiment, not a required repair justified by the present samples. |
| S2 / E1 / north exterior | Source and corrected top view show a real exterior route outside the apse, not a passage through the curved wall. The performed north circuit reaches E1 and reverses. The selected S1/S2 and nearby exit optical pairs are occluded. | Accept the sampled circulation. Northern travel is long and sparse compared with the dock/hall interfaces; the macro reviewer owns its round timing. No whole-spawn-area safety guarantee is inferred from these samples. |

A longer later-round sightline remains from G1's landing toward the S1 marker (9/9 of the target body; the reverse standing sample sees 2/9). It is not an opening spawn-to-spawn line. The brief has no respawn, and reaching G1 is itself a territorial commitment. Preserve it as a risk to test if the mode later reuses that spawn during play; do not silently present S1 as permanently protected.

## Proactive modifications and disposition

1. **Adopted and accepted: combined portal offset/narrowing.** Its physical realization, opposing views, follower limitation and reverse walking are now checked. The temporary support gap is retained deliberately.
2. **Defer: a short D1 lower retaining return (D-M3).** The long D1-mouth ↔ west-shoulder view exists, so this is a meaningful experiment. An attached return could give the descending player a staging corner; it would also hide the follower's opponent longer and create a closer ambush. Actual rounds should decide whether the present direct commitment is useful before adding it. Keep A fixed during that comparison.
3. **Defer: a gallery sector screen (layout P2).** A short integrated machinery enclosure along the central front could force the high player to choose a bow shoulder. It sacrifices the present rapid lateral support and may create an excessively safe upper hold. Current front/rear and crouching differences already create choices, so no screen is required to finish this prototype.
4. **Optional new experiment: bridge abutment preparation.** If later play shows the western approach is repeatedly denied before a crossing can even be attempted, test a small masonry service recess in the west abutment around x−28..−25,y−35..−32, outside the deck mouth. It could let a pair assemble and observe the span before committing, while leaving the middle exposed. The cost is a stronger near-end hold and a new corner for the east-to-west player to clear. Compare against the current open approach; do not place cover in the bridge center by default.

The current map is accepted without these deferred changes. They are explicit next experiments with triggers and costs, not unfinished mandatory work.

## Remaining evidence limits

No target-engine playtest, player-versus-player collision, weapons/penetration, utility, audio, network behavior, dynamic bodies, objective timer or competitive balance was tested. Optical sample visibility does not prove a bullet path or successful trade. Actual crouching locomotion and simultaneous follower timing were not performed in these probes. The reviewed single-body walks and finite eye/body views support this blockout handoff; later mechanic changes need affected-scope review.
