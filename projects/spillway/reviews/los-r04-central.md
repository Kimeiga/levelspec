# Spillway R04 — independent central / network line-of-sight review

**Changes required.** The user's spawn-area and excessive long-view concern is substantiated by actual compiled geometry. The prior prototype acceptance did not establish this stronger visibility contract.

First assessment used the neutral brief, AML, layout and compiled captures without the author's tactical rationale. Applied fps-map-review and level-authoring. This scope covers both spawns, central mid, upper route, and network-level long views; site detail can be reviewed separately.

## Evidence and method

R04 source SHA-256 `f8289e0063da85f3466b8124f13a439c9190acb891a7f7e517cda6ac35d9e784`; compiled physical geometry hash `95ef677ee6847351e5e745dca8636a30a5d9fe15cd9bf7d6f2db05d4379792ce`.

Inspected actual `capture-r04/top.png` and existing compiled view packet, source geometry and exported runtime. Independently intersected finite sight segments against all visible compiled mesh triangles, two-sided. This is opaque-surface geometric visibility, not bullet penetration, target-body visibility, sound, utility or live play. Saved ray endpoints, blockers and hit positions: `generated/spillway/los-review-r04.json`; reproducible independent review helper: `los-review-r04.mjs` in the same generated directory.

Placement review on the frozen R04 source independently used the repository standing walker for14 selected feet positions. All14 placements passed. Results in `generated/spillway/los-placement-review-r04.json`. No player sizes or geometry were changed. Camera height1.6 m is provisional; a low1.05 m camera ray is not a crouch simulation.

## 1. Spawn regions — supported defect

The exact marker-center ray CT(48,92,1.6)→T(48,10,1.6) hits CT-01 at(48,81,1.6). Checking only those markers would wrongly suggest spawn safety.

The offset ray CT(51,92,1.6)→T(55,10,1.6) is **clear for82.10 m**, also clear at low-camera Z1.05. Both standing feet placements independently passed. A bounded spawn-area test checked768 pairs (CT X41..55 step2 /Y90.5..94.5 step2; T X41..55 step2 /Y5..17 step4). **46 pairs were visible**, including exposures over85 m. This is sampled evidence, not an exhaustive spawn-volume certificate.

CT-01, M-01 and T-01 all allow an eastern bypass, so their apparent centerline interruption does not create an optical dogleg. Spawn placement can expose a starting player to an early cross-map duel. Repair the relationship with alternating overlap, a genuine bend or a protected spawn exit, then test spawn areas and approach shoulders rather than a single center ray. Merely moving either spawn marker hides the test case without repairing the route exposure.

## 2. Ground mid / underpass — supported long-view defect

Clear rays:

- (51,27,1.6)→(51,85,1.6):58 m through mid and under the bridge.
- CT(51,92,1.6)→T-mid outlet(54,25,1.6):67.07 m.
- (54,55,1.6)→T-yard(54,10,1.6):45 m.

The overhead bridge does not interrupt horizontal ground-eye visibility. These runs connect preparation, contest and defender-side circulation into one long firing channel. A central ground blocker must close the common eastern optical bypass while retaining a usable route, second-player support and the declared underpass. Alternating blockers separated by movement space are a candidate; their diagonal bypasses and reverse views still require a scan. No universal corridor width is inferred.

## 3. Upper crossing — long corridor and landing attention risk

The upper ray (25.5,61,5.6)→(69,61,5.6) is clear43.5 m; both feet positions passed standing placement. Longitudinal U-N/U-SW/U-SE screens prevent side views but preserve a long corridor duel between the ends. A staggered full-height baffle or bend can create a staged transition; ensure it does not create a single untradeable head peek or hide an exit required for reasonable support.

At the protected west-landing corner eye(24.9,65,5.6), actual rays to the south stair entry(30,58.2,5.6), north stair entry(28,65.9,5.6), and bridge(37,61,5.6) are all unobstructed. Their center bearings fit a69.32° horizontal arc. U-W and U-LN1 protect the back. This is a concrete candidate for a one-player hold covering the three advertised approach directions without turning. Portal extent, body exposure, support, grenades and timing remain important; three point rays do not prove every part of each entrance is covered. Reconfigure the landing relationship or make a different timely exposure matter, rather than treating a new cosmetic crate as sufficient.

A 100° flag is useful for review, but the script must distinguish all *reachable enemy approach portals* from just the rays currently visible. A corner with only one visible doorway can trivially fit its visible bearings; that alone does not enumerate the threats. Nor does angular spread alone show that an opponent reaches a flank before the objective resolves.

## 4. Height-dependent site exposure — supported ramp observation

R-01 eye(72,61,5.1)→B plant(78,75,1.6) is clear15.63 m, passing over the3 m B-gate and the low ramp guard. This is not a cross-map ray, but it establishes that upper traversal changes site protection. Ground-height baffles cannot be assumed to screen a descending elevated eye. Decide whether this B observation is intentional and costly enough, or screen its northern ramp edge with a height-aware volume. Test along the whole descent, not just the ramp's end cameras.

Selected bridge-bay rays toward other regions were **blocked**, despite looking plausible from the aerial view: bay→west-long(12,40,1.6), bay→stair court(30,40,1.6), bay→east elbow(79,32,1.6), and several alternatives hit ground walls, U-SW or S-01's guard. I did not establish that the observation bay can see all map regions. Its clear south-mid ray to(54,25,1.6) remains34.79 m. Report measured rays rather than inferring omniscience from the low apparent wall height in a three-quarter screenshot.

## 5. Other network sections — confirmed long runs for follow-up

- West Long: (12,22,1.6)→(12,63,1.6),41 m clear. W-01 occupies X6..10, leaving the eastern firing channel intact.
- East Long: (88,22,1.6)→(88,66,1.6),44 m clear. E-01 occupies X82..86, leaving its eastern firing channel intact.
- Rear gallery: (25,87,1.6)→(77,87,1.6),52 m clear.

All six endpoint placements passed the standing placement check. These runs should be considered alongside spawn/mid repairs; fixing only the spawn ray would preserve several similar duel channels. Segment them at purposeful preparation/contact boundaries and keep role allocation and rotations legible. The site itself can retain a deliberate longer shot if the surrounding choices and counterplay justify it, but that is a reviewed design choice rather than a default pass.

## Height-aware layout and blockout follow-up

The next 2D layout must show blocker footprints **and top/underside elevations**, with at least central and upper sections. Tall opaque building masses above the5.6 m upper eye can robustly screen cross-region views. Suitable masses belong in the inaccessible building strips, not arbitrarily across circulation. Do not simply raise every3 m boundary wall to7–8 m: several pass beneath the bridge, so that would obstruct the Z4 deck. Split masses around the crossing or author a true opening preserving the3.7 m underside clearance and all intended paths.

Run the same finite rays at standing and low-camera heights on the revised compiled geometry. Add area sampling around spawns, entrances, shoulder positions and ramp/stair elevations. Capture opposite views of repaired blockers and important diagonal cases. Evaluate forward routes and reverse post-plant ownership with tactical review; static ray counts cannot certify camp-free play or competitive balance.

No production source changes made by this reviewer. This report requests concrete visibility repairs and a new source-matched review round; it does not invalidate unrelated structural results on R04.
