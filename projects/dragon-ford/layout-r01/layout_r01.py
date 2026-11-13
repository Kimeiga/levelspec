"""Dragon Ford layout source. Four district grids at different angles interweave:
Yamen +5°, West / Lung Chun Road -9° (its street cuts through the Yamen forecourt to the east district),
East / Kwong Ming -12°, North frontage -3°. Wedge yards and rooms occupy the seams.
Run: uv run --with shapely python projects/dragon-ford/layout.py [outdir]"""
from pathlib import Path
from pipeline import Layout, Frame, rect, link, H
import json, sys
Z0, ZM, Z1 = 0.0, 1.7, 3.4
REV = 'R01'
ENVELOPE = [(0, 10), (108, 10), (108, 81.6), (0, 87.26)]  # south face on the apron, north face along the frontage street (grid -3°)
L = Layout('dragon-ford', 'Dragon Ford', REV, ENVELOPE)
Y = Frame(38, 30, 5)      # Yamen void, forecourt and Free School
W = Frame(12, 26, -9)     # west district and Lung Chun Road (runs on to the east district)
E = Frame(76, 14, -12)    # east district: Kwong Ming Street, workshop, foundry
N = Frame(24, 86, -3)     # north frontage: shop street, youth hall, dentist shop

# --- south apron (world grid) and its two entries --------------------------------
L.space('T_APRON', rect(28, 1, 82, 10), Z0, 'spawn', 'Sai Tau apron (T spawn; squatter sheds, ball court)', sky=True)
L.space('GATE', rect(46, 8, 50, 18), Z0, 'alley', 'South Gate|tunnel')
# --- Lung Chun Road on the west grid, cutting the Yamen forecourt ------------------
L.space('LUNG_W', W.poly([(33, -1.5), (33, 1.5), (16.5, 1.5), (16.5, 6), (12.8, 6), (12.8, -1.5)]), Z0, 'alley', 'Lung Chun Road W (tunnel; turns north into Well Court)', label_at=W.p(25, 0))
L.space('WELL', W.poly([(2, 3), (13.5, 3), (12.5, 8), (5, 8)]), Z0, 'court', 'Well Court|(lit junction)', sky=True)
L.space('CANNON', Y.r(4, -15.5, 28, -1.2), Z0, 'court', 'Cannon Court', sky=True, label_at=Y.p(9, -4))
L.space('LUNG_E', W.r(52, -1.5, 66, 1.5), Z0, 'alley', 'Lung Chun|Road E')
L.cover('RUIN', Y.r(13.6, -13.4, 18, -8.5), Z0, 3.4, 'South Gate footing: solid ruin standing on the Lung Chun line')
L.cover('RUIN_WALL', Y.r(10.5, -5.2, 21.5, -4.6), Z0, 3.4, 'Ruin wall screening the Yamen gate from the tunnel mouth')
# --- Yamen grid: compound stepping up inside the sky void ---------------------------
L.door('YGATE', Y.r(13.5, -1.2, 18.5, 0), Z0, sky=True)
L.space('Y_FRONT', Y.r(0, 0, 32, 9), Z0, 'court', 'Yamen front court', sky=True)
L.stair('SY1', Y.p(16, 9), Y.p(16, 12.4), Z0, ZM, 6, 'Hall steps', sky=True)
L.space('Y_HALL', Y.r(6, 12.4, 26, 17.4), ZM, 'hall', 'Middle hall (roofed, open front)', ceil=4.8, roof=True)
L.space('PODIUM_W', Y.r(6, 9, 13, 12.4), ZM, 'hall', 'Porch W', ceil=4.8, roof=True)
L.space('PODIUM_E', Y.r(19, 9, 26, 12.4), ZM, 'hall', 'Porch E', ceil=4.8, roof=True)
L.air('PORCH_W_SKY', Y.r(6, 9, 13, 12.4), 5.1); L.air('PORCH_E_SKY', Y.r(19, 9, 26, 12.4), 5.1)
for i, u in enumerate([5.9, 25.5]):
    L.cover(f'PORCH_COL{i}', Y.r(u, 9.05, u + .6, 9.76), ZM, 3.1, 'Porch column')
L.parapet('G_POD_W', Y.r(6, 9, 13, 9.16), ZM)
L.parapet('G_POD_E', Y.r(19, 9, 26, 9.16), ZM)
L.air('Y_HALL_SKY', Y.r(6, 12.4, 26, 17.4), 5.1)
L.space('Y_COURT', Y.poly([(0, 12.4), (6, 12.4), (6, 17.4), (26, 17.4), (26, 22), (0, 22)]), ZM, 'court', 'West wing + inner court', sky=True, label_at=Y.p(13, 19.7))
L.cover('SCREEN', Y.r(8.4, 16.5, 23.4, 17.1), ZM, 3.1, 'Hall rear wall / spirit screen: the hall is a room with two rear end doors (2.1 m W, 2.6 m E)')
L.stair('SLW2', Y.p(2.5, 22), Y.p(2.5, 25.4), ZM, Z1, 5, 'West wing steps', sky=True)
L.stair('SY2b', Y.p(24.5, 22), Y.p(24.5, 25.4), ZM, Z1, 3, 'Inner steps E', sky=True)
L.space('Y_STRIP', Y.poly([(0, 25.4), (5, 25.4), (5, 22), (23, 22), (23, 25.4), (32, 25.4), (32, 29), (0, 29)]), Z1, 'court', 'Rear terrace (closed rear hall behind)', sky=True, label_at=Y.p(14, 25.5))
L.parapet('G_STRIP', Y.r(5, 22, 23, 22.16), Z1)
L.parapet('G_STRIP_W', Y.r(5, 22.16, 5.16, 25.4), Z1)
L.parapet('G_STRIP_E', Y.r(22.84, 22.16, 23, 25.4), Z1)
L.space('WL_TOP', Y.r(0, 29, 5, 36), Z1, 'alley', 'West|lane top', sky=True)
L.space('EL_LOW', Y.r(27, 9, 32, 14), Z0, 'alley', 'East lane', sky=True)
L.stair('SLE1', Y.p(28.2, 14), Y.p(28.2, 17.4), Z0, ZM, 2.4, 'East lane steps 1', sky=True)
L.space('EL_MID', Y.r(27, 17.4, 32, 21), ZM, 'alley', 'E landing', sky=True)
L.stair('SLE2', Y.p(30.8, 21), Y.p(30.8, 24.4), ZM, Z1, 2.4, 'East lane steps 2', sky=True)
L.space('EL_TOP', Y.r(27, 24.4, 32, 36), Z1, 'alley', 'East|lane top', sky=True)
L.door('MID_E', Y.r(26, 18.3, 27, 20.7), ZM, sky=True)
# Free School on the void's west face
L.space('COLONNADE', Y.r(-7, 0, -1, 9), Z0, 'hall', 'Free School|arcade')
L.portal('COL_E1', Y.r(-1, 1.5, 0, 4), Z0); L.portal('COL_E2', Y.r(-1, 5.5, 0, 8), Z0)
L.space('SCHOOL_LANE', Y.r(-5.8, -7, -2.2, 0), Z0, 'alley', 'School|lane')
L.stair('SW1', Y.p(-5.3, 9), Y.p(-5.3, 12.4), Z0, ZM, 2.6, 'School stair 1')
L.space('S_LAND', Y.r(-7, 12.4, -1, 15), ZM, 'landing', 'School landing')
L.door('LAND_E', Y.r(-1, 12.8, 0, 14.8), ZM)
L.stair('SW2', Y.p(-2.3, 15), Y.p(-2.3, 18.4), ZM, Z1, 2.6, 'School stair 2')
L.space('GALLERY', Y.r(-7, 18.4, -1, 30.5), Z1, 'gallery', 'Free School|gallery')
L.window('GW1', Y.r(-1, 20.8, 0, 22.4), Z1); L.window('GW2', Y.r(-1, 23.4, 0, 24.8), Z1)
L.door('BACKDOOR', Y.r(-1, 28.2, 0, 30.4), Z1)
# --- west grid: Sai Shing climb, Tooth shop, temple lot -------------------------------
L.stair('SS1', W.p(8.5, 8), W.p(8.5, 11.4), Z0, ZM, 3.5, 'Sai Shing steps 1')
L.space('SS_LAND', W.r(2.75, 11.4, 10.75, 15), ZM, 'landing', 'Sai Shing landing')
L.space('TOOTH', [W.p(10.5, 11.6), (28.5, 36.6), Y.p(-6.8, 12.6), Y.p(-6.8, 14.8), W.p(10.5, 14.8)], ZM, 'room', 'Tooth|shop')
L.stair('SS2', W.p(4.5, 15), W.p(4.5, 18.4), ZM, Z1, 3, 'Sai Shing steps 2')
L.space('SS_UP', W.poly([(3, 18.4), (6, 18.4), (6, 21.5), (-5.5, 25), (-5.5, 26.2), (-9, 26.2), (-9, 22.6), (3, 19.4)]), Z1, 'alley', 'Sai Shing upper', label_at=W.p(-1, 22.3))
A_LOT = W.poly([(-9, 26), (6.5, 26), (6.5, 44), (-9, 44)])
HALL_A = W.r(-5.5, 34.5, 2.5, 41)
L.space('A_COURT', A_LOT, Z1, 'site', 'A — Tin Hau lot', sky=True, label_at=W.p(-1, 29))
L.cover('TINHAU', HALL_A, Z1, 4.2, 'Tin Hau hall: free-standing closed cella (gaps W 3.5, N 3, E 4 m)')
L.cover('A_SCREEN', W.r(2.5, 31, 3.0, 36.5), Z1, 2.6, 'Screen wall facing the slot-yard door')
L.space('SLOT_YARD', [W.p(7.1, 27.5), Y.p(-7.6, 24.8), Y.p(-7.6, 30.6), W.p(7.1, 36.5)], Z1, 'court', 'Slot|yard', sky=True)
L.door('A_EAST', W.r(6.5, 32.3, 7.1, 35), Z1, sky=True)
L.door('GAL_W', Y.r(-7.6, 25.2, -7, 27.4), Z1)
# --- east grid ------------------------------------------------------------------------
L.space('KWONG', E.poly([(-1.5, -5.2), (1.5, -5.2), (1.5, 6), (1.75, 6), (1.75, 26), (-1.75, 26), (-1.75, 8), (-1.5, 8)]), Z0, 'alley', 'Kwong Ming|Street', label_at=E.p(0, 18))
L.space('PLASTICS', E.r(1.75, 6, 7.5, 14), Z0, 'court', 'Plastics|yard (lit)', sky=True)
L.space('KW_JOG', E.r(-1.75, 22.5, 9, 26), Z0, 'alley', 'Kwong jog')
L.space('KW_N', E.r(5.5, 26, 9, 34.2), Z0, 'alley', 'Foundry|mouth')
L.space('FISHBALL', E.r(-8.5, 18, -2.5, 31), Z0, 'room', 'Fishball|workshop')
L.door('FB_ST', E.r(-2.5, 19, -1.75, 21.5), Z0)
L.space('RUBBISH', link(Y.p(32.6, 9.5), Y.p(32.6, 14), E.p(-9.1, 22), E.p(-9.1, 30.5)), Z0, 'court', 'Rubbish|yard', sky=True)
L.door('EL_YARD', Y.r(32, 10, 32.6, 12.6), Z0, sky=True)
L.door('FB_YARD', E.r(-9.1, 22.5, -8.5, 25), Z0)
L.door('FB_B', E.r(-7, 31, -4.5, 34), Z0)
L.space('B_FLOOR', E.r(-8, 34, 13, 54), Z0, 'site', 'B — Kwong Ming Foundry floor|(double height)', ceil=6.8, label_at=E.p(3, 39.5))
L.space('B_MEZZ_N', E.r(-8, 49, 13, 54), Z1, 'gallery', 'Foundry mezzanine')
L.space('B_MEZZ_W', E.r(-8, 41, -3.5, 49), Z1, 'gallery', 'mezz W')
L.space('B_TONGUE', E.r(4.5, 45.6, 7.2, 49), Z1, 'gallery', '')
L.stair('SB1', E.p(-2.3, 42.2), E.p(-2.3, 49), Z0, Z1, 2.4, 'Foundry stair W')
L.stair('SB2a', E.p(11.8, 42.2), E.p(11.8, 45.6), Z0, ZM, 2.4, 'Foundry stair E lower')
L.space('B_LAND', E.r(10.6, 45.6, 13, 48.8), ZM, 'landing', '')
L.stair('SB2b', E.p(10.6, 46.8), E.p(7.2, 46.8), ZM, Z1, 2.4, 'Foundry stair E upper')
L.guard('G_MW', E.p(-3.5, 41), E.p(-3.5, 49), Z1); L.guard('G_MS', E.p(-8, 41), E.p(-3.5, 41), Z1)
L.guard('G_MN1', E.p(-1.1, 49), E.p(4.5, 49), Z1); L.guard('G_MN2', E.p(7.2, 49), E.p(13, 49), Z1)
L.guard('G_T1', E.p(4.5, 45.6), E.p(4.5, 49), Z1); L.guard('G_T2', E.p(4.5, 45.6), E.p(7.2, 45.6), Z1); L.guard('G_T3', E.p(7.2, 48), E.p(7.2, 49), Z1)
L.cover('BOILER', E.r(5.0, 36.5, 9.8, 38.5), Z0, 4.2, 'Boiler inside the foundry mouth')
L.space('COFFIN', link(Y.p(32, 32.5), Y.p(32, 35.5), E.p(-8, 50), E.p(-8, 53)), Z1, 'alley', 'Coffin lane')
L.space('NE_LANE', E.r(0, 54, 3.5, 73), Z1, 'alley', 'NE lane')
# --- north grid -----------------------------------------------------------------------
L.space('CT_STREET', N.r(0, 0, 76, 8), Z1, 'spawn', 'Tung Tau frontage (CT spawn; dentist arcade)', sky=True)
L.space('YOUTH', N.r(14, -15, 36, -2.5), Z1, 'hall', 'Youth Centre hall')
L.door('YOUTH_N', N.r(24, -2.5, 27, 0), Z1)
L.space('BACK_STEPS', link(Y.p(0.5, 36), Y.p(4.5, 36), N.p(14.3, -15.6), N.p(19.5, -15.6)), Z1, 'court', 'Back|yard', sky=True)
L.door('YOUTH_SW', N.r(14.6, -15.6, 17, -15), Z1)
L.space('CLINIC', N.r(5.5, -12.6, 14, -10), Z1, 'alley', 'Clinic corridor')
L.space('EAST_YARD', link(N.p(36.6, -14.8), N.p(36.6, -11.6), Y.p(27, 36), Y.p(32, 36)) , Z1, 'court', 'East|yard', sky=True)
L.door('YOUTH_E', N.r(36, -14.3, 36.6, -12.1), Z1)
L.space('NW_LANE', N.r(2, -9, 5.5, 0), Z1, 'alley', 'NW lane')
L.space('DENTIST', N.r(-7, -14.5, 5.5, -9), Z1, 'room', 'Dentist shop')
L.door('A_NORTH', link(N.p(-6.5, -14.5), N.p(-3.2, -14.5), W.p(-3.2, 44), W.p(0.2, 44)), Z1, sky=True)
L.anchor('T', (52, 6, Z0), 'attacker_spawn'); L.anchor('CT', (*N.p(22, 4), Z1), 'defender_spawn')
for i, (x, y) in enumerate([(47, 4), (57, 4), (49.5, 7.5), (54.5, 7.5)]):
    L.anchor(f'T{i+2}', (x, y, Z0), 'attacker_spawn')
for i, (u, v) in enumerate([(17, 2.5), (27, 2.5), (19.5, 6), (24.5, 6)]):
    L.anchor(f'CT{i+2}', (*N.p(u, v), Z1), 'defender_spawn')
L.anchor('A', (*W.p(-1.5, 32.5), Z1), 'objective'); L.anchor('B', (*E.p(3, 45), Z0), 'objective')
# --- gameplay masses: tall >= 2.2 m screens, low ~1.0-1.2 m cover ----------------------
L.cover('HALL_LINTEL_W', Y.r(6.3, 16.5, 8.4, 17.1), ZM + 2.1, 1.0, 'Lintel over the hall rear door W (door 2.1 m clear)')
L.cover('HALL_LINTEL_E', Y.r(23.4, 16.5, 26, 17.1), ZM + 2.1, 1.0, 'Lintel over the hall rear door E')
L.cover('HALL_W', Y.r(5.7, 12.4, 6.3, 17.4), ZM, 3.1, 'Middle hall west wall: west wing is entered from the rear court or the School landing only')
for i, u in enumerate([8.5, 12.4, 19.6, 23.5]):
    L.cover(f'HALL_COL{i}', Y.r(u - .3, 12.4, u + .3, 13.0), ZM, 3.1, 'Hall front column')

L.cover('LION_W', Y.r(11.4, 1, 12.6, 2.2), Z0, 2.1, 'Stone lion plinth flanking the gate (tall for crouch, head-high standing)')
L.cover('LION_E', Y.r(19.4, 1, 20.6, 2.2), Z0, 2.1, 'Stone lion plinth')
L.cover('STELE', Y.r(5, 4, 6.6, 5.6), Z0, 2.3, 'Stele: tall cover in the front court west half')
L.cover('CANNON_GUN', Y.r(21.5, 4.5, 24.5, 5.5), Z0, 1.25, 'Cannon on its carriage: low cover in the front court')
L.cover('STUMP_W', Y.r(7, -8.3, 8.1, -7.2), Z0, 1.25, 'Column stump: low cover west of the ruin')
L.cover('STUMP_E', Y.r(23, -8, 24.1, -6.9), Z0, 1.25, 'Column stump: low cover east of the ruin')
L.cover('PLANTER_W', Y.r(13.8, 23, 14.6, 26), Z1, 1.25, 'Transverse planter: crouch cover against fire along the terrace')
L.cover('PLANTER_E', Y.r(19.8, 25, 20.6, 28), Z1, 1.25, 'Transverse planter')
L.cover('TERRACE_STELE', Y.r(7.6, 24.3, 8.8, 25.7), Z1, 2.3, 'Tall stele at the terrace west end')
L.cover('A_SW_BLOCK', W.r(1.2, 27, 2.8, 28.2), Z1, 2.3, 'Tall offering table block: a covered position watching the SW arrival')
L.cover('INCENSE', W.r(-2.2, 28.6, -0.8, 29.8), Z1, 1.25, 'Incense burner: low cover south of the plant porch')
L.cover('A_CRATES', W.r(-9.5, 30.5, -7.6, 32.5), Z1, 2.3, 'Offering crates: tall cover inside the SW arrival')
L.cover('MOULDS', E.r(-0.8, 37.6, 1.6, 39), Z0, 2.3, 'Mould racks: tall stop on the west floor between the two ground entries')
L.cover('CRUCIBLE', E.r(3.6, 40.2, 5.6, 41.4), Z0, 1.25, 'Crucible stand: low cover on the plant zone edge')
L.cover('FURNACE_S', E.r(7.2, 48, 10.6, 48.9), Z0, 3.25, 'Furnace flue base: fills the pit beside the east stair')
L.cover('FURNACE', E.r(7.2, 48.75, 13.5, 54.5), Z0, 3.25, 'Furnace block under the mezzanine NE: closes the dead strip and the pit beside the east stair')
L.cover('SB1_WALL', E.r(-1.1, 44.5, -0.94, 49), Z0, 4.45, 'Side wall along the upper half of the west stair')
for i, (u, v) in enumerate([(-3.9, 41), (4.5, 45.6), (6.8, 45.6), (0.8, 49)]):
    L.cover(f'MEZZ_POST{i}', E.r(u, v, u + .4, v + .4), Z0, 3.1, 'Mezzanine post')
L.cover('MEZZ_SCR_W', E.r(-6.3, 49.4, -5.9, 53.4), Z1, 2.3, 'Screen in front of the Coffin lane arrival')
L.cover('MEZZ_SCR_N', E.r(-0.5, 51.6, 4, 52), Z1, 2.3, 'Screen in front of the NE lane arrival')
L.cover('RACKS', E.r(-6.4, 25.2, -3.6, 26.4), Z0, 2.3, 'Drying racks: tall mass between the yard door and the foundry door')
L.cover('KW_PIER_W', E.r(-2.2, 12, 0.3, 13), Z0, 3.1, 'Structural pier: chicane in Kwong Ming Street')
L.cover('KW_PIER_E', E.r(-0.3, 16, 2.2, 17), Z0, 3.1, 'Structural pier: chicane in Kwong Ming Street')
L.cover('DENT_PART', N.r(-1.6, -15, -1.2, -11), Z1, 3.1, 'Dentist shop partition screening the A north mouth')
L.cover('YOUTH_PART_E', N.r(32.3, -15.5, 32.7, -8.5), Z1, 3.1, 'Youth hall partition: closes the East yard door axis')
L.cover('YOUTH_PART_W', N.r(13.9, -13.3, 21, -12.9), Z1, 3.1, 'Youth hall partition: south aisle behind the back-yard door')
L.cover('YOUTH_PART_C', N.r(15.6, -12.9, 16, -9.2), Z1, 3.1, 'Youth hall partition: screen in front of the Clinic corridor mouth')
L.cover('PL_CRATES', E.r(5.5, 10, 8, 12.2), Z0, 2.4, 'Plastics crates: tall cover in the lit yard')
L.cover('YOUTH_COL_W', N.r(19.7, -9.3, 20.3, -8.7), Z1, 3.1, 'Youth hall column')
L.cover('YOUTH_COL_E', N.r(29.7, -9.3, 30.3, -8.7), Z1, 3.1, 'Youth hall column')
L.cover('PINGPONG', N.r(24, -8.2, 27, -6.8), Z1, 1.25, 'Ping-pong table: low cover')
L.cover('SHED_W', rect(36, 7.6, 42, 10.5), Z0, 2.6, 'Squatter shed against the tower wall')
L.cover('SHED_E', rect(62, 7.6, 68, 10.5), Z0, 2.6, 'Squatter shed against the tower wall')
for i in range(5):
    L.cover(f'ARCADE_COL{i}', N.r(8 + 14 * i, 1.2, 8.6 + 14 * i, 1.8), Z1, 3.1, 'Shop arcade column on the frontage')
L.cover('KIOSK_W', N.r(34, 3, 36, 6.5), Z1, 2.6, 'Street kiosk: breaks the frontage length')
L.cover('KIOSK_E', N.r(56, 1.5, 58, 5), Z1, 2.6, 'Street kiosk')
L.cover('STALL', N.r(44, 5.6, 48, 6.8), Z1, 1.25, 'Street stall: low cover at CT spawn')
for id, a, b, z in [('F_T_W', (28, 1), (28, 10), Z0), ('F_T_S', (28, 1), (82, 1), Z0), ('F_T_E', (82, 1), (82, 10), Z0),
                    ('F_C_W', N.p(0, 0), N.p(0, 8), Z1), ('F_C_N', N.p(0, 8), N.p(76, 8), Z1), ('F_C_E', N.p(76, 8), N.p(76, 0), Z1)]:
    L.guard(id, a, b, z, height=3.2, thickness=0.24)
# frontage dressing (non-colliding): tin awnings over the shop arcade and hanging signs
L.prop('AWNING_W', N.r(6, 0, 22, 1.7), Z1 + 2.9, 0.12, 'Tin awning over the arcade', collidable=False, material='tin')
L.prop('AWNING_C', N.r(29, 0, 52, 1.9), Z1 + 3.0, 0.12, 'Tin awning over the arcade', collidable=False, material='tin')
L.prop('AWNING_E', N.r(55, 0, 74, 1.6), Z1 + 2.8, 0.12, 'Tin awning over the arcade', collidable=False, material='tin')
for i, u in enumerate([10, 18, 31, 40, 47, 59, 66]):
    L.prop(f'SIGN{i}', N.r(u, 0.05, u + 0.25, 1.3), Z1 + 3.6 + (i % 3) * 0.9, 2.2 + (i % 2) * 0.8, 'Hanging shop sign', collidable=False, material='sign')
# plant zones (data only; painted on the floor in AML)
L.notes.append(dict(id='PLANT_A', polygon=W.r(-5.5, 30.6, 2.5, 34.5), z=Z1, text='A plant zone: porch south of the Tin Hau hall'))
L.notes.append(dict(id='PLANT_B', polygon=E.r(-1, 40, 7.2, 47), z=Z0, text='B plant zone: foundry floor, partly under the mezzanine tongue'))
# --- upper storeys: inaccessible tower plots of unequal height ---------------------------
import random
from shapely.geometry import Polygon as _P
_rng = random.Random(1993)
REGIONS = [('W', W, _P([(0, 0), (30, 0), (36, 30), (33, 66), (0, 72)])), ('S', Y, _P([(30, 0), (108, 0), (108, 10), (72, 16), (36, 30)])),
           ('C', Y, _P([(36, 30), (72, 16), (70, 70), (33, 66)])), ('E', E, _P([(72, 16), (108, 10), (108, 98), (80, 98), (70, 70)])),
           ('N', N, _P([(0, 72), (33, 66), (70, 70), (80, 98), (0, 98)]))]
for name, frame, region in REGIONS:
    n = 0
    for i in range(-12, 13):
        for j in range(-12, 13):
            du, dv = 15 + 3 * ((i * 7 + j * 3) % 3), 13 + 4 * ((i + 2 * j) % 2)
            cell = _P(frame.r(i * 17, j * 15, i * 17 + du + 2, j * 15 + dv + 2)).intersection(region)
            for g in ([cell] if cell.geom_type == 'Polygon' else list(getattr(cell, 'geoms', []))):
                if g.geom_type == 'Polygon' and g.area > 12:
                    L.plot(f'TW_{name}{n}', list(g.exterior.coords)[:-1], _rng.choice([27.2, 30.6, 30.6, 34, 34, 37.4, 40.8]), f'Tower {name}{n}')
                    n += 1
# --- declared journeys (replayed through the physical inspection walker) ------------------
def wp(f, u, v, z): return (*f.p(u, v), z)
T0, C0 = (52, 6, Z0), (*N.p(22, 4), Z1)
IN_COURT = [(48, 9, Z0), (48, 16.5, Z0)]
L.journey('J-TA-school', 'T spawn → South Gate → Lung Chun W → Free School stairs → gallery → Slot yard → A',
          [T0, *IN_COURT, wp(W, 31, 0, Z0), wp(W, 23.5, 0, Z0), wp(Y, -4, -5, Z0), wp(Y, -4, 4, Z0), wp(Y, -5.3, 8.8, Z0), wp(Y, -5.3, 12.7, ZM), wp(Y, -2.3, 14.7, ZM),
           wp(Y, -2.3, 18.7, Z1), wp(Y, -4, 26.3, Z1), wp(Y, -6.6, 26.3, Z1), wp(Y, -8.3, 26.3, Z1), wp(W, 7.6, 33.6, Z1), wp(W, 5.3, 33.6, Z1), wp(W, 5.3, 30.4, Z1), wp(W, 0.5, 30.6, Z1), wp(W, -1.5, 32.5, Z1)])
L.journey('J-TA-saishing', 'T spawn → Lung Chun W jog → Well Court → Sai Shing flights → diagonal lane → A (SW)',
          [T0, *IN_COURT, wp(W, 31, 0, Z0), wp(W, 14.6, 0, Z0), wp(W, 14.6, 4.8, Z0), wp(W, 11, 5.4, Z0), wp(W, 8.5, 6.6, Z0), wp(W, 8.5, 7.8, Z0), wp(W, 8.5, 11.7, ZM), wp(W, 4.5, 13.2, ZM),
           wp(W, 4.5, 14.8, ZM), wp(W, 4.5, 18.7, Z1), wp(W, 4.5, 20.3, Z1), wp(W, -7.2, 24, Z1), wp(W, -7.2, 28.5, Z1), wp(W, -4, 30.8, Z1), wp(W, -1.5, 32.5, Z1)])
L.journey('J-TB-kwong', 'T spawn → apron east → Kwong Ming Street → jog → foundry mouth → B',
          [T0, (74.5, 6, Z0), wp(E, 0, -3.5, Z0), wp(E, 0, 10.6, Z0), wp(E, 1.02, 11.5, Z0), wp(E, 1.02, 13.6, Z0), wp(E, -1.05, 15.3, Z0), wp(E, -1.05, 17.6, Z0), wp(E, 0, 19, Z0), wp(E, 0, 24.2, Z0), wp(E, 7.2, 24.2, Z0), wp(E, 7.2, 34.5, Z0), wp(E, 3.4, 35.4, Z0), wp(E, 3, 39.6, Z0), wp(E, 2.6, 45, Z0)])
L.journey('J-TB-fishball', 'T spawn → Kwong Ming → Fishball workshop → B (SW door)',
          [T0, (74.5, 6, Z0), wp(E, 0, -3.5, Z0), wp(E, 0, 10.6, Z0), wp(E, 1.02, 11.5, Z0), wp(E, 1.02, 13.6, Z0), wp(E, -1.05, 15.3, Z0), wp(E, -1.05, 17.6, Z0), wp(E, 0, 20.2, Z0), wp(E, -3.05, 20.2, Z0), wp(E, -3.05, 27.2, Z0), wp(E, -5.75, 29.8, Z0), wp(E, -5.75, 38.2, Z0), wp(E, -2, 40.3, Z0), wp(E, 2.6, 45, Z0)])
L.journey('J-T-mid', 'T spawn → South Gate → Cannon Court → Yamen gate → hall steps → inner court → west wing steps → rear strip',
          [T0, *IN_COURT, wp(Y, 9, -12, Z0), wp(Y, 9, -3.2, Z0), wp(Y, 16, -2.4, Z0), wp(Y, 16, 0.6, Z0), wp(Y, 16, 8.8, Z0), wp(Y, 16, 12.8, ZM), wp(Y, 16, 14.6, ZM), wp(Y, 7.4, 15, ZM), wp(Y, 7.4, 19.6, ZM),
           wp(Y, 2.5, 20.6, ZM), wp(Y, 2.5, 21.8, ZM), wp(Y, 2.5, 25.8, Z1), wp(Y, 2.5, 27.2, Z1)])
L.journey('J-T-rot', 'Attacker inner rotation: Lung Chun W mouth → round the ruin → Lung Chun E → Kwong Ming',
          [wp(W, 28, 0, Z0), wp(W, 33.5, 0.5, Z0), wp(Y, 9.5, -12.6, Z0), wp(Y, 12.5, -14.5, Z0), wp(Y, 19.5, -14.5, Z0), wp(W, 55, 0, Z0), wp(W, 64.5, 0, Z0), wp(E, 0, 6, Z0)])
L.journey('J-CT-mid', 'CT spawn → Youth hall → back yard → west lane top → rear strip',
          [C0, wp(N, 25.5, 2, Z1), wp(N, 25.5, -4, Z1), wp(N, 22.8, -6, Z1), wp(N, 22.2, -10, Z1), wp(N, 22.2, -14.1, Z1), wp(N, 15.8, -14.2, Z1), wp(N, 15.8, -15.9, Z1), wp(Y, 2.5, 35, Z1), wp(Y, 2.5, 27.2, Z1)])
HUB = [C0, wp(N, 25.5, 2, Z1), wp(N, 25.5, -4, Z1)]
A_IN = [wp(N, -4.85, -12, Z1), wp(N, -4.85, -14.3, Z1), wp(W, -1.5, 43.6, Z1), wp(W, -1.5, 42.5, Z1), wp(W, 5.3, 42.5, Z1), wp(W, 5.3, 30.4, Z1), wp(W, 0.5, 30.6, Z1), wp(W, -1.5, 32.5, Z1)]
COFFIN_IN = [wp(Y, 29.5, 34, Z1), wp(Y, 31.6, 34, Z1), wp(E, -7.2, 51.5, Z1), wp(E, -7.2, 48.5, Z1), wp(E, -4.6, 48.6, Z1), wp(E, -4.6, 49.7, Z1)]
B_DOWN = [wp(E, -2.3, 49.5, Z1), wp(E, -2.3, 41.8, Z0), wp(E, -2.3, 40.6, Z0), wp(E, 2.6, 45, Z0)]
L.journey('J-CT-A', 'CT spawn → Youth hall → Clinic corridor → Dentist shop → A north mouth → east gap → plant',
          [*HUB, wp(N, 21, -6, Z1), wp(N, 16.6, -8.4, Z1), wp(N, 14.8, -8.9, Z1), wp(N, 14.8, -10.6, Z1), wp(N, 4, -10.8, Z1), wp(N, 0, -10, Z1), wp(N, -3, -10, Z1), *A_IN])
L.journey('J-CT-A-outer', 'CT spawn → frontage → NW lane → Dentist shop → A', [C0, wp(N, 3.75, 2, Z1), wp(N, 3.75, -10, Z1), wp(N, -3, -10, Z1), *A_IN])
L.journey('J-CT-B', 'CT spawn → Youth hall → East yard → East lane top → Coffin lane → mezzanine → west stair → B floor',
          [*HUB, wp(N, 31, -7.5, Z1), wp(N, 34.5, -7.5, Z1), wp(N, 34.5, -13.2, Z1), wp(N, 37.2, -13.2, Z1), wp(Y, 29.5, 36.2, Z1), *COFFIN_IN, *B_DOWN])
L.journey('J-CT-B-outer', 'CT spawn → frontage → NE lane → mezzanine → west stair → B floor',
          [C0, wp(N, 30, 7.2, Z1), wp(N, 60, 7.2, Z1), wp(N, 68, 4, Z1), wp(E, 1.75, 70.5, Z1), wp(E, 1.75, 53.1, Z1), wp(E, -2.3, 53.1, Z1), *B_DOWN])
L.journey('J-CT-rot', 'Defender rotation A → Slot yard → gallery → back door → rear strip → East lane top → Coffin lane → mezzanine',
          [wp(W, -1.5, 32.5, Z1), wp(W, 0.5, 30.6, Z1), wp(W, 5.3, 30.4, Z1), wp(W, 5.3, 33.6, Z1), wp(W, 7.6, 33.6, Z1), wp(Y, -8.3, 26.3, Z1), wp(Y, -6.4, 26.3, Z1), wp(Y, -4, 29.3, Z1), wp(Y, 1.5, 29.3, Z1),
           wp(Y, 1.5, 27.5, Z1), wp(Y, 12, 28.5, Z1), wp(Y, 21.5, 28.5, Z1), wp(Y, 29.5, 27.2, Z1), *COFFIN_IN])
L.journey('J-CT-A-mid', 'CT spawn → Youth hall → back yard → west lane top → back door → gallery → Slot yard → A plant',
          [*HUB, wp(N, 22.8, -6, Z1), wp(N, 22.2, -10, Z1), wp(N, 22.2, -14.1, Z1), wp(N, 15.8, -14.2, Z1), wp(N, 15.8, -15.9, Z1), wp(Y, 2.5, 35, Z1), wp(Y, 2.5, 29.3, Z1), wp(Y, -2, 29.3, Z1), wp(Y, -4, 26.3, Z1), wp(Y, -6.6, 26.3, Z1), wp(Y, -8.3, 26.3, Z1),
           wp(W, 7.6, 33.6, Z1), wp(W, 5.3, 33.6, Z1), wp(W, 5.3, 30.4, Z1), wp(W, 0.5, 30.6, Z1), wp(W, -1.5, 32.5, Z1)])
L.journey('J-T-B-mezz', 'Yamen front court → East lane flights → East lane top → Coffin lane → mezzanine → west stair → B',
          [wp(Y, 16, 4, Z0), wp(Y, 28.2, 4, Z0), wp(Y, 28.2, 13.8, Z0), wp(Y, 28.2, 17.8, ZM), wp(Y, 30.8, 19.2, ZM), wp(Y, 30.8, 20.8, ZM), wp(Y, 30.8, 24.8, Z1), wp(Y, 29.5, 27.2, Z1), *COFFIN_IN, *B_DOWN])
L.journey('J-T-pivot', 'Attacker pivot A east door → gallery → School stairs → arcade → front court → East lane → Rubbish yard → Fishball → B door',
          [wp(W, 7.6, 33.6, Z1), wp(Y, -8.3, 26.3, Z1), wp(Y, -6.6, 26.3, Z1), wp(Y, -2.3, 18.7, Z1), wp(Y, -2.3, 14.7, ZM), wp(Y, -5.3, 12.7, ZM), wp(Y, -5.3, 8.8, Z0), wp(Y, -4, 6.7, Z0), wp(Y, 1, 6.7, Z0), wp(Y, 29.5, 6.7, Z0), wp(Y, 29.5, 11.3, Z0), wp(Y, 33.6, 11.3, Z0), wp(E, -9.6, 23.7, Z0), wp(E, -7.5, 23.7, Z0), wp(E, -7.5, 28, Z0), wp(E, -5.75, 29.8, Z0), wp(E, -5.75, 35, Z0)])
L.journey('J-half', 'Half-level lateral: Sai Shing landing → Tooth shop → School landing → west wing → inner court → East landing',
          [wp(W, 8, 13.2, ZM), wp(W, 11.6, 13.2, ZM), wp(Y, -6.4, 13.7, ZM), wp(Y, -0.5, 13.8, ZM), wp(Y, 3, 14, ZM), wp(Y, 3, 19.7, ZM), wp(Y, 24, 19.6, ZM), wp(Y, 26.5, 19.5, ZM), wp(Y, 29.5, 19.3, ZM)])
L.journey('J-low-link', 'Yamen front court → East lane → Rubbish yard → Fishball workshop → Kwong Ming',
          [wp(Y, 16, 4, Z0), wp(Y, 29.5, 4, Z0), wp(Y, 29.5, 11.3, Z0), wp(Y, 33.6, 11.3, Z0), wp(E, -9.6, 23.7, Z0), wp(E, -7.5, 23.7, Z0), wp(E, -3.5, 22, Z0), wp(E, -3.5, 20.2, Z0), wp(E, 0, 20.2, Z0)])
# --- view predictions (drawing hypotheses; compiled rays are recorded by verify.mjs) -------
def view(id, a, b, expect, note): L.views.append(dict(id=id, feet=list(a), targetFeet=list(b), expect=expect, note=note))
view('V-spawn', T0, C0, 'blocked', 'Spawn to spawn')
view('V-strip-front', wp(Y, 11, 22.6, Z1), wp(Y, 16, 4, Z0), 'blocked', 'Rear strip parapet to the front court: hall roof should hide the front court')
view('V-strip-court', wp(Y, 11, 22.6, Z1), wp(Y, 13, 20, ZM), 'visible', 'Rear strip parapet down into the inner court')
view('V-steps-strip', wp(Y, 16, 8.5, Z0), wp(Y, 11, 22.6, Z1), 'blocked', 'Foot of the hall steps to the strip: hall and screen should block')
view('V-gallery-court', wp(Y, -1.6, 21.6, Z1), wp(Y, 10, 20, ZM), 'visible', 'School gallery window GW1 into the inner court')
view('V-gallery-strip', wp(Y, -1.6, 24, Z1), wp(Y, 14, 27, Z1), 'visible', 'School gallery window GW2 along the strip')
view('V-tunnel-gate', (48, 15, Z0), wp(Y, 16, 0.5, Z0), 'blocked', 'South Gate tunnel mouth to the Yamen gate: ruin wall')
view('V-lung-through', wp(W, 26, 0, Z0), wp(W, 62, 0, Z0), 'blocked', 'Along Lung Chun Road through Cannon Court: ruin footing on the line')
view('V-lung-slit', wp(W, 33, -1, Z0), wp(W, 64, -1.1, Z0), 'blocked', 'South-edge thread past the ruin footing')
view('V-strip-length', wp(Y, 1.5, 27.2, Z1), wp(Y, 30, 27.2, Z1), 'visible', 'Full length of the defenders crossing')
view('V-A-sw-north', wp(W, -7.2, 26.5, Z1), wp(W, -1.5, 43.5, Z1), 'blocked', 'A SW arrival to the north mouth: Tin Hau hall between')
view('V-A-east-plant', wp(W, 6.8, 33.6, Z1), wp(W, -1.5, 32.5, Z1), 'blocked', 'A east door to the plant: screen wall')
view('V-A-sw-plant', wp(W, -7.2, 26.5, Z1), wp(W, -1.5, 32.5, Z1), None, 'A SW arrival to the plant (crates and incense burner partly cover)')
view('V-kwong-B', wp(E, 0, 2, Z0), wp(E, 7.2, 40, Z0), 'blocked', 'Kwong Ming south to the foundry floor: jog')
view('V-mouth-plant', wp(E, 7.2, 30, Z0), wp(E, 2.6, 45, Z0), None, 'Foundry mouth to the plant past the boiler')
view('V-mezz-plant', wp(E, 9, 49.62, Z1), wp(E, 2.6, 45, Z0), None, 'Mezzanine north rail to the plant')
view('V-mezz-mouth', wp(E, 2, 49.62, Z1), wp(E, 7.2, 34.5, Z0), None, 'Mezzanine rail to the foundry mouth past the boiler')
view('V-A-B', wp(W, 5.3, 33.6, Z1), wp(E, -7.2, 51.5, Z1), 'blocked', 'Site to site along the upper grade')
view('V-apron-terrace', (52, 6, Z0), wp(Y, 28, 27.2, Z1), 'blocked', 'T apron to the rear terrace east end over the ruin wall (reviewer B1 line)')
view('V-terrace-front-grid', wp(Y, 26, 26.5, Z1), wp(Y, 10, 4, Z0), 'blocked', 'Terrace east end to the front court past the hall rear (reviewer B2)')
view('V-gallery-street', wp(Y, -2.3, 19.5, Z1), C0, 'blocked', 'School stair head to the CT spawn through the Youth hall (reviewer B3/CT-01)')
view('V-eltop-street', wp(Y, 29.5, 33, Z1), C0, 'blocked', 'East lane top to the CT spawn through the Youth hall (CT-01)')
view('V-eltop-mezz', wp(Y, 29.5, 34, Z1), wp(E, -3, 51.5, Z1), 'blocked', 'East lane top down Coffin lane onto the mezzanine (B-03)')
view('V-tongue-mouth', wp(E, 5.8, 46.2, Z1), wp(E, 7.2, 32, Z0), 'blocked', 'Mezzanine tongue to the foundry mouth corridor over the boiler (B-02)')
view('V-front-eltop', wp(Y, 29.5, 4, Z0), wp(Y, 29.5, 30, Z1), 'blocked', 'Front court up the East lane to the defenders crossing (R2/CT-02)')
view('V-well-cannon', wp(W, 9, 5.5, Z0), wp(Y, 10, -10, Z0), 'blocked', 'Well Court to Cannon Court through the Lung Chun S-bend (R3)')
view('V-kwong-length', wp(E, 0, -3, Z0), wp(E, 0, 21, Z0), 'blocked', 'Kwong Ming Street end to end past the pier chicane (E-01)')
view('V-hub-strip', wp(N, 15.8, -14.2, Z1), wp(Y, 2.5, 27.2, Z1), None, 'Youth hall SW door down the west lane top to the terrace')
view('V-ct-youth', C0, wp(N, 22.5, -9, Z1), None, 'CT spawn into the Youth hall through its north door')
PLANS = [(0, 'storey 0 (z 0–3.4): low city'), (1, 'storey 1 (z 3.4–6.8): upper grade')]
SECTIONS = [('NS', Y.p(16, -26), Y.p(16, 60), 'south→north along the Yamen axis (grid +5°)'),
            ('EW', Y.p(-40, 27.2), Y.p(62, 27.2), 'west→east along the rear terrace strip'),
            ('LC', W.p(-8, 0), W.p(70, 0), 'along Lung Chun Road (grid -9°): west slot → Well → Cannon Court → Kwong Ming'),
            ('SS', W.p(8.5, -4), W.p(4.5, 20), 'Lung Chun W → Well Court → Sai Shing flights'),
            ('KM', E.p(0, -4), E.p(0, 76), 'along Kwong Ming Street axis through the foundry to the NE lane')]
if __name__ == '__main__':
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / 'planning' / REV.lower()
    L.write_drawings(out, PLANS, SECTIONS)
    c = L.checks(); print(json.dumps(c))
