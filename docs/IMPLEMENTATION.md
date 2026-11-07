# Implemented capabilities and current limits

XML `.level.svgx` is the editable map format. The package root and
`levelspec/vector` expose the XML compiler/domain API; Node export orchestration
lives in `levelspec/export`. The repository-local CLI is supported. Standalone
installation and publishing are not supported yet. ASCII plans, legacy JSON levels
and their migration/compiler APIs are retired; historical conversion reports do
not define the current release contract.

## Authoring and geometry

- Source-located XML parsing/serialization, explicit topology, floors with holes
  and creases, shared curves, wall openings and junctions, stairs and ramps.
- Native stair undersides support filled, sloped and stepped construction.
  Stepped thickness must exceed the actual equalized rise to preserve positive
  material overlap. Floors, walls and flights retain their source identities.
- Native generation, gameplay, semantic, concept and tracing producers remain
  available through their package entry points. They publish XML documents.
  Typed producer inputs and raster observations are distinct from retired legacy
  JSON level authoring; there is no `.plan` compatibility reader.
- Domain coordinates are meters in right-handed Z-up. Exporters own axis conversion.
  Render visibility, physical collision and navigation are independent contracts.
- Geometry audits report floor gaps, overlaps and same-facing coplanar patches
  with source IDs. Library compilation defaults floor-gap and surface-contact
  findings to warnings. The XML CLI and reconstruction runner default to
  strict geometry checks. Review warnings rather than treating them as acceptance.

Use [general map authoring](../.agents/skills/level-authoring/SKILL.md) for invented
or reference-based layouts. Add [reference authoring](REFERENCE_AUTHORING.md) when
images constrain fidelity. Tracing, camera fitting, formal reviewed plans and the
[reconstruction runner](RECONSTRUCTION.md) are targeted tools for difficult cases.

## Navigation and review

Navigation uses authored player limits, Recast geometry and independent sampled
floor coverage. The native library defaults to 0.0625 m horizontal / 0.01 m vertical
voxels with 0.5 m coverage spacing. The reviewer shares that horizontal default;
the reconstruction CLI defaults to 0.125 m. Both expose resolution separately and
record the effective settings. Sampling is not a
continuous proof, and static premap success does not verify gameplay reachability.

The shared read-only browser reviewer provides plans, sections/inspection views,
source-linked diagnostics, camera controls and collision/navigation-constrained
walkthroughs. Live preview watches XML and declared companions, retains visibly
stale geometry on failure and recovers after repair. Separate valid starts can
inspect disconnected islands; they do not establish a connecting route.

`npm run capture:level -- SOURCE.level.svgx NEW_OUTPUT VIEWS.json` captures named
browser views from frozen loaded inputs and records source/companion identities,
camera state and browser errors. Captures establish provenance, not photographic
correspondence or architectural acceptance. Reference comparisons and whole-volume
structural review remain separate checks.

## Exports and checks

The XML CLI validates, previews and builds portable runtime/mesh artifacts; see
[the quickstart](../README.md), [XML syntax](SVGX.md) and [exports](EXPORTS.md).
GLB/glTF material packaging, source metadata and collision exports are supported.
FBX, BSP and lighting bakes have optional native prerequisites and their own limits.
Unavailable native checks must be reported rather than treated as passed.

`npm run game:export -- SOURCE.level.svgx --out generated/game` writes visual and
collision GLBs plus gameplay metadata in glTF Y-up meters. Physical route and
barrier tests supplement navigation reports; balance and fun require playtesting.

Use Node 24. Current verification commands are:

```sh
npm run check
npm test
npm run test:producers
npm run test:site
npm run build:viewer
npm run build:site
npm run test:preview:browser
npm run test:capture:browser
```

Production reviewer acceptance uses `npm run test:site:browser`; server setup is
in [the reviewer guide](WEBSITE.md) and `.github/workflows/website.yml`. Producer
tracing checks additionally require NumPy and Pillow. Keep reproducible artifacts
under ignored `generated/`; keep source, references and review evidence separately.

Revision-scoped acceptance and unavailable checks belong in [review records](reviews/).
Historical test counts, converted-map totals and generated screenshots are evidence
for their recorded revisions, not guarantees for the current tree. Remaining
limits include sampled navigation, estimated photographic dimensions, hidden source
geometry, and destination-engine/native-tool acceptance outside installed test
configurations.
