# Floor-gap adjacency semantics — investigation brief

No implementation or exception is selected. Preserve every current strict failure until the generic checker contract and actual building geometry have been independently reviewed.

The r11 independent circulation review distinguishes protected occupied edges from open interstorey air. `projects/dai2-daiban/studies/multiview-restart/reviews/model-r11-circulation/REVIEW.md` documents one strict report comparing floor8.97 against tread0.122 along X5.20,Y1.70 across courtyard air. Actual edge probes hit the upper enclosure and lower guard at their respective occupied levels. Filling the entire vertical interval would invent a multi-storey wall. Other reported boundaries retain their own limitations; none is automatically cleared by this example.

Current deterministic evidence: `generated/dai2-daiban/multiview-model-r11/reconstruct-02/iteration-00.json` and immutable `source-package-01/FREEZE.json`. The seven distinct reports concern F-PKT/lower-floor, N-mid/upper-turn, two lower-bridge-to-LE2 pairs, the described upper/lower-E pair, and two ground/E-tread contacts. PR13 repeats these messages in combined validation; count unique geometric reports, not duplicated strings.

`src/vector/floor-gaps.ts` currently compares all opposite-filled-side collinear XY boundary pairs. It correctly rejects merely declared seals and examines actual static structural collision volume. It excludes a lower floor continuing underneath another region where occupied height intervals overlap. Those are useful existing behaviors. Whether two distant storeys with coincident XY limits are a claimed floor-to-floor connection is a separate semantic question; neither an unexplained gap nor an intentional open courtyard should be inferred solely from planar adjacency.

Before changing code, independently assess:

- Which of the seven reports represent an actual missing transition/enclosure, and which concern separate protected storeys? Use reviewed plans and actual cuts, not labels alone.
- Does the public authoring contract require all such vertical intervals sealed? How should a legitimate open balcony, staggered storey or partial-building boundary be represented without artificial wall infill or geometric offsets?
- Can a generic rule distinguish these cases from a missing stair-side riser, partial seal or genuine unsupported drop? Do not choose a rule by making this model pass.
- If explicit architectural intent is necessary, define its validation and retained diagnostics before adding syntax. A blanket ignore flag, source-specific object exception, smaller body or hidden collision patch is not a solution.
- Keep material closure, occupied-edge protection, source fidelity and route reachability as separate claims. A passing ray or guard contact does not prove all four.

Any proposed TypeScript change needs independent preimplementation test review and later implementation review. Use small generic behavioral fixtures demonstrating both legitimate open architecture and real defects; do not duplicate a huge Daiban asset fixture or assert only the implementation's own calculations. No code or production validation policy has been changed for this brief.
