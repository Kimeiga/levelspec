---
name: fps-strategy-design
description: Design or critique FPS map-wide gameplay through territory, objectives, information, rotations, resources and team coordination. Use for strategic layouts and consequential route changes, not architectural-only construction or isolated cover detailing.
---

# Strategic FPS design

Create spatial advantages whose value changes as players act, with feasible ways
for teammates and opponents to influence them. The AI chooses the concrete strategy
and layout within the brief; these principles do not prescribe lane counts, objective
arrangements, topology or elevation. Intended behavior is a hypothesis to test.

For authoring stages and independent reviews, follow
[fps-map-workflow](../fps-map-workflow/SKILL.md). Use the known brief for early sketches;
apply detailed strategic reasoning when developing gameplay or reviewing a specific
issue. A critique reports findings rather than changing the map.

## Territory and decisions

Use actual mode, population, movement, weapons, utility, information, resources,
respawn and clock assumptions. Discover existing settings before asking; record
consequential unknowns rather than importing another game's rules.

Develop territory relationships with the actual spaces and connections. A graph can
help, but need not be a separate artifact or map directly to rooms and hallways.
Identify what control enables: access, information, reinforcement, objective pressure
or a change of plan. Compare gaining, losing, conceding and retaking that territory.
Include influence across spaces through views and support, not just walkable links;
a partition can remove a useful territorial relationship as well as an unwanted angle.

Trace plausible plans and responses through the same spaces. What changes after
contact, discovery, utility spending, casualties or an objective transition? Include
preparation and reset opportunities when useful; constant fresh threats can overwhelm
attention. An additional connection can create options or undermine a useful front.

Evaluate time, exposure, sound, equipment, attention and coverage elsewhere. A response
must fit actual manpower and remaining resources; a late theoretical flank is not
counterplay. Another objective or territory can contest a strong position without
adding a doorway into every hold.

Evaluate information by its age when a teammate can act on it, including the scout's
own exposure and whether the probe warns the opponent. Trace task dependencies and
parallel jobs rather than prescribing one attack sequence. Test an absent support
player, delayed clearance or lost objective carrier: can the team substitute a task,
bypass a threat, or change destination? A useful route can impose a credible flank-watch
cost even when rarely traversed, but its return must fit the objective window.

Judge rotation protection and speed for a named team and phase, including reversed
roles after an objective interaction. Test why a strong hold would be abandoned,
when its fallback becomes necessary, and what returning costs. Read the
[reviewed mechanisms](references/reviewed-mechanisms.md) when developing these relationships.

Elevation, flat ground and stacked routes can all support strategy. Relate any chosen
height arrangement to information, support, commitment and return travel. Neither a
panoramic perch nor height variation is automatically desirable.

## Size and encounter pacing

For ordinary whole-map briefs, use the
[user-selected size/substance benchmarks](references/size-benchmarks.md) to avoid
defaulting to a small prototype. They calibrate the amount of developed play space,
not a topology or architectural template; explicit user scope takes precedence.

Choose map extent from experienced spatial complexity and encounter pacing, not a
target width/length in meters. Consider meaningful route choices, sequences of spaces,
occlusion and traversal costs alongside population, movement and objectives. A dense
network of small rooms can offer substantial play in a compact area; a few broad
plazas and long halls may need more separation and developed intermediate spaces
to avoid concentrating encounters too quickly.

This is a design judgment, not an inverse formula between complexity and size.
Extra connections can accelerate contact, and long sightlines can expose players
across a large footprint. Trace likely journeys: where can players gather information,
prepare, choose, encounter opponents and reset? Use dimensions to realize those
relationships, not as proof that the map is sufficiently developed. Curved outlines
or non-grid geometry alone do not add meaningful complexity.

If the proposal is too simple and compressed, develop its routes, architectural
structure and intervening spaces; do not merely stretch the same graph or scatter
obstacles. Preserve useful breathing room without padding travel. Respect explicit
user dimensions, label early pacing estimates, and verify actual movement/contact
timings later when the engine or playtest permits.

## Make hypotheses reviewable

For consequential choices, name the affected spaces/connections, benefit, cost,
teammate contribution, opponent response and next decision. Keep this proportional;
every connector need not become a tactical worksheet. Compare alternatives where
uncertainty matters, including retaining or removing a feature.

Use [strategic patterns](references/strategic-patterns.md) for relevant worked mechanisms,
and [combat geometry](../fps-combat-geometry/SKILL.md) when local encounters determine
whether a plan can work. The [review skill](../fps-map-review/SKILL.md) owns scenarios,
evidence levels and independent assessment. Without play evidence, report testable
hypotheses rather than claiming balance or predicting actual player behavior.
