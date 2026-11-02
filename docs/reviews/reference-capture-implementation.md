# Independent reference-capture implementation review

Date: 2026-11-01. Current disposition: **accepted** for the reviewed capture-integrity
contract at final helper hash `500ad5bf55dc5b8fbb789930b46932883d4cda32be2eb523e3e85f2d8e203cb7`.
All reproduced findings are resolved; no material implementation finding remains. Scope:
`projects/dai2-daiban/capture.mjs`; no production or model
files were edited by this reviewer. This implementation review is separate from
the connection agent's pre/post test review and architectural fidelity review.

Initial reviewed helper SHA256:
`656ad4c6f91e9dd00a4fb43ad5fdde3a849ccd59893538eb7ea7143ea2702462`.
Line references below identify that snapshot.

## Final follow-up: accepted

Reviewed SHA256:
`500ad5bf55dc5b8fbb789930b46932883d4cda32be2eb523e3e85f2d8e203cb7`.
The exact case-aliased parent-link reproducer was independently rerun against this
revision. The directory-link mutation completed; the helper exited 1 after detecting
the tracked `ASSETS` entry change, and `capture.json` was absent. This closes the
last demonstrated bypass. Prior counterexamples and their repair outcomes remain
below as the review record.

The final diff removes event spelling as an ownership gate. Any rename notification
for a watched parent now checks the authoritative stamps of its tracked entries.
Filesystem aliases therefore cannot prevent the check, while unchanged unrelated
entries compare equal. The implementation avoids a separate case/Unicode mapping
policy and retains the atime exclusion needed for ordinary reads. Earlier file
identity/write-stamp and linked-component discovery fixes remain intact.

No material source-attribution, archive-containment, exclusive-output, held-byte
ownership or browser/watcher cleanup defect remains in the reviewed paths. The
helper still verifies and forwards actual upstream source payloads, archives held
bytes and preserves native captures/matrices. This is implementation acceptance;
the test reviewer's extended-suite execution is separate and is not claimed as
this reviewer's execution. Nothing here accepts architectural or photographic
fidelity, and the views remain diagnostic as labeled.

Final exact reproducer: `/tmp/daiban-capture-parent-case-alias-review.mjs`.
Final outcome: `/tmp/daiban-capture-parent-case-alias-review-results.json`.
The preceding successful-bypass outcome is retained at
`/tmp/daiban-capture-parent-case-alias-review-2068-results.json`.
The final reviewed helper is retained at `/tmp/daiban-capture-500ad5-reviewed.mjs`.
Final exercise root:
`/var/folders/61/r756smb95_16p68hfyzwypq40000gn/T/daiban-capture-parent-alias-BKFxmv`.
The isolated preview was closed; no helper/model edits or operation of user
preview 5186 occurred.

## Earlier follow-up: write stamps and linked-component ownership

Re-reviewed SHA256:
`2068aa6f21e0fba8af49622de4adbb54f5207eadae6d884df3ad7f920673b58a`.
The original backslash escape, uppercase reserved-name collision and linked-file
restore repros all reject. The linked-directory restore repro from the preceding
follow-up now also rejects. All four exercises were independently rerun against
this exact helper; none publishes successful capture metadata.

Discovering linked components with `lstat` establishes the directory entries whose
replacement was previously unobserved. The shared stamp compares device, inode,
size, nanosecond mtime and ctime while excluding atime. This distinguishes observed
identity/write changes from ordinary reads without treating every read notification
as mutation. File content hashes, held-buffer archive ownership, upstream response
verification, exclusive writes and browser/watcher cleanup remain intact. The test
reviewer's unchanged-input control is a separate execution; this reviewer does not
claim to have run that control in this follow-up.

### Remaining event-name alias gap

**Medium priority.** Directory callbacks use `names.has(String(name))` before
comparing the tracked entry's stamp. On the actual case-insensitive filesystem,
the supplied path spelling can differ from the entry spelling emitted by
`fs.watch`. The differing spelling prevents the stamp check from running.

Actual isolated exercise: XML declares `src="ASSETS/fixture.glb"`; the actual linked
directory entry is named `assets`. After the first PNG, the exercise switches that
entry to a directory containing a different valid GLB and restores the original
target. The helper exits 0 with `servedInputsVerified: true` and all four views.
The mutation completed. Events named `assets` do not match tracked `ASSETS`; file
stamps still see the restored original child. This is the same strict mutation
monitoring guarantee failing through a supported filesystem alias. It does not
demonstrate incorrect served or rendered bytes.

Required repair outcome: preserve tracked-entry stamp ownership when an event name
is an alias of the supplied path. An exact event-spelling gate cannot establish
that correspondence on this filesystem. Recheck the same alias case and preserve
an unchanged control; no new model or camera work is required.

Exact reproducer: `/tmp/daiban-capture-parent-case-alias-review.mjs`.
Results: `/tmp/daiban-capture-parent-case-alias-review-results.json`.
Retained fixture root:
`/var/folders/61/r756smb95_16p68hfyzwypq40000gn/T/daiban-capture-parent-alias-3oRoH7`.
The reviewed helper is retained at `/tmp/daiban-capture-2068-reviewed.mjs`.
Preceding-revision outcomes are retained as the `*-22e2025-results.json` files.
All independent exercise previews were closed; no production/model changes or
operation of user preview 5186 occurred.

## Earlier follow-up: repaired snapshot

Re-reviewed SHA256:
`22e2025c718e7439e6a386777790c88fbfa1f72aa5fcbbcb8a076aece0cd8b80`.
The three original reproducers were rerun against the actual repaired helper:

| Case | Actual outcome |
|---|---|
| Backslash archive escape | Exit 1 at portable-reference preflight; no successful packet. |
| Uppercase `OBLIQUE.PNG` collision | Exit 1 at reserved-output preflight; no successful packet. |
| Linked file target written and restored in place | Exit 1 from monitored file events after capture; no successful packet. |

The fixes address the original ownership causes: unsupported backslashes are
rejected before normalization; archive names derive from the same validated
canonical relative path; reserved names are case-folded; archive files use exclusive
writes. Held byte buffers and verified upstream response forwarding are preserved.
Both lexical and resolved file targets receive file-event watches, with directory
watches for ordinary replacement. Partial watcher setup and browser ownership still
have explicit cleanup. No material regression was found in these repaired paths.

Before-repair result copies remain at
`/tmp/daiban-capture-independent-review-before-results.json` and
`/tmp/daiban-capture-normalization-review-before-results.json`; their original result
paths now contain the repaired-run outcomes. The unchanged original reproducers
and their fixture roots are retained.

### Remaining linked-parent replacement gap

**Medium priority.** A companion may pass through a directory symlink. Watching the
child file binds to its original inode; watching its lexical parent binds to that
symlink's original target directory. Neither observes replacement of the directory
symlink entry in its own parent. The source-directory watcher, when present, filters
events by the source filename and does not include the linked directory's basename.

Actual isolated exercise against the repaired hash: `assets` pointed to
`original-assets`, containing the held GLB. After the first PNG, the exercise changed
that directory link to `changed-assets`, containing a different valid GLB, then
restored `original-assets`. The helper exited 0 with `servedInputsVerified: true` and
all four views; the exercise confirmed the mutation completed. Its final held and
served bytes can still be correct. The defect is the remaining accepted input form
that bypasses the explicit change/restore rejection contract, not a demonstration
of a wrong rendered mesh.

Required repair outcome: define and enforce the supported linked-directory policy.
Reject unsupported linked parent components, or observe their replacement entries
as well as the resolved files. Preserve the ordinary unchanged-input control and
recheck this demonstrated case before accepting the strict monitoring claim.

Reproducer: `/tmp/daiban-capture-parent-alias-review.mjs`.
Results: `/tmp/daiban-capture-parent-alias-review-results.json`.
Retained fixture root:
`/var/folders/61/r756smb95_16p68hfyzwypq40000gn/T/daiban-capture-parent-alias-aXc036`.
All independent follow-up previews were closed. Production/model files and user
preview 5186 were not operated by these exercises.

## Original findings (resolved by the repaired snapshot)

### 1. Normalization after validation allows archive paths outside the owned packet

**High priority.** `loadInputs()` validates the raw companion path at lines 25–32,
then changes backslashes to slashes at line 33. `writeInputs()` resolves the changed
key as an output path at lines 101–104 without checking containment again. The input
and archive checks therefore concern different paths.

Actual isolated exercise: a valid reference declares `image="..\escaped.png"` and
the POSIX source directory contains a literal file named `..\escaped.png`. The
source read is inside that directory and passes validation. Its normalized key is
`../escaped.png`. The helper exited 0, published `servedInputsVerified: true`, wrote
the reference outside its output directory and recorded `snapshot: "../escaped.png"`.
The escaped file's bytes matched the held reference. This also permits addressing
a sibling packet rather than preserving output ownership.

Required repair outcome: validate the exact archive path representation, keep every
snapshot inside its owned packet, and reject unsupported aliases before screenshots
or archive writes. Validate normalization consistently rather than validating one
representation and writing another. Retest the escape and a normal companion.

Reproducer: `/tmp/daiban-capture-normalization-review.mjs`.
Results: `/tmp/daiban-capture-normalization-review-results.json`.
Retained fixture root:
`/var/folders/61/r756smb95_16p68hfyzwypq40000gn/T/daiban-capture-normalization-SIT1LD`.

### 2. Case aliases bypass reserved native-image names on this filesystem

**High priority.** The reserved-name comparison at line 30 is case-sensitive, while
the actual macOS filesystem treats the tested uppercase/lowercase paths as the same
file. The subsequent archive write uses the ordinary overwriting `writeFile()`.

Actual isolated exercise: change the valid reference declaration to
`image="OBLIQUE.PNG"`, retaining the existing 1×1 reference image. The helper exited 0
and published `servedInputsVerified: true`. Archiving the companion overwrote the
rendered `oblique.png`: its saved PNG was 1×1, while `capture.json` still claimed an
actual 683×1024 canvas. Byte comparison confirmed the saved PNG was the reference.
This reproduces the prior native-image collision through a filesystem alias even
though the exact lowercase name is now reserved.

Required repair outcome: reject aliases of every reserved output according to the
supported filesystem policy, and prevent archive publication from overwriting an
already-created packet file. Preserve a successful unchanged native-image control.

### 3. Symlink targets can change and restore without entering the monitored set

**Medium priority.** `watchInputs()` watches each declared path's lexical parent
and basename at lines 42–53. `loadInputs()` follows file symlinks without rejecting
them or resolving their actual target into the monitored set. Final hashes alone
cannot detect a target that changes and restores between reads.

Actual isolated exercise: `assets/fixture.glb` was a file symlink to a temporary
target outside that parent. After the first PNG appeared, the target was replaced
with a different valid GLB and restored to its original bytes. The helper exited 0
and published `servedInputsVerified: true`. The exercise confirmed the mutation ran.
This does **not** demonstrate a wrong rendered mesh: upstream byte verification
still constrained served inputs. It demonstrates that the promised rejection of
change-then-restore is incomplete for an input form the helper accepts.

Required repair outcome: either reject unsupported linked inputs before capture,
or monitor their real targets and alias/replacement paths coherently. Include source
and parent-path aliases in that policy, and rerun the linked change/restore case.

Findings 2 and 3 reproducer: `/tmp/daiban-capture-independent-review.mjs`.
Results: `/tmp/daiban-capture-independent-review-results.json`.
Retained fixture root:
`/var/folders/61/r756smb95_16p68hfyzwypq40000gn/T/daiban-capture-independent-bASJfE`.

## Initial lifecycle assessment (historical)

The helper now verifies the actual upstream CLI source JSON and forwards that
unchanged response only after comparing XML and every supplied companion against
held bytes. The current official preview client passes those verified bytes into
the compiler/image companion flow. This addresses the original wrong-source and
different-companion attribution defects without substituting a synthetic response.

Archive writes use held buffers rather than rereading mutable files. Ordinary
declared paths receive both disk-hash and filesystem-event checks. Atomic exclusive
creation of `.capture-owner.json` resolves the two-helper empty-directory race;
nonempty output reuse rejects before screenshots. Failures before browser creation
do not own browser/watch resources, watcher-setup failure closes partial watchers,
and the enclosing `finally` closes installed watchers and the browser. Pending
source routes are drained on the successful path before closing the page.

The four views retain requested native CSS and backing-store dimensions, actual
view state, and rendered view/projection matrices. Neither source-byte verification
nor these matrices establish architectural fidelity; all photo comparisons retain
their diagnostic qualifications.

## Initial exercise limits and disposition (historical)

The reviewer independently executed the three counterexamples against the actual
helper, using temporary fixtures and separate ephemeral CLI previews. All isolated
servers were closed. No canonical source, geometry or user preview 5186 was operated.
Prior test results were inspected for context, not represented as this reviewer's
own executions. The connection agent's final test rerun is a separate result.

These findings do not establish corruption of the canonical m07 packet. They block
acceptance of the helper's stated containment, native-image preservation and
change/restore guarantees for its currently accepted inputs. Re-review the affected
boundary after repairs and rerun the focused counterexamples plus an unchanged
native multiview control before marking this implementation accepted.
