---
name: maintain-tests
description: Author, review, and consolidate unit, integration, and end-to-end test suites around durable feature behavior. Use for test organization, fixture simplification, redundant coverage, and reliable test execution; do not require new tests for unrelated low-impact edits.
---

# Maintain tests

Make failures explain a broken contract and let harmless implementation changes pass.

## Establish coverage ownership

Read repository guidance, public contracts, test discovery configuration, and representative tests before changing a suite. Identify which package and feature own each behavior. Organize by those owners, not historical bugs or implementation helpers. Split mixed concerns without creating a folder per function or imposing file-size quotas.

For cleanup, collect the current tests and run relevant baselines. Classify cases as keep, rewrite, merge, or delete. Before removing a case, identify its surviving behavioral coverage or explain why the contract is obsolete. Do not equate fewer tests or higher coverage percentages with better tests.

## Choose the boundary

- Keep pure mathematical and domain algorithms in fast deterministic tests with explicit inputs and independently derived expected results.
- Test feature behavior through real cooperating components and supported entry points. Prefer public package imports; a direct pure-domain test is useful when it protects an algorithm rather than incidental wiring.
- Use a real browser for layout, native input, animation, and framework reconciliation. JSDOM can host in-process integration tests but cannot establish browser layout or pointer-capture guarantees.
- Exercise frameworks through their state. Never make a framework test pass by structurally mutating framework-owned DOM.

Assertions should explain what a user or caller observes: output, committed state, identities, public callbacks, diagnostics, recovery, and documented timing. Callback counts and ordering are appropriate when the protocol itself guarantees them. Private maps, queue keys, helper calls, generated IDs, and source spelling usually are not contracts.

## Prune without erasing behavior

Delete historical checks whose only purpose is proving a removed feature, symbol, toggle, or implementation stays absent. Do not preserve obsolete API names in negative type tests. Avoid source-text scans masquerading as runtime tests; existing architecture rules belong in appropriate static tooling.

Do preserve meaningful negative outcomes: invalid input rejection, immutable public state, cancelled transactions, isolation, resource cleanup, and recovery after failure. A `.not`, `null`, or empty-result assertion is not inherently bad. After cleanup or cancellation, also exercise the next useful action when that proves recovery better than checking internal collections.

Merge equivalent scenarios, parameterizing meaningful input variations. Keep distinct contracts independently diagnosable. Retain regression cases that encode a continuing feature guarantee even when their original issue is old. Document unsupported capabilities instead of requiring the implementation to keep failing; expected failures need an intentional, current purpose.

## Keep fixtures smaller than the system

Use typed builders for data and real implementations for owned collaborators. Control external services, clock/frame scheduling, randomness, and platform boundaries narrowly. Do not build fake engines, registries, routers, or state machines that duplicate production logic. Do not compute an expected answer using the operation under test.

Keep helpers beside their consumers; share only actual repeated needs. Separate ordinary interaction drivers from optional diagnostic instrumentation. Restore globals, listeners, clocks, objects, and browser state even after assertion failure.

## Make execution deliberate

Wait for observable readiness and completion instead of fixed settling sleeps. Keep intentional pacing only when the input trajectory or elapsed time is part of the scenario, and explain it. Use bounded frame sampling for transient animation behavior. Seed randomized scenarios and report the failing seed and inputs.

For animation assertions, arm frame sampling before triggering the action, await the action, observe movement, and then wait for completion. Do not start a fixed recording deadline before a click or keypress: input dispatch and activation can consume the window before the animation finishes. Keep assertions on intermediate geometry and final state; increasing the window or removing interpolation checks does not resolve the race. Dispose samplers and observers after success or failure.

Map each test to its intended browser/framework combinations. Avoid duplicate execution of the same case in overlapping configurations. Extra browser or adapter runs should protect that platform boundary, not repeat all pure logic. Keep type checks, runtime tests, manual reproductions, and promotional recordings distinct.

After moves, compare discovery before and after. After rewrites, run affected suites and type checks, then the relevant complete acceptance matrix. Repeat changed timing-sensitive scenarios with retries disabled. Report pre-existing failures separately and never weaken a supported contract to obtain a green run.

## Diagnose unreliable browser runs

Inspect retained traces, console messages, navigation, and frame samples before attributing a failure to application code. A fixture disappearing or resetting mid-gesture can indicate hot reload rather than broken drag behavior. Reproducing against older code is not a valid control if that run suffers the same environmental interruption.

Keep acceptance fixtures stable for the duration of a run. When using development servers, disable file watching and hot reload for acceptance, and isolate dependency caches between concurrently running servers. Use separate ports and artifact directories; a runner that clears a parent output directory can erase another suite's evidence. Restart the run after relevant source changes rather than claiming a live development server represents a frozen source snapshot.

Distinguish runtime defects, test-driver races, and environment interference. Verify a suspected cause with a focused reproduction, then repeat the repaired scenario with retries disabled and run its complete browser/framework matrix. Fix the cause rather than hiding failures with retries, arbitrary delays, or weaker assertions.

## LevelSpec application

Follow [repository contracts](../../../AGENTS.md) for authoring formats, the native
API, coordinate conventions and commands. Derive geometric expectations independently
and document meaningful precision and tolerance bounds.

Test ownership and separation of caller inputs, compiled geometry, movement working
geometry and cached reports. Water-navigation support must not mutate exported
collision. Exercise observable cleanup and recovery after failure/cancellation;
check cache invalidation against geometry, movement, body/boat settings and options.
Preserve failed-output recovery and source-linked diagnostics. Browser screenshots
cannot establish navigation validity.

Adaptation provenance: [references/provenance.md](references/provenance.md).
