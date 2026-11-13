# Shared material library integration review

The review covered default material selection, procedural finish adapters, UV
mapping, image loading, snapshot replay and export packaging. Artistic acceptance
continues through rendered studies; texture pixels and prop distributions are not
fixed by the contract checks.

## Findings and resolutions

1. Approved materials lived in project-specific declarations. Kits silently fell
   back to plain colors or the facade substrate. The compiler now registers
   semantic defaults from `src/materials/catalog.ts`; concrete trim is independent
   of wall coatings. The demo and building study exercise inherited defaults.
2. Texture density acted as an opt-in to component finishing. Kits now supply a
   production default, while density remains an adjustable quality setting.
3. Building and shop shutters had separate older finish paths. Both now use the
   same roller-shutter helper and layered metal sampler. Doors, rooftop hardware,
   facade fixtures and span supports also use shared finishes. Wood and stainless
   use their dedicated adapters.
4. Generic floor wood and asphalt still had separate fallback materials. Both
   resolve catalog roles. Material atlases retain their specialized UV contracts;
   repeat-safe maps are used for generic surfaces.
5. Optional image readers and upload-only browser loading could miss promoted
   assets. CLI, reviewer, exports and demo snapshots now resolve a strict shipped
   image namespace. Explicit readers remain authoritative; workers never reread
   library files during snapshot replay. Export packages visible, used maps only.
6. Untextured wood/stainless overrides could be ignored. Both adapters now retain
   complete override ownership, including plain colors. Reserved builtin IDs
   cannot be repurposed as custom definitions.
7. Sloped trim UVs and horizontal wood member orientation distorted textures.
   Planar UVs now use the actual face plane, molding follows profile arc length,
   and wood member charts preserve longitudinal grain, reflected geometry and
   caller-local tint functions. Cap clipping preserves chamfered outlines.
8. The old default receiver/texel limits rejected an ordinary high-detail
   building with the integrated finishes. High-detail defaults now allow 32,768
   charts, 16 Mi texels and 128 MiB of appearance memory; lower tiers stay bounded.

## Review and verification

Independent contract and implementation reviews found no remaining blocking
issues after the final facade-wood front-direction correction. Architectural
review separately accepted the inspected foundation, balcony, roof and AC
assemblies as visual background-building geometry.

- TypeScript check and production viewer bundle passed.
- Four catalog/binding checks and two focused untextured-override checks passed.
- Browser worker and reviewer texture preparation loaded builtins without
  companion uploads, including all three stainless PBR channels.
- A high-detail building compiled without material declarations, a custom image
  reader, texture-density overrides or appearance-budget overrides.
- Ignored geometry probes checked metric UVs and wood cap geometry, including a
  rotated/reflected member. Rendered overview and close-up evidence remains under
  `generated/building-polish/`.

This was a focused integration pass, not a full repository test run. Explicit
material declarations in older studies remain authored overrides; approving or
editing a study alone does not replace the shared library. New default consumers
inherit changes to the catalog and its assets. See [the material guide](../MATERIALS.md)
for ownership and extension rules.

## Poster and soot follow-up

The user identified another material bypass: facade `notices` still drew plain
colored panels and imitation text bars. They now use `drawPoster` with the approved
16-design atlas, conservative rotated fitting and separate legal paper layers.
An explicit untextured poster override omits these optional notices. The poster
packer now also publishes the canonical library asset.

Opening soot uses actual planned window and door bounds, including balcony
companion windows and roof access. Those bounds affect intrinsic tint only and
remain separate from physical hole lists. Reusable facade textures retain their
recipe keys; local receiving mesh refinement supports soft vertex-color changes.
Finite/tiled finishes include the same exposure in their cache identity.

Both independent reviews accepted the scoped correction after two missing opening
cases were wired in. Type checking, two cache identity/ownership cases and two
existing poster orientation/packaging cases passed. An ignored numeric probe
checked grime-zero neutrality, receiver area/holes/plane/physics and rotated poster
fit. No image snapshots or artistic placement assertions were added. The final
study uses 85,519 triangles and the same 10,135,869 texels as the material baseline;
render evidence is in `generated/building-polish/soot-posters/`.
