# Phase one: repository skills and code/test audit

Status: completed; independent reviews and baseline results are recorded in
[the audit](../reviews/xml-harness-code-and-tests.md). Parent: [XML harness roadmap](xml-cli-harness-next-phase.md).

## Agreed scope

Establish all four repository skills and root agent guidance, then audit code and
tests independently. Deliver evidence and a prioritized repair backlog. Production
fixes, legacy deletion, CLI implementation and UI redesign belong to later changes.

## Implementation

1. Adapt SnapEngineJS TypeScript and testing skills, 3D Modeling Harness architectural
   reference workflow, and SuperRec preview-art guidance into self-contained packages.
   Record source revisions/hashes, preserve relevant attribution and rewrite links.
2. Add root AGENTS.md with accurate current commands, ownership, coordinates and
   skill routing; distinguish the proposed CLI/XML-only destination from current APIs.
3. Establish Node, TypeScript, site and viewer baselines plus production browser checks.
   Record optional tool prerequisites and unexecuted checks without claiming success.
4. Independently review implementation and tests by subsystem. Record inspected files,
   gaps, evidence, impact and verification; distinguish confirmed defects from proposals.
5. Classify tests keep/rewrite/merge/delete and identify surviving coverage or obsolete
   contracts before recommending removal. Inventory shared versus legacy dependencies.
6. Validate skill metadata/links and exercise them against actual repository code,
   existing XML and browser evidence. Review adapted instructions independently.

## Deliverables

- Four `.agents/skills` packages and root AGENTS.md.
- `docs/reviews/xml-harness-code-and-tests.md` linking independent implementation,
  test and browser review records, baseline logs and architectural/art exercises.
- A prioritized backlog with stable IDs, severity, locations, affected contract,
  concrete evidence, proposed correction and verification criteria.

## Acceptance

Skills work without sibling checkouts; reference/art workflows keep XML canonical
and do not require Blender authoring or a Svelte rewrite. Every subsystem is accounted
for with explicit sampling limits. All tests remain intact. Baseline failures/skips
are explicit. No package interfaces, production code or test discovery change.
