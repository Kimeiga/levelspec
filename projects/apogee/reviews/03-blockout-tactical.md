# Apogee — independent blockout strategy review: R06 final

Final status: **R06 accepted for the blockout strategy/player-behavior scope.** The confirmed R05 Mid→T-spawn offset leak is closed by the verified L06/R06 repair. No supported tactical geometry repair remains in this scope. The separate spatial and section visibility verdicts remain their own gates. This review does not claim balance, human play or target-engine gameplay acceptance.

The R05 baseline observations below are retained as revision-scoped evidence; the final R06 follow-up at the end supersedes their pending items. Source comparison supports reuse of unchanged site and route relationships.

## Revision and inspected evidence

R05 loaded/current AML SHA256: `979a5d74b9712f1d55afb129c79c9a88ca1d62827e1872da05e8b97e5c746fde`. Inspected raw source and all14 actual `generated/apogee/capture-r05/` views before other reviewers' conclusions: overview, plan, A-front/rear/low, B-airlock/data/reverse, Mid, Optics crest, Rim crest, Skybridge, Underpass and CT ascent. Capture manifest reports this exact source and no browser errors. Layout L05/R05 source retain26 named spaces,37 real portals and the existing Optics landing; the upper crossing is not a lower-level transfer.

Read supporting `validate-r05.json`, `walk-r05/report.json` and final `portals-r05c/report.json`. Validation has zero diagnostics, one navigation component and zero uncovered coverage samples (0.5 m sampling). All13 authored route requirements remain. The unchanged0.30 m radius /2 m body replayed the13 navigation paths both ways:26/26. The corrected physical-support portal driver reports74/74 directional transitions and4/4 stance studies at the same source hash. Intermediate portal drivers'71/74 and72/74 are not the final result. These are bounded land-navigation/physical samples, not continuous capsule sweeps, team throughput or gameplay reachability proof.

The stance studies actually change WalkMotion from2 m standing to1.1 m crouch and back at A-L1, B-L3, SK-L1 and SN-L1. In each selected opponent ray standing is visible and crouching occluded. This supports those four particular duck-refuge relationships. It does not establish all-angle body/weapon cover, elevated protection or bullet resistance for every low object.

## Whole-map and east-interface findings

Compiled A-front/rear/low views confirm the telescope pier divides the front/rear sweep while the rear and bridge retake doors reach different sides. The plant remains exposed to an east bridge contest unless attackers allocate attention or relocate; one central machine does not make the whole site safe. Optics and Airlock remain adjacent front entries, so their value is coordinated front pressure and route flexibility rather than a guaranteed wide pincer. Rim ascent's longer journey is a quieter alternative, with its own staging threshold.

B-airlock/data/reverse show the Cryo chamber hides parts of the eastern plant from a western entry, while leaving approaches around both ends. It cannot protect an occupant from Airlock and Data simultaneously without moving. B-L3 gives a real selected crouch refuge, while standing at that refuge remains visible. Control's P30 and Decon's P31 are distinct site entries; portal replay supports access through each, although these14 captures do not exhaust every interior Control/Decon corner. A paired retake can choose north/west and east pressure; an isolated player must commit to clearing a side. This is a spatial opportunity, not a measured successful retake.

Underpass and Skybridge views preserve the two separate circulation levels; the bridge does not grant an all-map panorama. The staggered low refuges now meet their walls, removing unusable0.32 m strips. S-CT's physical west edge is68.30, center71.15 and width5.70, with guards on the actual edges. The corrected structure preserves both CT entrances and the same rotation. No player body or route requirement was loosened to clear the repair.

## Scenarios

|Case|Supported behavior and opponent response|Still to test|
|---|---|---|
|5v5 default /2–1–2 T probe|2A/2B plus Archive–Data flex covers exits while Ts choose west ascent or east lab progress from Calibration. CT flex is not assumed to reach Calibration first.|Actual information/calls, first contact and utility allocation.|
|Five-player rush either site|CT objective paths are shorter than T paths; rooms allow followers to stage before the declared thresholds. Defenders can delay and fall to rear entries on paper.|Five bodies, blocking, spawn-slot timing, weapons and whether delay survives traded pressure.|
|4+1 T split|Airlock plus Optics offers A front coordination; Airlock plus Data offers B pressure from different sides of Cryo. CTs can contest the secondary group rather than passively hold the plant.|Trade timing and whether utility separates the relevant fights.|
|3v5 CT retake /site loss|Losing Archive threatens the common B reinforcement route. Survivors can concede Mid and regroup rather than cover every room. A late distant anchor cannot be assumed to clear/defuse in time.|Chosen bomb clock and measured travel+clearing+defuse.|
|2v2 postplant|A's north/east retake entries divide plant attention; B Control can synchronize P30 with Decon/P31. Attackers can move around the major site machine as the entry is learned.|Live communication, learned holds and after-contact repositioning.|
|1v2 retake|Different entries permit an information-dependent choice, but do not guarantee two isolated duels. The two attackers can punish the chosen Cryo/pier side.|Actual sound/utility/information and clock costs.|
|Late1v1 rotation|Northern route remains physically connected; objective choice matters because a complete site-to-site transfer is substantial.|Whether a late fake or defuse attempt is viable against the exact timer.|

## Measured distance, estimated time

Actual compiled navigation distances: T→A78.2 m, T→B78.7 m, CT→A43.1 m, CT→B59.5 m, A→B89.3 m. Dividing by the harness3.4 m/s gives approximately23.0/23.1/12.7/17.5/26.3 s respectively. These are distance/speed estimates, not measured combat or round timings; spawn slots, turns, support, utility and clearing change them. The earlier layout-only29–33 s site-rotation estimate is superseded by this89.3 m compiled path, but **26.3 s before clearing still makes late full-site retakes a material timer question**. Do not call the rotation unconditionally quick. Objective-center distance differences do not alone establish a first-contact margin.

## Visibility finding and scoped disposition

R05 sampled visibility used3 m grid spacing, configured eye offsets1.86/1.023 m,35 m long-view threshold and90°×65° study FOV. Protected opposing-spawn regions report0/1020 visible sampled pairs, but Mid→T-pocket reports64/3128 visible pairs, including actual T anchors after dedicated inspection. This is a real offset leak; center-only blocked pairs do not close it. Accepted L06 widens IT-S1 west to x42..46 while keeping room links and4 m/6 m nominal side lanes. **Pending:** compile L06 and verify the exact leaked pairs plus the affected body route.

The separate longest69.26 m Transit→Boot-exit ray is retained for a focused sniper/utility playtest. It terminates outside the actual spawn anchors. Holding it costs a Transit commitment, with Calibration route changes and Data→Archive pressure available to opponents. Its length alone does not support adding another block. This is conditional tactical reasoning, not proof that the hold is balanced.

R05 audit is explicitly `complete:false` due to a scenic gondola material opacity classification. Do not describe that run as a complete visibility pass. An opaque instrument-panel material correction is outside combat space; compare the exact source and physical identity before carrying this review forward.

## Acceptance limits and next checks

Recheck L06 raw compiled opposing views/rays and routes, then update this report against the final source identity. Retain the four selected stance results only where the relevant geometry is unchanged. Highest-value participant tests are B rush setup margin, adaptive4+1 B execute, A rear/bridge2v2 retake, the Transit sniper channel, and full rotation+clearing+defuse under the selected clock. No human play was conducted. Shooting, smoke shapes, penetration, audio, damage, economy, multiplayer collision, plant/defuse and competitive balance remain target-engine work.


## Final R06 repair verification and acceptance

**Accepted.** Final source SHA256 is `5a8bfef6a3f287167f0fef62359f8b46dfe94e72a5c9ad212238f6f6614718cd`; physical hash is `b228d1876324f815b04ddabde55db10c6117c99b4796ab9c1ad76affb8128316`. Independently compared current AML against R05's captured source. The changes are IT-S1's accepted westward expansion to x42..46, the revision description, and the scenic gondola panel's switch from an ambiguously classified glass material to existing opaque blue. No site, portal, other cover object, level transfer, player setting or route assertion changed.

Visually inspected all four revision-matched actual `capture-intake-r06/` views: Mid toward the leaked T offset, reverse T offset toward Mid, and both west/east passages beside IT-S1. They show the expanded screen intervening in the former offset channel while retaining two real, readable passage bands. Manifest has the final hash and no browser errors. The final14-view `capture-r06/capture.json` also records that hash and no errors. The unchanged R05 site/stair/bridge observations above are reused only on the exact source-diff basis.

Verified final `build-r06-result.json` success with zero diagnostics, `walk-r06/report.json`26/26 bidirectional route replays, and `portals-r06/report.json`74/74 directional transitions plus4/4 actual stance/ray studies. All have the final source identity. Thus the expanded screen has not broken the existing physical route checks; it did not require a smaller player or weaker assertion. The four selected crouch refuges remain unchanged and retain their specific verified relationships.

Read final `visibility-r06/report.json`: `complete:true`,657 admitted samples,295474 queries, no unknown materials, no dynamic faces and no exhausted pair budget. Mid→T-pocket is now **0/3128 visible pairs**, closing all64 earlier sampled leaks. Opposing-spawn offset regions remain **0/1020 visible pairs**. These results and the paired views close the supported leak in this review. The3 m grid and configured standing-body admission still miss possible submeter/tangent relations; excluded roof triangles and one rejected body sample are disclosed by the audit. A complete sampled scan remains distinct from continuous visibility or gameplay proof.

Final distances are T→A78.46 m, T→B78.68 m, CT→A43.13 m, CT→B59.52 m and A→B89.29 m. Only T→A changes slightly in this follow-up. The same speed-derived timing limits and untested bomb clock remain. The69.26 m Transit→Boot-exit ray also remains and is retained with the specific counterplay/playtest disposition above; it is not mislabeled a blocked or short line.

No further tactical geometry repair is supported by the inspected R06 evidence. Competitive balance, full-body/weapon cover, team trades, five-player throughput, utility, sound, penetration, timer feasibility and human adaptation remain the prioritized target-engine/participant tests already listed. No human play occurred.
