# FPS inspection — independent implementation review

Review applies the repository's write-readable-typescript and maintain-tests
skills. Scope: `review/walk.ts`, the shared scene/app changes, focused unit/browser
coverage, and the documented inspection contract. Read surrounding navigation,
collision selection, walking input, rendering, stale-load and context-loss paths.
No production code was edited by this reviewer. **Implementation review released
after both material findings were corrected and follow-up reviewed.**

## Findings

1. **Active-walk form edits were overwritten between fields.** The initial
   `review-walk-change` handler updated each nonfocused input on every rendered
   frame. Editing feet and then focusing yaw restored feet before submission;
   the same failure affected yaw plus pitch. This breaks arbitrary repositioning
   during a successful walk. The correction populates the form only on explicit
   successful starts and keeps live actual-pose output separate. Source review
   of that correction passes. The expanded Chrome suite now submits feet, yaw
   and pitch together during a valid active walk and verifies all three commit.
2. **Inactive walk state depended on a rendered frame.** Initial publication of
   `dataset.walk` and `review-walk-change` happened only in `render()`. Switching
   from walking to 2D, including context-loss fallback, exits walking and hides
   the scene before another render. Published `active` could therefore remain
   true while `getWalk()` and mode reported inactive. Transition-owned publication
   and a browser exit/recovery regression were requested. The corrected scene
   publishes state synchronously at both enter/exit transitions and during live
   frames. Follow-up source review passes; Chrome verifies hidden 2D exit and
   actual WebGL context loss publish inactive state, followed by successful
   restoration and another walk.

Both findings were sent directly to the builder and coordinating agent promptly.
They are material UI/state-contract issues, not requests for unrelated cleanup.

## Ownership and design assessment

The placement module has a coherent boundary: parse/serialize a feet pose, select
an existing land-navigation component, resolve support within an explicit 0.10 m
vertical tolerance, and check the standing capsule against compiled collision.
Prepared state is committed only after validation succeeds. It does not rewrite
markers, nav seeds, reports, or source geometry. Using collision selection instead
of presentation visibility correctly preserves invisible-solid and visual-only
behavior. Existing navigation movement remains authoritative after placement.

The scene owns live position/orientation and degree/radian conversion; the app owns
form drafts, feedback and links. Fixing both findings at those boundaries is simpler
than adding focus exceptions or forcing hidden WebGL rendering. The reused pitch
limit removes the parser/runtime replay mismatch. Actual render-camera projection
and view matrices now describe the FPS camera consistently.

No additional implementation blocker was identified in the bounded collision,
navigation, stale-load, input-release and context-loss source review. This is not
a proof of swept collision or gameplay reachability; the documented constraints
accurately retain the existing sampled navigation walker.

## Validation

Independently ran `node --test tests/review-walk.test.ts`: **6 passed**. Tests use
compiled geometry and real navigation for disconnected components, stacked floors,
support tolerance, body overlap, hidden collision and visual-only scenery. They
also protect input immutability and useful recovery after failed placement.

The builder reported successful typecheck, viewer build, focused Chrome browser
suite and existing frame-aspect browser coverage before these review corrections.
After corrections, the builder reran the typecheck and expanded full Chrome suite:
**passed**, with evidence in `generated/walk-inspection-browser-RgzWqa/`.
I inspected the updated regression assertions and the retained results file, which
contains no page errors. Browser execution and build results are builder-reported,
not independent executions by this reviewer.

Both material findings are resolved. No remaining implementation blocker was
identified; no new physics/reachability claim is approved by this review.
