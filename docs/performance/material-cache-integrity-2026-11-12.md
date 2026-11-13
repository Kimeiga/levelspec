# Remove unnecessary material-cache work

Implemented November 12, 2026. This pass focuses on eliminated work and pipeline
shares, not repeated absolute-time benchmarks. It changes neither generated
materials nor texture/shadow resolution.

## Changes

The demo's built-in, compiler-namespaced local material cache now uses
**integrity-only validation**. Reusing a finished PNG verifies owned encoded
bytes, schema/layers, PNG signature/IHDR, positive planned dimensions, size limits
and SHA-256. It does not inflate the PNG, reconstruct pixels, copy the RGBA buffer,
then discard those pixels. Source images still decode because material sampling
and height processing need their pixels.

This is an explicit host trust decision through
`ArchitectureCompileOptions.materialCacheValidation`, not a claim accepted from
serialized metadata. The default is `decode`. Custom cache overrides in the demo
retain full decoding; other API hosts must deliberately opt in. Integrity mode
assumes compiler-written local artifacts and detects accidental corruption. It
does not independently establish PNG validity or authenticated origin, and it
does not defend against someone deliberately replacing both image bytes and
their digest. Full decoding remains available for untrusted cache inputs.

Admission budgets, 32 MiB image-size and 16 Mi-pixel limits, owned bytes,
cancellation and atomic publication remain in force. Digest failures become
cache misses and regenerate the affected material. Checking the digest before
decoding also avoids decoding corrupted entries in the default mode.

Two adjacent storage costs were removed:

- Base64 decoding already produces fresh storage. The disk reader now returns
  an exact Uint8Array view of it, avoiding a second encoded-byte copy before the
  compiler makes its own required ownership copy. Writing similarly uses an exact
  view while converting bytes to base64 synchronously, before any suspension.
- Cache writes only sort the inventory when eviction is necessary. Previously
  every write sorted all entries before discovering that the cache was below its
  quota. For an inventory of N entries, that removes O(N log N) sorting from each
  ordinary write. Size accounting still scans the inventory; this is not a claim
  that all cache bookkeeping is now constant-time.

## Work eliminated

The preceding frozen-scene measurements recorded 26,981 PNG decodes per warm
compile, comprising 14 source images and 26,967 finished-map validations. Keeping
the same hit set, this change removes:

- **26,967 decodes: 99.95% of PNG decode calls.**
- **77,121,663 pixels: 68.07% of PNG pixels reconstructed.**
- Approximately **308.5 MB of reconstructed RGBA data**, plus another **308.5 MB
  of ownership-copy traffic**, cumulatively across the compile. These are not
  peak-memory savings; inflater/filter intermediates are additional uncounted work.
- One redundant encoded-byte copy per disk-cache read and write, and inventory
  sorting on writes that need no eviction.

These are work-count projections from the same frozen hit set, supported by the
focused test proving that integrity-mode hits never invoke the decoder. They are
not newly measured whole-scene speedups. Calls, pixels and encoded bytes have
different per-unit costs; a 68% pixel reduction does not imply a 68% time reduction.
The implementation source change invalidates the normal cache namespace once, so
the decoding savings apply after the cache has been repopulated.

## Pipeline priorities

The following shares reuse the three pre-change native-decoder scene runs from
the [previous report](png-native-decoder-2026-11-12.md). Each share is the sum of
that stage's duration divided by summed compilation time across those runs.
Categories are disjoint; they are **pre-change guidance**, not a new profile.

| Stage | Share before this change | Useful next direction |
| --- | ---: | --- |
| Material assembly, cache access/validation and remaining rasterization | 45.4% | Reuse the remaining sign finishes; remove unnecessary serialization and copies. |
| Receiver-edge joining | 20.1% | Avoid global work for geometry whose boundaries or adjacency are already known. |
| Procedural dressing | 19.8% | Reuse repeated prop geometry/UV data rather than reconstructing identical parts. |
| Source image loading/decoding | 4.8% | Retain decoded inputs where they are reused; avoid an indiscriminate raw cache of finished output. |
| Receiver validation | 4.4% | Reuse immutable validated asset properties while retaining placement-dependent checks. |
| Mesh parts/finalization | 3.8% | Reduce repeated array construction and copying. |
| Other stages | 1.8% | Lower priority until larger repeated work is removed. |

This supports a simple optimization order: eliminate work whose result is thrown
away, reuse identical results, reduce data movement, then improve algorithms for
the remaining necessary geometry work. Parallelism comes after those changes.
The old profile still dispatched 116 sign-face jobs / 3,523,398 channel-texels;
complete explicit sign-program identities remain the next material-reuse target.
The stage proportions will shift as work is removed; refresh profiling when that
can change a decision, rather than running repeated timing rounds after each edit.

## Verification

Ran the compiler cache suite once: **9 passed**. It proves source-only decoding
in integrity mode, no raster dispatch for intact hits, exact publication,
stale-digest corruption recovery and subsequent reuse. Existing default-mode
coverage still rejects malformed PNGs with matching recomputed digests.

Ran the disk cache suite once: **3 passed**, covering byte views/ownership,
atomic replacement, namespaces, corruption, cancellation and eviction. Type
checking passed on the final code. Both independent reviews approved the changes.
No repeated benchmark rounds, new whole-scene run, full test suite or visual
goldens were used. Logs are under `generated/kowloon-cache-integrity-20261112/`;
[work counts and stage shares](material-cache-integrity-2026-11-12.json) preserve
the calculations.
