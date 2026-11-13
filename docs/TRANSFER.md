# Continuing on another computer

This checkpoint pauses performance development and preserves the current compiler,
Kowloon procedural system, reviewer, authored maps and asset pipelines. The branch
is `codex/xml-cli-harness-next-phase` on `https://github.com/tfukaza/levelspec.git`.

## Checkout and run

Use Node 24, the CI baseline. A shallow clone avoids downloading the repository's
large historical asset corpus:

```sh
git clone --depth 1 --branch codex/xml-cli-harness-next-phase https://github.com/tfukaza/levelspec.git
cd levelspec
npm ci
npm run check
npm run dev
```

The `dev`, `dev:site`, `build:viewer` and `build:site` npm hooks first regenerate
the demo bundles under `generated/dressing-demo`. A fresh checkout has no warm
material cache, so that first build is slower. Use the npm commands rather than
invoking Vite directly against missing generated imports. Concrete input maps and
their signature are retained; if they need rebuilding, install the Playwright
browser with `npx playwright install chromium` before running the demo build.
Optional Blender/native export tools are needed only for their corresponding
asset-bake/export workflows, not ordinary AML editing or compilation.

Normal CLI inputs are AML. Retained historical SVGX project sources require an
explicit `levelspec migrate` into a new project before normal validate/preview/build.

## Retention policy

Retained:

- All 98 project AML files, the maintained examples, historical source maps,
  companion authoring data and useful design/review notes.
- Compiler/procedural code, schemas, scripts, package lock, tests and required
  fixtures, including fixed lighting evidence and reference-render goldens.
- Material libraries, source artwork, texture atlases, baked runtime mesh catalogs
  and the editable tarp Blender asset. Some baked files are deliberate build/test
  inputs; they must remain available on a clean checkout.
- Twenty-seven original externally generated prop GLBs (92.24 MiB), moved from
  ignored output directories to `projects/*/source-models/`. Their paths and hashes
  are in [the source-model inventory](../projects/source-models.json). Approved
  provider/result metadata needed by the bakers is retained without download URLs.
  Liquor/pilot model manifests and balcony/restaurant bakers use the portable paths.
- Current guides and [performance findings](PERFORMANCE.md), including unsuccessful
  timing results and the limits of the measurements.

Excluded from the transfer tree: 2,030 temporary files totaling 478.69 MiB, mostly
review screenshots, compiled inspection/build reports, planning renders, downloaded
research images, art-direction boards, temporary review scripts and local tool
sessions. No AML or source GLB was in that removal set. Temporary outputs already
under ignored `generated/`, dependencies and build caches also stay out of Git.
Required texture copies in different working projects remain intact; Git stores
identical file contents once rather than requiring a material-path refactor here.

On the originating computer, the excluded files have a recovery copy under ignored
`generated/transfer-discarded-20261112/`. This copy and older external cleanup
archives do not transfer through Git. Historical review documents may link to those
discarded captures or local profile snapshots; those links are provenance, not
portable build dependencies or a claim of current acceptance. Regenerate current
captures with the retained source and tooling when needed.

Future reproducible exports, renders, caches and profiler output belong under
`generated/`. Original paid/external assets belong in retained source directories;
do not treat them as disposable merely because their creation used a generator.

## Checkpoint validation and outstanding failures

No further performance optimization was attempted during transfer cleanup.

- `npm run check` passed.
- The focused schema/migration/CLI/demo-tools/cache/worker/PNG/survey batch passed
  **47 of 48 tests**. The failure is
  `tests/aml-schema.test.ts:59`: serialization emits the supported dressing
  `time-of-day` attribute, but `schema/aml.xsd` does not allow it.
- `npm run test:site` passed **16 of 19 tests**. The three failures are zero-warning
  assertions in `website/tests/courtyard.test.ts`, `website/tests/experience.test.ts`
  and `website/tests/worlds.test.ts`.
  Their runtime validation passes, but current compilation emits `FLIGHT_OPEN_SIDE`,
  `NAV_ISLAND` and/or `WALL_ALIGNMENT` warnings. These findings need inspection;
  they are not authorization to remove geometry or weaken validation.
- No missing-file errors occurred. The actual stored Cycles binding, image/hash
  and EXR acceptance test passed. Required fixture paths and lighting companions
  were audited independently.
- All 27 preserved source models match their recorded SHA-256 hashes and valid GLB
  headers. Portable result/provider IDs match, required baker metadata is present,
  and the two edited Python bakers pass syntax compilation. Blender rebaking was
  not rerun.

These four test failures remain in this checkpoint; their originating revision
was not established during this transfer audit. No full-suite, fresh cold demo,
browser or native-export acceptance is claimed. Earlier performance-stage focused
checks and limitations are documented separately in the performance reports.
