# Map skill cleanup plan

Status: implemented, 2026-11-09. This document retains the approved intent and audit
baseline; current instructions live in the skills and repository routing. Results
are recorded at the end.

## Outcome

The skills should define principles, workflow and general guidance. The AI chooses
the concrete design: spatial composition, topology, geometric language, elevation,
sightlines and strategic relationships, subject to the user's specifications and
real technical constraints. No named map, preferred typology or feature bundle
should become an implicit model answer.
Originality should affect spatial organization: avoid repeatedly reskinning three
parallel approaches with a lateral bridge. Route count, interconnection, progression
and territory placement remain open to a distinct solution for each brief.

The first phase should produce an original, rough but substantial spatial proposal
that feels coherent and worth exploring. It need not be perfect. Judge whether the
spaces, connections and architectural or terrain logic form a promising whole;
do not require a particular mixture of rooms, corridors, slopes or storeys.

Later phases develop and test that direction. They may make major structural
changes when evidence warrants them. The first drawing is a hypothesis, not a
blueprint that later stages must preserve.

## Audit findings

Reviewed all nine repository skill entrypoints, their routing, and the relevant
map workflow/design/review references. The seven map skills are the cleanup's main
scope; the two programming skills have separate responsibilities.

| Skill | Entrypoint at audit | Cleanup responsibility |
| --- | ---: | --- |
| fps-map-workflow | 221 lines / 2,101 words | Own phase order, progression, iteration and review routing. Remove the duplicated design handbook. |
| fps-map-review | 189 lines / 1,791 words | Own review roles and stage-specific judgments. Shorten the first-draft review. |
| fps-strategy-design | 76 lines / 588 words | Own territory, objectives, information, rotations and team decisions. Link to the workflow instead of restating it. |
| fps-combat-geometry | 94 lines / 779 words | Own local encounters, cover, exposure and support. Remove repeated workflow/brief instructions. |
| level-authoring | 62 lines / 468 words | Own physical construction, topology and circulation. Delegate FPS process to its owner. |
| reference-level-authoring | 54 lines / 375 words | Keep source interpretation and fidelity conditional on actual reference constraints. |
| level-preview-art | 48 lines / 387 words | Keep presentation and renderer acceptance separate from map design. |
| write-readable-typescript | 213 lines / 1,589 words | Keep code guidance separate. Consider removing copied repository contracts without changing its review requirements. |
| maintain-tests | 76 lines / 1,064 words | Keep test guidance separate. Consider removing the same copied repository contracts. |

The main problems are ownership and staging, not file length alone:

- First-draft design advice is repeated in the workflow, review skill and the
  389-line `node-to-space.md` reference.
- Workflow obligations appear in AGENTS.md, the workflow skill, the review skill,
  the LevelSpec adapter, and specialist skills. Changes can drift between them.
- The quick interest pass has accumulated much of a developed-layout checklist.
  It risks demanding a finished design before the first useful review.
- Numeric budgets and feature lists can displace spatial judgment. The observatory
  trial reached 27 proposed nodes / 37 connections and an initial promising verdict,
  while the user still found its detached rooms and connector tubes unsatisfactory.
- Repeated warnings about grids, blobs, flatness, shape noise and tiny layouts
  describe failures more often than they establish a clear positive target.

## One workflow, four phases

| Phase | Work | Review / progression |
| --- | --- | --- |
| 1. Research and plan the place | Establish the theme, inspect real image references, explore architectural organizations, then draw a substantial spatial proposal. Avoid anchoring the design to a rushed minimal sketch. | One independent spatial-interest review: is the drawn place recognizable, coherent, interesting and substantial enough to develop? Return promising or rework with consequential reasons. |
| 2. Develop gameplay and layout | Establish consequential mechanics, refine territory and encounters, resolve major route/visibility questions, and prepare the detailed layout. | Retain the independent spatial/visibility and tactical scopes before production modeling. |
| 3. Build and inspect | Author AML, compile, validate, inspect views and exercise physical routes. Compare the actual volume with the intended relationships. | Retain independent blockout spatial and tactical reviews, plus applicable structural checks and focused interfaces. |
| 4. Iterate and hand off | Repair findings, test available gameplay, refine and export; state remaining engine/playtest uncertainties. | Recheck changed relationships and report evidence at its actual level. |

Phase 1 produces reference observations, a planned spatial proposal and an independent
review. Spend substantial effort on the place before selecting and drawing its layout.
Show enough spatial
structure and relevant level relationships to judge the place. Do not require a
cover inventory, exact eye/FOV studies, complete mechanics specification, compiled
geometry or a tactical defense at this point. Those have later owners and stages.

The first review judges the overall direction and architectural interactions, beyond
labels and decorative shape changes. Unfinished local thresholds or one
awkward room need not invalidate an otherwise convincing first draft. A fundamentally
underdeveloped or incoherent proposal needs another sketch. Keep the useful core
and address the largest issue; avoid turning
the first phase into a demand for perfection.

## Creative direction and design guidance

Define the desired spatial qualities directly. Do not install named existing maps
as layout/style benchmarks, default starting layouts or model answers in the skills.
The user subsequently requested selected earlier maps as size/substance references;
keep that exception narrowly scoped to how much developed play space is expected.
A new brief
should leave room for different architectural organizations, route networks,
silhouettes and uses of elevation. Develop the composition from its own theme,
terrain and explored possibilities rather than reproducing a familiar
feature arrangement with different labels.

Teach transferable relationships and methods without prescribing a signature set
of features. An interesting map need not repeat the same central crossing, upper
gallery, objective arrangement or room grouping. Specific reference constraints
still apply when the user explicitly requests them; ordinary invented-map work
does not inherit a prior project's design.

Keep one consolidated set of questions: does the proposal have enough substance,
meaningful connection choices, coherent transitions, plausible spatial logic and
interesting journeys? These guide judgment without prescribing their realization.
Nodes can describe rooms, junctions, courts or territories; edges describe connections,
not necessarily separate hallways. A corridor-heavy map and a room-heavy map can
both satisfy the principles. Grids, straight passages, flat terrain, curves and
irregular rooms should be judged in context rather than accepted or rejected by type.

### Optional design-direction menu

Offer possibilities the AI can choose, combine or depart from. This is a starting
point for invention, not a required form, exhaustive taxonomy or acceptance checklist.

| Parameter | Illustrative choices |
| --- | --- |
| Exploration method | Concept/architecture-first, node-and-edge, subtractive, terrain-led, hybrid, or another useful approach |
| Spatial composition | Room networks, corridor/hall networks, courtyard/street networks, open areas, or mixtures |
| Enclosure and spacing | Adjoining interiors, separated rooms/buildings linked by halls or paths, interior/exterior sequences, or open precincts |
| Elevation profile | Mostly flat, sustained inclines, local rises and dips, or mixed |
| Storey organization | One level, two/three/four levels, or another organization suited to the brief |
| Crossing relationships | At-grade intersections, overpasses, underpasses, stacked circulation, or none |
| Passage character | Narrow, broad, winding, straight, or changing along a journey |
| Connectivity | Branches, loops, interlinked approaches, hubs, distributed networks, or hybrids |
| Sightline character | Bounded, long, intermittent, oblique, vertically layered, or mixed |
| Geometric language | Ordered/rectilinear, curved, angular, terrain-adapted/organic, or mixed |

Setting and geometry inform one another without a fixed mapping. A design may use
strict architectural order, adapt its stairs and rooms to a cliff, or combine built
and natural spaces. Winding stairs, nonrectangular rooms and circular plazas are
possibilities, not requirements for a particular setting. Rectangular rooms can
coexist with organic terrain, and industrial architecture need not always be square.
Avoid unexamined grid snapping: when appropriate to the setting, explore diagonal
routes, rotated or irregular rooms, curved paths/stairs, shaped plazas and circular
buildings. A straight path can be oblique. Retain orthogonal forms when purposeful;
do not make every room or connection irregular as a substitute for composition.

Choose only the directions useful for the proposal; do not sample every parameter
or insert one of every feature. Choices may emerge while sketching and can change
later. A short direction note may help, but adds no required document or schema.
User specifications override this menu. Gameplay principles help the AI develop
and assess the implications rather than predetermining the strategy or geometry.

Choose an initial design approach upfront without a separate required artifact.
Concept/architecture-first exploration can establish an interesting place and spatial
identity before developing its layout and gameplay relationships. Let the setting's
physical character inform actual spaces and connections rather than only decoration.
Node-and-edge exploration, subtraction from an initial footprint or mass, hybrids,
terrain studies, architectural massing and adjacency sketches are also optional methods.
Subtraction lets rooms and circulation emerge together as retained areas are refined;
it does not require a rectangular envelope, irregularity everywhere or a specific
geometry implementation. The AI chooses the method and any useful
node/edge budget; the skills should not impose a universal numerical floor or a
mandatory random-generation method. Retain the principle of sufficient substance
and any explicit user minimums. If randomness is used, retain the seed for review;
organizing its output into a coherent place remains a design task.

### Prescriptive draft clauses identified in the audit

| Current clause | Cleanup action |
| --- | --- |
| Workflow: default 18-node/24-edge floor; review: below-budget requires rework | Remove the universal floor and automatic count-based rejection. Let the AI choose useful planning budgets; preserve explicit user requirements. |
| Workflow and spatial reference: randomized graph as the default first-sketch method | Present it beside other optional exploration methods. |
| Workflow: require rooms linking approaches, particular lateral bypasses, and non-grid exploration | Keep connection quality as a principle; present these mechanisms as possibilities, not mandatory topology. |
| Workflow/reference: pack building wings, widen foyers, add internal galleries | Keep these as optional examples of spatial coherence, not a required building organization or room/corridor ratio. |
| Review: automatic rework for a repeated room–tube pattern | Assess actual transitions, movement choices, architecture and repetition. Do not reject a legitimate room-based or corridor-based design by label. |
| Repeated directions to expand into additional rooms/halls | Require sufficient development for the brief without forcing a room-heavy outcome or one predetermined map extent. |

Retain binding workflow and correctness obligations: respect the user brief, use
the supported authoring contracts, distinguish visibility/collision/navigation,
perform the applicable independent reviews and report actual evidence honestly.
Source fidelity applies when requested. The art skill's illustration style remains
scoped to that presentation task; it does not prescribe map geometry. Programming
and test contracts likewise remain scoped to their own work.

## Major structural changes remain available

Any later phase may revise topology, add/remove or reroute connections, merge/split
spaces, reorganize building wings, alter elevations, or move spawns/objectives when
consistent with the brief. Gameplay or physical problems need not be patched with
props simply because the earlier sketch was reviewed.

Preserve explicit user constraints, including any source-fidelity constraints.
Whole-map work permits broad repairs; a specifically local repair should remain
local unless evidence establishes a broader issue. Stable IDs support tracking;
they do not require retaining obsolete geometry.

For a structural revision, update the drawing and graph, identify changed and
retired features, and re-review the affected macro/local relationships. If the
overall spatial direction changes, obtain a brief interest recheck too. Reuse
unaffected evidence instead of restarting all intake or replaying the entire
workflow automatically. Review acceptance applies to a revision, not forever.

## Content ownership and cleanup edits

- `fps-map-workflow/SKILL.md`: the four phases, progression rules, major-change
  freedom and scope routing. Link to tips and review protocols instead of copying them.
- `fps-map-workflow/references/node-to-space.md`: one concise spatial design guide
  covering the guiding questions, optional direction menu, exploration methods and graph/space translation.
  Remove repeated review procedures and tool instructions.
- `fps-map-workflow/references/layout-handoff.md`: stage-appropriate packets,
  especially detailed layout IDs, dimensions and blockout evidence. Keep the first
  packet visibly lighter than the later packets.
- `fps-map-review/SKILL.md`: one short phase-1 prompt and the later independent
  scopes, findings and return-review protocol. Design tips belong in their reference.
- Strategy/combat skills: specialist craft and hypotheses, loaded when the current
  phase or issue needs them. Remove duplicated process and generic intake prose.
- `level-authoring`: physical construction and structural inspection.
  Its FPS adapter owns commands, captures, body/eye settings and tool limitations,
  with one link back to the authoritative process.
- Reference and art skills: preserve their specialist material and conditional
  routing. Offer focused real-image study for themed invention upfront and targeted
  detail research later; reconstruction/fidelity procedures apply only when source
  correspondence is required. File count alone is not a reason to delete useful references.
- AGENTS.md: retain repository contracts and short skill routing; avoid maintaining
  another detailed copy of the map workflow.
- TypeScript/test skills: leave their distinct behavior and review obligations
  intact. Deduplicate repository facts into AGENTS.md where already authoritative;
  do not let their cleanup become a map-process redesign or vice versa.

Keep the existing skill names and paths unless a concrete routing problem justifies
a move. Do not add another overlapping skill, compatibility wrappers or a separate
mandatory document for each newly observed failure. Aim for a materially shorter
startup path through ownership and progressive detail, rather than enforcing line quotas.

## Implementation and validation

1. Freeze the intended spatial qualities and creative freedom; retain the current
   draft as reviewable input rather than continuing to append rules. Remove named
   map layout/style exemplars from design guidance; explicitly requested sizing
   comparisons remain narrowly scoped. Use neutral tool documentation for technical
   examples so project-specific links do not become accidental design prompts.
2. Rewrite the workflow around the four phases. Consolidate tips in their one owner.
3. Shorten review instructions and align the specialist skills, adapter and AGENTS.md.
   Preserve independent detailed review and physical evidence requirements.
4. Validate all skill frontmatter, local links and routing after the cutover.
5. Run bounded behavioral checks: a substantial invented map through phase 1;
   an affected-area repair; a reference-constrained map; and architectural-only work.
   Check that only the needed guidance loads and that later evidence can trigger
   structural redesign without freezing the first drawing or reopening everything.
   Include contrasting legitimate compositions so the review does not favor one
   room/corridor balance, geometric language, elevation profile or network pattern.

Judge the actual first sketch and reviewer response against the brief and the
desired spatial qualities. Check that the method permits different compositions
instead of converging on one recurring template. Do not substitute resemblance to
a named map, word-matching tests, node totals, compilation or a reviewer's generic
praise for that judgment. Trials should stop at their assigned phase rather than
expanding into another full map project.

## Implementation results

- Consolidated the process into the four-phase workflow, with immediate independent
  first-interest review and explicit freedom for later structural changes.
- Replaced the repeated design handbook with one spatial guide and an optional
  direction/method menu. Included concept/architecture-first, node-and-edge,
  subtractive and hybrid methods without requiring a particular one.
- Removed universal node/edge floors, named-map layout templates and layout-type rejection
  rules. Added a concrete warning against repeatedly reskinning the same three-route
  and lateral-bridge organization; the setting should shape spaces and connections.
- Added a lightweight theme-reference-study mode to the existing reference skill,
  linked from early planning and later development. Real images inform functional
  architecture; invented maps do not inherit the reconstruction fidelity gates.
- Added a default preference for architectural interest, with occasional multi-storey
  rooms, crouch-only service passages and balconies/overlooks as optional possibilities.
  Kept multi-storey rooms relatively rare and documented the inspection limitation
  for crouch-only traversal without prohibiting those designs.
- Made architectural invention proactive and the examples non-exhaustive. Added
  open-space sequences, distinct buildings linked by streets/paths/long halls, and
  neighboring plazas at different levels; coherence does not require compact packing.
- Linked sizing to experienced spatial complexity and encounter pacing, rather than
  absolute meter targets or a non-grid outline. Dense room networks and open/plaza/hall
  compositions can need different extent; expansion should develop real journeys
  and structure rather than only stretching geometry or adding obstacles.
- Added the subsequently requested Spillway, expanded observatory and Ninefold
  size/substance benchmarks, explicitly excluding their layouts/styles as templates.
  Retained the observatory SVG under reference evidence so the guide does not depend
  on disposable generated output. Benchmarks inform default whole-map scope, not quotas.
- Added a site/streets/building-masses-first default for built outdoor maps, with
  playable space formed between the masses. Indoor and natural settings retain
  suitable room-led, terrain-led and hybrid approaches.
- Added a separate architectural review skill and independent blockout scope for
  enclosure, roofs/ceilings, coherent volumes and environmental context. Cutaways
  are distinguished from actual missing geometry; renderer style and gameplay remain
  separate assessments. The original nine-skill audit is now a ten-skill set.
- Revisited all 99 source annotations and selected originals for useful sightlines.
  Added positive firing/support connections alongside exposure/occlusion checks,
  retaining counterexamples and evidence limits in the research note.
- Replaced the quick-sketch-first opening following user feedback about anchoring.
  Theme selection, real-image study and substantial architectural planning now
  precede the first reviewable proposal. Review asks how spaces interact, rather
  than accepting a cluster of boxes with decorative irregularities.
- Forward-tested that opening through two directive-led proposals and a separate
  procedural-seed experiment, with independent initial and return reviews. All three
  final proposals were judged promising at spatial-interest scope. The
  [experiment record](../reviews/map-planning-skill-experiments-2026-11-09.md) retains
  drawings, source observations and findings. An optional seeded Python helper and
  focused CLI checks support further experiments; random polygons are not binding
  room walls or a new default map-authoring method.
- Aligned strategy/combat guidance, structural/reference routing, the tool adapter,
  AGENTS.md and current documentation. Deduplicated repository facts in programming
  appendices without changing their review procedure. Kept presentation guidance scoped.
- Independent cross-skill review found one residual universal low-cover prescription
  in the combat reference; it was made conditional on encounter needs and re-reviewed
  as resolved. Physical, visibility and detailed independent review obligations remain.
- All nine skill entrypoints pass the skill validator. Local file/heading links and
  changed-file formatting checks pass, including a repaired reference-review anchor.
- A bounded forward trial produced one rough proposal and its independent first
  review, then stopped without production geometry. Three additional routing dry-runs
  covered a local crate repair, floorplan reconstruction and architectural-only work.
  These checks verify staging/routing, not competitive quality or guaranteed novelty.

Validation records are under `generated/skill-cleanup-validation/` and
`generated/skill-cleanup-forward-test/`. No game/compiler implementation was changed.
