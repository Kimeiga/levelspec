# Adaptation provenance

Source snapshot: sibling `3d-modeling-harness` checkout inspected on 2026-11-01.
SHA256 file identities below record the inspected upstream content; they are not
hashes of the local adaptations. No source attribution header was removed.

Adapted the source-first schematic, native-pixel tracing, independent review and
paired-contour principles for XML architecture, plans/sections, building openings,
landings, wall/slab ownership and separate circulation checks. Omitted Blender,
mechanical-part, animation and mandatory image-generation requirements. Originals remain
authoritative; diagrams generated from the candidate do not verify that candidate.

The user subsequently requested optional image-generated CAD simplification,
decluttering and depth/outline aids. The local
[guidance](generated-reference-aids.md) preserves original-first review and treats
these as inferred reading aids. A [courtyard forward test](../../../../projects/dai2-daiban/studies/r02/generated-reference-aids-v1/REVIEW.md)
found invented step-like window-interior edges and generated floor beneath removed
clutter; those failures inform the required comparison with unchanged originals.

The three Python helpers and behavioral tests derive from the listed source scripts.
Local changes require camera declarations/provenance for every individual pair,
validate raw-image crops, preserve source and single-sheet revisions, snapshot
editable assets/manifests, identify duplicate original pixels independently of
metadata, and label schematic/render views in combined architectural boards.
All imports resolve within this skill or Python/Pillow; the sibling checkout is
not needed at runtime. Pillow is optional and can use an isolated environment.

## Inspected source SHA256

- `.agents/skills/reference-3d-modeling/SKILL.md`: `1b163d1ca2666d0edd0b94d960f8db449b795cd6b0a80e3fbc777949277a4cc1`
- `.agents/skills/reference-3d-modeling/references/schematic-workflow.md`: `5a118c040fb5b1e97040adb429161476c9f175a5a4227d847da9c839b41cad71`
- `.agents/skills/reference-3d-modeling/references/photo-contour-tracing.md`: `6ee39afd1f434b37b143d3202933cbc5cd451fc68d73c4eeeb59d230579139d1`
- `.agents/skills/reference-3d-modeling/references/paired-contour-review.md`: `c006c10958c59024bba29dd501abef3534d1d6919729ec8eeff11dbf6319c1aa`
- `.agents/skills/reference-3d-modeling/references/independent-review.md`: `0d35787c97b18310742e8afb1219ff95831f7554d78c7efa8fb26457c4e045e4`
- `scripts/build-reference-review.py`: `c3b5b66999150ab7476c431b380add6239f55ccdb8f2179befa71c70949b6188`
- `scripts/build-comparison-review.py`: `05c691aee5b7b414e8b535675a3a72d6f05efe8953c3fbab4aa218529fc199bd`
- `scripts/compare-model-reference.py`: `107df1fed98579501b339c89f2fc5e49026a734f4a16ab7b78123abbf47ffb3c`
- `scripts/test-comparison-review.py`: `d463760af4f5f14e25ba254599480199a856a8d42f5c345ee798289b49d9b6a5`
- `scripts/model-comparison.md`: `e100599fd3c53002249c28af218bd5e6514a9aec6e7bbbc86571d9117565573a`
