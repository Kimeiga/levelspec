# Spillway R07 — independent node-first spatial / visibility layout review

**Accepted for the R07 layout stage.** Both local handoff corrections were rechecked before this verdict. Canonical production geometry remains R05 during this pre-3D gate; no R06 production model was made. Actual R07 compilation, visibility, movement and game mechanics remain unverified by this layout acceptance.

Applied fps-map-review and level-authoring. Read `audits/node-graph.md` and its schematic SVG before the physical proposal, then visually inspected `generated/spillway/proposal-r07/plan.png` and reviewed `audits/layout-r07-proposal.svg` / `proposal-r07.md`. Dimensions were checked against the vertex/top-height handoff. A temporary geometry helper was used only to calculate polygon relationships, not as a supported authoring API; AML remains canonical for production.

## Node graph to physical spaces

The graph distinguishes movement from visibility. T's west preparation path reaches the service yard, compact weir passage and forecourt; its mid route uses the offset vestibule and Splitter. The east default reaches Elbow around the southern industrial wing. Lower Mid connects to Stair Approach and ground Underpass with different cost/exposure; the raised gallery and lower mid remain separate except at declared flights and the optional directed drop. CT allocation reaches both rear nodes through the constrained rear gallery. Neither a schematic edge nor its direction is evidence of a straight shot or measured timing.

Checked all eighteen ground/local-level anchor XY positions against the proposed ground envelope; they lie on the intended ground/local-elevation footprint. The upper UL/UG anchors lie on the upper floor. A and ES need their explicit Z=.60 and1.20 floors, rather than reusing flat ground placement. The named ordinary routes have plausible positive-width connections in plan. Actual body erosion, surface support and changed routes still require compilation.

The raw proposed ground polygon is valid and has4351 m² area; the upper union is valid and has423 m². The tall mass union is1888.6 m². These are distinct geometric diagnostics, not a desired occupied-area ratio or proof of tactical quality. Upper and ground overlap must not be summed as a larger site envelope.

## Architectural shape and body relationships

- W-01/W-03 are opposing building corners on West passage; W-02 attaches to the main industrial footprint and forms the forecourt bend. The corridor is no longer explained by a chain of freestanding high crates. Narrow cross sections retain a positive main bypass for the provisional .5 m diameter body; nominal floor widths are not team throughput or trade visibility evidence.
- E-01 and E-02 are attached east wings. E-02 extends across part of the north saddle ramp, intentionally leaving the western bypass. Treat that wall/ramp intersection as one physical assembly during actual support/head/shoulder review. B-02/B-04 shape Pump entry and its northeast service boundary, with the plant/rear route remaining west of those masses.
- CT-02/CT-03 form opposing rear-gallery returns. The smallest rear route is about3 m nominal between the southern building boundary and the northern wing, before actual wall/body offsets. It remains a plausible ordinary connection; inspect both turns, passing and support after compilation.
- T-02/T-03 attach to the departure feed boundaries. The control core and T-01/T-04 returns shape different west/mid/east commitments. Offsetting the spawn markers does not itself prove spawn protection; the old protected-region bounds and surviving placements must still be audited.
- BLD-LW narrows the Splitter's western side; BLD-LE's diagonal corner makes the eastern connection reveal itself around a real contour. The remaining upper strip into Elbow has positive width. M-L01 at X36.2..39.6/Y34..36 is now flush against BLD-LW's north face and remains fully on intended floor, without the former .4 m unusable rear slit.
- BLD-AW shapes Reservoir's west/north boundary; A-03/A-04 are explicitly absorbed and retired. A-01 becomes attached directional protection beside the raised dais, rather than a crate with a fictitious path through the building behind it. A-02 and A-L01 clear the north/south dais flights. The .60 m dais has two6 m wide three-riser accesses; its changed eye height alters low ground cover protection and must be inspected both ways.

## Height, gallery and drop

The dogleg gallery union has positive-area joins. Perimeter guards must follow the complete union, not separately enclose its component rectangles. Retained S-01/S-02/R-01 footprints and IDs are now shown, with their top/bottom interfaces intelligible in the current drawing. The gallery's two bend supports are labeled. R-01 still meets the eastern stub at X70/Z4.

The former R06 conflict with BLD-5-0 is resolved: its southern tall-mass edge is now Y75.4, beyond the gallery's Y75 edge and guard band. Polygon intersection checks found **zero tall-mass overlap with the proposed upper walking union**. The new eastern leg slot remains6 m nominal between BLD-2-1 and BLD-2-2. Mass tops7–9 m exceed provisional gallery eyes5.6/5.05 and can screen over-wall regional views; actual apertures, edge contacts and descending eyes remain compiled checks.

Gallery low covers U-C01/U-C02/U-C03 lie wholly on the upper union. Their1.8 m depth leaves3.8 m nominal principal bypasses from the5.6 m inner width; the corrected handoff states this accurately. At1.25 m above the deck, they preserve a predicted standing-versus-low-eye distinction. Opposing paired views must confirm occupied-side protection and side/feet exposure; no actual crouch or weapon claim follows from the diagram.

D-01 is a deliberate3 m wide unguarded southern opening at Y69/X47..50. The planned landing(48.5,67.5,0) is outside the deck footprint and clear of M-02, M-L02 and the supports in plan. The ordinary gallery route still connects both ends. A4 m fall is not exercised by the standing inspection walker; do not add an artificial link, teleport or movement exception to report it as passed. Actual falling, slab-edge body clearance, fall damage and one-way viability require the target engine.

## Closed local handoff findings

1. P-02 was initially still drawn at its old X61..63/Y58..64 location, leaving half its top without upper floor above. The corrected drawing/dimensions move it to X62..64/Y64.5..66.5. Its full4 m² top lies under the new gallery leg. P-01 remains fully under its stub; P-03/P-04 sit under the northern bend unions.
2. The east saddle paragraph initially retained E-02's former4.5 m height despite its new8 m architectural wing depiction. The current proposal consistently states E-02 top Z8 and includes the mass's exact vertices. The section, footprint and height handoff are now coherent.

## Open actual-blockout requirements

- Confirm the final native source matches new/retired IDs, floor cuts, mass contacts and guard openings. No old straight deck, U-B01/U-B02 or obsolete guard segments may survive to block the bends or drop opening.
- Validate/replay unchanged standing-body routes, including every A stair, saddle ramp/crest, gallery bend, retained access flight and the ground routes beside new supports. Measure the upper route before adjusting its bounded assertion; a remote ground detour cannot certify the gallery.
- Scan protected spawn areas at both heights and from elevated/drop-edge positions. Record eligible support/sample counts and common surviving placements, since building cores/wings change support within unchanged bounds. Keep old known failure rays as explicit regressions.
- Review long-ray and100° flags section by section with actual opposite views and first-appearance frontiers. A hidden old portal can reappear around a baffle end within the same forward arc; fewer portal flags do not prove camping is eliminated. Retain intentionally useful longer shots when the mode, exposure and feasible response justify them.
- Inspect standing/low pairs at all three gallery covers, A's new dais/cover relationships and the east crest. Review elevated-to-spawn and ramp-to-site rays against actual tall geometry. Camera studies do not substitute for engine body, crouch, bullets, utility, multiplayer timing or human playtests.

No production source edits were made by this reviewer. No consequential supported layout defect remains in this spatial scope. This acceptance closes the layout gate only and leaves the listed compiled checks open.
