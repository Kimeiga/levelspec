# Final harness review

Status: complete on `codex/xml-cli-harness-next-phase`.
Scope: current working tree, including completed shared reviewer and repository-local
CLI. This is a subsystem review with explicit evidence limits, not an algorithmic
proof or a standalone package release. Changes remain uncommitted.

## Findings and corrections

| ID | Finding | Correction and verification |
| --- | --- | --- |
| F-01 | Onboarding duplicated workflows and mixed current/historical guidance. | One README quickstart, operational AGENTS, documentation index, historical archive and corrected active guides; link checks and fresh-agent exercise. |
| F-02 | Static audit entry list referenced deleted worker/export files and omitted CLI/public roots. | Updated .fallowrc entries without resetting its health baseline; independent configuration review. |
| F-03 | Failed native lighting bake could leave an unretryable partial destination. | Stage complete bake/metadata/manifest beside destination and publish on success, clean failed staging; fake native failure/retry acceptance. |
| F-04 | Preview connection error could be cleared by an older pending HTTP refresh. | Invalidate refresh revision on disconnect; controlled delayed-response browser acceptance. |
| F-05 | Reviewer validation test required incidental wording rather than invalid state/recovery. | Assert observable state, retained geometry, disabled walking and recovery against current reviewer. |
| F-06 | Preview acceptance and current shared paths needed explicit CI coverage. | Align workflow paths and execute focused preview browser checks in CI. |

## Independent evidence

Independent reviewers record coverage and limitations in [documentation review](final-docs-review.md),
[implementation review](final-implementation-review.md) and [test review](final-tests-review.md). Coordinator independently checked staging/
publication changes and the preview revision correction; no blocking finding.
[Fresh-agent onboarding](fresh-agent-onboarding.md) succeeded without conversation
context: initialize, widen room, validate, diagnose missing vertex, repair, real
browser live edits/stale recovery, GLB/glTF export, inspect reports and clean
SIGINT shutdown/restart. No blocking defect found. Cascading topology messages and
verbose navigation JSON were minor friction, with first source error actionable.

## Acceptance results

- Node:201 discovered,200 passed,one optional native BSP integration skipped,zero
  failed (9.619 seconds), `/tmp/levelspec-final-node.log`.
- Website Node:24 passed,zero failed/skipped (107.977 seconds),
  `/tmp/levelspec-final-site.log`.
- TypeScript and viewer/site production builds passed.
- Focused CLI preview browser passed including real stream shutdown while a prior
  source response was held, stale-state retention and restart via a fresh session.
  The test does not claim automatic reconnection to a newly created session token.
- Production reviewer browser:20 scenarios passed,process exit0 on the frozen
  production build. Log `/tmp/levelspec-final-browser.log`, captures/results under
  `/tmp/levelspec-final-browser/`. Controlled unavailable-WebGL output is expected.
- Four skill validators passed; documentation link checks passed.
- Starter and worked-project portable validation/build were verified during phases
  and the fresh-agent exercise. Logs/screenshots are local temporary evidence.

The first general browser attempts exposed assertions that expected diagnostics
from a clean fixture or closed an already-open details panel. Corrected tests use
a controlled low ceiling, observable diagnostics, explicit open-state handling and
valid-source recovery; production behavior was not weakened. Initial context-loss
injection logged transient driver deletion warnings that did not reproduce in the
subsequent frozen run; no speculative graphics change was made.

## Boundaries

No user scratch/conversion files were deleted. Native Blender/Quake compatibility
is not established by fake-process or checked-in bake tests. Destination checks
are not a hostile filesystem sandbox; concurrent external filesystem replacement
is not covered. Source fidelity requires reference review, not just green tests.
No publishing or standalone installation was performed.

## Handoff

Start at [README](../../README.md), [AGENTS](../../AGENTS.md) and the
[documentation index](../README.md). Active guides describe the current harness;
archive/plans/review records remain revision-scoped evidence. All applicable final
checks passed; no confirmed ordinary in-scope defect from this review remains
unresolved. All changes remain local and uncommitted on the existing branch.
