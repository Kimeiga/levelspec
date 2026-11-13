# FPS caption — independent implementation review

**Approved for the bounded caption correction. No material findings.** This is the independent implementation review, separate from the pre-implementation test review in `fps-caption-test-review.md`. I applied `write-readable-typescript` and `maintain-tests`; no production code or test was changed by this reviewer.

Scope is the new `updateViewLabel()` helper in `review/app.ts` and its three lifecycle call sites. The larger working-tree diff contains previously developed FPS features and is not claimed to have been comprehensively re-reviewed here. I read the requirement brief, final caption assertions, surrounding app lifecycle and scene camera/walk publication.

## Correctness and ownership

The helper resolves the visible surface in the right order: plan first, active walk second, saved overview projection otherwise. It writes only caption text. It does not mutate the overview camera, projection selector, walk pose, geometry, source or navigation. This addresses the original ownership error directly: overview events continue to publish the saved overview state while the caption derives the actually visible mode.

- `enterWalk` sets `walking=true` before its callback; `exitWalk` clears it before the callback. The helper therefore reads the committed mode on entry/exit, including Escape and the exit button.
- `setView` assigns the new visible-view state before exiting walk. Plan transitions receive the plan label even if exit callbacks fire synchronously. Successful walking entry from a plan then selects3D and updates the caption again in the same action.
- Every rendered overview publication calls the helper, so subsequent frames cannot overwrite a walking caption with the saved orthographic projection. The saved perspective overview is restored accurately on exit too.
- Failed starts do not mutate walking state, so the existing caption remains correct. URL, form and authored-spawn entries converge on the same successful lifecycle.
- Context loss exits walk and selects the plan; restored graphics and later overview changes use those same update points. Loading failures likewise exit through the normal path. No extra caption-specific mode state or compensating DOM mutation was introduced.

The small documented helper is cohesive and proportionate. Explicit branches make the precedence readable; keeping it beside the camera/view UI functions avoids scattering a duplicated caption rule. The existing initial orthographic fallback is appropriate before the scene exists. No compatibility alias, generalized abstraction or unrelated cleanup was added.

## Tests and independent validation

The final real-browser scenario checks visible semantic captions on successful form/URL/authored-spawn entry, rejected starts, plan transitions, both overview projections and Escape. Its independent Three.js matrix expectation also verifies that the first-person projection really is perspective. Assertions do not depend on the helper name or decorative punctuation. Waiting for actual published projection before checking an overview caption is consistent with the asynchronous render lifecycle; it does not weaken the semantic expectation.

I independently ran:

- `node tests/walk-inspection-browser.mjs` — **passed**, evidence `generated/walk-inspection-browser-SUs2YP`, no browser page errors.
- `npm run check` — **passed** (`tsc --noEmit`).
- `git diff --check -- review/app.ts tests/walk-inspection-browser.mjs` — **passed**.

The browser scenario started its own random-port preview and cleaned up its browser/server in `finally`; existing5217/5219 services were untouched. Root's earlier pass at `generated/walk-inspection-browser-zY013d` is additional evidence, not substituted for this run.

Reviewed final file SHA256:

- `review/app.ts`: `2b4ebda6a2496ade6b3f756deae16696a052d5067d198e183cdf37a29be67e0b`
- `tests/walk-inspection-browser.mjs`: `1e076649a65fc249e852f9f42070ab7f18cb7e5ca74a47b6936bec60086b0e08`
- Surrounding `review/scene.ts`: `c54ad1ce2d11e4418af52fa15f854675f0c9a0d72529ee572b586244e4b77e12`

This approval concerns caption correctness and preservation of the existing mode/camera contract. It is not architectural acceptance, a new physics review, or an assertion that navigation sampling proves continuous mesh collision.
