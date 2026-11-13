# FPS skill forward-testing

Date: 2026-11-08. Scope: four new FPS skills, their references, LevelSpec adapter,
and routing through repository guidance, documentation and level-authoring.

## Checks performed

All four new skills and the modified level-authoring skill passed the skill-creator
frontmatter/scaffold validator. Local Markdown targets in the new skills, adapter
and FPS routing resolved. Scoped whitespace checks passed. No runtime/API changes
were made; Node/compiler suites were not run for this instruction-only change.

Two independent evaluating agents exercised six realistic requests. Evaluators
received the tasks and skill files, not the implementation author's expected answers.
They did not delegate additional map reviewers during these isolated exercises.

| Request | Actual outcome |
|---|---|
| Start a compact 5v5 bomb map | Created labeled SVG and brief/obstacle inventory before any 3D work. Unknown mechanics and both unavailable independent review scopes remained open. |
| Move one crate to improve paired entry | Created an affected-area SVG delta and handoff, preserved object identity, compared trade visibility against added exposure, and avoided redesigning unrelated sites. |
| Design a fast respawning arena with armor | Produced a strategy study addressing pickup timing, recovery and spawn reinforcement. Did not import bomb-mode assumptions; drawing and reviews remained prerequisites to modeling. |
| Assess a raised perch from a plan | Declined a fairness verdict without eye positions, obstacle footprint and reciprocal views. Proposed a section and engine checks; did not claim crouch/LOS verification. |
| Assess a 25v5 timed evacuation | Identified missing objective details, predicted congestion and serial-entry risks, and proposed useful-throughput/support tests without forcing symmetric balance. |
| Model a quiet architectural stair hall | Selected structural authoring and preview-art guidance, without imposing FPS population or tactical reviews. |

The authoring evaluator rendered and visually inspected both SVGs and corrected
overview cropping. The outputs remain preliminary: the overview lacks precise
enclosing boundaries/openings, and the local delta needs shared-coordinate
reconciliation. Neither was accepted for production. These exercises validate
workflow behavior and evidence limits, not map quality or a complete production pass.

## Finding and repair

Both evaluators found that the combat geometry entrypoint could imply the workflow
applied only to substantial changes. Updated its routing, the strategy entrypoint,
workflow description, AGENTS and documentation to explicitly include a single
gameplay-relevant crate move, scoped to the affected encounter. Standalone critique
remains exempt from authoring gates. The review evaluator inspected the revised
routing and confirmed the ambiguity resolved.

Also made per-scope layout states explicit: pending, changes required, or accepted
for layout, with deferred blockout checks listed separately. Layout acceptance does
not mean height-dependent checks are verified.

## Evidence and limits

Temporary evaluator artifacts:

- `/tmp/fps-forward-authoring-0po9st60/`: layout/delta SVGs, inspected PNGs, brief,
  obstacle inventory, local handoff and arena study.
- `/tmp/fps-review-forward-test/review.md`: concrete review scenarios and implementation
  findings, including the architectural-only routing result.

Temporary paths may not survive cleanup; the outcomes and limitations above are the
durable review record. No actual compiled map, continuous movement test, supported
multiplayer simulation or human playtest was performed. No competitive balance,
grenade behavior, body-blocking throughput or completed independent map acceptance
is claimed. Future skill revisions should be tested against observed task failures,
not wording snapshots.
