# Fusion

A complex **5v5, two-objective tactical blockout** inside an unfinished ITER-inspired
reactor facility. B05 expands the original map into four main elevations, with
raised A, sunken B, a lower reactor passage and a high assembly crown. The reactor
is playable architecture: its hollow toroidal vessel contains the main circular
hallway and a curved stair to the lower work arc.

Open the [native AML source](level.aml), [expanded plan](planning/layout-l04.svg),
[sections](planning/layout-l04-sections.svg), or [review record](reviews/README.md).
The [interface repair drawing](planning/b05-interface-repairs.svg) records the
small changes found during compiled walking and visibility checks.
The [reactor hall view](reviews/evidence/b05/overview/reactor-hall.png) shows the
central assembly. Source units are meters, right-handed Z-up.

```sh
npm run --silent levelspec -- preview projects/fusion/level.aml --nav-cell 0.125 --appearance full-render
```

Use **Walk from coordinates** with feet `0 -3.2 0` for the torus deck,
`-34 14 3.2` for A, `35 17 -3.2` for B, or `-14 -35 0` for the attacker start.
WASD/arrows move; Space jumps; Ctrl/C crouches; Esc leaves walking. Required routes
use the unchanged 1.8 m standing body, 0.35 m radius and 0.3 m step; none requires
jumping. Roof hiding is a review control and does not remove physical ceilings.

## Reactor fidelity

The vessel preserves ITER's published **19.4 m outer diameter, 11.4 m height, and
nine 40° sectors**. Its radial section is hollow and D-shaped, with a straighter
inner wall and curved outer lobe, rather than a circular tube. The intermediate
profile coordinates are inferred from ITER's cutaway, not manufacturing CAD.

Ten of eighteen 20°-spaced toroidal-field coil stations are installed. Their D-shaped
casings preserve the published 9 × 17 m envelope. The central solenoid is 4 m wide
and 13 m tall; a lower cryostat ring retains a 28 m internal diameter. Five vessel
sectors have full upper shells; four retain their lower shells below the work deck.
This assembly stage, the temporary walkways and the surrounding facility are
fictional. They do not reconstruct ITER's actual site or a dated as-built condition.

Primary references: [ITER vacuum vessel](https://www.iter.org/machine/vacuum-vessel),
[magnets](https://www.iter.org/machine/magnets),
[cryostat](https://www.iter.org/machine/cryostat), and
[assembly](https://www.iter.org/project/tokamak-assembly).
The [reference ledger](references/sources.json) and [image observations](planning/brief.md)
retain attribution and the correspondence boundary. Reference photographs are not
used as game textures.

## What the additional complexity does

| Space | Elevation | Decisions and costs |
| --- | --- | --- |
| Hot Cell A | +3.2 m | South, port-side, rear and cask-gallery approaches enter different sides of a freight mezzanine. A real floor opening, shielding and tooling interrupt support and clearing. The crown has another upper arrival. |
| Power Hall B | −3.2 m | Trench, lower work room and rear descent enter an installation basin. A ground-level service shelf roofs the plant, while the adjacent loading void allows selected upper/lower exchanges. |
| Main torus | 0 m | A circular work deck passes through enclosed northern vessel sectors and an unfinished southern arc. The core and coils break views. Side ports connect to the two wings. |
| Lower reactor arc | −3.2 m | A partial southern passage connects the west freight well to B's lower work room. Its raised radial bridges clear the poloidal magnets. The curved central stair enables a contested change of level midway. |
| Assembly crown | +6.4 m | A partial upper arc passes outside the coils through two equipment rooms. Reaching and leaving it takes multiple transfers; it is a deliberate advance commitment. |
| Wing returns | Mixed | Freight stairs, the cask gallery, rear circulation and an exposed east rim offer substitutions when a preferred route or support position is lost. |

The playable vertical span is **9.6 m**, with a separate −1.2 m bus trench between
ground and B. Sight screens, offset landings, varying headroom, overlapping stairs,
low fixtures and interrupted overlooks create local decisions. An alternative
path can avoid hostile territory without being shorter in distance. Smaller teams
cannot cover every connection; the strategy review explicitly considers 3v3 and
2v2 as well as the opening 5v5.

## Verification and limits

The final evidence is tied to the exact B05 source and collision-inspector hashes
in [reviews](reviews/README.md). It includes native compilation, directional walking
replays, actual supported observation poses, paired sight checks, independent
spatial/architectural reviews, and a comparison with the central stair removed.
The original B04 acceptance remains separately archived.

This map exposed a real inspector containment bug in closed rooms with touching
solid details. The scoped [repair review](reviews/physical-containment-implementation.md)
records the reproduction, correction and independent return. All **34 relevant
walking tests** and TypeScript checking pass, including Dust II and Daiban routes.
The source body, navigation abilities and geometry were not weakened to pass checks.

The native build succeeds with **70,006 triangles and 433 architectural objects**.
The GLB validator reports no errors or warnings. The map retains 167 navigation
island warnings, three wall-alignment warnings and one floor-edge warning; their
locations and review dispositions remain inspectable. No warning was suppressed.
The local construction helper reproduces the canonical AML byte for byte.

All **32 declared connections pass in both directions** through the physical walker.
All **115 directional legs used by 74 planned strategy journeys** also pass;
these journeys combine independently checked legs. For example, the freight-to-B lower
route measures 85.01 m versus 94.86 m through ground territory; the crown A-to-B
journey is longer at 147.49 m versus 108.67 m through the equator. These are walked
path lengths under the recorded waypoints, not combat timings. A's opening setup
is a close, spawn-dependent contest and remains an explicit playtest question.
The central stair returns from the lower junction to the south torus in 16.79 m;
the same endpoints take 80.22 m through the tested west detour when the stair is
removed. Adding it costs 2.28 m on the lower freight-to-B journey. This comparison
does not establish the globally shortest stair-absent alternative.

Sampled navigation and physical walks are not continuous collision proofs or human
combat playtests. Weapon penetration, utility, sound, target-game entities and the
round clock still need engine integration. Tactical balance and the value of
specific flank timings remain playtest questions. See the review record for retained
warnings and the exact scope of each measurement.

## Reproduce and edit

`level.aml` is canonical. `author.py` is a project-local native-AML construction
helper; running it overwrites that source. It reads the frozen B04 reactor and L04
construction data and requires Python with Shapely 2. Retain manual edits before
regenerating. `central-variant.py` writes a separate comparison under `generated/`.
Neither helper introduces another supported LevelSpec authoring format.

```sh
npm run --silent levelspec -- build projects/fusion/level.aml \
  --out generated/fusion/build-b05 --formats glb,gltf --nav-cell 0.125 --no-uv --json
node projects/fusion/verify-l04.mjs generated/fusion/new-walk-check
node projects/fusion/section-check-l04.mjs generated/fusion/new-section-check
node projects/fusion/strategy-check-l04.mjs generated/fusion/new-strategy-check
node projects/fusion/capture.mjs generated/fusion/new-captures projects/fusion/views-l04.json
```

Exports and heavy working files stay under ignored `generated/fusion/`. Source,
reference attribution, planning alternatives, reviewed failure evidence and final
review snapshots remain beside the project. No lightmap bake or target-game BSP
is claimed. The [research transfer](../../docs/research/fps-review-transfer.md)
records the findings applied to the level-making skills before authoring Fusion.
