# Santa Bruma layout development

The remake uses the earlier Santa Bruma theme. The original terminal and the seeded Bracken Quay study were inspected as existing work. The new rail-cut layout gives street-level ticketing and lower-level railway operation separate elevations. North is +Y. Units are meters, with rail platform floor at 0.00 and upper public floors at +4.80.

## Exploration

The three early reviewers independently proposed a terminal with an island bombsite and luggage tunnel, a station over a rail cutting with an occupied passenger bridge, and staggered platform and parcel encounters. The cutting was selected for the main section. The terminal's differentiated public and service circulation informed the two crossings. The parcels reviewer’s tall mail cage and low sorting counter informed A.

The first drawing was produced from reference study and those proposals. Fresh random generation followed before committing to the developed plan.

- `random_spaces.py` seeds 511, 2026 and 7149 used 18 nodes, a 116 × 95 m box and connectivity .45. The rendered seed 511 emphasizes an outside loop with shorter local forks. Seed 2026 crowds its most connected junctions against one edge. In seed 7149, paths wrap around the N17/N06 approach and reconnect deeper into the upper lobe. That inspired the offset main and side thresholds around the tram booth and kiosk. The drawn station uses authored dimensions and structure.
- The exploration lab ran `santa-bruma-cut` at verticality .70 and `santa-bruma-parcels` at .25. The retained results contain eight graphs and 24 terrace, court and gallery interpretations. Both families were visually compared. The cut run's separated east return and layered west junctions are useful rotation prompts. The parcels run's remote left lobe and dense right lobe illustrate travel padding and overloaded thresholds. The generated routes and terrain were set aside in favor of a continuous railway section.
- The replayable packets and original renders are under `generated/station-remake-study`.

## Match assumptions

Five attackers and five defenders, two bounded plant zones, round-based elimination and no respawns. The harness body uses a .25 m radius, 2 m standing height, 1.1 m crouch and .4 m step. Review eye heights are 1.86 and 1.02 m above feet. Travel comparisons initially used a provisional 5 m/s. The harness has no bomb clock, weapon, utility, sound or teammate-blocking model.

## Decision sequences

- **A / Mail Bank.** T can use the same West Ramp opening to set up a split at Trolley Court. The west delivery threshold leads around the cage. Platform 1 goes past the stair cheek to a separate north threshold. A tall mail sorting fixture and 1.24 m counter split plant-side cover by posture and attack angle. CT can use the east service door or the longer north retake through the 4 m platform strip under Staff Bridge. The opening race and a 2v2 split retake are separate checks.
- **B / Relay.** T can wrap the forecourt booth to the side arcade or approach the main west arches. A solid ticket island splits the volume. The southern public bridge enables a later hit or fake when the bridge mouth is owned. The staff suite's duty and gallery doors make separate CT retake angles. Baffles inside the wing break direct west-to-east views into Service Court.
- **Rotation.** Public Bridge connects the southwest shoulder of B to the eastern end of Platform 1 by an east-facing stair. It offers a shorter contested switch and a narrow west-facing observation slot. Staff Bridge offers a deeper fallback at a higher travel cost. The road ramp and forecourt provide a longer retreat. A flex should leave some B information before committing downstairs. Test the price of a false rotation against round time and utility in the game.
- **Postplant.** Use independent angles at both sites. A counter or kiosk can shelter one crouched player from a single door while conceding other approach faces. In reduced numbers, test whether leaving a plant to watch the bridge costs enough local coverage to be a decision.

## Layout review

R01 independent interest review found the section and route journeys promising. L02 added scenic lift access, a visible section projection, the side arcade and explicit cover. The strategy reviewer accepted L02 for blockout with an opening-race check for A. The independent spatial and section passes found the CT lower bypass crossing the staff flight and straight sight channels into CT Court. L03 moves the flight head south to create the platform underpass and staggers both staff corridors with full-height baffles.
