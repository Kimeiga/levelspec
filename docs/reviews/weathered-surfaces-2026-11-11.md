# Weathered surface implementation review

Status: paused at the user's request, 2026-11-11, pending pipeline optimization by another agent.

The user asked to stop this visual iteration until the generation pipeline is
optimized. The active 6M preview build was stopped (exit 143); no further builds,
captures, tests, or visual changes should run from this work until it resumes.
Keep the current floor-border study and the previous published full demo intact.

Current user direction: prioritize visual experimentation and reduce testing.
Broader Node/browser matrices and additional test authoring are deferred. Use
quick build checks and focused reproduction of visible defects while iterating;
do not describe the unfinished full-scene rollout as accepted.

Current experimental rollout changes:
- Floor tiles now use a continuous wall-style erosion field across connected
  pours, rough curved chips, and the existing whole-unit peel policy. The second
  visual iteration strengthens only border loss (0.85 m reach, 37.5% stronger edge
  term); the interior and independent defect rates are unchanged. Study builds
  at 146,852 triangles; matching screenshots use suffix `floor-border`.
- A real missing asphalt rim on uneven terrain was traced to a wall-corner
  rejection rule. Paired faces with the same oriented displacement axis now
  retain their rim despite differing native terrain normals. The exact prior
  gap is repaired. The later puddle test positive control was too small to be a
  useful clearance case; no full water-validation pass is claimed.
- After the measured 72% reduction on the difficult ground square meter, the
  fixed 20M sample allowance still underused the existing scene triangle budget.
  Sampling now scales at 64 samples per allowed triangle, with a 20M floor and
  128M ceiling. It remains compile-wide. The subsequent full build reached the
  inherited 2M triangle ceiling and failed atomically after 35m48s.
- The last full atomic preview attempt used an explicit **demo-only 6M
  triangle ceiling**. The compiler default remains 2M; the 128M sample ceiling,
  20M subdivision cap, contour/height tolerances, cancellation and cache bounds
  are unchanged. The one-line builder change passed typecheck and independent
  implementation review. This is experimental resource headroom, not a final
  output estimate or runtime-performance acceptance. No replacement scene has
  been published.

## Current experimental evidence

- Current material study: **146,852 triangles**, screenshots with suffix
  `floor-border`, and browser capture reports `errors: []`. This is the latest
  floor-border erosion iteration, not full-scene acceptance. No current final
  GLB-validation result is claimed.
- The new full atomic demo build is **user-canceled, not published**, with the demo-only
  6M triangle ceiling and compile-wide 20M–128M sampling policy. It follows the
  conclusive 2M-limit failure recorded below. The previously published scene
  remains available.
- The uneven-ground asphalt rim reproduction is repaired. The later public
  fixture's puddle positive control was too small for meaningful clearance
  coverage, so it does not establish a water-validation pass.
- Broader acceptance matrices and additional test authoring remain deferred at
  the user's request. Historical passes below apply to their recorded snapshots.

Latest screenshots: `generated/weathering-study/overview-floor-border.png`,
`floor-floor-border.png`, `tiles-floor-border.png`, `asphalt-floor-border.png`,
and `plaster-floor-border.png`, with matching reversed/grazing-light captures.
The `*-finite-ground-before-floor.png` files retain the floor-art baseline;
`*-no-rim.png`, `*-finite.png`, and `*-release.png` are earlier comparisons.
Resume sharing visible milestones when the user resumes the visual work.

## Pipeline optimization handoff

The expensive phase is procedural surface partitioning in
`src/dressing/surface/regions.ts`, before final joining, export, or browser review.
The 6M run logged 979,915 input triangles: 60,200 geometry receivers and 919,715
untouched triangles. At cancellation after 24m20s it had reached courtyard section
73/206, with 16.98M samples, 4.93M subdivision nodes, 679,608 generated records,
and a 1.63M triangle lower bound.
Those are progress measurements, not completed output. Heap use was below its
limit; repeated ground sampling and partition work remain the measured bottleneck.

Evidence: `/tmp/weathering-full-preview-6m-user-canceled.log`,
`generated/weathering-debug/full-preview-run-result-6m-user-canceled.json`,
`generated/weathering-debug/full-preview-6m-sources/`, and
`generated/weathering-debug/full-preview-run-result-2m.json` (the preceding
completed failure; see the failure summary below). The diagnostic loader archives
loaded module bytes for the 6M attempt. Preserve the field appearance and the
latest `floor-border` captures when comparing optimizations. Broad test expansion
remains deferred; use focused visual and build evidence during experimentation.

## Historical acceptance and performance evidence

These completed runs apply to earlier source or budget snapshots. Their validation
results and resource figures are comparison evidence, not acceptance of the
unfinished full-scene rollout.

- The full atomic run at the inherited **2M triangle ceiling failed after 35m48s**:
  **27.04M samples**, **7.32M subdivision nodes**, and **2.18 GiB peak RSS**.
  At failure, 1,058,927 replacement records plus 941,074 pending native triangles
  exceeded the limit by one. The latter includes not-yet-processed receivers;
  it is a legitimate lower-bound reserve, not a duplicate count or a count of
  exclusively untouched geometry. The run attempted courtyard receiver 150/206
  and published nothing. Evidence:
  `generated/weathering-debug/full-preview-failure-summary.json`.
  Loaded source hashes were recorded, but concurrent building/raster edits mean
  the current working tree differs; the original loaded bytes were not archived.
- Corrected medium building: **459,819 triangles**, no diagnostics, under the
  unchanged 500,000 limit. Generation completed in 177.6 s during concurrent
  study work; this is not an isolated timing baseline.
- Complete surface/material matrix: **64/64 tests passed** at that source snapshot.
  Subsequent focused checks covered intrinsic plaster tint and conservative ground
  coverage, with passing typechecks and independent reviews in their scoped runs.
- The `no-rim` material study: **135,610 triangles**, no browser errors, and GLB
  validation with **zero errors and zero warnings**. Same-camera/reversed-light
  visual comparison accepts removal of the artificial plaster rim tint.
- The isolated appearance browser gate **passed all three modes**, authored
  textures, real-time shadows, clipping, projection/resize and camera roundtrip,
  with no browser errors. Screenshots and measurements are in
  `generated/appearance-browser-jZznWm/`; the log is
  `/tmp/weathering-appearance-browser-current.log`. The main preview was untouched.
- An earlier full atomic demo rebuild failed its fixed 20M sampling limit after 945.8 s.
  The source-linked failure is the 26th courtyard receiver, world bounds
  [8,6,0]–[9,7,0], before generated-building surfaces. The previously published
  full scene is preserved. Evidence: `generated/weathering-debug/full-demo-result.json`.
- Isolated exact failing square meter: 1,059,673 samples, 19,619 triangles.
  Removing tint in a diagnostic retains 99.72% of its samples; flattening recipe
  height retains 77.0%. Boundary discovery is the main cost, not pigment detail.
  This motivated tighter conservative local noise bounds without changing the
  material field or visual tolerances.
- The local asphalt proof passed four tests and independent review. The exact
  failing square meter drops to 538,977 samples (−49.1%), 69,354 subdivision nodes
  (−78.7%), and 19,583 triangles; proof calculations cost 261 ms of the 30.2 s
  solver run. This alone does not establish the full scene fits its budget.
- Finite concrete/asphalt plates are now implemented after independent design
  and code reviews. They preserve the native uneven bed, taper at native/service
  edges, and conservatively bound water clearance across whole receiving pieces.
  The intermediate material study had 86,476 triangles, before the floor-tile art
  changes recorded above. Its fixed-camera baseline is
  `generated/weathering-study/*-finite-ground-before-floor.png`.
- Decoded color/normal/MR image buffers are now released after source validation,
  hashing and height-normal preparation. Only authored height maps remain during
  geometry generation. Five focused tests and independent review pass. This is a
  memory improvement, not a fix for the sampling-limit failure.

The dominant remaining plaster cost was an intrinsic dark ring driven by the
fine damage mask, not physical depth after finite layers were introduced. Removing
only that multiplier reduced the worst measured wall chart from 13,790 to 2,686
triangles; ordinary condition-driven grime, wash, backing tone, contours, plate
depth and source maps remain unchanged. Edge shadows now come from geometry and
real-time lighting. The study's thin background shadow lines are from isolated
one-sided panels, and its muted puddle is a lighting/setup limitation; neither is
claimed as full-scene photorealism acceptance.

Ground coverage now uses conservative convex halfplanes and exact rectangular
support rather than a containing circle. Actual field values are unchanged.
Unknown polygons, including uncertain short nonzero edges, cannot claim uniform
coverage. A narrow-strip fixture falls from 53,263 samples to 17; the three actual
roof hotspots preserve their triangle counts and gain only about 0–1% in sample
counts, so no broad performance claim is inferred from that microbenchmark.

Independent review also demonstrated a small missing cap where three
outward-offset surfaces meet at a convex corner. The repair's focused checks cover
closed terminal boundary loops, source UV metrics, and rejection of open or
ambiguous source fans. Separately, positive authored
height on both sides of a concave L-wall produces overlapping cap strips even
with vertex caps disabled. This preexisting signed-offset union limitation remains
a source-linked `SURFACE_COPLANAR` error; it is not claimed solved by the vertex
cap repair. Current plaster uses offsets 0/−6 mm and the demo has no positive
authored wall-height input.

## Historical resumed validation

This section records the earlier finite-wall and conservative-classifier work.
Work resumed after the user increased usage. The user's requested whole
scene screenshot is `generated/weathering-study/full-demo-current.png`; it shows
the previous published 485,837-triangle scene, not the latest weathering.

Current code includes minimum-cost, post-child selection of optional relief
bands, removal of obsolete 0.22 m skin pre-subdivision, and shared wall-condition
evaluation. The narrow changes have independent reviews and focused checks.
Before the finite-layer change, the latest diagnostic reached the unchanged
500,000-triangle building/roof limit near
the first roof-ground receiver, with about 469,000 envelope records already
generated. The first actual finite-layer run solved all 930 receivers at 694.2 s,
then failed the same limit during final roof-edge assembly at 755.9 s. Its peak
resident memory was about 1.39 GB. This run predates the conservative mask fix
and cannot establish its final resource use.
Superseded/canceled full runs are not passes. The later authorized sampling-policy
adjustments are recorded separately above; the compiler's default triangle budget
remains unchanged.

A second blocker is demonstrated in
`generated/weathering-debug/corner-probe.mjs`: recessing adjoining native inner
wall faces along their separate normals leaves a visible slit at a concave
corner. Retained caps and outer wall faces do not close it. The new junction
collector repairs this demonstrated gap: public AML ray tests now hit a near,
front-facing join while collision, source data and native cap area are unchanged.

A separate positive-height limitation remains recorded: applying a +6 mm source
height to every side of a concave L-wall produces overlapping cap-edge strips at
its inner corner. The compiler rejects that candidate with `SURFACE_COPLANAR`;
disabling the new vertex caps reproduces the same failure. Evidence is in
`/tmp/weathering-positive-no-caps.log`. Resolving this requires offset-strip union
work; the default 0/−6 mm plaster layers and the convex positive-height corner
case do not require that union. This is not counted as a successful concave
positive-height render.

At that stage, plaster coat and backing had constant layer elevations, with actual
sidewalls following the existing fine material contour. This preceded finite
ground plates; ground relief was still continuous and source PBR textures remained intact.
An actual wall chart fell from roughly 14,000 to 2,344 triangles when height was
held flat while retaining the fine material contour, identifying the present
broad, noisy relief shoulder as the principal cost. Focused finite-layer tests
pass for actual thickness, fine contours, anisotropic/sheared UV metrics,
selected source height, source T-junctions, concave and mixed-signed corner joins,
owner isolation, ambiguous-edge rejection, budget failure and recovery.
Independent test and implementation reviews pass. Final visual/resource gates
remain outstanding.

A dense audit also found a preexisting correctness defect: the 5×5 wall classifier
could label a whole receiver intact while positive loss existed between probes.
Two demonstrated points are retained in `generated/weathering-debug/skin-mask-audit.json`.
Conservative noise and wall-loss intervals now prevent an optimization from
erasing these patches and let fractured skin charts prove uniform subregions.
The consolidated finite-layer, receiver-metadata and interval suite passes all
14 tests; source-height normal coverage and the current typecheck also pass.
Independent implementation and test reviews have no outstanding findings in
that focused scope. Ground sampling and final edge-conformance cost remain
under investigation before another medium/full resource gate.

Useful next evidence: `generated/weathering-debug/roof-fields.mjs`,
`generated/weathering-debug/ground-charts.mjs`, and the corner probe above.
The existing small transformed ground envelope and tile/plank ownership tests
pass after removal of the duplicate unit-shaped bed offset. The full Node suite
and final published-preset browser/export acceptance are still outstanding.

The implementation preserves the approved tiled source images and their UV scale.
Continuous material fields create fine fracture contours and finite coating relief;
vertex colors carry deposits. All lighting is real time. Wall and floor ceramic
share an area-based peeling policy, with independent small chips and rare whole
missing tiles. Exposed backing spans connected losses. Procedural moss is removed.

## Historical material study: release captures

Rebuild with `node tools/weathering-study.ts`. The maintained tool exercises the
production ground, plaster and ceramic recipes and writes a portable GLB plus
an interactive neutral-light study under `generated/weathering-study/`.

That earlier reviewed study contained 166,312 triangles and 14 surface receivers.
It preserves the source color and normal images without allocating world-space
color atlases. Generation took 369.9 seconds through the start of export while
other compilation jobs were running; this is not an isolated performance baseline.
The exported GLB has zero validator errors and zero warnings. Browser captures
completed without page errors. Both viewer and site bundles build successfully.

Independent visual review of the `*-release.png` captures, including reversed
lighting for plaster and tiles, found:

- The previous broad plaster shading wedges are resolved in both light directions.
- Plaster and asphalt have fine fractured boundaries and rough exposed substrate.
- Tile losses span courses, reveal common backing, and include small chips and
  whole missing units. The former per-tile backing frames are gone.
- No procedural moss is present.

This is a conditional visual pass for the material study. Remaining polish includes
faint hairline triangulation near one plaster edge, one roughly triangular floor
fragment, and water that reads weakly under the study's neutral lighting. It does
not establish full-scene runtime performance, motion stability or final acceptance.

## Historical rollout diagnostics

The full courtyard accepted 9,636 receiver plans after safe merging, below the
unchanged 16,384-receiver limit. That run found a wall-corner interpolation failure
on `courtyard.e0`, before publishing a replacement preset. Nearest-segment path
projection jumped 4.713 mm across an inner miter. Continuous stations between joint
bisector planes resolve it; the actual reproduction and all 968 receivers of the
isolated curved wall now compile successfully.

Ground now enforces its total authored relief envelope, including terrain, finish
depth and authored height images. Exact-zero relief and a 6 mm limit pass on an
elevated, translated and rotated floor. Exact-coordinate sample caching prevents
material ownership from being aliased across tile boundaries. Candidate triangles
also verify their own edge midpoints and centers before accepting interpolation.

Construction-aware subdivision retains the strict material, UV and height checks.
An analytical fixture uses 3,978 triangles and 54,221 samples with construction
cuts, compared with 15,068 triangles and 663,296 samples without them. These are
focused measurements, not a full-scene performance claim.

The complete 44 m² ground fixture compiled without diagnostics, with 542,813
render triangles in 958.79 seconds under concurrent work. Its physical hash,
collision mesh and navigation exactly match the 52-triangle undressed baseline.
That measurement predates the current subdivision optimization and removal of
duplicate tile/plank bed relief. It demonstrates correctness of that snapshot,
not acceptable large-scene generation cost.

The duplicate unit-shaped terrain mound is removed: the material field now owns
tile/plank thickness, and a missing unit no longer leaves that mound underneath.
The matched ceramic sample fell from 17,762 to 10,634 triangles, with its actual
material-field body, textures and erosion masks retained. Small public transformed
ground and tile/plank ownership tests pass after the removal.

Before finite layer elevations, the medium building/roof fixture exceeded its
unchanged 500,000-triangle limit. Isolated chart measurements identified height
subdivision as the main cost; lower-frequency rim tint alone did not resolve it.
The first finite-layer run solved all 930 receivers without that partition
failure but exceeded the limit during final roof assembly. At that point, the
corrected damage classifier's resource gate was pending. The last roughly 90 roof
receivers consumed about 321 seconds, motivating ground-side profiling before a
complete courtyard build. Superseded full builds were canceled without publishing them.
The previous full-scene geometry remains published; its generated snapshot
metadata was updated to the current envelope format and a browser check confirms
it loads successfully.

The shared tile-policy and focused normal, conformance, material-channel,
image-lifecycle and tile-contour checks passed in these earlier snapshots.
The appearance browser run also passed all three modes, lighting, authored texture
behavior, camera retention, sections and resizing without page errors. Earlier
long ground and full-suite runs were canceled after their source was superseded;
they are not counted as passes. The subsequent medium building result is recorded
in the historical acceptance evidence above.

## Outstanding current rollout evidence

The running demo-only 6M full atomic preview build must finish before a new scene can be
published or inspected as current. Full-scene visual review, meaningful puddle
clearance coverage, final browser/export acceptance and the full Node suite remain
unresolved or deferred. Earlier study GLB validation and browser passes do not
establish those results for the current `floor-border` source snapshot.
