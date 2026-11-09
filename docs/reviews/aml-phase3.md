# AML phase 3 implementation and acceptance

Phase 3 adds native circulation and bounded maintained map examples. AML remains
version 1; runtime JSON 3 and native export metadata 2 are independently versioned.
Meters and right-handed Z-up remain the domain contract.

## Implemented behavior

- Native center-path and paired-rail stairs/ramps, varying width, ascending and
  descending flights, exact counts or scaled maximum risers, nonlinear ramps,
  horizontal treads, and filled/sloped/stepped/custom/separate undersides.
- Host-owned wall/parapet/curb/railing attachments, partial spans, signed offsets,
  independent stepped tops, footprint holes, explicit entrances/returns, open
  rails/posts, complete-host openings, assembly/provenance and lifecycle budgets.
- Reusable definitions/instances and source longitudinal inspection profiles.
- Navigation T-junction adjacency with bounded comparisons, without connecting
  unsupported gaps, stacked floors, or vertex-only contact.
- Read-only physical capsule support and clearance per inspection movement
  substep, authored step/slope limits, actual composed-solid identity, closed
  cavity parity, and geometry-aware cache invalidation.

The physical walker does not alter meshes, body dimensions, navigation, or route
limits. Substep traversal is evidence, not continuous gameplay physics proof.
Recast's existing zero-step slope voxel limitation is unchanged; an exact supplied
navigation fixture isolates the physical slope resolver in its unit test.

## Maintained maps

`examples/circulation.aml` demonstrates six construction modes and a reusable
landing module. `examples/dust2.aml` replaces mechanical profile boilerplate with
editable footprints/datums and consolidates six collinear wall runs. All sixteen
original route IDs, endpoints, minimum counts and local distance caps remain.
Independent collision/elevation probes cover tunnel, B, CT, Short, T Spawn,
Long/Goose and Pit relationships. Mechanical migration equivalence is separate
from maintained-source acceptance.

`examples/daiban.aml` is a source-led bounded courtyard study, not a reconstruction
revision of R19. Three originals and reviewed plans/sections are in
`reference/daiban/`. Native apertures, profiled screens, independent soffits,
galleries/planters, rails, recessed panels, column and overhead construction are
present. Four explicitly local routes pass. The standing body remains 2m tall
with .25m radius. Five projected floor-gap warnings correspond to separate
storeys; actual declared joins and replayed routes retain physical support.

The source packet discloses estimated backing surfaces and a physical planted
base at Z=-.8. No complete building loop, unseen room, or water medium is inferred.
Historical SVGX studies, frozen sources and project CURRENT pointers are unchanged.

Photographic fidelity remains **HOLD**. Backing surfaces address missing dark
pockets, but the primary camera is approximate and portal spacing/foreground
railing occlusion differ materially. High/overhead registrations are incomplete.
Those differences cannot yet be assigned solely to geometry. Drawing-stage
release, compiler behavior and traversal do not release photographic acceptance.

## Independent reviews

The test reviewer assessed requirements and independent geometry expectations
before production implementation, then reviewed each material follow-up. Final
circulation/CAD/physical scope: 70 independently rerun tests pass, no material test
findings. The separate implementation reviewer also independently ran 70 affected
tests plus types; no remaining material findings in that scope.

Review findings fixed include scaled stair bounds, span admission, returned-host
cuts, exact partial-edge adjacency, high-ledge creep, sloped capsule contact,
source-vs-final solid identity, cavity containment, and metric bent returns.
The fidelity reviewer independently inspected all originals and actual captures;
the photographic HOLD remains explicit.

## Verification record

- `npm run check`: pass.
- Final Node run: 532 pass, 1 optional skip (533 tests).
- Native raw route replays: all sixteen Dust II and four Daiban paths pass through
  production physical movement, without teleportation/steering or relaxed caps.
- All eight maintained AML sources: actual XML Schema validation passes.
- Viewer and site production builds: pass (existing bundle-size warnings).
- Daiban browser: overview/plan/three reference cameras and four continuous native
  keyboard walkthroughs pass. Capture matrices and assumptions are retained.
- Existing eight preview browser scripts: first six pass; walk expectation updated
  from navigation to physical status, then walk and remaining navigation-cell
  scripts pass with all original geometry/input/recovery assertions retained.
- Production site/viewer browser: passes including offline, mobile/accessibility,
  retained Dust II, sparse-frame walking, cancellation and WebGL fallback.
- Site Node suite: 23 pass, 1 existing Cycles bake source-checksum mismatch. The
  stale bake assertion was preserved; no checksum or source was rewritten.

Generated logs, raw movement traces, captures and export diagnostics live under
ignored `generated/aml-phase3*`. Native default UV exports exposed a float32 atlas T-junction issue during final
verification. The fix preserves raw source vertex identities, including real thin
faces that float32 collapses, and uses authoritative atlas input identity for shared
UV adjustments. Contact uses raw longitudinal stations; physical sidedness remains
strict. Recorded per-vertex guard movement and vector float32 error bound eligibility;
aggregate displacement stays below .125 texel. No physical geometry changes,
per-triangle fallback, or overlap/density waiver was introduced.

Both independent reviewers subsequently reran all 12 UV cases, including both
native maps and the legacy Dust II atlas. All pass with no material findings.
Default CLI builds for both native maps now succeed with atlases, GLB, OBJ, SVG,
runtime JSON and metadata. Independent glTF Validator checks report zero errors
and zero warnings for both actual GLBs. UV displacement maxima are .000737 texel
for Daiban and .003174 texel for Dust II; runtime statistics record the repairs.
Tests preserve every render position/normal/index/material UV/surface, physical
hash and collision triangle, and retain genuine-fold and density negative controls.

Terrain, native BSP, general constraints/scripting, and final SVGX producer/API
retirement are later phases. Optional native BSP prerequisites remain unavailable.

Final source, reference, capture and route-trace SHA-256 identities are recorded in
`generated/aml-phase3-evidence.json`. The final Daiban browser capture was repeated
after the UV fix; compiler-only UV work does not alter the photographed geometry.
