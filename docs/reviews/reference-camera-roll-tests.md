# Independent preimplementation roll test review

Reviewer scope: requirements, existing coverage and proposed tests before production roll changes. Read `write-readable-typescript` and `maintain-tests`, shared view/parser/scene/form callers, CLI launcher/arguments, preview browser tests, suggestion link/restore tests and existing walk browser contract. No production code or test files edited by this reviewer. Model/reference reconstruction reviews remain separate.

## Gate

**Proposed production work may proceed with the agreed contract and test plan below.** New tests are warranted: existing tests can pass while a serialized roll scalar never rotates the rendered camera. The implementation agent has agreed to expose the active rendered view matrix and test a cardinal basis independently of its roll helper. No unresolved material preimplementation blocker remains. Submit the actual changed assertions for follow-up review; this approves the plan, not unseen implementation/results.

## Agreed observable contract

- `roll` is finite degrees. Positive is right-handed rotation about camera forward, position→target. A cardinal overview at P=[0,-10,0],T=[0,0,0],roll+90 must have actual screen-right=[0,0,-1],screen-up=[1,0,0],forward=[0,1,0]. A fixed world-up landmark therefore projects toward screen-left. This independently distinguishes the opposite THREE local-Z convention.
- Camera specialist confirmed its internal fitter angle has the opposite sign. Its internal overhead−21.491 degrees becomes public+21.491. At P=[2.619982,.819233,9.141335],T=[.907190,2.356715,3.600352], its actual captured up≈[-.394735,.846629,.356936] is a useful independent reference pose. Use exact capture precision/tolerance if adopting this check.
- Default omitted roll is0. Parser accepts signed finite and full-turn angles; blank/NaN/±Infinity are invalid. Getter returns effective roll from actual camera orientation, canonically modulo360; round-trip guarantees orientation rather than preservation of an arbitrary450-degree spelling.
- Camera Apply with unchanged roll preserves orientation. Projection-only and FOV-only updates preserve effective overview roll; projection toggle does not alter position/target/basis. Source edits preserve the entire current overview orientation. Fresh view URL replays actual pose/basis.
- Fit preserves current effective roll while refitting its standard view direction/frustum. This includes roll-only initial URLs without explicit camera/target. Named top/front/side presets explicitly reset roll0. These are distinct supported actions.
- Orbit interaction may change effective roll relative to the new view direction. Captured state and URL reflect the actual resulting basis, not a stale originally requested scalar.
- Walk owns a separate Z-up camera. Entering walk does not copy overview roll into walk; movement and world-up stay unchanged. Leaving walk restores the unchanged overview orientation. Domain geometry/up axes remain right-handed Z-up.
- `data-view-matrix` reports the actual **active rendered** camera.matrixWorldInverse; existing `data-view` remains overview state. This read-only instrumentation is needed for actual camera behavior assertions, including walk isolation.

## Existing coverage ownership and meaningful extensions

| Boundary | Existing owner | Required meaningful extension |
|---|---|---|
| Parser/URL state | `review/view.ts`; no existing focused pure view suite found | Add focused `tests/review-view.test.ts`: signed/zero/full-turn parse; reject blank, NaN, ±Infinity; round-trip effective state and retain unrelated URL parameters. Do not assert source spelling/private helper call counts. |
| CLI input/server URL | `tests/vector-cli.test.ts` | Extend invalid-before-server/file-read cases for roll nonfinite/blank. Extend existing valid launcher case to check finite signed roll reaches live URL; retain shutdown checks. |
| Actual camera / UI / replay | `tests/preview-browser.mjs` | Extend existing real-browser scenario, not a duplicate fixture: cardinal+90 actual matrix/basis; UI roll application; opposite sign or specialist pose; position/target invariance; URL replay actual basis. Projection matrix alone does not prove rotation. |
| Orbit→capture→replay | same browser owner | Use real pointer drag, observe basis change and completed frames, copy actual view link, then compare replay basis within numerical tolerance. Scalar equality alone can miss OrbitControls overwrite or getter errors. |
| Projection/FOV/fit/preset lifecycle | same browser owner | Assert full basis retention through projection and Apply/FOV-only changes, Fit retains effective roll, named preset resets0. Include roll-only no-position initial URL because automatic perspective fit otherwise silently erases it. |
| Live revision retention | same preview browser suite | Set nonzero roll immediately before a watched XML edit; compare actual basis and state after a confirmed new ready/render frame. Existing `data-camera` omits roll, so its current equality check is insufficient. |
| Invalid form recovery | same preview browser suite | Invalid camera/roll input preserves last valid state and actual orientation; then a valid Apply succeeds. Number inputs may block invalid strings natively; test via normal input/API boundaries rather than mutating framework DOM to force impossible text. Pure parser/CLI tests own nonfinite strings. |
| Walk isolation | existing browser walk contract or same preview fixture with authored spawn | With nonzero overview roll, assert active walk basis upright at neutral pitch/yaw, actual planar movement remains world-XY, and Escape restores overview basis. Keep existing movement/release coverage; do not only inspect overview `data-view` while walk renders another camera. |
| Suggestion view links/restore | `tests/suggestions-browser.mjs` | New roll is another pose field: copied finding links should clear it consistently with camera/target/fov/view-height; restore previous view should retain rolled orientation. This is a relevant existing consumer, not a new abstraction. |

## Assertion quality / failure modes

1. Derive the cardinal expected basis by geometry (above), not by calling the new production roll helper in the expected-value path. A 90-degree sign anchor catches reversed convention; a non-cardinal pose catches wrong rotation axis/up projection.
2. Read basis from the actual rendered view matrix. A test limited to `getView().roll`, input.value, camera.up or the URL can accept a no-op renderer, a controls update that overwrites orientation, or a serializer that echoes requested state.
3. Compare finite orthonormal basis and forward direction as well as roll; a wrong camera look direction should fail even if one up-vector component matches.
4. Projection/reload/replay tests compare orientation within an explicit tolerance, not exact float arrays or a canonical degree spelling such as450 vs90. Keep positions/targets unchanged when that is the behavior under test.
5. Use observable readiness/render frames and real input. Do not add arbitrary sleeps, change the live source while recording an unrelated drag, or rely on retries to hide unstable fixture state.
6. For rejected values, prove last valid view survives and next valid action works. Validate CLI rejection before server readiness and before the missing-file ENOENT path, preserving current usage-exit semantics.

## Planned execution / follow-up

Implementation agent reported existing CLI baseline10/10 passes. Run the new focused Node view tests, changed CLI tests, `npm run check`, and the real preview browser suite after changes; the browser suite owns the integration gaps above. Run suggestions browser when its pose-field behavior changes. Broader Node suites/builds should follow repository requirements, with unavailable checks reported explicitly. Separate implementation review is still required by the TypeScript skill and is not replaced by this test-plan review.

Follow-up test review must inspect actual changed assertions/results, particularly active walk camera matrix, roll-only auto-fit, orbit URL replay and sign authority. This reviewer has not yet seen those tests or accepted their passing behavior.

## First actual-test follow-up

Inspected the implemented focused Node view tests and actual preview/CLI/suggestions browser assertions. Cardinal+90 basis is independently anchored. Initial non-cardinal up, actual matrix projection retention, real orbit→URL full-matrix replay, roll-only auto-fit, nonzero37 watched-edit retention and active walk upright basis are meaningful integration coverage. Parser invalid/finite cases and CLI valid signed query/reject-before-file cases are appropriately placed. Instrumentation reads `renderCamera.matrixWorldInverse`, not echoed requested state.

One material test gap remains: suggestions restore compares roll0 against roll0 on the primary page; the separate rolled−23 replay page closes before the restore case. This could accept a restore implementation that always resets roll. Requested a nonzero rolled Inspect→Restore case with actual orientation comparison. Also requested a real FOV edit via Apply on a rolled view (current valid Apply leaves FOV unchanged), and replacement of exact matrix-string walk-exit waiting with readiness/frame observation plus numerical tolerance. Await revised assertions and completed browser results before final test acceptance.

## Final test assessment

**Test-review gate passed.** Personally inspected the revised assertions and closed the material restore gap: a rolled−23 overview is snapshotted, inspected, changed through UI to57, then restored to−23 with full actual view-matrix comparison. This would reject a restore implementation that merely resets/retains the currently inspected roll. Copied suggestion links also demonstrably strip roll alongside the other view fields.

The valid camera recovery now changes FOV47→51 while retaining the rolled31 actual matrix and clearing the prior error. Walk exit now observes overview mode plus a subsequent render frame before a tolerance-based matrix comparison. These fixes preserve independent behavioral assertions rather than weakening checks.

Coverage is adequate for this focused feature: parser/CLI finite signed handling, independently anchored actual cardinal orientation, non-cardinal orientation, both projection directions, real orbit→actual URL replay, roll-only automatic fit, named-preset reset, nonzero live-edit retention, valid recovery, active walk upright basis and restored overview, and suggestion link/restore lifecycle. The browser checks read the actual active rendered matrix; they cannot pass by storing/echoing an unused roll scalar alone. Existing movement tests continue owning constrained movement behavior; the new walk case specifically protects camera-up isolation.

Validation evidence: this reviewer independently ran `node --test tests/review-view.test.ts` (3/3 pass). Implementation agent reported `npm run check`, all13 focused pure/CLI cases, and the final full `npm run test:preview:browser` (preview plus suggestions browser suites) passing after these tests-only revisions. No retry/sleep workaround was introduced for these requests. This is independent **test** review; separate implementation review remains the implementation agent/root's responsibility under the TypeScript skill.
