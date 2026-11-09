# LevelSpec repository guidance

## Skills

- For TypeScript creation/refactoring/review, apply [write-readable-typescript](.agents/skills/write-readable-typescript/SKILL.md).
- For test design, review or consolidation, apply [maintain-tests](.agents/skills/maintain-tests/SKILL.md).
- For map layout, topology and circulation authoring/review, apply [level-authoring](.agents/skills/level-authoring/SKILL.md).
- For maps constrained by reference images, also apply [reference-level-authoring](.agents/skills/reference-level-authoring/SKILL.md).
- For illustrated preview rendering/review, apply [level-preview-art](.agents/skills/level-preview-art/SKILL.md).

## Current contracts

AML XML (`.aml`, or identical `.xml`) is the authoring direction. The package root exposes the native API in `src/architecture/index.ts`; exports live in
`src/export/vector`. The repository-local CLI is available; standalone installation/publishing is not supported yet.
Runtime JSON, reports and bake manifests are legitimate outputs.

Use meters and right-handed Z-up in domain code; exporters own axis conversion.
Keep render visibility, collision and navigation separate. Navigation sampling is
not continuous proof; static premap success does not verify gameplay reachability.

## Existing commands

- `npm run --silent levelspec -- init projects/my-level` creates XML and working directories.
- `npm run --silent levelspec -- validate projects/my-level/level.aml --json` validates without writing.
- `npm run --silent levelspec -- preview projects/my-level/level.aml` starts read-only live review.
- `npm run --silent levelspec -- build projects/my-level/level.aml --out generated/my-level --json` publishes validated artifacts.
- CLI progress goes to stderr; finite --json commands emit one stdout result. Exit codes are 0/1/2/130 for success/failure/usage/cancel.

- `npm run reconstruct -- --source <file.aml> --evidence <annotations.json> --out generated/<new-run>` optionally evaluates frozen candidates against independent image evidence; see [reconstruction](docs/RECONSTRUCTION.md). Historical SVGX inputs require explicit migration; reconstruction is not required for ordinary AML authoring.

- `npm run compile -- <file.aml> --out <directory>` compiles/exports XML.
- `npm run dev` starts the local reviewer; `npm run dev:site` starts the curated reviewer.
- `npm run check`, `npm test`, `npm run test:site` validate types and Node suites.
- `npm run test:preview:browser` verifies live-preview file watching in a real browser.
- `npm run build:viewer`, `npm run build:site` build the browser surfaces.
- `npm run test:site:browser` requires the production site on port 48217 and an
  installed Playwright browser; follow `.github/workflows/website.yml` for setup.

Node 24 is the CI baseline. Native exporters/bakers have optional prerequisites;
report unavailable checks explicitly. Keep generated outputs under ignored
`generated/` and retain source/reference/review evidence separately. Follow user
project layout choices; `projects/<name>/` is the supported project convention.

Normal CLI/reviewer inputs accept AML. Use `levelspec migrate <source.level.svgx> --out <new-project>` for explicit mechanical source translation. SVGX authoring APIs are retired; only the explicit migration decoder remains. ASCII/JSON authoring remains retired. Runtime JSON remains supported.
Start with [current documentation](docs/README.md), not historical plans.

## Repository map

- `src/architecture`: AML source, native compilation, and migration; `src/vector`: shared geometry/runtime backends; `src/export/vector`: Node export orchestration.
- `src/migration`: private read-only historical decoder used only by explicit migration.
- `src/cli` and `bin`: repository-local process/file boundaries.
- `review`: shared read-only reviewer; `viewer`/`website`: local/curated adapters.
- `tests` and `website/tests`: domain/CLI and site/browser contracts.
- `docs`: current guides; `docs/archive`, `docs/plans`, `docs/reviews`: historical evidence/plans.
- `examples`, `projects`, `reference`: supported sources and reference evidence.

Never infer supported examples from untracked conversion/scratch directories such
as `maps/vector`. Preserve user-owned files unless their cleanup is requested.
