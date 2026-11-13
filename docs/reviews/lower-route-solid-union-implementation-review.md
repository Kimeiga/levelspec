# Lower-route solid wall union: independent implementation review

**Final disposition: accepted for the bounded helper extension and Fan/left-return physical wall replacement. No material implementation finding remains. Overall runtime validation, source fidelity and route acceptance are not closed by this review.**

Applied readable-TypeScript guidance to the project-local MJS process boundary and reference-level-authoring guidance to physical ownership. Read the independent pre-test assessment. No production, helper, builder, canonical, source CAD, CLI or server was edited by this review.

## Helper inspection

Reviewed `projects/dai2-daiban/union_masonry.mjs`, SHA256 `65310c10546153de6916fe15187184e719fb7d0813921c91031d83b5184de16f`.

The bounded change is coherent. No arguments retains explicit `none`; exactly `--collision none|solid` selects the requested intent. Extra, repeated, missing or unknown arguments fail before reading stdin or creating the kernel. Input records must preserve that exact collision string and one explicit material; no coercion relabels nominated owners. The existing `author.py` R-masonry caller still supplies no arguments and remains render-only.

The repository GLB parser performs the asset coordinate conversion and `transformPropPoint` applies each declared transform once. Input Manifolds, union output and decomposed diagnostic components are registered for reverse-order deletion in `finally`. Invalid or empty input solids and failed/empty unions reject. `kernel.Mesh` is a JavaScript mesh-data object, not an additional undeleted Manifold allocation. The helper reports connected components; requiring one component belongs to the bounded construction caller. Metadata alone does not establish actual collision authority.

No material helper finding from code inspection. The final caller must still nominate only the Fan wall and left alcove return, verify one successful solid output, write the replacement before retiring the exact two owners/assets, preserve floors, and prove its actual exterior appears in the public collision mesh. Source fidelity and route acceptance remain independent.

## Final builder and ownership review

Reviewed final `studies/r02/lower-route-construction-v1/build.py`, SHA256 `a6e663c38eae536c0d66b928453edcde97eed25034d392c7ae74d7e48f27a78f`, identical to the copy archived in `generated/dai2-daiban-review/lower-route-local-v1-source-r02`. Final XML SHA256 is `9b1657a66fd39c3fe0bdbfe8a45ab1734072531cf616e60f79f99f3b9fe71691`; union asset SHA256 is `eb0f1d765c78b47dde2f6a563437a66365792c9ec86514484c9e8bbd151fc4df`.

The caller nominates exactly `LC-Fan-wall-boundary` and `LC-left-alcove-return`. It forwards their declared material, collision and XML TRS, explicitly invokes `--collision solid`, and requires `NoError`, one component and reported `solid`. It writes the replacement GLB before removing the two active props and their dedicated declarations. The new `LC-Fan-return-union` is an identity-transform asset with `collision="solid"`; helper-baked transforms are not applied again. Floors never enter the nomination.

My independent old/new XML audit confirms exactly those two props/assets are retired, with exactly one replacement prop/asset added. All six floor/stair regions and markers are unchanged. Every retained asset has identical bytes. The only other changed prop is the declared column foundation extension: bottom −2.07 to −2.17 m, top unchanged at 4.20 m. Its lower face no longer coincides with the ground slab's underside; this is separate from the nominated wall union. Unreferenced staged wall GLBs may remain on disk, but have no active scene ownership.

## Actual public collision verification

I compiled the final XML through the public API with the repository GLB resolver and navigation disabled, then selected public `collisionMesh`. The union has one nondynamic collidable surface, and its rendered and collision triangle multisets match exactly at 1e−6 m. Thus collision intent is present in actual public geometry rather than merely reported by the helper.

Independent emitted collision measures are volume **5.795941657226775 m³** and area **68.58151509198319 m²**, against independently derived **5.795941546098754 m³** and **68.58151764692816 m²**. Both pass the 1e−5 absolute comparison; the small errors are consistent with the existing Float32 asset/kernel path. The union bottom area is **0.9624835673599001 m²** within 1e−6. No snapping, dilation or owner relabeling was added.

The prepared GLB has 28 triangles; compiled render/collision have 26. My initial equal-count assumption failed and is retained in `INITIAL-ASSUMPTION-FAILURE.json` and `audit-r01-failed-28-assumption.mjs`. Follow-up shows every non-bottom face matches. Three coplanar bottom triangles become one outer triangle after removal of an interior vertex: all old vertices lie in the new triangle, orientation is unchanged, and total bottom area is equal. This is geometry-preserving compiler retriangulation, not a missing wall or a reason to require a fixed triangle count.

Evidence and repeatable reviewer script: [COLLISION-AUDIT.json](../../generated/dai2-daiban-review/lower-route-solid-union-implementation/COLLISION-AUDIT.json), [OWNERSHIP-AUDIT.json](../../generated/dai2-daiban-review/lower-route-solid-union-implementation/OWNERSHIP-AUDIT.json), [audit.mjs](../../generated/dai2-daiban-review/lower-route-solid-union-implementation/audit.mjs).

## Validation and limits

I independently exercised five malformed argument classes (missing value, unknown value, repeated flag, positional mode and trailing argument); all rejected with nonzero status and empty geometry stdout. The separate test reviewer independently ran the durable 18-case suite and geometry-corruption negative control; see [test review](lower-route-solid-union-test-review.md). Its actual input-pair measures also agree with the unequal-height oracle.

My geometry-only public compilation has no diagnostics. The archived full runtime validation is **not successful**: it retains one `NAV_UNCOVERED` error reporting ten samples. It has no surface-contact error. This review accepts the narrow physical union implementation, not that remaining navigation issue, global route reachability, construction adequacy, source-profile fidelity or the whole local/canonical model. Existing R default-none policy remains strict and unchanged.
