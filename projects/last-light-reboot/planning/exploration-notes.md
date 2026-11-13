# Exploration-2 anti-anchoring record

Three deterministic runs used the current CLI, identical 130×110 m bounds and inspection body, two restarts and 1,000 proposals per restart. Different seeds and verticality targets were chosen before architectural drawing. Configurations and complete experiment packets are retained here; `engine-source.json` records the engine module SHA-256 values at execution.

| Run | Seed | Verticality | Levels | Structural target | Best result / retained warning |
|---|---|---:|---|---|---|
| Concourse | last-light-concourse-41 | 0 | 0, 3.6, 7.2 available; used 0 | depth 2, 3 territories, no stacking minimum | 11 nodes / 17 edges; 2 of 3 developed territories |
| Department | last-light-department-73 | 0.8 | 0, 3.6, 7.2 | depth 2, 3 territories, 1 stacking witness | 24 nodes / 33 edges; 0 of 1 stacking witness |
| Service | last-light-service-19 | 0.35 | 0, 3.6, 7.2 | depth 3, 3 territories, no stacking minimum | 19 nodes / 26 edges; no reported graph deficit |

The second retained concourse candidate achieved 3 territories; the second department candidate had one stacking witness. The best candidate is not automatically the most appropriate architectural prompt. Scores rank a graph under a particular objective and do not establish FPS quality.

The author visually inspected the combined [graph/spatial board](exploration-board.png), containing each run's best graph and gallery realization. The native realization drawings retain pads and ribbons, unrelated-area crossings and manual portal-reconstruction warnings. Full experiment packets preserve those warnings; `exploration-summary.json` extracts all candidate metrics and realization issues. The engine-generated AML in the corresponding ignored `generated/last-light-reboot-explore-*` directories is an exploratory hypothesis, not the production map.

The flat concourse run suggested spatially separated subregions and a long public journey. The layered department run suggested several parts of one occupied interior, with a partial upper gallery rather than stairs added independently to room boxes. The service run suggested public and back-of-house routes with different approach commitments. These were prompts, not a graph-to-building tracing instruction.

Discarded assumptions include preserving every generated crossing, satisfying a node count as a quality claim, adopting 7.2 m playable upper floors merely because they appeared in the graph, and compiling generated pads unchanged. Both hand-developed proposals use one 3.6 m level change and materially different shared volumes. No graph or spatial realization was frozen as the architecture.

Reproduce a run from the repository root:

```sh
npm run --silent explore -- --config projects/last-light-reboot/planning/explore-concourse.json --out generated/last-light-reboot-explore-concourse
```

Use `explore-department.json` and `explore-service.json` with their corresponding output suffixes for the other runs. Re-running under changed engine source hashes is a new experiment.
