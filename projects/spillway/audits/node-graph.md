# Spillway R07 — named-space graph before physical revision

The connectivity model names tactical spaces and reasons for connections before defining room/corridor contours. Edge drawings are schematic: physical routes bend, change levels, require clearing, and do not imply a straight sightline. No adjacency is added solely to increase route count.

| Node | Space / anchorXYZ | Decision |
|---|---|---|
| T | Departure court / (55, 8, 0) | Protected branching; offset fromCT, controlcoreblocksaxialviews |
| CT | Muster court / (44, 92, 0) | Allocate defenders withoutspawnline |
| WY | Service yard / (16, 24, 0) | West preparation andreset |
| WP | Weir passage / (12, 39, 0) | Compact alternatingbuildingcorners |
| AF | Reservoir forecourt / (17, 61, 0) | Gate staging andutility |
| A | Reservoir plant / (21, 74, 0.6) | Raisedplantwithtwostairaccesses |
| AR | Reservoir rear / (25, 84, 0) | Flank/retakearrival,committedsiteapproach |
| LM | Splitter / (49, 35, 0) | Destinationchoiceandmidinformation |
| SH | Stair approach / (30, 40, 0) | Parallelascendingthirdedgecost |
| UL | West gallery vestibule / (30, 60, 4) | Prepareupperroutewithoutglobalview |
| UG | Bent maintenance gallery / (52, 71, 4) | Concealedcostliercrossing+optionalcommitment |
| UM | Underpass / (43, 65, 0) | Contestedgroundshortcut,verticalcounterviews |
| BS | Pump short / (66, 71, 0) | Groundsplitintosite |
| EE | Elbow / (80, 32, 0) | East-midconnection,anglechange |
| ES | East crest / (86, 45, 1.2) | Rampbody/eyeexposure,lowcover |
| BE | Pump entry / (88, 61, 0) | Ramp/eastarrivalsconverge |
| B | Pump yard plant / (78, 75, 0) | Shapedsitewithservicebay |
| BR | Pump rear / (77, 83, 0) | Rearretake/rotationarrival |
| RG | Rear gallery / (49, 86, 0) | Longerconstrainedreinforcementpath |

| Connection | Purpose / commitment |
|---|---|
| T → WY (ordinary route reversible) | West default |
| WY → WP (ordinary route reversible) | Building-shaped bend |
| WP → AF (ordinary route reversible) | Advance/reset |
| AF → A (ordinary route reversible) | Gate execute |
| T → LM (ordinary route reversible) | Offset vestibule |
| LM → SH (ordinary route reversible) | Parallel stair choice |
| SH → UL (ordinary route reversible) | Ascend0→4 |
| UL → UG (ordinary route reversible) | Bent elevated route |
| UG → BE (ordinary route reversible) | Gallery+R01 descend |
| UL → AR (ordinary route reversible) | S02 descend4→0 |
| AR → A (ordinary route reversible) | North stair retake |
| LM → UM (ordinary route reversible) | Mid contest |
| UM → AR (ordinary route reversible) | Rear flank |
| UM → BS (ordinary route reversible) | Ground split |
| BS → B (ordinary route reversible) | Short execute |
| LM → EE (ordinary route reversible) | Elbow connection |
| T → EE (ordinary route reversible) | East default viafeed |
| EE → ES (ordinary route reversible) | Climb crest |
| ES → BE (ordinary route reversible) | Descend +stage |
| BE → B (ordinary route reversible) | East execute |
| CT → RG (ordinary route reversible) | Defensive allocation |
| RG → AR (ordinary route reversible) | A reinforcement |
| RG → BR (ordinary route reversible) | B reinforcement |
| BR → B (ordinary route reversible) | Rear retake |
| UG → UM (directed) | D01 optional4m drop: directed,engine-unverified |

Movement and visibility edges are separate. Upper/lower crossing does not join exceptatordinaryaccessflights ortheplannedD01drop. Nearbyrooms neednotconnect; anyfutureviewwindowmustbeexplicitaperturewithheight/body/counterviewreview. S01runsparalleltoMidbeforereachingupperlanding,creatingdifferenttiming/exposurethanathirdflatdoor.

Physicalshape: connectedcourtsfeednarrowermachinerypassages;attachedbuildingwingsformopposingcorners;theSplitterhasa diagonalindustrialwingcorner;AandBhavecontouredservicebuildingboundaries;thegalleryitselfbendsratherthanbeingastraightdeckwithhighprops. Lowcoversremainintentionalpreparation/duck/repositionfixtures.

Occupied-area is diagnostic,notacceptancequota. ReportgroundslabXY,buildingfootprints,upperfootprintandundevelopedcontextseparately; donotcountoverlappingupper/groundasnewsiteenvelopeorassumeapossessionratioestablishesquality. Reviewnodefunction/routepurposeandactualviewsbeforechangingarea.
