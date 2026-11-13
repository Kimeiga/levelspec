# Tidebreak — graph exploration to authored shipyard

This trial carries the new [spatial exploration workflow](../../docs/EXPLORATION.md) through a reference-informed, independently reviewed AML blockout. The generated alternatives broadened the plan; they did not become a fixed room diagram.

**Current source:** [level.aml](level.aml), R04, SHA-256 `e1bcad31f8af49485acce4a10c4aa88c377979885ded9ef8bcda52adbe724e03`. Strategy, local encounter/visibility and architectural reviews accept this revision as a developed prototype. Competitive balance and target-engine mechanics are untested.

![Tidebreak illustrated cutaway](../../generated/tidebreak-hero-r04/overview.png)

The overview hides roofs for inspection. The [roof-on exterior](../../generated/tidebreak-hero-r04/architecture.png), [actual top view](../../generated/tidebreak-captures-r04c/top.png), [hall interior](../../generated/tidebreak-captures-r04c/hall.png) and [gallery view](../../generated/tidebreak-captures-r04c/gallery.png) show the same source. [The labeled plan](planning/proposal-r02.png) explains the design anchors and levels; it is a proposal drawing, not navigation proof.

## What the experiment changed

Seed `shipyard-07` explored four restarts of 2,000 proposals. [The replay packet](planning/experiment.json) retains four graph alternatives and twelve spatial interpretations; [the comparison board](planning/alternatives.png) records the actual outputs inspected. Dense clusters suggested shared volumes, longer edges suggested substantial journeys, and a basin/rim interpretation suggested carving a yard around a void. None of those relationships was treated as a lock.

The [initial packet](planning/experiment-initial.json) is preserved as historical evidence. A reviewed engine correction subsequently removed one redundant inferred connection inside a shared gallery; the final packet recomputes that evidence without changing any selected graph, history or AML geometry. [Engine source hashes](planning/engine-source.json) identify the replay version.

The AI then studied [six real architectural photographs](references/study.md), including Chatham's covered slip, a working Turks shipyard and Rochefort's dry docks. Original research images and credits are retained in `references/`; these are research evidence, not exported game textures. The resulting map uses a sunken dock, full-height hull occluders, one shared repair hall, a partial gallery, a service bridge and outdoor circulation around building masses. Ordinary rooms and connecting corridors no longer define every node and edge.

Independent reviewers proposed macro changes and local experiments before modeling. They caught an external stair crossing the hall wall/slab, clarified the northern journey, and proposed separating dock emergence from the hall entrance. The final entrance moves south **and narrows from 8 m to 4 m**. A frozen [control source](planning/baseline.aml) preserves the original opening with otherwise identical geometry. This is a combined threshold experiment, not proof that moving a doorway alone caused every difference.

From one supported hall hold, the changed threshold removes the sampled view onto the D2 stair top while opening a view onto the exterior apron. An independent follower study finds a temporary support gap: the leader can see the hall hold before a follower 2.5 m behind can. The pair can stage for a shared doorway view, then create another gap by advancing toward G1. Retaining that cost is part of the selected prototype. See [review decisions](reviews/disposition.md), [strategy acceptance](reviews/compiled-strategy-r04.md), [local acceptance](reviews/compiled-local-r04.md) and [architecture acceptance](reviews/compiled-architecture-r04.md).

## Evidence and limits

- Both selected/control sources pass native and sealed validation with no diagnostics. Final CLI export succeeds; heuristic suggestions are separately dispositioned in the architecture review.
- Eight complete routes were walked in both directions through the collision-aware inspection controller: **16 passes**, unchanged 0.35 m radius / 1.8 m height / 0.25 m step body, no movement helper. Both dock stairs, both gallery ascents, both hall sides, the service bridge and the northern detour are represented.
- Physical mouth checks satisfy all declared minimum-one-route requirements. Semantic route counts do not prove independent physical approaches; dock evidence is deliberately reported conservatively.
- Finite supported-eye/body optical samples compare entrances, hull shoulders, rim and gallery positions. They do not establish bullet behavior, trading, audio, utility or multiplayer timing.
- Spawn-to-objective distances are asymmetric. The performed full northern detour takes about 45.7 seconds at the inspection speed; it is an early commitment or withdrawal route, not an instant late rotation. Objectives, weapons, utility and round clock need a target-engine playtest.

[Retained evidence](reviews/evidence/summary.json) identifies sources, validation, captures and tests. Generated screenshots and export files live under ignored `generated/`; regenerate them with the commands below. R04's first capture attempt had stale camera poses and is superseded by `tidebreak-captures-r04c`. The corrected harness asserts actual applied cameras and loaded source hashes before saving each view.

## Reproduce and inspect

Run from the repository root with Node 24 and the normal dependencies:

```sh
npm run dev:explore
# http://127.0.0.1:63302/ — Import planning/experiment.json, or run a new seed.
npm run explore -- --replay projects/tidebreak/planning/experiment.json --out generated/new-replay
npm run --silent levelspec -- preview projects/tidebreak/level.aml --port 63304
npm run --silent levelspec -- build projects/tidebreak/level.aml --out generated/new-tidebreak-build --json
node projects/tidebreak/verify.mjs generated/new-tidebreak-evidence
node projects/tidebreak/capture.mjs projects/tidebreak/level.aml generated/new-tidebreak-captures
node projects/tidebreak/reviews/probe-local.mjs generated/new-tidebreak-local.json
```

Output directories/files must be new. The canonical authored result is `level.aml`; [author.mjs](author.mjs) retains the native-builder experiment for these baseline/offset variants. Regeneration is a new candidate, not permission to overwrite later hand edits. Browser captures require an installed Playwright-compatible browser; `BROWSER_PATH` can select one.

The broader lab matrix ran 24 seeds/profile combinations, producing 96 retained graphs and 288 interpretations without execution errors. Twenty-four graphs retained unmet demands. The twelve trial hypotheses all compiled to meshes; three passed native premap checks and nine retained uncovered-navigation errors. These rough spatial outputs are planning material. The final authored map's validation is a separate result.
