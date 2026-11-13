# Independent camera-roll implementation review

Disposition: **accepted for the documented roll contract; no material implementation finding.** This review is separate from the Daiban model/reference-fidelity work and makes no acceptance claim about that model.

Applied `.agents/skills/write-readable-typescript/SKILL.md`. Reviewed actual current files directly because the surrounding XML migration leaves these files untracked and absent from an ordinary git diff: `review/view.ts`, `review/scene.ts`, `review/app.ts`, `review/suggestions.ts`, `src/cli/main.ts`, `src/cli/preview.ts`, `docs/WEBSITE.md`; also read the focused Node/CLI tests and relevant full preview/suggestions browser paths. No production or project model files were changed by this reviewer. The author is `/root/reference_workflow_impl`; the separate test reviewer is `/root/daiban_source_connections`.

## Contract and ownership

The authoritative roll input is finite degrees, positive by the right-hand rule around camera-to-target forward. `orientCamera()` derives a canonical Three Z-up baseline, rotates its image-up around that forward axis, and applies it to the overview camera. `getView()` derives effective image-up from the **actual quaternion**, computes the signed angle around the current forward direction, and returns the signed half-turn representation. There is no duplicate mutable requested-roll state competing with the camera after orbiting.

The setter/getter signs are consistent: looking along +Y, +90 degrees makes actual image-up +X. The cross-product order in the getter returns the matching positive sign. Whole-turn counts intentionally normalize because the replay contract is orientation, not turn history. `zeroRollUp()` uses Three's own canonical look-at basis, including its pole fallback, rather than adding another approximate pole convention.

`setView()` validates explicitly supplied roll before exiting walking or mutating the camera. Omitted roll preserves actual effective roll while position/target or projection changes. URL/form/CLI parsing validates the complete incoming pose before use. The programmatic scene API is documented as applying already validated options; its existing internal callers supply compiled geometry or previously observed camera state.

## Caller and lifecycle audit

- Shared contract: `ViewOptions.roll` optional input; `ViewState.roll` required actual output; `parseViewOptions()` and `viewURL()` carry it alongside position/target, projection, FOV and orthographic framing.
- CLI boundary: `main()` recognizes/validates `--roll`; `startPreview()` carries it into the URL and reuses the same validator before server creation. Invalid numeric roll fails at the argument boundary; negative CLI values are documented using `--roll=-21.49`.
- Initial load: `mountReviewer()` parses once, applies the initial pose once after geometry, and its initial automatic perspective Fit retains roll and inactive orthographic framing. Same-document watched edits call `setLevel()` without camera fitting and do not replay stale URL roll.
- Projection selector: `setView({projection})` copies position/quaternion/up to the destination camera, restores actual effective roll, retains the shared target, and updates matrices. No new camera-control lifecycle or parallel orientation controller was introduced.
- Camera form and link: form parsing includes roll; the view-change event fills inactive fields and writes a full-precision replay URL. The UI does not overwrite the field currently being edited. Position fields retain the existing six-decimal display convention; the replay URL uses actual unrounded state.
- Suggestions: inspection snapshots a complete `ViewState`, framing uses the same scene setter, and restore reapplies the complete state. Copied semantic suggestion links clear roll along with stale explicit pose/framing; explicit camera links retain it. No second roll path exists in the panel.
- Fit/presets/turn: Fit preserves **effective roll**, while retaining the established default isometric sight-direction behavior; this is explicitly documented in code and WEBSITE. Named presets request roll zero, including the isometric preset through the default direction. Quarter-turn uses actual effective roll and updates orientation after changing the viewing direction.
- Resize/framing: active aspect updates both camera projection matrices and separate walk aspect. Orthographic height is reported divided by zoom; replay canonicalizes zoom to1 with the same effective framing. Perspective Fit changes perspective distance rather than overwriting saved orthographic height.
- Walking: its own camera remains Z-up and receives independent yaw/pitch positioning. Roll changes only overview cameras. Enter/exit and source/watch changes retain the overview quaternion; `data-view` reports that overview while `data-view-matrix` reports the camera actually rendered. Documentation makes that distinction explicit.

Repository caller search found no additional production users of `ViewOptions`, `ViewState`, `parseViewOptions`, `viewURL`, `setView()` or `getView()` requiring the new property. The change is a cohesive additive orientation contract rather than a compatibility fork. Existing parser/CLI/UI distinctions remain at their appropriate boundaries.

## Independent numerical verification

In addition to source review, I executed the actual `ReviewScene` methods using actual Three cameras and real OrbitControls with no DOM/GPU constructor, injecting only the scene-owned camera/bounds fields. This exercises the implementation without depending on its serialized roll number as the sole oracle.

- Specialist capture: pose `(2.619981514651262,0.8192334885818751,9.141334821367176)`, target `(0.9071896452702055,2.356714809321118,3.600351587268733)`, public roll `+21.490674804749°`. Actual quaternion image-up differed from the specialist's authoritative `(-0.3947349998446703,0.8466292460542664,0.3569358480500555)` by Euclidean `2.48e-16`.
- Tested actual setter/getter replay with rolls `-179,-90,-21.49,0,90,179,450` under both projections. Actual replayed quaternion angle stayed below `1e-6`; `450°` correctly returned an effective `90°`.
- Fit test used an asymmetric box `(-15,-2,-0.1)..(4,25,9)`, portrait aspect0.68, and47-degree perspective FOV. Independently projecting every box corner with the resulting actual camera gave maximum absolute NDC X/Y `0.862069` for each roll/projection case, consistent with the1.16 framing margin. No corner clipped; roll remained effective and normalized.

Also cross-checked `generated/roll-reference-camera-verification/capture.json`: its expected/actual up vectors and full-precision replay URL agree with the independent probe. Its screenshot aspect differs from the source frame and is correctly labeled orientation-only; this is not architectural camera-fit acceptance.

## Validation and review limits

The author reports `npm run check`,13 focused Node/CLI cases, the full preview and suggestions browser suites, and both browser builds passing. I read their actual relevant assertions: cardinal camera basis, quaternion/matrix replay after orbit, projection change, watched-edit retention, upright walking, suggestion restore and semantic-link cleanup. I did not rerun those already-passed complete suites or claim their execution as my own. The independent geometry/frustum probe above addresses numerical framing and the specialist orientation specifically.

No material simplicity, ownership, lifecycle, sign, framing, caller-cutover or documentation defect was found. The documented Fit behavior preserves effective roll, not the previous orbit direction; changing that established framing behavior would be a separate product decision. Exact-pole and arbitrary extreme-magnitude inputs inherit Three/JavaScript numeric behavior; no new unsupported promise or special-case machinery was added for those.
