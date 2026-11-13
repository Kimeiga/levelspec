# Fusion B03 → B04 — architecture and reactor fidelity

Revision inspected: B03 source `73be9cbb561b6036d0db38628b20233e941042e41cf08efe2318ab6b72b47912`,
then B04 source/capture `67e6d4fc42c5262f0b968956dc00ca6b7a90b261b9a41d2b4134b70ecae7f3e6`.
B03 was inspected as source; its capture attempt did not produce an accepted image
set. B04's nine captures in `generated/fusion/capture-b04` match the source hash
and record no browser errors. The report filename retains the original assignment.

Current verdict: **architecture and reactor blockout fidelity accepted for B04
within the declared scope**. The ordinary exterior and corrected low support
captures close the requested visual returns.
No engineering/CAD, source-building reconstruction, navigation or gameplay
acceptance is implied.

## Source-first observations

Revisited originals before inspecting the candidate geometry:

- `vessel-0.webp`: vessel cavity has a straight inboard portion, tall curved
  outboard portion and rounded upper/lower shoulders; equatorial ports project
  radially. The central bore is separate from the plasma chamber. A circular tube
  cross-section would materially misrepresent this structure.
- `assembly-0.webp`: cylindrical concrete pit, radial cells, intermediate work
  structures, substantial machinery below the hall floor and overhead lifting.
  The concrete enclosure and the machine's own steel chambers are distinct.
- `assembly-2.webp`: very large D-shaped equipment in a roofed, framed hall, with
  human-scale access decks alongside it. The work platforms do not turn the
  reactor roof into a general occupied floor.

Published dimensional anchors from the supplied ITER references are the vessel's
19.4 m outer diameter and 11.4 m height, nine vessel sectors, eighteen 9 × 17 m
D-shaped toroidal field coils, 4 × 13 m central solenoid excluding support, and a
cryostat nearly 30 m across. Sources:
[ITER vacuum vessel](https://www.iter.org/machine/vacuum-vessel),
[ITER magnets](https://www.iter.org/machine/magnets),
[ITER cryostat](https://www.iter.org/machine/cryostat).

The allowed interpretation is a fictional unfinished assembly state with invented
surrounding gameplay architecture and temporary access decks. Intermediate profile
coordinates are inferred, not measured manufacturing geometry. I had previously
reviewed S01/L02 spatial relationships, but did not consult sibling B03/B04 verdicts.

## Dimensional and source-geometry checks

Parsed AML coordinates and profiles rather than inferring dimensions from camera
perspective. Full native sector operands have R=3.25..9.70 m and Z=-4.5..6.9 m
within serialization roundoff, yielding the requested 19.4 × 11.4 m envelope.
Actual Boolean state retains five full 40° sectors and four lower shells. The
complete deck is a temporary annulus R=4.1..8.8, not a claim that ITER has a flat
walkable plasma-chamber floor.

The TF profile is R=2.4..11.4, Z=-7..10, giving 9 × 17 m. Ten of eighteen 20°
stations contain installed coils; all station pads are represented. Missing coils
are part of the fiction, not a claim about ITER's current assembly status. B04's
six touching solenoid modules now span exactly 13 m, from Z=-5.7 to +7.3, with
radius 2 m. The cryostat base has outer radius 14.7 m and inner radius 14 m;
its missing upper cylinder/lid make it an unfinished nested enclosure.

The azimuth subdivision is 2.5°; its maximum 9.7 m radial chord sag is about
2.31 mm before source millimeter normalization. This bounds polygonization of the
chosen profile, not error against an engineering section. Profile shape, wall
thickness, port sizes/placement, coil section thickness, thermal-shield details,
divertor/blanket systems and assembly chronology are simplified or inferred.

## Findings and repair adjudication

**AF1 — TF supports did not meet their coils in B03.** Pads were centered at
R=10.1 with top Z=-7. The actual lower contour there was approximately -3.894;
even at R=9.3 it was only about -5.04. This left a substantial unsupported gap.
B04 relocates pads to R=5, where the D profile reaches its -7 lower extremum.
The source now provides direct pad-to-coil contact at the bottom of each installed
coil. The corrected low oblique capture described below is consistent with that
contact and closes this finding. This is coarse architectural support, not
structural engineering.

**AF2 — A rear-link upper walls stopped below its roof.** B03's roof was +7.2,
while exterior segments x=-30,y23..30 and y=30,x=-30..-21 stopped at +4.8.
B04 adds `a-link-upper-enclosure`, `a-link-east-upper` and associated roof-step
closures, and adds `cleanlock-clerestory` at the west height transition. The source
closes the identified height gaps. The ordinary exterior return below closes this
finding for the inspected enclosure scope.

**AF3 — Solenoid nominal-height mismatch.** B03 removed 45 mm from each module
for joints, including the top module, leaving an overall 12.955 m envelope. B04
uses six adjacent 13/6 m modules, restoring the published 13 m overall height.
Closed by source measurement; no new clearance or gameplay claim follows.

## Actual B04 visual inspection

Inspected all nine images: overview, reactor hall, open work arc, north vessel
interior, west-port entry, gallery-port support, Hot Cell A, Power Hall B and bus
trench.

The reactor-hall view clearly distinguishes the larger dark D coils, lighter vessel
shell, central solenoid, concrete bioshield and partly exposed lower concentric
hardware. The crane, columns and roof beams make the central volume an assembly
hall, rather than a torus placed on an undifferentiated floor. The open work arc
and north interior show that the vessel is physically occupied by the proposed
route; the central bore remains separate and the north arc has overhead enclosure.
The W-port view reveals the coil legs outside the vessel portal, correctly making
the machine's nested scale consequential to the passage.

The west gallery aperture gives a bounded view into the lower port and machine
volume. Hot Cell A has a distinct elevated work platform and real overhead source
geometry. Power Hall B and the trench remain lower industrial spaces with separate
floor and wall levels. Their fixtures are coarse blockout masses, not finished
industrial equipment. No extra architectural detail is required merely to reach a
prop count, and no photorealism claim is made.

The overview deliberately hides roof surfaces. It cannot by itself establish that
the overall stepped exterior is complete. Interior captures use roofs enabled;
the explicit roof/slab source and upper closures are consistent with this intent.
The subsequent roof-visible exterior and low support views provide the requested
architecture evidence without changing the gameplay layout.

## Limits retained

This is dimensionally anchored reactor blockout fidelity, not an as-built ITER
model. No exact section tracing, matched reference camera, manufacturing tolerance,
thermal/structural simulation or real assembly schedule is established. Temporary
decks, selective ports, missing sectors, simplified supports and the entire
surrounding 5v5 layout are deliberate game adaptations. Small ancillary support
and connection details are simplified. Physical traversal and tactical visibility
are separately assigned review scopes; screenshots and source dimensions do not
prove them.

### B04 enclosure return

Inspected `generated/fusion/capture-b04-envelope/exterior-enclosure.png` and its
matching manifest (same B04 source hash). The ordinary roofs-visible view shows a
complete tall central hall and stepped lower wing roofs. The roof surfaces hidden
in the overview are actually modeled, and the inspected exterior reads as a
coherent closed industrial blockout rather than a roofless diagram. AF2 is closed
for the inspected enclosure scope. Detailed cladding, external doors and service
runs are intentionally coarse; no facade-fidelity claim is made.

The attempted `reactor-supports.png` in that batch does not expose the relevant
contact and is not accepted as support-view evidence. A corrected low oblique
camera in `generated/fusion/capture-b04-sections/reactor-supports.png` now exposes
the lower D contours, central support and concrete pad tops beneath the machine.
Its manifest matches B04 and records no browser errors. The coarse support reading
is consistent with the numerically verified R=5 pad contact, without the large
unsupported B03 gap. PF rings partially occlude individual connections; this is
not inspection of every engineered load path. AF1 is closed for blockout
architectural plausibility. No unresolved required change remains in this scope.
