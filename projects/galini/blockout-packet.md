# B10 compiled handoff and review packet

Inspect the raw source and actual images first. The current brief is a larger 5v5 CT/T defusal map in a calm Greek coastal cliff city, with bending streets, stairs, plazas and deeper connections. Layout L04 and blockout B10 supersede earlier revisions.

Source SHA-256: `a393a80702338e800205c9ecaa9076b59250f5d9b21d2e6c13fa51d2329ca929`.

Current inputs are `level.aml`, `plan.json`, `layout.svg` and the focused `repair-b10.svg`. The accepted B10 roof-enabled views and loaded source/camera manifest are retained under `reviews/evidence/b10-roofs/`. Actual browser stance and keyboard movement are under `reviews/evidence/b10-browser/`.

The broader 42 source-matched B09 cutaway/opposite-door images are retained under `reviews/evidence/b09-cutaway/` and `b09-opposite-doors/` for unchanged districts and architectural context. B09's two consequential findings were corrected in B10: the Town Gate screen now retains its old mass and extends its western edge .8m; all ten oblique stair ends have approximately 8mm of same-height landing overlap. Current acceptance is recorded in `reviews/11-blockout-return-spatial.md` and `reviews/11-blockout-return-tactical.md`, with unaffected B09 evidence explicitly reused.

## Performed checks

- Strict CLI validation at the default .0625m navigation cell passed with zero diagnostics and zero uncovered samples among 29,151 floor samples. All 45 routes satisfy reachability, distance and minimum route requirements: `generated/galini/validate-b10.json`.
- At .125m navigation sampling, all 90 forward/reverse route replays passed with the unchanged body, as did all ten spawn placements. Existing navigation plus physical support/headroom checks were exercised with .035m movement requests: `generated/galini/walk-b10/report.json`. These are bounded checks, not continuous capsule sweeps.
- Tight routes cover the five stair flights, new districts, four site-interior door thresholds and two full interior crossings. The southern Laundry mouth also passed two independent bidirectional direct traversal audits; both reports are retained in the evidence directory.
- All 100 center-position queries and 8,100 mixed-eye queries across 90 supported spawn-offset placements were blocked. The independent return audit also blocked all 2,500 of its focused offset queries. Every named optical observer and target is body-supported. The B anchor sees both attacking frontiers and the upper stair head; this remains a strong exposed hold to assess tactically. The selected Gate pose sees the western piazza target while the eastern branch is blocked. Selected A/B low cover leaves standing eyes exposed and blocks the low-eye ray toward a standing opponent. These limited rays do not establish balance or a universally protected position.

## Construction and inspection scope

The .44m grounded retaining cheeks close the earlier stair-wall heel gaps and leave 7.36m between their inner faces. Four-meter flights have a filled side top at base +4.2m until the rising 3.2m-above-tread enclosure overtakes it. Two-meter-flight cheeks are 2.2m high. These actual heights supersede the earlier sidewall prediction.

The `O-J-*` masonry returns and party wall close observed blind ears and sub-body slits. Their exact footprints appear in the plan and AML. No player dimensions, clearance settings, route requirements, navigation seeds or validation level were weakened.

Review all seven sections listed in `layout-packet.md`, both doors of each site interior, the new district loops and roofed bypasses. Inspect the complete guard, landing, foundation and soffit volumes, not only passing paths. Check opposing, offset spawn, follower, intermediate stair and crouched positions. Recheck the changed masonry from its adjoining routes. Consider defaults, executes, postplants, casualty states and late rotations using actual distances.

## Distances and delivery limits

Measured navigation distances at .125m sampling are T–A 73.71m, T–B 89.59m, CT–A 47.87m, CT–B 57.57m and A–B 96.95m. At the provisional 5m/s run assumption these are 14.7, 17.9, 9.6, 11.5 and 19.4 seconds. At the harness's 3.4m/s walk they are 21.7, 26.4, 14.1, 16.9 and 28.5 seconds. Clearing and utility delays are excluded. Mode rules and clocks in `brief.md` remain assumptions; the harness does not implement multiplayer defusal.

The game export succeeded in `generated/galini/game`: visual GLB, separate collision GLB and game JSON, all in Y-up meters. The B09 default lightmap UV attempt failed its density and overlap audit; the complete failure remains in `generated/galini/build-b09-summary.json`. The final B10 colored GLB/GLTF blockout in `generated/galini/final` uses explicit `--no-uv`; baked lightmaps remain unavailable. Geometry/navigation reports are independent of that optional atlas stage. Destination-engine integration, combat, utility, audio and competitive balance have not been verified.
