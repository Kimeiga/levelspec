# Greywatch — independent tactical blockout review r2

**Verdict: accepted as a 5v5 defuse blockout for target-engine integration and playtesting.** No further mandatory geometry repair is supported by the inspected tactical evidence. This is not competitive balance, gunplay, utility, multiplayer-throughput or game-mode acceptance.

Reviewed source SHA-256: `d976e48cb2564af26159594320232e98fa739d29309a4fc1386d0c75b4de04f6`. Physical hash: `604e2096ea2166357d5b55159c215a2c21ba0baeb7888ad9d4ea05d90f215bdb`. Layout r5 preserves the r4 accepted strategic composition and repairs the east-stair ground transfer.

## Evidence and independence

I inspected actual compiled overview/plan, paired A main/rear, paired chapel main/rear, both bridge directions, low bridge viewpoint, both underpass directions, stair views and gatehouse view in [capture-r2](../../../generated/greywatch/capture-r2/capture.json) before considering the author’s tactical explanations. I then inspected the independently captured opposing aisle, kitchen, long diagonal, corner-candidate and low/elevated cover views in [capture-visibility-r2](../../../generated/greywatch/capture-visibility-r2/capture.json). Both manifests identify the reviewed source; both report no browser errors. I also inspected A/main, chapel/main and bridge views from [capture-final](../../../generated/greywatch/capture-final/capture.json), which repeats the same source with the declared 90° horizontal / 65° vertical framing.

I reviewed [strict validation](../../../generated/greywatch/build-r2/validation-cli.json): success, zero error diagnostics and zero uncovered navigation samples at cell 0.125 m / coverage spacing 0.5 m. I reviewed [24 performed single-body WalkMotion paths](../../../generated/greywatch/walk-r2b/report.json), all passing with the unchanged radius 0.30 m, standing 2.0 m body: both directions of all four stairs, bridge, underpass, CT deployment, rear rotation, T ward approach, mid transfer and ambulatory. These are performed sampled physical/navigation inspections, not continuous collision sweeps or five-player movement tests.

The complete [visibility-r2b scan](../../../generated/greywatch/visibility-r2b/report.json) used 803 admitted points on a 2 m grid, eye offsets 1.86/1.023 m and 333,722 queries. Protected spawn-offset tests had 0/1,924 visible pairs; upper-walk-to-T tests 0/5,032. Unknown materials/dynamic-face omissions and query-budget exhaustion were absent. Fifteen body samples were rejected and 1,275 unassigned navigation triangles excluded. This sampled evidence can miss narrow views and does not establish projectile, sound or smoke behavior.

## Decisions on repaired relationships

**B approach convergence: closed in actual blockout.** The aisle-to-nave view shows an eastern entry facing the plant and rear apse from a side angle, with nave pillars interrupting the view. Its reverse shows that the pillar/sarcophagus geometry can hide part of the receiving space. This is a real changed threat from the main southern nave gate; the entry was not lost during modeling. The performed vestibule→ambulatory→B route and reverse both pass in 12.41 s on the prescribed path. This duration demonstrates a costly viable journey, not the exact extra cost relative to the shortest main-gate route. A pair can pressure the main door while another commits around the aisle, but immediate mutual trade across the pillar is not guaranteed.

**Ground mid→B transfer: closed in actual blockout.** The north-of-stair transfer restores access without climbing or detouring through A. Both prescribed mid→B paths pass in 14.31 s. The east landing still has a separate elevation/approach cost. A defender contesting the vestibule can threaten a transfer player, while an attacker who has crossed can choose the main gate or aisle. The filled stair no longer invalidates the tactical graph.

**A approach differentiation: retained.** Actual main-entry and rear-entry views show a bounded ward threshold, a separate stair/short receiving area, low fountain and tall east stone. A CT holding the south doorway cannot treat the short/stair appearance as the same last gate. A player at the low fountain must respect height and side exposure; it is directional preparation, not all-angle protection. The north cloister is a real retreat/retake interface rather than a teleport between sites.

**Wall walk and underpass: retained.** Opposing bridge views show alternate-side low refuges and merlons with a passing strip; the lower underpass remains a different encounter with overhead confinement and ground exits. Bridge control earns a cross-wing move at the cost of stairs and exposure. The 6.5 m-high side masses make most of it a bounded raised passage; elevated views into the sites occur chiefly at the stair landings, not as a continuous open overlook. It does not expose either protected spawn in the performed scan. The [actual stance-helper record](../../../generated/greywatch/stances-r2b/report.json) has 12 supported standing/crouching poses at six low-cover positions, with the same source and no errors. I inspected fountain, bridge refuge, sarcophagus and aisle examples: crouching lowers the real capsule and eye behind the local object and removes the forward view visible while standing. This supports a duck/prepare/peek decision, not all-angle body concealment, invulnerability or bullet protection.

## Timings and their consequences

The navigation paths below are measured lengths. Seconds are **distance / harness standing speed 3.4 m/s estimates**, excluding clearing, utility, player interference, weapon speeds and combat. They are not measured first-contact times or target-game clocks.

| Path | Length | Estimate |
| --- | ---: | ---: |
| T spawn→A |79.16 m|23.28 s|
| T spawn→B |81.49 m|23.97 s|
| CT spawn→A |29.18 m|8.58 s|
| CT spawn→B |30.90 m|9.09 s|
| A→B rear rotation |54.29 m|15.97 s|
| Mid→A |34.53 m|10.16 s|
| Mid→B |39.63 m|11.66 s|
| Upper crossing |30.46 m|8.96 s|

CT can establish site positions substantially before T reaches the plant markers. This supports the defensive brief but also gives CT time to choose a forward contest. Site-marker arrival alone does not locate the first fight. Measure fastest/slowest starts to ward bend, upper landings and vestibule against a forward CT setup in engine playtests.

The actual prescribed T ward walkthrough took 30.37 s and CT deployments 11.40/11.98 s; these longer chosen paths are not shortest-path equivalents. The prescribed rear rotation took 16.27 s. A site-to-mid-to-other-site path has roughly 74 m of endpoint-composed travel, about22 s at harness speed before clearing. Therefore a late 2v2 retake cannot assume a free opposite-side flank: either already own that territory, start early with sufficient planted time, or coordinate the rear entry. Actual plant/defuse clocks remain unspecified.

## Target and stress scenarios

- **5v5 default versus 2–1–2 probe:** retain 2 A / 2 B / 1 rear flex. The rear player responds to information through the cloister; claiming lower mid requires advancing through a site. T mid can reinforce either wing and T outer pressure can switch onto the wall walk before reaching site. Opposing stair/underpass views support distinct information commitments. Neither the fifth CT nor a T bridge player receives global free observation.
- **Five-player A rush:** the ward threshold is clearable and reversible, and a second wave can use the west stairs/short rather than stack behind one final appearance. CT can delay and retreat through the north arch. Five-player body blocking, spawn-screen collector flow and trade delays remain unperformed; the single-body passes do not settle them. Test against an early CT ward push as well as a passive site pair.
- **Five-player B rush:** two or three players may show at the nave gate while a pair uses the aisle. The aisle has a real travel/turn cost and cannot be assumed to arrive simultaneously without staging. CT can allocate a player to the side opening, retreat to the apse, or push the vestibule before the split. The pillars produce clearing and support costs for both sides. This resolves the earlier all-approach final-gate failure while leaving utility effectiveness for engine tests.
- **3v5 after an early loss:** T survivors can reset through the vestibule/mid or switch across the wall walk instead of repeating the same site gate. Those moves spend time and abandon information; the bridge is not a safe rescue route under enemy landing control. A reduced CT team can give up forward territory and preserve a rear retake option, with a real risk of losing the plant. The map need not make numerical disadvantage fair.
- **2v2 planted, one exhausted-utility player:** rear entry offers the quickest site-to-site reinforcement but announces a bounded interface. A post-plant holder at fountain/bench or B sarcophagus must account for a different threat if a flank is already established. A newly started long flank may be too late, depending on the actual clock. Test low-utility retakes with controlled remaining time and log first trade/defuse access, not only success rate.
- **Isolated 1v2:** corner holds can concentrate visible approaches, but a pair can vary main/short or main/aisle timing and force the holder to reveal an aim direction. Low cover permits a preparation/peek decision; tall stone/pillars permit concealment at the cost of a new blind side. No claim is made that these positions can always be cleared solo or that trading is automatic.

## Visibility warnings adjudicated tactically

The 60.53 m A-south↔vestibule standing diagonal is a **retained long-view risk**, not an automatic failure. The paired actual captures show a narrow line around architectural screens and over the falling-stair guard, rather than a full view of both sites or a protected spawn. A player exploiting it commits attention across the transfer area while local court/vestibule threats remain. It can provide long-range information or punish a standing crossing. Test whether a rifle/sniper can exploit the aperture repeatedly and whether ordinary crouched/supporting movement changes that exposure; no grenade or penetration claim is made.

Single-sector warnings occur at A(10,72), B(56,72) and B(56,60), with partial entry portals. Actual candidate views contain occluded portions, pillars/stone and changing receiving spaces; an angular envelope is not proof of holding complete bodies or all exits. Retain these as deliberate corner-hold playtest targets. Push them with staggered dual entries and record whether the second player can force or trade a reposition. There is no supported need to add another doorway or random cover solely to defeat the heuristic.

## Remaining acceptance limits

The authored geometry and sampled traversal support the proposed decisions. The blockout is ready for practical ten-player testing. Target-engine bomb/round logic, movement parity, body blocking, penetration, grenade collision, smoke/flash behavior, audio, fall/boost rules and actual competitive balance remain unverified. Preserve the final source hash when reproducing these findings; reopen only changed encounters and interfaces after subsequent tuning.
