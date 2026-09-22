# Reference-aware architectural authoring (preview)

This addition makes image-guided level construction easier to express in code.
It does not infer a scene from an image automatically. A host or author estimates
geometry and the reference camera, then compiles ordinary LevelSpec geometry.
The existing LevelSpec 2 migration and runtime acceptance gates remain in force.

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

The workbench exposes saved references directly in the Perspective view. Choose a
reference, use **Use camera** to reproduce its authored perspective, and enable
**Overlay** after selecting the companion image to letterbox the render and image
to the same viewport. Overlay mode locks orbit/fly controls so the pixels remain
registered; disabling it restores inspection controls. The camera button reports
the current landmark RMS in its tooltip. Open the checked-in acceptance fixture
with `npm run dev -- --open '?map=rooftop'` or navigate to
`/?map=rooftop`.

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
