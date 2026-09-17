# LevelSpec 2 implementation ledger

This is an integrated preview, not the completed 2.0 release. The accepted
retirement gate remains in force: legacy production APIs and tools stay available
until corpus validation parity and producer migration pass.

Implemented and exercised:

- Strict SVGX parsing/serialization with source locations and explicit topology.
- cdt2d floors/holes/creases, shared curve tessellation, Manifold wall junctions,
  straight/curved stairs and ramps, mesh exports and independent Recast navigation.
- Sharp wall corners by default; explicit `join="round"` for rounded corners.
- Wall paths consistently describe centerlines. Final-mesh overlap auditing
  reports same-facing wall/floor or stair patches as `WALL_FLOOR_COPLANAR`, with
  source IDs, locations and thickness-aware repair guidance. Point/line contact
  and opposing slab-support faces are valid. Warnings can be promoted to errors
  using `surfaceContacts: "error"` / `--strict-surface-contacts`.
  Wall feet fit the supporting floor plane across their width; height-anchor
  subdivisions preserve the original curve offsets. Open retaining seams start
  on the lower walking surface and preserve their centerline during triangulation.
- Walls, floors and stairs remain separate mesh parts in compilation, exports,
  the inspector and Blender. Stair-side walls follow the overall slope as simple
  panels. Increasing tread count does not subdivide those wall panels.
- Static walls on coincident XY boundaries unite across storeys/layers when their
  volumes touch or overlap. Source-face ownership survives; real vertical gaps and
  dynamic walls remain independent. Runtime mesh parts carry all source layers.
- Floor-relative interior walls support `base-floor` with fixed `height`, or
  `span-floors` with optional `base-floor`/`top-floor` references. Upper slab
  thickness and centreline slope breaks are preserved; ambiguous references and
  gaps in floor support produce source-located diagnostics.
- Curved flights pair side rails by horizontal arc length, with real horizontal
  wedge treads or continuous ramp strips. Landings may taper; folded rails and
  incompatible height constraints have source-located diagnostics. Open retaining
  seams end beneath upper slabs instead of duplicating their visible top faces.
  Retaining seams have continuous curve offsets and sharp endpoint joins with
  related walls; joins use shared IDs and overlapping height spans, preserving
  genuine gaps between stacked structures.
- Ordinary compilation builds navigation for a 2 m tall, 0.5 m diameter player.
  The report records effective voxel settings, reusable build identity, required
  routes and sampled coverage of declared floors, including stacked surfaces.
  Low ceilings, narrow passages, steep floors, excessive steps and disconnected
  areas are diagnosed; occupied wall/prop footprints and normal capsule margins
  are accounted for separately. Coverage is sampled, not a continuous proof.
- Ordinary compilation also audits adjacent floor boundaries for unsealed height
  gaps against final static wall geometry, including partial spans and openings.
  `FLOOR_EDGE_GAP` warnings contain both floor/edge IDs and source locations;
  callers can promote them to errors with `floorGaps: "error"` or the CLI flag
  `--strict-floor-gaps`. Intentional stacked floors and continuing underpasses
  remain valid. The audit found and fixed retaining seams whose first endpoint
  tied in elevation, previously allowing the wrong lower side to be selected.
- Dust II uses deliberately simplified polygonal boundaries and native curves.
  The tunnel winders occupy the outer half of the bend, around a flat raised
  center; the following Mid hallway stays level. Separate entrance/exit flights,
  CT ramp/side stairs, A Short, shallow Goose steps, T-side and Pit transitions are
  documented in `reference/dust2/README.md`. Dimensions remain blockout estimates.
  The overlay inspector checks authored coverage, landmarks, passage widths,
  physical interior wall presence and navigation. Raster similarity is informational.
  T Spawn descends east into a low landing, with level northern approaches and
  its original western tunnel ramp. A Short connects level to the site, while
  the CT ramp and parallel stairs climb east below it toward Cross. Current
  Dust II has 8,739 triangles (22,141 before), 51 regions, eleven passing routes
  and zero uncovered samples; the ordinary 0.5 m coverage audit checks 20,101
  samples, excluding 740 occupied/margin samples. The restored lower route and
  its north support resolve the former Long A / CT floor gap. Long climbs north
  to Goose above the site; the shallow stairs descend south onto A. Independent
  direct routes reject detours that previously masked the disconnected approach.
  Both strict surface-contact and floor-gap checks pass with zero diagnostics.
  Authored overlap warnings remain active; walls/floors/stairs stay separate.
- Physical material UVs and connected xatlas charts preserve corner identity.
  Curved ramp strips unfold across shared edges to preserve scale and checker
  continuity. Bounded subpixel float32 UV repairs retain connected charts and
  record their magnitude. Dust II draft/final atlas audits and actual mesh checker
  renders are retained under `generated/uv-inspection`, including editable Blender
  sources. Floors, ramps, treads, risers and retaining walls are inspected separately.
- The viewer opens with a 45% plan / 55% 3D workspace; utility panels are closed.
  Both views pan, touch controls and independent Fit actions work, and selections
  do not reveal source. Cameras persist across recompilation and panel changes.
  Plan tread lines come from compiled geometry. Navigation shows selectable failure
  markers and region coverage. Workers publish geometry, navigation, then optional
  atlases; cancellation and errors retain a clearly marked last valid preview.
- Optional isolated Cycles bake; actual Blender 5.1.2 unit-light, colored-bounce,
  HDR/alpha and packed-reload calibration passes. Exact compiled mesh parts,
  global padding with independent coverage, chart-aware mips, raw EXRs and `.blend`
  sources are retained. The viewer verifies hashes and rejects stale lighting.
  An earlier six-mesh showcase was baked and loaded in the viewer. Reloading its `.blend`
  preserved all positions exactly and both UV channels within float32 precision.
  Geometry/UV changes in this refinement invalidate those earlier lighting manifests;
  they require a fresh bake before use with the new meshes.
- All 381 ASCII plans and nine JSON levels have SVGX conversion candidates under
  `maps/vector`. The one-shot adapter lives under `tools/migration`.

Open release gates:

- The first complete corpus validation found 210 regressions in navigation,
  marker placement or route semantics compared with the legacy validator. The
  report is `generated/migration-report.json`. Those results predate the latest
  structural mesh separation and must be rerun after remaining navigation work.
  Conversion success is not validation parity.
- Complete semantic/physical graph comparison, special traversal semantics and
  legacy pocket/marker tolerances require corpus reconciliation. The new sampled
  clearance checks do not by themselves establish legacy validation parity.
- Complete gutter and distortion audits, asymmetric orientation and distant-mip
  acceptance fixtures, and installed Three.js GPU calibration still need coverage.
- External material texture packaging and remaining source/export round trips
  need completion. The baker explicitly rejects unresolved external textures.
- Existing generators/tracing tools still use the old authoring paths. They are
  not retired. The public root API, CLI default and package version remain 1.x.

Verification is recorded in `generated/dust2-refinement`: the full suite passed
309 tests, and the final focused suite passed all 67 vector tests. Both runs have
zero failures. Type checking,
the viewer build and overlay acceptance pass after the final corner
repair. Draft/final atlas audits pass at 8/32 texels per metre (2/8 pages). Actual
Dust II browser/Node geometry and UV hashes match. Coverage
includes curved/tapered/reversed flights, malformed rails, separate mesh parts,
stair-wall complexity, actual tread navigation, stacked low ceilings, narrow
corridors, dynamic state/cache invalidation, GLB channels and stale bake rejection.
Browser acceptance and actual-mesh checker evidence accompany the generated map.

The subsequent floor-gap audit is recorded in `generated/floor-gap-qa`: type
checking, the viewer build, default compilation/export and strict-mode rejection
pass. The browser shows the warning and opens its source location. The existing
checker renders above predate the additional retaining seam faces; compiler
revision `levelspec-2-preview-5` rejects earlier lighting manifests.

The T Spawn correction is recorded in `generated/t-spawn-correction`: the
compiled ramp falls east from Z=3 to Z=2, with no north/south height gradient.
All 88 vector tests, type checking, viewer build, navigation, UV generation and
overlay acceptance pass. Matched top, oblique and low-angle renders use the
compiled triangles, and the running viewer loads the revised 49-region map.

The subsequent wall/floor contact audit is recorded in `generated/wall-contact-qa`.
All 102 vector tests pass, including 14 new contact fixtures; type checking,
viewer build, ordinary export and strict-mode rejection pass. The viewer displays
24 new wall/slab overlap warnings plus the prior floor gap, and selecting a
warning reveals its exact XML edge. The audit leaves the geometry hash unchanged.

The A Short / CT / Long A correction is recorded in `generated/a-ct-correction`.
The upper site connection is flat; the CT ramp and adjacent stairs rise east
below it, through a landing into Long A. All 104 vector tests, type checking,
viewer build, strict floor-gap compilation/export and overlay acceptance pass.
All eight required routes pass with zero uncovered navigation samples and no
floor-gap warnings. There are 21 remaining wall/slab contact warnings. Matched
actual-mesh renders and CS2 reference observations accompany the correction.
The browser displays the revised 8,594-triangle, 52-region map and keeps utility
panels closed during selection. This remains the LevelSpec 2 preview.

The final Long/Goose and wall-contact pass is recorded in
`generated/long-a-correction`. Same-provider CS2 lineup coordinates confirm
Goose above A Site. Long now reaches A directly in about 47 m instead of a 111 m
detour. All 108 vector tests, type checking, viewer build, overlay acceptance,
and strict compilation with UVs/export pass. Final Dust II has zero compiler or
runtime diagnostics and eleven passing routes. Matched overview, oblique,
CT-exit, Long approach and Goose stair views use exact compiled triangles.
Compiler revision `levelspec-2-preview-6` invalidates older lighting manifests.

Local commands and XML grammar are documented in [SVGX.md](SVGX.md).

Implementation references: the installed `blender-uv-textures`,
`blender-threejs-baked-gi`, and `blender-threejs-asset-pipeline` skills guided the UV
and lighting contracts. The calibration and linear EXR helpers under
`tools/lighting` were adapted from the baked-GI skill's calibration/I/O fixtures.


The multi-format export update is documented in [EXPORTS.md](EXPORTS.md).
GLB and glTF now package material images, retain marker/source metadata, and
convert UV orientation consistently. The optional Node backend adds binary FBX
through Blender and Quake BSP2 through checked brushes plus ericw-tools. The
CLI and viewer offer format selection, staged publication, progress and
cancellation. The local viewer service accepts uploaded image bytes, not client
filesystem/tool paths. Legacy authoring APIs remain unchanged.

Export acceptance under `generated/export-qa` includes Khronos validation,
Three.js loading, exact serialized attributes, Blender FBX/GLB triangle-corner
round trips, matched textured renders, Godot import, actual BSP collision and
visibility/light lumps, all-format viewer downloads, and Dust II brush-volume
comparisons. This closes base-color PNG/JPEG export packaging, but does not add
external texture support to the lighting baker or automatically bind baked light
in destination engines. Unity and in-game Quake rendering still need acceptance
on installations with those applications/assets. Clipped-portal warnings from
ericw 0.18.1 are preserved in the BSP export report.
