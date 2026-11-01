# Photograph-to-playable reconstruction

LevelSpec remains a deterministic **source-to-geometry compiler**. This workflow
provides the missing layer around it: an image-capable author produces a complete
editable `.level.svgx` document, the compiler validates it, a multi-view evaluator
compares its *actual rendered geometry* with independent observations, and the
author can revise the source.

This is an experimental authoring pipeline. It is **not** a turnkey photogrammetry
system and does not claim to recover hidden geometry or exact dimensions from
photographs. A successful runtime validator does not imply photographic accuracy.

## Run with photographs

Use original, cropped architectural photographs, **not screenshots containing
messaging app chrome or social-media controls**. The images remain on your local
machine. Model mode sends them to the chosen OpenAI API model, but never checks
them into GitHub. Only publish reference photographs with appropriate rights.

```sh
# Select an image-capable model and provide your own API key.
export OPENAI_API_KEY=...
npm run reconstruct -- \
  --image view1=/path/to/cropped-front.jpg \
  --image view2=/path/to/cropped-oblique.jpg \
  --model YOUR_VISION_MODEL \
  --max-revisions 4 \
  --out generated/reconstruction
```

The first proposal and subsequent revisions go through the **same compiler,
runtime navigation checks and multi-view evaluator**. Each iteration writes a
complete SVGX candidate and an evaluation report. The best geometry- and navigation-valid candidate
appears in `best.level.svgx`; `result.json` separately records whether its
visual evidence met the acceptance criteria. Invalid candidates remain in the
iteration files for diagnosis and AI revision. If none passes geometry and
both applicable navigation states, no best candidate or game export is written. When the best candidate passes geometry and navigation, the CLI also
writes `best.glb` (visible geometry), `best-collision.glb` (physics proxy) and
`best.runtime.json` (navigation, markers and source ownership). These are
portable game assets, not a standalone game. The process exits nonzero if the acceptance gates fail.

To evaluate a candidate without a model or API key:

```sh
npm run reconstruct -- --source path/to/candidate.level.svgx \
  --image view1=/path/to/cropped-front.jpg \
  --image view2=/path/to/cropped-oblique.jpg \
  --evidence path/to/annotations.json \
  --out generated/reconstruction-review
```

The reference IDs in `--image id=path` must exactly match the root-level
`<reference id="id" ...>` declarations in the SVGX. Without an explicit ID,
images are named `view1`, `view2`, etc. Open `best.level.svgx` in the normal
workbench to use the existing registered image overlay and walkability inspector.

## Independent evidence

Photos alone produce a **diagnostic** edge-distance metric. It is not an
acceptance gate because tile grout, shadows, reflections and pipes may dominate
the edges. To certify a reconstruction, supply independent, human-reviewed
landmarks, masks, silhouette segmentation, or structural strokes in a trusted
`--evidence` manifest. These must be independently supplied by the caller,
never generated alongside the SVGX or reverse-engineered from its projections.
Acceptance uses the original cropped image dimensions from `--image`, or
`imageDimensions: [width, height]` in the independent manifest when image
pixels are omitted. Without those independent dimensions, annotated geometry
cannot be certified: an AI could otherwise shrink pixel error by changing
the candidate's image metadata.
The model-authored `<landmark>` and `<mask>` elements remain usable for
workbench inspection, but **cannot verify or exclude acceptance evidence**.

Example `annotations.json`:

```json
{
  "thresholds": {
    "minimumVerifiedViews": 2,
    "landmarkRmsPixels": 8,
    "silhouetteIoU": 0.8,
    "strokeErrorPixels": 5
  },
  "views": [
    {
      "referenceId": "view1",
      "imageDimensions": [1500, 1000],
      "landmarks": [
        { "id": "trusted-corner", "position": [0, 0, 3], "image": [0.5, 0.4] }
      ],
      "masks": [
        { "id": "foreground-person", "points": [[0.02, 0.7], [0.15, 0.7], [0.15, 0.98], [0.02, 0.98]] }
      ],
      "silhouettePath": "view1-building-mask.png",
      "strokes": [
        { "id": "courtyard-wall-top", "points": [[0.2, 0.3], [0.7, 0.32]] }
      ]
    },
    {
      "referenceId": "view2",
      "imageDimensions": [1500, 1000],
      "strokes": [
        { "id": "opening-diameter", "points": [[0.41, 0.44], [0.62, 0.44]] }
      ]
    }
  ]
}
```

- Stroke positions are **normalized** within the original cropped photo, from
  top left, not pixel coordinates. The evaluator samples the stroke against
  boundaries of visible compiled triangles.
- A silhouette image uses opaque white for building geometry and black or
  transparent for background; it may have its own resolution. Annotate only
  the geometry represented by the target scene, not background buildings.
- Only the independent evidence manifest's `masks` exclude foreground
  obstructions (people, vehicles, trees) from acceptance comparisons.
  Occluded or invisible structures are not assumed to be present or absent.
- The manifest's `landmarks` are trusted 3D world coordinates paired with
  normalized, photo-observed 2D locations. Source SVGX landmarks are ignored
  for acceptance even when they yield zero reprojection error. Independently
  validate image correspondence and the assumed physical scale.
- A photo view cannot be certified by image-edge similarity alone.
- At least two independently annotated views are required when the candidate
  references multiple views, by default.

Metrics are separate: landmark reprojection RMS, silhouette IoU, annotated
structural-edge error, and an **informational** natural-photo edge score.
The evaluation is not a single unqualified "photorealism" score.
Valid compilation, ordinary open-state navigation, and closed-state navigation
when dynamic colliders exist are separate required conditions. A runtime
report saying `passed` is not sufficient if its `sealed` report fails.

## Architectural authoring

Use `SceneBuilder` for grouping/materials and `levelspec/vector` helpers for
actual collidable architecture:

```ts
import {
  SceneBuilder, addStoreyShell, addWall, addCircularOpening, addStairFlight,
} from "levelspec/vector";

const scene = new SceneBuilder("photo-study");
const group = scene.group("main");
const lower = addStoreyShell(group, "ground", {
  footprint: [[0, 0], [8, 0], [8, 6], [4, 6], [4, 9], [0, 9]],
  z: 0, height: 3.2, material: "default",
});
const roundWall = addWall(group, "circle-wall", {
  from: [0, 3, 0], to: [8, 3, 0], height: 3.2, material: "default",
});
addCircularOpening(group, roundWall, "round-window", {
  centerAlong: 4, centerHeight: 1.65, radius: 0.85, segments: 48,
});
addStairFlight(group, "entry-stair", {
  lower: [[1, 1, 0], [2.2, 1, 0]],
  upper: [[1, 5, 1.6], [2.2, 5, 1.6]],
  material: "default",
});
```

Circle walls use *inscribed stepped cutouts* with a bounded number of slices;
the hole affects collision and sight, not merely surface color. The result is
an approximation, not an exact analytic circle. For an enterable structure,
use explicit floor/wall topology, not `building(... usage: "scenery")`
or a giant solid-box prop. Irregular floors use polygon boundaries; place
individual stair flights and landings rather than forcing all buildings into
a repeated switchback template. Wall creation and floor polygon construction
reuse shared vertices and edges regardless of authoring order.

## Implementation contracts

- `src/reconstruction/evaluate.ts`: non-AI visual evaluation, reference IDs,
  masks, edges, annotations and separate confidence gates.
- `src/reconstruction/loop.ts`: model-agnostic async revision callback, bounded
  attempts, strict compile + sealed traversal, errors fed back to the caller.
- `tools/reconstruct-openai.ts`: optional Responses API image input, structured
  SVGX response, previous compiled renders and feedback; no hard-coded model.
- `tools/reconstruct.ts`: local-file entrypoint and durable iteration artifacts.
- `src/vector/architecture.ts`: physical walls, apertures, irregular enterable
  shells and individual playable flights.

The model is *not trusted* to declare a level valid. It emits candidate source;
the compiler, Recast and independent reference annotations determine that.
Source, diagnostic and candidate-size limits prevent unconstrained revision
loops; this is a bounded process, not a promise to reach a solution.

The reference evaluator uses a flat-material z-buffer render at a bounded
resolution. This intentionally measures structure rather than color fidelity;
it does not solve camera calibration, lens distortion, occlusion classification,
unknown interiors, or material reconstruction. It can only evaluate what the
supplied photos/annotations constrain. Final game integration still needs a
destination engine to use the exported collision and runtime navigation data.

## Regressions

```sh
npm run check
node --test tests/vector-reconstruction.test.ts
npm test
npm run build:viewer
```

Tests cover real circular apertures, irregular storeys, off-grid stairs,
multi-camera mask agreement, deliberately mismatched silhouettes, abstention
without independent photo annotations, and a deterministic fake-model repair
loop. These synthetic fixtures verify tooling correctness; they do not constitute
an accuracy claim for the Shibuya building photographs.
