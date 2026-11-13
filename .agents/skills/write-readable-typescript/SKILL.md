---
name: write-readable-typescript
description: Write, refactor, and review TypeScript for readability, cohesive responsibilities, clear contracts, and clean API cutovers. Use for new TypeScript code and readability-focused changes to existing code; follow project conventions without expanding local edits into unrelated cleanup.
---

# Write Readable TypeScript

Optimize for a reader's understanding, even when clearer code requires more
statements. Favor cohesive responsibilities, explicit data flow, and accurate
names. Apply this guidance to the requested work and the code it touches.
Respect local project instructions, package boundaries, and runtime constraints.

## Simplicity and fixes at the source

- Choose the simplest design that satisfies the intended contract. Minimize
  special cases, mutable state, branching, and indirection. Add complexity only
  when a concrete requirement justifies it; fewer lines alone do not mean simpler.
- Before fixing a failure, trace it to the responsible contract, ownership
  boundary, or design. Prefer correcting that source over adding compensating
  patches across callers. Look for other affected consumers of the same rule.
- Passing tests is necessary evidence, not proof that the design is sound.
  Do not weaken supported assertions, hard-code failing examples, or add
  exceptions merely to obtain a passing run.
- Keep fundamental fixes within the authorized scope. A local correction is
  appropriate when it addresses the cause; explain why. If the underlying fix
  requires work outside scope, report that boundary rather than silently
  expanding the assignment or presenting a workaround as a complete fix.

## Contracts and documentation

- Document named functions and methods, including internal helpers, with
  proportional JSDoc. Use a short paragraph for substantive contracts and a
  brief description for trivial helpers. Anonymous callbacks need no boilerplate.
- Explain purpose and meaningful input/output semantics. Include ownership,
  mutation, side effects, units, coordinate spaces, or constraints when they
  affect correct use. Do not mechanically enumerate every possible concern.
- Describe observable behavior rather than implementation steps. Avoid
  narrating loops, repeating types, or padding an obvious contract. Keep shared
  contract documentation at its authoritative declaration rather than copying
  it between an interface and its implementation.
- Limit each inline `//` comment block to two consecutive lines. Explain a
  non-obvious reason or invariant. Longer explanations call for clearer code,
  a documented helper, or supporting documentation. Do not evade the limit by
  splitting one explanation into multiple blocks. Preserve necessary rationale
  when shortening comments, especially for tolerances and unusual constraints.
- Use American English in documentation, comments, and new identifiers.

For example, document the coordinate contract without narrating subtraction:

```ts
/**
 * Returns the child's position relative to the container's content-box origin.
 * Both inputs must use the same coordinate space and units. Neither input is
 * modified; the returned point is independent of the measured boxes.
 */
function childRelativeOffset(container: BoxModel, child: Point): Point {
  const offset = contentOffset(container);
  return {
    x: child.x - container.x - offset.x,
    y: child.y - container.y - offset.y,
  };
}
```

## Structure and expressions

- Organize by domain responsibility. Keep a function at one level of
  abstraction: coordinate meaningful steps or perform a focused calculation.
  Extract a helper when its name and contract make the caller easier to read.
- Keep tightly related helpers near their owner. Split modules at meaningful
  boundaries, not arbitrary line counts. Avoid helper forests and generic
  utility buckets that force readers to chase a single operation across files.
- Prefer explicit branches, guard clauses, and meaningful intermediate values
  over nested ternaries and compressed expressions. Do not extract a one-use
  expression merely to make a function shorter.
- Choose names that remain accurate across supported cases. For example, an
  entry shared by flow and grid algorithms should not be named `FlowEntry`.
  Distinguish measured and simulated values, and identify axes, units, and
  coordinate spaces where they might otherwise be confused.
- Keep related state together. Prefer cohesive records over parallel arrays
  when this clarifies the relationships and ownership. Preserve demonstrated
  hot-path performance requirements when changing representations.
- Make mutation and ownership explicit. Distinguish caller-owned input,
  temporary working state, and reusable cached results. Use types to express
  valid states; do not mistake `readonly` for runtime deep immutability.
- Share rules when callers represent the same concept and should change
  together. Similar-looking code alone does not justify an abstraction. Keep
  distinct algorithms separate when combining them would require confusing
  modes, flags, or indirection.

For example, replace nested width/height ternaries with an explicit sizing rule:

```ts
let width = slot.width;
let height = slot.height;

if (contentSizedLines) {
  if (fillAxis === "x") {
    height = entry.height;
  } else {
    width = entry.width;
  }
}

virtualRects.set(insertion, { ...position, width, height });
```

The extra statements make it clear that only the cross-axis dimension changes.
Do not generalize separate positioning algorithms just to share this pattern.

## Clean cutovers

When replacing an API, behavior, or design, make a hard, complete cutover by
default. Preserve backward compatibility only when the developer explicitly
requests it. Hypothetical external consumers, familiarity, or a desire to be
"safe" are not reasons to retain the old design.

- Establish the new contract, update affected callers, tests, examples, and
  documentation, and remove the superseded implementation in the same change.
- Do not add deprecated aliases, forwarding wrappers, legacy fallbacks, dual
  read/write paths, old/new behavior branches, or migration flags without an
  explicit compatibility requirement.
- Remove existing compatibility machinery within the cleanup's scope when no
  explicit requirement retains it. Search callers and exports before deletion
  so that removal is complete rather than leaving broken references.
- When compatibility is explicitly required, implement only the requested
  compatibility surface. Keep the new design authoritative and identify any
  remaining compatibility paths in the handoff.
- Distinguish obsolete compatibility paths from currently supported product
  options, distinct algorithms, and legitimate fallback behavior. Remove
  historical behavior because it is superseded, not simply because it branches.
- A structural refactor preserves behavior that is not being redesigned.
  Do not use cleanup as permission for unrelated semantic changes. For an
  intentional redesign, update tests to assert the new contract rather than
  forcing both old and new contracts to coexist.

For example, if a requested redesign replaces `resolveLayout` with
`createLayoutResolutionPlan`, update consumers to build and use the new plan,
update exports and documentation, and delete `resolveLayout`. Do not leave:

```ts
/** @deprecated Use createLayoutResolutionPlan. */
export function resolveLayout<Node extends LayoutNode<Node>>(
  root: Node,
  options: LegacyOptions,
) {
  return adaptPlanToLegacyResult(createLayoutResolutionPlan(root, options));
}
```

Do not retain a `useLegacyLayout` switch either. If the developer explicitly
requires the old API for a transition, that requirement is the exception;
support its specified contract without extending it to other historical paths.

## Working procedure

For every code change, including small edits, require both independent subagent
reviews below. New tests are not mandatory when existing coverage is sufficient
or the change does not warrant tests. Self-review does not replace either
independent review. If delegation is unavailable, disclose the unmet requirement
and do not claim the required reviews are complete.

1. Read the relevant project instructions, implementation, callers, and tests.
   Identify the intended contract, cause of any failure, ownership, and explicit
   compatibility requirements. Choose the simplest coherent correction.
2. Assess existing coverage and write or update tests for meaningful gaps or
   changed contracts. Preserve relevant behavioral and performance coverage;
   avoid tests that mirror implementation details.
3. Before implementing production code, spawn an independent test reviewer.
   Provide the requirements, relevant contracts, and existing or proposed tests
   without prescribing the conclusions or desired implementation. Require review
   of observable behavior, independently derived expectations, meaningful failure
   coverage, and whether assertions could accept an incorrect implementation.
   Have the reviewer assess whether new tests are warranted even for small edits.
   Resolve material findings before implementation.
4. Make a cohesive change within scope. Use real conceptual boundaries, keep
   numerical or lifecycle invariants visible, and complete any intended cutover
   across affected consumers and public exports. Run checks appropriate to the
   change using existing project tooling. Do not install new tools or rewrite
   unrelated code merely to apply this skill.
5. Spawn a separate independent implementation reviewer. Provide the requirements,
   final diff, relevant surrounding code, and validation evidence without steering
   the findings. Require review of simplicity, correct ownership, fixes at the
   source, scattered workarounds, unnecessary abstractions, and scope discipline.
   Also check names, contract documentation, brief comments, and obsolete names
   or compatibility paths when replacing a design.
6. Resolve material review findings before completion. Obtain follow-up review
   of affected areas when corrections materially change reviewed code or tests,
   and run the checks appropriate to those corrections. Submit material test
   changes to the test reviewer as well as implementation changes to the
   implementation reviewer.
7. Report what became clearer, any intentional contract changes, removed legacy
   paths, validation results, both review outcomes, and unresolved limitations.

## LevelSpec application

Follow [repository contracts](../../../AGENTS.md) for authoring formats, the native
API, coordinate conventions and commands. Document boundary units, tolerance bounds
and meaningful precision where callers need them.

Distinguish caller-owned documents, compiled geometry, movement working geometry
and cached reports. Water-navigation support must not mutate exported collision.
Release native/WASM allocations on failure and cancellation as well as success;
validate cache identity against geometry, movement, body/boat settings and options.
Preserve failed-output recovery and source-linked diagnostics.

Adaptation provenance: [references/provenance.md](references/provenance.md).
