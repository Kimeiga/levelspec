---
name: fps-map-review
description: Review and improve FPS spatial proposals, combat geometry and player behavior through independent macro and local design proposals and evidence-based assessment. Use for gameplay critique or map-authoring reviews, not architectural-only checks or balance claims from screenshots.
---

# FPS map review

Use the requested stage and scope. The [workflow](../fps-map-workflow/SKILL.md) owns
when reviews occur; this skill owns how to review. Standalone critique need not
initiate authoring or a full workflow. Judge the proposed design in its context,
without favoring a particular room/corridor balance, topology, geometric language,
elevation profile or exploration method.

## Proactive design review

Actively seek changes that would create richer strategies, encounters and spatial
relationships, including when the current design passes its checks. For new whole
maps and broad redesigns, use a panel of independent macro and local reviewers with
distinct assignments. Follow [design-development review](references/design-development.md)
to distribute perspectives, develop concrete proposals, compare alternatives and
verify adopted changes. Local work uses the affected encounter and its consequences.

Keep supported defects, improvement proposals and intentional tradeoffs explicit.
Judge proposals by the decisions they enable, their costs and available evidence.
An improvement proposal can challenge the current topology or architectural
organization within the brief. Passing a previous gate leaves those choices open.

## Spatial-interest review

For an early proposal, visually inspect the brief and drawing before author rationale
or other verdicts. Ask whether this feels like a coherent, interesting and substantial
place worth developing. Follow actual journeys and connection choices; consider how
the spaces and movement fit the theme or terrain. Use the
[spatial guidance](../fps-map-workflow/references/node-to-space.md) as prompts for
judgment, not a list of required features.

When alternatives exist, compare their actual spatial relationships before selecting
a favorite. Reviewers may develop a different organization or combine compatible
relationships from several proposals. Treat generated graphs and first sketches as
starting material, with explicit user constraints identified separately. Early
proposals need enough spatial evidence to explain the idea; detailed combat tests
belong to the later stages.

Check the reference observations against the drawing: is the place recognizable
through its organization and volumes, beyond labels or props? Ask whether this is
merely a repeated chain/cluster of rooms and connecting halls, or whether its spaces
interact in interesting, legible ways. Trace actual shared volumes, views, wrapping
routes, through-building passages or other relationships the author invented; those
examples are not compulsory features. A corridor-heavy or room-heavy map can succeed,
but a named balcony or decorative diagonal does not by itself change the spatial
experience. When the core organization is generic or thin, request renewed planning
rather than more boxes around an anchored first sketch.

Judge the proposal's extent relative to meaningful spatial complexity and likely
encounter pacing for the brief, not its meter dimensions or a non-grid silhouette.
For ordinary whole-map briefs, use the spatial guide's size/substance benchmarks
to flag proposals that are clearly too thin; the comparison does not prescribe layout.
This is a provisional spatial judgment here; measured travel/contact checks belong
to later stages.

Return **promising**, **rework**, or **unclear**, with a short reason grounded in the
drawn relationships and a few consequential suggestions if needed. A promising
first draft may have unfinished local details. An attractive but underdeveloped
proposal or an unreadable drawing needs another pass; name the actual issue.

When earlier proposals are available, check for repeated macro arrangements under
different names or themes, especially the habitual three-parallel-route/lateral-bridge
template. Ground that finding in actual connections and spatial organization;
cosmetic differences alone do not establish a new composition. Do not claim
similarity or novelty against maps you have not inspected.

Do not require a full mechanics specification, cover ledger, measured timings or
competitive-design audit here. Do not pass or reject by node totals, straightness,
flatness, room shapes or resemblance to another map alone. Adjoining interiors, separate
rooms/buildings joined by halls or outdoor paths, and street/courtyard networks can
all work. Coherence does not require compact packing or shared walls. Generic praise
or reciting room names
is insufficient evidence of spatial interest. This is an early judgment, not proof
of fun, balance or physical reachability.

## Organic layout review

For the workflow's early whole-map and broad redesign reviews, assign the
[organic layout review](references/organic-layout.md) separately from the
spatial-interest review. Use its evidence and verdicts to decide whether the
drawn geometry expresses the place's actual constraints and uses.

## Detailed layout and blockout reviews

Establish the relevant mode, population and mechanics from available evidence.
Ask or qualify findings when consequential facts are missing; do not assume CS rules
for another shooter. Use separate reviewers, independent of the author, for:

- **Spatial/visibility:** spatial arrangement, plan/model agreement, usable approaches,
  corner clearing, body exposure, levels, sightlines, support and commitment/escape.
  Include construction and circulation responsibilities explicitly in the packet;
  a physical route pass alone does not cover gameplay visibility. Assess missing
  useful firing/support connections as well as unwanted lines of sight.
- **Strategy/player behavior:** territory and objective relationships, plausible
  actions/responses, information, timing, rotations, resources and team coordination,
  including objective transitions and relevant casualty states.

For whole maps and broad revisions, cover both macro relationships and named local
sections/interfaces. Use [scoped packets](../fps-map-workflow/references/layout-handoff.md#review-packet)
with neighboring context. Assign a dedicated independent section-by-section visibility
pass at layout and blockout stages, covering spawn areas/exits, approaches, sites,
connectors, holds and level transitions. Distribute local encounter proposals among
section reviewers, including the interfaces between their areas. Run assignments
in waves when concurrency is limited. Local work can cover several sections and
reuse accepted findings while preserving the two independent review scopes.

Each reviewer first assesses raw artifacts before author rationale or other verdicts.
Then consider the design defense and other evidence. Use
[strategy design](../fps-strategy-design/SKILL.md) or
[combat geometry](../fps-combat-geometry/SKILL.md) for the relevant craft, not every
reference for every assignment.

## Evidence and scenarios

At layout, assess the actual spatial proposal and gameplay relationships; plausible
connectivity alone does not establish a developed design. Keep height-dependent
questions scheduled for compiled verification rather than passed by prediction.

At blockout, inspect actual geometry, opposing views and performed movement checks.
An overview is insufficient. Check important standing/crouching, ascending and
follower positions where mechanics support them. Inspect both useful low-cover
sequences and the tall masses controlling views, including spawn offsets and local
level changes. Use the [visibility/cover guide](references/visibility-and-cover.md)
for detailed view studies and sampled warnings; do not tune scans to hide findings.

Use the [scenario/evidence guide](references/scenarios-and-evidence.md) to trace
approach → information → contest → response → next action. Select the intended
population and relevant stress cases, including post-objective and asymmetric states
when useful. Test whether teammate support and opponent responses fit actual time,
manpower and resources. An intended tactic remains a hypothesis until observed.

## Findings and return reviews

Tie each consequential finding to revision, region/object, scenario and evidence.
Explain the mechanism, consequence and a focused repair or experiment. Distinguish
observed defects, improvement proposals, design risks, intentional tradeoffs and unavailable checks.
Accept supported defenses; do not manufacture issues or impose feature quotas.

Record the disposition of consequential proposals and the evidence from selected
experiments. A reviewer who designed an adopted change can check its realization;
another reviewer assesses its gameplay consequences and acceptance. Close the
chosen experiments and required findings before handoff, retaining unresolved
optional ideas as future tests.

Later evidence may warrant a major structural redesign. Review its changed macro
relationships and interfaces, update the stage verdict and reuse unaffected evidence.
A prior promising sketch does not oblige later reviewers to preserve its topology.
Record pending, changes required or accepted for each detailed scope and the specific
unperformed checks; acceptance belongs to the inspected revision.

Keep drawing hypotheses, compiled observations, measured mechanics and play evidence
separate. Navigation sampling, optical rays and screenshots cannot establish continuous
reachability, bullet/utility/audio behavior, trading or competitive balance. Use the
[LevelSpec adapter](../level-authoring/references/fps-workflow.md) for tool capabilities;
report missing evidence without inventing passes or unrelated engine work.
