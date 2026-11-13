# Kowloon courtyard dressing demo

An AML demonstration of reusable floor/wall finishes and procedural background
buildings. The two northern building façades form the courtyard boundary using
`base-wall`; there is no separate visible wall in front of them. The central
well, staircase, ramp, and upper platform come from the maintained elevation
laboratory fixture. This is a system demonstration, not a reconstruction of
Kowloon Walled City or a finished gameplay map.

Run `npm run dev`, select **Open default level**, and choose **Kowloon street** or
**Blockout**. See [procedural dressing](../../docs/DRESSING.md) for supported AML,
builds, and limitations. Models, texture files, and portable ZIPs are generated at
`generated/dressing-demo/presets/` and downloadable from the preview.

Kowloon uses the shared ceramic tile system for plain walls and patched floors:
thin grout, occasional corner chips, clustered missing tiles, granular gray
plaster, subtle grime and softly faded paint. Tile size, aspect, color, wear, grime and independent plaster color are AML
controls. Exposed bedding reuses the shared concrete maps under fine combed
ridges. Floor tiles default to a darker charcoal-green palette and 256 texels/m. The curved courtyard wall uses a closer-view resolution;
the ground keeps its existing paving regions and floor-sized tiles. The
[tile reference](../kowloon-wall-tiles/README.md) documents the approved finish.

## Asset provenance

The four 512 px texture tiles reuse procedural color outputs from
[Ninefold Reboot](../ninefold-reboot/production/README.md), with originals and SHA-256
hashes recorded in [textures/provenance.json](textures/provenance.json). Recipes
remain in `../ninefold-reboot/production/blender/textures.py`. Window framing and
AC proportions adapt the reusable Ninefold kit in `production/blender/assets.py`.
The new generator emits these parts directly; it needs no Blender installation.

The kit finishes under the `kowloon-` prefix (`lettering.png`,
`signboard.png`, `rust.png`, `glazing.png`, `metal.png`, `sheet.png` and
`timber.png`) are painted by `tools/kowloon-kit-textures.py`, and the washing
and air conditioner atlases (`cloth.png`, `aircon.png`) by
`tools/kowloon-prop-textures.py`. Sign lettering is a glyph atlas rasterized from open-licensed Google Fonts families (Noto Sans
HK, Noto Serif HK, LXGW WenKai TC, Yuji Boku, Yuji Syuku, Dela Gothic One,
Huninn, WDXL Lubrifont TC, Oswald, Anton and Bebas Neue, all under the SIL
Open Font License); the fonts themselves are not redistributed. Shop names
are invented from generic trade words and reproduce no real business.

Visual study used Ninefold's existing
[reference study](../ninefold-reboot/references/study.md) and local gallery images
`gallery-00.png` and `gallery-04.png`, credited in that project's
[image manifest](../ninefold-reboot/references/images.json). Those photographs
informed adjoining heights, repeated bays, service details, and weathered finishes;
they are not embedded in the exported models. The sibling 3D Modeling Harness
workflow was also consulted.

All lighting and shadows are real time. Texture files describe material color and surface normals;
vertex colors describe finish condition. No lighting or AO bake is required.

The asphalt color and matching OpenGL-style normal texture were made with the
built-in image-generation tool, then saved as `ground-asphalt.png` and
`ground-asphalt-normal.png`. The [saved prompts](textures/ground-asphalt-prompts.json)
and [asset provenance](textures/asphalt-provenance.json) record the generation and
checksums. Both images are 1254 px square. The material uses an intended 1.5-meter
tile size and normal strength 1.15. The generated normal relief is an artistic
estimate, not a measured scan. No separate AO or lighting map is used.

The courtyard's flat ground also uses original seamless aggregate color and
normal textures from `generate-ground-texture.mjs`. Its procedural pours, broad material zones, shallow
relief, puddles and debris are described in the
[ground reference study](ground-reference.md). Stair and ramp finishes retain
their existing recipes.

## Review evidence

The compiled overview and courtyard-level perspective were independently reviewed
for enclosure, building bases, roofs, junctions, and circulation. The two attached
frontages align with the native collision plane at Y=11.89 m. The compiled runtime
reports and matching physical hashes provide the reproducible collision evidence;
sampled navigation does not establish continuous reachability.

The apple crate and crimped packet use simplified meshes and color maps from
the [Kowloon prop pilot](../kowloon-asset-pilot/README.md). One baked load contains
32 apples in 1,408 triangles after buried-face removal, compared with 19,584
triangles for 32 copies of the original pilot mesh. Each repaired snack packet uses 192
triangles, with its original label baked onto a sealed pouch. A single 256 px apple map and 512 px packet map are shared by all
copies. Other trades retain procedural jar profiles and paper labels; the grocer
uses the textured jar from the expanded catalog below.

To reproduce the stock bake from the pilot GLBs, run Blender in background mode
with `--python-exit-code 1 --python tools/bake-kowloon-stock.py` from the repo root.
The bake uses macOS `sips` to resize the extracted base-color images. The AML
build uses the resulting JSON meshes and PNGs directly.

`storefronts.aml` puts the greengrocer, grocer and herbalist on one review street.
Open it with `npm run --silent levelspec -- preview projects/dressing-demo/storefronts.aml`.
Shelf facings vary their spacing, setback and yaw within the available shelf
space. Each stack shares one pose. Red apple piles shift and turn slightly
inside the tipped crates.

The grocer now uses the [liquor/provisions catalog](../kowloon-liquor-props/README.md):
textured Tripo props with shared color, normal and metallic/roughness atlases;
a generated fridge shell with procedural liners and separately arranged stock;
and a generated basket with simple modeled eggs. Lights and fans remain
procedural. Packet clips attach to varied seam points, with irregular gaps and
angles. The catalog study records references, budgets, billed generations and
visual evidence. These generated textures can contain residual painted lighting;
bottles currently use opaque materials.
