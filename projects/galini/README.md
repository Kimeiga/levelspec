# Galini — 5v5 coastal defusal blockout

An original, quiet Greek-inspired cliff town with white plaster, blue shutters and a domed chapel above a sheltered harbor. The expanded plan is roughly 130m across, with bending waterfront streets, an irregular village piazza, a two-flight cliff stair, diagonal ascents and substantial intermediate districts.

A is Chapel Court at +4m; B is Boat Court at 0m. Five T spawns occupy Ferry Piazza and five CT spawns occupy the upper town. Laundry Court and Winery provide a western reset loop; Taverna Court and its roofed Arcade connect to Market; Customs splits around a civic building; Post Office offers an upper rotation bypass. The chapel and boathouse each have two usable doors and an interior.

`level.aml` is the editable native source. `layout.svg`, `plan.json`, `brief.md` and `design.md` record the current spatial design and assumptions. The project-local Python drafting helpers generated this draft; ordinary use and editing of AML requires no Python dependencies.

```sh
npm run --silent levelspec -- validate projects/galini/level.aml --strict-floor-gaps --json
npm run --silent levelspec -- preview projects/galini/level.aml
npm run --silent levelspec -- build projects/galini/level.aml --out generated/galini/rebuild --formats glb,gltf --no-uv --strict-floor-gaps --json
```

The running reviewer is at http://127.0.0.1:48371/. Use **Walk** for first-person inspection, WASD/arrows to move, Ctrl/C to crouch, Space to jump and Esc to exit. **Show roofs** enables the ceilings hidden by the reviewer's default cutaway view.

## Verification

The final source is B10, SHA-256 `a393a80702338e800205c9ecaa9076b59250f5d9b21d2e6c13fa51d2329ca929`.

- Strict default-cell validation passes without diagnostics or uncovered floor samples.
- All 45 authored routes pass in both directions through the existing unchanged-body inspection walker: 90 successful replays, including every stair, new district and both doors of each site interior. All ten spawn placements fit.
- Ninety supported spawn-offset placements produce 8,100 mixed standing/crouched-eye queries with no opposing spawn visibility. These are finite optical samples, not a continuous visibility proof.
- Independent review identified and corrected an offset spawn angle and tiny oblique stair-cap support gaps. The final gate screen retains the old mass and extends west; same-height landing slabs overlap each stair end by about 8mm.
- Actual browser evidence records standing/crouched cameras at both sites and keyboard ascent of Bell Stair. Roof-enabled final captures supplement the broader B09 cutaway review. See `reviews/` for revision-specific spatial and tactical findings.

Measured shortest navigation distances are approximately T–A 73.7m, T–B 89.6m, CT–A 47.9m, CT–B 57.6m and A–B 97.0m. The last is about 19.4 seconds at the provisional 5m/s run assumption, before clearing and utility; the harness walks at 3.4m/s. Long Cliff and short Bell attacks require staging coordination.

## Artifacts and limits

`generated/galini/final/` contains colored GLB/GLTF, OBJ, plan SVG, runtime JSON and reports. `generated/galini/game/` contains a visual GLB, separate collision GLB and game metadata in glTF Y-up meters. Runtime JSON and native source retain their documented coordinate contracts; exporters own conversion.

The default lightmap UV atlas failed density/overlap auditing. These are explicit `--no-uv` colored blockout exports; baked lighting remains pending. Geometry, collision and navigation checks passed independently. No FBX/BSP or target-engine import has been verified.

The harness provides inspection geometry, navigation, markers and collision. Multiplayer round rules, planting/defusing, economy, weapons, utility, audio and competitive balance require target-engine integration and playtests. Inspection movement uses bounded navigation/physical checks, not continuous capsule sweeps or multiplayer body blocking. Retained playtest targets include B's strong exposed hold, five-player information coverage, Cliff/Bell staging and late site rotations.
