# Native gameplay authoring

`levelspec/gameplay` turns named spaces and physical connections into editable
LevelSpec 2 geometry. It selects no generator archetype and imports no legacy
compiler, generator, adapter or compatibility producer. The pinned source format
is `levelspec-gameplay/2`; its [JSON schema](../src/gameplay/gameplay.schema.json)
describes the data shape. Parsing also checks geometry, global ID uniqueness,
references, port fit and elevation transitions.

```ts
import {parseGameplayPlan,createGameplay,produceGameplay} from 'levelspec/gameplay';
import type {GameplayPlan,ProducerOptions} from 'levelspec/gameplay';

const plan:GameplayPlan=parseGameplayPlan(sourceText);
const proposal=createGameplay(plan); // Editable LevelDocument; not validated as playable.
const published=await produceGameplay(plan,{signal:controller.signal});
// published: {document,text,level,report,assessment}
// text is canonical SVGX; report has passed strict sealed native validation.
```

`ProducerOptions` is the native producer's existing type: `signal`, `resolveAsset`,
`onProgress`, `onReachableSample` and `sampleOrigin` are forwarded. This schema
does not declare imported assets, so a resolver is normally unused. Publication
first calls the unchanged `produceDocument`, then checks conservative physical
route capacities. Any source, compilation, runtime or route-guard error rejects;
an advisory assessment cannot permit an invalid map. Inputs are never mutated.

## Authoring a plan

Required fields are `format`, `id`, `name`, `spaces`, `connections` and `markers`.
Optional fields are `description`, `player`, `wallThickness`,
`wallHeight`, `floorThickness`, `covers`, `routes`, `noSpawnLos` and `moveSpeed`.
All coordinates use right-handed Z-up metres. IDs across the plan and all named
objects must be unique and match `[A-Za-z_][\w.:/-]*`. Source IDs and labels survive
canonical publication; generated IDs are allocated around every source ID.
Unknown fields are errors. Limits are 256 spaces, 128 vertices per footprint,
and 512 items in each other collection; numeric values must be finite and
within ±1,000,000. Native coordinates use the existing millimetre precision.

| Object | Fields and meaning |
| --- | --- |
| Space | `id`, optional `label`/`role`, exactly one of `rect:[x,y,width,depth]` or `footprint:[[x,y],...]`, optional `z` (default 0), `wallHeight`, `headroom`, `roof` |
| Connection | `id`, `from`/`to` ports, `width`, optional `kind` (`corridor`, `door`, `ramp`, `stairs`), `label`, `purpose`, `wallHeight`, `headroom`, `roof`, stair `rise` (default 0.18) |
| Port | `{space,edge,at?}` with a zero-based CCW footprint edge, or `{space,side,at?}` for a rectangle using `south`, `east`, `north`, `west`. `at` is a fraction along the CCW boundary, default 0.5. |
| Marker | `id`, `space`, `kind`, optional `label`, `team`, absolute XY `position:[x,y]`; Z comes from the named floor. Without a position, a bounded interior search chooses a capsule-clear point or asks for an explicit placement. |
| Cover | `id`, `space`, `position:[x,y,zOffset]`, `size:[width,depth,height]`, optional `label`/`role`; XY is the world-space box centre and Z is relative to the named floor. Cover is preserved, including cover that makes publication fail. |
| Route | Native `id`, `from`/`to` marker IDs, `minRoutes`, optional `label`, `minDistance`, `maxDistance`, `movement:"land"`. All requested limits survive publication. |

Footprints must be simple, counterclockwise polygons with positive area. Concave
footprints and partial adjacent boundary runs are supported. Ports must fit on
their selected boundary edge and face an actual positive run outside both
spaces. A connection is a straight floor strip or flight between two mouths;
author intermediate spaces for bends. Same-height endpoints use corridor/door;
different-height endpoints require ramp/stairs. Native slope, stair and capsule
checks still apply. Width is measured along each host boundary; an oblique
strip can have less perpendicular clearance, which native navigation checks.
Doors create full-width openings at both mouths, with head
height `headroom` or 2.1 m. A connection's `purpose` becomes its region role.

Assembly splits adjacent partial runs and T junctions before sharing native
edges. Different Z storeys retain separate vertices and boundaries. A connector
mouth must remain one shared edge: overlapping mouths or another junction
inside a mouth are rejected explicitly. Move that junction or author a separate
space rather than treating a subdivided mouth as extra routes. No off-mesh
links are generated. Exposed sides receive walls at the authored wall height.

`roof:true` creates a horizontal native ceiling at highest floor Z plus
`headroom` (or wall height). An explicit `headroom` also creates that physical
ceiling. Without either, the space/connection is open above. Wall height defaults
to 3 m, wall thickness to 0.22 m and floor thickness to 0.22 m. The historical
FPS player defaults remain radius 0.35 m, height 1.8 m, step 0.45 m, crouch 1.1 m,
vault 0, slope 42°, rappel false and ladder false. Explicit player options are
preserved. `noSpawnLos:[[markerA,markerB],...]` is enforced by native collision
visibility checks.

## Advisory assessment

The assessment identifies the actual compiled `geometryHash`. Required-route
reachability and walking distances come from native navigation; `travelSeconds`
divides those distances by `moveSpeed` (positive; default 4.6 m/s). Native
`disjointRoutes` remains visible alongside `physicalDisjointRoutes`.

The default marker search checks cover against the full player radius and height,
including floor-relative cover elevation. Explicit marker positions are never moved.

The conservative physical guard groups contiguous shared native boundary and
opening runs between logical floor areas into one entrance. Distinct entrances
require separate runs, such as mouths separated by a real wall pier. It checks
candidate crossings against the sealed native navigation mesh. Navigation
triangles are clipped to each area's floor ownership, and their connected
fragments establish that area's actual navigable components. Markers and mouths
attach to those components, so covers, walls and collision props cannot lend
exits across an internal divider. Triangle edges never supply route capacity.
Enabled authored native links use their real endpoints and direction; coincident
links share one capacity. This prevents an
L-shaped opening or subdivided straight opening from manufacturing independent
routes. The guard can undercount complicated geometry because crossings are
sampled; a mouth with disconnected crossing clusters conservatively retains
one cluster. It never lowers the source `minRoutes` or substitutes for strict native
validation. Its reusable internal helpers are `physicalRouteEvidence` and
`requirePhysicalRoutes` in `src/authoring/physical-routes.ts`.

Other advisory data includes space/connection counts, component adjacency
degrees and their minimum per logical space (used for branch/dead-end spaces),
actual floor elevation range, and preserved
cover count. Sightlines sample deterministic marker pairs at 90% player height
against compiled collidable triangles, including sealed dynamic geometry, with
at most 64 pairs and 2 million triangle tests. The report states whether the
pair set was truncated. These are geometry observations, not a fun score or bot
playtesting.

## CLI and example

```sh
npm run gameplay -- examples/gameplay/floodgate.gameplay.json --out generated/floodgate.level.svgx --report generated/floodgate.assessment.json
node tools/gameplay.ts examples/gameplay/floodgate.gameplay.json
```

Without `--out`, only canonical SVGX goes to stdout. `--report` writes advisory
JSON separately. Unknown/duplicate flags, malformed inputs, colliding artifact
paths and failed publication are rejected before writes. Each artifact uses the
existing atomic `writeArtifact`, preserving the previous file on a failed write.

[Floodgate](../examples/gameplay/floodgate.gameplay.json) demonstrates arbitrary
space and connection names: a fast exposed bridge, a longer covered northern
flank, and a raised pump overlook with physically separate ramp and stair
approaches. Its spawn pair has protected visibility, cover remains authored,
and both required routes demand at least two physical approaches.
