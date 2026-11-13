# Switchback — design hypotheses

## Why this hill

A flat equivalent would turn the three streets into nearly interchangeable lanes. Here vertical movement spends time and exposes ascent, while level terraces offer recovery. The center route reaches +16 sooner than the B main climb reaches +20: Mid control buys a lateral A entry and a shorter final B climb. The defenders' +24 road is a rotation route, not a panoramic sniper platform: enclosing walls and the +32 headhouse bound its influence.

A has two attacking entries at the same height. Its central tank splits main and short views; one player cannot comfortably watch both and the CT arrival. B has a level main approach after the long climb, a short ascending side ramp, and a much shallower CT descent. The turbine occludes the plant from some entries and creates a close retake loop. A tests lateral separation; B tests coordinating crest timing with the main team. Neither site requires a bottom-of-stair duel as its only attack.

## Territory and plans

- **Default 2 Orchard / 1 Market / 2 Cistern:** outer pairs reach sheltered +8 landings; the mid player gathers crest contact. Five players can stage in A/B prep via adjoining landings; 4–5m connectors leave passing width. Defensive 2 A / 1 Valve / 2 B gives up passive vision deep into the lower map. Trade and utility efficacy need multiplayer tests.
- **A split 3 main / 2 Mid:** main pair preparation is hidden by the offset staging door; Mid must contest Valve before opening A's side. A defender can delay and withdraw up A-retake, but doing so surrenders plant control. If Valve is lost, CT must choose reinforcing A through the road or keeping B's short flank covered.
- **B split 3 Cistern / 2 Valve:** longer climb costs time; a quiet cistern landing supports a delayed commit. Valve's ramp exposes the last ascent, so it is a support lane rather than a superior replacement for main. Attackers can instead pressure A at equal elevation if that ramp is held.
- **Fake and rotation:** outer-to-outer T rotation via spawn is deliberately expensive because it loses both height and time. A false commit works best with retained Mid/Valve control. CT's high route is more dependable but cannot see across both sites. Both sides can use A–Valve–B once cleared; post-plant ownership changes which rotation is safe.
- **2v2 post-plant:** one player protects plant, one pressures a connector; abandoning a site for the high road costs the long climb. Retakers can split high route and Valve if they own both, but two bodies cannot cover every choke. Test whether the chosen plant becomes unreasonably defendable from one tank corner.
- **1v2:** defender must use cover to change the next duel; no magical flank or jump bailout. Bomb pressure and audible information are target-engine questions.

## Low-cover inventory

Every ID in layout-data.json maps to a native AML object. The top is its room elevation plus its height; all objects contact the room floor. `*-bench`, `*-bed`, `*-pump`, `*-low-*`, and `A-entry-low` are solid opaque 1.25m refuges. `M1-stall` is a 2.7m corner separator; `A-tank` is 3.2m; `B-turbine` is 3.6m; `V-divider` is 3.2m. Material colors do not establish penetration resistance. Destructibility, sound and grenade interactions remain unknown.

Low cover is spread across lower gates, landing turns, crest prep, both sites, Valve and retake staging. Stairs intentionally have no mid-tread obstacles; committing to a flight is a cost, mitigated by structural screens and clear landings. A tank supports switching main/short protection but exposes the occupant to the CT side; B turbine similarly trades main versus north protection. These predictions must survive actual standing/crouched and elevated views.

## Acceptance and remaining playtests

Verify every corridor with local max-distance routes and actual collision-aware traversal in both directions. Scan spawn areas, offsets, upper road versus lower rooms, sites and representative low cover. Capture opposing feet/eye views at stair toes, intermediate stations, crests, level staging and site fronts. Independently review full map plus A/B interfaces against the original drawing. No playtest balance claims follow from those checks.

Then run ten-player 5v5 sessions with matched equipment and swapped sides: compare 2/1/2 default against 3/2 splits, an early CT crest push, Valve loss, A and B retakes, 2v2/1v2 post-plants. Record first contact times, failed trades on stairs, simultaneous threat angles at crests, rotations that arrive too late, smoke-dependent choke monopolies, and reasons for unused paths. Prioritize whether the long Cistern ascent dominates the attacker's round clock and whether Mid becomes compulsory. Tune one relationship at a time.
