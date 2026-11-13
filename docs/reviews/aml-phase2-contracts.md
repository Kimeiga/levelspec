# AML phase 2 contracts and acceptance

Phase 2 completes architecture/CAD on the native foundation. Phase 3 circulation,
phase 4 terrain, native BSP integration, and phase 5 API retirement remain separate.

## Authoring decisions

- A named host is the exact cut boundary. Nested descendants are included; siblings
  outside that host are not. Explicit infill may occupy a cut. A through opening
  must intersect its host; a notch must additionally reach a host boundary in its
  local X/Z projection. Recess depth is measured from the negative-Y face inward;
  offset shifts that starting plane. It must leave material behind. Opening
  placements are host-local, independent of where their declarations are grouped.
- Wall base/top profiles cover the full path, with ordered distance stations.
  Repeated stations describe vertical steps. Top-floor requires span-floors;
  explicit longitudinal top and soffit anchoring are mutually exclusive. Declared
  base/contact support must cover the entire center path, including holes.
- `face-material` is a nonphysical object with `host`, `face`, `material`, optional
  `profile`, and optional `projection` (`xy`, `xz`, `yz`). Face selectors are
  `all`, `top`, `bottom`, `front` (-Y), `back` (+Y), `left` (-X), `right` (+X),
  `side` (nonhorizontal), and `reveal` (opening-generated faces). Selectors and
  partition profiles use the host's authored frame. Profile boundaries split
  exposed triangles without moving their plane or creating shells. Assignments
  of different materials may not overlap; partial uncovered faces keep their
  original material. A profile may contain holes.
- Assemblies and explicit unions accept `material-owner`, naming a descendant
  preferred for conflicting exposed coincident faces. Without that decision,
  different materials on exposed coincident native faces are errors. Equal
  materials are allowed; buried/interior contacts are not exposed conflicts.
  Ownership does not change geometry. Groups do not compose geometry.
  Explicit `coincident-material="retained-face"` preserves compositor-selected
  source ownership; migration emits this to preserve historical behavior. It is
  order/kernel dependent and cannot share a boundary with `material-owner`.
  It never suppresses conflicting authored paint partitions.
- Sweep profile XY is a cross-section, with all loops coplanar at Z=0. The initial
  section X is cross(world/local Z,tangent), falling back to local X for a vertical
  path. Parallel transport maintains orientation; all framing occurs in local
  authored coordinates before the element/instance transform. Open paths use
  miter sections at corners and closed caps at endpoints. Holes are retained.
  Zero-length, reversing, closed, or self-intersecting/folded sweeps are rejected
  rather than silently unioned or repaired. Curves use the document chord tolerance.
- Source precision, curve approximation, coplanarity comparisons, and clearance
  stay separate. No geometric repair is implicit. CSG retains contributor lineage
  and surface materials, and validates closed operands locally. Subtraction uses
  cutter material on newly exposed cut faces.

## Independently derived acceptance

1. Assembly boxes [0,2] and [1,3], each 2x2 in Y/Z: union volume 12 and area 32;
   no internal faces at X=1 or X=2. Group retains both input solids. Check nesting,
   static/dynamic isolation, instance ancestry, and geometry after reordered members.
2. Host made of nested 0.2m panels at different Y positions: aperture ray misses
   every panel; unrelated crossing root remains. Circular bounding-square corners
   remain solid. Recess wall volume = full volume minus aperture area times depth;
   back ray hits the retained web. Notch at edge passes; enclosed notch fails.
3. Anchored wall crossing a footprint hole must fail before union, even when an
   unrelated box fills it. Profiled wall 4m long, 0.2m thick, top 1->3->1 has volume
   1.6m3; stepped profile sections have exact independently calculated heights.
4. Box 4x2x1: top area8; X/Y profile rectangle [1,3]x[0.5,1.5] yields area2 accent
   and area6 base. A holed partition reduces accent accordingly. Material-only
   edits preserve physical identity and change render identity. Flush partition
   emits no duplicate area or collision surfaces. Overlapping conflicting regions
   fail; adjacency and same material overlap pass.
5. Two coincident boxes of different materials fail in both child orders; explicit
   material-owner selects that material on all shared exposed faces. Partially
   coincident faces must detect only their actual overlap. Completely buried
   different-material box passes. Group conflicts remain ordinary overlap findings.
6. Hollow square extrusion/sweep outer2x2, inner1x1, length3: volume9, end cap area3,
   bore ray misses; outer ray hits. Rotate/scale/reflection preserves local framing
   with transformed volume and winding. Bent sweep validates miter clearance and
   rejects reversal and self-intersection. Test front/side material orientation.
7. CSG boxes union12, intersection4, subtraction4 using the dimensions in item1;
   open/visual operands fail with operand source. Surviving faces retain materials,
   contributors and host relationships. Budget failure/cancellation then next
   successful compile proves recovery; caller source remains unchanged.
8. Public parser/serializer/builder, schema, runtime/export metadata, reviewer
   selection and profiles, CLI .aml/.xml, final collision/render agreement and all
   sixteen Dust II routes remain covered. Browser checks use real geometry and
   do not substitute for collision/navigation assertions.
