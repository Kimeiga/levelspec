# Deadwater · Offshore Rig

Original 5v5 CT versus T defusal blockout on an abandoned offshore platform. Ts board the cargo dock; CTs muster behind the north weather screen. A is the raised drilling floor under an idle derrick, and B is the lower separator deck. Valve Hall and Pipe Bend support splits and changes of plan; the rear service deck gives CT an initially controlled rotation.

![Deadwater blockout](reviews/evidence/r05/captures/overview.png)

[Open the running preview](http://127.0.0.1:48242/?nav-cell=0.125&camera=125+-83+108&target=43+42+3&view-height=108&appearance=materials). Choose **Walk** for the cargo spawn, or use **Walk from coordinates**. WASD/arrows move, Space jumps, Ctrl/C crouches, and Esc exits. This is the harness reviewer; it does not run a multiplayer round.

## Source and artifacts

- [Editable AML](level.aml), [current layout](layout.svg), [brief / body and mode assumptions](brief.md), [source-linked inventory](inventory.md), and [tactical hypotheses](design.md).
- [Visual GLB](../../generated/deadwater/game-r05/deadwater.glb), [collision GLB](../../generated/deadwater/game-r05/deadwater.collision.glb), and [game metadata](../../generated/deadwater/game-r05/deadwater.game.json): ten team spawn anchors, two site markers and player dimensions in glTF Y-up meters.
- [Native build](../../generated/deadwater/build-r05/): GLB, OBJ, vector plan, runtime JSON, metadata and reports. Solid colors/materials are included; UV/lightmap baking was not requested.
- [Validation and review record](reviews/validation.md). Current source/capture SHA-256 is `b248be8ed5cff4a5b2ae334b761db2b102a3c7570e7f90ad6c6c9948844bb93f`.

The blockout has 13 named spaces, three six-meter-wide stair flights, and a 2.40 m raised northern deck. The derrick, cargo crane, braced jacket, weather baffles, separators, edge pipes and suspended lifeboat establish the theme. [Real-image study](references.md) informed the construction language; the layout and dimensions are invented.

## Reproduce

```sh
npm run --silent levelspec -- preview projects/deadwater/level.aml --port 48242 --nav-cell 0.125 --camera "125 -83 108" --target "43 42 3" --view-height 108 --appearance materials
npm run --silent levelspec -- validate projects/deadwater/level.aml --nav-cell 0.125 --strict-floor-gaps --json
npm run --silent levelspec -- build projects/deadwater/level.aml --out generated/deadwater/new-build --nav-cell 0.125 --strict-floor-gaps --no-uv --json
node tools/game-export.ts projects/deadwater/level.aml --out generated/deadwater/new-game
node tools/capture-level.mjs projects/deadwater/level.aml generated/deadwater/new-captures projects/deadwater/views.json
```

Outputs belong under ignored `generated/`; retained review evidence lives beside this source. Use a new output directory for each capture run.

Defusal triggers, weapons, utility, audio, multiplayer collision and round rules require destination-engine integration. Geometry/walking success and static sightline samples do not establish 5v5 balance. Stair infill tops and possible boosts/climbs are explicit target-engine occupancy checks. Opening timings and committed stair crests are playtest priorities, detailed in the review record.
