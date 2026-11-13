# Active-camera caption — independent pre-implementation test review

Accepted for the bounded caption correction after the three test gaps below were repaired. This is test-boundary approval, not implementation approval. Production was unchanged during this review.

The defect is observable and worth fixing: a screenshot's visible caption says orthographic while the active first-person camera is perspective. This belongs in the existing real-browser walk scenario, where actual compiled navigation, URL/form/spawn entry, rendered matrices and UI transitions already cooperate. A new unit suite or duplicate browser harness is unnecessary. Apply the TypeScript/readability and maintain-tests skills; no production files were edited by this reviewer.

## Independently checked contract and evidence

I read `fps-caption-review-brief.md`, `tests/walk-inspection-browser.mjs`, active/saved-camera publication in `review/scene.ts`, and the relevant mode, view-caption and entry paths in `review/app.ts`. The overview pose remains a separate saved state while walking renders a perspective camera. The plan is another active surface, not an orthographic overview label. Caption correctness must follow the active viewport without changing any camera, geometry, source or navigation contract.

I independently ran `node tests/walk-inspection-browser.mjs` against the unchanged production revision. It failed at the valid URL walk caption: actual `ORTHOGRAPHIC / Z-UP METERS`, expected first-person perspective. The run had no browser page errors. Evidence is `generated/walk-inspection-browser-QBIta2/results.json` and `REVIEWER-RED-RUN.json`. The initial reviewed test hash was `e598e1abe0525950aae9e7bb1002d871b2e4f0e2dfe671f6355100f392ace26c`; production `review/app.ts` was `c77a40d37e2a7ff8be10806a2d111e76382f3807068e3342503fdedae3056ff2`. Root's earlier red run `generated/walk-inspection-browser-4OUikH` independently exhibits the same caption, but is not substituted for my run.

## Findings and repairs

1. The first successful **form start from overview** entered active walk without asserting its caption before navigating away. Later form actions already began in walk and could not independently establish this entry path. Root added the caption assertion immediately after that first successful form start.
2. Reading `textContent` alone did not establish the requirement that the caption is visible. Root added an actual visibility assertion.
3. The walk-only positive regex could accept a concatenated misleading caption such as first-person perspective plus a stale orthographic label. Root added rejection of `PLAN` and `ORTHOGRAPHIC` during walk.

I reread those repairs at test SHA256 `a0fd9d9bad99496885b19c91b117f6d3bbe72bd6656dbef25e5bbe86b7dbda6a`, while the production app hash above remained unchanged. They resolve the material pretest gaps. No assertion was weakened. I did not rerun the intentionally failing pre-change scenario solely to repeat the same defect at the earlier form assertion.

## Coverage assessment

The strengthened scenario covers unsupported initial URL placement retaining overview, successful form entry, successful URL entry, actual perspective projection/view basis for the URL pose, rejected active placement retaining walk/pose, Escape back to orthographic overview, authored-spawn entry, switching from walk to plan, returning to overview, perspective overview, walk from that saved projection and Escape back to perspective. The URL case waits for rendered frames before checking the caption, which rejects a merely transient entry label overwritten by later overview-camera publication. The existing matrix check supplies an independent actual-camera witness rather than inferring projection solely from label text.

The existing suite also retains source immutability, constrained movement, context-loss recovery and invalid-source/reload behavior. These broader cases need not be duplicated for a caption-only correction. The added assertions test semantic active modes, not private helper calls. Exact decorative punctuation is not the new contract.

## Next gate

Proceed with a narrowly scoped production caption correction and run the full existing walk browser scenario and type check. Separate implementation review must check that saved overview projection/pose, walk matrices, plan state and all entry paths retain their behavior. This pretest assessment does not approve that as-yet-unwritten change, source fidelity, architectural drawings, navigation reachability or any 3D model.

## Bounded post-change test follow-up

Accepted the synchronization correction at test SHA256 `1e076649a65fc249e852f9f42070ab7f18cb7e5ca74a47b6936bec60086b0e08`, app SHA256 `2b4ebda6a2496ade6b3f756deae16696a052d5067d198e183cdf37a29be67e0b`. For an expected overview projection, the helper now waits for `#model.dataset.projection`, published from the actual rendered camera. It then independently asserts the visible caption. The wait does not inspect the caption, retry a failing assertion, weaken it, or use a fixed sleep; an incorrect label still fails after the camera transition completes. Walk/plan assertions retain their separate mode expectations. This is the right observable completion boundary for a projection-selection event whose handler can return before its next rendered frame.

I independently reran the complete `node tests/walk-inspection-browser.mjs` scenario without retries: **PASS**, `generated/walk-inspection-browser-10hX4K`, no browser page errors. Root's prior passing `zY013d` and failed timing evidence `HgpbJv` remain separate. The three original coverage repairs remain intact. No material test finding remains for the caption-only scope; separate implementation review remains required and this follow-up does not approve architectural geometry.
