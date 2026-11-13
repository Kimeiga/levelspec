# Phase-two retirement ledger

Decision: retain the small XML architectural acceptance set, retire the legacy
corpus without bulk conversion, and remove exclusive reference archives. Deletions
were selected from `git ls-files` only; untracked `maps/vector`, `review`,
`.playwright-mcp` and other user files were not deleted or promoted.

## Assets and tools

| Group | Disposition | Continuing purpose / evidence |
| --- | --- | --- |
| 381 tracked ASCII plans in maps | Removed | Existing XML examples plus focused continuing geometry/navigation tests replace the bulk legacy map gate. |
| Nine JSON levels | Removed | XML is sole authoring format; runtime/report/config JSON remains. |
| Nine authored Python inputs | Removed | Produced retired ASCII maps only. |
| Three looks JSON inputs | Removed | Only retired legacy palette/generator consumers reference them. |
| 475 reference/cs-maps archive files | Removed | Exclusive radar tracing corpus; no retained XML/browser consumer found. |
| Nine public/research plan previews | Removed | Produced by old tools/build.ts, not the retained browser workflows. |
| Legacy build/generate/author/concept/plans/finalize TS tools | Removed | Imported retired compiler/parser/generator APIs. |
| annotate/compose/trace_radar/compare_to_radar/find_flights/author_* Python tools | Removed | Read/write legacy plans and their authored/reference inputs. |
| build_palettes.ts / palette_from_image.py | Removed | Produce retired looks and generator data. |
| tools/migration/convert.ts and vector-migrate.ts | Removed | One-shot ASCII/JSON migration and legacy comparison are no longer supported. |
| examples/*.level.svgx | Retained | Showcase circulation, Dust II routes/blockout, rooftop references/props. |
| reference/dust2, reference/rooftop | Retained | vector-dust2.py directly consumes user-radar.png and walls.json; rooftop acceptance consumes its originals/cameras. |
| tools/vector-dust2.py, vector-showcase.ts, vector-rooftop-reference.ts, dust2-overlay.py | Retained | XML authoring/reference workflows, not old ASCII production. |
| tools/lighting, tools/export, tools/site* | Retained | Current XML bake/export/browser workflows. |

Asset/tool retirement removed 904 tracked files: 886 corpus/reference/preview
files and 18 exclusive tools. Production-module/public-interface and test retirement
are coordinated separately in this phase; the independent test record describes
surviving guarantees and removed historical assertions.

## Documentation

README is XML-first and documents the breaking root API. SVGX/EXPORTS use the new
compile command and remove compatibility claims. IMPLEMENTATION replaces the old
migration-parity gate with current retained capabilities and explicit limitations.
Other architectural/browser verification records remain useful historical evidence.
Phase-one audits and plans retain their original observed paths and baseline counts;
they are not claims that retired implementations remain installed.

## Dependency boundaries

Before deletion, source searches found no retained XML, browser, lighting or export
consumer of the removed asset trees. The shared BSP box constructor and XML test
volume oracle are implementation/test responsibilities and must survive relocation
before the retired core is removed. Native exporters and lighting remain supported;
removing their optional setup would be unrelated to legacy authoring retirement.
