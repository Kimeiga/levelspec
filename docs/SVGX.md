# LevelSpec 2 vector authoring (preview)

The vector compiler is available through `levelspec/vector`. Its canonical
coordinate system is right-handed, Z-up, in metres. Runtime JSON is generated
output. The existing root API remains available while migration parity is being
verified; this workspace is not yet a completed 2.0 release.

Run `npm run dev` to open the source editor and linked plan/3D inspector. Open or
drop a `.level.svgx` file, edit its XML, and compile it. A source error retains the
last valid preview and marks it stale. Atlas generation is optional. Cancelling
terminates the compilation worker. Orbit and free-fly inspection are available;
free-fly does not enforce player collision.

```sh
npm run compile:vector -- examples/showcase.level.svgx
npm run compile:vector -- examples/showcase.level.svgx --no-uv
node tools/vector-bake.ts examples/showcase.level.svgx generated/lighting/my-bake 64
```

The compile command writes mesh JSON, OBJ, SVG, GLB, UV layouts, and validation
reports beneath `generated/vector`. OBJ carries material UVs only. GLB contains
`TEXCOORD_0` and, after atlas generation, `TEXCOORD_1`. Generic GLB viewers do not
apply LevelSpec lighting manifests automatically.

For GLB/glTF/FBX/BSP format selection, texture packaging, native tool setup,
viewer downloads and preservation details, see [Exporting levels](EXPORTS.md).

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
| `link`         | Required `id`, `from`, `to` XYZ positions, `kind`; optional `bidirectional="true"`, `ability`                                                                                                |
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

## Wall/floor overlap warnings

Compilation reports `WALL_FLOOR_COPLANAR` when the final wall and floor/stair
meshes contain overlapping, same-facing surface patches. This includes a wall
cap at floor elevation and vertical slab sides coinciding with wall faces or end
caps. Each source pair produces one warning with both IDs, source location,
overlap area, an example coordinate and the nominal half-thickness offset.

Raise the wall above the floor, terminate a supporting wall at the slab
underside, or move the floor boundary to meet its physical face without an
overlapping patch. Moving only the rendered object, applying depth bias, or
changing material colors does not repair the source geometry. Mesh categories
remain separate; the audit does not union floors with walls or shift geometry.

The check uses actual triangle intersections, including sloped surfaces and
openings. It excludes opposing underside supports, bottom caps and line/point
contact. A 0.1 mm plane/footprint tolerance and a 1 mm² area threshold suppress
float32 construction residue; this is a geometry audit, not a guarantee against
all camera-dependent depth artifacts.

Warnings are enabled by default. Use `surfaceContacts: "error"` for strict
compilation or `surfaceContacts: false` to disable this audit. The CLI provides
`--strict-surface-contacts`. Warnings are included in runtime JSON and the
viewer's linked Validation panel. Current Dust II passes both strict contact
and strict floor-gap checks without warnings. Wall feet follow their supporting
floor plane; open retaining seams start at the lower walking surface. Actual
authored cap or side overlaps still produce diagnostics.

## Automatic navigation and clearance

Compilation also reports `FLOOR_EDGE_GAP` when two floor boundaries coincide in
XY, have filled regions on opposite sides, and leave an unsealed vertical gap
larger than 1 mm. It checks partial and curved boundaries, actual stair heights,
slab thickness and the final static wall mesh, including openings. A wall starting
on the upper floor or covering only part of the interval does not silence it.
Warnings include both region/edge IDs, a source location and the affected span.

Stacked perimeters and crossing overpasses are not adjacent floor joins. A lower
floor continuing through an underpass is also exempt, including contact through
the first stair riser. Headroom and traversal remain separate navigation checks.
The audit neither adds walls nor connects coincident source IDs automatically.

The default is a warning so an intentional open edge stays inspectable. Use
`compile(document, { floorGaps: "error" })` to make it a build error, or
`floorGaps: false` to disable this audit. The CLI equivalent for strict builds is:

```sh
npm run compile:vector -- examples/dust2.level.svgx --strict-floor-gaps
```

The audit exposed a former Dust II gap at Long A / CT. It was repaired by restoring
the intended lower route rather than adding a wall across its exit. Navigation
and this boundary audit remain independent checks; the regression fixtures
exercise unsealed and correctly supported boundaries.

`compile()` builds open-state navigation by default. The default player is 2 m tall
and 0.5 m in diameter (`radius=0.25`); explicit `<player>` settings still override it.
Default Recast cells are 0.125 m horizontally and 0.05 m vertically. These are a
conservative voxel approximation, not an exact continuous capsule collision proof.

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

Enable lightmap UVs in the inspector, then drop the `.lighting.json` file and all
its EXR page/mip files together. The viewer binds them to `uv1` and rejects stale
geometry, atlas, material, light, compiler or renderer revisions. Covered black
texels remain covered; padding does not infer coverage from brightness. The
current Cycles calibration stores E/pi and records the corresponding decode
multiplier. Runtime material albedo and direct lights are applied once.

External material-image packaging, full UV gutter/distortion auditing, complete
semantic/physical traversal parity, and the migration retirement gate remain
open. See [the implementation ledger](IMPLEMENTATION.md) before treating this as
a production 2.0 release.
