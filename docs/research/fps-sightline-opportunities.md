# Deliberate sightlines between combat spaces

Research revisit: 2026-11-09. The question is whether the existing library supports
creating useful shooting and support relationships between neighboring spaces or
levels, rather than enclosing every route behind full-height walls. **Yes, with
important limits.** The transferable target is selective tactical interaction, not
maximum visibility or a mandatory low-wall feature.

## Coverage and evidence

Screened the annotations for all 99 works in the [source index](fps-source-index.md):

| Corpus | Works | Relevant material found |
| --- | ---: | --- |
| [Original guide](fps-strategy-and-combat-geometry.md) | 40 | Cover, boosts, crossfires, cross-space utility, post-plant views, Cache's added window and Split's overwatch revisions. |
| [Geometry expansion](fps-expansion-geometry.md) | 18 | Position/attack graphs, cover height and facing, overlooks, partitioned information and commitment. |
| [Tactics expansion](fps-expansion-tactics.md) | 18 | Angle isolation, trades, separated support, crossfires, changing ownership and resource costs. |
| [Developer studies](fps-expansion-postmortems.md) | 18 | Windows and lowered walls that open fights, alongside closed views/routes that make fights manageable. |
| [Additional theory](fps-principles-and-evidence.md#five-additional-sources-for-the-abstraction) | 5 | Individual/team choices, counterplay and testing intended behavior. |

Selected relevant originals were reopened; the strongest directly inspected cases
are below. Screening the library does not mean rereading all 99 full publications,
watching the located videos or finding 99 independent confirmations. The Halo
Catalyst/Breaker page timed out during this revisit and remains annotation-only.
No prototype geometry or target-engine gameplay was tested. Historical practitioner
accounts and developer explanations establish mechanisms and intent, not measured
competitive outcomes or current CS2 dimensions. The
[earlier elevation revisit](fps-elevation-and-visibility.md) covers related transitions.

## Direct evidence and counterexamples

| Original source rechecked | What it actually describes | What transfers / what does not |
| --- | --- | --- |
| Riot, [Icebox 8.0](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-8-0/), 2024 | A new B Tube window overlooks Mid toward A/defender spawn, giving Mid control influence over rotations. The same patch blocks an attacker-spawn view and moves a hanging container to reduce simultaneous ground/elevated fighting complexity. | Deliberately add a view with a territorial consequence while limiting unrelated exposure. Neither opening every wall nor sealing every platform follows from this example. |
| Carney/Garrozzo, [The Creation of Split](https://playvalorant.com/en-us/news/dev/the-creation-of-split/), 2020 | An overly powerful central observation tower was replaced by site-focused overlooks. Their links to the sites were then strengthened, while excessively porous Mid connections were simplified. | Bounded overwatch and usable follow-up can make upper/lower spaces interact. A panoramic perch or more connections is not automatically better. |
| Volcano/FMPONE, [Cache redesign interview](https://www.hltv.org/news/28102/volcano-on-updated-cache-we-wanted-to-put-a-little-bit-more-importance-on-utility-and-give-players-more-creative-ways-to-use-their-tools), 2019 | The designers explain a new Mid window as another defender peek that asks attackers to allocate attention or utility; another view over New Box adds defensive flexibility. They explicitly leave competitive effects for further play. | A firing connection can change options and resource use without adding a movement corridor. This is primary designer testimony about historical CS:GO, not proof the change achieved balance. |
| Riot, [Pearl 5.06](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-5-06/), 2022 | A B Main wall was lowered so it could no longer fully hide a player. B Link boxes were moved to reduce simultaneous angles and close a difficult view toward B Hall. | Wall height can selectively expose a player; another view may need closing. This does not prescribe waist-height dimensions or universal open edges. |
| Joey Simas, [Icebox 4.04 explanation](https://playvalorant.com/en-us/news/game-updates/deep-dive-into-icebox-4-04-changes/), 2022 | A changed exit improves clearing/support below a raised container; the upper doorway shifts to improve defender visibility over an approach. A stray view and awkward feet-only shot are removed, and one half-cover feature becomes full cover. | Inspect both bodies, approaches and supporting players. Useful cross-level combat differs from an accidental tiny-body exposure. Full and low cover both have roles. |
| Ben Bauer, [Small Bible](https://benb-design.net/Articles/benb_article02.pdf), 2004, printed pp. 14 and 33–34 | Discusses firefights across different heights, changed views over/under obstacles, half/full cover and support positions. | Direct historical support for cross-level fights and mixed cover. Its categorical praise of height, feet-shot examples and sweeping overlook advice are personal heuristics; later developer examples give reasons to reject some such relationships. |
| Andrew Yoder, [Door Problem](https://andrewyoderdesign.blog/2019/08/04/the-door-problem-of-combat-design/), 2019 | Models positions partly through what they can attack; evaluates how thresholds, footholds and layered hidden information change the incentive to enter an arena. | Assess relationships and alternatives rather than doorway width alone. The worked case is PvE, so monster behavior and forced solutions are not competitive-PvP prescriptions. |
| Level Design Book contributors, [Cover](https://book.leveldesignbook.com/process/combat/cover) | Distinguishes low/tall cover, facing, solidity and height advantage by attack angle. | A low barrier can allow a shot while limiting body exposure; its effect depends on mechanics and relative height. Example game metrics are not universal standards. Some other examples derive from Yoder and are not independent evidence. |
| Ubisoft, [Kafe design](https://www.ubisoft.com/en-gb/game/rainbow-six/siege/news-updates/6nDqxITrS6tFdhjFkmVnrZ/dev-blog-level-design-kafe) and [Skyscraper rework](https://www.ubisoft.com/en-us/game/rainbow-six/siege/news-updates/seasons/neondawn) | Kafe deliberately uses multi-floor relationships, windows and exterior approaches, but rejects an overly safe roof spawn. Skyscraper adds an interior bridge while removing exterior positions to reduce camping. | Architecture can connect combat across levels while other edges deliberately isolate/protect. Siege's destruction, rappel and information systems limit direct transfer. |

## Design synthesis for the skills

The following is our inference from those cases, not a quoted universal rule:

- Design movement and observation/firing/support relationships separately, together.
  Neighboring platforms can interact across a gap without a walkable connection;
  connected routes can deliberately remain visually isolated.
- Look for missing useful interaction as well as excessive exposure. An opening,
  lower parapet, balcony edge or staggered screen may let control of one space affect
  an approach, rotation or teammate's fight. Choose an actual consequence rather
  than adding a picturesque view that has no reachable targets or useful timing.
- Bound that influence with full-height architecture, offsets, restricted apertures
  or other appropriate geometry. Preserve protected travel/preparation where useful.
  Check attention costs, spawn exposure and whether one hold dominates unrelated
  territories. A powerful committed hold can be intentional; equal duels everywhere
  are not required.
- Inspect both sides at real relative floor/eye/body heights, including approaching,
  standing, crouching and following players. Check usable target exposure, lateral
  choices, access/exit, control reversal and feasible counterpressure. A late flank
  or a ray over an empty floor is not adequate evidence.
- Verify compiled geometry and intended-engine mechanics separately. An optical
  opening does not prove bullet passage, penetration, utility behavior, a viable
  trade or an actual combat advantage.

For an oil-rig/platform proposal, compare the intended relationships with the actual
enclosure: which platforms should contest or support one another, through what
bounded views, and which should stay isolated? Lowering a selected barrier is one
candidate, not a blanket repair. The actual oil-rig prototype was not inspected or
tested during this source revisit; its geometry findings remain open.
