# Real-time weathered material transitions

Research date: 2026-11-11. This is a technique study and proposed direction, not an implemented renderer contract. Real-life photograph observations belong in the companion reference study. No production code changed for this research.

## Recommended direction

Use one layered receiving surface whose material changes at pixel resolution, with selective real geometry for exposed thickness and broken silhouettes. Preserve the construction-sized regions derived from AML; use material-specific damage to refine their boundaries. Simply increasing polygon counts or adding a blurred color fade would not address all the cues.

Scope is the shared wall/floor appearance system: wall and floor tiles, plaster and exposed masonry, asphalt/concrete, grime/contact deposits, dampness and puddles. The three-coupon test proposed below is a small validation stage for this overhaul, not its final scope.

The proposed representation separates three scales:

1. Construction: slabs, repair extents, plaster coverage, tile courses, corners and contacts from AML.
2. Damage: connected losses, surviving islands, lifted edges, fracture branches and exposed substrate.
3. Surface: aggregate, pores, dust, chips and normal/roughness detail.

These are our design recommendations, informed by the methods below; the sources do not establish the historical construction of a particular Kowloon surface.

## Verified primary techniques

### Height-aware material transitions

Epic's HeightLerp uses a height texture and adjustable transition phase/contrast to produce a blend and its alpha. Adobe's Material Height Blend combines two material heightmaps with height offset and contrast controls. These are practical precedents for letting aggregate peaks, pits and plaster thickness shape a boundary instead of accepting a smooth interpolated mask. Use the resulting weight consistently across base color, roughness, normal and height. Keep the AML coverage mask as the broad constraint, so local texture height does not scatter the finish everywhere. [Epic HeightLerp](https://dev.epicgames.com/documentation/unreal-engine/texturing?application_version=4.27#heightlerp), [Adobe Material Height Blend](https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/nodes-reference-for-substance-graphs/node-library/material-filters/effects-material/material-height-blend).

A proposed implementation could form a signed boundary-distance field in meters, distort it with correlated damage at several scales, and perturb its threshold with the materials' calibrated height fields. Distinguish the narrow visual antialiasing band from the much wider physical damage region. Do not interpret height blending as making asphalt and concrete uniformly translucent into one another.

### Erosion and causally placed masks

Adobe's Slope Blur can deform masks to create chipped/weathered edges, dirt runs and smeared rust; its controls include seed, intensity, custom noise and source scale. Adobe's generators also use topology-derived position, curvature and world normals. The transferable principle is to combine a purposeful placement mask with fine material breakup. [Adobe Slope Blur](https://experienceleague.adobe.com/en/docs/substance-3d-painter/using/effects/filters/standard-filters/blur-slope), [Adobe Generators](https://experienceleague.adobe.com/en/docs/substance-3d-painter/using/effects/generators/generator).

For LevelSpec, contacts, height above ground, exposed corners, sheltered areas, drain locations and construction joints can supply these placement fields directly from AML. We do not need a lighting bake to obtain them. A single uniform noise frequency around every perimeter would reproduce the artificial sawtooth problem at a finer scale; combine connected large losses with sparse notches and small crumbling instead.

### Layered materials and detail density

Unity's photogrammetry workflow uses reusable tileable material layers to recover close-up detail without a huge unique texture for every object. Its guide separates the principal material, layer masks and fine detail textures, and requires de-lighting photographic color. This is a useful model for retaining the approved asphalt while improving how it meets other materials. [Unity, Layering materials](https://unity3d.com/files/solutions/photogrammetry/Unity-Photogrammetry-Workflow-Layered-Shader_v2.pdf), especially pages 3–9 and 12–17.

The proposed material library should contain coherent sets of base color, normal, roughness and height with an explicit physical sample size. Boundary masks need enough texel density at the expected inspection distance; a high-resolution asphalt image cannot sharpen an unrelated coarse polygonal mask. Generated photos remain useful for the individual material surface. Independently generated arbitrary channel images need alignment checks before being treated as a coherent PBR set.

### Correct normal handling

The original *Blending in Detail* article explains why normal vectors should not be treated as ordinary RGB colors. It distinguishes fading between surface normals from adding fine detail to a base orientation; Reoriented Normal Mapping (RNM) is intended for that latter detail-composition task. [Barré-Brisebois and Hill, Blending in Detail](https://blog.selfshadow.com/publications/blending-in-detail/index.html).

For our material transition, select/interpolate the two material normals using the same coverage weight in a consistent tangent frame, then compose the rim/chipping or micro-detail normal appropriately. RNM is not a universal replacement for every material crossfade. If UV sampling is rotated or mirrored, transform tangent-space normals consistently too. Stronger normal scale cannot create an actual broken silhouette or exposed coat thickness.

### Geometry and optional parallax

Tatarchuk's primary POM presentation uses per-pixel heightfield ray traversal for motion parallax and optional soft self-shadowing under dynamic lighting, with adaptive detail levels. It also explains why normal maps alone lack parallax and expose coarse geometry at silhouettes. [ATI, Practical Parallax Occlusion Mapping](https://www.realtimerendering.com/advances/s2006/Tatarchuk-POM.pdf), especially pages 7–15 and later LOD discussion.

Recommendation: start with ordinary normals plus small real lips/bevels for visible plaster thickness, broken tile edges and deep missing pieces. Add POM only for a measured close-up benefit and with angle/distance quality limits; it adds sampling cost and renderer-specific complexity. A flat receiving sheet with a jagged color mask can still look like a sticker. Use one owned top surface, recessed substrate and connecting side faces where actual depth is warranted, rather than coincident overlaid opaque planes. This is a topology recommendation to preserve our no-overlap requirement, not a property automatically provided by POM.

### Decals for sparse events

Epic's deferred decals can change base color, roughness and normals and are specifically used to add local damage and break repetition. Their cost depends on coverage and material complexity; supported channels and platforms also matter. [Epic Decal Materials](https://dev.epicgames.com/documentation/unreal-engine/decal-materials-in-unreal-engine?lang=en-US).

Use the idea for occasional stains, leak trails, tire marks, repair scuffs and deposits, not as the sole mechanism for every exposed substrate boundary. In our renderer, compositing such local effects into the receiving material avoids introducing a second near-coplanar opaque surface. An Unreal DBuffer implementation cannot simply be assumed to exist in Three.js or standard GLB.

### Suppressing repetition

Unity Labs' stochastic texturing prototype combines randomized samples for stochastic surfaces. Its documentation notes restrictions: strong lines/shapes can become messy, and excessive blending can expose a hexagonal pattern. The repository is archived and is a technique reference, not a recommended dependency. [Unity Labs procedural stochastic texturing](https://github.com/UnityLabs/procedural-stochastic-texturing).

Use stochastic offsets/rotations and macro tint variation for asphalt, concrete aggregate and plaster. Preserve tile/brick courses and construction seams; randomly rotating those structured patterns would contradict the geometry. Sample related PBR maps with the same transform and random seed so roughness, color and relief remain registered.

### Wetness and puddle transitions

Lagarde's game-rendering research distinguishes damp porous material, a thin water film and accumulated puddles. Dampness changes reflectance; a thin film still follows some underlying texture relief, whereas deeper accumulated water approaches a smooth surface normal. His approximation varies these responses continuously under real-time lighting. Adobe's Water Level filter similarly uses material height, water level and a separate wet-edge extent. [Lagarde, Physically based wet surfaces](https://seblagarde.wordpress.com/2013/04/14/water-drop-3b-physically-based-wet-surfaces/), [Adobe Water Level](https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/nodes-reference-for-substance-graphs/node-library/material-filters/effects-material/water-level).

For our system, derive accumulation from shallow depressions and blocked drainage, with a damp halo wider than the water footprint. Keep wall dampness as an absorbed-moisture/runoff effect rather than applying a horizontal puddle profile to it. A puddle needs a coherent level surface and changing reflective response, not a pale opaque polygon. Pooling, stains and moss can share an exposure/retention field without sharing exactly the same boundary.

## Proposed common architecture

The shared system should carry surface context (orientation, meter-scaled coordinates, contacts, construction seams, exposure and drainage), an ordered material stack, and persistent fields for coverage, damage, deposits and wetness. Each field has its own meaning and scale; one global grime parameter should not simultaneously set paint removal, tile breakage, saturation and rubble density.

Material-specific rules then interpret that context: ceramic cracks follow units and create shards; plaster loses connected coats; asphalt sheds aggregate at broken repair edges; concrete spalls along joints; grime accumulates or streaks; water collects and spreads. Wall and floor damage can reuse mask storage, sampling, normal composition, export and filtering while keeping their failure shapes and gravity effects distinct. These are proposed interfaces, not existing AML attributes.

## Export and real-time constraints

Core glTF 2.0 describes PBR material values/textures, tangent-space normals and alpha modes; it does not transport an arbitrary procedural layer shader or POM program. The file can therefore preserve conventional material maps and mesh detail, while a runtime blending system needs a separately defined extension/recipe or a standard-material fallback. [Khronos glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).

Two viable export directions to evaluate before implementation:

- Save the deterministic layer recipe and shared source maps for the LevelSpec viewer; generate conventional color/normal/roughness maps and edge geometry for portable GLB.
- Use finite reusable transition materials and atlas variants that are representable by standard PBR textures, sharing the same geometry in preview and GLB; accept less freedom than a fully procedural shader.

Generating a material mask or compositing intrinsic PBR maps is different from baking illumination. Both can be rendered under moving lights in real time. Nevertheless, the user's no-baking requirement should not be silently reinterpreted: keep the renderer proposal explicit about any offline texture compilation and do not add baked shadows or AO as the realism mechanism.

## Material-specific proposals

| Transition | Proposed damage language | Preserve |
| --- | --- | --- |
| Asphalt to concrete/base | Connected thin broken perimeter, aggregate-sized pits, isolated surviving crumbs, occasional deeper loss and a shallow thickness lip | Broad repair shape and approved asphalt interior |
| Plaster to masonry | Several nested coat losses, sparse attached flakes, uneven undercut lips, rough mortar/substrate exposed at a different depth | Wall plane, openings and plausible layer order |
| Ceramic tile to concrete | Whole missing units, partial angular shards, exposed grout/adhesive bed, chips clustered along damaged frontier | Tile grid/courses and some intact straight grout runs |
| Concrete pour to concrete pour | Clear construction joint with variable spalling/dirt and restrained hue change | Geometric pour boundaries; avoid treating every seam as organic peeling |
| Wall/floor ceramic to substrate | Unit-aware missing tiles, partial shards, adhesive residue, occasional lifting and dirt in remaining grout | Wall gravity and floor pooling differ; intact courses remain aligned |
| Dry to damp to pooled water | Gradual absorbed darkening, wider damp edges, increasingly smooth reflective water in depressions | Distinguish moisture from material removal and keep the underlying material identity |
| Clean to grime/deposit | Thin stains with roughness response, thicker particulate deposits only where retained, directional runoff | Contacts, gravity, drainage and local exposure rather than uniform edge outlines |

These proposals require validation against the real-photo study. They should share infrastructure without sharing one generic noise silhouette.

## Suggested first acceptance scene

Make three neighboring, meter-scaled coupons: asphalt repair, plaster over masonry, and tiled floor meeting concrete. Inspect each at standing distance and close grazing angles under a movable neutral light; also show a flat diagnostic material view. Check continuous silhouettes, registered PBR channels, stable masks during camera movement, filter/mipmap behavior, zero coplanar overlap, and standard GLB appearance. Only after those transitions read convincingly should the system dress the whole courtyard.
