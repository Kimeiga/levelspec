# R08 affected-interface proposal: Splitter ↔ Elbow

Current source R07 is frozen while this local proposal is reviewed. Context: named graph LM (Splitter,49,35,0) links SH (stair approach30,40,0), UM (underpass43,65,0) and EE (Elbow80,32,0). EE leads to the East crest / Pump entry. These are actual movement connections, not straight sightline promises.

Actual R07 scan: [25,42,1.61]→[89,29,1.61] remains clear65.31m across the stair court, lower Splitter and East connector. The area is not a deliberately framed single-lane long fight: the ray spans multiple decisions/regions. Source-matched evidence: generated/spillway/visibility-r07/report.json and capture-r07/. Current spawn-area/upper-to-spawn tests are all blocked. Threshold35m is unchanged and only a review warning.

Propose an **attached architectural wing** `EL-return`, XY X60..68,Y30..35, baseZ=-.30,topZ8. It joins existing BLD-3-0's north face atY30 rather than appearing as a freestanding combat prop. Remove its footprint from the ground slab contract. Preserve supported pass atY35..38 (3m nominal; existing north boundary inner face37.8 gives roughly2.8m clear) and its two approaches. The western mouth has roughly4×4m useful staging atX56..60,Y34..38 (the existing diagonal BLD-LE occupies part ofY30..34); the eastern roomX68..82,Y30..38 remains open before the existing E-01 return forces the next turn south. No spawn/site/bridge/elevation/body/lowcover/threshold changes.

This is a local route-shape repair: a staged turn, not an automatic objection to all long views. Review 5v5 entry/follower support, clearing from both sides, teammate passing, retreat, nearby low cover and how default east attack can bypass this contested connection. Graph node EE anchor is(80,32,0); the existing authored `east-elbow` route marker remains(79,32,0). Local route endpoints do not change. Current-source PDF-like plan/captures identify all surrounding masses and routes. Do not count a hidden entry as proof of camp-free play.

Review separately for spatial/visibility and tactical behavior before applying. Then recompile, scan unchanged spawn bounds/heights and warning thresholds, replay affected routes and capture the interface from both sides.

## Neighbor-ray revision before production

Independent tactical review found adjacent64.6–64.8m rays still bypass the first return. Add opposing attached wing `EL-north-return`, X72..76,Y33..38,base-.30,top9,joinedtoexistingBLD-2-0southfaceatY38. Removeitsfootprintfromground. It leaves lowerpassY30..33 (~2.8mclear) after thefirstupperpassY35..38; the4×8m turning/stagingroomX68..72,Y30..38 remains between them. TheEEanchor80,32androuteendpoint79,32remainclear. ThiscreatesanarchitecturalSconnectionwithoutan18m-longnarrowhall. Firstreturnupperpassruns8m;secondlowerpassruns4m. Testbundles/nearbyraysandbothfirst-appearancecorners,notjustthemaximumray. AddrequiredfullLM49,35→east-elbow79,32localwalkbound44m so aremoteT-feedroutecannotmaskabrokenconnector.
