# Veilcrest

An original **5v5 CT versus T defuse blockout** of a secret mansion enclosed by steep mountain ridges and pines. A is the upper salon; B is the lower vault.

![Expanded Veilcrest mansion](reviews/evidence/capture-r09/overview.png)

[Open the live 3D preview](http://127.0.0.1:48523/?nav-cell=0.125&camera=163+-132+153&target=56+58+9&projection=orthographic&view-height=142&appearance=materials). Switch between 2D/3D, inspect navigation or use Walk. WASD moves, Space jumps, C/Ctrl crouches and Esc exits. Preview is read-only.

The enlarged estate spans **134 × 94 m**, compared with 87 × 80 m in the first version. It has approximately **6,970 m² of open floor footprint after wall/obstacle subtraction**, versus 3,360 m² before: a little over twice the area. These are plan-area measurements, not continuous capsule-clearance proofs. Eighteen named floor spaces and five reversible stairways connect two levels, +0 and +3 m.

The expansion adds an irregular orangery, music room, west gallery, playable library around a smaller reading pavilion, pump house, wine passage, cellar wing and carriage court. The original nearby site anchors and shorter staff-court rotation remain. The longer wings offer flanks and rear infiltration; the former direct Hall→A south doorway is sealed, so the hall approach now enters through the library. Each site has four actual approach frontiers. Tall gatehouses interrupt the rear court, while site furniture, planters and racks provide distinct cover positions.

[Editable AML](level.aml), [dimensioned layout](layout.svg), [mechanics brief](brief.md), [current design](design.md) and [object inventory](inventory.md) are the project sources. Optional Python authoring helpers require Shapely 2; ordinary AML editing, validation and export use the repository tools directly.

The expanded r09 source passes strict playable validation at 0.125 m navigation cells with zero diagnostics and zero uncovered samples. All **52 performed directed movement checks** pass with the unchanged body, including every stair in both directions, both wings, the library ring, court corners and all ten B-spawn timing cases. Eighteen real standing/crouching helper captures cover nine low-cover positions. These are bounded single-player geometry checks; weapon, grenade, audio, body blocking, plant/defuse logic and competitive balance require target-engine playtesting.

Geometry and runtime outputs are in [build-r09](../../generated/veilcrest/build-r09/veilcrest.export.json), including [GLB](../../generated/veilcrest/build-r09/veilcrest.glb), [OBJ](../../generated/veilcrest/build-r09/veilcrest.obj), runtime JSON, plan SVG and metadata. The game bundle has [visual GLB](../../generated/veilcrest/game-r09/veilcrest.glb), [collision GLB](../../generated/veilcrest/game-r09/veilcrest.collision.glb) and [spawn/site metadata](../../generated/veilcrest/game-r09/veilcrest.game.json), in glTF Y-up meters. Source/domain coordinates remain right-handed Z-up meters. The delivery omits the optional lightmap atlas and lighting bake.

[Validation and review evidence](reviews/validation.md) records the revision identity, actual timing limits, independent verdicts and retained playtest questions. B is an early contested arrival; its northern anchor, long mansion diagonals and tight late retakes are specific test targets. No match-balance claim is made.

```sh
npm run --silent levelspec -- preview projects/veilcrest/level.aml --port 48523 --nav-cell 0.125
npm run --silent levelspec -- validate projects/veilcrest/level.aml --nav-cell 0.125 --strict-floor-gaps --json
npm run --silent levelspec -- build projects/veilcrest/level.aml --out generated/veilcrest/new-build --nav-cell 0.125 --strict-floor-gaps --no-uv --json
node projects/veilcrest/audits/walk.mjs generated/veilcrest/new-walk
node tools/capture-level.mjs projects/veilcrest/level.aml generated/veilcrest/new-capture projects/veilcrest/views.json
node tools/vector-visibility.ts projects/veilcrest/level.aml projects/veilcrest/audits/visibility.json generated/veilcrest/new-visibility
```

Use fresh generated output directories. The live preview must be running for the stance scripts.
