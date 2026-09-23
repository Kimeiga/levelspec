# Website acceptance, September 21, 2026

Source base: `539abf51f4a56eef814399aa66129558dd7dca82`. These checks ran on the connected Mac with Node 24.15.0 and Chrome. Existing compiler code, original tests and the workbench are unchanged by the website feature.

| Check | Observed result |
| --- | --- |
| `npm run check` | Pass |
| `npm run test:site` | 4 tests pass, including compilation and runtime validation at all 25 slider positions |
| `npm run test:vector` | 124 pass, 0 fail, 1 existing optional native BSP2 test skipped |
| `npm run build:viewer` | Pass |
| `SITE_BASE=/levelspec/ npm run build:site` | Pass; bundle-size advisory remains |
| Browser regression scenarios | All 12 pass |
| Downloaded GLB and glTF | Khronos validator: zero errors and zero warnings |
| Axe checks on desktop, navigation, export and 390px mobile | Zero WCAG 2 A/AA and 2.1 AA violations reported |
| Layout | No horizontal overflow at 1440, 768, 390 and 375px |
| Cold browser load | No off-origin runtime requests |
| Offline | Reload, edit/recompile and GLB download succeed after precaching |
| Failure handling | Blocked worker disables export; Retry recovers. WebGL unavailable retains real 2D plan, compilation and export |
| Race handling | Rapid slider input cannot publish an older revision; exports stay disabled until the current source is valid |
| Presentation | Arrow navigation and Escape exit work |

## Full-repository test limitation

The first `npm test` run reported 260 passes, one failure at the `tests/concept.test.ts` file-process level, and one optional BSP skip. It did not provide an assertion diagnosis in that run. This is not a claim that the whole repository suite is green, nor that the failure has been established as an upstream defect. The website tests and the vector suite pass independently. The source PR retains a full-suite CI check; no original test is disabled or weakened.

The browser checks use Chromium, including mobile viewport/touch emulation, not physical-device iOS Safari certification. There is no claim of native FBX/BSP execution or destination-engine gameplay acceptance.
