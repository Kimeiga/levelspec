# Switchback L01 — independent tactical layout review

**Verdict: changes required at the B staging interface; macro graph accepted for blockout once that local mismatch is resolved.** This is drawing-stage review, not competitive acceptance. Reviewed `brief.md`, `layout-data.json`, and the actual `generated/switchback/layout-L01.png` before reading author rationale or other review verdicts. Subsequently read `design.md` to reconcile intent. Applied fps-map-review and fps-strategy-design.

## Consequential finding

**LT-01 / Cistern-high → BP → B-main: aligned longest-climb exit contradicts the staging contract.** Cistern-high ends at (24,41,20); B-main starts at (24,47,20) and ends at (24,51,20). Thus the climb, six-metre staging room, and site entry share one centerline. `BP-bench` at X29..31 does not screen this line. Unlike the A and Mid room turns, there is no offset onward doorway. A defender near the site-side entry can contest the emerging crest along the same axis before the attacker has used a separate preparation position. The exact first-visible body fraction is a blockout question, but the missing turn is already evident in the drawing.

Repair locally: move B-main to the east side of BP, or add an architectural return that separates climbing and committing. Retain at least the proposed two-person width and inspect that the bench does not obstruct the new path. An offset alone is not proof of concealment; after modeling, compare B-side standing and elevated views against an ascending leader, follower and crouched player. The intended burden is a level staging choice before the site fight, not mandatory immunity while climbing.

## Timing and territory assessment

The following are optimistic **plan-distance estimates**, computed by joining authored portals with straight paths inside each room and ignoring cover, body radius and acceleration. Divide XY distance by the stated harness speed 3.4m/s; these are not measured traversal times. Stair rise does not independently slow horizontal movement in the current inspector. Actual usable paths and target-engine mechanics may differ.

| Path | Estimated plan distance | Estimate at 3.4m/s |
| --- | ---: | ---: |
| T through Orchard to AP (-28,40,16) | 67.4m | 19.8s |
| CT through A to the same AP point | 61.2m | 18.0s |
| T through Cistern to BP (24,44,20) | 69.4m | 20.4s |
| CT through B to the same BP point | 60.4m | 17.8s |
| T through Market to Valve (2,53,16) | 55.2m | 16.2s |
| CT through A to the same Valve point | 67.2m | 19.8s |
| A plant → B plant through Valve | 63.1m | 18.6s |
| A plant → B plant through CT road, excluding short links | 96.4m | 28.3s |
| AP → BP through T, excluding site approaches | 136.8m | 40.2s |

These support a meaningful asymmetry: CT can threaten outer crests early, but T can pressure Valve before a similarly direct CT path reaches it. A fast three-player CT push cannot safely assume the middle is locked. Conversely, a lone T Mid player is not guaranteed to convert early arrival into control when the two site-side doors become active.

The high road is dependable in topology but materially slower than the contested contour route. Calling it a fast rotation would be misleading. The design needs a clock/defuse contract in the target engine before deciding whether the ~28s plant-to-plant high-road estimate leaves a useful retake. It is acceptable as a secure early-round reinforcement route and an expensive late commitment at this stage.

## Scenario review

- **Opening 5v5 default:** 2 Orchard / 1 Market / 2 Cistern can gather three fronts, while 2 A / 1 Valve / 2 B cannot simultaneously hold deep outer crests and every site-side crossfire. The solitary Mid attacker needs an explicit fallback when both Valve side entries activate. MID's level room is a plausible fallback; whether its bench works is pending geometry. Initial CT positions are reached sooner than outer T crests, so compiled checks must include aggressive CT prep-room holds, not only passive site defense.
- **A commitment:** three main plus two Valve creates distinct lateral pressure around the tank. A site anchor can switch protection, but that movement should surrender vision of one entry. A-retake supports defender withdrawal; its eight-metre climb also makes that decision costly to reverse. No graph change is required merely to give a trapped anchor a second safe escape.
- **B commitment:** main and short have different height histories. B-main should supply a level alternative to the four-metre B-short ramp, making LT-01's preparation turn consequential. If short is held, an A-side pressure response is geographically credible while Valve is retained. Cistern is only ~2m longer in optimistic XY distance than Orchard; describing its height as automatically much slower is unsupported by this harness.
- **Fake and reset:** an outer lane cannot pivot cheaply to the other outer lane without winning a site or retaining Mid. The ~40s AP–BP lower-route estimate makes late solo fakes a poor baseline plan. This is a deliberate strategic cost, not a demand for another lower cross-connector. Test whether teams still find the outer routes worthwhile rather than always sending four players Market.
- **Defender push:** CT may reach AP/BP roughly 2s before T under optimistic assumptions. A two-player hold on a straight flight can turn the hill into sequential head exposure. Test trade visibility from the follower at intermediate treads, utility release space below the crest, and escape to the +8 landing. A successful crest push should expose the abandoned site to Valve pressure; verify that this response arrives before the push trivially resets.
- **2v2 retake/post-plant:** high route plus Valve is a plausible split only if both were already controlled or reached with enough time. Two retakers starting together on the road cannot instantly appear at both entries. Tank/turbine should force the planter's partner to decide between connector watch and plant trade. The drawing allows those choices but does not establish timing or shootability.
- **1v2:** the survivor can use the tank/turbine to change the next visible opponent; successful clutching is not promised. If one stationary corner sees plant and both retake entries, that becomes a blockout defect to investigate. No unsupported jump/drop route is counted as a bailout.

## Reconciliation with author rationale

`design.md` correctly identifies Mid control as the condition for credible late rotations, and treats high ground as a bounded route instead of global surveillance. The two-site elevation difference creates a real B-short ramp encounter absent at A. Retain those hypotheses. Qualify “vertical movement spends time”: route geometry and terrain-induced detours can spend time; the current inspector has no separate uphill speed penalty. The stated B staging benefit needs LT-01 repaired or specifically defended using geometry.

## Deferred blockout and playtest gates

1. Actual local route paths, both directions, body/clearance and measured or explicitly estimated travel times.
2. Opposing crest/toe/intermediate views on all six T climbs; same-view support for the following teammate, with standing/crouched states separated from optical offsets.
3. A/B attack and retake entries, plant views, cover switching and whether an upper-road view defeats low site cover.
4. CT push into AP/BP versus the earliest T Valve pressure; target-engine throughput, utility, audio and weapon behavior remain unavailable.
5. Actual 5v5 sessions and 2v2/1v2 post-plants before any balance claim. In particular, determine whether Mid is a useful option or a compulsory tax, and whether high-road retakes fit the eventual bomb clock.
