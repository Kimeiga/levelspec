# Native AML generation and tracing

Maintained producers return `ArchitectureDocument` and publish canonical `.aml`.
Publication serializes and parses AML, compiles physical geometry, and requires
playable runtime validation before writing. Invalid candidates cannot replace an
existing artifact. Player dimensions, route counts, and local distance limits
remain acceptance requirements.

```sh
npm run gen -- 10 --keep
npm run trace -- radar.png --cells 46 --bands 4 --out generated/radar.aml
npm run game:export -- examples/showcase.aml --out generated/game
```

Generation uses seven archetypes, deterministic seeds, and bounded attempts.
Native slabs, flights, walls, and explicit connections establish geometry; physical
route evidence checks actual supported approaches. Furniture is placed only on
navigation reached from the spawn.

Tracing requires Python with NumPy and Pillow. Set `PYTHON` or pass `--python` to
select the interpreter. The command takes an image. Its private `levelspec-raster/1`
JSON subprocess protocol is raster evidence, never an architectural source format.
Color bands are provisional areas; missing cells remain void. Tracing does not
infer elevations or invent gameplay routes. `--evidence generated/radar.raster.json`
retains observations separately from AML. Evidence and output paths must differ.

```ts
import { generateLevel, loadAuthored } from 'levelspec/generate';
import { produceDocument } from 'levelspec/producers';
import { traceToDocument, produceTrace } from 'levelspec/trace';

const generated = await generateLevel({ seed: 'run-42', minRoutes: 2 });
if (!generated.ok) throw new Error(generated.reasons.join('\n'));
const authored = await loadAuthored({ id: 'my-map', text: amlText });
const published = await produceDocument(document);
const proposal = traceToDocument(rasterObservations); // Editable proposal.
const traced = await produceTrace(rasterObservations);
```

Results expose `document`, canonical `text`, compiled `level`, runtime `report`,
and physical route evidence. Cancellation uses `signal`; native compilation,
physical route indexing, trace expansion, and companion loading have explicit
resource budgets. Imported visualization assets use host-owned resolvers and
cannot provide physical support. PNG heightmaps use `resolveHeightmap`.

Run `npm run test:producers` with the tracing Python dependencies installed.

The JSON/Python concept, semantic-plan, and gameplay-plan frontends and their
`author`, `finalize`, `concept`, and `gameplay` commands are retired. Their retained
input files are historical material. Use native AML for new authoring; historical
SVGX requires the explicit [migration command](AML.md#migration). Seeded generation,
image tracing, reconstruction, and game export remain supported.
