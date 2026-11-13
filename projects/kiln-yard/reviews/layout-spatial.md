# Kiln Yard L04 — independent spatial/visibility layout review

**Current verdict: L04 accepted for production blockout, with the explicit 3D checks below.** Independently inspected L03 closes the consequential L02 Loading–Service sightline by shaping the central journey around an attached office. L04 resolves the plant-zone overlap. The surrounding layout is sufficiently developed; no incline or extra route is required. This is spatial layout acceptance, not final geometry, gameplay or balance acceptance.

Initial independent evidence was L02 `brief.md`, `layout-data.json`, `layout.svg`, and the rendered `generated/kiln-yard/layout-L02.png`. No separate author rationale or other review was read. After reporting S1, I independently inspected revised L03 JSON/SVG and `generated/kiln-yard/layout-L03.png`, and checked the repair's dimensions and sightline family. I then inspected L04 plant polygons and `generated/kiln-yard/layout-L04.png`. The drawing itself contains intent labels; those were treated as hypotheses. Applied `fps-map-review` with its spatial, cover and scenario guidance. No source or layout edits were made. Findings are drawing/coordinate evidence, not compiled observations or gameplay validation.

## L03 repair adjudication

**S1 resolved at layout stage.** P02 now spans x=45–51 at y=21; P06 spans x=39–43 at y=45. Attached K3-office occupies [[34.5,29],[44,29],[47,32],[47,35],[33.375,35]] from Z=0 to 6. For every straight segment between the two portal spans, x at y=35 lies between 41.5 and 46.333. That entire interval falls inside K3-office's north boundary, which reaches x=47. Both low and standing eye rays are therefore intercepted by a full-height solid according to the layout contract. This resolves the family of central through-rays, not just the original x=41.5 sample.

The office attaches to M1's west boundary, so it does not introduce an unintended passage behind it. It creates a route to its east and then north before P06. Between the office's x=47 east face and K1's x=52 west face, the main passage is nominally 5 m wide. Relocated L4 at x=50–53, y=35–36.5 leaves approximately 3 m beside the office's northeast corner before the route opens northward. This is sufficient plan room for ordinary 0.6 m bodies; actual wall thickness, corner erosion and two-player movement remain to be checked. L4 partially intersects K1, so only its exposed portion should be credited as a usable refuge.

The resulting reveal is now a concrete local encounter: the first attacker rounds the office's northeast corner into northern Forecourt; the follower approaches around the east face. A Saddle defender can contest P06 but cannot simultaneously keep the full view back through P02. The leader may briefly outrun follower visibility, so blockout review must inspect that corner from both sides and test close corner holds. This is an intentional commitment to verify, not evidence requiring another drawing change. P06 is now 4 m rather than 10 m wide, so carry that changed throughput and clearing relationship into the tactical review. P14 and the independent Arcade approach remain intact.

No additional blocking layout finding was established. L04 also resolves the plant-zone clarification below; all compiled checks remain pending.

## S1 — Continuous Loading–Forecourt–Saddle–A–Service view

**Historical L02 finding, resolved by L03 above; exact plan evidence.** Consider a vertical plan line at **x=41.5**, from **(41.5,11,1.674)** in T to **(41.5,84,1.674)** in D. Intersections computed directly from the L02 polygons are:

| Region / boundary | Y interval or crossing |
| --- | --- |
| T | 3 to 21 |
| P02 | 21 |
| M1 | 21 to 45 |
| P06 | 45 |
| M2 | 45 to 60.444 |
| P07 | 60.444 |
| A | 60.444 to 78.111 |
| P12 | 78.111 |
| D | 78.111 to 86.929 |

Every boundary crossing falls inside its listed portal. All floors are Z=0 and portal heads are Z=3, so the horizontal standing-eye ray is admitted by the declared vertical contract. No solid-mass or cover polygon intersects x=41.5. In particular, A-short-bench ends at x=41, A-press ends at x=33, L4/L5 begin at x=45/46, and D-store begins at x=56.

This predicts a **73 m clear view between the named supported locations**, and approximately 81 m between farther interior positions on the same channel. The nominal defender anchor at (59,85) is not on this ray; this is not a claim that the two anchor points see each other at round start. D is explicitly the defender spawn region and service route, and the T observer is only 0.5 m horizontally from its anchor. Without bounded spawn placements, the whole-room spawn-protection claim is unresolved. Even if initial CT spawns are constrained, the same view allows a service-side position or A hold to monitor a large part of the central attack journey back into Loading.

**Encounter mechanism:** A defender arriving in western D can look through P12 and P07 while an attacker remains near the Loading anchor or crosses central Forecourt. The attacker passes successive named spaces without a guaranteed visibility reset on this line. A-short-bench does not interrupt the ray. This concentrates sight across several territories and makes the spawn/approach separation weaker than the spatial drawing initially suggests.

**Focused repair:** Introduce a full-height architectural return or move/recess one central portal so it breaks the shared P02/P06/P07/P12 channel while preserving the broad movement route and paired support. For example, develop the M1–M2 boundary into a short offset threshold rather than merely adding another low prop. Alternatively, reshape the A-short interface if its resulting site clearing order is preferable. Compare the local consequences before choosing; do not automatically narrow every opening. Restricting actual spawn placements may clarify spawn safety but does not by itself resolve the long central exposure relationship.

Recheck from portal edges and offset positions, in both directions, after the drawing repair. One blocked center ray is insufficient; inspect the surviving angular family and any newly created corner hold. Preserve P14's response route and the independent A-main approach.

## Accepted arrangement and section observations

**Footprint and masses:** The playable footprint follows linked courts and wrapping routes rather than a rectangular outer floor. W2/M2 and A/M2 share useful boundaries; K0 separates the west and central approaches, K1 shapes Wash's turn, and K2 separates A from Inspection/Service. These relationships survive mentally removing the props. Small nonplayable interstices are explicitly closed off and need not be filled with new rooms. Masses can intrude into drawn floor polygons; actual playable clearance must be evaluated after subtracting solids, especially K0/W1 and K1/M1. No clearance failure is established by that overlap alone.

**T and W1:** The three distinct exits give readable initial choices. W1 changes direction around K0, then approaches P04 from the south. L1 provides a potential crouched pause on this route, with lateral room around it. A player progressing into W2 cannot assume L1 protects a retreat from every offset P04 view. There is no reason to add a compulsory side branch to this committed approach.

**W2, P14 and A-main:** W2 has a meaningful onward decision between P05 and the shared-wall P14 transfer. An Arcade pair stalled at A-main can threaten Saddle without returning to T, provided Saddle itself can be contested. Conversely, a defender contesting P14 risks pressure from P04/P05. This is a substantive adjacency relationship, not an ornamental extra door. L2 can help a low-eye pause, but its small footprint does not make crossing the whole court protected. P04 is the narrowest listed main approach at roughly 4.27 m, still generous relative to the provisional 0.6 m body diameter; team throughput remains an actual-play question.

**M1 and M2:** P14, P07 and P08 give Saddle multiple consequential decisions, so opponents have to account for adjacent territory. L03's K3 office and narrowed P06 replace the original broad open channel with a deliberately staged central journey. Inspect whether the new return creates an untradeable close corner or leaves the trailing player unable to see the leader's opponent.

**A:** P05, P07 and P12 approach different portions of the court, and A-press gives an interior obstacle with distinct near/far sides. An attacker entering P05 can threaten the western side while a Saddle teammate approaches through P07; neither automatically shares the other's view around the press. A-short-bench and L3 are plausible local refuges. The northern service entry can change a post-plant hold's cover relationship, which is useful. Do not credit A-press as protection against all three entrances. Verify full-body exposure, clear routes around it and usable plant positions in 3D.

**E1 and B-main:** Wash wraps K1 and changes direction before P10; it is spatially distinct from the west route and central courts. L6 and L7 are distributed across successive parts of that journey. The bend means the following player may not yet support the leader approaching P10, so inspect the reveal and the distance required to establish a trade. Keeping this route committed is acceptable; it does not need to mirror P14.

**B:** P10, P09 and P11 give main, Inspection and Service access. B-filter separates some local views while L8 supports a low-eye position near the plant region. A player using the filter must choose which side to expose; it cannot be presumed to screen the entire CT doorway or all approaches. The site's shape allows circulation around the machine, subject to actual wall thickness. Compare a main entrant against both a northern holder and a short holder, then reverse site ownership.

**R4 and D:** Inspection offers routes toward Saddle, B and Service. R4-return changes movement/viewing options but is a freestanding short screen in the coordinate inventory; its western end is not attached to the region boundary. Inspect both ends rather than treating it as an opaque partition across the room. R4-bench provides another local pause. D-store permits passing on different sides during a rotation, and the three D exits make its ownership consequential after a site falls. D remains broad and partly exposed: its low refuge L9 protects only a local relationship. S1 specifically affects its western portion.

## Authoring clarification

The L02/L03 drawn plant circles partly overlapped solid cover: A's radius-2.5 zone centered at (27,73) intersected A-press, and B's radius-2.5 zone centered at (79,58) intersected B-filter. This was **not a finding that either site could not be planted**.

**Resolved in L04:** A is now x=24.8–27.5, y=70–76; B is x=78–83, y=56.5–62. Both are inside their site floors and clear of the authored solids. A retains 0.5 m separation from A-press and 0.8 m from L3; B retains 1 m from B-filter and L8. Those gaps exceed the provisional 0.3 m body radius even at the nearest zone edge. The rectangles are clear in the updated SVG/PNG. Verify reachable planting/defusing positions and actual interaction behavior in the implementation; the inspection harness cannot certify bomb mechanics.

## Explicit deferred blockout checks

1. Verify floor/solid subtraction, closed boundary seams, only the named portal connections, wall thickness and 3 m portal clearance. Traverse every listed route in both directions with the actual supported body; check passing around covers and inward polygon corners. Navigation samples are not continuous proof.
2. Capture S1's exact paired positions, then multiple offsets across T and D, portal edges, and the repaired central interface. Verify the optical ray family against actual opaque geometry; preserve the source/configuration revision and sampling limits. Test spawn regions separately from nominal anchor pairs.
3. Inspect standing and crouched eye/body relationships at P04/P05/P14, P07, P08/P13, P09 and P10. Use actual harness eyes 1.674/1.023 m and record FOV. Include leading and following teammates, entrance side peeks, reverse views, and site ownership reversal.
4. Inspect L1–L9, A-short-bench and R4-bench from both sides. Heights 1.15/1.25 m nominally exceed the 1.1 m crouched body on level floor, but do not establish side protection, useful peek geometry or bullet resistance. Trace the next move out of each refuge.
5. Reproduce V1 through P10 with supported observer/target positions. Its 1.65/1.05 m eyes differ from the harness assumptions; reconcile them and inspect a body, not only a ray. Check L7's near/far faces and offset shoulder exposure. V1 names a movement portal, not a separate observation aperture; do not accidentally author an extra opening.
6. Inspect A-press, B-filter, R4-return and D-store from all reachable sides, including close corners and whether a supporting player can acquire the same opponent. Capture the plant-zone overlap disposition.
7. After geometry inspection, test 5-player commits and a 4+1 split, 3v5 retakes and 2v2/1v2 post-plants with the actual intended engine/timers. These are necessary for team congestion, utility, trading and timing claims; browser screenshots alone do not establish them.

The flat elevation scheme is accepted for this brief. No unrequested height feature, panoramic perch or additional corridor is needed to satisfy the spatial gate. S1 has been repaired and independently rechecked in L03, and the plant-zone clarification resolved in L04; retain the accepted macro relationships for production blockout and independent 3D review.
