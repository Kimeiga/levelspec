# What the exploration engine missed in real FPS maps

Study prompted by the user's assessment that Tidebreak remained too simple, 2026-11-09. We inspected actual map overviews and developer screenshots for **Nuke, Overpass and Inferno**, then compared their spatial relationships with the current algorithm. Published CS2-labeled diagrams are useful layout evidence, but their exact latest-patch correspondence is unverified. Historical Valve examples below are explicitly dated; old routes are not assumed to exist today.

| Reference | Observed structure | What a uniform node/edge graph loses |
| --- | --- | --- |
| Nuke | Stacked sites; Lobby, Radio/Trophy, Ramp, Outside/Secret and vent relationships; upper positions inside the A volume | Geometric proximity differs from access; different routes between floors expose different intermediate decisions. A single room node hides the local floor/rafter/entrance relationships. |
| Overpass | Successive park/restroom/long spaces versus tunnel/canal/short spaces, with selected transfers | An approach is a developed sequence. A single edge to each site or one global shared floor omits most of that sequence. |
| Inferno | Banana's bending encounter sequence; Mid/Second Mid/Apps and Arch/Pit/Balcony relationships | A legible macro arrangement can contain rich local play. Not every meaningful reveal is a graph branch or a separate room. |

These are spatial observations and design inferences, not measurements of competitive balance. [Detailed Overpass/Inferno study](overpass-inferno-study.md) includes original images, developer accounts, and their version limits.

## Nuke images actually inspected

![CS2-labeled Nuke callouts](nuke-cs2-callouts.png)

This [community radar](https://steamcommunity.com/sharedfiles/filedetails/?id=2721539148) separates the lower floor for legibility; the image's separation does not mean the sites are far apart in world XY. It shows different sequences into the lower territory through Ramp and Secret/Tunnels, alongside the vent relationship. Read these as different access/commitment patterns, not interchangeable lines ending at a room. Exact traversal, sound propagation and door behavior require the game.

![Valve's Nuke section, 2016](nuke-valve-schematic-2016.jpg)

Valve's [2016 section image](https://media.steampowered.com/apps/csgo/images/cedar_creek/nuke_schematic.jpg) visibly places A above B and shows occupied volumes at several levels. The [upper-site screenshot](nuke-upper-valve-2016.jpg) shows a ground floor, canisters, overhead circulation and several openings within one building envelope. Its local encounters cannot be represented by “one hall connected to another hall.” This is historical CS:GO evidence, not a current CS2 reconstruction guide.

Valve's [Nuke redesign account](https://www.counter-strike.net/reintroducing_nuke/) discusses access options, inter-site travel, rafters and readable opponents. Some changes restricted upper occupation or altered cover rather than adding connections. It also describes studying actual nuclear-site references to give spaces a coherent purpose. We use those principles, not its historical exterior route as a present-day layout claim.

## Diagnosis of our implementation and trial

The first prototype randomized positions, dimensions and edges, but rewarded too little **developed structure**. A four-node complete graph supplies three cycles immediately. More edges can shorten every journey rather than develop it. Neither a random overpass nor an extra named point establishes another meaningful decision.

Pass two made this worse: it merged all nodes on the most common elevation into one convex floor. That could erase exactly the separation pass one had discovered. The authored Tidebreak then simplified the plan into two main occupied volumes with broad surrounding travel. Its circulation and architecture passed bounded checks; those checks did not establish enough strategic substance for the user's desired scale. That distinction belongs in the authoring/review workflow as well as the algorithm.

## Implemented bounded response

- Structural growth now inserts a local triangle or diamond fork/rejoin region into a connection, and can move or stack an entire region. Small local moves and unrestricted proposal rejection remain part of the search.
- Progressive decision depth examines reduced ordinary routes, preserving parallel paths and suppressing degree-two transit. A direct shortcut, coincident route, unsupported movement or arbitrarily long detour cannot masquerade as a developed journey. This is a conservative geometric/topological proxy, not a measure of fun or all useful tactical decisions.
- Developed regions need an internal cycle, useful arrival/departure ports, and access within a bounded journey envelope. Optional stacked-region demands concern occupied proposals with ordinary round-trip access, not arbitrary height values or crossing lines.
- Shared spaces stay local and connected, retain region boundaries, and report when their common floor erases route independence. Unresolved hull contacts remain explicit rather than silently becoming certified connections.
- A soft penalty discourages junction degree above four. Multiple retained alternatives still matter; there is no single “maximum entropy” winner.

The default search still begins with four areas, but permits up to 28 areas/48 edges and asks for two progressive decision stages plus three developed regions. These are adjustable experiment settings, not universal map-design rules. Stacking defaults to zero so every output is not forced into a Nuke recipe.

The [controlled comparison](../../generated/complexity-comparison-final/index.html) uses the same current engine, seed and 2×1,200 budget per row with connectivity-only, staged and stacked demands. [Replay packets and source hashes](../../generated/complexity-comparison-final/report.json) retain unmet demands and geometric follow-ups. These are deliberately rough planning alternatives; a new fully authored map is a separate pass.

## Measured comparison and verification

Four fixed seeds produced 24 retained graphs and 72 spatial interpretations. The table describes each run's best graph under its own requested targets; it is not a cross-profile quality ranking.

| Targets | Areas | Decision depth | Developed regions | Stacked pairs |
| --- | --- | --- | --- | --- |
| Connectivity only | 8–17 | 0–1 | 0–1 | 0 |
| Developed journeys/regions | 19–23 | 2–3 | 3–4 | 0–1 |
| Add a stacked pair | 14–23 | 2 | 3 | 1–2 |

All twelve best graphs met their abstract demands. Two of the twelve retained alternatives still had unmet demands, preserved in the [durable experiment summary](experiment-summary.json). The [selected layered experiment](selected-experiment.json) retains its normalized config, graph/history and engine source hashes independently of ignored generated outputs. Rerun its config with those source versions for the same search; it is evidence, not an AML authoring source.

TypeScript, the production lab build, 24 domain/native integration tests, and the production-browser acceptance flow passed. Independent test and implementation reviewers accepted the changes. Visual inspection caught a whole-region stacking bug that invented heights by translating mixed-height groups around their average; a failing output-invariant regression preceded the fix. Stacking now selects homogeneous source/destination groups and assigns one configured floor elevation.

The selected layered packet re-imports identically. All three spatial interpretations compile without errors. Native runtime inspection reports `NAV_UNCOVERED` for terraces and courts; the galleries interpretation passes its static check but has three navigation components. These are still premaps, not verified playable maps. [Native diagnostics](../../generated/complexity-comparison-final/native-checks.json), [comparison image](../../generated/complexity-comparison-final/first-row.png), and [compiled preview](../../generated/complexity-comparison-final/lab-native.png) retain those limits alongside the visual evidence.

## Still outside this prototype

The engine does not yet model visibility-only edges, acoustics, doors/utility state, coherent multi-storey building envelopes, or human encounter sequences such as Banana's successive reveals. The graph's regional hierarchy is only a first step. Pass three must preserve and develop promising journeys, with actual reference images and independent proposals, rather than compress the richer graph back into two open rooms. Final physical/gameplay checks cannot substitute for that design judgment.

Image credits, original URLs and hashes: [Nuke](nuke-images.json), [Overpass/Inferno](overpass-inferno-sources.json). Research imagery is not exported as map texture content.
