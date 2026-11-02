# Final documentation and skills review

## Findings and corrections

- FD-01: README duplicated the workflow and buried structured invocation details.
  Consolidated a single install/init/validate/preview/build sequence using silent npm.
- FD-02: AGENTS called implemented project layout proposed and pointed new agents
  at a historical cutover plan. Replaced with current docs index and repository map.
- FD-03: current guides mixed obsolete UI editor/export/lighting-drop behavior and
  implicit output destinations with current contracts. Corrected SVGX/EXPORTS and
  reference guide; CLI requires explicit --out and reviewer remains read-only.
- FD-04: top-level historical rendering/verification documents competed with current
  guides. Moved to docs/archive, labeled original evidence and rewrote local links.
- FD-05: implementation ledger still described the machine-readable CLI as future.
  Updated its status; revision-scoped prior validation reports remain historical.

Four skills retain scoped discovery descriptions, self-contained references and
source provenance. TypeScript/test review requirements remain specific to code
changes; authoring XML remains canonical and art guidance preserves export semantics.
No extra skill scaffolding or sibling runtime requirements were added.

## Validation and limits

Local Markdown targets across README, AGENTS, skills, docs and supported project
notes were checked. All four skill metadata validators pass. This is instruction
and link review, not proof of compiler correctness or current native rendering.
Fresh-agent workflow and final automated results belong to the coordinator report.
User-owned scratch/conversion directories were preserved and explicitly excluded
from supported example discovery in AGENTS. No source/tests/CI were changed here.
