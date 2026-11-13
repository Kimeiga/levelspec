# Limited final review — r07 day/night shop presentation

**Verdict: accepted for the requested daytime-dark / nighttime-warm shop treatment.** The r04 foundational building-fidelity acceptance remains in force for its unchanged scope; this review does not reopen its accepted design categories or erase its documented residual differences.

## Evidence and scope

Inspected actual r07 `hero.png`, `shops.png`, `hero-night.png`, and `shops-night.png`, plus the gate-head infill lines in frozen `parts/shops.ts`. Build/capture manifests identify GLB `af2a42251054efcba2c0d39f975f871218ccc0563812e205814b3e24ed6df8fe`. All nine capture entries report that hash and the capture error list is empty. Scope is the visible day/night exposure change, obvious lighting regressions, and closure of architectural warning A1.

## Observed result

- **Day:** The main shop's back shelves, interior floor, and recess now sit noticeably below the exterior brightness. The shelving and goods remain readable; the shop has not collapsed into a featureless black opening. The threshold rack and street crates retain brighter foreground separation, helping the room depth read.
- **Night:** The main and return shops become warm illuminated focal points against the subdued building. Stock, shelving, interior floor, and the central entrance remain clearly visible. The main opening casts a readable pool onto the sidewalk, while the canopy top, closed gate, and upper apartments remain comparatively dark.
- **Regression/leak check:** No obvious broad illumination bleeding through the solid upper facade, roof, or closed gates is visible in these four views. Light visible through the open shop thresholds and onto adjacent paving is consistent with the requested effect. No conspicuous washed-out main-store merchandise or new geometry defect was found. This is an observed-view check, not a proof against leaks from every camera position.
- **Architecture A1:** Frozen `parts/shops.ts` now includes explicit neutral wall infill over the front gate at z = 2.58–2.70 m and the return gate at z = 2.58–2.65 m, matching the previously identified strips. The source-level uncertainty recorded in `architecture-r04.md` is closed for this revision. The inspected views show no associated visible regression.

The presentation is deliberately stylized runtime lighting. This visual acceptance does not assert photometric accuracy, prove the shading implementation, or certify collision/navigation. No further visual change is required within this limited review scope.
