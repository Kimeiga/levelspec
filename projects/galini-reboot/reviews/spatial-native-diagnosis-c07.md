# Galini C07 — independent intermediate native diagnosis

**Status: diagnostic advice, not final compiled acceptance.** Canonical source is actively advancing under the author. This report concerns only immutable `generated/galini-reboot-c07-walk/{loaded.aml,compiled.json,verification.json}`. The final SEC01–10 local/visibility/construction verdict requires frozen final views and source.

Cached source SHA-256 `ae0af146c9f6641db471f4aaeef252ba2c96cccbc7291cf6687e208b4e92a350`; physical `fbfa08a928ae40c691659520ba28c4ca12151557e4b5e1e96050c9c4ac26924e`; render `173b3d4c96bf480bc446f711c12f1f738c5cdf06c61cccde3f4ca3250b3c5b48`. Original r.30, h1.8, crouch1.1, step.30, slope42 body retained. No canonical map or engine edits by this reviewer.

I inspected the actual cached failed locations, physical mesh and source bounds before the author's repair explanation, then the six drawn margin proposals. [Physical sections](evidence/c07-independent/physical-sections-c07.png) are new read-only plane intersections of the exact C07 collision triangles, not stale C02 pictures or a proposed model. The cached author's full run is134/158 successful directions, including20/20 main journeys. Those20 do not establish whole-floor acceptance.

## Width failures: separate actual obstruction from missing navigation

The author's independent-of-navigation `physical.resolve` diagnostic passes20 of the22 failed width directions. My [supplemental probes](evidence/c07-independent/results.json) independently traverse eight substeps from each last admitted failed-walk position through the actual failed request. In each of those20 directions, all eight points physically resolve using the same body and collision mesh, while seven or eight points have no corresponding sampled navigation triangle. This occurs on off-center lanes of S2a/b, S3a/b, S5b and S8b. It is bounded evidence of missing navigation at these failures, not a demonstrated physical stair obstruction.

Do not count physical-only diagnostics as successful navigation-constrained walkthroughs. Retain the failed inspector results and report successful admitted width separately from physical clear width. Do not reduce the body, add seeds, change the engine or reshape clear stairs merely to chase these samples. Center/full-journey traversal and final actual views still need final-revision verification.

The two S5a outer-lane directions differ: the generic test extends to y28.3, past the L03 corrected landing witness at y28.6. My short reverse sweep also fails physical resolution before that overextended endpoint. Correcting the witness to the actual supported landing is appropriate, retaining the original failed request. D02's nominal center crossing at y46 genuinely crosses the stair/guard interface; the same short physical sweep fails. The established southern crossing at y45 is an evidence correction requiring its own final bidirectional run. `TURN-S1-N-target` at15,46 is likewise not an admitted opposing pose and must not provide visibility evidence.

## All42 coverage findings

Independent unchanged-body collision queries at each coverage point, floor+.01, give **27 width and4 headroom points physically blocked**, plus **11 physically clear but disconnected points** on the School north strip. These findings are not dismissed because required journeys pass.

| Region / precise target | Mechanism and bounded disposition |
| --- | --- |
| **F04 School north**, x93.31–100.75 near y88.95–89.25, and x107.25–112.25,y89.75 | First12 points occupy a narrowing external strip between the School facade/perimeter; all physically block. Eleven later points are individually clear but stranded beyond the taper. This is an incidental exterior remnant, distinct from the real lower arcade at y84. The drawn NORTH-SCHOOL-PLINTH closure is reasonable, attached to the facade/retaining shoulder, with route and final view verification. It must not become fill beneath SS01 or across the lower arcade. |
| **F08 CT gatehouse**, x127.75–128.25,y104.75–108.25 | Seven samples lie in a narrow retaining wedge between the gatehouse and perimeter. Original body collides at all seven. The small attached RIDGE-GATEHOUSE-PLINTH can close the unused slot; it does not justify changing the CT departure network. |
| **Chapel porch**,8.111,72.167,+6 | The .333 m bevel is narrower than the body. CHAPEL-SOUTH-COPE is a local attached coping closure outside the occupied porch route. |
| **Press facade**,31.858,85.034,+8 | A small corner under WX-M08-4 has1.1 m nominal overhead and physically blocks the standing body. PRESS-FACADE-FOOT closes an incidental triangular remnant, not an intended crouch route. |
| **School west**,94.375,89.067,+8 | The nominal .6 m slot sits between facade and guard; the real capsule query blocks. SCHOOL-WEST-COPE reasonably closes a blind end without affecting the western lower arcade. |
| **Bell south rim**,114.375,76.501,+8 | A .253 m wedge lies against the well-rim guard. BELL-SOUTH-COPE may merge it into the rim, preserving the actual stair mouth and all lower occupation. |
| **S3b-right guard**,11.833,79.714/79.892,+6 | The .2 m outward guard footprint, x11.75–11.95,y78–84, overhangs the filled stair body and exposes sub-body gaps above the adjacent floor. The physical section shows the stepped lower guard edge. Exact-footprint masonry backing to the filled-flight base5.7 is a coherent local closure; do not fill the porch or turn volume. |
| **R6a left toe**,124.25,32.75,+0 | The rising outer guard leaves a small overhead remnant at the ground/perimeter join. Back only the existing guard footprint to the filled ramp base, preserving the full walking surface. |
| **R6a/R6b perimeter seams**, three R6a points near123.95–128.56,29.66–32.27 and two F04 points near126.74/131.76,51.48/51.56 | Reported widths are approximately .0002–.0003 m. These are microscopic boundaries between existing guard/perimeter/ramp surfaces, not body-sized route options. If visually open after backing, a tiny attached joint fillet is proportionate; retain exact bounds and final close views. Zero warning count alone is not grounds for reshaping the ramp. |

The six drawn margin closures have no reported route-capsule plan intersections and fit the cached geometry. Their acceptance is conditional on final construction and traversal evidence, not only a plan intersection test. Guard backing is especially restricted to the **already filled** S3b/R6a/R6b assembly. This advice does not apply to suspended School slabs, bridge arches, or stairwell air volumes.

## Six strict FLOOR_EDGE_GAP flags: individual physical dispositions

These must not share a blanket “open storey” waiver. The physical result differs by interface:

| Reported interface | Actual cached construction / movement meaning |
| --- | --- |
| **F04-01 / F06-02**, x100,y77–81; reported1.7 m | **Already physically sealed.** L7-masonry has two exact collision triangles forming the x100 side from z4 to5.6999998; F06-02 continues from5.7 to6. The section shows the assembly. No added retaining fill is needed. |
| **F04-01 / S8b**, lower arrival near122,71; reported1.5 m | The real first tread is4.2, with filled base3.7, adjoining lower floor4. The space above is the intended walking opening over a .2 m step; treating the reported interval as a wall requirement would close the approach. Verify the actual final lower-arrival walk and view. |
| **F04-01 / S8a left**, y81,x114–120 | Intentional open adjacency to the F04 stairwell hole. S8a's filled body begins at5.7, above the lower floor datum4, while F04 removes the footprint beneath the flight. This is not an unsealed retaining join between two coplanar walking areas. Preserve the well and review side support/guard in final architecture views. |
| **F04-01 / S8a lower label**, x114,y77–81 | The high end of the actual descending flight starts at8; the body underside remains5.7. The lower floor's hole edge is beside that upper assembly. Preserve the intended separation; do not infer a lower passage through the hole or insert a wall across the upper arrival. |
| **F04-01 / S8a right**, y77,x114–120 | Same intentional lower-floor hole adjacency on the other flight side, with distinct final side/guard inspection required. No lower walking surface is authored inside the cut. |
| **F06-03 / S8a upper label**, x120,y77–81; reported1.5 m | **Actual landing join is coherent.** The last tread is6.2 and the receiving slab is6.0, both with underside5.7. The .2 m descent is within the original .30 step contract and is covered by the named journey. The1.5 m warning does not describe an actual open interval at the walking join. Verify final turn traversal; do not add a wall. |

These are bounded physical dispositions based on actual C07 triangle geometry and source holes. They do not approve an arbitrary gap elsewhere or replace the separate architecture review. Final source changes must preserve these interfaces or trigger a focused return.

## Return obligations

Wait for the final freeze, inspect fresh actual SEC01–10 views before author rationale, and verify final source/hash identities. Review all named local encounters, postures, opposing/follower support, spawns/exits, low cover, turns, guards, openings, School supports and the revised arch/cliff construction. Reuse L03's unaffected paper coverage only where the native assembly agrees. Retain the inspector-width limits, actual physical closures, six individual floor-gap dispositions and unavailable target-engine combat evidence.
