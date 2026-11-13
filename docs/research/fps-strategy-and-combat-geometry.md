# FPS strategy and combat geometry: research guide

Research date: 2026-11-08. Focus: Counter-Strike-style multiplayer, with selected comparisons from VALORANT and Rainbow Six Siege.

## Scope and evidence

This guide connects strategic play to concrete geometry: corridors, doorway thresholds, corners, crates, crouching cover, vantage points, retreat paths, utility access, and objective surroundings. It also retains sources about defaults and rotations so the local details can be understood in the context of a full round.

Articles marked **read** were inspected as text. Videos marked **located** were verified through creator descriptions, chapter metadata, official event pages, or creator portfolio embeds; their complete audiovisual contents were not reviewed. They are viewing recommendations, not evidence for unverified detailed claims. No current CS2 map was instrumented or playtested for this research.

Many excellent sources concern historical CS:GO. Transfer their causal questions, not old lineups, networking claims, numerical dimensions, or promises that a position is safe. Practitioner explanations and developer intent do not establish measured competitive outcomes. Sources that repeat the same author are not independent corroboration.

## Start with small geometry

### 1. Crates, wall recesses, corners, and retreat

**Read:** Andrew Yoder, [Judge A Map By Its Cover](https://andrewyoderdesign.blog/2022/04/14/a-few-kinds-of-cover/), 2022.

The closest match to this research question. Illustrated Dust II examples compare a freestanding crate, a directional wall recess, and Long's blue bin. Hypothetical cover changes around a corner alter the threats an attacker must clear and a defender's retreat. The author explicitly writes from a designer/casual-player perspective.

Use it to ask: can the occupant change sides, disengage, or defend against a different approach? Does the object become useful to the other team after a site take?

### 2. Doorway width and simultaneous threats

**Read:** Riot, [VALORANT Patch Notes 2.01](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-2-01/), 2021, Split section.

Concrete before/after examples: widening B Main to reduce stalling, a crate enabling utility from a new angle, shallower hiding corners, and cover/wall changes that separate difficult simultaneous checks. This is documented design intent, not a measured evaluation.

Use it to investigate entrance throughput, protected staging immediately after a doorway, and whether players can clear threats in sequence. VALORANT abilities change the costs relative to CS.

### 3. Cover height, material, and spacing

**Read:** Alex Galuzin, [How to Use Cover Object Placement for Level Design](https://worldofleveldesign.com/categories/level_design_tutorials/cover-object-placement-for-level-design.php), 2011.

Distinguishes high/low cover, penetrable protection, and exposed movement between objects. Includes Counter-Strike examples. Treat its broad recommendations as practitioner heuristics; an exposed crossing is not automatically a design failure.

Use it to distinguish what a crate lets players hide behind, shoot over, move around, or shoot through. Test crouching against the actual player camera and body rather than an assumed waist-height standard.

### 4. Accidental sightlines and exposed body parts

**Read:** Exodus, [The dos and don'ts of Counter-Strike level design](https://steamcommunity.com/sharedfiles/filedetails/?id=1110438811), especially sections 8, 11–13.

Examples address narrow accidental sightlines, ramp approaches exposing feet, eye-height cover, escape options, and misleading prop collision. The source also covers sound and readability. Its historical dimensions are not validated current CS2 requirements.

Use it as a two-viewpoint inspection checklist, including standing/crouching approaches and movement around props.

### 5. Corner perspective

**Located video:** TheWarOwl, [CS:GO Perspective & Angles Tutorial](https://www.youtube.com/watch?v=5e8HZqF3cyk), 2014.

Creator description identifies positioning and perspective as the topic. [Mapcore's mapping resource discussion](https://www.mapcore.org/forums/thread/18911-attn-new-map-makers/) also recommends it to level designers. Full video not reviewed.

Viewing question: how do the available distances from an occluding corner change what each player can see? Keep geometric visibility separate from network latency and peeker's advantage.

### 6. Selective exposure around a crate

**Read:** rkd / Dignitas, [Groove to Move: Optimal Positioning and Movement in CS:GO](https://dignitas.gg/articles/groove-to-move-optimal-positioning-and-movement-in-csgo), 2020.

Uses Mirage Triple Box to explain choosing exposure toward different approaches, and the vulnerability that appears when neighboring territory is lost. Other examples describe using successive cover to isolate threats.

Design question: can a player choose which fight to take, and what becomes unsafe when a teammate loses adjacent control?

### 7. Vantage points and boosts

**Read:** michaelcsgo / Dignitas, [CS:GO Dust 2 Boost Guide](https://dignitas.gg/articles/csgo-dust-2-boost-guide), 2015.

Historical examples connect elevated sightlines to partial exposure, teammate assistance, and fallback cover. Use these as studies of access cost and support, not current setups.

Design question: what does elevation reveal, how much body does it expose, what does reaching it cost, and can the occupant escape?

### 8. Tradable entrances

**Read:** GodPancakes / Dignitas, [How to Trade Kills Properly](https://dignitas.gg/articles/how-to-trade-kills-properly), 2018.

Explains supporting an entry closely enough to punish their killer before recovery or retreat. Avoid treating its general claims about favorable exchanges as universal.

Design question: can the second player actually see the first player's killer soon enough? Doorway blockage, a sharp bend, or an escape pocket can matter more than the distance between teammates.

### 9. Crossfires and shared coverage

**Read:** Ike / Dignitas, [Good Duo Queue Positions and How to Use Them](https://dignitas.gg/articles/good-duo-queue-positions-and-how-to-use-them-in-csgo), 2015.

Dust II examples show paired positions and the cost of assigning two players to one approach. Useful for distinguishing locally strong teamwork from efficient whole-map coverage.

**Read:** Valkyrie / Dignitas, [A CT Side Guide to Cobblestone](https://dignitas.gg/articles/blogs/CSGO/10531/a-ct-side-guide-to-cobblestone), 2018.

Focus on the sections about covering separate threats while remaining close, delaying, and dropdown crossfires. Historical geometry; useful support relationships, not ready-made current tactics.

### 10. Utility support across spaces

**Read:** Valkyrie / Dignitas, [CS:GO: Ultimate Mirage Flash Guide](https://dignitas.gg/articles/csgo-ultimate-mirage-flash-guide), 2020.

Explains supporting Window from Short, helping Short from Connector, and the limitations/exposure of different throws. Particularly useful for asking whether a support player can help an entry without being physically beside them. Exact throws require current-game verification.

**Located official video:** Valve, [Counter-Strike 2: Responsive Smokes](https://www.youtube.com/watch?v=_y9MpNcAitQ), 2023; also [official feature overview](https://www.counter-strike.net/cs2).

Official descriptions establish environmental and weapon/explosion interactions. Viewing question: how do openings and adjoining cover affect the temporary visibility relationships created by smoke?

## Connect local geometry to round strategy

### 11. Banana: space as warning time and player allocation

**Read:** Dignitas interview with friberg, [How to Defend Banana on Inferno](https://dignitas.gg/articles/news/CSGO/15018/how-to-defend-banana-on-inferno-a-strategy-guide-with-dignitas-vie-friberg), 2021.

Connects narrowness and limited escape to utility value, and forward control to warning time for reinforcements. Also discusses the late-round cost of spending too much utility early.

**Located video:** mahone_tv, [The History of Inferno Banana Control](https://www.youtube.com/watch?v=vGtCJFSiSpE), approximately 30 minutes. The [producer's portfolio](https://www.dannyhsieh.com/) verifies its scope as a history of professional approaches over ten years and supplies the embedded video link.

**Located video:** NartOutHere, [How CS2 Pros Win Banana on Inferno](https://www.youtube.com/watch?v=3cu1M-S7N5o), 2024. Creator chapters identify standard setups at 0:13, NAVI at 1:34, a three-player setup at 8:00, AWP setup at 10:12, and top-down setup at 13:24. Compare different investments in the same space rather than collecting only grenade lineups.

### 12. Mirage: territory preserving multiple follow-ups

**Read:** raveNf0 / Dignitas, [Unraveling de_mirage #1: Defaults and Variations as T-side](https://dignitas.gg/articles/unraveling-de_mirage-1-defaults-and-variations-as-t-side), 2018.

Explains Short/Ladder versus Connector control, information denial, site splits, and rotation cuts, with role-specific demonstrations. This is a useful bridge from a physical connection to a team plan.

**Read:** Dignitas, [Taking Mid Control on Mirage and How to Execute From It](https://dignitas.gg/articles/taking-mid-control-on-mirage-and-how-to-execute-from-it), 2016.

Worked professional example of converting the same mid presence into different site attacks.

**Located video:** mahone_tv, [The Evolution of the Mirage Window Smoke](https://www.youtube.com/watch?v=NiZ61Nph58w), approximately 20 minutes. Scope/link verified through the producer portfolio above; complete video not reviewed. Watch for the interaction between one sightline, utility timing, and access to strategically valuable connections.

### 13. Nuke: concealed branching and connected defense

**Read:** Dignitas interview with Lekr0, [How to Play Outside on Nuke](https://dignitas.gg/articles/how-to-play-outside-on-nuke-csgo-strategy-guide), 2021.

Explains repeating outside smoke pressure while varying the real attack, with threats toward Secret and defender circulation. Useful for studying a crossing that conceals consequential destinations.

**Read:** Xela / Dignitas, [The Weekly Team Dignitas Map Guide: Nuke](https://dignitas.gg/articles/the-weekly-team-dignitas-map-guide-nuke), 2019.

Examples connect Ramp pressure to defensive movement and possible returns through Lobby toward A.

**Located video:** karrigan, [Karrigan's CS2 Nuke Guide for Beginners](https://www.youtube.com/watch?v=eI7pZWGhGfM), 2024. Chapter metadata identifies team hold strategies at 8:10 and team connectivity at 12:38. Full video not reviewed.

### 14. Defaults, lurking, and information

**Read:** byrrice / Dignitas, [Defaults in CSGO: An Explanation](https://dignitas.gg/articles/defaults-in-csgo-an-explanation), 2018. Explains gathering information, containing aggression, maintaining presence, and choosing a later commitment.

**Read:** MnR / Dignitas, [Default Strategies on T-side: Team EnVyUs on de_cache](https://dignitas.gg/articles/default-strategies-on-t-side-team-envyus-on-de_cache), 2018. Connects mid, Highway, Vents, passive holds, and more expensive advanced positions to an adaptable default.

**Read:** Dignitas interview with hallzerk, [Become a Better Lurker](https://dignitas.gg/articles/become-a-better-lurker-with-hallzerk), 2021. Explains listening, provoking rotations, and gathering information without dying. A valuable position may provide information rather than a firing angle.

**Located video:** EliGE, [Defaulting: The CS:GO & CS2 Tactic You NEED to Master](https://www.youtube.com/watch?v=SZuUM9ve6cw). Direct fetch failed; creator description/chapter list was available through an indexed secondary summary. Treat timestamps as provisional. Useful viewing topic: similar opening signals masking different team distributions and intentions.

### 15. Planting and retaking

**Read:** Dignitas interview with f0rest, [The Best Spots to Plant for Each Map in CSGO](https://dignitas.gg/articles/the-best-spots-to-plant-for-each-map-in-csgo-by-f0rest), 2021. Connects visible bomb positions to multiple possible defenses and sufficient time to reposition.

**Read:** trailmix / Dignitas, [Useful Planting Positions: de_Cache](https://dignitas.gg/articles/useful-planting-positions-de_cache), 2015. Particularly explicit about safe planting versus a wider range of post-plant positions.

**Read:** Raventhorn / Dignitas, [How to Be More Effective at Retaking Bombsites](https://dignitas.gg/articles/how-to-be-more-effective-at-retaking-bombsites), 2016. Discusses survival/delay, coordination, isolating distant attackers, and the retake/save decision.

### 16. Designer intent, iteration, and counterexamples

**Read:** HLTV interview with Volcano/FMPONE, [Cache redesign](https://www.hltv.org/news/28102/volcano-on-updated-cache-we-wanted-to-put-a-little-bit-more-importance-on-utility-and-give-players-more-creative-ways-to-use-their-tools), 2019. A new mid window offered defenders another option, requiring attackers to allocate utility or attention and potentially affecting resources elsewhere. This is a clear geometry-to-strategy explanation, but describes intent and anticipated outcomes.

**Located designer talk:** [Community Level Design for Competitive CS:GO](https://www.gdcvault.com/play/1021868/Community-Level-Design-for-Competitive), FMPONE and Volcano, GDC 2015; [YouTube mirror](https://www.youtube.com/watch?v=UCjfV25HC28). Official abstract inspected; complete talk not reviewed.

**Read:** Dave Johnston, [The Making Of: Dust 2](https://www.johnsto.co.uk/design/making-dust2/). Explains readable boundaries, sightline control, concise connectivity, and modifications to site access and cover.

**Read:** Riot, [The Creation of Split](https://playvalorant.com/en-us/news/dev/the-creation-of-split/), 2020. An overly important central tower and excessively connected mid required revision. Useful evidence against treating more connections or more valuable central territory as automatic improvements.

**Read:** Riot, [Making VALORANT's Fracture](https://playvalorant.com/en-us/news/dev/controlled-ruptures-making-valorant-s-fracture/), 2021. A safer defender rotation restored options after earlier versions allowed attackers to constrain defenders too easily.

**Read:** Riot, [Patch Notes 9.08](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-9-08/), 2024. Sunset's B Main cover was simplified to reduce post-plant pressure and improve retake management.

**Read:** Ubisoft, [Kafe level design](https://www.ubisoft.com/en-gb/game/rainbow-six/siege/news-updates/6nDqxITrS6tFdhjFkmVnrZ/dev-blog-level-design-kafe), [Map Buff Philosophy](https://www.ubisoft.com/en-us/game/rainbow-six/siege/news-updates/6JguYEHgWGjfPAWrdE7SFW/dev-blog-map-buff-philosophy), and [Kanal rework / Ember Rise](https://www.ubisoft.com/en-ca/game/rainbow-six/siege/news-updates/seasons/emberrise). These discuss removing a superior spawn, consequential connectors, and alternate rotations. Siege's destruction, rappel, and information systems limit direct transfer.

## Practical review questions: synthesis, not universal rules

### Additional granular before/after studies

**Read:** Joey Simas / Riot, [Deep Dive Into Icebox 4.04 Changes](https://playvalorant.com/en-us/news/game-updates/deep-dive-into-icebox-4-04-changes/), 2022.

Widening Green was intended to support a coordinated push. Other changes adjusted entry visibility, weakened an overly comfortable Yellow hold, blocked a stray sightline with boxes, and removed a feet-only shot through a doorway. Particularly useful for tracing several small edits to different tactical problems.

**Read:** Riot, [Patch Notes 6.11: Pearl B](https://playvalorant.com/en-gb/news/game-updates/valorant-patch-notes-6-11/), 2023.

Shorter cover and a jump-up made one attacker position more committed; removing a cubby reduced post-plant options. Defender changes added protected working space and repositioning options. These demonstrate why adding and removing cover can both improve counterplay, depending on ownership and round phase.

**Read, PDF text:** Benjamin Bauer, [Ben's Small Bible of Realistic Multiplayer Level Design](https://benb-design.net/Articles/benb_article02.pdf), 2004, printed pages 13–14 and 25–26.

Discusses crates creating different emergence points, the effect of enemy viewing distance, cover that permits circulation versus stopping, and hallway traffic. Diagram screenshots were unavailable. Treat categorical prescriptions as historical cross-game heuristics.

### Blockout evaluation

For a proposed corridor, corner, crate, or vantage point, specify the intended encounter before choosing dimensions. Then examine:

1. **Approach:** what can each team see before committing, and where can each prepare utility?
2. **Clearing:** which threats become visible together? Can movement separate those checks?
3. **Body exposure:** compare standing, crouching, and moving viewpoints from both sides. Include feet, weapon protrusion, elevated views, and gaps.
4. **Team access:** can teammates pass, follow, support, and punish the first player's killer?
5. **Commitment:** how long is the occupant exposed while reaching or leaving the position?
6. **Counterplay:** what can an opponent do after learning the position is occupied?
7. **Ownership:** who benefits from the object during the approach, site take, post-plant, and retake?
8. **Information:** what can the occupant learn without shooting, and what does movement reveal?
9. **Alternative plans:** does this detail support an additional useful choice, or make one existing choice universally superior?
10. **Verification:** distinguish visible cover, actual collision, navigation clearance, and bullet/grenade behavior. Inspect compiled geometry and verify gameplay in the intended engine.

A useful controlled blockout exercise is to change only one property at a time: doorway width, corner shape, crate position, crate height, or fallback distance. Compare entry/trade success, exposed travel, utility investment, defender survival, and available follow-ups. These are proposed evaluation measures, not results established by this research.

## Research coverage

Sixteen separate researcher assignments covered: designer talks; defaults; Inferno/Banana; Mirage; Nuke; rotations/fakes/lurking; utility geometry; plants/retakes; trading/crossfires; sound/readability; VALORANT postmortems; Siege circulation; corridors/thresholds; crates/ducking cover; vantage points/perspective; and granular counterexamples. Overlapping recommendations were consolidated. This is a literature and viewing guide, not sixteen independent playtests or sixteen independent confirmations of each claim.
