# Optional bounded reconstruction cycles

Use the [reconstruction runner](../../../../docs/RECONSTRUCTION.md) when independent
image annotations and repeatable measured comparisons help resolve a reconstruction.
It is not required for invented maps, every XML revision or diagnostic 3D study.
Native validate/build/preview plus proportional structural and fidelity review are
the normal authoring path. Do not fabricate annotations merely to run an evaluator.

For agent-authored source, evaluation mode needs no model API:

```sh
npm run reconstruct -- --source projects/my-level/level.level.svgx \
  --image main=projects/my-level/references/main.png \
  --image reverse=projects/my-level/references/reverse.png \
  --evidence projects/my-level/evidence/annotations.json \
  --max-revisions 0 --out generated/my-level/cycle-01
```

Use actual reference IDs and matching image identities/dimensions. Read the runner's
current documented options rather than copying project-specific thresholds.

## Controlled comparisons

Choose a consequential hypothesis. Freeze the candidate XML/companions, independent
observations and camera fits; compare one coherent geometric change at a time when
attribution matters. Camera fitting and navigation-resolution experiments are separate
controlled diagnostics. Independent evidence must not be silently changed to fit
the current model. Generated CAD/depth aids are hypotheses, never trusted inputs.

Use a fresh output directory because the runner clears its owned previous outputs.
Retain command, exit status, result/attempt reports and inspected actual captures.
Inspect per-view errors and geometry/navigation diagnostics, not just aggregate score.
A successful image score cannot waive failed navigation or wrong architectural
ownership. `best.level.svgx` can be a valid draft when acceptance failed; read
`result.json`. Invalid candidates stay diagnostic and must not become valid best.

## Decide the next revision

Combine measurements with the affected structural/fidelity reviewers' findings.
Repair supported major relationships before detail and recheck their interfaces.
Reuse accepted observations and unaffected work. The runner's machine acceptance,
physical circulation and reference fidelity remain separate conclusions. A finite
batch ends with its outcome and next unresolved issue; retain missing evidence or
tool limitations explicitly rather than weakening checks to obtain success.
