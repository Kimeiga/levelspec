# Shelf material study

[Concept image](concept.png) · [Concept prompt](concept-prompt.txt) ·
[Extracted timber source](wood-source.png) · [Texture prompt](wood-source-prompt.txt).
Both images use the built-in ImageGen tool; [provenance](provenance.json) records
references and hashes, and [bake metadata](bake.json) records the actual recipe.

The ImageGen concept preserves the store composition sufficiently for material
comparison, but is a painted target rather than proof of a rendered implementation.
The Tripo wooden counter is the local generated-cabinet reference. Bo Kee supplies
real-world evidence of old timber, handling wear and accumulated shelf grime.

Useful differences from the procedural shelf baseline:

- Adjacent boards vary between dark tea brown, muted walnut and gray-brown.
- Pale wood appears locally at handled lips and small edge chips, rather than as
  a uniform bright border around every face.
- Dark dirt collects at joints and low areas; broad rubbed/stained patches break
  up the original identical straight grain.
- A few old paper-label remnants add use history. They are sparse marks, not
  repeated decorative labels on every shelf.
- Worn varnish, dust and exposed timber need different roughness. Fine pores and
  scratches belong in normal maps, not extra geometry or baked illumination.

The initial square timber fields and their short repeats were superseded by
[four continuous long scans](wood-long-source.png), generated with built-in
ImageGen from this [prompt](wood-long-source-prompt.txt). Their
[provenance](wood-long-provenance.json) records the source and prompt hashes.

The current atlas contains four approximately 0.5 × 3.09 m side-grain fields and
four 0.5 × 0.5 m end-grain fields. Source pixels are preserved at 494 texels/m;
physical chart sizes follow usable pixel intervals after padding, so the artwork
is not stretched. Each board shares its selected strip and longitudinal crop
across faces; standalone backing panels vary strips and crops across their width.

The prior short repeats included conspicuous paper remnants and blotchy stains.
Those were removed with the new scans, whose wear is quieter and irregular over
a longer run. This is source-art wear and crop variation, not new simulated contact
damage. All PBR channels share padded periodic boundaries, with deliberate repeat
fallback for members longer than the available scan.

See the [natural texture review](../../../kowloon-restaurant-props/shelf-natural-review.md)
for actual renders, budgets and validation, and the earlier
[UV repair history](../../../kowloon-restaurant-props/shelf-uv-review.md) for the
aspect-ratio and hidden-cap corrections.

The subsequent [contact-wear pass](../../../kowloon-restaurant-props/shelf-edge-wear-review.md)
adds narrow, irregular lighter bands at actual handled shelf lips and upright
corners. A reversible linear albedo gain is balanced by normalized vertex colors;
the wood's unworn appearance is retained, and the brighter wear exports without
out-of-range GLB colors. Wear is not baked into repeating texture borders.
