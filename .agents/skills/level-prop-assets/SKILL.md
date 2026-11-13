---
name: level-prop-assets
description: Choose procedural, AI-generated, or hybrid dressing assets for LevelSpec and run small visual comparisons before adoption. Use for prop art such as laundry, plants, food, and shop goods, not map layout or gameplay geometry.
---

# Level prop assets

Choose the method by the asset's constraints. This is an optional art workflow;
ordinary AML compilation must not require an AI service or paid generation.

| Asset constraint | Preferred starting point |
| --- | --- |
| Exact dimensions, modular joins, host fitting, repeated construction | Code or scripted Blender geometry |
| Walls, building masses, routed pipes, frames, doors | Procedural geometry with authored materials |
| AC housings, grilles, fans and other moving mechanisms | Procedural parts with explicit pivots; keep rotating fan blades separate |
| Irregular cloth folds, plants, produce, crumpled packaging | Concept image followed by an AI mesh candidate |
| Regular container with irregular contents or surface wear | Hybrid: procedural container and placement, generated contents or material art |
| Simple cylindrical tins, jars and bottles | Authored profiles with clean wrap UVs and generated flat label artwork |
| Simple organic solids, such as one egg | Model the inexpensive oval/lathed shape directly; organic does not automatically mean AI |
| Lights, fan blades, circular housings, repeated mechanical parts | Script consistent geometry, or repair and symmetrize generated parts before adoption |

These are starting points, not universal exclusions. A simple apple can be
procedural; a jar often benefits more from good textures than a generated mesh.
Use the comparison to decide. Do not infer production suitability from concept art.

## Hybrid parts and materials

Choose a method per component, not just per object. A generated mesh is an editable
source: split the useful shell, trim malformed or hidden geometry, replace regular
parts, and keep useful texture islands. Separate glass, metal, labels, and contents
when they need different surface response. Preserve or repack color, normal, and
roughness/metalness maps together; do not replace textured detail with one generic
rough material. Verify UVs and normals after decimation or mesh surgery.

For regular containers, a clean profile can preserve shape and print better than
decimating a generated mesh. Use a continuous body chart with a rear seam, upright
labels and separate planar cap islands. Generate flat label art at the intended
texel density, then align all material channels and variant gutters. Smooth side
normals around the circumference; keep top/bottom faces flat and deliberate rims
sharp. Spend extra profile rings on visible shoulder curves, blending their
normals into the body and neck. Review silhouettes and shading separately: smooth
normals cannot round an angular outline.

For a fridge, prefer an empty generated cabinet, then add fitted shelves and place
reusable bottle/can meshes procedurally. Fusing the entire stocked fridge can waste
polygons and bake incorrect gaps, shelves, or stock into the cabinet. Likewise, an
AI basket with simple modeled eggs can be more reliable than generating every egg.
Check that containers have an actual cavity: remove generated caps or fused
contents, and place added goods on the interior floor below the enclosing rim.
Verify contact and containment from side and elevated views, not just the front.
For fans and lights, check circularity, blade count and spacing, sockets, supports,
and moving-part pivots; rebuild inconsistent pieces instead of repeatedly rerolling.
Reserve the full swept blade volume against ducts and shelving, not only one
static pose. Fit supports and clearances from actual rotated mesh bounds: stacking
pitch follows the receiving lid/top, and a wall shelf needs a credible connection.

For a store intended as the example for other stores, inspect real shop photographs
and save sources plus concise observations. Study product groupings, uneven front
edges, partial stock, stacked containers, and credible suspension. Seed variation
around these practical arrangements: keep stacks grounded, shelves within capacity,
and clips touching actual seams. Do not scatter everything uniformly at random.

Match the reference's density as well as its prop types. A packed provisions
store needs tight product groups, short gaps, supported stacks and closely placed
fixtures; irregularity does not mean sparse shelves. Study relationships such as
produce on stools, stock beneath carts, and boxes or crates carrying planks and
another shelf. Reuse these as complete grounded arrangements, varying their
height, contents and small rotations while keeping the support chain intact.
Check the whole frontage against the photo, then inspect tray contents and feet
from elevated and side views. Preserve fruit proportions when fitting a wider
display: use more groups or mixed goods rather than stretching one pile sideways.

For closely packed soft props, vary individual size, facing and printed labels
within small groups. Overlap their intended footprints, then compress only the
contact-side vertices into shared separating surfaces. Preserve grounded bases,
UVs and the rest of each silhouette; rebuild affected normals and check for
collapsed faces at export precision. A thin compression band can avoid degenerate
triangles. Inspect actual surface gaps, crossings and the rendered contact under
mirrored placement. Do not substitute exaggerated whole-body lean for close packing;
local deformation still needs visual acceptance.

Vary the store arrangement as well as individual products. Choose a few coherent
fixture families, such as front, side, or recessed counters, then place shelves,
coolers and bulk displays around them. Left/right reflection adds variety but
should not be the only difference. Reserve full occupied volumes, including
stock and overhead fittings; keep fixture selection independent of stocking and
detail seeds. Reuse approved assets before generating more models.

## Small pilot

For a coordinated dressing pass, first make a scene concept from the current
render and the real references. Use it to establish product sizes, packing density,
support relationships and packaging palettes before changing many assets. Keep
the exact prompt and references, then compare real renders from a similar camera.
Treat the concept as a target, not evidence that the implementation achieved it.

For material direction, an ImageGen style study of the actual scene can reveal
missing wear, stain variation and roughness differences. Compare it with a good
generated prop and real references, then derive flat, unlit texture fields rather
than projecting the concept's lighting onto the mesh. Apply procedural wear where
use explains it: handled edges, joints, lower dirt and occasional repairs. Align
grain with each board and use a compact shared bank of seeded PBR variants;
preserve stock placement randomness and avoid broad, equally strong damage on
every surface. Review at the intended viewing distance before adopting.

Vary both silhouettes and printed artwork: small bottles, several can/jar sizes,
bags and shelf boxes read differently even when they share a few source meshes.
Whole-object tinting can turn rice, metal or glass the wrong color; isolate labels
and appropriate material regions. Reuse atlas variants with matching UV transforms
for all PBR channels, padded borders and sampled fallback colors. For crowded
stores, fill visible shelf width and stack height before adding hidden inventory;
use inexpensive boxes and reduced repeated goods to stay within the scene budget.

Identify the existing generator, materials, target size, support/attachment points,
expected instance count and nearest useful viewing distance. Preserve a baseline
before replacement. Keep ropes, clothespins, shelves and spatial arrangement
procedural when they must connect to the level. Garments need empty cloth volume,
credible folds and plausible suspension, not a body-shaped solid.

Generate one isolated concept per reusable prop with an image-generation tool.
Use neutral light, a clear silhouette and no scene furniture. Save the exact
prompt and image inside the project; record provenance and hashes. Exact lettering
should use an authored decal if the image-to-mesh step cannot preserve it.

For Tripo, use the available `tripo-3d` and `tripo-game-asset` plugin skills for
current installation, authentication, dry runs, credit authorization and commands.
Another provider can be used when requested or available; do not silently switch
providers. Record the actual model/version, parameters, task IDs and billed cost.
Do not copy current provider prices or model versions into this skill.

Pick a triangle and texture budget for the intended screen size and repetition.
A few hundred triangles can be sufficient for small produce; cloth may justify
a few thousand. These are starting estimates, not blanket limits. Measure the
result's actual triangles, materials, texture dimensions and file size. Repeated
props need shared geometry/textures or instancing, not a separate texture per item.

## Transfer an approved store to another trade

Reuse the approved material library, clean stock meshes, support assemblies and
review lighting; preserve the next trade's work pattern and characteristic goods.
A packed food shop still needs an exposed chopping/serving surface. Study density
per functional zone rather than covering every surface with merchandise. Carry
forward fixture variation and coherent support chains, not an identical floor plan.
Keep asset-specific lessons in the owning project and generalized choices here.

Optimize after the material and silhouette read correctly. Budget the complete
populated scene, including repeated stock and its enclosure, rather than only one
source prop. A shared pile or tray can be cheaper than many individually modeled
items; retain separate objects when assembly, variation or interaction benefits.
Do not expect a lower generation face target to repair UVs. Diagnose stretched
charts, lost maps, baked lighting and roughness separately; clean simple geometry
and authored UVs often preserve labels better than another mesh generation.

Use restrained contact AO in the review scene to judge grounding and dense stock,
with an on/off comparison sharing the same exposure and output pipeline. Check
small labels, white crockery and shelf corners for blackening or screen-space
halos. AO does not fix gaps, intersections or missing cavities, and a viewer effect
is not baked into exported assets. Save an actual whole-store render and detail
views; keep the source hashes, measured budget and renderer settings with evidence.

## Compare before adoption

Load the old and new meshes with their real materials. Match camera, lighting,
exposure, background and intended physical scale; include ordinary viewing distance
as well as close front, side and rear inspections. Do not individually stretch
axes or frame away a bad silhouette. Record uniform scaling and axis conversion.
GLB is Y-up; LevelSpec domain coordinates are meters and right-handed Z-up.

Check attachments, underside/back completion, thin cloth, holes, normals and UVs;
inspect actual texture presence and surface response. Generated glass appearance
may be opaque painted detail, and highlights/shadows may be baked into albedo.
Assess those limitations under changed light. UV-seam vertices can fragment during
reduction; weld coincident geometry without losing UV islands, then inspect the
actual result. If reduction still tears the shape or print, use a clean replacement
mesh and bake the useful source texture onto it. Rigid lattices need straight rails,
clear openings and dividers fitted to their contents. Measure the resulting budget,
rather than treating the requested decimation target as the actual count.
Judge each prop separately and keep
the baseline when the candidate does not improve the intended view.

Place promising candidates in a small repeatable context using procedural supports.
This is visual evidence, not collision, navigation or gameplay validation. Keep
render dressing separate from physical geometry; preserve existing physical hashes
when a production integration touches compiled levels.

Save generated models and disposable captures under ignored `generated/`. Retain
concepts, prompts, reproducible tooling, and review findings in the user project.
Use an explicit asset manifest for adopted assets and wire them into the requested
consumer; a local comparison alone is not a production replacement.

## Repository starting points

- Current dressing contract: [DRESSING.md](../../../docs/DRESSING.md).
- Kowloon garments: `src/dressing/kowloon/laundry.ts`; procedural supports live in
  `src/dressing/spans/` and the building kit.
- Shop produce, packets and jars: `src/dressing/kowloon/shop/goods.ts`.
- Approved restaurant transfer, shared food/kitchen materials and review evidence:
  `projects/kowloon-restaurant-props/`.
- Initial pilot and evidence: `projects/kowloon-asset-pilot/`.

Use the repository TypeScript and test skills when implementing code changes.
Only invoke map or gameplay workflows if the requested change affects their scope.
