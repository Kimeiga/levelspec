# Staged-authoring skill forward review

Reviewed 2026-11-01. This is an independent, scenario-based reading of the skill
and linked workflows, not a review of courtyard geometry or execution of the
reconstruction runner. Reconstruction remains paused; no model was changed.

Applied `reference-level-authoring/SKILL.md` and `references/staged-authoring.md`.
Also inspected schematic, reconstruction, independent-review, paired-contour,
review-evidence and photo-tracing workflows; checked relevant requirements in
generated-reference-aids, comparison-tools and `docs/RECONSTRUCTION.md`.

## Scenario outcomes

| Scenario | Stage and review actions | Disposition |
| --- | --- | --- |
| Stair ends without a landing within visible scope | Stage 1. Fidelity reviewer determines the source-supported endpoint and connection. Mesh reviewer checks both ends in actual compiled geometry and sections, including adjoining surfaces, elevations, width and headroom. | If a supported landing is physically absent, **Revise** before enclosure; a provisional label cannot excuse missing visible structure. If originals themselves show an incomplete stair, retain it with an explicit non-route status rather than inventing a landing. |
| Route exits the modeled crop | Stage 1. Record the boundary and outside-scope continuation; inspect continuity up to that boundary and distinguish a crop from a physical termination. | A bounded outside-scope endpoint and separate navigation components are acceptable. Do not invent unseen connections. Keep runner failures visible; partial approval does not imply complete-model or navigation acceptance. |
| Unexplained narrowing and misaligned floor | Stage 1 for floor/corridor layout; Stage 2 if added enclosure causes the narrowing. Compare related assemblies and source views, measure actual clear width and elevations, check transitions and floor continuity. | Investigation prompts first. **Revise** supported accidental discontinuities or obstructions; **Defend** source-supported irregularity. Do not standardize all widths or levels merely for regularity. Unresolved critical junctions defer dependent work. |
| Original photographs support an angled wall | Stage 1 records the wall limit as a circulation constraint; Stage 2 constructs enclosure. Fidelity reviewer tests ownership, perspective and camera uncertainty across originals; mesh reviewer checks resulting junctions and clearances. | **Defend** the source-supported angle. Parallel/perpendicular checks must not enforce an ideal grid against original evidence. |
| Landing comprises adjoining floor and stair top tread | Stage 1. Inspect the complete physical union in compiled plans/sections: surface continuity, level change, usable area, gaps, overlap and headroom. | Accept if the union actually provides the supported usable landing. An XML region boundary alone is not a stranded-stair finding; a visually adjacent but disconnected floor still requires repair. |

These scenarios are handled coherently by the new staged guidance. Both reviewers
must inspect originals first and adjudicate the implementer's defense or revision.
Stage 1 requires real floor/flight/landing geometry and relevant clearance limits;
finished doors, guards, wall profiles and props can remain explicitly deferred.

## Final recheck and disposition

Re-read the corrected linked documents after the first review. **No material
stage-scope conflict remains in the inspected guidance.** All five scenario
outcomes above remain unchanged.

1. **Resolved: paired-contour coverage.** The new preamble explicitly limits
   coverage and signoff to current-stage geometry and keeps observations of
   deferred enclosure/details without requiring candidate patches. This removes
   the earlier universal-mapping ambiguity for circulation studies.
2. **Resolved: schematic omissions and guards.** The revised paragraph explicitly
   permits declared later-stage omissions, marks future guards/enclosure as
   constraints, and limits incomplete-geometry findings to the current stage.
   Missing supported floors or landings remain defects.
3. **Optional clarification: reusable independent-review prompt.** Its governing
   preamble correctly establishes staging, but the standalone compiled-model prompt
   does not request current stage, modeled extent or a deferred-element ledger.
   Including those fields would make copied prompts more robust. This is not a
   blocking conflict when the full guidance is followed.

The runner's geometry/navigation gates should remain strict. A circulation study
can have a documented partial structural approval while its runner result remains
diagnostic; that result must never be promoted as complete acceptance. Reference-aid
requirements to preserve source detail concern evidence fidelity and do not require
building those details upfront. No other inspected requirement clearly forces
full-building enclosure or decorative completion before circulation review.
