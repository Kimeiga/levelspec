# Ninefold delivery validation — L04 / R05

Editable source: `projects/ninefold/level.aml`. Final source SHA256: `3d8dae77f52fba4084ae72bb2213d5fb6c5eb11f9e25ad579ee43f3288c4f624`. [Retained evidence index](evidence/identity.json) links the exact hashes, source snapshot, camera/stance manifests, route replays, audit and build reports. Outputs are in `generated/ninefold/build-r05/`.

## Performed checks

- Native CLI strict-floor-gap validation: success, zero diagnostics.
- Required navigation coverage at 0.125 m cell: 7,536 samples, 7,528 covered, 8 intentionally obstructed/excluded, zero uncovered. All 21 authored route requirements pass with one required network. Scenic tower-top navigation patches are unassigned and not claimed playable.
- Existing physical inspection walker: 42/42 forward/reverse replays, including all five flights, every site/spawn route, Service connection, gallery, underpass and four forced West segments. Unchanged player: standing 2 m / radius.25 m / step.25 m / slope 42°; crouch 1.1 m. Finite substeps do not establish continuous capsule sweeps or five-player throughput.
- Independent native compilation/replay and final collision sections: 42/42, critical stacked headroom 2.9 m; S3 upper tread/landing contact retained. [Spatial review](blockout-spatial.md).
- Actual browser camera capture: 25 final-source views, zero page errors. 6 actual standing/crouching poses and 6 reciprocal long-view studies also match the final source and have zero browser errors. [Visibility review](blockout-visibility.md).
- Sampled visibility: 1,625 supported points, 1,667,440 queries; grid 1 m; optical eye offsets 1.86/1.023 m; warning distance 30 m; complete within budget. Configured protected spawn-area query: 36,360 pairs /0 visible; upper→T: 159,176 /0; upper→CT: 141,840 /0. No unknown materials or dynamic faces. 1,391 unassigned navigation triangles excluded, 7 candidate body samples rejected. This is not continuous visibility proof.
- Native export build succeeded: GLB, OBJ, runtime JSON, source-derived level JSON, vector plan, reports and metadata. No lightmap UV atlas generated; material UVs/colors retained. Optional FBX/BSP pipelines were not requested or exercised.

## Review gates

Independent spatial, tactical and dedicated visibility layout gates accepted L03, then independently accepted the local L04 construction repairs before applying them. Independent compiled reviews accepted R04; R05 corrected only description/tactical labels, retains identical physical and render hashes, and has fresh exact-source checks/captures. Read [spatial](blockout-spatial.md), [strategy/player behavior](blockout-tactical.md), and [visibility](blockout-visibility.md) records for findings, closed repairs and final-source addenda.

## Remaining limits

This is a reviewed geometry prototype, not an installed Counter-Strike level. Bomb rules, weapons, multiplayer, economy, utility, audio and target-engine collision/gameplay setup remain integration work. No human playtest, competitive-balance result, grenade/penetration result or full enemy-body exposure test is claimed.

B's center-spawn CT travel lead is approximately 3.61 s at 3.4 m/s; A→B travel alone is approximately 22.14 s against a provisional 40 s bomb. B northeast holds can watch all sampled entry frontiers within roughly 72–83°, despite the tank dividing some local fights. These remain explicit 5v5/2v2/1v2 test priorities.

The longest retained optical line is 44.18 m across the T feed. Three other bounded families connect Laundry/east feed, Service/Pipe Street and a CT rear-spawn offset/Drain corner. The latter means there is no claim that every spawn position is hidden from every enemy position. Reciprocal views were reviewed and these lines retained with access/attention costs. A's angular hold heuristic remains inconclusive because some portal samples lack standing admission or are occluded; it was not counted as passed.

Actual gallery crouch removes the camera view through its sill; actual pump crouch removes the southern arrival camera line at the inspected pose. Neither establishes all-body or bullet protection. Target-engine movement/FOV, body blocking, boost access, utility, sound and trade timing require the tests in [design.md](../design.md).
