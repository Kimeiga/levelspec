# Kiln Yard L04 — independent tactical layout review

**Verdict: L04 accepted for native blockout.** Competitive balance and the listed physical/visibility checks remain open. This review began independently on L02 from `brief.md`, `layout-data.json`, and a visual inspection of `generated/kiln-yard/layout-L02.png`, before author rationale or other reviewers' verdicts. It then inspected the revised data and `generated/kiln-yard/layout-L03.png`. Applied the updated fps-map-review and fps-strategy-design skills. No model or layout was edited by this reviewer.

## Spatial quality and meaningful territory

The proposal goes beyond changing a node graph's room outlines. Arcade W1 turns around K0, then widens into W2 with an adjacent Saddle transfer P14. Wash E1 wraps K1 and approaches B from a distinct southeast direction; it cannot cheaply transfer to Mid halfway through. Forecourt M1 now wraps the K3 office before returning toward P06. Inspection R4 is a compact three-way meeting of Mid, B and the service yard, with the return changing the reveal order. These journeys have different commitment and response possibilities.

W2–M2–A forms a useful local loop. An Arcade pair stopped at A-main can pressure P14; a player holding A-short must then consider pressure from the adjacent court. R4–B–D provides a different loop: the defender can reinforce B directly or hold Inspection, while an attacker who wins R4 can threaten both B-short and the service crossing. Neither loop is an unexplained extra branch, and neither grants safe traversal merely because it is connected.

The broad service yard is a reasonable quiet reinforcement/reset space. Do not claim that D-store necessarily forces ordinary A–B rotation around itself: D-store is at Y80..83, north of the shortest plausible route between P12 and P11. Its direct role is spawn concealment and northern reset/repositioning. R4/P13 control, the bent service boundary and the site doorways are more consequential to ordinary rotations. The drawing does not need more clutter solely to make that back area busy.

## Finding adjudication

**KT-01 / T–M1–M2 direct line: closed at layout stage by L03.** In L02 a line from the T anchor (41,11) to M2 (44,49) passed through both P02 and P06 and stayed west of L4. This was not spawn-to-spawn, but losing Saddle could expose the lower spawn/rotation area through an unintended straight channel. L03 shifts P02 to X45..51, P06 to X39..43 and introduces the six-metre K3 office wing. That produces an actual eastward wrap and northward return, not another isolated crate. The prior line is blocked and Forecourt retains a preparation area before P06. Verify portal-edge and offset-spawn rays in compiled geometry; this is not a continuous-visibility certificate.

**KT-02 / objective footprint precision: authoring follow-up.** The A circle centered (27,73), radius 2.5, overlaps A-press's X28..33/Y69..73 footprint. B's circle centered (79,58), radius 2.5, also slightly overlaps B-filter. Keep the intended plant positions but author a shaped footprint excluding machinery, or explicitly define that only unobstructed portions are plantable. A drawing circle extending through a box must not become a claim that the entire volume is usable. This does not require a new route or hold up structural blockout, but must be resolved before objective-clearance acceptance.

## 5v5 behavior hypotheses

### Default and defender access

A 2 Arcade / 1 Forecourt / 2 Wash attack obtains distinct information and retains two pairs capable of trading. Its lone Mid player should initially gather information and preserve retreat, not be assumed to clear Saddle alone. P06 faces P14/P07/P08 territory; a defense with A-short and Inspection occupied can expose more than one threat as that player advances. Arcade's P14 is a feasible supporting response, so the correct remedy need not be another doorway or a centrally placed crate.

A provisional 2 A / 1 Inspection / 2 B defense has short site access from D, but the Inspection player cannot simultaneously watch P08, P09 and P13 without exposing a flank or moving. A forward Arcade defender gains early information while making P14 and A-short more relevant. A forward Wash defender commits away from the direct service fallback; their ability to retreat before an attacking pair trades must be checked in the blockout.

The graph does not give CT a direct protected D→Saddle shortcut. Reaching Mid through R4 or A costs exposure and reveals a site-side choice. Actual spawn positions and route lengths must establish opening timing; no timing symmetry is assumed from the drawing.

### Rushes and 4+1

A five-player A rush encounters the shaped W1 approach, P04, then the W2 decision. P04's nominal 4.27m width can support more than a single-file line geometrically, but body blocking, flashes and trading are untested. The team can commit P05 or peel a player through P14 before the site; that is a genuine local decision rather than a spawn-only lane choice.

A five-player B rush wraps Wash and commits P10. This is a clearer, more committed main route than Arcade; P09 pressure requires a different group to have won Mid/Inspection. Retaining this asymmetry is reasonable. Test whether one defender can repeatedly delay P10 without being traded, rather than automatically adding another Wash exit.

For a 4+1 A split, four Arcade players and one Mid player can threaten both A entries only after Mid is actually cleared. A solo Mid player cannot be counted as a free second front against a two-position crossfire. A 4+1 B split has a similar condition but a longer solo task through M2 and R4. A more robust 3+2 allocation is a useful comparison. A 4+1 fake with the lone player in Wash can gather information, but the lone player should not be promised a safe late transfer through the kiln mass; they must return through T or win B.

### Reset and rotations

Arcade→P14→Saddle lets an attacking pair adapt before entering A. That transfer is locally short and can help another group contest Mid. After taking Saddle, attackers can choose A-short or contest R4 for B; a held P08 makes the latter a real additional problem. The two sites are connected through both contested interior territory and the defender yard, so ownership changes the practical rotation rather than merely its length.

CT can rotate A→D→B without retaking Saddle, but an attacker controlling R4 can threaten the P13 crossing. D is not universally safe simply because it contains the defender spawn. Compare a fast southern crossing with a northern detour around D-store and record the added travel/exposure; the latter may be useful once the crossing is watched. Whether either rotation fits a particular bomb timer is a target-engine question.

## Casualty and objective-phase cases

- **3v5 retake:** three surviving defenders cannot cover both site doors, R4 and every flank at once. An A retake can combine P12 and a reclaimed M2/P07; a B retake can combine P11 and R4/P09. Obtaining the second front costs territory, time and often a player. Do not describe a paper route as an already coordinated split.
- **2v2 post-plant:** the press/filter gives a holder different protection faces, while a partner can watch one connector or stay close enough to trade. At A, P05/P07 lie generally south and P12 northeast; at B, P10 is south, P09 west and P11 north. That is promising threat separation, but actual occlusion could still let a corner watch plant and all relevant retake entries. Inspect those holds from both sides.
- **1v2:** a survivor can attempt a cover-side change or use the nearby room loop after gaining information; neither guarantees a clutch. A large plant footprint or an unintentional slit could defeat that intended behavior, which is why exact plant and body exposure matter. No jump, boost or crouch-only escape is counted as a response.

## Required blockout evidence

1. Physical portal widths and transitions; especially P04, P06, P14, and the usable wrap between K3-office, L4 and K1. A reported nominal width is not proof of the final capsule path.
2. Actual local and full-route distances from individual spawn positions. Then compare default, rush, 4+1/3+2, defender push and site rotation timing under stated speed assumptions.
3. Opposing leader/follower views at P05, P07, P09, P10 and P13, including intermediate approaches and reverse site ownership. Static connectivity does not establish a trade.
4. Whole spawn-area and offset visibility; the repaired Forecourt channel; CT crossing versus R4; A/B stationary plant holds. Use actual eye/body heights and inspect low-cover side exposure.
5. Objective footprints free of machinery, supported floor and adequate standing clearance.
6. Actual ten-player sessions, then 3v5/2v2/1v2 scenarios with target-engine weapons, utility, audio and clocks. The layout has testable strategic alternatives; it has no observed-play balance result.

## L04 objective repair adjudication

Inspected updated `layout-data.json` and the actual `generated/kiln-yard/layout-L04.png`. **KT-02 closed at layout stage.** A now uses X24.8..27.5/Y70..76, outside A-press and L3, with at least 0.5m separation from the press. B uses X78..83/Y56.5..62, outside B-filter and L8, with at least 1m separation from those footprints. Both retain usable site-side planting choices and the previous macro relationships. Actual support/clearance remains a compiled check. No tactical layout blockers remain; retain all blockout and playtest gates above.
