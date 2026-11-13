# Independent tactical layout review — L03

**Verdict: accepted for layout at L03.** L01 required a CT-deployment repair; L02 moves the shared CT spawn to the existing rear service wing and resolves the supported free-B-rush mechanism at drawing scale. Compiled movement, height/visibility checks and multiplayer playtests remain open gates. This is an independent strategy/player-behavior review, not competitive balance acceptance.

Inspected the user brief first, then the L01, L02 and L03 plan PNGs visually, exact `layout-data.json` footprints/doors/stairs, `inventory.md`, and the L02/L03 brief changes. No author strategy rationale or other review verdict was supplied before this assessment. Scope covers the whole map and the A/B entry–rotation interfaces. Dimensions, optical blocking and tactics below are layout predictions.

## L01 issue and L02 repair

**T01 — CT arrives too late to establish B, resolved in L02.** At the original summit spawn `(58,90,+12)`, CTs must traverse I/S7/R/N/U/V/S6 to defend B. A portal-center polyline gives approximately89m/26s to the B plant anchor, while T uses Freight/Pumps/K in approximately61m/18s. CT reaches the B rear entry substantially after T reaches the long entry. The likely opening is an initial B retake, even when CTs assign two players there; this undermines the requested two-site attack/defend format.

L02 moves all five CT positions to R at+6 and roofs that room. From the center spawn, the rear B mouth is approximately40m/11.7s away; T's long mouth is approximately50m/14.6s away. B defenders can enter the site before the long push. CT's A deployment through S7/I/command/AC remains approximately62m/18s to the plant anchor, versus approximately84m/25s for T main. The summit now works as part of A's rear approach rather than forcing every B defender through a double descent.

These are **distance/speed estimates**, not measured routes or match timings. `evidence/layout-timing-estimates.json` retains the paths and assumptions. Equipment detours, actual stair speed, door-edge shortcuts, spawn extremes and player congestion are omitted. U-low lies near the B deployment line, so the compiled route must go around it. The west-of-core B hold needs roughly another10m after the rear mouth; its setup margin is tight and is a priority to measure, not a guaranteed comfortable defense.

## L03 local cleanroom baffle

Visually rechecked `evidence/layout-l03.png` and exact changed fixtures. D-screen now occupies X32–37/Y53–55, against the west wall; D-low moves to X41–44/Y54–56. The screen interrupts the aligned M-D / D-W / W-R view instead of relying on a low fixture to screen the CT operations door. Entry from M retains a3m receiving strip before the baffle, circulation to its east, and a turn north toward W. CT flex can clear the side of the baffle or withdraw around it; the attacker can approach either onward branch without a single uninterrupted standing-eye ray into spawn. This adds a bounded cleanroom fight without changing the graph or the reviewed deployment. The A-short receiving route has a2m north strip beside D-low; body passing and trade views remain compiled checks. No further tactical layout repair is required by this local change.

## Scenarios and expected responses

| Scenario | Assessment and next decision |
| --- | --- |
| 5v5 default | A plausible CT2B/2A/1Mid deployment now branches from R: B through N/U/V, A through S7, Mid through W/D. The flex can retreat into D/R rather than being forced to stay on the first contact. T can begin with Freight/Concourse pressure and change between cooling and lower gallery, or between H and M. The movement choices have different destinations and height costs. |
| Five-player B commit | K and PC allow a broad front with lateral preparation before entry. B-core separates the western plant side from the eastern PC/J side; B-rack bounds the short/rear relationship. Two CTs cannot simply watch every entry from the plant anchor. A defender can delay near the core and withdraw to S6, while attackers choosing the PC side must clear the core's east and rear. Body-block throughput and utility efficacy are untested. |
| Five-player A commit | H/S3 main and D/S4/AW short arrive on different sides of the reactor. The core separates the rear from parts of the southern entry; A-screen bounds a west-side hold. Main can operate without winning all of Mid, while short requires exposure to the W/D interface. Low refuges support preparation after the stairs; neither stair has a protected mid-flight retreat. A five-player single-stair push is deliberately committed and needs actual trade/utility testing. |
| 4+1 split | Four B plus one M can threaten J through Q/S5, changing the east-side fight after initial long pressure. Four A plus a B lurker can punish a late B rotation, but the lurker does not instantly teleport into the rear: climbing S6 or rotating through the lower/M network costs time. CT flex must choose whether to hold D, contest M, or reinforce a site. |
| CT information push | A Mid defender can probe M/H, with D/W as a return route; the M-array stops an uncomplicated look through the whole atrium. A B defender pushing K/P becomes separated from S6 and can be traded from PC/L. Early information is available at the cost of leaving a site or rear assignment, not through an omniscient free vantage. |
| 3v5 after site loss | Both sites have routes for a paired retake and a separate pressure direction, provided the survivors still own the necessary territory. A players rotating to B have a long journey through either the rear service network or Mid/Q/S5. A late B retake may be impractical under the final bomb clock; the diagram does not justify assuming a flank arrives in time. Test early versus late rotation rather than promising all3v5 retakes are viable. |
| 2v2 postplant | At A, rear AC plus short AW can force the postplant pair to split attention, while the reactor permits position changes. At B, S6 plus J is possible only if the second retaker owns Mid/Q; two players starting together at S6 should usually trade the same entry rather than assume a quick split. B-core conceals the west plant from parts of the east entry, creating a real clearing cost. |
| 1v2 postplant | Neither survivor can clear every hold safely alone. A offers a reactor wrap, and B offers a core-side choice with room to reset; the objective must eventually force a commitment. Low cover is not assumed to defeat both standing and elevated opponents. Weapon penetration, bomb interaction and sound cues remain target-engine questions. |

## Deferred checks and playtest priorities

1. Measure all five CT/T spawn extremes to B's rear/long mouths and the west-of-core defensive hold. Preserve the L02 deployment repair; do not relocate anchors solely to improve a report. Compare a five-player B rush against an actual two-player setup.
2. Walk both directions of all seven stairs with the unchanged body. Inspect crest first appearances, teammate support, reversal clearance, and the AW-low / H-low / A-low1 arrival sequence. S3/S4 are deliberate12m exposed commitments, not demonstrated fair duels.
3. Inspect paired standing/crouching views at B-core, B-rack, A-reactor and A-screen. Confirm no single practical hold sees every hostile entry, and check that low refuges allow useful repositioning rather than producing tiny-target head holds.
4. Measure A↔B rotations via rear and Mid, then test site-loss retakes against the selected round/plant/defuse clocks. Long late rotations are the main unresolved strategic risk.
5. Verify that the new outward windows offer scenery only, with no walkable exit or unintended cross-site/upper-to-spawn view. Invisible safety panes prove neither target-engine glass nor bullet behavior.
6. Run actual10-player defaults, learned rushes,4+1 attacks and2v2 postplants. No human play, weapons, utility, audio, economy or damage has been simulated in this layout review.

## L04 local Q-low repair

**Accepted for the affected layout scope.** Inspected `evidence/layout-l04.png` and the updated exact fixture bounds: Q-low is X19–23/Y42–44, base+6, height1.25m, flush with the north wall. This removes the unusable slot behind the old fixture and keeps a3.85m south-side passage before body erosion. The Q→S5 journey, neighboring M threshold, low-refuge role, and map-wide tactics remain unchanged. The fixture should be regenerated in AML and its contact/route verified in the next compiled evidence; the pre-rebuild AML still contained the old placement during this review. This is a local layout acceptance, not a compiled pass or a new LOS claim.

## L05 local S1 optical repair

**Accepted for the affected layout scope.** Visually inspected `evidence/layout-l05.png` and the appended brief. Raising only S1-west from3.4m to5.2m above grade removes a predicted view from the crest toward low T-spawn offsets. It changes neither the stair width and main forward crest contest nor an intended movement/observation connection; retreat still uses the same stairs. This is preferable to accepting a spawn sightline as incidental. Reproduce the original rays and recheck S1's ascent/reverse movement in the compiled revision. Other tactical findings remain unchanged.
