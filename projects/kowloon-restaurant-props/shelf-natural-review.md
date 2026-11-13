# Natural shelf texture pass

The later [contact-wear pass](shelf-edge-wear-review.md) adds localized edge
brightening while retaining these long scans and varied crops.

The corrected square UVs still repeated the same half-meter patch, including
recognizable paper remnants and dark stains. The new material uses four long
continuous wood scans, with quiet irregular grain and wear. Built-in ImageGen
produced the [source](../kowloon-liquor-props/materials/shelf-weathering/wood-long-source.png)
from this [prompt](../kowloon-liquor-props/materials/shelf-weathering/wood-long-source-prompt.txt);
the neighboring provenance file records their hashes.

Each board selects one scan and one longitudinal crop shared across its faces.
Wide backing panels vary the scan and crop across their width. The source grain
and scuffs retain their physical proportions at 494 texels/m. Typical boards fit
within the approximately 3.09 m scan, avoiding short longitudinal repetition;
longer members retain a periodic fallback. This varies source-art wear and crop
placement, rather than introducing simulated contact damage.

## Actual renders

- [Previous square-patch material](../../generated/shelf-uv/aspect-final-accepted.png)
- [New material, same camera and lighting](../../generated/shelf-uv/natural-r01.png)
- [Whole restaurant](../../generated/restaurant-props/shelf-natural-r01/wide-store.png)
- [Elevated restaurant](../../generated/restaurant-props/shelf-natural-r01/elevated.png)
- [Six-view capture, source hashes and browser checks](../../generated/restaurant-props/shelf-natural-r01/capture.json)

The periodic pale marks and blotchy squares are absent in the new close-up; grain
is quieter and the boards differ in tone and sampled detail. The generated flat
material is source artwork; these linked shelf and restaurant images are actual
renderer captures, not concept art.

## Cost and validation

The isolated shelf and loose board fall from 232 to **84 triangles**, as the long
charts need fewer subdivisions. The restaurant has **21,668 prop triangles**,
the narrow version 8,018, and the alternate seed 22,894. Existing fixture budgets
remain unchanged and pass.

The three shared maps grow from 1024² to **1024 × 1792**: approximately 21 MiB
uncompressed base RGBA storage, or 28 MiB including mipmaps, versus 12/16 MiB
previously. Their PNG files total approximately 4.05 MiB. Material count is unchanged
and texture storage is shared across all shelves, not allocated per board.

All 14 focused timber/restaurant tests and typecheck passed. Tests retain source
aspect, surface coverage, stock, top-cap and budget checks, and now cover continuous
longitudinal crops across board faces, variation across six boards and a wide
backing, rectangular atlas padding/PBR alignment, and a 4.2 m fallback member.
Six browser captures completed with no errors. Independent test and implementation
reviews inspected the source and actual render and approved the result.

The capture records its frozen input versions. Concurrent work subsequently changed
the unrelated `wall-finish.ts`; shelf implementation and texture hashes still match
the reviewed capture. This does not claim a frozen snapshot of the entire current workspace.

The bake record and liquor-store adoption manifest contain current hashes and
dimensions. The previous UV repair remains documented separately in
[shelf-uv-review.md](shelf-uv-review.md).
