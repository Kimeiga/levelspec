# Local architectural comparison helpers

These Python scripts compose existing images; they do not render XML, calibrate
cameras, extract contours, score similarity or approve geometry. They are local
adaptations and never import or execute a sibling checkout. Pillow is optional;
it is not a package dependency. Use an existing Python with Pillow, or isolate it:

```sh
python3 -m venv /tmp/levelspec-review-env
/tmp/levelspec-review-env/bin/python -m pip install Pillow
```

Commands below run from the repository root using that environment. If Pillow is
already installed, substitute `python3`. Retain source/reference/review evidence
with the project; place reproducible packet outputs under ignored `generated/`.

## Source-only packet

```sh
/tmp/levelspec-review-env/bin/python \
  .agents/skills/reference-level-authoring/scripts/build-reference-review.py \
  projects/my-level/reference/manifest.json \
  --output generated/my-level/review/source-r01 --allow-incomplete
```

Source-manifest image paths resolve relative to that manifest, never the current
directory. Sources must be raw originals; generated studies, traced overlays and
model-derived drawings belong among candidates. Example:

```json
{
  "sources": [
    {
      "id": "courtyard-east",
      "image": "courtyard-east.jpg",
      "view": "East courtyard oblique",
      "provenance": "User-provided original; unmeasured photograph"
    }
  ],
  "regions": [
    {
      "id": "upper-landing",
      "question": "Which slab edge bounds the upper landing?",
      "observations": [
        {"source": "courtyard-east", "crop": [120, 80, 620, 460]}
      ]
    }
  ]
}
```

Crop coordinates are `[left, top, right, bottom]` in native pixels. The example
assumes an image at least 620×460. Reject nonfinite, inverted or out-of-bounds crops.
The helper flags fewer than three distinct original pixel images/declared views,
and fewer than two originals/views per difficult region. These are bookkeeping
warnings, not proof of depth or architectural coverage. `--allow-incomplete` retains
the available evidence with explicit gaps; it does not authorize acceptance or
invent missing connections. Do not collect irrelevant images merely to meet counts.

The packet has full-context previews, enlarged crops with original crop boxes,
byte-identical native image snapshots, an HTML index, input-manifest copy and
`evidence.json` with file/pixel SHA256 hashes. Different encoding or metadata of the
same pixels does not count as a distinct original. Inspect the actual output images.
The output directory must be new or empty; never overwrite an inspected revision.

## Capture actual model views

From the repository root:

```sh
node tools/capture-level.mjs projects/my-level/level.aml \
  generated/my-level/capture-01 projects/my-level/views.json
```

The output directory must be new. The view file is a nonempty JSON array:

```json
[
  {"id":"overview", "position":[12,-16,12], "target":[0,0,2],
   "projection":"orthographic", "viewHeight":20}
]
```

Each view requires a unique safe `id`, finite XYZ `position` and `target`, and
`projection` (`perspective` or `orthographic`). Optional fields are `fov`,
`viewHeight`, `roll`, `appearance` and `frameAspect`; appearance defaults to
`inspection` (`illustrated` is available for presentation). Positions and targets
use Z-up meters; FOV and roll use degrees. A frozen capture includes actual PNGs,
loaded source and companion buffers/hashes, camera/canvas state and browser errors.
Inputs must remain consistent across its views. A failed capture retains diagnostics
without a success manifest. Inspect the images; provenance does not establish
camera correspondence or architectural accuracy.

## Capture provenance

Before composing model comparisons, establish which bytes produced the actual
renders. Hashing a nominated XML file before/after capture can still falsely label
images from a server serving another source. Verify the XML and declared mesh,
texture and reference-image bytes actually delivered to the compiler/image loader,
or capture from an immutable bundle whose loaded bytes are verified. Hold and
archive those verified buffers; a later reread of mutable originals is a different
input instance. Keep all views tied to that same revision. For live mutable inputs,
detect writes/restores and linked-path replacements rather than relying only on a
final hash that may match again.

Retain the actual native PNGs, CSS/backing-store dimensions, camera/view state and
rendered view/projection matrices; inspect the resulting files as well as metadata.
When archiving companions beside source, validate final archive paths and filename
aliases against reserved images/metadata, prevent directory escape, and claim fresh
output exclusively so concurrent runs or companion copies cannot replace evidence.
Reject incomplete/mixed packets rather than publishing success metadata for them.

These are capture-origin checks, not functions provided by the image compositors
below. An asset/image hash in a comparison packet identifies supplied bytes; it does
not prove they correspond, calibrate a camera or establish source fidelity. Keep
capture-tool details with the project that owns them, and review the resulting
images against authoritative originals separately.

## Frozen drawing/model packets

After the source-only critic inventory is saved, make a drawing comparison packet:

```sh
/tmp/levelspec-review-env/bin/python \
  .agents/skills/reference-level-authoring/scripts/build-comparison-review.py \
  projects/my-level/reference/manifest.json \
  projects/my-level/review/drawing-r01.json \
  --output generated/my-level/review/drawing-r01
```

The second manifest describes a frozen revision and its already-rendered images:

```json
{
  "stage": "schematic",
  "revision": "drawing-r01",
  "asset": "../studies/sections.svg",
  "views": [
    {"id": "east-drawing", "image": "../studies/east.png", "view": "East elevation"}
  ],
  "comparisons": [
    {
      "source": "courtyard-east",
      "candidate": "east-drawing",
      "region": "upper-landing",
      "camera": "diagnostic",
      "reference_crop": [120, 80, 620, 460],
      "note": "Orthographic drawing versus oblique photo; inspect relationships, not pixel coincidence."
    }
  ]
}
```

`stage` is `schematic` or `model`; `revision` is nonempty. Each view needs `id`,
`image`, `view`; optional `state` describes exterior/cutaway/section state. Each pair
needs `source`, `candidate`, `camera: matched|diagnostic`. Optional fields are
`region`, `reference_crop`, `candidate_crop`, `reference_anchor`, `candidate_anchor`,
`note`, `overlay` and paired `reference_contours` / `candidate_contours`. Anchors are
landmark bounds in pixels **after cropping**. Images scale uniformly. Anchors set
framing; they cannot correct different viewpoints. `overlay` requires `matched`.

Reference images resolve relative to the reference manifest. All candidate, asset
and contour paths (including reference contours) resolve relative to the comparison
manifest. Region IDs must exist and contain that source. Empty comparison lists
are allowed for diagnostic overviews; missing source/view/region mappings and
diagnostic pairs are retained as gaps. Mapping completeness only means ready for
human review, never accepted fidelity. Camera labels are human claims to verify.

After drawing review, repeat with `stage: "model"`, a frozen XML `asset`, actual
compiled-model renders and the model revision. To make reference/schematic/render
boards, include reviewed drawing images and actual render images in `views`, marking
their optional `kind` as `schematic` or `render`. Pair each to relevant originals;
label orthographic/photo mismatches diagnostic. Overview pages repeat up to two
candidate views beside each group of four references. Model-derived schematics
remain secondary claims; originals decide visible geometry.

Packets retain all reference/candidate views (even unpaired), paginated overviews,
focused pair sheets, full unrotated originals with crop boxes, byte-identical image
and contour snapshots, the supplied editable asset snapshot, manifest copies/hashes,
transforms and an HTML coverage index. The asset snapshot/hash does not prove renders
came from it: freeze XML and companions, compile and capture that revision before
building the packet. Record companion hashes/camera settings in the revision ledger.
Archive manifest paths retain their original semantics; use snapshot links for
portable native images. Do not rerun archived manifests without resolving their
paths. Use a new/empty output directory for each revision.

## Reviewer-owned contour pairs and individual sheets

Critics independently author SVG observations over each native original and actual
candidate render. Export transparent PNG layers at exactly each image's native size.
Do not include the photo/background in the contour export. Both layers must have
visible marks and fully transparent pixels; mismatched, opaque and empty inputs fail.
For native SVG rasterization, the repository's installed Playwright/Chromium is
sufficient: use a viewport matching the SVG's native `viewBox`, device scale factor
1, explicit equal SVG width/height and zero page margins. Embed the unchanged
original so local-file image loading cannot silently fail; await fonts and image
decoding before capturing. Save the visible SVG overlay, then hide only its
`original` group, keep page/SVG backgrounds transparent, and use the SVG locator's
`screenshot({path, omitBackground: true})` for contours. Verify exported PNG dimensions
and inspect actual original-only, overlay and line-only images. Browser screenshots
of an SVG with the photo still visible are opaque composites, not contour inputs.
Supply both paths in a batch pair:

```json
{
  "source": "courtyard-east",
  "candidate": "east-render",
  "camera": "matched",
  "reference_contours": "traces/critic-east-source.png",
  "candidate_contours": "traces/critic-east-render.png"
}
```

For one pair, including explicit rotations when needed:

```sh
/tmp/levelspec-review-env/bin/python \
  .agents/skills/reference-level-authoring/scripts/compare-model-reference.py \
  --reference projects/my-level/reference/courtyard-east.jpg \
  --model generated/my-level/renders/east.png \
  --reference-contours projects/my-level/review/traces/critic-east-source.png \
  --model-contours projects/my-level/review/traces/critic-east-render.png \
  --camera matched --context \
  --output generated/my-level/review/east-pair-r01.png
```

`--camera` is required even without contours. Optional `--reference-crop` /
`--model-crop` and `--reference-anchor` / `--model-anchor` use comma-separated boxes.
Optional rotations are degrees counterclockwise before framing; anchors apply
after crop/rotation. This is explicit framing, not camera calibration. Cropped and
contour comparisons always retain full unrotated context. Individual raw comparisons
can request it with `--context`. Batch comparisons always include context.

Image and contour receive the same crop, rotation, integer resize dimensions and
translation. Individual overlays preserve stroke colors. Matched contours add a
magenta/cyan line-only alignment; diagnostic pairs keep separate traces and omit
the combined line overlay. Contour bounds never alter image framing. Diagnostic
images cannot close critical alignment claims.

The individual command always writes `OUTPUT.evidence.json` with input/output
hashes, exact transforms, camera declaration and contour metadata. Optional
`--evidence PATH` chooses its location. Both output paths must be new. The single
sheet does not snapshot native inputs; retain them or use a batch packet for
archival review. After repairs render again and build a new packet.

Run the behavioral helper suite independently of Node:

```sh
/tmp/levelspec-review-env/bin/python \
  .agents/skills/reference-level-authoring/scripts/test-comparison-review.py
```
