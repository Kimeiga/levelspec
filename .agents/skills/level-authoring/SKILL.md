---
name: level-authoring
description: Author or review invented or reference-based LevelSpec maps for coherent layout, clean physical topology and usable circulation. Use for blockouts, buildings, stairs, corridors, bridges and complete maps.
---

# Map structure and circulation

Preserve the requested extent, style and gameplay intent. Use editable XML
`.level.svgx` and native authoring helpers where appropriate; runtime JSON and
meshes are outputs. Domain coordinates are meters and right-handed Z-up;
exporters own axis conversion. Read current root AGENTS.md for commands.

## Build the structure first

Establish spaces, levels, voids and intended route connections, then make a simple
structural blockout with real floor/slab thickness. Add enclosure and requested
details after the layout works. Include walls and overhead obstacles early when
they determine routes or clearance; stages are a useful order, not separate
approval ceremonies. A small map can go directly from a brief to XML.

Use coordinated plans or sections when stacked spaces, ambiguous interfaces or
scope make them useful. Independently review consequential uncertain relationships
before committing extensive dependent geometry. Diagnostic 3D studies can help
resolve them. Do not demand a full drawing package before every trial or repair.

Validate, build and inspect actual compiled geometry. For repeatable browser views
use [capture-level](references/structural-review.md#repeatable-captures). Follow claimed routes with
the unchanged player body; inspect the whole volume beyond the selected route.
Use [structural review](references/structural-review.md) for stairs, landings,
headroom, floor continuity, wall junctions and plan/model conformance. Navigation
sampling is not continuous proof or a substitute for collision-aware walkthroughs.
Keep visual geometry, physical collision and navigation distinct. Do not weaken
checks or add seeds merely to hide a broken physical connection.

## Proportional independent review

For an ordinary map use one independent reviewer covering topology, construction
and circulation. Give the brief, intended routes, editable source and actual
compiled views/results. For complex stacked spaces, difficult collision issues or
large maps, split construction and circulation scopes or assign focused specialists.
Respect any stronger reviewer requirements requested by the user.

Resolve supported structural findings before polish. Reviewers should prioritize
consequential defects, not invent flaws or alignment quotas. Recheck changed
assemblies and their interfaces after repairs; reuse unaffected accepted work.
Record the inspected revision, findings, repairs, remaining limits and actual
check results. If independent review is unavailable, disclose self-review rather
than claiming independent acceptance.

For maps based on images, add [reference-level-authoring](../reference-level-authoring/SKILL.md)
for source interpretation and fidelity review. Invented maps need no photographs,
contours, fitted cameras or reconstruction runner. Use
[level-preview-art](../level-preview-art/SKILL.md) for illustrated presentation.
Keep project source/evidence in the user's layout and reproducible outputs under
ignored `generated/`; do not turn project-specific scripts or thresholds into
universal requirements.
