# Greywatch

An original **5v5 CT versus T bomb-defuse blockout** in an abandoned medieval European castle. T enter through the old south gatehouse; CT deploy from the north cloister. A occupies the ruined rose court, B the roofless chapel.

![Greywatch compiled castle overview](reviews/evidence/overview.png)

[Open the running interactive preview](http://127.0.0.1:48367/?nav-cell=0.125&camera=125+-100+130&target=42+45+1.5&projection=orthographic&view-height=105&appearance=illustrated). Use 2D/3D, navigation overlays or Walk; WASD moves, Space jumps, C/Ctrl crouches, Esc exits. The preview is read-only.

The map has ten authored spawn positions, two marked plant zones, a solid central keep, curtain walls, arched gates and four round towers. A wall walk at +3 m crosses above lower mid at 0 m. Four reversible stair flights connect the upper route to both wings. The eastern broken ambulatory reaches the chapel from a side angle; the rear cloister provides a separate site rotation. Low cover, tall stone screens and nave pillars give each approach its own sequence.

## Source and design

- [Editable AML source](level.aml) and [labeled layout](layout.svg).
- [Gameplay brief](brief.md), [design hypotheses and playtest targets](design.md), [stable object inventory](inventory.md).
- [Initial spatial sketch](sketch.svg) and [independent interest verdict](reviews/01-interest.md).
- Independent layout reviews: [spatial](reviews/02-layout-spatial.md), [tactical](reviews/02-layout-tactical.md), [visibility](reviews/02-layout-visibility.md).
- Independent actual blockout reviews: [spatial/structural](reviews/03-blockout-spatial.md), [tactical](reviews/03-blockout-tactical.md), [visibility](reviews/03-blockout-visibility.md).
- [Validation and evidence record](reviews/validation.md). Camera definitions: [main](views.json), [focused visibility](views-visibility.json) and [height checks](views-visibility-height.json).

## Validation and delivery

The delivered source SHA-256 is `d976e48cb2564af26159594320232e98fa739d29309a4fc1386d0c75b4de04f6`. Strict playable validation passes at 0.125 m navigation cells, with no diagnostics, zero uncovered floor samples and all eight authored walking regions in one reachable component. All 24 performed directed one-body movement checks pass, including every stair in both directions. Twelve actual browser captures verify standing/crouching helper states at six cover positions; retained source-matched captures have no browser errors.

The [GLB](../../generated/greywatch/build-r2/greywatch.glb), [OBJ](../../generated/greywatch/build-r2/greywatch.obj), runtime JSON, plan SVG, metadata and reports are in `generated/greywatch/build-r2/`. These contain geometry and metadata; target engines must configure gameplay and collision. Material UVs are present; a lightmap atlas was not generated. No optional FBX/BSP exporter was requested or run.

This is a reviewed geometry blockout ready for engine integration and ten-player playtesting. Plant/defuse logic, weapon/utility behavior, audio, five-player body blocking and competitive balance have not been tested. The retained long diagonal and corner holds, CT forward-contest timing and late low-utility retakes are specific playtest targets; the review does not claim balanced matches.

## Reproduce

```sh
npm run --silent levelspec -- preview projects/greywatch/level.aml --port 48367 --nav-cell 0.125
npm run --silent levelspec -- validate projects/greywatch/level.aml --nav-cell 0.125 --strict-floor-gaps --json
npm run --silent levelspec -- build projects/greywatch/level.aml --out generated/greywatch/new-build --nav-cell 0.125 --strict-floor-gaps --no-uv --json
node tools/capture-level.mjs projects/greywatch/level.aml generated/greywatch/new-capture projects/greywatch/views.json
node tools/vector-visibility.ts projects/greywatch/level.aml projects/greywatch/audits/visibility.json generated/greywatch/new-visibility
node projects/greywatch/audits/walk.mjs generated/greywatch/new-walk
node projects/greywatch/audits/stances.mjs generated/greywatch/new-stances http://127.0.0.1:48367/
```

Use fresh generated directories. The stance capture command requires the running preview. The inspection player is radius 0.30 m, standing 2.0 m, crouching 1.1 m, step 0.25 m and speed 3.4/1.7 m/s; this is a harness contract, not Counter-Strike movement parity. Visibility uses configured eyes and static opaque geometry; navigation and capsule checks use bounded samples, not continuous proofs.
