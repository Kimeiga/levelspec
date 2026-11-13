# Independent forward trial: architectural skill

Outcome: usable for a bounded source-first annotation and comparison trial. No blocking documentation/helper gap prevented that task. This trial does **not** establish a reviewed orthographic reconstruction or model fidelity. The visible stair/landing/green-door junction can be recorded while the doorway interior, overhead-flight endpoint, storey correspondence and hidden connections remain unresolved.

## Isolation and scope

- Read `.agents/skills/reference-level-authoring/SKILL.md` and its tracing, schematic, comparison-tools, paired-contour and independent-review references.
- Raw architectural inputs were exclusively the 12 `projects/dai2-daiban/references/*.jpg` files. Personally inspected all full images plus contact index and detail crops. Did not read project BRIEF, XML, author.py, schematics, studies, reviews, history or another agent's conclusions.
- Created all authored artifacts in `/tmp/levelspec-reference-forward-trial`; no deliberate repository changes, geometry code, production XML or subagents.
- Focus: DSC04506 yellow stair looking toward a green framed doorway. DSC04505 supplies a potential alternate context, but exact doorway/storey identity is not asserted. In particular DSC04499's green door is not equated by color alone. No exterior reconstruction.

## Necessary steps actually exercised

1. Saved `source-inventory.md` before candidate creation: per-image feature inventory, difficult-region questions, native coordinates, direct observation versus uncertainty, and explicit unsupported routes. `source-manifest.json` records all originals, dimensions, hashes/provenance and two original crops for the difficult region.
2. Ran `build-reference-review.py` with that manifest, `--allow-incomplete`, output `source-r01/`. Its bookkeeping status is `ready-for-visual-review`, gaps `[]`; it has 12 distinct originals and two declared regional views. That status does not prove their architectural correspondence. Inspected actual `source-r01/region-00-00.png` with full-image crop context.
3. Authored editable native-pixel `annotation.svg`, embedding byte-unchanged JPG pixels, native `viewBox`, stable semantic paths, and named `original`, `observed`, `uncertain`, `inferred`, `annotations` groups. Source drawing shows door frame, visible green panel/leaf rim, lowest soffit band, finite parapet cap, stair boundaries and uncertain landing edge. Inferred group is intentionally empty. Unknown hidden routes are labeled, never closed into a room or corridor.
4. The small proposal is observational, **not** a CAD plan/section. No meters, level elevations, exact tread count or headroom are claimed because the trial did not establish them. Full reconstruction would need estimated metric drawings with explicit provenance and independent review before dependent XML. This bounded annotation is the task's permitted small candidate, not completion of the substantial-authoring standard.
5. Ran batch `build-comparison-review.py` and individual `compare-model-reference.py`, using actual candidate rasters, native transparent contour layers and `camera: diagnostic`. Inspected actual `comparison-r01/comparison-001.png` and `individual-pair-r01.png`, including original/candidate, separate contours and full unrotated context. No matched-camera/overlay acceptance attempted.
6. Actual image inspection caught weaknesses in my own first candidate: the Pillow equivalent of SVG lost dashed uncertainty, labels were low-contrast in actual SVG, and a green-panel lower contour continued through an occluded boundary. Revised to `annotation-r02.svg`, stopped that observed contour at occlusion, improved label contrast, rendered real SVG in Chromium at 683x1024, and captured overlay/line-only versions. Regenerated actual transparent source contours and a new immutable packet `comparison-r03/`; inspected its actual pair sheet. r01/r02 packets remain preserved as earlier evidence. This is concrete value from the required render-and-look step.
7. Final editable asset is `annotation-r02.svg`; final manifest is `drawing-r02-final-manifest.json`; final actual pair is `comparison-r03/comparison-001.png`; final packet index/evidence are alongside it. The packet has the editable asset snapshot/hash and native input/contour snapshots.

## What the inspected pair establishes and leaves open

- At the focused scale, door-frame/soffit/stair-boundary paths are registered to the original. Dashed amber distinguishes the uncertain landing/right stair boundary; red ends rather than constructing the concealed panel edge.
- A yellow landing patch is visible between stair and green-door zone. Crates and a keg obscure boundaries. A floor patch is not proof of hidden doorway circulation.
- The line drawing omits tread/riser detail, circular-opening detail, complete wall material fields, thickness/depth and full landing edges. It is a limited annotated hypothesis, insufficient for production geometry or source-fidelity signoff.
- `comparison-r03/evidence.json` correctly reports `incomplete-comparison-coverage`: eleven originals have overview-only coverage, DSC04505's region has no focused candidate pair, and the single pair is diagnostic. Those are deliberate incomplete trial scope, not accepted exclusions from a full reconstruction.
- This is self-review of my own annotation. The source-first isolation from earlier project work is real, but the paired traces are not independent author/critic evidence. Candidate contour marks were drawn separately against the line sheet; source paths originate in the same trial author. Neither is a compiled-model render.

## Discoverability and failure handling

The top-level skill routed me directly to the right sequence and helper documentation. `comparison-tools.md` specifies manifests, relative-path semantics, crop order, diagnostic camera constraints, transparency/native sizes, output immutability and optional Pillow. All three `--help` commands were useful. No sibling checkout or Blender was needed. Pillow was already installed.

Actual failure probes are preserved in `failure-trials.json`:

| Probe | Result | Usability |
| --- | --- | --- |
| Crop outside source image | exit 1: `yellow-stair-green-door: box falls outside image/frame` | Names region and cause; straightforward correction. |
| Reuse populated source packet directory | exit 2: `output must be a new or empty directory; preserve frozen review revisions` | Clear revision-preservation guidance. |
| `--camera diagnostic --overlay` | exit 2: `overlay requires a declared matched camera` | Correctly prevents a misleading combined overlay. |

Ran `test-comparison-review.py`: 17 tests passed. These tests supplement actual inspected packet pixels; they are not architectural validation.

## Nonblocking usability rough edges and remaining blockers for a full build

1. **SVG rasterization is left to the author.** Pillow is documented for composition, but no simple renderer recipe is provided. Neither cairosvg nor rsvg-convert was present. Quick Look produced a square cropped thumbnail (`svg-render/annotation.svg.png`) rather than a native-size faithful export; actual inspection caught this. Repository Playwright/Chromium successfully rendered native 683x1024 images. A short optional browser-render example would help, especially for transparent contour exports. This was a recoverable discovery issue, not a blocked helper.
2. **Crop-aware callout placement remains manual.** The focused candidate crop clips the long upper callout in the paired image while full context retains it. The helper preserves the supplied framing correctly; the author should move labels or widen the crop. This is an authoring limitation, not geometry evidence.
3. **Diagnostic terminology assumes a camera mismatch.** My source-derived native-pixel drawing is deliberately diagnostic for independence/model reasons; batch labels say `camera/pose mismatch`, and the individual command defaults to `delivered model`. The batch manifest's view/note makes the actual claim clear. No separate annotation-stage terminology exists, but schematic stage is usable with explicit notes.
4. **Full reconstruction remains evidence-limited.** No measured scale, absolute levels or positive hidden-door connection emerged from these photos. That does not prevent further supported drawing work, but it blocks asserting those particular relationships. The workflow explicitly permits deferral rather than fabrication. Full CAD drawings, independent critics, camera fits/held-out contours, XML and compiled geometry review were outside this bounded trial and remain unperformed.

The skill's central workflow was executable and changed the evidence product in useful ways: source-only inventory before the candidate, explicit native-image uncertainty, retained full context, actual image inspection, immutable revisions and visible incomplete-coverage reporting. No production acceptance is claimed.
