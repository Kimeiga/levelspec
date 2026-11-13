# Dragon Ford L01 — developed layout review packet (raw)

Stage: **developed layout**, before production modeling. Everything below is the author's drawing and data; treat predictions as hypotheses.

## Inspect first
- `plan-0.png` storey 0 (z 0–3.4) and `plan-1.png` storey 1 (z 3.4–6.8). Meters, +Y north, grid 10 m. Dark = solid city mass at that storey (opaque, full storey height); hatched = open air above a lower floor. Half-levels at z 1.7.
- Sections: `section-NS.png` (Yamen axis), `section-EW.png` (rear terrace), `section-LC.png` (along Lung Chun Road), `section-SS.png` (Sai Shing flights), `section-KM.png` (Kwong Ming → foundry → NE lane). Red outline = 2.0 m standing body.
- `layout-data.json`: every space polygon (id, kind, z, sky), apertures (doors have a lintel at `head`; windows have `sill`/`head` and admit no passage; portals are full height), stairs (a→b, z0→z1, width, risers), guards (1.05 m), covers (id, polygon, z, height, role — brown ≤1.3 m low, dark tall), anchors (T, CT, A, B), plant zones in `notes`, declared `journeys` (waypoints, length) and `views` (predictions with `expect`).
- Adjoining spaces at the same elevation whose polygons touch or overlap are open to each other across the whole shared edge (no aperture needed). Anything not drawn is solid.
- Four district grids: Yamen/School +5°, West/Lung Chun −9°, East/Kwong Ming −12°, North −3°. Tower plots above z 10.2 are inaccessible context.

## Mechanics
See `../brief.md`: body radius 0.25 m, standing 2.0 m (eye 1.86), crouch 1.1 m (eye 1.023), step 0.25 m; no jump/boost/ladder/drop required. Guards are 1.05 m solid parapets (standing eye sees over, crouch does not). CS-style 5v5 defuse assumptions are for discussion only.

## Preliminary compiled evidence (draft compile of this layout; not the production blockout)
- `tech/level-l01-draft.aml`: AML emitted mechanically from the layout data. It validates as `playable` with no errors (warnings: open stair sides, navigation islands on cover/roof tops).
- `tech/verification.json`: inspection-walker replay of all 15 journeys and 3 lines per stair in both directions (all pass at this revision) and optical eye-to-eye rays for the 22 declared views (`postures`, `agrees`). Walk distances (m): T→A via School 83, via Sai Shing 89; T→B via Kwong 86, via Fishball 86; T→rear terrace 74; CT→rear terrace 38; CT→A plant via hub 76 (north mouth reached at about 50), via NW lane 72; CT→B floor via hub/Coffin lane 72 (mezzanine reached at about 55), via NE lane 92; A→B defender rotation over the terrace 85. Inspection speed 3.4 m/s; CS speeds differ.
- You may run your own studies. `node projects/dragon-ford/verify.mjs <layout-data.json> <level.aml> <new-dir>` replays a data file; for custom rays write a small Node script under `generated/dragon-ford/<your-name>/` using `compile`/`parseAml` from `src/architecture/index.ts` and `VisibilityGeometry` from `tools/fps/visibility-geometry.ts` (see verify.mjs for usage: `optical.visible(eyeA, eyeB)`). Do not edit files under `projects/dragon-ford/` other than your own report.

## Known open items (not defended here)
- Fishball roof perch + catwalk (z 3.4) is an experiment awaiting a strategy opinion.
- No playable roof level in this revision.
- Hall, cella and screens are blockout masses; finishes are provisional.
