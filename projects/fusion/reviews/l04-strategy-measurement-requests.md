# L04 — fresh compiled strategy measurement requests

Prepared: 2026-11-11 by `skill_forward_review` after the detailed layout return.
This is a request packet, **not performed evidence**. It does not edit canonical
AML. Apply it to the new compiled L04 realization and record its source, physical
and render hashes. The inspected plan SVG hash is
`cfa6042238e0bf04038c321857c017a7ada90da00e6c61ab7a637a91e60ca794`.

Reuse structural movement evidence where it already covers the same source,
body and journey. Do not run duplicate replays solely because two reviewers ask
about the same stair. Standing body remains1.8 m/radius.35; step.3 and crouch1.1
are unchanged. Native tread support and roof clearance determine actual feet.

## Candidate feet anchors

These are plan-space candidates, not confirmed placements. Body-place each before
using it as a view or route endpoint. For a stair camera, obtain feet from an
actual walker trace, not linear interpolation through the tread solid. If a
candidate is obstructed, report the object and propose a nearby purposeful pose;
do not silently move it until a desired ray passes.

| Label | Candidate XYZ | Purpose |
| --- | --- | --- |
| T starts | x−18,−16,−14,−12,−10; y−35; z0 | Actual five-start offsets, including elevated-target visibility. |
| D starts | x−4,−2,0,2,4; y31; z0 | Actual five-start offsets and new setup journeys. |
| A | (−34,14,3.2) | Upper objective anchor, clear of the cask footprint. |
| B | (35,17,−3.2) | Sheltered lower objective anchor. |
| AS-before / AS-crest | (−36,−1.5,0) / (−36,9.5,3.2) | South acquisition and its screened landing. |
| CG-before / CG-turn / CG-front | (−24,−15.2,0) / (−24,−4.5,3.2) / (−23.5,3,3.2) | Fourth A acquisition and actual convergence at the front platform. |
| AE-before / AE-crest | (−24.1,4,0) / (−24.1,14.5,3.2) | Port ascent and east side of the freight void. |
| AR-before / AR-crest | (−29,29,0) / (−29,19,3.2) | Rear approach and northern upper landing. |
| CW-A / CW-port | (−34.5,25,3.2) / (−25,11,6.4) | Crown arrival into A versus high wing entrance. |
| CE-port / CE-mid / CE-before | (24.5,10.5,6.4) / (26.5,20.5,3.2) / (26.5,31,0) | Three distinct stages of the east crown transfer. |
| CE-gallery | (23.8,18,3.2) | Candidate information/support pose; prove its useful target. |
| CW-room / CE-room | R18.9 at125° / R22 at55°, both z6.4 | Proposed passing sides around different tooling placements. Use reactor center(0,4). Room centers themselves may be obstructed by tooling. |
| FW-low / FW-ground | (−29,−11,−3.2) / (−28,4.5,0) | Freight route commitment versus intermediate ground reset. |
| LW / LE | R18 at210° / R18 at350°, both z−2.8 | Lower radial bridges outside their vessel transitions. |
| CS-top / CS-bottom | R5.1 at215°, z0 / R5.1 at317°, z−3.2 | Real top/bottom landing reservations, not mid-flight floating cameras. |
| CS-bypass-low | R6.7 at265°, z−3.2 | Narrow lower single-file route. |
| CS-bypass-ground | R7.3 at265°, z0 | Ground outer bypass around the hatch. |
| S-ground | (0,−3.2,0) | Fresh open-arc pose atR7.2. The old B04(0,−2.5) pose atR6.5 may overlap the new hatch guard with the unchanged body. |
| W-ground / E-ground | (−12,4,0) / (13,4.5,0) | Existing equatorial bridge relationships; validate against the new support/hatch geometry. |
| BW-before / BW-low | (24.5,6,0) / (25,16,−3.2) | Ground-fed B west descent and lower work room. |
| BT-before / BT-low | (37.5,0,−1.2) / (37.5,8.5,−3.2) | Trench descent to open loading. |
| BR-before / BR-low | (38.5,29,0) / (38.5,19,−3.2) | Rear B descent and side-screen commitment. |
| B-loading / B-shelf | (32.4,11,−3.2) / (35,16,0) | Open lower crossing versus solid ground shelf above the planted room. |
| E-rim sequence | (42,−25,0), (42,−8,0), (42,16,0), (42,29,0) | Long exposed bypass, shelf entry and northern receiver. |
| West-before / West-mouth | (−35,−17,0) / (−26,−13,0) | Shielded initial approach and reacquisition through the8 m mouth. |

For polar coordinates, XY is `(R cosθ, 4 + R sinθ)`. Use the correct physical
support offset once placed. Eye heights and any lower-eye comparison must be
recorded separately from feet and body stance.

## Route and allocation comparisons

Record actual reachable route, path length, performed movement result and
clearances relevant to the task. Waypoints below specify the route being compared;
an unconstrained shortest-path result that quietly uses another connector does
not test the requested alternative. Obtain first-contest evidence separately
from reaching a plant anchor.

| Request | Compare | Decision it informs |
| --- | --- | --- |
| M1 — A setup/acquisition | T→A through AS, CG, and ground W/AE; D→A through AR. Include fastest/slowest authored start offsets where paths diverge. | Does the new CG acquisition create an early upper race before a credible defensive setup? Distinguish first visible contact at front territory from reaching A. |
| M2 — B setup/acquisition | T→B via trench, ground E/BW, and S-ground→CS→LE; D→B via BR and the west ground descent. | Does the B-biased central stair make one route overwhelmingly preferable, and what territory is surrendered to choose it? A shorter route alone is not a failure. |
| M3 — west commitment redirect | FW-low→B through LW/lower arc/LE; same endpoints via FW-ground, equatorial routes and BW. Include reverse returns. | Value and cost of the lower alternative after A support is lost. |
| M4 — local lower recovery | CS-bottom→FW-ground; CS-bottom→S-ground; BW-low→ground E approach. | Can a survivor simplify the task and reunite on ground without a full map excursion? |
| M5 — same-origin objective returns | A→B and B→A via rear ground, equatorial/wing routes, freight/lower route and crown where physically coherent. | Costs must be compared from identical origins. Do not compare one route from its entrance against another from a plant anchor. |
| M6 — crown already acquired | CW-room and CE-room to A and B; include CW-A→A, CE-mid→B and CE-before→B. | Separate useful prepared return from distant 2v2 flank. Identify remaining descents and clearances. |
| M7 — exposed east choice | E-rim Cooling→Control, plus branch onto B shelf/crossing; compare trench→B from the same Cooling departure. | Rear pressure versus lower objective presence, including the point where a player can stop short of the full long lane. |
| M8 — A loss substitution | AS-before→CG-front, AS-before→AE-crest, and AE-before→AS-crest where routes are open. | Whether remaining teammates can replace an absent support role through held territory; no automatic timing success. |

Report inspection travel times only with the actual controller/speed settings.
Distance divided by5 m/s may be a clearly labeled provisional estimate, never a
measured round-time result. Human reaction, utility, clears and objective actions
are additional costs outside these movement replays.

## Focused opposing-view requests

Reuse the section review's screenshots/rays when it provides these relationships.
Capture the occupied roofed geometry, not a cutaway, for all eye-level conclusions.
Include a defender/receiver and a follower pose where the disputed claim concerns
support; one attractive arrival view is insufficient.

1. **A front convergence:** inspect AS-crest, CG-front and AE-crest toward actual
   upper defenders around the plant, void and tooling. Inspect reverse views and
   at least one meaningful offset around each landing screen. Determine where CG
   becomes the same local front as another approach, and where it still supplies
   a distinct usable angle. Do not count open routes as simultaneous plant rays.
2. **A northern returns:** compare AR-crest and CW-A against the two sides of the
   cask/tooling and plant. Include the upper entrant's next corner and an approach
   from the front side; this is a local retake encounter rather than a safe rear
   travel check.
3. **B sheltered versus open:** inspect B, B-loading, BW-low, BT-low, BR-low,
   B-shelf, CE-gallery and an east-rim shelf entry. Verify the shelf/partition
   actually hides the claimed objective-side target while leaving some useful
   loading-crossing influence. Check both sides of the arrival screens. Finite
   eye rays are not whole-body, ballistic or utility proof.
4. **Central level change:** use actual stair traces for leader/follower cameras
   before the turn, at the last steps and on CS-bottom. Inspect from both lower
   directions and from W/E ground bridges. Check whether the hatch guard changes
   the southern ground crossfire and whether a follower has a usable action
   when the leader first encounters the lower opponent. The .98 m bypass must
   never be reported as a guaranteed two-player trade lane.
5. **Crown useful views and departure:** prove any proposed wing/port support view
   through the actual coils, screens and roofs. Then trace the observer's return
   to the related task. Include the west stair/rear-A crossing and east mid-level
   transfer, with grounded follower views from the relevant structural traces.
6. **East rim influence:** inspect the north receiver near(42,29) against the
   full south approach and each meaningful shelf/Control branch, then inspect
   it from the attacker's side. Check collateral influence over BT-low,
   B-loading and BR-low. The concern is combined control of several tasks,
   not merely a long measured sightline. The covered plant remains a separate
   target and cannot be assumed hidden solely from the overhead plan.
7. **West reacquisition:** inspect West-before and West-mouth toward ground
   Cask, CG, A-S and selected high targets. Verify the Y−14 shield interrupts
   the claimed initial line while the open mouth provides the intended next
   encounter. Do not invent a second return or low lintel absent from the plan.
8. **All starts, including high targets:** inspect all ten authored starts
   against A upper edge/plant, CG, crown endpoints/work-room edges and relevant
   ground/lower approaches. The old B04 ground-only spawn sample set is not
   sufficient after moving A and adding the crown. Preserve obstructions rather
   than silently changing target heights to obtain a pass.

## Central stair variant comparison

Freeze a separate comparison variant if the stair is realized: restore the
equatorial slab over the hatch and remove the flight/its local guards, while
preserving lower endpoints and the other map geometry. Keep this separate from
the canonical candidate. Its purpose is to compare the real two-ended lower
route with the new three-way junction, including the lower space liberated by
removing the flight. A route-graph-only disabled connector can answer a narrower
topology question, but must not be described as a physically tested variant.

Run the consequential M2/M3/M4 comparisons and the changed central views on both
versions; unchanged A/crown evidence need not be repeated. Record actual benefit,
cost and uncertainty. The comparison does not require equal route lengths or
equal usage. A failed narrow physical fit should be repaired within the selected
reservation or explicitly rejected, never passed by reducing the player body.

## What can close at each evidence level

Native body movement and placements can close sampled physical journeys; grounded
captures and rays can close particular optical claims. They cannot establish
multiplayer throughput, reliable trading, sound inference, weapon penetration,
utility strength or whether an objective clock permits the proposed 2v2 return.
Those remain target-engine/playtest questions. A successful compiled strategy
review should identify which hypotheses are supported and which remain to test,
without claiming a competitive balance result.
