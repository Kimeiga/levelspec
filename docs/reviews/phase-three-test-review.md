# Phase-three independent test review and coverage

The test reviewer read the repository testing and readable-TypeScript skills and
reviewed the proposed boundaries before production CLI/preview implementation.
Initial recommendations were supplied independently to both implementers: use the
real executable, distinguish invocation failures from document/runtime failures,
assert observable output preservation and successful recovery, and exercise the
current reviewer rather than weakening obsolete playground selectors.

## Process-boundary coverage

`tests/vector-cli.test.ts` owns actual launcher contracts:

- Help/version and usage exit status, including unsupported preview JSON mode.
- Initialization creates a valid project; an existing destination is refused without
  changing authored source.
- Malformed source produces source-linked errors without output; repaired source
  validates and missing source receives a structured input error.
- Portable build from a different working directory handles paths with spaces,
  produces absolute artifact paths, real GLB magic and runtime identity.
- Physically invalid low-headroom input and missing native tool leave prior portable
  outputs unchanged; a later valid build succeeds.
- Output and ancestor symlinks cannot redirect publication, outside sentinels remain
  untouched, and normal output works afterward.
- Direct nested export writing rejects a symlinked texture directory and succeeds
  after replacement with ordinary storage.
- SIGINT waits for a real fake-native-process readiness marker, not an arbitrary
  sleep. Cancellation exits130 with one JSON failure, preserves prior output and
  permits the next build. The fake process controls only the native boundary; it
  does not imitate the compiler or exporter.
- An explicitly occupied preview port fails without closing its existing listener.

`vector-glb-cli.test.ts` preserves real relative companion-GLB resolution through
the new executable. JSON.parse of complete stdout establishes one JSON result;
expected geometry/artifact identities do not reuse CLI implementation calculations.

## Browser boundary review

Reviewed the preview agent's real-browser test for initial file load, preserved
camera, malformed-source stale status, atomic replacement recovery, rapid edits and
shutdown/restart. Requested that browser launch be included in cleanup protection.
Back-to-back writes may be coalesced by a watcher; they establish latest-input
behavior, not proof that an older worker definitely completed after the newest one.
The preview agent owns companion-asset/browser execution details and final results.

## Independent implementation review

The coordinator independently reviewed the test diff, including meaningful failure
and recovery assertions, and reported no blocking finding. Production implementation
review belongs to that separate reviewer; this test author does not self-certify it.

## Evidence and limitations

Focused execution is recorded in `/tmp/levelspec-phase3-cli-tests.log`; the final
summary is authoritative. Full root/site/build/browser results are recorded by the
coordinator in the phase-three validation report. Native compatibility is not proven
by a fake-tool cancellation test; actual native checks retain prerequisites/skips.
This suite is not a filesystem race/security proof, nor proof of synchronous WASM
preemption. It does verify the observable symlink policy and cooperative cancellation.
