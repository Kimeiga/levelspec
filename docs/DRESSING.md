# Procedural dressing

Production material defaults and override/loading contracts are documented in the
[shared material library](MATERIALS.md).

AML can apply the seeded `kowloon-street@1` kit to explicit floor, wall, and
building hosts. The compiler generates ordinary render geometry, texture UVs,
and material weathering colors. Lighting and shadows are rendered in real time;
the demo uses no baked lighting, lightmaps, or ambient-occlusion textures.

```xml
<dressing theme="kowloon-street@1" seed="court-01"
          grime="0.7" wear="0.3" detail="medium">
  <wall host="courtyard-wall" face="back" material="mosaic" windows="true"/>
  <floor host="courtyard-floor" material="concrete"/>
  <building host="building-mass" base-wall="building-ground-wall"
            material="plaster" stories="4"/>
</dressing>
```

Hosts and materials must already exist. Rules use resolved object IDs and allow
one recipe per host. An absent dressing section preserves ordinary AML behavior.
See the complete [demo source](../projects/dressing-demo/level.aml).

## Controls

| Attribute | Contract |
| --- | --- |
| `theme` | `kowloon-street@1`; pins this kit's recipes. |
| `seed` | Required nonempty string; repeat builds reproduce the variation. |
| `grime` | 0–1, default 0.4; broad finish darkening, plus damp rising from plain wall bases and run-off below ledges and rooflines. |
| `wear` | 0–1, default 0.2; fading of the receiving finish and loss of paint or render from walls, first where they stay damp. |
| `detail` | `low`, `medium` (default), or `high`; controls wall detail and how much buildings carry. On buildings it never changes the `envelope` or `openings` parts, and raising it only adds fixtures, signs, rooftop equipment and, from `medium`, explicit roof paving joints and hairline cracks. Tile units and grout remain visible at every detail level; existing construction and damage placement stay fixed. |
| `finishes` | Optional dressing-level prefix naming the author's kit finish materials, described under [Kit finishes](#kit-finishes). At least one `<prefix>-<role>` material must be declared. |
| `material` | Required declared material on each rule. Its texture repeat is honored. |
| `wall-materials` | Optional dressing-level list of 1–8 distinct declared substrate materials for plain walls and building tenements. Textures, colors, repeat, and surface response are preserved. |
| `face` | `front` = −Y, `back` = +Y, `left` = −X, `right` = +X, `top` = upward, `side` = vertical sides, in host coordinates. Floor default is `top`; wall/building default is `front`. |
| `windows` | Boolean, default true on walls/buildings and false on floors. Building revision 1 requires true. |
| `stories` | Building-only positive integer giving the stories of the tallest tenement; default derives from height. Each story must fit at least 2.8 m, with 0.35 m reserved above for the roof. |
| `shops` | Building-only chance, 0–1 (default 0.15), that an eligible bay of a large building opens onto a stocked shop; see [Shops](#shops). |
| `base-wall` | Optional building-only link to a native physical boundary, described below. |
| `texture-density` | Optional raster resolution override, 16–1024 texels/m. Facades, components and doors use production materials by default. Allocation remains subject to appearance budgets. |

Per-rule `grime` and `wear` override global values. Texture coordinates have stable
offsets and rotations; continuous large-scale color variation reduces repetition.
These are material variations, not illumination baked into the model.

Floors support slabs, landings, stairs, and ramps. Generic finish tint uses broad
seeded mottling rather than searching nearby wall contacts. Finite contacts still
guide ground layout, passage widths and litter placement, including doorway gaps.
Explicit face-material assignments win over wall/floor dressing.

Automatic windows require a straight, vertical, planar wall face. The generator
fits complete bays inside exposed wall triangles and avoids authored openings.
If none fit, a source-linked spatial warning identifies the receiving area.
One wall keeps one window construction, frame color and bar pattern; only what
each household shows behind the glass differs. Wall windows project at most
0.15 m.
Generated panes and building doors are opaque visual details. Use native AML
openings and glazing for functional openings; this kit does not create enterable interiors.

## Shared surface finishes

Wall and floor finishes come from two shared models, so a plain wall, a
building façade, a street and a roof terrace differ in their parameters and
surroundings rather than in separate generators. Both layer variation from
broad to fine and both are pure functions of position and seed: the same
surface always receives the same pattern, however it is tessellated.

**Walls** share the *wall condition*. It takes the height of the ground a face
stands on, the ledges that shed water onto it (window sills, slab edges, the
roofline or coping), `grime`, `wear` and a seed, and derives

1. finish mottling: blotchy, non-repeating tone variation of the finish itself;
2. damp: splash-back and moisture rising 0.2–1.3 m from the base, with a front
   that wanders along the wall;
3. run-off: a dirt line under every ledge and streaks of uneven length below
   it, heaviest where water runs off a ledge's ends, plus rain streaking;
4. coat loss: where `wear` has brought paint or render away, most likely where
   the wall is damp or scoured by run-off.

`grime` scales the deposits and `wear` the coat loss; neither moves the other.
Each recipe decides what the condition is applied to:

| | Plain walls | Buildings |
| --- | --- | --- |
| Substrate from `wall-materials` | Broad sections along a wall, with pilasters at changes. | One per tenement, on all its sides. |
| Ledges | The wall's own top edge. | Window sills, balcony slabs, the story line and the roofline. |
| Coat loss | The lower paint band fades where the coat is lost. | Color and normal maps expose a second substrate along the loss field. |

Walls with generated windows (`windows="true"`) and floors, stairs and ramps
without `ground="patched"` use broad seeded finish mottling. Grime darkens this
finish and wear lightens it; generic tint does not trace wall–floor seams.

**Floors** share the *ground pass*. It takes a ground site: an outline, the
walls it meets, a base material and the ground amounts listed under
[Patched flat ground](#patched-flat-ground). The pass plans rectangular pours
on a construction grid, groups them into broad finish zones, then adds repair
pours, asphalt or felt insets with ragged edges, tiled zones with chipped and
missing tiles, joints, cracks, broad grime mottling and water in the low
areas. Tile, grout, shallow chips, repair borders and pigment are composed into
color, roughness and normal maps on the existing pavement mesh. The broad uneven
bed, service covers, physical openings and loose props retain geometry. AML floors with `ground="patched"` and the roof decks of buildings both
run this pass. A roof deck is drawn flat, so the parapets meet it flush, is
sampled more coarsely the larger it is, and leaves out street litter, service
covers and broken concrete.

### Procedural appearance maps

Facades use continuous color, roughness and normal maps by default.
`texture-density="80"` overrides the building default of 64 texels/m.
Detailed component weathering is enabled by default. Plain walls use 32 texels/m and pavement
uses 16 texels/m, with tile patches at 128 texels/m and patches reached by asphalt
on authored floors at 160 texels/m to retain gravel color and normal detail.
Distant generated decks retain their ordinary density. Explicit floor
`texture-density` overrides these defaults. These are bounded defaults, not source-image
resolution guarantees.
The field blends source textures through warped, multiscale coverage masks, with
runoff tied to ledges and fixtures. Sparse repairs have ragged troweled edges in
the normal map; their age determines how much older dirt they cover. Door leaves
receive local paint fading, chips, handle wear and deposits near the bottom.
Neither pigment resolution nor normal-only repair relief changes collision.
Shallow missing render and fracture shading use the maps; authored openings,
window recesses, substantial thickness and detached props retain geometry.

Optional `<prefix>-render-weathered` and `<prefix>-render-repair` finish materials
supply the aged and replacement textures. Their color, UV repeat, normal and
packed PBR channels participate in composition. Without those materials the
recipe uses the wall source. Doors use at least 256 texels/m, or twice the facade
density when higher. These images contain intrinsic material properties, with
lighting still computed in real time.

This path resamples source images at the requested density; it does not preserve
source-resolution grain automatically. Review close-ups before raising density
or adopting it across a large scene. Images are shared across a facade's panels
and a door leaf's rails, with a two-pixel gutter. Every output channel counts
against the existing texel and memory caps; exhaustion fails explicitly. The
default facade treatment remains texture based when `texture-density` is omitted.

Building component maps use physical-meter UVs at 112 texels/m on narrow members
and 128 texels/m on sheets and continuous assemblies. Equal-size
members share maps when their finish, projected gravity, joints and folds match.
Corrugated roofs unwrap their folded cross-sections by arc length. Entrance
shutters use one facade-projected paint field across their modeled slats, with
localized wear at the lower rails and guides. Source textures elsewhere retain
their material's repeats per meter.

The component base finish includes independent multiscale pigment, brightness,
brushing and roughness variation, even without added corrosion. Paint loss,
exposed source material and oxide then layer over it. Rust is restrained and
concentrated at edges and detected joints; wood exposes wood instead of oxide.
Set `grime`, `wear` and `rust` in the dressing section, or override them on a
building, using values from 0 to 1. Rust defaults to wear when omitted.

The scoped geometry detector records emitted bars, boxes, tubes and folded
faces. Inscribed member envelopes find nearby collars/intersections; shared
edges distinguish valleys from ridges. Gravity projects short runoff into each
face's UV directions. The collector freezes before texture sampling, so later
collars affect earlier pipe segments. Detection is limited to each generated
assembly: it is not a general imported-mesh or whole-scene exposure simulation,
and the narrow-member envelope can miss contacts on broad plates. Weathering
adds color, roughness and normal maps, not extra grime meshes.

The native `raster.coordinates="uv"` mode takes canonical coordinates from the
original mesh UVs. It accepts one opaque physical layer and appearance coatings,
rejects height sources and displacement, and preserves original triangles and
smooth normals while binding generated color, normal and packed PBR maps. Final
vertex color is white because the authored paint is already in the map. UV-mode
components do not receive world-plane fixture deposits. A preserved face beside
an explicitly displaced receiver participates in closing their shared edge. Failures locate the
actual receiving triangles rather than projecting canonical UV bounds into space.

Texture recipes can set `raster.bump="sample"` and return normal-only meter
relief in `SurfaceSample.bump`, alongside their color/coverage sample. The baker
retains three bounded rows so neighboring normal derivatives reuse those samples.
Optional `sampleRow` iterators provide exactly one scalar-equivalent sample per
supplied evenly spaced ascending coordinate, including the derivative halo.
Returned scratch objects are copied before the iterator advances, and iterators
close on failure or cancellation. Row storage is charged against the appearance
memory budget. `SurfaceSample.height` continues to own geometric displacement.
Independent bump callbacks remain supported for recipes with separate fields.

Appearance jobs share an 8 ms cooperative work-slice target. Cancellation is
checked between bounded work batches. The target is not a hard latency limit for
synchronous codecs or producer callbacks.

The native `raster.geometry="preserve"` contract composites normalized,
nonnegative material weights into one color/roughness/normal map set. It retains
receiver positions, triangles, smooth normals, holes and ownership, and projects
new appearance UVs through the chart frame. It rejects geometric heights,
finite plate elevations and authored height images; explicitly height-mapped
recipes retain the geometric compiler path. All blended source layers must have
the same effective emission, and coatings must be non-emissive. Raster bump is
normal-only. Each shared map group must describe one compatible field.

The shared native `SurfaceLayer.coatings` contract supports ordered source
materials with independent UVs and opacity fields. Coating count and material
order must remain stable over a raster group; zero opacity represents absence.
Normal-bearing coatings require affine UVs. Coating height does not add relief;
use the raster bump field for microscopic normal-only relief. Currently declared
coating height images are still loaded and validated even though their displacement
is unused. Layers preserve geometric material boundaries and authored base height.
The generated PBR images export in ordinary GLB/glTF without a custom shader.

## Plain walls

Set `windows="false"` on a wall recipe to generate the plain-wall treatment:

```xml
<wall host="alley-wall" face="side" windows="false" material="plaster"/>
```

Declare a substrate palette to vary actual textures, rather than tinting one image:

```xml
<dressing seed="alley-01" wall-materials="rough-concrete repaired-render plaster">
  <wall host="alley-wall" face="side" windows="false"
        material="plaster" tile-share="0.55" wear="0.65"/>
</dressing>
```

The palette references declared materials and preserves their textures, colors,
roughness, normal textures, and physical repeats. Without a palette, the wall
keeps the rule's receiving material. Long straight walls can change substrate
in broad sections; shallow pilasters cover suitable exposed seams, including
collinear joints between separate hosts. Frontage props avoid those dividers.
Continuous curved, sloping, and tilted hosts keep one substrate instead of
changing it at every mesh facet. The shared texture field and
[wall condition](#shared-surface-finishes) add mottling, damp above the base,
run-off below the top edge and a lower paint band that survives only where the
coat has not worn away. No baked illumination is included.

`tile-share` is 0–1 (default 0.35) on plain walls. It controls broad tiled
regions; zero leaves the substrate. Square, rectangular and mosaic patterns,
grout, missing units and correlated wear are texture fields in wall-local meters.
They do not construct or clip individual ceramic meshes. Source color and normal
maps are sampled with continuous affine UVs, and the result is composed into the
wall's map set. Shallow ceramic and plaster depth affects normal maps only.
Native openings, wall silhouettes and separately modeled props retain geometry.
The previous tile-contour tessellator and its geometric peeling policy are retired;
art direction can evolve without freezing their exact distribution in tests.

Plain-wall and patched-floor tile controls can be tuned independently:

```xml
<wall host="alley-wall" face="side" windows="false" material="plaster"
      tile-share="0.85" tile-size="0.18" tile-aspect="1.5"
      tile-wear="0.75" tile-grime="0.6" tile-color="#8caaa1"
      tile-plaster-color="#aaa69a" texture-density="256"/>
```

`tile-size` is tile width in meters, and `tile-aspect` is width divided by height
(the example is 18 × 12 cm). Both must be finite and positive. Omitted dimensions
use the seeded square, rectangular or mosaic family. Wide rectangular units use
staggered rows. `tile-wear` is 0–1 and defaults to the wall's `wear`; it changes
ceramic breakage and paint fading independently of plaster weathering. `tile-color` is a six-digit
sRGB hex base color; the ceramic source texture and surface response still apply.
`tile-plaster-color` independently sets the exposed bedding color using the same
hex format, preserving its grain, roughness and normals.
`tile-grime` is 0–1 and defaults to the rule's `grime`, then the dressing's `grime`.
It adds localized brown deposits, more variation within and between tiles, and
duller reflections. Explicit `0` disables these added deposits; existing detail
in the authored ceramic texture remains. Grime does not affect tile breakage or
the exposed plaster. The brown coating has its own matte roughness, while clean
ceramic retains the source material's roughness instead of inheriting plaster's.
Plain walls also accept `texture-density`, 16–1024 texels per meter, default 32.
Higher densities resolve smaller chips while increasing material generation cost.
Patched floors accept the same controls with their floor defaults below; ordinary
floor, stair and ramp recipes reject these controls rather than ignoring them.

Tile damage is organized into local blobs. Each has three ragged contours at the
same center, and each logical tile deterministically selects one of those three
for each nearby blob. Thus a fracture can step or change shape at a grout line
while remaining part of one damaged area. Independent missing tiles remain, and
overlapping blobs combine as a union. The pattern stays in material/normal maps;
it does not add per-tile mesh subdivision. These are adjustable art choices,
reviewed through exploratory renders rather than fixed visual test expectations.

Missing ceramic exposes gray plaster with concrete-style mineral mottling, grain
and continuous, wavy trowel marks. The bed follows the installed tile area, so it remains under missing units
and grout; untiled areas retain the authored wall finishes. Its shallow normal
relief responds to real-time lighting, with no painted highlights or shadows.
Close-up densities around 320 texels/m resolve the fine combed ridges and granular
relief; coarse maps filter them away to avoid aliasing. Higher densities require
enough appearance budget for the receiving area.
Tile faces stay flat, with narrow millimeter-scale edge bevels composed with the
authored normal map. Grout is darker where ceramic survives beside both edges of a joint;
large missing-tile patches keep a continuous plaster surface. This relief changes
lighting response only, leaving receiving geometry and collision unchanged.
Thin grout gaps follow mostly straight tile edges, with sparse corner chips and
occasional edge nicks. The same joint field shapes ceramic coverage, edge normals,
and grout pigment, with fine chips filtered away at coarse map resolutions.
Soft fractal pigment variation also fades the original tile color and gently
dulls its reflections. Rotated noise octaves follow the concrete wall study's
approach, retaining the ceramic source texture and existing normal relief.
`tile-wear="0"` disables this fading; `tile-grime="0"` removes added dirt while
retaining faded pigment. Fading does not remove ceramic or expose the plaster bed.

Torn notices, meters, jointed pipes, shallow ducts, loose wires, and occasional
closed-shutter fronts supply secondary detail.
Generated shutters and duct grilles are visual props on solid wall, not openings.
Pipes use a continuous ring sweep through rounded elbows, with caps only at
their two ends; metal textures keep their physical scale through the bends.

Set dressing `finishes="kowloon"` to use declared wall prop materials named
`kowloon-wall-ceramic`, `-wall-edge`, `-wall-metal`, `-wall-rust`, `-wall-cable`,
`-wall-paper`, and `-wall-posters`. Each retains its authored color texture,
normal map, roughness and repeat. Missing slots use the shared material library. The
posters slot is the shared padded 4-column, 4-row image atlas: each notice crops one complete
cell upright and outward-facing, independently of material repeat. There is no
procedural imitation lettering when no poster atlas is provided.

Placement considers exposed space and neighboring walls. Compatible receiving
vertical planes whose endpoints meet within 2.5 cm, on the same layer with at least 0.5 m
of shared height, form a continuous run. Smooth bends under 60 degrees join;
sharp corners and ambiguous branches stop the run. Medium/high wiring can cross
multiple AML hosts, and curved facets share one run instead of each receiving a
copy of the kit. Small wall fragments can receive a slim vertical riser. Fine
curves still need enough room for complete attachments; unfittable details are
omitted. Wiring requires exposed wall behind its whole strip and never bridges
an authored hole. At exterior run ends only, wiring may retreat by up to 30 cm
or a quarter segment to fit a clipped native joint. The whole upper band must
still be supported. Large straight faces retain their detail when joined to curves.
Diagonal and rising-base faces use their exposed shape for fitting. Steep tilted
planes use an orthonormal local frame and can receive utilities and tiles; shutter
fronts require an upright plane and a level base. Nearly horizontal surfaces do
not receive wall props.

A shared world-space registry spaces similar generated motifs, including those
on separate nearby hosts. Minimum center spacing is 1.1 m for notices, 2.5 m for
pipes/meters, 4 m for ducts, and 5 m for shutters. A blocked notice can
become a meter; crowded candidates are omitted. This registry covers this wall
pass, not arbitrary authored props or other theme generators.

Assemblies fit the complete receiving triangles, respecting explicit face
materials and authored openings. Props project at most 0.14 m. Physical collision
and navigation remain unchanged. Decorative families have inspectable
`wall-*` surface roles and host provenance; their small parts share draw objects.
Weather controls do not relocate established utilities. Seed changes do.

The default demo includes two distinct generated concrete textures. The
[saved prompts](../projects/dressing-demo/textures/wall-textures-prompts.json)
record the built-in image-generation inputs. Its generated broken-tile image
is visual study material only; the renderer samples a procedural ceramic field
into the receiving wall maps.
Additional [prop texture prompts](../projects/dressing-demo/textures/wall-realism-prompts.json)
and [normal-map prompts](../projects/dressing-demo/textures/wall-normal-prompts.json)
record the generated ceramic, metal, and six-notice atlas assets.
The [wall fixture](../tests/fixtures/aml/wall-dressing.aml) includes an opening,
a connected curve, and a small isolated wall. The
[reference study](research/kowloon-wall-dressing.md) records the visual direction.

## Patched flat ground

Add `ground="patched"` to a floor rule for a horizontal slab or landing:

```xml
<floor host="courtyard" material="ground-concrete" ground="patched"
       patch-size="2.3" material-size="7" relief="0.032"
       wetness="0.32" litter="0.5" repairs="0.55"
       joined-pours="0.8" asphalt="0.18" manholes="0.55" breakup="0.7"
       tile-share="0.1" timber-share="0.025"/>
```

`patch-size` controls the concrete pours; `material-size` controls much broader
finish zones. Their layout follows the AML architecture: floor and hole corners,
wall ends that actually contact the floor, adjoining floor corners, and declared
connection mouth endpoints supply construction axes. The longest authored floor
edge sets the rectangular orientation. Nearby offsets merge to avoid sliver pours;
long spans receive subdivisions that can join into larger rectangular pours.
Joining removes optional interior joints while retaining architectural and broad
finish boundaries. The original terrain sampling stays shared across those joins.
Broad finish borders snap to the same
axes. Rotating or translating a host retains its local pattern, and unrelated
walls on another elevation do not affect it.

Most ground remains concrete, with subtle pour colors, roughly
rectangular pours, narrow worn joints, and branching cracks. Tile areas have
chipped corners and missing tiles, especially where they meet another finish;
rough substrate fills those spaces. Tile and timber occur in connected repair areas rather than independently
changing at each pour. Shares are seeded selection weights, not exact area quotas.
Selected concrete pours contain irregular asphalt insets with coarser relief and
stronger aggregate normals. Their borders have a continuous ragged profile at
2.5–6 cm intervals, with shallow, irregular edge losses cut into the surface.
Broken concrete exposes substrate between surviving
fragments, with larger, more frequent spalls near walls and in narrow passages.
Passage width is measured between opposing finite contacts from different walls;
door gaps, remote walls, and walls on another elevation cannot supply a width.
Occasional iron manholes have a ring, flat lid, tread slots and lifting recesses.
Their complete footprints must fit inside one pour, clear of walls and native holes.
The ground kit owns its default PBR palette; the rule's declared material supplies its
aggregate texture, optional tangent-space `normal-texture` and `normal-scale`,
and UV repeat. Normal textures describe pores and aggregate under real-time
lighting; they contain no illumination. Ceramic and timber use a weaker normal
strength than rough concrete. Use textures without large seams, which the
generator models separately.

Set `asphalt-material="my-asphalt"` on a patched floor to give asphalt its own
declared PBR finish. Its color, roughness, metalness, texture, normal texture,
normal strength, and UV repeat are retained independently of the concrete.
The demo uses a generated photographic asphalt color texture and a matching
OpenGL-style normal texture, with `normal-scale="1.15"` and one repeat per 1.5 meters.
The image prompts and asset hashes are retained with the demo. The composed maps own the ragged material boundary and small gravel relief.

Concrete and asphalt finishes sit on the same uneven pavement bed. Shallow
plate thickness, cuts, spalls and chips affect the normal map. The broad pavement
bed stays within the authored `relief` envelope, and zero relief stays flat.
Water clearance follows the actual retained bed. An explicit authored height
image still requests geometric displacement and its conservative clearance.
Opaque finishes share edges without competing depth layers. Small debris must
fit completely on supported ground.
All finishes are cut from a shared height mesh; vertical edge strips close the
displaced pavement against native slab sides and hole rims.
Native holes and explicit face-material assignments remain clear. Seeded UV
rotation/offset, material texture, pour colors, and continuous spatial variation
work at different scales. The generated mesh and materials export through the
existing GLB/glTF package, without lighting or AO textures.
Compiled `groundPlans` retain the chosen pour rectangles, exact receiving
footprints, and architectural anchors in world meters for diagnostic top-down
views. They describe the same generated pours; they are not a second layout pass.

This is render dressing. Authored collision and navigation remain unchanged.
Relief excludes small litter. Larger physical
steps or uneven terrain must be authored as native geometry. Ground controls are
rejected on stairs, ramps, walls, buildings, and receivers without a single
horizontal elevation; ordinary
floor dressing on stairs/ramps retains its existing behavior.

## Buildings

A building recipe takes a standalone, static box or vertical convex extrusion
with `collidable="false"`.
Widths/depths are 3–40 m and height is at most 40 m. The placement must remain
level and unscaled; yaw and horizontal reflection are supported. The box is a
site, not a silhouette: the generator fills it with a row of tenements.

An extrusion instead preserves its polygon outline as one tenement. Trapezoids,
triangles and clipped-corner footprints use edge-aligned facades and a polygon
roof terrace with mitered parapets. Profiles must be horizontal and strictly
convex, without holes, with at most 16 corners, edges at least 1 m, interior
angles at least 45 degrees, and room for a 0.45 m inward construction margin.
Profile offsets and either winding are supported. The first edge after the
lowest-Y, then lowest-X corner in counterclockwise order is the frontage.
Polygon hosts currently use closed ground frontages: `shops>0` and `base-wall`
require a box host. Their rooftop equipment fits inside the actual roof.

```xml
<profile id="tapered-lot" points="0 0; 10 0; 8 6; 2 6"/>
<extrusion id="tapered-building" profile="tapered-lot" distance="12.35" collidable="false"/>
<!-- Inside dressing: -->
<building host="tapered-building" material="plaster" stories="4"/>
```

- **Massing.** Boxes at least 8.5 m wide are divided along the front into
  tenements of varying width, here and there separated by a narrow service well
  set back from the street. The tallest tenement fills the box height; the others
  step down by up to two stories, keep their own floor-to-floor heights, and may
  jetty their upper stories up to 0.55 m over the street or step them back. With
  two or more tenements and at least three stories, the row never shares one
  roofline. The ground story always spans the complete footprint.
- **Closed shell.** Every tenement is a closed volume. Walls shared with a
  neighbor are omitted where covered and exposed above a lower neighbor. The same
  holds between abutting building recipes whose boxes share an orientation or
  differ by quarter turns. Jetty soffits, setback ledges, roof
  decks and parapets close the rest, so walls meet at their corners.
- **Construction is per tenement.** Each tenement draws one wash, trim, frame
  color, window type, bar pattern, cage color, awning type, balustrade and bay
  rhythm, and repeats them on every story. Columns keep their type from the first
  floor to the roof: punched windows, ribbon windows over painted spandrels,
  projecting balconies, a stair core, or a narrow service bay. Windows and stair
  openings sit in real recesses cut into the wall.
- **Construction detail.** Exposed floors receive chamfered concrete bands;
  window sills slope outward and carry drip edges, secondary glazing beads and
  casement hinges. Service vents have angled louvers and roofs have open
  scupper mouths. The same obstruction checks used for other attachments
  constrain these details. Fine detail adds fasteners and joints between band
  sections; the underlying construction stays fixed across detail levels.
- **Walls weather.** A tenement is built in one `wall-materials` substrate,
  parapets and soffits included, and shows a second where its coat has come
  away; without a palette both are the recipe's material. The wash, each
  household's repainting and the shop dado tint that coat. Sills, balcony
  slabs, floor bands, vents, scuppers and the roofline stain the wall below them, painted balcony fronts and
  spandrels streak below their own top edges, damp rises from the street, and
  `wear` bares the substrate in ragged patches. None of this depends on
  `detail`.
- **Roof terraces are paved.** Each roof deck, and the ledge in front of a
  stepped-back body, runs the ground pass in the recipe's material: screed
  bays and repairs, felt patches, an occasional stretch of red paving tiles,
  broad grime mottling and puddles. `low` detail leaves out joint lines,
  and cracks; the paving itself does not move.
- **Households vary what they own.** Curtains and blinds, washing, plants,
  stored boxes, air conditioners, window cages, whether a balcony was caged or
  glazed in, and an occasional repainted stretch of wall or replaced window
  differ flat by flat.
- **Washing is cloth.** Shirts, undershirts, pants, towels and sheets are cut
  to size, fall into folds and are modeled on both faces, so they show from
  either side where back faces are culled. They hang on hangers square to a
  bamboo pole, threaded onto rack poles by the sleeves, pinned to lines, or
  folded over compatible supports, in faded plain colors. Approved low-poly button
  shirts, trousers and folded sheets use imported geometry with fitted clips or
  hangers. Sheets are clipped below clotheslines; their narrow generated folds do
  not accept poles. Distinct tees, vests, shorts and towels remain procedural.
  Plants use three shared textured meshes with uniform size and seeded rotation.
  See [balcony assets](../projects/kowloon-balcony-props/README.md) for source models,
  measured budgets, local repairs and visual evidence.
- **Air conditioners are separate models.** Window units come with four rear
  grilles and split-system condensers with one fan or two, each in several
  sizes, colors and states of rust, on brackets with drain hoses, line sets
  and the sheet or board an owner put over them. A condenser in a service bay
  stands beside the soil stack, above its branch.
- **Ground story.** The frontage is divided into shop bays: roller shutters
  closed or part raised over stock, glazed shopfronts, scissor gates, service
  bays with meters, and one tenement entrance with pressed panels or a timber
  leaf with divided frosted lights, transom, lamp, number plate and letterboxes.
  Door pulls, capped hinges, panel bevels, gate pivot pins and shutter hardware
  are modeled. Door paint loss follows jagged bands at panel edges, the latch
  and the lower leaf; normal relief stays at paint thickness. Timber entrances
  reuse the shelf atlas through the `shop-timber` finish at its fixed physical
  texel density, including aligned rails, stiles and end grain. Wooden jambs,
  lintels and transom frames share the leaf's timber family, with restrained
  board tint differences and stronger narrow contact wear along front edges. Shops carry fascia signs, and
  awnings or a concrete canopy where the story is tall enough.
- **Street and roof.** [Signs](#signs) project from the piers, lie flat on
  walls and balcony fronts, and stand on the roofs. Rainwater and soil pipes
  run down party lines. Roofs carry stair bulkheads, round and box water
  tanks, sheet-metal huts, drying lines, aerials and parapet fences.

Rear and end walls receive plainer rhythms. Generated doors, shutters and panes
are opaque visual details.

### Shops

On a large building, some shop bays open onto a stocked room instead of
showing a closed front. `shops` on the building recipe is the chance, 0–1, that
each eligible bay does. The default is 0.15, a low rate; 0 keeps every bay
closed. Raising it only opens more bays: a bay that is a shop at one value is
the same shop, with the same trade and stock, at every higher value.

```xml
<building host="tenement-row" material="plaster" stories="5" shops="0.3"/>
```

- **Room-sized footprints.** The box must be at least 4.8 m wide and 5 m deep,
  with at least one story. Individual bays still need the room clearance below.
  Smaller buildings never receive shops; asking one for shops raises the
  source-linked warning `DRESSING_NO_SHOP_FIT` located at the box.
- **Eligible bays.** A shutter, gate or glazed bay on the street front of a
  tenement, at least 2.4 m wide under a ground story of at least 2.9 m. The
  tenement entrance and service bays stay as they are, and so does everything
  outside an opened bay, except for optional grounded frontage displays and these changes: the wall skin of that ground
  story is re-cut around the opening, and the building surveys its signs as a
  whole, so a shop's fascia may change which other signs it keeps.
- **The room.** The opening is at least 1.8 m wide and its head stands 2.2–2.6 m
  above the building base. The floor is one 0.12 m step above the base. The room
  is as wide and as high as its opening and 2.4–3.6 m deep, never more than
  49% of the box depth. Its walls, floor and ceiling belong to the `envelope`
  part, so the shell stays closed and is open only to the street. Nothing
  attached to the facade crosses the opening except the raised shutter's last
  slats under the head and, on some shops, a folded gate at one jamb; a pipe
  that would cross it turns into the wall above the story line instead.
- **Clear space.** A room must lie clear of the level's collision triangles and
  of every other building recipe; a bay whose room would meet either keeps its
  closed front. The building's own `base-wall` is the exception, because it
  stands in the front plane of every ground story. A large building whose
  bays are all blocked or too low receives no shop and no warning.
- **Trades.** Each shop draws one trade and furnishes the whole room for it:
  `grocer`, packed shelving, a drinks cooler, a counter with sweet jars and a
  scale, bottle crates, rice sacks and strings of snacks; `greengrocer`, tiers
  of crates heaped with fruit and vegetables under red lamps and hands of
  bananas; `roast`, textured chickens in three glaze variants on a rail over a
  tiled counter, with a barrel oven and stove behind; `hardware`, rails of
  woks, pots and pails over stacked wares, brooms and steel shelving; and
  `herbalist`, a wall of labeled drawers, jars, a counter with scale and
  abacus, open sacks of dried goods and cured meats overhead. Products use reusable meshes or compact combined
  groups, with seeded assortments and placements.
- **Parts.** Fittings and stock are the part `shop-<trade>`. Everything in it
  stays inside its own room: nothing crosses the room's walls, floor or
  ceiling, or the building's front plane. Grocers choose a front service
  counter, a side counter, or a recessed counter, with corresponding shelf,
  cooler and bulk-stock placements. Each arrangement can switch sides. Rooms
  narrower than 2.2 m use the front-counter arrangement. Fixture layout is
  seeded independently of product stocking and detail; other trades retain
  their own counter and display arrangements. The raised shutter and its guides
  belong to `openings`; the fascia is offered to the sign survey like that of
  any shopfront.
- **Street displays.** Grocers, greengrocers, herbalists and hardware shops can
  add a separate `shop-frontage` part: produce on a stool, stacked-box stands,
  crate-and-plank shelves, or a two-tier cart. These assemblies stand at the
  building base and project at most 0.65 m. Their edge patches leave a 1 m
  central opening; each needs a further 1.2 m standing strip clear of collision
  geometry and other buildings, plus a 0.65 m obstruction allowance for an
  opposing storefront display. The original visible render mesh must supply
  flat support at samples spaced at most 0.15 m, including patch edges/corners,
  within 5 mm of base height. This is a bounded support check, not continuous
  coverage or navigation proof. Hidden floors do not qualify; visible
  noncollidable background streets do. Unsupported or obstructed patches are
  omitted. Displays retain grounded support relationships while their kind,
  goods and small rotations vary by seed.
- **Detail and cost.** Whether a bay is a shop, its room and its trade never
  depend on `detail`. Raising `detail` only adds to the shop's part, and
  lowering it removes almost nothing: a shop is about 3,000–45,000 triangles at
  every level, most for a wide hardware store or densely stocked grocer.
  Street displays add up to 3,000 triangles per small stand or 4,500 per cart
  or two-crate shelf, with at most two assemblies per frontage.

Shops are decoration like every other generated part: the room has no
collision and cannot be entered. With a `base-wall` the player meets that wall
at the threshold. Spans are never fixed inside a shop: brackets stand at
least 2.5 m above the floor or the foot of their wall, higher than any room. The
[shop fixture](../tests/fixtures/aml/shop-dressing.aml) opens every eligible
bay of one tenement row.

Generated objects are named `<host>/$dressing/<part>` with parts `envelope`
(walls, soffits, parapets, recesses and shop rooms), `roof` (the paving of
roof decks and setback ledges),
`openings`, `shop-<trade>`, `shop-frontage`, `fixtures`, `signage` and `rooftop`. Roof parts do not take the reviewer's `roof`
role: a sealed visual mass has no interior to reveal, so it keeps its roof when
**Show roofs** is off.

### Signs

Signs are built from typed text. A sign is described the way a sign painter is
briefed: what it says, in which face of type, how large, on what kind of panel
and how it is carried. The generator invents that brief for each shop from the
dressing seed; nothing is sampled from pre-painted boards.

- **Businesses.** Every shop bay and upstairs tenant is given a business: a
  two-character name or a practitioner's own name, a trade, a telephone number,
  a floor and a slogan. A board hung beside a shop often repeats its fascia.
  The vocabulary lives in
  [`signs/words.ts`](../src/dressing/kowloon/signs/words.ts); the names are
  invented from generic words and reproduce no real business.
- **Lettering.** Each character is one quad sampling a glyph atlas in one of
  seven faces of type: `hei` (heavy sans), `song` (heavy serif), `kai` (brush
  regular script), `brush` (expressive brush), `heavy` (poster gothic),
  `round` and `slim` (condensed). Lines run left to right, right to left as
  older Hong Kong boards do, or upright from top to bottom. Ideographs are
  spaced evenly over their line and may be drawn up to a quarter wider or
  taller than square to fill a board, as painted lettering is; capitals and
  digits keep their own advance widths and are never stretched. Small letters
  are lettered as capitals.
- **Panels.** Painted sheet-metal boards in an angle-iron frame, deep light
  boxes with a retaining frame and rain cap, lacquered timber plaques with gilt
  lettering, enamel plates on four screws, single-character tiles (square,
  diamond or round), cloth banners, and fields painted straight onto a wall.
  Boards carry a painted border line and up to three blocks of lettering of
  different sizes and colors, some with a painted drop shadow.
- **Mounts.** `blade` signs project square to the wall on steel arms and read
  from both directions along the street: one tall board, a light box, a string
  of tiles, a ladder of several tenants' boards on shared rails, or a short
  wide board under a lattice truss. `hung` signs swing on links from a single
  bracket. `wall` signs are fixed flat: plates on piers, long boards across
  several bays, and large painted advertisements on blank end and party
  walls. `fascia` boards sit over shopfronts, `balcony` boards on balcony
  fronts, and `roof` hoardings stand on a braced frame behind the parapet, as
  one large board or as a row of character panels.
- **Steel.** Arms, rails and frames are angle sections bolted through wall
  plates, with gussets, struts from below or stay rods with turnbuckles from
  above. Newer signs keep their paint; older ones are drawn in the rust finish
  and leave rust runs on the wall beneath their fixings.
- **Weathering.** Each sign has an age drawn from the dressing's `wear` and
  `grime`. Age fades the board and its lettering, gathers dirt under the top
  frame and along the foot, runs rust down the face from its fixings, and
  rusts frames. Fine streaks and rust blooms come from the sign-board finish;
  broad variation is in vertex colors.

Signs are placed in two passes.

1. **Proposal.** Each facade proposes signs at random from its seed, checking
   only the level's collision geometry and other building recipes and keeping
   to the [limits](#limits).
2. **Survey.** When every building has been generated, all proposed signs are
   judged together, larger signs first and shop fascias before the rest. A
   sign is removed as `crowded` when its panels would touch scenery or stand
   within 0.06 m of a sign already kept, or when it would hide a kept sign
   from its readers. It is removed as `obstructed` when none of its lettered
   faces can be read: a face is readable when at least 60% of it is in clear
   view from one of five reader positions, standing back from the face by 0.8
   times its longer side (at least 0.8 m, at most 6 m), straight ahead and 25°
   and 45° to either side. Readers of facade signs look up from the street:
   the position is lowered as it would be for eyes 1.6 m above the building
   base, five times the sign's longer side away (6–40 m), by at most 35°.
   Readers of roof signs look level.

Scenery is the authored render geometry and every building recipe's generated
parts as they stand at the highest detail, so the decision is the same at every
detail level: lower detail only withholds some of the signs that were kept.
Generated wall props, ground dressing and spans are not scenery; spans are
strung afterwards and avoid the signs that were built.

The compiled level lists every proposed sign in `signPlans`: its host, mount,
form, lettered lines, the world bounds of its panels, the triangles it added,
and a status of `built`, `withheld` (kept, but only shown at a higher detail),
`crowded` or `obstructed`. The survey approximates sight from a few positions;
it does not establish that a sign is legible from the playable space. Signs
are drawn into the `signage` part and roof hoardings into `rooftop`.
[Kowloon sign street](../projects/kowloon-signs/README.md) is a review level
for them.

### Limits

Relative to the box footprint and base, generated parts stay inside these bounds:

| Bound | Limit |
| --- | --- |
| Below the base | Nothing. |
| Outside the footprint | At most 1.6 m, for jetties, balconies, awnings and signs together. |
| Below 2.5 m above the base | Attached facade parts project at most 0.15 m. Ground-supported `shop-frontage` displays are a separate exception, capped at 0.65 m with the support and standing-space checks above. |
| Above the box height | Only the `rooftop` part, at most 3.5 m. |

Before placing anything deeper than a flush part, the generator checks the
level's collision triangles and other building recipes and shortens or omits
what would run into them. Collision is tested against each part's own oriented
box. Other recipes are compared by their bounds, which is exact for mutually
aligned buildings and conservative otherwise. The check does not see other
visual props; only [signs](#signs) are afterwards surveyed against rendered
geometry.

### Kit finishes

Punched building windows contain a 0.42 m dark recess with side returns, a back
wall, shallow frames, and optional folded curtains. Their view changes with the
camera because those are real surfaces. No window uses an interior/reflection
atlas. Swung casements use neutral transparent glass. Planned exterior grilles
and cages keep leaves closed at every detail setting. Flush window decorations on authored walls and balcony doorlights stay
flat, since those opaque hosts have no render opening.

`<dressing time-of-day="night">` enables warm emission in a seeded selection of
households; `day` is the default. Household selection and all geometry stay
identical between modes. The full-render reviewer uses a dim night environment
and bloom. Emission exports in GLB/glTF and runtime materials, but does not add
point lights or promise baked indirect light. Material authors may use
`emissive="#ffd6a3" emissive-strength="3"`; the color is sRGB and the nonnegative
strength defaults to one. glTF exports linear color, with
`KHR_materials_emissive_strength` for strengths above one. Active emission is
not supported by the OBJ exporter.

Kit parts are tinted per vertex. Without `finishes` they use the official shared
material library, including glyph and prop atlases. Declaring materials under
a shared prefix overrides those roles:

```xml
<material id="kowloon-lettering" texture="textures/lettering.png" alpha-cutoff="0.5"/>
<material id="kowloon-signboard" repeat="0.8" texture="textures/signboard.png"/>
<material id="kowloon-rust" repeat="2" roughness="0.92" texture="textures/rust.png"/>
<material id="kowloon-metal" repeat="1.4" texture="textures/metal.png"/>
<dressing theme="kowloon-street@1" seed="court-01" finishes="kowloon">
```

| Material | Used for | Texture contract |
| --- | --- | --- |
| `<prefix>-lettering` | Sign lettering, one quad per character. | Glyph atlas with the layout of [`signs/atlas.ts`](../src/dressing/kowloon/signs/atlas.ts): square cells in rows from the top left, a block of rows for each face of type. Alpha is a signed distance field with 0.5 on the outline, so the material must declare `alpha-cutoff` (0.5); color is white and vertex tints supply the ink. Lettering stays unmirrored and upright on rotated and reflected buildings. |
| `<prefix>-signboard` | Faces of painted sign boards and tiles. | Tileable, near white, dirt runs along V. Each sign samples its own part of it. |
| `<prefix>-rust` | Rusted sign steel: arms, frames, plates and stays. | Tileable, in full color; tints only vary its brightness. The shared corrosion surface supplies rust by default. |
| `<prefix>-metal` | Painted steel: shutters, pipes, tanks, meters, brackets. | Tileable, near white. |
| `<prefix>-sheet` | Corrugated sheet: awnings, covers, roof huts. | Tileable, near white, ribs along V. |
| `<prefix>-timber` | Doors and boards. | Tileable, near white, boards along V. |
| `<prefix>-roofing` | Felt laid in patches over the paving of roof decks and setback ledges, as authored. | Tileable. |
| `<prefix>-cloth` | Curtains and remaining architectural cloth. | Existing 8 × 4 atlas; balcony washing uses its own charts below. |
| `<prefix>-balcony-cloth` | Shirts, trousers, sheets, plain vests/tees/shorts/towels. | Padded 2 × 2 atlas, 1024 px with 8 px gutters. Top row: shirt, trousers; bottom: sheet, plain cotton. Color, normal and metallic/roughness maps share the UV transform. |
| `<prefix>-balcony-plants` | Potted balcony, sill, cage and rooftop plants. | Padded 2 × 2 atlas: rubber plant, pothos, snake plant, local terracotta pot repair. Shared aligned PBR maps. |
| `<prefix>-aircon` | Air conditioner cases, grilles, fans, cover boards and line-set ducts. | Atlas of unwrapped panels in an 8 × 4 grid of square cells, of which the kit samples the first 26; near white where painted. A window unit's rear grille keeps a pressed rim over the outer 5 % of its cell and a shadowed step to 7.5 %. A condenser front leaves a fan opening centered 37 % from the left and halfway up, 27.5 % of the cell wide and 40 % tall in radius. A fan fills a circle centered in its cell with a radius of 48 %, painted light because the kit tints it dark. The duct cell runs four lengths top to bottom; its middle half covers a duct's face and an outer quarter each flank, one cell per 0.5 m. |

Each override is optional; missing roles use the shared material library,
including the default roofing membrane. `repeat`,
roughness and metalness are honored. The older `<prefix>-signs` board atlas is
no longer a kit finish; a material of that name is ignored.

`tools/kowloon-kit-textures.py <directory>` regenerates the demo's kit
textures, or only those named after the directory. `metal`, `sheet`
and `timber` need Pillow alone. `signboard` and `rust` need numpy, and
`lettering` also scipy and fonttools:

```sh
uv run --with pillow --with numpy --with scipy --with fonttools \
  python tools/kowloon-kit-textures.py src/materials/library lettering
```

The lettering faces are open-licensed Google Fonts families (Noto Sans HK,
Noto Serif HK, LXGW WenKai TC, Yuji Boku, Dela Gothic One, Huninn and WDXL
Lubrifont TC, with Oswald, Yuji Syuku, Anton and Bebas Neue for capitals),
downloaded once into `generated/kowloon-kit-fonts`. The atlas holds capitals,
digits, punctuation and every ideograph that appears in `signs/words.ts`;
pass `--extra <characters>` for more. Painting it rewrites `signs/atlas.ts`,
the layout the compiler letters from, so regenerate after adding a word and
commit the image and the module together.

The architectural cloth and air conditioner atlases assign one design to each cell, numbered
row by row from the top left; `tools/kowloon-prop-textures.py` lists the order
and `python3 tools/kowloon-prop-textures.py <directory>` repaints both with
Pillow alone. Missing cloth and AC overrides use their shipped atlases. Balcony washing and plants are rebuilt offline with `tools/bake-balcony-props.py`
and `tools/pack-balcony-props.py`; both require the complete approved source batch. Their
panel charts remain distinct from generic repeating metal textures.

Greengrocer red apples use a reusable two-course crate load with 32 fruit
silhouettes and 1,408 render triangles. The baked load omits buried faces and
fits the existing tipped crate. Grocer shelf and hanging snack packets use a
192-triangle sealed mesh fitted to each stock position. Both derive from the
[Kowloon pilot](../projects/kowloon-asset-pilot/README.md). Declare
`<prefix>-market-apple` and `<prefix>-snack-packet` to use their shared 256 px
and 512 px color images from `projects/dressing-demo/textures/`. With no image
declared, the same meshes use kit paint. Other trades retain their turned jars
and paper labels.

The grocer uses the [liquor/provisions prop catalog](../projects/kowloon-liquor-props/README.md)
for scales, bottle crates, bottles, tins, cartons, rolls, jars, sacks, garlic,
stools and counters. Declare `<prefix>-grocer-props` with the shared color,
normal and packed metallic/roughness maps in `projects/dressing-demo/textures/`.
Without that material, the meshes retain sampled diffuse vertex colors.
The cooler combines a generated cabinet with fitted liners, shelves and separate
stock. The basket combines generated weave with matte procedural eggs. Lamps
and fans retain procedural geometry. Shelf facings use bounded seeded spacing,
setback and yaw; hanging packets attach at varied real seam vertices, with
different angles and gaps. Hidden shelf rows are omitted in this trade.

The compiler batches these meshes into shop surfaces by material. Each placed
pile still contributes its triangles to the compiled mesh. Blender and Tripo
are optional offline authoring tools for these assets.

For worn procedural shelving and street support boards, declare
`<prefix>-shop-timber` with `shop-timber.png`, `shop-timber-normal.png` and
`shop-timber-properties.png` from the same texture directory. Set roughness and
metalness factors to 1 so the packed material map controls their response; its
metalness channel keeps wood dielectric. The padded atlas described by
`shop/assets/shop-timber.json` contains four long side-grain scans and four cut-end
fields in a shared 1024 × 1792 atlas. Usable pixel intervals determine the physical
size at 494 texels/m: approximately 0.5 × 3.09 m for side grain and 0.5 × 0.5 m
for cut ends. The source's proportions and pixel density match on both axes.
Each box owns one grain direction
and finish, with side grain wrapped around its cross-section and cut ends mapped
separately. A deterministic longitudinal crop is shared across a board's faces;
wide standalone backing panels vary their strip and crop across their width.
Typical shelves fit without a longitudinal repeat; members longer than the scan
retain periodic repetition. Faces subdivide at texture repeat boundaries, keeping the same surface
shape and shelf reservations; thin edges sample narrow strips rather than squeezing
an entire tile. The periodic PBR fields share their charts and gutters. Finish
variation does not consume the stocking RNG. Without a distinct textured shop-timber finish,
boards retain ordinary timber mapping and tint, falling back to kit paint when
no timber material is declared. The [material study](../projects/kowloon-liquor-props/materials/shelf-weathering/observations.md)
contains the generated concept, flat source art, prompts and procedural bake.

Handled shelf lips receive irregular lighter wear within 8 mm of the front top
edge; upright front corners use a weaker 3 mm band. Vertex-color interpolation is
confined to those physical bands, leaving interiors, backs and broad panels alone.
The atlas's `albedoGain` reserves linear color headroom, balanced by normalized
vertex colors so the brighter wear remains portable in GLB exports.

### Buildings as courtyard boundaries

`base-wall` lets that envelope replace the **visible** native ground-floor wall.
The native wall supplies collision and navigation; its render triangles are
omitted. Every tenement's ground story occupies the same front plane and rises
at least as high as the wall, whatever its height, so exactly one skin covers
it and there is no second wall in front of the building. Where a
[shop](#shops) opens through that plane, the room behind it is the skin. A tall wall leaves
less height for upper stories; stories that no longer fit are dropped.

The linked wall must be static and collidable, run parallel to the building's
front, span its complete width, meet its ground plane, and fit inside its volume.
These checks use a 0.00001 m tolerance. A wall can belong to only one building.
Authored openings and face-material assignments on that wall are rejected because
the closed building kit cannot preserve them. A hidden building leaves the native
wall visible. Without `base-wall`, the generated building is entirely visual and
must be placed outside accessible space or given separately authored collision.

Decoration never modifies collision or navigation. It still occludes the render;
authors should review its placement and sightlines in the actual compiled scene.

## Spans between elements

Buildings automatically string seeded, randomized power cables and clotheslines
between nearby solid façades when no `<spans>` recipe is present. Defaults are
0.6 cables, 0.35 clotheslines, no signs, 14 m reach (9 m for washing), and 2.6 m
walking clearance. Only building recipes participate in this automatic mode;
no suitable connection simply leaves the scene unchanged. Explicit recipes
replace these defaults. Use `<spans cables="0" clotheslines="0" signs="0"/>`
to disable them entirely.

Anchor searches use a local 3D spatial grid with a vertical band for each span
family, rather than comparing every building or every floor. Static cable
start weights are accumulated once and sampled with binary search. Scene
obstructions and walking surfaces also use spatial indexes.

Most dressing belongs to one host. A `<spans>` recipe strings parts from one
receiving element to another: utility cables, clotheslines, and street signs
hung between facing walls.

```xml
<dressing theme="kowloon-street@1" seed="alley-01">
  <wall host="yard-wall" face="side" windows="false" material="plaster"/>
  <building host="north-block" material="plaster" stories="4"/>
  <building host="south-block" material="plaster" stories="4"/>
  <spans cables="0.7" clotheslines="0.5" signs="0.3"/>
</dressing>
```

| Attribute | Range / default | Meaning |
| --- | --- | --- |
| `hosts` | Host IDs / every wall and building recipe | The hosts that may carry anchors. Each must have a wall or building recipe; hidden hosts are skipped. |
| `cables` | 0–1 / 0.6 | Density of cable bundles. Zero strings none. |
| `clotheslines` | 0–1 / 0.35 | Density of washing lines: at 1 about two windows in five string one to a facing wall within 9 m. |
| `signs` | 0–1 / 0.2 | Density of banners and gantry signs across a street. |
| `clearance` | 2–10 m / 2.6 | Least height of anything hanging between anchors above the walking surface beneath it. |
| `reach` | 2–40 m / 14 | Longest horizontal distance between the two anchors of one span. |

A dressing section takes up to 16 span recipes; each is planned on its own
seed stream in authored order. Spans run after every other dressing pass:

- **Anchors come from the finished scene.** Brackets are fixed only where the
  rendered wall is solid behind their whole footprint, so they avoid authored
  openings, generated windows and recesses, and work on rotated and reflected
  hosts. They stand at least 2.5 m above the walking surface in front of them
  or, where there is none, above the foot of that wall face. Clotheslines start beside generated windows. A span may join two
  hosts or two separate faces of one host, such as tenements across a service
  well.
- **Nothing passes through anything.** Every span is tested against all
  rendered triangles, generated parts included, and against washing and signs
  placed before it, by this recipe or an earlier one. Blocked spans are
  dropped, not bent.
- **Cables** hang as true catenaries from porcelain racks: runs hop from rack
  to rack along and across the street, several bundles share a rack, and each
  bundle carries one to six strands of its own slack, gauge and color. Racks
  with several lines sometimes drop a conduit to a junction box, where its
  run down the wall is solid and nothing rendered lies across it.
- **Clotheslines** are two lines between brackets, carrying shirts, trousers,
  towels and sheets.
- **Street signs** are cloth banners on ropes or boarded steel gantries,
  titled and lettered on both faces like the buildings' [signs](#signs),
  between facing walls 3–12 m apart and at most 7.5 m above the street.
- **Clearance** applies to everything that hangs in the air: cables,
  lines, washing and sign boards, over collidable floors and stairs. It is
  sampled every 0.25 m along each span. Wall
  fittings (racks, brackets, conduits and junction boxes) stay within 0.15 m
  of their wall like other wall props and may reach lower.

Generated objects are `<host>/$dressing/span-cables`, `span-washing`,
`span-signs` and `span-fittings`, owned by the host of the span's first anchor;
the other host is recorded as a provenance contributor. Spans are render-only
and never change collision or navigation. A family that is asked for but fits
nowhere raises the source-linked spatial warning `DRESSING_NO_SPAN_FIT` at the
hosts' walls; set its amount to 0 to leave it out. Spans do not light up, sway,
or attach to props other than their host walls. The
[span fixture](../tests/fixtures/aml/span-dressing.aml) strings all three
families across an alley and a walled yard.

## Preview and delivery

Weathered wall and ground finishes share one intrinsic-material compiler.
Construction regions still follow AML wall corners, floor connections and pour
boundaries. Continuous fields resolve plaster loss, asphalt, ceramic, shallow
damage, pigment and roughness into bounded PBR maps on the retained receiving mesh.
Fine ground puddles keep an opaque bed beneath an explicit transparent water film.
Lighting remains real time; these maps contain no baked illumination or AO.

The default textures resample authored color, normal and packed PBR inputs with
their declared repeats. Generated material factors are neutral because those
factors and normal strength have already been composed. Large geometric features
remain modeled. If an authored height image explicitly requires displacement,
the geometry compiler instead preserves finite-depth regions and closes their
exposed edges. Source geometry, collision and navigation remain separate from
both kinds of appearance.

Native callers compiling textured dressing provide
`resolveMaterialImage(reference, signal)` with the source PNG/JPEG bytes. The CLI,
live preview and demo builders supply this resolver. Compilation waits for
complete image generation before `onGeometry`; image failures produce
source-linked diagnostics, and cancellation throws `AbortError`. The reviewer
keeps the prior scene until the complete replacement texture set is decoded.
Node CLI commands, demo builds, raster workers and the weathering study use the
native-zlib PNG decoder from `src/materials/node-images.ts`. Other native API
callers can pass it as `decodeMaterialPng`; omission keeps the browser-safe codec.
The same synchronous codec handles source images and cached-map validation.
Image limits, exact RGBA8 conversion and independent pixel ownership remain
compiler contracts; JPEG decoding and PNG encoding are unchanged. Source images
and default cache reads fully decode PNGs; trusted local cache reads use the
integrity policy described below.
`appearance` options bound receiver plans, derived image texels and image bytes;
exceeding a budget is an error, never silent removal of requested weathering.
Geometry-field sampling has one compile-wide allowance: 64 samples per allowed
render triangle, bounded between 20 and 128 million samples. Subdivision work
remains capped at 20 million nodes, independently of the final triangle limit.

Run `npm run dev` and use **Open default level**. **Theme** switches between the
structural Blockout and Kowloon presets while preserving the camera. The default
demo retains its room/courtyard, central hole, staircase, ramp, and upper platform.
Both presets have identical physical geometry and sampled navigation.

`npm run demo:build` rebuilds both validated presets under
`generated/dressing-demo/presets/`. Development and browser build commands run it
automatically. The blockout removes the visual building proxies and dressing;
its native ground-floor walls remain. The preset bundle is staged and validated
before publication, and includes:

- GLB with embedded textures and linear vertex weathering colors.
- glTF, binary buffer, and texture files.
- AML source, original texture paths, runtime JSON, and validation report.
- A ZIP containing the portable source and exported assets.

The reviewer offers **Download GLB** and **Download package** for each preset.
Ordinary AML CLI builds use the same compiler. Dressing currently supports GLB
and glTF export; other export formats reject vertex colors instead of silently
discarding the finish. External viewers need glTF vertex-color support.

Only the Kowloon kit is implemented. Industrial and European coastal kits,
refractive glazing, playable generated interiors, structural building damage,
per-tile ceramic façades on buildings, occupancy, and richer placement controls remain future work.


The roast-chicken restaurant reuses approved provisions-store jars, bottles,
scale, stool and boxes, with dense pantry groups, fitted cookware, ceramic counter
faces, a chopping block, and a scripted extractor. Its front counter can be
recessed or reflected; tight rooms omit a stool that would overlap storage. Food
hangs from actual mesh anchor vertices; prepared meat sits inside open steel trays.
Fixture placement, attachment points, and surface wear use separate seeded inputs.

Bind `<prefix>-restaurant-surfaces` to `restaurant-surfaces.png` and
`restaurant-surfaces-properties.png`: a padded 512px atlas for brushed steel,
cream/mint glaze and end grain. Bind `<prefix>-restaurant-food` to
`restaurant-food.png`, `restaurant-food-normal.png`, and
`restaurant-food-properties.png`: shared 1024px maps for the 892-triangle chicken
and 498-triangle sliced-meat pile. Set both roles' roughness and metalness factors
to 1 so the property maps control their response. Without textures, the offline
catalog retains sampled food colors and the fittings use authored base colors.
The source concepts, provider task/cost records, reproducible bakers, and actual
review views are documented in `projects/kowloon-restaurant-props/README.md`.

For reusable stainless tables, shelving and cookware, bind
`<prefix>-brushed-metal` to `brushed-metal.png`, `brushed-metal-normal.png`, and
`brushed-metal-properties.png`, with `repeat="2"`, white color, and roughness and
metalness factors of 1. This shared 512px set supersedes the kitchen atlas's steel
patch when explicitly bound; the kitchen atlas still supplies ceramic and wood.
`brushedMetal(pen)` in `src/dressing/finish/brushed-metal.ts` maps flat faces at a
consistent physical scale, including sloped panels, without adding geometry.
Curved receivers supply physical-scale UV charts; `lathe` accepts optional texture
repeats per meter and unfolds each polygonal profile band without stretching.
Changes of slope may have chart seams; narrow rings keep the same noise scale as
wide rings. A material roughness factor of 0.65 produces
shinier cookware from the same images. See the
[modular metal guide](../projects/modular-metal/README.md) for binding, curved seam
and profile limitations, reproduction, budgets, and actual rendered evidence.

The roast restaurant also accepts `<prefix>-restaurant-tiles` with
`restaurant-tiles.png`, `restaurant-tiles-normal.png` and
`restaurant-tiles-properties.png`. This shared 1152×576 field represents 3.6×1.8m
at 320 texels/m, baked by `tools/bake-restaurant-tiles.ts` from the current
`TileField` ceramic damage, grout and plaster-bed recipe. Set white color,
roughness and metalness factors to 1. Unbound projects retain the kitchen atlas.
The glazing uses the kit's separate `display-glass` finish so clear display panes
do not change window-glass opacity. The table and cabinet helpers preserve their
stock support planes while adding narrow bevels, panel seams and hardware.

The restaurant study now reuses the latest live concrete shader on its enclosure
walls and its earlier quarry-floor bake on the ground. The concrete shader and
bulb-derived warm task lights are local presentation features and are not
serialized by standard GLB. Props, tile maps and their metric UVs are production
dressing; the screen-space AO is also presentation-only. See
[the combined pass](../projects/kowloon-restaurant-props/concept-implementation.md)
for captures, reproduction and the current boundary.

## Experimental visual recipes and tests

Kowloon materials and decorative recipes are still experimental. Tests protect
compiler behavior: valid geometry and support, source/collision separation,
determinism, authored UV/material data, compositing/export correctness, budgets,
and failure recovery. They should not pin grime formulas, palette diversity,
chip counts, particular seeded wear patterns, or whether shallow decorative
details are meshes rather than textures. Use exploratory renders for art review.

### Reusable metal surfaces

`createMetalSurface` in `src/dressing/finish/metal-surface.ts` exposes the component
weathering as a theme-independent intrinsic PBR sampler. Supply a linear RGB paint
color, seed, wear/grime/rust amounts, receiver bounds, substrate/coating material IDs
and their repeats. Optional `paintCoverage` ranges from bare metal (0) to painted
metal (1). Receiver UVs must be unwrapped in physical meters, keeping wear features
consistent across differently sized receivers. Non-unit UV metrics are rejected
until the raster normal pipeline supports their derivatives. Contacts and folds remain
lazy so assembly construction can finish before sampling.

The returned `sample` and normal-only `bump` callbacks plug into the shared raster
surface compiler. The receiver chooses resolution and retains its geometry and
lighting. Shutters, frames, cages and sign supports use this sampler through `weatheredPen`;
modular pipes supply their own cylindrical receivers. Mapped sheets use at least
256 texels/m, broader members 128, and stock narrower than 40 mm 64, honoring
higher kit settings. The metalwork section below describes the narrow-face budget
approximations.
Bare metal retains oxidation but has no invisible paint-chip relief. Painted colors
are passed through without palette quantization. Art choices remain experimental;
texture patterns, wear distribution and placements are not visual test contracts.

Metal edge weathering uses the generated receiver's boundaries, assembly contact
points, and detected concave/convex folds. Grime collects in creases and contacts;
rust flecks become denser near exposed boundaries and ridges. Tube emission marks
which UV axis follows its actual centerline, so circumferential unwrap seams do
not become artificial weathered edges, including short collars whose UV axes swap.
This is procedural assembly information, not automatic feature recognition on
arbitrary imported meshes. Rust and grime controls independently gate their effects.

Identical metal finishes can share their generated color, roughness and normal
maps across hosts in one compilation. UV receivers opt into `raster.scope="scene"`;
ordinary groups remain host-local. The complete metal key includes recipe revision,
seed, paint color, material IDs and repeats, resolution, dimensions/mapping identity,
wear/grime/rust, gravity, contacts, folds and physical-edge flags. Different seeds
intentionally preserve different weathering. Equal group keys are a producer promise
of identical sampling over the full bounds, not similarity inferred from a center
sample. A cache hit reuses the binding before rasterization and encoding, and
charges shared map storage once. Incompatible group layouts are rejected.

Binding sharing is compile-local. Explicit versioned `raster.materialKey` recipes
can additionally use `ArchitectureCompileOptions.materialCache` to reuse complete
encoded PBR maps across compilations. Keys include source material properties and
image content hashes; arbitrary surface callbacks do not opt in automatically.
Reads are validated and copied, cache I/O is opportunistic, and scene publication
remains atomic. Valid intrinsic artifacts can survive a later scene-validation
failure because they do not contain scene geometry or placement state.

The demo compiler supplies an atomic disk cache under `generated/material-cache`,
namespaced by compiler/generator source and the dependency lockfile. Its default
256 MiB quota evicts old entries across namespaces (best effort with simultaneous
processes). Native API callers supply their own cache; the core imports no Node
filesystem APIs. Scalar rust/grime masks are not shared across paint colors.

The built-in demo cache selects `materialCacheValidation: "integrity"`: it checks
owned encoded bytes, schema, dimensions, size limits and SHA-256 without
reconstructing pixels. This trusts compiler-written local artifacts and detects
accidental corruption; it does not independently prove PNG validity or origin.
Custom demo cache overrides retain the default `"decode"` policy. Other native
API hosts must explicitly select integrity mode, and should use full decoding
for untrusted artifacts. Source images always decode under either policy.

Large finite finishes also persist complete baked maps: ground pours and roof
decks, native walls, tiled or fixture-stained facade skins, stained panels,
painted doors, frosted glass, and tank shells. Their identities retain the actual
finish bounds, pigment/wetness program, repairs, source mappings and weathering.
Native wall keys include world sampling coordinates; moving a wall can therefore
require a different map. Geometry is generated normally on every compile.

Sign faces also persist their complete painted PBR maps. Their producer identity
includes the full text/layout/color design, atlas layout, lettering mode, material
roles/repeats and aging settings; the compiler includes source image contents and
output density. Panel designs and deferred aging controls are captured before
baking. Low-level artwork with arbitrary tint/UV callbacks remains uncached unless
its producer supplies a complete explicit identity.

Finite callback-based producers declare their semantic inputs explicitly through
`washKey`, `weatherKey`, or a ground pigment key. They do not infer a program from
sampled colors. Fixture deposits compose into the final identity after assembly,
including order, support and relative sampling transform. A touching unkeyed
deposit disables persistence for that receiver. Changing a finite footprint or
local finish regenerates its affected material; it does not invalidate unrelated
finishes merely because the containing AML file changed. This exact finite-map
reuse complements the geometry-independent periodic facade recipes below.

Unstained, non-tiled facade skins can use finished periodic material recipes.
The compiler bakes each canonical recipe once, binds repeating meter-based UVs
directly, and applies a common per-panel tint through vertex colors. Original
triangles, openings and normals remain intact. Source texture repeats and requested
output texel density remain unchanged. Weathering becomes a small shared variant
catalog, intentionally replacing face-specific repairs and ledge stains on those
eligible skins. Local fixture deposits select the original full-face bake so their
color, roughness, boundaries and repair retention remain intact. Height-bearing and
tiled facade skins retain their specialized material paths. Shadows are unchanged.

### Modular pipe assemblies

`src/dressing/kowloon/pipes.ts` provides `PipeSystem` for kit generators. It replaces
`fixtures.pipe`; facade and roof service runs use it directly. Dimensions are in
pen-local meters and colors are linear RGB (`srgb()` converts authored hex colors).

```ts
const pipes = new PipeSystem(pen, {
  radius: 0.05,
  color: srgb("#647b6d"),
  kit,
  variant: "service-iron",
});
pipes.run([[0, 0.2, 3], [0, 0.2, 1], [0.5, 0.2, 1]], 0);
```

`straight(a, b, rimDistances?)`, `bend(a, corner, b, socketed?)`, `coupling(center, axis)` and
`mount(center, axis, wallPoint)` also work independently. Bend endpoints are tangent
points with equal setbacks from the virtual corner. The centerline bend radius must
exceed the pipe radius. Mounts require a wall parallel to the pipe axis and enough
clearance behind the strap. `run` rounds polyline corners, adds socket connections,
and optionally places vertical-run mounts against its explicit local Y wall plane.
Omit that plane for freestanding plumbing. Duplicate route points are removed;
reversals, overly tight bends, and overlapping adjacent elbow sockets are rejected.
These are visual parts and do not change collision or navigation.

Pipe barrels, elbows and socket sleeves each have one cylindrical appearance receiver,
with smooth geometry normals and normal-mapped rust. Rim distances become annular
weathering sources, independent of mesh tessellation. Drips emerge on the barrel
beneath fitted collars and straps; sleeve faces retain ordinary patina without
long runoff trails. Bare pipe ends are not automatic drip sources. `run` supplies
the fitted rim positions; individually assembled parts provide them explicitly. Circumference wraps the patina
smoothly and fits an integer number of source texture repeats; UV seams are not
exposed edges. Elbow UV length follows the centerline, so inner/outer bend texture
stretch is an intentional approximation. Runoff follows world gravity projected onto the curved surface, including sleeve
shoulders and changing elbow tangents. Analytic sweep tangents determine flow;
cells are sorted by world height, then inherit attenuated deposits from higher
neighbors in one pass. The sampling grid and texture resolution are unchanged.
This intrinsic weathering approximation permits softer streaks than upstream
tracing, while avoiding iterative traces for every cell.

Identical finishes share complete maps across hosts during a compile. Keys include
color, dimensions, variant, source materials/repeats, aging controls, gravity,
connection bands and density. Placement does not change the variant. Axial dimensions
and connection distances are canonicalized to a micrometer to avoid floating-point
cache misses. Different colors currently get separate complete PBR maps; scalar
rust masks are not cached separately across colors. Gravity runoff fields are
shared across colors within one host mesh; their keys include world-oriented shape,
seams and seed, but exclude translation. Complete PBR map keys also include that
orientation so rotated pipes cannot reuse incorrect drip directions. These explicit
recipes participate in the optional finished-material cache described above.
The default radial resolution is 16 (adjustable 8–64), and texture-weathered pipes
use at least 128 texels/m, honoring a higher kit texture density. Supplying a kit
applies the shared finish without an appearance opt-in; component and facade
resolution remains independently bounded.

### Window, cage and sign metalwork

Window frames, cage rails and sign members use `Pen.beveledBar`: capped
rectangular sections with small chamfers kept inside the requested dimensions.
The weathering adapter records the whole member before emitting its faces, so
crossing rails and fixings remain available as contact sources. Reusing a
compatible adapter preserves that assembly instead of generating duplicate
appearance receivers. Gravity-projected contacts feed the same brown grime coat
as pipe runoff; base paint remains quiet and rust retains normal relief.

Windows have layered slider tracks, recessed glass, latches and hinge hardware.
Cage floors use grating with bolted wall plates and in-volume braces. Sign arms
use solid gussets; bolt heads have washers and chamfered caps, scaled to fit small
plates. These are visual details, independent of collision and navigation.

Faces narrower than 6 mm emitted by beveled members use plain paint and geometric
normals, including thin edges and caps; those faces omit local rust/normal detail
and metallic response. Other unmapped metal faces narrower than 6 mm use at most
64 texels/m. Narrow stock below 40 mm has a 64 texels/m floor and honors higher
requested density; broader members retain 128 and mapped sheets retain 256.
This keeps small trim within the preview budget while retaining joint weathering
on the broader visible surfaces.
See [the reproducible metalwork study](../projects/kowloon-metalwork/README.md).

### Standard Kowloon floor and wall ceramic

The standard tile system for `kowloon-street@1` is used automatically wherever
plain-wall or patched-floor dressing generates ceramic. These tiles use the same `TileField` and `tileSurface`
composition in `src/dressing/tile-field.ts` and `tile-surface.ts`. Chip contours,
missing units, joint bevels, combed plaster, faded pigment, and grime
therefore change together. The previous separate floor erosion recipe is retired.
Both use the declared `<finishes>-wall-ceramic` PBR source. The optional
`<finishes>-wall-tile-plaster` supplies bedding color, normal and metallic/roughness
maps at its own physical repeat. Bedding accepts only intrinsic PBR channels;
source height/displacement channels are not applied. The demo reuses the shared
concrete maps here, with restrained normal strength beneath the combed ridges.
Without this source, procedural mineral variation still breaks up the gray bed.

Floor defaults differ intentionally: **0.4 m square tiles, tile-wear 0.9, and a dark charcoal-green base color**.
Wall defaults remain seeded dimensions and inherited wall wear. Floors accept
`tile-size`, `tile-aspect`, `tile-wear`, `tile-grime`, `tile-color`,
`tile-plaster-color`, and `texture-density` with the same bounds as walls; explicit settings override defaults.
Floor tile maps default to 256 texels/m. Geometry and collision stay authored;
fine tile relief is encoded in normal maps and lit in real time.
Authored source height maps remain supported without disabling the shared color,
roughness and normal finish. Explicit tile colors, including terrace palettes,
retain the ceramic source's PBR maps. The
[tile reference](../projects/kowloon-wall-tiles/README.md) records the finish;
its art settings are tunable and are not fixed visual test expectations.

### Default-demo façade refresh

The demo's buildings use 64 texels/m rather than the former 12 texels/m fallback,
with `building-plaster-plain.png` copied from the concrete study and the shared
concrete PBR maps described below. The CPU coating finish adapts the study's
clustered, contour-eroded plaster exposure and 4 mm normal-only lip.
It is not a serialization of the study's custom GLSL: screen-space derivatives
and its three-way stochastic texture sampling are not exported. Source UVs have
seeded affine rotation/offset and retain their physical scale. Fine erosion bands
above the chosen map resolution are omitted to avoid aliasing.
The authored wall material remains the coat; `wall-materials` supplies exposed
backing. Floor bands, sills and emitted AC units seed the receiving wall's runoff.
No extra floating grime polygons or baked lighting are introduced.

### Shared concrete material

The concrete material implementation lives in `src/materials/concrete`, shared by
both the material studies and production map generation. Run
`node tools/build-concrete-maps.mjs` to regenerate its cached intrinsic PBR maps
when the shader or source images change. `npm run demo:build` runs this step
automatically. Unchanged inputs skip rendering. The
2048px maps cover eight meters (`repeat="0.125"`); they contain two stochastically
sampled concrete sources, clustered pigment variation, and fine tangent-space
relief, with continuous wrapping. Lighting, shadows and AO are not baked.

The demo uses these same maps for ground concrete, wall substrates, building
concrete, and shop floors/ceilings. The kit's `<prefix>-concrete` finish controls
shop structural concrete independently of painted walls; when omitted it uses
the first declared wall substrate, or the rule's material. This leaves other
authored palettes available. Seams, repairs, plaster loss, and grime belong to
receiving surfaces, not the shared base image, so geometry changes do not rebuild
it. Exported GLBs carry standard PBR textures and require no custom viewer shader.

The interactive study still evaluates the shader directly; production maps are
a finite-resolution, periodic representation of its base material. Wall-specific
study controls (tie holes and cutouts) are not enabled globally by this promotion.

Building cladding is selected once per seeded lot, independently of facade order
and detail: plaster or bare concrete, with occasional ground-story-only ceramic
cladding. Plaster retains the lot's pastel wash; its reduced loss leaves most
of the coating intact. Concrete omits plaster lips and coating repairs. Ground
cladding reuses the wall/floor tile sampler and ends at the actual story datum.
These raster finishes require materials without authored geometric height maps.

### Shared rigid pipe routing

Plain-wall risers, narrow-wall risers, building downpipes, rooftop feed and vent
pipes, lamp and meter conduits, utility-rack conduits, and shop roasting flues
all use `PipeSystem`.
Wall recipes retain their receiving transform, source host and triangle budget
through `WallGeometry.pipe`; their fittings enter the normal appearance compiler
and share the same procedural metal and gravity-directed collar runoff. Offset
wall risers require 0.6 m of vertical room for their socketed elbows. Flexible AC
hoses, insulated refrigerant lines, cables and structural rails remain separate
from rigid metal plumbing.


## Paper posters on walls

Image-generated artwork lives in [the poster library](../projects/kowloon-posters/README.md).
It contains 16 original calendars, menus, illustrated ads, notices and event posters.
The supplied 2048×3072 JPEG packs 4×4 cells of 512×768 pixels; each cell has a
480×720 printed field with 16-pixel horizontal and 24-pixel vertical extruded gutters.
Use this layout for `<prefix>-wall-posters`, including automatic exterior notices.
The previous six-notice texture is historical source art and is no longer the atlas contract.

Explicit posters are independent of wall finish rules, so they can attach to a
painted, tiled or concrete interior/exterior wall without changing its appearance:

```xml
<material id="shop-wall-posters" color="#ffffff" roughness="0.96"
          texture="../kowloon-posters/textures/posters-atlas.jpg"/>
<dressing seed="restaurant" finishes="shop">
  <poster id="service-menu" host="rear-wall" face="front"
          at="1.2 1.8" width="0.34" design="roast-menu" rotation="-2" wear="0.4"/>
</dressing>
```

`host` names an existing static wall, box, or another native object with a planar
wall face. `face` is `front` (−Y), `back` (+Y), `left` (−X), or `right` (+X) in
host coordinates. The selected side must expose one plane; split curved or
multi-plane walls into separate planar hosts for explicit placement.
`at="x z"` is the sheet **center**, measured in meters screen-right/up from that
plane's lower-left bounds when looking at its outward side. Host translations
and rotations are respected. This is independent of world-axis coordinates.

Width is 0.05–2 m (default 0.3); height is always 1.5×width. Rotation is −15° to
15° (default zero). Wear is 0–1 (default 0.3) and changes corner loss; generated
art already contains paper stains and print wear. IDs must be unique among
posters; stable variation comes from dressing seed plus ID. At most 256 explicit
posters are allowed. Material repeat does not tile the printed artwork.

The complete rotated bounding rectangle must fit on solid visible receiver
triangles with a 2 cm margin, including around small openings. Invalid placements
produce `AML_POSTER` errors with source and host information, plus a spatial
inspection target where receiving geometry exists. The fit is conservative near
corners; it does not project across corners or wrap curved walls. Other furniture
and mounted fixtures remain the author's placement responsibility.

Each sheet costs six render-only triangles, with opaque chipped edges and a 2 mm
surface offset. It never changes collision or navigation. For overlapping paper,
set integer `layer="0"` through `layer="8"`; each higher layer adds 0.6 mm.
Overlapping bounding rectangles on the same plane and layer produce a non-blocking
`AML_POSTER_OVERLAP` spatial warning requesting inspection. Chipped corners and
tilt can make the bounds overlap even when the printed paper does not. Coplanar but separately named wall hosts must be coordinated by the author.

`POSTER_DESIGNS` exports the stable design IDs. Procedural props use `drawPoster`
with a wall-local `Pen` centered on the receiver, +Y pointing out; the caller owns
fitting and attachment. It preserves readable lettering under mirrored transforms.
The standard chicken shop uses menus, calendars and a soda ad when the atlas is
bound and its ceiling is tall enough; common shop calendars also use this artwork.
Compile/export requires no generation service or network access.
