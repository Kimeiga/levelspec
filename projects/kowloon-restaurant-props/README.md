# Kowloon chicken restaurant

The restaurant and building concepts now share a
[Kowloon art-direction reference set](../kowloon-art-direction/README.md), including
intact and weathered concrete, plaster and ceramic material studies.

The production `roast` trade now uses textured hanging chickens, shared prepared-food
piles, open steel trays, close condiment groups, a mechanical scale, nested crockery,
takeaway stacks, fitted storage, a cooking hood, and aged ceramic/steel/wood surfaces.
The counter can be reflected or recessed; small rooms drop fixtures that cannot fit.
The working chopping area remains clear.

Latest: [material weathering and lighting](concept-implementation.md#material-weathering-and-lighting),
with a stained towel, continuous chopping-board side grain, stronger tile weathering,
deeper shadows and the back poster removed.

![Whole restaurant](../../generated/restaurant-props/weathering-04/wide-store.png)

The following acceptance links and budget figures document the earlier baseline:

- [Counter detail](../../generated/restaurant-props/acceptance/counter.png)
- [Food and attachments](../../generated/restaurant-props/acceptance/food.png)
- [Elevated inspection](../../generated/restaurant-props/acceptance/elevated.png)
- [Minimum-width shop](../../generated/restaurant-props/acceptance/narrow.png)
- [Alternate seed](../../generated/restaurant-props/acceptance/alternate.png)
- [Concept target](concepts/store-target.png), [real-image study](references.md),
  [verification](verification.md)
- [Current-render polish study](concepts/polish-study.png) and
  [material comparison](polish-study.md), made after the accepted implementation.
- [Freer aspirational concept](concepts/aspirational-store.png): a newly composed
  alley storefront, using the prior study only as a loose identity reference;
  [prompt](concepts/aspirational-store-prompt.txt) and
  [provenance](concepts/aspirational-store-provenance.json).
- [Subsequent shelf UV repair](shelf-uv-review.md): metric grain, consistent board
  wrapping and cut ends.
- [Natural shelf texture pass](shelf-natural-review.md): long unique scans and
  varied board crops.
- [Shelf contact wear](shelf-edge-wear-review.md): brighter handled lips and corners;
  current wide restaurant contains 21,872 prop triangles.
- [Shared texture optimization](texture-reuse-review.md): image alias reuse and
  removal of unused export images; the optimized enclosure is 3.95 MB smaller.

The review is an open-top cutaway. Its baked peeling plaster and chipped quarry floor
use the current production surface recipes; they are local presentation assets.
The actual `roast` generator, its ceramic wall/counter dressing, food, fittings and
stock are integrated into normal shop generation. AO and neutral studio reflections
belong to the viewer and are not baked into the exported props. This is visual
art evidence, not navigation or gameplay acceptance.

## Asset choices and budgets

| Asset | Method | Actual source triangles |
| --- | --- | ---: |
| Hanging chicken | Tripo P1, uniform fit, three locally baked glaze variants | 892 |
| Combined sliced-meat pile | Tripo P1, uniform fit inside scripted tray | 498 |
| Counter, shelves, hood, rails, hooks, lamps, fan, cookware | Scripted construction | Included in scene total |
| Bottles, jars, scale, stool, cartons | Reused approved provisions-store assets | No new generation |

The accepted wide view has **21,664 prop triangles**, the narrow view **8,018**, and
the alternate seed **22,890**. The baked enclosure adds **284,300** triangles, so the
wide inspection scene has **305,964** in total. The food atlas is shared 1024×1024
albedo/normal/properties; kitchen surfaces share 512×512 albedo/properties. Both
have padded boundaries. Geometry is reused from offline catalogs; repeated stock
is appended into the compiler's existing merged mesh, not GPU-instanced.

The chicken is anchored at an actual upper mesh vertex. Hooks, size, yaw and drop
vary within bounds. The meat pile rests on the tray floor, not its rim. Simple
cookware uses smooth side normals and explicit rims; the chopping block has a
planar end-grain chart. Labels vary within approved atlas regions. Steel color is
neutralized locally; overly pink meat crust is graded toward cooked caramel while
retaining pale interiors. Neither adjustment spends provider credits.

## Reproduction

```sh
node tools/bake-restaurant-surfaces.ts
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/bake-restaurant-food.py
node --experimental-transform-types projects/kowloon-restaurant-props/build-store-surfaces.ts generated/restaurant-props/store-surfaces
node projects/kowloon-restaurant-props/capture.mjs generated/restaurant-props/new-capture generated/restaurant-props/store-surfaces/enclosure.glb
```

The food baker needs the two downloaded source GLBs and result records under
`generated/restaurant-props/`; provider task IDs are retained in `food-bake.json`.
It uses the installed Blender and Python/Pillow. Normal AML compilation requires
none of these tools, image services, or provider credentials.

`production-files.json` identifies adopted catalog/maps. `food-bake.json`,
`food-production.json`, `surfaces-bake.json`, and `concepts/*provenance.json` preserve
sources, parameters, prompts and hashes. The capture freezes live input hashes and
verifies that the enclosure matches its build report. Source changes after an
offline enclosure bake do not retroactively change that artifact; rebuild before
claiming a new surface recipe has been rendered.

## Cost

User approved this two-model batch for approximately 100 credits. Actual billing:

| Task | Provider ID | Credits |
| --- | --- | ---: |
| Chicken | `62f6c355-d1d6-4065-958f-042f94a6b3ef` | 50 |
| Sliced meat | `816d972e-216b-44e4-a9b0-6e72338a3da5` | 50 |

**Total 100 credits**, model `P1-20260311`, standard textured PBR, one generation each.
No paid conversions or rerolls. Balance checked afterward: 4,750, none frozen.

The reusable stainless update is documented in [modular metal](../modular-metal/README.md), including shared maps, metric UVs, polish presets and restaurant captures.

The latest [towel, chopping-board and AO follow-up](concept-implementation.md#modeled-towel-chopping-block-and-contact-ao-follow-up)
includes whole-store and close-up renders, matched AO evidence and measured budgets.


### Shared poster library

The store now uses the [shared ImageGen poster bank](../kowloon-posters/README.md):
a roast-meat menu and calendar on one side wall, a soda ad on the other.
They use six triangles each, one shared atlas, slight individual tilt and the
existing scene lighting/AO. Small or low-ceiling variants retain clear fixtures.
See [the full-store capture](../../generated/poster-library/review-03/wide-store.png)
and [wall close-up](../../generated/poster-library/review-03/posters.png).
The removed rear-wall poster remains removed; these are new side-wall placements.
