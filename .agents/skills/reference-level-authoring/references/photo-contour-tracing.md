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

Before deriving camera angles or metric stations from a published thumbnail,
check whether its source page provides a higher-resolution original. Preserve
that file and its provenance separately. Inspect EXIF focal length, sensor
information and XMP crop/perspective settings when present. Establish frame
correspondence before transferring annotations between versions. Metadata gives
an intrinsics prior; resizing, lens correction and unknown edits can still leave
uncertainty. A camera fit that absorbs a wrong focal length can falsely suggest a
skewed wall or misplaced recess.

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

Give the drawing author originals, reviewed trace revisions and unresolved questions.
Perspective traces are observations, not orthographic measurements or meshes.
Carry retained material and local details into the
[schematic](schematic-workflow.md). Later critics independently trace both source
and candidate following [paired contour review](paired-contour-review.md); a copied
builder overlay does not supply fresh observations.
