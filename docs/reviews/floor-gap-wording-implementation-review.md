# Floor-gap diagnostic wording — independent implementation review

**PASS. No material implementation findings.** This review covers only the final
`FLOOR_EDGE_GAP` message string and the corresponding adjacency clarification in
`docs/SVGX.md`. Earlier dirty changes to floor-gap geometry, stepped stairs and
material sealing are outside this wording-only scope.

Read the preimplementation addendum in
`floor-gap-adjacency-independent-review.md`, inspected the final diagnostic
construction and documentation, and searched application, reviewer, reconstruction
and test consumers. Applied the TypeScript and maintain-tests guidance. No production
code, tests, model source or frozen reports were changed by this reviewer.

The message now accurately separates the observed condition—boundaries coincident
in plan with an unsealed vertical interval—from an inferred architectural need for
a retaining wall. It asks for the intended relationship to be checked and makes
the existing repair advice conditional. It does not promise that separate storeys
are exempt, add an annotation, downgrade severity or declare an open edge safe.

The diagnostic code, severity, object IDs, source selection, numerical expressions
and reported units remain unchanged in this edit. Documentation preserves default
warning and strict-error behavior, explains the same-side/underpass exemptions,
and explicitly states that opposite-side boundaries on separate storeys can still
be reported. Occupied-edge protection, traversal and source fidelity remain
separate reviews.

No consumer found depends on the replaced full text or its old opening/advice.
Floor-gap tests select diagnostics by code and parse the retained
`along … m` and `about … m high` phrases. Those expressions and values are unchanged;
reconstruction consumers need no adaptation. A new wording test is unwarranted.

The coordinator reported all27 existing floor-gap tests and `npm run check` passing.
I independently inspected the relevant assertions and ran `git diff --check`, which
passed; I did not duplicate the test run for this reversible text edit.

The seven frozen r11 strict failures remain failures. A future compilation may
change its complete output hash because the diagnostic text is part of that output;
geometry need not change. Preserve earlier reports and use fresh identities for
new evaluations. This wording review waives no geometry or acceptance finding.
