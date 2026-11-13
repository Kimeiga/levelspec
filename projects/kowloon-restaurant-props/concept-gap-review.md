# Chicken shop: concept-to-model gap review

Compared the [latest aspirational concept](concepts/aspirational-store.png) and
[earlier matched-layout polish study](concepts/polish-study.png) with the actual
[wide model render](../../generated/restaurant-props/metal-physical-space/wide-store.png),
[elevated view](../../generated/restaurant-props/metal-physical-space/elevated.png),
and counter detail. All inputs recorded in that capture still match current files.
This is a visual review; no geometry, lighting or assets were changed for it.

The base prop vocabulary is present: chickens, trays, scale, sauce bottles,
chopping block and cleaver, cooking vessels, hood, fan, red shades, bowls, menu,
shelves, stool, cartons and bucket. The largest remaining gap is the way these
parts form a lived-in storefront, followed by lighting and localized material wear.

| Priority | Concept observation | Current model | Next useful change |
| --- | --- | --- | --- |
| 1 | Asymmetric partially glazed hanging-food display, with the chopping station beside it | Birds spread across nearly the entire rail; tray groups form a regular row on one long counter | Make a left or right display module with thin steel framing and selective glazing; cluster birds at two heights and keep a clear offset preparation area. Add genuinely different food silhouettes rather than stretching the same bird. |
| 2 | Strong warm food lights against a cooler alley and shadowed rear kitchen | Red shades exist, but the review is broadly and evenly illuminated; food lacks the concept's luminous glaze | Put actual localized warm light beneath the shades, reduce broad fill, retain readable cool surroundings and grounded AO. Judge reflections separately from base textures. |
| 3 | Towel over the counter, clipped order slips, hanging ladles and pans, clustered everyday tableware | Large equipment and stock are present; ladles already exist near the stove but are inconspicuous. Towel and clipped-order details are absent | Add a restrained reusable work-detail set: cloth, ticket clips, a more legible arrangement of existing utensils, chopstick holder and more varied bowl/plate stacks, leaving the cutting surface usable. |
| 4 | Crate-supported bench, stocked boxes beneath it, narrow eating ledge and stool beside the entrance | Stool, cartons and bucket occupy one narrow side strip; the front apron is mostly empty | Add supported frontage arrangements and a small eating ledge as optional layouts. Preserve the entry and staff circulation; do not merely scatter props. |
| 5 | Faded sign, shutter housing, striped awning, jambs, exposed services and an enclosing ceiling frame the shop | This review intentionally shows an open-top cutaway without the complete storefront surround | Review a second street-facing facade assembly using the existing building kits. Do not mistake an intentionally hidden ceiling or omitted alley for a defect in the prop set. |
| 6 | Local grease at the hood and backsplash, chipped/repaired tiles, worn seams, bright wiped metal | Shared wood and metal have improved; counter tile fronts remain unusually regular and clean, broad plaster damage dominates | Add receiver-aware chips, occasional replacement tiles, grout variation and cooking-zone deposits; keep food-contact working patches visibly wiped. |

The aspirational composition deliberately invents a deeper kitchen and more alley
context than the original cutaway. Its plant, wet pavement, drain, adjacent buildings
and steam are useful environmental direction, not all mandatory restaurant props.
Do not enlarge the shop or sacrifice clearances solely to copy the illustration.

Recommended next implementation is one compact **asymmetric display + work-detail
pilot**, rendered with localized warm task lighting from a matching street-level
camera. Then evaluate the facade and frontage arrangements. More unique textures
or higher polygon counts alone will not close these composition and lighting gaps.
Retain the shared material maps and physical texture density from the recent pass.
