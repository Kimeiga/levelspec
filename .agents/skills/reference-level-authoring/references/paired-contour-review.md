# Reviewer-owned paired contours

Account for every retained original, with source ID/hash, visible architectural
features, frozen candidate revision/view, camera status, critic-owned trace paths,
findings and review status. Every geometry-informing distinct source needs detailed
comparison of the boundaries it informed. Thumbnails and a listed pair are coverage
bookkeeping, not completed inspection. Record duplicates, variant differences and
exclusions explicitly; difficulty fitting a camera is not a reason to exclude an
inconvenient source. Measurement-only sources still require their dimensional check.

## Establish correspondence

The critic saves source-only observations before seeing author drawings, renders,
implementation or earlier findings. Map building axes, floor levels, stable landmarks,
visible surfaces and uncertainty. Preserve user explanations as separately attributed
information. Then inspect renders of the frozen compiled revision from corresponding
sides and section states.

Fit a camera with distributed stable landmarks outside the feature being tested;
record position, target, up, projection, FOV/orthographic span, viewport and source
crop. Lock the fit, then test held-out openings, slab edges and junctions. Do not tune
camera or geometry solely to conceal a disputed local mismatch. Keep uncertainty
from lens distortion, blur and estimated dimensions explicit. Do not mirror, stretch
or warp either image. Record uniform framing/crop/rotation transforms.

Unmatched/uncalibrated views remain diagnostic. A cutaway or orthographic section is
often useful diagnostic evidence but is not automatically a matched exterior-photo
view. Seek a corresponding render or another source when the mismatch prevents a
consequential decision. Critical fidelity cannot pass using only unmatched views.

## Draw both sides independently

The critic authors editable native-coordinate SVG traces over the unchanged source
and the actual frozen-model render, following
[photo tracing](photo-contour-tracing.md). Trace corresponding visible silhouettes,
wall/slab edges, opening rims/reveals, landings, stair runs, junctions and occlusions.
Name the surface each line bounds. Use corresponding semantic path IDs while keeping
uncertain/inferred boundaries separate. Automatic edge maps, wireframes and copied
builder traces do not count as independent contour observations.

Audit both directions: each source-defining surface/opening must map to an actual
candidate patch/boundary, and each visible candidate addition needs original evidence
or explicit user authority. A plausible outline does not prove a slab or wall exists
behind it. Inspect actual compiled geometry, isolated surface masks, alternate views
or sections for retained areas and depth ordering; label these diagnostics separately.
A frontal contour cannot settle protrusion, recess depth or coplanarity by itself.

Inspect raw images, separate overlays and line-only views. For matched cameras,
inspect a contrasting-color combined contour view. Record residuals in native pixels
or relative to a shared landmark, with source uncertainty established before seeing
the candidate. Investigate discrepancies beyond that uncertainty; do not widen a
tolerance afterward to obtain a pass. Numerical alignment supplements surface
ownership and cross-view reasoning; it cannot grant automatic acceptance.

Export transparent native-size PNG contour layers alongside the editable SVGs.
[Local helpers](comparison-tools.md) apply exactly the image's crop, rotation,
resize rounding and translation to its contour. Stroke bounds never control framing;
misplaced strokes must remain misplaced. Retain raw originals, actual renders,
individual/combined contours, full unrotated context and hashes.

Each finding names source/candidate regions or path IDs, consequence and repair
goal. Recheck relevant neighboring views after repairs. Signoff needs accounted
source/detail coverage, reviewer-owned paired contours for geometry-informing views,
resolved supported discrepancies and explicit limits. Unexamined critical regions or
critical camera/ownership questions leave review incomplete. Geometry/navigation
passes remain separate and cannot close source fidelity findings.
