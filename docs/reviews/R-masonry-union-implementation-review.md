# R masonry union — independent implementation review

Date: 2026-11-01. Disposition: **accepted for the bounded project geometry
implementation; no material implementation finding.** This does not accept
photographic fidelity, measured dimensions, structural support, collision or
gameplay reachability. The retained S interface remains an unresolved assembly
boundary, explicitly outside the five-part render union.

Read the [independent pre-test assessment](../../projects/dai2-daiban/studies/r02/R-masonry-union-test-review.md),
actual `union_masonry.mjs`, `author.py` nomination/retirement, `court_mesh.py`,
source-CAD join rules, repository GLB/prop contracts and installed Manifold types.
Applied repository reference-authoring and test/readability guidance. No production,
helper, model, source-CAD or fixture code was edited. `author.py` was not executed
by this reviewer, and user preview 5186 was not operated.

## Geometry and transform contracts

The helper reuses `parseGLBGeometry()` to apply GLB node transforms and convert
glTF Y-up into domain meters/right-handed Z-up. It then applies the nominated XML
asset scale, extrinsic X→Y→Z degrees and translation exactly once through
`transformPropPoint()`. The Python writer alone converts returned world-domain
geometry back to glTF `[x,z,-y]`. There is no primitive-bottom-origin assumption,
second axis conversion, reimplementation of Euler order or material-dependent CSG.

The five explicit nominations share tile material and `collision="none"`:
window wall, pier, left/right heads and underside. Empty nominations, mixed or
missing material ownership and collision owners reject before kernel work.
Coincident flat-face vertices are merged before constructing each solid; every
constructed solid and the union must report `NoError` with positive volume.
Python additionally requires one connected result before writing the replacement.
This is a small project process boundary, not a new general-purpose mesh API.

Successful kernel output and GLB writing precede staged XML retirement. The actual
five old props and their dedicated asset declarations are removed, followed by one
tile/render-only replacement at identity transform. No broad spatial/material sweep
selects unrelated owners. Actual XML checks confirmed retained window infill, metal
frame and green components remain, and `C-G-retained-wing` still owns solid collision.
This is not an atomic transaction for the whole pre-existing authoring generator;
invalid union output does not trigger retirement or an empty replacement.

## Front partition, precision and native ownership

The optional front partition adds its actual profile directions to the existing
radial sampling, verifies that it lies between the opening and outer boundary, and
divides the same front plane into two bands. It creates neither a second shell nor
an extruded decorative ring. Individual front triangles with negligible projected
area at coincident hidden-bottom cuts are skipped; the actual result passes closed
solid validation. Other callers retain the existing no-partition behavior.

Float32 conversion remains at the existing GLB/Manifold boundaries. No millimeter
snap, dilation or contact-hiding offset was introduced. In an independent station 5m,
nominal 0.2m wall control, float32 plane coordinates account for a 2.73e-6m³ difference
from ideal analytic volume; partitioned and unpartitioned output volumes agree to
floating-point noise. That is a conversion tolerance, not a claimed survey precision
or a clearance tolerance. The reviewed 25mm gray recess and source-defining bands
remain separate from this numerical scale; their photographic adequacy belongs to
the architectural critic. Same-material union does not itself preserve or establish
a radial tile-joint/texture scheme.

`Mesh`/typed arrays are JS data; every returned WASM `Manifold` is registered before
its status is examined. Union and decomposed component wrappers join the same
ownership list. Reverse-order `finally` deletion covers normal return, failed part
status, failed union and later extraction exceptions. No native resource is retained
between process calls. Invalid constructor calls that throw before returning are
handled through the installed kernel boundary, matching the repository pattern;
already-owned earlier solids still reach cleanup.

## Independent executions

- Ran `python3 projects/dai2-daiban/union_masonry.exercise.py`: final 7/7 passed at
  `generated/dai2-daiban-review/masonry-union/run-cs4t3_b2/`. The final test correction
  independently derives emitted-triangle signed volume/area, nondegeneracy and
  closed, oppositely oriented welded edges. It no longer relies only on echoed
  kernel metadata. The volume 2/area 10 touching-box control and absence of the
  internal X1 plane distinguish union from area 12 concatenation. Open/mixed/
  collision/empty failures and subsequent recovery remain covered.
- Added temporary process checks for a valid singleton (volume 1/area 6), and combined
  X→Y→Z 90° rotations after nonuniform scale `[2,3,4]` and translation `[5,-7,2]`.
  The two-cube output independently matched bounds `[5,-7,-2]..[9,-4,2]`, volume 48
  and area 80. These use the actual flat-vertex GLB reader/transform/kernel path.
- Re-executed the actual five-part R nomination, read-only. Output was `NoError`,
  one component, 619 vertices/1238 triangles, and every indexed edge had two faces.
  Independently integrated triangle volume 7.222839774816686 and
  area 91.9188587510624 match reported 7.222839774816685/91.91885875106239.
  Actual XML had exactly the render-only replacement and retired nominee IDs/assets.
- An independent rectangle/circular-hole wall with/without a coplanar front band
  produced the same area 32.610536486 and volumes 2.8468203675523243/2.846820367552324,
  each `NoError` and one component. This checks partition volume/area rather than
  accepting a plausible silhouette as proof that no shell was added.

Temporary probes/results: `/tmp/R-masonry-independent-review.py`,
`/tmp/R-masonry-independent-review-results.json` and
`/tmp/R-front-partition-review-results.json`. Returned actual geometry is retained
under `/var/folders/61/r756smb95_16p68hfyzwypq40000gn/T/R-masonry-review-qibyp7hi`.
Strict compilation, frozen capture and source-view appearance acceptance remain
separately attributed project gates, not executions claimed here.

## Explicit S boundary and reviewed identities

Only the five new R render owners were united. Retained S is excluded and retains
its own visual/collision owner; the R↔S interface can still contain an internal
assembly boundary. The union metadata logs this limit. One closed R component does
not mean the complete court/building is united, internally face-free, structurally
verified or navigable. No collision authority was added to the new R owner.

| File | SHA256 |
|---|---|
| `union_masonry.mjs` | `5b2d3820446736baf6d4a1b628328cec49a3e166addeb481b672d49b0f3261fd` |
| `author.py` | `7dfd9af5a6652d7d1f917b038651c69428957424d14bdf7149a5e42f215203df` |
| `court_mesh.py` | `a01362378e2c3bb365166ee8ee5444d6aaf565079a63f209f01f47ddf71d3d52` |
| final `union_masonry.exercise.py` | `f71cb5f4428dfe05c38c2dfeef1fa2d78906ef388b36cf1764356e20099381c1` |
