# Final verification — L06 / R06

Source SHA-256 `5a8bfef6a3f287167f0fef62359f8b46dfe94e72a5c9ad212238f6f6614718cd`. Node 24.12.0, existing LevelSpec native compiler and unchanged player/harness. Final build and all retained capture/walk/visibility identities match this source.

- Strict playable build at 0.125 m nav cell, floor gaps as errors: success, zero diagnostics, all 13 required routes pass and zero uncovered floor samples. All authored playable spaces are in one navigation component. Route assertions retained; real 37 portal connections plus internal Optics landing seam declared.
- Collision-aware route replay: 26/26, all 13 routes in both directions, with 0.035 m bounded movement steps over existing eroded navigation and actual support.
- Local doorway transition replay: 74/74, all 37 thresholds in both directions. Starts on stairs use physical tread support; earlier linear-height placement failures were driver errors, superseded by exact supported starts. No capsule dimensions or tolerances changed.
- Actual WalkMotion stance checks: 4/4 at A-L1, B-L3, SK-L1 and SN-L1, standing 2 m→crouch 1.1 m→standing 2 m, actual eye positions retained. Standing rays clear and crouching rays blocked only for the sampled opposing directions; sides/upper views may expose occupants.
- Optical scan: complete, 657 admitted samples on 3 m XY grid with both 1.86/1.023 m eye offsets, 295474 queries. Protected Mid-to-T pocket 0/3128 visible eye pairs; opposing-spawn areas 0/1020. No unknown materials/dynamic faces/budget exhaustion.318 unassigned prop/roof navigation triangles excluded and 1 body sample rejected. This is sampled static opacity evidence, not continuous visibility proof.
- Six physical flight-side probes: guards block outward requests from each flight, centerline remains clear.
- Actual browser captures retained below `evidence/r06/`: overview/paired encounters, exact former leak both directions, Intake passing lanes, CT-Control, Cleanroom-Data, Snow-Bairlock, and clean overview. Source provenance, camera/canvas state and zero browser errors are retained in each capture manifest.
- Independent spatial/construction, tactical and dedicated visibility blockout reviews accepted R06 after the Intake repair. See 03-blockout-spatial.md, 03-blockout-tactical.md and 03-blockout-visibility.md.

## Advisory disposition

40 nonblocking suggestions retained for inspection: 34 unassigned navigation islands are equipment/bench/telescope tops, without declared gameplay routes; 6 flight open-side suggestions are contradicted by explicit native enclosures, actual compiled views and 6 physical guard probes. No suppression, extra seed, off-mesh link, player reduction or weakened route assertion was used.

## Scope and open tests

The 69.26 m Transit-to-Boot-exit rifle channel, bounded Optics hold and late CT spawn exposure after territory loss are deliberate hypotheses. Full A-to-B path is about 89.3 m (26.3 s at 3.4 m/s before clearing); actual rotate+clear+defuse timing needs target-engine tests. No human multiplayer playtest or target-engine combat integration was performed. Bounded collision sampling is not continuous sweeping or crowd simulation. Capture fov 90 is a reviewer perspective-camera parameter, distinct from the scanner's 90 h/65 v warning spans.

Exports are GLB, OBJ, runtime JSON, vector plan and reports under `generated/apogee/build-r06/`. Built with `--no-uv`: authored colors are present; no UV/lightmap atlas was generated. FBX/BSP/native gameplay packaging was not part of this build.
