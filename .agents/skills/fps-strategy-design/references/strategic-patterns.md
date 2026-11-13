# Strategic patterns and counterexamples

Use these to compare a specific design, not as a checklist of features every map
must contain. The useful unit is a relationship among advantage, cost, information
and feasible response. Names and familiar layouts are examples, not templates.

## Territory that preserves options

A contested area is strategically valuable when control changes what a team can
do next. Mid connecting to two objectives can preserve several attack destinations;
a forward choke can provide warning time without being the objective itself. Check
which connections can actually be used after taking control and what the opponent
can infer. A center arena without useful follow-ups does not reproduce this effect.

**Counterexample:** excessively powerful central control can make the objectives and
other routes irrelevant. Additional connections can exceed the defenders' attention
capacity. Compare gaining control with conceding, retaking or bypassing it; removing
a connection may restore meaningful alternatives.

## Rotation and commitment

Compare attackers' regrouping and approach time with defenders' detection, delay,
reinforcement and setup time. Include clearing, movement exposure, utility and
uncertain information, not only centerline running distance. Distinguish safer rear
circulation from contested shortcuts. Where the objective changes ownership, review
the same routes with the roles reversed.

**Counterexample:** very fast safe rotations can neutralize an attacker's choice;
very slow ones can make every site loss terminal. There is no universal correct
rotation duration. Stacked sites can be close in distance while their connections
are constrained, exposed or noisy.

## Elevation that changes a decision

Flat maps are valid. When comparing elevation options, consider their scale: a
gradual grade across a corridor, district or objective approach, a local step/crest,
or a stacked route. A broad rise can make higher and lower territory strategically
distinct, while a small landing or cover position changes the local fight. A crest
can delay information; a raised pocket can support a lower approach; a lower lane
can trade visibility for a committed exit. Give the affected spaces/connections
stable IDs and explain what changes when a team gains, concedes or retakes them.

Inspect a sustained grade along its full length, including intermediate sightlines,
support, exposure and the cost of returning uphill or reversing objective ownership.
Relate microfeatures to that larger approach instead of assuming elevation must be
an isolated bump. Compare the flat alternative; no node needs a height feature and
no number of rises establishes strategic interest.

Compare access and exposure, not just the view from the top. Can a follower support
the ascending player before the defender withdraws? Can the occupant switch levels,
retreat or rejoin the objective within useful time? Is a drop reversible by ordinary
movement, a teammate action or a long detour? Review the same position after
objective ownership changes; a helpful defensive ledge can become a post-plant
lockout if its approaches no longer offer a feasible response.

**Counterexamples:** uniform height noise adds movement and clearing costs without
meaningful choice. Multiple simultaneous high/low checks can overload an entry's
attention and prevent support. A dominant upper territory can make lower routes
irrelevant. Flatten or simplify when that restores readable, contestable decisions;
stairs in every room and height alone do not establish interesting strategy.

The [elevation research revisit](../../../../docs/research/fps-elevation-and-visibility.md)
includes developer examples of both adding small peeking ledges and flattening
overloaded vertical fights. It supports comparing relationships, not a height quota.

## Information and deception

Consider what a team can learn without firing and what its own actions reveal.
Useful probes have interpretable consequences: a sightline, sound, missing resource,
enemy utility or abandoned position. Pressure can conceal a different destination
when the observer cannot verify it cheaply. Lurking needs both access to information
and a timely way to act on it.

**Counterexample:** unclear collision or unreadable environmental cues do not create
productive opponent uncertainty. Nor does a distant peripheral route create a useful
lurk if the player cannot contribute before the encounter ends. Opponents should be
able to investigate or punish predictable deception at a plausible cost.

## Team support and population

Compare how players cover separate threats versus supporting the same fight. A
position can enable a flash or overwatch without placing the support beside the
entry; moving that player may abandon information or coverage elsewhere. Simulate
plausible decisions in prose or diagrams, labeling them as hypotheses.

At low population, examine unavoidable coverage gaps, information scarcity and how
an individual can change plans. At higher population, examine throughput, body
blocking, grenade concentration, redundant coverage and communication burden. For
asymmetric populations, include the actual compensating objectives, equipment,
reinforcements, time or terrain if specified. Do not invent compensation or force
equal winning chances when the brief asks for a different experience.

**Counterexample:** a 25v5 stress failure does not invalidate a map intended only for
2v2. Stress findings should identify the supported population boundary, not silently
expand it. Compare coordination assumptions as well as head counts.

## Mode changes the meaning of space

| Mode relationship | Questions that change layout decisions |
| --- | --- |
| Round-based attack/defend | Where can teams prepare, probe, commit, delay and retake? What changes after casualties or planting? |
| Arena with pickups/respawns | How do resources, respawn positions and access reinforce control? Can a losing player recover or trade one resource for another? |
| Moving objective/control points | How does the front move? Where can teams stage, regroup, flank or change spawns without making the next phase trivial? |
| Movement-heavy FPS | Which jumps, boosts or alternate movement routes depend on skill, equipment or commitment? What remains viable without them? |

Do not import a mode's familiar lane count, dimensional scale or balance target
without demonstrating its relevance to this brief.

## Evidence to consult when useful

The following are selected mechanisms from the repository's
[research synthesis](../../../../docs/research/fps-principles-and-evidence.md), not a
requirement to load the full source corpus. The
[source index](../../../../docs/research/fps-source-index.md) records access limits.

- [Cache designer interview](https://www.hltv.org/news/28102/volcano-on-updated-cache-we-wanted-to-put-a-little-bit-more-importance-on-utility-and-give-players-more-creative-ways-to-use-their-tools): another mid angle creates an allocation decision, potentially affecting resources later in the round. Designer intent, not proof of achieved balance.
- [Creation of Split](https://playvalorant.com/en-us/news/dev/the-creation-of-split/): an overly important tower and overly connected mid required revision. Primary developer process account.
- [Halo and Inflexible PvP](https://andrewyoderdesign.blog/2017/12/28/inflexible-pvp/): geometry, items and respawns can reinforce one dominant territory. Qualitative designer analysis, not a population study.

Historical geometry and mechanics need rechecking in a current target game. Reused
examples or multiple pages by one author are not independent confirmation.
