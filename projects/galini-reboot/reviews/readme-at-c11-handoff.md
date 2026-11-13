# Galini reboot — native C11

An occupied Greek coastal town with two cliff shoulders, arched ravine crossings, a committed shore route, through-buildings and turning stairs. Native source is [level.aml](level.aml), produced from independently accepted [L03](planning/l03/README.md). Original Galini and all earlier planning revisions are preserved.

**Current stage: native prototype frozen for independent compiled strategy, local/visibility and architecture review.** Author inspection is complete; this page does not claim those final gates have passed. Ordinary CLI publication remains blocked by a work-budget failure. The retained native API result also has two microscopic navigation coverage findings; see the [exact limits and verification](production/README.md).

Start with raw source-matched [roof-on](reviews/evidence/c11/roof-on.png), [cutaway](reviews/evidence/c11/cutaway.png), [native map](reviews/evidence/c11/native-plan.png), and [actual view boards](reviews/evidence/c11/boards/index.json). The 123 named poses cover SEC01–10, six turn systems, all fourteen flight midpoints/reverse arrivals and independent opening/postplant witnesses, in standing and crouching stances. [Capture identity](reviews/evidence/c11/capture.json) retains actual camera and body states.

[Local production overlays](production/conformance-c11.png), [actual physical sections](production/native-sections-c11.png), [construction records](production/construction-c01.json) and [precise repairs](production/repairs-c01.json) distinguish native realization from frozen paper. The `c01` record filenames are the original production series names; their current contents belong to the C11 manifest.

Open the frozen native reviewer with `node projects/galini-reboot/preview.mjs`. It displays the retained artifact and its failed diagnostics; it does not publish a validated build.

Source SHA-256: `5ec0bdb6c187e15c2c38a1ce830cff74af514bca5201bdef39860818070f78a6`. [Evidence manifest](production/manifest-c11.json) locks the final packet. Reproduction scripts and retained engine identities are documented in [production/README.md](production/README.md).
