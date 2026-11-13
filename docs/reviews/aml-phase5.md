# AML phase 5: maintained authoring cutover

This record covers the AML cutover and its acceptance checks. Architectural
source remains version 1; generated runtime JSON is version 4, native export
metadata version 3, and CLI publication reports version 1.

## Resulting contract

The package root, CLI, reviewer, maintained examples, authoring builder, seeded
generator, raster tracing, reconstruction, and game/native exporters consume
`ArchitectureDocument` and AML XML. `.aml` is the convention; identical `.xml`
documents are accepted. SVG is an export/drawing format.

Removed SVGX compiler, builder, serializer, and public `/vector` and `/authoring`
entry points. Removed the duplicate `/generate/vector` entry point and V2 producer
names. Native producers expose `generateLevel`, `loadAuthored`, and
`produceDocument(ArchitectureDocument)`. The JSON/Python concept, gameplay-plan,
and semantic-plan frontends and their commands are retired. Raster subprocess
JSON remains evidence; runtime JSON remains output.

`src/vector` retains shared geometry, navigation, validation, and export backends.
Its `RuntimeContext` contains derived reviewer relationships, separate from source
architecture. The private historical `SvgxDocument` decoder and normalization live
under `src/migration`, reachable only through explicit mechanical migration.

Historical SVGX examples, frozen studies, old bake assets, and design-plan inputs
remain in place. Exact historical compiler replay requires the recorded repository
revision. Explicit migration writes a new AML project; it does not infer intent
from old approximations. The maintained Daiban and Dust II AML sources remain
separate architectural rewrites. Historical project scripts can still mention
retired imports; they are historical replay material, not supported current tools.

## Physical and export corrections

Automatic architectural assemblies retain physical membership and contributors.
Separate rendering composition prevents an invisible collision proxy from erasing
visible construction and prevents decoration from erasing support. Dynamic and
terrain partitions stay independent. Mesh parts are homogeneous in kind,
visibility, and collision state. Collision/nav use final physical geometry.

Floor-gap audits use final physical solid identities, correct flight-side winding,
and bounded boundary tolerance. Ramp triangulation bounds nonplanar cross-section
height variation; planar ramps retain their exact surfaces. Named traversal owners
are validated even with navigation disabled. Opt-in enclosures are reviewed against
actual exposed physical face intervals, including partial railings and open entrances.

Native BSP export retains final closed composition, with distinct physical and
visual purposes. Exact cuts remove zero-volume residue only with volume conservation
and strict mesh progress; final missing/extra-volume auditing stays mandatory.
Exposed material partitions survive convex decomposition. Work admission, piece
counts, cancellation, and native allocation cleanup are bounded. Imported
visualization meshes are rejected as BSP brush inputs and never become checked
CSG operands.

## Lighting

All three maintained Cycles presets were regenerated from native AML with Blender
5.1.2, 32 samples, 1024-resolution atlases, density 8, and padding 8. Assets live in
`website/assets/bakes/aml-v1`; the old namespace is unchanged. Checks verify exact
source, geometry/corner hashes, material assets, calibration, and every EXR/mip
checksum.

Positive-area receivers omitted or collapsed by xatlas receive local planar UV
charts and are repacked. Both local dimensions use a minimum 1/16 texel extent;
the Euclidean expansion plus subsequent precision/seam repairs stays within 1/8
texel. Source geometry, per-corner attributes, physical surfaces, and hashes are
unchanged. Repair counts and maximum expansion are reported in compiled stats.
Strict GPU area, density, and overlap audits remain authoritative. Every visible
static receiver now requires an atlas page, including sub-square-millimeter faces.
Hidden and dynamic nonreceivers retain live shading.

## Verification and independent review

- Core Node suite: 476 passed, one optional Quake native-tool integration skipped.
- Generator/tracing suite: all 21 passed, including seven families, route capacity,
  deterministic furniture, image subprocesses, cancellation, and bounded resources.
- Strict bake suite: all five passed, including tiny omitted receiver rejection.
- The final matrix passed all 525 style/curve/elevation combinations, all 25 slider
  positions, blocked-route recovery, physical walking, and trim/capital overlap
  checks.
- Independent retained geometry review: 119 passed; the reviewer recorded coverage
  dispositions rather than dropping continuing geometric contracts.
- Independent export/public/migration/CLI/UV/reference review: 76 passed and one
  optional Quake toolchain skip. Five UV cases include all published presets and
  Dust II. Export planes/materials and retained physical volumes use independent
  expectations.
- The unchanged exhaustive site suite has its own required Node 24 CI job with
  a 30-minute budget. Core checks/builds and browser/producer jobs remain required
  through the existing verification gate; no test selection or assertion changed.
- Type checking and viewer, website, and game production builds passed. Native CLI
  publication of Showcase, Dust II, and Daiban succeeded with zero diagnostics;
  explicit Dust II migration wrote a separate AML project successfully.
- Real Chrome capture and all eight sequential live-preview browser scripts passed.
  All 20 production site/viewer browser checks passed with zero recorded errors;
  they cover offline reload, framing, camera controls,
  section/appearance, walking, dimensions, source failure recovery, Dust II loading,
  cancellation, graphics-context loss, and 2D fallback.
- A 38-file pre-change inventory of original SVGX examples and historical bake
  assets was verified unchanged by SHA-256.

Test review preceded production corrections. A separate implementation reviewer
reviewed the corrections and final follow-ups, including native ownership/resource
cleanup, API retirement, bounded BSP work, UV identity/repair limits, and strict bake
receiver validation. Neither review has an unresolved material finding.

Evidence and full command logs are under ignored `generated/aml-phase5/`, including
`core-final.log`, `producers-final3.log`, `bakes-final-strict.log`,
`uv-independent-final.log`, `owned-independent-final.log`,
`preview-full-independent.log`, `site-browser-final/`, and
`historical-verification.json`. The earlier site aggregate run started against old
bake assets; those bake failures were resolved by the fresh package and separately
rerun strict suite, without weakening assertions.

## Remaining judgments and limits

The optional real Quake BSP toolchain integration was not run; native brush/source
and volume/material checks passed. Browser builds retain the existing large-chunk
warning. Static navigation sampling and collision-aware route replay are compiler
and traversal evidence, not continuous gameplay proof. Daiban photographic fidelity
remains on hold for the camera/high-overhead comparisons recorded in the phase 3
review. No frozen reconstruction evidence was rewritten to claim acceptance.

A concurrent, separately owned flat-renderer update changed `review/scene.ts` and
`tests/inspection-browser.mjs` at the end of acceptance. Those edits were preserved;
the updated inspection browser test, type checking, and both renderer builds
passed. Their source hashes are recorded
separately in `concurrent-source-deltas.json` and `final-source-inventory.json`.
