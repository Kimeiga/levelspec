# Kowloon procedural doors

Production entrance improvements based on the shared [door concept sheet](../kowloon-art-direction/components/07-doors.png).
`groundUnit` uses these components directly; this project is a repeatable inspection scene, not a separate replacement generator.

- Steel and painted double doors have recessed panels, small modeled edge bevels, capped hinges, continuous curved pulls, escutcheons and keyholes.
- Timber doors have divided frosted lights, tongue-and-groove lower boards and an occasional corner repair. Both these doors and the gate's inner leaf use the **existing shelf atlas and mapper**. Grain stays at **494 texels/m** on rails, stiles, thin edges and cut ends. A local frame adapter puts the shelf's contact wear on the door's outward face. Jambs, lintel, trim and transom now use the same textured joinery. A shared brown atlas family, 3% regular-board brightness spread and a modestly lighter repair keep the entrance coherent. Explicit front-edge wear reaches the wider joinery in irregular bands up to 8 mm wide, capped on thin members; ordinary shelves retain their existing treatment.
- Folding gates have channels, tracks, crossed links, attached pivot pins and a layered inner door. Shutters have guide lips, a continuous pull ring and locking hardware.
- Paint loss follows clustered, jagged bands along physical panel boundaries, lower edges and the latch side. Broad faces stay intact. Chip normal relief is **0.12 mm**, rather than crater-like depressions. Painted door/shutter faces do not multiply in the generic metal texture's scattered spots. Paint maps preserve the authored triangles and normals.

These remain closed, opaque, render-only facade details. Native collision and navigation are unchanged. No new generated art or external asset service is required. Bind the existing `shop-timber` finish to obtain the shelf material; absent that finish, the ordinary timber fallback still works.

## Repeat the comparison

```sh
node projects/kowloon-doors/build.ts generated/kowloon-doors/current
node projects/kowloon-doors/capture.mjs generated/kowloon-doors/current generated/kowloon-doors/current-captures
npm exec vite -- --host 127.0.0.1
```

Open `/projects/kowloon-doors/index.html` on that Vite server. The `models` URL parameter selects any bake directory, e.g. `?models=/generated/kowloon-doors/final`.
The viewer supports orbit inspection and front, oblique, hardware, lower-edge, grazing side, rear, ordinary-distance and changed-light cameras. It uses the exported GLBs with their actual PBR maps, uniform scale 1, fixed exposure 1.1 and the same lighting for before/after views. The rear view checks host completion; the door dressing is wall-mounted, not a freestanding asset.

The bake report records generator/viewer/source and material-image hashes, emitted prop triangles, final exported triangles, diagnostics and appearance allocation. Captures record GLB hashes and renderer settings. Generated files and disposable baseline snapshots stay under ignored `generated/kowloon-doors/`.

## Visual evidence

| Earlier entrances | Revised entrances |
| --- | --- |
| [Steel, before](../../generated/kowloon-doors/before-captures/steel-oblique.png) | [Steel panels and hardware](../../generated/kowloon-doors/frame-r01-captures/steel-oblique.png) |
| [Timber, before](../../generated/kowloon-doors/before-captures/timber-glass-front.png) | [Timber using shelf-scale grain](../../generated/kowloon-doors/frame-r01-captures/timber-glass-front.png) |
| [Gate, before](../../generated/kowloon-doors/before-captures/gate-front.png) | [Gate and inner timber door](../../generated/kowloon-doors/frame-r01-captures/gate-front.png) |
| [Shutter, before](../../generated/kowloon-doors/before-captures/shutter-front.png) | [Shutter with localized wear](../../generated/kowloon-doors/frame-r01-captures/shutter-front.png) |

[Lower steel wear](../../generated/kowloon-doors/frame-r01-captures/steel-lower.png) · [Timber detail](../../generated/kowloon-doors/frame-r01-captures/timber-glass-hardware.png) · [Final bake report](../../generated/kowloon-doors/frame-r01/report.json) · [40-view capture report](../../generated/kowloon-doors/frame-r01-captures/capture.json).

The close views expose the finite raster resolution; increase authored `texture-density` only within the scene's existing appearance budget. The damaged paint is a thin surface layer; deep missing timber and operational door animation are not part of this pass.

## Verification and limitations

`npm run check` and 18 focused door/shelf tests pass. Tests cover collision separation, facade bounds, triangle budgets, nondegenerate geometry and winding, map identity under reflected placement, grime changing actual map bytes, quiet panel centers, shallow irregular edge loss and physical atlas scale. The atlas test also checks outward contact wear, actual timber coverage on both jambs, the lintel and transom, a single grain family and bounded interior tint variation. Wide-member checks verify stronger edge wear without changing board interiors, protected backs, physical coverage or shelf defaults. Independent test and implementation reviews are complete; their construction findings were repaired and reviewed again. All five GLBs validate without errors, and the 40-view browser capture reports no errors.

Broader building checks exposed two existing failures, reproduced unchanged with the original `ground.ts` in an isolated baseline:

- The six-story high-detail case exceeds the appearance chart cap: **17,576 / 16,384**.
- The `limits-medium` fixture has an unrelated `fixtures` point beyond its head-clearance envelope at **[1.08478, 4.15265, 0.60057]**.

Logs: [focused suites](../../generated/kowloon-doors/frame-revision/tests.log), [baseline chart cap](../../generated/kowloon-doors/baseline-parts.log), [baseline clearance](../../generated/kowloon-doors/baseline-projection.log). The full broad run was stopped after the budget failure; no full-suite success is claimed.

## Measured current exports

The extra narrow edge subdivisions raise the textured timber entrance from 712 to 1,848 prop triangles. Textures are still shared and remain at 494 texels/m; only the small contact bands add subdivisions. The previous [flat-frame render](../../generated/kowloon-doors/final-captures/timber-glass-front.png) remains available for comparison with the [current textured frame](../../generated/kowloon-doors/frame-r01-captures/timber-glass-front.png).

| Entrance | Prop triangles | Exported total, including host |
| --- | ---: | ---: |
| steel | 982 | 994 |
| timber-glass | 1848 | 1860 |
| painted-timber | 982 | 994 |
| gate | 3656 | 3676 |
| shutter | 316 | 328 |
