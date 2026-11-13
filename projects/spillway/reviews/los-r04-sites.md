# Spillway R04 — independent site, approach and attention review

2026-11-08. **Changes required against the user's new LOS/attention brief.** This reopens the earlier prototype judgment; the new requirements demand section-wide visibility evidence that the original13 route and camera checks did not supply.

Inspected source SHA-256 `f8289e0063da85f3466b8124f13a439c9190acb891a7f7e517cda6ac35d9e784`. Independent first assessment used brief, inventory, AML and actual R04 captures before author tactical rationale or other review verdicts. Viewed top, A gate/holder, B east/short/holder, north stairs and ramp views. Finite-segment tests use actual visible render triangles from source-matched `generated/spillway/build-r04/spillway.runtime.json`. Double-sided intersections, .002 m start and .02 m endpoint exclusion. This checks opaque geometric visibility, not weapon/body/network behavior.

Supporting artifact: `generated/spillway/site-los-r04.json` and its one-off diagnostic driver. Exact endpoint coordinates below are XYZ meters; eye Z=1.6 on ground. Long segment results are direct geometric observations; hold entry-center results are candidate threat proxies, not a proof of covering every point of every entrance.

## Findings by section

| Section | Evidence | Consequence / priority |
|---|---|---|
| East Long / B east edge | `[89,21,1.6]` → `[89,83,1.6]` is visible,62 m. E-01 stops at X86; B-02 stops at X88, leaving this long eastern strip. | **High:** opponents reaching opposite ends can duel along nearly the entire side route and B's outer edge. Adding more height to side boundaries will not fix this. Break the corridor in plan with a genuine bend or overlapping offset blockers while preserving usable entry/follower space. |
| West Long | `[12,18.5,1.6]` → `[12,63.5,1.6]` is visible,45 m. W-01 ends at X10 and W-02 starts at X14; neither interrupts this common line. A gate finally terminates it. | **High:** existing nominal baffles are side obstacles rather than a segmented encounter sequence. Separate lower approach from forecourt with a turned threshold/opaque overlap; retain staging and avoid replacing it with one body-width choke. |
| T lateral staging/feed | `[22,16,1.6]` → `[82,16,1.6]` is visible,60 m. T-01 begins at Y22, so it does not segment this lateral feed. | **Medium/high:** no opposite-team initial spawn is on this ray, but a deep lurker or spawn retake can observe a very long shared redistribution corridor. Preserve protected spawn preparation while splitting lateral visibility at actual route decisions. |
| CT rear gallery | `[25,86,1.6]` → `[75,86,1.6]` is visible,50 m. CT-01 is at Y78..81 and does not interrupt this lateral line. | **High around retakes:** after site ownership changes, the rear route is a long exposure rather than automatically safe circulation. Break its view into deliberate segments; do not describe it as always safe merely because it is behind CT. |
| B site northeastern hold | From `[89,82,1.6]`, east `[89,39,1.6]`, ramp foot `[88,61,1.6]`, short `[71,71,1.6]` and rear `[77,84,1.6]` are all visible. Plant center `[78,75,1.6]` is visible too. | **High candidate:** entry-center bearings fit an approximately99.46° circular arc (wrap-aware). A single stationary player can geometrically watch these route-center exposures and the plant without a broad turn. Sample opening widths and emergence bands before asserting complete doorway coverage, then remove the privileged all-purpose view or change an approach's relationship. |
| A site western hold | From `[7,80,1.6]`, gate `[17,67,1.6]`, rear toe `[28,84,1.6]`, stair-low `[28,80,2.1]` and stair-high `[28,68,5.1]` are all visible. Their horizontal bearings fit63.22°. Plant center `[21,74,1.6]` is occluded by A-01 at `[14,77,1.6]`. | **High candidate with a qualification:** this position can watch all sampled entrance centers in a narrow sector, even though it cannot inspect the plant itself. A-01 therefore creates some objective-state pressure, but the hold remains useful for stopping arrivals. Test an opaque local partition or altered approach that forces a coverage handoff/reposition; do not add arbitrary micro-crates. |

## Portal and elevation interpretation

A site has a south gate (X14..20,Y66), rear approach around the S-02 toe near Y82, and an upper stair approach that appears progressively during descent. Its ground connector at X30/Y72..78 does not provide immediate direct A pressure through the filled stairs. Treating that connector as an extra independent firing direction would falsely improve the attention score.

B has east/gate access, ground short, a rear entrance, and the ramp ending in the east forecourt. Ramp and East Long can feed closely related threat directions at a hold; counting them as two routes does not guarantee two attention sectors. The B-near-NE observation above explicitly checks their bearings. B-01 blocks the saved central holder's east view, requiring a side peek, but that fact does not cure the independent NE edge hold.

At height, low flight guards do not block views over3 m ground boundaries from eyes around Z4..5.6. The bridge observation bay is intentionally exposed south, but the surrounding holes are mostly empty enclosed voids instead of tall building masses. Add purposeful2–3story opaque volumes where the concept calls for buildings, then reassess elevated player-to-player lines. Candidate inaccessible masses include the west interior around X14..24/Y30..48 and east industrial interior around X56..82/Y38..58. Do not extrude whole existing footprint holes blindly: several extend beneath the bridge or approach the ramp, and would close the intended crossing. Split massing around Y58..64 and inspect sections/standing headroom before acceptance.

Taller side masses alone will not solve the measured ground-level straight corridors. Plan bends and tall architectural occlusion solve different parts of the problem. Preserve intentional low combat cover and height-dependent peeks rather than globally raising every obstacle.

## Scenarios and design tests

- **5v5 B setup:** one defender at the NE hold can watch sampled east/ramp/short/rear entry centers, potentially freeing excessive coverage elsewhere. Attackers can spend utility or coordinate entries; those are hypotheses, not a reason to ignore the requested geometry repair. Compare a revised setup where the holder must relocate or ask a teammate to cover a distinct threatened sector.
- **2v2 B post-plant:** an attacker using the NE hold may cover the plant and both likely retake routes with little horizontal movement. Test rear/short retakes against east-backed attackers, including attackers refusing to advance. Record actual emergence bands and where the second player can support.
- **5v5 A split:** west-side hold watches sampled gate/rear/stair appearances in a narrow sector. Plant-center occlusion means it cannot perform every objective task. Compare a revised local screen/entry arrangement and ensure it does not merely turn the gate into serial entry deaths.
- **1v2 A post-plant:** gate, rear and stair have different path/timing costs despite concentrated bearings. A solo retaker should have useful information/reposition choices; equal win odds are not required. An upper route arriving after the clock is not meaningful counterplay.
- **Spawn transitions:** protect initial staging, but inspect endpoints throughout the spawn footprints and departure lanes. The literal CT-center-to-T-center claim is assigned to the separate central reviewer; these site results neither establish nor rebut that ray.

## Automatic scan requirements

Use supported playable points and finite target segments. A sky ray traveling to infinity is not a player-to-player sightline. Sample ground and occupied elevations, different eye assumptions, and near-threshold positions; retain endpoints, blocking object IDs, source hash and coverage limits. Use a spatial index to reduce repeated triangle work.

For attention, define feasible entry portals/emergence bands per meaningful combat region and objective phase. Compute circular bearing coverage correctly across ±180°. Report each portal as visible, partly visible, occluded or unavailable, and do not equate an occluded portal with an absent enemy route. Route-center angular results are a screening heuristic; full opening widths and nearby support poses require follow-up.

Do not turn the100° heuristic into a universal requirement at every meter. A convex outer corner mathematically concentrates interior space; dead ends and protected spawn pockets can legitimately be one-sided. Prioritize consequential holds that can cover objectives and feasible enemy approaches from one position. A long line or compact arc is a review flag with an explicit disposition, not a final balance score.

## Next gate

Revised labeled plan plus height sections should show intended sightline stops and portal relationships before AML changes. Independently review the plan's spatial and tactical consequences, then compare the final rendered scan/captures and actual movement against it. Recheck measured long endpoints, all key holds, elevated views and surrounding routes. No source edits were made during this review.
