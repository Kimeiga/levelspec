# Sampled FPS visibility review

Use this opt-in tool to find sightlines worth inspecting. Its output is warnings and geometry evidence, not acceptance criteria, a campability detector, or multiplayer simulation. An intentional long lane can be useful. Spawn-to-spawn exposure and exceptionally long unbroken views deserve particular scrutiny.

```sh
node tools/vector-visibility.ts projects/spillway/level.aml \
  projects/spillway/audits/visibility.json generated/spillway/new-visibility-run
```

The new directory receives `report.json` and a two-panel `report.svg`. Stdout is one JSON summary. Invalid input fails with JSON and nonzero exit. A completed run with omitted opacity/state or exhausted work produces retained evidence, `complete:false`, and exit1. Risk flags alone do not fail the command. Existing output directories are preserved by refusing to overwrite them.

## What is measured

The scanner uses final rendered triangles for optical occlusion. Invisible physical walls do not block these rays; visible noncollidable geometry does. Static opaque native geometry is supported. Texture/alpha, renderer glass/water semantics and dynamic surfaces are omitted as uncertain, disclosed, and prevent unqualified completion. This is not penetration, smoke, sound, or projectile behavior. The CLI compiles local AML with local heightmaps; it does not implement target-engine shaders or game-state transitions.

Sample feet follow the real navigation surface at configurable XY spacing, anchored at world(0,0), with separate Z samples where a bridge overlaps an underpass. Existing unchanged standing-body support/clearance checks admit positions. All authored-region navigation components are sampled, including disconnected ones; unassigned roof/prop-top islands are excluded and counted. Sampling a surface does not prove a route reaches it. Explicit key points supplement the grid. No admitted samples is an error, rather than an empty pass.

Global long views connect two admitted player locations, preserving XYZ. They test equal eye offsets at both ends; actual floor heights may differ. Named protected pairs and protected areas test every configured eye-height combination. A low eye offset is a camera study, not simulated crouching. Meter spacing can miss narrow/slit views; verify suspicious positions with targeted rays and actual paired views.

`longLines` retains up to100 longest endpoint examples. Each sample's `maxVisibleDistance` is the greatest visible distance **among tested pairs at or above `longDistance`**. Zero means no threshold-qualified target was found; it is not a measurement of zero visibility. The report lists body rejections, excluded navigation triangles, opacity omissions, budgets and scope. It records source/configuration hashes and compiled physical/render identity.

## Entry/FOV warnings

Configure actual plausible hostile entry frontiers for each review region. Sample portal widths and elevations, including upper approaches. A radial fan of open rays is not a set of enemy entry points. Account for objective state, learned setups, resources, travel/clearing time and teammate coverage in the independent tactical review.

At each observer the report lists visible, hidden, unverified and partly visible entry groups, with counts of visible/occluded/unsupported portal samples. Hidden approaches and blocked portal portions remain unknown. `approachesComplete:true` is the author's reviewable claim that the configured groups cover feasible entries, not a fact inferred by the tool. Validate that inventory independently.

For at least two configured visible groups, with no wholly hidden/unverified group and a declared complete approach inventory, the shortest horizontal covering arc is compared to `fovDegrees` (inclusive). Vertical elevation spread is also reported and compared with `verticalFovDegrees`. `single-sector-candidate` means the **visible samples** fit those angular spans. Partly occluded entries still require inspection. This is not a solved perspective-camera fit, complete silhouette test or proof that a player can camp indefinitely. Zero/one entry, missing groups, hidden or unsupported evidence produce `insufficient-evidence`; they are not a safety pass.

## Configuration

See the [Spillway configuration](../projects/spillway/audits/visibility.json) for a full example. Coordinates are meters and right-handed Z-up. Bounds select feet positions. Important fields:

- `settings`: `spacing`, `eyeHeights`, `longDistance`, horizontal `fovDegrees`, `verticalFovDegrees`, `maxSamples`, `maxPairQueries`.
- `points`: stable named `{id,feet:[x,y,z]}`. IDs starting `grid-` are reserved.
- `protectedPairs`: `{id,from,to}` referring to named points.
- `protectedAreas`: `{id,from:{min,max},to:{min,max}}`, testing sampled regions rather than only spawn centers.
- `holdRegions`: `{id,bounds,approachesComplete,entries:[{id,points:[[x,y,z],...]}]}`. Use genuine entry-frontier samples rather than invented directions to obtain a desired score.

Work admission bounds samples, grid candidates, configuration collections, portal samples, pair candidates and ray queries. An exceeded sample/candidate admission limit fails; a truncated pair/ray scan remains explicitly incomplete. Do not reduce spawn regions, omit difficult entry groups, lower eyes or raise warning thresholds merely to remove warnings.

## Review sequence

Before changing geometry, draw the affected plan with elevations, sections and predicted fields of view. Include observer/target heights, tall building masses and low-cover sequences. Review each consequential section independently for spatial visibility and tactical behavior. Then compile, rerun the same scan/configuration, inspect actual opposing views at both eye heights, and recheck affected routes/body clearance. Reconcile warnings individually: repair, retain with a supported tactical reason, or defer a specific engine/playtest question. Repeat on changed interfaces.

Tall architecture can block elevated global views while low obstacles provide ducking, preparation and repositioning opportunities. They serve different purposes. Neither uniformly tall walls nor crates everywhere is a substitute for reviewing how a pair approaches, fights, supports and leaves the space.
