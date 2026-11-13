# Dragon Ford

A Counter-Strike-style 5v5 bomb-defusal blockout inspired by the Kowloon Walled City. Invented place, informed by a real-image study; not a reconstruction. Revision **R02**, accepted as a native blockout by the independent strategy, spatial/visibility (both section passes) and architectural reviewers (see [Reviews](#reviews)).

Start with the [roofs-on city view](reviews/evidence/r02/captures/01-city-roofs.png), the [upper-grade cutaway](reviews/evidence/r02/captures/03-upper-grade-roofs-off.png), the [plan capture](reviews/evidence/r02/captures/04-top-roofs-off.png), the labeled plans ([storey 0](layout-r02/plan-0.png), [storey 1](layout-r02/plan-1.png)) and the editable [level.aml](level.aml).

## The place

- **One solid city block, carved.** Tunnel alleys, rooms and courts are cut out of a mass of abutting towers (27–41 m). The only large sky is the **Yamen void** in the middle.
- **Four interweaving grids.** Yamen and Free School at +5°, the west district and Lung Chun Road at −9°, the Kwong Ming factory district at −12°, the north frontage at −3°. Lung Chun Road runs on the west grid straight through the Yamen forecourt; wedge yards and rooms (Tooth shop, Slot yard, Rubbish yard, Back yard, East yard, Coffin lane) sit where the grids collide.
- **A stepped site.** The north street is one storey (3.4 m) above the south apron. The Yamen compound climbs it court by court (0 → 1.7 → 3.4 m): gate, front court, roofed hall on a podium with porches, inner court, rear terrace.
- **Attackers** spawn on the Sai Tau apron outside the south wall and enter by the South Gate tunnel or the south end of Kwong Ming Street. **Defenders** spawn on the Tung Tau shop frontage; the Youth Centre hall behind it is their hub.
- **Site A — Tin Hau lot** (upper grade): a hemmed temple court with a free-standing hall; plant on its porch. Reached by the Sai Shing stepped lane (two flights), through the Free School stair and gallery via the Slot yard, or from the Dentist shop.
- **Site B — Kwong Ming Foundry** (low grade, double height): attackers enter on the floor (foundry mouth, Fishball workshop door); defenders arrive on the mezzanine above and come down two stairs.
- **Mid — the Yamen.** The Free School gallery overlooks it through two windows; the defenders' short A↔B rotation crosses its rear terrace in the open (87 m), the hidden one runs through the hub (113 m).

## Files

| File | Purpose |
| --- | --- |
| `layout.py` | The single design source: spaces, apertures, stairs, cover, anchors, journeys, view predictions, on the four district frames. |
| `pipeline.py` | Carved-mass geometry, layout checks, SVG plans/sections, native AML emission. |
| `author.py` | Writes `level.aml` and `source-map.json` from the layout. |
| `level.aml` | Editable native source (generated; regenerate rather than hand-edit if the layout changes). |
| `verify.mjs`, `sightlines.mjs`, `capture.mjs`, `views.py` | Walk replay and view rays, all-pairs long-line scan, reviewer captures. |
| `finalize.sh` | One command to rebuild every artifact and the evidence folder for a revision. |
| `layout-r02/` | Plans, sections and `layout-data.json` matching R02. Earlier stages: `planning/` (S01–S03), `layout-l01/`, `layout-r01/`. |
| `references/` | Real-image study and image manifest. Four images are all-rights-reserved research copies: keep them out of commits and published output. |
| `reviews/` | Independent reports, author dispositions, and revision-matched evidence. |

```sh
uv run --with shapely python projects/dragon-ford/author.py          # layout → level.aml
npm run --silent levelspec -- validate projects/dragon-ford/level.aml --json
npm run --silent levelspec -- preview projects/dragon-ford/level.aml
sh projects/dragon-ford/finalize.sh r02                              # build, walks, rays, captures, evidence
```

## Kowloon street kit build

`kowloon/level.aml` is a presentation build of the same layout through the procedural `kowloon-street@1` dressing kit (see `docs/DRESSING.md`). It is generated, not reviewed, and the blockout `level.aml` stays the accepted source.

```sh
uv run --with shapely python projects/dragon-ford/author.py --theme   # layout → kowloon/level.aml
npm run --silent levelspec -- preview projects/dragon-ford/kowloon/level.aml --nav-cell 0.125
```

- **Playable storeys (0–6.8 m):** identical carved geometry. Every carved face carries a 2 cm non-colliding lining wall that receives the kit's plain-wall treatment; walking slabs and stairs receive the floor treatment.
- **Above 6.8 m:** the blockout towers are replaced by generated tenement rows on rectangles cut from each tower lot on its own district grid. Lots with no frontage onto sky or the outer streets, and the non-rectangular wedges between grids, stay plain mass.
- **Limits that shaped it:** the kit takes 128 receiving hosts and the compiler fails above roughly 1.5 million triangles, so linings are long polylines, detail is `low`, patched ground is off, and tenements are 3–4 storeys above the playable ones instead of 6–10. The outer face of the block below 6.8 m is not dressed.
- Kit textures are copied from `projects/dressing-demo/textures/`.

## Evidence at R02

- `validate` succeeds as `playable` and `build` publishes GLB, OBJ and runtime JSON. Warnings only: open stair sides, navigation islands on cover and roof tops, and one "architecture review incomplete" notice from the compiler's bounded roof/wall pass.
- 106 inspection-walker replays pass (17 declared journeys and three lines on each of 12 stairs, both directions); 29 declared view predictions agree with optical rays. See `reviews/evidence/r02/verification.json`.
- Measured walks (m): T→A 85–89, T→B 85–89, T→rear terrace 74; CT→A 69–77, CT→B floor 76, CT→terrace 42.
- All-pairs standing-eye scan: lines over 35 m are confined to each spawn street, the intended gallery-window ↔ terrace relation (37–39 m), the arcade onto the front court (38 m) and thin door-to-door threads. See `reviews/evidence/r02/sightlines.txt`.

These are bounded checks: sampled navigation with physical substeps, optical rays and camera captures. They do not establish continuous reachability, weapon, utility or audio behaviour, or balance.

## Reviews

Process followed `fps-map-workflow`: reference study → three independent proposal reports on the first sketch → redraw on interweaving grids (user direction) → spatial-interest review (rework, then promising) → three layout reviews (all changes required) → compiled blockout reviews with the two section reviewers swapped.

| Scope | R01 | R02 return |
| --- | --- | --- |
| Strategy / player behaviour | [accepted](reviews/r01-strategy.md) | **accepted** (return section in the same file) |
| Spatial / visibility — centre | [changes required](reviews/r01-spatial-centre.md) | **accepted** (return section in the same file) |
| Spatial / visibility — sites and hub | [changes required](reviews/r01-spatial-sites.md) | **accepted** (return section in the same file) |
| Architecture | [changes required](reviews/r01-architecture.md) | **accepted** (return section in the same file) |

Author dispositions: [S01](reviews/s01-disposition.md), [L01](reviews/l01-disposition.md), [R01](reviews/r01-disposition.md).

## Open items

- Playtest additions from the R02 strategy return review: B post-plant with the bomb under the mezzanine tongue and a holder under the north mezzanine; whether the blind corridor behind the boiler becomes a utility trap; the close fight round the East lane pier; five-player throughput at the 1.9 m Kwong Ming gap; how much information defenders take from the terrace and west-lane-top views into the front court.
- Recorded long views into the Yamen front court: from the gallery / west lane top (to 40 m) and from the rear terrace through the hall's rear doors (to 33 m), standing only.
- Capture `08` shows a light wedge outside site B's east wall that neither section reviewer could identify; rays meet the wall at its drawn face, so it is not an opening into the site.
- Data notes: the layout's drop check does not test stair flanks; three half-level spaces declare a 4.8 m ceiling but compile open to the storey above; the Tin Hau door panel stands 0.2 m proud of the wall.

- Playtest queue (target engine): gallery contest across spawns; East lane before B; whether the hall and inner court get used; a second defender door into A; B retake from above; all utility, audio and penetration behaviour.
- Deferred to an art pass: pipe and cable ceilings in the tunnels, shopfront recesses on the frontage, the closed rear hall's front, roof clutter, sliver tower lots.
- No playable roof level. It was removed after the first proposal round (both earlier Kowloon maps in this repository used one, and reviewers found the sketched roof a defender-owned loop).
- The shared reviewer and compiler were being edited by another session during this work; captures use the reviewer's `materials` appearance and one rebuild had to wait for the compiler to load.
