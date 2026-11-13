# Spillway

An original 5v5 defusal blockout, roughly Dust II's authored scale. Nineteen named spaces and purposeful connections now drive the layout. Building wings shape the west passage, Elbow and sites; offset spawn anchors sit behind architectural turns. A dogleg gallery crosses Mid, with low cover, a local observation/drop opening and ordinary stair/ramp access.

![Current compiled Spillway](reviews/evidence/overview-r08.png)

The A plant platform rises.60m; the east approach rises1.20m. Three low gallery refuges join preparation and repositioning cover elsewhere. D01 is a planned optional four-meter drop with a supported landing; target-engine falling/damage and jump-back behavior remain unverified.

[Open the running local preview](http://127.0.0.1:48231/?nav-cell=0.125&camera=137+-115+128&target=47+50+2&projection=orthographic&view-height=116&appearance=inspection). Switch 2D/3D, inspect navigation or use Walk. Controls and physics limits follow the current reviewer documentation.

## Editable source and review

- [AML source](level.aml), [current layout](layout.svg), [node graph](audits/node-graph.svg) and [route decisions](audits/node-graph.md).
- [Brief](brief.md), [source-linked obstacles/levels](inventory.md), [tactical hypotheses and playtests](design.md).
- [All user principles recorded in the reusable skills](reviews/principles-record.md).
- [Current validation record](reviews/validation.md), [macro spatial review](reviews/los-blockout-r08-spatial.md), [macro tactical review](reviews/los-blockout-r08-tactical.md).
- Focused [Reservoir](reviews/local-reservoir-r07.md), [gallery](reviews/local-gallery-r07.md) and [Elbow](reviews/local-elbow-r08-blockout-spatial.md) reviews. R07 evidence is reused only where the documented R07→R08 source comparison shows unchanged interfaces.

## Reproduce

```sh
npm run --silent levelspec -- preview projects/spillway/level.aml --port 48231 --nav-cell 0.125
npm run --silent levelspec -- validate projects/spillway/level.aml --nav-cell 0.125 --strict-floor-gaps --json
npm run --silent levelspec -- build projects/spillway/level.aml --out generated/spillway/new-build --nav-cell 0.125 --strict-floor-gaps --no-uv --json
node tools/vector-visibility.ts projects/spillway/level.aml projects/spillway/audits/visibility.json generated/spillway/new-visibility
node tools/capture-level.mjs projects/spillway/level.aml generated/spillway/new-capture projects/spillway/repair-views-r08.json
```

The [visibility tool guide](../../docs/FPS_VISIBILITY.md) explains its warnings, supported positions, entry-frontier inventories, opacity/work limits and incomplete results. Long views are review prompts, not automatic failures. Flat maps, broad grades, windows, curves and directed drops remain options to judge in context, not required features of every map.

The delivered [GLB](../../generated/spillway/build-r08/spillway.glb), [OBJ](../../generated/spillway/build-r08/spillway.obj), vector plan, runtime JSON and reports are in `generated/spillway/build-r08/`. Material UVs/colors are present; no lightmap atlas was generated. These are geometry and metadata exports. Target-engine collision/gameplay setup, defusal logic and multiplayer balance remain separate work.
