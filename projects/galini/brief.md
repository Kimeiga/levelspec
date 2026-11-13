# Galini

User brief: make a CT versus T 5v5 defusal map in the LevelSpec harness. Theme: a very calm Greek coastal city in cliffy terrain.

Original setting; no reconstruction. Two bombsites: A Chapel Court at +4m and B Boat Court at 0m. T at Ferry Square, CT at the upper town. Units meters, right-handed Z-up, north +Y. Source and review evidence live here; compiled outputs in generated/galini.

The harness supplies geometry, collision, navigation and first-person inspection, not multiplayer combat. Intended rules: 5v5, one life per round, two plant sites, rifles and utility, CS-style economy; provisional 115s round / 40s planted clock / 3.2s plant / 5s kit or 10s no-kit defuse. These are design assumptions, not implemented mode logic. Run-speed timing estimates use 5m/s; harness walking is 3.4m/s standing and 1.7m/s crouched. Use authored radius .3m, standing height 1.8m, crouch 1.1m, step .3m, slope 42 degrees; harness eyes are .93 times active body height. No jump/boost-only route is required. Ballistics, utility trajectories, audio, networking, target-engine integration and balance need engine playtests.

User steering after first sketch: too grid-like / SimCity; coastal city should have more bendy paths, stairs and plazas. L03 supersedes L02: actual curved roads, diagonal ascents, a two-flight cliff switchback, irregular piazzas and a bent upper-town lane.

Latest steering: map feels too small in playable depth despite broad raw footprint; connections too simple. L04 expands extent30% and introduces actual local district loops, interior passages, secondary courts and usable site interiors. Earlier layout/blockout reviews are superseded; repeat gates on L04.
