# LevelSpec

An agent authoring harness for architectural levels. Write AML XML `.aml`,
validate geometry and circulation, inspect the read-only illustrated reviewer,
and export meshes with runtime metadata. XML is the editable source; generated
JSON and meshes are outputs.

Use [general map authoring](.agents/skills/level-authoring/SKILL.md) for invented or reference-based maps. Add [reference reconstruction](.agents/skills/reference-level-authoring/SKILL.md) when matching images; tracing, camera fitting and scored reconstruction are targeted tools for difficult comparisons.

## Start here

Use Node 24. From this checkout:

```sh
npm ci
npm run --silent levelspec -- init projects/my-level
npm run --silent levelspec -- validate projects/my-level/level.aml --json
npm run --silent levelspec -- preview projects/my-level/level.aml
# In another terminal, after editing and validating XML:
npm run --silent levelspec -- build projects/my-level/level.aml --out generated/my-level --json
```

Edit with your normal file tools. Preview watches XML and declared companions,
retains visibly stale geometry on errors, and recovers after repair. Stop it with
Ctrl+C. Use `preview --camera "11 -17 8" --target "2 3 1" --projection perspective`
for a repeatable Z-up view. The reviewer provides camera controls, a view URL and
viewport dimensions; see [review controls](docs/WEBSITE.md). The browser cannot edit or save XML or publish exports. For an existing
worked source, use `src/cli/templates/starter.aml`. See [AML syntax, migration, and
delivery status](docs/AML.md). Older project sources require explicit migration.

Start with [agent instructions](AGENTS.md), then use the
[documentation index](docs/README.md) for XML syntax, references, CLI behavior,
review controls, exports, and current limits. `npm run --silent levelspec -- --help`
lists commands. The CLI is repository-local; standalone installation/publication
is not supported. The silent npm wrapper keeps JSON stdout free of npm banners.

## Source and output

Keep XML, references, editable plans/sections and review notes under `projects/`.
Keep reproducible output under ignored `generated/`. The [two maintained examples](examples/README.md) and worked project demonstrate
multilevel circulation, references, props and water coverage; focused tests protect their contracts. The [terrain course](tests/fixtures/aml/terrain-course.aml)
shows native ground, grading, tunnels, water, and spatial assertions; see the
[terrain guide](docs/TERRAIN.md).

Coordinates are right-handed Z-up meters. Render visibility, physical collision,
and navigation are distinct. Navigation is sampled/voxelized gameplay validation,
not structural or building-code certification. Static premap success leaves gameplay
reachability unverified.

## Development and checks

```sh
npm run check
npm test
npm run test:site
npm run build:viewer
npm run build:site
npm run test:preview:browser
npm run test:terrain:browser
```

`npm run dev` opens the local reviewer with Dust II; `npm run dev:site` opens the curated
reviewer with Lantern Court. [Browser acceptance setup](docs/WEBSITE.md) describes production servers
and browser prerequisites. Native Blender/Quake exporter checks need optional tools;
a skipped integration is not evidence that a native export passed.

The package root exposes `ArchitectureDocument`, `parseAml`, `serializeAml`,
`ArchitectureBuilder`, and `compile`. `levelspec/migration` is the explicit SVGX
translation entry point. Normal CLI/reviewer inputs and maintained producers use AML. The SVGX parser,
compiler, builder, serializer, and old authoring package entry points are retired.
[Retirement evidence](docs/reviews/phase-two-retirement-ledger.md) is historical.

## License

Source and original documentation use the [MIT License](LICENSE). Third-party
assets/dependencies retain their own rights and notices. Retained reference images
are not a grant of reuse rights.

[Seeded generation and image tracing](docs/PRODUCERS.md) publish native AML through
`levelspec/generate`, `levelspec/producers`, and `levelspec/trace`. Concept, semantic-plan, and gameplay-plan JSON/Python frontends are retired; their
obsolete inputs are available in Git history. `npm run game:export -- examples/dust2.aml --out generated/game`
exports visual/collision GLBs and gameplay metadata.
