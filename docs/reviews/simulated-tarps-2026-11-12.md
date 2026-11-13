# Simulated canvas awnings — 12 November 2026

The canvas branch now emits one of four shipped Blender Cloth rest shapes instead
of identical flat strips and scalloped polygons. The corrugated-metal branch is
unchanged. Stable facade/cell identities select the cloth form; narrow/wide fitting
does not consume the unrelated lot randomness. The former stripe color is now a
subtle hem tint, preserving the existing palette draw order.

The source is `projects/kowloon-tarps/model.py` and its editable, texture-packed
`tarps.blend`. Four simulations run through 110 frames, retain exact pin vertices,
and export 1,800 front triangles each. Runtime adds opposite faces, rolled hems,
steel brackets, eyelets and ties. Source physical rest UVs retain woven material
scale after fitting. Normals are recomputed from the fitted mesh, including under
reflected facade placement. Ties use actual pin positions and the appropriate
rear/front/side rail; steel's physical gap beneath pins is independent of cloth
sag scaling. The short skirt's forward overhang is included in the fitted bounds.

Shared `builtin:tarp` color, normal and packed roughness/metalness maps are reused
across all instances. They are ordinary material-library assets with complete AML
prefix overrides. Cloth fitting creates no new raster maps. Brown hem deposits
and fading are intrinsic vertex tint. The model contains no baked illumination,
AO, or shadowing, and no runtime cloth solver.

The rear attachment height permits up to 0.03 m of folded cloth above it; cloth
and hems stay within 0.15 m below the nominal front rail. Ground awning callers
already reserve 0.12 m above the attachment and 0.20 m below the front rail.
Rigid fittings fit the same width/projection and walking-clearance reservation.
Very wide spans split into separately tied panels. Invalid dimensions fail before
partitioning rather than entering an unbounded loop.

Validation: TypeScript check passed. An ignored, non-art probe exercised four forms,
three size/shape reservations (including modular wide spans), and both handednesses:
24 cases passed finite geometry/UV/normal, envelope and visual-only checks. No new
texture/color/placement tests were added. The independent contract review identified
clearance and fitting constraints; independent implementation review caught and
cleared side-tie routing, rigid rail separation and prototype normalized-UV issues.
Final mesh inspection found no degenerate triangles, nonmanifold edges, zero
accumulated normals or invalid attachment indices.

Visual evidence: `generated/tarp-study/{all,taut,loose,asymmetric,skirt}.png` and
`generated/building-polish/tarp-market/{overview,base}.png`, rendered from actual
exported GLBs with real-time Three.js light and shadows. The isolated gallery has
32,364 triangles including both cloth sides and all fittings; the contextual
building has 89,473 triangles. The existing building-polish seed contains no canvas
awning, so the contextual study uses seed `tarp-market-1`; production placement
probabilities and eligibility rules were not increased merely for the screenshot.

Limits: static settled shapes, bounded fitting rather than a fresh physics solve
for every size; no wind animation. The fourth form is a short rumpled overhang,
not a long hanging curtain. Shape and material choices remain open to art iteration.

The full Blockout/Kowloon demo build also passed, including its unchanged physical-hash check. The final Kowloon preview has 859,305 triangles; the preview server remains on port 5178.

Live courtyard review reached ready state and rendered 859,305 triangles; screenshot
saved as `generated/tarp-study/courtyard.png`. The initial 60-second capture timed
out during the large dev-server asset load and concurrent source hot reloads;
a longer retry completed without page errors.
