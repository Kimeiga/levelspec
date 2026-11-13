# PNG decoding: research and local experiment

Investigated November 12, 2026. This is research and an isolated decoder
experiment, not a production codec or cache-contract change. Texture dimensions,
shadow resolution, geometry and generated material bytes remain unchanged.

Follow-up: the Node codec experiment is now implemented; see the
[implementation and scene benchmark](png-native-decoder-2026-11-12.md).
Descriptions of the current decoder below record the pre-change investigation.

The strongest architectural opportunity is to **avoid reconstructing pixels when
the next stage only needs the encoded image**. Faster decoding is a separate,
useful improvement for images whose pixels we actually sample.

## What our compiler does today

The [large-material profile](kowloon-large-materials-2026-11-12.md) attributed
15.033 seconds of inclusive sampled time to `decodeSurfaceImage` in a 60.590-second
instrumented warm compile. Cached-artifact validation accounted for 11.855 seconds
and overlaps that decoding time. These are not additive stage timers or a promise
of 15 seconds of savings.

There are two distinct consumers:

- **Finished material artifacts:** `readMaterialArtifact` copies each encoded
  image, checks its dimensions, fully decodes it, verifies its SHA-256 digest,
  discards the decoded pixels, and returns the encoded PNG for publication.
  Subsequent work on a hit does not use those pixels.
- **Source material images:** `compile.ts` resolves and decodes every referenced
  companion before material-cache lookup. CPU rasterization and height-normal
  derivation can need these pixels. References are deduplicated within one compile,
  but decoded images are not retained between compiles.

Both use `pngjs/browser.js`, including in Node. This bundles JavaScript inflation
and a browser Buffer implementation. `decodeSurfaceImage` also copies its input
into that buffer and copies the decoded output. The cache host separately reads
JSON/base64 and copies decoded base64 bytes; the compiler copies again to establish
ownership. The frozen cache has 9,001 files occupying 124.65 MB. File I/O, base64,
PNG decoding and buffer ownership are separate costs; changing one will not remove
the others.

PNG pixel decoding includes DEFLATE decompression, reversing scanline filters and
reconstructing pixel values. Reading dimensions alone avoids that work, but does
not demonstrate that the compressed image is valid. Chunk CRCs likewise do not
prove a valid compressed pixel stream. See the [W3C PNG specification](https://www.w3.org/TR/png-3/).

## How other systems handle it

| Approach | Primary-source evidence | Application here |
| --- | --- | --- |
| Import once and cache derived artifacts | [Unity's Asset Database](https://docs.unity.com/en-us/engine/6000.6/manual/assets-and-media/asset-database/contents) converts source assets into runtime artifacts and tracks dependencies for reimport. [Unreal's DDC](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-derived-data-cache-in-unreal-engine) searches caches before generating derived data. | Use separate cached representations for CPU sampling and encoded output; invalidate on content, settings and implementation changes. These docs establish the architecture, not an assertion about each engine's PNG-validation internals. |
| Cook textures into GPU formats | [Godot's image importer](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_images.html) distinguishes lossless image storage, raw pixels and VRAM compression. [KHR_texture_basisu](https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/2.0/Khronos/KHR_texture_basisu/README.md) specifies KTX2 textures transcoded to platform block-compressed formats. | Useful for renderer loading, transfer and GPU memory. It does not directly provide editable RGBA pixels to our CPU material sampler. KTX2/Basis adoption needs exporter/viewer work and a separate quality evaluation. |
| Use faster lossless storage for CPU data | [LZ4](https://github.com/lz4/lz4) prioritizes fast decompression and publishes single-thread benchmarks. | A decoded source-image cache could store raw RGBA or LZ4-compressed RGBA. Benchmark our corpus: published throughput and compression ratios are not predictions for these textures. |
| Accelerate necessary decoding | [pngjs's Node parser](https://raw.githubusercontent.com/pngjs/pngjs/master/lib/parser-sync.js) and [inflater](https://raw.githubusercontent.com/pngjs/pngjs/master/lib/sync-inflate.js) use Node zlib. [libdeflate](https://github.com/ebiggers/libdeflate) provides optimized whole-buffer DEFLATE, including ARM optimizations. [Wuffs](https://github.com/google/wuffs/blob/main/doc/benchmarks.md) publishes reproducible PNG/codec comparisons. | First compare the existing package's Node entry point. Native/WASM alternatives are later candidates; libdeflate alone is not a complete PNG decoder. Wuffs' published results use an older Intel test system, not our M4. |

These approaches preserve image dimensions. Raw or lossless CPU caching can also
preserve exact pixel values. GPU block compression can change values even at the
same dimensions, so it should not be treated as an automatically lossless swap.

## Local decoder comparison

Compared installed `pngjs` 7.0.0's browser and Node entry points on the complete
frozen disk-cache corpus: **26,964 PNGs, 77,120,640 pixels, 90,611,275 encoded
bytes**, across 9,001 artifact files. This counts stored channel images, not
deduplicated published assets or repeated scene placements.

Node 24.12.0, Apple M4, macOS arm64. Each decoder ran synchronously through the
same preloaded corpus. Both paths copied encoded input and decoded RGBA output.
An untimed full-corpus comparison verified every dimension and RGBA byte and
warmed both decoders. Three timed passes per decoder alternated order, with an
explicit GC before each pass. No task-owned heavy work ran alongside the test;
other machine load was uncontrolled. V8 can still use background GC threads.

| Decoder | Wall times | Median wall | Median process CPU |
| --- | --- | ---: | ---: |
| Current browser build | 6.755, 7.098, 10.590 s | 7.098 s | 7.770 s |
| Node entry point using native zlib | 2.803, 2.829, 2.966 s | 2.829 s | 3.167 s |

The observed median decode throughput is **2.51 times higher** with the Node
entry point, with exact pixels on this corpus. This is a codec experiment, not a
whole-compile benchmark or a measured replacement for the previous 15.033-second
sampled category. Disk I/O, JSON/base64, hashing, scene work and source textures
are excluded. The corpus consists of generated PNGs; it does not establish
compatibility for every user-provided PNG variant or malformed input.

The [machine-readable results](png-decoding-research-2026-11-12.json) include all
runs, environment and the corpus fingerprint. The experiment script and log are
under `generated/png-decoding-research-20261112/`; reproduce with
`node --expose-gc generated/png-decoding-research-20261112/compare.mjs` while the
frozen cache exists. No production decoder has been switched and no whole-scene
tests were rerun for this research-only change.

## Recommended experiments, in order

1. **Use an appropriate codec for the host.** The Node entry point of our existing
   dependency is the smallest experiment and retains full decoding validation.
   Inject the codec at the host boundary; keep the browser-compatible core and
   worker paths working. Do not introduce a Node import into the shared browser
   module. Validate palettes, transparency, interlacing, bit-depth conversion,
   malformed/truncated data, size limits and buffer ownership before adopting it.
2. **Eliminate redundant decoding of finished artifacts.** Establish a distinct
   trusted, locally generated artifact path: validate on admission, record the
   encoded content digest plus dimensions/schema/codec version, then verify bytes
   against that trusted record on reuse without rebuilding RGBA. External/custom
   cache providers must retain full validation unless an explicit trust contract
   changes. A digest supplied alongside arbitrary bytes proves neither origin nor
   PNG validity; a `validated: true` field from that same provider is insufficient.
   In-process memoization of already validated digests is a narrower first step,
   but does not remove first-read decoding in each fresh process.
3. **Reuse decoded source images.** Key a bounded import cache by encoded content,
   decoder version and pixel interpretation. Validate once on import and retain
   immutable/owned RGBA. Start with an in-process cache for the live reviewer;
   compare raw and fast-lossless disk storage for fresh CLI processes. Lazy decode
   after artifact lookup is another possibility, but height-dependent geometry,
   source-input validation and memory-budget rules must still hold.
4. **Replace JSON/base64 artifact payloads with binary storage.** Keep metadata and
   raw PNG bytes with bounded lengths, atomic publication and exact ownership.
   This removes base64 expansion and intermediate copies without requiring a new
   image format. Measure per-file overhead before introducing an archive/index;
   a pack adds eviction and concurrent-writer complexity.
5. **Only then evaluate new codecs or Rust.** Compare libspng/Wuffs/native or WASM
   adapters on remaining unavoidable decoding. Independent source images are
   parallelizable, but unnecessary validation and copies should be removed first.
   Keep thread counts explicit in comparisons; a threaded library is not evidence
   of a single-thread improvement.

An uncompressed copy of all 80,645,061 scene channel-texels would be approximately
322.6 MB (307.6 MiB) at four bytes per RGBA map pixel, before metadata and without
mipmaps or deduplication. That exceeds the current 256 MiB disk quota. This is an
illustration of the tradeoff, **not** the measured size of a source-image cache.
Retaining decoded versions of every finished map would waste space when the
compiler only needs its PNG bytes. Cache pixels selectively where a consumer
needs pixels.

## Acceptance and measurement

Use the frozen material corpus for decoder comparisons and a fresh frozen scene
for end-to-end runs. Record cold and warm processes separately. Measure resolve/I/O,
base64 parsing, encoded hashing, inflate/filter/pixel conversion and memory use
separately; record both wall and CPU time. Hold texture density and shadows fixed.

Compare exact decoded bytes and published encoded bytes where the change promises
losslessness. Exercise invalid cache data, cancellation, size budgets, mutable
provider buffers and dependency invalidation as compiler contracts, not visual
goldens. Browser and worker paths require validation if host-specific decoding is
introduced. Changing only this bottleneck cannot establish the sub-second target:
the preceding profile still spent roughly 26.4 seconds outside the raster stage.
