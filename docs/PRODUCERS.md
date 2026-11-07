# Native generation and tracing

Producer commands publish canonical `.level.svgx`. Every publication serializes
and parses the document, compiles it and validates runtime navigation before
writing. Invalid candidates cannot replace an existing artifact. Player limits,
route requirements and spawn visibility constraints are preserved; expected-failure
fixtures and premap drafts cannot be published as playable maps.

ASCII plans, legacy JSON levels, `producePlan`/`produceSpec`, and `--legacy` paths
are retired. Typed native semantic/gameplay declarations and raster evidence are
producer inputs, not compatibility level formats. Their output is native XML.

## Commands

```sh
npm run gen -- 10 --keep
npm run trace -- radar.png --cells 46 --bands 4 --out generated/radar.level.svgx
npm run author -- atrium
npm run finalize -- mirage
npm run concept -- silo --attempts=1 --write --variants=1
```

Generation uses seven native archetypes, deterministic seeds and bounded attempts;
it never lowers requested route counts. Native regions define actual ramps,
stairs and shared floor boundaries. Materials and solid decoration are included
in validation. Run furniture is placed only on navigation reached from the run's
spawn. Failed concept candidates cannot rank as valid or publish; advisory scores
are not gameplay balance assessments. See [concepts](CONCEPTS.md).

`trace` requires Python with NumPy and Pillow. Set `PYTHON` or pass `--python` to
select the interpreter. The Node command requests `levelspec-raster/1` observations
from the image analyzer and constructs native geometry directly. Color bands are
provisional areas; missing cells remain void. Tracing does not infer elevations
or invent gameplay routes.

```sh
npm run trace -- radar.png --out generated/radar.level.svgx --evidence generated/radar.raster.json
```

Output and evidence paths must differ. Parsing and native validation must succeed
before either is written. Retained raster observations preserve GRID provenance
for later annotation; SVGX alone does not preserve the raster lattice.

`author` accepts `--spec` and `--traced` paths. Python declarations emit structured
data through `tools/producers/semantic.py`; TypeScript constructs and publishes the
native document. [Semantic authoring](SEMANTIC.md) documents source preservation,
seed annotation, physical routes and unsupported transformations.

`finalize` accepts `--src` and `--out` directories and substring filters. It validates
native XML unchanged, or searches bounded elevation profiles for provisional raster
inputs. Selected destination collisions and overwriting another selected input fail
before publication. Unselected files and previously published artifacts survive
failures. Native source finalization in place is supported.

## APIs

```ts
import { generateLevelV2, loadAuthoredV2 } from 'levelspec/generate';
import { produceDocument } from 'levelspec/producers';
import { parseRasterTrace, traceToDocument, produceTrace } from 'levelspec/trace';

const generated = await generateLevelV2({ seed: 'run-42', minRoutes: 2 });
if (!generated.ok) throw new Error(generated.reasons.join('\n'));
const authored = await loadAuthoredV2({ id: 'my-map', text: svgxText });
const published = await produceDocument(document);
const raster = parseRasterTrace(jsonText);
const proposal = traceToDocument(raster); // Editable, not validated.
const traced = await produceTrace(raster);
```

Published results expose `document`, canonical `text`, compiled `level` and runtime
`report`. Semantic publication additionally records physical route evidence.
Cancellation uses `signal`. Navigation observers expose reached samples and walking
distances without adding navigation seeds or changing acceptance. Imported mesh
props use host-owned `resolveAsset`; loading and publication still validate the
actual resolved geometry.

Raster evidence contains `id`, `name`, `sourceImage`, positive `grid` in meters,
RGB `colors`, and rectangular north-first `rows` of color indices or `null` for void.
The parser accepts at most 1024 rows/columns and a minimum 1 mm grid. Raw raster
analysis is evidence, not validated XML.

Run `npm run test:producers` for archetype/depth sweeps and real Python tracing and
composition checks. CI installs NumPy/Pillow and runs these alongside core and
browser checks. Physical routes, walls, repeatability, malformed evidence and failed
publication recovery have separate behavioral coverage.
