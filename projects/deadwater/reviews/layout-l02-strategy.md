# L02 independent strategy / player behavior review

**Verdict: accepted for blockout development.** No supported map-wide strategic defect requires rearranging this drawing before production. Compiled arrival, exposure and movement checks remain pending; this is not gameplay or balance acceptance.

Reviewed the L02 SVG visually and read brief.md / inventory.md before reading design.md. Evidence is the drawn arrangement, dimensions and provisional one-life 5v5 defusal assumptions. No multiplayer, utility, audio or weapon behavior was observed. Target timing estimates use 5 m/s without clearing, equipment or utility costs. The authoring harness uses different walking speeds.

## Raw spatial / strategic assessment

The attackers have two outer journeys with actual internal choices: Cargo–Sea Walk–West stair–A, and Cargo–Freight–Compressors–B. Valve and Pipe Bend form a lower attacking circuit between those journeys. O03/O04 let attackers enter Valve from different sides of the filter; O06 lets Freight reach Pipe without committing around the Compressor mass. These are useful changes of plan because they change which site entry can be pressured, not merely the next corner shape.

CT begins on the raised rear circuit. It can establish A via O14 and B via Control/SB, or concede a site and stage a retake behind those thresholds. A site's rear loss threatens the other site through the same circuit. CT cannot teleport a flex player into Valve: occupying the lower circuit requires advancing through a site front. The lower route is initially easier for T to approach, while the north arc is initially easier for CT. That territorial asymmetry is coherent for the mode.

A's two T entries are far enough apart to demand attention to both, with the derrick base separating their immediate sectors. They are both on the south side of the site but do not create the same approach. O14 is a distinct rear entry. B's west and south entries converge on opposite sides of the separator field; a two-player defense has to choose between connected support and broad coverage. Tanks and internal bulkheads can plausibly deny one panoramic cross-map position. The scenic derrick must stay inaccessible as specified; adding a climbable tower would change this assessment.

## Population and objective scenarios

| Scenario | Approach → information → contest → response → next action |
| --- | --- |
| 5v5 default: CT 2A / 2B / 1 rear flex | A pair divides O11/O13 while B pair divides O08/O09. The flex player can initially reinforce either site by the rear, with an information cost because there is no central CT window. CT gaining Valve must first push a site front; abandoning that effort preserves a rear reserve. Measure the establishment margin from the extreme spawn positions. |
| T 4+1 A | Main group stages at West, one advances through Valve/SA. A defender watching West can delay its final ascent, while the Short player pressures the toolhouse-side defender. CT may preserve two holds, spend utility, or fall through O14. If the split player is lost, the group can regroup through O03 rather than continue four sequential West duels. The final landing's trade exposure needs compiled views. |
| T 4+1 B | Main group takes Compressor; lone Pipe player threatens O08. The tanks separate entry slices and can also separate teammates. CT can delay one front and reposition around the north tank ends, or concede into SB. If Compressor stalls, O06 enables a west regroup without the whole spawn retreat. Actual support sight and body blocking remain unmeasured. |
| T 2+3 split through Valve | Valve ownership offers SA or Pipe pressure without seeing either objective. It buys access and ambiguity; it is not a sightline reward by itself. The split requires assigning someone to watch O03/O04/O06 after advancing. CT can defend the final site thresholds instead of contesting Valve directly. This is a real alternative to assuming every middle space must be contested at round start. |
| Stalled T changing site | West attackers can peel via W–O03–Valve toward Pipe/B. Compressor attackers can use Freight–O06–Pipe–O07–Valve–SA toward A. These changes cost several rooms and exposure; they are credible during the provisional 115 s round, not instant fake-to-plant transitions. Actual path lengths and equipment speeds should establish the late-round cutoff. |
| 3v3 after casualties | CT can retain one anchor per site plus a rear flex, giving up lower information, or combine two players on a known front and risk a rotate. T can leave a lower-circuit lurker while pairing on an entry. Three players cannot occupy every threshold with mutual support. The amount of silence allowed by walls/sea gaps requires target-engine audio testing. |
| 2 T versus 3 CT, A planted | T can defend rear plus Short/West approaches, but cannot safely cover every side of the derrick and both toolhouse flanks at once. CT already on the rear should retake through O14 with paired support; a late lower-circuit flank must fit the fuse and must not be counted as automatically available. The 6 m doorway permits a plausible two-player entry, but utility and crossfire fairness are open. |
| 2 T versus 3 CT, B planted | Pipe-side plant and tank positions can contest SB and a lower retake, at the cost of splitting two players. CT can stage in Q and descend in pairs; one CT using Pipe may force a T turn if already nearby. A defender starting on A cannot be assumed to complete a long lower flank, clear the site and defuse within 40 s. Measure both rear and lower path families. |
| 1 CT versus 2 T | This is a disadvantaged casualty state. A live rear route, an isolated exit duel, a kit/time choice and a save remain plausible. Do not repair the layout solely because one player cannot simultaneously clear both planted-site sectors. Actual bomb information, audio and remaining utility determine the decision. |

## Consequential findings and pending evidence

**S-L02-01 — documentation correction, no topology repair.** design.md says losing Valve removes the central flex player's safe short rotation. There is no direct CT–Valve connection in L02. Initially the flex player's supported route is the north rear circuit; Valve becomes a CT lower rotation only after CT takes a site front and secures the lower circuit. Describe that ownership cost explicitly so later timing tests do not assume an unavailable shortcut.

**S-L02-02 — unsupported timing label, no geometry repair.** “Short” is an acceptable callout, but SA should not be called a shorter ascent or shorter spawn-to-A route without measurement. SW and SA both have 8 m stair runs and 2.4 m rise; the Valve approach includes additional turns. Retain the name and qualify any distance advantage by a measured start/end pair.

**S-L02-03 — compiled arrival check pending.** Rough drawn journeys place T-to-front contact in the low teens of seconds at 5 m/s and CT establishment several seconds earlier. These are estimates, not route results. Record shortest and longest of all five spawns to West/Short A fronts and south/west B fronts, including CT-screen and Q-locker detours. No spawn position should start with a direct opponent view. The author should repair a negative intended establishment margin if actual paths reveal one.

**S-L02-04 — postplant retake tradeoff, intentionally open.** Each site's initially safe CT retake funnels through one rear threshold. The lower flank is longer and requires earned territory. The 6 m rear thresholds and open landing volumes offer a plausible paired entry; there is no evidence yet that a new rear doorway is needed. Capture both sides of O14 and SB/O16, then test 2v3 retakes with depleted utility and 40 s fuse in the target game. Check whether one smoke or one safe postplant hold shuts out all meaningful retake action.

**S-L02-05 — pressure / support checks pending.** Verify A toolhouse/derrick views against both final stair positions and their followers, and verify B tank/pump views against O08/O09. Tall objects must actually segment the fronts while preserving at least one feasible teammate support position. Static optical acceptance does not establish trading or utility counterplay.

## Author defense considered

After the raw assessment, design.md agrees with the useful split between lower attacking circuit and rear defending circuit, the nonpanoramic objective holds, and earned postplant rear access. Its uncertainty around SA utility use and 2v3 retakes is appropriate. The two ownership/distance statements above need clarification; neither justifies adding an arbitrary connector or moving a site.

Next gate: revision-matched compiled blockout review with actual opposing views, performed unchanged-body walks, measured route distances and clear target-engine limitations. Only live 5v5 play can establish the behavior and balance hypotheses.
