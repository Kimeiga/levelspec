# Ground reference study

This is themed procedural invention, not a reconstruction of one photographed alley.

- User-supplied aerial photograph (clipboard attachment, 2026-11-09): closely
  packed surfaces, accumulated repairs, localized vegetation. Most visible flat
  surfaces are roofs; this image cannot establish the detailed ground pavement.
- Ian Lambot, **Walled City Daylight Alley**, [Blue Lotus Gallery](https://bluelotus-gallery.com/kowloon-walled-city):
  a continuous narrow concrete passage with irregular transverse joints, worn
  patches and small loose debris. Ground is not a multicolored tile quilt.
- Greg Girard, **Kwong Ming Street, 1989**, [published photograph](https://www.thecollector.com/kowloon-walled-city-lawlessness-and-claustrophobia/):
  irregular damp concrete, broken edges, broad dark wet areas and scattered small
  rubbish, with larger clutter biased toward margins. Water highlights depend on
  the photographed lighting and are not baked into this kit's material.
- Greg Girard, **Cafe, Tung Tau Tsuen Road, 1989**, same gallery: ceramic finishes
  and paper goods are visible, but the ground is not shown. It is not evidence for
  a particular outdoor floor pattern.

Observed pixels were inspected in `generated/ground-reference-alley.png`,
`generated/ground-reference-wet-alley.png`, and `generated/ground-reference-cafe.png`.
Photographs are study references and are not used as exported textures.

The user's follow-up establishes the hierarchy: broad concrete-dominant material
zones; smaller, lower-contrast concrete pours; then cracks, pores, stains, wetness,
and occasional litter. Sparse timber repairs are an optional interpretation,
not a claim that the supplied photos identify wood pavement. Dimensions and feature
densities are authored procedural estimates.

`generate-ground-texture.mjs` creates the original, seamless 1024 px
`textures/ground-concrete.png` aggregate albedo and `textures/ground-normal.png`
tangent normals. They describe pores and aggregate,
with no lighting, shadow, AO, or structural seams. UV phase/rotation, pour color,
and spatial weathering supply variation above the texture's scale. See
`docs/DRESSING.md` for AML controls and physical/visual separation.

Construction boundaries now follow the AML itself: floor and hole corners,
actual wall contacts, adjoining floor corners, and declared connection mouths.
The generator merges nearby axes, creates rectangular pours between them, and
snaps broader material regions to those axes. Random color and wear remain inside
that architectural layout. This is a procedural construction interpretation,
not evidence that a photographed alley used the same pour plan.

Final ground captures and the independently checked overlap/closure audit are in
`generated/ground-review/`. That earlier audit recorded stylized puddles, polygonal moss spots and angular
cracks. The subsequent surface overhaul replaces the polygonal finish treatment;
moss was removed at the user’s request on 2026-11-11.
## Joined pours and service details

The latest ground pass joins optional subdivisions into larger pours while keeping
wall, opening, and adjoining-floor axes. Asphalt repairs are irregular insets;
manholes are surface replacements with clearances, not overlaid props. Broken
concrete clusters use actual wall contacts and locally measured passage widths.
These are procedural interpretations of accumulated repairs, not reconstruction
of particular details in the aerial photograph. The generated top-down inspection
uses compiler-retained pour footprints and the actual finish triangles.

