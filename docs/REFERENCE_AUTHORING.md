# Reference-aware architectural authoring

This addition makes image-guided level construction easier to express in code.
It does not infer a scene from an image automatically. A host or author estimates
geometry and the reference camera, then compiles ordinary LevelSpec geometry.
XML runtime validation remains authoritative; the legacy migration gate is retired.

## Start from original evidence

For substantial reference reconstruction, establish reviewed drawings before
dependent production geometry. Inspect the raw originals and user annotations,
then save a source-only feature inventory: visible shapes/openings/levels, view
correspondence, source regions, dimension provenance and unresolved relationships.
Keep observations, user explanations, estimates and inferred construction distinct.
Unknown hidden corridors or stair connections remain unknown; do not complete them
merely to make a plausible building.

For difficult openings, overlapping storeys and junctions, author editable SVG
traces in each original's native pixel coordinates with the unchanged photograph
and separate observed, uncertain and inferred layers. Retain source hashes, stable
path IDs, full-image context and readable crops. Perspective traces are observations,
not measured plans. See [photo contour tracing](../.agents/skills/reference-level-authoring/references/photo-contour-tracing.md).

Draw plans, elevations, sections and enlarged details with CAD-level specificity:
actual supported profiles, opening rims/reveals, surrounding wall material, slab
edges/thicknesses, stairs and landings. Label estimates, section cutting planes,
removed cutaway regions and cross-view correspondences. Generic boxes and labels
cannot replace visible geometry. Independently review the frozen drawings against
originals before dependent XML detail; defer critical unresolved relationships while
continuing independently supported work. The
[schematic workflow](../.agents/skills/reference-level-authoring/references/schematic-workflow.md)
defines this drawing standard and review gate.

Freeze XML/companions, compile them and capture actual renders of that revision.
Fresh-context critics first save source-only observations, then inspect drawings
and model renders and author their own paired original/candidate contours. Fit and
lock cameras using stable distributed landmarks; test held-out openings and slab
edges. Unmatched critical views stay diagnostic and cannot close fidelity acceptance.
Original pixels remain authoritative: a schematic derived from the same wrong
model cannot validate that model. Geometry and navigation checks do not establish
source fidelity. See [paired contour review](../.agents/skills/reference-level-authoring/references/paired-contour-review.md)
and [independent review prompts](../.agents/skills/reference-level-authoring/references/independent-review.md).

The repository includes optional Python/Pillow
[comparison helpers](../.agents/skills/reference-level-authoring/references/comparison-tools.md)
for source-only packets, paginated reference/schematic/render boards and contextual
contour pairs. They preserve native snapshots, crop/framing transforms and SHA256
provenance, refuse to overwrite frozen packets, and require human inspection.
They do not render models, fit cameras or infer hidden construction. Pillow can
run in an isolated environment; no sibling checkout, Blender installation or main
package dependency is required. Keep originals, editable drawings and review
records with the project; place reproducible outputs under ignored `generated/`.

## Build from architectural intent

Import `SceneBuilder` from `levelspec/authoring`, or the local source during
repository development. All lengths are metres; world coordinates are Z-up.
User-named operation and generated object IDs identify their parent group and
operation, and remain stable when dimensions change. Deduplicated vertex and edge
IDs are topology implementation details: they may change when edits cause formerly
shared boundaries to connect or disconnect. Each builder operation generates
ordinary source objects, not an opaque final mesh.

```ts
import { SceneBuilder } from "../src/vector/authoring.ts";
import { compile, serializeLevelSvgx, validateForRuntime } from "../src/vector/index.ts";

const scene = new SceneBuilder("rooftop");
scene.material("concrete", { color: "#aaa99d", roughness: 0.9 });
scene.material("glass", { color: "#263d43", roughness: 0.25 });
const district = scene.group("district", { origin: [0, 0, 0], yaw: 15 });
const building = district.building("main", {
  size: [12, 10, 18], material: "concrete", usage: "roof",
});
building.facade("south", { rows: 6, columns: 4, material: "glass" });
building.roof.cylinder("tank", {
  position: [8, 7, 0], size: [1.5, 1.5, 2],
  material: "concrete", collision: "box",
});
scene.document.markers.push({
  id: "spawn", kind: "attacker_spawn", layer: building.group.layer.id,
  region: "district/main/roof-deck", position: building.roof.world([2, 2, 0]),
});
const level = await compile(scene.document, {
  floorGaps: "error", surfaceContacts: "error",
});
const report = await validateForRuntime(level, { sealed: true });
if (!report.passed) throw new Error(JSON.stringify(report.diagnostics));
const editableSource = serializeLevelSvgx(scene.document);
```

A `roof` building creates a collidable mass ending below a declared playable roof
slab. A `scenery` building is visual-only and creates no playable floor. Façade
windows are surface panels, not carved openings or enterable rooms. Use existing
wall openings for architectural doors and windows that must affect traversal.

`staircase` creates switchback flights and landings. In `playable` mode these are
shared-topology stair regions, with `underside="sloped"` to preserve headroom
between storeys. Existing stairs retain the `filled` underside default. In
`scenery` mode the flights are visual-only props. Optional handrails are visual
geometry, not a promise of player fall protection. Add deliberate physical
barriers where gameplay requires them; do not disable navigation checks.

## Props and imported geometry

SVGX supports root-level `asset` and `prop` declarations:

```xml
<asset id="tank-mesh" src="tank.glb"/>
<prop id="tank" layer="architecture" shape="asset" asset="tank-mesh"
      position="3 4 18" rotation="0 0 30" scale="1 1 1"
      material="metal" collision="box"/>
```

A prop's collision intent is required: `solid` uses the mesh, `none` is
visual-only, and `box` creates an invisible bounds proxy. Primitive shapes are
`box` and `cylinder`; cylinder tessellation is bounded. Primitive origins are at
the bottom centre, with `scale` giving XYZ dimensions. Asset origins and units
come from the host resolver. Rotations are degrees, applied X, then Y, then Z.
Negative or zero scale is rejected.

For an imported asset, pass `resolveAsset(asset, signal)` to `compile`. It must
return finite XYZ positions and indexed triangles in canonical Z-up metres.
The compiler caches each asset within a compilation, validates the supplied
geometry, and applies instance transforms without mutating the resolver's data.
Solid collision needs closed manifold geometry. Visual-only meshes need not be
closed. The bounds proxy needs nonzero extent on all axes.

LevelSpec includes a concrete GLB geometry resolver. The vector CLI resolves
relative `.glb` files beside the SVGX automatically, and the workbench accepts
GLB companion files through **Companions…** or drag-and-drop. The resolver reads
the default glTF scene, applies node transforms, converts standard glTF Y-up
coordinates to LevelSpec Z-up metres, and imports triangle POSITION/index data.
It deliberately does not import source materials, UVs, skins, animations, Draco
compression or external buffers. The prop uses its declared LevelSpec material.
The compiler still never fetches asset URLs itself; custom hosts may continue to
supply their own `resolveAsset` callback.

Physics selection is explicit throughout navigation and line-of-sight checks.
Visual-only vertices are compacted out before navigation, so a distant skyline
does not enlarge Recast's build bounds. Collision proxies are excluded from the
viewer, visual GLB/OBJ output, lightmap atlas receivers and Blender bake geometry.
`collisionMesh(level, sealed)` returns a compact physics mesh;
`toGLB(level, { purpose: "collision" })` exports collision geometry separately,
without requiring or embedding visual textures. It rejects levels with no collision
geometry rather than producing an invalid empty GLB. Runtime data and export
metadata retain the surface visibility/collision flags and identify the surfaces
actually included in each GLB.
Destination engines must consume the separate collision output or those flags;
visual GLB metadata alone does not configure engine physics automatically. BSP2
maps closed visual-only solids to `func_detail_illusionary` and invisible
collision proxies to solid `skip` brushes. A visual-only imported mesh that is
not a closed brush-convertible solid is rejected by BSP export rather than being
silently omitted.

## Record the reference camera and evidence

A root-level `reference` stores an image name, source dimensions, camera and
explicit scale provenance. The image itself is not fetched or embedded.
Coordinates in `landmark.image` and mask polygons are normalized from the top-left
of the referenced image. Match the source crop to the declared image dimensions.

```xml
<reference id="photo" image="rooftop.png" width="1500" height="1000"
           position="0 -20 18" target="0 10 18" up="0 0 1" fov="55"
           near="0.05" far="2000" scale="assumed"
           scale-note="Storey heights estimated at 3 metres; no survey available.">
  <landmark id="roof-corner" position="0 10 18" image="0.5 0.5"/>
  <mask id="foreground-person" points="0.6 0.3; 0.9 0.3; 0.9 1; 0.6 1"/>
</reference>
```

`projectReference` projects a world point into that camera.
`compareReference` measures the supplied landmark reprojection error in source
pixels, excluding masked observations and separately reporting clipped points.
Its RMS is `null` when there are no comparable observations, not zero.
These numbers measure landmark alignment, not photographic similarity, camera
calibration quality, or overall reconstruction accuracy. `referenceViewport`
computes a shared letterbox for a renderer and reference overlay.

The current reviewer shows supplied reference images under **References**. To
inspect from a recorded or estimated camera, choose **Perspective**, open
**Camera / Z-up meters**, and enter the position, target and field of view. **Open
this view** produces a URL for the actual overview pose and framing; use the same
source and viewport aspect when comparing revisions. The CLI accepts the same
values, for example:

```sh
npm run --silent levelspec -- preview projects/dai2-daiban/level.level.svgx \
  --camera "1.2 1.8 3" --target "3.4 4.9 5.2" --projection perspective --fov 82
```

The viewport dimensions show the compiled selected object or visible layout's
XYZ extents, not measured passage clearance. See [review controls](WEBSITE.md).
The reviewer does not calibrate a reference photograph or perform the API's
landmark comparison automatically.

The [Dai-2 Daiban courtyard study](../projects/dai2-daiban/BRIEF.md) is a real-photo
authoring example with retained originals, estimated plans/sections, editable XML,
local analytical aperture geometry, route checks and independent critique. Its
unmeasured dimensions and provisional hidden connections are recorded explicitly.

## Verification and visual acceptance

The focused regression suite is `node --test tests/vector-reference.test.ts`.
It covers source round trips, camera projection agreement with Three.js, mask and
clipping accounting, collision selection, GLB parsing/resolution, stable assembly
IDs, navigable multi-storey stairs, and rejection of disconnected playable floors.
`tests/vector-glb-cli.test.ts` exercises real relative-file GLB resolution through
the CLI.

`examples/rooftop-reference.level.svgx` is the checked-in end-to-end reference
fixture. It has three saved 640×400 cameras and exact projected landmarks.
`tests/vector-reference-acceptance.test.ts` recompiles that source, validates
runtime navigation, software-renders the actual final visible triangle mesh with
a z-buffer and flat material colors, and pixel-compares all three views against
the original synthetic goldens in `reference/rooftop/`. Regenerate those assets
only intentionally with `node tools/vector-rooftop-reference.ts`.

Run `npm run check`, `npm test` and `npm run build:viewer` before release.
These gates establish deterministic geometry/camera agreement for the synthetic
fixture; they do not claim automatic photograph reconstruction or photorealism.
