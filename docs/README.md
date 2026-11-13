# Documentation

Use [the repository quickstart](../README.md) and [agent instructions](../AGENTS.md)
first. Current guides describe supported behavior; archived records describe their
original revision and are not current acceptance claims.

## Current guides

| Task | Guide |
| --- | --- |
| AML syntax, native geometry, migration, and delivery status | [AML authoring](AML.md) |
| Terrain, grading, playable zones, metadata, and tile limits | [Terrain](TERRAIN.md) |
| Native architectural authoring, references and visualization assets | [Reference authoring](REFERENCE_AUTHORING.md) |
| Seeded generation and image tracing | [Producers](PRODUCERS.md) |
| Shared material defaults, PBR mapping and authored overrides | [Material library](MATERIALS.md) |
| Kowloon floors, walls, procedural buildings, and boundary attachments | [Procedural dressing](DRESSING.md) |
| Kowloon generation bottlenecks, profiling, and Rust parallelization boundaries | [Performance analysis](PERFORMANCE.md) |
| Graph/spatial alternatives for AI map planning | [Exploration lab](EXPLORATION.md) |
| Formats, textures and optional native exporters | [Exports](EXPORTS.md) |
| Non-blocking geometry suggestions and review suppressions | [Suggestions](SUGGESTIONS.md) |
| Orthographic reviewer and browser acceptance setup | [Reviewer](WEBSITE.md) |
| Implemented capabilities and remaining limits | [Implementation](IMPLEMENTATION.md) |
| Clean checkout, retained assets and checkpoint limitations | [Computer transfer](TRANSFER.md) |
| End-to-end sample | [Corridor and overpass project](../projects/corridor-overpass/README.md) |

## Authoring workflows

Use [level-authoring](../.agents/skills/level-authoring/SKILL.md) for invented or
reference-based maps: structural blockout, clean physical topology and usable routes.
For clear themes, [reference-level-authoring](../.agents/skills/reference-level-authoring/SKILL.md)
uses real-image study before layout selection and targeted lookup as details
develop. Its reconstruction mode adds source-fidelity checks when correspondence is
required; inspiration alone preserves freedom to invent. Plans, tracing, matched cameras and the
[reconstruction runner](RECONSTRUCTION.md) are targeted tools for difficult
reconstruction, not requirements for every architectural map or revision. Ordinary
architectural maps use proportional independent structural review; complex projects
can add specialists. FPS gameplay work follows the additional workflow below.

[Architectural review](../.agents/skills/level-architecture-review/SKILL.md) adds an
independent enclosure/building-plausibility pass for whole-map/building blockouts and
broad architectural revisions. Indoor roofs/ceilings are modeled where appropriate;
cutaways are an inspection choice rather than a substitute for overhead geometry.

## FPS gameplay workflows

[fps-map-workflow](../.agents/skills/fps-map-workflow/SKILL.md) owns FPS authoring phases,
independent review progression and structural iteration. Use its
[spatial guide](../.agents/skills/fps-map-workflow/references/node-to-space.md) for
optional design directions and exploration methods. Concrete layouts remain open
within the user's brief; no named map, topology, feature bundle or generation method
is prescribed.

During gameplay development, use [strategy design](../.agents/skills/fps-strategy-design/SKILL.md)
for territory/objectives and [combat geometry](../.agents/skills/fps-combat-geometry/SKILL.md)
for local encounters. [fps-map-review](../.agents/skills/fps-map-review/SKILL.md) owns
stage-specific review protocols. [level-authoring](../.agents/skills/level-authoring/SKILL.md)
and its [tool adapter](../.agents/skills/level-authoring/references/fps-workflow.md) cover
physical geometry, inspection and available evidence. These workflows do not add a
combat simulator or infer balance from static validation.

The [research synthesis](research/fps-principles-and-evidence.md) records mechanisms
and counterexamples; the [sightline revisit](research/fps-sightline-opportunities.md)
examines useful cross-space combat as well as unwanted exposure.
The [individual-review transfer](research/fps-review-transfer.md) records which
recovered source findings were applied to the skills and their evidence limits.
[Fusion](../projects/fusion/README.md) applies those skills to a 5v5, two-objective
blockout built around a full-scale ITER-inspired reactor.
The opt-in [sampled visibility audit](FPS_VISIBILITY.md) helps
prioritize investigation; warnings are not gameplay acceptance tests.

## Commands and contracts

Use `npm run --silent levelspec -- --help` for authoritative CLI flags. `migrate`
explicitly translates SVGX into a new AML project; normal commands accept AML.
`init`
creates XML/projects without overwriting, `validate` writes no artifacts, `build`
requires `--out`, and `preview` is read-only and long-running. Finite `--json`
commands return one stdout result with diagnostics/report and available artifact
paths; progress is stderr. Exit codes: 0 success, 1 operation failure, 2 usage,
130 SIGINT. Synchronous WASM work can delay cancellation delivery.

Validation failure is not an instruction to weaken a route or clearance assertion.
Inspect source-linked diagnostics, repair XML, and retry. Inspect reports as well
as meshes. Premap validity does not verify gameplay reachability. Optional native
prerequisites and unavailable checks must be reported explicitly.

## Historical evidence

[Archived records](archive/README.md) and [revision-scoped reviews](reviews/) preserve
past findings. They do not supersede these guides or current CLI help.
The [cleanup record](CLEANUP.md) explains source ownership and retired content.

### First-person inspection controls

In the web reviewer, start **Walk** or enter supported feet under **Walk from
coordinates**. Use WASD/arrows, Space to jump, and hold Ctrl or C to crouch.
**Movement helper** can keep jumping or stay crouched for viewpoint comparisons;
choose **Off** to release it. Esc exits. Placement, exit, focus loss, visibility
changes and source reload reset the helper.

Crouch changes both the physical body and the camera height; standing up waits
for headroom. Jump and crouch remain within existing land navigation, so they do
not verify gap jumps or routes through passages excluded by the standing navmesh.
See the [FPS harness guidance](../.agents/skills/level-authoring/references/fps-workflow.md)
for published eye/stance state and inspection physics.
