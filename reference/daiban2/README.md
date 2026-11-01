# Dai-ni Daiban Building (Shibuya): reconstruction study

This directory intentionally contains **no Instagram photograph copies**.
The original four user-supplied screenshots show a tiled multistorey inner
courtyard with circular apertures, staggered landings and exterior stairs.
The distribution rights for the photographs were not established.

`annotations.json` contains approximate, manually inspected *visible
structural-edge* positions normalized to four **706×942** cropped reference
images, named `view1` through `view4` in carousel order. These are
provisional observations, not surveyed geometry or a certified photogrammetric
ground truth. Many walls are occluded, interiors are unknown, and apparent
circles are projected ellipses. Review/correct these annotations before using
them as a high-precision acceptance gate.

The first image's central aperture, the fourth image's central aperture,
and the second/third images' two interlocking views provide important
cross-view constraints. Include separate wall heights and each stair landing
in the authored geometry. The photo set does not prove all floors connect
internally or establish metric dimensions.

Run the reconstruction CLI with four *locally available* cropped images,
providing `--evidence reference/daiban2/annotations.json`. Supply a
vision-capable model explicitly to generate candidates; or `--source` to
evaluate an existing candidate without model calls. The reconstructed
`.level.svgx` source should declare each photo as a saved `<reference>`,
with matching IDs and native cropped-image dimensions.

Do not optimize camera fitting and geometry jointly without anchors: the
candidate may appear visually aligned for the wrong structural reasons.
These edge annotations are independently recorded, but they do not provide
absolute scale, occluded geometry, or a robust silhouette benchmark.
