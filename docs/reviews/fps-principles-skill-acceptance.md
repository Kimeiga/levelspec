# FPS principles skill acceptance review

Reviewed 2026-11-09 by an independent review agent. This is a documentation routing
audit and three forward-reasoning exercises, not a map implementation or engine
acceptance run. No production source, geometry or skill instructions were edited
by this reviewer.

## Verdict

The requested spatial, visibility, cover, elevation, directed-movement and scoped
review behavior is explicitly routed through the four FPS skills and their linked
references. The flat-map, local-repair and unsupported-engine exercises below did
not expose a behavioral gap in those areas.

No material gap remains in the supplied requirements after the final minimal
merge. The parent clarified that early node/edge reasoning is required, while a
separate abstract graph before any spatial sketch is optional. A fresh read confirms
that workflow, strategy, node-to-space and handoff now require provisional named
spawns, objectives, intermediate spaces and purposeful connections before extensive
dependent geometry, including when embedded in a sketch. The early elevation
paragraph also now permits a fully flat outcome without an explicit flatness
constraint, matching the detailed references. Concurrent quick-interest,
architectural-coherence and spatial-exploration additions were retained.

## Resources inspected

- Repository `AGENTS.md` and the installed `skill-creator/SKILL.md`.
- `fps-map-workflow`, `fps-strategy-design`, `fps-combat-geometry`, and
  `fps-map-review` entrypoints.
- Workflow references `node-to-space.md` and `layout-handoff.md`.
- Review references `visibility-and-cover.md` and `scenarios-and-evidence.md`.
- Strategy and combat pattern references.
- `level-authoring/references/fps-workflow.md`, the LevelSpec adapter.

Paths below are relative to `.agents/skills/` unless stated otherwise. Links identify
the maintained instruction route rather than claiming behavior was engine-tested.

## Requirement coverage

| Requirement | Instruction route and observed behavior | Result |
| --- | --- | --- |
| Early node/edge reasoning; named nodes and purposeful edges | `fps-map-workflow/SKILL.md`, Develop the brief; strategy, Design relationships; node-to-space, Choose a starting sketch/Audit the gameplay relationships; layout-handoff, Spatial proposal. Provisional named spawns/objectives/intermediate spaces and purposeful connections precede extensive dependent geometry. Sketch-embedded reasoning is allowed; a separate abstract graph is optional under the clarified requirement. | Covered |
| Spawn placement considers access/contact and offset protection, rather than treating an offset as LOS proof | Node-to-space, Audit the gameplay relationships, chooses anchors from objective access/contact rather than a default axis and checks spawn areas/exits including diagonal/height views. Layout-handoff explicitly says offsets need actual consequences. Visibility guide and adapter reject center-only protection checks. | Covered |
| Routes and architecture before compensating props | Combat entrypoint, Establish the local contract; combat patterns, Shape the encounter; workflow development; node-to-space, Author the journey. Compare enclosure/circulation repairs and assess the spatial composition with props mentally removed. | Covered |
| Area and void are diagnostics, without a majority or density quota | Node-to-space, Arrange spaces; layout-handoff, Spatial proposal; review entrypoint, Reason through action. Inspect oversized areas and purposeless separation while permitting scenic masses and breathing room. | Covered |
| Useful central/freestanding props and low cover remain allowed | Combat patterns explicitly permits coherent open courts with purposeful central machinery, low obstacles and landmark props. Node-to-space preserves distributed low cover and allows props central to a deliberate arena. No generic box ban. | Covered |
| Broad grades, local elevation and flat outcomes are valid | Strategy entrypoint/patterns, combat entrypoint/patterns, visibility guide, and node-to-space, Choose elevation scale. Broad corridor/district grades receive intermediate checks; flat maps and sections are explicitly valid and have no height quota. | Covered |
| A junction may climb beside a parallel route | Node-to-space, Translate connections in three dimensions, describes an ascending branch joining above and records actual transfers rather than false XY junctions. Routed from workflow/strategy and combat's junction reference. | Covered |
| Upper-room windows create observation edges without implied movement | Same node-to-space section, layout-handoff Drawing, and combat entrypoint. Aperture/sill/head/eye dimensions and reverse views are required; traversal depends on actual mechanics. | Covered |
| Diagonal, curved and irregular rooms are permitted without mandatory grids or winding | Node-to-space, Translate connections; combat entrypoint/patterns; layout-handoff Drawing. Inspect body clearance and runtime curve support, retain simple/direct stretches where useful. | Covered |
| Intentional unguarded directed drops use actual mechanics, supported landings and a return/commitment contract | Node-to-space, Intentional directed movement; layout-handoff Drawing; LevelSpec adapter. No automatic rail requirement, no height-only one-way proof, and no synthetic navigation fix to obtain a pass. | Covered |
| Predictive XY plus height/FOV planning precedes actual compiled repeat | Workflow development, layout-handoff Drawing, visibility guide, adapter. Include eye/body/FOV, slabs, low cover and tall occluders, then repeat opposing and intermediate views against compiled geometry. | Covered |
| Long LOS and approximately 100° entry spread are adjudicated warnings, not automatic failures | Visibility guide, Interpret sightline warnings; node-to-space review table. Retain justified lanes/holds, record defense, and do not manipulate thresholds or omit approaches to clear warnings. | Covered |
| Spawn areas rather than just centers | Review entrypoint dedicated visibility pass, visibility guide, node-to-space and adapter explicitly include area/offset samples and exits. | Covered |
| Visible fan rays are not entry inventories; partial/hidden samples remain uncertain | Visibility guide explicitly distinguishes feasible entry frontiers, visible fan directions, hidden/partly occluded/unsupported samples and vertical spread. It does not infer complete threat coverage. | Covered |
| Whole-map macro and focused named-section/boundary reviewers both exist | Workflow detailed gates; review Independent scopes; node-to-space final section; layout-handoff Review packet. Macro covers graph/objectives/rotations/long views; smaller local packets include bounds, object IDs, neighbor threats and actual evidence. | Covered |
| Proportional agent count and fix/reconcile loops | Same routes preserve separate independent spatial/tactical gates, reuse unaffected accepted findings, recheck changed interfaces and reconcile local repairs with macro intent. Local repair routes explicitly avoid whole-map restart. | Covered |
| No Mirage-specific skill rule or example | Case-insensitive search of all four FPS skill directories and the adapter found no `Mirage` occurrence. Research documents were not included in this exclusion check. | Covered within specified instruction scope |

## Forward exercise 1: explicitly flat warehouse map

Request used: “Design a compact 4v4 warehouse capture-point map. Keep every
walkable floor flat at z=0; no mezzanines, ramps or stairs. Include a central
forklift island and useful low machinery cover. Keep the first draft inexpensive.”

Following the current instructions, the first output would be a rough spatial SVG
with actual warehouse rooms, their shared boundaries and routes, spawn areas and
the point. Provisional named nodes and purposeful connections would be embedded
before developing extensive dependent geometry. Flat height is a brief constraint,
so it would be marked once and honored.
A plausible composition is Receiving → Assembly → Dispatch, with a loading apron
wrapping Assembly and a maintenance connection joining the apron before Dispatch.
The island gives Assembly identity and changes approach exposure; it does not
replace purposeful route relationships. No stairs are inserted to obtain an
interest-review pass. The independent quick-interest reviewer evaluates the actual
flat journeys, side connections and readable places against this constrained brief.

After a promising sketch, the developed handoff would name both spawn areas,
Receiving, Assembly/point, Dispatch, Apron and Maintenance. It would record access,
exposure and information costs for their edges, compare alternate adjacency and
point-access arrangements, then predict ground eye/body/FOV views including offset
spawn positions. The freestanding forklift is allowed; the low machinery sequence
receives standing/crouching and follower-view hypotheses. Empty structural/service
land can remain if it has a role, without an occupied-area majority calculation.

Layout spatial/tactical gates precede AML modeling. A whole-map macro packet plus
proportionate focused Assembly and spawn/interface visibility packets would carry
the same revision. Compiled views must repeat the predictions. A long apron lane
or compact visible-entry sector receives contextual judgment, not automatic failure.
No gameplay-balance or engine-proof claim follows from this exercise.

Outcome: flat intent, useful props and low cover survive the workflow, with early
relationship reasoning retained. The final wording also permits a fully flat
outcome when the user has not explicitly demanded flatness; this exercise does not
rely on an exception to an elevation requirement.

## Forward exercise 2: one-crate repair on an accepted map

Request used: “On the accepted warehouse layout, move `Assembly-crate-03` about
half a meter east so the second attacker can see past the first. Keep the repair
to this crate and its immediate doorway encounter.”

The workflow/combat local routes reuse the accepted surrounding arrangement and
relationship graph. They do not initiate fresh whole-map alternatives, a new
quick-interest review of the entire warehouse, or a whole-map strategic audit.
The affected-area drawing would retain the crate ID and show the old/new footprint,
doorway, first/following attacker positions, defender positions and adjacent exit.
Local dimensions and body/camera mechanics would be reused where already known.

The prediction is concrete: the moved crate might improve the follower's defender
view while shortening the defender's covered retreat or narrowing side passage.
Two independent layout reviewers would inspect the small spatial and tactical
scope before author rationale. Their packet needs that encounter and neighboring
threat/support context, not all map detail. After supported findings are resolved,
the AML edit and compile would be followed by the same two local blockout scopes,
paired opponent/follower views and supported passage checks. Only changed
interfaces reopen; macro strategy is revisited if the actual evidence shows an
effect on objective access or territory, rather than merely because a crate moved.

Outcome: local repair stays local while retaining the two required independent
stages. Stable IDs and a scoped before/after prediction make the repair reviewable.
No source was edited and none of these proposed checks was performed here.

## Forward exercise 3: broad grade and proposed one-way drop

Request used: “Make the district approach rise gradually to the objective, with an
unguarded optional drop into the lower service lane. Use LevelSpec for the blockout;
the final game engine and its fall/boost rules are not available yet.”

The first sketch would show the entire grade, its relation to the objective and
service lane, and actual planned transfer points. A section would label takeoff,
landing support, height, exposed landing, onward options and the ordinary return
route or explicit commitment. The return arrow would not be inferred from an XY
crossing. An upper office window could be drawn as observation only; neither it nor
the drop would silently become a bidirectional movement edge.

Development would compare the broad grade with local/flat alternatives and record
which information/support/commitment choice it serves. Visibility planning would
include intermediate eye/body exposure, follower support, cover base/top contact,
tall occluder heights and horizontal/vertical FOV, followed by an actual compiled
repeat when geometry exists. Endpoint screenshots alone would not close the grade.
Macro and local/interface findings would be reconciled after repairs.

The unguarded edge can remain intentional. The directed movement remains proposed
until actual step/jump/vault/boost/drop, landing, damage and recovery mechanics are
checked. The adapter's inspection walker and navigation limitations cannot prove
gap reachability, fall damage or one-way behavior. It forbids adding seeds or
off-mesh links solely for a pass. The honest deliverable would preserve a pending
target-engine test with concrete takeoff/landing/return cases and identify performed
structural/optical checks separately. It would not demand implementation of a new
simulator to close an unavailable mechanic.

Outcome: scale-aware grade design and the intentional edge remain viable, with
unsupported traversal evidence explicitly open. This exercise performed no compile,
walker check, visibility scan or target-engine test.

## Validation actually performed

- Read the resources listed above and traced each requirement to a live instruction
  route, including entrypoint-to-reference links.
- Ran `quick_validate.py` from the installed skill-creator scripts against each of
  the four FPS skill folders: all four returned `Skill is valid!` with exit code 0.
  This checks structure/frontmatter, not design behavior.
- Ran the scoped case-insensitive Mirage search described in the coverage table:
  no matches.
- Fresh-read the final merged node/edge and elevation paragraphs. At
  `2026-11-09T08:01:32Z`, their SHA-256 identities were:

  | File | SHA-256 |
  | --- | --- |
  | `fps-map-workflow/SKILL.md` | `9b36c8a0285d34da19526c215fe20a8b3e6f9a769b9c0d1ca6ba93a91c560891` |
  | `fps-strategy-design/SKILL.md` | `8da46f5df1577a506ad553b3f9c90452379dcc90fa7c899a83237d555487aa0d` |
  | `fps-map-workflow/references/node-to-space.md` | `ded3e4131a7c138fa62a33b4261b091f2b289c7281c917e7571b37311ab11bad` |
  | `fps-map-workflow/references/layout-handoff.md` | `da4e42d1373febaca15ae8200461aa4235ae08eb4630b0f968b04f9a37622279` |

- Performed the three documented reasoning exercises. These are hypothetical
  workflow applications, not independent review verdicts on actual map artifacts.

No browser, compiler, navigation, visibility scanner, live engine, bot or human
playtest was run. No such result is implied by this acceptance review.
