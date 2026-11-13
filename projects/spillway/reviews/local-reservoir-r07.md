# Independent local blockout review — Reservoir / west approaches R07

Verdict: **accept this scope for prototype playtesting**. No supported blocking geometry or visibility defect requires an R07 repair in AF/A/AR/WP or their S-02/rear interfaces. Rear compact-angle holds and exposed plant access are retained design risks, with explicit evidence and playtest questions below. This is not multiplayer or competitive acceptance.

## Scope, independence and provenance

Reviewed the neutral brief, named-space graph, packet, source/geometry and actual views before reading the author's R07 proposal rationale; no other reviewer verdict informed this assessment. Compared the R07 plan/section artifact with the compiled top view. Applied `fps-map-review`, `fps-combat-geometry` and `level-authoring`. Scope is X6..44, Y34..90, ground through the west landing/S-02 boundary. Whole-map allocation, the east route and the remainder of the gallery belong to other reviews.

The inspected immutable source is `generated/spillway/capture-r07/loaded.aml`, SHA-256 `a01a75e2ede131356b1bdcd525862d8e02e6b2b40eef3a22fbb58ba951352dc8`. At inspection, `projects/spillway/level.aml` matched it byte-for-byte. `capture-r07/capture.json`, `walk-r07.json` and `visibility-r07/report.json` carry this same source hash. Capture errors are empty and named states report `stale=false`.

Actually inspected PNGs in `generated/spillway/capture-r07/`: `top`, `A-stair-approach`, `A-dais-reverse`, `A-north-stair`, `A-rear-retake`, `A-gate-follower`, `A-ground-connector`, `west-passage`. Their explicit positions/targets are in `projects/spillway/views.json` and their captured camera states are in `capture.json`. These are optical views, not walking recordings.

Additional finite rendered-triangle queries and standing placements are retained in [reservoir-probes-r07.json](evidence/reservoir-probes-r07.json); generator `generated/spillway/reservoir-probe-r07.mjs`. It compiles the captured snapshot, not a later live source. All selected standing placements pass. The 100 segment queries are double-sided opaque-render tests; they do not establish shots, continuous visibility or reaction/trade timing.

## Geometry and encounter checks

**Raised A and access:** actual south and north views agree with a supported X18..24, Y70..77 dais at Z+.60, with two 6m-wide, three-riser flights. The filled stair/slab construction leaves no visible under-step pocket or unsupported floor at these views. Source risers are .20m versus the unchanged .25m step contract. The performed `A-south-local` walker route reaches plant center at feet Z.610; `A-north-local` descends to ground. Those routes pass with the 2m body/radius .25; this is stronger than navigation-only acceptance but remains a sampled standing walker, not a continuous capsule proof. All seven local camera positions also pass selected standing placement checks.

The two flights create a real exposure choice. From `(21,67,1.6)` the planter must raise eyes to2.2 and body top to2.6. The north retaker at `(25,84,1.6)` sees selected plant head and foot targets (`rear-plant-head`, `rear-plant-feet` both visible). The dais is an exposed objective, not a rear-facing head-only refuge. In reverse, `plant-rear` is visible: ownership does not erase the retake approach. A-02 is offset west of the north flight, leaving the east side of its 6m access available.

**A-01 and service-shaped room:** BLD-AW genuinely bounds the west site rather than offering a hidden traversable room. A-01 remains a useful 4×3m solid at X14..18,Y74..77, top2.6, equal to a standing body top on the adjacent dais and .4m above dais eyes. It interrupts western angle/foot exposure and offers a change of side; it does not conceal the entire plant or let its east peek cover every route invisibly. The supported east peek `(18.3,75.5,.6)` is optically exposed both to the south follower and to sampled rear holds. Plant center also sees every configured south-gate sample. No unsupported claim of safe solo clearing or bullet protection follows from these optical facts.

**Support/trade:** the 6m gate opening between A-gate-W/E and broad south flight admit a plausible paired entry without a single-body throat. At the authored follower pose `(17,59,1.6)`, both plant center and A-01's supported east peek are visible (`follower-plant`, `follower-A01-east-peek`). This defends geometrical follow-up support for the main fight. The gate wings still hide lateral pockets until a follower advances; the view is not proof that a stationary follower can trade every first entrant death. In 5v5, a gate pair can pressure the southern plant while a separate upper/rear player creates a different arrival. Actual simultaneous timing and utility remain hypotheses.

**Low cover and height:** W-L02 before the gate, A-L01 west of the south stairs and A-02 north of the dais form preparation/reposition fixtures separated by tall gate/A-01 corners. They are not continuous invulnerable cover. The decisive height comparison is A-02: from `(19.5,82.5,1.05)`, its top1.1 blocks the selected lower south-flight view, while the same low eye remains visible to raised plant eyes2.2 (`A02-north-low-south-stair` blocked by A-02; `A02-north-low-plant` visible). Standing eyes see both. Thus A-02 offers a useful optical change against lower pressure but costs exposure to the dais. No crouch movement/body, weapon protrusion or grenade behavior was performed.

**S-02 / ground connector boundary:** `A-ground-connector` at `(34,75,1.6)` correctly looks into the filled stair side/solid S-02 guard, not an implied aperture to the plant. Source S-02 spans X26..30, Y66..82 with filled underside and 2.4m side guards. Ground arrival must round the north foot before approaching A's north stairs. The checked S-02 standing replay passes the declared upper-to-ground route; it does not create a ground crossing through the stair. Tall guard blocks the selected plant-to-high-flight segment (`plant-S02-high`). This prevents an unexpected upper gallery overlook into the whole site while retaining a consequential northern arrival. The inspected open ground space beside the dais/flight is not a required crawlspace.

**West passage:** W-03's right projection, W-01's left projection and W-02's following right mass produce alternating clear corners. Between W-01's X10.5 edge and the X14 building boundary, the narrowest identified passage is approximately3.5m before player radius. `west-passage` shows the actual corridor rather than a long blank yard. The selected 19.5m view toward `(12,58,1.6)` remains open, but a direct view into gate staging `(17,62,1.6)` is blocked by `boundary-hole-4-09`. This is an intentional transit/staging sequence, not an accidental global site sightline. A defender can contest a local lane; attackers can clear corners and reach W-L02/gate preparation. Paired body blocking and simultaneous passing were not tested.

## All six A compact-entry warnings

The actual audit uses1m admitted standing-body samples, eye offsets1.6/1.05, 35m long-line threshold and100° horizontal heuristic. It completes its budget. The A entry inventory includes south-gate, rear-gallery and the north stair foot frontier; no threshold was changed. Each warned row has all three entries at least partly visible, but only part of the south gate visible:

| Sample / feetXY | Eye offset | Arc | South samples visible | Assessment |
|---|---:|---:|---:|---|
| grid-137 /20,85 |1.6 |99.46° |2/3 |Open rear plant hold; retain risk |
| grid-138 /19,85 |1.6 |89.05° |1/3 |Open rear plant hold; retain risk |
| grid-142 /22,85 |1.05 |98.53° |1/3 |Low optical case, not crouch verification |
| grid-160 /29,86 |1.6 |92.66° |1/3 |S-02 hold sacrifices plant center |
| grid-160 /29,86 |1.05 |92.66° |1/3 |Same plant occlusion at low eye |
| grid-316 /19,84 |1.6 |98.45° |1/3 |Open rear plant hold; retain risk |

The western four rows see selected plant center, south and west targets, but are also exposed to those targets and the A-01 east peek. Their compact sector is a real attention advantage and must not be dismissed as an artifact; however, a partly occluded gate does not mean every advancing attacker remains covered. These holds sit outside the plant on relatively exposed rear ground. In a2v2 retake, one player can hold rear while the other changes the south fight; a single survivor may legitimately struggle to cover an approach and interact with the objective. Neither case requires automatic symmetry or a new crate.

The two29,86 rows cannot see plant center or the selected southern plant point because `S-02-L` blocks them, although a west-edge plant point is visible. They therefore do not provide universal objective ownership from one stationary sight sector.

The audit's stair samples are at ground Z0 nearY82.5; its verticalSpan0 is not an analysis of the whole descending body. Additional probes use actual supported positions from the successful S-02 walker trace atY≈68,70,72,74,76,78,80,82. For the western rear warning positions, `S-02-L` blocks the high/intermediate standing eyes throughY≈80; the final sampled position nearY82 is visible. At29,86, the high flight is visible, but plant center is lost. These exact pairs support the intended guarded first appearance at the northern end, without claiming the exact continuous first visible pixel.

## Gate and remaining experiments

No local geometry change is requested before prototype playtesting. Preserve the raised plant, offset A-02, central A-01 and guarded stair rather than adding cover just to clear the six warnings.

Playtest2v2 and1v2 post-plants specifically from19..22,84..85: can a rear survivor watch partial south entry and the north arrival while meaningfully contesting a defuse, and can the opposing pair alter that situation within available clock/resources? Measure gate follower trades and north retake entry, rather than infer them from camera rays. Also test simultaneous paired passage through WP and objective interaction on both stair accesses. These are unresolved gameplay questions, not claimed failed tests.

No actual multiplayer, crouch traversal, fall/drop, grenade/smoke, penetration, audio, economy, objective timing or target-engine body/network test was performed. Passing validation,17 walker routes and24 baseline placements do not establish balance or whole-map continuous reachability. This acceptance applies only to the stated R07 scope/hash; reuse for later revisions requires explicit source/interface comparison.
