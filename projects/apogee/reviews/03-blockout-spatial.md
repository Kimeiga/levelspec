# Apogee — independent spatial and structural blockout review

**Final stage: accepted on L06 / R06 as a geometry blockout.** The initial R05 inspection and local return reviews are retained below; final R06 closure follows them. No supported unresolved construction/circulation defect remains in this reviewed scope. Competitive balance, target-engine combat and full multiplayer acceptance remain untested.

Inspected the actual editable AML, L05 drawing/data/inventory, all14 R05 compiled browser images, validation/build reports, bidirectional route replays and final local portal/body evidence. Initial artifact assessment preceded other blockout verdicts. Source identity is SHA256 `979a5d74b9712f1d55afb129c79c9a88ca1d62827e1872da05e8b97e5c746fde`; current `level.aml`, captured `loaded.aml`, route replay and final portal report agree. Physical hash: `78e493090815a06878fbdfe6f874454d954dec11aeb00d5760af16aa8f48b6ff`.

## Actual spatial arrangement

The compiled overview and plan retain the intended shared lab wing, west telescope terrace, Mid/Optics transfer and northern stacked rotation. They have not collapsed into isolated room boxes or a single undifferentiated arena. Cable/Boot/Service and Equipment/cleanroom sequences provide actual preparation space between spawn and the major encounters. Mid's instrument screen divides the reveal toward Transit and the east threshold while leaving room to shift around it.

From A front and rear, the telescope pier interrupts the central front/rear sweep, with distinct west bench, east plant and electronics-rack relationships. P10/P11 remain two supporting entries on the same front; they are not represented as independent flanks. Rear Control and Skybridge provide the other approach territories. The tilted barrel is overhead and reaches approximately Z12.8/x30.3, as corrected in the inventory; the pier, rather than an imaginary6×6 rectangular wall, is the actual ground-level occluder. Optics crest shows the spectrometer offset from the receiving door and an onward choice toward either front entry.

B airlock, Data and reverse site views show B-CRYO separating approaches to the east plant strip. It does not conceal both sides of the room from every direction. The three low benches and Control/Decon exits give the occupant planned repositioning options while leaving exposed moves around the chamber. These relationships remain plausible for a paired entry/hold, not proof of successful trades.

## Repaired construction and circulation

- **Stacked crossing:** underpass and skybridge views show separate lower/upper walking spaces. Lower walls stop at the Z3.65 soffit in the crossing; the upper top is Z4. P33 remains a lower threshold and P18 reaches Upper Spine. The upper route is not blocked by inherited lower walls, and no phantom stair/transfer was added at the crossing.
- **Optics/Mid seam:** the L03 trimmed footprint is present in AML and its summit foundation. It removes the former southeast overlap over Calibration while preserving P12 and the upper equipment positions.
- **Bridge strips:** SK-L1/SK-L2 are now flush at y78.18/y82.32. The actual bridge image preserves staggered refuges and an open central passing route; validation reports no uncovered width samples.
- **CT flight shoulder:** the final flight is centered at X71.15, width5.70, west edge68.30/east74, with enclosures on its true edges. The leftover exterior tread strip from the enclosure-only R04 trial is gone. Both receiving portals remain x69..73; actual CT ascent and movement evidence support the retained route.
- **Declarations:** P01..P37 name the actual floor/flight interfaces, plus the Optics landing-to-flight interface. They match the accepted drawing and do not create new geometry or substitute for physical checks.

The unchanged player is radius0.30m, standing2m/crouching1.1m, step0.25m and slope42°. `validate-r05.json` and `build-r05-result.json` pass with no diagnostics. Navigation cell is0.125m; clearance coverage uses0.5m samples:27139sampled,27019covered,120excluded,0uncovered. This is bounded sampling, not continuous proof.

All13 retained route assertions pass, including their declared route-count/distance conditions. `walk-r05/report.json` replays one physical navigation path for each in both directions:26/26 pass. `portals-r05c/report.json` exercises all37 drawn portal centers in both directions:74/74 pass. The first portal attempts used interpolated ramp heights on stepped flights, causing invalid placements; the final audit uses actual tread-height starts and physical support resolution. Geometry and player settings were not weakened to make those checks pass.

## Cover/body evidence and scenario limits

The final portal report uses actual WalkMotion standing→crouching→standing transitions at A-L1, B-L3, SK-L1 and SN-L1. At each chosen position, the corresponding same-level opponent ray passes above the cover at standing eye and is blocked at crouching eye. These four checks support directional duck refuges; they do not establish complete body protection, weapon behavior or safety from side/elevated threats. The A-low image is a separate optical camera study. All camera settings and positions are retained in the capture manifest; they are inspection settings, not authenticated Counter-Strike camera calibration.

For the5v5 target, portal widths and preparation rooms are spatially sufficient to investigate grouped pushes, but these single-body replays do not test five-player congestion. For a2v2 A retake, rear/bridge access and pier-separated site sectors are present; timing, utility and trades still need play. For B postplant, airlock and Data can pressure different chamber sides, but no claim is made that a lone defender can clear both safely. Dedicated tactical and section-by-section visibility reviews retain their own scope and verdicts.

Evidence: `generated/apogee/capture-r05/`, `validate-r05.json`, `build-r05-result.json`, `walk-r05/report.json`, and `portals-r05c/report.json`. Inspection uses bounded eroded-navigation and physical support/capsule samples; no continuous sweeps, multiplayer body blocking, penetration, grenades, sound, damage or plant/defuse simulation were performed. Target-engine playtesting remains the appropriate next test of the map's gameplay hypotheses.

## R05 return-review status

After the structural/body inspection above, the dedicated visibility pass found a supported offset Mid→T arrival leak (64sampled eye-height pairs) despite the blocked center pair. Whole-map spatial/visibility completion is therefore **reopened for Intake and adjacent spawn/Mid views**; the unaffected R05 construction findings remain accepted. The L06 larger IT-S1 proposal is accepted at layout stage in `02-layout-spatial.md`. Final compiled Intake views, replay/clearance and broad visibility scan are pending before the scope closes on R06.

## L06 / R06 final return review — accepted

Final source SHA256 is `5a8bfef6a3f287167f0fef62359f8b46dfe94e72a5c9ad212238f6f6614718cd`; physical hash `b228d1876324f815b04ddabde55db10c6117c99b4796ab9c1ad76affb8128316`. The only playable geometry change from the accepted R05 construction is IT-S1's west expansion to x42..46. Scenic gondola glazing was clarified as opaque blue. Final capture, full route replay, portal replay, optical scan and independent guard probes identify this same source.

Independently captured and visually inspected four focused R06 Intake views in `generated/apogee/capture-intake-r06/` and the actual previously leaking Mid `[39,45,0]` ↔ T `[46,9,0]` pair in `generated/apogee/capture-known-leak-r06/`. Both capture manifests verify exact source, camera settings and no browser errors. The reciprocal views now meet the instrument screen instead of showing the opposing arrival area. Separate west/east passage views show the retained circulation around the screen; the west lane still receives P19 and the east lane can turn around its north end. Definitions for all six focused views are retained in `projects/apogee/views-intake.json`.

The complete final optical report tests0visible of3128Mid→T-pocket area pairs and0of1020opposing-spawn area pairs. Both named center-pair queries are also blocked across the configured eye heights. It sampled657admitted positions, performed295474queries, and reports complete:true. This closes the supported offset leak within the declared sampled scope; it is not a continuous guarantee against every future target-engine position. The larger screen's circulation is independently supported by final build/clearance,26/26bidirectional route replays and74/74local portal replays, with all four body stance/ray cases still passing.

`build-r06-result.json` passes without diagnostics. Final coverage is27091sampled,26971covered,120excluded and0uncovered at0.5m sample spacing/navigation cell0.125m. Existing route assertions and player dimensions remain unchanged. Full fourteen-view R06 capture provenance is also complete with the same source hash and no browser errors; unchanged construction retains the R05 spatial assessment above.

### Advisory disposition

Retain the40nonblocking suggestions in the output; no suppression, extra navigation seed or island link was added to erase them.

- **34 NAV_ISLAND:** inspected component records have no authored region assignments and their bounds lie on instrument/bench/telescope tops. Every authored playable floor/flight belongs to the connected principal network; the island warnings do not identify a stranded room. Those tops are not authored movement connections. Target-engine boosts/climb behavior remains an integration question.
- **6 FLIGHT_OPEN_SIDE:** the source contains native left/right enclosure children spanning each whole flight. Actual Rim/Optics crest and CT ascent images show the side construction. An additional independent compile with the unchanged capsule in `generated/apogee/guard-check-final.json` finds each flight midpoint clear and each of its two side-guide positions blocked by physical geometry:6/6guard probes. This directly conflicts with interpreting the advisories as six physically missing guards. Retain them as reviewed advisory mismatches; the bounded probes are not continuous whole-length collision proof. The Rim's1.35m west guard intentionally differs from the2.8m other sides.

**Final spatial/construction verdict: accepted for this map blockout.** No additional repair is requested in this scope. Dedicated tactical/visibility verdicts remain separate, and the previously stated limits on combat, crowding, continuous collision and multiplayer balance still apply.
