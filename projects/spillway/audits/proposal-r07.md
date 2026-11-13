# R07 pre-3D proposal — shaped architecture, local heights and deliberate drop

Supersedes R05 straightgallery andaddedhighcratebaffles. R05groundLOSrepairs/lowcoverretained. Originalsourceunchangeduntilbothindependentlayoutgates.

## Gallery footprint

Union of XYrectangles:34..46,58..64;40..46,61..75;43..64,69..75;61..67,61..75;64..70,58..64. TopZ4,slab.30. Westlanding24..36,58..66 retained. Bends are structuralcirculation,not addedroomobstacles. U-B01/U-B02 retired; U-LB retained asattachedlandingservicewall. Alloldperimeterguardboxes replacedbyupper-guard edgewalls2.4mwithstair/rampinterfacesopen. D-01gap onSouthY69,X47..50; landing(48.5,67.5,0);4mfallisintentionalunsupported-enginehypothesis,notstandingwalkerroute.

## Tallmass/entry changes

BLD-2-1shrinks toX56..61,Y64.4..68;newBLD-2-2X67..70,Y64.4..68,top9, creating6mclear gallery slot. T-01X44..56,Y22..24,top7 becomesbuildingreturn;T-04X40..48,Y28..30,top7 isopposingvestibulereturn. BLD-T controlbuildingcoreX46..50,Y12..22,top7 attachesT-01 andsplitsTcourtyardinto6m-widewest/eastpaths; groundslabomitsitsfootprint. Thisblocksresidual76.9m transverseT-feeddiagonalverifiedinR05. Midapproachgoesaroundthewestside,ordinarybodyclearanceunchanged. Theseheight-awarefaçadesmustblockallspawnregionsfromdeckincludingdropgap.

## Local elevations

A:slabX18..24,Y70..77,top+.60 thickness.90. SouthstairsX18..24,Y68..70 ascend0→.60 in3risers; northstairsX18..24,Y77..79 descend.60→0 in3risers. RemoveburiedgroundfootprintthroughY68..79. Rehostplantpainttonewdais; site-a markerZ.60;elementdais. A-02 moves18..21,Y80..82;A-L01moves12..15,Y68..70; othercoverbase0retained. CheckA-01relativeheight2.6vsdaiseye2.2.


East:southrampaxis(86,40,0)→(86,44,1.2),width8;plateauX82..90,Y44..46 top1.2thickness1.5; northrampaxis(86,46,1.2)→(86,50,0),width8. Filledsupportsbelowramps,removeburiedgroundX82..90,Y40..50. E-L01movesY44..46/base1.2 (X82.2..84.6);east-longmarker(88,41,.30);E02becomesattachedbuildingwingbase0top8.

## Low cover and supports

U-C01X40.2..42,Y66..69;U-C02X53..56,Y73..74.8;U-C03X65..66.8,Y65..68. Base4,height1.25. C01westedgeflushguardinnerface40.2;C02northflush74.8;C03eastflush66.8. Theirmainbypasses3.8m,allgalleryclearwidth5.6m beforecover. P01retained;P02movesX62..64,Y64.5..66.5;newroundpierP03(43,72)radius.6 andP04(64,72)radius.6 from-.3to3.7 supportactualbends withoutcreatingoccupiedrooftops.

## Named-space graph and occupied area

Graph is authored first in node-graph.svg/node-graph.md. Existing W/E/CT/T baffle IDs become attached building wings with permanent floor removed underneath; they are not freestanding crate patches. A-West and B-NE housing shape site footprints. A03/A04 are absorbed/retired inside A-West service building. Lower splitter is narrowed by building wings rather than more cover props. Spawn anchors offset: T(55,8,0),CT(44,92,0); old protected spawn bounds remain audited. BLD5 southface trimmedto75.4 for gallery clearance.
## Verification contract

Samebody2m/.25radius/.25step. Same35mLOS/100°warningthresholds,spawnareasnotshrunk. ExpandA/EregionZboundsandAplantkeypointappropriately. Adddeck-to-T/CTprotectedareasanddrop-edgekeypoint,first-appearanceportalfrontiersatnewturns; explicitlyretainhiddenthreatuncertainty. Upper-circuitlocalmax80mreplaces45mbecausepathnowdoglegs; newlocalA-stair/E-rampassertionscheckeachtransition. Optionaldropnotpassedbywalkingorartificiallinks. Groundlongbafflesnowbuildingreturns/machinebays;lowcoverssite/approachfixtures,notgenericboxfill. Reviewallsectionsandpredicted3Dbothheightsbeforemodeling;repeatcompiledrays/pairedviews/routewalkafter.

## Exact architectural mass footprints

AllbasesZ=-.30;topvaluesbelow. Profilesarebuildingvolumes/negative-spaceboundaries,nottraversablefloors.

| Source ID | XY polygon vertices | TopZ |
|---|---|---|
| BLD-0-0 | [[44.0, 78.0], [44.0, 82.0], [36.0, 82.0], [36.0, 78.0]] | 8.0 |
| BLD-1-0 | [[40.0, 44.0], [36.0, 44.0], [36.0, 57.6], [40.0, 57.6]] | 9.0 |
| BLD-1-1 | [[36.0, 72.0], [40.0, 72.0], [40.0, 64.4], [36.0, 64.4]] | 9.0 |
| BLD-2-0 | [[82.0, 38.0], [60.0, 38.0], [60.0, 44.0], [56.0, 44.0], [56.0, 57.6], [82.0, 57.6]] | 9.0 |
| BLD-2-1 | [[61.0, 64.4], [61.0, 68.0], [56.0, 68.0], [56.0, 64.4]] | 9 |
| BLD-2-2 | [[70.0, 64.4], [70.0, 68.0], [67.0, 68.0], [67.0, 64.4]] | 9 |
| BLD-3-0 | [[56.0, 28.0], [56.0, 22.0], [82.0, 22.0], [82.0, 30.0], [60.0, 30.0], [60.0, 28.0]] | 8.0 |
| BLD-4-0 | [[40.0, 22.0], [40.0, 28.0], [36.0, 28.0], [36.0, 36.0], [30.0, 36.0], [30.0, 38.0], [24.0, 38.0], [24.0, 48.0], [14.0, 48.0], [14.0, 30.0], [28.0, 30.0], [28.0, 22.0]] | 9.0 |
| BLD-5-0 | [[70.0, 75.4], [56.0, 75.4], [56.0, 78.0], [52.0, 78.0], [52.0, 82.0], [70.0, 82.0], [70.0, 78.0]] | 8 |
| BLD-T | [[50.0, 12.0], [50.0, 22.0], [46.0, 22.0], [46.0, 12.0]] | 7 |
| W-03 | [[14.0, 34.0], [14.0, 37.0], [10.0, 37.0], [10.0, 34.0]] | 9 |
| W-01 | [[10.5, 40.0], [10.5, 46.0], [6.0, 46.0], [6.0, 40.0]] | 8 |
| W-02 | [[24.0, 48.0], [24.0, 56.0], [14.0, 56.0], [14.0, 48.0]] | 9 |
| E-01 | [[86.5, 34.0], [86.5, 39.0], [82.0, 39.0], [82.0, 34.0]] | 9 |
| E-02 | [[90.0, 48.0], [90.0, 53.0], [86.0, 53.0], [86.0, 48.0]] | 8 |
| B-02 | [[90.0, 68.0], [90.0, 73.0], [86.0, 73.0], [86.0, 68.0]] | 8 |
| B-04 | [[90.0, 78.0], [90.0, 84.0], [84.0, 84.0], [84.0, 78.0]] | 8 |
| CT-02 | [[40.0, 82.0], [40.0, 86.0], [34.0, 86.0], [34.0, 82.0]] | 8 |
| CT-03 | [[66.0, 85.0], [66.0, 90.0], [60.0, 90.0], [60.0, 85.0]] | 8 |
| T-02 | [[38.0, 12.0], [38.0, 18.0], [32.0, 18.0], [32.0, 12.0]] | 7 |
| T-03 | [[70.0, 17.0], [70.0, 22.0], [64.0, 22.0], [64.0, 17.0]] | 8 |
| BLD-LW | [[42.0, 28.0], [42.0, 34.0], [36.0, 34.0], [36.0, 28.0]] | 9 |
| BLD-LE | [[57.0, 28.0], [60.0, 28.0], [60.0, 34.0], [54.0, 34.0], [54.0, 31.0]] | 8 |
| BLD-AW | [[14.0, 70.0], [6.0, 70.0], [6.0, 86.0], [14.0, 86.0], [18.0, 86.0], [18.0, 80.0], [14.0, 80.0]] | 8 |

P02 relocatesX62..64,Y64.5..66.5 belowthenewgalleryleg (base-.30,top3.70). Its oldfloorlesspositionisnotretained. R07unassignedroofareaandactualfloorcoverageareverificationdiagnostics,notanareaquotapass.
