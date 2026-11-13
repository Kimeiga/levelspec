# Galini L03 — independent detailed strategy/player-behavior review

**Verdict: accepted at detailed-layout stage for strategy/player behavior.** No supported macro defect requires a geometry revision before native production. This closes only this independent scope. The separate local/spatial return must close independently; compiled movement, visibility, opening/contact timing and objective play remain open.

## Revision, independence and evidence

Reviewed 2026-11-09 by `reboot_strategy_final`, independent of the author and the local-return reviewer. I did not author a selected change. This is the first full detailed strategy assessment I have performed on the final recomposed map. I read the brief and raw L03 overview, all five aligned floors, SEC01–SEC10, shared-volume sections, turns-and-neighbors, and the layout/encounter data before the L03 README and disposition. I did not read prior verdicts. The raw sheets, brief and JSON contain author predictions, historical status and scenario prose; exposure to those embedded claims is explicit. They were treated as hypotheses, not independent evidence.

Verified SHA-256:

- `manifest.json`: `f998d68345f6b7dfbb2977c36498273cc202b105741412bbbd23fe0fb88b760a`.
- `layout.json`: `72ac4503f7e74d5369572826a4bc683c1d8f7cb474b47e7a231403e7d19f837d`.
- `encounters.json`: `af57a36aa16d44a26a146b4f757257b56172556de1b02bfafc69c8e31266009c`.

Assumptions are 5v5 defusal, no respawns, provisional rifle/smoke/flash/grenade economy, 115-second round, 40-second plant clock, 3.2-second plant, 5/10-second kit/no-kit defuse. Equipment quantities, ballistic rules and audio are not supplied. The original radius .30, standing 1.80, crouch 1.10, step .30, slope 42° body is retained. Harness speeds 3.4/1.7 m/s are inspection settings, not established game movement. No utility success, jump/drop route or instant communication is needed to make the accepted spatial plans conceivable.

## Territorial reading

West middle is useful because it lets attackers continue through the occupied Press passage toward Taverna, or turn into the Press house toward A, after the initial Laundry/Cooper choice. The two starting climbs are not interchangeable cosmetic entrances: Laundry incurs an internal return and gallery before its two upper exits; Cooper reaches the exposed southern receiving street. M05 then creates a real change of direction and loss of follower sight. Control must be earned across the next mouth rather than inherited from being somewhere in the district.

The ravine commits players to actual crossings. Upper civic gives CT an early A connection and later a contested retreat/retake route; middle Taverna creates east-middle access and the Salt/School decision; shore avoids both crossings but has a long low commitment. A team controlling one does not automatically control the other levels. W02 is a narrow middle-observation opportunity purchased by standing on the upper crossing and looking away from its ends. W03 purchases partial Fountain information by leaving the ridge-facing role. Neither substitutes for a player holding the lower territory.

The east School assembly supports distinct upper and lower journeys: D17–D18 is a through-arcade below the occupied room; the internal return stair and Bell public stair change level. Slabs deny automatic mutual support. This is valuable uncertainty and commitment, not five simultaneous duties for one reserve. SS01–SS03 preserve those intended journeys in the paper contract without adding a new rotation.

## Intended-population scenarios

| State and allocation | Approach → information → contest → response → next action |
| --- | --- |
| **5v5, deliberate A development** | Attackers can allocate two Laundry, two Cooper and one shore observer/bomb escort with a specified reassignment. The west pairs develop different arrival angles, then commit three to A while one retains Press and the fifth joins or holds a rear. A CT setup of two A/upper, two east/B and one middle is feasible as a starting allocation, not proof of arrival priority. Contact at D03 or D06 does not reveal the whole attack. Defenders can concede the receiving street and retain the A crest/Press-house arrival. Attackers must regroup after a lost entry; the Press holder cannot also trade a fight around Chapel or inside S4. A split A hit becomes credible only after both fronts are positioned. |
| **5v5, 3+2 B pressure** | Two shore players stop before the Boat precinct; three develop west middle and Taverna, then use Salt. The bomb's route must be declared: a bomb with the shore pair can capitalize earlier but is exposed to a failed local duel; a bomb in the middle group arrives later and is safer only if that group succeeds. CT can devote two to B/road, one Fountain/Taverna, and two upper/A. Learning of two shore attackers warrants B attention but does not prove the bomb or all five. Moving the Taverna defender to B makes the middle bridgehead easier to take. The shore pair must wait for an actual Salt arrival, not a call that the third player has entered Press. |
| **5v5, fast shore challenge** | The straight low journey can bypass a slow middle default. CT's road and elevated descent may deny planting before CT feet reach the footprint, but this is a critical compiled timing/view question. A two-person B allocation has to choose forward shore information versus retaining the Customs/Salt interfaces; it cannot fully hold both with a guaranteed trade. The low route's weak late reset is the price of its early commitment. |
| **3v3, learned Taverna hold** | Three attackers at west middle can hold one Press exit while a pair uses S4 toward A, or keep a pair threatening Taverna with a third preserving the return. They cannot simultaneously sell a convincing A hit, hold both crossings and create a two-player B execution. A CT pair holding Taverna can be avoided by paying the A ascent; a single CT left at A can delay at a different approach and request help. The attackers' choice is credible because the objective can move, not because every defender hold needs another doorway behind it. |
| **3v3, split shoulders after a casualty** | Two advanced east plus one at west Press are separated by the exposed middle crossing. Keeping Taverna allows return toward west; losing the bridgehead makes upper/shore reconnection a long operation. A teammate on upper School cannot trade through the slab for a player in the lower arcade. The correct next action may be to hold earned territory or commit B rather than chase a nominal flank through Bell. |
| **2v2, A postplant** | Two defenders both east have an intelligible common upper approach, with one advancing and one supporting until the bend by West Homes breaks that relationship. A second route through west middle/S4 only counts if a defender is already there or a measured clock permits it. Two attackers can hold a site-side angle plus a fallback watching the likely return; abandoning both to distant postplant positions would surrender bomb information. A lost CT trade can leave an unfavorable but intelligible 1v2 rather than a promised solo clear of simultaneous angles. |
| **2v2, B postplant** | A defender already on east middle can choose Salt or Customs; two defenders can split those interfaces but forfeit direct mutual support during the descents. Two attackers must choose between shore-side cover, Customs interior and covering Salt; they cannot cover all three perfectly. A defender still at A is not credited with a timely two-front retake merely because a path exists. The 40-second clock minus travel, clearing and 5/10-second defuse may make saving the rational outcome. |
| **1v1, late objective information** | W02/W03 give partial evidence, not the bomb's location. A lone player can change the next duel by yielding a stair mouth, reusing a building turn, or choosing the other objective early. A late cross-town feint is costly and may fail on time. No geometry defect follows simply because a player who loses the wrong territory cannot recover both sites. |

## Time and support audit

I summed the supplied route polylines in 3D. These are **drawing-distance estimates**, not shortest-path proofs or measured walks. Dividing by 3.4 m/s omits acceleration, corners, steps, body avoidance, stops and fights. It is useful for rejecting free rotations, not certifying opening balance.

| Named witness | Polyline length | Uncontested 3.4 m/s estimate |
| --- | ---: | ---: |
| Ferry–Laundry–Chapel–A, R01 | 155.2 m | 45.7 s |
| Ferry–Cooper–Press, R02 | 82.8 m | 24.4 s |
| Ferry–shore–B, R03 | 97.0 m | 28.5 s |
| CT–civic–A, R04 | 78.7 m | 23.1 s |
| CT–School–Salt–B, R05 | 139.2 m | 41.0 s |
| CT–Bell–road–B, R06 | 122.1 m | 35.9 s |
| Laundry upper–Taverna–Fountain, R07 | 100.5 m | 29.6 s |
| Taverna–Salt–B, R10 | 58.2 m | 17.1 s |

The opening asymmetry deserves a real test. R03 reaches its `(94,25,0)` shore witness at an estimated 23.9 s. R06 reaches `(129,54,4)` at 21.4 s, its `+2` road point `(130,40,2)` at 25.6 s, and the low foot `(126,30,0)` at 28.8 s. R05 reaches Salt's northern threshold `(93,42,4)` at 29.7 s. Thus full site-arrival comparisons alone would mislead: early height or road information might stop the shore plant, but those sightlines are not established here. A CT A setup lead and a contested B entry are a coherent intentional asymmetry; an unopposed B plant every round would be a defect only if later evidence demonstrates it.

Follower support is conditional at the Laundry gallery, Press bend, Taverna return, School well and civic receiving bend. The advanced F1 witnesses use real movement and improve the hypotheses, but do not imply immediate trades from the old staging positions. The selected shore F/L witnesses both have a plausible line toward O; they should not be described as isolated merely because a deeper southern movement can break support. No smoke is assumed to block every threat, no grenade is assumed to flush an entire room, and a player throwing utility is not simultaneously providing an uninterrupted weapon angle.

## Consequential proposals and disposition

**GA-ST-01 — opening/retake timing risk; compiled obligation, no paper repair.** Inspect SEC06/07/09 with both earliest shore and CT road/Salt bodies on the frozen native revision. Measure first reciprocal sight, first useful denial of the plant footprint, and fallback; repeat the actual 2v2 A/B postplants with known starting locations and remaining time. If fast shore becomes an uncontestable plant, compare a modest CT road-start improvement or a local attacker approach delay, not an automatic new cross-map connector. Such a change would trade early CT information against pressure elsewhere and needs both scopes again. Status: carried to compiled verification.

**GA-ST-02 — optional shore preparation experiment.** At the long low segment between M19 and the Boat Shed, compare the current exposed lane with one shallow quay/loading recess attached to the existing south-side mass around `x68–78, y18–24, z0`, leaving the main north edge and connections intact. A shore pair could briefly gather after contact while one retains the east view; the defender could hold the far exit or push the recess at the cost of site distance. It would sacrifice the current clean long sight and make the B commitment safer; it must not provide a protected free run or a second mandatory blind corner for every retake. Test earliest B arrival and two-person support against baseline. Status: optional, deferred unless author selects it; not a condition of this gate.

**GA-ST-03 — retain bounded observation and the distinct School journeys.** Do not enlarge W02/W03 merely to give reserve players more work to do. The current information-versus-position cost is strategically stronger than a panoramic perch. Likewise retain S3's occupied porch and the S1/S4/S7 returns and S2/S5/S8 quarter-turns unless compiled behavior exposes a concrete defect. Curved or spiral stairs have no automatic strategic benefit; no additional form is required. Status: retain; compiled body/visibility checks remain.

After the independent raw pass, the author disposition supported the same reading: School work preserves lower circulation, witnesses repair paper route centers, and the support wording is narrowed correctly. I accept those defenses as contract clarifications, not proof of native implementation.

## Remaining evidence limits

No AML or native scene was reviewed for Galini. No continuous movement, headroom, standing/crouching line, projectile/utility/audio behavior, congestion, learned human play or competitive balance is certified. The local reviewer owns construction and focused visibility acceptance. My compiled return should reuse this macro reasoning and concentrate on changed relationships, actual opening pressure, finite support at bends/crests, and the two postplant states rather than restart the whole layout review.
