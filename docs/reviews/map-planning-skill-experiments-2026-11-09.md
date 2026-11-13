# Map-planning skill experiments — 2026-11-09

Status: both experiments complete. All three proposals passed their final independent
spatial-interest reviews after revision. The procedural helper remains optional.

## Scope

The user asked for substantial planning instead of a rushed first sketch, real-image
study before choosing a themed layout, expressive spatial shapes, and review of how
architectural elements interact. A second, separate experiment tests random nodes,
connections and spatial shapes as a starting seed. These are phase-1 design trials,
not compiled maps, mechanical tests or playtests.

This is a qualitative forward-test, not a controlled A/B study. There was no rerun
of the old quick-sketch workflow, and the sample is too small to establish a general
success rate. Independent reviewers inspected drawings before author rationale.
The final drawings below are retained as evidence, not templates for future maps.

## First experiment: planning and guidance

The workflow now establishes a theme, inspects varied real reference images,
explores materially different architectural organizations, and plans substantial
journeys before producing the first reviewable spatial proposal. The first drawing
remains provisional; it no longer has to be quick. Precise combat detailing and
compiled proof retain their later owners.

The architectural guidance favors purposeful expressive shapes and relationships
beyond a repeated box-and-hall composition, while permitting modest invention beyond
literal realism. The initial review asks whether spaces genuinely interact and
whether the theme survives removal of labels. It preserves legitimate room-heavy,
corridor-heavy, flat, stacked and outdoor compositions.

| Trial | Evidence and organization | Independent result |
| --- | --- | --- |
| Train station, Santa Bruma | Seven inspected photographs across platforms, headhouse/concourse, coastal interchange and goods interfaces. Lower quay/parcel journeys meet an upper diagonal rail deck through a tall booking hall/gallery; a luggage subway crosses below rail. | R01 promising; R02 improves goods circulation and court-facing glazing; R03 resolves the final platform/scenic-boundary ambiguity. Final verdict: promising, no further phase-1 revisions requested. |
| Mostly flat outdoor fish market, Saltturn | Five initial photographs plus one targeted service-front revisit. Streets, courts and sheltered ground-level margins emerge between building masses; no playable upper floors are required. | P01 promising, with an underdeveloped lower yard sequence. P02 changes building wings to form distinct courts, a dispatch throat and an auction threshold. Return verdict: promising, both findings addressed. |

The reviews found a useful recurring distinction: additional labels did not establish
additional spatial substance. Refinement changed drawn boundaries, working circulation
and building masses rather than merely adding names or isolated cover props.
Following the station trial, the workflow also explicitly asks authors to draw the
interfaces defining important interactions and separate playable limits from scenery.

### Retained final drawings and reviews

- Station: [lower plan](../../reference/map-planning-experiments/2026-11-09/station/01-lower-level.svg),
  [upper plan](../../reference/map-planning-experiments/2026-11-09/station/02-upper-level.svg),
  [sections](../../reference/map-planning-experiments/2026-11-09/station/03-sections.svg),
  [organization studies](../../reference/map-planning-experiments/2026-11-09/station/04-organization-studies.svg),
  [image observations and source URLs](../../reference/map-planning-experiments/2026-11-09/station/reference-observations.md),
  [final independent review](../../reference/map-planning-experiments/2026-11-09/station/interest-review-r03.md).
- Outdoor market: [ground plan](../../reference/map-planning-experiments/2026-11-09/outdoor/01-ground-plan.svg),
  [circulation](../../reference/map-planning-experiments/2026-11-09/outdoor/02-circulation-levels.svg),
  [sections](../../reference/map-planning-experiments/2026-11-09/outdoor/03-sections.svg),
  [image observations and source URLs](../../reference/map-planning-experiments/2026-11-09/outdoor/reference-observations.md),
  [final independent review](../../reference/map-planning-experiments/2026-11-09/outdoor/interest-review-p02.md).

Full disposable trial packets remain under `generated/skill-planning-trials/`:
`directive-station/` and `directive-outdoor/` retain earlier revisions, PNG captures,
image-source observations, author notes and review responses. `skills-v1/` and
`skills-v2/` retain the planning instructions and hashes. The station's frozen
drawings preserve the status printed before their subsequent review; the independent
review file records the final verdict. No image count, alternative count, site extent
or feature arrangement from these trials becomes a skill requirement.

## Second experiment: procedural seed

Built a dependency-free, seeded [Python helper](../../.agents/skills/fps-map-workflow/scripts/random_spaces.py).
It samples spread-out candidate spaces, varied polygons and passage ribbons, a
connected declared graph and additional loops. It emits raw SVG and JSON experiment
metadata, with unresolved overlaps, nonincident crossings and room intrusions.
These diagnostics are partial two-dimensional checks, not physical topology proof;
the JSON is not an alternate LevelSpec authoring format.

Four candidates were generated and visually inspected:

| Seed | Candidate inputs | Result of initial inspection |
| --- | --- | --- |
| 731 | 18 nodes, 25 links, 128 × 100 provisional bounds | Asymmetric upper clusters and lower return arc; selected as a prompt. Four room overlaps and several unrelated intrusions still required redesign. |
| 1987 | 13 nodes, 14 links, 150 × 76 bounds | Sparse, elongated organization; set aside. Fewer crossings did not establish sufficient spatial development. |
| 42 | 22 nodes, 37 links, 98 × 124 bounds | Dense, tangled interfaces; set aside. More connections and irregular shapes did not establish architecture. |
| 9041 | 16 nodes, 21 links, 120 × 108 bounds | Large perimeter loop with unlike lobes; set aside in favor of 731's particular prompts. |

Counts and bounds describe these experiments, not design budgets. Each raw candidate
and rejected seed remains in `generated/skill-planning-trials/random-seed/raw/`;
durable copies include [731](../../reference/map-planning-experiments/2026-11-09/seeded-station/raw/seed-731/raw.svg),
[1987](../../reference/map-planning-experiments/2026-11-09/seeded-station/raw/seed-1987/raw.svg),
[42](../../reference/map-planning-experiments/2026-11-09/seeded-station/raw/seed-42/raw.svg)
and [9041](../../reference/map-planning-experiments/2026-11-09/seeded-station/raw/seed-9041/raw.svg),
with their seed metadata alongside.
For example, the reusable helper can reproduce the selected spatial seed with:

```sh
python3 .agents/skills/fps-map-workflow/scripts/random_spaces.py \
  --seed 731 --nodes 18 --width 128 --height 100 --connectivity .45 \
  --out generated/my-spatial-seed
```

A fresh author used the same station brief and neutral real-photo evidence without
seeing either directive trial's designs or reviews. Five photographs were directly
inspected. Bracken Quay reorganized the seed into a civic headhouse, shared railway
shed, freight building and lower quay/subway circuit. Overlapping groups were merged,
detached leaves and redundant links removed, and the rail organization, heights,
enclosure, transfers and functional interfaces deliberately invented.
Its [source observations](../../reference/map-planning-experiments/2026-11-09/seeded-station/source-observations.md)
and [initial independent review](../../reference/map-planning-experiments/2026-11-09/seeded-station/interest-review-r01.md)
are retained.

The authored revision is visible in its
[station plan](../../reference/map-planning-experiments/2026-11-09/seeded-station/station-level.svg),
[lower plan](../../reference/map-planning-experiments/2026-11-09/seeded-station/lower-level.svg),
[headhouse plan/sections](../../reference/map-planning-experiments/2026-11-09/seeded-station/headhouse-study.svg),
[quay arrival](../../reference/map-planning-experiments/2026-11-09/seeded-station/quay-arrival-study.svg)
and [aligned transfers](../../reference/map-planning-experiments/2026-11-09/seeded-station/transfer-mouths.svg).
The [R01 station plan](../../reference/map-planning-experiments/2026-11-09/seeded-station/r01/station-level.svg)
is retained for comparison.

The drawing-first independent verdict was **promising**, with three development
points: clarify the passenger headhouse's actual shared volumes and thresholds,
develop the eastern quay arrival, and clarify the platform-head/transfer mouths.
The first point caught a residue of the room-polygon approach even after considerable
authoring. The spatial guide now explicitly says a generated node or passage outline
need not become its own enclosed room/hall. R02 replaced the passenger-room seams
with a continuous concourse and broad structural openings, developed an under-rail
arcade arrival, and made the terminal apron and transfer landings explicit. The
[return review](../../reference/map-planning-experiments/2026-11-09/seeded-station/interest-review-r02.md)
kept the **promising** verdict and found all three points resolved at phase-1 scope.
No consequential spatial-interest revision remains requested.

The seed visibly supplied positional prompts, asymmetry and a return arc. The strong
station relationships required substantial authored transformation. This trial does
not establish a quality, originality or speed advantage from random generation.
Keep it available as an optional experimental exploration tool; theme/reference
planning and architectural judgment remain central, with freedom to discard the seed.

The reusable helper is version `random-spaces-2`. Its presentation was repaired after
an actual 50 × 50 diagnostic showed clipped header/footer text. All four retained
seeds reproduce the prototype's spatial data and diagnostics unchanged, excluding
the generator version. Four focused CLI checks cover reproducibility, declared-graph
connectivity/valid links, bounded finite geometry/variation and invalid-argument
rejection. The small-sheet repair was also rendered and visually inspected. Raw
prototype baselines remain frozen as version 1.

## Result

Retain the researched, substantial planning stage and drawing-first independent
interest review. They supported contrasting coherent proposals and caught thin
journeys, merely named interactions and residual polygon-room composition before
production geometry. Keep the random helper optional: it can prompt alternatives,
but its output needs the same architectural invention and review, with no obligation
to preserve its graph, shapes, counts or extent. Neither method's example maps should
become templates in the skills.

## Limits and next stage

Promising means worth developing as an initial spatial proposal. Target movement,
body/camera, weapons, utility, sightlines, timing, plant areas, full construction and
player behavior still require the later workflow stages. Neither an independent
interest verdict nor a valid SVG proves reachability, balance or fun.

## Validation

All ten repository skills pass the skill validator. The helper's four focused CLI
checks pass; its narrow-sheet output was visually rechecked after repair. Retained
SVG evidence parses, file hashes match and local documentation links resolve.
No application runtime code changed, and no map compilation or gameplay testing was
performed for these planning experiments.
