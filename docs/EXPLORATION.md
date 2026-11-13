# Spatial exploration lab

The experimental lab generates contrasting **planning material** before the AI commits to a map sketch. A good graph score is not a good map. Compare multiple graphs and multiple physical interpretations, study real architecture, then freely combine, restructure or discard the generated work. Only explicit user constraints and locks are binding.

```sh
npm run dev:explore
# http://127.0.0.1:63302/
npm run explore -- --seed shipyard-07 --out generated/new-experiment
npm run explore -- --seed shipyard-07 --verticality .7 --out generated/layered-experiment
npm run explore -- --config experiment-config.json --out generated/another-experiment
npm run explore -- --replay generated/new-experiment/experiment.json --out generated/replayed
```

Output directories must be new. Copy a selected AML hypothesis into a project for AI authoring; subsequent generation cannot replace it. The packet is versioned experiment state and evidence, **not a new map-authoring format**. AML remains canonical. The existing seven-archetype generator and validated publication API retain their contracts.

## Three passes

1. **Graph exploration.** Start with areas and mobility connections. Seeded bounded annealing moves and reshapes areas, changes elevation, rewires connections, splits/merges areas, and adds/removes links. Structural proposals develop a connection into a local fork/rejoin region, or move/stack a whole region. Defaults start from four areas, allow up to 28 areas/48 edges, and run four independent restarts of 2,000 proposals. Every attempt consumes budget, including rejected edits. Pins preserve whole nodes; locked edges preserve their definition. Semantic anchors and required endpoints survive. Unmet targets remain visible when the budget ends.
2. **Spatial interpretations.** Each retained graph gets terraces, shared outdoor courts, and a shared covered-volume interpretation. Native AML uses rotated/rounded footprints, curved connections, stairs/ramps, supports and roofs. Shared floors use connected same-height local groups, respect explicit region membership, and have a 28 m member-center diameter bound; unlabelled groups additionally cap at four areas. Three bounded local width/bend trials prefer fewer geometric fit issues. This is a geometric adjustment loop, not a compiler/navigation optimization loop. The interpretation records node/edge-to-source mappings, extra transfers, shared throats, and unresolved contacts.
3. **AI development.** The AI operates the CLI/browser through its ordinary tools. There is no embedded chat backend or model credential. It compares the outputs with actual reference photographs before drawing a committed spatial proposal, develops a coherent place, and obtains independent macro and local proposals. Adopted changes receive independent acceptance by someone other than their proposer. Compile, inspect and walk the final authored AML; verify game-specific mechanics in the target engine.

The first two passes deliberately broaden the AI's planning options. Do not regularize every candidate back into the same room network, preserve every generated edge, or choose solely by penalty. A node can become part of a hall, an apron, a stair landing, a street segment or a territory carved around a void.

## Controls and evidence

Drag a node to pin it; select it for exact XYZ/radius edits. Connections can be added, removed, directed, assigned mobility modes and locked. The full configuration exposes bounds, node/edge limits, elevation choices, approach demands and movement assumptions. Use a candidate or historical frame as the next starting graph. The comparison cards, graph, plan, height diagram, iteration slider and native 3D reviewer share the same data. Historical playback is graph-only; the 3D view retains the selected spatial hypothesis.

Current targets are **minimum scalar demands with fixed search weights**: cycle rank, valid overpass regions, strategic length variation, directed edge-disjoint / internally vertex-disjoint approaches, progressive decision depth, developed territories and optional stacked region pairs. A soft degree-above-four penalty discourages dense webs. Defaults request depth two and three developed regions; overpasses and stacked regions default to zero. Configurable weighted intervals, visibility scoring and game simulation are not implemented. Capability-filtered travel times are estimates from centerline lengths and provisional speed, not player timing evidence.

**Structure metrics** use enabled, plausible ordinary movement only. Transit reduction preserves semantic/query anchors and parallel reduced routes; route separation compares sampled centerlines against their combined half-widths plus 0.2 m. Progressive depth counts intermediate choice junctions on the least-deep tied shortest route. Alternative exits must progress toward the target between retained junctions and fit within 1.75× the shortest journey; a bend inside a reduced route may initially move away. Degree-two subdivisions, coincident paths and direct shortcuts do not create credit. The metric can miss useful choices and does not measure visibility or encounter quality.

An optional node `region` names a proposed territory. A counted territory has at least three same-height members, a connected cyclic internal ordinary graph, distinct usable arrival/departure members (or query anchors), and all members within a requested journey's 1.75× distance envelope. Outside paths to its ports must avoid reentering the territory. A stacked pair needs overlapping proposed area disks, at least body-height+0.3 m floor separation and ordinary travel both ways between some member pair. These are plan proxies, not floor/ceiling clearance proof. The UI compares structure before and after realization, including choices lost when a shared floor replaces internal routes.

Whole-region stacking proposes a configured floor elevation and requires both source and destination groups to occupy a single floor. Mixed-height groups can still move in XY; stacking does not translate them by their average height and invent new levels. User-authored initial elevations remain valid independently of the configured mutation choices.

### Verticality and explicit floor transitions

`verticality` is a 0..1 frequency control (default 0.5). A floor assignment samples `elevations` with that probability; otherwise it keeps its existing height. At zero, a fresh starter uses `elevations[0]` and search preserves assigned heights. At one, assignments freely sample the configured heights. This is not a guaranteed floor count or a vertical-distance target. Supplied starting graphs, including off-list authored heights, are never automatically reassigned. Pins still take precedence.

Ordinary edges require equal endpoint heights within 0.000001 m. An edge needs **`crossLevel: true`** to join different floors; selecting `stairs`, `ramp` or `ladder` alone does not grant that permission. A marked edge may currently be flat, allowing later height exploration. Its mobility mode, physical clearance and game capability remain separate checks. A cross-level flag cannot make an impossible jump or unavailable ladder traversable.

The starter assigns floors using a separate seeded stream, then explicitly declares its cross-level connectors. When the profile has no applicable transition mode, it omits those connectors and leaves unmet connectivity visible. Ordinary connection proposals join one floor; separate cross-level proposals add or mark transitions. Height mutations move the entire weak component connected by unmarked edges together, unless a member is pinned. Ordinary splits and internal regional links stay on their floor. Region stacking cannot silently promote its boundary edges into transitions, and verticality zero disables it.

In the lab, **Reassign starter floors** creates a fresh four-area starter from the current seed, verticality and configured heights, resetting approach queries to the default entry→key demand. Scalar targets and bounds remain unchanged; incompatible bounds reject the reset without replacing the graph. **Explore** keeps the current starting graph and applies the setting to subsequent search. The connection editor exposes **Cross-level connection**; pink edges and text labels identify it in the graph and height views. A height edit or removal of permission that would violate an existing connection is rejected without changing the saved graph. The spatial pass also leaves near-grade contacts unresolved instead of inventing an unmarked floor transfer.

Cycle rank uses the underlying undirected graph. Approach counts respect direction and configured capabilities. Length variation collapses ordinary degree-two chains. Overpasses require connected ribbon-overlap regions, body/deck clearance over that region, and plausible ordinary access. Distinct crossings are not counted once per polyline sample. Retention combines interpretable shape/topology features and changes in named-area adjacency; it keeps a low-penalty attempt and distant alternatives within an eight-point penalty window. It deduplicates repeated states and may return fewer alternatives when locks or budget prevent useful variation. This is not a graph-isomorphism solver or a guarantee of interesting gameplay.

Shared floors can erase route independence. Their inferred graph collapses common territory; at-grade crossings introduce shared junctions. Ordinary continuous floors permit reverse movement even when the intended edge was directed. Known failed-fit links are excluded from inferred traversability. Other accidental area/route contacts remain explicit unresolved diagnostics. This plan-derived graph is incomplete until physical portals and compiled navigation are inspected.

Every movement record separates geometric fit, assumed capability and engine verification. All engine statuses remain **unverified** in generated packets. Ladders, jumps and drops reserve a relationship without pretending there is a continuous walking floor. Vents have physical low roofs but the current reviewer cannot establish movement through passages excluded by standing navigation. Generated sources are always **premap**; static validation cannot promote them to playable maps.

## Replay and ownership

The `exploration-2` payload includes normalized inputs, actual seed, budgets, capabilities, selected graphs, retained history, metrics, spatial interpretations and AML. No clock value affects the deterministic payload. Search chunk size and interpretation evaluation order do not advance another stage's random stream. Identical engine version and normalized input reproduce domain results; pixel output and native mesh byte identity are not promised across toolchains.

Version 1 packets predate the explicit cross-level invariant and are rejected. Their recorded source hashes retain their historical interpretation; the lab does not automatically grant floor-transition permissions to old graphs. To reuse a graph intentionally, declare its cross-level edges in a new configuration and start a new experiment.

Import checks graph bounds, original locks, semantic anchors, increasing trace order and trace endpoints, then recomputes derived metrics and AML. Treat exported generated AML and an AI-authored project revision as separate artifacts. The packet does not store arbitrary hand edits to AML; keep those in the project with a revision note. IDs beginning `explore-` are reserved for inferred graph topology. Output errors retain the incomplete new directory for diagnosis.

## Verification and trial

```sh
npm run check
npm run test:explore
npm run build:explore
npm run test:explore:browser
node tools/fps/exploration-matrix.mjs generated/new-matrix
node tools/fps/complexity-comparison.mjs generated/new-comparison
```

The pure tests protect directed routes/shared throats, subdivision invariance, connected crossings, impossible demands, locks, replay and alternative retention. Native integration checks a real connected route, a physical blocker, shared halls and unsupported mobility. The production-browser flow covers cancellation/recovery, edits during work, stale replies, historical-node dragging, comparisons, import/export, native preview and narrow-screen layout. The matrix retains all eight seeds × three parameter profiles, including unmet targets and geometry issues; it is not a pass/fail gameplay benchmark.

The [Tidebreak trial](../projects/tidebreak/README.md) records generated alternatives, architectural references, AI reorganization, independent proposals and final blockout evidence.

The subsequent [Nuke / Overpass / Inferno study](../reference/fps-complexity/README.md) explains why that trial remained too thin and motivates the regional growth and journey metrics. Historical Tidebreak and complexity-study packets remain evidence from their recorded engine hashes and version-1 contract. Their authored AML is separate and unchanged.
