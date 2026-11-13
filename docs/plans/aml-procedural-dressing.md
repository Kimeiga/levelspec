# Procedural dressing for AML

Status: the first Kowloon milestone is implemented. The current syntax and limits
are documented in [Procedural dressing](../DRESSING.md); the proposal below retains
future ideas and uses attributes that are not all supported. The demo additionally
supports `base-wall` to make a building façade replace a native courtyard boundary.

Use one authored level to build several themed variants. Start by finishing
selected floors and walls and turning simple background masses into
believable buildings. Each theme supplies reusable materials, construction
patterns, and prop recipes. The level author chooses where each recipe runs.

## Proposed AML

This fragment assumes that the wall path and floor profile are defined elsewhere
in the document. The `<dressing>` syntax is proposed.

```xml
<wall id="shop-wall" path="shop-line" thickness="0.22" height="3.6"/>
<slab id="pavement" profile="walk-profile" thickness="0.2"/>
<box id="background-mass" position="20 10 0" width="12" depth="8" height="14"
     collidable="false"/>

<dressing theme="kowloon-street@1" seed="market-04" grime="0.65" detail="medium">
  <wall host="shop-wall" face="front" role="street-facade" windows="auto"
        exposure="rain"/>
  <floor host="pavement" face="top" role="paving" wear="0.35"/>
  <building host="background-mass" frontage="front" stories="4" roof="auto"/>
</dressing>
```

The geometry element already says what it is. A dressing rule identifies the
host, the receiving face in its local frame, and the job it should do in the
theme. Use an existing `<opening>` for a real window and `<glazing>` or `<frame>`
for its construction. Use `material="glass"` to select a declared material.
`windows="auto"` requests visual window bays on eligible opaque wall spans.
Explicit openings, glazing, and other authored details take precedence.
Generated panes on playable walls are opaque architectural details with frames
and sills. Transparent export would need an explicit material contract because
the reviewer currently recognizes glass heuristically and the GLB exporter
writes opaque base color.

The optional section can extend AML v1 through the parser, serializer, document
model, and schema. Existing AML continues to load. Older strict readers will
reject the new section. Validate host types, face selectors, settings, and theme
IDs with source locations. Version theme kits independently from AML so a level
can pin its material and geometry recipes. [Current AML schema](../../schema/aml.xsd)

## Controls and theme defaults

| Control | What it changes |
| --- | --- |
| `theme`, `seed` | A versioned kit and reproducible variation within its rules. |
| `role` | The recipe's architectural context, such as street façade, service wall, paving, or interior floor. Kits implement a shared starter set. |
| `grime`, `wear` | Independent 0–1 amounts for deposits and use. Grime collects along seams and beneath drainage. Wear lightens or polishes exposed surfaces and busy thresholds. Per-target values override the document defaults. |
| `exposure` | Local weathering bias. `sheltered`, `rain`, and `coastal` steer where deposits, runoff, or salt-like discoloration appear. |
| `detail` | A low, medium, or high budget for secondary trim and attachments. The window and door layout comes from the façade rules. |
| `windows`, `frontage`, `stories`, `bays`, `roof` | Direct architectural controls. `auto` uses kit defaults and fit rules where applicable. Frontage determines the public-facing side and the entry. A bay count can pin the rhythm on a background frontage. |

Keep material scale, joint width, bay proportions, sills, eaves, and prop
families in the kits initially. Expose targeted overrides when the same kit
needs to handle different buildings. Likely next controls are floor pattern and
module size, accent color, and a way to disable a particular attachment family
on a façade. Authors can already override a finish with named AML materials
and explicit face assignments.

## Floors and walls

- Resolve the chosen faces against the final exposed geometry. Use kit finishes
  on default-material regions and preserve explicitly assigned or inherited
  materials as base finishes. Keep authored face-material partitions protected.
  Use real-world sizes for masonry courses, panels, tile joints, and pavers.
- Measure visible wall–floor contacts. A horizontal walking top and an exposed
  wall meeting along a segment form a seam. The two surfaces share a seeded
  falloff from that contact, with stronger buildup in corners and breaks at
  thresholds. Use exposure to bias rain streaks below sills and along downpipes.
  Begin with straight, level contacts and reject false seams between nearby but
  separated faces. At zero grime, skip the grime layer.
- Composite weathering into bounded, surface-local base-color patches. Current
  AML UVs repeat from world position, so seam-specific falloff needs a small
  render-only step that assigns patch UVs after face partitioning and before
  lightmap UV generation. Publish the same patches to preview and GLB. Keep
  floor treatments flat and let texture and material values carry the relief.
- Lay out automatic windows along usable spans. Reserve the ends, corners,
  existing apertures, and clearances, then fit a bay module from the kit into
  each remaining interval. Align sills and heads and keep solid piers between
  bays. Place visual details such as a vent below a window or a service box in
  a solid bay using attachment sockets and a maximum protrusion. Skip candidates
  that crowd an authored opening, walking envelope, or protected view.

## Background buildings

Start with a standalone, non-collidable rectangular box. Use its footprint,
orientation, base elevation, and height as the envelope. Replace the proxy in the
generated scene with a complete visual shell. Fit the roof inside the height
budget and allow only the kit's declared small projections beyond the footprint.
An authored mass can remain visible in the undressed view.

1. Reserve roof depth, then fit a ground floor and upper stories with believable
   floor-to-floor heights. Use the same story datums on every side.
2. Allocate bays between corner piers. Put a door at grade in an eligible
   frontage bay and align it with the openings above. Fit lower storefronts or
   service doors using the kit's rules. Give the sides and rear simpler rhythms.
3. Fill the shell with recessed panes, sills, lintels, and the selected roof with
   continuous edges. Align gutters and downpipes. A pitched roof needs ridge and
   eave clearance, and a flat roof can use a parapet where the envelope permits.
4. Generate the small parts from reusable shapes. Vary color, shutter state,
   and which eligible bays receive a sign, vent, or other fixture. Keep the main
   window grid coherent. If an automatic layout cannot fit, simplify it and
   report the reason. An explicit impossible story count is a validation error.

Keep the first release to rectangular, level envelopes and straight receiver
walls. Generated background doors are visual façade elements. Playable rooms,
traversable openings, and gameplay cover remain native authored geometry.

## Three starter kits

The Kowloon kit assumes “Cowloon Wall Street” means a dense commercial street
inspired by Kowloon Walled City.

| Kit | Floor and wall treatments | Background grammar and small props |
| --- | --- | --- |
| Kowloon street | Patched render, small façade tiles, worn concrete, strong runoff near services. | Narrow repeating bays, deep sills, flat roof and parapet, AC housings, wall signs, and drainpipes. |
| Clean high-tech industrial | Painted metal panels, precise joints, coated concrete or epoxy, restrained wear around entries. | Wide modular bays, strip windows, a flat or low-slope roof, flush grilles, service panels, and entry identifiers. |
| European coastal brick | Running-bond brick, stone trim, stone or brick pavers, pale deposits around exposed bases. | Regular punched windows, recessed entries, pitched tile roof where it fits, sills, shutters, and gutters. |

## Default demo and saved previews

Use the **Elevation laboratory** as the base. It already has the central well,
one stair flight, one ramp, and an upper landing connecting the two climbs. Its
`climb` route currently validates with two disjoint sampled routes and no
diagnostics. Put the dressed demo source in `projects/dressing-demo/level.aml`,
derived from the fixture. Use the existing courtyard slab and a straight wall
for the weathering example. Add a few window bays there and one background mass
beyond the playable area. Keep the well legible and both climbs usable. If the
demo needs an actual view through a window, author the aperture in the shared
base before comparing variants. [Elevation laboratory AML](../../tests/fixtures/aml/showcase.aml)

- Put **Open default level** beside **Open AML** in the shared standalone web
  reviewer. Make it available after opening a local file and use the same demo
  on the local and curated surfaces. When the demo is open, offer **Theme** with
  **Blockout**, **Kowloon street**, **High-tech industrial**, and **European
  coastal brick**. Keep the camera and compatible selection when switching so
  the same view can be compared. Include the selected demo theme in shareable
  view URLs. The existing appearance modes remain separate display controls.
- Build each preset once from the same AML revision. Publish a versioned
  manifest that maps each theme and seed to a self-contained textured GLB,
  reusable content-addressed PNGs, and the reviewer scene data. Include source
  and physical hashes so the viewer can check which assets belong together.
  Keep generated bundles under `generated/` and stage the named demo assets in
  the static site build. Offer **Download GLB** and a package with the separate
  textures, source, and reports.
- Load the prebuilt scene data and textures through the existing reviewer so
  the demo retains plan, selection, and walking controls. Share the validated
  base collision and navigation across themes. Reuse the current revision
  checks so a slow theme load cannot overwrite a later selection. Keep the last
  good view visible if an asset fails to load and expose a retry. Resolve bundle
  URLs relative to the site base and include the demo preview dependencies in
  the offline cache. [Current web reviewer](../WEBSITE.md)

## Build and verification

1. **Prove both paths on the demo.** Start with a playable wall and pavement with
   a door and a known wall–floor seam, plus one background box. Implement a seed,
   versioned kit lookup, finish assignment, a few procedural fixtures, and the
   façade grid. Reuse the AML builder, material UV/export pipeline, and seeded
   RNG. The existing layout generator's decoration code assumes its own rooms,
   so put the new pass on authored geometry and keep it independent of archetypes.
2. **Add the weathering and layout constraints.** Work from resolved faces and
   opening geometry. Keep the physical compiler authoritative. Generate native
   visual pieces outside physical assemblies and apply weathering to the render
   mesh. Keep the algorithms shared and make the kits data. Key random choices
   by seed, kit version, source ID, face, story, bay, and rule so unrelated edits
   leave existing placements stable. Bound candidate work, meshes, and texture
   bytes. Record generated IDs, materials, transforms, asset hashes, and skipped
   rules with source IDs, bounds, and an inspection target.
3. **Connect AML to the normal build and preview.** Resolve the base scene, run
   dressing, then publish through the existing runtime validation and export
   path. Both the CLI and reviewer should use the same recipe implementation and
   host-owned asset loading. Keep source AML editable and emit a dressing report
   beside the GLB and runtime JSON. Start with the reviewer and GLB/glTF. Bake
   the three presets for the demo and then try one maintained level.

| Verification boundary | Observable result |
| --- | --- |
| Recipe rules | A measured contact produces continuous falloff on both receiving faces. A separated pair and a doorway gap receive no contact treatment. A narrow span preserves pier clearance and reports a skipped window. An explicit story count beyond the height budget yields a source-linked error. |
| Normal build and export | Repeated builds with the pinned kit and seed reproduce the visual output. Dressed and undressed builds have identical physical hashes, collision geometry, navigation, and required route results. Compare collision geometry since GLB files can include material metadata. Failed builds preserve the last complete bundle. |
| Production reviewer | Open a local AML, return via **Open default level**, and switch themes at the same camera pose. Verify that the selected theme's model and textures are served and that a shared view URL reopens the theme. Exercise one rapid switch, one missing asset with recovery, and offline preview after caching. |
| Visual review | Inspect matching first-person and overview views across all three kits. Look at wall bases, the well, the two climbs, entries, roof junctions, and silhouette. Walk the demo to check visual route cues alongside the sampled navigation evidence. |

## Feasibility checks

Two in-memory checks used the existing starter AML and native compiler. The first
added a textured face assignment and a visual-only vent, then exported a GLB
containing both. The second replaced a distant visual box with a three-story
shell, 14 recessed window faces, one door, and a roof. Both variants passed runtime
validation and matched their respective baselines' physical hashes, collision
meshes, and navigation vertex/index arrays. The roof and 15 inserts were present
in the exported GLB.

Hosted `<infill>` failed against the non-collidable wall because the attachment
path expects the host's physical solid. The working check generated standalone
native visual inserts inside the recesses. These checks exercised existing
construction and export. The new AML section, theme kits, seam weathering, and
production generator remain implementation work.
