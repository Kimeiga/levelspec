# Exploration-2 inspection and reinterpretation

Inspect `harbor-fold.png` and `ravine-quarter.png` before reading this rationale. No favorite is selected in S01. The lab was used to disturb the planning process, not to optimize a score or supply finished architecture.

## Reproducible runs

Each CLI call used two restarts, 1,200 proposals per restart, levels [0,4,8] m and the exploration-2 defaults for three developed territories, decision depth two and two vertex/edge approaches to the key. Full configs, traces, candidates and spatial outputs are retained in the three experiment JSON files. `exploration-summary.json` records engine source hashes in `src/generate/exploration/`.

```
npm run explore -- --seed galini-folded-11 --verticality 0.75 --restarts 2 --proposals 1200 --out generated/galini-reboot-folded
npm run explore -- --seed galini-ravine-23 --verticality 0.45 --restarts 2 --proposals 1200 --out generated/galini-reboot-ravine
npm run explore -- --seed galini-contour-37 --verticality 0.2 --restarts 2 --proposals 1200 --out generated/galini-reboot-contour
```

The exploration profile defaults differ from the inherited production body: radius .35 m / step .25 m instead of Galini's .30 m / .30 m. These exploratory settings are more restrictive in those two dimensions, but neither profile nor the spatial outputs constitute physical proof. The drawn proposals explicitly preserve the original Galini body. No generated jump or drop is a required route.

## What was inspected

`exploration-board.png` places all six retained candidate graphs beside their galleries interpretation. The full packets retain other interpretations too. Inspection was of the actual graph and floor drawings, not only the metric summaries.

| Seed / candidate | Graph output | Spatial observation and useful disruption |
| --- | --- | --- |
| folded / candidate-1-r1-p983 | 21 areas, 3 regions, depth 2, no target deficits | An asymmetric long chain has local regional alternatives. It encourages an intermediate district with forks instead of a direct spawn-to-site arm. Spatial ribbons and convex floors merge some distinct graph choices. |
| folded / candidate-2-r1-p1100 | 22 areas, 3 regions, depth 3, no target deficits | Adds another consequential stage but retains similar diagonal territory progression. Useful reminder that additional depth can be a district, not a decorative bend. Literal shared floors would erase part of the distinction. |
| ravine / candidate-1-r1-p505 | 15 areas, 3 regions, depth 2, 1 stacked pair, no target deficits | Adjacent local clusters and a far triangular region create different bridge-like commitments around a central absence. A single large envelope would lose that absence. |
| ravine / candidate-2-r2-p1200 | 19 areas, 3 regions, depth 2, 1 stacked pair, no target deficits | More distributed clusters and a longer shortcut suggested different cross-town transfers. Nearby projected territories need separate access and inhabited arrivals to mean anything. |
| contour / candidate-1-r2-p1197 | 18 areas, 3 regions, depth 2, no target deficits | Dense crossings and overlapping corridors would read as spaghetti if copied. The spatial output exposes why graph complexity cannot be accepted by a node count. |
| contour / candidate-2-r1-p1100 | 15 areas, 2 regions, depth 2; territory target 2/3 | Groups around a central gap are promising spatially even though one graph target is unmet. The deficit is retained. It is not silently upgraded into a successful map. |

## How this changed the human-authored proposals

A develops a long waterfront journey with local access through a populated middle shelf and distinct upper civic territory. B turns regional separation into two inhabited ravine shoulders with a low end-run and two differently placed cross-town passages. They are different architectural hypotheses; neither is a cosmetically varied trace of one generated candidate.

Both reject automatic thin corridor ribbons, large merged floors, incidental crossings and unbounded ramp chains. Building masses, terrace limits, roofs/passages and named intermediate places replace those artifacts. The graph's four starting labels are not mapped directly onto T, CT, A and B. Candidate identifiers and full results remain available so the inspiration process is auditable.

The drawings still require independent spatial critique. An engine demand being satisfied says nothing about counterplay, memorable architecture, a route's usefulness after contact, physical traversal or actual visibility. Later detailed layouts and AML may revise or reject any current proposal.
