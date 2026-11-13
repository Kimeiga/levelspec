# Shared material library

Procedural dressing uses shipped materials by default. Scenes no longer need to
copy a study's material declarations or images to obtain the current concrete,
ceramic, wood, painted steel, or stainless finishes. Ordinary compilation loads
local intrinsic PBR assets; it does not run image generation or bake lighting.

```xml
<dressing seed="street" theme="kowloon-street@1">
  <building host="tenement" stories="4"/>
  <floor host="courtyard" ground="patched"/>
</dressing>
```

An omitted recipe material selects `builtin:plaster` for walls/buildings and
`builtin:concrete` for floors. Native callers may supply `ArchitectureInput` with
omitted recipe materials too. Concrete trim, foundations, shop slabs and roof
paving always have their own structural-concrete role. A wall's coating is not
that role's fallback.

| Material reference | Intended mapping / use |
| --- | --- |
| `builtin:concrete` | Repeating concrete albedo and tangent normals, 8 m period |
| `builtin:plaster` | Repeating plaster coating; facade weathering adds exposure and runoff |
| `builtin:ceramic` | Individual wall/floor ceramic fragments; damage and bedding remain separate |
| `builtin:tile-bed` | Mineral bedding beneath removed/chipped ceramic |
| `builtin:asphalt` | Photographic aggregate with tangent-normal relief |
| `builtin:timber` | Generic repeat-safe wood, including ground planks |
| `builtin:shop-timber` | Member atlas: shelves, door boards, end grain and continuous grain direction |
| `builtin:metal`, `builtin:sheet` | Steel substrates for the shared paint/rust/grime surface sampler |
| `builtin:brushed-metal` | Repeating stainless albedo, normals and packed roughness/metalness |
| `builtin:tarp` | Shared weathered canvas, 1.5 m period, fiber normals and roughness; static Blender cloth forms |
| `builtin:roofing` | Roof membrane; distinct from structural concrete |
| `builtin:restaurant-tiles` | Kitchen tile field with its own physical mapping |
| `builtin:aircon`, `builtin:lettering`, `builtin:restaurant-surfaces` | Dedicated panel/glyph/material atlases; use their existing geometry adapters |

Shop food, stock, posters, cloth and signboard inputs are also catalog roles.
An atlas is never a general replacement for a repeating surface map. UVs use
physical meters and each material's repeat; explicit panel/glyph UVs pass through.
Painted metal uses the existing layered corrosion sampler, including intrinsic
normal relief and gravity-aware dirt. Stainless remains a separate clean-metal
finish. The default component density is 64 texels/m, with finer minimums for larger
metal faces and continuous sheets. Texture density controls quality; it no longer enables/disables the
production component finish.

Facade paper notices use the shared 16-design poster atlas and its padded,
reflection-aware mapping; placeholder colored cards are no longer emitted.
Window and door soot is an opening-dependent intrinsic tint. It is separate from
the shared repeating facade recipe, so moving an opening does not generate a new
concrete or plaster texture. Existing receiving panels are refined locally where
needed for soft tint transitions. Tiled facades compose the same opening deposits
into their finite finish. `grime="0"` disables these added deposits.

The default appearance budgets are 4/8/16 Mi texels at low/medium/high detail,
with 16,384 receiver charts (32,768 at high). Memory is bounded at 64 MiB (128 MiB at high detail); large
streets may set explicit compile budgets, as the demo does.

## Authored overrides

A recipe's explicit `material` remains authoritative. For component roles,
`finishes="custom"` selects a declared `custom-concrete`, `custom-metal`,
`custom-shop-timber`, etc. Missing roles inherit the library independently. Each
override retains its complete color, repeat, scalar factors and PBR channels;
channels are not silently filled from a different material. Declare a normal AML
ID for custom finishes. `builtin:*` names are reserved for canonical catalog
definitions; unchanged definitions survive normalized-source round trips.

## Ownership and image loading

`src/materials/catalog.ts` owns role definitions. `src/materials/library/` owns
shipped assets; its provenance records the initial promotion from the approved
studies. The concrete, stainless, shop-timber and restaurant-surface generators
publish there. Change a role definition or its
assets once to update every consumer using that default. Existing study files
with explicit old declarations remain authored overrides; they do not define the
production library. `projects/dressing-demo/level.aml` demonstrates the defaults.

`levelspec-material:*` image references resolve through a strict whitelist in
`src/materials/images.ts`. Browser workers, the reviewer, local CLI, browser
export service and Node exports support them without a file-picker companion.
Missing library references fail rather than rendering a plain substitute.
Export resolves only materials used by visible triangles. GLB embeds the used
maps; glTF packages them by content hash, sharing duplicate bytes.

The native compiler and `resolveExportAssets` treat an explicitly supplied image
reader as authoritative. Compose authored I/O before caching or freezing bytes:

```ts
const readSource = withBuiltinMaterialImages(readAuthoredImage);
// Cache readSource's results here, then use that same reader for compile/export.
const level = await compile(document, { resolveMaterialImage: readSource });
const assets = await resolveExportAssets(level, readSource);
```

Omitting the reader supports shipped assets only. Parallel demo workers receive
frozen image snapshots, including library inputs, and fail on a missing snapshot.
They never reread library files during replay. Asset bytes participate in source
hashes and the demo build fingerprint. Shader/raster optimization remains owned
by the existing surface pipeline.

## Why the integration was missed

Earlier kits registered plain colors and looked for optional per-project
`<prefix>-<role>` declarations. Missing concrete inherited the wall substrate;
weathering depended on optional texture density. Wall, building and furnished
shop shutters had separate finish paths. Standalone studies and the demo carried
independent material lists, so approving a study did not update production.
The catalog, default component settings, shared shutter geometry/finish and
complete host image-loading boundaries replace those integration points.

Checks protect bindings, override ownership, image resolution, source immutability,
round trips, cancellation and export packaging. They do not fix texture pixels,
rust distribution, colors or prop placement as acceptance requirements.
