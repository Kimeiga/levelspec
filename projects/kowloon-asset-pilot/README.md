# Kowloon prop pilot — 2026-11-11

Four original concept images were generated with the built-in ImageGen tool and
converted to textured Tripo P1 meshes. The apple and snack packet clearly improve
on the current simple shop props. The shirt has much better folds and garment
detail, but needs fitted suspension and a less inflated silhouette for convincing
empty laundry. The jar improves the outline and label but loses the chili contents;
use a procedural jar with separately authored material/contents for that case.

This is a local visual pilot. It loads real candidates in a comparison viewer and
repeated shelf/laundry arrangements. It does not replace the production dressing
generators or establish gameplay, collision, navigation, or full-level performance.

## Results

| Asset | Existing triangles | Requested limit | Actual triangles | Raw GLB size | Decision |
| --- | ---: | ---: | ---: | ---: | --- |
| Laundry shirt | 168 | 2,500 | 2,270 | 4,095,400 bytes | Promising art candidate; suspension and silhouette need work |
| Apple | 20 | 600 | 612 | 3,476,252 bytes | Strong improvement for produce dressing |
| Snack packet | 14 | 900 | 815 | 4,410,032 bytes | Strong front-facing shelf prop; repair invented rear lettering |
| Seasoning jar | 49 | 1,200 | 1,154 | 3,244,760 bytes | Prefer hybrid/procedural treatment for visible contents |

The apple exceeded the requested 600 triangles by 12. Treat the measured mesh as
authoritative; this pilot did not enforce a hard 600-triangle ceiling or pay for
another generation. Each candidate has one material and three 2048×2048 textures:
base color, packed metallic/roughness, and normal. Those texture sizes are excessive
for large populations of small shelf props; resize/compress and share them before
broad production adoption. Instance repetition in the viewer shares geometry and
materials but uses ordinary mesh draws, not a performance-optimized instanced renderer.

- [Shirt comparison](../../generated/kowloon-asset-pilot/review-r02/laundry-shirt-oblique-textured-left.png): collar, pocket, buttons and folds survive conversion. Back is smoother and less detailed; side is about 0.167 m thick at 0.684 m overall height. Clothesline placement is explicitly provisional, with no validated shoulder clips.
- [Apple comparison](../../generated/kowloon-asset-pilot/review-r02/market-apple-oblique-textured-left.png): recognizable irregular silhouette, stem and mottled skin, also readable in the [repeated arrangement](../../generated/kowloon-asset-pilot/review-r02/market-apple-context-textured-left.png).
- [Packet comparison](../../generated/kowloon-asset-pilot/review-r02/snack-packet-oblique-textured-left.png): puffed seams, wrinkles and front label are useful at shelf distance. The [back](../../generated/kowloon-asset-pilot/review-r02/snack-packet-back-textured-left.png) invents distorted characters and tiny pseudo-text; use an authored rear label or keep the back out of close view. Bright printed highlights remain when lighting reverses, so some lighting appears baked into the color image.
- [Jar comparison](../../generated/kowloon-asset-pilot/review-r02/seasoning-jar-oblique-textured-left.png): acceptable generic opaque condiment container, but it does not deliver the concept's visible flakes/seeds or glass transmission. The rear repeats/smears the label. Reject it as the intended transparent seasoning jar.

These compare the existing implementation against new candidates, not the best
possible procedural art against AI. The baseline shirt is an existing printed tee;
the candidate is a short-sleeve button shirt, so this is a category comparison,
not an exact garment reconstruction. Existing shop meshes have no image textures.
Both sides use their actual material data, matching cameras, physical height,
lighting, exposure and viewport. Uniform scaling preserves candidate proportions;
it does not force widths/depths to match. The apple's target height includes its stem.

## Inspect or reproduce

From the repository root:

```sh
node projects/kowloon-asset-pilot/serve.mjs
```

The viewer loads the [frozen pilot baseline](evidence/baseline/) from the original
comparison. The baseline builder samples the current source into `generated/`
for new studies.

Open the printed local URL. Choose an asset, front/side/back/oblique or repeated
arrangement, textured/clay surface, and left/right lighting.

```sh
node projects/kowloon-asset-pilot/capture.mjs generated/kowloon-asset-pilot/review-new
```

The capture directory must be new. This captures 7 views per asset and uses the
already generated GLBs. It makes no paid API requests. Do not resubmit the saved
generation commands merely to inspect models.

Models and provider previews are already on disk under
`generated/kowloon-asset-pilot/tripo-out/<asset>-<task-prefix>/`.
[models.json](models.json) selects the exact GLBs. [Concept prompts](concepts/prompts.json),
[image provenance](concepts/provenance.json), and [approved generation plan](generation-plan.json)
retain inputs. Each model directory has the provider's `task.json` with parameters
and actual credit consumption. [review.json](review.json) retains the accepted
capture metadata, source/baseline/model hashes, dimensions, texture slots and validation.

The import converts GLB Y-up to LevelSpec Z-up, then turns Tripo's +X forward
direction to the shop-viewer's -Y front. Baseline garments face +Y and are rotated
180° to the same front. All transforms and cameras are recorded.

## Validation

The accepted `review-r02` run produced 28 comparisons with no browser errors or
missing assets. All four GLBs have zero validator errors. Each has one warning:
the normal-mapped mesh lacks explicit tangents, so tangent space is generated by
the renderer; other engines may shade it differently. Missing buffer-view target
metadata produces informational hints. The full messages are retained in review.json.

The targeted TypeScript check and skill validator pass. Independent test review
approved the browser acceptance approach and identified texture-slot and baseline
hash checks, both added. Independent implementation review identified orientation,
load-race and lighting issues, all corrected. Visual inspection also led to fitting
the comparison stage's shadow range to asset scale, removing distracting shadow
banding. Earlier review-r01 captures are superseded by review-r02.

## Actual Tripo cost

Model alias `tripo-p1`, API version `P1-20260311`. One `image_to_model` step per
asset, textures and PBR enabled, no conversion/rigging/retopology/reroll steps.

| Step | Asset | Task ID | Billed credits |
| --- | --- | --- | ---: |
| image_to_model | Shirt | `84ab0570-b665-454b-ae64-9e8ad7cb7aab` | 50 |
| image_to_model | Apple | `d0d15a89-224b-412a-9d9c-f95a9c99e83e` | 50 |
| image_to_model | Packet | `4679f910-728f-4a61-b0aa-e6c0ab74a182` | 50 |
| image_to_model | Jar | `7c6308dd-edb3-4b64-a0d8-ce98d788ddfd` | 50 |

**Total: 200 API credits. Remaining API balance: 800; frozen: 0.**
Concept images used built-in ImageGen and did not consume Tripo credits.

Studio and API balances are separate. For this run, the user claimed Tripo's
paid-Studio CLI benefit, which made 1,000 API credits available. This is account
setup history, not a guarantee that the same promotion remains available later.

## Reusable guidance

The optional [level-prop-assets skill](../../.agents/skills/level-prop-assets/SKILL.md)
records the procedural/AI/hybrid selection criteria without making paid generation
a dependency of LevelSpec. Exact fitted structure, pipes, frames, doors and mechanical
parts such as AC fans stay procedural. Irregular cloth, foliage, food and packaging
can be evaluated as AI candidates, with procedural placement and supports.
