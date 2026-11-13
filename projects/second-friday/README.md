# Second Friday

A **5v5 outdoor control map** set in an invented Amman flea-market district in Jordan. The revised design starts with eleven building masses; the spaces between them become the streets, market courts, alleys and tactical approaches. The 136 × 108 m district is about 3.1× the area of the superseded compact proposal. No playable building interiors.

![Second Friday blockout](reviews/evidence/R01-views/overview.png)

The main fight is Auction Square, with a cupboard bank dividing the scoring floor. Carpet Bend, Copper Street, Appliance Yard and Book Walk approach it from different directions. A tea-house roof has two external stairs and a strong view over the square. Longer streets behind the apartment blocks offer regrouping and rotations. Partial blue, rust and cream canopies, racks, low displays, shutters and rooftop tanks establish the secondhand-market theme.

## Open and inspect

```sh
npm run --silent levelspec -- preview projects/second-friday/level.aml --appearance materials
```

Enable **Show roofs** for the partial cloth canopies. Choose **Walk** for first-person inspection; WASD moves, Space jumps, Ctrl/C crouches, Esc exits. Roof stairs require no movement ability. The inspection walker is 3.4 m/s; proposed hero timing uses 5.5 m/s.

- [Editable native AML](level.aml)
- [Dimensioned layout](layout.svg), [building/cover footprints](layout-data.json), [design assumptions](design.md)
- [Proposed control and protection settings](gameplay.json)
- [Reference photographs and observations](references/README.md)
- [Actual camera views](reviews/evidence/R01-views/capture.json), [physical walks](reviews/evidence/R01-checks/walk-report.json)

The two marker kinds `attacker_spawn` and `defender_spawn` are transport compatibility labels for west/east teams. The mode is control, not defusal. Actual team identities are also recorded on markers. Scoring, wave respawns, side swaps, spawn protection, enemy exclusion and hero mechanics require engine integration; these are metadata/design assumptions here.

## Verified revision

R01 source SHA256: `b6a05fdb55dc7cec76617bf0bd0ebf18eef0fbec59035423839bc41db2195ed5`.

- Native CLI validation passes at default 0.0625 m and inspection 0.125 m navigation cells, with zero diagnostics.
- 30 required routes and 6 additional local walks pass the unchanged radius 0.35 m / height 1.8 m body, with 0.04 m requested motion and physical support/step/headroom checks. Both stairs work in both directions; the two ground toe bypasses and narrow building gaps are exercised separately.
- 31 retained camera captures show the actual compiled source, roofs enabled, with asserted camera/target/projection/FOV and zero browser errors. [Supplemental browser evidence](reviews/evidence/R01-browser/browser-report.json) records nine actual standing/crouch/follower positions and four continuous WASD stair walks, both flights in both directions, with zero browser errors.
- 4800 finite optical rays from sampled scoring-floor/front-and-rear roof positions to all ten spawn markers with 0.25 m offsets found no visible marker rays. This does not establish safety throughout the whole yard or gameplay spawn protection.
- Independent [spatial](reviews/05-blockout-spatial.md), [visibility](reviews/05-blockout-visibility.md) and [strategy](reviews/05-blockout-strategy.md) reviews record inspected scope and remaining limits. Earlier L-series studies are superseded.

Generated navigation contains intentional disconnected roofs and cover tops. They are not ordinarily reachable from the required routes. Four open-stair-side suggestions and two screen/parapet face-step suggestions remain documented, without suppressions. Physics, falling, flying heroes, large hero bodies, multiplayer collisions, bullets, utility and sound require the intended engine. This is a validated blockout, not a played or balanced hero-shooter implementation.

## Playtest priorities

East's shortest scoring entry is roughly 2–3 s earlier at the assumed movement speed, and its reinforcement travel is shorter. Both outdoor spawn yards have close positions from which an opponent can see both exits. The tea roof has broad point influence; ground low cover is exposed from it. Book Walk pressures the east flight, but the exact `(86,76)` position cannot see over the east bay's parapet corner. Point-to-west-roof counterfire is visible. Test these relationships with 5v5, role compositions, mobility heroes and wave respawns before tuning balance.

## Rebuild and evidence

```sh
npm run --silent levelspec -- validate projects/second-friday/level.aml --json
npm run --silent levelspec -- build projects/second-friday/level.aml --out generated/second-friday/new-build --formats glb --no-uv --json
npm run --silent game:export -- projects/second-friday/level.aml --out generated/second-friday/new-game
node projects/second-friday/verify-blockout.mjs
node projects/second-friday/capture-views.mjs generated/second-friday/new-views
node projects/second-friday/browser-checks.mjs generated/second-friday/new-browser-checks
```

The delivered native build is under `generated/second-friday/r01/`: GLB, OBJ, plan SVG, runtime JSON, source/report metadata and suggestions. The game handoff under `generated/second-friday/game-r01/` adds a separate collision GLB and Y-up marker/player metadata. Domain AML and gameplay.json use right-handed Z-up meters; exporters own the GLB conversion to Y-up. The color blockout does not require texture UVs. Both game GLBs pass glTF validation.

[Visual GLB](../../generated/second-friday/game-r01/second-friday.glb) · [Collision GLB](../../generated/second-friday/game-r01/second-friday.collision.glb) · [Engine marker metadata](../../generated/second-friday/game-r01/second-friday.game.json)

`level.aml` is editable source. `build-source.py` can regenerate it from the reviewed footprint data; `draw-layout.py` reproduces the building-first drawing. Project-scoped check/capture scripts use the repository's existing compiler and browser inspector. Generated outputs stay under ignored `generated/`; retained review evidence stays with this project.
