# Last Light C01 — compiled review packet

**Ready for independent spatial/visibility, strategy/player-behavior, and architecture review. Author verification is complete; no final acceptance is claimed.** L02's independent gates are recorded in spatial-layout-l02.md and strategy-layout-l02.md. The separate [P01 curved-stair comparison](../planning/stair-comparison-p01.md) responds to new user steering; it has not changed this baseline.

Start with actual [roof-on](evidence/c01/captures/roof-on.png), [cutaway](evidence/c01/captures/cutaway.png), [top](evidence/c01/captures/top.png), [west atrium](evidence/c01/captures/west-atrium-across.png), [east atrium](evidence/c01/captures/east-atrium-across.png), and opposing [food-court south](evidence/c01/captures/food-court-south.png) / [north](evidence/c01/captures/food-court-north.png). Seven labeled [contact boards](evidence/c01/boards/) index all79 camera captures; individual PNGs remain full resolution. The source is [level.aml](../level.aml).

## Revision and construction

AML SHA-256: `7a31f5a513d49f8f6f45899c48dfb40ff67e96475e7a35a349b0607cab833069`.
Physical hash: `1df54b19e1fe3e12a5add4b4c90d4bd8fd32b77775888dffbfe47ff01251c32a`.
Render hash: `60a4e45125c68d5e9fe65c761746a525c420f48b9755156cc51395662ceb97c2`.

L02's exact boundaries become native slabs, editable extrusions, four native24-riser flights with tread-following guards, roofs, colliding translucent skylights and six roof mullions. The two reviewed1cm fascia corners have .40m overlapping caps. Millimeter-duplicate footprint vertices were removed; ≤2mm profile simplification removes micro-segment degeneracy without changing topology. No shared engine or original map files changed;90 original/S01/L01/L02 identities matched at capture freeze. Root subsequently requested a current README; its exact L01 bytes remain at planning/README-l01-frozen.md, with all other frozen files unchanged.

Whole-floor validation exposed six enclosed residual floor pockets not covered by the paper paths: two below closed cinema masses and four behind service/observation walls and guards. Nine local construction fills close these and three narrow junction slots. [Ground](../planning/construction-c01-ground.png) and [upper](../planning/construction-c01-upper.png) overlays show every affected area. Upper infills stop at guard height4.7; ground cinema infills stop at slab underside3.25. No claimed route, portal, objective, body setting, stair footprint or upper receiving territory changed. Exact IDs/bounds and source mapping are in [construction-c01.json](../construction-c01.json). Review these realization choices independently.

## Native verification

Strict-floor-gap validation and native build pass with no diagnostics at navigation cell .125. Build uses `--no-uv`; Blender is absent. GLB, OBJ, runtime, native plan and reports are in `generated/last-light-reboot-c01-build/`.

[Physical inspection](evidence/c01/inspection/inspection.json) records84 successful continuous waypoint-chain replays using unchanged WalkMotion: all11 named routes in both directions, all17 movement portals both ways, three transverse positions on each stair both ways, and the west/east outside switches. No teleport at intermediate waypoints, new seed, jump, body reduction or collider relaxation. Step-edge waypoints admit the adjacent actual .15m tread tops plus .025m numerical/support tolerance, rather than treating stairs as ramps.

Each stair is geometrically5.76m clear between guards. The successful lateral center lines are−2.1/0/+2.1m, covering a5.0m total body envelope. An exploratory±2.35m edge trace failed standing-navigation admission near the guards; it is retained in initial-walk-failures.json and view-inspection edge probes. Do not claim every centerline across the full nominal width was walked. Native standing erosion is more restrictive there; the physical body remains radius.40/height2/crouch1.15/step.30/slope42°.

The public browser walk also climbs and reverses all four flights, then captures six standing/crouched pose pairs via the actual helper. [Walk metadata](evidence/c01/walk/walk-capture.json) records actual feet/eye/stance. All73 body-eye camera requests are admitted; supported-eye deviation from requested eyes is ≤.010001m. All original34 named standing/crouched ray predictions match compiled geometry.

[Envelope checks](evidence/c01/envelope/envelope.json) contain1,074 finite seam probes at17 roof interfaces: all are occupied/occluded, including endpoints and low/middle/high heights. Buried fascias are classified by closed compiled-solid occupancy; an optical ray with both ends inside the cinema mass is not an air leak. Roof-on west/east views complement these samples. The native frontier grids reproduce21 west and22 east admitted witnesses with zero simultaneous nonzero public/service portal visibility at both eye heights. This is bounded evidence, not whole-district immunity.

## Encounter evidence and retained costs

[View inspection](evidence/c01/view-inspection/views-inspection.json) gives finite eye and nine-point target-body samples against actual opaque render geometry. Skylight glass is explicitly omitted from optical occlusion; it is above these encounter rays.

- Public early/mid positions see the direct crest but none of the sampled side opponent. Late leaders and their3m followers obtain a standing side-eye view. West crouched follower retains3/9 body samples; east crouched follower loses all9. These are distinct posture/position results, not guaranteed support or trades.
- Service mid-climb sees the direct top but cannot see the lateral receiving opponent. Top-turn views open that relationship. Public and service arrivals still reach different upper territories.
- Both lower/upper apertures provide the intended standing eye connection; paired crouched eyes are blocked. G1's diagonal remains open while central aligned pressure is screened by the offset returns.
- W-REG loses public departure visibility; E-REG loses service visibility. Deep near-door dual pressure remains intentionally. The paired friendly counterpositions fit and see their named intruder; both pairs challenge through their same local opening, not independent pincer flanks. West/east return-follower views show support loss around stock; east must reach its southern corner before support resumes.

The current grand stairs and offset lower returns obscure a broad single-view reveal of the complete G1 mouth from the atrium. Wider body-eye images, close [west](evidence/c01/over-under/west-over-under.png)/[east](evidence/c01/over-under/east-over-under.png) views and the cutaway show the actual relationship without moving geometry. This spatial legibility limitation is open for independent judgment.

## Capture and game limits

All camera requests are applied atomically through public forms after readiness, then actual dataset.view position/target/projection/height is asserted. Captures retain loaded source, camera state and hashes. `global-roof-off` hides roof-class surfaces globally, including caps; it is not a selective cutaway or evidence of missing ceilings. `cutaway` additionally applies the public horizontal section slider .48. Interior/support/follower views retain roofs. All boards, overlays and decisive full-resolution views were visually inspected by the author.

Control scoring, unlock/respawn, weapons, healing, abilities, utility, audio, multiplayer body blocking, ballistic protection and competitive timing remain target-engine questions. Larger heroes/flying bodies are stress cases, not verified by the unchanged harness. No combat simulator was built. Route times are controller travel along selected chains, not safe arrival or winning strategies. Independent reviewers must assess the actual encounters and the local construction repairs before final acceptance.
