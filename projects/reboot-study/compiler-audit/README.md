# AML compiler audit prompted by the map reboots

Implementation follow-up: see [implemented fixes and validation](implemented-fixes.md). The audit observations below describe the pre-fix baseline.

The three reboots are paused at the user's request. This audit reviews the compiler and reproduces relevant failures; it does not modify production compiler code or advance the maps. Pause-stage/source identities are recorded in [../progress.json](../progress.json). The working tree contains substantial earlier work, so conclusions apply to the source hashes retained in `evidence-manifest.json`, not an assumed clean Git revision.

**Several improvements belong in the compiler. The strongest immediate fix is trustworthy connection and route validation.** Building-aware construction would also remove repeated manual work, but some recent failures already have supported AML solutions that the map generators did not use.

**User-specified diagnostic policy.** Definite invalid input and demonstrated violations of declared requirements are errors. Conditions that might be wrong but could be intentional must produce non-blocking warnings so an agent can find and inspect them immediately. Lack of a building-envelope declaration is not a reason to remain silent about suspicious walls, roof seams or small gaps.

| Finding | Severity and action |
| --- | --- |
| Supplied connection path does not exist | Error: invalid source reference. |
| A required body-sized passage is demonstrably obstructed, or an explicit clearance volume intersects collision | Error: the declared requirement is violated. |
| Two required independent entrance resources are demonstrably only one physical mouth, including duplicate declarations | Error: the required count is not met. Do not equate a conservative sampling undercount with proof of failure. |
| A sampled check cannot establish enough crossings | Warning describing the uncertainty and inspection target; incomplete evidence alone is not a demonstrated geometric failure. |
| Tall isolated wall fragments, an apparently unclosed roof step, or a small wall/guard seam without explicit closure intent | Warning: show the suspicious geometry and why it may be unintended. An agent can determine whether it is a parapet, opening, setback or construction defect. |
| A declared closed shell has a demonstrated unpermitted opening | Error: the explicit enclosure requirement is violated. |

Every spatial finding should include a stable code, implicated object IDs and XML source locations, world-space bounds and a useful inspection camera/link, measured evidence, and a concise explanation of what needs checking. Reuse the existing inspection and geometry-fingerprinted acknowledgment machinery. Warnings should appear in the normal compiler/CLI diagnostic output and reviewer warning list; they must not be discoverable only through a separate optional suggestions pass. This is the target policy for the upcoming changes: current heuristic findings still use the existing separate `suggestions` API. No runtime behavior has changed in this audit.

| Observed reboot issue | What the audit established | Appropriate response |
| --- | --- | --- |
| Intended openings needed separate physical walks even after navigation validation | A connection only checks that both final floor records exist. Its named mouth path is ignored by ordinary compilation. Endpoint routes can legitimately detour. | Validate declared mouths and provide explicit local traversal assertions using the unchanged player body. |
| Independent-route requirements can be misleading | One blocked mouth plus one open mouth satisfies `min-routes=2`; declaring one mouth twice also supplies a reported count of two. CLI validation succeeds. | Use physical entrance resources for the physical route requirement at the common validation boundary. Reuse the existing producer analysis. |
| Tall detached lightwell wall fragments | Ninefold's layout generator assigns ground boundaries a blanket 9.5 m top and clips against upper walk domains. Mismatched courtyard footprints leave remnants. The compiler builds those literal walls correctly. | Preserve building/storey ownership during translation; use roof/floor anchors and explicit setbacks. Add envelope checks for declared ownership. |
| Missing fascia between different roof heights | No whole-building enclosure requirement is declared. Separate roof objects do not cause the compiler to construct the missing vertical shell. | Add an explicit building-envelope authoring/assertion contract; existing anchored walls already construct individual fascias. |
| Repeated stair headroom/width repairs | R02–R05 already emitted `NAV_HEADROOM` / `NAV_WIDTH`. The report has sample positions, but summary diagnostics identify whole floors and omit the offending objects. | Improve obstruction attribution and inspection links; emit existing clearance assertions at intended passages. |
| Small guard/wall joints and unusable underside pockets | No reduced case established a failure of the current wall-join or stair-underside contract. Intentional sloped cavities and separate attachments are allowed. | Author explicit joins/undersides. A future attachment helper could derive connected seams from declared relationships; do not globally fill gaps. |
| Repeated terraces, uniform stairs, weak tactical choices | These were present in the layout before AML compilation. | Continue spatial/strategic design review when the map work resumes. Compiler geometry fixes do not resolve these decisions. |

**Confirmed validation defects.** At [compiler.ts](../../../src/architecture/compiler.ts#L1933), each connection produces a semantic graph edge whenever its two floor records exist. Neither the existence nor the location of `connection.path` is checked there. At [validate.ts](../../../src/vector/validate.ts#L560), one navigable endpoint path establishes reachability, while `disjointRoutes` comes from a max-flow calculation over those declared semantic edges. Duplicate declarations increase capacity without adding geometry.

The reduced blocked-mouth example has two adjacent floor patches, a divider across their boundary from y=0 to y=6, and an open crossing from y=6 to y=8. The lower declared mouth lies inside the divider. Compilation reports no diagnostics, a 10.632 m route around the divider, and **two** disjoint routes. `levelspec validate --nav-cell 0.125 --json` also returns success. The detour itself is valid; using an unverified semantic count to satisfy the two-route requirement is the failure. Exact CLI evidence is `generated/reboot-compiler-audit/blocked-mouth-cli.json`.

The independent control adds a second declaration for the same continuous mouth. Ordinary validation reports count 2; [produceDocument](../../../src/architecture/producer.ts#L79) rejects `PHYSICAL_ROUTE_REQUIREMENT` using [physicalRouteEvidence](../../../src/authoring/physical-routes.ts#L309). This existing implementation accounts for contiguous mouth resources and physically separated components. It is conservative and sampled, not continuous gameplay proof. Move/refactor the shared responsibility to an appropriate validation layer rather than adding a second competing capacity calculation or importing producer publication back into compilation.

Reference validation needs its own correction: `path="absent"` also compiles without a diagnostic. The producer only rejects it when the missing resource makes a route requirement fail; without a route, even producer publication accepts it. A supplied invalid reference should receive a source-linked error before geometry/navigation. An omitted optional path is a distinct current API case and requires an explicit contract decision if the vocabulary changes.

**Local passage intent needs to survive translation.** A connection's path describes a mouth span, not a movement centerline. A future physical connection check should establish a body-sized crossing through that span, with local support and headroom on both sides; requiring every endpoint to be traversable would wrongly reject normal guard/wall margins. It must not substitute a remote detour for that crossing. An ordered itinerary assertion can separately replay waypoints through landings. The existing collision-aware movement machinery is a starting point, with its bounded-step limitations retained.

Ninefold also collapses many designed rooms into a large floor object at each height ([author.py](../../ninefold-reboot/author.py#L69)), and emits journey routes with only start/end markers ([author.py](../../ninefold-reboot/author.py#L208)). Consequently the compiler does not receive the original room/portal graph or the full journey. Preserving area ownership and named portals is part of the generator-to-AML fix; stronger validation cannot recover relationships that were discarded.

**Existing construction capabilities resolve part of the workload today.** The lightwell wall height originates in [draw-layout.py](../../ninefold-reboot/layout-l02/draw-layout.py#L149), not in an extrusion height invented by the compiler. A reduced literal wall compiles to 9.5 m. Replacing its height with `base-floor="floor" top-floor="roof" span-floors="true"` makes its physical top 6.65 m, exactly below a 6.9 m roof with 0.25 m thickness. The same mechanism creates a fascia from a low roof's top at 3 m to a high roof's underside at 5.75 m. Roof-hole edges and changes of roof ownership still need explicit wall splits/setbacks; anchoring one segment does not solve the complete courtyard assembly.

The reboot sources used literal wall heights and manually decomposed openings rather than these anchors or `<clearance>` assertions. A reduced 2 m passage assertion immediately reports `AML_CLEARANCE`, naming both the passage and its intruding 1.8 m lintel. Existing clearance can also require complete floor support and catch a gap inside its footprint. It does not automatically describe a swept, turning, nonplanar stair journey.

For low spaces beneath stairs, the source must state whether they are an intended passage, inaccessible void, or solid construction. All five native underside modes are already implemented and covered by tests. Automatically filling every low cavity would remove legitimate underpasses. Likewise, an explicit playable domain can describe required circulation without claiming that every exposed recess is a standing route.

**Building envelopes are the useful larger extension.** The compiler currently has physical assemblies and local enclosures, while `<room>` is deliberately metadata. It has no declaration that a specific volume must be enclosed by a particular floor, roof, perimeter and set of intentional openings. A new envelope contract could own those relationships, derive walls/fascias around height transitions, and diagnose uncovered shell intervals and unsupported/detached remnants. It should account for roof thickness, courtyards, skylights, setbacks and intentionally taller adjacent buildings. This is a proposed capability, not an existing feature or a defect in arbitrary free-standing walls.

The first increment should warn about suspicious shell intervals and detached remnants, with review bounds and source IDs, even when ownership has not yet been declared. An explicit enclosure assertion can make a demonstrated missing closure an error. Deterministic shell construction can then share that ownership model. This would address the repeated architecture work more directly than collecting map-specific coordinate patches or globally clipping every wall to the nearest roof.

Recommended order before resuming map production:

1. Fix supplied connection-path reference validation and unify physical route-resource checks across direct compilation, CLI validation and producer publication. Preserve valid two-mouth controls, transformations, collision semantics, cancellation and work budgets.
2. Add explicit local passage/itinerary checks, and retain those relationships when converting the plan to AML. Improve nav diagnostic blocker attribution; sample coordinates already exist.
3. Use existing floor/roof anchors and clearance volumes in the translators. Add inspectable warnings for suspicious shell geometry; establish an explicit building-envelope contract for required closure and deterministic height transitions.

The scope of the first change is well supported by reproductions. The envelope work needs a small contract/fixture design before implementation. No automatic map geometry edits are justified merely by proximity or a short wall segment.

**Evidence and checks.** The independent coverage review ran 87 focused existing tests successfully: route paths, clearance volumes, wall anchors, circulation, enclosures, physical route integration, movement collision and geometry suggestions. The reproduction scripts record current behavior without turning defects into desired test expectations:

```sh
node projects/reboot-study/compiler-audit/coverage-repro.mjs
node projects/reboot-study/compiler-audit/reproduce-construction.mjs
node bin/levelspec.mjs validate generated/reboot-compiler-audit/construction/blocked-mouth-alternate-route.aml --json --nav-cell 0.125
```

Exact reduced AML and observations are retained in `generated/reboot-compiler-audit/connection-coverage/` and `generated/reboot-compiler-audit/construction/`. See [coverage-review.md](coverage-review.md) and [implementation-review.md](implementation-review.md) for independent findings and evidence limits. The audit does not claim a full repository test run, continuous collision proof, architectural engineering certification or gameplay balance. No production compiler fix has been applied.
