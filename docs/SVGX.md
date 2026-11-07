# XML LevelSpec authoring

The XML compiler is available through `levelspec` and `levelspec/vector`. Its
canonical coordinate system is right-handed, Z-up, in meters. Runtime JSON is
generated output; ASCII plans and JSON level authoring have been retired.

Edit XML with your normal tools and use the read-only reviewer for inspection.
For live file watching run `npm run --silent levelspec -- preview <file.level.svgx>`.
Malformed XML retains visibly stale geometry until repaired. Local file opening is
also available through `npm run dev`; the browser does not save source or export.

```sh
npm run compile -- examples/showcase.level.svgx --out generated/showcase
npm run compile -- examples/showcase.level.svgx --out generated/showcase --no-uv
node tools/vector-bake.ts examples/showcase.level.svgx generated/lighting/my-bake 64
```

Build writes GLB, runtime/report JSON, OBJ, SVG and optional atlas data beneath the
explicit `--out` directory. GLB contains material UVs and, after unwrapping,
lightmap UVs; generic viewers do not automatically apply lighting manifests.
See [exports](EXPORTS.md) for formats and [review controls](WEBSITE.md) for UI.

## Minimal document

```xml
<level version="2" id="room" name="A room">
  <layer id="ground">
    <vertex id="a" x="0" y="0" z="0"/>
    <vertex id="b" x="6" y="0" z="0"/>
    <vertex id="c" x="6" y="6" z="0"/>
    <vertex id="d" x="0" y="6" z="0"/>
    <edge id="ab" from="a" to="b"/>
    <edge id="bc" from="b" to="c"/>
    <edge id="cd" from="c" to="d"/>
    <edge id="da" from="d" to="a"/>
    <region id="floor" boundary="ab bc cd da"/>
  </layer>
  <marker id="spawn" layer="ground" region="floor"
          position="3 3 0" kind="attacker_spawn"/>
</level>
```

**Corners are sharp by default.** `join="miter"` intersects the wall offsets,
producing square corners for perpendicular walls. `join="round"` explicitly adds
rounded joins and endpoint caps. Use it on both incident edges when rounding a
corner. A miter exceeding four wall half-widths is bevelled to prevent spikes at
very acute angles. This option controls wall joins; a Bézier `control` attribute
still deliberately curves the path itself.

**Wall edges are centerlines.** Every wall and retaining seam extends half its
thickness to each side of the path; there is no implicit edge-aligned mode.
Floor loops describe slab footprints and are not automatically trimmed by walls.
For a 0.6 m wall, its straight faces lie 0.3 m from the path. To meet a wall face,
place the floor boundary at that face, accounting for the actual offset at curves
and mitered corners. Different wall thicknesses naturally produce different faces
even when the source paths share a centerline.

```xml
<edge id="sharp" from="a" to="b" join="miter"/>
<edge id="rounded" from="b" to="c" join="round"/>
```

## Grammar and defaults

XML names and attributes are case-sensitive. IDs are globally unique, start with
a letter or underscore, and may contain letters, digits, `_`, `.`, `:`, `/`, and
`-`. References are whitespace-separated. Numeric values must be finite. Unknown
attributes/elements and DOCTYPE declarations are rejected. Labels use attributes;
XML text content is not part of the format. Diagnostics include IDs and source
line/column where available.

| Element        | Attributes and meaning                                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `level`        | Required `version="2"`, `id`; optional `name`, `description`, `units="meters"`, `wall-thickness="0.22"`, `wall-height="3"`, `floor-thickness="0.2"`, `curve-tolerance="0.01"`, `expect-fail` |
| `layer`        | Required `id`; optional `label`; contains vertices, edges, regions                                                                                                                           |
| `vertex`       | Required `id`, `x`, `y`, `z`; optional `label`                                                                                                                                               |
| `edge`         | Required `id`, `from`, `to`; optional `kind="wall"`, `control`, `height`, `thickness`, `material`, `join="miter"`, `base-floor`, `top-floor`, `span-floors`; contains openings                  |
| `opening`      | Required `id`, `start`, `end` (horizontal arc lengths); optional `kind="door"`, `sill="0"`, `head="2.1"`, `barricade="false"`                                                                |
| `region`       | Required `id`, `boundary`; optional `fill="floor"`, `interior`, `material`, absolute `ceiling`, `thickness`, `role`, `area`, `lower`, `upper`, `rise`; contains holes and creases            |
| `hole`         | Required `boundary`                                                                                                                                                                          |
| `crease`       | Required `from`, `to` vertex IDs                                                                                                                                                             |
| `seam`         | Required `id`, `edges` (two edge IDs); optional `kind="open"` or `wall`, `material`                                                                                                          |
| `material`     | Required `id`; optional `color="#b9c7d1"`, `repeat="1"` (repeats/metre), `roughness="0.8"`, `metalness="0"`, `texture`                                                                       |
| `sky`          | Optional `color="#dce8f5"`, `intensity="0.5"`                                                                                                                                                |
| `light`        | Required `id`, `position`; optional `kind="point"` (`directional`, `spot`), `target="0 0 0"`, `color="#ffffff"`, `intensity="1"`, spot half `angle` in radians                               |
| `marker`       | Required `id`, `layer`, `position`; optional `region`, `kind="poi"`, `team`, `label`                                                                                                         |
| `route`        | Required `id`, `from`, `to` marker IDs; optional `min-routes="1"`, `min-distance`, `max-distance`                                                                                            |
| `no-spawn-los` | Required `markers` pair                                                                                                                                                                      |
| `link`         | Required `id`, `from`, `to` XYZ positions, `kind`; optional `bidirectional="true"`, `ability`, `from-area`, `to-area` (the areas joined; otherwise inferred from the floor at each position) |
| `cover`        | Required `id`, `layer`, `min`, `max` XYZ bounds; optional `material`, `dynamic="false"`, `role`, `label`                                                                                     |
| `player`       | Defaults: `radius="0.25" height="2" step="0.45" slope="42" crouch="1.1" vault="0" rappel="false" ladder="false"`                                                                           |

Except for `hole`, `crease`, `player`, `sky`, and `no-spawn-los`, elements support
`id` and usually `label`. Root-level elements other than `layer` cannot contain
children. Coordinate vectors use spaces: `position="1 2 3"`.

An edge without `control` is straight. One XY pair produces a quadratic Bézier;
two pairs separated by `;` produce a cubic: `control="4 -3; 10 -3"`. Height follows
horizontal arc length between the endpoint elevations. Shared edges are flattened
once for all uses. Coincident XY positions on separate storeys do not connect.

A region is filled only by an explicit `region`. Open and branching edge networks
remain walls without an implicit floor. A reversed reference is written `-edgeId`.
All boundary references must form connected closed loops. Holes exclude their
interior; crease constraints affect triangulation without changing fill. Interior
height vertices use `interior="v1 v2"`. Separate regions describe overlapping
storeys. `area` groups several floor patches into a named logical space for
navigation reporting, particularly resolved legacy stair slices.

Layers are organizational, not required to express an overpass. Distinct vertices
and edges may occupy identical XY coordinates at different heights in the same
layer. Connectivity is still explicit through IDs. Static wall volumes are united
across layers: a wall spanning Z=0–3 and another spanning Z=2–5 form a continuous
Z=0–5 wall, with no buried caps or duplicated overlapping volume. Spans Z=0–3 and
Z=4–7 retain their one-metre gap. Floors and stairs are never included in that wall
union. Source-face object IDs, layers and materials survive the union. Runtime
mesh parts list all contributing `layers`; `layer` is empty for a part spanning
multiple layers. Dynamic walls remain independent.

Interior walls can be anchored to filled floor regions:

```xml
<!-- A partition 1.2 metres above the named floor. -->
<edge id="partition" from="a" to="b" base-floor="hall" height="1.2"/>

<!-- From the hall floor to the underside of the upper floor slab. -->
<edge id="tunnel-wall" from="c" to="d"
      span-floors="true" base-floor="hall" top-floor="upper-platform"/>

<!-- Infer the pair only if exactly two floors overlap the entire edge. -->
<edge id="automatic-span" from="e" to="f" span-floors="true"/>
```

`base-floor` and `top-floor` refer to region IDs, across any layer. The anchored
wall follows the triangulated floor height along its centreline; changing its
endpoint Z does not move those floor surfaces. Additional wall stations preserve
changes of slope at triangle boundaries. `span-floors` uses the upper floor's
underside, including its thickness, and is mutually exclusive with fixed `height`.
With only one floor named, inference must find exactly one eligible counterpart
along the entire wall. Ambiguous choices, holes, missing support, inverted spans
and unknown IDs produce source-located `WALL_ANCHOR` errors; split an edge where
its supporting floor region changes. Anchors support `fill="floor"` and `fill="ramp"` regions;
stair-side panels continue to use their overall endpoint slope.

Wall kinds are `wall`, `hard`, `soft`, `reinforced`, `glass`, `open`, `door`,
`window`, `arch`, `breach`, `railing`, `rappel_window`, and `rappel_door`. Wall
height is relative to endpoint elevation. Doors/windows can cover an entire edge
or be explicit `opening` children. Soft/glass walls and barricades remain separate
from the static shell. They are excluded from bake receivers and bake occlusion.

## Curved stairs and ramps

Stairs use `fill="stairs"`; continuous two-rail ramps use `fill="ramp"`. Both
identify `lower` and `upper` straight, horizontal landing edges. Removing those
edges from the closed boundary yields two side chains running lower to upper.
Side chains may contain straight, quadratic or cubic edges; landing widths may
differ. Cross-sections pair equal normalized horizontal arc-length fractions.

```xml
<region id="turning-flight" fill="stairs"
        boundary="lower outer upper inner"
        lower="lower" upper="upper" rise="0.18"/>
<region id="turning-ramp" fill="ramp"
        boundary="ramp-lower ramp-outer ramp-upper ramp-inner"
        lower="ramp-lower" upper="ramp-upper"/>
```

`rise` is a maximum riser height, default 0.18 m. Stairs divide total rise into
`ceil(totalRise/rise)` equal risers and create horizontal wedge treads. Ramp
elevation is linear in normalized travel. Intermediate authored rail heights
must agree with that profile within 1 mm. The shared curve tolerance is 0.01 m.
Authored landing coordinates and `rise` are normalized to millimeters, including
when serialized. A computed half-millimeter maximum can round differently from
the intended equalized rise and add a tread. When reproducing a counted flight,
choose a representable maximum for the normalized total climb, then verify the
saved XML's actual compiled tread count and landing profile. The maximum is a
bound; it is not the resulting tread-to-tread height.
Holes, interior height vertices, crease constraints, folded/intersecting rails,
zero-width sections and overlapping turns produce source-located `FLIGHT`
diagnostics. Split multi-revolution flights into separate single-valued XY regions.

Generated floor patches contain actual tread tops and ramp triangles, so height
queries, navigation and rendering inspect the same surfaces. Walls, floors and
stairs always remain separate mesh parts. Side walls follow the overall smooth
profile; increasing tread count does not increase their triangles. A flat center
platform is an ordinary separate floor, joined to the descending rail with an
explicit elevation seam. Local solid-span validation also checks stacked sloping
floors across layers without confusing overlapping global height ranges.

## Visible surface overlap errors

Compilation reports `SURFACE_COPLANAR` when visible geometry contains overlapping,
same-facing coplanar patches. The audit covers architectural surfaces, primitive
props and imported meshes, including duplicate faces inside one object. Collision
settings do not exempt visual geometry; invisible collision proxies are excluded.

Each canonical object pair produces one diagnostic with source IDs, approximate
union overlap area, related object/asset source locations, and a spatial review
target. Validation provides Inspect, Cutaway and Copy review link; a direct link
uses `?diagnostic=<id>` or `preview <source> --diagnostic <id>`. Diagnostic and
suggestion selectors are mutually exclusive. The reviewer retains geometry after
an overlap error so invalid layouts can still be inspected. Resolved findings are
reconciled on source updates and stale geometry disables inspection controls.

Separate or remove duplicate surfaces in source geometry. The compiler never
shifts geometry, unions distinct objects or applies material depth bias to hide
an overlap. Opposing construction supports, ordinary triangle neighbors,
perpendicular crossings and line/point contact are excluded. Downward same-facing
overlaps are checked. Existing 0.1 mm plane/footprint and 1 mm² area tolerances
suppress construction residue; this does not guarantee detection of all
camera-dependent depth artifacts or merely close surfaces.

Overlaps are errors by default and prevent validation/export success. Explicit
`surfaceContacts: "warning"` or `false` changes this policy. The CLI provides
`--surface-contacts error|warning|off`; the former strict-only flag is removed.
Existing suggestion suppressions do not suppress overlap errors. Failed builds
preserve published outputs.

## Automatic navigation and clearance

### Water and boats

`<region fill="water" .../>` declares a horizontal, non-solid water surface.
Use separate regions for different elevations, and holes for islands. Water has
its own mesh/surface kind, material and runtime `water` patches; it is excluded
from solid floor overlap checks and does not create a floor slab or ceiling.
The authored terrain below it remains available as bathymetry. Assigning a blue
material to an ordinary floor does not give it water semantics.

```xml
<boat radius="2" draft="0.5" height="2"/>
<marker id="boat-start" layer="coast" kind="poi" movement="water" position="10 20 3"/>
<marker id="tree" layer="ground" kind="decoration" movement="none" position="30 40 4"/>
<route id="boat-route" from="boat-start" to="boat-end" movement="water"/>
```

`boat` is optional and defaults to the dimensions above, in metres. It models a
circular footprint, minimum draft and clearance above the surface, not a ship's
turning dynamics. `movement` on markers accepts `land`, `water`, or `none`;
routes and links accept `land` or `water`. Omission preserves land behavior.
No boarding or movement-mode transition is synthesized.

Compilation retains `CompiledLevel.navigation` for land and additionally produces
`waterNavigation` when water exists. Runtime JSON, validation and export metadata
preserve both reports. `bakeNavmesh(level, { movement: "water" })` requests the
boat report explicitly. Changes to the boat profile invalidate its cache.
Land walking surfaces are clipped below water; boat candidates are restricted
to known sufficient depth, eroded for the boat radius, and checked against solid
obstacles and overhead clearance. Water bodies may be disconnected; explicit
routes must have a complete path. Missing seabed areas are excluded and reported
as `WATER_DEPTH_UNKNOWN`. Bridges above water remain ordinary solid geometry.

The viewer's Navigation selector switches between Land and Boat. Water appears
in both the SVG plan and 3D geometry, independent of reference images. Portable
mesh exports retain its surface identity. BSP export currently rejects water
explicitly because its brush-volume representation is not implemented.

Compilation also reports `FLOOR_EDGE_GAP` when two floor boundaries coincide in
XY, have filled regions on opposite sides, and leave an unsealed vertical gap
larger than 1 mm. It checks partial and curved boundaries, actual stair heights,
slab thickness and the final static collidable walls, floors and stairs, including
openings. An intermediate slab can physically seal part of the interval even on
the lower floor's side of the boundary. Hidden collision geometry still counts;
dynamic or noncolliding surfaces do not. Material above the gap or covering only
part of its length does not silence the remaining gap.
Warnings include both region/edge IDs, a source location and the affected span.

Same-side stacked perimeters and crossing overpasses are not candidate joins. A lower
floor continuing through an underpass is also exempt, including contact through
the first stair riser. Headroom and traversal remain separate navigation checks.
The audit neither adds walls nor connects coincident source IDs automatically.

Opposite-side boundaries from separate storeys can still coincide in plan and be
reported. This conservative material-closure check does not establish that the
floors should connect or that the intervening space needs a wall. Verify the intended
relationship before adding geometry; occupied-edge protection and architectural
fidelity require separate review. Intentional open space can still fail strict mode.

The default is a warning so an intentional open edge stays inspectable. Use
`compile(document, { floorGaps: "error" })` to make it a build error, or
`floorGaps: false` to disable this audit. The CLI equivalent for strict builds is:

```sh
npm run compile -- examples/dust2.level.svgx --strict-floor-gaps
```

The audit exposed a former Dust II gap at Long A / CT. It was repaired by restoring
the intended lower route rather than adding a wall across its exit. Navigation
and this boundary audit remain independent checks; the regression fixtures
exercise unsealed and correctly supported boundaries.

`compile()` builds open-state navigation by default. The default player is 2 m tall
and 0.5 m in diameter (`radius=0.25`); explicit `<player>` settings still override it.
Default Recast cells are 0.0625 m horizontally and 0.01 m vertically. These are a
conservative voxel approximation, not an exact continuous capsule collision proof.

The repository CLI accepts `--nav-cell METERS` on `validate`, `build` and `preview`.
The shared reviewer exposes the same horizontal grid size under **Walking grid**;
`?nav-cell=0.0625` reproduces that choice. Public tool inputs allow 0.025–0.5 m,
defaulting to 0.125 m. Finer grids can resolve narrow passages at greater cost;
they preserve the authored player, geometry, vertical grid and validation rules.
The core `NavigationOptions.cell` API continues to accept finite positive values.
Pass the same `cell` to compilation and `validateForRuntime` when using the API,
because runtime validation can rebuild navigation with its own options.

```ts
const level = await compile(document, {
  onGeometry: geometry => showPreview(geometry),
  onProgress: stage => showProgress(stage),
  navigation: { cell: 0.125 }, // false permits geometry-only compilation
});
const report = await validateForRuntime(level, { sealed: true });
```

`CompiledLevel.navigation` and generated runtime JSON include agent/build settings,
the navigation mesh, required routes, source-located `diagnostics` and per-region coverage. Matching results are
reused by runtime validation. Geometry, movement settings, routes/markers/links,
semantic connectivity and dynamic state participate in the cache identity.

Coverage samples actual floor/tread heights at 0.5 m spacing by default, retaining
independent Z spans for stacked floors. It excludes solid-occupied areas and normal
capsule margins, then reports low headroom (including slab thickness), insufficient
width, excessive slope/step, disconnection or uncovered floor. Counts include every
sample; at most 2048 representative failure positions are included for inspection.
The viewer draws selectable failure markers in plan and 3D and retains geometry
when navigation or optional UV generation needs attention.

## UVs and lighting

Material UVs use physical surface projection; walls follow horizontal arc length
and elevation. Curved ramp strips unfold across shared triangle edges to keep
checker phase continuous and preserve physical scale. Lightmap UVs use xatlas, defaulting to 8 texels/metre, 2048-pixel
pages and 8-pixel padding. Request 32 texels/metre for a final atlas. Dynamic
surfaces do not receive baked UV pages. Triangle-corner attributes and source
ownership survive UV seam splitting. Adjacent triangles share vertices during chart generation, so continuous walls and
coplanar floors form connected islands. Atlas errors retain the geometry preview;
the compiler does not silently replace every triangle with a separate chart.
The float32 atlas adapter can repair microscopic UV slivers with a bounded shared
vertex adjustment and repack connected charts; the count and maximum movement in
texels are recorded in compilation statistics and the result is re-audited.

```ts
import {
  parseLevelSvgx,
  compile,
  generateUVs,
  validateForRuntime,
} from "levelspec/vector";
const level = await compile(parseLevelSvgx(text));
await generateUVs(level, { density: 32, resolution: 2048, padding: 8 });
const report = await validateForRuntime(level, { sealed: true });
```

Blender is optional for compilation. Set `BLENDER_PATH` or pass `blender` to the
Node-only `bakeLighting` function in `src/lighting/bake.ts`. Each bake uses a fresh
output directory and runs the installed Blender calibration first. It records
sky direct/indirect and authored-light indirect illumination, leaving direct
sun/lamp lighting live. Receiver albedo is excluded from the lightmap. Material
colors remain present for bounce. The result includes raw linear EXRs, coverage
and chart arrays, chart-aware mips, settings, checksums and an editable `.blend`.

Lighting manifests and their EXR/mip companions belong to the optional bake pipeline.
The current read-only reviewer does not expose the former lighting-manifest drop
workflow. Validate hashes and destination-renderer binding in the intended consumer;
a successful bake is not visual acceptance. Historical calibration evidence is in
[the archive](archive/README.md).

Export material images are packaged for portable mesh formats. Remaining UV,
lighting and destination-runtime limits are recorded in
[the implementation ledger](IMPLEMENTATION.md). Legacy migration parity is no
longer a release gate; retained XML contracts are the acceptance standard.

## Reference-aware authoring preview

Reference-camera pose and lens values retain number precision through parse, save
and compile. Camera position and target retain finite/safe-range checks without
millimeter snapping. Geometry and landmark world positions remain on the
millimeter lattice.

The source format also accepts root-level `reference` (with `landmark` and `mask`
children), `asset`, and `prop` declarations. Stairs accept optional
`underside="filled"` (the existing default), `underside="sloped"`, or
`underside="stepped"`. Filled material extends down to the lower landing minus
thickness. Sloped material follows the smooth guide minus thickness. Stepped
material keeps each tread's horizontal bottom at its actual tread height minus
the vertical thickness, with real vertical underside risers and closed side faces.
The existing tread convention is unchanged: the first cell is one equalized riser
above the lower landing, and the last cell reaches the upper landing. Choosing an
underside does not move those cells or change their horizontal walking surfaces.

Stepped thickness must exceed the **actual equalized riser** by the numerical
geometry tolerance (1e−7 m), so adjacent tread bands share positive material.
Equality or thinner material produces a source-linked `FLIGHT` diagnostic; no
thickness is silently increased. For example, climb 1 m with maximum rise .34 m
uses 3 risers of 1/3 m: thickness .334 m retains a valid submillimeter overlap.
Sloped/filled modes retain their existing thickness contracts. Authoring dimensions
are normalized to millimeters before this derived-riser check; actual invalid
geometry remains an error rather than a reason to discard faces.

`addStairFlight(group, id, { ..., underside: "stepped", thickness: .20, rise: .18 })`
selects the same native behavior. The helper still defaults to sloped/.15 m, while
ordinary XML stairs still default to filled. Collision geometry, retained export
solids, floor-volume overlap and retaining-seam profiles use the same underside.
Navigation samples actual top treads; clearance below the flight depends on its
chosen physical underside. Navigation success is not a continuous traversal proof.
See [Reference authoring](REFERENCE_AUTHORING.md) for examples, collision behavior,
host asset-resolution requirements and reference controls.

## Static premaps and automatic repairs

`<level validation="premap">` declares a static map survey. Omission defaults to
`playable`, retaining strict authored-floor and spawn-based connectivity checks.
Premaps validate each navigation component independently; `componentSeeds` gives
stable IDs and representative positions. A spawn is optional. Explicit markers
and routes remain requirements in either mode, including boat draft/clearance.

Premap coverage records physically demonstrated slope, width, step and headroom
restrictions in `blockedCount`, `blockedByReason`, and capped `blocked` samples.
Unexplained missing navigation is still an error. The slope cutoff matches Recast:
a slope at or above the configured limit is blocked. A successful premap reports
`gameplayReachabilityVerified: false`; the viewer says **Static premap valid;
gameplay reachability unverified**. It does not claim exact game movement.

Clipping automatically normalizes duplicate consecutive vertices, redundant
collinear vertices and zero-area fragments, ignores disjoint masks, and removes
equivalent masks/fragments. Water extending outside supporting terrain is trimmed
only when the entire unsupported fragment lies in its 0.001 m boundary band.
Larger missing seabeds produce `WATER_DEPTH_UNKNOWN` errors. No depth is inferred.
The repair is reflected in compiled water triangles and mesh exports.

Compiled levels and runtime exports include `repairs`: source-linked records with
code, message, objects, count, affected area and maximum displacement where
applicable. Navigation repairs also identify movement mode. Consumers should keep successful repairs separate from error diagnostics.

Clipping checks finiteness, convexity, vertex growth and area conservation while
processing. Limits are checked before allocation; defaults are 4,096 fragments
and 32,768 intermediate vertices per source triangle, and 2,000,000 generated
vertices per movement bake. Override using positive safe integers:

```ts
await compile(document, { navigation: { clippingLimits: {
  fragmentsPerTriangle: 4096,
  intermediateVerticesPerTriangle: 32768,
  generatedVertices: 2_000_000,
} } });
```

The same options work with `bakeNavmesh` and `validateForRuntime`. An irreparable
invariant or budget failure produces `CLIP_INVARIANT` or `CLIP_COMPLEXITY_LIMIT`
with the source object, operation and measured limit. Compilation retains usable
geometry; failed navigation is invalidated and never cached. Abort signals are
checked inside clipping loops. Changing the validation contract or clipping
limits invalidates navigation caches.

Large navigation extents (over 32 m) are automatically split into 32-cell tiles
(4 m at the default cell size). This prevents large terrain polygons from
exhausting Recast's detail-vertex capacity and flattening local terrain features.
`NAV_SPATIAL_SUBDIVISION` records this processing repair. Tile intermediates are
released immediately, cancellation is checked between tiles, and a failed tile
invalidates the entire movement result. Zero-polygon tiles are valid empty space.
Local detail samples use three cells (0.375 m by default), keeping each tile below
the detail capacity without relaxing the height or movement tolerances.
Coverage checks use the actual clipped terrain edges at shorelines.

Architectural review findings use the separate [suggestions channel](SUGGESTIONS.md).
Root-level `<review-suppression suggestion="…" fingerprint="…" reason="…"/>`
annotations acknowledge exact findings until their relevant geometry changes.
