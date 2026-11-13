# Kowloon plain-wall study

Studied on 2026-11-09 as themed invention, not a reconstruction. Photographs are
visual references only; none were copied into generated textures or decals.

- User's supplied alley photograph: mottled plaster, paper remnants, vertical
  drainpipes with joints, uneven small service runs. The exact source attribution
  was not supplied. Read from the attached clipboard image.
- [Ian Lambot, Daylight Alley, Blue Lotus Gallery](https://bluelotus-gallery.com/kowloon-walled-city):
  the left wall has broad quiet plaster, faded writing and damp lower areas;
  utility bundles concentrate at upper edges, with irregular slack spans.
- [Kowloon alley photograph in AD](https://www.admagazine.fr/article/kowloon-walled-city-ville-sombre-dangereuse-monde):
  corrugated closures, layered metal and masonry, notices at different heights,
  and cables tied along services. Historical claims in the article were not used
  as design evidence.

The implementation uses material variation in the receiving wall, with restrained
secondary geometry. Early rectangular patch/notice-heavy renders looked like
stickers; those were replaced by actual material sections and continuous finish
variation. Large repeated facade panels were removed. User feedback also required
curves and connected AML walls to be planned as spatial runs, with neighborhood
spacing to suppress repeated motifs.

Invented implementation dimensions: props project at most 14 cm; smooth joins
use a 2.5 cm endpoint tolerance and a 60 degree turn limit. These are conservative
render placement limits, not measurements inferred from photographs. Closed
shutters and grilles do not create a room or change collision.

Review images and screenshots are retained under ignored
`generated/wall-dressing/`; current source is
`tests/fixtures/aml/wall-dressing.aml`. Paper notices use an original generated
six-cell Chinese print atlas, not a transcription of photographed signs. Full texture realism still
depends on the author's supplied receiving material.

## Material implementation

The demo adds two built-in ImageGen concrete images: porous bare cement and
flaking repaired render. Prompt provenance is in
`projects/dressing-demo/textures/wall-textures-prompts.json`. The generated
`reference/kowloon-walls/tile-stripped-study.png` guides appearance only.
Actual tiled regions use a continuous per-run grid, correlated tile removal,
broad triangular/trapezoidal remnants and per-tile tint/chipping. Missing cells reveal
the real receiving substrate. Texture changes use declared palette entries
without green recoloring; suitable straight seams have shallow pilasters.

The refinement adds generated ceramic glaze and galvanized-metal albedo/normal
pairs, plus the paper-notice atlas. Tile shapes have subtle skew and irregular
inward wear. Patch boundaries keep large remnants, following the study's
ragged ceramic silhouettes instead of scattering thin strips. The final border
uses continuous procedural noise and two nested textured planes: a larger rough
plaster/body footprint underneath a smaller ceramic surface. Their uneven setback
replaces the rejected alternating zigzag cuts. Normal maps carry
fine relief on intact surfaces. Repeated pipe cylinders were replaced with a
shared-ring sweep and rounded elbows, so corners form a continuous shell.
