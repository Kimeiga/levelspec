# Architectural review suggestions

The compiler exposes active review suggestions as ordinary **warning diagnostics**.
They ask an AI or a person to inspect potentially unintended geometry. The
`suggestions` array retains measurements and acknowledgment state. Warnings never
fail validation, block exports, or modify collision, navigation or materials.
Definite invalid references and demonstrated violations of declared requirements
remain errors.

The reviewer’s warning list and Suggestions panel provide Inspect, Cutaway, Copy review link and
Copy suppression XML. Inspect highlights the involved objects and affected span
in either 2D or 3D. Restore previous view returns to the prior camera and layer
settings. Cutaway removes geometry above the finding while preserving its context.

`validate --json` and `build --json` return a `suggestions` array. Every finding has
source objects/locations, Z-up meter bounds and position, inspection direction,
measurements, stable ID, fingerprint and active/suppressed state. The `review`
record contains a relative reviewer URL and argument array for the local CLI.
Start a reviewer using `preview <source> --suggestion <id>`, or append the relative
URL to a reviewer already serving that source. Links do not upload or identify
local files; they apply to the source loaded in that reviewer. Explicit camera
parameters preserve their framing while selecting and highlighting the finding.
Build writes `<level-id>.suggestions.json`; gameplay runtime JSON does not contain
review findings. Geometry suggestions are available with geometry-only compilation, before
navigation finishes. Navigation suggestions arrive after the unsealed walking bake;
the reviewer waits for this result when opening a navigation suggestion link. No AI service is called by the compiler.

The prototype checks:

- `WALL_ALIGNMENT`: nearly parallel wall faces continuing end-to-end, with offset
  over 2 mm through 10 cm, end separation at most 25 cm and vertical overlap of
  at least 25 cm. Angular tolerance is 1 degree. It compares exposed side faces,
  including wall thickness, and excludes overlapping parallel runs.
- `FLIGHT_WALL_GAP`: a stair/ramp side with a nearby boundary separated by more
  than 2 mm through 25 cm. Walls, glass and railings all count as boundaries.
- `FLIGHT_OPEN_SIDE`: an entirely or partly open stair/ramp side, including
  boundaries farther than 25 cm away. Landing ends are excluded. Side coverage
  is tested 5 cm above the continuous flight guide, accounting for openings;
  this is a geometry review heuristic, not a guard-height or building-code check.

- `ROOF_STEP_OPEN`: exposed flat roof boundaries adjoin within 2 cm in plan,
  over at least 1 m, with a vertical gap of at least 0.5 m between lower roof
  top and upper roof underside. Interior samples lack solid closure. This can
  be an intentional terrace, so inspect it rather than inferring a closed shell.
- `WALL_ABOVE_ROOF`: a visible wall crosses a roof plane and extends more than
  1.5 m above the highest roof covering its midpoint. This catches common wall
  remnants while leaving ordinary parapets quiet. Setbacks, partial roof coverage,
  curved/nonflat roofs, and complete building enclosure are not certified.
- `ARCHITECTURE_REVIEW_INCOMPLETE`: bounded roof/wall analysis could not finish.
  The warning identifies source objects and a review target; inspect manually.

Findings are grouped by source wall pair or flight side, rather than triangles
or stair treads. Their bounds cover affected spans; uncovered length is aggregate.
Threshold comparisons allow 0.01 mm of mesh construction noise. Intentional double
walls, open stairs and other design decisions should be reviewed rather than
silently repaired. Detection thresholds are fixed in this prototype.

## Acknowledging intentional geometry

Copy the XML annotation from the finding, replace its reason with the review
rationale, and add it directly under `<architecture>`:

```xml
<review-suppression suggestion="finding-id" fingerprint="copied-fingerprint"
  reason="Intentional open stair beside the courtyard"/>
```

The UI remains read-only. Each annotation acknowledges exactly one finding at its
current local geometry. Relevant edits invalidate the fingerprint and reactivate
the suggestion and its warning. Exact acknowledgments remove the active warning. The panel then shows the old reason with “Geometry changed;
review again.” Replace the existing annotation after reviewing again; duplicate
annotations for one finding are rejected. Comments, formatting, labels, material
appearance and unrelated geometry leave the review valid. Detector revisions can
also invalidate fingerprints. Stale or no-longer-applicable annotations remain
in the XML until an author removes them; compilation never rewrites source.

## Walking navigation suggestions

`NAV_ISLAND` flags a component whose horizontal navigable footprint is under
2 m², or which is disconnected from the largest network by footprint area. One
finding combines both reasons. Spawn markers do not exempt detached islands.
Actual Detour polygon links determine components, including cross-tile connections
and enabled one-way traversal links. Directional reachability remains the job of
existing route validation; the older report component count retains its semantics.

`FLIGHT_NAV_MISSING` flags stairs or ramps with no usable walking navigation
coverage. A detached but navigable flight receives an island finding instead.
Messages include coverage reasons without assuming a missing path is the cause.
Boat navigation is excluded. These checks never alter validation outcomes.

Navigation reports include componentDetails and a triangleComponents entry for
each exported triangle. Disabled polygons use an empty membership ID. Component
IDs use sorted source region IDs and deterministic spatial ordering, independently
of temporary Detour references. Inspection highlights the exact island in either
view and restores the previous navigation overlay setting afterward.

Compiled navigationSuggestionsStatus distinguishes pending, complete and
unavailable analysis. Geometry-only or failed bakes do not imply successful
navigation review. XML suppressions use the same existing mechanism; relevant
local geometry, connectivity, player settings and navigation resolution invalidate
prior review decisions.


Spatial warning diagnostics include `review` bounds, position, direction and ID.
CLI JSON adds a relative URL and `preview <source> --diagnostic <id>` argument
array. Warning links select the same geometry as suggestion links, and the
warning row can copy acknowledgment XML. Source offsets refresh independently
of cached geometric evidence.
