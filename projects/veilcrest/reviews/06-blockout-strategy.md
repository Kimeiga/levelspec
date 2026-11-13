# Independent compiled blockout strategy review — r09

**Verdict: accepted as a geometry blockout for engine integration and 5v5 playtesting.** No supported strategy defect requires a geometry repair before this handoff. Competitive balance, combat timing, trading, utility, audio and ten-player body blocking remain untested. This verdict covers the compiled revision below and does not replace the independent spatial/visibility or architectural scopes.

## Revision, evidence and limits

Reviewed source SHA-256: `d7bf3349943fbda2fbeef4fcc519b4adf8feb359d3c9da186161bcdbe599de24`. I first inspected actual PNGs in `generated/veilcrest/capture-r09/`, then source `level.aml`, the playable build report and `walk-r09b/report.json`, followed by the current design rationale. The source hash matches the capture manifest, movement report and stance report. The capture manifest reports no browser errors.

Actual views inspected include both new A entries and the north hold; garden crest; the sealed old A south arch; Library south/north ring; Music south/north; B south entry, north anchor, cellar entry/reverse; service flight in both directions; vault middle descent; cellar middle descent/reverse; Cellar north/south; Carriage spawn, opposing court diagonal views and the central pavilion corner; foyer screen and reverse hall view. I also inspected actual standing/crouching helper captures for B-CHEST, MUSIC-PIANO and CELLAR-LOW-RACK. Their metadata identifies grounded supported bodies with unchanged radius .30 m, 2 m standing/1.1 m crouching heights and the appropriate helper states. These are real posture views, not evidence of projectile or multiplayer behavior.

The build passes playable validation with no diagnostics, no unreachable authored regions/markers and zero uncovered sampled floor positions. All 52 performed directed one-body checks in the movement report pass. Movement follows existing eroded land navigation with bounded physical support/capsule checks at 1/120 s, not a continuous collision proof. No shooting, grenades, economy, audio, plant/defuse rules or multiplayer round was simulated.

## What the actual geometry establishes

The expanded estate supplies distinct territories rather than just longer versions of the old corridors. Garden/Orangery/Music can pressure A west or continue to Gallery/Carriage; Pump/Wine/Cellar can pressure B east or climb the separate rear stair. Actual opposing views show that taking each room still leaves another threshold and corner before a rear cutoff. A player continuing to rear territory loses immediate plant support. Five defenders cannot watch all these spaces persistently; they can choose to defend forward wings or concede them and watch their exits.

The old direct Hall→A south arch is physically sealed in its actual view. Library south entry and opaque core force the Hall group to clear a new threshold before A east. The north/east library boundaries stay closed. The ring does not become an unearned passage into Staff Court. Its 19.93 s performed long-ring traversal is an optional clearance/lurk commitment; it is not the quick A approach.

A has garden south, music west, library east and staff north frontiers. The sculpture hides portions of the plant floor, while the broad arches give entry groups edge choices. Music-to-A and Library-to-A views show real opposing exposure through the room; neither new entry is a free safe staging position. Two CT can make a crossfire and leave the north retreat available, but a lone anchor cannot be assumed to control four cardinal fronts. Library ownership does not establish Music information, and vice versa.

At B, the actual north-anchor view from `[90,66,0]` confirms the retained strong hold: west service, south drain and east cellar entry centers lie in about a 76° sector. Adding the east door did not remove that compact entry watch. The cistern hides portions of the plant footprint, so the anchor still cannot see every plant-side action from the same point. This is a deliberate strong position to test, not a claim that door count supplies counterplay. In a 5v5 take, shifting entry edges and a teammate's pressure can challenge the anchor's task allocation; actual smoke/flash effectiveness remains unknown. In low utility, this hold may persist too well and should be a first playtest target.

Vault middle-descent views establish actual higher observation into B and over the low chest. The chest's crouched view supplies level-side visual refuge but no guarantee against upper north eyes. Service-top/reverse captures show the flight is a reversible exposed approach, with tall side walls withholding unrelated threats. The cellar middle view shows exposure through its arch and sight over/around the wine racks; the new climb is not concealed. Those stairs provide return routes, not a promise of safe retreat under fire.

Opposing Carriage Court images show the central service pavilion interrupts the previously identified end-to-end diagonal. The court now has intermediate building corners and 3 m passing aisles. Shorter rear lanes remain, especially after an attacker earns a wing exit. The spawn view is a defined staging pocket beside Rear Hall, not universal concealment after rear control is lost.

## Measured single-body route results

All times below are **performed fixed-waypoint inspection walks** at the harness settings. They exclude clearing, combat, team interference and target-engine movement differences. They are not shortest-path proofs or observed match timings.

| Route | Seconds |
| --- | ---: |
| T front → Library → A | 26.24 |
| T west Garden → A | 30.93 |
| T Orangery → Music → A | 39.93 |
| CT Rear Hall / Staff Court → A | 13.28 |
| T Drain → B | 23.62 |
| T Pump / Wine / Cellar → B | 37.08 |
| CT Staff Court / Vault stair → B | 20.98 |
| CT outer Carriage / Cellar route → B | 41.16 |
| Hall / Pantry → B | 10.86 |
| A ↔ B via Staff Court, forward route | 25.47 |
| Music-region → central CT rear pocket | 22.41 |
| Cellar-region → central CT rear pocket | 32.13 |

Five T spawn-offset checks to the common B plant point range **20.62–23.62 s**; five CT offset checks range **20.21–20.99 s**. Near-equal plant-point times do **not** establish CT-first setup. T reaches the inside-south waypoint `[90,49,0]` in **13.22–16.23 s**; CT reaches the north flight top `[82,81,3]` in **12.06–12.84 s** and the inside-north waypoint `[82,67,0]` in **16.18–16.96 s**. First contact can happen during the CT descent, with the fastest T already inside the southern apron. No uncontested B setup interval is claimed. A has a much clearer defender preparation interval on these performed routes.

A plausible 2 A / 2 B / 1 flex CT default can therefore set A earlier, meet the fast B contact from north, and choose whether its fifth player invests in an outer wing or Library. A CT assigned down the full outer-cellar route cannot be counted as an immediate B anchor: its performed 41.16 s route is substantially later. A 1 A / 1 Music / 2 B / 1 Cellar allocation buys wing information while giving up interior pressure; it must not be described as five players simultaneously holding all room frontiers.

T may begin 2 Garden/Orangery, 2 Hall/Library and 1 Drain, then concentrate. Direct Garden and Library routes differ by about 4.7 s; Music commitment adds nearly 14 s relative to Library. A synchronized take must wait/stage or deliberately stagger pressure. At B, an outer-cellar pair is about 13.5 s behind the ordinary Drain path. An early solo Drain contact is information/pressure, not proof that the later flank is already trading it.

## Post-plant and casualty tests

**2v2 A:** a Garden/Music-side attacker plus a Library-side attacker can separate retakers' attention, but neither sees the whole room through the sculpture. CT already near north and Library can attempt a split and isolate one side. If the Library retaker is still on B, the 25.47 s site rotation is a real cost before clearing; the pair cannot assume simultaneous entry. A T who instead took Gallery/Carriage may cut Rear Hall reinforcements, but leaves a site-side teammate carrying more plant defense.

**2v2 B:** T cistern/drain and cellar-side positions can watch the plant and challenge the north descent. CT staged near north/service can split those tasks; a CT in Music or the distant Carriage east end is not immediate support. The north anchor `[90,66,0]` is strong against the three T frontiers but must change its task if a retaker comes through the north stair or forces the objective. Actual exchange/trade success remains unknown.

**Low-utility 1v2:** the remaining player must choose an attainable entry or objective tap rather than tour the enlarged wings. Under the provisional 40 s planted clock, the 25.47 s site rotation leaves about **9.5 s after a kit defuse** or **4.5 s after a no-kit defuse** for all additional clearing, assuming rotation starts exactly at plant completion and nothing delays it. That is intentionally tight, not generally safe. A 41.16 s outer-cellar return already exceeds 40 s before defusing. Outer-wing flanks are pre-plant investments or early information responses, not credible universal late-retake counterplay. A defender may need to rotate on trustworthy contact before the plant, retain a nearby teammate, or save; the harness does not simulate those decisions.

## Retained playtest targets

1. Fastest T Drain arrival against CT descending north: compare spawn assignments and a deliberate CT concession of the southern apron. Do not assume the compact B anchor is already occupied at round start.
2. B `[90,66,0]` anchor persistence against coordinated entry edges, one smoke/flash assumption, then no utility; include partial plant sight loss around the cistern and north-stair retakes.
3. A Library/Garden and Library/Music synchronization, with CT north retreat and one isolated anchor after a casualty.
4. Wing infiltration versus site support: whether T can cut Rear Hall cheaply after CT concede Music/Cellar, and whether CT's forward wing investment exposes a site too long.
5. Late 2v2 and 1v2 kit/no-kit retakes from named actual positions, including choices that sensibly fail the clock. Five-body threshold traffic, player blocking, communication, utility, weapons and acoustic information require the target engine and actual players.

These are qualified risks and hypotheses retained for play, not unresolved observed structural defects. The actual geometry and measured one-body routes support handing off this revision for the next integration/playtest stage.

## Focused r09 long-lane adjudication — retain with explicit playtest risk

**Verdict: intentional long-lane risk for playtesting; no geometry repair required by this evidence.** I independently inspected the completed `visibility-r09b/report.json`, then generated and visually inspected source-matched opposing captures in `generated/veilcrest/strategy-lanes-r09/` (`rear-hall-to-orangery`, `orangery-to-rear-hall`, `library-long-to-music`). A focused static-ray record over the delivered runtime mesh is retained at `generated/veilcrest/strategy-lane-rays-r09.json`. All evidence uses the same r09 SHA-256 above. This verdict does not follow from the longest-distance number alone or a need to finish the project.

The 77.83 m Rear Hall `[60,90,3.01]` to Orangery `[-9,54,3.01]` standing-eye line is real. The actual views show a nested aperture through Staff Court, A north, A west and Music south rather than an uninterrupted broad corridor. It is also **available very early to CT**, near their initial rear staging route; calling CT's occupation of it “earned” would be misleading. CT can invest a scoped watcher here with little travel cost and reverse into rear cover. The cost is assigning one of five defenders to a narrow west watch that supplies neither Garden-south nor Library-east A information/support.

Focused rays sampled three positions across each A entry, at standing/low optical eye combinations. From the exact Rear Hall hold, every Garden-south and Library-east sample was occluded for every tested height combination. Music-west was only partially visible, while Music-south's three sample positions were visible to a standing observer against either target eye height. The actual opposing captures agree that this is a serious early Music/Orangery denial lane; it is not full A-frontier coverage. The same observer cannot preserve this line and simultaneously solve A's other live entries. Garden and Library are timely alternative pressure, not a hypothetical late outer flank: their performed approaches reach A in about 30.93 and 26.24 s versus 39.93 s through Music. A T west pair can therefore stage while teammates contest those unobserved fronts, forcing the CT team to spend more defenders or alter its setup. Smoke/flash may also change the lane, but this acceptance does not rely on unimplemented utility behavior. Once A is planted, the rear watcher must still enter/reassign to affect a defuse; the long line does not confer objective control by itself.

The 75.24 m low-eye Library `[75,78,3.01]` to Music `[0,72,3.01]` line is likewise real. Its actual capture is strongly clipped by the core shoulder and the successive doorway jambs. Focused rays saw only the northern edge sample of A's Music-west entry and the northern edge of the Library/A doorway; Garden-south and all three Music-south samples were occluded from that exact hold. Occupying it requires Library control and a commitment into the north/east ring. It is useful as a crossfire against a particular Music/A-west movement, but does not watch the main Garden entry or the full plant floor. Taking or conceding Music and Library changes which team can exploit it. A remaining 1v2 player here cannot count the long optical segment as a way to cover the objective and all retake routes.

Retention is therefore supported by actual limits, credible same-round alternate pressure and manpower/plant costs. It is not a declaration that the lanes are balanced or harmless. **Highest-priority lane playtest:** one early CT scoped watcher at Rear Hall plus a site teammate, against coordinated T Library/Garden pressure with a delayed Music group; then repeat with low/no utility and swap skill/weapon assignments. Record whether the watcher can deny the entire west wing while retaining useful support elsewhere, whether entry-edge changes matter, and whether the other A fronts force a response within useful time. If players establish cheap persistent denial with no workable team response, a focused doorway offset or local architectural screen is warranted. The 3 m scan and selected portal rays are static optical evidence and do not establish projectile, head exposure, reaction-time or network-peeking behavior.
