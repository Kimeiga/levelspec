# Daiban global-route packet: independent test review

Reviewed 2026-11-01 using `maintain-tests`. This is an XML/file ownership review
of the project-specific staging helper, not architectural, source-fidelity,
whole-level or gameplay acceptance. No architectural model was generated; the
construction family remains unreleased. No helper production code was edited by
this reviewer.

## Disposition

**No unresolved material test findings remain for the packet ownership scope.**
The original thirteen controls passed independently, but did not establish all
stated ownership guarantees. The review added focused controls, found baseline
duplicate-ID and implicit asset-deletion defects, and verified the producer's
corrections. A bounded follow-up also verified the separate implementation
reviewer's output-root-ID collision correction. All twenty-seven current control
groups pass. Separate implementation
review remains responsible for code adjudication; this test outcome does not
release the architectural family.

## Material findings

### Resolved: baseline duplicate IDs were accepted

A baseline containing `<layer id="duplicate"/><material id="duplicate"/>` and a
clean study returned success and wrote duplicate IDs to the final XML. The old
exercise's duplicate case only tested a study ID colliding with a baseline ID.
Checking only the surviving ID set also allowed duplicate baseline owners to be
silently removed when their shared ID was retired.

Reproducer: `generated/daiban-global-route-packet-test-review/probe.py`, original
result `run-63csp36s/result.json`. The failing helper SHA256 was
`fdce94c605e93e20db698848e0b01cb3cc3af57d662712865115a2c06714a054`.
Source bytes and the caller study tree remained unchanged, so input preservation
alone did not establish valid output ownership.

The producer now rejects duplicate IDs across the entire parsed baseline before
retirement. New exercise cases require rejection both when those owners would be
retained and when their ID is explicitly retired. Both pass after the correction.
A separate study-internal duplicate case also passes. Together with the original
study-versus-baseline case, these protect all three relevant duplicate boundaries.

### Resolved: unretired unused asset and companion were dropped

A baseline containing only
`<asset id="declared-but-unused" src="assets/declared.bin"/>`, with existing
companion bytes, an empty study and an empty retirement set previously merged
successfully but lost both the asset declaration and the companion in the output.
The merge record reported no retired IDs and no companions. This followed from pruning all
assets not used by surviving props, including declarations already unused before
the merge.

Reproducer result:
`generated/daiban-global-route-packet-test-review/run-y5ikmlrw/result.json`.
The producer adjudicated preservation of every unretired asset declaration and
companion, including preexisting unused declarations, and removed all implicit
asset pruning. The README now states that a caller retiring a prop and its asset
must explicitly nominate both identifiers. There is no current architectural
builder/caller whose inferred retirement set was silently reinterpreted.

The nominal exercise now retires `retire-me` and `retired-asset` explicitly and
requires that exact pair in the merge record. Two new positive controls close
the finding without weakening the prior omission/identity assertions: retiring
only the prop preserves its now-unused asset/companion; a preexisting unused
asset preserves its exact declaration, companion bytes and independently computed
hash, with an empty retirement list and an unchanged source tree. Both pass.

### Resolved in bounded follow-up: generated root ID collided with declarations

The separate implementation reviewer reproduced a retained baseline child whose
ID matched the generated output root ID. Renaming the root after duplicate checks
previously created duplicate IDs in otherwise accepted output. The producer now
rejects such retained/new declarations before output writes.

Independent replay used the original reviewer's archived baseline XML bytes from
`followup/packet-7in24gaq/root-id/base/level.level.svgx`; rejection preserves the
source bytes and study tree and creates no output directory. An ordinary positive
merge retains both baseline/new child IDs with unique final IDs and unchanged
inputs. Replay evidence:
`generated/daiban-global-route-packet-test-review/root-id-hgicn50p/result.json`.

The exercise now rejects both baseline-child and study-child collisions, deriving
the output ID from a successful nominal output rather than hard-coding its
spelling. Follow-up assertions verify unchanged collision inputs and absent
outputs. One related positive control accepts a baseline root that already owns
the resulting output ID and preserves its retained child. This prevents a broad
rejection of every occurrence of the output ID from satisfying the negatives.
No unrelated test suite or helper production edits were introduced.

## Focused exercise improvements

All changes are in
`projects/dai2-daiban/studies/r02/global-route-construction-v1/packet.exercise.py`.
They use small XML/byte fixtures and direct observable results, without compiling
a model or introducing a test framework:

- A tiny nominated freeze contains a nominee and a separate companion. Changing
  or deleting the non-nominee file must fail while the nominated freeze bytes
  stay unchanged. This closes the gap left by testing only the correct real
  family and an incorrect freeze SHA.
- The merge record must identify the exact original baseline bytes, exact retired
  ID list, and complete expected companion reference set. Every recorded digest
  is independently compared with `hashlib.sha256` of the final output file.
  An empty/incomplete record cannot pass merely because a loop has no entries.
- Retained owners must keep their attributes and descendants, compared as XML
  content with insignificant indentation removed. Mere ID presence is inadequate
  to preserve a retained transform, collision flag, material or nested owner.
- Identical bytes at a normalized `assets/./shared.bin` alias must succeed, while
  conflicting normalized and portable case aliases must fail. This protects
  valid sharing alongside the existing conflict negatives.
- Baseline companion file sets/bytes, baseline XML and caller study tree are
  checked after success and rejection paths. Study companion sets/bytes are also
  checked around the conflict/reserved-path rejection groups. The existing output
  sentinel must retain both its bytes and its complete file set.
- Baseline retained/retired duplicate IDs and study-internal duplicates now have
  distinct cases, in addition to the baseline/study conflict control.
- Prop-only retirement and preexisting unused-asset controls independently
  establish preservation of every unretired asset/companion. Asset cleanup in the
  nominal case requires the explicit asset ID, rather than an implicit side effect.
- Resulting root-ID ownership has baseline-child and study-child rejection
  controls, plus a valid existing-root positive, all using the observed nominal ID.

Existing reserved output-XML tests cover the literal name, `./` alias and portable
case alias. They require `ValueError`, rather than accepting an incidental missing
source file error as evidence of reserved-name rejection. These and the companion
hash comparisons establish that successful copied companion bytes correspond to
the final output in the tested cases.

## Execution and limits

- Original thirteen-control exercise independently passed:
  `generated/dai2-daiban-review/global-route-packet-controls/run-zltnzt0o/result.json`.
- Final expanded exercise after the bounded root-ID follow-up:
  **27 control groups passed**,
  `generated/dai2-daiban-review/global-route-packet-controls/run-6so74dw8/result.json`.
- `python3 -m py_compile` on the helper and exercise passed.

The verified final helper SHA256 is
`8d189f6221c3df7a8fd5fbe0bf25e6dfa1fd435d68bf6a308b4d78e285e65026`;
the final exercise SHA256 is
`b7e0ae3214d46548f3d4b9f5781a59a94e63ce1779d28d07e3a1efb17ef4b4cc`.
The accepted producer corrections for normalized destination ownership, reserved
output XML aliases, held input bytes and deep-copying are exercised through their
observable results; tests do not inspect their source spelling or private state.

This review does not claim atomic cleanup of partially staged directories after
a failure; the stated contract requires rejection and a fresh output, and no
failed call may be presented as a completed packet. It also does not infer
geometry correctness, release a family, or authorize a merged construction.
