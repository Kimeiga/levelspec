# AML phase 4 implementation and acceptance

Phase 4 implements native terrain and level metadata. AML stays XML version 1;
runtime transport is version 4 and native export metadata is version 3. Domain
coordinates remain meters and right-handed Z-up. [Terrain contracts](../TERRAIN.md)
describe syntax, policies, tolerances, resource bounds, and current limits.

## Delivered behavior

- Numeric grids; exact 8/16-bit grayscale PNG decoding, filters, CRC and zlib
  checksum validation; constrained profiles with holes/interior points/breaklines;
  explicit open patches; transformed local closures; checked solid terrain CSG.
- Host-local grading, varying width, crossfall, lateral/end transitions, explicit
  overlap order, compatible junctions, conforming refinement, and preserved holes.
- Separate permissive terrain policy: open/intersecting/buried terrain is allowed;
  exposed duplicate faces fail, near-coplanarity warns, authored orientation is
  checked where established, and invalid CSG operands fail locally. Diagnostic
  exposure preserves partially buried pieces and actual solid cavities.
- Architecture assemblies and collision boundaries retain independent closed terrain until an explicit
  solid operation. Shared-edge assertions check complete spans on both retained
  native hosts and final geometry; unrelated replacement support cannot pass.
- Indexed tile geometry and seam normals, spatial partitions of derived patches
  and final closed/CSG terrain, finite world bounds, stable hashes, dependency halos,
  byte-bounded normal caching, per-compile cache counters, and bounded work.
- Rooms, zones, inert gameplay metadata, full transformed extrusion vectors,
  actual clearance and complete-footprint support checks. Explicit playable zones
  bound land/water navigation without cropping overhead collision or filling gaps.
- Separate water/seabed/depth/headroom checks; native proxies remain physical while
  imported visualization meshes remain excluded from architectural checks/support.
- Native builder helpers, schema/parse/serialize support, bounded CLI/preview PNG
  loading, companion publication, and opt-in read-only volume/grade/tile overlays.
- Canonical native-only `physicalMesh` accompanies transported tile ranges, independently of
  render material partitions and filtered collision output. Imported visualization
  geometry is appended only to rendering after physical capture.

The normal cache reuses derived tile normal sums. It does not claim to skip source
resolution, PNG loading, content hashing, composition, or navigation after edits.
Terrain facet UV grouping retains coplanar charts and bounds source groups and
resulting packed charts; strict UV density/overlap audits remain authoritative.

## Independent reviews and repairs

`phase3_test_review` served as the independent phase 4 test author/reviewer before
production slices. Public expectations use known planes/volumes, independently
encoded PNGs, measured world bounds, actual physical support/collision, and fixed
route endpoints/distance limits. Coverage includes negative outcomes, cancellation,
source immutability, cache mutation isolation, failed-attempt recovery, and limits.

`phase3_implementation_review` separately reviewed implementation and corrections.
Resolved findings include cumulative raster admission, final world validation,
unused/zero-average normals, clearance blocker identity, playable ceiling retention,
spatial-query accounting, grading world bounds and finite segment constraints,
exposure plane deduplication, bounded BVH/candidate work, normal-halo admission,
linear assembly membership, final tile transport referents, reflected raw winding
assertions, imported-visualization exclusion from canonical physical output, and
UV chart admission.

Real browser walking exposed a numerical boundary issue missed by 0.04 m-only
replay: 0.004/0.01 m increments could lose valid triangle support. An independent
red timestep test preceded the fix. Closest-point contact admits at most 10 nm
of boundary roundoff; no mesh/player/route settings change. All three increments
now traverse the same actual road and tunnel. Browser WASD passes independently.

The invented course passed separate construction/circulation review. It deliberately
has two independent land components and a separate water route. The disconnected
tunnel suggestion is expected. Its overhead bridge tests boat clearance; it does
not claim a land crossing with approaches. Water evidence is checked navigation,
depth, and overhead clearance, not a boat gameplay walkthrough.

## Verification evidence

Reproducible outputs and logs are under ignored `generated/aml-phase4/`:

- Type check and final Node suite: `types.log`, `node.log`; 611 passed, one skipped
  (612 total), including normal-dependency, reflection, and visualization controls.
- A real 1000×1000 PNG compiles into 1,000,000 indexed samples, 1,996,002 triangles,
  and 256 tiles, with default geometry diagnostics and a required route in a small
  playable zone. Independent focused runtime was approximately 4.6 seconds.
- Course CLI validation/build succeed: `course-validation.json`, `course-build.json`,
  `course-export/`. Strict UV/float32, render/collision GLB, shallow-water,
  low-bridge, missing-ground, and blocked-tunnel controls pass in Node tests.
- Terrain browser: `browser.log`, `browser/evidence.json`, `browser/*.png` cover
  overlays/source selection, two actual WASD walks, same-path PNG edits, invalid
  PNG stale-state errors, and restored-byte recovery, with no page errors.
- Full preview browser suite: `preview-browser.log`; CAD/circulation browser suites:
  `cad-browser.log`, `circulation-browser.log`. The focused companion-GLB preview
  check was repeated after the canonical-physical exclusion fix:
  `preview-visual-browser.log`.
- Viewer/site production builds: `viewer-build.log`, `site-build.log`. Production
  site/viewer browser checks pass, including offline reload, cancellation/retry,
  walking, context recovery, and the Dust II load: `site-browser.log` and
  `site-browser/`. The initial offline run used a URL base inconsistent with the
  build; rerunning with the actual root base resolved it without a code change.

The curated site Node suite retains a previously recorded Cycles bake/source
checksum mismatch: 23 passed, one failed (24 total). Stored bakes were not
regenerated or their assertions weakened. See `site-node.log` for the exact result. Optional native Blender/FBX/BSP exporter
acceptance is not claimed by this phase's GLB checks.

## Boundaries

This is level-scale terrain, not world streaming, GIS, or terrain LOD. Grade hosts
are height surfaces rather than arbitrary faceted overhangs; use explicit native
solids/CSG for those forms. Refinement checks midpoint/centroid residuals, rather
than claiming an independently established global interpolation-error proof.
Navigation sampling and finite capsule walkthroughs do not prove continuous
physics/gameplay behavior. The million-sample check is a compiler/navigation
workload check; it is not a million-sample browser walkthrough or UV export claim.

Final SVGX API/producer retirement remains phase 5. Historical studies/reference
packets remain source evidence. Daiban photographic fidelity remains on hold as
recorded in phase 3; phase 4 does not revise that judgment.
