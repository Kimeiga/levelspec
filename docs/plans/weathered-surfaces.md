# Procedural wall and floor weathering overhaul

> Implementation revision, 2026-11-11: close-up visual review rejected the local
> world-atlas approach below. Resampling sharp source materials into sparse
> lower-resolution patches exposed rectangular sharpness changes, while matching
> source detail across the demo required excessive unique texture memory.
> Production now uses adaptive material-region geometry from the same continuous
> fields, retaining original tiled color/normal/MR maps and UVs. Receiver vertex
> colors carry diffuse deposits; finish depth supplies actual rims. Only authored
> height companions generate shared tileable normal images. This supersedes the
> original atlas allocation, raster-gradient, and per-meter chart-density design.
> Immutable physical geometry, complete publication, source hashing, portable
> GLB, cancellation, and independent visual/test gates remain in force.

Status: implementation in progress, 2026-11-11. The revision above records the
source-preserving architecture selected after close-up review. The user has
also removed moss from the scope and procedural authoring controls.

Inputs: [photograph study and current-code audit](../research/weathered-surface-overhaul.md), [primary rendering references](../research/weathered-material-techniques-notes.md), and the user's screenshot of polygonal plaster loss, asphalt margins and pale ground islands.

## Outcome and scope

Replace the current fragmented surface treatments with a coherent system that represents construction, material layers, damage and deposits. Cover plain walls, generated building skins, tiled walls and floors, concrete pours and repairs, asphalt, timber patches, contact grime, runoff, paper residue, dampness and puddles. Moss was removed at the user's request; it is not a release requirement. Update shared roof/deck callers where necessary without giving roofing felt an asphalt fracture pattern.

Keep the approved asphalt color/normal pair and its physical scale. Keep AML-derived finish regions, concrete construction anchors, wall openings, tile courses and existing useful fracture contours. Building massing, shop generation, prop layouts, stairs, ramps, collision, navigation and lighting design are outside this change. Do not extend the patched-ground recipe onto stairs or ramps; existing callers must still behave correctly.

Success means the boundaries and exposed layers read convincingly at standing distance and close grazing angles, with the same material behavior in the reviewer and the downloadable model. The small material study below validates the system; completing only those examples does not complete the overhaul.

## Architecture decisions

### Standard PBR maps and selective geometry

Use a shared CPU surface compiler. Retain the original tileable color, tangent-normal and packed metallic/roughness maps, authored factors and affine UVs. Adaptive material regions partition each opaque receiver into disjoint source-material triangles. Continuous receiver vertex colors carry intrinsic grime and finish variation; finite geometry carries coating depth. All participating wall and ground receivers use the same fields, including intact interiors, so chart boundaries do not introduce a different shading or displacement path. Here, a chart is an internal sampling plan, not an image atlas allocation.

These maps contain intrinsic material properties, not rendered illumination. Lights, shadows and reflections remain real time. Do not add lightmaps, baked AO, directional shadows painted into color, a preview-only blend shader, POM or a general shader graph in this implementation. This deliberately avoids a renderer-specific appearance that cannot survive ordinary GLB export.

Use source normal maps for grain and adaptive continuous contours for chips. Real geometry supplies visible coating thickness, fractured tile sidewalls and recessed beds. Thin stains change receiving material properties; they do not receive an artificial raised lip. Only authored height companions create shared derived normal images, retaining the finer of the source height and existing normal resolutions. No source color image is resampled into a world-space patch.

### One completed native compile result

`compile()` is already asynchronous. Preserve `applyDressing()` as a synchronous construction/planning stage, then await a new `compileSurfaceAppearance()` stage immediately after it and before `meshParts()` and `finalizeArchitecture()`.

- Dressing emits internal, deterministic surface plans containing host/source identity, local frame, receiving domain, construction boundaries, layer stack, material references and condition fields.
- Add host-owned `resolveMaterialImage(reference, signal)` loading to architecture compile options. Read only the companions needed by material compilation. The compiler performs bounded decoding and never fetches URLs or opens files itself.
- The appearance stage returns detached render mesh/material changes, generated images and a compact appearance manifest. It never mutates the source document, physical mesh or navigation inputs.
- A successful native compile contains the finished appearance. `onGeometry` retains its completed-geometry meaning. Missing/invalid required images produce source-linked errors; they do not silently become blank materials.
- The current manifest records its version, actual source-content hashes, generated image hashes, receiver count, derived texels and encoded bytes. Include it and the compiled render result in render identity. Physical identity excludes these appearance-only inputs.
- Synchronous GLB/glTF writers consume completed geometry and bytes; they do not run a second material generator.

Check dressing-plan errors before image decoding, and appearance-stage errors before render finalization, navigation or publication. A failed appearance result must not reach `onGeometry`, become the ready preview or replace a valid export. Preserve source-linked diagnostics and support a successful subsequent build.

Add a bounded `generatedImages` record to the compiled result, with content-addressed references. Extend `resolveExportAssets()` to resolve these before invoking the authored-companion reader. Keep generated bytes out of runtime/preset JSON: worker messages preserve typed-array bytes through structured cloning, and demo/CLI packages write image files plus a manifest. Update all snapshot builders explicitly rather than allowing `JSON.stringify(level)` to expand typed arrays.

The source, resolved image-byte snapshot, generated maps, mesh and manifest belong to one compile request. The reviewer stages each replacement mesh/material/image revision together, waits for decoded image readiness and rechecks revision freshness after asynchronous preparation. GPU texture upload occurs on the committed render; there is no separate precommit upload gate. Keep the active scene and its URLs until the replacement is ready; on failure retain the active scene. Dispose only resources owned by the rejected or superseded revision. Later navigation-only progress messages reuse the accepted appearance payload. `review/demo.ts` must load the generated-image manifest as well as authored companion URLs; `viewer/export.ts` and `src/cli/pipeline.ts` must supply the same material-image loader as `review/worker.ts`.

### Material and AML contract

Extend the existing material contract through parser, serializer, native validation, schema, companion discovery and export together:

- A linear packed metallic/roughness texture, with the standard green roughness / blue metallic convention and documented scalar-factor multiplication.
- A linear height input for appearance compilation, with explicit height range/offset in meters and a documented sampled channel. Height is a generation input, not an unsupported glTF displacement promise.
- An explicit generated-water transparency binding shared by preview and GLB; avoid identifying these puddles through material-name heuristics. Preserve existing cutout behavior.

Keep layer-stack definitions as typed theme recipes initially, bound to the existing declared material references. Do not introduce an arbitrary XML layer/shader language before the concrete recipes work. The new material slots and current dressing controls provide the first authoring surface; document their semantics in `docs/DRESSING.md` and `docs/AML.md`.

`wear` controls physical loss/fracture; `grime` controls deposits. Keep wetness, repairs, litter and quality independent. Distinct seeded streams prevent changing grime from relocating cracks. Stable moisture/exposure potential can bias old damage, while changing current wetness does not regenerate its topology. Quality changes representation cost, not construction placement or major damage locations. Retain these as supported controls, not old/new compatibility modes. Moss authoring controls and generated growth have been removed.

### Surface and geometry ownership

Use stable surface coordinates in meters, with correct orientation under yaw/reflection and around curved wall runs. Preserve authored finish boundaries, openings, holes and real contact extents. Thin representation differences must not introduce a new seam at every generated chart or mesh triangle.

Keep source normal vectors in their original UV tangent frame and generate UV0 tangents for the final mesh. Authored height-derived normals account for the actual affine UV metric and compose source normal strength once. Rotate incoming source smoothing by the final triangle's recipe-relief normal change; do not interpolate an analytic rim gradient across a broad flat plate. For this normal-only calculation, freeze source UV at the triangle centroid so coverage-driven height changes remain visible without counting source microheight slopes twice. Preserve the existing single glTF V conversion. Apply intrinsic receiver tint once; do not reuse the lightmap UV channel.

For a finite-thickness loss, partition the opaque receiver into surviving finish and exposed bed, then connect their levels with side faces. Allocate relief within a documented decorative envelope; do not open new physical holes or exceed established clearances. Floor relief remains governed by the authored visual-relief limit. Connect chart borders, fracture rims and neighboring geometry without gaps/T-junction cracks.

Plaster charts declare constant layer elevations: the coat stays at the receiving
plane and its exposed backing is 6 mm lower. Fine damage still controls the exact
material contour; it no longer perturbs a broad continuous relief shoulder.
Each plate retains its own source height input, UVs and normal texture. Real
side faces join unequal plate elevations, using the backing material with its
affine UV field folded across the edge. Ground retains its continuous uneven
native bed. Concrete/asphalt finishes use thin selected plates: asphalt is
3.5 mm above that bed, joints/cracks are 1.5 mm below it, spalls are 4 mm below,
and surviving chips sit 1.5 mm above the spall bed. A plate-weight field tapers
their thickness over the existing 25 mm native perimeter and service-opening
band; it is independent of authored source-height weighting. The total visual
envelope still clamps all elevation. Tile/timber retain their continuous bevels.
Water reserves a conservative maximum possible positive finish height across
each affine receiving piece; only proven common material ownership can reduce
that reserve. Sampling the vertices alone cannot exclude an interior raised
asphalt island. These finite-ground changes are under final physical and visual
validation, and do not establish full-demo acceptance.
Shared source edges also close recessed concave wall corners. Joins require
opposite edge directions and common source ownership; open silhouettes,
unrelated objects and ambiguous edges with more than two owners are not welded.
Already covered caps and internal convex-recess wedges receive no duplicate faces.

Standing water is a separate transparent interface above its retained solid bed, with coherent level, depth-aware wetting and a refined shoreline. Require one opaque solid receiver; legitimate water-over-solid layering is not an opaque-overlap error. Use standard PBR transparency/reflection for the first release and document its refraction limitations. Screen-space refraction, fluid simulation and custom water shaders are deferred.

## Work packages and gates

| Order | Work and principal files | Completion gate |
| --- | --- | --- |
| 0. Freeze baseline | Maintain the procedural study builder in `tools/weathering-study.ts`, using actual production recipes and approved source assets. Its artifacts go under ignored `generated/weathering-study/`; retain photo/source notes outside `generated/`. Capture the courtyard, approved asphalt and study, including deck/felt consumers. | Source/assets/camera/light hashes saved; compile/render/memory baseline recorded; independent review of proposed test contracts before production edits. The study is not an AML-only fixture. |
| 1. Material channels and asset lifecycle | `src/vector/types.ts`, `materials.ts`, `export-assets.ts`, `export.ts`; `src/architecture/types.ts`, `format.ts`, `assets.ts`, `compiler.ts`, `finalize.ts`; `schema/aml.xsd`; `review/scene.ts`, `worker.ts`, `app.ts`; CLI/native/demo/export adapters. | A small analytic material compiles with generated maps, displays correctly, survives GLB/glTF round-trip and handles cancellation/error recovery. No realistic damage migration yet. |
| 2. Shared surface compiler | Add focused modules under `src/dressing/surface/` for plans, adaptive material regions, shared-edge conformance, source-height normals and bounded image ownership. Adapt `apply.ts`, existing `finish/` fields and contact/ground-context providers. | Same field drives material and actual edge depth. Source UVs and maps remain intact; receiver boundaries have no gaps or shading rectangles. Independent input triangulations preserve sampled appearance within declared tolerances. |
| 3. Continuous finishes | Integrate `kowloon/skin.ts`, `wall-finish.ts`, `ground.ts`, `ground-surface.ts`, ground layout/context and affected deck callers. Remove the superseded `ground-asphalt.ts` emitter. Reuse approved PBR companions and add matched inputs only where needed. | Plaster loss, asphalt repair and spalled concrete joint pass visual/motion and depth tests; broad pours and approved asphalt interior remain intact. |
| 4. Unit materials | Integrate `wall-tiles.ts`, `wall-geometry.ts`, floor tile/timber sections and felt callers. Share unit-aware fracture concepts where contracts truly match. | Wall/floor tile fronts connect to their bodies, with adhesive remnants, intact grout and credible shards. Timber/felt use directional splinter/tear behavior. |
| 5. Deposits and moisture | Integrate `weather.ts`, `finish/wall-condition.ts`, `kowloon/fixtures.ts`, `walls.ts`, ground crack/puddle paths; remove moss. | Stains follow receiving surfaces; grime, missing solids and water are distinguishable; no generic polygon stamps or floating stain planes remain in migrated effects. |
| 6. Courtyard rollout and removal | Update `projects/dressing-demo`, `tools/build-dressing-demo.ts`, viewer/download packaging, documentation and targeted tests. Remove replaced polygon/stain emitters after their callers migrate. | All recipes render through the new system, full preview/package agree, physical invariants pass, independent appearance and implementation reviews resolve material findings. |

Each package is a cohesive change with its own focused validation. Do not leave a permanent legacy-weathering toggle or two render paths. Coordinate edits to building skin/fixture adapters with the building agent; do not fold unrelated building work into this overhaul.

## Recipe requirements

| Recipe | Required behavior |
| --- | --- |
| Paint/plaster | Ordered coat/backing/substrate; connected broad losses with smaller remnants and local crumbling. Paint-only removal is thinner than render loss. Add visible rims where thickness warrants them. |
| Asphalt | Correlated aggregate-scale breakup, irregularly spaced larger notches, occasional surviving crumbs and shallow edge thickness. Preserve long intact stretches; no uniform sawtooth rule. Keep approved interior maps unchanged. |
| Concrete | Retain geometric pour joints and broad hue differences. Distinguish hairline cracking, joint spalling, shallow scaling and broken corners; concentrated damage need not trace the whole joint. |
| Ceramic | Preserve tile units and courses. Use continuous plaster-like erosion across courses, occasional whole-unit loss and small independent edge chips. Heavily lost tiles usually detach; retained remnants must remain credible, not thin needles. Preserve textured fronts, real body sidewalls and a common exposed backing, without a raised adhesive ring around each tile. |
| Timber/felt | Follow grain/plank direction or sheet construction. Local worn coatings, splintered ends or lifted tears; no plaster/asphalt mask substituted just because infrastructure is shared. |
| Grime/runoff/residue | Shared receiving-material response in color and roughness; gravity/contact-led placement with fine breakup. Geometry only for actual accumulated thickness or physical paper curls. |
| Water | Absorbed damp halo, thin film and pooled surface have distinct responses. Pooling follows relief and a common level; the bed remains visible where appropriate. |

## Asset creation and quality budgets

Inventory reusable material roles first. Produce coherent color/normal/roughness/height sets with physical sample sizes, channel conventions, height ranges, provenance and hashes. Image generation can supply natural material samples; channel registration must be checked. Do not blindly convert bright color flecks into height or generate unrelated maps for one material. New matched height/roughness inputs must preserve the approved asphalt's appearance.

Preserve source texture resolution and physical UV scale. Shared derived height-normal images use source-space resolution; no per-meter atlas density, gutter or atlas packing applies to the current surface compiler. Construction hints seed known grout/bevel lines before adaptive sampling, while continuous fields remain authoritative for material ownership and actual height.

Current derived-image texel defaults are:

| Detail | Shared derived normal texels |
| --- | ---: |
| Low | 2 Mi texels |
| Medium | 4 Mi texels |
| High | 8 Mi texels |

These are incremental derived-image limits, not total texture/GPU memory. Current limits also bound image bytes, decoded source bytes, receiver count, height variants, field sampling/subdivision work and final triangles. Measure source images, geometry, cache residency and working copies separately. Exceeding a resource limit fails with source/host context; the compiler must not silently remove requested damage or weaken contour and height tolerances.

Derived normals are shared within a compile by their actual source inputs and UV metric. Reread current source bytes and record their hashes; a filename is not a content identity. Field caches have bounded lifetimes. Cross-build geometry/appearance caching is not a delivered capability. Changes to unrelated hosts/assets must not shuffle existing damage. Region generation yields cooperatively during bounded work so cancellation can arrive; discard staged material/geometry changes on failure.

The historical atlas proposal allocated three RGBA8 world-space maps at 512–1024 texels/m, with mip gutters and a 2/4/8 Mi-texel chart budget. Close-up review rejected it because low-density rectangular patches blurred sharp source grain, while matching source resolution across the level exceeded practical memory. That design is retained here only as decision history, not as a supported mode or a pending implementation target.

Performance acceptance measures the same device/browser, viewport, camera path and lights before/after: cold and warm generation, cancellation latency, decoded/GPU bytes, triangle count, draw calls and median/p95 frame time. Set the rollout thresholds from that baseline in package 0; do not claim scalability from the small study alone. Include the full demo and a long wall/large floor stress fixture.

## Verification plan

Keep existing public behavior coverage in `aml-ground-dressing`, `aml-wall-dressing`, `aml-building-dressing`, `aml-normal-material`, schema/export and preview suites. Focused new coverage lives in `surface-materials`, `surface-construction-cuts`, `surface-kit-plans`, `surface-tile-union`, `surface-tile-policy` and `aml-material-channels`; real browser checks use the maintained appearance/material and live-preview suites.

1. **Analytic material cases:** known coverage step, constant-height layers, a known recess and directional normals. Derive expected layer, roughness, depth and normal orientation independently. Check source bytes/factors/UV preservation, linear height data, affine height-normal metrics, plate/rim shading, shared-edge continuity, construction-hint equivalence and bounded work. Keep recipe-height interpolation and material-contour tolerances distinct from source image microheight approximation.
2. **Geometry/physical invariants:** concave footprints, holes/openings, authored finish ownership, finite contact boundaries, curved/yawed/reflected hosts, rim cross-sections and normals, no positive-area competing opaque overlap, source immutability, unchanged physical hash/collision/navigation/routes and untouched stairs/ramps.
3. **Determinism and lifecycle:** repeat builds; unrelated-host changes; same filename/new bytes; cancellation during active work; budget exhaustion; failed image decoding; successful subsequent rebuild. Verify failed plans skip downstream generation/navigation/publication. Preview accepts source/mesh/maps as one revision, preserves the last good scene on failure and disposes old GPU/image resources. Delay an old image/decode completion until after a newer scene is ready; it must neither replace that scene nor dispose its resources.
4. **Export:** inspect actual GLB/glTF PBR fields and image bytes, run glTF validation, and render a reimported GLB under the same light/camera as the native scene. Collision writers consuming an already compiled result do not resolve visual companions; texture-dependent appearance still requires its inputs during compilation. Extend clear unsupported-format diagnostics instead of silently dropping new channels.
5. **Real browser behavior:** generated/source companion loading, compile revisions arriving out of order, theme switches, camera preservation, cancellation, texture disposal and the existing three appearance modes. Wireframe stays diagnostic; Materials remains basic lighting without shadows; Full render uses normal/roughness response and real-time shadows.

Revise two obsolete assertions deliberately: replace the asphalt test that demands a minimum zigzag count (which can reward the rejected sawtooth); and distinguish one opaque bed plus transparent water from competing opaque ground layers. Preserve footprint/overlap guarantees. Do not replace them with a numeric claim to measure naturalness.

Visual acceptance uses a frozen source/assets/build and disabled HMR. The current procedural study covers plaster, wall and floor ceramic, asphalt/concrete transitions and a retained puddle bed. The courtyard additionally exercises real wall-floor contacts and runoff. Inspect standing, close and grazing views, a moving neutral light and a camera sweep. Record source/asset/build hashes, camera, viewport, lights and browser/renderer versions. Require coherent material-specific damage, convincing depth, legible construction, no faceted-mask artifacts, no flicker/swimming or disconnected layer fronts, and native/export agreement. Screenshots support appearance review; geometry probes and motion checks establish separate facts. Moss is absent from both the implementation and visual acceptance scope.

Before production edits, obtain the repository-required independent review of concrete tests/contracts. After implementation, obtain separate code and appearance reviews, repair material findings and rerun affected checks. Run focused suites and `npm run check` per package, then the full Node suite, affected browser suites and viewer/site builds before final delivery.

## Deliverables

- One shared surface implementation used by all in-scope dressing paths, with replaced emitters removed.
- The maintained procedural material-study builder and its referenced approved companion assets.
- Updated demo AML/assets, live preview, GLB and separate-texture package.
- Documented material/AML channels, generation limits, source provenance and preview/export contract.
- Frozen review evidence under ignored `generated/`, with maintained source/reference notes kept separately.
- Validation and performance report that names any remaining approximation, including standard-PBR water limits.

Independent architecture and validation-plan reviews were completed. Their required clarifications—normal/tint ownership, readiness and revision checks, failure gates, and the collision-writer boundary—are incorporated above. These planning reviews do not substitute for the concrete pre-implementation test review or final code/appearance reviews.

Implementation is in progress. Source-preserving region compilation, material channels, wall/ground adapters and packaging are implemented, and focused analytic/code reviews have passed for several stages. The actual full demo, final ground/roof resource and physical-envelope checks, refreshed close-up/motion review, portable export comparison and complete acceptance matrix remain release gates. Neither the small study nor a subset of passing tests establishes completion.
