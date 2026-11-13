# Procedural shelf texture repair

This records the UV/aspect correction. The later [natural texture pass](shelf-natural-review.md)
replaces the square source bank with long scans while preserving these mapping fixes.

The original mapper fitted a full atlas tile onto each face independently, squeezing
thin edges and selecting unrelated variants on adjacent faces. The first repair
fixed board ownership but still mapped square source artwork onto a 0.25 × 1 m
rectangle. That elongated every source feature fourfold. The user correctly rejected
that result; the previous tests and reviews had checked consistent scale across
faces without checking preservation of the source image's proportions.

The final mapping uses **0.5 × 0.5 m** fields for both side grain and cut ends.
Square source crops retain equal physical pixel density in both directions. This
scale keeps the existing fixture triangle budgets, while a 0.25 m square trial
required too many repeat-boundary subdivisions for the crate-shelf budget.

Boards retain one grain axis and finish across their faces, with side grain wrapped
around their cross-section and end grain on cuts. The backing uses vertical grain;
the kick strip uses horizontal grain. The shared 1024 × 1024 PBR atlas retains
periodic edges and matching padding. All maps are rebaked at the corrected physical
scale, including normal derivatives and the patina sampling coordinates.

The shared reviewer and both shop studies request up to 8× anisotropic filtering.
The device limit is respected. This preserves fine grain on oblique surfaces and
is separate from correcting the UV distortion. It is a viewer sampling setting,
not an exported GLB texture change.

The center upright also had a coplanar top cap underneath the continuous top shelf.
That hidden overlap is removed while its exposed 4 mm front lip and the two outer
caps remain. No stock reservations or collision/navigation geometry changed.

## Actual render comparison

- [Rejected first repair](../../generated/shelf-uv/accepted.png)
- [Corrected source aspect, original filtering](../../generated/shelf-uv/aspect-correct.png)
- [Final shelf, same camera and lighting](../../generated/shelf-uv/aspect-final-accepted.png)
- [Square-and-circle UV diagnostic](../../generated/shelf-uv/checker-final.png)
- [Final restaurant](../../generated/restaurant-props/shelf-aspect-final-accepted/wide-store.png)
- [Six-view capture and frozen input hashes](../../generated/restaurant-props/shelf-aspect-final-accepted/capture.json)

The intermediate aspect-correct image uses 0.25 m squares; the final uses 0.5 m
squares with anisotropic filtering. The checker image predates the hidden-cap removal.
The final isolated shelving unit and sample board contain 232 triangles. The full
restaurant has **21,786 prop triangles**, narrow 8,030, alternate 23,012. All existing
fixture budgets pass. The atlas dimensions and material count are unchanged.

## Validation

- All 14 timber/restaurant tests and typecheck passed. Tests now check equal physical
  pixel density and orthogonal charts independently from grain direction, retaining
  surface coverage, stock, periodic-border, PBR-export and budget checks.
- Six top-surface probes cover both interior supports, their exposed front lips and
  outer caps, requiring exactly one upward surface in ordinary and mirrored frames.
- Existing normal-material browser smoke passed: native/GLB shading, companions,
  live roughness, color-space caching and disposal.
- Six restaurant captures completed with no browser errors.
- Independent test and implementation reviews approved the final repair after
  inspecting the corrected texture and cap fix.

Logs are under `generated/shelf-uv-aspect/`: `top-cap-tests.log`,
`normal-material-browser.log`, and `store-final-accepted.log`. The disposable
close-up harness remains under `generated/shelf-uv/`. Production material hashes
are updated in the liquor-store manifest and shelf-weathering bake record.
