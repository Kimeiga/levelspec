# Concrete ground transfer study

Open `index.html` through the existing Vite server. The page loads the generated
Kowloon demo GLB without running the dressing pipeline. It applies the shared
`../../src/materials/concrete/material.ts` material to the courtyard's concrete,
repair, spall, chip, and exposed-edge meshes. Stairs, ramps, walls, and manholes remain as exported. Concrete receivers
are selected by finish metadata, including atlas-composed surfaces.

The material reuses both concrete study images, stochastic offset/rotation
sampling, clumped darkness blending, and subtle hue variation. Ground mode adds
fine mineral normal relief and disables wall-only seams, tie holes, rectangular
repairs, and top-edge grime. Existing ground construction joints remain geometry.

GLB Y-up coordinates are restored to domain Z-up before computing world XY UVs
at two meters per texture unit. Each replaced mesh gets a private geometry clone
for UVs; positions, topology, and original geometry remain unchanged. Source
textures are shared, loaded once, and switches allocate no new textures or meshes.
Previous/New buttons switch both material and UV geometry. Lighting uses the
same real-time review rig as the demo.

This is an isolated art preview: the main reviewer and exported GLB/package are
not rewritten. Existing demo issues such as polygonal puddles/asphalt boundaries
are retained for subsequent focused iterations. Shader modifications are not
portable through the ordinary GLB material exporter.

Validation: scoped TypeScript check including `src/vendor.d.ts`, browser load and
shader error capture, before/after wide and close-up screenshots. No visual
assertion tests were added.

## Asphalt overflow

Run `node projects/kowloon-ground-study/build.ts` to rebuild courtyard dressing
and its region manifest under `generated/ground-study/`. The compiler now shares
expanded asphalt footprints across adjacent pours; asphalt covers underlying
joints and uses continuous UVs and relief across internal pour boundaries.
Native rims and manholes still bound the receiving surface.

The live preview applies an approximate shader version of the overflow to the
cached complete demo, retaining buildings without recompilation. Its fine-edge
noise differs from the compiler; it is an art preview, not exact verification
of the exported boundary. The isolated ground GLB is the compiler result.
Asphalt textures are loaded once and normal detail follows receiver orientation.

## Shared ceramic

Rebuild the official scene with `npm run demo:build` after tile changes.
The preview uses courtyard tiles directly from the complete Kowloon demo export;
it no longer substitutes an isolated tile asset. These tiles use the same TileField and
tileSurface composition as plain walls, including chipped joints, missing units,
combed plaster, faded pigment and grime. Ground defaults are 0.4 m square units
and wear 0.9; floor AML tile settings override them. Asphalt still coats those
receivers where its shared coverage reaches them.
