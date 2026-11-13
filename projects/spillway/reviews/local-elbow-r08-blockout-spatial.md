# R08 local blockout gate — Splitter / Elbow spatial and visibility

**Verdict: accepted in the local spatial/visibility scope.** Actual compiled R08 matches the accepted opposing-return layout, preserves the whole Splitter↔Elbow connection in both directions, and interrupts the retained R07 cross-region ray bundle and tested endpoint neighborhoods. No further local geometry repair is required by this review. Tactical acceptance remains a separate review; this is not competitive balance or target-engine certification.

## Actual revision and evidence

Canonical source: `projects/spillway/level.aml`, SHA-256 **`cd60767afbdad88df1299b27433242a06b0d2351a62e748aac3eee3a8ff67f63`**. Independently verified that `capture-r08/loaded.aml`, `walk-r08.json` and `visibility-r08/report.json` have the same source identity. Compiled physical hash: `14cc0e1277d1c89756a314541477454ff2d90bfdaab41e4f95621f04a9134bb7`; render hash: `cf3b1f0a64fab028eff0f60b9bde3733ff65a09faaad085838bc368947eb024b`.

Reviewed accepted local layout, canonical AML, compiled runtime surfaces, route path coordinates, parent walk/scan evidence and actual source-matched captures. Viewed `capture-r08/top.png`, `elbow-west-approach.png`, `elbow-upper-corner.png`, `elbow-lower-corner.png`, `elbow-reverse.png`, `diagonal-origin.png` and `diagonal-reverse.png`. Capture manifest contains 10 views and no errors. The perspective corner views are inspection cameras at Z1.6, not recorded live player stances.

Ran an independent compilation and additional probes, without source edits. Reproducible script: `generated/spillway/local-elbow-spatial-r08.mjs`; results: `generated/spillway/local-elbow-spatial-r08.json`. The generated script and evidence are diagnostics, not production implementation or a new test suite.

## Actual geometry and body space

Both visible and collision mesh bounds match the proposal exactly, apart from normal float precision at the −.30 base:

| Object | X | Y | Z | Actual surface behavior |
|---|---|---|---|---|
| EL-return | 60..68 | 30..35 | −.30..8 | Visible, collidable, closed, static wall material |
| EL-north-return | 72..76 | 33..38 | −.30..9 | Visible, collidable, closed, static wall material |

The AML ground contract has been cut around both attached masses. Actual top and opponent views show continuous route floors, no visible under-wall gap, and the expected building attachments. Compilation reports no diagnostics. These observations are supplemented by physical support checks below; a picture alone would not establish collision or support.

Upper passage remains 2.8 m clear between Y35 and the Y37.8 inner boundary face over the 8 m first-return length. Lower passage remains 2.8 m clear between the Y30.2 inner face and Y33 over the 4 m north-return length. The central turning room retains 4 m between X68 and X72, or a conservative 3.5 m band for the radius-.25 capsule center. It remains separate from the two narrow runs. No overhead or floor-height change was introduced.

Independently tested 30 physical floor positions across upper passage, lower passage and central room: upper Y35.3/36.4/37.5, lower Y30.5/31.6/32.7 and central X68.3/70/71.7 with five Y offsets. Both the authored 2 m standing capsule and 1.1 m crouch capsule had support and clearance at all positions: **60/60 checks passed**. Crouch here is an actual collision-shape check using the authored height; it is not a live crouching-state recording or verified CS2 behavior.

## Complete local route, both directions

The new required `splitter-elbow-local` route starts at the real Splitter (49,35) and ends at unchanged `east-elbow` (79,32), with its 44 m bound. Inspected compiled path:

`(49,35) → (59.800,35.325) → (68.175,35.325) → (71.800,32.700) → (79,32)`

This path actually crosses the upper passage, central room and lower passage; a remote East default does not mask a disconnected local connection. Independently replayed it with the unchanged radius-.25, 2 m standing body and the repository inspection walker in 4 cm XY requests. **Forward and reverse each passed, 774 requests, 30.889 m**, ending at the intended endpoint.

Also replayed a wider, deliberately offset path through `(58,36.3) → (70,36.3) → (70,31.6) → (79,31.6)` between the same route endpoints. **Forward and reverse each passed, 881 requests, 35.193 m**. This verifies a useful alternative turn through the room rather than only the nav path's tight diagonal. These are bounded navigation/physical-support walks, not continuous capsule sweeps or multiplayer passing tests.

The existing `east-elbow-local` route to the crest-side `east-long` marker also passes in the parent evidence. `E-01` still makes the third turn: the lower passage feeds south of it, with about 6 m exit-room depth between X76 and X82. The new return does not collide with the route marker or extend to the E-01 corner. Existing East crest elevation and low cover remain unchanged.

## Actual visibility and first appearances

Independent replay against R08's compiled opaque render geometry covered all **67 retained local R07 long-ray records**, not only the former 65.31 m maximum. Tested both directions and all four combinations of 1.60/1.05 m optical eye offsets: **536 queries, zero visible**. This includes the two 64.777/64.630 m bypassing neighbors that defeated the first-return-only proposal.

Then varied both XY endpoints by −.4/0/+.4 m around the maximum ray and those two neighbors. Admitted endpoints with the unchanged standing-body inspection placement check: **243 supported endpoint pairs, 972 optical height-pair queries, zero visible**. This directly tests nearby diagonals against actual compiled geometry, while retaining the original warning thresholds. It does not establish continuous absence of every submeter ray.

Paired local segment checks at both eye heights agree with the actual captures: the upper passage is visible from west staging into the upper corner; the lower passage is visible from the central room toward Elbow; the upper central position cannot see through the north return to the lower exit; west staging cannot see through the entire connection. This preserves short local information along each pass while separating the old cross-region channel.

The captures show the intended clearing sequence: first-return northeast corner, central-room turn around the opposing return, then exit toward E-01. Reverse view shows the opposing corner closing the old back-to-Splitter channel. Physical capsule offsets confirm these camera locations are in usable floor space. Full-height corners can still conceal an opponent's body before the player rounds them; disappearance of the old ray is not proof of easy clearing or teammate trade timing. The central room permits wider supported movement, but assistance and retreat under fire remain tactical hypotheses.

Both return tops exceed ground, crest and upper-route eye elevations. Their opacity and collision are separate actual compiled checks here; no bullet-penetration claim is made. No new crate or low-cover object is used to achieve this result.

## Boundary scan and limits

Source-matched R08 scan is complete within its declared sampled scope: 3,782 admitted samples, 9,304,300 queries, no pair-budget exhaustion, no unknown opaque materials and no omitted dynamic faces. It retains 1 m spacing, 1.60/1.05 m eyes, 35 m long-line and 100° horizontal warnings. Original and neighboring cross-region protected pairs are blocked at every configured height pairing. Protected area results remain zero visible pairs: spawn areas 121,600 tested; upper→T 319,200; upper→CT 268,800. These are sampled checks, not continuous spawn-area proof. Remaining long views elsewhere require their own scoped review rather than expanding this local repair.

No consequential unsupported local geometry/visibility finding remains. Reviewed evidence supports the requested architectural route-shape repair and actual local connection. Live crouch motion, weapon/body protrusion, grenades, sound, multiplayer collision, trading and timing are not established by these captures, sampled placements or the inspection walker; target-engine playtesting remains necessary for those claims.
