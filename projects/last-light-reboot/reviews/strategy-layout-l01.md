# Last Light L01 — independent strategy / player-behavior review

## Initial artifact observations (before author rationale)

Inspected brief, actual ground/upper/roof plans, all four coordinate-section PNGs, variant board, developed-l01.json and layout-provenance-l01.json. No earlier reviews or authored layout/section/disposition prose read first. The raw variant board already states a selected option and named-ray predictions; those are treated as authored hypotheses.

- The upper-only objective makes climbing a real commitment. G1 crosses directly beneath the court but neither scores nor directly accesses the point; a lower switch must still recover an atrium and an ascent. The two atria have actual overhead occupied edges, not four disconnected stair rooms.
- Removal of N1/S1/E5 ground through-links leaves G1 as the only direct lower cross-map transfer. Each side still has public and service approaches, and its upper gallery allows a change of front without going back to ground. That removes redundant perimeter wandering without removing all recovery choices.
- The four objective mouths are unequal: west/east public entries are near scoring edges, north enters through the kitchen/service band beside the tall island, and south enters a broader re-entry zone. Counting four doors obscures their different approach, support and commitment costs.
- West's public-to-north change travels a long upper gallery. East's public-to-south change is much shorter and uses a nearby elbow. That is a consequential asymmetry to cost explicitly, not assume away because both sides have two stairs.
- The low counters may let a tank occupy a scoring edge while teammates support from staging, but the thick north stalls and tall island can also separate a service pair from its public trio. A 3+2 claim must identify which support goes with which group, and when the pair can actually influence the point.
- A lost public landing leaves service recovery available only if the retreating team retains the upper connecting route or can return to its own lower side. G1 on the enemy side is a costly infiltration/side change, not a guaranteed safe regroup route for two survivors.

These are paper hypotheses; no engine, ability, healing, scoring or physical reachability behavior has been observed.

## Verdict — accepted for the L01 paper strategy scope

The revised ground network preserves a substantial mall: public and service ascents reach different upper fronts, a real lower passage crosses beneath the occupied exchange, and upper galleries allow local recovery. Closing the outer ground belts is coherent and does not require replacing them. G1 control prevents a lower side change but does not by itself remove either team's own public/service access. No supported strategic geometry defect requires another connection before the separate spatial gate. Acceptance is for this revision's paper scope, not competitive balance or production readiness.

### Scenario findings

| State | Decision, manpower and opponent response |
|---|---|
| Opening 5v5 / full rush | Public paths reach the named scoring positions at **19.8 s west / 20.6 s east** at the hypothetical 5.5 m/s, versus **32.0 / 33.4 s** at the harness's 3.4 m/s. Their public landing waypoints arrive at **14.6 / 15.3 s** under the faster hypothesis. A nominal 20 s unlock therefore does not mean both five-player teams are set before scoring; it is a target-engine setting to test. A full rush retains concentrated tank/support presence, but gives an opposing service pair another final front. The opponent can push W-ENEMY/E-ENEMY to delay the pocket while sacrificing a scoring body; neither the pocket nor the spawn is a safe flag. |
| Opening 3+2 | A credible split is tank + damage + support public, damage + support service. The public trio must wait or take a deliberately short contest: service scoring positions are **25.5 s west / 23.6 s east**, respectively **5.7 / 2.9 s** behind their public paths before clearing. A tank with both supports on the public route leaves the service pair without its own support; a support in the service gallery cannot also heal the tank through the concession masses. The pair must first reach N-ENTRY/S-ENTRY and expose itself to contribute. A full-rush opponent may exploit the early 5v3; answer by staging in UG-W/UG-E rather than requiring the tank to survive unsupported on point. |
| Tank + two supports occupying | POINT-S with supports around POINT-W/E permits a plausible front-of-island relationship in the drawing; the DPS can watch the two likely pressure fronts rather than station one player at each of four mouths. C-IS prevents one universal supporting position: a tank advancing behind its north face needs a support to reposition into north prep. Keeping both supports far apart on the scoring edges is an aggressive occupation, not protected backline play. Opponents can pressure one public mouth and one service mouth to force a support move; the owner can concede part of the circle while retaining the south/front relationship. Healing range, barriers and burst survival are unresolved engine questions. |
| Contested 3v3 | Tank/support/damage remaining together can stage off point and re-enter through one front, or leave one short-lived scoring presence while two use a **nearby upper** switch if the opponent has not already occupied it. The packet's one-on-point/two-through-G1 option must be treated as a deliberate long reattack or concession, not a supported default rescue: lower-change alone is **73.1 m / 13.3 s** at 5.5; continuing from E-LOOK to X3 and POINT-E using the supplied public chain makes roughly **130.9 m / 23.8 s from W-LOOK**, before any initial descent, clearing or fighting. Two of three bodies are absent throughout. No ability or tank durability is available to validate that delay. |
| 2v5 withdrawal | Two survivors should withdraw together by their retained own-side ascent or upper connector, cover the pursuer's next corner, then join the next wave. If X1/X3 is lost, choosing the service gallery requires that gallery still be free; it is not an invulnerable escape. Crossing G1 into the enemy atrium trades direct pursuit for an exposed exit and another ascent. Concede the point rather than credit this as automatic continued contest. Enemy pursuit must spend bodies and leave scoring/front coverage to follow deeply. |
| Full-team regroup | RG-W/RG-E supply physical assembly room and a new public/service choice. They do not guarantee protection, and a nominal eight-second respawn wave plus a 20–26 s faster-speed journey is not an eight-second return to the fight. Regroup triggers should be “five available and chosen fronts synchronized,” not “wave spawned.” Test both a public restage and a service-led retake; the latter exchanges first arrival for a different contest angle. |
| After-contact upper switch | Supplied chains cost **63.0 m / 11.5 s west** versus **35.0 m / 6.4 s east** at 5.5, to different service-entry waypoints. They demonstrate a material asymmetry, but **are not shortest-path measurements**: west explicitly detours through N-STAGE (42,78). A candidate within the retained gallery, (37,58)→(43,73)→(63,73)→(67,62), is about **47.9 m / 8.7 s** by coordinate estimate and needs body/obstacle checking. Do not alter architecture solely to fix padding in one chosen journey. Even that candidate is longer than the east switch; north's narrower protected prep and island-separated contest are a plausible trade, not proven compensation. |

### Territory and information consequences

V2's retained diagonal across G1 makes a two-player clear more plausible than a lone invisible flank: one covers the far return while the other advances, but the pair loses immediate upper support. O-W/O-E create a useful reason to occupy an atrium edge when upper possession is uncertain. Those eyes see a selected receiving edge, not the whole point; a crouched or shifted upper opponent can deny information, so a clear aperture is not confirmation of an empty upper route. The point owner must leave its central hold to investigate lower pressure. That is a useful changing territory relationship and supports retaining V2 for compiled verification.

Four final thresholds do not require four permanent defenders. North and west are separated by the island/stall band, while south/east can pressure the front of the point more directly. A compact owner can retain the front scoring arc, then rotate to reported pressure. Whether that becomes too easy or overloaded depends on the actual opposing views and target-game engagement times; no such result is claimed here.

### Concrete opportunities — optional, not selected changes

- **LS-01 — First compare a direct west-gallery switch in unchanged geometry.** Validate the approximately 47.9 m candidate above against the 63 m staged chain, then compare both with east under actual movement. The direct route gives a withdrawing pair a faster choice; stopping in N-STAGE instead gives preparation and a place to meet service arrivals. Cost: cutting the corner forfeits that preparation and may expose the pair to north-entry pressure. **Selected as a later measurement question only; no geometry repair is currently established.** If the real west switch remains strategically dominated, compare a 4 m-deep occupied prep passage through the north edge of C-NW (approximately y68–72, x48–64) with retaining the closed cold store. It would make West public→North more direct but weaken North isolation and reduce the independent value of the long gallery/X2 route. This structural variant is **deferred** until a measured need exists.
- **LS-02 — Give the north pair a closer, bounded support pause.** Compare existing LC-N far back in U2 with an additional/repositioned 1.15 m prep bench near x64–66/y68–69.2, leaving about 4 m to its east. A support could advance into the prep passage while a damage teammate pressures N-ENTRY, rather than remain at N-SUPPORT where C-IS obstructs support to the scoring front. The point owner can contest that narrow longitudinal line or withdraw around the island. Cost: a stronger north foothold, reduced service-pair passing width and a new crouch/standing sight relationship. Check follower support, reverse retreat and the larger-tank stress case before selection. **Deferred optional local experiment; current north entry remains viable without it.**
- **LS-03 — Retain the closed perimeter.** Do not add a north/south ground loop merely to give G1 losers another exit. First test full regroup through the existing two home ascents and upper galleries. The retained cost makes lower commitment intelligible; reopening a belt would add enemy-reinforcement access and dilute that decision. **Retained design choice.**

### Remaining gates and evidence limits

The independent spatial scope must resolve whole-body/follower support at all stair crests, point/staging opposing views, aperture offsets and spawn departure exposure. Compiled review must walk the seven named routes plus both directions of the four ascents, then measure direct and staged switches with unchanged body settings. Target-engine play must compare full rush versus timed 3+2 on both sides, northern support repositioning, pursuit of two survivors, and five-player regroup. Unknown hero abilities, healing, tank size, objective logic, audio and barriers are not silently imported from another game.

## Frozen source identity

Every entry in layout-provenance-l01.json was checked against actual file bytes and matched. Key SHA-256 values:

- planning/developed-l01.json: `5677e1f36d8f30040ab8071b26b38364bb85f4ee3a7991679771a3392fcd6751`
- planning/layout-l01-ground.png: `846e12106a058a72652db2500a7268165ca9f6ad4d54bc9f76fd09b67967863e`
- planning/layout-l01-upper.png: `27a1e8cc7d165eee080dfa0e53722613bd02b319ac43c9e5a6ec52ea4ce5b247`
- planning/layout-l01-roof.png: `30f94d8b5d9b1deeb5456b8100951ec2a067d32cb56429714b332a72989b2c6a`
- planning/sections-l01-1.png: `1a6badcfb781be85999cd41966bd989c2746d7940b77f7edbc39041b0503cc17`
- planning/sections-l01-2.png: `715d1e5241dc3dfad752e7e34c4195b68b8e2611f671e67339804e593ddfe62c`
- planning/sections-l01-3.png: `f9d64780bfc1600c6bf373350df913a152b0b3b056a3699eed96cfcd1790d6c8`
- planning/sections-l01-4.png: `b614188bf3b744c3af38c47d75e739d9662b7c1a487d18e0e87ff32b92dceb43`
- planning/variants-l01.png: `20f8d2a1a6b2b5d8f2953201c6f174e455579bcdd96cdb283195dd37b9f26831`
- planning/layout-l01.md: `6f2f6e7e662fa37ddbd40de2727e6510c9ad7e06adbcd8c1784cea4adeb8af62`
- layout-provenance-l01.json: `cc35bb8a45b6e426fa0f71f3599661aad39d11536d2a58fe1f1de7f53ff0daee`

All times in this review are arithmetic drawing estimates. No geometry, production source or prior report was edited.
