# Shared texture optimization

Repeated shelves, bottles, food and other stock already use shared atlases. This
pass preserves their UV crops, label variants, grime and contact wear while closing
two remaining sources of duplication: preview image aliases and unused export
materials.

The reviewer now decodes one image per generated content hash or resolved companion
URL. References to that image share a GPU texture within each color space. Color
and linear material slots retain separate texture interpretations of the same
decoded image. Restoration and disposal visit each texture once, including cleanup
after failed or cancelled loading.

GLB/glTF now serialize only materials used by the selected geometry and their
runtime images. Existing image-content deduplication still applies across material
aliases. Export reports name the actual shared companion file. All declared
references still validate; runtime metadata and generated-image sidecars remain
available.

## Restaurant artifact

The frozen enclosure was repacked into a sibling artifact; the original remains
untouched. Every geometry accessor, used image payload, material value and scene
node was preserved. This avoids rebaking unrelated surface changes.

| Measurement | Original | Optimized |
| --- | ---: | ---: |
| GLB bytes | 61,569,912 | 57,620,164 |
| Embedded images | 19 | 17 |
| Materials | 20 | 10 |
| Enclosure triangles | 284,300 | 284,300 |

The artifact saves **3,949,748 bytes (6.4%)**. This is a download/storage saving;
unused GLB entries may already be skipped by a renderer. The reviewer alias change
separately avoids duplicate decoding and GPU resources when aliases are present.

- [Optimized enclosure](../../generated/restaurant-props/store-surfaces-texture-shared/enclosure.glb)
- [Artifact provenance and validation](../../generated/restaurant-props/store-surfaces-texture-shared/report.json)
- [Whole restaurant capture](../../generated/restaurant-props/texture-reuse-after/wide-store.png)
- [Six-view capture metadata](../../generated/restaurant-props/texture-reuse-after/capture.json)
- [Repacking script and preservation checks](../../generated/texture-reuse/prune-enclosure.mjs)

## Verification

The optimized GLB has zero validator errors. All six restaurant views captured
without browser errors. An additional matched-camera comparison with AO disabled
is **pixel-identical**; AO-enabled captures have small sampling differences.
[Comparison result](../../generated/texture-reuse/noao-comparison.json).

Prop geometry remains 21,872 triangles in the wide layout, 8,050 in the narrow
layout and 23,098 in the alternate layout. No texture resolution was reduced and
no paid generation was needed.

Focused export tests cover shared image aliases, unused-image omission, actual
report filenames, visual/collision selection and default material fallback.
Browser tests cover decoding, color spaces, restoration, disposal and recovery
after failure/cancellation. The material-channel suite and TypeScript check pass.
Independent test and implementation reviews were required by the repository's
TypeScript skill; their findings were resolved before completion.
