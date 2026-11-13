# R12 implementation review

Status: **Development-03 released for bounded diagnostic capture.** The development-01 contact-overlap and incomplete first repair findings below are resolved by the reviewed development-03 partition. This is implementation review, not source, circulation or whole-model acceptance.

This independent review covers the TypeScript translation of frozen R05 plus additive R06 into model-r12, against frozen model-r11. It does not approve source fidelity, actual FPS circulation, or the unresolved lower-branch clearance. No model or frozen evidence has been edited by this reviewer.

## Authority and prepared checks

The release is `projects/dai2-daiban/studies/multiview-restart/reviews/model-r12-drawing-release.json`, status `released-for-one-bounded-r12-diagnostic-translation`. R05 freeze SHA256 is `c96156791b2bb4281950d1d6602b92d0a0fdac11a4b9748b6ae8eb7d1149d697`; additive R06 freeze SHA256 is `3f4e9e523ba2509a64962968d77f7c9c5410c708c955796f6921769c043af310`. The independent numerical contract is the final R05/R06 section of `middle-corner-preimplementation-verification-review.md`.

The review will examine complete physical ownership and saved output, not merely nominal input records:

- Common floor/roof top7.225, soffit6.985; complete ten-cell N-MID reshape from5.970 to7.225, retaining the low endpoint and owning the highest-cell apron strip once.
- FE1's nine cells, LE1, FE0, FE2/H6 and ST2 retained context, with bounded comparison of legitimately retessellated shared resources.
- Complete lower-N contact hosts in their explicit world-X/world-Z frame, every retained lower opening and infill, and removal of obsolete higher caps.
- Complete C-PKT floor/roof, green floor and threshold family; G303's full new bottom7.225/head9.945 and the unchanged closed lower leaf5.145..7.195.
- Retirement of the internal G-LN-N1/G-LN-E1-EAST/O-N-UP-CONNECT closures while retaining G-LN-E1-WEST and actual exterior protection.
- Full circular cut across every coincident screen/flank host, preserving native stairs and finite rail material.
- Full R06 return X5.20..5.38/Y9.20..10.45/Z6.985..10.10. Its floor/south-wall triple cell must have neither duplicate material nor a subtraction hole; gross volume .700875m³, shared union .132570m³, and conditional residual .568305m³ are independent targets.
- Full D-PKT-UP cut through both W-PKT-E and W-GU-E, including the .032130m³ upper-host intersection, with leaf collision distinguished from opaque host refill.
- Input and saved-package identity, real geometry semantics, appropriate focused TypeScript checking, and the independently authored verifier's discrimination of the relevant failure modes.

The nominal lower clearance1.840m remains a verification target. No reduced body, roof notch, shortened door or invented connection is permissible. The implementation review cannot replace ordinary standing FPS evidence.

## Preparation evidence

Read root `AGENTS.md`, the TypeScript/test/reference authoring skills, current documentation index, staged and independent review guidance, release authority, R05 drawing-to-owner map, R06 repair owners, and the numerical verification contract. Inspected model-r11 authoring orchestration, native-floor partitioning, contact-profile handling, shared rear union, east enclosure and saved-source compiler.

At preparation time model-r12 did not yet exist. The repository TypeScript configuration excludes `projects/`; therefore `npm run check` alone will not establish type safety of the new builder. A focused check must include its changed project files and imports.

## Development-01 implementation verdict

Reviewed source SHA256 `268608de6d8a8864ae26b6275ef9f555262d6fbea2581f05f3fd12676ea8dc41`, compiled SHA256 `94c4b647e2513df1ce1351fdf56bb6ba2a2c57c70d6b96ac59b0237e0ee0b71b`, and geometry hash `c25da96c75de154f1a9ec8b0b139fdb91cdd2977cd214af50429fc3cc261e75a`. All files listed by the candidate `SUBJECT.json` match their recorded hashes. The comparison parent is the exact frozen r11 compiled SHA256 above, located at `generated/dai2-daiban/multiview-model-r11/development-02/compiled.json`.

### Blocking finding: lower-N contact caps duplicate native stair material

`model-r12/author.ts:499` rounds each reviewed contact cap upward to the millimeter lattice. With the new .1255m native rise, odd cells retain half-millimeter soffits: the first cap5.8555 is emitted at5.856, the third6.1065 at6.107, and likewise for cells5/7/9. The complete profiled walls are then emitted through `compactPanel` at line558. That path handles common-floor cuts but does not subtract the actual native stair volumes. Native-floor keeper processing later in the builder only partitions floors; it does not remove this wall-versus-stair duplication.

Independent actual-triangle probes at `(X,Y)=(1.61,8.79),(2.45,8.79),(3.30,8.79),(4.13,8.79),(4.86,8.79)` fail single-ownership checks in both visible and static-collision geometry. At the first point the wall and N-MID stair overlap over Z`5.855500221252441..5.855999946594238`; the remaining four witnesses show the same approximately .0005m duplication. The exterior union is continuous, so a union-only test would miss this defect. These witnesses lie in cap interiors, away from riser seams.

Evidence: `generated/dai2-daiban/multiview-model-r12/implementation-review/contact-overlap.json`. The helper is inherited from r11, but the released r12 translation still must satisfy its separate1e-6m multiplicity contract. The documented1mm coordinate bound and .0011m exterior endpoint tolerance do not waive positive overlap. Repair the contact ownership at emission/partition, preserving complete reviewed unions, lower apertures and native tread dimensions. Simply lowering caps could exchange overlap for cracks, while rounding the native stair would change its contract; neither is an acceptable unreviewed substitute. Recheck both sides of all transitions and the complete affected contact family after repair.

### Other reviewed implementation paths

The new `middle-corner.ts` is a narrow, readable adapter over the existing builder. It binds the coordinator release and six drawing/map inputs before geometry allocation, applies full R05/R06 owner bounds, changes N-MID's high endpoint without translating its low endpoint, and retires the complete specified internal closures. FE1 remains native and unchanged. The former aggregate FE1 guard becomes nine complete released guard cells, with a shared bore across screen contributors. The full return replacement and shared lower-door cut are applied before final wall/floor emission; no local roof notch, shorter door or smaller player was introduced.

The common-floor ownership exception is applied in both rectangular and compact-panel emission, covering W-NMID-BAY-RETURN and W-N-UP. Independent triple-corner probes found continuous, singly occupied floor material; return-band probes found the full new base extent. Material-filtered doorway probes found no W-GU-E/W-PKT-E host material inside the released full void. The original closed lower leaf occupies its retained .18m depth, so closed collision there is expected. G303 probes confirm its full lowered leaf; sampled E-circle interior rays remain open. These local passes do not override the contact failure or constitute full structural review.

All44 R05 drawing entries plus the R06 return have implemented physical mappings. The five copied geometry/resource helpers are byte-identical to r11; the reload script only changes default paths. Exact export-solid comparisons found10,916 unchanged physical owner records, including FE0, FE1 and N-HIGH. Reassigned floor serials require the independent bounded retained-context audit rather than treating changed names as changed geometry. Camera input files and actual camera poses are unchanged; only parsed XML source locations move. Player height1.8/radius.25 remain unchanged.

### Validation and limits

- Focused strict TypeScript checking passed for `author.ts`, `compile-source.ts` and `model-r12-author-contract-checks.ts`, including all imports and `src/vendor.d.ts`. The first direct invocation omitted that existing ambient declaration and failed on `cdt2d`; including the repository declaration resolves it without code changes.
- Reviewed the author contract test's seven independent input mutations, valid-read recovery, and unchanged real-WASM success/failure cleanup coverage. Its saved report passes. Those checks do not test the contact partition; the independent conformance probe correctly detects that gap.
- Independent lightweight geometry checks passed49/49 in each of visible and static-collision modes for triple cells, return band, complete N tread material, common slabs, door host absence, full G303 leaf and sampled bore interior. The separate targeted contact checks fail5/5 per mode. Scripts/results are retained under `generated/dai2-daiban/multiview-model-r12/implementation-review/`.
- Initial lightweight door expectations incorrectly assumed a .04m lower leaf and ignored a retained wall below the final N cell. The frozen R05 ledger explicitly retains the .18m lower leaf; W-PKT-W accounts for the lower occupied interval. Corrected the assertions without changing stations or model geometry, and added host-material isolation. `initial-result.json` preserves the rejected assumptions.
- The candidate retains seven strict `FLOOR_EDGE_GAP` errors. This review does not waive them, the1.840m lower-branch standing clearance, the separate conformance checker's remaining geometric findings, PR13 results, source/camera holds, or actual FPS acceptance. It does not claim complete retained-context or full-circle exterior certification from the lightweight probes.

No production, model, plan or frozen evidence was edited by this reviewer. The contact repair requires follow-up implementation and conformance review before this HOLD can be cleared.

## Pre-export repair review

Reviewed the proposed exact-companion interception against the preserved development-01 source snapshot. The narrow CSG approach is appropriate in principle: retain the same finite exterior and complete cuts, then subtract actual native tread/floor keepers. `SelectedAssembly.difference` adopts its result and releases the owned subject while borrowing the cutter; temporary cuts are released in `finally`, and the author invocation's outer `finally` releases remaining handles. The focused strict TypeScript check passes.

The first proposed correction is **not released for export yet**: it intercepts only `compactPanel`, but the frozen R05 W-LOW-RETURN has kind `wall`, so its actual path is `emitElevation` → `wallBox` → `rawWallBox`. Adding the owner name to `middleContactHosts` does not reach that path. The existing checker records six positive overlaps under this return at X4.952/5.04/5.128 and Y8.702/9.04, where the6.8595 cap rounds to6.860. Include this complete host in the exact partition before export.

After the correction, verify native floor support and thickness/under-floor material as well as points/loops: contact panels no longer enter `solidWalls`, which changes floor keeper inputs. The full physical union may remain correct under revised ownership, but that must be demonstrated rather than assumed from equal walking-top polygons.

## Development-03 follow-up and bounded release

Reviewed compiled SHA256 `5dd49af2e429ce2744094bc4796ffac41c4bdd99466f0ed8875e9659aa83c182`, XML SHA256 `721c071d7aba7d0c9e061b6727ee7b14264c5c1cc2475588411691d79a6d1c5d`, geometry hash `0810cfe4f239d0dcfec4251ba4a02666f6590b59e15e07ae4ab374971b747ace`. Independently verified all155 files listed by its `SUBJECT.json`. The fresh saved-source reload is byte-identical to this compiled candidate.

The correction now intercepts W-LOW-RETURN's actual `rawWallBox` path after computing its normalized physical box, as well as the profiled `compactPanel` path. Nine finite contact companions are emitted: eight W-N-LOW bands and one W-LOW-RETURN contribution. They retain the original complete bounds/cuts and receive exact native-tread/floor subtraction through the existing owned-resource emitter. W-LOW-PORTAL has boundary contact at Y9.20 rather than a positive tread intersection and remains native. Actual companion aliases are mapped back to logical owners after emission; each affected owner is implemented.

Development-02 exposed the predicted floor ownership regression and remains preserved as a rejected diagnostic. Development-03 restores the original finite, opening-bearing floor ownership masks in `contactFloorKeepers`, used only by native-floor emission. These masks are not added to the companion CSG keepers, so they cannot subtract their own physical replacement. This is a consistent division of construction ownership: native floors retain their prior volumes, while the actual exported contact solids are partitioned against those floors and the native stairs. Resource handling remains within the existing registry and outer exception cleanup; no runtime/compiler helper changed.

Independent follow-up results:

- Strict focused TypeScript check passed for the builder, reload script and author contract checker, with existing ambient declarations included.
- All70 targeted checks pass in visible mode and all70 pass in static-collision mode. These repeat the prior triple-return/door/tread/floor/bore checks, add three Y stations across each of the five previously duplicated caps, and include all six W-LOW-RETURN failure stations. No positive overlap or gap is accepted by the separate1e-6m interval contract. Saved reproducible evidence is `generated/dai2-daiban/multiview-model-r12/implementation-review-03/probe.py` and `result.json`.
- Independently compared complete `exportSolids` records for all50 native floor/stair owners with development-01: exact equality, including side/underside geometry and surface contracts. The complete compiled `floors` data is also exactly equal, a stronger check than walking-top point/loop parity alone.
- Independently byte-compared all126 prior GLB assets against the preserved development-01 source snapshot: all identical, including under-floor companion material.

The specific implementation blockers are cleared. **Release development-03 for the planned diagnostic captures and subsequent independent reviews.** This does not clear the seven strict floor-gap errors, broader conformance/retained-circle findings, source/camera hypotheses,1.840m lower clearance or normal-controller circulation. Full contact-transition conformance and negative controls remain the separate checker review's scope; the implementation evidence above is targeted and does not claim exhaustive proof.
