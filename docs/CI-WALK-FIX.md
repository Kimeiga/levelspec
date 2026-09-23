# PR #7: slow-frame walkthrough failure

The failed Ubuntu job `106785222726` passed type checking, the original 369-test suite, all 19 website tests, both builds and the first 12 browser scenarios. It failed in `experience-browser.mjs` because a 600 ms W-key hold did not move more than 0.5 metres.

The failure was reproduced with the bundled Playwright headless browser and SwiftShader. Before the fix, the 600 ms hold moved about 0.40 m. The renderer clipped every movement interval to 50 ms, discarding elapsed input time whenever a frame took longer.

## Fix

Walking now consumes elapsed active input time independently of render frequency, including the time up to key or touch release and changes of direction. The existing navigation movement function continues subdividing distance and enforcing boundaries. Blur, rebuild, mode changes and hidden-state transitions clear input and reset the movement clock; long suspensions do not cause catch-up movement. Visible layout changes no longer erase held keys.

The browser harness waits for actual movement and completed frames instead of sleeping for an assumed number of milliseconds. Existing movement distances, image-difference limits, export checks and error checks are unchanged. Workflow and screenshot contexts start with reduced decorative motion; the graphics test still explicitly enables animation and verifies it renders.

Four new Node tests cover frame-rate independence from 1–144 Hz, between-frame input, suspension reset and navigation boundaries. A browser regression uses a controlled clock to assert that a single slow 600 ms interval moves 2.04 metres, then verifies key release and blur stop movement. It exercises the real scene, shaders and navigation rather than a mocked movement function.

Run the normal suite with `npm run test:site:browser`. Add `SOFTWARE_RENDERING=1` to use the bundled browser with SwiftShader for local CI reproduction. No validation gate, workflow timeout, graphics effect or existing assertion is disabled by this fix.

The Linux reproduction revealed multi-second software frames, not only sub-second stalls. Active intervals up to ten seconds are retained (still within the navigation subdivision budget); explicit blur/hidden resets and longer suspension gaps do not replay input. An additional unit test covers 1.2–8 second frames. Each chapter-entry browser case starts from a known unobstructed courtyard position rather than inheriting a previous test's endpoint.

The complete nine-scenario experience suite then passed in the two-CPU Linux container. CI now runs the existing core/unit/build commands concurrently with the complete browser suite. The original required `verify` name is preserved as an unconditional aggregate that succeeds only when both jobs succeed, including failure on skipped or cancelled dependencies. No test is removed, and each substantive job retains the existing 20-minute limit.
