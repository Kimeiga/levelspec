# Plain concrete material study

First guided wall pass: two generated plain sources: `../../src/materials/concrete/textures/concrete-plain.png` and
`../../src/materials/concrete/textures/concrete-fine-sand.png`, rendered on
an 8 × 3.2 m wall at a nominal 2 m image scale. No added grime, repairs, plaster,
tiles, moss, props, or geometric surface breakup.

Open `index.html` through the local Vite server. Regular/varied buttons compare
the same receiver and texture. Varied sampling blends three seeded UV offsets
on a triangular lattice, with rotations limited to about ±9 degrees. Cubic blend
weights and a linear-color contrast correction reduce grain softening. Explicit
texture gradients keep mip selection independent of the randomized offsets.

The shader now lives in `src/materials/concrete` and is shared with the production
material-map exporter. The demo uses cached albedo and tangent-normal maps of its
base concrete across ground, building substrates, and shop structural surfaces.
This page still evaluates the shader directly for interactive tuning, including
wall-specific controls. All lighting remains real-time. See `docs/DRESSING.md`
for regeneration and the distinction between shared base maps and local weathering.

The source texture's mean is recorded in `src/materials/concrete/material.ts` only for blend contrast;
its parameters and appearance remain experimental, not visual test contracts.

The color pass adds three octaves of smooth value-noise FBM in stable wall UVs.
Darkness variation controls multiplicative darkening; hue variation controls a
separate signed tint field; hue direction chooses its color axis in degrees.
Zero darkness and hue strengths retain the unmodified two-source blend. Controls update
uniforms live; the noise affects color only, before real-time lighting.

Each concrete source has an independent darkness field. A third fractal field
controls their blend, with adjustable frequency and contrast. Three low-weighted octaves form coherent clumps. Domain warping
and four boundary-local fine noise bands produce torn edges in all three fields; the edge
jaggedness slider controls their strength. Screen-space filtering softens only
subpixel transitions. This remains color variation, not displaced geometry.

Current concept-guided defaults use 10%/13% darkness, 5% hue variation toward
60° (yellow), blend frequency 9, blend contrast 1, and edge jaggedness 0.8.
The hue field has a small positive bias for a gently warmer average. The second
source mean is brought 90% toward the first to keep color contrast restrained.
Noise coordinates use 85% horizontal and 68% vertical frequency for slightly
broader patches with a 1.25× vertical stretch. Source texture grain stays at its
original physical scale. These are editable art defaults, not acceptance assertions.

Clump transitions are narrow and derivative-filtered. Fine contour noise fades
out inside each clump instead of mottling its entire interior; texture pores
and grain remain visible throughout.

Construction seams use a shared procedural height and color field in meters:
vertical joints every 2 m and the perimeter of every box face. Irregular pockets
widen the chipped shoulders around a narrow recessed joint. Surface-gradient
bump normals respond to real-time light; the same field supplies restrained
cavity darkening and exposed concrete. These shader maps do not alter the
silhouette, collision, or geometry, and are not baked lighting.

Optional concrete cutouts are filled rectangular repairs, not openings. They
reuse the source concrete with deterministic hue/value offsets and feed their
perimeters into the existing chipped seam height/color field. They fit inside
construction panels on broad wall faces; narrow top/side faces retain their
original edge treatment. The toggle updates a uniform without allocating maps.

Optional form-tie holes use a regular 1 m horizontal/vertical grid in wall-face
coordinates, with approximately 5 cm openings, slightly chipped rims, and 12 mm
normal-only recess depth, without hole color darkening or rim tint. Edge-clipped centers and narrow faces are excluded. These
are surface recesses, not through-holes. A uniform toggle leaves the base
concrete, repairs, and seams intact. The combined seam/hole field is evaluated
once per fragment and reused for color and normal relief; no new maps load.

Top grime uses a lazy, module-owned 512×256 linear-data mask with mipmaps. It
is generated once per page/module lifetime and shared across materials, with
an 8 m horizontal repeat and downward streaks fading completely within 1 m.
The geometry supplies distance below its actual top: resizing updates that
attribute, not the mask. Top caps receive grime; undersides remain clean. The
toggle only changes a uniform. This is in-memory material caching, not baked
lighting or a persistent disk cache; the material does not own/dispose the mask.

Top grime uses stronger coverage and darkening while retaining the same cached
mask and one-meter fade. Internal construction seams are vertical; rectangular
repair outlines and physical perimeter edges keep their complete borders.

## Plaster coating

Choose **Plaster** in the wall selector, or open `index.html?material=plaster`.
The **Chipped plaster** toggle reveals the original concrete substrate through
clumped, finely eroded patches. Intact plaster hides concrete seams, repairs,
and form-tie holes. The exposed substrate retains the existing concrete controls.
Top grime applies over either finish.

The plain plaster image uses the same randomized offset/rotation sampling as
concrete, with its own measured linear color mean. All three source textures
load once; toggles update uniforms. A shared erosion field controls both color
exposure and a 4 mm plaster lip with fine mineral-grain normal relief.
This is shader-only relief, not geometry displacement: silhouettes and collision
remain unchanged. No baked lighting or additional overlapping decal geometry is used.
The material remains a standalone study and is not integrated into AML export yet.

The plaster source was generated with built-in ImageGen; its full prompt and
source path are recorded in `textures/provenance.json`.
