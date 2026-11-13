# B05 spatial / visibility review

Status: **accepted for the bounded compiled spatial/visibility gate on candidate04**.
The source repairs, overview/enclosure images, final movement/optical reports and
completed r4 close-view packet support the intended circulation and selected
cross-level encounters. No unresolved physical blocker was demonstrated in this
scope. The failed constantR6.8 reverse trace, unavailable optical reservations and
partial r3 capture provenance remain explicit below. This is not a human balance
or target-engine playtest verdict. No AML, author helper or production compiler
edits were made by this reviewer.

## Evidence and scope

Inspected `author.py`, emitted `level.aml`, the frozen L04 plans/sections and
`layout-l04-detail-notes.md`. Read native wall opening mapping and physical
assembly semantics to check the authored coordinate assumptions. The initial
failed compile/report had no navigation; it is unavailable movement evidence,
not a route pass or a demonstration that every listed route is physically broken.

Candidate03 source identity at this pass:

- `author.py`: `e83a36f8151a20845808879468f15c6fd732a9996ed5fa496289be92f0e3261d`
- `level.aml`: `88d353f63c206f815eaf35375f0c006f8e700e26c7bf3fce2c2113da275b093d`

Final candidate04 identities for the compiled return:

- Source: `ffb88349afb29e19abc0b2b578e0d7ad93b25a26b8eeedf0de623057bbb56c85`.
- Physical: `b7894bb7b1cb61a2cac76253026f1f210fc38d3d2b2100b432cd3531038fb85e`.
- Render: `9c183721e1026d9fddbde9c5bb6b35bc6e8c8a045bc87d7cd0828daa7bf2dacd`.
- Physical inspector: `b55343df25c4303fcd6d838cefb711439f4375324a0ed1f53ce7d36b02b0116a`.

Scope includes floor/landing unions, guard ownership, portal coordinates, lower
cavities, supports crossing occupied routes and roof/ceiling agreement. Dedicated
section/opposing-view coverage and strategy have separate owners. Standing body
remains radius .35 m, height 1.8 m, step .3 m and slope 42 degrees.

## Findings and source returns

| ID | Mechanism and inspection target | Disposition / required evidence |
| --- | --- | --- |
| BS-01 | Original automatic guard mask removed whole flight footprints at each crossed floor elevation. Along A's +3.2 north notch, Y23.6, the crown flight is already overhead for X>−33; its rising parapet cannot guard the lower edge. | **Closed in candidate04.** Endpoint-mouth masks retain `floor-edge-3.2-5-0` and `floor-edge-3.2-6-0` at tested notch points (−32,23.54) and (−26.9,23.54). A-R and CW remain separate. Both stair directions pass the final inspector; r4 `a-rear-stair-mid-flight` shows the overhead crossing, lower guards and screened landing, while the CW arrival views show its independent upper floor/guard. |
| BS-02 | Original `wing-support-6` at (24,9), Z0..6.1, entered B-W's flight. At Y9 the guide tread is about−.8, and the X24.5 standing body overlapped the post horizontally by roughly .01 m and vertically. Original `wing-support-4` at (−25,10.5) similarly consumed the left side of A-E's nominal2.8 m width. | **Closed in candidate04 for the inspected routes.** Supports4/6 are at hall boundaries X−22/+22, outside the flight footprints; their tops6.1 meet the crown slab underside. A-E/B-W native and manual directions pass. The overview, qualified r3 A-E views and checkpointed r4 B-W follower show no column in the occupied arrival. This does not claim exhaustive traversal of every shoulder offset. |
| BS-03 | Original raised west bridge met the lower room boundary guard at (−23.06,−9.314): Z−3.2..−2.1 produced a .7 m barrier above the −2.8 bridge. The room descent ramp begins farther inside atR27.7. A separate author-helper defect also discarded the inner hole of the closed guard polygon, filling the room. | **Closed in candidate04.** Guard holes are preserved and the actual crossing is open. Both declared and manual lower-west-port directions and freight descent pass the final inspector. The qualified r3 `freight-lower-to-lower-west-bridge` view corroborates the hollow room, real overhead slab and open guarded bridge mouth; movement acceptance comes from the complete source-matched reports. |

## Local lower-strip repair reservation

**Reservation accepted and realized in candidate04:** the lower arc,
port fans and bottom landing widen from outerR7.3 toR7.5, with the outer guard at
inner faceR7.38. The central stair/hatch, lower elevation, player body and
reactor geometry are retained. Conservative bypass width becomes1.18 m fromR6.2; it remains
single-file and does not imply side-by-side trading.

The supplied `generated/fusion/debug-physical.json` identifies candidate03 source
and reports clear, physically supported R6.7 placements including270°,272° and
328°. `debug-nav.json` explicitly combines candidate02 navigation with candidate03
physical geometry and misses navigation at272°/328° despite those physical
placements. This supports investigating a narrow sampled-navigation corridor;
the mixed-revision artifact is exploratory and cannot close a movement gate.

I independently recomputed the retained B04 inner profile at the two standing
span endpoints and every intervening profile-vertex elevation. AcrossZ−3.2..−1.4,
the radial intersection isR3.803042..7.536697. Conservatively multiplying the outer
bound by cos1.25° for the2.5° azimuth facets givesR7.534904. A new outer floor/guard
radius7.5 therefore remains approximately.0349 m inside the limiting walking-level
shell. At slab bottomZ−3.45 the inner and outer shell boundaries areR7.184895 and
R7.869302: the extra slab thickness overlaps the shell as a bearing connection,
without increasing the reactor's external envelope.

| Proposed body centre | Full .70 m radial envelope | Clearance from conservative innerR6.2 | Clearance from guard innerR7.38 | Conservative shell clearance |
| --- | --- | ---: | ---: | ---: |
| R6.8 | R6.45..7.15 | .25 m | .23 m | .3849 m |
| R6.9 | R6.55..7.25 | .35 m | .13 m | .2849 m |
| R7.0 | R6.65..7.35 | .45 m | .03 m | .1849 m |

R6.8 was chosen as the nominal body path, close to the clear-strip midpointR6.79;
R7.0 unnecessarily consumes the outer clearance. Final results retain bothR6.7
andR6.8 directions, including the failed reverseR6.8 trace. The performed return
below distinguishes that sampled-path failure from intended bidirectional access.
The calculation conservatively contains the whole standing body within the
radial section; it does not certify attached guards, native stair geometry,
azimuthal seams, navigation continuity or target-engine play.

## Source agreement and construction scope

The native hall portal coordinate convention is correct in the inspected source:
the longitudinal center is measured from Y−20, and aperture heights are relative
to the side-wall path at Z−3.55. Adding20 and3.55 respectively reconstructs the
accepted clear Y/Z ranges. The hall-south door stations are similarly measured
from X−22 with baseZ0. Final route crossings and compiled views corroborate these
apertures; the coordinate calculation alone was not their acceptance evidence.

Floor arrays retain the repaired R7.1→9.8 lower ramp mouths, the shortened west
crown flight, the east L landing, B's shelf/void distinction and central hatch.
The same-height floor unions own free-edge guards; native physical assembly
composition owns overlapping solids. Source quantization/simplification must not
be taken as proof of their final contact or capsule clearance.

Lower rooms have actual foundation subtractions rather than nav-only exclusions.
The hall excavation and lower wing cavities are separate from floors, ramps and
shelves. The final return includes the raised west bridge, real overhead slabs,
central curve/bypass and the warned B retaining interval. The lower-route failure
was diagnosed against physical support and sampled navigation before any further
geometry/body change was considered; no such change was required.

Roof ownership matches the reviewed16 m hall,10.4 m occupied transfer volumes,
7.2 m ordinary upper rooms and4.8 m low wings, with explicit step walls. The source
keeps the published machine nodes and cuts separate work apertures through the
shell/cryostat/bioshield. This review does not substitute for independent reactor
fidelity or architectural enclosure acceptance.

## Evidence contract used for acceptance

The final successful source revision is common to compile diagnostics, ordinary
enclosure views, opposing player views and branch movement results. The repaired
guard/column interfaces, lower ports, revised1.18 m lower bypass, central curve,
A arrivals, B descents and crown transfers have received the bounded checks below.
Failed positions and traces remain, including missing sampled navigation rather
than demonstrated geometry failure.

I separately read the project-only `section-check-l04.mjs` and its current native
walker. Its actual trace-derived stair cameras, unsupported-endpoint rejection,
ten authored starts/offsets and source/physical/render hashes are suitable evidence
mechanisms. Requested positive gallery/crown-to-port probes were added alongside
the deliberately occluded near-wall probes. That source review is not a canonical
run or acceptance of any B05 sightline. Native movement checks physical support
and capsule clearance at bounded .04 m substeps; it remains inspection movement,
not continuous or target-engine gameplay proof. Low-eye rays are not crouch travel.

## Candidate04 compiled observations

Raw images in `generated/fusion/capture-b05-04-overview/` were inspected before
final reviewer conclusions: overview, north cutaway, roofed hall/crown, enclosure
and north vessel interior. Their manifest matches the final source/render hashes.
They show the crown as occupied circulation across the larger hall volume, the A
mezzanine and B loading/shelf relationship, and the completed stepped roof envelope.
The central core and coils divide the toroidal view; this is not a single exposed
circular arena. These overview cameras do not establish player placement.

The successful native build contains32 declared routes, all sampled reachable,
and no unreachable markers or regions. The assigned movement network includes all
new levels. One additional .421875 m² freight-well navigation fragment lies at
X−24.70..−23.575/Y−12.425..−11.80; it is not a claimed route or marker destination.
The167 island warnings also include unassigned roof and machine-top surfaces.
This is diagnostic disposition, not proof that every physical surface is usable.

The three alignment warnings identify .05 m face offsets between .3 m roof-step
walls and .4 m hall walls. They do not demonstrate a disconnected volume. The B
basin/rim warning nearX40/Y19.74 received a separate actual-geometry check in
`sections-b05-final/detail-report.json`:15 finite normal rays at five Y positions
and Z−2.8/−1.5/−.5 hit both physical and rendered boundaries. Most hits identify
the native `b-rear-bottom-landing-excavation-0` retaining face atX40; the low
endpoint atY19.58 meets its guard first. The additional
`retaining-face-coverage.json` projects the four actual retaining triangles onto
X40: the warnedY19.6..19.88/Z−3.2..−.3 rectangle is covered within1 µm, with
4.23e−7 m² exact uncovered area. Its widerY19.58..19.9 rectangle includes the
adjacent corner and retains .0220004 m² uncovered area; these scopes must not be
conflated. The r4 `b-retaining-edge` view shows the real wall behind the guard
break. This closes the specific warning without a whole-map watertightness claim.

The final supplemental optics establish a useful bounded B relationship:
west-rim(26.8,12,0) and loading(35,10.5,−3.2) see each other over8.93 m, while
the plant(35,17,−3.2) remains behind its shelf/partition. This separates pressure
on the exposed loading area from direct control of the sheltered objective.

Crown support is position-dependent. R20 near-end samples, and supportedR19.4
offsets at157°/23°, are blocked toward the inner ground ports by the inner
parapet. EarlierR19.2 requests at those angles failed navigation and remain in
the evidence. A further east positionR19.2/30° at(16.6277,13.6,6.4) is normally
admitted and has clear reciprocal standing-eye rays to east-inner-port(13,4.5,0).
A matching westR19.2/150° request is unavailable. Credit this specific east
connection after advancing around the crown; do not infer symmetrical, transfer-
wide or continuous port oversight. `crown-view-access.json` also passes normal
acquisition from the crown centre route and return with the same body. No source
change was made to obtain it.

The small `verify-l04.mjs` edit records checker hashes alongside source, physical
and render identities without changing replay behavior. Its final companion
provenance will also retain `navigation-edges.ts` and `collision.ts`, which its
original five-file list omitted. Earlier inspector failures and the repaired
containment tests remain separate from the final map evidence.

## Final performed movement return

`checks-b05-final/walk-report.json` matches the final identities and records64/64
declared directional replays and46/46 marker placements passing with the unchanged
standing body. Both native lower-port routes, the central curve, all four A
ground-fed arrivals, B descents and crown acquisitions/room traversal pass in both
directions. The manual section report passes29/30 trajectories, including all
straight stair and central-curve directions and both lower-port crossings.

The one failed manual trajectory is the constantR6.8 lower-bypass reverse near
the east fan. It is retained in both generic and section reports; those commands
correctly report incomplete checks rather than rewriting the failure. Independent
`probe-lower-reverse.json` shows the exact rejected request(6.350278,1.568135,−3.19)
and first rejected substep(6.390487,1.678836,−3.19) have clear physical capsule
placement and valid physical support, while their sampled navigation location is
absent. The passing forward trace actually slides inward toX6.291586 in this
sector. Reverse motion slides inX alone and exceeds its .12 m trajectory tolerance.
This is a sampled navigation-path limitation, not an observed physical obstruction.

An explicit full reverse journey with a small inward jog before this gap passes:
original345° start to214° end,402 requests no larger than .04 m,15.7373 m traveled,
.01 m endpoint error. The added waypoints areX6.28/Y1.7895 thenX6.28/Y1.35; the
remaining requested path is unchanged. Its complete trace, identities and helper
are retained as `probe-lower-reverse-alternate.{json,mjs}`. The originalR6.7
supplement also passes both directions on the widened final floor. These facts
close intended bidirectional lower circulation without certifying the failed
constantR6.8 trace or requiring a geometry/body change.

The raw section report retains one unavailable shelf observer target at(38,14.6,0)
and its two unavailable optical variants. Separate supported cabinet observations
are explicitly different positions. All ten actual starts plus supported offsets
produce800 blocked finite rays to the tested high/ground/site targets. This
supports the A-front shielding repair at the selected poses; it is not an
exhaustive spawn-visibility or moving-player safety proof.

The real-browser smoke report matches the source and inspector. Six form-entered
standing placements span ground, torus, lower arc, A, B and crown; keyboard movement
and a crouch state change were observed without page errors. Its nearby-occluder
screenshots are interaction evidence, not substitutes for encounter views.

## Final close-view return

`generated/fusion/capture-b05-final-sections-r4/capture.json` is complete with36/36
views and no browser errors. It retains two actual document-replacement retries
at `b-west-stair-reverse-leader`; only the successful verified attempt is admitted.
The saved served AML and current source both match the source hash above. Every
accepted frame records the same render hash, non-stale state and requested
perspective camera; independent comparison found maximum position/target delta
7.11e−15 m. The capture-helper hash is
`387bb63c1dab87b4ec419394e8943a5894681c3fa1df6fe5ce800a02dac4deba`.
Its per-document token preserves normal same-document camera URL changes and
only permits bounded retries after a replaced document. This capture run changes
neither map geometry nor movement semantics.

The earlier r3 batch stopped after52 images at a destroyed execution context.
Its images were inspected as **qualified partial observations**, backed by the
same-source section measurements, but lack the new per-frame final manifest and
are not relabeled a completed capture. The final spatial verdict does not depend
on treating those52 as checkpointed r4 frames. The earlier complete overview
packet remains the source-matched broad spatial/enclosure evidence.

Selected r4 raw images were inspected before this final conclusion: A-R leader
and mid-flight; CW leader/follower; CE upper leader/follower and lower follower;
central descent leader, reverse follower and mid-flight; all three B descent
followers; Cask-gallery follower; west crown inner offset; east angular crown
reciprocal; B rim/loading reciprocal and rim/plant; cabinet standing/low-eye; and
the B retaining-edge image. The report does not imply every possible pose or
full stair width was visually or physically swept.

The A-R crossing reads as two different occupied levels: its lower stair keeps
its side guards under the sloping crown flight, and the arrival screen requires
clearing around it. CW's top leader and follower face the wall/parapet beyond
their landing. They must turn onto the service walk before acquiring the wider
hall relationship; this is an approach cost, not immediate high-ground control.
The compiled CE upper leader view exposes a clear guarded L continuation through
the hall aperture. Its lower follower sees the next flight and elevated landing
over the intervening floor, with no floor patch sealing the occupied climb.
Together with successful two-way replays, these views close the new local
stair/void reservations at the inspected bodies.

Central descent and mid-flight images show the curved stair beside the machine,
the separate lower fan and the beam/slab overhead. The return follower sees the
ground-level port through the inner doorway as the stair emerges. The filled
stair mass and core constrain sight across the lower arc; the1.18 m bypass is a
single-file alternative around that mass, not a second broad fight room. The
body-supported paths provide two-way exit choices; the views do not establish
room for two teammates abreast or simultaneous peeks.

B's west, trench and rear arrivals have distinct viewing costs. Tall screens and
the overhead shelf consume the selected sight toward the plant; the trench
follower sees more of the open lower floor and the opposing stair beyond the
screen, while the rear follower must clear a nearby screen. The explicit west
rim/loading reciprocal pair shows a vertical exchange across the opening. The
same rim's plant target is hidden by the shelf/partition. These are meaningful
approach differences without claiming the plant is invisible from every rim
offset, or that one north-rim observer controls all rear/trench/shelf arrivals.

The east angular crown reciprocal images support the narrow measured connection
above the parapet at the admitted30° position. The west near-end image is still
dominated by its own parapet and the machine. No symmetric crown-to-port support
is inferred. At the Cask-gallery arrival, the selected follower sees a readable
ground-fed gallery continuation, separate from the rear/crown service approach.
Its positive inner-port connection is established by the final optical report;
the near-wall mouth remains a different blocked target.

Low fixtures are accepted as partial body screening at the sampled positions.
The qualified r3 Cask and B-loading standing/low-eye pairs do not establish full
crouch concealment: the measured rays remain clear, and the B-loading sample
looks past the fixture's side. A's blocked pair is dominated by taller masses.
The completed r4 cabinet pair likewise shows the low eye gaining near-body
screening while the chosen line passes beside it. It is a broader supported
observation, not rehabilitation of the unavailable shelf target at(38,14.6,0).

## Acceptance limits

- The intended network is admitted by64/64 declared directional replays and46/46
  marker placements, supplemented by the section traces and chosen supported
  views. The failed constantR6.8 reverse path remains a failure; R6.7 and the
  explicitly jogged full reverse path establish alternate two-way circulation.
- No sampled path, static capsule, ray or screenshot proves continuous clearance
  over every point of a floor, all shoulder offsets, moving-player exposure or
  every possible cover interaction. The unchanged standing body was used; low-eye
  optical comparisons are not crouch movement tests.
- The no-visible-spawn result covers the800 finite tested rays. Crown support,
  B loading exposure and protected plant samples are position-specific.
- The r3 capture provenance remains partial, the r4 packet complete. Missing
  observers and the explicit command failures are retained rather than counted
  as passes. Architecture/fidelity and strategy have separate review owners.
- Human5v5 play, weapon/utility rules, sound information, timings under opposition
  and balance are not established by this review. No further geometry repair is
  required by the spatial evidence inspected here.
