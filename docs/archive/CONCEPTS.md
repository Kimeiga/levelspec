> Historical frontend documentation. These JSON/Python design-plan APIs and commands
> were retired in AML phase 5. Use [native AML](../AML.md) and [maintained producers](../PRODUCERS.md).

# Native spatial concepts

Concepts describe proportional zones on elevation bands, required physical flights,
door/arch seals, and a spawn-to-objective route count. The public API accepts arbitrary
`SpatialConcept` declarations; the 50-entry catalog is a collection of examples, not
an API limit. The checked-in [workshop](../../examples/concepts/workshop.concept.json)
is a separate custom declaration with two physical circulation branches.

```sh
npm run concept -- --spec examples/concepts/workshop.concept.json --attempts=4 --variants=2 --plan
npm run concept -- --spec examples/concepts/workshop.concept.json --write --out generated/workshop
npm run concept -- silo --attempts=1 --variants=1 --write --why
```

`--plan` prints the native `levelspec-semantic/2` source used by publication, including
any real flight-side guards. Catalog positional filters,
`--attempts` (default 24, bounded 1–256), `--variants` (default 3, maximum 5), `--write`,
`--out` and `--why` accept the documented forms; valued options also accept `=`.
Unknown, duplicate, conflicting or malformed options fail before writes. A search
with no valid winners exits nonzero and leaves earlier artifacts intact.

```ts
import { parseConcept, createConcept, produceConcept, selectConceptCandidates }
  from 'levelspec/concept';

const concept = parseConcept(jsonText); // strict fields, values and references
const proposal = createConcept(concept, 'v0'); // source + semantic plan; unvalidated
const published = await produceConcept(concept, 'v0', { signal });
const { candidates, winners } = await selectConceptCandidates(concept, {
  attempts: 24, variants: 3, seedPrefix: 'v', signal,
});
```

`produceConcept` returns the proposal plus canonical SVGX `text`, parsed `document`,
compiled native `level`, sealed runtime `report`, conservative physical route
evidence and placement diagnostics. Producer options also forward `resolveAsset`,
`onProgress`, `onReachableSample` and `sampleOrigin`. Cancellation escapes the search.
Failed candidates expose `diagnostics`, have no score or publishable result, and
cannot win. Winners retain their validated geometry and are revalidated under their
final names/IDs without reranking a different drawing. IDs are length-framed by
source ID and variant; filenames encode custom IDs and use a separate variant suffix.

Coordinates in `size`, `extent` and generated rectangles are integer cells; `grid`,
band elevations/heights, wall thickness and requested flight widths are metres.
The shared historical layout clips extents to the grid with a one-cell margin and
varies zone proportions deterministically. Flight widths retain historical grid
quantization: `max(1, round(width / grid))` cells. Diagnostics report both requested
metres and actual width. For example 2.6 m at grid 1.7 realizes a 3.4 m footprint.
Source elevations, the 0.35 m radius / 1.8 m tall player, and `routes ?? 2` are retained.

`open: true` zones are voids. Required flights and declared door/arch seals must be
placed; a nonadjacent seal rejects that candidate. Only `optional: true` links may
be omitted. Cover `count` retains its historical meaning as placement attempts;
collisions, small zones and flight clearance can omit cover proposals, with counts
reported. Hard constraints are never relaxed. One bounded retry can add actual
1.1 m solid side guards beside lower flight edges when the native capsule-clearance
gate detects a low underside. Both attempts use the same strict publication gates;
the retry's full source and original diagnostic remain available.

Ranking measures native floor area, elevation range, layer balance, navigation route
distance and physical entrance capacities. Its weighted score is labeled an advisory
estimate. Diversity compares actual placed zone rectangles and requires at least
half to differ. These are neither autonomous playtesting nor guarantees of fun,
interesting maps. Some raw declarations have impossible hard constraints or no valid
placement within a finite seed budget; the API reports them instead of publishing
invalid maps. A wide doorway still counts as one physical entrance.
