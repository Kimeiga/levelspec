# LevelSpec repository guidance

## Skills

- For TypeScript creation/refactoring/review, apply [write-readable-typescript](.agents/skills/write-readable-typescript/SKILL.md).
- For test design, review or consolidation, apply [maintain-tests](.agents/skills/maintain-tests/SKILL.md).
- For substantial architectural authoring/review, apply [reference-level-authoring](.agents/skills/reference-level-authoring/SKILL.md).
- For illustrated preview rendering/review, apply [level-preview-art](.agents/skills/level-preview-art/SKILL.md).

## Current contracts

XML `.level.svgx` is the authoring direction. The package root exposes the XML API in `src/vector/index.ts`; exports live in
`src/export/vector`. The repository-local CLI is available; standalone installation/publishing is not supported yet.
Runtime JSON, reports and bake manifests are legitimate outputs.

Use meters and right-handed Z-up in domain code; exporters own axis conversion.
Keep render visibility, collision and navigation separate. Navigation sampling is
not continuous proof; static premap success does not verify gameplay reachability.

## Existing commands

- `npm run --silent levelspec -- init projects/my-level` creates XML and working directories.
- `npm run --silent levelspec -- validate projects/my-level/level.level.svgx --json` validates without writing.
- `npm run --silent levelspec -- preview projects/my-level/level.level.svgx` starts read-only live review.
- `npm run --silent levelspec -- build projects/my-level/level.level.svgx --out generated/my-level --json` publishes validated artifacts.
- CLI progress goes to stderr; finite --json commands emit one stdout result. Exit codes are 0/1/2/130 for success/failure/usage/cancel.

- `npm run compile -- <file.level.svgx> --out <directory>` compiles/exports XML.
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

The XML-only cutover retires ASCII/JSON authoring. Runtime JSON remains supported.
Start with [current documentation](docs/README.md), not historical plans.

## Repository map

- `src/vector`: XML compiler/domain API; `src/export/vector`: Node export orchestration.
- `src/cli` and `bin`: repository-local process/file boundaries.
- `review`: shared read-only reviewer; `viewer`/`website`: local/curated adapters.
- `tests` and `website/tests`: domain/CLI and site/browser contracts.
- `docs`: current guides; `docs/archive`, `docs/plans`, `docs/reviews`: historical evidence/plans.
- `examples`, `projects`, `reference`: supported sources and reference evidence.

Never infer supported examples from untracked conversion/scratch directories such
as `maps/vector`. Preserve user-owned files unless their cleanup is requested.
