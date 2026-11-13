# Detailed-model capture readiness — preimplementation review

Independent reviewer `/root/model_r04_circulation` assessed the proposed helper
change before editing `projects/dai2-daiban/capture.mjs`. A cold frozen E7 preview
reached readiness after58.899 seconds in `preview-timing.json`, close to the old
60-second limit; earlier capture failures remain recorded. The single-view
readiness probe made no source or geometry changes.

The reviewer supports a bounded120-second readiness deadline, preserving the
actual ready/error condition, fail-fast compiler error, immutable input and served
source verification, and all canvas checks. Record the chosen budget and elapsed
time per view. Do not introduce automatic retry masking or treat longer waiting
as architectural acceptance.

Existing capture integrity and manifest exercises plus an actual frozen E7
capture provide proportionate verification. A test asserting only the timeout
number would mirror implementation and is unnecessary. A separate implementation
review remains pending; model FPS/source acceptance is separate.
