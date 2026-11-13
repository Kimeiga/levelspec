# Native-pixel architectural observations

Use traces when boundaries are consequential and ambiguous: a courtyard opening
versus shadow, a stair flight versus landing, overlapping slab rims, transparent
glazing, a recessed wall, or which level owns a doorway. Clear features and small
reviewed repairs need no ceremonial tracing pass.

Start from the original full image and readable crops. Record source identity,
native dimensions/hash, orientation, shared landmarks and the exact question.
Inspect other supplied originals before interpreting depth. When useful evidence
is missing, seek another original angle or readable closeup of the same building
and variant. Repeated crops do not add depth evidence. Record unsuccessful searches;
do not invent a corridor or stair connection to make a coherent plan.

Before counting stairs, assigning landing boundaries, or deriving camera angles
and metric stations from a published thumbnail,
check whether its source page provides a higher-resolution original. Preserve
that file and its provenance separately. Inspect EXIF focal length, sensor
information and XMP crop/perspective settings when present. Establish frame
correspondence before transferring annotations between versions. Metadata gives
an intrinsics prior; resizing, lens correction and unknown edits can still leave
uncertainty. A camera fit that absorbs a wrong focal length can falsely suggest a
skewed wall or misplaced recess.
Inspect consequential small features at the available original resolution. A
thumbnail's dark bands can merge or split apparent treads; label actual risers,
nosings and the final landing separately before turning a count into geometry.
Upscaling a thumbnail does not supply the missing evidence.

Create an editable SVG whose `viewBox="0 0 WIDTH HEIGHT"` matches the native image.
Embed the unchanged original pixels (for example a data URI) at `x=0,y=0` with
native width/height. Keep named toggleable groups for `original`, `observed`,
`uncertain`, `inferred`, and `annotations`; retain hash and trace revision in metadata
or notes. Do not stretch, mirror, rectify, repaint or replace the photograph.
A crop records its original-pixel offset/viewBox and retains full-image context.

For large originals, a relative image reference to the unchanged, hashed canonical
file also preserves native pixels. Avoid duplicating a huge base64 image in every
tracked trace. A self-contained review packet can snapshot the original once and
have its SVGs reference that shared copy. Record the dependency and verify its hash;
do not silently replace it with a resized or recompressed substitute.

Trace source-defining silhouettes, opening rims and reveals, slab edges, parapets,
wall/floor intersections, stair runs/landings and occlusion boundaries. Use stable
semantic path IDs, such as `upper-opening-left-jamb`. Identify the surfaces each
edge bounds. A bright line may be a reflection, transmitted edge or highlight;
a dark patch may be shadow. Separate observed boundaries (solid), ambiguous lines
(dashed) and proposed continuations (distinct dotted/color treatment). Hidden edges
are not automatically known edges. Stop observed paths where evidence stops;
convenient polygon closure cannot establish an unseen wall or route.

Establish whether adjoining patches are horizontal caps, vertical faces or sloped
surfaces before interpreting their separation as wall thickness or height. A tiled
band beside visible flooring is not automatically a vertical wall face or its foot.
Check edge/grout directions and continuity across original views; a conditional
camera can expose an inconsistent classification, but cannot independently certify
one by fitting the same assumed labels.

Establish feature identity across views with distinctive neighboring details:
vents, pipe bends, frame divisions or wall transitions. Similar circles and repeated
tread edges alone do not establish correspondence. A numbered edge in one photo
may be a different tread or a foreground masonry silhouette in another. Likewise,
a point called “wall-foot” may be an occlusion endpoint above the actual stair.
Likewise, a stair edge disappearing behind a circular reveal does not locate a
physical vertex on the reveal's front or back plane. An image line can constrain
orientation or a family of depth/scale solutions without fixing its endpoints.
Trace the full visible faces of a post or jamb: an internal crease is not its outer
silhouette. Keep bright-face boundaries and dark borders separate when measuring
thin sections.
Separate those owners before triangulation. Different rear fragments seen through
one opening can result from camera height; their absence alone does not establish
another opening. Keep failed matching hypotheses rather than forcing a new wall
depth or camera to absorb an unidentified point.

Keep compact notes keyed to path IDs: source region, boundary ownership, evidence
type, uncertainty and consequential alternatives. User annotations establish the
user's intended interpretation when explicit, but rough marker positions are not
pixel-accurate measurements. Preserve the original annotation and label this
authority separately from photographic observation.

Render and inspect the actual SVG at whole-image and detail scale. Keep original-only,
overlay and line-only views so a stroke cannot hide contrary pixels. An independent
critic saves observations from originals before seeing author paths or notes, then
checks registration, retained material around openings, ownership, depth order and
unsupported connections. Findings name source regions/path IDs. Revise and re-review
supported repairs before deriving dependent schematic detail. If independent review
is unavailable, record self-review and its limit.

Apply that ownership review to camera-fit controls before estimating a pose. Plot
every consumed point over the original at readable native scale; a front opening
rim, its rear reveal and a background edge are different controls even when a
numerical fit is good. If a control is later misidentified, preserve the failed
calibration, correct and review the source labels, then recheck held-out features
before attributing its discrepancies to the building geometry.
Inspect complete projected features and whole-view overlays even when fit and
reserved samples pass. Points clustered on one arc or wall cannot validate the
rest of a circle, camera or building; a visible contour disagreement remains a
failure and must not be converted into a structural repair elsewhere.

When reusing a camera, inspect its original fitting inputs, including any geometry
estimated jointly with the pose. A stair edge or doorway used to infer that pose
is not an independent check of the same stair or doorway later. Preserve fixed-pose
comparisons as useful regression evidence, but distinguish them from unused source
checks. Resolve consequential camera/geometry ambiguity with independently reviewed
controls on stable features; do not refit the camera to rescue a preferred model.

Give the drawing author originals, reviewed trace revisions and unresolved questions.
Perspective traces are observations, not orthographic measurements or meshes.
Carry retained material and local details into the
[schematic](schematic-workflow.md). When alignment needs closer testing, critics independently trace source
and candidate following [paired contour review](paired-contour-review.md); a copied
builder overlay does not supply fresh observations.
