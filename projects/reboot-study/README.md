# Three-map workflow reboot

User request: reboot three previously authored maps using the latest exploration,
reference-study, architectural development and independent FPS review workflow.
These are new projects; original sources and drawings remain intact.

| Original | New project | Distinct test |
| --- | --- | --- |
| [Ninefold](../ninefold/README.md) | `projects/ninefold-reboot/` | Dense urban interiors/alleys, occupied stacked space and deliberate floor transitions. |
| [Galini](../galini/README.md) | `projects/galini-reboot/` | A cliffside coastal town whose streets and courts emerge between coherent building masses. |
| [Last Light Galleria](../last-light/README.md) | `projects/last-light-reboot/` | A substantial shared mall interior with hero-shooter engagement, support and regroup journeys. |

Each reboot keeps its original user theme and mode brief. Old author choices such
as exact site placement, route organization and dimensions are hypotheses that may
change. Original movement bodies remain the basis for physical checks. Target-engine
weapons, abilities, utility, objective logic and balance are not supplied by LevelSpec.

## Procedure and comparison

1. Study actual architectural photographs, inspect earlier plans and sources, and
   sample contrasting version-2 exploration runs with explicit cross-level links.
2. Compare materially different spatial organizations before committing. Independent
   reviewers propose macro and local changes from raw alternatives before rationale.
3. Develop a labeled layout and sections. Close independent spatial-interest,
   strategy, construction and section-by-section visibility reviews before AML production.
4. Author coherent native AML, including roofs and context. Compile, inspect opposing
   views, follow routes with the unchanged body, and obtain independent compiled
   strategy, spatial/visibility and architecture reviews. Resolve supported defects.
5. Compare actual plans and renders with the originals. Assess the developed journeys
   and architectural relationships; node totals, floor count and validation alone do
   not demonstrate a better map.

The three authors also review other maps in separate assignments. Review roles and
evidence are recorded per project; nobody accepts their own map or their own
substantial proposal without another reviewer's assessment. Work runs in waves to
preserve independent coverage within the available agent slots.

## Original identities

[Original source and layout hashes](originals.json) were recorded before reboot work.
Existing source-matched compiled images were inspected as baseline evidence:

- Ninefold: `reviews/evidence/capture-r05/overview.png` and its capture manifest.
- Galini: `reviews/evidence/b10-roofs/overview.png` and its capture manifest.
- Last Light: `reviews/evidence/r06/captures-flat/overview.png` and its capture manifest.

These baseline screenshots use different framing/cutaway settings and are not a
controlled renderer comparison. New comparisons will identify their actual views.

## Alternative comparison

| Map | Alternative A | Alternative B | Development |
| --- | --- | --- | --- |
| Ninefold | [Courtyard Stack](../ninefold-reboot/planning/alternative-a-s01.png) | [Loft Street](../ninefold-reboot/planning/alternative-b-s01.png) | Loft Street: an occupied factory above a continuing street, with distinct objective approaches. |
| Galini | [Harbor Fold](../galini-reboot/planning/harbor-fold.png) | [Ravine Quarter](../galini-reboot/planning/ravine-quarter.png) | Ravine Quarter: inhabited town shoulders, distinct bridge arrivals and a committed shoreline transfer. |
| Last Light | [Department After Hours](../last-light-reboot/planning/proposal-a-s01.png) | [Twin Atrium Exchange](../last-light-reboot/planning/proposal-b-s01.png) | Twin Atrium Exchange: raised food-court Control above a usable lower transfer. |

Each map has separate `strategy-alternatives-s01.md`,
`opposing-alternatives-s01.md`, and `spatial-alternatives-s01.md` reports in its
`reviews/` directory, plus a root spatial comparison. These are author-independent
reviews with disclosed inherited context, not blind experiments. All six alternatives
were judged promising; that is an early spatial verdict, not a physical or balance pass.

Current stage: **all three native map reboots have completed independent strategy,
local/visibility and architecture reviews within their recorded scopes.**
See the [actual render-and-plan gallery and results](results.md).

Ninefold R08 and Last Light C02 pass their retained strict CLI build checks.
Galini C11 is an independently accepted bounded prototype, but ordinary CLI
publication remains blocked by the compiler work budget, with additional native
boundary/placement limitations explicitly retained. Its frozen geometry is usable
in the project-local reviewer. This is not an all-checks-passed result.

[Circulation comparisons](circulation-development.md) record adopted and deferred
turning, curved and shared-volume proposals. [Progress](progress.json) records the
final decisions and remaining limits. The [development handoff](development-handoff.md)
and [compiler audit](compiler-audit/README.md) retain earlier stage evidence;
open-gate wording in frozen handoffs is historical. All six original source/layout
hashes remain unchanged. Target-engine playtesting remains outstanding.
