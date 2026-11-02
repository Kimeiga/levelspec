# Source-first independent review

Use fresh-context critics for substantial drawings and model fidelity when delegation
is available and authorized. Give originals first, without inherited builder history,
suspected defects, author rationale or previous verdicts. A self-review is useful
but must be disclosed as reduced independence. A small reviewed repair can reuse
accepted source interpretation while rechecking affected evidence.

Keep stages separate: freeze the critic's source-only inventory before revealing
the candidate. Then provide the frozen editable source, hashes, reviewed drawings
and actual corresponding renders. Use
[local packets](comparison-tools.md), all-original overviews and focused details;
inspect actual images rather than treating a successful script run as review.
The critic follows [paired contours](paired-contour-review.md) and supplies their
own observations on both sides.

For substantial architecture use complementary fidelity/proportion and
construction/circulation scopes, sequentially if slots are limited. Fidelity checks
silhouettes, openings, profiles, levels, surface ownership and source-specific detail.
Construction checks actual geometry, stair/landing relationships, passage width and
headroom, wall/slab junctions and support. Land/boat navigation is a separate working
geometry check, not proof of the photographed building or gameplay reachability.
For presentation review, use the sibling `level-preview-art` skill after source
relationships are established; appearance cannot override contrary originals.

## Lead with the structural challenge

For a full reconstruction review, be demanding about the building as a coherent
spatial structure before inspecting trim and surface finish. Review the overall
plan, depth/occlusion order, stacked levels, main stair/landing relationships and
the way major walls, bridges and floors meet. Independently fitted facades can
look plausible in one image while forming an incompatible building.

Lead the review with at least one general structural challenge and concentrate
the next iteration on the most consequential supported flaw. Identify the affected
relationships, source evidence, actual-model evidence, consequence and a concrete
repair target. A list of small guard, grout or frame fixes is insufficient when
the overall structure has not been examined. A component-level pass does not close
this structural gate. Do not manufacture a defect: when the structure appears to
stand, present the strongest testable structural challenge and the evidence that
could confirm or reject it, explicitly distinguishing a hypothesis from a finding.

The implementer responds explicitly to the lead challenge:

- **Defend:** explain why the existing structure is correct using original-source
  relationships and actual geometry/sections. Agreement with the implementer's own
  drawings, passing compilation, or an uncertainty label is not a defense.
- **Revise:** acknowledge the structural error, update the relevant source-backed
  plan/sections and implement the coherent repair. Avoid accumulating local patches
  around the disputed structure.

The critic evaluates the defense or repaired revision against originals and records
whether the challenge is resolved, rejected with evidence, or still open. Prioritize
that resolution over smaller dependent refinements. If the evidence cannot decide
a critical relationship, state the structural uncertainty and the evidence needed;
continue useful structural work elsewhere rather than polishing its dependent parts.
This gate applies to full reconstruction reviews, not every small repair of an
already reviewed structure.

## Follow the human route

Review inhabited or walkable areas from the perspective of a person moving through
them. Start at a source-visible or intended entry/landing and follow the main route
through doors, halls, rooms and stairs. At each transition identify the floor under
the person's feet, the next reachable surface, clearance above, and the walls,
parapets or guards at the sides. A plausible facade does not establish this route.
Distinguish floors from bench tops, parapet caps and soffits before assigning a
walkable surface; color or horizontal appearance alone does not establish access.

- Check that a door meets an actual threshold and landing, and that its proposed
  passage reaches the correct room or hall rather than a wall, void or wrong level.
- Follow each main flight to both ends. Verify its direction, upper/lower landings,
  elevation transitions and relationship to the next corridor or floor. Stairs
  ending in space or against an incompatible wall are structural findings.
- Inspect floor continuity and open edges. An unexplained hallway hole or unbounded
  drop can reveal a missing floor, wall, parapet or guard. Distinguish an intentional
  courtyard, service pit or stairwell from an accidental gap using source evidence
  and its actual access/boundary arrangement.
- Check usable width and headroom at the transition, including under bridges and
  hanging masonry. Individually plausible parts can leave no space for a person.
  Evaluate the actual soffit along the actual route footprint. A thin front
  parapet or hanging screen does not describe the full depth of the stair/slab
  behind it; a person may pass around its end and beneath a different owner.
  Apply clearance checks to every proposed occupied surface, including the tops
  of overhead stairs. A clear lower passage does not certify the upper stair run.

Record route segments as observed, inferred, blocked or unknown, with the relevant
plan/section and actual model evidence. Missing source-visible landings remain
missing structure even when labeled provisional. Do not invent unseen rooms or
connections to complete the route; expose the unresolved segment and seek evidence.
When references establish a connection but hide its exact dimensions, author and
test a coherent estimated junction or bounded alternatives. Preserve the estimate;
unknown dimensions do not justify leaving an observed route unsupported.
Inspect actual walking behavior when available, but retain the geometric checks:
navigation sampling or a compile pass alone cannot establish correct circulation.

## Staged critic prompts

Fill paths and the user brief without adding an answer key or suspected defects.

**Originals first:**

> Study only originals at [paths/manifest] and the user brief [brief]. Do not open
> traces, schematics, renders, implementation, author notes or earlier reviews yet.
> Save a source-only inventory at [path]: view correspondence, building-defining
> shapes/openings/levels, visible relationships, difficult-region questions and
> uncertainty. Cite source regions and distinguish photographic observations from
> user-supplied annotations. Return the inventory and wait for the candidate.

**Drawing review:**

> Compare your saved inventory and originals with frozen drawing [revision/hash],
> editable source [path] and actual rendered sheets [paths]. Apply the schematic
> drawing standard and assigned scope [scope]. Inspect all relevant views and
> enlarged junctions. Create your own paired contours where boundaries matter.
> Record supported discrepancies, unknowns and unexamined regions at [path]. Do
> not read author explanations or other critics' findings before saving your own.
> Distinguish missing visible detail from unknown hidden connections. Re-review
> supported repairs before dependent model detail.

**Compiled-model review:**

> Compare your inventory and originals with frozen XML/companions [paths/hashes],
> reviewed drawing [revision] and actual compiled renders [paths]. Use read-only
> geometry/section checks as needed. Follow paired contour review: account for all
> geometry-informing sources, fit/lock cameras with stable landmarks, test held-out
> boundaries, and independently trace both originals and actual renders. Preserve
> SVGs, native transparent PNG contours, residual observations and hashes. Diagnostic
> unmatched views cannot close critical fidelity claims. Save evidenced findings,
> limits and coverage at [path] before reading other reviews or builder rationale.
> Begin with the whole spatial structure and lead with its most consequential
> structural challenge. Require the implementer to defend it with source evidence
> or revise the structure, then adjudicate that response before dependent detail.
> Include a person's walkthrough of the main route: continuous floors, thresholds,
> both stair landings, headroom and bounded edges. Identify stranded stairs,
> incompatible transitions and unexplained gaps as structural findings.

The coordinator reconciles findings against originals, not majority agreement.
Record source-inventory corrections openly. Revise, freeze and regenerate affected
evidence, then re-review until supported actionable discrepancies are resolved.
Maintain unknowns rather than inventing connections to silence the critic. If
evidence cannot decide a critical relationship, defer its dependent detail and
report the incomplete scope. A schematic remains a claim against original pixels.
