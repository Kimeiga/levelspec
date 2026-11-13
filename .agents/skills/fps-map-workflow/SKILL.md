---
name: fps-map-workflow
description: Create or revise FPS maps through spatial exploration, independent review, gameplay development, and verified 3D blockout iteration. Use for new maps and gameplay-relevant geometry changes, including local cover repairs. Not for architectural-only modeling or presentation changes.
---

# FPS map authoring workflow

This skill owns the process. The AI chooses the concrete layout, architectural
language, topology, elevations, sightlines and strategies within the user's brief.
Design principles guide those choices; they do not prescribe a map type, feature
bundle, node count or generation method.
Invent the composition for the current brief rather than repeatedly reskinning the
same route network. In particular, three parallel approaches joined by a lateral
bridge are not a default template.

## 1. Research and plan the place

For a new map or substantial redesign, invest in planning before settling on a
layout. Accept the supplied theme or choose a coherent setting when none is given.
Use [real-image reference study](../reference-level-authoring/SKILL.md#theme-reference-study)
to inspect varied real examples of that place type: its characteristic spaces,
circulation, structures, enclosure and level relationships. Keep sources and concrete
observations. A station must work spatially as a station, not acquire the name after
a generic layout is drawn. If lookup is unavailable, state what remains ungrounded.

Explore materially different architectural organizations before selecting one. Let
the site's constraints and the place's uses shape the actual masses, gaps and
routes before choosing a grid. Keep a regular layout where those drivers explain
its order, including a whole-map grid when appropriate. When the order lacks that
basis, draw a contrasting arrangement before committing. Use the
[layout order guidance](references/node-to-space.md#layout-order) to develop the
alternative. Keep working diagrams provisional as the architecture develops.
Plan substantial journeys, intermediate spaces
and architectural interactions, including how a connection can become an overlook,
shared volume or through-route rather than always ending at another doorway. Use
[spatial exploration](references/node-to-space.md) for optional directions and methods.
When procedural exploration is chosen, use the [exploration lab](../../../docs/EXPLORATION.md)
to sample contrasting graphs and several spatial interpretations before committing
to the first sketch. The first two passes broaden the AI's plan; they do not select
or freeze the final architecture. The AI operates the lab with its ordinary tools,
compares actual images and generated alternatives, and may discard or substantially
restructure them. Keep generated evidence and later authored AML revisions separate.
Built outdoor maps normally start from site, streets and building masses, with play
space emerging between them. Other settings can begin with architecture, connections,
carved space or terrain; combine or change methods as useful.

Invite independent design proposals while alternatives are still open. For a new
whole map, assign different macro perspectives and spatial interpretations from
the [proactive review protocol](../fps-map-review/references/design-development.md).
Give reviewers the raw brief, reference observations and candidate drawings before
the author's preferred explanation. Compare their alternatives before committing
to one developed proposal. Generated candidates can disrupt habitual planning;
their topology and shapes remain open to substantial reinterpretation.

Then draw a readable, labeled SVG proposal that expresses the developed spatial
concept. Show actual spatial shapes and provisional
spawn/objective anchors, meaningful intermediate spaces and connections. Indicate
levels and transfers where relevant; a separate abstract graph is optional. Inspect
the drawing visually. Distinguish playable limits from scenic continuation and draw
the interfaces that define important spatial interactions; naming an overlook or
through-route is not a substitute for showing it. Keep finishes and precise combat
detailing provisional; do not omit the place's spatial substance to make the first
drawing quick.

Immediately give the brief and sketch to an independent review agent for the
[spatial-interest review](../fps-map-review/SKILL.md#spatial-interest-review).
For a new whole map or broad redesign, assign a separate independent
[organic layout reviewer](../fps-map-review/references/organic-layout.md) in the
same round. Give both reviewers raw drawings and reference observations before
author rationale. This first pass needs a readable spatial proposal and can
leave mechanics and local combat details provisional.

Resolve consequential findings from both assigned scopes before developing the
direction. For rework or unclear findings, revise or clarify the proposal and
obtain a return review of the affected scope. Do not demand perfection from a
first draft or replace judgment with counts and feature checklists.

## 2. Develop gameplay and layout

Discover available game settings before asking. Establish consequential movement,
body/camera, weapon/utility, objective, respawn and clock assumptions for the intended
population; record unknowns. Use relevant stress cases without expanding the brief.

Revisit real reference images for concrete architectural questions as the layout
and details develop, using the reference skill's study mode. Inspiration informs
plausible spaces and assemblies without requiring a copy of a source building.

Use [strategy design](../fps-strategy-design/SKILL.md) for map-wide decisions and
[combat geometry](../fps-combat-geometry/SKILL.md) for local encounters as needed.
Develop the actual spaces and their movement, observation and support relationships
together. Compare alternatives where the arrangement or gameplay remains uncertain.

Carry research into concrete hypotheses, not universal recipes. For a consequential
connection or hold, identify the team/phase, information-to-action delay, required
support and a failure or fallback condition. See the strategy skill's
[reviewed mechanisms](../fps-strategy-design/references/reviewed-mechanisms.md) for
conditional examples and evidence limits. Do not treat retrieved-but-unread sources
or partially inspected setup diagrams as completed research.

Run a design-development round across macro strategy and local encounters. Assign
distinct reviewers to territory/rotations, opposing plans and information, spatial
composition, and the relevant sites, approaches or movement interfaces. The review
protocol governs coverage and evidence. Collect proposals before selecting a coherent
set of changes, resolve conflicts, and compare promising alternatives where needed.
Record adopted, experimental, deferred and declined proposals with brief reasons.

Update the labeled layout before production modeling. Use the
[layout handoff](references/layout-handoff.md) for dimensions, object IDs, sections,
height-aware visibility predictions and review packets appropriate to this stage.
Obtain separate independent **spatial/visibility** and **strategy/player behavior**
reviews. The [review skill](../fps-map-review/SKILL.md) owns their scopes and focused
section work. Resolve supported consequential layout findings before 3D production;
keep questions requiring compiled evidence explicitly open.

## 3. Build and inspect

Use [level-authoring](../level-authoring/SKILL.md) for physical construction and
circulation. Build the developed relationships with coarse visual detail, compile,
validate and inspect actual geometry. Follow claimed routes with the unchanged
player body and inspect important opposing views and level transitions.

Give reviewers actual compiled encounters to seek further gameplay opportunities.
Test selected proposals in bounded variants, update the layout, and examine their
local and map-wide consequences. A reviewer who substantially designed a selected
change must have its outcome assessed by another independent reviewer.

Obtain the same two independent review scopes on the compiled blockout, including
applicable structural and focused visibility evidence. Repair supported defects and
recheck changed interfaces. A passing layout review does not close blockout checks.
Also obtain the independent [architectural review](../level-architecture-review/SKILL.md)
for whole maps/buildings or broad architectural revisions; assign it explicitly,
potentially alongside structural review, rather than treating shader styling as
proof that enclosure and building form are complete.

## 4. Iterate and hand off

Use review findings, engine checks and available playtests to refine the map.
Distinguish hypotheses, compiled inspection, measurements and observed play. Report
remaining uncertainties and deliver source, outputs and revision-matched evidence.
Use the target engine for mechanics the authoring harness cannot establish; do not
expand the assignment into building a simulator.

Any later phase may make major structural changes: reroute connections, merge/split
spaces, reorganize masses, alter elevations or move spawns/objectives within the
brief. The first sketch and its direction choices are hypotheses, not a frozen
blueprint. Prefer a structural correction when appropriate over compensating props.

Update the drawing and affected IDs, including retired features. Re-review changed
macro/local relationships. If the overall composition changes, obtain a brief
spatial-interest recheck and revisit organic layout findings where the change affects
the plan's order. Reuse unaffected evidence rather than restarting every stage
automatically.

End a design-development round when selected experiments have been resolved and
required findings closed at the current stage. Carry remaining optional ideas into
the playtest queue. Reopen an area when a new finding or chosen experiment warrants it.

## Scope and execution

For local repairs, retain the accepted surroundings and skip whole-map exploration.
Update the affected-area drawing before geometry edits and perform the detailed
layout/blockout reviews on that encounter and its interfaces. Broaden a repair only
when evidence and the authorized scope warrant it. Review-only critique does not
author geometry or initiate the full authoring process.

Review gates concern independent agents, not routine human approval. If a required
reviewer is unavailable, disclose the open scope and continue preparatory work;
do not claim independent acceptance or advance into production past an unmet gate.

For LevelSpec tools, coordinates and inspection limits, read the
[adapter](../level-authoring/references/fps-workflow.md) when building or verifying.
Add source-fidelity review only when correspondence is required, and presentation
guidance when that task is requested.
