# Courtyard restart workflow update

The user rejected the previous model after alternate views exposed gaps and arbitrary
inclines, then clarified that even good schematics had not translated faithfully
into 3D. This update changes the review gates, not the geometry of that frozen trial.

The architectural skill now requires multiple original angles, fuller source-visible
schematic coverage, conventional per-level floor plans, stacked overlap drawings and
sections, and an explicit drawing-to-compiled-model audit. Three distinct critical
agents review reference fidelity, circulation/usability, and construction geometry.
They lead with overall structural challenges and adjudicate defenses or repairs.
Whole-volume inspection cannot be replaced by a favorable image or narrow clear path.
Actual constrained FPS traversal supplements physical checks and photo comparisons.

PR #13 was verified with GitHub: current head
`d08fe27aedc7e360d929a948439283bcf20835f5` is already a parent of local merge
`ba324bd1bf9b4e2a734b2fdb574ad46f0002937f`. Its deterministic runner is required for
every frozen 3D candidate, with independent evidence, preserved per-attempt failures,
open/closed-state navigation checks and valid-best retention. No new remote merge
was needed. Both source and model review remain necessary beyond runner metrics.

The restart is `projects/dai2-daiban/studies/multiview-restart/`, identified by the
project CURRENT.json. Earlier model/plan evidence is preserved and labeled historical;
new source observations and floor plans do not inherit earlier coordinate fits as
facts. User-reported screenshots are archived as rejected-model evidence, distinct
from reference photography. No new 3D acceptance is claimed by this workflow change.

## Tool verification

The shared reviewer now provides supported feet/yaw/pitch inspection starts, actual
body-placement checks, replay URLs and actual FPS pose/matrices. Navigation movement
is unchanged; this is not free flight or swept-collision proof. See the independent
[test review](fps-inspection-test-review.md) and
[implementation review](fps-inspection-implementation-review.md). Both released
following material fixes for overwritten form drafts and stale active-walk state.

- Independently verified focused FPS/view/clock tests: 21 pass.
- Independently run expanded real-Chrome inspection test: pass, evidence in
  `generated/walk-inspection-browser-SUBYDY/`.
- PR #13/reconstruction focused suite: 36 pass (run by coordinator).
- Builder reports typecheck, viewer/site builds and existing frame-aspect browser
  matrix passing. Two unrelated existing site-experience assertions still fail;
  the full site suite is not claimed green.
- Skill frontmatter structure, relative links and whitespace checked. The bundled
  skill validator could not run because system Python lacks PyYAML; no dependency
  was installed merely to check these Markdown edits.

These are tooling and workflow checks, not photographic reconstruction acceptance.

## Drawing translation support

The new coordinated r02 drawing packet uses one dimensional ledger for all plans,
stacked footprints, sections and assembly mapping. Its native-stair translation
contract preserves conventional riser/going geometry by assigning the native top
tread cell to an explicitly partitioned upper apron. Actual compiled cuts remain
required; generating consistent drawings does not establish that XML implements them.

Native `underside="stepped"` now represents the physical stepped bottom, including
retaining seams, overlap/gap checks and retained exports. Separate
[test review](stepped-underside-test-review.md) and
[implementation review](stepped-underside-implementation-review.md) released the
bounded change. The builder's full Node run passed 313 tests with one optional BSP
skip; typecheck and both builds passed. The test reviewer subsequently added a
nonzero-sample assertion and independently reran all nine stepped cases successfully.
That final test-only strengthening does not change production geometry. These
results support the tool contract, not any courtyard reconstruction verdict.

The first native courtyard trial also exposed a floor-gap checker defect: an
intermediate physical floor slab sealed the alleged gap, but only wall caps were
eligible to establish sealing. The bounded correction includes actual static
collidable floor/stair caps in the existing signed solid-interval audit. It retains
real partial-length and vertical gaps and excludes dynamic/noncolliding surfaces.
Separate [test](floor-gap-solid-seal-test-review.md) and
[implementation](floor-gap-solid-seal-implementation-review.md) reviews released it;
the full Node run passed 317 tests with one optional BSP skip. The same frozen
building now passes PR #13 geometry/navigation, while its reverse image comparison
still fails. Both runs are retained in the project cycle record; neither numeric
edge matches nor successful static navigation establish architectural acceptance.

## Independent camera-direction checks

The paired-contour guidance now requires a source-only orientation cross-check for
all geometry-informing perspective photographs with usable parallel architectural
edges. Fitted doorway/stair points are not independent validation when their world
dimensions were hypotheses. The current courtyard study exposed a material A06
pitch disagreement between stationary masonry and an earlier metric fit; r08 remains
unfrozen while that discrepancy is reviewed. Source direction, subsequent camera
translation/geometry fitting, actual plan-to-model conformance and architectural
acceptance remain separate records. Raw rejected fits and existing model snapshots
are retained.
