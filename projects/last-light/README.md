# Last Light Galleria

An original **5v5 hero-shooter Control blockout** set in a dead mall. Teams enter from abandoned department stores and contest the dry fountain court beneath a missing skylight. Shuttered shops, faded teal/pink trim, a stopped clock, dead planting and an opaque lift shaft establish the setting.

![Last Light Galleria blockout](preview.png)

The 72×64m layout has two diagonal home loops, four ground approaches to the court, and two local +3m lofts. Both lofts have six-meter stairs and usable ground passages underneath. The lift divides support views around the objective. Broken fountain rims and staging counters provide low cover with height-dependent exposure. All essential routes work without hero movement abilities.

## Open and edit

`level.aml` is the editable native source. Start the read-only reviewer from the repository root:

```sh
npm run --silent levelspec -- preview projects/last-light/level.aml --nav-cell .125 --appearance flat --camera "108 -76 104" --target "40 36 1" --view-height 86
```

Choose **Walk inside** or **Walk from coordinates**. WASD/arrows move, Space jumps, Ctrl/C crouches and Esc leaves walking. Useful starts: `7 7 0` (A spawn), `73 65 0` (B spawn), `36 36 0` (court), `13 21 0` (west stair), `67 51 0` (east stair), `25 38 3` / `55 34 3` (lofts).

The current local preview is on port 49321 while its process remains running. The CLI prints a fresh loopback URL when restarted.

## Build and inspect

```sh
npm run --silent levelspec -- build projects/last-light/level.aml --out generated/last-light/new-run --nav-cell .125 --formats glb,gltf --json
node projects/last-light/inspect.mjs generated/last-light/new-physical-run
node projects/last-light/capture.mjs generated/last-light/new-capture-run
node tools/vector-visibility.ts projects/last-light/level.aml projects/last-light/audits/visibility.json generated/last-light/new-visibility-run
```

R06 exports are in `generated/last-light/r06/`: GLB, glTF/bin, OBJ, runtime JSON, plan SVG, UV atlas and validation reports. Runtime JSON is an output. `layout.svg` / `layout-data.json` describe reviewed L03 dimensions; `brief.md` defines the provisional mechanics and `design.md` records tactical hypotheses. `layout.py` regenerates the drawing/data. `build-source.py` overwrites `level.aml` from that packet; preserve direct AML edits before rerunning it.

## Verified revision and limits

R06 source SHA256: `efbd743e587066ec818152217563be275b6b70d248dcbb1f5ec58ce07322b692`.

- Build passes with zero diagnostics; all 11 declared routes are reachable.
- Nine bounded collision/support motion paths pass with the unchanged .4m-radius,2m standing body. Both stairs are followed up and down, both ground mouths pass under the lofts, and the point can be circled around the lift.
- Browser evidence includes 22 opposing/overview views, both stair ascents/returns, both under-loft passages and actual crouch/stand states, with no browser exceptions.
- The complete static visibility scan runs 296 supported samples / 63858 queries at 3m grid spacing and two eye heights. All five full spawn-area scopes and 30 explicit authored-spawn pairs have zero tested visible pairs after the kiosk repair. This is sampled evidence; it can miss narrower views.
- Ten unassigned prop-top navigation islands are optional mobile-hero occupation questions. Two wall-alignment suggestions describe the intentional 2cm change between .20m stair parapets and .24m landing guards. Required ground/loft routes pass; suggestions were retained, not suppressed.

The provisional mode uses one ground-only circular zone centered(40,36,0), radius7m, with lofts excluded. Accessible objective marker(36,36,0) is a navigation anchor beside the solid lift. Capture/scoring, respawns, team spawn barriers, weapons, healing, utility, hero abilities and multiplayer combat are not implemented by LevelSpec. Full-body crouch concealment is not promised by the 1.1m rims/guards. Late stair exposure and long oblique ranges remain intentional playtest questions. Larger tanks, flying heroes and balance need destination-engine testing with ten players.

Independent spatial/construction, strategy/player-behavior and section visibility reviews live in `reviews/`. Revision-matched source, actual camera/walk state, images, physical results, scan configuration and reports are retained under `reviews/evidence/r06/`. Rejected R05 spawn evidence is preserved alongside its repair probes. Real-image inspiration and credits are recorded in `references/study.md`; geometry is invented.
