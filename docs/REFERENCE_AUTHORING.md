# Reference-aware architectural authoring

This addition makes image-guided level construction easier to express in code.
It does not infer a scene from an image automatically. A host or author estimates
geometry and the reference camera, then compiles ordinary LevelSpec geometry.
XML runtime validation remains authoritative; the legacy migration gate is retired.

## Choose the workflow

Use [level-authoring](../.agents/skills/level-authoring/SKILL.md) for both invented
and reference-based maps: coherent layout, physical topology, circulation and
common-sense review. Invented maps need no photographs or reconstruction runner.
Add [reference-level-authoring](../.agents/skills/reference-level-authoring/SKILL.md)
when images constrain the design.

Inspect originals before candidate interpretations. Record important structures,
view correspondence and consequential unknowns; distinguish observations, user
explanations and dimensional estimates. Do not invent hidden connections unless
the brief authorizes them. Cross-check major layout and depth against relevant
angles instead of optimizing a single photograph.

Use [native-pixel traces](../.agents/skills/reference-level-authoring/references/photo-contour-tracing.md)
for ambiguous edges, [plans/sections](../.agents/skills/reference-level-authoring/references/schematic-workflow.md)
for complex stacked relationships, and
[paired contours](../.agents/skills/reference-level-authoring/references/paired-contour-review.md)
for consequential alignment disputes. These are targeted aids, not universal gates
before every trial. Model-derived drawings explain geometry but do not independently
verify its source interpretation.

An ordinary map uses one independent topology/circulation reviewer; reference-based
reconstruction adds fidelity review. Escalate to specialists for complex work and
honor stronger user-requested requirements. Review actual compiled views and claimed
routes, repair major issues, then recheck affected interfaces. A score or screenshot
does not prove physical reachability or source fidelity.

Optional Python/Pillow [comparison helpers](../.agents/skills/reference-level-authoring/references/comparison-tools.md)
compose source packets and reference/render boards with native snapshots and
provenance. They do not calibrate cameras, infer construction or approve maps.
Keep originals, editable source and review records with the project; reproducible
outputs belong under ignored `generated/`.

## Build from architectural intent

Use `ArchitectureBuilder` from `levelspec`, or write AML XML directly. All lengths
are meters; domain coordinates are right-handed Z-up. Named paths, profiles,
datums, assemblies, and instances remain editable source objects. See [AML](AML.md)
for walls, hosted apertures, profiles, stairs, and explicit side enclosures.

```ts
import { ArchitectureBuilder, compile, serializeAml } from 'levelspec';
const scene = new ArchitectureBuilder('roof');
scene.profile('deck-plan', [[0,0,8],[12,0,8],[12,10,8],[0,10,8]]);
scene.slab('deck', 'deck-plan', { thickness: .2 });
const level = await compile(scene.document);
const editableSource = serializeAml(scene.document);
```

Assemblies compose intentional architectural intersections. Groups organize objects.
Authored stair walking tops and undersides remain independent; side enclosures are
opt-in and leave entrances open. A semantic connection cannot replace support.

## Imported visualization assets and physical outputs

```xml
<visual-mesh id="tank-art" src="tank.glb" position="3 4 18"/>
<box id="tank-proxy" position="3 4 18" width="2" depth="2" height="3"
     visible="false"/>
```

Imported meshes support placement, materials, and rendering. Only loading/data
safety is validated. They never enter architectural overlap, topology, collision,
navigation, or checked CSG. Author a native proxy for physical behavior. The host
supplies `resolveAsset`; the compiler never fetches URLs itself. The provided GLB
resolver applies scene/node transforms and converts glTF Y-up to Z-up meters.

Render visibility and collision are independent. `collisionMesh(level, sealed)`
returns compact physics geometry; `toGLB(level, { purpose: 'collision' })` exports it
separately. Destination engines must consume that geometry or the exported flags.
Native closed visual-only solids can become BSP illusionary brushes; hidden native
collision solids use `skip`. Imported visualization meshes cannot become checked
BSP brush operands; use another visual export or replace them with native solids.

## Record the reference camera and evidence

A root-level `reference` stores an image name, source dimensions, camera and
explicit scale provenance. The image itself is not fetched or embedded.
Coordinates in `landmark.image` and mask polygons are normalized from the top-left
of the referenced image. Match the source crop to the declared image dimensions.

Calibrated camera position, target, up vector and lens values preserve JavaScript
number precision through XML parsing, saving and compilation. Camera position and
target must remain finite and within the supported coordinate range. Authored
geometry and landmark world positions still use the millimeter lattice; saving
a camera does not quantize its viewing direction. FOV is vertical degrees, and
world coordinates are meters in the right-handed Z-up frame.

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
npm run --silent levelspec -- preview projects/my-level/level.aml \
  --camera "1.2 1.8 3" --target "3.4 4.9 5.2" --projection perspective --fov 82
```

The viewport dimensions show the compiled selected object or visible layout's
XYZ extents, not measured passage clearance. See [review controls](WEBSITE.md).
The reviewer does not calibrate a reference photograph or perform the API's
landmark comparison automatically.

## Verification and visual acceptance

The focused regression suite is `node --test tests/vector-reference.test.ts`.
It covers source round trips, camera projection agreement with Three.js, mask and
clipping accounting, collision selection, GLB parsing/resolution, stable assembly
IDs, navigable multi-storey stairs, and rejection of disconnected playable floors.
`tests/vector-glb-cli.test.ts` exercises real relative-file GLB resolution through
the CLI.

`examples/rooftop-reference.aml` is the checked-in end-to-end reference
fixture. It has three saved 640×400 cameras and exact projected landmarks.
`tests/vector-reference-acceptance.test.ts` recompiles that source, validates
runtime navigation, software-renders the actual final visible triangle mesh with
a z-buffer and flat material colors, and pixel-compares all three views against
the original synthetic goldens in `reference/rooftop/`. Frozen reference images remain unchanged. `npm run reference:rooftop -- generated/rooftop-new-run`
writes fresh compiler captures into a separate output directory.

Run `npm run check`, `npm test` and `npm run build:viewer` before release.
These gates establish deterministic geometry/camera agreement for the synthetic
fixture; they do not claim automatic photograph reconstruction or photorealism.
