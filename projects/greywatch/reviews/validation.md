# Greywatch — final validation and evidence record

Source: `projects/greywatch/level.aml`, model r2 / developed layout r5.

- SHA-256: `d976e48cb2564af26159594320232e98fa739d29309a4fc1386d0c75b4de04f6`
- Physical hash: `604e2096ea2166357d5b55159c215a2c21ba0baeb7888ad9d4ea05d90f215bdb`
- Render hash: `d62834f765874c4ad5c77ab7ed1ebd724e35a73ceaea6c713569f705200d39d1`

## Actual results

Strict playable CLI validation and GLB/OBJ/default-artifact build succeeded with no diagnostics. Navigation cell0.125 m; coverage spacing0.5 m; 15,404 samples, 15,373 covered,31 excluded, zero uncovered. Eight authored floor/stair/landing regions share one reachable component. The exported scene has9,983 triangles and290 architectural objects. Scenic wall, cap and tower tops are unassigned and do not imply playable access.

Artifacts and full validation: `generated/greywatch/build-r2/`; `validation-cli.json` is the exact CLI result. Material UVs are included. Lightmap unwrapping was explicitly skipped with `--no-uv`. Optional native FBX/BSP checks were not requested or performed. The repository implementation was not changed, so unrelated unit/browser suites were not run.

All24 performed directed single-body movement checks passed: twelve authored paths in both directions, including four stairs, bridge, underpass, T gate/ward, CT deployment, repaired mid-to-B transfer, ambulatory and rear rotation. See `generated/greywatch/walk-r2b/report.json` and the reproducible `audits/walk.mjs`. The unchanged reviewer body is radius0.30 m, standing2.0 m, step0.25 m, with bounded1/120 s physical support/capsule checks. The first audit mistakenly aimed a straight steering segment through the T cart and stopped correctly; the retained passing path walks around it via y21.5. Geometry and checks were not weakened.

The final optical scan `generated/greywatch/visibility-r2c/report.json` completed803 admitted positions on a2 m grid,334,754 queries, configured standing/crouch optical eye offsets1.86/1.023 m. It included representative supported stair heights as well as the foot threshold. No material opacity omissions, dynamic faces or exhausted query budget. Fifteen body samples were rejected;1,275 unassigned scenic navigation triangles were excluded. Protected areas:0/1,924 visible spawn-offset pairs and0/5,032 visible wall-walk-to-T pairs. Explicit protected point pairs were also blocked. No configured portal samples remain unsupported. The longest sampled view is60.53 m; it and four partial-portal sector candidates remain documented playtest targets, not automatic failures or acceptance tests.

Actual browser helper captures in `generated/greywatch/stances-r2b/` verify standing2.0 m and crouching1.1 m at six named low-cover positions, with unchanged supported feet and eye93% of active body height. Twelve captures; no browser errors; source hash matched before and after. Extra independent structural measurements under `generated/greywatch/spatial-r2/` checked eight cover stance transitions and actual contact for all165 battlement caps.

## Captures and retained evidence

- Final main set: `generated/greywatch/capture-final/`,15 images and verified loaded-source/camera manifest; archived in `reviews/evidence/main/`.
- Focused visibility set: `generated/greywatch/capture-visibility-r2/`,16 images and verified source/camera manifest; archived in `reviews/evidence/visibility/`.
- Height-specific visibility set: `reviews/evidence/visibility-height/`,4 additional source-matched views. The original x47 bridge counterview touches cover and is a superseded diagnostic; use the supported x47.5 view in this set. Direct optical probes, cap contacts and independent stance measurements are retained as JSON under `reviews/evidence/`.
- Actual browser stance set: `reviews/evidence/stances/`,12 images plus actual published walk/camera state.
- Perspective study views use vertical FOV65° and frame aspect1.569685577, giving horizontal FOV90°. Initial `capture-r2` perspectives used wider diagnostic framing; reviewers explicitly distinguished them from the corrected final set. Orthographic overview uses illustrated appearance; inspection captures preserve authored material colors.
- Final capture viewport1280×1024, device scale1, reduced motion; canvas/camera state is in each manifest. No browser errors were recorded. Every set identifies the same final AML source.

## Repairs and independent gates

1. Initial spatial sketch judged promising before detailed layout.
2. Layout reviews repaired an upper-to-T spawn diagonal with `T-inner-screen`, closed the west stair slit, added the chapel ambulatory, and corrected the fifth CT role to rear flex.
3. First compiled model exposed the filled east-stair obstruction. Layout r5 and model r2 move the transfer north of the stair foot, add full west-foot support, close unreachable pier pockets and eliminate unusable cover-to-wall strips. Independent reviewers accepted the affected layout interfaces before the repaired model.
4. Independent structural/spatial, tactical and dedicated visibility blockout reviews inspect actual compiled geometry and evidence; see their separate stage verdicts. Apparent floating battlements were measured as attached cantilevered caps; no unsupported geometry repair was made.

## Scope and open evidence

This is an authored and reviewed geometry blockout. Static navigation sampling and bounded physical walking do not establish continuous reachability, target-game movement parity, five-player throughput or combat. Bomb/round implementation, gunplay, penetration, sound, grenade/smoke/flash behavior, boost/fall rules and human ten-player playtests remain for engine integration. CT deployment leads, long diagonals, corner holds and late low-utility retakes have explicit playtest hypotheses in the tactical review. No competitive-balance claim is made.
