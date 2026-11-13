# From FPS map examples to transferable design principles

Research date: 2026-11-08. Working synthesis; no new gameplay experiments were performed.

## Evidence library

- [Original research guide](fps-strategy-and-combat-geometry.md)
- [Geometry expansion](fps-expansion-geometry.md)
- [Tactical expansion](fps-expansion-tactics.md)
- [Developer postmortem expansion](fps-expansion-postmortems.md)
- [Deduplicated source index](fps-source-index.md)

The annotations distinguish inspected text from located video descriptions. Different pages from one publisher, or papers from the same study, are not independent confirmations. Historical cases establish useful mechanisms and intentions, not current CS2 dimensions or proof of an optimal layout.

## Five additional sources for the abstraction

### T01. Designing Yomi — David Sirlin, 2014

[Original article](https://www.sirlin.net/articles/designing-yomi). Text inspected, particularly counters, hidden simultaneous decisions, and unequal payoffs. Explains why alternative moves need different consequences and contextual reasons to choose them. This is game-design reasoning from a competitive card/fighting-game designer, not an FPS map experiment. Transfer: geometry should offer decisions that can be valued and anticipated, rather than interchangeable paths or pure guesses.

### T02. Counterplay and Teamplay in Multiplayer Game Design — Tom Cadwell, GDC 2013

[Official session page](https://www.gdcvault.com/play/1018273/Counterplay-and-Teamplay-in-Multiplayer). Official abstract inspected; complete talk not reviewed. Defines the scope as creating gameplay for an actor's opponents and teammates. Transfer question: what can other players meaningfully do in response to someone occupying or using a map feature?

### T03. Decisions That Matter: Meaningful Choice in Game and Level Design — Matthias Worch, GDC 2014

[Official session page](https://www.gdcvault.com/play/1021073/Level-Design-in-a-Day). Official abstract inspected; complete talk not reviewed. Connects choice with possibility space, agency, motivation, and level design. Useful conceptual viewing recommendation, not support for an attributed numerical rule or specific geometry prescription.

### T04. Spatial Principles of Level-Design in Multi-Player First-Person Shooters — Christian Güttler and Troels Degn Johansson, 2003

[Paper](https://svn.sable.mcgill.ca/sable/courses/COMP763/oldpapers/guttler-03-spatial.pdf). Inspected text, including tactical choice, encounter locations, map experiments, and concluding heuristics. Distinguishes individual and team opportunities and connects encounter locations to objectives. An early analytical/practice study of Counter-Strike; not controlled proof that its heuristics generalize to every modern FPS.

### T05. The Science of Level Design — Kenneth Hullett, 2012

[Dissertation PDF](https://escholarship.org/content/qt1m25b5j5/qt1m25b5j5.pdf). Inspected abstract, contents, and selected study/conclusion text; not all 300 pages. Develops FPS design patterns and studies player behavior. Primarily single-player FPS evidence: useful for treating designer intention as a testable hypothesis, not as proof of competitive strategic depth. Related papers from this project should not be counted as independent experiments.

## A provisional central principle

**Create legible spatial advantages that become better or worse as players act, with feasible ways for opponents and teammates to influence those changes.**

This is our synthesis across the library, not a quotation or an experimentally established law. It is intended for multiplayer combat maps. It does not claim that every decorative detail, connector, or introductory space must independently create a tactical dilemma, or that combat principles cover every kind of interesting map.

A good position changes what a player can do: see, conceal, shoot, delay, support, move, or complete an objective. Its cost can be exposure, time, utility, noise, attention, lack of escape, or leaving something else undefended. Its value can change with enemy approach, teammate location, equipment, information, and objective phase. Counterplay can happen locally or elsewhere on the map.

For example, a defender may dominate a corridor entrance while being vulnerable to coordinated utility. Alternatively, opponents may bypass that defender and exploit the manpower committed there. A counter need not be another doorway into every room.

Legibility means consistent collision, recognizable routes, and understandable cover behavior with feedback that permits learning. Uncertainty about an opponent can support strategy; unreliable environmental behavior undermines deliberate planning. Feasibility means that a response works with the actual player count, movement times, information, equipment, and time remaining. A flank arriving after the objective resolves is not an adequate response.

## Distill into four practical principles

### 1. Different options should change different things

Give alternatives distinct consequences rather than merely different shapes. A route might improve concealment but worsen arrival time; a crate might protect from one entrance while exposing another. A central connection should have a consequential destination. Two options need not be equally good in every state: deciding which is useful now is part of mastery.

### 2. Let players manage exposure deliberately

Useful decisions include selecting a sightline, choosing a peek height, timing an exposed crossing, or coordinating a supporting flash. A corner or crate can separate threats into manageable checks. Too many unrelated angles visible at once can remove agency instead of adding depth. Conversely, an open crossing can be intentional when players have meaningful tools for managing it.

### 3. Keep strong options from being best in every relevant situation

Consider reaching, occupying, using, and leaving a position separately. A strong recess may be worth using despite having no safe exit. A vantage point might require a teammate boost. A safer path may consume round time. Costs should connect to intended play rather than arbitrary inconvenience.

An advantage need not charge a new acquisition cost every time it is used. The cost may be conditional, or arise from attention and coverage committed away from another threat. Evaluate the whole encounter before adding a penalty to an otherwise useful preparation space.

Do not make every retreat easy: doing so can erase the cost of taking a strong position. Also do not make every position a trap: doing so can remove opportunities to adapt after contact.

### 4. Let actions change the next decision

Territory, utility use, casualties, observed movement, or the objective should change which spaces matter. Local decisions gain strategic importance when they affect later opportunities or other players. This can happen around a single crate as players switch sides, or across the map when pressure changes defensive allocation.

Not every duel must become a long sequence. The map should permit adaptation over rounds and across encounters, including punishing predictable habits.

### Enabling condition: leave time and attention for decisions

Preparation, travel, and reset spaces give the consequential encounters rhythm. Constant fresh angles can overwhelm communication instead of deepening it. The number of choices matters less than whether players can perceive, execute, and reconsider them. A static puzzle with an obvious answer in each state can still be rote; opponents must have opportunities to change those states through their own actions.

## Evidence checks on the proposed principle

| Case | Why it supports or constrains the synthesis |
|---|---|
| [Yoder: Door Problem](https://andrewyoderdesign.blog/2019/08/04/the-door-problem-of-combat-design/) | Widening a threshold alone can preserve the incentive to remain outside. Evaluate comparative options, not dimensions in isolation. |
| [Fracture 5.07](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-5-07/) | Removing a path was intended to make a route more usable by reducing competing threats. Choice count can increase while actionable choice decreases. |
| [Lotus / Icebox 8.0](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-8-0/) | A longer door cycle supports preparation, combat, and traversal. A nominally available route needs a feasible action sequence. |
| [T-Side Isolation](https://dignitas.gg/articles/t-side-isolation-how-it-applies-to-clutches-and-entry-fragging) | Geometry and utility offer different ways to reduce active threats. Not every angle needs to be individually clearable without teamwork. |
| [Halo and Inflexible PvP](https://andrewyoderdesign.blog/2017/12/28/inflexible-pvp/) | Access, respawns, and items can reinforce one territory until alternatives lose value. Identifiable costs alone do not prevent dominance. |

These are analytical examples and developer intentions, not a validation study of the principle.

## A small design worksheet

For each consequential position or transition, complete these statements:

| Question | What a concrete answer contains |
|---|---|
| Why go here? | A specific capability or objective benefit |
| What do I give up? | Exposure, time, utility, sound, attention, or coverage elsewhere |
| What can my teammate do? | Support, trade, watch a different route, or exploit the pressure |
| What can the opponent do? | A feasible displacement, isolation, punishment, wait, bypass, or exploit elsewhere, within real time/resource constraints |
| What changes its value? | A plausible change in approach, information, equipment, support, or objective state |
| What happens next? | A useful advance, retreat, hold, regroup, or deliberate terminal commitment |

Use these answers to compare variants; do not require identical answers for every feature.

## Applying the principle to microgeometry

These are design hypotheses derived from the literature, not universal construction rules:

| Feature | Decision to create | Failure to investigate |
|---|---|---|
| Narrow hallway | Timing and coordination of entry versus waiting or using utility | Unavoidable serial deaths with no meaningful response |
| Bend or doorway | Select how and when to reveal an angle | Several incompatible threats exposed simultaneously |
| Freestanding crate | Change protected side as threats move | A position that protects every relevant direction at negligible cost |
| Wall recess | Concealment or surprise in exchange for commitment | A hiding check with no useful counter or consequential reward |
| Crouching cover | Trade concealment, vision, and peek options | Camera/body mismatch, unintended feet/head exposure, misleading protection |
| Elevated perch | Gain a sightline while paying access/exposure/support costs | Unchecked control over all useful approaches |
| Gap between cover | Choose when and how to cross | Exposure with no viable tool, timing, or alternative |
| Support pocket | Help a teammate while sacrificing direct presence elsewhere | Utility support that is always free and universally effective |

## Testing whether the principle helps

Before a playtest, write a prediction such as: widening this doorway will permit paired entry and trading; moving this crate will make a fallback punishable; shortening this wall will make a safe hold more committed. Compare one change at a time where practical.

Observe behavior, not only kills or side win rate. Do players use different plans against different setups? Can they explain a position's advantage and weakness? Does learning the opponent change their next choice? Can coordinated players recover from disrupted setups? Which options are unused, and is that because they are dominated, undiscovered, mechanically awkward, or intentionally situational?

Most importantly, can opponents alter the situation enough to force reconsideration? Look for changes caused by timing, deception, coordination, and repeated-round adaptation rather than only alternative solutions to an unchanged setup.

Compare players of similar skill and equipment, and inspect more than one round phase. Record unexpected adaptations and explanations alongside footage. A larger number of routes, more even route usage, longer fights, or more choices is not automatically evidence of a better map.

The principle would be weakened if maps satisfying these questions repeatedly produced rote play, unreadable guessing, or less enjoyable encounters. It would need revision if the useful choices existed only on paper and were unavailable under real movement, visibility, and timing constraints. That distinction is why the source library is evidence for hypotheses rather than a substitute for playtesting.
