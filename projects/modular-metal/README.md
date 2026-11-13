# Reusable brushed stainless steel

One shared 512×512 PBR set for tables, metal shelving, trays, and cookware. The
material has fine directional brushing, soft wipe haze, and scattered shallow
scuffs. Color contains no lighting or object-specific shadows. Reflection comes
from actual PBR lighting, so it moves when the light or camera changes.

[Overview](../../generated/modular-metal/overview.png) ·
[Changed lighting](../../generated/modular-metal/relit.png) ·
[Close-up](../../generated/modular-metal/detail.png) ·
[Example GLB](../../generated/modular-metal/study.glb)

## Use

The maps live in `projects/dressing-demo/textures/`:

| Image | Interpretation | Bytes |
| --- | --- | ---: |
| `brushed-metal.png` | sRGB albedo | 80,533 |
| `brushed-metal-normal.png` | Linear OpenGL tangent normal | 48,272 |
| `brushed-metal-properties.png` | Linear G roughness, B metalness; R unused white | 106,090 |

Total: **234,895 bytes**, shared across objects and material presets. One texture
repeat represents **0.5 meters**. No texture per object, AI generation, or bake at
compile time is required. The exact recipe/output hashes are in
[material-bake.json](material-bake.json).

```xml
<material id="kowloon-brushed-metal" color="#ffffff" repeat="2"
  roughness="1" metalness="1"
  texture="textures/brushed-metal.png"
  normal-texture="textures/brushed-metal-normal.png"
  metallic-roughness-texture="textures/brushed-metal-properties.png"/>
```

The optional finish is adopted by the restaurant's `kitchenMetal` receiver, and
is bound in both dressing-demo AML sources and the restaurant study. Without it,
the existing kitchen surface atlas remains a supported finish. Ceramics and wood
continue to use their own atlas regions.

For another kit, wrap its final fixture pen with `brushedMetal(pen)` from
`src/dressing/finish/brushed-metal.ts`, then draw the metal parts in the `metal`
slot. The adapter preserves vertex tints, geometry, normals and unrelated slots.
It unwraps planar faces in physical meters, including slopes, and seeds a stable
texture offset per fixture frame. Translation, part naming and facing preserve
the finish. General `rotated(...)` helpers return a plain pen: wrap the final
rotated pen. This material wrapper does not add bevel geometry; narrow actual
bevels or rolled rims provide the strongest edge highlights.

Explicit face UVs are already texture coordinates and pass through unchanged.
For turned vessels, `lathe(..., sides, textureRepeat)` unfolds each profile band
at the same physical density. Cylinders use their actual polygon perimeter;
tapered shoulders unwrap as sectors that preserve the lengths of the mesh's
ring edges, sloping edges and triangle diagonals. Flat caps use planar charts.
Noise therefore retains its physical size on narrow and wide portions alike,
including coarse meshes. Smooth shading normals and geometry are unchanged.
This is metric mapping of the rendered mesh, not of an ideal smooth circle.

The charts are tied to object-local meters so moving or rotating a fixture does
not make it swim through world-space noise. Resizing authored dimensions increases
the sampled texture area. All PBR channels share those charts. Different slopes
have separate charts, so the closing meridian and slope transitions can have
texture seams. Rotate the closure at positive local X away from the main view;
retain rim/rolled-edge breaks where they naturally separate charts. Seam continuity
is not obtained by stretching the texture. Flat tiled sheets repeat continuously.

Keep roughness/metalness factors at 1 for wiped tables and shelves. A separate
material with **roughness 0.65** gives the shinier cookware finish in the study,
using the same three images. Factors multiply the map values. Keep metallic
albedo neutral; using a dark vertex tint intentionally produces dark metal, as
on the existing restaurant oven. Bare-metal maps do not represent painted metal,
rust, soot, or contact dirt: those need their own coating/mask treatment.

## Reproduce and inspect

```sh
node tools/bake-brushed-metal.ts
node projects/modular-metal/build.ts
node projects/modular-metal/capture.mjs
```

Open `/projects/modular-metal/index.html` on the repository Vite server after
building. Drag to orbit and use **Rotate lighting** to distinguish the real
reflection from texture detail. The compact study has **1,592 triangles**, one
shared table/shelf material, one cookware material, and exactly three shared
metal image sources. Its GLB is **552,384 bytes**, including geometry and floor.
The sample sheet panels include 4 mm bevels; the material itself adds no triangles.

Validation: typecheck and all **11 focused material/restaurant tests passed**;
GLB validation reported zero errors; the three study captures and six restaurant
views loaded without browser errors. Independent test and implementation reviews
were completed. Tests cover physical UV density even with oblique winding hints,
reflected frames, explicit charts, preservation of geometry/collision/normals,
physical triangle-edge UV lengths across multiple radii, slopes, polygon counts
and object sizes, channel consistency, and exported image sharing.

The final restaurant views are under
[`generated/restaurant-props/metal-physical-space/`](../../generated/restaurant-props/metal-physical-space/).
They reuse the existing optimized enclosure and AO. Store prop triangle counts
remain unchanged: 21,872 wide, 8,050 narrow, and 23,098 alternate. The sample shows
clean wiped stainless; store-specific grime and contact wear remain separate
receiver responsibilities. At very close range this intentionally inexpensive
512px material is not a unique hero-asset texture or an anisotropic BRDF.
