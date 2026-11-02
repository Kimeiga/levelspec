# Final implementation review

Scope: current XML-only harness on `codex/xml-cli-harness-next-phase`. This review
inspected contracts and risk-bearing paths across every retained production
subsystem. It does not claim every geometry algorithm or line independently proven.
Production changes were limited to the two confirmed lifecycle defects below.

## Findings and corrections

### FI-01 — Failed lighting bakes prevented a useful retry (fixed)

`src/lighting/bake.ts` previously passed the final destination to Blender and only
removed its temporary input/calibration directory on failure. A native failure
could leave partial output; the next invocation then refused that destination.

The complete bake, metadata copies and manifest parse now run in a sibling staging
directory. Only a complete result is renamed to the final destination. Existing
outputs are refused before work and checked again before publication. Failure
cleans staging, not caller-owned output. Keeping staging on the destination's
filesystem permits atomic directory promotion. Python manifests use relative
artifact names and source/material images are packed into the saved Blender file;
no absolute staging dependency was introduced into delivered runtime metadata.

The independent test reviewer approved the observable contract before production
changes and added a fake-native failure/success test with real compiled XML and UVs.
It proves partial native failure leaves final output absent, retry succeeds with
complete metadata, and an existing successful destination remains unchanged.
`node --test tests/vector-lighting.test.ts`: one passed. This is orchestration
acceptance, not a fresh physical Blender calibration or image-quality claim.

### FI-02 — Disconnection could be overwritten by an older HTTP response (fixed)

`src/cli/preview-client.ts` marked the reviewer stale on SSE connection failure but
did not invalidate an in-flight source fetch. Its eventual response could clear the
disconnected state despite no live watch connection. The disconnect handler now
increments the same request revision used to discard superseded HTTP replies before
reporting connection loss. Reconnection refreshes using the ordinary fresh request
path. Worker replies are separately invalidated by the reviewer's failure adapter.

Independent test review approved the ownership correction. Focused browser tests
cover normal stale recovery; the final test review records the disconnect-order
coverage and its exact limits. Root independently reviewed both production fixes
and found no blocker.

## Subsystem inventory and evidence

| Subsystem | Inspected boundaries and continuing evidence |
| --- | --- |
| XML parser/serializer/preflight | format.ts parser entry and source diagnostics, forbidden DOCTYPE/entity declarations, schema/dimension checks; normalization clones caller inputs. Existing roundtrip/invalid-input tests retained. Not every attribute branch re-proved. |
| Compiler/geometry/flights/walls | compiler.ts caller/source ownership, prop preparation, surface metadata/hash and tracked Manifold finally cleanup; sampled floor/flight/wall construction. Render/collision distinction and non-solid water retained. No new numerical defect established. |
| Precision/clipping/repairs | precision.ts normalization, clipping.ts safe integer budgets, finite/convex/area checks, allocation guards and source-linked repairs; movement.ts atomic shoreline repair and temporary boat support. Existing analytic clipping/failure/retry tests remain authoritative acceptance. |
| Navigation/validation/cache | validate.ts movement preparation, cache inputs, diagnostics and sealed/open behavior; navigation-build.ts bounded tiled/solo paths and native cleanup. Existing clearance, route, cache invalidation, water and premap tests retained. Native internals/all allocation exceptions not exhaustively proven. |
| Props/assets/references | props.ts validated geometry and abort-aware host resolver; sampled GLB resolver, camera fit and source/reference helpers. Existing real local-companion and independent reference regression evidence retained. No new surveyed reference-fidelity claim. |
| UV/lighting | uv.ts replacement-atlas ownership and finally cleanup; lighting manifests/state identity; bake.ts lifecycle and Python output/packing contracts. FI-01 fixes publication; fresh native image calibration not run. |
| Portable/native export | export orchestrator destination parents, staging/rollback and signal boundaries; texture/material resolution and source-relative paths; bounded process output/timeouts. Existing GLB loader/validator and native-failure tests retained. Parent checks are not a hostile concurrent-filesystem sandbox. Native importer compatibility remains optional acceptance. |
| CLI | main.ts parsing/result/exit/SIGINT contracts, pipeline.ts init refusal and cleanup, source-relative companion resolution, validation signal and result preservation; public launcher and starter XML. Actual subprocess coverage includes native cancellation, failure and useful next success. |
| Preview server/client | preview.ts manifest-only API, referenced-file watchers, atomic replacement, debounce, loopback startup and idempotent close; preview-client request identity and connection lifecycle. FI-02 addresses confirmed stale HTTP response boundary. |
| Reviewer/website/workers | sampled app.ts state/revision/updateSource/failSource/dispose and scene.ts render/selection/navigation/filter/material/resource paths; browser adapter and worker source compile/validation handoff. Shared UI replaces old independent renderers; no speculative broad restructuring applied. |
| Tooling/package/configuration | package exports/bin/scripts, typecheck retained-source inclusion, optional exporter services and relevant Python tools; test/CI reviewer owns discovery/workflow audit, docs reviewer owns instruction/guide inventory. |

## Strengths preserved

XML is the canonical editable source; runtime JSON remains a transport artifact.
Source-linked diagnostics and repair records survive command boundaries. Validation
reports preserve land/boat and playable/premap distinctions. Build/export cancellation
propagates through runtime validation and publication. Export rollback and successful
next-action tests protect useful failure recovery rather than only private state.

## Review limits

No exhaustive algorithm proof, mutation test campaign, native memory profiler,
long-duration GPU leak test, cross-browser graphics matrix, fresh Blender bake or
new real BSP importer run was performed. Dense existing numerical code remains a
maintainability concern to improve when changing its contracts; it was not broadly
reformatted or split solely to make this review larger. Generic symlink/TOCTOU
sandbox guarantees and real building-code/structural adequacy are not claimed.

The final coordinator report owns complete suite/build/browser results and any
remaining environmental limitations. Independent test and implementation reviews
were obtained for both changes; no confirmed ordinary in-scope implementation
defect from this pass remains intentionally unfixed.

## Graphics-recovery follow-up

The browser reviewer reported two transient driver warnings on its first injected
WebGL context-loss run (`delete` / `deleteVertexArray` object-context mismatch).
Inspection confirmed the current context-loss path clears model buffers, outline
render targets/materials/fullscreen buffers, textures and shadow targets before
restoration, then redraws through the same renderer. The subsequent frozen-build
run passed context recovery without reproducing those warnings. No speculative
resource rewrite was made from that single observation. This is not evidence of
long-duration GPU leak freedom; repeat graphics recovery remains a useful focused
check if the warning recurs. Final browser acceptance is recorded by the coordinator.
