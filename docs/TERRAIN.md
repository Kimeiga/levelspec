# AML terrain and level metadata

AML version 1 supports numeric height grids, grayscale PNG heightmaps, constrained
profile patches, and explicitly authored triangle surfaces. All coordinates are
meters in right-handed Z-up. The [terrain course](../tests/fixtures/aml/terrain-course.aml)
combines grading, a cut tunnel, a lake and seabed, an overhead bridge, holed ground,
a PNG hill, native collision proxies, and spatial declarations.

```xml
<architecture version="1" id="ground" validation="premap">
  <terrain id="hill" heightmap="hill.png" cell-size="2 2"
           min-height="0" max-height="12" tile-size="64"/>
  <path id="road-axis" points="2 4 1; 12 4 3"/>
  <grade id="road" host="hill" path="road-axis" width="3"
         cross-slope="0.02" transition="2"/>
</architecture>
```

A terrain element selects exactly one source:

- `columns`, `rows`, and whitespace-separated row-major `heights`, with
  `cell-size="x y"` (default `1 1`).
- `heightmap`, a noninterlaced 8-bit or 16-bit grayscale PNG. Values map linearly
  from `min-height` to `max-height` (defaults 0 and 1). Row zero maps to local Y=0;
  `flip-y="true"` reverses rows. No gamma or color conversion is applied.
- `profile`, referencing a footprint with holes, interior elevations, and
  breaklines. Use `dimensions="3"` on elevated profile loops.
- Explicit `points="x y z; ..."` and `triangles="0 1 2; ..."`.

Terrain is an open surface by default. `base="z"` closes an eligible height
surface down to a **local** base; placement transforms both top and closure.
Explicit solid operations require closed valid native operands. A `subtract` of
closed ground and native solids creates checked caves or tunnels, including
inward-facing cavity surfaces. Open patches cannot be used as checked CSG solids.

## Composition and targeted validation

Independent terrain pieces can intersect, overlap, remain open, and extend into
foundations. Architecture assemblies and collision boundaries compose their architectural solids while
retaining independent closed terrain members. Use `union`, `subtract`, or
`intersect` when solid terrain composition is intended. Organizational groups
never request a physical union.

Exposed duplicate/coplanar faces are rendering errors, including opposed duplicate
windings. Uncertain near-coplanarity within 0.1 mm is a warning; confirmed plane
agreement uses 1 nm. Buried diagnostic fragments are excluded using opaque native
closed-solid occupancy, preserving actual cavities and partially exposed pieces.
Invisible collision proxies and visualization assets cannot hide rendering defects.

Explicit patch `orientation="up"` or `"down"` establishes winding assertions;
`"authored"` and `"unknown"` leave arbitrary authored orientations permissible.
Generated grid/profile normals follow the requested orientation. There is no
whole-terrain manifold, architectural floor-gap, mandatory contact, or global
navigation-coverage requirement. Terrain is nonplayable by default.

`<shared-edge id="join" from="ground" to="landing" path="seam"/>` requires
continuous native contact along every segment on both retained post-cut hosts and
on final physical geometry. Unrelated support cannot replace either named host.
The contact tolerance is 0.1 mm; no coordinates are moved. Hosts are native solids,
open terrain, or their assemblies; collision surfaces and imported meshes are not
supported hosts.

## Grading

A grade deforms the named host directly. Its path is host-local, including path
placement; terrain placement then maps the result into world space. Numeric grids,
PNGs, and constrained profiles are supported. Faceted overhang patches are not
grade hosts. Existing holes remain holes.

`width` or a longitudinal `width-profile` controls the full road width.
`cross-slope` sets signed crossfall. `transition` controls lateral shoulders;
`start-transition` and `end-transition` control outward endpoint blending. Lateral
transition defaults to 1 m; endpoint transitions default to half the endpoint
width. All transitions must be positive. An optional width profile must cover the
full path; stations beyond its end are permitted.

Overlapping influences require distinct explicit `order` values, independent of
XML declaration order. Incompatible centerline elevations at crossings fail even
when an order is supplied. Folded/self-overlapping ribbons fail. Conforming
refinement checks midpoint and centroid residuals against half the document curve tolerance;
compilation fails if its work/triangle limits cannot meet that tolerance. Outside
the influence footprint, original terrain stays unchanged.

## Playable domains, water, and metadata

```xml
<profile id="play" points="0 0; 10 0; 10 4; 0 4"/>
<zone id="walk-area" profile="play" role="playable" elevation="0" height="2"/>
<clearance id="passage" profile="play" height="2" require-support="true"/>
<volume id="checkpoint" profile="play" role="objective" height="2">
  <property name="label" value="Checkpoint"/>
</volume>
```

Rooms and zones are named spaces, not automatically generated enclosures. Gameplay
volume roles are `spawn`, `objective`, `trigger`, and `out-of-bounds`; properties
are inert strings. Full transformed profile and extrusion vectors are preserved,
including holes and tilted rooms. No game logic is implemented.

Clearance assertions test actual collidable native surfaces, including invisible
proxies and closed-solid interiors. Exact floor/soffit contact is allowed.
`require-support` checks the complete footprint against actual upward support,
including interior holes. Visualization meshes never establish support or block
checked circulation.

Zones with `role="playable"` bound navigation independently for `movement="land"`
(default) or `"water"`. Their extrusion must be vertical. Navigation retains
obstacles above the selected support band, so a low ceiling cannot disappear when
cropping. Required endpoints outside the declared domains fail. Domains do not
invent support or bridge missing ground. A medium with no playable zone retains
its existing navigation behavior; use explicit domains to bound large workloads.

Water stays a separate surface and navigation medium. Author native seabeds for
physical depth, shorelines, and obstacles. Boat draft and overhead height are
checked against actual geometry, including bridges. Land collision is not replaced
by the water navigation support mesh. See the course's `under-bridge` route and
its shallow-water and low-bridge negative controls.

## Tiles, caching, transport, and limits

Grid tiles contain at most 64×64 cells. Tile boundaries share source vertices and
area-weighted normal dependencies. Derived patches and final closed/CSG terrain
are spatially grouped into bounded triangle chunks without clipping or moving
triangles. Stable tile IDs, world bounds, content hashes, and physical triangle
ranges are exported. Final closed terrain uses 64 m spatial cells; authored grid
tile sizes control source cells. Tiles are compilation partitions, not streaming
or level-of-detail representations.

`TerrainTileCache` is an optional byte-bounded LRU (128 MiB default), supplied as
`compile(document, { terrainCache })`. It reuses derived area-weighted normal sums;
source loading, resolution, and content hashing still run. One-ring dependencies
invalidate neighboring seam normals. Cached arrays never alias compiled output.
`stats.terrainCacheHits/Misses` are per compilation. PNG bytes are reloaded before
cache lookup. Completed reviewer workers reuse the cache; canceling or replacing
in-flight work discards that worker and its cache.

AML runtime JSON **4** and native export metadata **3** are independent of AML XML
version 1. `terrainTiles[].triangleStart/triangleCount` address their accompanying
canonical `physicalMesh`, before render material partitions and collision filtering.
Canonical physical geometry excludes imported visualization meshes entirely; those
remain in rendering. Export metadata is the `*.levelspec.json`/embedded native
metadata contract; the separate `*.export.json` publication report remains version 1.
`spatialVolumes` carries world geometry and metadata separately from physical
meshes. Exports keep visibility, collision, and navigation distinct.

Default compiler admission includes 1,048,576 terrain samples, 16 MiB aggregate
encoded PNG bytes, 2,000,000 triangles, 16,384 tiles, 8,000,000 spatial queries,
8,000,000 grading operations, and 32,000,000 normal dependency visits. Playable
support domains are limited to 4,000,000 horizontal navigation cells per zone.
UV chart admission defaults to 16,384 source groups and resulting charts, configurable
with `UVOptions.maximumCharts`. Terrain facets group by geometric normal quantized
to one millionth per component; coplanar neighbors remain connected while curved
heightfields can require many charts. Strict density and overlap checks still apply.

Budgets fail with source-linked findings; they never coarsen terrain, enlarge
openings, fill holes, or repair required routes. Host loading is bounded separately.

Coordinates are normalized once; derived intersections are preserved. The
physical inspection walker admits triangle-boundary roundoff within 10 nm without
moving geometry or changing the player body. Repairs and displacement remain
separate from curve approximation and player clearance.

In the reviewer, enable **Spatial issues** for native volume, grading, and tile
outlines. Select plan outlines to inspect source provenance, metadata, tile bounds,
and grading source profiles. These overlays do not enter collision or navigation.
