# V2 generators and tracing tools

The producer commands publish `.level.svgx` by default. They compile and runtime
validate the compatibility source, serialize and parse the SVGX, then compile
and runtime validate that exact document before writing it. Failed candidates
cannot replace an existing artifact. Player dimensions, route requirements and
spawn visibility requirements are preserved. Expected-failure fixtures and
premap drafts cannot be published as playable maps.

The proposal algorithms still use semantic LevelSpec/plan intermediates. This
is an incremental migration of the publication and runtime paths; the legacy
source languages and synchronous APIs remain supported.

```sh
npm run gen -- 10 --keep             # generated/vector/levels/*.level.svgx
npm run plans -- kiln.plan           # generated/vector/plans/hand/kiln.level.svgx
npm run trace -- radar.png --cells 46 --bands 4 --out generated/radar.level.svgx
npm run author -- skydeck            # generated/vector/authored/skydeck.level.svgx
npm run finalize -- mirage           # generated/vector/finalized/*.level.svgx
npm run concept -- terminus --write  # generated/vector/concepts/*.level.svgx
```

Tracing requires Python with NumPy and Pillow. Set `PYTHON` or pass `--python`
to select an interpreter; the default is `python3`. The raw `trace_radar.py`,
`annotate.py` and `compose.py` interfaces still emit legacy plan drafts. Use
the Node commands above for validated publication.

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
runtime `report`. Source-based results also include `legacy` validation evidence.
Generation retries up to `attempts`, then returns a failure with reasons; it
never lowers `minRoutes`. Authored loading places run furniture on navigation
reached from the actual land run spawn, validates the added markers and a spawn-to-exit
route, and preserves any stricter authored routes. Run enemy-post results contain
only newly allocated posts reached from that run's spawn; authored markers for
other runs or movement domains remain in the document. All APIs accept cancellation
through `signal`. Navigation observers expose reached samples and walking
distances without adding validation seeds or changing acceptance.

The existing `levelspec`, `levelspec/generate`, `compile`, `generateLevel`,
`loadAuthored`, and `tools/build.ts` interfaces retain their legacy contracts.
`tools/migration/convert.ts` and `crossings.ts` remain compatibility re-exports.

Run `npm run test:producers` for the seven-archetype/depth sweep and real Python
tracing/composition integration tests. CI installs NumPy/Pillow explicitly and
requires this job in addition to the existing core, browser and migration jobs.
