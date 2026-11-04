# V2 generators and tracing tools

The producer commands publish `.level.svgx` by default. Procedural generation
constructs native vector documents directly. Compatibility source commands also
compile and runtime validate their source. Every path serializes and parses the
SVGX, then compiles and runtime validates that exact document before writing it. Failed candidates
cannot replace an existing artifact. Player dimensions, route requirements and
spawn visibility requirements are preserved. Expected-failure fixtures and
premap drafts cannot be published as playable maps.

`generateLevelV2` now uses a native builder and seven native archetypes. Shared
floor boundaries define connections; ramps and switchback stairs are native
regions. Native generation, native authored loading and the default generator
CLI do not load the legacy builder, compiler or migration adapter. Player dimensions
and requested route counts remain unchanged, and depth scales the layout rather
than the player. Themes supply native materials and solid decoration. Pickups
and enemy posts are placed on navigation reached from the selected spawn.

Native proposals have their own deterministic seed sequence and layouts; they
do not promise identical drawings to the compatibility generator. The existing
`generateLevel` API and `gen --legacy` retain their original algorithms and output
formats. Radar tracing now constructs native regions directly from raster
evidence, too. Plan/spec authored inputs, Python semantic annotation/composition,
concept proposals and legacy-plan finalization still use explicit compatibility
paths. No legacy APIs are retired.

```sh
npm run gen -- 10 --keep             # generated/vector/levels/*.level.svgx
npm run plans -- kiln.plan           # generated/vector/plans/hand/kiln.level.svgx
npm run trace -- radar.png --cells 46 --bands 4 --out generated/radar.level.svgx
npm run author -- skydeck            # generated/vector/authored/skydeck.level.svgx
npm run finalize -- mirage           # generated/vector/finalized/*.level.svgx
npm run concept -- terminus --write  # generated/vector/concepts/*.level.svgx
```

Image analysis requires Python with NumPy and Pillow. Set `PYTHON` or pass `--python`
to select an interpreter; the default is `python3`. The raw `trace_radar.py`,
`annotate.py` and `compose.py` interfaces still emit legacy plan drafts. Use
the Node commands above for validated publication.

Default `trace` requests structured `levelspec-raster/1` evidence from the image
analyzer and builds v2 geometry without a plan parser, legacy compiler or migration
adapter. Identical raster runs form floor polygons with shared cell-boundary
vertices. Missing cells remain void, including courtyards; exposed boundaries
become walls. Color bands supply provisional area labels and materials. The
tracer preserves its 0.35 m radius, 1.8 m height and 0.45 m step, then publishes
through the same sealed native runtime gate. It does not invent gameplay routes
or elevations. The image-analysis algorithm, crop controls and raster resolution
remain shared with the legacy draft writer. `trace --legacy` still validates both
the source plan and serialized v2 conversion before writing a plan.

The additive `levelspec/trace` API accepts raster evidence without Python:

```ts
import { parseRasterTrace, traceToDocument, produceTrace } from 'levelspec/trace';

const raster = parseRasterTrace(jsonText);
const proposal = traceToDocument(raster); // editable native document, not validated
const published = await produceTrace(raster); // canonical SVGX + runtime report
```

The raster protocol includes `id`, `name`, `sourceImage`, positive `grid` in
metres, RGB `colors`, and rectangular north-first `rows` of color indices or
`null` for void. It accepts at most 1024 rows and columns and a minimum 1 mm grid,
matching the native coordinate lattice. `trace_radar.py --format raster` exports
this evidence; omitting that option retains its existing plan draft interface.

Every command accepts `--out` (a directory except for trace/author, where it is
a file). Plans/finalize accept `--src` for an input directory. Filters select
only matching inputs; finalization never deletes unselected outputs. Author
also accepts `--spec` and `--traced` paths for source proposals. `--legacy`
retains the old output formats and locations. Author, concept and finalize
still apply both validation gates with `--legacy`; use the source APIs for
drafts that are not ready for runtime publication.

```ts
import { generateLevelV2, loadAuthoredV2 } from 'levelspec/generate/vector';
import { producePlan } from 'levelspec/producers';

const generated = await generateLevelV2({ seed: 'run-42', minRoutes: 2 });
if (!generated.ok) throw new Error(generated.reasons.join('\n'));
const authored = await loadAuthoredV2({ id: 'my-map', text: svgxText });
const converted = await producePlan(planText);
```

V2 results expose `document`, canonical `text`, native compiled `level` and a
runtime `report`. Compatibility source-based results also include `legacy`
validation evidence; native procedural and raster tracing results have no legacy intermediate.
Generation retries up to `attempts`, then returns a failure with reasons; it
never lowers `minRoutes`. Authored loading places run furniture on navigation
reached from the actual land run spawn, validates the added markers and a spawn-to-exit
route, and preserves any stricter authored routes. Run enemy-post results contain
only newly allocated posts reached from that run's spawn; authored markers for
other runs or movement domains remain in the document. All APIs accept cancellation
through `signal`. Navigation observers expose reached samples and walking
distances without adding validation seeds or changing acceptance.
Native documents with imported mesh props can supply `resolveAsset` in producer
options. It is forwarded to every compile, including authored loading's final
publication. Asset loading stays under host control and resolved geometry still
passes the usual prop and runtime validation.

The existing `levelspec`, `levelspec/generate`, `compile`, `generateLevel`,
`loadAuthored`, and `tools/build.ts` interfaces retain their legacy contracts.
`tools/migration/convert.ts` and `crossings.ts` remain compatibility re-exports.

Run `npm run test:producers` for the seven-archetype/depth sweep and real Python
tracing/composition integration tests. CI installs NumPy/Pillow explicitly and
requires this job in addition to the existing core, browser and migration jobs.
The native tests also block legacy module loading, close real lane mouths to
check route rejection, verify repeatability, and exercise explicit legacy CLI output.
Tracing tests compare native evidence with legacy footprints across white, black
and transparent backgrounds, check cropped and full-canvas inputs, and verify
strict rejection of disconnected floors, narrow passages and unsatisfied gameplay
constraints.
