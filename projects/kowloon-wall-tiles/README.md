# Kowloon ceramic tile reference

Reference samples for the standard Kowloon wall and floor tile system. Plain
walls and patched floors share the production renderer, including three
co-located fracture contours per damage blob, thin grout, granular plaster,
subtle grime and faded pigment. Each logical tile selects one contour for each
blob; its choice is stable through texture sampling and independent of render
triangulation. Art settings remain adjustable.

Edit the plain-wall rules in `level.aml`:

- `tile-size`: width in meters.
- `tile-aspect`: width / height; 2 makes a tile twice as wide as it is tall.
- `tile-wear`: ceramic breakage and paint fading from 0 to 1, separate from the wall's `wear`.
- `tile-grime`: brown deposits, dullness and color variation from 0 to 1; defaults
  to the wall's `grime`. Zero disables added dirt, preserving the source texture.
- `tile-color`: six-digit sRGB hex base color.
- `tile-plaster-color`: independent six-digit sRGB color for exposed bedding.
- `tile-share`: broad installed ceramic coverage, from 0 to 1.
- `texture-density`: map resolution in texels/m, default 32; this close-up uses 320
  with the high-detail appearance budget. The default density cannot resolve the
  fine combed plaster or narrow tile bevels shown here.

The example shows cream square tiles, jade rectangular tiles, and smaller blue
mosaic. These samples are art experiments, not visual test expectations. Source
PBR images are shared with the demo project; lighting remains real-time.
Missing tiles expose gray plaster with concrete-style mottling, mineral grain
and fine combed trowel ridges. The optional `study-wall-tile-plaster` finish reuses
the demo’s shared concrete color and normal maps at their own repeat.
Tile faces stay flat with narrow edge bevels; intact joints have darker grout.
Grout gaps are thin and mostly straight, with small chips concentrated at selected
tile corners and rare nicks along an edge, following the concept art. Color and
normals follow the same chipped edge.
Soft fractal pigment variation follows the concrete wall study's rotated-noise
approach. Faded areas retain the source ceramic texture and normal relief, with
gently duller reflections. Paint fading remains visible with zero grime.
Use the preview's light control to inspect the normal relief.

Grime follows the muted brown patches and varied glaze in the local concept art,
especially `../kowloon-art-direction/materials/04-tiles-intact.png` and
`05-tiles-damaged.png`. These are generated art references, not calibrated PBR maps.
The three samples use grime 0, 0.65 and 1; changing grime leaves the damage pattern
and plaster unchanged.

Preview using `npm run --silent levelspec -- preview projects/kowloon-wall-tiles/level.aml`.
