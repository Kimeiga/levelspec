# Architecture Markup Language

AML is LevelSpec's native XML authoring format. Use `.aml`; the same document can
use `.xml`. SVG is a drawing/export format. The package root and normal CLI inputs
accept `<architecture version="1">`, not SVGX.

The [XML schema](../schema/aml.xsd) defines structural vocabulary. `parseAml`
provides source-linked vocabulary diagnostics; `compile` resolves references,
construction relationships, physical geometry, collision, and navigation.

## Start a project

```sh
npm run --silent levelspec -- init projects/my-level
npm run --silent levelspec -- validate projects/my-level/level.aml --json
npm run --silent levelspec -- preview projects/my-level/level.aml
npm run --silent levelspec -- build projects/my-level/level.aml --out generated/my-level --json
```

The [starter](../src/cli/templates/starter.aml) contains a slab, perimeter wall, native
circular opening, and spawn. Dimensions are meters and coordinates are
right-handed Z-up. Exporters own axis conversion. Authored linear dimensions are
normalized to millimeters before resolution; transforms and intersections are
not snapped again. Curve approximation, physical clearance, and cleanup are
separate concerns.

```xml
<architecture version="1" id="room" validation="premap">
  <profile id="footprint" points="0 0; 6 0; 6 4; 0 4"/>
  <path id="front" points="0 0 0; 6 0 0"/>
  <assembly id="shell">
    <wall id="wall" path="front" thickness="0.2" height="3"/>
    <slab id="floor" profile="footprint" thickness="0.2"/>
  </assembly>
  <opening id="window" host="wall" shape="circle" center="3 1.5" radius="0.6"/>
</architecture>
```

## Source objects and composition

- Paths use semicolon-separated XYZ `points`, analytic segment children, or
  ordered shared `paths`. Prefix a path reference with `-` to reverse it.
  `line`, `quadratic`, `cubic`, `bezier`, and elliptical `arc` segments are supported.
  Arc angles are degrees. A path's optional `elevation="start end"` varies height
  by plan distance independently of its curve controls.
- Profiles use XY points by default or `dimensions="3"` for constrained height
  surfaces. They support shared `paths`, `<hole>`, XYZ `interior` points, and
  XYZ `<breakline points="…"/>` constraints. Broken loops and crossing constraints
  are errors, rather than automatically repaired connections.
- `<coordinate-frame>` uses a named parent `frame`, XYZ `position`, extrinsic XYZ
  `rotation` in degrees, and dimensionless `scale`. `<datum>` uses an elevation
  and optional parent datum. Slabs can use `datum` plus `offset` instead of an
  absolute `elevation`.
- Definitions contain native elements; instances reference definitions with
  `ref` and a placement. Expanded members retain stable instance-qualified IDs
  and source ancestry. Cycles and expansion-budget violations fail explicitly.
- Groups organize objects. Assemblies compose physical members. Static and
  dynamic collision states remain separate. Explicit booleans require closed
  native operands; visualization meshes and open patches cannot be operands.
- Walls reference paths and support center/left/right alignment, longitudinal
  `base`/`top` profiles, and explicit floor/soffit anchors. Longitudinal profiles
  use `(distance, height, 0)` points and can include vertical steps.
- Openings name a complete host. `center` is longitudinal distance and height
  for a wall, or local X/Z for a collection. Shapes include rectangles, circles,
  ellipses, semicircular arches, and shared profiles. Through-cuts, recesses, and
  notches remain distinct from separate panels, glazing, infill, and frames.
- Slab elevation offsets its profile. Thickness extends below its top. `flat`
  projects a footprint to an absolute elevation, useful for a ceiling over a
  nonplanar floor. Roof/canopy walking coverage is opt-in through `playable`.
- Native boxes/wedges use corner anchoring by default; `anchor="bottom-center"`
  preserves bottom-centered construction. Cylinders and cones use a bottom
  center; spheres use their center. Dimensions, extrusions, and sweeps remain
  editable native objects.
- Stairs/ramps accept `path` plus `width`, or `left` and `right` rails. Stairs
  accept exact `count` or `maximum-riser`. Filled, sloped, and stepped bodies
  retain actual horizontal treads. Native retaining walls describe explicit
  contacts between source paths.

`ArchitectureBuilder` creates these objects directly. `parseAml`, `serializeAml`,
and `compile` are available from `levelspec`. Compiled output retains the native
document as `architecture`, per-object `provenance`, and separate physical/render
hashes. Shared review/export backends currently also consume a derived runtime
semantic view; that view is not the authoring source or a geometry compiler.

## Architecture and CAD

The [architecture/CAD study](../tests/fixtures/aml/architecture-cad.aml) demonstrates native
profiled walls, a corner notch, circular aperture, constant-width frame, recessed
panel, hollow bent sweep, profile material partition, and solid subtraction.

`<face-material id="border" host="floor" face="top" profile="border-profile"
material="accent"/>` assigns existing exposed faces. Omit `profile` to assign the
whole selected face family. Selectors are `all`, `top`, `bottom`, `front` (-Y),
`back` (+Y), `left` (-X), `right` (+X), `side`, and opening-generated `reveal`.
Selectors use the host frame, including reflection/nonuniform scale. Partition
profiles may have holes and use `projection="xy|xz|yz"` (default XY). They split
render triangles without adding shells or changing collision, navigation, or the
physical hash. Overlapping assignments of different materials are errors.

Physical assemblies and booleans preserve exposed source materials. Conflicting
coincident exposed faces are errors; buried contacts and equal materials compose
normally. `material-owner="member-id"` chooses a descendant's material on its
shared exposed regions. Unique exposed faces retain their own materials. A chosen
collection must itself resolve to one material in each shared region. Nested
boundaries use the nearest applicable explicit ownership decision. An explicit
inner `coincident-material="error"` stops an outer retained-face policy.

Alternatively, `coincident-material="retained-face"` explicitly retains each
composed face's existing source contributor and material. Mechanical migration
uses this policy to preserve historical wall ownership. It follows deterministic
face retention for the ordered inputs and installed kernel; changing source order
or upgrading the kernel can change the choice, as with historical compilation.
Choose this policy or `material-owner` on one boundary. It does not suppress
conflicts between authored face-material partitions. Default native behavior is
`coincident-material="error"`.

Wall base/top profiles cover the entire drawn path, including ordered vertical
steps. A base profile and base-floor anchor are alternative base descriptions;
a top profile and soffit anchor are alternative top descriptions. `contact-floor`
asserts actual contact along the complete authored base, including custom profiles
and footprint holes. `fit-floor` only fits the foot locally where the named floor
meets it, preserving optional partial fitting during migration. It does not assert
support. Anchors use actual transformed soffit surfaces, including slab thickness.

Openings are positioned in their host's local coordinates, even when declared
elsewhere. Wall X is distance along the drawn path and Z is height above that path.
A named collection uses local X/Z. Placements and named frames apply in that host
frame. Through-cuts must intersect the host; notches must additionally meet its
projected boundary. Recess depth starts at the negative-Y face plus `offset` inward
and must leave a back web. Opening details use the same host frame with independent
placement and collision. Frame borders are physical profile offsets, including
ellipses and custom profiles, rather than scaled copies of the opening.

Extrusions retain profile holes. Sweeps use local XY cross-sections with holes and
optional triangulation vertices, transported along an open path before the full
instance transform. Their initial X axis is perpendicular to local Z and the path,
falling back to local X for a vertical path. Corners use miter sections. Reversals,
folded sections, closed paths, and self-intersecting sweeps fail explicitly. Geometry
products and intersection work are bounded before or during allocation.

Authored dimensions are normalized once. Kernel input welding permits only exactly
coincident vertices; a nonzero mesh repair requires authored intent and fails.
Material clipping adds coplanar subdivisions without moving the physical surface.
Atlas input identities merge only source double roundoff (16 × machine epsilon ×
coordinate scale), preserving real vertices even when float32 rounds them together.
After packing, native T-junction UV seams can receive tiny shared-vertex adjustments
bounded by recorded guard movement and float32 precision. Aggregate displacement
stays within 0.125 texel and is recorded in runtime statistics. Source/render corner
attributes and collision geometry do not move. Strict overlap, density, bounds,
and GPU float32 audits remain enforced; genuine folds still fail.
The reviewer exposes source profiles, host/assembly/instance ancestry, contributors,
and exposed materials beside the final scene. Runtime JSON includes a separate
collision mesh so render partitions cannot become physical topology.

## Explicit migration

```sh
npm run --silent levelspec -- migrate tests/fixtures/migration/dust2.level.svgx \
  --out generated/dust2-migration --json
```

Migration creates a new `level.aml`, `migration.json`, and content-addressed
companions. It never overwrites the source or an existing destination. Required
companions are snapshotted before publication; failures remove only a newly
created output directory.

This is mechanical source translation. Sliced circular approximations remain
rectangular slices. Existing wall-network composition boundaries, constrained
surfaces, flight parameters, anchors, route limits, and metadata are retained.
Imported meshes become visualization-only objects; old physical behavior becomes
a separate native faceted or bounds proxy. Rotated primitives keep their authored
anchor, avoiding a second quantization of a derived translation.

The library migration entry point is `levelspec/migration`. Supply `resolveAsset`
when imported physical geometry must be frozen. Ordinary compilation never fetches
an asset URL; I/O belongs to the host.

## Native circulation

[Circulation constructions](../tests/fixtures/aml/circulation.aml) demonstrate native stairs,
ramps, independent undersides, tapered flights, attachments, and reusable modules.
Flights select a center `path` plus `width` or `width-profile`, or explicit `left`
and `right` rails. Width profiles use local plan distance and width. Paired rails
share normalized plan stations; their mean plan length defines longitudinal
profile distance. Ascending and descending flights retain horizontal stair treads.

Stairs select an exact `count` or an explicit `maximum-riser`, never both. The implicit
maximum is 0.18m when neither is specified; world vertical scale is included.
Placement may translate, yaw, reflect, and scale, but cannot tilt stair treads.
Ramps retain intermediate authored elevations and do not accept stair counts.
Native flights use explicit canopy/roof objects for overhead construction.

Stair `underside` is `filled`, `sloped`, `stepped`, `custom`, or `separate`.
`thickness` controls the soffit offset or individual tread slab thickness.
A stepped solid requires enough thickness to connect successive risers; separate
treads have no implicit wedge. Custom `underside-profile` paths use ordered local
plan distance/elevation samples, including vertical steps, cover the flight, and
remain below every walking top. The reviewer exposes longitudinal walking tops
and custom underside source profiles separately from final geometry.

An `enclosure` names its `host` and opts into `left`, `right`, `start`, or `end`
on a flight, or explicit footprint `loop`/`edge` indexes on a slab, landing, roof,
or canopy. Side direction follows the authored path. `start`/`end` span distances,
signed `offset`, `start-return`, and `end-return` constrain its construction.
Positive offset/returns point toward the selected side. Entrances stay open unless
explicitly selected. Wall/parapet tops follow the continuous guide plus height;
curbs follow treads; optional `top` is an independent absolute local-elevation
profile. Bottoms follow actual tread support. Railings require explicit `rail`
profile children and optional `posts` with positive `maximum-spacing`; gaps remain
physically open. Returns retain the same rail/post construction.

Attachments join the host's physical assembly, creating a boundary when needed,
and inherit its visibility, collision, and dynamic state unless overridden.
Explicit conflicting assembly ownership fails. Openings cut the complete attachment,
including returns. Their coordinate contract is host-local X/Z, like named
collections; it is not distance unrolled around an enclosure.

Connections require valid endpoint references and final physical support. A supplied
`path` must resolve to a nonzero world-space mouth span. An omitted optional path
produces `CONNECTION_UNVERIFIED` during navigation analysis. Paths describe entrance
spans, not movement centerlines. A completely obstructed mouth produces
`CONNECTION_BLOCKED` even when an endpoint route can detour elsewhere; an unverified
sampled crossing remains a warning.

Land route counts share one physical-resource analysis across compilation, CLI
validation and producer publication. Duplicate, reversed, overlapping and contiguous
mouth declarations share capacity; separated mouths and enabled directional ability
links can supply independent resources. A reachable endpoint path establishes at
least one route. Additional verified resources form a conservative lower bound.
`maximumDisjointRoutes`, when present, is an optimistic bound over grouped declared
resources. Flat-domain cuts use native solid sections only when support stays within
the represented elevation and footprint; raised, lowered or undeclared bypasses
keep connectivity optimistic. Missing ownership or contradictory evidence removes
the upper bound. A proven shortage is `PHYSICAL_ROUTE_REQUIREMENT`; an inconclusive
shortfall is `PHYSICAL_ROUTE_UNVERIFIED`, a nonblocking warning. Neither result proves
continuous gameplay reachability. Water route counting retains its existing contract.

With sealed analysis requested, explicit connection and route failures also apply
with dynamic barriers closed. Generic closed-state floor coverage remains a separate
report unless a route/connection requires it. `NAV_HEADROOM` and `NAV_WIDTH` report
measured clearance, blocking source objects, and local inspection bounds. Representative
failures survive the detailed sample cap for every region/reason.

Navigation route reports expose
copied Z-up `path` coordinates for inspection. The reviewer moves through existing
navigation with physical capsule support, step limits, and standing clearance on
bounded movement substeps. It does not add support, widen openings, or change the
player body. Final physical-solid IDs remain independent of face contributors so
boolean and opening surfaces preserve interior collision. Recompilation or physical
mesh replacement invalidates the movement cache. These checks are traversal evidence,
not continuous gameplay physics proof. Recast's existing zero-step slope voxel
limitation remains; physical slope tests isolate that limitation with supplied exact
navigation geometry.

## Delivery status and acceptance

Foundation, architecture/CAD, and native circulation are implemented. The native
[Dust II source](../examples/dust2.aml) uses editable footprints, elevation datums,
and consolidated walls. All sixteen original route assertions retain their
endpoints, player dimensions, minimum route count, and local distance limits;
actual paths replay through the physical inspection walker. Its
[spatial contract](../reference/dust2/README.md) remains the authority for estimated
dimensions and reference evidence. Mechanical migration is tested separately.

The bounded [Daiban courtyard](../examples/daiban.aml) contains native apertures,
profiled screens, distinct stair soffits, galleries, planters, rails, recessed
panels, a column, and overhead construction. Four explicitly local routes replay
with unchanged standing dimensions. Its [source packet](../reference/daiban/README.md)
records estimated geometry and reviewed plans/sections. Photographic fidelity
remains on hold: primary camera registration and high/overhead comparisons are
incomplete. Compiler and traversal success do not release that separate judgment.
Historical SVGX studies and frozen reconstruction evidence remain unchanged.

The [phase 3 review record](reviews/aml-phase3.md) records scope, checks, review
findings, and limits. [Phase 4 terrain and level metadata](TERRAIN.md) adds
heightmaps, constrained patches, grading, targeted exposure checks, bounded playable
zones, clearance assertions, tiles, and caching. Phase 5 cuts maintained CLI, reviewer, generators, tracing, reconstruction, and
exports over to AML. SVGX authoring APIs and JSON/Python design-plan frontends are
retired; the private read-only SVGX decoder is used only by explicit migration.
Historical studies remain in place and require their recorded revision for exact
compiler replay. [Producer interfaces](PRODUCERS.md) describe the supported native
entry points.
Imported visualization geometry stays excluded from architectural and physical
checks; native proxies are independently checked. Runtime JSON version 4 and
native export metadata version 3 remain independent of AML version 1.

The [phase 5 cutover record](reviews/aml-phase5.md) records the native API retirement,
export/lighting checks, independent reviews, and remaining acceptance limits.

Paper wall decals can be authored as `<poster>` children of `<dressing>`, independently of wall finish recipes. See [poster placement and the shared atlas](DRESSING.md#paper-posters-on-walls).
