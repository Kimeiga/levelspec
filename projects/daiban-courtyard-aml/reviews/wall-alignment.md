# Cohesive wall alignment

User-authorized design adjustment of the native courtyard. Floors, existing stairs,
player dimensions, route assertions, materials and cameras are unchanged.

- Put the upper north screen on the lower north screen's Y=5.288 plane.
- Align north wall starts at X=1.391; compensate the upper notch placement so its
  world-space opening remains unchanged.
- Extend north wall ends to X=5.520 and the east return ends to Y=5.288. Their
  centerlines now meet, closing the previous 278 mm exposed corner gap.
- Move the upper northwest rear wall to Y=6.908: its inner face is the repaired
  landing's north edge Y=6.798 and it joins the existing rear frontage.
- Extend the three south return starts to their adjoining horizontal centerlines,
  replacing partial face-only corner contacts with positive physical joins.

Independent geometry/source review passes. Collision probes confirm the closed N/E
junction and unchanged top-notch world position. Eight captures match the final
source with no browser errors. Current constrained walking replay completes nine
paths including both corner turns; existing isolated rear-fan/rear-HOME start
sampling limitations remain documented. Old frozen path start points may no longer
lie on the rebuilt eroded navigation mesh; no player tolerance or support was changed.

Strict validation/export pass with zero errors. Two retained floor-gap warnings
refer to separate storeys, not broken corner support. 49 focused tests and type
checking pass. Model: 10,645 triangles and 178 architectural objects.

The upper stair side retains its existing setback from the newly aligned facade;
this is not a claim of universal wall/stair flushness or new photographic acceptance.
Evidence: `generated/daiban-alignments/`, including changes.json, independent-check,
current-walk.log/current-walks, validation, captures and export.

Source SHA-256: `4499da7ed24594d5c3e7c4ebf6233a4ca950b759fd38ee7a48b95aeed73c9c24`.
