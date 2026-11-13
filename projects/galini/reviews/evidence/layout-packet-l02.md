# Developed layout L02

Inspect layout.svg / reviews/evidence/layout-l02.png and plan.json before design.md. These supersede S01. Original user brief in brief.md. No production AML yet.

Coordinates in meters, north +Y, common origin (0,0), z=0 lower town and z=4 upper town. Labelled dark masses are impassable; beige gaps outside floor footprints are inaccessible urban mass/scenery. Exterior black boundary lines are physical opaque walls: 5.8m above lower floor, 3.2m above upper floor. Blue seaward edges have physical 1.2m parapets. Every stair has 3.2m side walls following the treads. No windows or observation apertures through these boundaries; all movement openings are the shared floor interfaces. Plan edges between connected floor regions are not walls. No roofed walkable shortcuts. Exterior scenic ground is below play at -0.4m behind boundaries and never an alternate route.

Plan IDs, XY corners, base Z and top heights are in plan.json. Floors F-*, stairs S-*, blockers O-* correspond to the eventual AML. Relevant clear space: 6m stair flights (5.6m between .4m side walls); 8m bakery throat, narrowed to 4m beside O-BAKERY; 8m upper lane (3m north bypass around O-ROTATE); Taverna shares >=4m with Ferry; A-Short foot 8x6m, upper landing 10x6m; Market has 4m passage east of O-MARKET; B north landing now meets the complete 6m width of S-BOAT at y76. Final wall thickness .4m centered on boundaries, so open widths lose .4m total where two boundaries oppose.

Stairs S-CLIFF: x10..16/y44..54; S-SHORT x28..34/y44..54; S-GATE x44..50/y56..66; S-BOAT x78..84/y66..76. Each goes 0→4 northward, 10m horizontal run, 25 equal .16m risers; full lower and upper slabs share entire ends. Slab thickness .35m, filled stair soffits; foundations below upper floors. No drops or jumps required.

Body radius .3m, standing 1.8m, eye1.674m, crouch1.1m eye1.023m, step .3m slope42. Low planter/salt/fountain cover h1.1: hides crouched eye in level front view, standing eye sees over; body and side exposure require compiled checks. Cistern A base4/top6.5 blocks standing across same-level A court. Chapel base4/top11 blocks both A/CT views. Boathouse base0/top3.4 blocks level B approaches; O-BACK base0/top8 isolates the CT shelf from Market. No assumed ballistic protection ratings.

Predicted sectional views (all pending compile):
- Cliff climb, x13/y42→56: observer eyes1.674 (foot),3.674 (mid),5.674 (head); opponent A same upper eye5.674 at(13,59). Front-on climb is exposed; 3.2m sidewalls prevent lateral crossfire from Short. Same path down. Support follower at(13,43), attacker(13,49), defender(13,59). A site wall/cistern prevents simultaneous view of both stair feet.
- A Short, x31/y42→56: same rising eyes; defender(31,63,4), attacker(31,49,2), follower(31,43,0). Foot and landing have turning room. Cistern atx15..20 does not hide this exit from all A defenders.
- Gate x47/y54→68: same rising eyes. O-TOWN atx45..51/y70..73 interrupts through-view to CT spawn; upper landing permits both sides around it. Mid follower(47,53), climber(47,61,2), defender(53,69,4).
- Boat return x81/y64→78: same eyes. O-BACK atx70..78/y66..76 screens west. B defender(81,64,0), middle climber(81,71,2), CT follower(81,79,4). 6m full top landing; no chamfer remains.
- Harbor south to B: O-COAST atx83..89/y44..52 breaks coastal long view; west throat x76..83. O-BOAT atx84..90/y57..62 divides B into west plant court and eastern return pocket. Retake via stair cannot see the Harbor foot through O-BACK; opposing exposure at each landing remains open for capture.

Review sections: (1) both spawns/exits and offsets; (2) Seafront/Cliff; (3) Short/A court/CT vestry; (4) bakery/mid/fountain/Gate; (5) Taverna/Harbor/B approach; (6) Market/B site/return stair; (7) upper rotation lane. Check macro relations and each named section. Layout height claims remain predictions until compiled paired views and movement replay.

Required blockout checks: bidirectional collision-aware replay all spawn-to-site routes, all four stairs with tight local limits and lane connections; offset standing and crouched opposing views, mid-climb and follower positions; plan/mesh agreement, floors/soffits/sidewall ends; no scenery escapes. Harness cannot verify grenade/audio/bullet behavior, crowd blocking, clocks, trading or balance.
