# FPS arbitrary inspection spawn — independent test review

**Final independent test review released.** All material findings and browser
completion conditions below are resolved. New deterministic
coverage is warranted: arbitrary placement crosses floor identity, capsule
collision, component ownership and UI transaction boundaries that authored-spawn
walking did not expose. This is a test-design review, not implementation approval
or proof of continuous physical reachability.

The review began before production changes. I read the proposed tests and current
`review/scene.ts`, `review/app.ts`, `review/view.ts`, `review/navigation.ts`,
`website/navigation.ts`, `website/walk-input.ts`, collision selection and existing
view/walk/browser tests. Applied write-readable-typescript and maintain-tests.
No production code or architectural files were edited by this reviewer.

## Reviewed contract

Feet are right-handed Z-up meters; yaw/pitch are degrees, yaw0=+X, yaw90=+Y.
Any *existing* land-nav component can be selected for an ephemeral inspection walk,
including one without an authored spawn. Source markers, navigation geometry,
component/coverage/route reports and validation results must not change.

The requested Z must be within an explicit .10m support tolerance. Success reports
actual supported feet, rather than silently moving to another floor. Unsupported
height/void, invalid orientation, missing navigation, or an actual colliding body
must reject visibly and atomically. Placement cannot use rendering visibility as
collision authority. Movement continues to use existing eroded Recast walking;
this feature must not introduce a new physics engine or claim that sampling proves
continuous collision clearance.

## Material findings and resolution

1. **False-positive movement assertion — resolved.** Initial test moved100m and
   asserted only x<6. Existing NavigationSurface refuses more than1000 substeps,
   returning the start, so a no-op passed. The revised test moves5m, asserts actual
   progress x>4 fromx3, and still asserts the eroded-boundary stop.
2. **Floor identity and grounding tolerance — resolved.** A real compiled fixture
   now includes same-XY floors atZ0/Z3. Upper placement stays upper; midpoint rejects.
   Requests .099/.101m from actual nav elevation exercise the .10m contract, with
   returned feet explicitly checked and serialized. No floor-snapping fallback.
3. **Pitch replay mismatch — resolved at contract level.** Parser80degrees versus
   previous look clamp1.4radians could publish an unreplayable pose. Proposed shared
   MAX_WALK_PITCH=80 now owns parsing/look behavior; unit replay covers that extreme.
   The final browser test drives real pointer look to80degrees and checks its replay link.
4. **Point-only/render-only collision — resolved in unit coverage.** Tests now
   reject a capsule-radius overlap whose feet center lies outside the wall, reject
   wall/low ceiling despite deliberately optimistic cached nav, accept noncolliding
   scenery and reject render-hidden solid geometry. Expectations use actual compiled
   geometry, not a mock physics engine or the operation being tested.
5. **Mutation and recovery — resolved for pure boundary.** Document and nav snapshots
   remain unchanged after success/movement and wall/ceiling rejection; valid placement
   works after failure. Selecting another component does not connect it to authored
   spawn's component.

## Browser completion conditions — resolved

I reviewed the final assertions and independently ran the complete browser scenario.
The following observable contracts now pass; material changes should return for review:

- Invalid walk URL gives useful placement feedback, remains overview and does not
  silently fall back to an authored spawn.
- Invalid form submission preserves active FPS pose *and* preserves overview
  pose/mode when submitted from overview. A subsequent valid submission recovers.
- Existing stale/unready geometry prohibition also protects the new form/API entry:
  no inspection start on a stale preview; valid reload restores useful behavior.
- UI/URL round-trip actual feet and orientation; reported view/projection matrices
  match the FPS render camera, eye height and aspect rather than mixed overview/FPS
  diagnostics. Independent expected yaw90/pitch10 matrix checks pass against the rendered FPS diagnostics.
- Existing constrained movement makes meaningful progress, stops at a boundary,
  releases input and exits cleanly. Authored-spawn walking still behaves as before;
  neither arbitrary entry nor failure changes its seed.

Use observable readiness/frame/state conditions and real browser input. Do not
change framework-owned DOM to force state, duplicate NavigationSurface in fixtures,
or infer correctness from a screenshot alone. Preserve unrelated source/context
parameters in replay links. Full player settings remain unchanged.

## Final material regression follow-up

The separate implementation reviewer found two integration bugs: live pose updates
overwriting a multi-field form draft, and stale `active` publication when the
viewport became hidden. I reviewed the added test assertions without expanding
into a second production implementation review. The browser now commits feet,
yaw and pitch together while walking; verifies hidden2D exit and actual WebGL
context loss publish inactive state; and restores a useful walk after context and
stale-source recovery. Invalid startup URLs, invalid overview/active submissions,
and successful reload followed by a valid placement are all exercised.

One final test-only strengthening was required: after filling the active draft,
wait for two actual rendered frames before asserting retention and submitting.
Without that explicit frame progression, the earlier per-frame overwrite could
escape on a fast machine. Root applied the bounded change. I independently reran
the full browser scenario with it: passed. This uses an observable rendering
condition, not a fixed settling delay or DOM mutation.

## Verification and handoff

Independently ran:

- `node --test tests/review-walk.test.ts tests/review-view.test.ts website/tests/walk-clock.test.ts website/tests/courtyard.test.ts`: **21 passed**.
- `node tests/walk-inspection-browser.mjs`: **passed**, exit0, no retries. Retained
  evidence: `generated/walk-inspection-browser-SUBYDY/`, with `errors: []`.

The browser run includes actual full-form drafting/commit, runtime pitch-clamp
replay, FPS matrices, component-constrained movement, authored-spawn fallback only
when explicitly requested, hidden-viewport/context-loss exit and recovery, and
stale/unready rejection followed by useful placement after reload. Source XML
immutability is asserted; unit tests separately preserve navigation data.

No remaining material test blocker was identified in this bounded review.
The separate implementation review is recorded in
`docs/reviews/fps-inspection-implementation-review.md`; its release does not depend
on this reviewer claiming a second implementation review. The tests protect the
inspection contract, not swept physics, source fidelity or gameplay reachability.
No production or architectural files were edited by this test reviewer.
