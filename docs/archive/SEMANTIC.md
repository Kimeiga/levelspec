> Historical frontend documentation. These JSON/Python design-plan APIs and commands
> were retired in AML phase 5. Use [native AML](../AML.md) and [maintained producers](../PRODUCERS.md).

# Native semantic authoring

`levelspec/semantic` provides `NativeSemanticPlan`, `parseSemanticPlan(text)`,
`createSemantic(plan): LevelDocument`, `produceSemantic(plan, options?)` and
`publishSemanticDocument(document, options?)`. Geometry creation is synchronous
and unvalidated. Publication snapshots its input, canonicalizes SVGX, compiles
and sealed-validates the canonical document, and checks physical land entrances.
It returns the native `document`, `text`, `level`, `report` and `physical` evidence.
`produceSemantic` additionally returns `placementDiagnostics` and `moveSpeed`.
Options are the native producer's `signal`, `resolveAsset`, `onProgress`,
`onReachableSample` and `sampleOrigin`; imported assets
are resolved during native publication. Every native hard water route is also
validated; the additional physical entrance assessment is explicitly land-only.

No semantic API requires Python, legacy syntax, the old compiler, or a conversion
adapter. Concept producers can construct this data directly:

```ts
import { produceSemantic, type NativeSemanticPlan } from 'levelspec/semantic';

const plan: NativeSemanticPlan = {
  format: 'levelspec-semantic/2', id: 'courtyard', name: 'Courtyard', grid: 1,
  layers: [{ id: 'ground', z: 0, height: 5, roof: false }],
  areas: [
    { id: 'west', label: 'West', rects: [[0, 0, 12, 16]], holes: [[3, 6, 3, 3]] },
    { id: 'east', label: 'East', rects: [[12, 0, 12, 16]] },
  ],
  portals: [
    { id: 'north', between: ['west', 'east'], kind: 'door', width: 3, at: [12, 4] },
    { id: 'south', between: ['west', 'east'], kind: 'door', width: 3, at: [12, 12] },
  ],
  markers: [{ id: 'spawn', area: 'west', kind: 'spawn' },
            { id: 'site', area: 'east', kind: 'site' }],
  routes: [{ id: 'approaches', from: 'spawn', to: 'site', minRoutes: 2 }],
};
const published = await produceSemantic(plan);
```

## Data and coordinates

- `grid` is metres per cell. `rects`, `holes`, `cells`, cover `rect` and flight
  endpoint `cell` use integer south-up cells. A rectangle is `[x,y,width,height]`.
  Area paint order is significant: later areas replace earlier cells, and each
  area's holes remove occupied cells. Optional canvas `width`/`height` clip paint.
- Layers have `id`, optional `label`, `z`, `height`, `roof`. Areas have `id`,
  optional `label`, `role`, `layer`, relative `z`, `height`, `roof`, plus rect unions
  or resolved `cells`. Area height overrides layer height; roof creates a ceiling
  at floor Z plus height. Defaults are layer Z 0, height 6, no roof.
- Floors use shared native edges, including decomposed concave floors and holes.
  Adjacent elevations in one layer receive retaining seams; separate layers do
  not weld merely because their XY footprints meet. Disconnected cell components
  receive stable `${sourceArea}/component_N` physical area IDs (collision suffixes
  when needed). Floor region IDs retain the source area name, and labels/roles
  survive. Markers resolve to their actual component; a disconnected logical area
  cannot create an invented route shortcut.
- `covers` contain `id`, optional `label`, `role`, `layer`, `rect`, `height` and
  relative-to-floor `z`. Direct cover geometry is exact: absent floor or unequal
  support heights fail. Covers are not removed to make navigation pass.
- `flights` contain `id`, optional `label`, `kind: 'stairs'|'ramp'`, `from` and `to`
  objects `{layer,cell}`, optional `width` and stair `rise`. End cells determine the
  cardinal run and landing heights; the footprint includes the endpoint cells.
  Width is a positive whole multiple of grid. Actual native sloped/stair surfaces
  replace their occupied floor/slab cells and connect the two landings. Native
  walking links are never substituted for missing geometry.
- `boundaries` contain `{between:[area,area],kind:'wall'|'open'}`. `portals` contain
  `id`, `between`, `kind: 'door'|'arch'|'window'`, required width in metres or
  `'full'`, optional world-XY `at`, and relative `head`/`sill`. Portals close the
  shared boundary except their real apertures. Direct portals are required and
  exact; an absent boundary or oversized aperture fails.
- Markers have `id`, `area`, `kind`, optional `team`, `label`, world-XY `position`,
  and `movement: 'land'|'water'|'none'`. Otherwise a deterministic clear interior
  cell is chosen. Routes preserve native `id`, `from`, `to`, `minRoutes`, optional
  `minDistance`, `maxDistance`, `movement`. `noSpawnLos` is marker-ID pairs.
- Root `player` accepts native body/ability fields. Defaults include radius .35,
  height 1.8, step .45, slope 42, crouch 1.1, vault 0. Root `wallThickness` defaults
  .32, `floorThickness` .25; `description`, `moveSpeed`, `expectFail` and `validation`
  survive. Expected failures and premap drafts cannot publish as playable output.
  Unknown input fields/directives and missing references fail explicitly.

## Python and source boundaries

Default `author` loads a Python declaration module using `tools/producers/semantic.py`.
The helper emits `levelspec-python/1` JSON data and cannot choose the artifact path.
TypeScript performs composition or four-neighbour seed annotation and builds the
native document. Publication writes canonical XML; retired plan writers and
`--legacy` output paths are not supported.

Python `AREAS` consistently use `rects` or `seeds`. The existing fields `RAMPS`,
`COVER`, `PORTALS`, `STAIRS`, `DIRECTIVES`, layer metadata and explicit player/gameplay
options are supported. Missing seeds report nearest occupied cells; disconnected
floor without a seed fails. Ties retain the first declared seed owner.

Historical Python cover rectangles are placement proposals: deterministic interior
filtering happens before validation, including proposals placing zero cells. Every
source ID gets proposed/placed/omitted counts. The interior search excludes declared
flight footprints, including flights in directives; exact semantic covers remain exact.
Historical Python portals are also
optional proposals. Source width is rounded/clamped to the available grid run;
annotation retains its disjoint-boundary skip and full-width rules. Impossible
proposals are diagnosed. A finite strict native candidate search may omit optional
portal closure and opening together. Explicit wall directives, direct native
portals, body limits, routes and LOS are never removed. CLI diagnostics print
initial placements even when publication fails, plus candidate omissions on success.
Both portal area IDs must resolve before proposal filtering; a typo is an error,
including when the proposal would otherwise have no shared boundary.
Structural IDs must be unique before optional placement or candidate omission.
Raw optional portal IDs remain reserved through directive expansion, even when
placement omitted the proposal. Retry eligibility also requires a successful
optional-placement record; a required directive cannot become optional by name.

`author --spec` accepts Python, semantic JSON, gameplay JSON or SVGX. `--traced`
accepts `levelspec-raster/1` JSON or native SVGX. There is no `.plan` reader.
Unsupported transformations fail explicitly; express floor holes as semantic area
holes and edit unsupported traversal/geometry directly in native XML.

## Native SVGX annotation and finalization

SVGX seed annotation requires explicit `GRID`; no lattice is guessed from geometry
or prose. Alternatively retain raster evidence using `trace_radar.py --format raster`.
Source floors must be horizontal, axis aligned and exactly grid aligned. Each
annotation source must contain its matching single layer. Native curves, existing
flights, water regions and authored traversal links should be finalized directly
or edited with native geometry instead of projecting them into seed cells.
Vertically overlapping floors in one source layer also require direct native
finalization; grid projection rejects ambiguous XY ownership before overwriting it.
New annotation ramps and stairs are supported. Only their declared footprints may
remove source floor cells; all remaining source floor properties are retained.
An authored marker, cover or barrier made ambiguous by a flight must be edited
explicitly in the native source.

Omitted area Z preserves its original floor elevation. Explicit area Z is relative
to an explicitly declared `LAYERS[].z`, or to the uniform source floor base if no
origin is declared. A nonuniform source needs an explicit origin for elevation
edits; omitted Z spanning multiple old heights requires splitting the annotation.
Source material, slab thickness and ceiling headroom boundaries partition the new
area into patches with one logical physical component. Reassignment across source
color bands is supported. Existing wall kinds, wall heights and relative aperture
head/sill follow their transformed floor. Marker and cover floor offsets, hard
requirements, player, flags, materials, lights, assets and references survive.
New markers without positions search against transformed retained covers before
publication. Explicit annotation positions and retained source positions stay exact.
Source seam barriers retain their kind, material and metadata. Matching uses the
original floor ownership on each side, including when a seam becomes several
pieces. Collapsed, overlapping or incompletely matched source seams fail explicitly.
Compatible retaining edge partitions split both sides together and retain their
wall/opening spans independently, including after floor elevation transforms.
Explicit annotation walls and portals must agree with retained authored barriers
and openings. Conflicts fail with native-edit guidance; raw open source boundaries
can receive new walls and portals. Open source seams may be replaced within the
exact footprint of a newly declared physical flight.

Ambiguous transformations fail: a cover spanning different floor shifts, elevation
changes with imported props, floor-anchored walls requiring old region IDs, and
repartitioning a retaining seam or wall across incompatible heights. Conflicting
source global settings or an attempted player/body override also fail explicitly.
No unsupported data is stripped to obtain a pass. Native document publication and
finalization preserve arbitrary supported geometry, props and water/boat routes;
they do not use this grid projection.

Default `finalize` accepts `.svgx` and raster/semantic JSON. Native SVGX
is authored geometry and is validated once, unchanged, without GRID. Provisional
raster/flat trace evidence may try the seven deterministic elevation profiles.
Every candidate passes unchanged native gates. `--src`, `--out`, substring filters,
and equals-form flags remain supported. Failed publication
preserves the existing artifact; filtering preserves unselected files.
