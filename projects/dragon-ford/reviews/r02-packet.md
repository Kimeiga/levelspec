# Dragon Ford R02 — compiled blockout review packet (raw)

Source identity: `projects/dragon-ford/level.aml`, sha256 in `reviews/evidence/r02/source.sha256`. Generated from `layout.py` (frozen copy `layout-r02/layout_r02.py`) by `pipeline.py`/`author.py`. `npm run --silent levelspec -- validate projects/dragon-ford/level.aml --json` succeeds as `playable` (warnings only: open stair sides, navigation islands on cover/roof tops, roof steps); `build` publishes GLB/OBJ/runtime JSON.

## Artifacts
- Layout matching this revision: `layout-r02/plan-0.png`, `plan-1.png`, `section-*.png`, `layout-data.json` (spaces, apertures, stairs, guards, covers with heights and roles, anchors incl. five spawns per team, plant zones, journeys, view predictions). Conventions as in `layout-l01/review-packet.md`. Mass parapets (1.05 m) are listed as `window` apertures with `sill` 1.05 and no head.
- Compiled views `reviews/evidence/r02/captures/`: `01`–`08` overviews (roofs on = towers; roofs off = top storey and towers hidden) and `e01`–`e32` eye-level views at the inspection eye (1.86 m standing, 1.023 m for `…c-…crouch`), listed with positions in `capture.json`.
- `reviews/evidence/r02/verification.json`: inspection-walker replay of 17 journeys and three lines on each of 12 stairs, both directions (106 walks, all pass) and optical rays for 29 declared views (all agree with predictions).
- `reviews/evidence/r02/sightlines.txt/.json`: all-pairs standing-eye scan, 1 m grid, pairs ≥ 32 m.
- Measured walks (m, inspection walker): T→A via School 85, via Sai Shing 89; T→B via Kwong 88, via Fishball 86; T→rear terrace 74; CT→terrace 42; CT→A via hub 77, outer 73, via mid 69; CT→B floor via hub 76, outer 93; defender rotation over the terrace 87; attacker pivot A east door→B Fishball door 91.
- Tools you may run (write only under `generated/dragon-ford/<your-name>/`): `node projects/dragon-ford/verify.mjs`, `node projects/dragon-ford/sightlines.mjs`, `node projects/dragon-ford/capture.mjs <aml> <new-dir> <views.json>`; custom rays as in `verify.mjs`. If plain `node` fails on TypeScript imports, another session is editing `src/`; try `node --experimental-transform-types`.

## Limits
Sampled navigation with bounded physical substeps, optical mesh rays and camera captures. No weapons, utility, audio, multiplayer body blocking or play evidence. The reviewer UI is being changed by another session, so captures use its `materials` appearance.
