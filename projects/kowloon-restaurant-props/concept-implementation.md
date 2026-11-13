# Chicken shop: concept implementation and metal polish

Implemented the first priorities from the [concept gap review](concept-gap-review.md),
then incorporated the request to improve all steel tables and the boiler.

[Whole store](../../generated/restaurant-props/concept-pass-06/wide-store.png) ·
[Counter and boiler](../../generated/restaurant-props/concept-pass-06/counter.png) ·
[Cabinets and clearances](../../generated/restaurant-props/concept-pass-06/elevated.png) ·
[Narrow shop](../../generated/restaurant-props/concept-pass-06/narrow.png) ·
[Alternate layout](../../generated/restaurant-props/concept-pass-06/alternate.png)

## Changes

- The wide counter has a shorter steel-framed display with front and one end pane;
  rear service access and the chopping end remain open. Birds occupy staggered
  heights within that display. Narrow shops keep a short open rail.
- A striped cloth drapes over the front edge beside the cutting station. Clipped
  receipts sit above the rear workbench; a hollow cup holds a varied bamboo bundle.
- Table tops have true 4mm bevels, bright rubbed edges and darker lower folds.
  Rear cabinets have separate doors/drawers, seams, handles, hinges, grounded feet
  and a backsplash. Lower door wear is confined to a 12cm band. Heights and support
  footprints remain unchanged.
- The boiler/roasting oven now uses weathered steel rather than almost-black tint,
  with differentiated bands, a gasketed hatch, hinges, insulated latch, fasteners
  and a temperature dial. It reuses the same metric brushed-metal maps.
- Cream/jade tile walls and counter fronts use the latest production ceramic field:
  flat glaze, chipped joints, occasional missing tiles and combed plaster beneath.
  Source grain is restrained so the base cream is not multiplied by a second brown
  color cast. The shared 1152×576 PBR maps cover 3.6×1.8m at 320 texels/m.
- Upper walls reuse `src/materials/concrete/material.ts` directly, including
  its shared source textures, two-meter physical image scale, irregular sampling,
  repair outlines and top grime. Form-tie holes are disabled for this room.
- Warm lights attach to the measured bounds of actual named pendant bulbs. Cooler
  broad fill is reduced. Bulbs do not cast shadows onto their own lights; shades
  and nearby stock cast real shadows. Shared maps remain cached between views;
  replaced geometry, unique materials and light shadow resources are disposed.

## Validation and boundaries

The current wide store has **19,872 prop triangles**, narrow **5,836**, alternate
**21,098**, compared with the previous wide store's 21,872. This reduction comes
from fewer repeated birds and the shared flat tile field, despite added hardware.
The live concrete shell adds 36 triangles; the existing baked floor remains.
No new AI assets, paid generations, or extra metal maps were created.

Fourteen focused restaurant/metal tests passed along with TypeScript checking.
The tests cover room bounds under reflection, normal orientation, collision
separation, seed repeatability, tray support, clear chopping areas, display
containment/access, lamp geometry, shared PBR export, physical UV density, and
support planes beneath the new beveled tops. Both independent reviews approved
the final source. Review found and fixed a GLB mesh-name sanitization problem,
light-resource cleanup, and overlapping tabletop faces before final acceptance.

The final capture verifies six actual views, no browser errors, fixed source/image
hashes during the run, and removal of all nine superseded wall meshes by semantic
object ID. The separate matched
[lights on](../../generated/restaurant-props/concept-pass-06/task-lights-on.png) /
[lights off](../../generated/restaurant-props/concept-pass-06/task-lights-off.png)
comparison disables AO to isolate lighting and measures a warmer illuminated food
view; statistics are in `lighting.json` beside the captures.

The concrete shader, task lighting and AO currently belong to this live study.
They are **not** part of standard GLB material export. Production dressing includes
the new props, table/boiler geometry, display glass and portable tile PBR maps.
This remains an open-top inspection scene; the concept's complete sign, awning,
shutter housing, eating ledge and alley context are subsequent frontage work.
No architectural circulation or gameplay acceptance is claimed from these renders.

## Reproduction

```sh
node tools/bake-restaurant-tiles.ts
node projects/kowloon-restaurant-props/capture.mjs generated/restaurant-props/new-pass generated/restaurant-props/store-surfaces-texture-shared/enclosure.glb
```

`tiles-bake.json` records source/recipe hashes and output bytes; adopted texture
hashes are in `production-files.json`. The existing enclosure supplies the floor
only: its old wall meshes are hidden, and live concrete receivers replace them.

## Modeled towel, chopping block and contact AO follow-up

The accepted follow-up is [whole store](../../generated/restaurant-props/towel-board-02/wide-store.png)
and [work-detail close-up](../../generated/restaurant-props/towel-board-02/work-details.png).
The towel is a closed 1.2 mm shell with smooth asymmetric hanging folds, small
worktop wrinkles and a narrow hem; its rear patch rests on the worktop. The old
coincident front/back sheet is removed. The chopping block now has a closed,
40-sided rounded profile, worn rim, planar end-grain working surface and knife
marks. Cleaver tang, shaped handle and rivets remain separately inspectable.
The original 40 cm footprint and 12 cm working height are retained.

AO was already enabled, but the glass entered its opaque depth/normal pass.
The project viewer now excludes transparent-only meshes during AO and restores
them immediately afterward; glass stays in the preceding color render. A 14 cm
world-space radius, 7 cm thickness, 32 samples and .85 blend strength concentrate
shading on local contacts. Matched [AO on](../../generated/restaurant-props/towel-board-02/work-details-ao-on.png)
and [AO off](../../generated/restaurant-props/towel-board-02/work-details-ao-off.png)
use identical geometry, camera, lighting and exposure. Mean whole-image darkening
is 1.02/255 for the counter and 1.17/255 for the detail view; inspection confirms
visible grounding without broad blackened tiles or food. AO remains a live-viewer
effect, not a baked GLB channel.

Seven frozen-input views completed without browser errors. Wide-store props now
use **21,371 triangles** (+1,499); narrow uses **6,423**, alternate **22,597**.
No texture maps or paid generation were added. All 16 focused restaurant/metal
tests and `npm run check` passed. New tests cover coherent closed shells, cloth
thickness and counter contact, board footprint and flat support, including mirrored
placements. Independent test and implementation reviews approved the changes;
review caught and corrected a tiny towel/counter penetration and buried handle
rivets. The first capture was rejected because unrelated wall source files changed
mid-run; `towel-board-02/capture.json` records the successful frozen inputs.


## Material weathering and lighting

Current evidence: [whole store](../../generated/restaurant-props/weathering-04/wide-store.png)
and [counter detail](../../generated/restaurant-props/weathering-04/work-details.png).
The back menu poster and its unused rendering code have been removed at the user's
request; historical concepts and earlier captures remain reference evidence.

Towel stains now follow cloth-local meters, with irregular wiping marks and a
soiled lower hem. The board side uses the existing shared shop-timber PBR atlas,
with vertical grain continuous across every rounded profile ring. Angular splits
at atlas repeat boundaries keep triangles out of gutters and preserve a closed
body. Its .2 m outer radius defines circumferential scale; the .186 m rounded rim
compresses that scale by up to 7%. The top retains its planar end-grain chart.
No new textures were allocated for either prop.

Restaurant tile recipe parameters changed from wear .32/grime .48 to
**wear .42/grime .95**. The shared albedo, normal and roughness maps were rebaked;
physical texel density and tile size are unchanged. The stronger .58 wear trial
removed too much ceramic and was not adopted. The baker and `tiles-bake.json`
retain the accepted settings; `production-files.json` identifies the new maps.

The viewer's environment intensity is now .18, hemisphere fill .38 and rear fill
.75, down from .30/.75/2. The key remains 1.65, with the warm task lights and
contact AO unchanged. This deepens shadows while preserving readable surfaces.
Lighting and AO remain live-viewer effects; the prop geometry/colors and tile
textures are portable production assets.

The final wide store contains **21,365 prop triangles**, narrow **6,417**, alternate
**22,591**. All 17 focused restaurant/metal tests and type checks pass. The added
UV test verifies continuous side grain, safe atlas gutters and generic-texture
fallback under mirrored transforms; existing tests retain shell/contact, support,
material export and collision checks. Both independent reviews approved the final
changes. Frozen captures retain matched AO and task-light comparisons, with no
browser errors. No paid generation or additional texture allocation was needed.
