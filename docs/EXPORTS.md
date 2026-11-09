# LevelSpec exports

AML exports support GLB, glTF, binary FBX, and Quake BSP2 through the native export backends.
Exports contain geometry and source metadata, not Unity/Godot gameplay scenes.
The former ASCII/JSON APIs and legacy exporters are retired. BSP2 uses the XML
export pipeline; runtime JSON remains a supported generated artifact.

## CLI

```sh
# Existing default: GLB, runtime JSON, OBJ, SVG, validation and UV reports.
npm run compile -- examples/showcase.aml --out generated/showcase

# Portable models with referenced material images.
npm run compile -- examples/showcase.aml \
  --formats glb,gltf --out generated/my-export

# Binary FBX (Blender is optional until this format is requested).
npm run compile -- examples/showcase.aml \
  --formats fbx --blender /path/to/blender --out generated/my-export

# Quake BSP2 (requires the compiler tools and a palette).
npm run compile -- examples/showcase.aml \
  --formats bsp --out generated/quake \
  --qbsp /path/to/ericw-tools/qbsp \
  --vis /path/to/ericw-tools/vis \
  --light /path/to/ericw-tools/light \
  --quake-palette /path/to/palette.lmp
```

Select several formats with `--formats glb,gltf,fbx,bsp`. `--no-uv` skips
lightmap unwrapping; material UVs are always present. `--strict-floor-gaps` promotes floor gaps to errors.
`--surface-contacts error|warning|off` controls visible surface overlap auditing
(default: error). Invalid geometry or failed runtime
validation prevents publication. Ctrl+C cancels native work and removes staging
files. A failed/cancelled run preserves previous outputs; unrelated files in the
output directory are retained.

The following environment variables are alternatives to tool flags:
`BLENDER_PATH`, `QBSP_PATH`, `VIS_PATH`, `LIGHT_PATH`, `QUAKE_PALETTE_PATH`.
On macOS Blender defaults to its standard Applications path. On other systems
it is found through PATH. Use full paths to **ericw-tools** executables: some
systems already provide an unrelated command named `vis`. Native processes have
a ten-minute timeout each.

Blender 5.1.2 and ericw-tools 0.18.1 were exercised locally. The tools and game
palette are optional external dependencies, not installed or redistributed by
LevelSpec. The palette must be the 768-byte RGB `palette.lmp` appropriate for
your Quake installation.

## Read-only reviewer

The reviewer inspects compiled geometry but has no export dialog or source editor.
Use the CLI to export the authored source. Floor/cutaway/appearance controls affect
inspection only; they do not alter authored export geometry or materials.

## Contents and preservation

| Format | Contents | Coordinates |
| --- | --- | --- |
| GLB | Embedded buffer and deduplicated PNG/JPEG images | Y-up metres, root rotates `(x,y,z)` to `(x,z,-y)` |
| glTF | JSON, relative `.bin`, content-addressed `textures/` | Same as GLB |
| FBX | Binary 7.4 FBX, relative `textures/`, conversion log | Y-up/−Z-forward; metre scene with FBX units |
| BSP | BSP2, Valve 220 `.map`, WAD2, compiler logs/intermediates | Z-up, 32 Quake units per metre |

GLB/glTF/FBX preserve the compiled triangle geometry and separate meshes grouped
by structural part, source object, material and atlas page. Dynamic parts remain
separate. Marker nodes preserve IDs and positions. Material UVs use channel 0;
lightmap UVs use channel 1 when generated. Compiled/Blender UVs are bottom-left;
glTF reflects V and tangent handedness once to preserve image orientation in
its top-left texture convention. GLB/glTF retain the original float32 normal
and tangent components with that conversion. The Blender backend supplies canonical FBX corner normals and material
tangent/binormal frames explicitly to its binary writer; destination importers
may regenerate them. Blender reimport also quantizes custom normal directions.

Material textures are sRGB base color, multiplied by the authored color, with
repeat encoded in the UVs. GLB/glTF retain the PBR factors. FBX packages
color-multiplied PNGs because its direct-image binding cannot reliably represent
a multiply shader across importers. Full roughness and metalness values remain
in metadata. Native image conversion accepts up to 16 megapixels.

Every export package includes `<id>.levelspec.json`: source IDs, geometry hash,
parts/surfaces, materials, markers, routes, links, layers, lights, atlas, and
coordinate/UV conventions. Positions and atlas data in this sidecar remain in
canonical source coordinates. Node extras/custom properties preserve identity;
the sidecar is authoritative if a destination importer drops custom properties.
CLI/native exports also include `<id>.export.json` with dependency versions,
asset hashes and conversion diagnostics. Baked lighting images are not included;
there are no references to nonexistent lighting manifests. Destination engines
must configure collisions, gameplay and lighting themselves.

## Quake-specific behavior

BSP export retains final closed physical composition without changing runtime
geometry. Render-only native operands are retained separately and cannot double
count physical occupancy. Exposed face materials follow checked native partitions. Nonconvex cells undergo checked plane
cuts or exact tetrahedral fans for star-shaped warped cells. Convexity and
volume equivalence are checked before emitting brushes; unsupported decomposition
fails with the source object ID. Numerical construction uses a one-micrometre
kernel tolerance and a 0.1 mm convex-plane tolerance. Per-solid decomposition
is bounded at 4,096 pieces and 8,000,000 charged work units, with 100,000 brushes
per export. Zero-volume cut residue may be removed within those tolerances only
with strict mesh progress and a final missing/extra-volume audit.

An export-only enclosure is placed eight metres beyond geometry bounds, with
sky overhead. Its IDs and bounds appear in the export report. Compilation runs
`qbsp -bsp2 -leaktest`, `vis -fast`, and `light`; native collision hulls are
included. A neutral minimum-light value of 80 makes the blockout inspectable.
LevelSpec lights, lightmaps and navigation are not translated to Quake gameplay.

At least one authored spawn is required. Spawn kinds ending in `spawn`, plus
`info_player_start` and `info_player_deathmatch`, are recognized. They must lie
on the declared floor and clear Quake's 1 × 1 × 1.75 metre player hull. The first
becomes `info_player_start`; subsequent markers become deathmatch starts. A
single spawn also receives a coincident deathmatch start. Dynamic collidable surfaces become identified `func_wall` entities, without
doors, destruction or custom game code. Closed visual-only solids become
`func_detail_illusionary`, while invisible collision-only solids use the
special `skip` texture so they remain solid without drawing. BSP export rejects imported visualization meshes as unsupported brush inputs.
They are never passed to a checked solid operation; author a native replacement
or use another visual export.

Textures are converted into WAD2 miptex images, quantized against the supplied
palette without fullbright colors, resized to multiples of 16 up to 512 pixels,
and embedded in the BSP. BSP appearance is intentionally palette-based; PBR,
alpha and lightmap UVs are not preserved. Physical surface projection is used,
including an independent frame for wall end caps; unfolded ramp UVs are not
transferred. Compiler warnings are retained in logs and the export report.

## API and verification

```ts
import { compile, parseAml, resolveExportAssets, toGLB, toGLTF } from 'levelspec';
import { exportLevel } from 'levelspec/export'; // Node-only

const level = await compile(parseAml(source), {
  uvs: true,
  retainExportSolids: true, // needed only for BSP
});
const assets = await resolveExportAssets(level, readImageBytes);
const glb = toGLB(level, { assets }); // synchronous Uint8Array
const files = toGLTF(level, { assets }); // filename -> string or Uint8Array
await exportLevel(level, {
  formats: ['glb', 'gltf'], output: 'generated/export', assets,
  // sourceFile alternatively resolves textures relative to the AML file.
});
```

`toGLB(level)` remains valid for untextured callers. Referenced images require
resolved assets, rather than silently producing untextured models. `exportLevel`
accepts `AbortSignal`, progress callbacks and explicit tool paths.

`tests/vector-export.test.ts` covers Khronos validation, actual attribute
components, Three.js loading, textures, brush geometry, invalid spawns and failed
publication. Set the three ericw executable environment variables to enable the
real BSP integration test, which inspects compiled player-hull contents and the
visibility/light lumps.

`tools/export/verify-fbx.py` reimports FBX or GLB in Blender and compares triangle
corners, UVs, materials and marker positions to exported runtime JSON.
`tools/export/verify-godot.gd` exercises Godot's GLTFDocument importer.
Local acceptance artifacts live under `generated/export-qa` (not source assets).
Historical acceptance (not a current run): the full suite passed 366 tests with one optional BSP test skipped; the focused
native-enabled export suite passed all 10 export tests, and the final vector
suite passed all 125 tests with no skips. Godot 4.7.2 imported
the textured showcase with both UV channels; Blender round-trip checks cover
FBX and GLB; matched textured renders agree. The viewer downloaded a ZIP containing all four formats and disabled export
on stale/cancelled source. Dust II compiles to BSP2; ericw 0.18.1 reports clipped
portal warnings, retained for inspection. Unity import and in-game Quake rendering
remain unverified here because those destination installations are unavailable.

BSP acceptance runs used a synthetic grayscale test palette to exercise WAD
packing without bundling game assets. Supply your own Quake palette for actual
color output. The temporary acceptance viewer has been stopped.

AML runtime JSON 4 and native export metadata 3 include spatial volume declarations
and terrain tiles. Tile triangle ranges address the accompanying canonical
`physicalMesh`, before render partitions or collision filtering. See [terrain](TERRAIN.md).
