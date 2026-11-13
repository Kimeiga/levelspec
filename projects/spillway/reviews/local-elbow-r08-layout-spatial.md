# R08 local layout gate — Splitter / Elbow spatial and visibility

**Verdict: accepted for the revised two-return blockout implementation.** This supersedes the first-return-only spatial gate: that first version interrupted the maximum ray but left neighboring long rays. No production source was changed for this review. Acceptance concerns layout prediction; R08 actual geometry and traversal still require the independent blockout gate.

Scope: `EL-return`, new `EL-north-return`, west staging against `BLD-LE`, both passes, central turning room, Elbow exit and existing `E-01` / East crest interface. Reviewed independently of the tactical verdict, using FPS map review, local combat geometry and level authoring guidance.

## Evidence and fixed assumptions

Read the revised `audits/elbow-r08-proposal.md` and `.svg`, named-space graph, project brief and actual R07 `level.aml`. The R07 source SHA-256 matched `visibility-r07/report.json`: `a01a75e2ede131356b1bdcd525862d8e02e6b2b40eef3a22fbb58ba951352dc8`. Inspected R07 `capture-r07/top.png`, `east-grade-up.png` and `east-grade-down.png`; there was no dedicated east-elbow opponent capture in that capture set. These establish existing context, not the proposed blockout.

Body remains radius .25 m, standing height 2 m, crouch height 1.1 m. Optical offsets remain 1.60 / 1.05 m. The R07 report used 1 m sample spacing, 35 m long-line and 100° horizontal warning thresholds. No warning threshold, spawn region, eye height, low cover, elevation or player-body change is part of this repair. These optical settings are not authenticated CS2 eye settings.

## Physical shape and capsule space

`EL-return` occupies X60..68,Y30..35,Z−.30..8, attached to `BLD-3-0` along Y30 and meeting `BLD-LE` at X60 over Y30..34. `EL-north-return` occupies X72..76,Y33..38,Z−.30..9, attached to `BLD-2-0` along Y38. Their respective 8 m / 9 m tops match their parent masses. This makes an architectural S connection with an open turning room between the returns.

The upper pass is 8 m long, Y35..37.8 physically clear: **2.8 m width**. Its nominal radius-.25 body-center band is Y35.25..37.55. The lower pass is 4 m long, Y30.2..33 clear: **2.8 m width**, with center band Y30.45..32.75. The .2 m allowance comes from the existing .4 m boundary walls centered at Y38 and Y30, respectively. Keep a small margin off exact tangencies during movement checks.

The central room X68..72,Y30..38 has 4 m between opposing wing faces, giving a conservative **3.5 m capsule-center width** X68.25..71.75. Even where the opposing returns overlap in Y33..35, it remains a real turning room. It does not become an 18 m continuous narrow hall. A radius-.25 body can geometrically follow (58,36.3)→(70,36.3)→(70,31.6)→(79,31.6) and reverse it without stepping into either return. There is no overhead slab or change in floor height here. Two .5 m body diameters fit the physical passage width in plan; multiplayer passing and timing remain unverified.

West staging is approximately X56..60,Y34..38, open back toward Splitter; the existing `BLD-LE` occupies the part south of Y34. The proposal now correctly states this roughly 4×4 m pocket. East of the north return, X76..82,Y30..38 remains the exit room; the previous broad description of an entirely open X68..82 room is superseded by the explicit neighbor-ray revision. Graph EE (80,32,0) and the actual `east-elbow` route marker (79,32,0) remain distinct, unchanged points.

Both returns must be removed from the ground floor contract and joined cleanly to their parent footprints. Do not insert overlapping holes along attached edges. Existing boundary walls at the attachment faces remain inside the attached mass; they do not create a gap under the new solid. The new bases extend below Z0. Compile and inspect actual support, seams and collision before accepting those predictions.

## Neighbor bundle, not only the maximum ray

Independently applied segment/rectangle intersection checks to the saved R07 long-line records. The local selection required endpoints spanning west of X60 and east of X76 and intersection with X60..82,Y30..38. **67 saved records met that local scope: 56 intersect the first return; all 11 that bypass it intersect the north return. None bypass both.** The other 33 saved long lines concern northern map interfaces and were not treated as this repair's responsibility. This checks the retained top-100 report records, not all possible player rays or a new compiled visibility scan.

The original (25,42,1.61)→(89,29,1.61) ray enters the first wing near X60,Y34.891. Its neighboring 64.777 m and 64.630 m rays toward (89,32) and (89,33), which bypass the first wing, cross the new north return at X72,Y34.656 and Y35.391. All 11 retained bypassing local rays cross X72 at Y34.419..35.391, comfortably inside the proposed Y33..38 mass rather than merely touching its edge.

The S shape also has a useful geometric check beyond those examples: a straight point ray traversing the whole upper pass must remain Y35..37.8 at X60 and X68; traversing the lower pass requires Y≤33 at X72. Dropping at least 2 m between X68 and X72 requires slope ≤−.5, which extrapolates to Y≥39 at X60 and conflicts with the upper-pass boundary. Thus a ground-height straight ray cannot thread both full passes. This is a local geometric relationship, not a continuous whole-map LOS proof. Ground standing, East crest eye about2.8 m and upper eye about5.6 m all remain below both return tops; they cannot simply look over these masses. Inspect actual compiled elevated views nevertheless.

## First appearances and the third corner

West→east movement clears the northeast corner of the first return at (68,35), crosses the turning room, then clears the southwest corner of the north return at (72,33) before following its south face and exiting around (76,33). Reverse movement must resolve the southeast edge at (76,33), the central room beyond the southwest corner, then the northwest corner of the first return at (60,35). Bodies tucked around these full-height corners can hide torso and feet; an eye placed on a corner is not evidence that a full body can safely occupy it. Inspect offset bodies rather than exact corner coordinates.

The central room has space to change angle, allow a follower to come alongside and reverse direction. A teammate directly behind the leader is not guaranteed sight of an enemy behind the next return. The corner sequence introduces clearing commitment; whether assistance arrives in useful time belongs to tactical review and playtesting. Do not treat a hidden entrance as evidence that a stationary hold covers every approach.

`E-01` remains the **third local architectural turn**, at X82..86.5,Y34..39. The new lower pass naturally feeds it from the south: bodies can continue through the exit room near Y31.6, pass south of E-01, then turn north on its east side. There is no collision closure and the East default remains outside the new return footprint. The interval from X76 to X82 gives about6 m of exit depth before E-01; the north return does not extend to that third corner or consume the existing `east-elbow` marker. Inspect the north-return exit and E-01 together in 3D so an unseen body at the third corner is not mistaken for a fully cleared East approach.

No low cover is added. `M-L01` is well west at X36.2..39.6,Y34..36; `E-L01` lies beyond E-01 on the crest at X82.2..84.6,Y44..46. Neither is immediate ducking refuge inside the S connection. The returns provide full-height retreat and preparation corners; inserting a crate in either 2.8 m pass has no demonstrated need and would consume circulation.

## Required actual-model recheck

Add the explicitly required full connection route from LM (49,35,0) to the existing `east-elbow` (79,32,0), with the proposed 44 m bound, retaining the existing east-elbow-local route endpoints. The illustrated capsule-center path from LM through the listed waypoints, then to (79,32), is approximately35.2 m, so 44 m gives reasonable local allowance. The bound is a diagnostic: inspect the selected path to ensure it actually uses both passes and the central room. A remote East-feed route must not substitute for this connection.

Before blockout acceptance, inspect compiled footprint/floor subtraction/seams and replay that whole route in both directions with unchanged body. Check pass offsets, first and second corner turns, central turning/retreat space and the E-01 exit using real standing/crouching states. Capture opposing views near (58,36.3), (67,36.3), (70,36.3), (70,31.6), (77,31.6), unchanged (79,32), and the E-01 east side. Include wider body offsets and crest / upper context, not only centered cameras.

Re-run source-matched visibility with unchanged scan configuration, spawn bounds, eye heights and warnings. Re-probe the original maximum ray, both64.6–64.8 m neighbors and the local bundle; inspect newly exposed corner diagonals too. Compilation and sampled navigation alone do not prove continuous traversal, team throughput, bullet protection, utility, trading, balance or engine reachability. Those remain explicit limits rather than fabricated passes.
