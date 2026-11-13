# Independent R13 checker review

**Status: revision03 approved for bounded full runs against frozen R13 development-03/source-package-02.** Independent reproductions confirm the material revision02 findings are resolved. This approves running the checker, not accepting its candidate: complete visual/collision conformance, negative controls and fresh-process reload evidence remain to be inspected. Source fidelity, circulation/FPS and strict PR13 gates stay separate. This review is separate from the frozen preimplementation plan.

## Bound release

`projects/dai2-daiban/studies/multiview-restart/reviews/model-r13-drawing-release.json`, SHA256 `62f7233a57dcc76c498084147a593824aacd123cc608bf27e0864ee308c53d3f`, releases one bounded diagnostic of the exact corrected R08 family. Independently verified that release identity and its unchanged bound verification plan, SHA256 `e857cd8448c296ba1c4b51139ff5de6cef3683d457714783b63572c390e92d82`. No frozen plan or release file was edited.

## Independent numerical-contract intake

Read the actual native implementation in `src/vector/precision.ts`, `format.ts`, `authoring.ts`, `architecture.ts` and `flights.ts`. Authored linear values, including region `rise`, are normalized to the existing 1 mm lattice; derived mesh cells are not independently snapped. The stair `rise` field is a **maximum**, and the compiler selects `ceil(totalRise / maximumRise − 1e−9)` cells before equalizing their risers. It is not the exact resulting cell height.

A read-only in-memory probe of `normalizeCoordinates` confirms:

| Quantity | Reviewed ideal | Encoded/derived native value |
| --- | --- | --- |
| N upper endpoint X | 5.772727… | 5.773 |
| N width endpoint Y | 9.5530895… | 9.553 |
| N equalized rise used naively as maximum | 2.03/12 | Encodes 0.169 and would produce **13** cells |
| N count-preserving maximum | Parameter for 12 equalized cells | 0.170 produces 12 cells; resulting actual rise remains 2.03/12 |
| N going across encoded complete extent | 3.55/11 | (5.773−1.900)/12 = 0.32275 |
| FE2 receiving elevation | 12.4175 | 12.418 |
| FE2 maximum rise | 0.1575 | 0.158, giving nine cells and actual rise 1.418/9 |

These are preliminary native-contract observations, not a candidate conformance result. The author already has a ceil-to-millimeter maximum-rise convention; preserve its intended-count semantics. Independently verify that the saved/reloaded candidate actually uses them, with all cells, finite endpoints, thicknesses, landings and exact fractional contacts. No tolerance may hide a wrong count or real gap/overlap. The nominal-vs-encoded distinction also applies to FE2 receiving-floor/guard contacts, not only the stair body.

## Revision01 reviewed subject and evidence

Checkpoint: `projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-checks/REVISION01-REVIEW-INPUTS.json`, SHA256 `0be4ba36b396e1307aa7fec22d52c02b7bbc3f2ad23447588efd0e9575e87af7`. Read all14 code/oracle/document files plus the generic probe and retention helper imports. Independently verified all14 file identities and127 input identities before and after isolated reproductions, with zero mismatch. No full candidate checker run was performed.

The independent [revision01 probes](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-checker-independent-review/revision01-probes.py) and [results](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-checker-independent-review/REVISION01-PROBES.json) reproduce the following findings using synthetic geometry and the frozen oracle. They do not import the author generator or use an R13 candidate as an expected answer.

### C1 — encoded dimensions are inconsistent across the oracle

`oracle.py` normalizes native flights and selected floor bounds, but keeps nonfloor boxes, finite profiled-guard extents and rear-opening polygons at raw drawing precision. `Prism` does not encode them. The implementation's established authored-coordinate contract normalizes these dimensions to millimeters, while the checker allows only1µm geometric differences.

Concrete reproduction: the frozen D-HOME X extent is `[5.6865429195762,6.4066594244794]`; its encoded extent is `[5.687,6.407]`. Passing that correctly encoded closed door to `compare_intervals` fails with a457µm missing strip and341µm extra strip. This is an oracle error, not a bad model. Apply independently declared encoding once to every relevant authored quantity, preserve ideal and encoded evidence, and keep derived fractional native contacts unsnapped. Do not solve this by a blanket millimeter tolerance.

The implementation review also preserves a smaller curved-arch discrepancy: actual post-Boolean front/back contours differ from independently rounded loops by up to about51µm. Its declared numerical/cleanup behavior still needs explanation. Do not fit the oracle to the candidate or erase this discrepancy merely because it is visually small.

### C2 — complete volume coverage does not establish physical surface semantics

`arrangement.py` compares interval occupancy and multiplicity without material, kind, role or oriented face contracts. `check_semantics` samples midpoint combinations from expected polygon vertices and tests material/flags at selected depths; it does not compare complete actual face patches. It ignores the returned orientation and kind/role. Retention removes changed-mask interiors, so it does not close these gaps.

The isolated positive fixture contains a complete closed pane and door. All these invalid variants still pass `check_semantics`:

- Replace one ninth of the pane with masonry away from its single central feature sample.
- Change every feature's kind and role to wall while retaining its material.
- Reverse all triangle orientations. The same reversed fixture also passes interval occupancy.

Add complete spatial per-face semantics and orientation over changed domains, including stairs, floors, guards and hosts as well as panes/doors. Use independent expected physical contracts and explicit shared-ownership interfaces. Keep the harmless rename/retessellation positive. A local off-sample material mutation and an actual orientation reversal must fail their intended assertions. Also make `check_native` purpose-aware: it currently scans the unfiltered level for both visible and collision runs, allowing hidden/noncolliding native triangles to satisfy the native-count subcheck.

### C3 — same-mesh duplicate surfaces evade the claimed multiplicity check

`actual_spans` deduplicates equal hit depths within a mesh before pairing intersections. This is useful for ordinary shared triangle edges, but it also erases complete duplicated surfaces in that same mesh. The full arrangement therefore cannot currently establish its stated pre-union multiplicity guarantee.

Independent reproduction: a unit cube passes the full projected arrangement. Duplicate every triangle and surface index, retaining the same mesh identity. The invalid double copy still passes, with three arrangement cells, zero differences and zero numeric-degeneracy reports. The existing duplicate control creates a different mesh and misses this failure mode.

Add oriented coplanar positive-area face accounting or equivalent physical multiplicity analysis that distinguishes adjacent triangulation from duplicate faces. Test both same-mesh and different-mesh copies, and retain a positive harmless retessellation case. Do not accept a closed-shell winding/occupancy union as proof that each physical surface occurs once.

### C4 — saved-subject replay must consume and enforce the actual manifest contract

`reload.mjs` requires top-level `source_sha256` and `compiled_sha256`, but the current saved `SUBJECT.json` contract records `{status,geometryHash,files:[{path,sha256,bytes}]}` with the XML and compiled JSON in `files`. Thus the documented direct replay command rejects the real subject at the initial XML identity check. Resolve those authoritative entries or introduce a separately bound, explicit adapter; do not silently invent missing identities.

`identity.snapshot(candidate)` must also require that this exact candidate path/hash is present in the subject binding, not merely verify whatever entries happen to exist. Keep source and declared resolver-read checks, positive fresh reload equivalence, and missing/changed asset controls distinct from physical geometry controls.

## Sound parts to preserve

The oracle uses frozen R08 drawings and actual R12 context rather than author output. Native12/9-cell arithmetic and maximum-rise interpretation are independently derived. Complete retained exterior comparison preserves orientation and physical attributes outside finite scopes; immutable retained feature checks cover the lower arch, E circle and HOME window. The W-PKT-S expansion control directly targets the actual shared-union regression found in implementation review.

The arrangement partitions at actual/expected projected edges and affine depth crossings, derives an interior affine basis and evaluates endpoint functions at cell extrema. That is stronger than dense rays alone. Numerical degeneracies block a pass rather than being discarded. The saved-input binding includes the generic probe/retention helpers and public vector compiler files. Positive-before-negative control gating and fresh output directories are appropriate. Keep source/FPS/body usability and PR13 strict results separate from drawing conformance.

Body envelopes are explicitly bounded diagnostics; they do not clear the known HOME-left intrusion, lower2mm margin or continuous stair transitions. This limitation is correctly disclosed and must remain visible rather than being promoted into an FPS result.

## Revision request and next decision

The checker author received the coherent C1–C4 correction brief and was resumed for revision02. Preserve revision01 and its failed independent controls. Review the new exact checkpoint and repeat only the discriminating isolated proofs before approving full positive candidate runs. Full conformance and negative controls must then run on the exact saved subject, with their complete output inspected; a code-review pass alone will not accept R13.

No checker, model or runtime implementation was edited by this reviewer. Only independent review documents and isolated review probes/results were written. No full candidate checker suite or broad runtime suite was run.

## Revision02 independent rereview

Checkpoint `REVISION02-REVIEW-INPUTS.json`, SHA256 `ff9cd08a4f64537a03135a5700af6b35802861b1fb73fe753fdc1a6c4afdd6b3`: independently verified17 files and130 input identities before/after the new [revision02 probes](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-checker-independent-review/revision02-probes.py), with zero mismatch. Read the new complete-face/multiplicity and subject-binding modules and changed oracle/arrangement/reload paths. No full candidate run was performed.

The [results](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-checker-independent-review/REVISION02-PROBES.json) independently confirm the original reproductions are fixed: encoded D-HOME bounds, off-sample pane material substitution, wrong kind/role, reversed feature faces, same-mesh duplicate triangles and exact files-only subject binding now behave as intended. The same-mesh duplicate reports12 actual positive-area face pairs. The new purpose filters also prevent hidden/noncolliding native triangles from satisfying the native subcheck. Preserve these fixes and their positive cases.

Three material problems remain:

1. **R2-F1 — normal float32 encoding fails the feature positive.** The exactly encoded D-HOME box passes `complete_feature`, but representing those same asset coordinates as float32 fails four faces. Missing projected areas are only1.65×10⁻⁷ and4.81×10⁻⁷m² along feature boundaries. Plane matching uses1µm precision while tangential coverage requires missing area≤10⁻¹²m², so ordinary encoding is rejected. Declare the expected asset representation or an independently bounded expected-boundary rule consistent with the existing precision. Do not fit an arbitrary area tolerance or waive interior gaps.
2. **R2-F2 — exact owner boundaries bypass physical semantics.** `Oracle.boundary_contracts` omits endpoints on the interval-window boundary, but production arrangements use exact owner scopes. Using the production Oracle with a unit host, changing the entire host material to door passes all three full arrangements over `[0,1]³`, with zero differences. The author's semantic control uses a padded window and therefore does not expose this. Compare actual full-union endpoints even when they lie on the scope boundary; the full-union calculation already distinguishes genuine exterior faces from synthetic interval clipping. Add an exact-scope positive and wrong-material negative.
3. **R2-F3 — overlapping primitive contracts admit the wrong shared owner.** The oracle allows every overlapping primitive's physical contract at a common exterior endpoint. A complete native floor slab plus coincident host therefore accepts a structure-only prop as the whole subject, even with a padded scope. This contradicts the released rule that native floors own their full slabs and walls/guards are the exterior difference. Encode the independently reviewed partition priority instead of treating all coincident materials as interchangeable. Preserve valid opposite-facing zero-volume contact faces, and add a native-floor-positive/structure-only-negative pair.

These are checker-contract corrections, not requests to change the frozen model or drawings. The three findings and reproducible evidence were sent to the checker author and coordinator. Full runs remain unapproved until a coherent successor passes independent rereview. The source critic's separate E-bore diagnosis supplies no new metric or geometry release.

### Existing shell cleanup and exterior precision

The previously unexplained51µm arch deviation is now independently traced to the compiler's existing `.simplify(0.0001)` static-shell cleanup. Frozen GLB geometry exactly matches the saved pre-shell export solids; both frame and pane move51.2265µm at their complete front/back profiles during compilation, below the already-declared100µm surface-deviation bound. Before that cleanup their profiles match independently encoded drawing loops within0.524µm. Actual compiled frame-inner/pane-outer profiles coincide exactly, with zero boundary distance, gap and overlap. See the [bounded implementation cleanup evidence](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-implementation-intake/ARCH-CLEANUP-AUDIT.json).

The successor checker must distinguish this fixed existing exterior-cleanup contract from a real joint gap, duplicated surface or wrong material. Do not increase a general gap tolerance to100µm or fit expected contours to this candidate. Preserve pre-shell-to-drawing and post-shell-to-pre-shell evidence separately where needed, with actual shared contacts independently checked.

One further encoding category needs explicit reconciliation before a full run: revision02 uses `q(encodedCellTop+1.1)` for SG-FE2 caps, whereas the earlier independent oracle and current precise companion use the derived offset without a second snap. Cell01 differs by444.444µm. Decide from the reviewed guard-family contract whether this cap is an independently authored absolute coordinate or a derived tread-relative offset; preserve actual fractional contact bottoms/stations either way. This is not permission to alter dimensions or grow a tolerance merely to obtain a pass. The constructor and coordinator have the issue.

## Revision03 independent rereview and bounded run approval

Checkpoint `REVISION03-REVIEW-INPUTS.json`, SHA256 `8a4fef8ed480038c59790844f0fa40b32ef3c575827331470764d4b01964ea75`: independently verified all 19 files and 186 input identities before and after the isolated probes. Reviewed the changes to oracle encoding/ownership, full-face coverage, arrangement qualification and run integration, plus the complete new cleanup module and its controls. The immutable revision01/revision02 records remain intact.

The [rerun of independent failure reproductions](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-checker-independent-review/REVISION03-PROBES.json) closes all three revision02 findings:

- **R2-F1:** ordinary float32 D-HOME geometry passes. The oracle now separates authored millimetre encoding, exact native fractional derivation and final float32 representation. Face coverage applies the same declared 1µm linear boundary precision tangentially and normally; it records raw differences without introducing an area-based gap allowance.
- **R2-F2:** wrong material fails at exact scope endpoints on all three axes; the correct positive passes. Full-union endpoints are included on window boundaries.
- **R2-F3:** a native floor occupying the complete shared slab passes; substituting structure-only masonry fails. Native floor/stair ownership takes priority over coincident masonry. Ordinary opposite-facing contact remains a positive in the constructor's targeted controls.

The prior encoded-door, off-sample material, kind/role, reversed-face, same-mesh duplicate and exact files-only subject-binding reproductions continue to behave correctly. The duplicate negative reports 12 positive-area face pairs rather than disappearing through interval deduplication.

Independently rechecked all nine frozen SG-FE2 owner records: each ideal guard top is its ideal cell top plus 1.1m. Revision03 applies that relative offset to the encoded actual cell before float32 representation, with no second millimetre snap. All nine expected caps agree. This resolves the earlier encoding-category question from the released dimensions, not a candidate-derived tolerance.

### Cleanup qualification and physical failure controls

The new audit keeps the independently encoded drawing, saved pre-shell geometry and compiled geometry as separate evidence. Compiler and Manifold declaration bytes are pinned. The fixed 100µm exterior-deviation allowance is restricted to the independent finite arch contour bands after the coupled audit passes; actual contacts retain 1µm precision, and positive overlap is never qualified away. Expected contours are not replaced by the candidate contours.

The [independent cleanup probes](../../projects/dai2-daiban/studies/multiview-restart/reviews/upper-r13-checker-independent-review/REVISION03-CLEANUP-PROBES.json) confirm a shared 50µm exterior adjustment passes, while actual 5µm and 70µm pane/frame gaps fail. Wrong side kind/role, reversed side orientation and a missing front cap fail. An interior hole and a difference extending outside the finite feature depth remain unqualified. Duplicate actual faces fail the separate multiplicity audit (76 pairs in this fixture). Inputs remain unchanged.

One boundary of the proof must remain explicit: `CleanupAudit` alone is not complete solid conformance. A fixture with missing pane side faces still passes its cap/profile audit, but the coupled full arrangement rejects it with two failing cells. The final `verify.py` pass requires full arrangement, witnesses, native/feature checks, multiplicity and retention together. Do not report the cleanup subresult alone as a complete extrusion or model pass, or replace the required full runs with these isolated tests.

**Decision:** run the exact revision03 checker, both visual and collision full arrangements, complete physical negative controls and fresh-process reload/binding checks against the unchanged frozen development-03/source-package-02 subject. Preserve every result and raw cleanup-qualified difference. A genuine failure or unresolved numerical degeneracy remains a finding; any checker correction needs a new checkpoint and affected independent rereview. This authorization gives no source-fidelity, body-clearance/FPS, strict PR13 or overall model acceptance. No candidate full run, model change, runtime change or frozen-plan edit was performed by this reviewer.
